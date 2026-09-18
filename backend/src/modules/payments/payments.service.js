const { store, uuid, getPool, isPgConnected } = require('../../config/db');
const { generateVietQR } = require('../../utils/vietqr');

async function createPaymentInvoice({ registration_id, payment_method, branch_id, collected_by }) {
  const reg = store.registrations.find(r => r.id === registration_id);
  if (!reg) return { error: 'Không tìm thấy đăng ký gói', status: 404 };

  if (reg.status !== 'PENDING_PAYMENT') {
    return { error: `Đăng ký này không ở trạng thái chờ thanh toán (Hiện tại: ${reg.status})`, status: 400 };
  }

  const member = store.member_profiles.find(m => m.id === reg.member_id);
  const now = new Date();
  const dateStr = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0');
  const count = store.payments.length + 1;
  const paymentCode = `PAY-${dateStr}-${count.toString().padStart(4, '0')}`;

  const payment = {
    id: uuid(),
    registration_id,
    member_id: reg.member_id,
    branch_id: branch_id || reg.sold_branch_id,
    payment_code: paymentCode,
    payment_method: payment_method || 'CASH',
    amount: parseFloat(reg.price_snapshot), // 100% price snapshot
    status: 'PENDING',
    transaction_ref: null,
    collected_by: collected_by || null,
    confirmed_at: null,
    created_at: now,
    updated_at: now
  };

  store.payments.push(payment);

  if (isPgConnected && isPgConnected()) {
    try {
      await getPool().query(
        `INSERT INTO payments (
          id, registration_id, member_id, branch_id, payment_code, payment_method,
          amount, status, transaction_ref, collected_by, confirmed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          payment.id, payment.registration_id, payment.member_id, payment.branch_id,
          payment.payment_code, payment.payment_method, payment.amount, payment.status,
          payment.transaction_ref, payment.collected_by, payment.confirmed_at, payment.created_at, payment.updated_at
        ]
      );
    } catch (e) {
      console.warn('Could not persist payment to PG:', e.message);
    }
  }

  let qrData = null;
  if (payment_method === 'BANK_TRANSFER_VIETQR') {
    qrData = generateVietQR({
      amount: payment.amount,
      paymentCode: payment.payment_code,
      description: `THANH TOAN GOI ${reg.package_name_snapshot}`
    });
  }

  return {
    payment,
    vietqr: qrData
  };
}

async function confirmPayment({ payment_id, transaction_ref, confirmed_by }) {
  const payment = store.payments.find(p => p.id === payment_id);
  if (!payment) return { error: 'Không tìm thấy giao dịch thanh toán', status: 404 };

  if (payment.status === 'COMPLETED') {
    return { error: 'Giao dịch này đã được xác nhận thanh toán trước đó', status: 400 };
  }

  const now = new Date();
  payment.status = 'COMPLETED';
  payment.confirmed_at = now;
  payment.transaction_ref = transaction_ref || `TXN-${Date.now()}`;
  if (confirmed_by) payment.collected_by = confirmed_by;
  payment.updated_at = now;

  // Activate Registration
  const reg = store.registrations.find(r => r.id === payment.registration_id);
  if (reg) {
    const today = new Date().toISOString().split('T')[0];
    if (reg.start_date <= today) {
      reg.status = 'ACTIVE';
    } else {
      reg.status = 'SCHEDULED';
    }
    reg.updated_at = now;
  }

  // Generate Immutable Receipt
  const member = store.member_profiles.find(m => m.id === payment.member_id);
  const count = store.receipts.length + 1;
  const dateStr = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0');
  const receiptCode = `PT-${dateStr}-${count.toString().padStart(4, '0')}`;

  const receipt = {
    id: uuid(),
    payment_id: payment.id,
    receipt_code: receiptCode,
    amount: payment.amount,
    payer_name: member?.full_name || 'Hội viên',
    payer_phone: member?.phone || '',
    issued_by: confirmed_by || store.accounts[0].id,
    issued_at: now,
    note: `Thu đủ 100% tiền gói ${reg?.package_name_snapshot || ''}`
  };

  store.receipts.push(receipt);

  // Persist to PostgreSQL if connected
  if (isPgConnected && isPgConnected()) {
    try {
      await getPool().query(
        `UPDATE payments SET status = $1, confirmed_at = $2, transaction_ref = $3, collected_by = COALESCE($4, collected_by), updated_at = $5 WHERE id = $6`,
        [payment.status, payment.confirmed_at, payment.transaction_ref, confirmed_by || null, payment.updated_at, payment.id]
      );

      if (reg) {
        await getPool().query(
          `UPDATE registrations SET status = $1, updated_at = $2 WHERE id = $3`,
          [reg.status, reg.updated_at, reg.id]
        );
      }

      await getPool().query(
        `INSERT INTO receipts (id, payment_id, receipt_code, amount, payer_name, payer_phone, issued_by, issued_at, note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [receipt.id, receipt.payment_id, receipt.receipt_code, receipt.amount, receipt.payer_name, receipt.payer_phone, receipt.issued_by, receipt.issued_at, receipt.note]
      );
    } catch (e) {
      console.warn('Could not persist payment confirmation/receipt to PG:', e.message);
    }
  }

  return {
    payment,
    registration: reg,
    receipt
  };
}

function getReceiptByPaymentId(payment_id) {
  return store.receipts.find(r => r.payment_id === payment_id);
}

module.exports = {
  createPaymentInvoice,
  confirmPayment,
  getReceiptByPaymentId
};

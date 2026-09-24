const express = require('express');
const env = require('../../config/env');
const { pool, transaction } = require('../../db/postgres');
const { fail, code } = require('./http');
const { emit } = require('./notifications');

const router = express.Router();

function verifySepayAuth(req) {
  if (!env.SEPAY_API_KEY) return; // Local development can opt out explicitly.
  const authHeader = req.headers.authorization || '';
  let token = '';
  if (authHeader.startsWith('Apikey ')) {
    token = authHeader.slice(7).trim();
  } else if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.headers['x-api-key']) {
    token = String(req.headers['x-api-key']).trim();
  } else if (req.query.api_key) {
    token = String(req.query.api_key).trim();
  }

  if (!token || token !== env.SEPAY_API_KEY) {
    fail(401, 'Unauthorized: SePay API Key is invalid or missing', 'UNAUTHORIZED');
  }
}

async function handleSepayWebhook(req, res) {
  verifySepayAuth(req);

  const body = req.body || {};
  const transferType = String(body.transferType || 'in').toLowerCase();
  if (transferType !== 'in') {
    return { success: true, message: 'Ignored outbound transfer (transferType != in)' };
  }

  const transferAmount = Number(body.transferAmount || body.amount || 0);
  const sepayId = body.id ? String(body.id) : null;
  const referenceCode = body.referenceCode ? String(body.referenceCode).trim() : (sepayId ? `SEPAY-${sepayId}` : null);
  const content = String(body.content || '').trim();
  const searchStr = `${body.code || ''} ${content} ${body.description || ''}`;

  console.info('[SePay Webhook] Received transaction', {
    id: sepayId,
    accountNumber: body.accountNumber || null,
    code: body.code || null,
    amount: transferAmount,
    content
  });

  // Idempotency check: if transaction_ref already recorded in payments
  if (referenceCode) {
    const existingPayment = (await pool.query(
      "SELECT id, confirmed_at, payment_code FROM payments WHERE transaction_ref = $1 LIMIT 1",
      [referenceCode]
    )).rows[0];
    if (existingPayment) {
      return {
        success: true,
        message: 'Transaction already processed (Idempotent)',
        payment_id: existingPayment.id,
        payment_code: existingPayment.payment_code
      };
    }
  }

  // Parse registration code (e.g. DK016, PG DK016, THANH TOAN DK016) or payment code (e.g. PAY026)
  let regCode = null;
  let paymentCode = null;

  const regMatch = searchStr.match(/(?:PG\s*|THANH\s*TOAN\s*|DK\s*)(DK\d+)/i) || searchStr.match(/(DK\d+)/i);
  if (regMatch) {
    regCode = regMatch[1].toUpperCase();
  }

  const payMatch = searchStr.match(/(PAY\d+)/i);
  if (payMatch) {
    paymentCode = payMatch[1].toUpperCase();
  }

  if (!regCode && !paymentCode) {
    console.warn('[SePay Webhook] No order code detected in transfer content:', content);
    return {
      success: false,
      message: 'No registration code or payment code found in transaction content',
      content
    };
  }

  console.info('[SePay Webhook] Order code detected', { regCode, paymentCode, referenceCode });

  // Execute database transaction
  const result = await transaction(async db => {
    let r = null;
    let intent = null;

    if (referenceCode) {
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`sepay-ref:${referenceCode}`]);
    }

    if (regCode) {
      r = (await db.query('SELECT * FROM registrations WHERE UPPER(reg_code) = $1 LIMIT 1 FOR UPDATE', [regCode])).rows[0];
    }

    if (!r && paymentCode) {
      // Check payment_intents first
      intent = (await db.query('SELECT * FROM payment_intents WHERE UPPER(payment_code) = $1 LIMIT 1', [paymentCode])).rows[0];
      if (intent) {
        r = (await db.query('SELECT * FROM registrations WHERE id = $1 LIMIT 1 FOR UPDATE', [intent.registration_id])).rows[0];
      } else {
        const p = (await db.query('SELECT * FROM payments WHERE UPPER(payment_code) = $1 LIMIT 1', [paymentCode])).rows[0];
        if (p) {
          r = (await db.query('SELECT * FROM registrations WHERE id = $1 LIMIT 1 FOR UPDATE', [p.registration_id])).rows[0];
        }
      }
    }

    if (!r) {
      fail(404, `Không tìm thấy đơn đăng ký phù hợp với mã ${regCode || paymentCode}`, 'REGISTRATION_NOT_FOUND');
    }

    // Check if registration already settled in payments
    const existingPayment = (await db.query('SELECT * FROM payments WHERE registration_id = $1 LIMIT 1', [r.id])).rows[0];
    if (existingPayment) {
      const receipt = (await db.query('SELECT * FROM receipts WHERE payment_id = $1 LIMIT 1', [existingPayment.id])).rows[0];
      return {
        success: true,
        message: 'Registration is already settled (Idempotent)',
        payment_id: existingPayment.id,
        payment_code: existingPayment.payment_code,
        receipt_code: receipt?.receipt_code
      };
    }

    // Find any open intent
    if (!intent) {
      intent = (await db.query(
        "SELECT * FROM payment_intents WHERE registration_id = $1 AND state = 'PENDING' ORDER BY created_at DESC LIMIT 1",
        [r.id]
      )).rows[0];
    }

    // Discounts & amounts
    const discountId = intent?.discount_id || null;
    const discountAmount = Number(intent?.discount_amount || 0);
    const payableAmount = Number(r.price_snapshot) - discountAmount;

    // Check amount
    if (transferAmount > 0 && transferAmount < payableAmount) {
      fail(400, `Số tiền chuyển (${transferAmount} VNĐ) nhỏ hơn số tiền cần thanh toán (${payableAmount} VNĐ)`, 'UNDERPAID');
    }

    // Find staff account for collected_by & issued_by
    const staffAccount = (await db.query(`
      SELECT a.id FROM accounts a
      JOIN account_roles ar ON ar.account_id = a.id
      JOIN roles ro ON ro.id = ar.role_id
      WHERE ro.role_code IN ('RECEPTIONIST', 'QTV')
        AND (EXISTS (SELECT 1 FROM account_branch_scopes s WHERE s.account_id = a.id AND (s.branch_id = $1 OR s.is_all_branches = true)))
      ORDER BY CASE WHEN ro.role_code = 'RECEPTIONIST' THEN 1 ELSE 2 END
      LIMIT 1
    `, [r.sold_branch_id])).rows[0] || (await db.query('SELECT id FROM accounts LIMIT 1')).rows[0];

    const collectorId = staffAccount?.id;
    const finalRef = referenceCode || `SEPAY-${Date.now()}`;
    const paymentNote = `Thanh toán tự động VietQR SePay (${body.gateway || 'VietinBank'})`;
    const pCode = await code(db, 'payments', 'payment_code', 'PAY');

    // Single Atomic Insert into payments (Settled Ledger)
    const savedPayment = (await db.query(`
      INSERT INTO payments (
        registration_id, member_id, branch_id, payment_code, payment_method,
        amount, discount_id, discount_amount, transaction_ref, collected_by,
        confirmed_at, note, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, 'BANK_TRANSFER',
        $5, $6, $7, $8, $9,
        NOW(), $10, NOW(), NOW()
      ) RETURNING *
    `, [
      r.id, r.member_id, r.sold_branch_id, pCode,
      payableAmount, discountId, discountAmount, finalRef, collectorId,
      paymentNote
    ])).rows[0];

    // Mark intent COMPLETED if it existed
    if (intent) {
      await db.query(`
        UPDATE payment_intents
        SET state = 'COMPLETED',
            payment_id = $1,
            confirmed_at = NOW(),
            transaction_ref = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [savedPayment.id, finalRef, intent.id]);
    }

    // Discounts & bonus sessions
    let bonusDays = 0, bonusPt = 0;
    if (discountId) {
      const disc = (await db.query('SELECT bonus_days, bonus_pt_sessions FROM discounts WHERE id = $1', [discountId])).rows[0];
      if (disc) {
        bonusDays = Number(disc.bonus_days || 0);
        bonusPt = Number(disc.bonus_pt_sessions || 0);
      }
    }

    // Activate registration
    const activatedReg = (await db.query(`
      UPDATE registrations
      SET status = CASE
            WHEN (CASE WHEN $2::int > 0 AND end_date IS NOT NULL THEN (end_date + ($2::int * INTERVAL '1 day'))::date ELSE end_date END) < CURRENT_DATE THEN 'EXPIRED'
            WHEN start_date > CURRENT_DATE THEN 'SCHEDULED'
            ELSE 'ACTIVE'
          END,
          end_date = CASE WHEN $2::int > 0 AND end_date IS NOT NULL THEN (end_date + ($2::int * INTERVAL '1 day'))::date ELSE end_date END,
          duration_days_snapshot = CASE WHEN $2::int > 0 AND duration_days_snapshot IS NOT NULL THEN duration_days_snapshot + $2::int ELSE duration_days_snapshot END,
          remaining_pt_sessions = CASE WHEN $3::int > 0 THEN COALESCE(remaining_pt_sessions, 0) + $3::int ELSE remaining_pt_sessions END,
          total_pt_sessions_snapshot = CASE WHEN $3::int > 0 THEN COALESCE(total_pt_sessions_snapshot, 0) + $3::int ELSE total_pt_sessions_snapshot END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [r.id, bonusDays, bonusPt])).rows[0];

    // Create receipt
    const m = (await db.query('SELECT * FROM member_profiles WHERE id = $1', [r.member_id])).rows[0];
    const b = (await db.query('SELECT * FROM branches WHERE id = $1', [savedPayment.branch_id])).rows[0];
    const receiptCode = await code(db, 'receipts', 'receipt_code', 'PT');

    const receipt = (await db.query(`
      INSERT INTO receipts(payment_id, receipt_code, amount, payer_name, payer_phone, issued_by, note)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [savedPayment.id, receiptCode, savedPayment.amount, m.full_name, m.phone, collectorId, savedPayment.note])).rows[0];

    // Audit log
    await db.query(`
      INSERT INTO audit_logs(actor_account_id, branch_id, action_name, target_table, target_id, old_values, new_values, reason)
      VALUES ($1, $2, 'PAYMENT_CONFIRMED', 'payments', $3, $4, $5, $6)
    `, [collectorId, savedPayment.branch_id, savedPayment.id, intent ? JSON.stringify(intent) : null, JSON.stringify({ ...savedPayment, status: 'COMPLETED', sepay_auto: true }), finalRef]);

    // In-app notifications
    const variables = {
      member_name: m.full_name,
      ten_hoi_vien: m.full_name,
      package_name: r.package_name_snapshot,
      ten_goi: r.package_name_snapshot,
      amount: Number(savedPayment.amount).toLocaleString('vi-VN'),
      so_tien: Number(savedPayment.amount).toLocaleString('vi-VN'),
      payment_time: savedPayment.confirmed_at.toISOString(),
      branch_name: b?.branch_name || 'Paradise Gym',
      expiry_date: activatedReg.end_date || 'Vô thời hạn',
      ngay_het_han: activatedReg.end_date || 'Vô thời hạn',
      registration_code: r.reg_code,
      ma_hop_dong: r.reg_code
    };

    await emit(db, {
      event: 'PAYMENT_CONFIRMED',
      branchId: b?.id || savedPayment.branch_id,
      referenceId: savedPayment.id,
      referenceType: 'PAYMENT',
      accounts: [m.account_id],
      variables,
      title: 'Xác nhận thanh toán thành công',
      body: `Paradise Gym đã nhận đủ số tiền ${Number(savedPayment.amount).toLocaleString('vi-VN')} VNĐ cho gói ${r.package_name_snapshot}.`
    });

    await emit(db, {
      event: 'REGISTRATION_ACTIVATED',
      branchId: b?.id || savedPayment.branch_id,
      referenceId: r.id,
      referenceType: 'REGISTRATION',
      accounts: [m.account_id],
      variables,
      title: 'Kích hoạt gói tập thành công!',
      body: `Chúc mừng bạn đã kích hoạt thành công gói ${r.package_name_snapshot}. Hạn dùng đến ${activatedReg.end_date || 'vô thời hạn'}.`
    });

    return {
      success: true,
      message: 'Thanh toán thành công qua SePay Webhook!',
      payment: { ...savedPayment, status: 'COMPLETED' },
      registration: activatedReg,
      receipt
    };
  });

  return result;
}

// SePay requires an exact { success: true } response body. The shared route
// helper wraps responses in { success, data, message }, which SePay treats as
// a failed delivery even when the transaction was processed correctly.
const sepayWebhookRoute = async (req, res, next) => {
  try {
    await handleSepayWebhook(req, res);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

router.post('/webhook', sepayWebhookRoute);
router.post('/', sepayWebhookRoute);

module.exports = { router, handleSepayWebhook };

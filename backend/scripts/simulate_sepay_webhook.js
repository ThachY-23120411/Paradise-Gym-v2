const http = require('http');
const env = require('../src/config/env');
const { pool } = require('../src/db/postgres');

async function main() {
  console.log('====================================================');
  console.log('🚀 SEPAY WEBHOOK SIMULATOR (PARADISE GYM)');
  console.log('====================================================');

  let targetCode = process.argv[2];
  let customAmount = process.argv[3] ? Number(process.argv[3]) : null;

  let reg = null;
  let payment = null;

  if (targetCode) {
    targetCode = targetCode.trim().toUpperCase();
    console.log(`🔍 Tìm kiếm đơn hàng theo mã: ${targetCode}`);
    if (targetCode.startsWith('DK')) {
      reg = (await pool.query('SELECT * FROM registrations WHERE UPPER(reg_code) = $1', [targetCode])).rows[0];
    } else if (targetCode.startsWith('PAY')) {
      payment = (await pool.query('SELECT * FROM payments WHERE UPPER(payment_code) = $1', [targetCode])).rows[0];
      if (payment) {
        reg = (await pool.query('SELECT * FROM registrations WHERE id = $1', [payment.registration_id])).rows[0];
      }
    }
  }

  if (!reg) {
    console.log('ℹ️ Không chỉ định mã hoặc không tìm thấy, đang tự động tìm đơn PENDING_PAYMENT mới nhất...');
    reg = (await pool.query("SELECT * FROM registrations WHERE status = 'PENDING_PAYMENT' ORDER BY created_at DESC LIMIT 1")).rows[0];
  }

  if (!reg) {
    console.log('⚠️ Không tìm thấy đơn đăng ký nào đang ở trạng thái PENDING_PAYMENT!');
    console.log('👉 Vui lòng tạo một đơn đăng ký mới trên App Hội viên hoặc Web Admin trước khi chạy simulator.');
    process.exit(1);
  }

  if (!payment) {
    payment = (await pool.query("SELECT * FROM payment_intents WHERE registration_id = $1 AND state = 'PENDING' ORDER BY created_at DESC LIMIT 1", [reg.id])).rows[0]
      || (await pool.query("SELECT * FROM payments WHERE registration_id = $1 ORDER BY created_at DESC LIMIT 1", [reg.id])).rows[0];
  }

  const finalAmount = customAmount || (payment ? Number(payment.amount) : Number(reg.price_snapshot));
  const transferContent = `PG ${reg.reg_code} THACH NHU CHUYEN KHOAN`;
  const referenceCode = `VTB-SIM-${Date.now()}`;
  const sepayTransactionId = Math.floor(100000 + Math.random() * 900000);

  const payload = {
    id: sepayTransactionId,
    gateway: 'Vietinbank',
    transactionDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
    accountNumber: env.BANK_ACCOUNT_NO || '108875382652',
    subAccount: null,
    code: null,
    content: transferContent,
    transferType: 'in',
    description: `Giao dịch chuyển tiền Vietinbank Napas247 - ${transferContent}`,
    transferAmount: finalAmount,
    referenceCode: referenceCode,
    accumulated: 100000000
  };

  console.log('📦 Chuẩn bị bắn Payload SePay Webhook:');
  console.log(JSON.stringify(payload, null, 2));

  const payloadString = JSON.stringify(payload);
  const options = {
    hostname: '127.0.0.1',
    port: env.PORT || 5000,
    path: '/api/v1/payments/sepay/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadString),
      'Authorization': `Apikey ${env.SEPAY_API_KEY}`
    }
  };

  console.log(`📡 Đang gửi POST đến: http://${options.hostname}:${options.port}${options.path}`);

  const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      console.log('====================================================');
      console.log(`📥 Phản hồi từ Server HTTP ${res.statusCode}:`);
      try {
        const parsed = JSON.parse(data);
        console.log(JSON.stringify(parsed, null, 2));
        if (parsed.success) {
          console.log('\n🎉 THÀNH CÔNG RỰC RỠ! Đơn hàng đã được đối soát và kích hoạt.');
          console.log(`👉 Mã đăng ký: ${reg.reg_code}`);
          console.log(`👉 Mã phiếu thu: ${parsed.data?.receipt?.receipt_code || parsed.receipt_code || 'PT...'}`);
          console.log(`👉 Số tiền: ${finalAmount.toLocaleString('vi-VN')} VNĐ`);
          console.log('👉 Trình duyệt hoặc App Hội viên đang mở mã QR sẽ TỰ ĐỘNG BẬT POPUP "THANH TOÁN THÀNH CÔNG!"');
        } else {
          console.log('\n❌ Thất bại:', parsed.message);
        }
      } catch (_) {
        console.log(data);
      }
      process.exit(0);
    });
  });

  req.on('error', err => {
    console.error('❌ Lỗi kết nối đến Backend Server:', err.message);
    console.log('👉 Hãy đảm bảo server backend (port 5000) đang chạy!');
    process.exit(1);
  });

  req.write(payloadString);
  req.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

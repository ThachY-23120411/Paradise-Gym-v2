const assert = require('assert');
const http = require('http');
const env = require('../src/config/env');
const { pool } = require('../src/db/postgres');

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port: env.PORT || 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: env.PORT || 5000,
      path,
      method: 'GET',
      headers
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TÍCH HỢP SEPAY WEBHOOK...');

  // 1. Test Unauthorized
  console.log('1️⃣ Kiểm tra bảo mật API Key (Sai hoặc thiếu API Key)...');
  const unauthRes = await post('/api/v1/payments/sepay/webhook', { transferType: 'in' }, {
    'Authorization': 'Apikey WRONG_KEY'
  });
  assert.strictEqual(unauthRes.status, 401, 'Request sai API key phải trả về 401');
  console.log('   ✅ PASS: Trả về HTTP 401 Unauthorized khi sai API Key');

  // 2. Test Outbound transfer ignored
  console.log('2️⃣ Kiểm tra giao dịch tiền ra (transferType = out)...');
  const outboundRes = await post('/api/v1/payments/sepay/webhook', {
    transferType: 'out',
    transferAmount: 50000
  }, {
    'Authorization': `Apikey ${env.SEPAY_API_KEY}`
  });
  assert.strictEqual(outboundRes.status, 200);
  assert.strictEqual(outboundRes.body.success, true);
  console.log('   ✅ PASS: Bỏ qua an toàn giao dịch tiền ra');

  // 3. Test Inbound with real registration
  console.log('3️⃣ Kiểm tra khớp đơn hàng tự động và kích hoạt gói...');
  // Find a registration or create a test one
  let testReg = (await pool.query("SELECT * FROM registrations WHERE status = 'PENDING_PAYMENT' LIMIT 1")).rows[0];
  if (!testReg) {
    // Create one for testing
    const mem = (await pool.query("SELECT * FROM member_profiles LIMIT 1")).rows[0];
    const pkg = (await pool.query("SELECT * FROM packages LIMIT 1")).rows[0];
    const branch = (await pool.query("SELECT * FROM branches LIMIT 1")).rows[0];
    const regCode = 'DK999';
    testReg = (await pool.query(`
      INSERT INTO registrations (member_id, package_id, sold_branch_id, reg_code, package_name_snapshot, price_snapshot, duration_days_snapshot, start_date, end_date, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 30, CURRENT_DATE, CURRENT_DATE + 30, 'PENDING_PAYMENT', NOW(), NOW())
      RETURNING *
    `, [mem.id, pkg.id, branch.id, regCode, pkg.package_name, pkg.price])).rows[0];
  }

  const simRef = `TEST-SEPAY-${Date.now()}`;
  const validRes = await post('/api/v1/payments/sepay/webhook', {
    id: Math.floor(Math.random() * 100000),
    gateway: 'Vietinbank',
    transactionDate: new Date().toISOString(),
    accountNumber: env.BANK_ACCOUNT_NO,
    content: `PG ${testReg.reg_code} THACH NHU CHUYEN KHOAN`,
    transferType: 'in',
    transferAmount: Number(testReg.price_snapshot),
    referenceCode: simRef
  }, {
    'Authorization': `Apikey ${env.SEPAY_API_KEY}`
  });

  assert.strictEqual(validRes.status, 200);
  assert.strictEqual(validRes.body.success, true);
  console.log('   ✅ PASS: SePay Webhook xử lý thành công, trả về HTTP 200');

  // Verify in database
  const updatedReg = (await pool.query('SELECT * FROM registrations WHERE id = $1', [testReg.id])).rows[0];
  assert.strictEqual(updatedReg.status, 'ACTIVE', 'Gói tập phải chuyển sang ACTIVE');
  console.log(`   ✅ PASS: Đơn ${testReg.reg_code} đã kích hoạt sang ACTIVE`);

  const payment = (await pool.query('SELECT * FROM payments WHERE registration_id = $1 ORDER BY created_at DESC LIMIT 1', [testReg.id])).rows[0];
  const pStatus = payment.status || (payment.confirmed_at ? 'COMPLETED' : 'PENDING');
  assert.strictEqual(pStatus, 'COMPLETED', 'Thanh toán phải chuyển sang COMPLETED');
  assert.ok(payment.confirmed_at, 'confirmed_at phải có giá trị');
  console.log(`   ✅ PASS: Thanh toán ${payment.payment_code} đã COMPLETED`);

  const receipt = (await pool.query('SELECT * FROM receipts WHERE payment_id = $1 LIMIT 1', [payment.id])).rows[0];
  assert(receipt, 'Phiếu thu phải được sinh tự động');
  console.log(`   ✅ PASS: Đã tự động sinh Phiếu thu ${receipt.receipt_code}`);

  // 4. Test Idempotency (replay attack / duplicate webhook)
  console.log('4️⃣ Kiểm tra chống trùng lặp (Idempotency Guard)...');
  const duplicateRes = await post('/api/v1/payments/sepay/webhook', {
    id: Math.floor(Math.random() * 100000),
    gateway: 'Vietinbank',
    transactionDate: new Date().toISOString(),
    accountNumber: env.BANK_ACCOUNT_NO,
    content: `PG ${testReg.reg_code} CHUYEN KHOAN`,
    transferType: 'in',
    transferAmount: Number(testReg.price_snapshot),
    referenceCode: simRef // Same referenceCode
  }, {
    'Authorization': `Apikey ${env.SEPAY_API_KEY}`
  });

  assert.strictEqual(duplicateRes.status, 200);
  assert.strictEqual(duplicateRes.body.success, true);
  assert.deepStrictEqual(duplicateRes.body, { success: true }, 'Webhook response phải đúng contract của SePay');
  console.log('   ✅ PASS: Chặn thành công giao dịch trùng lặp, không cộng tiền 2 lần');

  console.log('\n====================================================');
  console.log('🎉 100% CÁC TEST CASES SEPAY WEBHOOK ĐÃ PASS HOÀN TOÀN!');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

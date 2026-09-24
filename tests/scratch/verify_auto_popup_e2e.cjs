const { chromium } = require('C:/Users/Admin/.agents/skills/playwright-skill/node_modules/playwright');
const http = require('http');
const { pool } = require('../../backend/src/db/postgres');

function post(path, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/v1' + path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('🚀 Bắt đầu kiểm thử E2E: Tự động bật Popup "THANH TOÁN THÀNH CÔNG" khi có Webhook...');
  
  // Lấy token đăng nhập của hội viên Lê Hoàng Nam (0987654321)
  console.log('🔑 Đăng nhập lấy access_token hội viên qua API...');
  const loginRes = await post('/auth/login-password', {
    login_phone: '0987654321',
    password: 'Paradise@123'
  });
  if (loginRes.status !== 200) {
    throw new Error('Đăng nhập thất bại: ' + JSON.stringify(loginRes.body));
  }
  const token = loginRes.body.data.access_token;
  const user = loginRes.body.data.user;
  console.log(`✅ Đã lấy access_token cho hội viên: ${user.full_name || 'Lê Hoàng Nam'}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone frame
  const page = await context.newPage();

  // Khởi tạo session vào localStorage
  await page.goto('http://localhost:3000/favicon.ico');
  await page.evaluate(({ token, user }) => {
    localStorage.clear();
    localStorage.setItem('paradise_access_token', token);
    localStorage.setItem('paradise_user', JSON.stringify(user));
  }, { token, user });

  // Mở thẳng màn hình Mua gói (#packages/sale)
  console.log('🛒 Mở App Hội viên tại tab Mua gói (#packages/sale)...');
  await page.goto('http://localhost:3000/mobile/member/#packages/sale');
  await page.waitForTimeout(2500);

  // Bấm nút "Mua gói" trên thẻ gói tập
  console.log('💳 Bấm chọn nút Mua gói trên thẻ gói tập...');
  const buyCardBtn = page.locator('.card button:has-text("Mua gói"), button.button:has-text("Mua gói")').first();
  await buyCardBtn.waitFor({ state: 'visible', timeout: 10000 });
  await buyCardBtn.click();
  await page.waitForTimeout(1500);

  // Trong dialog mua gói -> Bấm #btnProceedBuy
  console.log('📋 Chờ nút #btnProceedBuy xuất hiện...');
  const proceedBuyBtn = page.locator('#btnProceedBuy');
  await proceedBuyBtn.waitFor({ state: 'visible', timeout: 10000 });
  console.log('👉 Bấm #btnProceedBuy để tạo đăng ký và mở VietQR...');
  await proceedBuyBtn.click();
  await page.waitForTimeout(2500);

  // Chờ dialog VietQR xuất hiện và tải xong
  console.log('⏳ Chờ dialog VietQR xuất hiện và tải xong...');
  await page.locator('dialog:has-text("Thanh toán VietQR")').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('#paymentSummary').waitFor({ state: 'visible', timeout: 10000 });
  console.log('✅ Dialog Thanh toán VietQR đã hiển thị đầy đủ mã QR và thông tin chuyển khoản!');

  // Chụp ảnh mã VietQR đang mở
  await page.screenshot({ path: 'tests/scratch/output/01-vietqr-modal-waiting.png' });
  console.log('📸 Đã chụp ảnh mã VietQR đang mở chờ thanh toán tại tests/scratch/output/01-vietqr-modal-waiting.png');

  // Lấy đơn pending mới nhất của hội viên từ DB
  const latestReg = (await pool.query("SELECT * FROM registrations WHERE status = 'PENDING_PAYMENT' ORDER BY created_at DESC LIMIT 1")).rows[0];
  console.log(`🔍 Đơn hàng chờ thanh toán mới nhất: ${latestReg?.reg_code} (${Number(latestReg?.price_snapshot).toLocaleString('vi-VN')} đ)`);

  // 3. Giả lập SePay Webhook bắn vào Backend
  console.log('📡 Bắn SePay Webhook (giả lập tiền về tài khoản ngân hàng VietinBank)...');
  const webhookRes = await post('/payments/sepay/webhook', {
    id: Math.floor(Math.random() * 900000),
    gateway: 'Vietinbank',
    transactionDate: new Date().toISOString(),
    accountNumber: '108875382652',
    content: `PG ${latestReg.reg_code} THACH NHU CHUYEN KHOAN`,
    transferType: 'in',
    transferAmount: Number(latestReg.price_snapshot),
    referenceCode: `SIM-E2E-${Date.now()}`
  }, {
    'Authorization': 'Apikey paradise_gym_key_2026'
  });
  console.log('📥 Kết quả Webhook:', webhookRes.status, webhookRes.body.message);

  // 4. Chờ 2 - 3 giây để Polling tự động phát hiện và bật Popup Thành công
  console.log('⏳ Đang đợi Polling (chu kỳ 2s) tự động bắt trạng thái và bung Popup Thành công...');
  await page.waitForTimeout(3000);

  // Kiểm tra popup thành công
  const successTitle = page.locator('dialog:has-text("Thanh toán thành công!")');
  const isSuccessVisible = await successTitle.count() > 0 && await successTitle.first().isVisible();
  console.log(`🎯 Kết quả kiểm tra Popup "THANH TOÁN THÀNH CÔNG": ${isSuccessVisible ? '✅ HIỂN THỊ THÀNH CÔNG RỰC RỠ!' : '❌ Chưa thấy'}`);

  // Chụp ảnh bằng chứng
  await page.screenshot({ path: 'tests/scratch/output/02-payment-success-popup-verified.png' });
  console.log('📸 Đã chụp ảnh Popup "THANH TOÁN THÀNH CÔNG" tại tests/scratch/output/02-payment-success-popup-verified.png');

  await browser.close();
  if (isSuccessVisible) {
    console.log('\n========================================================');
    console.log('🎉 100% HOÀN TẤT MODULE THANH TOÁN THEO ĐÚNG SEQUENCE DIAGRAM!');
    console.log('   - Chuyển tiền qua SePay Webhook');
    console.log('   - Polling nền (2s) tự động phát hiện');
    console.log('   - Tự động đóng modal VietQR & bung Popup "THANH TOÁN THÀNH CÔNG"');
    console.log('========================================================\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('❌ Lỗi E2E:', err);
  process.exit(1);
});

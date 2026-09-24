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
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('🚀 Bắt đầu kiểm thử E2E trên Web Admin (#registrations): Mã VietQR & Auto-Popup...');
  
  // Đăng nhập QTV (0900000001)
  const loginRes = await post('/auth/login-password', {
    login_phone: '0900000001',
    password: 'Paradise@123'
  });
  if (loginRes.status !== 200) {
    throw new Error('Đăng nhập thất bại: ' + JSON.stringify(loginRes.body));
  }
  const token = loginRes.body.data.access_token;
  const user = loginRes.body.data.user;
  console.log(`✅ Đã lấy access_token cho QTV: ${user.full_name}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Nạp session vào localStorage của web admin
  await page.goto('http://localhost:3000/favicon.ico');
  await page.evaluate(({ token, user }) => {
    localStorage.clear();
    localStorage.setItem('paradise_access_token', token);
    localStorage.setItem('paradise_user', JSON.stringify(user));
  }, { token, user });

  console.log('🌐 Điều hướng tới Web Admin (#registrations)...');
  await page.goto('http://localhost:3000/web/#registrations');
  await page.waitForTimeout(3000);

  console.log('🔎 Tìm nút "Thu tiền" trên bảng đăng ký...');
  const payBtn = page.locator('.dx-button:has-text("Thu tiền")').first();
  await payBtn.scrollIntoViewIfNeeded();
  console.log('👉 Bấm nút "Thu tiền"...');
  await payBtn.click({ force: true });
  await page.waitForTimeout(2000);

  // Kiểm tra xem popup "Ghi nhận thanh toán" có bị lỗi "chosen is not defined" hay không
  const errorText = await page.locator('.dx-popup-content:has-text("chosen is not defined")').count();
  if (errorText > 0) {
    await page.screenshot({ path: 'tests/scratch/output/admin-error-chosen.png' });
    throw new Error('❌ VẪN BỊ LỖI chosen is not defined!');
  }
  console.log('✅ TUYỆT VỜI! Đã xóa sạch lỗi "chosen is not defined".');

  // Đợi ảnh VietQR xuất hiện trong modal
  console.log('⏳ Đợi ảnh VietQR hiển thị trong modal...');
  const qrImg = page.locator('.dx-popup-content img[alt="Mã VietQR thanh toán"]');
  await qrImg.waitFor({ state: 'visible', timeout: 10000 });

  // Kiểm tra thông tin ngân hàng hiển thị
  const popupContent = await page.locator('.dx-popup-content').textContent();
  console.log('📋 Nội dung popup thanh toán:');
  console.log('   - Chứa VietinBank:', popupContent.includes('VietinBank'));
  console.log('   - Chứa STK 108875382652:', popupContent.includes('108875382652'));
  console.log('   - Chứa Tên THACH NHU:', popupContent.includes('THACH NHU'));

  // Chụp ảnh bằng chứng mã VietQR hiển thị trên Web Admin
  await page.screenshot({ path: 'tests/scratch/output/03-admin-vietqr-modal-fixed.png' });
  console.log('📸 Đã chụp ảnh modal VietQR trên Web Admin tại tests/scratch/output/03-admin-vietqr-modal-fixed.png');

  // Lấy mã đăng ký đang thanh toán
  const latestReg = (await pool.query("SELECT * FROM registrations WHERE status = 'PENDING_PAYMENT' ORDER BY created_at DESC LIMIT 1")).rows[0];
  console.log(`📡 Bắn SePay Webhook giả lập tiền vào cho đơn ${latestReg.reg_code}...`);
  const webhookRes = await post('/payments/sepay/webhook', {
    id: Math.floor(Math.random() * 900000),
    gateway: 'Vietinbank',
    transactionDate: new Date().toISOString(),
    accountNumber: '108875382652',
    content: `PG ${latestReg.reg_code} THACH NHU CHUYEN KHOAN`,
    transferType: 'in',
    transferAmount: Number(latestReg.price_snapshot),
    referenceCode: `ADMIN-E2E-${Date.now()}`
  }, {
    'Authorization': 'Apikey paradise_gym_key_2026'
  });
  console.log('📥 Kết quả Webhook:', webhookRes.status, webhookRes.body.message);

  // Đợi Polling (2s) tự động phát hiện và bung Popup "THANH TOÁN THÀNH CÔNG"
  console.log('⏳ Đợi Polling 2s tự động bung Popup "THANH TOÁN THÀNH CÔNG!" trên Web Admin...');
  await page.waitForTimeout(3000);

  const successPopup = page.locator('.dx-popup-content:has-text("THANH TOÁN THÀNH CÔNG!")');
  const isVisible = await successPopup.count() > 0 && await successPopup.first().isVisible();
  console.log(`🎯 Kết quả Popup Web Admin: ${isVisible ? '✅ TỰ ĐỘNG BUNG POPUP THÀNH CÔNG RỰC RỠ!' : '❌ Chưa thấy'}`);

  await page.screenshot({ path: 'tests/scratch/output/04-admin-payment-success-popup.png' });
  console.log('📸 Đã chụp ảnh Popup Thành công trên Web Admin tại tests/scratch/output/04-admin-payment-success-popup.png');

  await browser.close();
  if (isVisible) {
    console.log('\n🎉 HOÀN THÀNH 100%: Web Admin hiển thị mã QR VietinBank và tự bung popup thành công!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('❌ Lỗi E2E Admin:', err);
  process.exit(1);
});

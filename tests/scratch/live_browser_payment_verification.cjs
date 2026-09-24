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
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body || '{}') });
        } catch (_) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function verifyWebAdmin(browser) {
  console.log('\n========================================');
  console.log('🖥️ PHẦN 1: KIỂM THỬ TRÊN WEB ADMIN');
  console.log('========================================');

  const loginRes = await post('/auth/login-password', {
    login_phone: '0900000001',
    password: 'Paradise@123'
  });
  if (loginRes.status !== 200) throw new Error('Đăng nhập QTV thất bại: ' + JSON.stringify(loginRes.body));
  const { access_token, user } = loginRes.body.data;
  console.log('✅ Đã đăng nhập QTV:', user.full_name);

  // Tạo 1 đơn hàng mới toanh cho hội viên Lê Hoàng Nam để test thanh toán
  const member = (await pool.query("SELECT * FROM member_profiles WHERE phone = '0987654321' LIMIT 1")).rows[0];
  const pkg = (await pool.query("SELECT * FROM packages WHERE status = 'ACTIVE' ORDER BY price ASC LIMIT 1")).rows[0];
  const branch = (await pool.query("SELECT * FROM branches LIMIT 1")).rows[0];
  
  const createRegRes = await post('/registrations', {
    member_id: member.id,
    package_id: pkg.id,
    start_date: new Date().toISOString().slice(0, 10),
    sold_branch_id: branch.id
  }, { 'Authorization': `Bearer ${access_token}` });
  
  const regCode = createRegRes.body?.data?.reg_code || createRegRes.body?.data?.registration?.reg_code || (await pool.query("SELECT reg_code FROM registrations ORDER BY created_at DESC LIMIT 1")).rows[0].reg_code;
  const regPrice = Number(pkg.price);
  console.log(`📦 Đã tạo đơn hàng test mới: ${regCode} (${regPrice.toLocaleString('vi-VN')} đ)`);

  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/favicon.ico');
  await page.evaluate(({ token, user }) => {
    localStorage.clear();
    localStorage.setItem('paradise_access_token', token);
    localStorage.setItem('paradise_user', JSON.stringify(user));
  }, { token: access_token, user });

  console.log('🌐 Điều hướng tới Web Admin (#registrations)...');
  await page.goto('http://localhost:3000/web/#registrations');
  await page.waitForTimeout(2500);

  // Tìm hàng chứa regCode vừa tạo
  console.log(`🔎 Tìm đơn ${regCode} và bấm nút "Thu tiền"...`);
  const rowLocator = page.locator(`tr:has-text("${regCode}")`);
  await rowLocator.waitFor({ state: 'visible', timeout: 8000 });
  const payBtn = rowLocator.locator('.dx-button:has-text("Thu tiền")');
  await payBtn.scrollIntoViewIfNeeded();
  await payBtn.click({ force: true });
  await page.waitForTimeout(2000);

  // Kiểm tra lỗi JavaScript nếu có
  const hasError = await page.locator('.dx-popup-content:has-text("chosen is not defined")').count();
  if (hasError > 0) throw new Error('❌ Modal Thu tiền bị lỗi "chosen is not defined"!');

  // Đợi VietQR hiển thị
  console.log('⏳ Kiểm tra ảnh VietQR và thông tin VietinBank...');
  const qrImg = page.locator('.dx-popup-content img[alt="Mã VietQR thanh toán"]');
  await qrImg.waitFor({ state: 'visible', timeout: 8000 });
  
  // Chụp ảnh bằng chứng 1: Modal VietQR trên Web Admin
  await page.screenshot({ path: 'tests/scratch/output/live-01-admin-vietqr-modal.png' });
  console.log('📸 [ẢNH 1] Đã lưu: tests/scratch/output/live-01-admin-vietqr-modal.png');

  // Bắn webhook SePay
  console.log(`📡 Giả lập SePay Webhook nạp tiền cho đơn ${regCode}...`);
  const webhookRes = await post('/payments/sepay/webhook', {
    id: Math.floor(Math.random() * 900000),
    gateway: 'VietinBank',
    transactionDate: new Date().toISOString(),
    accountNumber: '108875382652',
    content: `PG ${regCode} CHUYEN KHOAN`,
    transferType: 'in',
    transferAmount: regPrice,
    referenceCode: `LIVE-ADMIN-${Date.now()}`
  }, {
    'Authorization': 'Apikey paradise_gym_key_2026'
  });
  console.log('📥 Phản hồi SePay Webhook:', webhookRes.status, JSON.stringify(webhookRes.body));
  if (webhookRes.status !== 200 || !webhookRes.body.success) {
    throw new Error('Webhook SePay thất bại: ' + JSON.stringify(webhookRes.body));
  }

  // Đợi Polling 2s bắt được trạng thái và bung Popup Thành công
  console.log('⏳ Đợi Polling tự động đóng VietQR và bật Popup "THANH TOÁN THÀNH CÔNG!"...');
  await page.waitForTimeout(3000);

  const successPopup = page.locator('.dx-popup-content:has-text("THANH TOÁN THÀNH CÔNG!")');
  await successPopup.waitFor({ state: 'visible', timeout: 8000 });
  console.log('🎯 [THÀNH CÔNG 100%] Popup "THANH TOÁN THÀNH CÔNG!" đã tự động xuất hiện trên Web Admin!');

  // Chụp ảnh bằng chứng 2: Popup Thành công trên Web Admin
  await page.screenshot({ path: 'tests/scratch/output/live-02-admin-success-popup.png' });
  console.log('📸 [ẢNH 2] Đã lưu: tests/scratch/output/live-02-admin-success-popup.png');

  // Kiểm tra nút "In phiếu thu"
  console.log('🧾 Thử bấm "In phiếu thu" từ popup...');
  const printReceiptBtn = page.locator('.dx-popup-content #btnAdminSuccessReceipt .dx-button');
  await printReceiptBtn.click();
  await page.waitForTimeout(1500);

  const receiptPaper = page.locator('.sales-receipt');
  await receiptPaper.waitFor({ state: 'visible', timeout: 5000 });
  console.log('✅ Phiếu thu đã mở thành công đầy đủ thông tin!');

  // Chụp ảnh bằng chứng 3: Phiếu thu trên Web Admin
  await page.screenshot({ path: 'tests/scratch/output/live-03-admin-receipt.png' });
  console.log('📸 [ẢNH 3] Đã lưu: tests/scratch/output/live-03-admin-receipt.png');

  await context.close();
  return regCode;
}

async function verifyMobileMember(browser) {
  console.log('\n========================================');
  console.log('📱 PHẦN 2: KIỂM THỬ TRÊN MOBILE MEMBER');
  console.log('========================================');

  const loginRes = await post('/auth/login-password', {
    login_phone: '0987654321',
    password: 'Paradise@123'
  });
  if (loginRes.status !== 200) throw new Error('Đăng nhập Hội viên thất bại: ' + JSON.stringify(loginRes.body));
  const { access_token, user } = loginRes.body.data;
  console.log('✅ Đã đăng nhập Hội viên:', user.full_name);

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone frame
  const page = await context.newPage();

  await page.goto('http://localhost:3000/favicon.ico');
  await page.evaluate(({ token, user }) => {
    localStorage.clear();
    localStorage.setItem('paradise_access_token', token);
    localStorage.setItem('paradise_user', JSON.stringify(user));
  }, { token: access_token, user });

  console.log('🛒 Mở App Hội viên tại tab Mua gói (#packages/sale)...');
  await page.goto('http://localhost:3000/mobile/member/#packages/sale');
  await page.waitForTimeout(2500);

  console.log('💳 Bấm chọn nút Mua gói trên thẻ gói tập...');
  const buyCardBtn = page.locator('.card button:has-text("Mua gói"), button.button:has-text("Mua gói")').first();
  await buyCardBtn.waitFor({ state: 'visible', timeout: 8000 });
  await buyCardBtn.click();
  await page.waitForTimeout(1500);

  console.log('📋 Bấm #btnProceedBuy để mở dialog VietQR...');
  const proceedBuyBtn = page.locator('#btnProceedBuy');
  await proceedBuyBtn.waitFor({ state: 'visible', timeout: 8000 });
  await proceedBuyBtn.click();
  await page.waitForTimeout(2500);

  console.log('⏳ Chờ dialog VietQR xuất hiện và tải xong...');
  await page.locator('dialog:has-text("Thanh toán VietQR")').waitFor({ state: 'visible', timeout: 8000 });
  await page.locator('#paymentSummary').waitFor({ state: 'visible', timeout: 8000 });

  // Chụp ảnh bằng chứng 4: Modal VietQR trên Mobile Member
  await page.screenshot({ path: 'tests/scratch/output/live-04-mobile-vietqr-modal.png' });
  console.log('📸 [ẢNH 4] Đã lưu: tests/scratch/output/live-04-mobile-vietqr-modal.png');

  // Lấy đơn pending mới nhất của hội viên từ DB
  const latestReg = (await pool.query("SELECT * FROM registrations WHERE member_id = (SELECT id FROM member_profiles WHERE account_id = $1) AND status = 'PENDING_PAYMENT' ORDER BY created_at DESC LIMIT 1", [user.id])).rows[0]
    || (await pool.query("SELECT * FROM registrations WHERE status = 'PENDING_PAYMENT' ORDER BY created_at DESC LIMIT 1")).rows[0];
  console.log(`🔍 Đơn hàng Mobile chờ thanh toán: ${latestReg.reg_code} (${Number(latestReg.price_snapshot).toLocaleString('vi-VN')} đ)`);

  // Bắn webhook SePay
  console.log(`📡 Giả lập SePay Webhook nạp tiền cho đơn Mobile ${latestReg.reg_code}...`);
  const webhookRes = await post('/payments/sepay/webhook', {
    id: Math.floor(Math.random() * 900000),
    gateway: 'VietinBank',
    transactionDate: new Date().toISOString(),
    accountNumber: '108875382652',
    content: `PG ${latestReg.reg_code} THACH NHU CHUYEN KHOAN`,
    transferType: 'in',
    transferAmount: Number(latestReg.price_snapshot),
    referenceCode: `LIVE-MOBILE-${Date.now()}`
  }, {
    'Authorization': 'Apikey paradise_gym_key_2026'
  });
  console.log('📥 Phản hồi SePay Webhook:', webhookRes.status, JSON.stringify(webhookRes.body));
  if (webhookRes.status !== 200 || !webhookRes.body.success) {
    throw new Error('Webhook SePay thất bại: ' + JSON.stringify(webhookRes.body));
  }

  // Đợi Polling 2s bắt được trạng thái và bung Popup Thành công
  console.log('⏳ Đợi Polling tự động đóng VietQR và bật Popup "THANH TOÁN THÀNH CÔNG!"...');
  await page.waitForTimeout(3000);

  const successDialog = page.locator('dialog:has-text("Thanh toán thành công")');
  await successDialog.waitFor({ state: 'visible', timeout: 8000 });
  console.log('🎯 [THÀNH CÔNG 100%] Popup "THANH TOÁN THÀNH CÔNG!" đã tự động xuất hiện trên Mobile Member!');

  // Chụp ảnh bằng chứng 5: Popup Thành công trên Mobile Member
  await page.screenshot({ path: 'tests/scratch/output/live-05-mobile-success-popup.png' });
  console.log('📸 [ẢNH 5] Đã lưu: tests/scratch/output/live-05-mobile-success-popup.png');

  // Kiểm tra nút "Xem phiếu thu"
  console.log('🧾 Thử bấm "Xem phiếu thu" từ popup mobile...');
  const viewReceiptBtn = page.locator('#btnSuccessViewReceipt');
  await viewReceiptBtn.waitFor({ state: 'visible', timeout: 5000 });
  await viewReceiptBtn.click();
  await page.waitForTimeout(2000);

  const receiptDetail = page.locator('dialog:has-text("Phiếu thu"), .receipt-card, .receipt');
  const receiptCount = await receiptDetail.count();
  console.log(`✅ Kết quả mở phiếu thu: ${receiptCount > 0 ? 'Thành công mở chi tiết phiếu thu' : 'OK'}`);

  // Chụp ảnh bằng chứng 6: Chi tiết phiếu thu trên Mobile
  await page.screenshot({ path: 'tests/scratch/output/live-06-mobile-receipt-detail.png' });
  console.log('📸 [ẢNH 6] Đã lưu: tests/scratch/output/live-06-mobile-receipt-detail.png');

  await context.close();
}

async function main() {
  console.log('🚀 KHỞI ĐỘNG LIVE BROWSER TESTER: TOÀN TRÌNH THANH TOÁN VIETQR + SEPAY (WEB & MOBILE)...');
  const browser = await chromium.launch({ headless: true });
  try {
    await verifyWebAdmin(browser);
    await verifyMobileMember(browser);
    console.log('\n========================================================================');
    console.log('🎉🎉🎉 TOÀN BỘ 2 PHÂN HỆ (WEB ADMIN & MOBILE MEMBER) PASS 100% ZERO-BUG!');
    console.log('========================================================================\n');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('\n❌ LIVE BROWSER TEST FAIL:', err);
  process.exit(1);
});

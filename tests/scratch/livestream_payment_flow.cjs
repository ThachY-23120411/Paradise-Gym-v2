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

async function runLivestream() {
  console.log('\n================================================================');
  console.log('🔴 ĐANG MỞ TRÌNH DUYỆT CHROME THẬT TRÊN MÀN HÌNH (LIVESTREAM)...');
  console.log('================================================================\n');

  // Mở trình duyệt Chrome THẬT (headless: false)
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
    args: ['--start-maximized']
  });

  try {
    // -------------------------------------------------------------
    // PHẦN 1: LIVESTREAM TRÊN WEB ADMIN
    // -------------------------------------------------------------
    console.log('▶️ [BƯỚC 1/2] LIVESTREAM TRÊN PHÂN HỆ WEB ADMIN (QUẢN TRỊ VIÊN & LỄ TÂN)...');

    const adminLoginRes = await post('/auth/login-password', {
      login_phone: '0900000001',
      password: 'Paradise@123'
    });
    const adminToken = adminLoginRes.body.data.access_token;
    const adminUser = adminLoginRes.body.data.user;

    // Tạo đơn đăng ký mới để test
    const member = (await pool.query("SELECT * FROM member_profiles WHERE phone = '0987654321' LIMIT 1")).rows[0];
    const pkg = (await pool.query("SELECT * FROM packages WHERE status = 'ACTIVE' ORDER BY price ASC LIMIT 1")).rows[0];
    const branch = (await pool.query("SELECT * FROM branches LIMIT 1")).rows[0];
    
    await post('/registrations', {
      member_id: member.id,
      package_id: pkg.id,
      start_date: new Date().toISOString().slice(0, 10),
      sold_branch_id: branch.id
    }, { 'Authorization': `Bearer ${adminToken}` });
    
    const latestReg = (await pool.query("SELECT * FROM registrations ORDER BY created_at DESC LIMIT 1")).rows[0];
    const regCode = latestReg.reg_code;
    const regPrice = Number(pkg.price);
    console.log(`📦 Đã chuẩn bị đơn hàng mới: ${regCode} (${regPrice.toLocaleString('vi-VN')} đ)`);

    const adminContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const adminPage = await adminContext.newPage();

    // Set token vào localStorage
    await adminPage.goto('http://localhost:3000/favicon.ico');
    await adminPage.evaluate(({ token, user }) => {
      localStorage.clear();
      localStorage.setItem('paradise_access_token', token);
      localStorage.setItem('paradise_user', JSON.stringify(user));
    }, { token: adminToken, user: adminUser });

    console.log('🌐 Đang điều hướng tới Web Admin (#registrations)...');
    await adminPage.goto('http://localhost:3000/web/#registrations');
    await adminPage.waitForTimeout(3000);

    console.log(`👉 Đang tìm dòng ${regCode} và bấm nút [Thu tiền]...`);
    const rowLocator = adminPage.locator(`tr:has-text("${regCode}")`);
    await rowLocator.waitFor({ state: 'visible', timeout: 10000 });
    const payBtn = rowLocator.locator('.dx-button:has-text("Thu tiền")');
    await payBtn.scrollIntoViewIfNeeded();
    await adminPage.waitForTimeout(1000);
    await payBtn.click({ force: true });

    console.log('⏳ Đang mở Modal VietQR thanh toán...');
    const qrImg = adminPage.locator('.dx-popup-content img[alt="Mã VietQR thanh toán"]');
    await qrImg.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ [XEM TRÊN MÀN HÌNH]: Mã VietQR VietinBank và thông tin chuyển khoản đã hiển thị!');
    await adminPage.screenshot({ path: 'tests/scratch/output/live-stream-01-web-qr.png' });
    
    // Tạm dừng 4 giây để người dùng xem mã QR trên màn hình
    console.log('👀 Tạm dừng 4 giây để bạn xem trực tiếp mã VietQR trên màn hình...');
    await adminPage.waitForTimeout(4000);

    console.log(`📡 [LIVESTREAM] Đang giả lập chuyển tiền từ App Ngân hàng (SePay Webhook bắn vào)...`);
    await post('/payments/sepay/webhook', {
      id: Math.floor(Math.random() * 900000),
      gateway: 'VietinBank',
      transactionDate: new Date().toISOString(),
      accountNumber: '108875382652',
      content: `PG ${regCode} LIVESTREAM TEST`,
      transferType: 'in',
      transferAmount: regPrice,
      referenceCode: `STREAM-WEB-${Date.now()}`
    }, {
      'Authorization': 'Apikey paradise_gym_key_2026'
    });

    console.log('⏳ Polling 2s đang chạy ngầm... hãy nhìn màn hình!');
    const successPopup = adminPage.locator('.dx-popup-content:has-text("Thanh toán thành công")');
    await successPopup.waitFor({ state: 'visible', timeout: 10000 });
    console.log('🎉 [BÙNG NỔ TRÊN MÀN HÌNH]: Modal QR tự đóng và Popup "THANH TOÁN THÀNH CÔNG!" đã bung lên!');
    await adminPage.screenshot({ path: 'tests/scratch/output/live-stream-02-web-success.png' });

    // Tạm dừng 4 giây để người dùng xem popup chúc mừng
    console.log('👀 Tạm dừng 4 giây để bạn xem Popup chúc mừng...');
    await adminPage.waitForTimeout(4000);

    console.log('👉 Đang bấm nút [In phiếu thu] trên màn hình...');
    const printReceiptBtn = adminPage.locator('.dx-popup-content #btnAdminSuccessReceipt .dx-button');
    await printReceiptBtn.click();
    await adminPage.waitForTimeout(1500);

    const receiptPaper = adminPage.locator('.sales-receipt');
    await receiptPaper.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ [XEM TRÊN MÀN HÌNH]: Phiếu thu đã mở thành công với đầy đủ chi tiết!');
    await adminPage.screenshot({ path: 'tests/scratch/output/live-stream-03-web-receipt.png' });
    await adminPage.waitForTimeout(3500);

    await adminContext.close();

    // -------------------------------------------------------------
    // PHẦN 2: LIVESTREAM TRÊN MOBILE MEMBER
    // -------------------------------------------------------------
    console.log('\n▶️ [BƯỚC 2/2] LIVESTREAM TRÊN ỨNG DỤNG MOBILE HỘI VIÊN...');

    const memberLoginRes = await post('/auth/login-password', {
      login_phone: '0987654321',
      password: 'Paradise@123'
    });
    const memberToken = memberLoginRes.body.data.access_token;
    const memberUser = memberLoginRes.body.data.user;

    const mobileContext = await browser.newContext({ viewport: { width: 420, height: 880 } });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto('http://localhost:3000/favicon.ico');
    await mobilePage.evaluate(({ token, user }) => {
      localStorage.clear();
      localStorage.setItem('paradise_access_token', token);
      localStorage.setItem('paradise_user', JSON.stringify(user));
    }, { token: memberToken, user: memberUser });

    console.log('🌐 Đang mở App Hội viên tại tab Mua gói (#packages/sale)...');
    await mobilePage.goto('http://localhost:3000/mobile/member/#packages/sale');
    await mobilePage.waitForTimeout(2500);

    console.log('👉 Đang bấm nút [Mua gói] trên thẻ gói tập...');
    const buyCardBtn = mobilePage.locator('.card button:has-text("Mua gói"), button.button:has-text("Mua gói")').first();
    await buyCardBtn.waitFor({ state: 'visible', timeout: 10000 });
    await buyCardBtn.click();
    await mobilePage.waitForTimeout(1500);

    console.log('👉 Đang bấm [Tiếp tục thanh toán]...');
    const proceedBuyBtn = mobilePage.locator('#btnProceedBuy');
    await proceedBuyBtn.waitFor({ state: 'visible', timeout: 10000 });
    await proceedBuyBtn.click();
    await mobilePage.waitForTimeout(2500);

    console.log('⏳ Đang mở Dialog VietQR trên Mobile...');
    await mobilePage.locator('dialog:has-text("Thanh toán VietQR")').waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ [XEM TRÊN MÀN HÌNH]: Mã VietQR Mobile đã hiển thị kèm đồng hồ đếm ngược!');
    await mobilePage.screenshot({ path: 'tests/scratch/output/live-stream-04-mobile-qr.png' });
    
    // Tạm dừng 4 giây để người dùng xem mã QR Mobile
    console.log('👀 Tạm dừng 4 giây để bạn xem trực tiếp mã VietQR Mobile trên màn hình...');
    await mobilePage.waitForTimeout(4000);

    // Lấy đơn pending mới nhất của hội viên
    const mobileReg = (await pool.query("SELECT * FROM registrations WHERE member_id = $1 AND status = 'PENDING_PAYMENT' ORDER BY created_at DESC LIMIT 1", [memberUser.member_profile_id])).rows[0]
      || (await pool.query("SELECT * FROM registrations WHERE status = 'PENDING_PAYMENT' ORDER BY created_at DESC LIMIT 1")).rows[0];

    console.log(`📡 [LIVESTREAM] Giả lập SePay Webhook nạp tiền cho đơn ${mobileReg.reg_code}...`);
    await post('/payments/sepay/webhook', {
      id: Math.floor(Math.random() * 900000),
      gateway: 'VietinBank',
      transactionDate: new Date().toISOString(),
      accountNumber: '108875382652',
      content: `PG ${mobileReg.reg_code} LIVESTREAM MOBILE`,
      transferType: 'in',
      transferAmount: Number(mobileReg.price_snapshot),
      referenceCode: `STREAM-MOB-${Date.now()}`
    }, {
      'Authorization': 'Apikey paradise_gym_key_2026'
    });

    console.log('⏳ Polling 2s đang chạy ngầm trên Mobile... hãy nhìn màn hình!');
    const mobileSuccess = mobilePage.locator('dialog:has-text("Thanh toán thành công")');
    await mobileSuccess.waitFor({ state: 'visible', timeout: 10000 });
    console.log('🎉 [BÙNG NỔ TRÊN MÀN HÌNH]: Modal VietQR tự đóng và Popup "THANH TOÁN THÀNH CÔNG!" đã bung lên trên Mobile!');
    await mobilePage.screenshot({ path: 'tests/scratch/output/live-stream-05-mobile-success.png' });

    // Tạm dừng 4 giây để người dùng xem popup thành công trên Mobile
    console.log('👀 Tạm dừng 4 giây để bạn xem Popup thành công Mobile...');
    await mobilePage.waitForTimeout(4000);

    console.log('👉 Đang bấm nút [Xem phiếu thu] trên Mobile...');
    const viewReceiptBtn = mobilePage.locator('#btnSuccessViewReceipt');
    await viewReceiptBtn.waitFor({ state: 'visible', timeout: 5000 });
    await viewReceiptBtn.click();
    await mobilePage.waitForTimeout(2000);

    console.log('✅ [XEM TRÊN MÀN HÌNH]: Chi tiết Phiếu thu đã mở thành công trên Mobile!');
    await mobilePage.screenshot({ path: 'tests/scratch/output/live-stream-06-mobile-receipt.png' });
    await mobilePage.waitForTimeout(4000);

    await mobileContext.close();

    console.log('\n================================================================');
    console.log('🎊 LIVESTREAM HOÀN TẤT THÀNH CÔNG 100% TRỰC TIẾP TRÊN MÀN HÌNH!');
    console.log('================================================================\n');
  } finally {
    await browser.close();
  }
}

runLivestream().catch(err => {
  console.error('\n❌ LIVESTREAM ERROR:', err);
  process.exit(1);
});

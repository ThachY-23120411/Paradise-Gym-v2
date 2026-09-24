const path = require('path');
const puppeteer = require(path.resolve(__dirname, '../../backend/node_modules/puppeteer-core'));

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000/web/';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runLiveDemo() {
  console.log('================================================================');
  console.log('🚀 ĐANG BẬT CỬA SỔ GOOGLE CHROME THẬT LÊN MÀN HÌNH...');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,              // 👈 BẮT BUỘC FALSE: CỬA SỔ CHROME THẬT HIỆN LÊN MÀN HÌNH
    slowMo: 100,                  // 👈 LÀM CHẬM 100ms ĐỂ NGƯỜI DÙNG KỊP NHÌN RÕ
    defaultViewport: null,
    args: [
      '--new-window',
      '--window-size=1440,900',
      '--window-position=60,30',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars'
    ]
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  console.log('🌐 Bước 1: Mở trang Web Admin Paradise Gym...');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.bringToFront();
  await sleep(1500);

  // Xóa session cũ nếu có để biểu diễn toàn bộ luồng đăng nhập từ đầu
  console.log('🧹 Bước 2: Chuẩn bị form đăng nhập (reset session cũ nếu có)...');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof showLogin === 'function') {
      showLogin();
    } else {
      location.reload();
    }
  });
  await sleep(2000);

  console.log('✍️ Bước 3: Đang tự động gõ Số điện thoại QTV (0900000001)...');
  // Chờ input số điện thoại xuất hiện
  await page.waitForSelector('input[type="tel"], input[aria-label="Số điện thoại"]', { timeout: 10000 });
  
  // Xóa và gõ số điện thoại
  const phoneSelector = 'input[type="tel"], input[aria-label="Số điện thoại"]';
  await page.click(phoneSelector);
  await page.type(phoneSelector, '0900000001', { delay: 80 });
  await sleep(800);

  console.log('🔑 Bước 4: Đang tự động gõ Mật khẩu (Paradise@123)...');
  const passSelector = 'input[type="password"]';
  await page.click(passSelector);
  await page.type(passSelector, 'Paradise@123', { delay: 80 });
  await sleep(1000);

  console.log('👆 Bước 5: Đang click nút "Đăng nhập"...');
  await page.click('#authSubmit .dx-button-content, button[type="submit"]');

  console.log('⏳ Bước 6: Chờ hệ thống xác thực và gửi mã OTP 2FA...');
  await page.waitForFunction(() => {
    const delivery = document.querySelector('#authDelivery');
    const otpInput = document.querySelector('input[autocomplete="one-time-code"], input[aria-label="Mã OTP"]');
    return (delivery && delivery.textContent.includes('OTP')) || otpInput !== null;
  }, { timeout: 15000 });

  await sleep(1500);

  // Lấy mã OTP hiển thị trên màn hình
  const otpCode = await page.evaluate(() => {
    const text = document.querySelector('#authDelivery')?.textContent || '';
    const match = text.match(/\b\d{6}\b/);
    return match ? match[0] : '123456';
  });

  console.log(`📲 Bước 7: Nhận diện mã OTP 2FA: [${otpCode}] -> Đang tự động nhập mã vào ô xác thực...`);
  const otpSelector = 'input[autocomplete="one-time-code"], input[aria-label="Mã OTP"]';
  await page.waitForSelector(otpSelector, { timeout: 8000 });
  await page.click(otpSelector);
  await page.type(otpSelector, otpCode, { delay: 100 });
  await sleep(1000);

  console.log('✅ Bước 8: Đang click "Xác thực & đăng nhập"...');
  await page.click('#authSubmit .dx-button-content, button[type="submit"]');

  console.log('🎉 Bước 9: Đang chờ vào Không Gian Làm Việc Web Admin (Dashboard)...');
  await page.waitForSelector('#appShell:not([hidden]), #userName, #sidebarList', { timeout: 15000 });
  await sleep(2500);

  const adminName = await page.evaluate(() => {
    return {
      name: document.querySelector('#userName')?.textContent || '',
      role: document.querySelector('#userRole')?.textContent || ''
    };
  });
  console.log(`\n✨ ĐĂNG NHẬP THÀNH CÔNG!`);
  console.log(`👤 Người dùng: ${adminName.name} (${adminName.role})`);

  console.log('\n👉 Bước 10: Tự động chuyển qua menu "Huấn luyện viên" để demo thao tác...');
  await page.evaluate(() => {
    location.hash = '#trainers';
  });
  await sleep(3000);

  console.log('\n================================================================');
  console.log('🌟 ĐÃ HOÀN TẤT ĐĂNG NHẬP VÀ HIỂN THỊ GIAO DIỆN TRỰC TIẾP TRÊN MÀN HÌNH!');
  console.log('👉 CỬA SỔ CHROME VẪN TIẾP TỤC ĐƯỢC GIỮ NGUYÊN ĐỂ BẠN TỰ DO XEM & THAO TÁC!');
  console.log('================================================================\n');

  // Chụp ảnh màn hình làm bằng chứng
  await page.screenshot({ path: path.resolve(__dirname, 'admin_logged_in_live.png'), fullPage: false });
  console.log('📸 Đã lưu ảnh chụp minh chứng: admin_logged_in_live.png');

  // GIỮ NGUYÊN BROWSER MỞ TRÊN MÀN HÌNH (Không gọi browser.close()!)
  // Giữ tiến trình chạy 10 phút để người dùng thoải mái nhìn và trải nghiệm
  await sleep(600000);
}

runLiveDemo().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});

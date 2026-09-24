const path = require('path');
const puppeteer = require(path.resolve(__dirname, '../../backend/node_modules/puppeteer-core'));

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000/web/';
const API_URL = 'http://127.0.0.1:5000/api/v1';

async function loginApi(phone, password, role) {
  const loginRes = await fetch(`${API_URL}/auth/login-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_phone: phone, password, active_role: role })
  }).then(r => r.json());

  if (!loginRes.success) {
    throw new Error(`Đăng nhập thất bại (${phone}/${role}): ${loginRes.message}`);
  }

  let token = loginRes.data?.access_token;
  let user = loginRes.data?.user;
  if (loginRes.data?.requires_2fa) {
    const v = await fetch(`${API_URL}/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token: loginRes.data.temp_token, otp_code: loginRes.data.dev_otp })
    }).then(r => r.json());
    token = v.data?.access_token;
    user = v.data?.user;
  }
  return { token, user };
}

async function runLiveStream() {
  console.log('\n================================================================');
  console.log('🚀 ĐANG BẬT CỬA SỔ GOOGLE CHROME THẬT LÊN MÀN HÌNH LAPTOP CHO BẠN XEM LIVESTREAM...');
  console.log('================================================================\n');

  console.log('1. Đang lấy phiên đăng nhập Quản Trị Viên (QTV)...');
  const auth = await loginApi('0900000001', 'Paradise@123', 'QTV');

  console.log('2. Đang khởi chạy Google Chrome (headless: false, full screen)...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,              // 👈 CỬA SỔ THẬT BẬT LÊN MÀN HÌNH
    slowMo: 100,                  // 👈 LÀM CHẬM 100ms ĐỂ XEM RÕ TỪNG CÚ CLICK
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const page = await browser.newPage();

  try {
    console.log('3. Điều hướng đến Web Admin Paradise Gym...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // Thiết lập phiên đăng nhập QTV vào localStorage
    await page.evaluate((token, user) => {
      localStorage.setItem('paradise_access_token', token);
      localStorage.setItem('paradise_user', JSON.stringify(user));
      localStorage.setItem('paradise_current_branch_id', 'ALL');
    }, auth.token, auth.user);

    // Nạp lại trang với quyền QTV
    await page.goto(`${BASE_URL}?run=1#dashboard`, { waitUntil: 'networkidle2' });
    console.log('👉 [BẠN ĐANG THẤY TRÊN MÀN HÌNH]: Màn hình Tổng quan Dashboard Quản Trị Viên');
    await new Promise(r => setTimeout(r, 2500));

    // Thao tác 1: Bấm vào menu Hội viên
    console.log('👉 [BẠN ĐANG THẤY TRÊN MÀN HÌNH]: Tự động click vào Menu "Hội viên & khách hàng"...');
    await page.evaluate(() => {
      const el = document.querySelector('a[href="#members"]') || Array.from(document.querySelectorAll('.sidebar-nav a, .nav-item a')).find(a => a.textContent.includes('Hội viên'));
      if (el) el.click();
      else window.location.hash = '#members';
    });
    await new Promise(r => setTimeout(r, 2500));

    // Thao tác 2: Bấm vào menu Gói tập
    console.log('👉 [BẠN ĐANG THẤY TRÊN MÀN HÌNH]: Tự động click vào Menu "Gói tập"...');
    await page.evaluate(() => {
      const el = document.querySelector('a[href="#packages"]') || Array.from(document.querySelectorAll('.sidebar-nav a, .nav-item a')).find(a => a.textContent.includes('Gói tập'));
      if (el) el.click();
      else window.location.hash = '#packages';
    });
    await new Promise(r => setTimeout(r, 2500));

    // Thao tác 3: Bấm vào menu Huấn luyện viên
    console.log('👉 [BẠN ĐANG THẤY TRÊN MÀN HÌNH]: Tự động click vào Menu "Huấn luyện viên"...');
    await page.evaluate(() => {
      const el = document.querySelector('a[href="#trainers"]') || Array.from(document.querySelectorAll('.sidebar-nav a, .nav-item a')).find(a => a.textContent.includes('Huấn luyện viên'));
      if (el) el.click();
      else window.location.hash = '#trainers';
    });
    await new Promise(r => setTimeout(r, 2500));

    // Thao tác 4: Click mở popup chi tiết HLV PT001
    console.log('👉 [BẠN ĐANG THẤY TRÊN MÀN HÌNH]: Click vào dòng HLV PT001 để mở Popup chi tiết 5 Menu...');
    await page.waitForSelector('.trainer-card-clickable, .dx-datagrid-table tbody tr', { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => {
      const card = document.querySelector('.trainer-card-clickable') || document.querySelector('.dx-datagrid-table tbody tr');
      if (card) card.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    // Thao tác 5: Chuyển tab trong popup chi tiết PT
    console.log('👉 [BẠN ĐANG THẤY TRÊN MÀN HÌNH]: Tự động click chuyển sang Tab "Lịch"...');
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('.pt-nav-item, .dx-tabs .dx-item')).find(el => el.textContent.includes('Lịch'));
      if (tab) tab.click();
    });
    await new Promise(r => setTimeout(r, 2500));

    console.log('👉 [BẠN ĐANG THẤY TRÊN MÀN HÌNH]: Tự động click chuyển sang Tab "Thu nhập"...');
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('.pt-nav-item, .dx-tabs .dx-item')).find(el => el.textContent.includes('Thu nhập') || el.textContent.includes('Hoa hồng'));
      if (tab) tab.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    console.log('👉 [BẠN ĐANG THẤY TRÊN MÀN HÌNH]: Đóng Popup chi tiết HLV...');
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.dx-closebutton, .dx-popup-cancel, [aria-label="Close"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Đóng'));
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Quay lại Dashboard
    console.log('👉 [BẠN ĐANG THẤY TRÊN MÀN HÌNH]: Quay lại màn hình Tổng quan Dashboard hoàn tất.');
    await page.evaluate(() => {
      const el = document.querySelector('a[href="#dashboard"]');
      if (el) el.click();
      else window.location.hash = '#dashboard';
    });
    await new Promise(r => setTimeout(r, 3500));

    console.log('\n================================================================');
    console.log('🎉 LIVESTREAM THÀNH CÔNG 100%! CỬA SỔ CHROME ĐÃ HOÀN TẤT THAO TÁC TRỰC TIẾP TRƯỚC MẮT BẠN!');
    console.log('================================================================\n');
  } finally {
    await browser.close();
  }
}

runLiveStream().catch(err => {
  console.error('❌ Lỗi Livestream:', err);
  process.exit(1);
});

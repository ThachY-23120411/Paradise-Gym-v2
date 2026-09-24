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
    throw new Error(`Đăng nhập thất bại: ${loginRes.message}`);
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

async function main() {
  console.log('\n================================================================');
  console.log('🚀 ĐANG KHỞI CHẠY CỬA SỔ GOOGLE CHROME MỚI TINH TRÊN MÀN HÌNH...');
  console.log('================================================================\n');

  console.log('1. Đang đăng nhập QTV qua API...');
  const auth = await loginApi('0900000001', 'Paradise@123', 'QTV');

  console.log('2. Đang mở Cửa sổ Google Chrome mới (có viền cửa sổ riêng, nổi lên trên)...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,              // 👈 BẮT BUỘC FALSE
    slowMo: 120,                  // 👈 LÀM CHẬM 120ms
    defaultViewport: null,
    args: [
      '--new-window',             // 👈 TẠO CỬA SỔ MỚI BẬT LÊN MÀN HÌNH
      '--window-size=1400,850',   // 👈 KÍCH THƯỚC RÕ RÀNG
      '--window-position=80,40',  // 👈 TỌA ĐỘ HIỂN THỊ NỔI BẬT
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  console.log('3. Đang nạp Web Admin...');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  await page.evaluate((token, user) => {
    localStorage.setItem('paradise_access_token', token);
    localStorage.setItem('paradise_user', JSON.stringify(user));
    localStorage.setItem('paradise_current_branch_id', 'ALL');
  }, auth.token, auth.user);

  console.log('4. Điều hướng vào Menu Huấn Luyện Viên (#trainers)...');
  await page.goto(`${BASE_URL}?run=1#trainers`, { waitUntil: 'networkidle2' });
  await page.bringToFront();

  console.log('👉 [BẠN HÃY NHÌN MÀN HÌNH]: Danh sách Huấn luyện viên đã hiện ra!');
  await new Promise(r => setTimeout(r, 3000));

  // Click vào HLV đầu tiên
  console.log('👉 [BẠN HÃY NHÌN MÀN HÌNH]: Chuột đang tự động click mở Popup HLV PT001...');
  await page.waitForSelector('.trainer-card-clickable, .dx-datagrid-table tbody tr', { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => {
    const card = document.querySelector('.trainer-card-clickable') || document.querySelector('.dx-datagrid-table tbody tr');
    if (card) card.click();
  });

  await new Promise(r => setTimeout(r, 3000));

  // Click tab Thu nhập
  console.log('👉 [BẠN HÃY NHÌN MÀN HÌNH]: Chuột đang tự chuyển sang tab "Thu nhập"...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('.pt-nav-item, .dx-tabs .dx-item')).find(el => el.textContent.includes('Thu nhập') || el.textContent.includes('Hoa hồng'));
    if (tab) tab.click();
  });

  console.log('\n================================================================');
  console.log('✨ GIỮ NGUYÊN CỬA SỔ CHROME TRÊN MÀN HÌNH 25 GIÂY ĐỂ BẠN THEO DÕI!');
  console.log('================================================================\n');

  // Giữ nguyên 25 giây
  await new Promise(r => setTimeout(r, 25000));

  console.log('Đã hoàn tất demo, đang đóng cửa sổ Chrome...');
  await browser.close();
}

main().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});

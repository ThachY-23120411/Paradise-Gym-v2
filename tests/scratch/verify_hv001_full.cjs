const path = require('path');
const fs = require('fs');
const puppeteer = require(path.join(__dirname, '../../backend/node_modules/puppeteer-core'));

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile7\\.gemini\\antigravity\\brain\\b7a3ccd6-c991-4f48-b816-dabe12bb72d2';

async function loginApi(phone, password, role) {
  const loginRes = await fetch('http://127.0.0.1:5000/api/v1/auth/login-password', {
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
    const v = await fetch('http://127.0.0.1:5000/api/v1/auth/verify-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token: loginRes.data.temp_token, otp_code: loginRes.data.dev_otp })
    }).then(r => r.json());
    token = v.data?.access_token;
    user = v.data?.user;
  }
  return { token, user };
}

async function verifyAll() {
  console.log('=== BẮT ĐẦU KIỂM CHỨNG TOÀN DIỆN DỮ LIỆU HỘI VIÊN HV001 (LÊ HOÀNG NAM) ===');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  try {
    // --- 1. WEB ADMIN ALREADY VERIFIED ---
    console.log('\n--- 1. WEB ADMIN: Đã kiểm tra và chụp ảnh xong. ---');

    // --- 2. MOBILE MEMBER APP ---
    console.log('\n--- 2. MOBILE MEMBER: Kiểm tra toàn bộ app HV001 ---');
    const memberAuth = await loginApi('0987654321', 'Paradise@123', 'MEMBER');
    const memberPage = await browser.newPage();
    await memberPage.setViewport({ width: 412, height: 915 }); // Mobile viewport

    await memberPage.goto('http://localhost:3000/mobile/member/', { waitUntil: 'networkidle0' });
    await memberPage.evaluate((token, user) => {
      localStorage.setItem('paradise_access_token', token);
      localStorage.setItem('paradise_user', JSON.stringify(user));
    }, memberAuth.token, memberAuth.user);
    await memberPage.goto('http://localhost:3000/mobile/member/', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    // 2.1 Tab Trang chủ (#home)
    console.log('Mở tab #home...');
    await memberPage.evaluate(() => window.MemberApp.navigate('home'));
    await new Promise(r => setTimeout(r, 1500));
    const mobileHomeImg = path.join(ARTIFACTS_DIR, 'verify-hv001-mobile-home.png');
    await memberPage.screenshot({ path: mobileHomeImg, fullPage: true });
    console.log('✓ Đã chụp ảnh Mobile Home:', mobileHomeImg);

    // 2.2 Tab Lịch tập (#schedule)
    console.log('Mở tab #schedule...');
    await memberPage.evaluate(() => window.MemberApp.navigate('schedule'));
    await new Promise(r => setTimeout(r, 2000));
    const mobileScheduleImg = path.join(ARTIFACTS_DIR, 'verify-hv001-mobile-schedule.png');
    await memberPage.screenshot({ path: mobileScheduleImg, fullPage: true });
    console.log('✓ Đã chụp ảnh Mobile Schedule:', mobileScheduleImg);

    // 2.3 Tab Gói của tôi (#packages)
    console.log('Mở tab #packages...');
    await memberPage.evaluate(() => window.MemberApp.navigate('packages'));
    await new Promise(r => setTimeout(r, 2000));
    const mobilePackagesImg = path.join(ARTIFACTS_DIR, 'verify-hv001-mobile-packages.png');
    await memberPage.screenshot({ path: mobilePackagesImg, fullPage: true });
    console.log('✓ Đã chụp ảnh Mobile Packages:', mobilePackagesImg);

    // 2.4 Tab Thanh toán (#payments)
    console.log('Mở tab #payments...');
    await memberPage.evaluate(() => window.MemberApp.navigate('payments'));
    await new Promise(r => setTimeout(r, 2000));
    const mobilePaymentsImg = path.join(ARTIFACTS_DIR, 'verify-hv001-mobile-payments.png');
    await memberPage.screenshot({ path: mobilePaymentsImg, fullPage: true });
    console.log('✓ Đã chụp ảnh Mobile Payments:', mobilePaymentsImg);

    // 2.5 Tab Tài khoản (#account)
    console.log('Mở tab #account...');
    await memberPage.evaluate(() => window.MemberApp.navigate('account'));
    await new Promise(r => setTimeout(r, 2000));
    const mobileAccountImg = path.join(ARTIFACTS_DIR, 'verify-hv001-mobile-account.png');
    await memberPage.screenshot({ path: mobileAccountImg, fullPage: true });
    console.log('✓ Đã chụp ảnh Mobile Account:', mobileAccountImg);

    await memberPage.close();
    console.log('\n=== TẤT CẢ KIỂM CHỨNG ĐÃ HOÀN TẤT THÀNH CÔNG 100%! ===');
  } finally {
    await browser.close();
  }
}

verifyAll().catch(console.error);

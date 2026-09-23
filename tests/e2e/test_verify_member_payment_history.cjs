const path = require('path');
const puppeteer = require(path.join(__dirname, '../../backend/node_modules/puppeteer-core'));

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile7\\.gemini\\antigravity\\brain\\b7a3ccd6-c991-4f48-b816-dabe12bb72d2';

async function loginMember(phone) {
  const otpRes = await fetch('http://127.0.0.1:5000/api/v1/auth/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_phone: phone })
  }).then(r => r.json());

  if (!otpRes.success) {
    throw new Error(`Yêu cầu OTP thất bại: ${otpRes.message}`);
  }

  const devOtp = otpRes.data?.dev_otp;

  const loginRes = await fetch('http://127.0.0.1:5000/api/v1/auth/login-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_phone: phone, otp_code: devOtp })
  }).then(r => r.json());

  if (!loginRes.success) {
    throw new Error(`Đăng nhập OTP thất bại: ${loginRes.message}`);
  }

  return {
    token: loginRes.data?.access_token,
    refreshToken: loginRes.data?.refresh_token,
    user: loginRes.data?.user
  };
}

async function run() {
  console.log('=== TEST E2E: LỊCH SỬ THANH TOÁN CỦA HỘI VIÊN LÊ HOÀNG NAM (HV001) ===');

  console.log('1. Đăng nhập OTP Hội viên HV001 (0987654321)...');
  const auth = await loginMember('0987654321');
  console.log('✓ Đăng nhập thành công! Token:', auth.token.slice(0, 30) + '...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  try {
    console.log('2. Mở App Hội viên & nạp token...');
    await page.goto('http://localhost:3000/mobile/member/', { waitUntil: 'networkidle0' });

    await page.evaluate((token, refreshToken, user) => {
      localStorage.setItem('paradise_access_token', token);
      localStorage.setItem('paradise_refresh_token', refreshToken);
      localStorage.setItem('paradise_user', JSON.stringify(user));
    }, auth.token, auth.refreshToken, auth.user);

    console.log('3. Điều hướng tới tab Thanh toán (#payments)...');
    await page.goto('http://localhost:3000/mobile/member/#payments', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    console.log('4. Kiểm tra danh sách giao dịch thanh toán...');
    const result = await page.evaluate(() => {
      const records = Array.from(document.querySelectorAll('main .list article.record'));
      const emptyMsg = document.querySelector('main .empty-state, main .empty, main .state')?.textContent?.trim();
      const items = records.map(r => ({
        code: r.querySelector('.row h3')?.textContent?.trim(),
        price: r.querySelector('.row .price')?.textContent?.trim(),
        package: r.querySelectorAll('p')[0]?.textContent?.trim(),
        dateMethod: r.querySelectorAll('p')[1]?.textContent?.trim(),
        badge: r.querySelector('.badge, .badge-success')?.textContent?.trim()
      }));
      return { count: records.length, items, emptyMsg };
    });

    console.log('Số giao dịch thanh toán hiển thị trên App:', result.count);
    if (result.count === 0) {
      throw new Error(`Lịch sử thanh toán vẫn bị rỗng! Thông báo: "${result.emptyMsg}"`);
    }

    console.log('Top 3 giao dịch đầu tiên:', result.items.slice(0, 3));

    const imgPayments = path.join(ARTIFACTS_DIR, 'verify-member-payment-history-fixed.png');
    await page.screenshot({ path: imgPayments, fullPage: false });
    console.log('✓ Đã chụp ảnh danh sách thanh toán:', imgPayments);

    console.log('5. Bấm vào nút "Xem phiếu thu" của giao dịch đầu tiên...');
    await page.evaluate(() => {
      const firstBtn = document.querySelector('main .list article.record button');
      if (firstBtn) firstBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    const receiptResult = await page.evaluate(() => {
      const dialog = document.querySelector('dialog');
      const text = dialog?.textContent || '';
      return { open: !!dialog, text: text.slice(0, 200) };
    });
    console.log('Dialog phiếu thu:', receiptResult);

    const imgReceipt = path.join(ARTIFACTS_DIR, 'verify-member-receipt-dialog.png');
    await page.screenshot({ path: imgReceipt, fullPage: false });
    console.log('✓ Đã chụp ảnh phiếu thu:', imgReceipt);

    console.log('=== TEST E2E HOÀN TOÀN THÀNH CÔNG! ĐÃ HIỂN THỊ ĐẦY ĐỦ LỊCH SỬ THANH TOÁN CỦA HV001! ===');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('LỖI E2E TEST:', err);
  process.exit(1);
});

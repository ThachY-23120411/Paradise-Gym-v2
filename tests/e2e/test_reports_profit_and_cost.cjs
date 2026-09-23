const path = require('path');
const fs = require('fs');
const puppeteer = require(path.join(__dirname, '../../backend/node_modules/puppeteer-core'));

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile3\\.gemini\\antigravity\\brain\\8f603014-e613-4055-a510-ef40fa67cfcb';

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

async function run() {
  console.log('=== BẮT ĐẦU TEST E2E: BÁO CÁO DOANH THU, QUẢN LÝ CHI PHÍ & LỢI NHUẬN THỰC TẾ (W10) ===');

  console.log('1. Đăng nhập API QTV...');
  const qtvAuth = await loginApi('0900000001', 'Paradise@123', 'QTV');
  console.log('✓ Đăng nhập thành công, token length:', qtvAuth.token.length);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1480, height: 1050 });

  try {
    console.log('2. Mở Web Admin & thiết lập token...');
    await page.goto('http://localhost:3000/web/', { waitUntil: 'networkidle0' });

    await page.evaluate((token, user) => {
      localStorage.setItem('paradise_access_token', token);
      localStorage.setItem('paradise_user', JSON.stringify(user));
      localStorage.setItem('paradise_current_branch_id', '11111111-1111-1111-1111-111111111111');
    }, qtvAuth.token, qtvAuth.user);

    console.log('3. Điều hướng tới menu Báo cáo (#reports)...');
    await page.goto('http://localhost:3000/web/?run=1#reports', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    // Kiểm tra 5 Hero Metrics
    console.log('4. Kiểm tra 5 thẻ Hero Metric Cards...');
    const metricCards = await page.$$eval('.metrics-row .metric-card', cards => {
      return cards.map(c => ({
        label: c.querySelector('.metric-label')?.textContent?.trim(),
        value: c.querySelector('.metric-value')?.textContent?.trim(),
        caption: c.querySelector('.metric-caption')?.textContent?.trim()
      }));
    });
    console.log('Thẻ Hero Metrics tìm thấy:', metricCards);

    if (metricCards.length < 5) {
      throw new Error(`Kỳ vọng ít nhất 5 thẻ Hero metric, nhưng chỉ tìm thấy ${metricCards.length}`);
    }

    // TAB 1: LỢI NHUẬN & CHI PHÍ
    console.log('5. Kiểm tra Tab 1: 📊 Lợi nhuận & Chi phí (Mặc định)...');
    await new Promise(r => setTimeout(r, 1000));
    const profitShot = path.join(ARTIFACTS_DIR, 'verify_reports_profit_tab.png');
    await page.screenshot({ path: profitShot, fullPage: false });
    console.log('✓ Đã chụp ảnh Tab 1:', profitShot);

    // TAB 2: DOANH THU & DÒNG TIỀN
    console.log('6. Chuyển sang Tab 2: 💰 Doanh thu & Dòng tiền...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.report-tabs .dx-tab'));
      const revTab = tabs.find(t => t.textContent.includes('Doanh thu'));
      if (revTab) revTab.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    const revShot = path.join(ARTIFACTS_DIR, 'verify_reports_revenue_tab.png');
    await page.screenshot({ path: revShot, fullPage: false });
    console.log('✓ Đã chụp ảnh Tab 2:', revShot);

    // TAB 3: CƠ CẤU GÓI & DỊCH VỤ
    console.log('7. Chuyển sang Tab 3: 📦 Cơ cấu Gói & Dịch vụ...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.report-tabs .dx-tab'));
      const pkgTab = tabs.find(t => t.textContent.includes('Cơ cấu Gói'));
      if (pkgTab) pkgTab.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    const pkgShot = path.join(ARTIFACTS_DIR, 'verify_reports_service_type_tab.png');
    await page.screenshot({ path: pkgShot, fullPage: false });
    console.log('✓ Đã chụp ảnh Tab 3:', pkgShot);

    // TAB 4: HIỆU SUẤT ĐÀO TẠO PT
    console.log('8. Chuyển sang Tab 4: 🏋️‍♂️ Hiệu suất Đào tạo PT...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.report-tabs .dx-tab'));
      const ptTab = tabs.find(t => t.textContent.includes('Hiệu suất Đào tạo PT'));
      if (ptTab) ptTab.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    const ptShot = path.join(ARTIFACTS_DIR, 'verify_reports_pt_tab.png');
    await page.screenshot({ path: ptShot, fullPage: false });
    console.log('✓ Đã chụp ảnh Tab 4:', ptShot);

    // Kiểm tra xuất Excel
    console.log('9. Kiểm tra nút Xuất báo cáo...');
    const exportBtnDisabled = await page.$eval('.dx-button[aria-label*="Xuất"], .dx-button:has(.dx-icon-xlsxfile)', btn => btn.classList.contains('dx-state-disabled'));
    console.log('Nút Xuất báo cáo disabled:', exportBtnDisabled);
    if (exportBtnDisabled) {
      throw new Error('Nút Xuất báo cáo bị disable bất thường!');
    }
    console.log('✓ Nút Xuất báo cáo hoạt động sẵn sàng.');

    console.log('=== TOÀN BỘ 9 BƯỚC KIỂM THỬ E2E THÀNH CÔNG RỰC RỠ ===');
  } catch (err) {
    console.error('❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();

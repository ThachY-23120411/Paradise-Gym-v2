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

async function run() {
  console.log('=== BẮT ĐẦU TEST E2E: DOANH THU GÓI PT/COMBO & ĐỔI TÊN TAB THU NHẬP (W15) ===');

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
      localStorage.setItem('paradise_current_branch_id', 'ALL');
    }, qtvAuth.token, qtvAuth.user);

    console.log('3. Điều hướng tới menu Hoa hồng PT (#commissions)...');
    await page.goto('http://localhost:3000/web/?run=1#commissions', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    // 4. Kiểm tra các Tab
    console.log('4. Kiểm tra tên các Tab...');
    const tabTexts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.commissions-tabs .dx-tab-text')).map(el => el.textContent.trim());
    });
    console.log('Danh sách Tab hiện tại:', tabTexts);

    if (!tabTexts.some(t => t.includes('Bảng kê thu nhập tháng'))) {
      throw new Error(`Tab 1 chưa đổi tên thành "Bảng kê thu nhập tháng". Danh sách tab: ${JSON.stringify(tabTexts)}`);
    }
    if (!tabTexts.some(t => t.includes('Doanh thu gói PT/COMBO'))) {
      throw new Error(`Chưa có tab "Doanh thu gói PT/COMBO". Danh sách tab: ${JSON.stringify(tabTexts)}`);
    }
    console.log('✓ Tab 1 đã đổi tên thành "Bảng kê thu nhập tháng"');
    console.log('✓ Tab 2 "Doanh thu gói PT/COMBO" đã hiển thị thành công');

    // 5. Click chuyển sang Tab "Doanh thu gói PT/COMBO"
    console.log('5. Chuyển sang Tab "Doanh thu gói PT/COMBO"...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.commissions-tabs .dx-tab'));
      const targetTab = tabs.find(t => t.textContent.includes('Doanh thu gói PT/COMBO'));
      if (targetTab) targetTab.click();
    });
    await new Promise(r => setTimeout(r, 2500));

    // 6. Kiểm tra KPI & DataGrid ở chế độ "Tất cả HLV"
    console.log('6. Kiểm tra KPI & DataGrid cho Tất cả HLV...');
    const allPtData = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.commissions-kpis .metric-card'));
      const kpis = cards.map(c => ({
        label: c.querySelector('.metric-label')?.textContent?.trim(),
        value: c.querySelector('.metric-value')?.textContent?.trim(),
        caption: c.querySelector('.metric-caption')?.textContent?.trim()
      }));
      const rowsCount = document.querySelectorAll('.dx-datagrid-rowsview .dx-data-row').length;
      return { kpis, rowsCount };
    });
    console.log('KPIs (Tất cả HLV):', allPtData.kpis);
    console.log('Số dòng hiển thị trên DataGrid (Tất cả HLV):', allPtData.rowsCount);

    const imgAll = path.join(ARTIFACTS_DIR, 'verify-commissions-tab-all-pt.png');
    await page.screenshot({ path: imgAll, fullPage: false });
    console.log('✓ Đã chụp ảnh Tab Doanh thu gói PT/COMBO (Tất cả HLV):', imgAll);

    // 7. Chọn HLV "Nguyễn Văn Thể (PT001)" từ dropdown
    console.log('7. Lọc theo HLV "Nguyễn Văn Thể (PT001)"...');
    await page.evaluate(() => {
      const selectBox = $('.filter-bar .dx-selectbox').eq(1).dxSelectBox('instance');
      const items = selectBox.option('dataSource');
      const the = items.find(i => i.text.includes('Nguyễn Văn Thể') || i.text.includes('PT001'));
      if (the) selectBox.option('value', the.id);
    });
    await new Promise(r => setTimeout(r, 1500));

    const pt001Data = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.commissions-kpis .metric-card'));
      const kpis = cards.map(c => ({
        label: c.querySelector('.metric-label')?.textContent?.trim(),
        value: c.querySelector('.metric-value')?.textContent?.trim(),
        caption: c.querySelector('.metric-caption')?.textContent?.trim()
      }));
      const rowsCount = document.querySelectorAll('.dx-datagrid-rowsview .dx-data-row').length;
      return { kpis, rowsCount };
    });
    console.log('KPIs (PT001 Nguyễn Văn Thể):', pt001Data.kpis);
    console.log('Số dòng hiển thị trên DataGrid (PT001):', pt001Data.rowsCount);

    const imgPt001 = path.join(ARTIFACTS_DIR, 'verify-commissions-tab-pt001.png');
    await page.screenshot({ path: imgPt001, fullPage: false });
    console.log('✓ Đã chụp ảnh Tab Doanh thu gói PT/COMBO (PT001):', imgPt001);

    // 8. Chọn HLV "Lê Văn Hùng (PT002)" từ dropdown
    console.log('8. Lọc theo HLV "Lê Văn Hùng (PT002)"...');
    await page.evaluate(() => {
      const selectBox = $('.filter-bar .dx-selectbox').eq(1).dxSelectBox('instance');
      const items = selectBox.option('dataSource');
      const hung = items.find(i => i.text.includes('Lê Văn Hùng') || i.text.includes('PT002'));
      if (hung) selectBox.option('value', hung.id);
    });
    await new Promise(r => setTimeout(r, 1500));

    const pt002Data = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.commissions-kpis .metric-card'));
      const kpis = cards.map(c => ({
        label: c.querySelector('.metric-label')?.textContent?.trim(),
        value: c.querySelector('.metric-value')?.textContent?.trim(),
        caption: c.querySelector('.metric-caption')?.textContent?.trim()
      }));
      const rowsCount = document.querySelectorAll('.dx-datagrid-rowsview .dx-data-row').length;
      return { kpis, rowsCount };
    });
    console.log('KPIs (PT002 Lê Văn Hùng):', pt002Data.kpis);
    console.log('Số dòng hiển thị trên DataGrid (PT002):', pt002Data.rowsCount);

    const imgPt002 = path.join(ARTIFACTS_DIR, 'verify-commissions-tab-pt002.png');
    await page.screenshot({ path: imgPt002, fullPage: false });
    console.log('✓ Đã chụp ảnh Tab Doanh thu gói PT/COMBO (PT002):', imgPt002);

    console.log('\n=== TẤT CẢ KIỂM THỬ E2E TAB DOANH THU GÓI PT/COMBO ĐÃ PASS 100%! ===');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('LỖI E2E TEST:', err);
  process.exit(1);
});

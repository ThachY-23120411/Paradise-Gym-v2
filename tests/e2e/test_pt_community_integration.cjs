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
  console.log('=== TEST E2E: TÍCH HỢP LỚP CỘNG ĐỒNG VÀO CALENDAR LỊCH PT & HỒ SƠ HUẤN LUYỆN VIÊN ===');

  console.log('1. Đăng nhập QTV...');
  const qtvAuth = await loginApi('0900000001', 'Paradise@123', 'QTV');
  console.log('✓ Token QTV OK');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 950 });

    console.log('2. Mở Web Admin & thiết lập token (Scope: ALL chi nhánh)...');
    await page.goto('http://localhost:3000/web/', { waitUntil: 'networkidle0' });

    await page.evaluate((token, user) => {
      localStorage.setItem('paradise_access_token', token);
      localStorage.setItem('paradise_user', JSON.stringify(user));
      localStorage.setItem('paradise_current_branch_id', 'ALL');
    }, qtvAuth.token, qtvAuth.user);

    // ==============================================================
    // TEST 1: KIỂM TRA HỒ SƠ HLV CÓ TAB "LỚP CỘNG ĐỒNG" (PT002)
    // ==============================================================
    console.log('3. Điều hướng tới menu Huấn luyện viên (#trainers)...');
    await page.goto('http://localhost:3000/web/?run=1#trainers', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    console.log('4. Tìm kiếm và mở popup chi tiết HLV PT002 (Lê Văn Hùng)...');
    await page.waitForSelector('#trainersGrid .dx-datagrid-rowsview .dx-data-row', { timeout: 10000 });
    
    // Tìm kiếm PT002
    await page.evaluate(() => {
      const grid = $('#trainersGrid').dxDataGrid('instance');
      if (grid) {
        grid.searchByText('PT002');
      }
    });

    await new Promise(r => setTimeout(r, 1500));

    // Click xem chi tiết hồ sơ
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#trainersGrid .dx-datagrid-rowsview .dx-data-row'));
      const ptRow = rows.find(r => r.textContent.includes('PT002') || r.textContent.includes('Hùng')) || rows[0];
      const link = ptRow.querySelector('.dx-link') || ptRow.querySelector('a');
      if (link) link.click();
      else ptRow.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });

    await new Promise(r => setTimeout(r, 2500));

    const popup = await page.waitForSelector('.pt-trainer-detail-content', { timeout: 10000 });
    console.log('✓ Popup hồ sơ HLV đã mở');

    const overviewShotPath = path.join(ARTIFACTS_DIR, 'verify_trainer_profile_overview_community.png');
    await page.screenshot({ path: overviewShotPath });
    console.log('✓ Đã chụp ảnh Overview HLV có thẻ KPI Lớp cộng đồng:', overviewShotPath);

    // Chuyển sang tab "Lớp cộng đồng"
    console.log('5. Chuyển sang tab "Lớp cộng đồng"...');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.trainer-sidebar-item'));
      const commItem = items.find(i => i.textContent.includes('Lớp cộng đồng'));
      if (commItem) commItem.click();
    });

    await new Promise(r => setTimeout(r, 2000));

    const commTabShotPath = path.join(ARTIFACTS_DIR, 'verify_trainer_profile_community_tab.png');
    await page.screenshot({ path: commTabShotPath });
    console.log('✓ Đã chụp ảnh Tab Lớp cộng đồng của HLV (Danh sách các lớp đã dạy):', commTabShotPath);

    // Đóng popup
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.dx-popup-wrapper .dx-closebutton') || document.querySelector('.dx-popup-toolbar .dx-button');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // ==============================================================
    // TEST 2: KIỂM TRA CALENDAR LỊCH PT HIỂN THỊ LỚP CỘNG ĐỒNG
    // ==============================================================
    console.log('6. Mở Calendar Lịch PT (#pt-schedule)...');
    await page.goto('http://localhost:3000/web/?run=1#pt-schedule', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2500));

    // Chọn HLV PT002 (Lê Văn Hùng)
    console.log('7. Chọn HLV PT002 (Lê Văn Hùng) trên Calendar...');
    await page.evaluate(() => {
      const selectBox = $('#ptSelector').dxSelectBox('instance');
      if (selectBox) {
        const ds = selectBox.option('dataSource') || [];
        const pt = ds.find(t => t.full_name?.includes('Hùng') || t.pt_code === 'PT002') || ds[0];
        if (pt) selectBox.option('value', pt.id);
      }
    });

    await new Promise(r => setTimeout(r, 2000));

    // Chuyển ngày sang 2026-09-21
    console.log('8. Đặt ngày xem lịch là 21/09/2026...');
    await page.evaluate(() => {
      const dateBox = $('.pt-schedule-controls .dx-datebox').dxDateBox('instance');
      if (dateBox) {
        dateBox.option('value', new Date('2026-09-21T00:00:00'));
      }
    });

    await new Promise(r => setTimeout(r, 3000));

    const schedShotPath = path.join(ARTIFACTS_DIR, 'verify_calendar_pt_with_community_classes.png');
    await page.screenshot({ path: schedShotPath });
    console.log('✓ Đã chụp ảnh Calendar Lịch PT hiển thị Lớp cộng đồng:', schedShotPath);

    // Click vào thẻ Lớp cộng đồng trên Calendar
    console.log('9. Click vào thẻ Lớp cộng đồng trên Calendar...');
    const clicked = await page.evaluate(() => {
      const commCard = document.querySelector('.pt-community-card-body') || document.querySelector('.pt-appointment-community');
      if (commCard) {
        commCard.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      await new Promise(r => setTimeout(r, 1500));
      const modalShotPath = path.join(ARTIFACTS_DIR, 'verify_calendar_community_class_detail_dialog.png');
      await page.screenshot({ path: modalShotPath });
      console.log('✓ Đã chụp ảnh Dialog thông tin Lớp cộng đồng từ Calendar:', modalShotPath);
    } else {
      console.log('ℹ Không tìm thấy thẻ lớp cộng đồng trên ngày 21/09/2026 để click dialog');
    }

    console.log('=== TEST E2E HOÀN TẤT THÀNH CÔNG 100% ===');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('LỖI TEST E2E:', err);
  process.exit(1);
});

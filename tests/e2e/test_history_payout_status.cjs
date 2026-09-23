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
  console.log('=== BẮT ĐẦU TEST E2E: TAB LỊCH SỬ CHI TRẢ HOA HỒNG & BỘ LỌC TRẠNG THÁI ===');

  console.log('1. Đăng nhập API QTV...');
  const qtvAuth = await loginApi('0900000001', 'Paradise@123', 'QTV');
  console.log('✓ Đăng nhập thành công, token length:', qtvAuth.token.length);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 920 });

  try {
    console.log('2. Mở Web Admin & thiết lập token...');
    await page.goto('http://localhost:3000/web/', { waitUntil: 'networkidle0' });

    await page.evaluate((token, user) => {
      localStorage.setItem('paradise_access_token', token);
      localStorage.setItem('paradise_user', JSON.stringify(user));
      localStorage.setItem('paradise_current_branch_id', '11111111-1111-1111-1111-111111111111');
    }, qtvAuth.token, qtvAuth.user);

    console.log('3. Điều hướng tới menu Hoa hồng PT (#commissions)...');
    await page.goto('http://localhost:3000/web/?run=1#commissions', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.commissions-tabs', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));

    console.log('3.1. Chuyển sang tab "Lịch sử chi trả"...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.commissions-tabs .dx-tab'));
      const histTab = tabs.find(t => t.innerText.includes('Lịch sử chi trả'));
      if (histTab) histTab.click();
    });

    await page.waitForSelector('.dx-datagrid-rowsview', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    // Kiểm tra hàng trong bảng
    const gridData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.dx-datagrid-rowsview .dx-data-row'));
      return rows.map(r => {
        const text = r.innerText.replace(/\s+/g, ' ').trim();
        const hasPendingBadge = r.querySelector('.badge-info, .dx-badge') && r.innerText.includes('Chờ PT xác nhận');
        const hasPaidBadge = r.querySelector('.badge-success, .dx-badge') && r.innerText.includes('Đã chi trả');
        return { text, hasPendingBadge, hasPaidBadge };
      });
    });

    console.log('Dữ liệu các hàng hiển thị (Tất cả trạng thái):', gridData);

    const hasPendingRow = gridData.some(r => r.text.includes('Chờ PT xác nhận') && r.text.includes('Tháng 9/2026'));
    const hasPaidRow = gridData.some(r => r.text.includes('Đã chi trả') && r.text.includes('Tháng 8/2026'));

    if (!hasPendingRow) {
      throw new Error('THẤT BẠI: Không tìm thấy bản ghi "Chờ PT xác nhận" (Tháng 9/2026) trong tab Lịch sử chi trả!');
    }
    if (!hasPaidRow) {
      throw new Error('THẤT BẠI: Không tìm thấy bản ghi "Đã chi trả" trong tab Lịch sử chi trả!');
    }
    console.log('✓ Đã xác thực: Cả bản ghi Chờ PT xác nhận và Đã chi trả đều xuất hiện trong Lịch sử chi trả.');

    // Chụp ảnh 1: Tab lịch sử hiển thị đầy đủ Chờ PT xác nhận và Đã chi trả
    const shot1 = path.join(ARTIFACTS_DIR, 'verify_history_pending_confirmation.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log('✓ Đã chụp ảnh 1:', shot1);

    // 4. Kiểm tra bộ lọc Trạng thái: Chọn "Chờ PT xác nhận"
    console.log('4. Thao tác bộ lọc: Chọn "Chờ PT xác nhận"...');
    await page.evaluate(() => {
      // Tìm selectbox trạng thái (selectbox thứ 4 trong filter-bar)
      const selectBoxes = Array.from(document.querySelectorAll('.filter-bar .dx-selectbox'));
      const statusBox = selectBoxes[selectBoxes.length - 1]; // selectbox cuối cùng trong filter-bar là trạng thái
      if (statusBox) {
        const inst = DevExpress.ui.dxSelectBox.getInstance(statusBox);
        if (inst) inst.option('value', 'PENDING_CONFIRMATION');
      }
    });

    await new Promise(r => setTimeout(r, 1500));

    const filterPendingData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.dx-datagrid-rowsview .dx-data-row'));
      return rows.map(r => r.innerText.replace(/\s+/g, ' ').trim());
    });
    console.log('Dữ liệu sau khi lọc "Chờ PT xác nhận":', filterPendingData);

    const onlyPending = filterPendingData.every(t => t.includes('Chờ PT xác nhận'));
    if (!onlyPending || filterPendingData.length !== 1) {
      throw new Error('THẤT BẠI: Bộ lọc "Chờ PT xác nhận" không lọc đúng số lượng bản ghi!');
    }
    console.log('✓ Đã xác thực: Bộ lọc "Chờ PT xác nhận" chỉ hiển thị đúng 1 bản ghi đang chờ.');

    // Chụp ảnh 2: Lọc Chờ PT xác nhận
    const shot2 = path.join(ARTIFACTS_DIR, 'verify_history_filter_pending.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log('✓ Đã chụp ảnh 2:', shot2);

    // 5. Kiểm tra bộ lọc Trạng thái: Chọn "Đã chi trả"
    console.log('5. Thao tác bộ lọc: Chọn "Đã chi trả"...');
    await page.evaluate(() => {
      const selectBoxes = Array.from(document.querySelectorAll('.filter-bar .dx-selectbox'));
      const statusBox = selectBoxes[selectBoxes.length - 1];
      if (statusBox) {
        const inst = DevExpress.ui.dxSelectBox.getInstance(statusBox);
        if (inst) inst.option('value', 'PAID');
      }
    });

    await new Promise(r => setTimeout(r, 1500));

    const filterPaidData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.dx-datagrid-rowsview .dx-data-row'));
      return rows.map(r => r.innerText.replace(/\s+/g, ' ').trim());
    });
    console.log('Dữ liệu sau khi lọc "Đã chi trả":', filterPaidData);

    const onlyPaid = filterPaidData.every(t => t.includes('Đã chi trả'));
    if (!onlyPaid || filterPaidData.length !== 2) {
      throw new Error('THẤT BẠI: Bộ lọc "Đã chi trả" không hiển thị đúng 2 bản ghi!');
    }
    console.log('✓ Đã xác thực: Bộ lọc "Đã chi trả" hiển thị chính xác các bản ghi hoàn tất.');

    // Chụp ảnh 3: Lọc Đã chi trả
    const shot3 = path.join(ARTIFACTS_DIR, 'verify_history_filter_paid.png');
    await page.screenshot({ path: shot3, fullPage: false });
    console.log('✓ Đã chụp ảnh 3:', shot3);

    // 6. Trở lại "Tất cả trạng thái" và bấm nút "Chi tiết" của bản ghi PENDING_CONFIRMATION
    console.log('6. Trở lại "Tất cả trạng thái" và mở popup Chi tiết bản ghi Chờ PT xác nhận...');
    await page.evaluate(() => {
      const selectBoxes = Array.from(document.querySelectorAll('.filter-bar .dx-selectbox'));
      const statusBox = selectBoxes[selectBoxes.length - 1];
      if (statusBox) {
        const inst = DevExpress.ui.dxSelectBox.getInstance(statusBox);
        if (inst) inst.option('value', 'ALL');
      }
    });

    await new Promise(r => setTimeout(r, 1500));

    // Bấm nút "Chi tiết" ở dòng Tháng 9/2026
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.dx-datagrid-rowsview .dx-data-row'));
      const targetRow = rows.find(r => r.innerText.includes('Tháng 9/2026'));
      if (targetRow) {
        const btn = targetRow.querySelector('.dx-button');
        if (btn) btn.click();
      }
    });

    await page.waitForSelector('.dx-popup-content', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1500));

    // Chụp ảnh 4: Popup chi tiết bản ghi Chờ PT xác nhận
    const shot4 = path.join(ARTIFACTS_DIR, 'verify_history_details_modal_pending.png');
    await page.screenshot({ path: shot4, fullPage: false });
    console.log('✓ Đã chụp ảnh 4:', shot4);

    console.log('\n=== TẤT CẢ CÁC BƯỚC KIỂM THỬ E2E ĐÃ THÀNH CÔNG 100%! ===');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('LỖI E2E TEST:', err);
  process.exit(1);
});

const path = require('path');
require(path.join(__dirname, '../../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../../backend/.env') });
const puppeteer = require(path.join(__dirname, '../../backend/node_modules/puppeteer-core'));
const { pool } = require('../../backend/src/db/postgres');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile5\\.gemini\\antigravity\\brain\\cf22d6e0-20cc-4a19-9c08-c386ee4a543d';

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
  console.log('=== BẮT ĐẦU KIỂM THỬ E2E: QUY TRÌNH XÁC NHẬN CHI TRẢ HOA HỒNG PT 2 CHIỀU TRÊN APP ===');

  // 1. Chuẩn bị dữ liệu kiểm thử từ database
  const ptUserRes = await pool.query(`
    SELECT a.id as account_id, a.login_phone, p.id as pt_id, p.full_name as pt_name, p.pt_code
    FROM accounts a
    JOIN pt_profiles p ON p.account_id = a.id
    WHERE a.status = 'ACTIVE' AND p.pt_code = 'PT001'
    LIMIT 1
  `);

  if (!ptUserRes.rows.length) {
    throw new Error('Không tìm thấy tài khoản PT PT001 trong database!');
  }
  const ptUser = ptUserRes.rows[0];
  console.log(`HLV kiểm thử: ${ptUser.pt_name} (${ptUser.pt_code} - ${ptUser.login_phone}), PT ID: ${ptUser.pt_id}`);

  // Đảm bảo có 1 bản ghi pt_commissions tháng 9/2026 ở trạng thái PENDING với số tiền > 0
  let commRes = await pool.query(`
    SELECT * FROM pt_commissions
    WHERE pt_id = $1 AND month = 9 AND year = 2026
  `, [ptUser.pt_id]);

  if (!commRes.rows.length) {
    const insertRes = await pool.query(`
      INSERT INTO pt_commissions (
        pt_id, month, year, total_pt_sessions_taught, pt_revenue_share,
        commission_percentage, total_commission_amount, status
      ) VALUES ($1, 9, 2026, 8, 4000000, 30.00, 1200000, 'PENDING')
      RETURNING *
    `, [ptUser.pt_id]);
    commRes = insertRes;
  } else {
    // Reset về PENDING để kiểm thử luồng từ đầu
    await pool.query(`
      UPDATE pt_commissions
      SET status = 'PENDING',
          total_commission_amount = CASE WHEN total_commission_amount <= 0 THEN 1200000 ELSE total_commission_amount END,
          total_pt_sessions_taught = CASE WHEN total_pt_sessions_taught <= 0 THEN 8 ELSE total_pt_sessions_taught END,
          pt_revenue_share = CASE WHEN pt_revenue_share <= 0 THEN 4000000 ELSE pt_revenue_share END,
          commission_percentage = 30.00,
          paid_at = NULL,
          pt_confirmed_at = NULL,
          details_snapshot = NULL
      WHERE id = $1
    `, [commRes.rows[0].id]);
  }

  const commissionId = commRes.rows[0].id;
  console.log(`Bản kê hoa hồng tháng 9/2026: ID = ${commissionId}, trạng thái = PENDING`);

  // Lấy token đăng nhập cho QTV và PT qua API
  console.log('Đang đăng nhập tài khoản QTV và PT...');
  const adminAuth = await loginApi('0900000001', 'Paradise@123', 'QTV');
  const ptAuth = await loginApi(ptUser.login_phone, 'Paradise@123', 'PT');
  console.log('✓ Đã xác thực thành công QTV và PT.');

  // Khởi chạy trình duyệt
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();

  try {
    // ==========================================
    // GIAI ĐOẠN 1: QUẢN TRỊ VIÊN / LỄ TÂN TRÊN WEB ADMIN
    // ==========================================
    console.log('\n--- BƯỚC 1: Đăng nhập Web Admin và mở W15 Quản lý hoa hồng PT ---');
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto('http://localhost:3000/web/', { waitUntil: 'networkidle0' });

    // Inject localStorage
    await page.evaluate((token, user) => {
      localStorage.setItem('paradise_access_token', token);
      localStorage.setItem('paradise_user', JSON.stringify(user));
      localStorage.setItem('paradise_current_branch_id', '11111111-1111-1111-1111-111111111111');
    }, adminAuth.token, adminAuth.user);

    await page.goto('http://localhost:3000/web/?run=1#commissions', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.dx-data-row', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    console.log('--- BƯỚC 2: Mở modal Chi trả hoa hồng và kiểm chứng các trường nhập liệu ---');
    const rowsText = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.dx-data-row')).map(r => r.innerText.replace(/\s+/g, ' ').trim());
    });
    console.log('Danh sách hàng trong bảng:', rowsText);

    // Tìm rowIndex của HLV kiểm thử trong bảng chính và bấm nút [Chi trả] ở bảng fixed
    const clickedPayout = await page.evaluate((hlvName) => {
      const allRows = Array.from(document.querySelectorAll('.dx-datagrid-rowsview .dx-data-row'));
      const mainRowIdx = allRows.findIndex(r => r.innerText.includes(hlvName));
      if (mainRowIdx === -1) return false;

      // Tìm nút Chi trả trong toàn bộ các hàng hoặc hàng fixed tương ứng
      const fixedRows = Array.from(document.querySelectorAll('.dx-datagrid-content-fixed .dx-data-row'));
      const targetFixedRow = fixedRows[mainRowIdx] || allRows[mainRowIdx];
      let btn = Array.from(targetFixedRow.querySelectorAll('.dx-button')).find(b => b.innerText.includes('Chi trả'));
      if (!btn) {
        // Tìm bất kỳ nút Chi trả nào trên trang
        btn = Array.from(document.querySelectorAll('.dx-button')).find(b => b.innerText.includes('Chi trả'));
      }
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }, ptUser.pt_name);

    if (!clickedPayout) {
      throw new Error(`Không tìm thấy nút [Chi trả] cho HLV ${ptUser.pt_name}`);
    }

    await new Promise(r => setTimeout(r, 1200));

    // Kiểm tra các trường trên Modal:
    const modalCheck = await page.evaluate(() => {
      const popup = document.querySelector('.dx-popup-content');
      if (!popup) return { found: false };

      const textContent = popup.innerText;
      const hasCashReceiptNo = textContent.includes('Số phiếu chi');
      const hasBankRef = textContent.includes('Mã giao dịch ngân hàng');
      const hasConfirmBtn = Array.from(document.querySelectorAll('.dx-button')).some(b => b.innerText.includes('Xác nhận đã chi trả'));

      return {
        found: true,
        hasCashReceiptNo,
        hasBankRef,
        hasConfirmBtn,
        title: document.querySelector('.dx-popup-title')?.innerText || ''
      };
    });

    console.log('Kết quả kiểm tra Modal Chi trả:', modalCheck);
    if (modalCheck.hasCashReceiptNo) throw new Error('VI PHẠM: Vẫn còn trường "Số phiếu chi" trên Modal!');
    if (modalCheck.hasBankRef) throw new Error('VI PHẠM: Vẫn còn trường "Mã giao dịch ngân hàng" trên Modal!');
    if (!modalCheck.hasConfirmBtn) throw new Error('VI PHẠM: Không tìm thấy nút "Xác nhận đã chi trả" trên Modal!');

    // Chụp ảnh bằng chứng 1: Modal đã bỏ các trường chứng từ giấy và có nút "Xác nhận đã chi trả"
    const shot1 = path.join(ARTIFACTS_DIR, 'verify_two_way_payout_modal.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log(`✓ Đã chụp ảnh 1: ${shot1}`);

    console.log('--- BƯỚC 3: Quản lý bấm [Xác nhận đã chi trả] phát lệnh chi trả ---');
    await page.evaluate(() => {
      const confirmBtn = Array.from(document.querySelectorAll('.dx-button')).find(b => b.innerText.includes('Xác nhận đã chi trả'));
      if (confirmBtn) confirmBtn.click();
    });

    await new Promise(r => setTimeout(r, 2500));

    // Kiểm tra trạng thái mới trong database
    const dbCheck1 = await pool.query('SELECT status, paid_at, pt_confirmed_at, details_snapshot FROM pt_commissions WHERE id = $1', [commissionId]);
    console.log('Trạng thái DB sau khi phát lệnh chi trả:', dbCheck1.rows[0]);
    if (dbCheck1.rows[0].status !== 'PENDING_CONFIRMATION') {
      throw new Error(`Kỳ vọng status = PENDING_CONFIRMATION nhưng nhận được: ${dbCheck1.rows[0].status}`);
    }

    // Chụp ảnh bằng chứng 2: Web Admin hiển thị trạng thái "Chờ PT xác nhận"
    const shot2 = path.join(ARTIFACTS_DIR, 'verify_web_admin_pending_confirmation.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log(`✓ Đã chụp ảnh 2: ${shot2}`);

    // ==========================================
    // GIAI ĐOẠN 2: HLV PT TRÊN MOBILE PT APP
    // ==========================================
    console.log('\n--- BƯỚC 4: HLV PT mở app Mobile PT và vào tab Hoa hồng ---');
    await page.setViewport({ width: 412, height: 915 });
    await page.goto('http://localhost:3000/mobile/pt/', { waitUntil: 'networkidle0' });

    // Inject PT session
    await page.evaluate((token, user) => {
      localStorage.setItem('paradise_access_token', token);
      localStorage.setItem('paradise_user', JSON.stringify(user));
    }, ptAuth.token, ptAuth.user);

    await page.goto('http://localhost:3000/mobile/pt/?run=1', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#bottomNav', { timeout: 10000 });
    await page.evaluate(() => window.ParadisePTApp.switchTab('commissions'));
    await new Promise(r => setTimeout(r, 2500));

    // Kiểm tra xem khối xác nhận chi trả và nút có hiển thị không
    const ptViewCheck = await page.evaluate(() => {
      const box = document.getElementById('commConfirmationBox');
      const btn = document.getElementById('btnPtConfirmCommission');
      const badge = document.getElementById('commStatusBadge');
      const amount = document.getElementById('commConfirmationAmount');
      const method = document.getElementById('commConfirmationMethod');

      return {
        boxVisible: box ? window.getComputedStyle(box).display !== 'none' : false,
        btnVisible: btn ? window.getComputedStyle(btn).display !== 'none' : false,
        btnText: btn ? btn.innerText.trim() : '',
        badgeText: badge ? badge.innerText.trim() : '',
        amountText: amount ? amount.innerText.trim() : '',
        methodText: method ? method.innerText.trim() : ''
      };
    });

    console.log('Kết quả hiển thị trên Mobile PT:', ptViewCheck);
    if (!ptViewCheck.boxVisible) throw new Error('VI PHẠM: Khối xác nhận chi trả #commConfirmationBox không hiển thị trên app PT!');
    if (!ptViewCheck.btnVisible) throw new Error('VI PHẠM: Nút [Xác nhận đã nhận tiền] không hiển thị trên app PT!');

    // Chụp ảnh bằng chứng 3: Mobile PT hiển thị thông báo chi trả và nút "Xác nhận đã nhận tiền"
    const shot3 = path.join(ARTIFACTS_DIR, 'verify_mobile_pt_waiting_confirmation.png');
    await page.screenshot({ path: shot3, fullPage: false });
    console.log(`✓ Đã chụp ảnh 3: ${shot3}`);

    console.log('--- BƯỚC 5: HLV PT bấm [Xác nhận đã nhận tiền] ---');
    await page.evaluate(() => {
      const btn = document.getElementById('btnPtConfirmCommission');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 3000));

    // Kiểm tra trạng thái mới trên Mobile PT
    const ptAfterConfirm = await page.evaluate(() => {
      const box = document.getElementById('commConfirmationBox');
      const badge = document.getElementById('commStatusBadge');
      const paidWrap = document.getElementById('commPaidDateWrap');

      return {
        boxHidden: box ? window.getComputedStyle(box).display === 'none' : true,
        badgeText: badge ? badge.innerText.trim() : '',
        paidText: paidWrap ? paidWrap.innerText.trim() : ''
      };
    });

    console.log('Kết quả trên Mobile PT sau khi bấm xác nhận:', ptAfterConfirm);
    if (!ptAfterConfirm.boxHidden) throw new Error('Khối xác nhận chi trả vẫn còn hiển thị sau khi đã xác nhận!');
    if (!ptAfterConfirm.badgeText.includes('Đã chi trả')) throw new Error(`Kỳ vọng badge "Đã chi trả" nhưng là: ${ptAfterConfirm.badgeText}`);

    // Kiểm tra trong database
    const dbCheck2 = await pool.query('SELECT status, paid_at, pt_confirmed_at FROM pt_commissions WHERE id = $1', [commissionId]);
    console.log('Trạng thái DB sau khi PT xác nhận:', dbCheck2.rows[0]);
    if (dbCheck2.rows[0].status !== 'PAID') {
      throw new Error(`Kỳ vọng DB status = PAID nhưng là: ${dbCheck2.rows[0].status}`);
    }
    if (!dbCheck2.rows[0].pt_confirmed_at) {
      throw new Error('VI PHẠM: pt_confirmed_at không được lưu vào database!');
    }

    // Chụp ảnh bằng chứng 4: Mobile PT đã chuyển sang Đã chi trả với mốc thời gian pháp lý
    const shot4 = path.join(ARTIFACTS_DIR, 'verify_mobile_pt_confirmed_paid.png');
    await page.screenshot({ path: shot4, fullPage: false });
    console.log(`✓ Đã chụp ảnh 4: ${shot4}`);

    // ==========================================
    // GIAI ĐOẠN 3: ĐỐI SOÁT LẠI TRÊN WEB ADMIN
    // ==========================================
    console.log('\n--- BƯỚC 6: Đối soát lại trên Web Admin và xem popup Chi tiết ---');
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto('http://localhost:3000/web/?recheck=1#commissions', { waitUntil: 'networkidle0' });

    await page.evaluate((token, user) => {
      localStorage.setItem('paradise_access_token', token);
      localStorage.setItem('paradise_user', JSON.stringify(user));
      localStorage.setItem('paradise_current_branch_id', '11111111-1111-1111-1111-111111111111');
    }, adminAuth.token, adminAuth.user);

    await page.goto('http://localhost:3000/web/?recheck=2#commissions', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.dx-data-row', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    // Bấm xem nút [Chi tiết] của HLV
    await page.evaluate((hlvName) => {
      const allRows = Array.from(document.querySelectorAll('.dx-datagrid-rowsview .dx-data-row'));
      const mainRowIdx = allRows.findIndex(r => r.innerText.includes(hlvName));
      const fixedRows = Array.from(document.querySelectorAll('.dx-datagrid-content-fixed .dx-data-row'));
      const targetFixedRow = (mainRowIdx !== -1 && fixedRows[mainRowIdx]) ? fixedRows[mainRowIdx] : allRows[0];
      let btn = Array.from(targetFixedRow.querySelectorAll('.dx-button')).find(b => b.innerText.includes('Chi tiết'));
      if (!btn) {
        btn = Array.from(document.querySelectorAll('.dx-button')).find(b => b.innerText.includes('Chi tiết'));
      }
      if (btn) btn.click();
    }, ptUser.pt_name);

    await new Promise(r => setTimeout(r, 2000));

    // Kiểm tra popup chi tiết có hiển thị thời gian xác nhận không
    const detailsCheck = await page.evaluate(() => {
      const popup = document.querySelector('.dx-popup-content');
      return {
        text: popup ? popup.innerText : '',
        hasPtConfirmed: popup ? popup.innerText.includes('PT xác nhận nhận tiền') : false
      };
    });

    console.log('Kết quả kiểm tra Popup Chi tiết Web Admin (hasPtConfirmed):', detailsCheck.hasPtConfirmed);
    if (!detailsCheck.hasPtConfirmed) throw new Error('Không tìm thấy dòng "PT xác nhận nhận tiền" trong Popup Chi tiết Web Admin!');

    // Chụp ảnh bằng chứng 5: Popup chi tiết trên Web Admin lưu vết pháp lý PT xác nhận
    const shot5 = path.join(ARTIFACTS_DIR, 'verify_web_admin_details_legal_audit.png');
    await page.screenshot({ path: shot5, fullPage: false });
    console.log(`✓ Đã chụp ảnh 5: ${shot5}`);

    console.log('\n=== TẤT CẢ 6 BƯỚC KIỂM THỬ E2E ĐỀU ĐẠT 100% PASS ===\n');
  } catch (error) {
    console.error('LỖI KIỂM THỬ E2E:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
    await pool.end();
  }
}

run();

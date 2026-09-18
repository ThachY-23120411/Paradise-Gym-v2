const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const QTV_DIR = path.resolve(__dirname, '../screenshot/qtv');
const LT_DIR = path.resolve(__dirname, '../screenshot/lt');

if (!fs.existsSync(QTV_DIR)) fs.mkdirSync(QTV_DIR, { recursive: true });
if (!fs.existsSync(LT_DIR)) fs.mkdirSync(LT_DIR, { recursive: true });

async function getAuthToken(phone, password = 'Paradise@123') {
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_phone: phone, password })
  }).then(r => r.json());

  if (loginRes.data?.requires_2fa) {
    const devOtp = loginRes.data.dev_otp;
    const tempToken = loginRes.data.temp_token;
    const verifyRes = await fetch('http://localhost:5000/api/v1/auth/verify-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token: tempToken, otp_code: devOtp })
    }).then(r => r.json());
    return { token: verifyRes.data.access_token, user: verifyRes.data.user };
  }
  return { token: loginRes.data.access_token, user: loginRes.data.user };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('=== [1] Getting Auth Tokens ===');
  const qtvAuth = await getAuthToken('0900000001');
  console.log('QTV Token acquired:', !!qtvAuth.token, qtvAuth.user?.full_name);
  const ltAuth = await getAuthToken('0900000002');
  console.log('LT Token acquired:', !!ltAuth.token, ltAuth.user?.full_name);

  console.log('=== [2] Launching Chrome Headless ===');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('DevExtreme') && !text.includes('W0019')) {
      console.log('  [Browser]', text);
    }
  });

  async function loginPage(auth, defaultBranch = 'ALL') {
    console.log(`Setting session for ${auth.user?.login_phone}...`);
    await page.goto('http://localhost:3000/web/');
    await page.evaluate((t, u, b) => {
      localStorage.setItem('paradise_access_token', t);
      localStorage.setItem('paradise_user', JSON.stringify(u));
      localStorage.setItem('paradise_current_branch_id', b);
    }, auth.token, auth.user, defaultBranch);

    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(2000);
  }

  async function nav(menuId) {
    console.log(`\nNavigating to #${menuId}...`);
    await page.evaluate((id) => window.ParadiseApp.navigateTo(id), menuId);
    await sleep(1500);
  }

  async function snap(filepath) {
    await sleep(400);
    await page.screenshot({ path: filepath });
    console.log(`  [Screenshot Saved] -> ${path.basename(filepath)}`);
  }

  async function closeAllPopups() {
    await page.evaluate(() => {
      $('.dx-popup').each(function () {
        try {
          const inst = $(this).dxPopup('instance');
          if (inst && inst.option('visible')) inst.hide();
        } catch (_) {}
      });
    });
    await sleep(600);
  }

  // ==========================================================================
  // SECTION A: QUẢN TRỊ VIÊN (QTV) - W01 TO W13 + MODALS
  // ==========================================================================
  console.log('\n========================================');
  console.log('START CAPTURING QTV MENUS & MODALS');
  console.log('========================================');
  await loginPage(qtvAuth, 'ALL');

  // W01: Tổng quan
  await nav('dashboard');
  await snap(path.join(QTV_DIR, 'W01-tong-quan.png'));

  // W02: Hội viên & khách hàng
  await nav('members');
  await snap(path.join(QTV_DIR, 'W02-danh-sach-hoi-vien.png'));

  // W02 Modal Thêm hội viên
  try {
    await page.evaluate(() => window.MembersModule.openMemberModal(null));
    await sleep(1000);
    await snap(path.join(QTV_DIR, 'W02-modal-them-hoi-vien.png'));
  } catch (e) { console.warn('W02-modal-them-hoi-vien failed:', e.message); }
  await closeAllPopups();

  // W02 Drawer Chi tiết hội viên
  let firstMemberId = null;
  try {
    firstMemberId = await page.evaluate(async () => {
      const res = await window.apiClient.members.list({ limit: 1 });
      const id = res.data?.items?.[0]?.id || res.data?.[0]?.id;
      if (id) {
        window.MembersModule.openDetail(id);
        return id;
      }
      return null;
    });
    await sleep(1200);
    await snap(path.join(QTV_DIR, 'W02-drawer-chi-tiet-hoi-vien.png'));
  } catch (e) { console.warn('W02-drawer-chi-tiet failed:', e.message); }
  await closeAllPopups();

  // W02 Modal Đổi trạng thái
  if (firstMemberId) {
    try {
      await page.evaluate((id) => window.MembersModule.openStatus(id), firstMemberId);
      await sleep(1000);
      await snap(path.join(QTV_DIR, 'W02-modal-doi-trang-thai.png'));
    } catch (e) { console.warn('W02-modal-doi-trang-thai failed:', e.message); }
    await closeAllPopups();
  }

  // W03: Gói tập
  await nav('packages');
  await snap(path.join(QTV_DIR, 'W03-danh-muc-goi-tap.png'));

  // W03 Modal Thêm gói tập
  try {
    await page.evaluate(() => window.PackagesModule.openPackageModal());
    await sleep(1000);
    await snap(path.join(QTV_DIR, 'W03-modal-them-goi-tap.png'));
  } catch (e) { console.warn('W03-modal-them-goi-tap failed:', e.message); }
  await closeAllPopups();

  // W04: Đăng ký & gia hạn
  await nav('registrations');
  await snap(path.join(QTV_DIR, 'W04-danh-sach-dang-ky.png'));

  // W04 Modal Đăng ký mới
  try {
    await page.evaluate(() => window.SalesModule.openRegistrationModal());
    await sleep(1000);
    await snap(path.join(QTV_DIR, 'W04-modal-dang-ky-moi.png'));
  } catch (e) { console.warn('W04-modal-dang-ky-moi failed:', e.message); }
  await closeAllPopups();

  // W04 Modal Chi tiết đăng ký
  try {
    await page.evaluate(async () => {
      const res = await window.apiClient.registrations.list({ limit: 1 });
      const reg = res.data?.items?.[0] || res.data?.[0];
      if (reg?.id) window.SalesModule.openRegistrationDetail(reg.id);
    });
    await sleep(1200);
    await snap(path.join(QTV_DIR, 'W04-modal-chi-tiet-dang-ky.png'));
  } catch (e) { console.warn('W04-modal-chi-tiet-dang-ky failed:', e.message); }
  await closeAllPopups();

  // W05: Huấn luyện viên
  await nav('trainers');
  await snap(path.join(QTV_DIR, 'W05-danh-sach-hlv.png'));

  // W05 Modal Thêm HLV
  try {
    await page.evaluate(() => window.PtSchedulerModule.openCreateTrainer());
    await sleep(1000);
    await snap(path.join(QTV_DIR, 'W05-modal-them-hlv.png'));
  } catch (e) { console.warn('W05-modal-them-hlv failed:', e.message); }
  await closeAllPopups();

  // W06: Lịch tập & buổi PT
  await nav('pt-schedule');
  await snap(path.join(QTV_DIR, 'W06-lich-tap-pt.png'));

  // W06 Chi tiết lịch của PT đầu tiên
  try {
    await page.evaluate(() => {
      $('.pt-select-card, .dx-button:contains("Xem lịch")').first().click();
    });
    await sleep(1200);
    await snap(path.join(QTV_DIR, 'W06-chi-tiet-lich-hlv.png'));
  } catch (e) { console.warn('W06-chi-tiet-lich-hlv failed:', e.message); }

  // W07: Ra vào & check-in
  await nav('access-gate');
  await snap(path.join(QTV_DIR, 'W07-ra-vao-checkin.png'));

  // W07 Modal Ghi nhận vào ra thủ công
  try {
    await page.evaluate(() => window.CheckinModule.openManual());
    await sleep(1000);
    await snap(path.join(QTV_DIR, 'W07-modal-ghi-nhan-thu-cong.png'));
  } catch (e) { console.warn('W07-modal-ghi-nhan-thu-cong failed:', e.message); }
  await closeAllPopups();

  // W08: Thu tiền & thanh toán
  await nav('payments');
  await snap(path.join(QTV_DIR, 'W08-thu-tien-thanh-toan.png'));

  // W08 Modal Thu tiền
  try {
    await page.evaluate(() => {
      $('.dx-button:contains("Thu tiền")').first().click();
    });
    await sleep(1000);
    await snap(path.join(QTV_DIR, 'W08-modal-thu-tien.png'));
  } catch (e) { console.warn('W08-modal-thu-tien failed:', e.message); }
  await closeAllPopups();

  // W08 Modal In Phiếu thu
  try {
    await page.evaluate(async () => {
      const res = await window.apiClient.payments.list({ limit: 10 });
      const items = res.data?.items || res.data || [];
      const completed = items.find(p => p.status === 'COMPLETED') || items[0];
      if (completed?.id) {
        await window.SalesModule.openReceipt(completed);
      }
    });
    await sleep(1200);
    await snap(path.join(QTV_DIR, 'W08-modal-in-phieu-thu.png'));
  } catch (e) { console.warn('W08-modal-in-phieu-thu failed:', e.message); }
  await closeAllPopups();

  // W09: Quản lý thông báo
  await nav('notifications');
  await snap(path.join(QTV_DIR, 'W09-quan-ly-thong-bao.png'));

  // W09 Modal Sửa cấu hình thông báo
  try {
    await page.evaluate(() => {
      // click first edit icon in action column
      $('.system-view .dx-datagrid .dx-button[aria-label*="Sửa cấu hình"], .system-view .dx-datagrid .dx-button[hint*="Sửa cấu hình"]').first().click();
    });
    await sleep(1200);
    await snap(path.join(QTV_DIR, 'W09-modal-sua-cau-hinh.png'));
  } catch (e) { console.warn('W09-modal-sua-cau-hinh failed:', e.message); }
  await closeAllPopups();

  // W09 Tab Mẫu thông báo
  try {
    await page.evaluate(() => {
      $('.dx-tab:contains("Mẫu thông báo")').click();
    });
    await sleep(1200);
    await snap(path.join(QTV_DIR, 'W09-tab-mau-thong-bao.png'));

    // W09 Modal Thêm mẫu thông báo
    await page.evaluate(() => {
      $('.dx-button:contains("Thêm mẫu thông báo")').click();
    });
    await sleep(1200);
    await snap(path.join(QTV_DIR, 'W09-modal-them-mau-thong-bao.png'));
    await closeAllPopups();
  } catch (e) { console.warn('W09-tab-mau failed:', e.message); }

  // W09 Tab Lịch sử gửi
  try {
    await page.evaluate(() => {
      $('.dx-tab:contains("Lịch sử gửi")').click();
    });
    await sleep(1200);
    await snap(path.join(QTV_DIR, 'W09-tab-lich-su-gui.png'));
  } catch (e) { console.warn('W09-tab-lich-su failed:', e.message); }

  // W10: Báo cáo
  await nav('reports');
  await snap(path.join(QTV_DIR, 'W10-bao-cao-tong-hop.png'));

  // W11: Chi nhánh
  await nav('branches');
  await snap(path.join(QTV_DIR, 'W11-danh-sach-chi-nhanh.png'));

  // W11 Modal Thêm chi nhánh
  try {
    await page.evaluate(() => window.PackagesModule.openBranchModal());
    await sleep(1000);
    await snap(path.join(QTV_DIR, 'W11-modal-them-chi-nhanh.png'));
  } catch (e) { console.warn('W11-modal-them-chi-nhanh failed:', e.message); }
  await closeAllPopups();

  // W11 Modal Số liệu chi nhánh
  try {
    await page.evaluate(async () => {
      const res = await window.apiClient.branches.list();
      const items = res.data?.items || res.data || [];
      if (items[0]?.id) window.PackagesModule.openBranchStats(items[0].id);
    });
    await sleep(1200);
    await snap(path.join(QTV_DIR, 'W11-modal-so-lieu-chi-nhanh.png'));
  } catch (e) { console.warn('W11-modal-so-lieu-chi-nhanh failed:', e.message); }
  await closeAllPopups();

  // W12: Hệ thống & thiết bị
  await nav('equipment');
  await snap(path.join(QTV_DIR, 'W12-he-thong-thiet-bi.png'));

  // W12 Modal Thêm thiết bị
  try {
    await page.evaluate(() => {
      $('.dx-button:contains("Thêm thiết bị")').first().click();
    });
    await sleep(1000);
    await snap(path.join(QTV_DIR, 'W12-modal-them-thiet-bi.png'));
  } catch (e) { console.warn('W12-modal-them-thiet-bi failed:', e.message); }
  await closeAllPopups();

  // W12 Tab Sự cố thiết bị
  try {
    await page.evaluate(() => {
      $('.dx-tab:contains("Sự cố thiết bị"), .dx-tab:contains("Sự cố")').click();
    });
    await sleep(1200);
    await snap(path.join(QTV_DIR, 'W12-tab-su-co-thiet-bi.png'));

    // W12 Modal Ghi nhận sự cố
    await page.evaluate(() => {
      $('.dx-button:contains("Ghi nhận sự cố")').first().click();
    });
    await sleep(1000);
    await snap(path.join(QTV_DIR, 'W12-modal-ghi-nhan-su-co.png'));
    await closeAllPopups();
  } catch (e) { console.warn('W12-tab-su-co failed:', e.message); }

  // W12 Tab Consent nhận diện
  try {
    await page.evaluate(() => {
      $('.dx-tab:contains("Consent nhận diện"), .dx-tab:contains("Consent")').click();
    });
    await sleep(1200);
    await snap(path.join(QTV_DIR, 'W12-tab-consent-nhan-dien.png'));
  } catch (e) { console.warn('W12-tab-consent failed:', e.message); }

  // W13: Tài khoản & phân quyền
  await nav('users-rbac');
  await snap(path.join(QTV_DIR, 'W13-tai-khoan-phan-quyen.png'));

  // W13 Modal Sửa tài khoản
  try {
    await page.evaluate(() => {
      $('.system-view .dx-datagrid .dx-button[aria-label*="Sửa tài khoản"], .system-view .dx-datagrid .dx-button[hint*="Sửa tài khoản"]').first().click();
    });
    await sleep(1200);
    await snap(path.join(QTV_DIR, 'W13-modal-sua-tai-khoan.png'));
  } catch (e) { console.warn('W13-modal-sua-tai-khoan failed:', e.message); }
  await closeAllPopups();

  // W13 Tab Nhật ký kiểm toán (Audit log)
  try {
    await page.evaluate(() => {
      $('.dx-tab:contains("Nhật ký kiểm toán"), .dx-tab:contains("Audit")').click();
    });
    await sleep(1200);
    await snap(path.join(QTV_DIR, 'W13-tab-audit-log.png'));

    // W13 Modal Chi tiết nhật ký
    await page.evaluate(() => {
      $('.system-view .dx-datagrid .dx-button[aria-label*="Xem nhật ký"], .system-view .dx-datagrid .dx-button[hint*="Xem nhật ký"]').first().click();
    });
    await sleep(1200);
    await snap(path.join(QTV_DIR, 'W13-modal-chi-tiet-audit-log.png'));
    await closeAllPopups();
  } catch (e) { console.warn('W13-audit-log failed:', e.message); }


  // ==========================================================================
  // SECTION B: LỄ TÂN (LT) - LT-W01 TO LT-W09 + MODALS
  // ==========================================================================
  console.log('\n========================================');
  console.log('START CAPTURING LỄ TÂN (LT) MENUS & MODALS');
  console.log('========================================');
  await loginPage(ltAuth, '11111111-1111-1111-1111-111111111111');

  // LT-W01: Tổng quan
  await nav('dashboard');
  await snap(path.join(LT_DIR, 'LT-W01-tong-quan.png'));

  // LT-W02: Hội viên & khách hàng
  await nav('members');
  await snap(path.join(LT_DIR, 'LT-W02-danh-sach-hoi-vien.png'));

  // LT-W02 Modal Thêm hội viên
  try {
    await page.evaluate(() => window.MembersModule.openMemberModal(null));
    await sleep(1000);
    await snap(path.join(LT_DIR, 'LT-W02-modal-them-hoi-vien.png'));
  } catch (e) { console.warn('LT-W02-modal-them-hoi-vien failed:', e.message); }
  await closeAllPopups();

  // LT-W02 Drawer Chi tiết hội viên
  try {
    await page.evaluate(async () => {
      const res = await window.apiClient.members.list({ limit: 1 });
      const id = res.data?.items?.[0]?.id || res.data?.[0]?.id;
      if (id) window.MembersModule.openDetail(id);
    });
    await sleep(1200);
    await snap(path.join(LT_DIR, 'LT-W02-drawer-chi-tiet-hoi-vien.png'));
  } catch (e) { console.warn('LT-W02-drawer-chi-tiet failed:', e.message); }
  await closeAllPopups();

  // LT-W04: Đăng ký & gia hạn
  await nav('registrations');
  await snap(path.join(LT_DIR, 'LT-W04-danh-sach-dang-ky.png'));

  // LT-W04 Modal Đăng ký mới
  try {
    await page.evaluate(() => window.SalesModule.openRegistrationModal());
    await sleep(1000);
    await snap(path.join(LT_DIR, 'LT-W04-modal-dang-ky-moi.png'));
  } catch (e) { console.warn('LT-W04-modal-dang-ky-moi failed:', e.message); }
  await closeAllPopups();

  // LT-W04 Modal Chi tiết đăng ký
  try {
    await page.evaluate(async () => {
      const res = await window.apiClient.registrations.list({ limit: 1 });
      const reg = res.data?.items?.[0] || res.data?.[0];
      if (reg?.id) window.SalesModule.openRegistrationDetail(reg.id);
    });
    await sleep(1200);
    await snap(path.join(LT_DIR, 'LT-W04-modal-chi-tiet-dang-ky.png'));
  } catch (e) { console.warn('LT-W04-modal-chi-tiet-dang-ky failed:', e.message); }
  await closeAllPopups();

  // LT-W05: Huấn luyện viên
  await nav('trainers');
  await snap(path.join(LT_DIR, 'LT-W05-danh-sach-hlv.png'));

  // LT-W06: Lịch tập & buổi PT
  await nav('pt-schedule');
  await snap(path.join(LT_DIR, 'LT-W06-lich-tap-pt.png'));

  // LT-W06 Chi tiết lịch HLV
  try {
    await page.evaluate(() => {
      $('.pt-select-card, .dx-button:contains("Xem lịch")').first().click();
    });
    await sleep(1200);
    await snap(path.join(LT_DIR, 'LT-W06-chi-tiet-lich-hlv.png'));
  } catch (e) { console.warn('LT-W06-chi-tiet-lich-hlv failed:', e.message); }

  // LT-W07: Ra vào & check-in
  await nav('access-gate');
  await snap(path.join(LT_DIR, 'LT-W07-ra-vao-checkin.png'));

  // LT-W07 Modal Ghi nhận vào ra thủ công
  try {
    await page.evaluate(() => window.CheckinModule.openManual());
    await sleep(1000);
    await snap(path.join(LT_DIR, 'LT-W07-modal-ghi-nhan-thu-cong.png'));
  } catch (e) { console.warn('LT-W07-modal-ghi-nhan-thu-cong failed:', e.message); }
  await closeAllPopups();

  // LT-W08: Thu tiền & thanh toán
  await nav('payments');
  await snap(path.join(LT_DIR, 'LT-W08-thu-tien-thanh-toan.png'));

  // LT-W08 Modal Thu tiền
  try {
    await page.evaluate(() => {
      $('.dx-button:contains("Thu tiền")').first().click();
    });
    await sleep(1000);
    await snap(path.join(LT_DIR, 'LT-W08-modal-thu-tien.png'));
  } catch (e) { console.warn('LT-W08-modal-thu-tien failed:', e.message); }
  await closeAllPopups();

  // LT-W08 Modal In Phiếu thu
  try {
    await page.evaluate(async () => {
      const res = await window.apiClient.payments.list({ limit: 10 });
      const items = res.data?.items || res.data || [];
      const completed = items.find(p => p.status === 'COMPLETED') || items[0];
      if (completed?.id) {
        await window.SalesModule.openReceipt(completed);
      }
    });
    await sleep(1200);
    await snap(path.join(LT_DIR, 'LT-W08-modal-in-phieu-thu.png'));
  } catch (e) { console.warn('LT-W08-modal-in-phieu-thu failed:', e.message); }
  await closeAllPopups();

  // LT-W09: Thông báo chi nhánh
  await nav('notifications');
  await snap(path.join(LT_DIR, 'LT-W09-thong-bao-chi-nhanh.png'));

  console.log('\n=== ALL SCREENSHOTS CAPTURED SUCCESSFULLY! ===');
  await browser.close();
}

run().catch(err => {
  console.error('FATAL CAPTURE ERROR:', err);
  process.exitCode = 1;
});

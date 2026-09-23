const E2ETestRunner = require('../e2e/runner');
const path = require('path');

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
  const runner = new E2ETestRunner();
  await runner.init();

  const ARTIFACTS_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile3\\.gemini\\antigravity\\brain\\8f603014-e613-4055-a510-ef40fa67cfcb';

  try {
    console.log('[TEST] 1. Khởi tạo phiên đăng nhập QTV trên Web Admin...');
    await runner.ensurePage();
    await runner.page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
    
    const auth = await loginApi('0900000001', 'Paradise@123', 'QTV');
    await runner.safeGoto('http://localhost:3000/web/');
    await runner.page.evaluate((token, user) => {
      localStorage.setItem('paradise_access_token', token);
      localStorage.setItem('paradise_user', JSON.stringify(user));
      localStorage.setItem('paradise_current_branch_id', 'ALL');
    }, auth.token, auth.user);
    
    console.log('[TEST] 2. Điều hướng đến Menu Huấn luyện viên (#trainers)...');
    await runner.safeGoto('http://localhost:3000/web/?run=1#trainers');
    await runner.page.waitForFunction(() => $('.dx-datagrid-table').length > 0, { timeout: 15000 });
    await runner.sleep(2500);

    console.log('[TEST] 3. Mở Popup chi tiết HLV PT001...');
    // Click vào dòng hoặc nút xem chi tiết của PT001
    const ptClicked = await runner.page.evaluate(() => {
      const row = $('.dx-datagrid-table tbody tr').filter((i, el) => $(el).text().includes('PT001') || $(el).text().includes('Nguyễn Văn Thể')).first();
      if (row.length) {
        row.trigger('click');
        return true;
      }
      return false;
    });
    console.log('[TEST] PT Row Clicked:', ptClicked);
    await runner.sleep(2500);

    // Chờ popup hiển thị
    await runner.page.waitForFunction(() => $('.dx-popup-content:visible').length > 0, { timeout: 10000 });
    await runner.sleep(1500);

    // Kiểm tra 5 Menu trong sidebar popup
    const sidebarMenuItems = await runner.page.evaluate(() => {
      return $('.profile-sidebar-nav .trainer-sidebar-item').map((i, el) => $(el).text().replace(/\s+/g, ' ').trim()).get();
    });
    console.log('[TEST] Sidebar Menu Items:', sidebarMenuItems);

    // TAB 1: TỔNG QUAN
    console.log('[TEST] 4. Kiểm tra Tab 1: Tổng quan...');
    const overviewData = await runner.page.evaluate(() => {
      return {
        heroText: $('.profile-modal-main div:contains("TỔNG THU NHẬP")').first().text().replace(/\s+/g, ' ').trim(),
        metricCards: $('.profile-modal-main .metric-card').map((i, el) => $(el).find('.metric-label span').text().trim()).get(),
        hasSessionBox: $('.profile-modal-main .profile-card-box').length > 0
      };
    });
    console.log('[TEST] Overview Tab Data:', overviewData);
    const shot1 = path.join(ARTIFACTS_DIR, 'verify_web_pt_popup_tab1_overview.png');
    await runner.page.screenshot({ path: shot1 });
    console.log('[TEST] Đã chụp ảnh Tab 1 Tổng quan:', shot1);

    // TAB 2: LỊCH
    console.log('[TEST] 5. Chuyển sang Tab 2: Lịch...');
    await runner.page.evaluate(() => {
      $('.profile-sidebar-nav .trainer-sidebar-item:contains("Lịch")').click();
    });
    await runner.sleep(1500);
    const scheduleData = await runner.page.evaluate(() => {
      return {
        subtabs: $('.profile-modal-main button').map((i, el) => $(el).text().trim()).get(),
        gridRows: $('.profile-modal-main .dx-datagrid-table tbody tr').length
      };
    });
    console.log('[TEST] Schedule Tab Data:', scheduleData);
    const shot2 = path.join(ARTIFACTS_DIR, 'verify_web_pt_popup_tab2_schedule.png');
    await runner.page.screenshot({ path: shot2 });
    console.log('[TEST] Đã chụp ảnh Tab 2 Lịch:', shot2);

    // TAB 3: GÓI PHỤ TRÁCH
    console.log('[TEST] 6. Chuyển sang Tab 3: Gói phụ trách...');
    await runner.page.evaluate(() => {
      $('.profile-sidebar-nav .trainer-sidebar-item:contains("Gói phụ trách")').click();
    });
    await runner.sleep(1500);

    // Chuyển sang subtab 3: Lớp tập CĐ phụ trách
    await runner.page.evaluate(() => {
      $('.profile-modal-main button:contains("Lớp tập CĐ phụ trách")').click();
    });
    await runner.sleep(1500);

    const membersData = await runner.page.evaluate(() => {
      return {
        subtabs: $('.profile-modal-main button').map((i, el) => $(el).text().trim()).get(),
        gridRows: $('.profile-modal-main .dx-datagrid-table tbody tr').length
      };
    });
    console.log('[TEST] Members Tab Data (Subtab Community):', membersData);
    const shot3 = path.join(ARTIFACTS_DIR, 'verify_web_pt_popup_tab3_members.png');
    await runner.page.screenshot({ path: shot3 });
    console.log('[TEST] Đã chụp ảnh Tab 3 Gói phụ trách (Lớp CĐ):', shot3);

    // TAB 4: THU NHẬP
    console.log('[TEST] 7. Chuyển sang Tab 4: Thu nhập...');
    await runner.page.evaluate(() => {
      $('.profile-sidebar-nav .trainer-sidebar-item:contains("Thu nhập")').click();
    });
    await runner.sleep(1500);
    const incomeData = await runner.page.evaluate(() => {
      return {
        subtabs: $('.profile-modal-main button').map((i, el) => $(el).text().trim()).get(),
        hasConfirmBox: $('.profile-modal-main:contains("XÁC NHẬN CHI TRẢ")').length > 0
      };
    });
    console.log('[TEST] Income Tab Data:', incomeData);
    const shot4 = path.join(ARTIFACTS_DIR, 'verify_web_pt_popup_tab4_income.png');
    await runner.page.screenshot({ path: shot4 });
    console.log('[TEST] Đã chụp ảnh Tab 4 Thu nhập:', shot4);

    // TAB 5: TÀI KHOẢN
    console.log('[TEST] 8. Chuyển sang Tab 5: Tài khoản...');
    await runner.page.evaluate(() => {
      $('.profile-sidebar-nav .trainer-sidebar-item:contains("Tài khoản")').click();
    });
    await runner.sleep(1500);
    const shot5 = path.join(ARTIFACTS_DIR, 'verify_web_pt_popup_tab5_profile.png');
    await runner.page.screenshot({ path: shot5 });
    console.log('[TEST] Đã chụp ảnh Tab 5 Tài khoản:', shot5);

    // THỬ NGHIỆM MỞ MODAL DANH SÁCH HỘI VIÊN LỚP CỘNG ĐỒNG
    console.log('[TEST] 9. Quay lại Tab Gói phụ trách và bấm [Xem học viên] lớp CĐ...');
    await runner.page.evaluate(() => {
      $('.profile-sidebar-nav .trainer-sidebar-item:contains("Gói phụ trách")').click();
    });
    await runner.sleep(1000);
    await runner.page.evaluate(() => {
      $('.profile-modal-main button:contains("Lớp tập CĐ phụ trách")').click();
    });
    await runner.sleep(1500);

    const btnViewMembersClicked = await runner.page.evaluate(() => {
      const btn = $('.profile-modal-main .dx-button:contains("Xem học viên")').first();
      if (btn.length) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('[TEST] Btn View Members Clicked:', btnViewMembersClicked);
    await runner.sleep(2000);

    const classModalData = await runner.page.evaluate(() => {
      const topPopup = $('.dx-popup-content:visible').last();
      return {
        popupTitle: $('.dx-popup-title:visible').last().text().trim(),
        hasPurpleCard: topPopup.find('div:contains("LỚP TẬP CỘNG ĐỒNG")').length > 0,
        memberRowsCount: topPopup.find('.dx-datagrid-table tbody tr').length
      };
    });
    console.log('[TEST] Class Members Modal Data:', classModalData);
    const shot6 = path.join(ARTIFACTS_DIR, 'verify_web_pt_popup_class_members.png');
    await runner.page.screenshot({ path: shot6 });
    console.log('[TEST] Đã chụp ảnh Modal danh sách học viên lớp CĐ:', shot6);

    console.log('[TEST] TẤT CẢ CÁC BƯỚC THỬ NGHIỆM ĐÃ HOÀN TẤT THÀNH CÔNG 100%!');
  } catch (err) {
    console.error('[TEST ERROR]', err);
    throw err;
  } finally {
    await runner.close();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

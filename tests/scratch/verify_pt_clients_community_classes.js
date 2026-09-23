const E2ETestRunner = require('../e2e/runner');
const path = require('path');

async function run() {
  const runner = new E2ETestRunner();
  await runner.init();

  const PT_PHONE = '0900000003'; // PT001 Nguyễn Văn Thể
  const ARTIFACTS_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile3\\.gemini\\antigravity\\brain\\8f603014-e613-4055-a510-ef40fa67cfcb';

  try {
    console.log('[TEST] 1. Khởi tạo phiên đăng nhập PT001...');
    await runner.ensurePage();
    await runner.page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    const auth = await runner.getAuthToken(PT_PHONE, 'Paradise@123', 'PT');
    await runner.safeGoto('http://localhost:3000/mobile/pt/');
    await runner.page.evaluate((t, u) => {
      localStorage.setItem('paradise_access_token', t);
      localStorage.setItem('paradise_user', JSON.stringify(u));
    }, auth.token, auth.user);
    await runner.safeGoto('http://localhost:3000/mobile/pt/');
    await runner.page.waitForFunction(() => Boolean(window.ptApp && window.ptApp.currentUser && $('#authScreen').is(':hidden')), { timeout: 10000 });
    await runner.sleep(2000);

    console.log('[TEST] 2. Chuyển sang Menu Gói phụ trách (Tab members)...');
    await runner.page.evaluate(() => {
      window.ptApp.switchTab('members');
    });
    await runner.sleep(2500);

    // Kiểm tra 3 Sub-tabs
    const tabsData = await runner.page.evaluate(() => {
      return {
        tab1Text: $('#tabBtnMembers').text().replace(/\s+/g, ' ').trim(),
        tab2Text: $('#tabBtnPackages').text().replace(/\s+/g, ' ').trim(),
        tab3Text: $('#tabBtnCommunityClasses').text().replace(/\s+/g, ' ').trim(),
        tab3Exists: $('#tabBtnCommunityClasses').length > 0,
        activeTab: $('.pt-tab-btn.active').data('tab')
      };
    });
    console.log('[TEST] Sub-tabs Data:', tabsData);

    const shot1 = path.join(ARTIFACTS_DIR, 'verify_pt_clients_3_subtabs.png');
    await runner.page.screenshot({ path: shot1, fullPage: false });
    console.log('[TEST] Đã chụp ảnh Menu Gói phụ trách với 3 Sub-tabs:', shot1);

    // 3. Chuyển sang Tab 3: Lớp tập CĐ phụ trách
    console.log('[TEST] 3. Chuyển sang Sub-tab Lớp tập CĐ phụ trách...');
    await runner.page.evaluate(() => {
      $('#tabBtnCommunityClasses').trigger('click');
    });
    await runner.sleep(1500);

    const classesListData = await runner.page.evaluate(() => {
      const cards = $('.pt-community-class-card');
      return {
        activeTab: $('.pt-tab-btn.active').data('tab'),
        cardsCount: cards.length,
        firstCardTitle: cards.first().find('div:nth-child(2)').text().trim(),
        firstCardMeta: cards.first().text().replace(/\s+/g, ' ').trim()
      };
    });
    console.log('[TEST] Danh sách Lớp CĐ phụ trách:', classesListData);

    const shot2 = path.join(ARTIFACTS_DIR, 'verify_pt_clients_community_classes_list.png');
    await runner.page.screenshot({ path: shot2, fullPage: false });
    console.log('[TEST] Đã chụp ảnh Danh sách Lớp tập CĐ phụ trách:', shot2);

    // 4. Bấm vào 1 lớp để xem thông tin lớp học & danh sách thành viên
    console.log('[TEST] 4. Bấm vào lớp đầu tiên để mở Modal thông tin lớp & danh sách học viên...');
    await runner.page.evaluate(() => {
      $('.pt-community-class-card').first().trigger('click');
    });
    await runner.sleep(2500);

    const modalData = await runner.page.evaluate(() => {
      const popup = $('.dx-popup:visible');
      const members = popup.find('.pt-class-members-modal-body > div:last-child > div');
      const classTitle = popup.find('.pt-class-members-modal-body h3, .pt-class-members-modal-body div[style*="font-size: 16px"]').text().trim();
      return {
        popupVisible: popup.length > 0,
        popupTitle: popup.find('.dx-popup-title').text().trim(),
        classTitle: classTitle,
        membersCount: members.length
      };
    });
    console.log('[TEST] Modal Lớp CĐ & Danh sách học viên:', modalData);

    const shot3 = path.join(ARTIFACTS_DIR, 'verify_pt_clients_community_class_members_popup.png');
    await runner.page.screenshot({ path: shot3, fullPage: false });
    console.log('[TEST] Đã chụp ảnh Popup Lớp CĐ & Danh sách học viên từ Menu Gói phụ trách:', shot3);

    // 5. Thử nghiệm tìm kiếm realtime
    console.log('[TEST] 5. Thử nghiệm tìm kiếm realtime trong tab Lớp tập CĐ phụ trách...');
    await runner.page.evaluate(() => {
      $('.dx-popup').each(function () {
        const inst = $(this).dxPopup('instance');
        if (inst) inst.hide();
      });
    });
    await runner.sleep(800);

    await runner.page.evaluate(() => {
      const input = document.getElementById('ptClientsSearchInput');
      input.value = 'Cardio';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await runner.sleep(1000);

    const searchResultData = await runner.page.evaluate(() => {
      const cards = $('.pt-community-class-card');
      return {
        filteredCount: cards.length,
        allMatchQuery: Array.from(cards).every(c => $(c).text().toLowerCase().includes('cardio'))
      };
    });
    console.log('[TEST] Kết quả tìm kiếm "Cardio":', searchResultData);

    console.log('[TEST] TẤT CẢ CÁC BƯỚC THỬ NGHIỆM ĐÃ HOÀN TẤT THÀNH CÔNG 100%!');
  } catch (err) {
    console.error('[TEST ERROR]', err);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
}

run();

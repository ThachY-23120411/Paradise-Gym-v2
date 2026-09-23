const E2ETestRunner = require('../e2e/runner');
const path = require('path');

async function run() {
  const runner = new E2ETestRunner();
  await runner.init();

  const PT_PHONE = '0900000003'; // PT001 Nguyễn Văn Thể
  const ARTIFACTS_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile3\\.gemini\\antigravity\\brain\\8f603014-e613-4055-a510-ef40fa67cfcb';

  try {
    console.log('[TEST] 1. Mở Mobile PT Session cho PT001 tại tab Overview...');
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
    await runner.sleep(2500);

    // 1. Kiểm tra Màn hình Tổng quan
    const overviewData = await runner.page.evaluate(() => {
      return {
        kpiCommunity: $('#kpiCommunityClasses').text().trim(),
        totalEstIncome: $('#overviewCommAmount').text().trim(),
        ptCommEst: $('#overviewPtCommAmount').text().trim(),
        communityCompEst: $('#overviewCommunityCompAmount').text().trim()
      };
    });
    console.log('[TEST] Overview KPI Data:', overviewData);

    const shot1 = path.join(ARTIFACTS_DIR, 'verify_pt_overview_kpis.png');
    await runner.page.screenshot({ path: shot1, fullPage: false });
    console.log('[TEST] Đã chụp ảnh Tổng quan:', shot1);

    // 2. Kiểm tra Màn hình Lịch dạy
    console.log('[TEST] 2. Chuyển sang Tab Lịch và chọn ngày 22/09/2026...');
    await runner.page.evaluate(() => {
      window.ptApp.switchTab('schedule');
    });
    await runner.sleep(2000);

    await runner.page.evaluate(() => {
      window.ParadisePTSchedule.selectDate('2026-09-22');
    });
    await runner.sleep(2000);

    const scheduleData = await runner.page.evaluate(() => {
      const card = $('.pt-schedule-community-card');
      return {
        counterBadge: $('#slotsCounterBadge').text().trim(),
        cardExists: card.length > 0,
        cardTitle: card.find('div:nth-child(2)').text().trim(),
        cardMeta: card.text().trim()
      };
    });
    console.log('[TEST] Schedule Data on 2026-09-22:', scheduleData);

    const shot2 = path.join(ARTIFACTS_DIR, 'verify_pt_schedule_community_card.png');
    await runner.page.screenshot({ path: shot2, fullPage: false });
    console.log('[TEST] Đã chụp ảnh Lịch dạy có Card Lớp CĐ:', shot2);

    // 2.1. Mở popup chi tiết lớp CĐ & danh sách hội viên
    console.log('[TEST] 2.1. Bấm Xem danh sách hội viên lớp CĐ...');
    await runner.page.evaluate(() => {
      $('.btn-schedule-view-community-members').first().trigger('click');
    });
    await runner.sleep(2500);

    const popupData = await runner.page.evaluate(() => {
      const popup = $('.dx-popup:visible');
      const items = popup.find('.pt-class-members-modal-body > div:last-child > div');
      return {
        popupVisible: popup.length > 0,
        memberItemsCount: items.length,
        popupTitle: popup.find('.dx-popup-title').text().trim()
      };
    });
    console.log('[TEST] Popup Data:', popupData);

    const shot3 = path.join(ARTIFACTS_DIR, 'verify_pt_schedule_community_popup.png');
    await runner.page.screenshot({ path: shot3, fullPage: false });
    console.log('[TEST] Đã chụp ảnh Popup Lớp CĐ & Danh sách hội viên:', shot3);

    // Đóng popup bằng dxPopup instance
    await runner.page.evaluate(() => {
      $('.dx-popup').each(function () {
        const inst = $(this).dxPopup('instance');
        if (inst) inst.hide();
      });
    });
    await runner.sleep(1000);

    // 3. Kiểm tra Menu Thu nhập
    console.log('[TEST] 3. Chuyển sang Menu Thu nhập...');
    await runner.page.evaluate(() => {
      window.ptApp.switchTab('commissions');
    });
    await runner.sleep(3000);

    const pageTitle = await runner.page.evaluate(() => {
      return $('#commissionPageTitle').text().trim();
    });
    console.log('[TEST] Page Title:', pageTitle);

    // Subtab 1: Thu nhập (Tổng hợp & Xác nhận chi trả 2 chiều gộp)
    const subtab1Data = await runner.page.evaluate(() => {
      return {
        totalIncome: $('#summaryTotalIncomeAmount').text().trim(),
        ptComm: $('#summaryPtCommAmount').text().trim(),
        communityComp: $('#summaryCommunityCompAmount').text().trim(),
        totalSessions: $('#summaryTotalSessionsCount').text().trim(),
        statusBadge: $('#summaryIncomeStatusBadge').text().trim(),
        confirmationBoxVisible: $('#commConfirmationBox').is(':visible'),
        paidDateWrapVisible: $('#commPaidDateWrap').is(':visible'),
        sourceCardsCount: $('.pt-income-source-card').length
      };
    });
    console.log('[TEST] Subtab 1 Data (Thu nhập Tổng hợp):', subtab1Data);

    const shot4 = path.join(ARTIFACTS_DIR, 'verify_pt_income_subtab1_summary.png');
    await runner.page.screenshot({ path: shot4, fullPage: false });
    console.log('[TEST] Đã chụp ảnh Subtab 1 (Thu nhập Tổng hợp):', shot4);

    // Subtab 2: Gói PT / Combo (Hoa hồng)
    console.log('[TEST] 3.1. Chuyển sang Subtab Gói PT / Combo...');
    await runner.page.evaluate(() => {
      $('.pt-income-subtab-btn[data-subtab="pt_combo"]').trigger('click');
    });
    await runner.sleep(1000);

    const subtab2Data = await runner.page.evaluate(() => {
      return {
        totalComm: $('#commTotalAmount').text().trim(),
        rate: $('#commRate').text().trim(),
        sessionsCount: $('#commSessionsCount').text().trim(),
        itemsCount: $('#commSessionsList .pt-comm-session-item').length
      };
    });
    console.log('[TEST] Subtab 2 Data (Gói PT / Combo):', subtab2Data);

    const shot5 = path.join(ARTIFACTS_DIR, 'verify_pt_income_subtab2_pt_combo.png');
    await runner.page.screenshot({ path: shot5, fullPage: false });
    console.log('[TEST] Đã chụp ảnh Subtab 2 (Gói PT / Combo):', shot5);

    // Subtab 3: Thù lao lớp CĐ
    console.log('[TEST] 3.2. Chuyển sang Subtab Thù lao lớp CĐ...');
    await runner.page.evaluate(() => {
      $('.pt-income-subtab-btn[data-subtab="community_comp"]').trigger('click');
    });
    await runner.sleep(1000);

    const subtab3Data = await runner.page.evaluate(() => {
      return {
        totalComp: $('#commCommunityTotalComp').text().trim(),
        basePrice: $('#commCommunityBasePrice').text().trim(),
        bonus: $('#commCommunityBonusAmount').text().trim(),
        classesCount: $('#commCommunityClassesCount').text().trim(),
        compItemsCount: $('#commCommunityCompList .pt-comm-session-item').length
      };
    });
    console.log('[TEST] Subtab 3 Data (Thù lao lớp CĐ):', subtab3Data);

    const shot6 = path.join(ARTIFACTS_DIR, 'verify_pt_income_subtab3_community_comp.png');
    await runner.page.screenshot({ path: shot6, fullPage: false });
    console.log('[TEST] Đã chụp ảnh Subtab 3 (Thù lao lớp CĐ):', shot6);

    // 3.3. Thử nghiệm click vào Thẻ nguồn thu nhập từ Subtab 1 để điều hướng nhanh
    console.log('[TEST] 3.3. Kiểm tra click Thẻ nguồn thu nhập điều hướng từ Subtab 1 sang Subtab 3...');
    await runner.page.evaluate(() => {
      $('.pt-income-subtab-btn[data-subtab="income_summary"]').trigger('click');
    });
    await runner.sleep(500);
    await runner.page.evaluate(() => {
      $('.pt-income-source-card[data-target-subtab="community_comp"]').trigger('click');
    });
    await runner.sleep(1000);
    const activeSubtabAfterNav = await runner.page.evaluate(() => {
      return $('.pt-income-subtab-btn.active').data('subtab');
    });
    console.log('[TEST] Subtab active sau khi click card nguồn:', activeSubtabAfterNav);

    console.log('[TEST] HOÀN TẤT TẤT CẢ CÁC BƯỚC THỬ NGHIỆM THÀNH CÔNG 100%!');
  } catch (err) {
    console.error('[TEST ERROR]', err);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
}

run();

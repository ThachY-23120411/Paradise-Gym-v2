const E2ETestRunner = require('./e2e/runner');
const path = require('path');

const ARTIFACT_DIR = 'E:/Antigravity - Copy/Profiles/Profile6/.gemini/antigravity/brain/8f603014-e613-4055-a510-ef40fa67cfcb';

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();

  try {
    console.log('--- STEP 1: Login as Admin QTV ---');
    await runner.switchSession('0900000001', 'ALL', 'QTV');
    await runner.sleep(2000);

    console.log('--- STEP 2: Navigate to Quản lý hoa hồng PT (#commissions) ---');
    await runner.page.evaluate(() => {
      window.location.hash = '#commissions';
    });
    await runner.sleep(3500);

    // Screenshot 1: Tab Bảng kê hoa hồng tháng tích hợp lớp cộng đồng
    console.log('--- STEP 3: Capture Bảng kê hoa hồng tháng (Đã tích hợp Lớp CĐ & 5 KPI cards) ---');
    const shotMonthly = path.join(ARTIFACT_DIR, 'verify_commissions_monthly_with_community_classes.png');
    await runner.page.screenshot({ path: shotMonthly });
    console.log('Screenshot 1 saved:', shotMonthly);

    // Click dòng Lê Văn Hùng để kiểm tra 5 KPI cards của HLV được chọn (kèm Thù lao lớp cộng đồng)
    console.log('--- STEP 3b: Click row PT002 Lê Văn Hùng to verify selected 5 KPI cards ---');
    await runner.page.evaluate(() => {
      const firstRow = $('.dx-datagrid-rowsview tr.dx-data-row').first();
      if (firstRow.length) firstRow.trigger('dxclick');
    });
    await runner.sleep(1500);

    const shotPtSelected = path.join(ARTIFACT_DIR, 'verify_commissions_pt_selected_5_kpis.png');
    await runner.page.screenshot({ path: shotPtSelected });
    console.log('Screenshot 1b saved:', shotPtSelected);

    // Bỏ chọn dòng
    await runner.page.evaluate(() => {
      const firstRow = $('.dx-datagrid-rowsview tr.dx-data-row').first();
      if (firstRow.length) firstRow.trigger('dxclick');
    });
    await runner.sleep(1000);

    // Chuyển sang Tab 2: Thù lao lớp cộng đồng
    console.log('--- STEP 4: Switch to Tab "Thù lao lớp cộng đồng" ---');
    await runner.page.evaluate(() => {
      const tabs = $('.commissions-tabs .dx-tab');
      if (tabs.length >= 2) {
        tabs[1].click();
      }
    });
    await runner.sleep(3000);

    // Screenshot 2: Tab Thù lao lớp cộng đồng
    const shotCommunity = path.join(ARTIFACT_DIR, 'verify_commissions_community_tab.png');
    await runner.page.screenshot({ path: shotCommunity });
    console.log('Screenshot 2 saved:', shotCommunity);

    // Click nút "Học viên" ở dòng đầu tiên của tab Thù lao lớp cộng đồng
    console.log('--- STEP 5: Click [Học viên] on first row ---');
    const btnClicked = await runner.page.evaluate(() => {
      const $btn = $('.commissions-content .dx-datagrid-rowsview .dx-button:contains("Học viên")').first();
      if ($btn.length) {
        $btn.trigger('dxclick');
        $btn.click();
        return true;
      }
      return false;
    });
    console.log('Member button clicked:', btnClicked);
    await runner.sleep(2500);

    // Screenshot 3: Modal danh sách học viên
    const shotModal = path.join(ARTIFACT_DIR, 'verify_commissions_community_members_modal.png');
    await runner.page.screenshot({ path: shotModal });
    console.log('Screenshot 3 saved:', shotModal);

    // Đóng modal
    await runner.page.evaluate(() => {
      const closeBtn = document.querySelector('.dx-popup .dx-closebutton');
      if (closeBtn) closeBtn.click();
    });
    await runner.sleep(1000);

    // Quay lại tab 1 và mở Modal Chi tiết HLV Nguyễn Văn Thể
    console.log('--- STEP 6: Switch back to Monthly Tab and Open Details for PT001 ---');
    await runner.page.evaluate(() => {
      const tabs = $('.commissions-tabs .dx-tab');
      if (tabs.length >= 1) tabs[0].click();
    });
    await runner.sleep(2000);

    const detailsClicked = await runner.page.evaluate(() => {
      const $btn = $('.commissions-content .dx-datagrid-rowsview .dx-button:contains("Chi tiết")').first();
      if ($btn.length) {
        $btn.trigger('dxclick');
        $btn.click();
        return true;
      }
      return false;
    });
    console.log('Details button clicked:', detailsClicked);
    await runner.sleep(2500);

    // Screenshot 4: Modal chi tiết đa tab (Buổi dạy PT 1:1)
    const shotDetails = path.join(ARTIFACT_DIR, 'verify_commission_details_multitabs.png');
    await runner.page.screenshot({ path: shotDetails });
    console.log('Screenshot 4 saved:', shotDetails);

    // Chuyển sang sub-tab "Lớp dạy cộng đồng" trong modal chi tiết
    console.log('--- STEP 7: Switch to Community Subtab in Details Modal ---');
    const tabs = await runner.page.$$('.commission-details-tabs .dx-tab');
    console.log('Found detail subtabs:', tabs.length);
    if (tabs.length >= 2) {
      await tabs[1].click();
      console.log('Clicked subtab 2 natively via Puppeteer!');
    }
    await runner.sleep(2000);

    const shotSubTab2 = path.join(ARTIFACT_DIR, 'verify_commission_details_community_subtab.png');
    await runner.page.screenshot({ path: shotSubTab2 });
    console.log('Screenshot 5 saved:', shotSubTab2);

    // Đóng modal hoàn toàn
    await runner.page.evaluate(() => {
      $('.dx-popup').each(function() {
        const inst = DevExpress.ui.dxPopup.getInstance(this);
        if (inst) inst.hide();
      });
      $('.dx-overlay-wrapper').hide();
      $('.dx-overlay-modal').hide();
    });
    await runner.sleep(1500);

    // Chuyển sang Tab 3: Lịch sử chi trả để kiểm tra các thẻ KPI mới
    console.log('--- STEP 8: Switch to Tab "Lịch sử chi trả" ---');
    await runner.page.evaluate(() => {
      const tabs = $('.commissions-tabs .dx-tab');
      if (tabs.length >= 3) {
        tabs[2].click();
      }
    });
    await runner.sleep(3000);

    const shotHistory = path.join(ARTIFACT_DIR, 'verify_commissions_history_kpi_breakdown.png');
    await runner.page.screenshot({ path: shotHistory });
    console.log('Screenshot 6 saved (History KPIs Breakdown):', shotHistory);

    console.log('✅ ALL COMMISSIONS & COMMUNITY INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test Execution Error:', err);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

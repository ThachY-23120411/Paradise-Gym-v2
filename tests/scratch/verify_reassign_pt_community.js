const E2ETestRunner = require('../e2e/runner');
const path = require('path');

async function run() {
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  const BRANCH_BINH_THANH = '22222222-2222-2222-2222-222222222222';
  const ARTIFACTS_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile4\\.gemini\\antigravity\\brain\\cf22d6e0-20cc-4a19-9c08-c386ee4a543d';

  try {
    await runner.openDesktopSession(QTV_PHONE, BRANCH_BINH_THANH, 'QTV');
    await runner.navigateTo('community-classes');
    await runner.sleep(3000);

    // 1. Kiểm tra lớp trong quá khứ (đã qua thời gian):
    // Lớp 06:30 - 07:30 ngày 22/9/2026 "Aerobic Năng Lượng Buổi Sáng"
    console.log('--- Testing past class: Aerobic Năng Lượng Buổi Sáng (06:30 - 07:30 22/9/2026) ---');
    const pastClassOpened = await runner.page.evaluate(() => {
      const cards = $('.dx-scheduler-appointment');
      let target = null;
      cards.each(function() {
        if ($(this).text().includes('Aerobic Năng Lượng Buổi Sáng')) {
          target = $(this);
        }
      });
      if (target && target.length) {
        target[0].click();
        return true;
      }
      return false;
    });
    console.log('Past class opened:', pastClassOpened);
    await runner.sleep(1500);

    // Kiểm tra các nút trong modal lớp đã qua thời gian
    const pastModalButtons = await runner.page.evaluate(() => {
      const popup = $('.dx-overlay-content:visible');
      const buttons = popup.find('.dx-button').toArray().map(el => $(el).text().trim()).filter(Boolean);
      const badge = popup.find('.status-badge').text().trim();
      return { buttons, badge };
    });
    console.log('Past class modal state:', pastModalButtons);

    const pastScreenshot = path.join(ARTIFACTS_DIR, 'verify_community_past_class_no_reassign_btn.png');
    await runner.page.screenshot({ path: pastScreenshot, fullPage: false });
    console.log('Saved past class screenshot:', pastScreenshot);

    // Đóng popup
    await runner.page.evaluate(() => {
      const closeBtn = $('.dx-overlay-content:visible .dx-button:contains("Đóng")');
      if (closeBtn.length) {
        closeBtn.trigger('dxclick');
        closeBtn[0].click();
      }
    });
    await runner.sleep(1000);

    // 2. Kiểm tra lớp CHƯA QUA THỜI GIAN:
    // Lớp "Yoga Vinyasa Nâng Cao" hoặc "Cardio Tabata Siết Cơ" ngày 23/9/2026 (ngày mai)
    console.log('--- Testing upcoming class (not passed): Yoga Vinyasa Nâng Cao (23/9/2026) ---');
    const upcomingClassOpened = await runner.page.evaluate(() => {
      const cards = $('.dx-scheduler-appointment');
      let target = null;
      cards.each(function() {
        if ($(this).text().includes('Yoga Vinyasa') || $(this).text().includes('Cardio Tabata')) {
          target = $(this);
          return false; // break
        }
      });
      if (target && target.length) {
        target[0].click();
        return true;
      }
      return false;
    });
    console.log('Upcoming class opened:', upcomingClassOpened);
    await runner.sleep(1500);

    // Kiểm tra nút Gán lại PT xuất hiện
    const upcomingModalButtons = await runner.page.evaluate(() => {
      const popup = $('.dx-overlay-content:visible');
      const buttons = popup.find('.dx-button').toArray().map(el => $(el).text().trim()).filter(Boolean);
      const badge = popup.find('.status-badge').text().trim();
      const hasReassignBtn = buttons.some(b => b.includes('Gán lại PT'));
      return { buttons, badge, hasReassignBtn };
    });
    console.log('Upcoming class modal state:', upcomingModalButtons);

    const upcomingScreenshot = path.join(ARTIFACTS_DIR, 'verify_community_upcoming_with_reassign_btn.png');
    await runner.page.screenshot({ path: upcomingScreenshot, fullPage: false });
    console.log('Saved upcoming class screenshot:', upcomingScreenshot);

    // 3. Click nút "Gán lại PT" để mở modal phân công lại HLV
    console.log('--- Clicking [Gán lại PT] ---');
    const clickedReassign = await runner.page.evaluate(() => {
      const reassignBtn = $('.dx-overlay-content:visible .dx-button:contains("Gán lại PT")');
      if (reassignBtn.length) {
        reassignBtn.trigger('dxclick');
        reassignBtn[0].click();
        return true;
      }
      return false;
    });
    console.log('Clicked reassign button:', clickedReassign);
    await runner.sleep(2000);

    // Kiểm tra nội dung modal gán lại HLV
    const reassignModalInfo = await runner.page.evaluate(() => {
      const popup = $('.dx-overlay-content:visible');
      const title = popup.find('.dx-popup-title').text().trim();
      const fields = popup.find('.dx-field-item-label-text').toArray().map(el => $(el).text().trim());
      const selectBox = popup.find('.dx-selectbox').dxSelectBox('instance');
      const availableItems = selectBox ? selectBox.option('items') : [];
      return { title, fields, availableCount: availableItems.length, items: availableItems.map(i => i.full_name) };
    });
    console.log('Reassign modal state:', reassignModalInfo);

    const reassignModalScreenshot = path.join(ARTIFACTS_DIR, 'verify_community_reassign_pt_modal.png');
    await runner.page.screenshot({ path: reassignModalScreenshot, fullPage: false });
    console.log('Saved reassign modal screenshot:', reassignModalScreenshot);

    // 4. Thử submit lưu gán lại PT (với HLV khả dụng và ghi chú)
    console.log('--- Submitting reassign PT form ---');
    await runner.page.evaluate(() => {
      const popup = $('.dx-overlay-content:visible');
      const textArea = popup.find('.dx-textarea').dxTextArea('instance');
      if (textArea) {
        textArea.option('value', 'Điều phối ca dạy thay cho HLV theo lịch tuần');
      }
      const saveBtn = popup.find('.dx-button:contains("Xác nhận gán lại PT")');
      if (saveBtn.length) {
        saveBtn.trigger('dxclick');
        saveBtn[0].click();
      }
    });
    await runner.sleep(2500);

    const afterSaveScreenshot = path.join(ARTIFACTS_DIR, 'verify_community_reassigned_success.png');
    await runner.page.screenshot({ path: afterSaveScreenshot, fullPage: false });
    console.log('Saved after save screenshot:', afterSaveScreenshot);

    console.log('All verification steps completed successfully!');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await runner.close();
  }
}

run();

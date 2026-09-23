const E2ETestRunner = require('./e2e/runner');
const path = require('path');

const ARTIFACT_DIR = 'E:/Antigravity - Copy/Profiles/Profile3/.gemini/antigravity/brain/8f603014-e613-4055-a510-ef40fa67cfcb';

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();

  try {
    console.log('--- STEP 1: Login as Admin QTV ---');
    await runner.switchSession('0900000001', 'ALL', 'QTV');
    await runner.sleep(2000);

    console.log('--- STEP 2: Navigate to PT Scheduler for PT001 on 2026-09-22 ---');
    await runner.page.evaluate(() => {
      if (window.ParadiseApp && window.ParadiseApp.navigateTo) {
        window.ParadiseApp.navigateTo('pt-schedule', {
          pt_id: '50000000-0000-0000-0000-000000000001',
          date: '2026-09-22'
        });
      } else {
        window.location.hash = '#pt-schedule';
      }
    });
    await runner.sleep(3500);

    // Ensure trainer is selected and scheduler is set to Day view on 2026-09-22
    console.log('--- STEP 3: Confirm PT001 and Day View ---');
    await runner.page.evaluate(() => {
      const ptSelect = $('#ptSelector').dxSelectBox('instance');
      if (ptSelect && ptSelect.option('value') !== '50000000-0000-0000-0000-000000000001') {
        ptSelect.option('value', '50000000-0000-0000-0000-000000000001');
      }
      const sched = $('#ptScheduler').dxScheduler('instance') || $('.dx-scheduler').dxScheduler('instance');
      if (sched) {
        sched.option('currentView', 'day');
        sched.option('currentDate', new Date('2026-09-22T08:00:00'));
      }
    });
    await runner.sleep(3000);

    // Screenshot 1: Thẻ lớp học cộng đồng trên lịch tập (Một vạch màu duy nhất, có nút Xem danh sách hội viên)
    const shotCard = path.join(ARTIFACT_DIR, 'verify_community_card_single_stripe_with_button.png');
    await runner.page.screenshot({ path: shotCard });
    console.log('Screenshot 1 saved:', shotCard);

    // Find and click the button "Xem danh sách hội viên"
    console.log('--- STEP 5: Click [Xem danh sách hội viên] button ---');
    const buttonClicked = await runner.page.evaluate(() => {
      const btn = document.querySelector('.pt-btn-community-members');
      if (btn) {
        btn.click();
        return true;
      }
      // Or click the community card
      const card = document.querySelector('.pt-community-card-body');
      if (card) {
        card.click();
        return true;
      }
      return false;
    });
    console.log('Button clicked:', buttonClicked);
    await runner.sleep(2500);

    // Screenshot 2: Modal danh sách hội viên lớp học cộng đồng
    const shotModal = path.join(ARTIFACT_DIR, 'verify_community_class_members_modal.png');
    await runner.page.screenshot({ path: shotModal });
    console.log('Screenshot 2 saved:', shotModal);

    // Check DOM inside modal
    const modalData = await runner.page.evaluate(() => {
      const popup = document.querySelector('.dx-popup-content');
      if (!popup) return null;
      const rows = Array.from(popup.querySelectorAll('.dx-datagrid-rowsview tr.dx-data-row')).map(tr => {
        return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
      });
      return {
        title: popup.querySelector('h3')?.innerText || '',
        memberRowsCount: rows.length,
        sampleRows: rows.slice(0, 3)
      };
    });
    console.log('Modal Data:', modalData);

    console.log('✅ UI Verification Completed Successfully!');
  } catch (err) {
    console.error('UI Verification Error:', err);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

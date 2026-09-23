const E2ETestRunner = require('../e2e/runner');
const path = require('path');
const fs = require('fs');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    console.log('Logging in as QTV (0900000001)...');
    await runner.openDesktopSession('0900000001');
    
    // Navigate to pt-schedule
    await runner.page.evaluate(() => {
      if (window.ParadiseApp) window.ParadiseApp.navigateTo('pt-schedule');
    });
    await runner.sleep(2000);

    // Select trainer if needed
    await runner.page.evaluate(() => {
      const selectBox = window.$ && window.$('#ptSelector').dxSelectBox('instance');
      if (selectBox) {
        const ds = selectBox.option('dataSource');
        if (ds && ds.length > 0) {
          selectBox.option('value', ds[0].id);
        }
      }
    });
    await runner.page.waitForSelector('#ptScheduler', { timeout: 10000 });
    await runner.sleep(2000);

    // Switch to Day view
    await runner.page.evaluate(() => {
      const dayTab = Array.from(document.querySelectorAll('.dx-button-text, .dx-scheduler-view-switcher-label'))
        .find(el => el.innerText.trim() === 'Ngày');
      if (dayTab) dayTab.click();
    });
    await runner.sleep(1500);

    // Set date to 2026-09-21
    await runner.page.evaluate(() => {
      const scheduler = window.$ && window.$('#ptScheduler').dxScheduler('instance');
      if (scheduler) {
        scheduler.option('currentDate', new Date('2026-09-21T00:00:00'));
      }
    });
    await runner.sleep(2000);

    // Inspect buttons on the 06:00 - 08:00 card
    const cardInfo = await runner.page.evaluate(() => {
      const appointments = Array.from(document.querySelectorAll('.dx-scheduler-appointment'));
      return appointments.map(app => {
        const timeText = app.querySelector('.pt-card-time')?.innerText?.trim();
        const memberText = app.querySelector('.pt-card-member-name')?.innerText?.trim();
        const completeBtn = app.querySelector('.pt-btn-card-complete');
        const cancelBtn = app.querySelector('.pt-btn-card-cancel');
        return {
          time: timeText,
          member: memberText,
          hasCompleteBtn: !!completeBtn,
          completeBtnClass: completeBtn?.className,
          completeBtnText: completeBtn?.innerText?.trim(),
          hasCancelBtn: !!cancelBtn,
          cancelBtnClass: cancelBtn?.className,
          cancelBtnText: cancelBtn?.innerText?.trim()
        };
      });
    });
    console.log('Day View Card Info:', JSON.stringify(cardInfo, null, 2));

    const outDir = path.resolve(__dirname, 'output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    
    const dayScreenshotPath = path.resolve(outDir, 'verify-day-view-cancel-btn.png');
    await runner.page.screenshot({ path: dayScreenshotPath });
    console.log('Saved screenshot:', dayScreenshotPath);

    // Now test clicking the cancel button to open confirmation modal
    const cancelClicked = await runner.page.evaluate(() => {
      const appointments = Array.from(document.querySelectorAll('.dx-scheduler-appointment'));
      const targetApp = appointments.find(app => app.querySelector('.pt-card-time')?.innerText?.includes('06:00'));
      if (targetApp) {
        const cancelBtn = targetApp.querySelector('.pt-btn-card-cancel');
        if (cancelBtn) {
          cancelBtn.click();
          return true;
        }
      }
      return false;
    });
    console.log('Clicked cancel on 06:00 session:', cancelClicked);
    await runner.sleep(1500);

    const modalVisible = await runner.page.evaluate(() => {
      const popup = document.querySelector('.dx-popup-wrapper:not([style*="display: none"])');
      return {
        exists: !!popup,
        title: popup?.querySelector('.dx-popup-title')?.innerText?.trim(),
        text: popup?.innerText?.slice(0, 300)
      };
    });
    console.log('Cancel Modal Info:', JSON.stringify(modalVisible, null, 2));

    const modalScreenshotPath = path.resolve(outDir, 'verify-cancel-modal.png');
    await runner.page.screenshot({ path: modalScreenshotPath });
    console.log('Saved screenshot:', modalScreenshotPath);

    // Close modal
    await runner.page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('.dx-button-text')).find(el => el.innerText.trim() === 'Hủy');
      if (cancelBtn) cancelBtn.click();
    });
    await runner.sleep(1000);

    // Test Table View
    await runner.page.evaluate(() => {
      const tableTab = Array.from(document.querySelectorAll('.dx-button-text, .dx-scheduler-view-switcher-label'))
        .find(el => el.innerText.trim() === 'Bảng' || el.innerText.trim() === 'Danh sách');
      if (tableTab) tableTab.click();
    });
    await runner.sleep(2000);

    const tableInfo = await runner.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#ptSlotList .dx-data-row'));
      return rows.map(r => ({
        time: r.cells[0]?.innerText?.trim(),
        member: r.cells[2]?.innerText?.trim(),
        status: r.cells[4]?.innerText?.trim(),
        buttons: Array.from(r.querySelectorAll('.dx-button-text')).map(b => b.innerText.trim())
      }));
    });
    console.log('Table View Info:', JSON.stringify(tableInfo, null, 2));

    const tableScreenshotPath = path.resolve(outDir, 'verify-table-view-cancel-btn.png');
    await runner.page.screenshot({ path: tableScreenshotPath });
    console.log('Saved screenshot:', tableScreenshotPath);

  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

const E2ETestRunner = require('../e2e/runner');
const path = require('path');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    console.log('Testing cancellation flow in Table View...');
    await runner.openDesktopSession('0900000001');
    await runner.page.evaluate(() => window.ParadiseApp.navigateTo('pt-schedule'));
    await runner.sleep(2000);
    await runner.page.evaluate(() => {
      const sb = window.$('#ptSelector').dxSelectBox('instance');
      sb.option('value', sb.option('dataSource')[0].id);
    });
    await runner.sleep(2000);

    // Switch to Table View
    await runner.page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.dx-button-text')).find(el => el.innerText.trim() === 'Danh sách');
      if (btn) btn.click();
    });
    await runner.sleep(2000);

    // Click cancel button on the 06:00 session
    const clicked = await runner.page.evaluate(() => {
      const row = Array.from(document.querySelectorAll('#ptSlotList .dx-data-row'))
        .find(r => r.cells[0]?.innerText?.includes('06:00'));
      if (row) {
        const cancelBtn = Array.from(row.querySelectorAll('.dx-button-text')).find(b => b.innerText.trim() === 'Hủy lịch');
        if (cancelBtn) {
          cancelBtn.click();
          return true;
        }
      }
      return false;
    });
    console.log('Clicked Hủy lịch in Table View:', clicked);
    await runner.sleep(1500);

    // Click confirm in the cancel popup
    const confirmed = await runner.page.evaluate(() => {
      const confirmBtn = Array.from(document.querySelectorAll('.dx-popup-wrapper .dx-button-text'))
        .find(b => b.innerText.trim() === 'Xác nhận hủy');
      if (confirmBtn) {
        confirmBtn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Xác nhận hủy:', confirmed);
    await runner.sleep(3000);

    const screenshotPath = path.resolve(__dirname, 'output/verify-cancelled-result.png');
    await runner.page.screenshot({ path: screenshotPath });
    console.log('Saved screenshot after cancellation:', screenshotPath);

    const cancelledCount = await runner.page.evaluate(() => {
      return document.querySelectorAll('#ptSlotList .dx-data-row').length;
    });
    console.log('Remaining active slots in Table View:', cancelledCount);

  } finally {
    await runner.browser.close();
  }
})();

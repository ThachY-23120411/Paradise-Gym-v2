const E2ETestRunner = require('../e2e/runner');
const path = require('path');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    await runner.openDesktopSession('0900000001');
    await runner.page.evaluate(() => window.ParadiseApp.navigateTo('pt-schedule'));
    await runner.sleep(2000);

    // Select trainer PT001
    await runner.page.evaluate(() => {
      const sb = window.$('#ptSelector').dxSelectBox('instance');
      sb.option('value', sb.option('dataSource')[0].id);
    });
    await runner.sleep(2000);

    // Set date to 2026-09-18
    await runner.page.evaluate(() => {
      const scheduler = window.$('#ptScheduler').dxScheduler('instance');
      if (scheduler) {
        scheduler.option('currentDate', new Date('2026-09-18T00:00:00'));
      }
    });
    await runner.sleep(2000);

    const appointments18 = await runner.page.evaluate(() => {
      return Array.from(document.querySelectorAll('.dx-scheduler-appointment')).map(a => a.innerText.replace(/\n/g, ' '));
    });
    console.log('Appointments on 2026-09-18:', appointments18);

    const screenshotPath = path.resolve(__dirname, 'output/verify-sep-18-cleaned.png');
    await runner.page.screenshot({ path: screenshotPath });
    console.log('Saved screenshot:', screenshotPath);

    // Set date back to 2026-09-21
    await runner.page.evaluate(() => {
      const scheduler = window.$('#ptScheduler').dxScheduler('instance');
      if (scheduler) {
        scheduler.option('currentDate', new Date('2026-09-21T00:00:00'));
      }
    });
    await runner.sleep(2000);

    const appointments21 = await runner.page.evaluate(() => {
      return Array.from(document.querySelectorAll('.dx-scheduler-appointment')).map(a => a.innerText.replace(/\n/g, ' '));
    });
    console.log('Appointments on 2026-09-21:', appointments21);

  } finally {
    await runner.browser.close();
  }
})();

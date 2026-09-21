const E2ETestRunner = require('../e2e/runner');
const path = require('path');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    console.log('Opening Desktop QTV session at #pt-schedule...');
    await runner.openDesktopSession('0900000001');
    await runner.page.evaluate(() => {
      if (window.ParadiseApp) window.ParadiseApp.navigateTo('pt-schedule');
    });
    await runner.page.waitForSelector('#ptScheduler', { timeout: 10000 });
    await runner.sleep(2500);

    // Switch to Day view
    await runner.page.evaluate(() => {
      const dayTab = Array.from(document.querySelectorAll('.dx-scheduler-view-switcher-label, .dx-button-text')).find(el => el.innerText.trim() === 'Ngày');
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

    const outPath = path.resolve(__dirname, 'output/07-web-pt-scheduler-day.png');
    await runner.page.screenshot({ path: outPath, fullPage: false });
    console.log('Saved screenshot:', outPath);

    // Get appointment DOM metrics in dxScheduler
    const schedulerMetrics = await runner.page.evaluate(() => {
      const appointments = Array.from(document.querySelectorAll('.dx-scheduler-appointment')).map(el => ({
        style: el.getAttribute('style'),
        offsetTop: el.offsetTop,
        offsetHeight: el.offsetHeight,
        top: el.getBoundingClientRect().top,
        height: el.getBoundingClientRect().height,
        text: el.innerText.slice(0, 100)
      }));
      const cells = Array.from(document.querySelectorAll('.dx-scheduler-time-panel-cell')).slice(0, 8).map(el => ({
        text: el.innerText.trim(),
        offsetTop: el.offsetTop,
        offsetHeight: el.offsetHeight,
        height: el.getBoundingClientRect().height
      }));
      return { appointments, cells };
    });
    console.log('SCHEDULER METRICS:', JSON.stringify(schedulerMetrics, null, 2));

  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

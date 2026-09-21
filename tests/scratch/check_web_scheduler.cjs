const E2ETestRunner = require('../e2e/runner');
const path = require('path');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    await runner.openDesktopSession('0900000001');
    // Navigate to pt-schedule
    await runner.page.evaluate(() => {
      const btn = document.querySelector('button[data-route="pt-schedule"]');
      if (btn) btn.click();
    });
    await runner.sleep(2000);

    // Select trainer
    await runner.page.evaluate(() => {
      const selectBox = window.$ && window.$('#ptSelector').dxSelectBox('instance');
      if (selectBox) {
        const ds = selectBox.option('dataSource');
        console.log('Trainers DS:', ds);
        if (ds && ds.length > 0) {
          selectBox.option('value', ds[0].id);
        }
      }
    });
    await runner.sleep(2500);

    const mainHtml = await runner.page.evaluate(() => document.querySelector('#mainViewport')?.innerHTML.slice(0, 1000));
    console.log('#mainViewport:', mainHtml);
    const hasScheduler = await runner.page.evaluate(() => $('#ptScheduler').length);
    console.log('Has #ptScheduler:', hasScheduler);

    if (hasScheduler) {
      // Switch to Day view
      await runner.page.evaluate(() => {
        const dayTab = Array.from(document.querySelectorAll('.dx-scheduler-navigator-caption, .dx-button-text')).find(el => el.innerText.trim() === 'Ngày');
        if (dayTab) dayTab.click();
      });
      await runner.sleep(1500);

      // Set date to 2026-09-21
      await runner.page.evaluate(() => {
        const scheduler = $('#ptScheduler').dxScheduler('instance');
        if (scheduler) scheduler.option('currentDate', new Date('2026-09-21T00:00:00'));
      });
      await runner.sleep(2000);

      const outPath = path.resolve(__dirname, 'output/web-scheduler-day-view.png');
      await runner.page.screenshot({ path: outPath, fullPage: false });
      console.log('Saved:', outPath);

      const metrics = await runner.page.evaluate(() => {
        const appointments = Array.from(document.querySelectorAll('.dx-scheduler-appointment')).map(a => ({
          text: a.innerText.slice(0, 80),
          style: a.getAttribute('style'),
          offsetTop: a.offsetTop,
          offsetHeight: a.offsetHeight,
          top: a.getBoundingClientRect().top,
          height: a.getBoundingClientRect().height
        }));
        const timeCells = Array.from(document.querySelectorAll('.dx-scheduler-time-panel-cell')).slice(0, 10).map(c => ({
          text: c.innerText.trim(),
          offsetTop: c.offsetTop,
          offsetHeight: c.offsetHeight,
          height: c.getBoundingClientRect().height
        }));
        return { appointments, timeCells };
      });
      console.log('WEB METRICS:', JSON.stringify(metrics, null, 2));
    }
  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

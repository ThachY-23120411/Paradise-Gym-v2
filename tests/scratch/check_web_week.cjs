const E2ETestRunner = require('../e2e/runner');
const path = require('path');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    await runner.openDesktopSession('0900000001');
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
        if (ds && ds.length > 0) selectBox.option('value', ds[0].id);
      }
    });
    await runner.sleep(2500);

    // Switch to Week view (Toàn tuần)
    await runner.page.evaluate(() => {
      const weekTab = Array.from(document.querySelectorAll('.dx-button-text')).find(el => el.innerText.trim() === 'Toàn tuần');
      if (weekTab) weekTab.click();
    });
    await runner.sleep(1500);

    // Set date to 2026-09-21
    await runner.page.evaluate(() => {
      const scheduler = window.$ && window.$('#ptScheduler').dxScheduler('instance');
      if (scheduler) scheduler.option('currentDate', new Date('2026-09-21T00:00:00'));
    });
    await runner.sleep(2000);

    const outPath = path.resolve(__dirname, 'output/web-scheduler-week-view.png');
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
      return { appointments };
    });
    console.log('WEEK METRICS:', JSON.stringify(metrics, null, 2));

  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

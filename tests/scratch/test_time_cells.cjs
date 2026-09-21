const E2ETestRunner = require('../e2e/runner');
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
    await runner.page.evaluate(() => {
      const selectBox = window.$ && window.$('#ptSelector').dxSelectBox('instance');
      if (selectBox) {
        const ds = selectBox.option('dataSource');
        if (ds && ds.length > 0) selectBox.option('value', ds[0].id);
      }
    });
    await runner.sleep(2500);

    const cellsCount = await runner.page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('.dx-scheduler-time-panel-cell'));
      return cells.map(c => c.innerText.trim());
    });
    console.log('TIME CELLS:', cellsCount);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

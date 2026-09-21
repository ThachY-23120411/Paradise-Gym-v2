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

    const cellHtml = await runner.page.evaluate(() => {
      const cell = document.querySelector('.dx-scheduler-time-panel-cell');
      const timePanel = document.querySelector('.dx-scheduler-time-panel');
      return {
        cellOuterHtml: cell ? cell.outerHTML : null,
        cellComputedStyle: cell ? {
          height: getComputedStyle(cell).height,
          paddingTop: getComputedStyle(cell).paddingTop,
          paddingBottom: getComputedStyle(cell).paddingBottom,
          verticalAlign: getComputedStyle(cell).verticalAlign,
          lineHeight: getComputedStyle(cell).lineHeight,
          display: getComputedStyle(cell).display
        } : null
      };
    });
    console.log('CELL INFO:', cellHtml);

  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

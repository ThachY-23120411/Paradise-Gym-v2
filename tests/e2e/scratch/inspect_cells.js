const E2ETestRunner = require('../runner');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  await runner.switchSession('0900000001', 'ALL', 'QTV');
  await runner.navigateTo('pt-schedule');
  await runner.sleep(2500);
  const page = runner.page;
  await page.waitForSelector('#ptSelector');
  await page.evaluate(() => {
    const sel = $('#ptSelector').dxSelectBox('instance');
    const ds = sel.option('dataSource') || [];
    if (ds.length > 0) sel.option('value', ds[0].id);
  });
  await runner.sleep(2500);
  const debugInfo = await page.evaluate(() => {
    const cells = $('.dx-scheduler-time-panel-cell');
    const labels = $('.pt-time-panel-label');
    const dateCells = $('.dx-scheduler-date-table-cell');
    const res = [];
    for (let i = 0; i < 8; i++) {
      const c = cells.eq(i);
      const l = labels.eq(i);
      res.push({
        index: i,
        text: l.text().trim(),
        cellHeight: c.outerHeight(),
        cellOffsetTop: c[0] ? c[0].offsetTop : null,
        labelOffsetTop: l[0] ? l[0].offsetTop : null,
        labelBoundingTop: l[0] ? l[0].getBoundingClientRect().top : null
      });
    }
    return {
      timeCellsCount: cells.length,
      dateCellsCount: dateCells.length,
      dateCellHeight: dateCells.eq(0).outerHeight(),
      timeCellHeight: cells.eq(0).outerHeight(),
      first8: res
    };
  });
  console.log(JSON.stringify(debugInfo, null, 2));
  await runner.close();
})();

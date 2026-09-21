const E2ETestRunner = require('../e2e/runner');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    await runner.openMobileMemberSession('0987654321', 'schedule/book');
    await runner.sleep(2000);
    await runner.page.evaluate(() => {
      const selectBox = window.$ && window.$('.field div.dx-selectbox').dxSelectBox('instance');
      if (selectBox) {
        const ds = selectBox.option('dataSource');
        if (ds && ds.length > 0) selectBox.option('value', ds[0].id);
      }
    });
    await runner.sleep(1500);
    await runner.page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('.dx-calendar-cell'));
      const cell21 = cells.find(c => c.innerText.trim() === '21');
      if (cell21) cell21.click();
    });
    await runner.sleep(2000);
    const metrics = await runner.page.evaluate(() => {
      const timeCells = Array.from(document.querySelectorAll('.timeline-time-cell')).slice(0, 6).map((c, i) => ({
        index: i,
        text: c.innerText.trim(),
        offsetTop: c.offsetTop,
        height: c.getBoundingClientRect().height
      }));
      const gridCells = Array.from(document.querySelectorAll('.timeline-grid-cell')).slice(0, 6).map((c, i) => ({
        index: i,
        minute: c.dataset.minute,
        offsetTop: c.offsetTop,
        height: c.getBoundingClientRect().height
      }));
      const ownCards = Array.from(document.querySelectorAll('.timeline-own-card')).map(c => ({
        styleTop: c.style.top,
        styleHeight: c.style.height,
        offsetTop: c.offsetTop,
        boundingH: c.getBoundingClientRect().height,
        text: c.innerText.slice(0, 80)
      }));
      return { timeCells, gridCells, ownCards };
    });
    console.log('METRICS:', JSON.stringify(metrics, null, 2));
  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

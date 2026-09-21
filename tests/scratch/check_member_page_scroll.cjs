const E2ETestRunner = require('../e2e/runner');
const path = require('path');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    await runner.openMobileMemberSession('0987654321', 'schedule/book');
    await runner.page.waitForSelector('.field', { timeout: 10000 });
    await runner.sleep(1500);

    // Select package
    await runner.page.evaluate(() => {
      const selectBox = window.$ && window.$('.field div.dx-selectbox').dxSelectBox('instance');
      if (selectBox) {
        const ds = selectBox.option('dataSource');
        if (ds && ds.length > 0) selectBox.option('value', ds[0].id);
      }
    });
    await runner.sleep(1500);

    // Click date 21
    await runner.page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('.dx-calendar-cell'));
      const cell21 = cells.find(c => c.innerText.trim() === '21');
      if (cell21) cell21.click();
    });
    await runner.sleep(2000);

    // Scroll window down by 300px so timeline has full screen height
    await runner.page.evaluate(() => {
      window.scrollTo(0, 320);
      const scrollEl = document.querySelector('.timeline-scroll');
      if (scrollEl) scrollEl.scrollTop = 0;
    });
    await runner.sleep(1000);

    const outPath = path.resolve(__dirname, 'output/member-timeline-page-scrolled.png');
    await runner.page.screenshot({ path: outPath });
    console.log('Saved:', outPath);

  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

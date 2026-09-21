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

    // Check card metrics
    const metrics = await runner.page.evaluate(() => {
      const card = document.querySelector('.timeline-own-card');
      const timeCells = Array.from(document.querySelectorAll('.timeline-time-cell')).slice(0, 6).map(c => ({
        text: c.innerText.trim(),
        offsetTop: c.offsetTop,
        offsetHeight: c.offsetHeight
      }));
      return {
        card: card ? {
          offsetTop: card.offsetTop,
          offsetHeight: card.offsetHeight,
          top: card.style.top,
          height: card.style.height,
          text: card.innerText.slice(0, 100)
        } : null,
        timeCells
      };
    });
    console.log('MEMBER TIMELINE METRICS:', JSON.stringify(metrics, null, 2));

    // Scroll so card (0 to 192px) is completely visible in middle
    await runner.page.evaluate(() => {
      const scrollEl = document.querySelector('.timeline-scroll');
      if (scrollEl) scrollEl.scrollTop = 0;
    });
    await runner.sleep(500);
    await runner.page.screenshot({ path: path.resolve(__dirname, 'output/member-card-full-view.png') });

  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

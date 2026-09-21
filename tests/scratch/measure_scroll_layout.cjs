const E2ETestRunner = require('../e2e/runner');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    await runner.openMobileMemberSession('0987654321', 'schedule/book');
    await runner.page.waitForSelector('.field', { timeout: 10000 });
    await runner.sleep(1500);

    await runner.page.evaluate(() => {
      const selectBox = window.$ && window.$('.field div.dx-selectbox').dxSelectBox('instance');
      if (selectBox) {
        const ds = selectBox.option('dataSource');
        if (ds && ds.length > 0) selectBox.option('value', ds[0].id);
      }
    });
    await runner.sleep(1500);

    const info = await runner.page.evaluate(() => {
      const scroll = document.querySelector('.timeline-scroll');
      const body = document.querySelector('.timeline-body');
      const card = document.querySelector('.timeline-own-card');
      const rect = scroll ? scroll.getBoundingClientRect() : null;
      return {
        windowH: window.innerHeight,
        scrollRect: rect,
        scrollHeight: scroll?.scrollHeight,
        clientHeight: scroll?.clientHeight,
        cardRect: card ? card.getBoundingClientRect() : null
      };
    });
    console.log('LAYOUT INFO:', info);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

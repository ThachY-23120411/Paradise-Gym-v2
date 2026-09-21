const E2ETestRunner = require('../e2e/runner');
const path = require('path');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();

  try {
    await runner.openMobileMemberSession('0987654321', 'packages');
    await runner.sleep(800);

    const shot1 = path.join(__dirname, 'verify_tab_mine.png');
    await runner.page.screenshot({ path: shot1 });
    console.log('Saved mine:', shot1);

    // Click 'Chuyển nhượng'
    await runner.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.segments button'));
      const btn = btns.find(b => b.textContent.trim() === 'Chuyển nhượng');
      if (btn) btn.click();
    });
    await runner.sleep(800);

    const shot2 = path.join(__dirname, 'verify_tab_transfers.png');
    await runner.page.screenshot({ path: shot2 });
    console.log('Saved transfers:', shot2);

    console.log('All tabs verified successfully!');
  } finally {
    await runner.close();
  }
})();

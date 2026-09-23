const E2ETestRunner = require('../e2e/runner');
const path = require('path');
const fs = require('fs');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  runner.page.on('console', msg => console.log('[Browser Console]', msg.type(), msg.text()));
  runner.page.on('pageerror', err => console.log('[Browser Error]', err.message));
  try {
    console.log('Opening Desktop QTV session...');
    await runner.openDesktopSession('0900000001');
    console.log('Opened session, current URL:', runner.page.url());

    await runner.page.evaluate(() => {
      console.log('window.ParadiseApp exists:', !!window.ParadiseApp);
      if (window.ParadiseApp) window.ParadiseApp.navigateTo('pt-schedule');
    });

    await runner.sleep(3000);
    console.log('After navigate, URL:', runner.page.url());

    const hasScheduler = await runner.page.evaluate(() => {
      return !!document.querySelector('#ptScheduler');
    });
    console.log('hasScheduler:', hasScheduler);

    const outDir = path.resolve(__dirname, 'output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.resolve(outDir, 'debug_scheduler.png');
    await runner.page.screenshot({ path: outPath, fullPage: true });
    console.log('Saved debug screenshot:', outPath);

  } catch (err) {
    console.error('Script error:', err);
    if (runner.page) {
      await runner.page.screenshot({ path: path.resolve(__dirname, 'output/error_screenshot.png'), fullPage: true });
    }
  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

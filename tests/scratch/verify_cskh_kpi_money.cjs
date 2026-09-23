const E2ETestRunner = require('../e2e/runner');
const path = require('path');
const fs = require('fs');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    console.log('Opening Desktop QTV session at #customer-care...');
    await runner.openDesktopSession('0900000001');

    await runner.page.evaluate(() => {
      if (window.ParadiseApp) window.ParadiseApp.navigateTo('customer-care');
    });

    await runner.page.waitForSelector('.customer-care-content', { timeout: 10000 });
    await runner.sleep(2000);

    // Get metrics cards data
    const cardsData = await runner.page.evaluate(() => {
      return Array.from(document.querySelectorAll('.metric-card')).map(card => ({
        label: card.querySelector('.metric-label span')?.innerText.trim(),
        value: card.querySelector('.metric-value')?.innerText.trim(),
        amount: card.querySelector('.metric-amount-row')?.innerText.trim(),
        caption: card.querySelector('.metric-caption')?.innerText.trim()
      }));
    });
    console.log('Customer care KPI cards:', JSON.stringify(cardsData, null, 2));

    const outDir = path.resolve(__dirname, 'output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const cskhScreenshot = path.resolve(outDir, 'verify_cskh_kpi_money.png');
    await runner.page.screenshot({ path: cskhScreenshot, fullPage: false });
    console.log('Saved CSKH screenshot:', cskhScreenshot);

    // Switch to "Đăng ký mới hôm nay" tab to check the grid
    await runner.page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('.dx-tab-text')).find(el => el.innerText.includes('Đăng ký mới'));
      if (tab) tab.click();
    });
    await runner.sleep(1500);

    const todayRegScreenshot = path.resolve(outDir, 'verify_cskh_today_reg_grid.png');
    await runner.page.screenshot({ path: todayRegScreenshot, fullPage: false });
    console.log('Saved today reg grid screenshot:', todayRegScreenshot);

    // Navigate to Dashboard to verify care cards on dashboard
    await runner.page.evaluate(() => {
      if (window.ParadiseApp) window.ParadiseApp.navigateTo('dashboard');
    });
    await runner.sleep(2500);

    const dashCardsData = await runner.page.evaluate(() => {
      const section = Array.from(document.querySelectorAll('.data-section')).find(s => s.innerText.includes('Hôm nay cần xử lý'));
      if (!section) return [];
      return Array.from(section.querySelectorAll('.metric-card')).map(card => ({
        label: card.querySelector('.metric-label span')?.innerText.trim(),
        value: card.querySelector('.metric-value')?.innerText.trim(),
        amount: card.querySelector('.metric-amount-row')?.innerText.trim(),
        caption: card.querySelector('.metric-caption')?.innerText.trim()
      }));
    });
    console.log('Dashboard care cards:', JSON.stringify(dashCardsData, null, 2));

    const dashScreenshot = path.resolve(outDir, 'verify_dashboard_care_cards_money.png');
    await runner.page.screenshot({ path: dashScreenshot, fullPage: false });
    console.log('Saved Dashboard screenshot:', dashScreenshot);

  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

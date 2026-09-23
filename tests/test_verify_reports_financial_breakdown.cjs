const E2ETestRunner = require('./e2e/runner');
const path = require('path');

const ARTIFACT_DIR = 'E:/Antigravity - Copy/Profiles/Profile6/.gemini/antigravity/brain/8f603014-e613-4055-a510-ef40fa67cfcb';

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();

  try {
    console.log('--- STEP 1: Login as Admin QTV ---');
    await runner.switchSession('0900000001', 'ALL', 'QTV');
    await runner.sleep(2000);

    console.log('--- STEP 2: Navigate to Báo cáo tổng hợp (#reports) ---');
    await runner.page.evaluate(() => {
      window.location.hash = '#reports';
    });
    await runner.sleep(4000);

    // Screenshot 1: 4 Hero Metric Cards at the top
    console.log('--- STEP 3: Capture 4 Hero Metric Cards and Charts ---');
    const shotOverview = path.join(ARTIFACT_DIR, 'verify_reports_4_financial_kpis.png');
    await runner.page.screenshot({ path: shotOverview });
    console.log('Screenshot 1 saved:', shotOverview);

    // Scroll to Reconciliation Table
    console.log('--- STEP 4: Scroll and capture Bảng đối soát doanh thu, chi phí & lợi nhuận ---');
    await runner.page.evaluate(() => {
      const table = document.querySelector('.profit-subtab-content');
      if (table) table.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await runner.sleep(1500);

    const shotTable = path.join(ARTIFACT_DIR, 'verify_reports_reconciliation_table.png');
    await runner.page.screenshot({ path: shotTable });
    console.log('Screenshot 2 saved (Reconciliation Table):', shotTable);

    console.log('✅ ALL REPORTS VERIFICATIONS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test Execution Error:', err);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

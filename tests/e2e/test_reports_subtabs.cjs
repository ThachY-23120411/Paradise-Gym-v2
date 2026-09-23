const path = require('path');
const fs = require('fs');
const E2ETestRunner = require('./runner');

const ARTIFACT_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile7\\.gemini\\antigravity\\brain\\b7a3ccd6-c991-4f48-b816-dabe12bb72d2';

(async () => {
  console.log('🚀 [Test] Starting Reports Sub-tabs E2E verification...');
  const runner = new E2ETestRunner();
  await runner.init();

  try {
    const QTV_PHONE = '0900000001';
    await runner.switchSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('reports');
    await runner.sleep(3000);

    const page = runner.page;
    console.log('[Test] Current URL:', page.url());

    // 1. Ensure on "profit" tab (Lợi nhuận & Chi phí)
    // Check if #profitTab or tab button exists
    await page.evaluate(() => {
      // Find dxTabs instance on #reportsTabs
      const tabs = $('#reportsTabs').dxTabs('instance');
      if (tabs) {
        tabs.option('selectedItem', tabs.option('dataSource').find(t => t.id === 'profit') || tabs.option('dataSource')[0]);
      }
    });
    await runner.sleep(2000);

    // Verify .profit-subtabs-bar is rendered
    const subtabsExist = await page.evaluate(() => {
      return $('.profit-subtabs-bar').length > 0;
    });
    console.log('[Test] .profit-subtabs-bar exists:', subtabsExist);

    if (!subtabsExist) {
      throw new Error('.profit-subtabs-bar not found in DOM!');
    }

    // Tab 1: Reconciliation table
    console.log('[Test] Selecting Tab 1: Reconciliation table...');
    const t1 = await page.evaluate(() => {
      const tabs = $('.profit-subtabs-bar > div').dxTabs('instance');
      tabs.option('selectedItem', tabs.option('dataSource')[0]);
      const el = document.querySelector('.profit-subtabs-bar');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      return $('.profit-subtab-content .section-heading h2').text();
    });
    console.log('[Test] Tab 1 Section Title:', t1);
    await runner.sleep(1500);

    const shot1 = path.join(ARTIFACT_DIR, 'verify-report-tab1-reconciliation.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log('📸 [Screenshot 1] Saved:', shot1);

    // Scroll to bottom of reconciliation table to show days 18-25 and summary footer
    await page.evaluate(() => {
      window.scrollBy(0, 600);
    });
    await runner.sleep(1000);
    const shot1b = path.join(ARTIFACT_DIR, 'verify-report-tab1-reconciliation-footer.png');
    await page.screenshot({ path: shot1b, fullPage: false });
    console.log('📸 [Screenshot 1b] Saved:', shot1b);

    // Scroll back up before tab 2
    await page.evaluate(() => {
      const el = document.querySelector('.profit-subtabs-bar');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await runner.sleep(1000);

    // Tab 2: PT Commissions
    console.log('[Test] Selecting Tab 2: PT Commissions...');
    const t2 = await page.evaluate(() => {
      const tabs = $('.profit-subtabs-bar > div').dxTabs('instance');
      tabs.option('selectedItem', tabs.option('dataSource')[1]);
      const el = document.querySelector('.profit-subtabs-bar');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      return $('.profit-subtab-content .section-heading h2').text();
    });
    console.log('[Test] Tab 2 Section Title:', t2);
    await runner.sleep(1500);

    const shot2 = path.join(ARTIFACT_DIR, 'verify-report-tab2-pt-commissions.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log('📸 [Screenshot 2] Saved:', shot2);

    // Tab 3: Community Classes
    console.log('[Test] Selecting Tab 3: Community Classes...');
    const t3 = await page.evaluate(() => {
      const tabs = $('.profit-subtabs-bar > div').dxTabs('instance');
      tabs.option('selectedItem', tabs.option('dataSource')[2]);
      const el = document.querySelector('.profit-subtabs-bar');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      return $('.profit-subtab-content .section-heading h2').text();
    });
    console.log('[Test] Tab 3 Section Title:', t3);
    await runner.sleep(1500);

    const shot3 = path.join(ARTIFACT_DIR, 'verify-report-tab3-community-classes.png');
    await page.screenshot({ path: shot3, fullPage: false });
    console.log('📸 [Screenshot 3] Saved:', shot3);

    console.log('🎉 [Test] Reports Sub-tabs verification completed successfully!');
  } catch (err) {
    console.error('❌ [Test Error]:', err);
    process.exit(1);
  } finally {
    if (runner.browser) {
      await runner.browser.close();
    }
  }
})();

const E2ETestRunner = require('../e2e/runner');
const path = require('path');

async function run() {
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  const BRANCH_Q1 = '11111111-1111-1111-1111-111111111111';
  const ARTIFACTS_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile4\\.gemini\\antigravity\\brain\\cf22d6e0-20cc-4a19-9c08-c386ee4a543d';

  try {
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('commissions');
    await runner.sleep(2500);

    // Click Tab Thù lao lớp cộng đồng
    await runner.page.evaluate(() => {
      const tabs = $('.commissions-tabs .dx-tab');
      tabs.filter((i, el) => $(el).text().includes('Thù lao lớp cộng đồng'))[0].click();
    });
    await runner.sleep(2500);

    // Tìm và chọn Toàn bộ chi nhánh
    const branchChangeResult = await runner.page.evaluate(() => {
      const selectBoxes = $('.filter-bar .dx-selectbox').toArray().map(el => {
        const inst = $(el).dxSelectBox('instance');
        return {
          label: inst.option('label'),
          value: inst.option('value'),
          inst
        };
      });

      const branchBox = selectBoxes.find(b => b.label === 'Chi nhánh' || (b.inst && b.inst.option('displayExpr') === 'branch_name'));
      if (branchBox) {
        branchBox.inst.option('value', 'ALL');
        return { success: true, prevVal: branchBox.value };
      }
      return { success: false, boxes: selectBoxes.map(b => b.label) };
    });
    console.log('Branch Change Result:', branchChangeResult);

    await runner.sleep(3000);

    const kpisAll = await runner.page.evaluate(() => {
      const cards = $('.commissions-community-kpis .metric-card').toArray();
      return cards.map(c => {
        const $c = $(c);
        return {
          label: $c.find('.metric-label span').text().trim(),
          value: $c.find('.metric-value').text().trim(),
          caption: $c.find('.metric-caption').text().trim()
        };
      });
    });
    console.log('KPIs after switching to ALL:', kpisAll);

    const screenshotAllPath = path.join(ARTIFACTS_DIR, 'verify_commissions_community_6_kpis_all_branches.png');
    await runner.page.screenshot({ path: screenshotAllPath, fullPage: false });
    console.log(`Đã chụp ảnh bằng chứng toàn hệ thống: ${screenshotAllPath}`);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
}

run();

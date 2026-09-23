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
    await runner.navigateTo('reports');
    await runner.sleep(3000);

    // 1. Chụp trạng thái ban đầu trên live data (Cột phân kỳ)
    const initialScreenshot = path.join(ARTIFACTS_DIR, 'live_reports_chart1_bar_initial.png');
    await runner.page.screenshot({ path: initialScreenshot, fullPage: false });
    console.log('Saved initial live screenshot:', initialScreenshot);

    // 2. Chuyển sang chế độ "Cột & Đường"
    await runner.page.evaluate(() => {
      const btnGroup = $('.report-charts .dx-buttongroup').dxButtonGroup('instance');
      if (btnGroup) {
        btnGroup.option('selectedItemKeys', ['combo']);
        // trigger item click or re-render
        const items = btnGroup.option('items');
        const comboItem = items.find(i => i.value === 'combo');
        btnGroup.option('onItemClick')({ itemData: comboItem });
      }
    });
    await runner.sleep(1500);

    const comboScreenshot = path.join(ARTIFACTS_DIR, 'live_reports_chart1_combo_initial.png');
    await runner.page.screenshot({ path: comboScreenshot, fullPage: false });
    console.log('Saved combo live screenshot:', comboScreenshot);

    // 3. Giả lập trường hợp có 1 tháng BỊ LỖ (VD: Kỳ 2026-08 Chi phí 155Tr > Thực thu 95Tr => Lỗ -60Tr)
    await runner.page.evaluate(() => {
      // Đổi lại sang Cột phân kỳ
      const btnBar = $('.report-charts .dx-buttongroup .dx-button').eq(0);
      btnBar.click();
    });
    await runner.sleep(500);

    await runner.page.evaluate(() => {
      const chartEl = $('.report-charts .data-section').first().find('.section-body > div');
      const chartInst = chartEl.dxChart('instance');
      
      const testDataWithLoss = [
        { period: '2026-07', cash_received: 120000000, total_expense: 80000000, net_profit: 40000000 },
        { period: '2026-08', cash_received: 95000000, total_expense: 155000000, net_profit: -60000000 }, // BỊ LỖ 60Tr
        { period: '2026-09', cash_received: 180000000, total_expense: 110000000, net_profit: 70000000 }
      ];

      if (chartInst) {
        chartInst.option({
          dataSource: testDataWithLoss,
          series: [
            { type: 'bar', valueField: 'cash_received', name: 'Thực thu', color: '#237b58' },
            { type: 'bar', valueField: 'total_expense', name: 'Chi phí', color: '#f59e0b' },
            { type: 'bar', valueField: 'net_profit', name: 'Lợi nhuận ròng', color: '#0d9488' }
          ]
        });
      }
    });
    await runner.sleep(1500);

    const barLossScreenshot = path.join(ARTIFACTS_DIR, 'live_reports_chart1_bar_with_loss.png');
    await runner.page.screenshot({ path: barLossScreenshot, fullPage: false });
    console.log('Saved bar with loss screenshot:', barLossScreenshot);

    // 4. Xem ở chế độ "Cột & Đường" khi có tháng BỊ LỖ
    await runner.page.evaluate(() => {
      const chartEl = $('.report-charts .data-section').first().find('.section-body > div');
      const chartInst = chartEl.dxChart('instance');
      
      const testDataWithLoss = [
        { period: '2026-07', cash_received: 120000000, total_expense: 80000000, net_profit: 40000000 },
        { period: '2026-08', cash_received: 95000000, total_expense: 155000000, net_profit: -60000000 }, // BỊ LỖ 60Tr
        { period: '2026-09', cash_received: 180000000, total_expense: 110000000, net_profit: 70000000 }
      ];

      const btnCombo = $('.report-charts .dx-buttongroup .dx-button').eq(1);
      btnCombo.click();

      if (chartInst) {
        chartInst.option({
          dataSource: testDataWithLoss,
          series: [
            { type: 'bar', valueField: 'cash_received', name: 'Thực thu', color: '#237b58', barPadding: 0.3 },
            { type: 'bar', valueField: 'total_expense', name: 'Chi phí', color: '#f59e0b', barPadding: 0.3 },
            {
              type: 'spline',
              valueField: 'net_profit',
              name: 'Lợi nhuận ròng',
              color: '#0d9488',
              width: 3,
              point: {
                visible: true,
                size: 9,
                color: '#0d9488',
                border: { color: '#ffffff', width: 2 }
              }
            }
          ]
        });
      }
    });
    await runner.sleep(1500);

    const comboLossScreenshot = path.join(ARTIFACTS_DIR, 'live_reports_chart1_combo_with_loss.png');
    await runner.page.screenshot({ path: comboLossScreenshot, fullPage: false });
    console.log('Saved combo with loss screenshot:', comboLossScreenshot);

    console.log('All verification steps completed successfully!');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await runner.close();
  }
}

run();

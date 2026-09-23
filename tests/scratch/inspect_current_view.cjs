const E2ETestRunner = require('../e2e/runner');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    await runner.openDesktopSession('0900000001');
    await runner.page.evaluate(() => window.ParadiseApp.navigateTo('pt-schedule'));
    await runner.sleep(2000);
    await runner.page.evaluate(() => {
      const sb = window.$('#ptSelector').dxSelectBox('instance');
      sb.option('value', sb.option('dataSource')[0].id);
    });
    await runner.sleep(2000);
    const val = await runner.page.evaluate(() => {
      const sch = window.$('#ptScheduler').dxScheduler('instance');
      return {
        currentView: sch.option('currentView'),
        views: sch.option('views'),
        stateCalendarView: window.$('#ptScheduler').data('dxScheduler')?.option('currentView')
      };
    });
    console.log('SCHEDULER VIEW:', val);
  } finally {
    await runner.browser.close();
  }
})();

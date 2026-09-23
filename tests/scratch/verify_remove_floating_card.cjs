const E2ETestRunner = require('../e2e/runner');
const path = require('path');
const fs = require('fs');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    console.log('Opening Desktop QTV session...');
    await runner.openDesktopSession('0900000001');
    await runner.page.evaluate(() => {
      if (window.ParadiseApp) window.ParadiseApp.navigateTo('pt-schedule');
    });
    await runner.sleep(2000);

    // Select trainer in #ptSelector
    console.log('Selecting trainer in #ptSelector...');
    await runner.page.evaluate(() => {
      const selectBox = window.$ && window.$('#ptSelector').dxSelectBox('instance');
      if (selectBox) {
        const ds = selectBox.option('dataSource');
        if (ds && ds.length > 0) {
          selectBox.option('value', ds[0].id);
        }
      }
    });

    await runner.page.waitForSelector('#ptScheduler', { timeout: 10000 });
    console.log('#ptScheduler found!');
    await runner.sleep(1500);

    // Switch to Day view
    await runner.page.evaluate(() => {
      const dayTab = Array.from(document.querySelectorAll('.dx-button-text, .dx-scheduler-view-switcher-label'))
        .find(el => el.innerText.trim() === 'Ngày');
      if (dayTab) dayTab.click();
    });
    await runner.sleep(1500);

    // Set date to 2026-09-21
    await runner.page.evaluate(() => {
      const scheduler = window.$ && window.$('#ptScheduler').dxScheduler('instance');
      if (scheduler) {
        scheduler.option('currentDate', new Date('2026-09-21T00:00:00'));
      }
    });
    await runner.sleep(1500);

    // Trigger a draft card (e.g. simulate what "Kéo chọn giờ trên Calendar" does)
    console.log('Simulating draft card on calendar...');
    await runner.page.evaluate(() => {
      const state = window.PtSchedulerModule?._debugState;
      if (state) {
        state.draft = {
          id: 'draft-test-123',
          is_draft: true,
          booking_date: '2026-09-21',
          start_time: '17:30',
          end_time: '19:30',
          duration_minutes: 120,
          package_duration: 120,
          member_name: 'Lê Hoàng Nam',
          package_name: 'PT 30 buổi',
          startDate: new Date('2026-09-21T17:30:00'),
          endDate: new Date('2026-09-21T19:30:00')
        };
        const ds = state.scheduler.option('dataSource');
        const list = Array.isArray(ds) ? ds.filter(b => !b.is_draft) : [];
        list.push(state.draft);
        state.scheduler.option('dataSource', list);
      }
    });
    await runner.sleep(1500);

    // Scroll scheduler table to bottom so 21:00 - 22:00 is in view
    await runner.page.evaluate(() => {
      const scrollable = document.querySelector('.dx-scheduler-date-table-scrollable .dx-scrollable-container');
      if (scrollable) {
        scrollable.scrollTop = scrollable.scrollHeight;
      }
      window.scrollTo(0, document.body.scrollHeight);
    });
    await runner.sleep(1000);

    // Check presence of .pt-floating-draft-bar
    const floatingBarCount = await runner.page.evaluate(() => {
      return document.querySelectorAll('.pt-floating-draft-bar').length;
    });
    console.log('Floating bar elements count:', floatingBarCount);

    const outDir = path.resolve(__dirname, 'output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.resolve(outDir, 'verify_floating_bar_removed.png');
    await runner.page.screenshot({ path: outPath, fullPage: false });
    console.log('Saved screenshot:', outPath);

  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

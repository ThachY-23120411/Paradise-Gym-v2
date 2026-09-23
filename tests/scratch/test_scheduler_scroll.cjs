const E2ETestRunner = require('../e2e/runner');
(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  await runner.openDesktopSession('0900000001', 'ALL', 'QTV');
  runner.page.on('console', msg => console.log('BROWSER:', msg.text()));
  await runner.navigateTo('community-classes');
  await runner.sleep(3000);

  // Apply wheel forwarder on #communityScheduler
  await runner.page.evaluate(() => {
    const el = document.getElementById('communityScheduler');
    const scrollableEl = el.querySelector('.dx-scheduler-date-table-scrollable');
    const scrollable = jQuery(scrollableEl).dxScrollable('instance');
    console.log('Scrollable found:', !!scrollable);
    if (scrollable) {
      scrollable.option('showScrollbar', 'always');
    }
    el.addEventListener('wheel', function (e) {
      console.log('Wheel event fired on scheduler!', e.deltaY, e.target.className);
      if (scrollable) {
        const cur = scrollable.scrollTop();
        console.log('Current scrollTop:', cur);
        scrollable.scrollTo({ top: cur + e.deltaY });
        console.log('New scrollTop:', scrollable.scrollTop());
      }
    }, { passive: false });
  });

  // Test wheel on time panel now
  const tpBox = await runner.page.evaluate(() => {
    const tp = document.querySelector('.dx-scheduler-time-panel');
    const r = tp.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await runner.page.mouse.move(tpBox.x, tpBox.y);
  await runner.page.mouse.wheel({ deltaY: 300 });
  await runner.sleep(500);

  const tpScroll = await runner.page.evaluate(() => {
    const el = document.getElementById('communityScheduler');
    const scrollableEl = el.querySelector('.dx-scheduler-date-table-scrollable');
    const s = jQuery(scrollableEl).dxScrollable('instance');
    return s.scrollTop();
  });
  console.log('ScrollTop after wheel on time panel with listener:', tpScroll);

  await runner.browser.close();
})();

const E2ETestRunner = require('../e2e/runner');
(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  await runner.openDesktopSession('0900000001', 'ALL', 'QTV');
  await runner.navigateTo('community-classes');
  await runner.sleep(3000);

  const res = await runner.page.evaluate(() => {
    const s = jQuery('#communityScheduler').dxScheduler('instance');
    s.option('crossScrollingEnabled', true);
    
    // Check scrollbars
    const scrollbars = Array.from(document.querySelectorAll('#communityScheduler .dx-scrollable-scrollbar')).map(sb => ({
      className: sb.className,
      display: window.getComputedStyle(sb).display,
      visibility: window.getComputedStyle(sb).visibility,
      opacity: window.getComputedStyle(sb).opacity,
      width: sb.offsetWidth,
      height: sb.offsetHeight
    }));

    return { scrollbars };
  });
  console.log('CrossScrolling Scrollbars:', JSON.stringify(res, null, 2));
  await runner.browser.close();
})();

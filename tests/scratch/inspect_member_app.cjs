const E2ETestRunner = require('../e2e/runner');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    await runner.switchSession('0987654321', 'ALL', 'MEMBER');
    await runner.page.goto('http://localhost:3000/mobile/member/#home', { waitUntil: 'networkidle2' });
    await runner.sleep(2000);

    const homeData = await runner.page.evaluate(async () => {
      // Check what APIs are called or what is on home page
      const packagesRes = await apiClient.request('/mobile/member/packages').catch(e => ({ error: e.message }));
      const bookingsRes = await apiClient.request('/mobile/member/bookings').catch(e => ({ error: e.message }));
      const profileRes = await apiClient.request('/mobile/member/profile').catch(e => ({ error: e.message }));
      const overviewRes = await apiClient.request('/mobile/member/overview').catch(e => ({ error: e.message }));
      return {
        packagesRes,
        bookingsRes,
        profileRes,
        overviewRes,
        homeHtml: document.querySelector('#memberApp')?.innerText?.slice(0, 500)
      };
    });

    console.log('Profile:', homeData.profileRes);
    console.log('Packages:', homeData.packagesRes);
    console.log('Bookings:', homeData.bookingsRes);
    console.log('Overview:', homeData.overviewRes);
    console.log('Home Text:', homeData.homeHtml);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await runner.browser.close();
  }
})();

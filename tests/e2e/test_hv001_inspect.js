const E2ETestRunner = require('./runner');
const path = require('path');

async function testHV001Inspect() {
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  const BRANCH_ALL = 'ALL';
  const artifactDir = 'E:/Antigravity - Copy/Profiles/Profile2/.gemini/antigravity/brain/b7a3ccd6-c991-4f48-b816-dabe12bb72d2';

  try {
    console.log('[Test] 1. Logging in as QTV (All branches)...');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_ALL, 'QTV');
    await runner.sleep(2500);

    console.log('[Test] 2. Navigating to #members...');
    await runner.navigateTo('members');
    await runner.sleep(3000);

    console.log('[Test] 3. Opening HV001 detail popup directly...');
    await runner.page.evaluate(() => {
      window.MembersModule.openDetail('40000000-0000-0000-0000-000000000001');
    });

    await runner.sleep(3000);

    const clickMemberSidebarItem = async (textMatch) => {
      await runner.page.evaluate((txt) => {
        const items = Array.from(document.querySelectorAll('.dx-popup-content .member-sidebar-item'));
        const target = items.find(i => i.innerText.includes(txt));
        if (target) target.click();
      }, textMatch);
      await runner.sleep(1500);
    };

    console.log('[Test] 4. Switching to Member Menu: Thanh toán...');
    await clickMemberSidebarItem('Thanh toán');
    await runner.page.screenshot({
      path: path.join(artifactDir, 'verify-member-hv001-payments.png'),
      fullPage: false
    });
    console.log('📸 Chụp screenshot: verify-member-hv001-payments.png');

    console.log('[Test] 5. Switching to Member Menu: Tài khoản...');
    await clickMemberSidebarItem('Tài khoản');
    await runner.page.screenshot({
      path: path.join(artifactDir, 'verify-member-hv001-account.png'),
      fullPage: false
    });
    console.log('📸 Chụp screenshot: verify-member-hv001-account.png');

    console.log('🎉 Xong kiểm tra chi tiết HV001!');
  } catch (err) {
    console.error('❌ Thất bại:', err);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
}

testHV001Inspect();

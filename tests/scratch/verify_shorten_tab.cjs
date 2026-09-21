const E2ETestRunner = require('../e2e/runner');
const path = require('path');
const fs = require('fs');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();

  const MEMBER_PHONE = '0987654321'; // Lê Hoàng Nam (HV001)

  try {
    console.log('--- Open Mobile Member on packages/transfers ---');
    await runner.openMobileMemberSession(MEMBER_PHONE, 'packages');
    await runner.sleep(1000);

    // Click the 4th tab: Chuyển nhượng
    await runner.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.segments button'));
      const transferBtn = btns.find(b => b.textContent.includes('Chuyển nhượng'));
      if (transferBtn) transferBtn.click();
    });
    await runner.sleep(1500);

    const shot = path.join(__dirname, 'verify_shorten_tab_result.png');
    await runner.page.screenshot({ path: shot });
    console.log('Saved screenshot:', shot);

    const artifactDir = 'E:/Antigravity - Copy/Profiles/Profile5/.gemini/antigravity/brain/cf22d6e0-20cc-4a19-9c08-c386ee4a543d';
    const copyPath = path.join(artifactDir, 'verify_shorten_tab_result.png');
    fs.copyFileSync(shot, copyPath);
    console.log('Copied to artifact:', copyPath);

  } catch (err) {
    console.error('Error running test:', err);
  } finally {
    await runner.close();
  }
})();

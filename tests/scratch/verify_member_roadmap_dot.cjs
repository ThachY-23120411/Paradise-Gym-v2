const E2ETestRunner = require('../e2e/runner');
const path = require('path');
const fs = require('fs');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  const artifactDir = 'E:/Antigravity - Copy/Profiles/Profile5/.gemini/antigravity/brain/cf22d6e0-20cc-4a19-9c08-c386ee4a543d';

  try {
    await runner.openMobileMemberSession('0987654321', 'packages');
    await runner.sleep(1200);

    await runner.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Xem lộ trình'));
      if (btn) btn.click();
    });
    await runner.sleep(1500);

    const shot = path.join(__dirname, 'verify_member_roadmap_assessment.png');
    await runner.page.screenshot({ path: shot });
    console.log('Saved shot:', shot);
    fs.copyFileSync(shot, path.join(artifactDir, 'verify_member_roadmap_assessment.png'));
  } finally {
    await runner.close();
  }
})();

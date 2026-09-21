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

    // Switch to filter ALL or find DK-2026-07-01
    await runner.page.evaluate(() => {
      const allFilter = Array.from(document.querySelectorAll('.filters button')).find(b => b.textContent.includes('Tất cả'));
      if (allFilter) allFilter.click();
    });
    await runner.sleep(1000);

    // Find card for DK-2026-07-01 and click 'Xem lộ trình'
    const opened = await runner.page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.record'));
      const targetCard = cards.find(c => c.textContent.includes('DK-2026-07-01') || c.textContent.includes('Tháng 7/2026'));
      if (targetCard) {
        const btn = Array.from(targetCard.querySelectorAll('button')).find(b => b.textContent.includes('Xem lộ trình'));
        if (btn) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    console.log('Opened roadmap for DK-2026-07-01:', opened);
    await runner.sleep(1500);

    // Scroll roadmap modal down a bit so Buổi 1 is in view
    await runner.page.evaluate(() => {
      const timeline = document.querySelector('.roadmap-timeline');
      if (timeline) timeline.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await runner.sleep(500);

    const shot = path.join(__dirname, 'exact_july_roadmap_result.png');
    await runner.page.screenshot({ path: shot });
    console.log('Saved shot:', shot);
    fs.copyFileSync(shot, path.join(artifactDir, 'exact_july_roadmap_result.png'));
  } finally {
    await runner.close();
  }
})();

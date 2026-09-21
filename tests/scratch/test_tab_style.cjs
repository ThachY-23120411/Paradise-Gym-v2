const E2ETestRunner = require('../e2e/runner');
const path = require('path');
const fs = require('fs');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();

  try {
    await runner.openMobileMemberSession('0987654321', 'packages');
    await runner.sleep(1000);

    await runner.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.segments button'));
      const transferBtn = btns.find(b => b.textContent.includes('Chuyển nhượng'));
      if (transferBtn) transferBtn.click();
    });
    await runner.sleep(1000);

    await runner.page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        .segments button {
          padding: 10px 5px !important;
          font-size: 12.5px !important;
          letter-spacing: -0.2px;
        }
        .segments {
          gap: 2px !important;
        }
      `;
      document.head.appendChild(style);
    });
    await runner.sleep(500);

    const shot = path.join(__dirname, 'styled_tab_result.png');
    await runner.page.screenshot({ path: shot });
    console.log('Saved:', shot);

    const artifactDir = 'E:/Antigravity - Copy/Profiles/Profile5/.gemini/antigravity/brain/cf22d6e0-20cc-4a19-9c08-c386ee4a543d';
    const copyPath = path.join(artifactDir, 'styled_tab_result.png');
    fs.copyFileSync(shot, copyPath);
    console.log('Copied to artifact:', copyPath);
  } finally {
    await runner.close();
  }
})();

const fs = require('fs');
const E2ETestRunner = require('../e2e/runner');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    const page = runner.page;
    const base64 = fs.readFileSync('E:/Antigravity - Copy/Profiles/Profile3/.gemini/antigravity/brain/8f603014-e613-4055-a510-ef40fa67cfcb/.user_uploaded/media_1789963434505.png').toString('base64');
    await page.setContent(`<img id="img" src="data:image/png;base64,${base64}"><canvas id="c"></canvas>`);
    const res = await page.evaluate(() => {
      const img = document.getElementById('img');
      const canvas = document.getElementById('c');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Find horizontal border lines in left column (x=20)
      // A border line has a different color than background
      const rows = [];
      let prev = null;
      for (let y = 0; y < canvas.height; y++) {
        const p = ctx.getImageData(20, y, 1, 1).data;
        const brightness = (p[0] + p[1] + p[2]) / 3;
        if (brightness < 245) { // darker than pure white
          if (!prev || y - prev > 5) {
            rows.push({ y, color: Array.from(p) });
            prev = y;
          }
        }
      }

      // Check blue card bottom at x = 300
      let blueBottom = -1;
      for (let y = 0; y < canvas.height; y++) {
        const p = ctx.getImageData(300, y, 1, 1).data;
        if (p[2] > 150 && p[0] < 50) {
          blueBottom = y;
        }
      }

      return { rows, blueBottom, imgH: canvas.height };
    });
    console.log('MEASURED:', res);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

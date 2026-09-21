const fs = require('fs');
const E2ETestRunner = require('../e2e/runner');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    const page = runner.page;
    const base64 = fs.readFileSync('E:/Antigravity - Copy/Profiles/Profile3/.gemini/antigravity/brain/8f603014-e613-4055-a510-ef40fa67cfcb/.user_uploaded/media_1789963434505.png').toString('base64');
    await page.setContent(`<img id="img" src="data:image/png;base64,${base64}"><canvas id="c"></canvas>`);
    const slice = await page.evaluate(() => {
      const img = document.getElementById('img');
      const canvas = document.getElementById('c');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Check pixel colors at x = 300 from y = 140 to 162
      const result = [];
      for (let y = 140; y < canvas.height; y++) {
        const p = ctx.getImageData(300, y, 1, 1).data;
        result.push({ y, rgba: [p[0], p[1], p[2], p[3]] });
      }
      return result;
    });
    console.log('PIXELS AT x=300 (y=140..162):', slice);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

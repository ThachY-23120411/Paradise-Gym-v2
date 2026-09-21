const fs = require('fs');

// Simple PNG decoder for RGBA
const pngPath = 'E:/Antigravity - Copy/Profiles/Profile3/.gemini/antigravity/brain/8f603014-e613-4055-a510-ef40fa67cfcb/.user_uploaded/media_1789963434505.png';
// Let's use puppeteer to inspect the image pixels!
const E2ETestRunner = require('../e2e/runner');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  try {
    const page = runner.page;
    const base64 = fs.readFileSync(pngPath).toString('base64');
    await page.setContent(`<img id="img" src="data:image/png;base64,${base64}"><canvas id="c"></canvas>`);
    const analysis = await page.evaluate(() => {
      const img = document.getElementById('img');
      const canvas = document.getElementById('c');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Analyze column x = 30 (time column) and column x = 300 (inside the card)
      // Find grey lines in time column (border-bottom #f0f3f1 or similar)
      const gridLines = [];
      for (let y = 0; y < canvas.height; y++) {
        const p = ctx.getImageData(30, y, 1, 1).data;
        // check if horizontal line across x=10 to x=60 has border color
        const p1 = ctx.getImageData(10, y, 1, 1).data;
        const p2 = ctx.getImageData(50, y, 1, 1).data;
        // #f0f3f1 is (240, 243, 241) or border color
        if (p1[0] > 200 && p1[0] < 245 && Math.abs(p1[0] - p1[1]) < 10) {
          gridLines.push({ y, color: [p1[0], p1[1], p1[2]] });
        }
      }

      // Find top and bottom of blue card at x = 300
      let cardTop = -1, cardBottom = -1;
      for (let y = 0; y < canvas.height; y++) {
        const p = ctx.getImageData(300, y, 1, 1).data;
        // Blue card is #1e40af: r~30, g~64, b~175
        const isBlue = (p[2] > 140 && p[0] < 60);
        if (isBlue && cardTop === -1) cardTop = y;
        if (isBlue) cardBottom = y;
      }

      // Also check at x = 100
      let cardTop100 = -1, cardBottom100 = -1;
      for (let y = 0; y < canvas.height; y++) {
        const p = ctx.getImageData(100, y, 1, 1).data;
        const isBlue = (p[2] > 140 && p[0] < 60);
        if (isBlue && cardTop100 === -1) cardTop100 = y;
        if (isBlue) cardBottom100 = y;
      }

      return {
        width: canvas.width,
        height: canvas.height,
        cardTop,
        cardBottom,
        cardHeight: cardBottom - cardTop + 1,
        cardTop100,
        cardBottom100
      };
    });
    console.log('ANALYSIS:', analysis);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

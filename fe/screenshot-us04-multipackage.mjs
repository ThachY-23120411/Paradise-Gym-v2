import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:8444');
  
  async function setSurface(surfaceName) {
    await page.setViewport({ width: 1440, height: 900 });
    await page.waitForSelector('select');
    await page.select('select', surfaceName);
    await new Promise(r => setTimeout(r, 500));
  }

  // 1. Web QTV W02
  console.log('Capturing Web QTV W02 (US04 - Multiple Packages)...');
  await setSurface('web-admin');
  await page.click('nav button:nth-child(2)'); // W02
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/qtv/light-web-W02-hoi-vien-kh.png') });

  // 2. Web Lễ tân W02
  console.log('Capturing Web Lễ tân W02...');
  await setSurface('web-receptionist');
  await page.click('nav button:nth-child(2)'); // W02
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/le-tan/light-web-W02-hoi-vien-kh.png') });

  // 3. Mobile Lễ tân M02
  console.log('Capturing Mobile Lễ tân M02...');
  await setSurface('mobile-receptionist');
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 500));
  await page.click('nav button:nth-child(2)'); // M02
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/le-tan/light-mobile-M02-hoi-vien.png') });

  // 4. Mobile Hội viên HV03 (Gói của tôi)
  console.log('Capturing Mobile Hội viên HV03 (Gói của tôi)...');
  await setSurface('mobile-member');
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 500));
  const navBtns = await page.$$('nav button');
  for (const btn of navBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Gói của tôi')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/hoi-vien/light-mobile-HV03-goi-cua-toi.png') });

  await browser.close();
  console.log('Done capturing US04 multi-package screenshots!');
})();

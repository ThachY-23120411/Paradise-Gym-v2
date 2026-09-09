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
  
  // Helper to change surface
  async function setSurface(surfaceName) {
    // The surface switcher is a select element. Let's find it.
    // Wait for the select element that has the options for surfaces.
    await page.waitForSelector('select');
    const selects = await page.$$('select');
    // It's the first select (SurfaceSwitcher)
    await page.select('header select:nth-of-type(1)', surfaceName);
    // Give it a moment to render
    await new Promise(r => setTimeout(r, 500));
  }

  // Web QTV
  console.log('Capturing Web QTV...');
  await setSurface('web-admin');
  // Click W02 menu (Hội viên & KH)
  await page.click('nav button:nth-child(2)');
  await new Promise(r => setTimeout(r, 500));
  // Click 'Thêm hội viên' button
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Thêm hội viên')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  // Take screenshot
  await page.screenshot({ path: path.join(__dirname, '../screenshot/qtv/light-web-modal-them-sua-ho-so-hoi-vien.png') });
  // Close modal (click Hủy or close button)
  const closeBtns = await page.$$('button');
  for (const btn of closeBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text === 'Hủy') {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));

  // Web Lễ tân
  console.log('Capturing Web Lễ tân...');
  await setSurface('web-receptionist');
  await page.click('nav button:nth-child(2)'); // W02
  await new Promise(r => setTimeout(r, 500));
  const buttonsLT = await page.$$('button');
  for (const btn of buttonsLT) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Thêm hội viên')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/le-tan/light-web-modal-them-sua-ho-so-hoi-vien.png') });
  const closeBtnsLT = await page.$$('button');
  for (const btn of closeBtnsLT) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text === 'Hủy') {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));

  // Mobile Lễ tân
  console.log('Capturing Mobile Lễ tân...');
  await setSurface('mobile-receptionist');
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 500));
  // Click M02 (Hội viên) - it's the second tab in the bottom nav
  await page.click('nav button:nth-child(2)');
  await new Promise(r => setTimeout(r, 500));
  const buttonsMob = await page.$$('button');
  for (const btn of buttonsMob) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Thêm hội viên')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/le-tan/light-mobile-modal-them-sua-ho-so-hoi-vien.png') });

  await browser.close();
  console.log('Done!');
})();

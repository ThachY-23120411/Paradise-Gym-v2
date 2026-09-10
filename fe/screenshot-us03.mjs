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
    await page.waitForSelector('select');
    await page.select('header select:nth-of-type(1)', surfaceName);
    await new Promise(r => setTimeout(r, 500));
  }

  // Web QTV - Modal Xử lý hồ sơ nghi trùng
  console.log('Capturing Web QTV - Nghi trùng...');
  await setSurface('web-admin');
  await page.click('nav button:nth-child(2)'); // W02
  await new Promise(r => setTimeout(r, 500));
  // Click 'Thêm hội viên' button (which is temporarily mapped to duplicate-resolve)
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Thêm hội viên')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/qtv/light-web-modal-xu-ly-ho-so-nghi-trung.png') });
  
  // Close modal
  const closeBtns = await page.$$('button');
  for (const btn of closeBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text === 'Hủy') {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));

  // Mobile Lễ tân - Modal Xử lý hồ sơ nghi trùng
  console.log('Capturing Mobile Lễ tân - Nghi trùng...');
  await setSurface('mobile-receptionist');
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 500));
  // Click M02 (Hội viên) - 2nd tab
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
  await page.screenshot({ path: path.join(__dirname, '../screenshot/le-tan/light-mobile-modal-xu-ly-ho-so-nghi-trung.png') });

  await browser.close();
  console.log('Done!');
})();

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

  // Web QTV - W03 Gói tập
  console.log('Capturing Web QTV W03 (Gói tập)...');
  await setSurface('web-admin');
  await page.click('nav button:nth-child(3)'); // W03
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/qtv/light-web-W03-goi-tap.png') });

  // Open Create Package Modal (Tạo mới gói tập)
  console.log('Capturing Create Package Modal (Empty)...');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Tạo gói mới')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/qtv/light-web-modal-tao-danh-muc-goi-tap.png') });
  await page.screenshot({ path: path.join(__dirname, '../screenshot/qtv/light-web-modal-tao-sua-danh-muc-goi-tap.png') });

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

  // Open Update Package Modal (Cập nhật gói tập - Prefilled)
  console.log('Capturing Update Package Modal (Prefilled)...');
  const editBtns = await page.$$('button');
  for (const btn of editBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.trim() === 'Sửa') {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/qtv/light-web-modal-cap-nhat-danh-muc-goi-tap.png') });

  await browser.close();
  console.log('Done capturing E02-US01 screenshots!');
})();

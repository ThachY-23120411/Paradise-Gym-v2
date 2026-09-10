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

  // Web QTV
  console.log('Capturing Web QTV for US02 (Update)...');
  await setSurface('web-admin');
  await page.click('nav button:nth-child(2)');
  await new Promise(r => setTimeout(r, 500));
  
  // Click edit button "Chỉnh sửa"
  const editBtn = await page.$('button[title="Chỉnh sửa"]');
  if (editBtn) {
    await editBtn.click();
  } else {
    console.log('Edit button not found by title, trying fallback...');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const title = await page.evaluate(el => el.getAttribute('title'), btn);
      if (title === 'Chỉnh sửa') {
        await btn.click();
        break;
      }
    }
  }
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/qtv/light-web-modal-cap-nhat-ho-so-hoi-vien.png') });
  
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
  console.log('Capturing Web Lễ tân for US02 (Update)...');
  await setSurface('web-receptionist');
  await page.click('nav button:nth-child(2)');
  await new Promise(r => setTimeout(r, 500));
  
  const editBtnLT = await page.$('button[title="Chỉnh sửa"]');
  if (editBtnLT) {
    await editBtnLT.click();
  }
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/le-tan/light-web-modal-cap-nhat-ho-so-hoi-vien.png') });
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
  console.log('Capturing Mobile Lễ tân for US02 (Update)...');
  await setSurface('mobile-receptionist');
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 500));
  await page.click('nav button:nth-child(2)');
  await new Promise(r => setTimeout(r, 500));
  
  // Click on a member item in mobile list
  const memberItem = await page.$('div.space-y-2 > button');
  if (memberItem) {
    await memberItem.click();
  }
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/le-tan/light-mobile-modal-cap-nhat-ho-so-hoi-vien.png') });

  await browser.close();
  console.log('Done!');
})();


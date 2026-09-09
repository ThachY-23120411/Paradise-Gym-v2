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

  // Web QTV - Modal Thay đổi trạng thái hồ sơ
  console.log('Capturing Web QTV - Thay đổi trạng thái...');
  await setSurface('web-admin');
  await page.click('nav button:nth-child(2)'); // W02
  await new Promise(r => setTimeout(r, 500));
  // Click on a member row to open detail
  await page.click('tbody tr:nth-child(1)');
  await new Promise(r => setTimeout(r, 500));
  // Click 'Đổi trạng thái hồ sơ'
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Đổi trạng thái hồ sơ')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/qtv/light-web-modal-thay-doi-trang-thai-ho-so-hoi-vien.png') });
  
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

  // Mobile Hội viên - HV04 Tài khoản
  console.log('Capturing Mobile Hội viên - HV04...');
  await setSurface('mobile-member');
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 500));
  // Click M04 (Tài khoản) - 4th tab
  await page.click('nav button:nth-child(4)');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/hoi-vien/light-mobile-HV04-tai-khoan.png') });

  // Mobile Hội viên - Modal Cập nhật hồ sơ
  console.log('Capturing Mobile Hội viên - Modal Cập nhật hồ sơ...');
  const buttonsMob = await page.$$('button');
  for (const btn of buttonsMob) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Cập nhật hồ sơ')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '../screenshot/hoi-vien/light-mobile-modal-cap-nhat-thong-tin-ca-nhan.png') });

  await browser.close();
  console.log('Done!');
})();

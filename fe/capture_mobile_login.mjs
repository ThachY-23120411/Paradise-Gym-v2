import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const targetDir = path.join(__dirname, 'screenshot/hoi-vien');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 450, height: 900 });

  async function clickButtonWithText(text) {
    return page.evaluate((targetText) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent && b.textContent.includes(targetText));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }, text);
  }

  async function setInputValue(placeholderSubstr, val) {
    await page.evaluate(({ placeholderSubstr, val }) => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const input = inputs.find((i) => i.placeholder && i.placeholder.includes(placeholderSubstr));
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, { placeholderSubstr, val });
  }

  async function resetToMemberLogin() {
    await page.goto('http://localhost:8444');
    await wait(800);
    await page.select('header select:nth-of-type(1)', 'mobile-member');
    await wait(800);
  }

  // --- 1. Login Screen ---
  await resetToMemberLogin();
  console.log('Capturing Login screen...');
  await page.screenshot({
    path: path.join(targetDir, 'light-mobile-HV-dang-nhap.png'),
  });

  // --- 2. Check Phone Screen ---
  console.log('Navigating to Check Phone screen...');
  await clickButtonWithText('Tạo tài khoản ngay');
  await wait(500);
  await page.screenshot({
    path: path.join(targetDir, 'light-mobile-HV-tao-tai-khoan-nhap-sdt.png'),
  });

  // --- 3. Case 2: Existing Profile Link ---
  console.log('Capturing Case 2 Step 1 (Profile & Pass)...');
  await setInputValue('0901', '0901 234 567');
  await wait(300);
  await clickButtonWithText('Tiếp tục');
  await wait(600);
  await page.screenshot({
    path: path.join(targetDir, 'light-mobile-HV-tao-tai-khoan-case2-lien-ket-ho-so-quay.png'),
  });

  console.log('Capturing Case 2 Step 2 (OTP)...');
  await setInputValue('mới...', '123456');
  await setInputValue('lại', '123456');
  await wait(300);
  await clickButtonWithText('Gửi mã OTP');
  await wait(600);
  await page.screenshot({
    path: path.join(targetDir, 'light-mobile-HV-tao-tai-khoan-case2-xac-thuc-otp.png'),
  });

  // --- 4. Case 3: Self Registration ---
  await resetToMemberLogin();
  await clickButtonWithText('Tạo tài khoản ngay');
  await wait(500);

  console.log('Capturing Case 3 Step 1 (Info & Pass)...');
  await setInputValue('0901', '0999 888 777');
  await wait(300);
  await clickButtonWithText('Tiếp tục');
  await wait(600);
  await page.screenshot({
    path: path.join(targetDir, 'light-mobile-HV-tao-tai-khoan-case3-tu-dang-ky-ho-so-moi.png'),
  });

  console.log('Capturing Case 3 Step 2 (OTP)...');
  await setInputValue('An', 'Nguyễn Văn An');
  await setInputValue('mật khẩu...', '123456');
  await setInputValue('lại', '123456');
  await wait(300);
  await clickButtonWithText('Gửi mã OTP');
  await wait(600);
  await page.screenshot({
    path: path.join(targetDir, 'light-mobile-HV-tao-tai-khoan-case3-xac-thuc-otp.png'),
  });

  await browser.close();
  console.log('Successfully captured all screenshots into fe/screenshot/hoi-vien/!');
  process.exit(0);
})();

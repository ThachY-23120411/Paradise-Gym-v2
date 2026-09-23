const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'E:/Antigravity - Copy/Profiles/Profile3/.gemini/antigravity/brain/8f603014-e613-4055-a510-ef40fa67cfcb';

async function verifyUI() {
  console.log('Launching browser to verify Community Classes screen...');
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  try {
    // 1. Navigate to login
    await page.goto('http://localhost:3000/web/login.html', { waitUntil: 'networkidle2' });

    // 2. Login as QTV (0900000001 / 123456)
    await page.type('#login-phone', '0900000001');
    await page.type('#login-password', '123456');
    await page.click('#btn-login');

    // Wait for OTP modal
    await page.waitForSelector('#login-otp-modal', { visible: true, timeout: 5000 });
    // Fill OTP 123456
    const otpInputs = await page.$$('#login-otp-inputs input');
    for (let i = 0; i < otpInputs.length; i++) {
      await otpInputs[i].type(String(i + 1));
    }
    await page.click('#btn-verify-otp');

    // Wait for main page
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Logged in successfully!');

    // 3. Navigate to Community Classes (#community-classes)
    await page.goto('http://localhost:3000/web/index.html#community-classes', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // 4. Test Chi nhánh Bình Thạnh
    console.log('Selecting Bình Thạnh branch...');
    await page.evaluate(() => {
      // Find branch selectbox or trigger change
      const branchInstance = $('#community-branch-filter').dxSelectBox('instance');
      if (branchInstance) {
        branchInstance.option('value', '22222222-2222-2222-2222-222222222222');
      }
    });
    await new Promise(r => setTimeout(r, 1500));

    // Capture screenshot Bình Thạnh
    const shotBT = path.join(ARTIFACT_DIR, 'verify_community_classes_binh_thanh_exact_pt.png');
    await page.screenshot({ path: shotBT, fullPage: true });
    console.log('Screenshot Bình Thạnh saved:', shotBT);

    // Get all instructor names rendered in the DOM at Bình Thạnh
    const btInstructors = await page.evaluate(() => {
      const texts = [];
      document.querySelectorAll('.instructor-name, .class-instructor, .dx-card, .class-card, table td').forEach(el => {
        const t = el.innerText.trim();
        if (t.includes('HLV') || t.includes('Lê Văn Hùng') || t.includes('Nguyễn Văn Thể')) {
          texts.push(t);
        }
      });
      return [...new Set(texts)];
    });
    console.log('Rendered Instructors at Bình Thạnh:', btInstructors);

    // 5. Test Chi nhánh Quận 1
    console.log('Selecting Quận 1 branch...');
    await page.evaluate(() => {
      const branchInstance = $('#community-branch-filter').dxSelectBox('instance');
      if (branchInstance) {
        branchInstance.option('value', '11111111-1111-1111-1111-111111111111');
      }
    });
    await new Promise(r => setTimeout(r, 1500));

    const shotQ1 = path.join(ARTIFACT_DIR, 'verify_community_classes_quan1_exact_pt.png');
    await page.screenshot({ path: shotQ1, fullPage: true });
    console.log('Screenshot Quận 1 saved:', shotQ1);

    const q1Instructors = await page.evaluate(() => {
      const texts = [];
      document.querySelectorAll('.instructor-name, .class-instructor, .dx-card, .class-card, table td').forEach(el => {
        const t = el.innerText.trim();
        if (t.includes('HLV') || t.includes('Lê Văn Hùng') || t.includes('Nguyễn Văn Thể')) {
          texts.push(t);
        }
      });
      return [...new Set(texts)];
    });
    console.log('Rendered Instructors at Quận 1:', q1Instructors);

    console.log('✅ UI Verification Completed!');
  } catch (err) {
    console.error('UI Verification Error:', err);
  } finally {
    await browser.close();
  }
}

verifyUI();

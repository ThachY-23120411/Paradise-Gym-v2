const path = require('path');
const puppeteer = require(path.resolve('backend/node_modules/puppeteer-core'));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function test() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  // 1. Login QTV
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_phone: '0900000001', password: 'Paradise@123', active_role: 'QTV' })
  }).then(r => r.json());
  const token = loginRes.data.access_token;
  const user = loginRes.data.user;

  await page.goto('http://localhost:3000/web/');
  await page.evaluate((t, u) => {
    localStorage.setItem('paradise_access_token', t);
    localStorage.setItem('paradise_user', JSON.stringify(u));
    localStorage.setItem('paradise_current_branch_id', '11111111-1111-1111-1111-111111111111');
  }, token, user);
  await page.goto('http://localhost:3000/web/#members', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // Open detail of Le Hoang Nam
  await page.evaluate(async () => {
    const res = await window.apiClient.members.searchPhone('0987654321');
    const m = res.data?.member || res.data;
    if (m?.id) window.MembersModule.openDetail(m.id);
  });
  await new Promise(r => setTimeout(r, 1500));

  // Click Sua ho so
  await page.evaluate(() => {
    window.jQuery('.view-actions .dx-button:contains("Sửa hồ sơ")').trigger('dxclick');
  });
  await new Promise(r => setTimeout(r, 1500));

  // Update email in dxForm
  const newEmail = 'nam.lehoang.updated@gmail.com';
  await page.evaluate((email) => {
    const form = window.jQuery('.dx-popup:visible .dx-form').dxForm('instance');
    if (form) {
      const ed = form.getEditor('email');
      if (ed) ed.option('value', email);
    }
  }, newEmail);
  await new Promise(r => setTimeout(r, 1000));

  // Screenshot form with new email
  await page.screenshot({ path: 'tests/e2e/scratch/test_edit_form_filled.png' });
  console.log('Took test_edit_form_filled.png');

  // Click Luu thay doi
  await page.evaluate(() => {
    window.jQuery('.dx-popup:visible .dx-button:contains("Lưu thay đổi")').trigger('dxclick');
  });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: 'tests/e2e/scratch/test_edit_saved.png' });
  console.log('Took test_edit_saved.png');

  // Now test Mobile Member
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  const mLogin = await fetch('http://localhost:5000/api/v1/auth/login-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_phone: '0987654321', password: 'Paradise@123', active_role: 'MEMBER' })
  }).then(r => r.json());

  await page.evaluate((t, u) => {
    localStorage.setItem('paradise_access_token', t);
    localStorage.setItem('paradise_user', JSON.stringify(u));
  }, mLogin.data.access_token, mLogin.data.user);

  await page.goto('http://localhost:3000/mobile/member/#account', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2500));

  await page.screenshot({ path: 'tests/e2e/scratch/test_mobile_account_updated.png' });
  console.log('Took test_mobile_account_updated.png');

  await browser.close();
}
test();

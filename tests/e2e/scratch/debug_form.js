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

  // Login QTV
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_phone: '0900000001', password: 'Paradise@123', active_role: 'QTV' })
  }).then(r => r.json());

  await page.goto('http://localhost:3000/web/');
  await page.evaluate((t, u) => {
    localStorage.setItem('paradise_access_token', t);
    localStorage.setItem('paradise_user', JSON.stringify(u));
    localStorage.setItem('paradise_current_branch_id', '11111111-1111-1111-1111-111111111111');
  }, loginRes.data.access_token, loginRes.data.user);

  await page.goto('http://localhost:3000/web/#members', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  await page.evaluate(async () => {
    const res = await window.apiClient.members.searchPhone('0987654321');
    const m = res.data?.member || res.data;
    if (m?.id) window.MembersModule.openDetail(m.id);
  });
  await new Promise(r => setTimeout(r, 1500));

  await page.evaluate(() => {
    window.jQuery('.view-actions .dx-button:contains("Sửa hồ sơ")').trigger('dxclick');
  });
  await new Promise(r => setTimeout(r, 1500));

  const debug = await page.evaluate(() => {
    const pop = window.jQuery('.dx-popup:visible');
    const form = pop.find('.dx-form').dxForm('instance');
    const ed = form ? form.getEditor('email') : null;
    return {
      popCount: pop.length,
      formExists: Boolean(form),
      formData: form ? form.option('formData') : null,
      editorExists: Boolean(ed),
      editorVal: ed ? ed.option('value') : null,
      inputCount: pop.find('input').length,
      inputs: pop.find('input').map(function() { return { name: this.name, val: this.value, type: this.type }; }).get()
    };
  });
  console.log('DEBUG:', JSON.stringify(debug, null, 2));

  await browser.close();
}
test();

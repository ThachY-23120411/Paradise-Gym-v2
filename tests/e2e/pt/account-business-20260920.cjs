const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const { Client } = require(path.join(root, 'backend/node_modules/pg'));
const bcrypt = require(path.join(root, 'backend/node_modules/bcryptjs'));
const { chromium } = require('C:/Users/Admin/.agents/skills/playwright-skill/node_modules/playwright');
require(path.join(root, 'backend/node_modules/dotenv')).config({ path: path.join(root, 'backend/.env'), quiet: true });
const originalUrl = process.env.DATABASE_URL;
assert(originalUrl, 'Explicit database connection required');
const dbName = `paradise_test_${process.pid}_${Date.now()}`;
assert(/^paradise_test_\d+_\d+$/.test(dbName));
const password = 'Isolated-Test-Password9';
const changedPassword = 'Changed-Test-Password8';
const reports = new Map();
const runId = `rerun-${new Date().toISOString().replace(/[:.]/g, '-')}`;
let db, admin, server, pool, base, browser, created = false;
const network = [], errors = [];
const cleanup = { databaseDropped: false, serverClosed: false, browserClosed: false, errors: [] };
let avatarStorage, uiServer;
function report(us) {
  if (!reports.has(us)) {
    const dir = path.join(__dirname, us, 'account-business-20260920', runId);
    fs.mkdirSync(dir, { recursive: true });
    reports.set(us, { us, dir, steps: [], state: [], downstream: [], issues: [] });
  }
  return reports.get(us);
}
async function api(url, token, method = 'GET', body) {
  const response = await fetch(base + '/api/v1' + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const json = await response.json();
  return { status: response.status, data: json.data ?? json };
}
async function ok(url, token, method, body) {
  const result = await api(url, token, method, body);
  assert.equal(result.status, 200, `${url}: ${JSON.stringify(result.data)}`);
  return result.data;
}
async function login(phone, pass = password) { return ok('/auth/login-password', null, 'POST', { login_phone: phone, password: pass }); }
async function account(role, branch, phone) {
  const id = randomUUID();
  await db.query("INSERT INTO accounts(id,login_phone,password_hash,status,is_two_factor_enabled) VALUES($1,$2,$3,'ACTIVE',false)", [id, phone, await bcrypt.hash(password, 4)]);
  await db.query('INSERT INTO account_roles(account_id,role_id) SELECT $1,id FROM roles WHERE role_code=$2', [id, role]);
  await db.query('INSERT INTO account_branch_scopes(account_id,branch_id,is_all_branches) VALUES($1,$2,false)', [id, branch]);
  return { id, phone };
}
async function setup() {
  try { await fetch('http://localhost:3000/mobile/pt/js/profile.js'); } catch {
    const express = require(path.join(root, 'backend/node_modules/express'));
    const ui = express(); ui.use(express.static(path.join(root, 'frontend')));
    uiServer = await new Promise((resolve, reject) => {
      const s = ui.listen(3000, '127.0.0.1', () => resolve(s)); s.on('error', reject);
    });
  }
  const servedProfile = await (await fetch('http://localhost:3000/mobile/pt/js/profile.js')).text();
  assert.equal(servedProfile.replace(/\r\n/g, '\n'), fs.readFileSync(path.join(root, 'frontend/mobile/pt/js/profile.js'), 'utf8').replace(/\r\n/g, '\n'), 'UI server must serve this checkout');
  const servedNotifications = await (await fetch('http://localhost:3000/mobile/pt/js/notifications.js')).text();
  assert.equal(servedNotifications.replace(/\r\n/g, '\n'), fs.readFileSync(path.join(root, 'frontend/mobile/pt/js/notifications.js'), 'utf8').replace(/\r\n/g, '\n'), 'Notification fixes must be served from this checkout');
  admin = new Client({ connectionString: originalUrl }); await admin.connect();
  await admin.query(`CREATE DATABASE "${dbName}"`); created = true;
  const isolated = new URL(originalUrl); isolated.pathname = '/' + dbName;
  process.env.DATABASE_URL = isolated.toString(); process.env.NODE_ENV = 'test'; process.env.AUTH_OTP_MODE = 'development';
  db = new Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
  assert.equal((await db.query('SELECT current_database() name')).rows[0].name, dbName);
  for (const file of fs.readdirSync(path.join(root, 'backend/src/db/migrations')).filter(f => f.endsWith('.sql')).sort()) await db.query(fs.readFileSync(path.join(root, 'backend/src/db/migrations', file), 'utf8'));
  for (const role of ['QTV', 'RECEPTIONIST', 'PT', 'MEMBER']) await db.query('INSERT INTO roles(role_code,role_name) VALUES($1,$1)', [role]);
  const branch = randomUUID();
  await db.query("INSERT INTO branches(id,branch_code,branch_name,phone,address,open_time,close_time) VALUES($1,'PT-AUDIT','PT Audit Branch','0909999999','Isolated fixture','00:00','23:59')", [branch]);
  const owner = await account('QTV', branch, '0909000001');
  avatarStorage = fs.mkdtempSync(path.join(report('PT04-US02').dir, 'avatar-temp-'));
  process.env.AVATAR_STORAGE_DIR = avatarStorage;
  for (const key of ['CLOUDINARY_URL', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'PUBLIC_API_URL']) delete process.env[key];
  const app = require(path.join(root, 'backend/src/server'));
  pool = require(path.join(root, 'backend/src/db/postgres')).pool;
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
  const ownerSession = await login(owner.phone);
  const trainer = await ok('/pt-bookings/trainers', ownerSession.access_token, 'POST', { full_name: 'PT Account Audit', phone: '0909000020', branch_id: branch, specialties: 'Strength' });
  const otp = await ok('/auth/request-otp', null, 'POST', { login_phone: trainer.phone });
  await ok('/auth/login-otp', null, 'POST', { login_phone: trainer.phone, otp_code: otp.dev_otp, password });
  const template = await ok('/notifications/templates', ownerSession.access_token, 'POST', { branch_id: branch, template_name: 'PT account audit notice', event_code: 'FACILITY_NOTICE', title_template: 'PT account audit notice', body_template: 'Notice for {{branch_name}} on {{effective_date}}' });
  for (let n = 0; n < 2; n++) await ok('/notifications/send', ownerSession.access_token, 'POST', { branch_id: branch, template_id: template.id, account_ids: [trainer.account_id], variables: { branch_name: 'PT Audit Branch', effective_date: '2026-09-20' } });
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  console.log('ISOLATED', dbName, base, trainer.id);
  return { trainer, ownerSession, branch };
}
async function pageFor(session, web = false) {
  const context = await browser.newContext({ viewport: web ? { width: 1440, height: 1000 } : { width: 390, height: 844 } });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.port === '5000' || url.pathname.startsWith('/api/v1/')) {
      if (web && route.request().method() !== 'GET' && route.request().method() !== 'OPTIONS') throw new Error('Downstream must remain read-only');
      return route.continue({ url: base + url.pathname + url.search });
    }
    return route.continue();
  });
  await context.addInitScript(({ session, branch }) => {
    if (location.origin === 'http://localhost:3000' && !sessionStorage.getItem('audit-auth-initialized')) {
      localStorage.setItem('paradise_access_token', session.access_token);
      localStorage.setItem('paradise_user', JSON.stringify(session.user));
      if (session.refresh_token) localStorage.setItem('paradise_refresh_token', session.refresh_token);
      if (branch) localStorage.setItem('paradise_current_branch_id', branch);
      sessionStorage.setItem('audit-auth-initialized', '1');
    }
  }, { session, branch: session.user?.branch_ids?.[0] });
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => { if (response.url().includes('/api/v1/')) network.push({ method: response.request().method(), path: new URL(response.url()).pathname, status: response.status() }); });
  await page.goto('http://localhost:3000/' + (web ? 'web/#trainers' : 'mobile/pt/'), { waitUntil: 'networkidle' });
  if (!web) await profile(page);
  return page;
}
async function profile(page) {
  await page.locator('[data-tab="profile"]').click();
  await page.waitForFunction(() => document.querySelector('#profileFullName')?.textContent === 'PT Account Audit' && window.ptProfile?.initialPreferences);
}
async function capture(r, page, name, selector, action, expected, test, section = 'steps', stopOnFailure = true) {
  await page.waitForTimeout(350);
  let actual, status = 'PASS';
  try { actual = await test(); } catch (e) { status = 'FAIL'; actual = e.message; r.issues.push(`${name}: ${actual}`); }
  const target = selector === '.gym-toast' ? page.locator(selector).last() : page.locator(selector).first();
  if (await target.isVisible()) await target.scrollIntoViewIfNeeded();
  const bounds = await target.boundingBox().catch(() => null);
  const n = r.steps.length + r.downstream.length + 1;
  await page.evaluate(({ bounds, n }) => {
    const box = bounds || { x: 8, y: 40, width: innerWidth - 16, height: innerHeight - 80 };
    const el = document.createElement('div'); el.id = 'audit-annotation';
    el.style.cssText = `position:fixed;left:${Math.max(2, box.x - 2)}px;top:${Math.max(2, box.y - 2)}px;width:${box.width + 4}px;height:${box.height + 4}px;border:3px solid #e11d48;pointer-events:none;z-index:2147483647;box-sizing:border-box`;
    const badge = document.createElement('span'); badge.textContent = n;
    badge.style.cssText = 'position:absolute;left:0;top:0;background:#e11d48;color:white;border:2px solid white;border-radius:50%;width:25px;height:25px;display:grid;place-items:center;font:bold 12px Arial'; el.append(badge); document.body.append(el);
  }, { bounds, n });
  const file = `${section === 'downstream' ? 'downstream' : 'step'}-${String(n).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(r.dir, file) });
  await page.evaluate(() => document.querySelector('#audit-annotation')?.remove());
  r[section].push({ action, expected, actual: String(actual), status, file });
  console.log(r.us, status, name, String(actual).slice(0, 250));
  if (status === 'FAIL' && stopOnFailure) throw new Error(`${name}: ${actual}`);
}
async function expectText(page, selector, text) {
  assert(await page.locator(selector).isVisible(), `Expected visible DOM: ${selector}`);
  const actual = await page.locator(selector).innerText(); assert(actual.includes(text), `Expected ${text}; DOM: ${actual}`); return actual;
}
const toast = page => page.locator('.gym-toast').last().innerText();
async function editProfile(page, fixture) {
  const r = report('PT04-US02');
  await capture(r, page, 'open-profile', '#view-profile', 'Open PT04 account', 'Own PT identity from API', () => expectText(page, '#profileFullName', 'PT Account Audit'));
  await page.locator('#btnOpenEditProfile').click();
  await capture(r, page, 'open-edit-modal', '.dx-popup-content:visible', 'Click edit profile', 'PT04-US02 Main Flow 2: prefilled fields and four immutable personnel fields', async () => { assert.equal(await page.locator('.pt-dx-editprofile-content input[readonly]').count(), 4); assert(await page.locator('#dxEditEmail').isVisible()); return 'Visible editor; four readonly personnel fields'; });
  await page.locator('#dxEditEmail').fill('invalid-email');
  await capture(r, page, 'invalid-email-input', '#dxEditEmail', 'Enter invalid-email', 'Input captured before submit', async () => { assert.equal(await page.locator('#dxEditEmail').inputValue(), 'invalid-email'); return 'invalid-email'; });
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await capture(r, page, 'invalid-email-rejected', '.pt-field-error', 'Submit invalid email', 'PT04-US02 EF-02: inline invalid email rejected; editor retained', async () => { assert(await page.locator('#dxEditEmail').isVisible()); assert.equal(await page.locator('#dxEditEmail').getAttribute('aria-invalid'), 'true'); assert(await page.locator('.pt-field-error').isVisible()); const t = await toast(page); assert(t.includes('không hợp lệ')); return t; });
  for (const [selector, value] of [['#dxEditEmail', 'pt.audit.updated@example.com'], ['#dxEditSpecialties', 'Strength, Mobility'], ['#dxEditBio', 'Isolated PT account audit biography.']]) {
    await page.locator(selector).fill(value);
    await capture(r, page, `fill-${selector.slice(1).toLowerCase()}`, selector, `Enter ${value}`, 'PT04-US02 Main Flow 3: editable field retains input', async () => { assert.equal(await page.locator(selector).inputValue(), value); return value; });
  }
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#profileEmail')?.textContent === 'pt.audit.updated@example.com');
  await page.locator('#dxEditEmail').waitFor({ state: 'detached' });
  await capture(r, page, 'saved-profile', '#profileEmail', 'Save valid profile', 'PT04-US02 Main Flow 6-7: persisted profile and editor closed', async () => { assert.equal(await page.locator('#dxEditEmail').count(), 0); return expectText(page, '#profileEmail', 'pt.audit.updated@example.com'); });
  await page.reload({ waitUntil: 'networkidle' }); await profile(page);
  await capture(r, page, 'reload-profile', '#profileEmail', 'Reload and open account', 'Saved email survives reload', () => expectText(page, '#profileEmail', 'pt.audit.updated@example.com'));
  const saved = (await db.query('SELECT email,specialties,bio FROM pt_profiles WHERE id=$1', [fixture.trainer.id])).rows[0];
  r.state.push(JSON.stringify(saved)); assert.equal(saved.email, 'pt.audit.updated@example.com');
  assert.equal(saved.specialties, 'Strength, Mobility');
  assert.equal(saved.bio, 'Isolated PT account audit biography.');
  const web = await pageFor(fixture.ownerSession, true);
  try {
    await web.locator('#trainersGrid').waitFor();
    await capture(r, web, 'web-same-pt-row', '#trainersGrid', 'Read-only QTV trainer list, same PT', 'Updated email belongs to same PT phone and code', async () => { const t = await web.locator('#trainersGrid').innerText(); assert(t.includes(fixture.trainer.phone)); assert(t.includes(saved.email)); return t; }, 'downstream');
    await web.locator('[title="Xem chi tiết hồ sơ"]').first().click();
    await capture(r, web, 'web-same-pt-detail', '.pt-trainer-detail-content', 'Open same PT read-only detail', 'PT04-US02 persisted contact and specialty visible on Web', async () => { const t = await web.locator('.pt-trainer-detail-content').innerText(); assert(t.includes(saved.email)); assert(t.includes('Strength, Mobility')); return t; }, 'downstream');
  } finally { await web.context().close(); }
}
async function preferences(page) {
  const r = report('PT04-US01');
  const input = page.locator('#toggleNotifSchedule'); const before = await input.isChecked();
  await input.evaluate(el => el.parentElement.scrollIntoView());
  await page.locator('label').filter({ has: input }).count().catch(() => 0);
  await input.setChecked(!before, { force: true });
  await capture(r, page, 'toggle-preference', '#btnSavePreferences', 'Toggle new booking notifications', 'PT04-US01 Main Flow 3: Save enabled for changed value', async () => { assert.equal(await input.isChecked(), !before); assert(await page.locator('#btnSavePreferences').isEnabled()); return `notify_new_bookings=${!before}; Save enabled`; });
  await page.locator('#btnSavePreferences').click();
  await page.waitForFunction(() => document.querySelector('#btnSavePreferences')?.disabled);
  await capture(r, page, 'save-preference', '.gym-toast', 'Click Save preferences', 'PT04-US01 Main Flow 5: success only after API persistence', async () => { const t = await toast(page); assert(t.includes('Đã lưu')); return t; });
  await page.reload({ waitUntil: 'networkidle' }); await profile(page);
  await capture(r, page, 'reload-preference', '#toggleNotifSchedule', 'Reload account preferences', 'Saved switch survives reload', async () => { assert.equal(await input.isChecked(), !before); return `notify_new_bookings=${await input.isChecked()}`; });
  await input.setChecked(before, { force: true });
  await capture(r, page, 'offline-preference-input', '#btnSavePreferences', 'Change toggle before offline submission', 'Input captured before submit', async () => `notify_new_bookings=${await input.isChecked()}`);
  await page.context().setOffline(true);
  try {
    await page.locator('#btnSavePreferences').click();
    await page.waitForFunction(() => document.querySelector('#btnSavePreferences')?.disabled);
    await capture(r, page, 'offline-preference-reverted', '.gym-toast', 'Save while browser network is offline (no mocked response)', 'PT04-US01 Exception Flow: error and restore last saved switch', async () => { assert.equal(await input.isChecked(), !before); const t = await toast(page); assert(!t.includes('Đã lưu')); return t; });
  } finally { await page.context().setOffline(false); }
  r.state.push('Preference success and offline rollback compared with actual checkbox DOM. No role privacy setting changed.');
  r.downstream.push({ action: 'Other roles', expected: 'Account-local notification preference', actual: 'N/A: only notify_new_bookings changed; no phone visibility/2FA changes.', status: 'N/A' });
}
async function avatar(page, fixture) {
  const r = report('PT04-US02');
  await page.locator('#btnOpenEditProfile').click();
  await capture(r, page, 'avatar-open-editor', '#dxBtnPickAvatar', 'Open avatar editor', 'PT04-US02 editable avatar picker visible', async () => {
    assert(await page.locator('#dxBtnPickAvatar').isVisible()); return 'Avatar picker visible';
  });
  for (const item of [
    { name: 'invalid-type.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image'), message: 'PNG, JPEG hoặc WebP' },
    { name: 'oversize.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1), message: '5MB' }
  ]) {
    await page.waitForFunction(() => !document.querySelector('.gym-toast'));
    const start = network.length;
    await page.locator('#dxInputAvatarFile').setInputFiles({ name: item.name, mimeType: item.mimeType, buffer: item.buffer });
    await capture(r, page, `avatar-${item.name}-rejected`, '.gym-toast', `Choose ${item.name} (${item.buffer.length} bytes)`, 'PT04-US02 EF-01: visible rejection; no upload or pending file', async () => {
      const actual = await toast(page); assert(actual.includes(item.message));
      assert.equal(await page.locator('#dxInputAvatarFile').inputValue(), '');
      assert.equal(await page.evaluate(() => window.ptProfile.pendingAvatarFile), null);
      assert(!network.slice(start).some(n => n.method === 'POST' && n.path.endsWith('/avatar')));
      return actual;
    });
  }
  // Capture a real rendered PNG fixture in memory; no external asset or shared file writes.
  await page.waitForFunction(() => !document.querySelector('.gym-toast'));
  const png = await page.locator('#dxBtnPickAvatar').screenshot();
  await page.locator('#dxInputAvatarFile').setInputFiles({ name: 'pt-avatar.png', mimeType: 'image/png', buffer: png });
  await page.waitForFunction(() => document.querySelector('#dxEditAvatarPreview')?.naturalWidth > 0);
  await capture(r, page, 'avatar-valid-preview', '#dxEditAvatarPreview', 'Choose valid PNG before Save', 'PT04-US02: selected bitmap renders in preview before submit', async () => {
    assert(await page.locator('#dxEditAvatarPreview').isVisible());
    const width = await page.locator('#dxEditAvatarPreview').evaluate(el => el.naturalWidth); assert(width > 0); return `PNG preview naturalWidth=${width}`;
  });
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await page.locator('#dxInputAvatarFile').waitFor({ state: 'detached' });
  await page.waitForFunction(() => document.querySelector('#profileAvatarImg')?.naturalWidth > 0);
  await page.waitForFunction(() => !document.querySelector('.gym-toast'));
  let url = await page.locator('#profileAvatarImg').getAttribute('src');
  await capture(r, page, 'avatar-saved-render', '#profileAvatarImg', 'Save avatar via production upload API', 'PT04-US02: persisted avatar renders from isolated local storage', async () => {
    assert.equal(new URL(url).origin, base);
    assert(await page.locator('#profileAvatarImg').isVisible());
    assert.equal((await db.query('SELECT avatar_url FROM accounts WHERE id=$1', [fixture.trainer.account_id])).rows[0].avatar_url, url);
    assert(fs.readFileSync(path.join(avatarStorage, path.basename(new URL(url).pathname))).equals(png));
    return `Rendered image naturalWidth=${await page.locator('#profileAvatarImg').evaluate(el => el.naturalWidth)}; stored bytes and account URL match`;
  });
  await page.reload({ waitUntil: 'networkidle' }); await profile(page);
  await capture(r, page, 'avatar-reload-render', '#profileAvatarImg', 'Reload PT avatar', 'Saved bitmap survives reload', async () => {
    assert.equal(await page.locator('#profileAvatarImg').getAttribute('src'), url);
    assert(await page.locator('#profileAvatarImg').evaluate(el => el.complete && el.naturalWidth > 0)); return 'Same stored URL renders after reload';
  });
  url = await avatarPartialRetry(page, fixture, url);
  const web = await pageFor(fixture.ownerSession, true);
  try {
    await web.locator('[title="Xem chi tiết hồ sơ"]').first().click();
    const selector = '.pt-trainer-detail-content img';
    await web.locator(selector).waitFor();
    await capture(r, web, 'avatar-web-same-pt', '.pt-trainer-detail-content', 'Open same PT detail on Web', 'Same PT phone and uploaded avatar rendered downstream', async () => {
      await expectText(web, '.pt-trainer-detail-content', fixture.trainer.phone);
      assert.equal(await web.locator(selector).getAttribute('src'), url);
      assert(await web.locator(selector).evaluate(el => el.complete && el.naturalWidth > 0)); return `Same PT ${fixture.trainer.id}; same avatar URL and decoded image`;
    }, 'downstream');
  } finally { await web.context().close(); }
}
async function avatarPartialRetry(page, fixture, previousUrl) {
  const r = report('PT04-US02');
  await page.locator('#btnOpenEditProfile').click();
  await capture(r, page, 'partial-avatar-open-editor', '#dxBtnPickAvatar', 'Open editor for partial-save regression', 'Existing persisted avatar prefilled', async () => {
    assert.equal(await page.locator('#dxEditAvatarPreview').getAttribute('src'), previousUrl);
    return 'Previous avatar URL prefilled';
  });
  const png = await page.locator('#dxEditAvatarPreview').screenshot();
  await page.locator('#dxInputAvatarFile').setInputFiles({ name: 'retry-avatar.png', mimeType: 'image/png', buffer: png });
  await page.waitForFunction(() => document.querySelector('#dxEditAvatarPreview')?.src.startsWith('data:'));
  await capture(r, page, 'partial-avatar-selected', '#dxEditAvatarPreview', 'Choose another valid PNG', 'Selected image renders before submit', async () => {
    assert(await page.locator('#dxEditAvatarPreview').evaluate(el => el.complete && el.naturalWidth > 0));
    return 'Selected PNG decoded and visible';
  });
  const oldEmail = await page.locator('#dxEditEmail').inputValue();
  const email = 'pt.audit.retry@example.com';
  await page.locator('#dxEditEmail').fill(email);
  await capture(r, page, 'partial-avatar-email-input', '#dxEditEmail', `Enter ${email}`, 'Draft email captured before submit', async () => {
    assert.equal(await page.locator('#dxEditEmail').inputValue(), email); return email;
  });
  let uploadRequests = 0, abortedRequests = 0, savedUrl;
  const countUpload = request => { if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/mobile/avatar')) uploadRequests++; };
  page.on('request', countUpload);
  const pattern = '**/api/v1/mobile/profile';
  const disconnectProfile = async route => {
    if (route.request().method() === 'PUT') { abortedRequests++; return route.abort('internetdisconnected'); }
    return route.fallback();
  };
  await page.context().route(pattern, disconnectProfile);
  try {
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('.gym-toast')].some(el => el.textContent.includes('thông tin hồ sơ chưa lưu')));
    await capture(r, page, 'partial-avatar-truthful-warning', '.gym-toast', 'Submit: real avatar succeeds; profile PUT encounters network failure', 'PT04-US02 EF-04: explain partial save, retain draft, clear pending avatar and allow retry', async () => {
      const message = await toast(page); assert(message.includes('Ảnh đã cập nhật; thông tin hồ sơ chưa lưu'));
      assert.equal(abortedRequests, 1); assert.equal(uploadRequests, 1);
      assert.equal(await page.locator('#dxEditEmail').inputValue(), email);
      assert(await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).isEnabled());
      assert.equal(await page.evaluate(() => window.ptProfile.pendingAvatarFile), null);
      savedUrl = (await db.query('SELECT avatar_url FROM accounts WHERE id=$1', [fixture.trainer.account_id])).rows[0].avatar_url;
      assert.notEqual(savedUrl, previousUrl); assert.equal(new URL(savedUrl).origin, base);
      assert.equal((await db.query('SELECT email FROM pt_profiles WHERE id=$1', [fixture.trainer.id])).rows[0].email, oldEmail);
      assert(fs.readFileSync(path.join(avatarStorage, path.basename(new URL(savedUrl).pathname))).equals(png));
      return `${message}; one real upload persisted; email unchanged in DB; draft retained; pending file cleared`;
    });
  } finally { await page.context().unroute(pattern, disconnectProfile); }
  try {
    await page.waitForFunction(() => !document.querySelector('.gym-toast'));
    await capture(r, page, 'partial-avatar-retry-ready', '#dxEditEmail', 'Network restored; inspect retained draft before retry', 'Retry uses existing saved avatar and retained email', async () => {
      assert.equal(await page.locator('#dxEditEmail').inputValue(), email);
      assert.equal(uploadRequests, 1); return `Retained ${email}; upload requests=${uploadRequests}`;
    });
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await page.locator('#dxEditEmail').waitFor({ state: 'detached' });
    await capture(r, page, 'partial-avatar-retry-success', '.gym-toast', 'Retry Save after restoring profile request', 'Profile saves successfully without uploading avatar again', async () => {
      const message = await toast(page); assert(message.includes('thành công'));
      assert.equal(uploadRequests, 1);
      assert.equal((await db.query('SELECT email FROM pt_profiles WHERE id=$1', [fixture.trainer.id])).rows[0].email, email);
      assert.equal((await db.query('SELECT avatar_url FROM accounts WHERE id=$1', [fixture.trainer.account_id])).rows[0].avatar_url, savedUrl);
      return `${message}; email persisted; avatar URL unchanged; total upload requests=1`;
    });
    await page.reload({ waitUntil: 'networkidle' }); await profile(page);
    await capture(r, page, 'partial-avatar-retry-reload', '#profileAvatarImg', 'Reload after partial-save retry', 'Saved avatar and email both render after reload', async () => {
      await expectText(page, '#profileEmail', email);
      assert.equal(await page.locator('#profileAvatarImg').getAttribute('src'), savedUrl);
      assert(await page.locator('#profileAvatarImg').evaluate(el => el.complete && el.naturalWidth > 0));
      return `Email=${email}; persisted avatar decoded; no duplicate upload`;
    });
    r.state.push(`Partial-save regression: aborted only one profile PUT, no response mocked. Avatar upload count=${uploadRequests}; retry persisted email without another upload.`);
    return savedUrl;
  } finally { page.off('request', countUpload); }
}
async function notifications(page) {
  const r = report('PT03-US01');
  await page.locator('#btnNotification').click();
  await page.locator('.pt-notif-card').first().waitFor();
  await capture(r, page, 'open-real-notifications', '.pt-notif-items', 'Open notification inbox', 'PT03-US01 list contains only persisted notifications for current account', async () => { const count = await page.locator('.pt-notif-card').count(); assert.equal(count, 2); return await page.locator('.pt-notif-items').innerText(); });
  await page.locator('#dxNotifFilterTabs').getByText(/Chưa đọc/).click();
  await capture(r, page, 'unread-filter', '.pt-notif-items', 'Choose unread filter', 'PT03-US01 AF-01: two unread server records', async () => { assert.equal(await page.locator('.pt-notif-card.unread').count(), 2); return 'Two unread notification rows visible'; });
  const token = await page.evaluate(() => localStorage.getItem('paradise_access_token'));
  const before = await ok('/notifications', token); const requests = network.length;
  let openedNotification;
  await page.locator('.pt-notif-card').first().click(); await page.waitForTimeout(550);
  await capture(r, page, 'read-notification', '.dx-dialog-wrapper .dx-popup-normal', 'Open first persisted notification', 'PT03-US01 AF-05: real read acknowledgement then visible title/body content dialog', async () => {
    const after = await ok('/notifications', token);
    const changed = after.filter(n => n.is_read && !before.find(b => b.id === n.id)?.is_read);
    assert.equal(changed.length, 1);
    openedNotification = changed[0];
    assert(network.slice(requests).some(n => n.method === 'PUT' && n.path.endsWith('/read') && n.status === 200));
    const content = await expectText(page, '.dx-dialog-wrapper .dx-popup-normal', changed[0].title);
    assert(content.includes(changed[0].body));
    r.state.push(`Persisted read_at for ${changed[0].id}: ${changed[0].read_at}`);
    return content;
  });
  await capture(r, page, 'notification-sent-time', '.dx-dialog-wrapper .dx-popup-normal', 'Inspect facility notification content fields', 'PT03-US01 content dialog field table: sent timestamp from created_at is displayed', async () => {
    const content = await page.locator('.dx-dialog-wrapper .dx-popup-normal').innerText();
    const expected = await page.evaluate(timestamp => new Date(timestamp).toLocaleString('vi-VN'), openedNotification.created_at);
    assert.equal(await page.locator('.pt-notif-detail-time').innerText(), expected);
    return content;
  }, 'steps', false);
  await page.locator('.dx-dialog-wrapper').getByRole('button').click();
  await page.locator('.dx-dialog-wrapper .dx-popup-normal').waitFor({ state: 'hidden' });
  await capture(r, page, 'close-notification-content', '.pt-notif-items', 'Close facility notice content', 'PT03-US01: return to inbox with unread filter retained', async () => {
    assert(await page.locator('.pt-notif-items').isVisible(), 'Dialog closed, but notification list is hidden; profile is displayed instead of the specified return to list.');
    assert.equal(await page.locator('.pt-notif-card').count(), 1);
    assert.equal(await page.locator('.pt-notif-card.unread').count(), 1);
    assert.deepEqual(await page.evaluate(() => window.$('#dxNotifFilterTabs').dxButtonGroup('instance').option('selectedItemKeys')), ['unread']);
    return 'Notification list visible; unread filter retained; only the remaining unread notification shown';
  }, 'steps', false);
  await page.reload({ waitUntil: 'networkidle' }); await page.locator('#btnNotification').click(); await page.locator('.pt-notif-card').first().waitFor();
  await capture(r, page, 'read-persists-reload', '.pt-notif-items', 'Reload and reopen inbox', 'Read state survives reload through API', async () => { assert.equal(await page.locator('.pt-notif-card.read').count(), 1); return 'One read and one unread server notification'; });
  await page.locator('#btnCloseNotif').click(); await profile(page);
  r.downstream.push({ action: 'Other roles', expected: 'Read state is private to this PT', actual: 'N/A: read acknowledgement changes only the current account notification.', status: 'N/A' });
}
async function officialAssignment(page, fixture) {
  const r = report('PT03-US01');
  const owner = fixture.ownerSession.access_token;
  const member = await ok('/members', owner, 'POST', { full_name: 'Official Assignment Member', phone: '0909000031', home_branch_id: fixture.branch });
  const pkg = await ok('/packages', owner, 'POST', { package_name: 'Official Assignment Combo', package_type: 'COMBO', price: 1000000, duration_days: 30, total_pt_sessions: 10, branch_ids: [fixture.branch] });
  const start = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  const registration = await ok('/registrations', owner, 'POST', { member_id: member.id, package_id: pkg.id, sold_branch_id: fixture.branch, start_date: start });
  await ok('/payments', owner, 'POST', { registration_id: registration.id, branch_id: fixture.branch, payment_method: 'CASH', amount: 1000000 });
  const template = await ok('/notifications/templates', owner, 'POST', { branch_id: fixture.branch, template_name: 'Official assignment audit', event_code: 'PT_REQUEST_ACCEPTED', title_template: 'Official assignment: {{member_name}}', body_template: '{{pt_name}} assigned to {{member_name}} / {{package_name}} at {{branch_name}}' });
  await ok('/notifications/rules', owner, 'PUT', { branch_id: fixture.branch, event_type: 'PT_REQUEST_ACCEPTED', template_id: template.id, recipient_roles: ['PT'], modes: ['DIRECT'], is_enabled: true });
  await ok(`/registrations/${registration.id}/assign-pt`, owner, 'POST', { pt_id: fixture.trainer.id });
  const token = await page.evaluate(() => localStorage.getItem('paradise_access_token'));
  const notice = (await ok('/notifications', token)).find(n => n.reference_id === registration.id && n.event_type === 'PT_REQUEST_ACCEPTED');
  assert(notice, 'Real assign-pt must emit a notification to this PT');
  assert.equal(notice.reference_type, 'REGISTRATION');
  const before = (await db.query('SELECT assigned_pt_id,status,used_pt_sessions,remaining_pt_sessions FROM registrations WHERE id=$1', [registration.id])).rows[0];
  r.state.push(`Official assignment fixture created via real member/package/registration/payment/assign-pt APIs. PT=${fixture.trainer.id}; member=${member.id}; registration=${registration.id}; notification=${notice.id}; event=${notice.event_type}; reference=${notice.reference_type}. No notification row fabricated.`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#btnNotification').click();
  const rowSelector = `.pt-notif-card[onclick*="${notice.id}"]`;
  await page.locator(rowSelector).waitFor();
  await capture(r, page, 'official-assignment-inbox', rowSelector, 'Open inbox containing real official-assignment event', 'PT03-US01: own PT sees persisted assignment notification', async () => {
    await expectText(page, rowSelector, member.full_name);
    assert((await page.locator(rowSelector).getAttribute('class')).includes('unread'));
    return `Visible notification ${notice.id}, registration ${registration.id}, member ${member.full_name}`;
  });
  await page.locator(rowSelector).click();
  await capture(r, page, 'official-assignment-client-detail', '#clientDetailSubscreen', 'Click official REGISTRATION / PT_REQUEST_ACCEPTED notification', 'PT03-US01 Main Flow 5: open same assigned client detail, not retired request history', async () => {
    await page.locator('#clientDetailSubscreen').waitFor({ state: 'visible' });
    const text = await expectText(page, '#clientDetailSubscreen', member.full_name);
    assert(text.includes(member.member_code)); assert(text.includes(pkg.package_name));
    assert.equal(await page.locator('#clientDetailSubscreen a.pt-phone-call-btn').getAttribute('href'), `tel:${member.phone}`);
    const afterNotice = (await ok('/notifications', token)).find(n => n.id === notice.id);
    assert(afterNotice.is_read); assert(afterNotice.read_at);
    assert.deepEqual((await db.query('SELECT assigned_pt_id,status,used_pt_sessions,remaining_pt_sessions FROM registrations WHERE id=$1', [registration.id])).rows[0], before);
    return `Actual client detail: ${text}; real notification read persisted; same member/registration; assignment and counters unchanged`;
  }, 'downstream');
  await page.locator('#clientDetailSubscreen [aria-label="Quay lại danh sách học viên"]').click();
  await capture(r, page, 'official-assignment-return-list', '#ptClientsContentList', 'Return from client detail', 'Same member remains in current PT assigned-client list', async () => expectText(page, '#ptClientsContentList', member.full_name));
}
async function changePassword(page, trainer) {
  const r = report('PT04-US01');
  const otherSession = await login(trainer.phone); const other = await pageFor(otherSession);
  await capture(r, other, 'password-second-session-before', '#profileFullName', 'Open independent second PT session', 'Same PT is authenticated before password change', () => expectText(other, '#profileFullName', 'PT Account Audit'));
  await page.locator('#btnOpenChangePassword').click();
  await capture(r, page, 'open-change-password', '.pt-dx-changepass-content', 'Open change password', 'PT04-US01 change password control opens form', async () => { assert(await page.locator('#dxCpCurrentPassword').isVisible()); return 'Three password inputs visible'; });
  for (const [caseName, values, invalidField] of [
    ['weak-password', [password, 'weak', 'weak'], '#dxCpNewPassword'],
    ['missing-uppercase', [password, 'abcdefgh9', 'abcdefgh9'], '#dxCpNewPassword'],
    ['over-72-bytes', [password, 'Aa9' + 'x'.repeat(70), 'Aa9' + 'x'.repeat(70)], '#dxCpNewPassword'],
    ['confirmation-mismatch', [password, changedPassword, changedPassword + 'x'], '#dxCpConfirmPassword']
  ]) {
    for (const [i, selector] of ['#dxCpCurrentPassword', '#dxCpNewPassword', '#dxCpConfirmPassword'].entries()) {
      await page.locator(selector).fill(values[i]);
      await capture(r, page, `${caseName}-input-${i + 1}`, selector, `Enter ${caseName} password field ${i + 1} (masked)`, 'Input recorded separately before submit', async () => { assert.equal(await page.locator(selector).inputValue(), values[i]); return 'Masked input matches requested boundary case'; });
    }
    const start = network.length;
    await page.getByRole('button', { name: 'Cập nhật', exact: true }).click();
    await capture(r, page, `${caseName}-rejected`, '.pt-field-error', `Submit ${caseName}`, 'User-requested password constraints: inline error, form retained, no mutation', async () => {
      assert.equal(await page.locator(invalidField).getAttribute('aria-invalid'), 'true');
      assert(await page.locator('.pt-field-error').isVisible());
      assert(!network.slice(start).some(n => n.path.endsWith('/change-password')));
      return page.locator('.pt-field-error').innerText();
    });
  }
  for (const [selector, value] of [['#dxCpCurrentPassword', password], ['#dxCpNewPassword', changedPassword], ['#dxCpConfirmPassword', changedPassword]]) {
    await page.locator(selector).fill(value);
    await capture(r, page, `fill-${selector.slice(1).toLowerCase()}`, selector, 'Fill password field (redacted)', 'Entered value captured before submission; field remains masked', async () => { assert.equal(await page.locator(selector).inputValue(), value); assert.equal(await page.locator(selector).getAttribute('type'), 'password'); return 'Password input populated and masked'; });
  }
  await page.getByRole('button', { name: 'Cập nhật', exact: true }).click(); await page.waitForTimeout(650);
  await capture(r, page, 'change-password-success', '.gym-toast', 'Submit change password', 'Requested regression: current session retained; old peer session revoked', async () => { const t = await toast(page); assert(t.includes('thành công')); const current = await page.evaluate(() => localStorage.getItem('paradise_access_token')); assert.equal((await api('/auth/me', current)).status, 200); assert.equal((await api('/auth/me', otherSession.access_token)).status, 401); return t + '; current /auth/me=200; peer /auth/me=401'; });
  await page.reload({ waitUntil: 'networkidle' }); await profile(page);
  await capture(r, page, 'password-current-reload-kept', '#profileFullName', 'Reload current device after password change', 'Current UI remains authenticated', () => expectText(page, '#profileFullName', 'PT Account Audit'));
  await other.reload({ waitUntil: 'networkidle' });
  await capture(r, other, 'password-peer-revoked', 'body', 'Reload second device', 'Revoked peer returns to login', async () => { await other.waitForURL('**/mobile/'); assert.equal(await other.locator('#bottomNav:visible').count(), 0); return `Login UI at ${other.url()}: ${(await other.locator('body').innerText()).slice(0, 250)}`; }, 'downstream');
  assert.equal((await api('/auth/login-password', null, 'POST', { login_phone: trainer.phone, password })).status, 401);
  r.state.push('Old password rejected by real login API; current token accepted, peer token revoked.');
  await other.context().close();
}
async function logout(page, trainer) {
  const r = report('PT05-US03');
  const otherSession = await login(trainer.phone, changedPassword); const other = await pageFor(otherSession);
  const current = await page.evaluate(() => localStorage.getItem('paradise_access_token'));
  await capture(r, other, 'second-device-before-logout', '#profileFullName', 'Open independent real PT session', 'Same PT authenticated in both sessions', () => expectText(other, '#profileFullName', 'PT Account Audit'));
  await page.locator('#btnLogoutTrigger').click();
  await capture(r, page, 'logout-confirm', '.dx-popup-normal:visible', 'Click current device Logout', 'PT05-US03 Main Flow 2: confirmation', async () => { return expectText(page, '.dx-popup-normal:visible', 'Xác nhận đăng xuất'); });
  await page.getByRole('button', { name: 'Có', exact: true }).click();
  await page.waitForURL('**/mobile/');
  await capture(r, page, 'current-device-logged-out', 'body', 'Confirm logout', 'PT05-US03: only current token revoked and local auth cleared', async () => { assert.equal((await api('/auth/me', current)).status, 401); assert.equal((await api('/auth/me', otherSession.access_token)).status, 200); assert.equal(await page.evaluate(() => localStorage.getItem('paradise_access_token')), null); return 'Login screen visible, local token absent, current=401 and peer=200'; });
  await other.reload({ waitUntil: 'networkidle' }); await profile(other);
  await capture(r, other, 'peer-device-retained', '#profileFullName', 'Reload other real device', 'PT05-US03 business rule: other session remains authenticated', () => expectText(other, '#profileFullName', 'PT Account Audit'), 'downstream');
  const thirdSession = await login(trainer.phone, changedPassword); const third = await pageFor(thirdSession);
  await other.locator('#btnOpenSessions').click();
  await other.locator('.pt-session-device').first().waitFor();
  await capture(r, other, 'real-device-registry', '.dx-popup-normal:visible', 'Open real device registry', 'Server sessions visible, exactly one marked current', async () => { const text = await other.locator('.dx-popup-normal:visible').innerText(); assert.equal((text.match(/Thiết bị hiện tại/g) || []).length, 1); assert(await other.locator('.pt-session-device').count() >= 2); return text; });
  await other.locator('.dx-popup-normal:visible .dx-closebutton').click();
  await other.locator('#btnLogoutAll').click();
  await capture(r, other, 'all-logout-confirm', '.dx-popup-normal:visible', 'Click logout all devices', 'Explicit confirmation includes current device', async () => expectText(other, '.dx-popup-normal:visible', 'Đăng xuất tất cả'));
  await other.getByRole('button', { name: 'Có', exact: true }).click();
  await other.waitForURL('**/mobile/');
  assert.equal((await api('/auth/me', otherSession.access_token)).status, 401);
  assert.equal((await api('/auth/me', thirdSession.access_token)).status, 401);
  r.state.push('Real UI logout-all called production API with two active browser sessions; both /auth/me=401.');
  for (const [i, device] of [other, third].entries()) {
    await device.reload({ waitUntil: 'networkidle' });
    await capture(r, device, `all-logout-device-${i + 1}`, 'body', 'Reload after real UI logout-all', 'Both actual browser sessions return to login', async () => { await device.waitForURL('**/mobile/'); return `Login UI at ${device.url()}`; }, 'downstream');
    await device.context().close();
  }
}
function writeReports() {
  for (const r of reports.values()) {
    const steps = xs => xs.map((s, i) => `### Step ${i + 1}\n\n- Action/Input: ${s.action}\n- Expected Result: ${s.expected}\n- Actual Result: ${s.actual}\n- Status: **${s.status}**\n${s.file ? `\n![${s.action}](./${s.file})\n` : ''}`).join('\n');
    const source = fs.readdirSync(path.join(root, 'docs/user-stories/pt'), { recursive: true }).find(p => path.basename(p).startsWith(r.us + '-'));
    const status = r.issues.length ? 'FAIL' : 'PASS';
    const text = `# ${r.us} Account Business UI Audit\n\nDate: 2026-09-20. Result: **${status}** (scoped checks only).\n\nSource: ${source || r.us}; user-requested two-device/password regression contract.\nReal Chrome 390x844, Web 1440x1000; http://localhost:3000/mobile/pt/. Database: ${dbName}. Production server code with Playwright route.continue to ${base}; no mocked responses, no writes to configured application database. Fixture notifications created through real template/send API. Profile subject: PT Account Audit / 0909000020.\n\n## Source Action Verification\n\n${steps(r.steps)}\n## State Verification\n\n${r.state.join('\n\n') || 'See DOM and API assertions recorded under individual steps.'}\n\n## Cross-Role / Downstream Verification\n\n${steps(r.downstream) || 'BLOCKED / not reached; no downstream PASS claimed.'}\n## Issues Found\n\n${r.issues.join('\n\n') || 'No failures in executed scope.'}\n\n## Final Result\n\n**${status}**. ${r.steps.length} source steps, ${r.downstream.filter(s => s.file).length} downstream screenshots. Not full US certification: avatar, all operational notification event types, activation and 2FA are outside this requested audit. Source files were not edited.\n`;
    fs.writeFileSync(path.join(r.dir, `${r.us}-test.md`), text.replace('Date: 2026-09-20.', `Date: ${new Date().toISOString()}.`).replace('avatar, all operational notification event types, activation and 2FA', 'all operational notification event types, PT05 activation and login/2FA UI flows') + '\nAvatar scope: real local storage upload only; no external cloud uploads. Cloud deployment/provider delivery remains unverified. OTP activation and password login used for fixture setup do not certify PT05 UI flows.\n');
    fs.writeFileSync(path.join(r.dir, 'evidence.json'), JSON.stringify({ database: dbName, base, steps: r.steps, downstream: r.downstream, state: r.state, issues: r.issues, browserErrors: errors, network, screenshotHashes: fs.readdirSync(r.dir).filter(f => f.endsWith('.png')).map(file => ({ file, sha256: createHash('sha256').update(fs.readFileSync(path.join(r.dir, file))).digest('hex') })) }, null, 2));
  }
}
async function main() {
  const fixture = await setup(); const session = await login(fixture.trainer.phone); const page = await pageFor(session);
  for (const [us, run] of [['PT04-US02', () => editProfile(page, fixture)], ['PT04-US02', () => avatar(page, fixture)], ['PT03-US01', () => notifications(page)], ['PT03-US01', () => officialAssignment(page, fixture)], ['PT04-US01', () => preferences(page)], ['PT04-US01', () => changePassword(page, fixture.trainer)], ['PT05-US03', () => logout(page, fixture.trainer)]]) {
    try { await page.reload({ waitUntil: 'networkidle' }); await profile(page); await run(); } catch (error) { report(us).issues.push('BLOCKED: ' + error.message); console.error(us, error.stack); }
  }
}
main().catch(error => { console.error(error); report('PT04-US01').issues.push('ENVIRONMENT BLOCKED: ' + error.message); process.exitCode = 1; }).finally(async () => {
  const attempt = async (name, fn) => {
    try { await fn(); } catch (error) { cleanup.errors.push(`${name}: ${error.message}`); process.exitCode = 1; }
  };
  await attempt('browser', async () => { await browser?.close(); cleanup.browserClosed = !browser || !browser.isConnected(); });
  await attempt('server', async () => {
    if (server) { server.closeAllConnections(); await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
    cleanup.serverClosed = !server || !server.listening;
  });
  await attempt('owned UI server', async () => {
    if (uiServer) { uiServer.closeAllConnections(); await new Promise((resolve, reject) => uiServer.close(error => error ? reject(error) : resolve())); }
    cleanup.ownedUiServerClosed = !uiServer || !uiServer.listening;
  });
  await attempt('pool', async () => { await pool?.end(); });
  await attempt('database connection', async () => { await db?.end(); });
  await attempt('drop isolated database', async () => {
    if (created) {
      await admin.query(`DROP DATABASE "${dbName}" WITH (FORCE)`);
      cleanup.databaseDropped = (await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [dbName])).rowCount === 0;
      assert(cleanup.databaseDropped);
    }
  });
  await attempt('admin connection', async () => { await admin?.end(); });
  await attempt('avatar directory', async () => {
    if (avatarStorage) {
      const parent = fs.realpathSync(report('PT04-US02').dir);
      const target = fs.realpathSync(avatarStorage);
      assert.equal(path.dirname(target), parent);
      assert(path.basename(target).startsWith('avatar-temp-'));
      fs.rmSync(target, { recursive: true });
      cleanup.avatarDirectoryRemoved = !fs.existsSync(target);
    }
  });
  for (const r of reports.values()) {
    r.state.push(`Cleanup verified: ${JSON.stringify(cleanup)}`);
    r.issues.push(...cleanup.errors);
    if (r.issues.length) process.exitCode = 1;
  }
  writeReports();
  const results = [...reports.values()].map(r => ({ us: r.us, issues: r.issues, pass: [...r.steps, ...r.downstream].filter(s => s.status === 'PASS').length, fail: [...r.steps, ...r.downstream].filter(s => s.status === 'FAIL').length, screenshots: [...r.steps, ...r.downstream].filter(s => s.file).length }));
  fs.writeFileSync(path.join(report('PT04-US01').dir, 'run-result.json'), JSON.stringify({ completedAt: new Date().toISOString(), database: dbName, server: base, cleanup, results, exitCode: process.exitCode || 0, uncovered: ['PT05 activation UI', 'PT05 password/OTP login UI and login 2FA', 'Cloud deployment', 'All operational notification event types'] }, null, 2));
  console.log('CLEANUP', JSON.stringify(cleanup));
  console.log('RESULT', process.exitCode ? 'FAIL / BLOCKED' : 'PASS');
});

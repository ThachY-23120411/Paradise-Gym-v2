const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const dep = name => require(path.join(root, 'backend/node_modules', name));
const { Client } = dep('pg');
const bcrypt = dep('bcryptjs');
const { chromium } = require('C:/Users/Admin/.agents/skills/playwright-skill/node_modules/playwright');
dep('dotenv').config({ path: path.join(root, 'backend/.env'), quiet: true });
const originalUrl = process.env.DATABASE_URL;
assert(originalUrl, 'Explicit DATABASE_URL required');
const dbName = `paradise_test_${process.pid}_${Date.now()}`;
assert(/^paradise_test_\d+_\d+$/.test(dbName));
let story = 'PT01-US03';
const groupMode = process.env.PT_E2E_GROUP === '1';
const runFolder = groupMode ? 'group-business-20260920' : 'business-20260920';
function prepareOutput(id) {
  const dir = path.join(__dirname, id, runFolder);
  if (fs.existsSync(path.join(dir, 'results.json'))) {
    const archive = path.join(dir, 'history', new Date().toISOString().replace(/[:.]/g, '-'));
    fs.mkdirSync(archive, { recursive: true });
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) if (entry.isFile()) fs.copyFileSync(path.join(dir, entry.name), path.join(archive, entry.name));
  }
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
let output = prepareOutput(story);
let steps = [], issues = [], checks = [];
const requests = [], migrationManifest = [], pageErrors = [];
let blocked = false;
const password = 'Isolated-Test-Password9';
const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
let date = new Date(Date.parse(today) + 86400000).toISOString().slice(0, 10);
while ([0, 6].includes(new Date(date).getUTCDay())) date = new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10);
let admin, db, pool, server, browser, base, created = false, activePage, booking, fixture, phase = 'Fixture';
async function api(url, { token, branch, method = 'GET', body, status = 200 } = {}) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(branch ? { 'x-branch-id': branch } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const json = await response.json();
  assert.equal(response.status, status, `${method} ${url}: ${JSON.stringify(json)}`);
  return json.data ?? json;
}
async function account(role, branch, phone, global = false) {
  const id = randomUUID();
  await db.query("INSERT INTO accounts(id,login_phone,password_hash,status,is_two_factor_enabled) VALUES($1,$2,$3,'ACTIVE',false)", [id, phone, await bcrypt.hash(password, 4)]);
  await db.query('INSERT INTO account_roles(account_id,role_id) SELECT $1,id FROM roles WHERE role_code=$2', [id, role]);
  await db.query('INSERT INTO account_branch_scopes(account_id,branch_id,is_all_branches) VALUES($1,$2,$3)', [id, branch, global]);
  return { id, phone };
}
async function login(a) {
  return api('/auth/login-password', { method: 'POST', body: { login_phone: a.phone, password } });
}
async function activate(a) {
  const otp = await api('/auth/request-otp', { method: 'POST', body: { login_phone: a.phone } });
  return api('/auth/login-otp', { method: 'POST', body: { login_phone: a.phone, otp_code: otp.dev_otp, password } });
}
async function screenshot(page, locator, name) {
  await locator.scrollIntoViewIfNeeded();
  await locator.waitFor({ state: 'visible' });
  await page.waitForTimeout(450);
  const rect = await locator.boundingBox();
  assert(rect && rect.width > 0 && rect.height > 0, 'Annotation target must be visible');
  await page.evaluate(({ rect, n }) => {
    const overlay = document.createElement('div'); overlay.id = 'business-e2e-annotation';
    overlay.style.cssText = `position:fixed;left:${Math.max(1, rect.x)}px;top:${Math.max(1, rect.y)}px;width:${rect.width}px;height:${rect.height}px;border:3px solid #e11d48;pointer-events:none;z-index:2147483647;box-sizing:border-box;`;
    const badge = document.createElement('span'); badge.textContent = String(n);
    badge.style.cssText = 'position:absolute;top:0;left:0;border-radius:50%;width:25px;height:25px;background:#e11d48;color:white;text-align:center;font: bold 16px/25px Arial;';
    overlay.append(badge); document.body.append(overlay);
  }, { rect, n: steps.length + 1 });
  await page.screenshot({ path: path.join(output, name) });
  await page.evaluate(() => document.getElementById('business-e2e-annotation')?.remove());
}
async function record(page, locator, name, action, expected, verify, section = 'source') {
  await locator.waitFor({ state: 'visible' });
  await page.waitForTimeout(450);
  let actual, status = 'PASS';
  try { actual = await verify(); } catch (e) { status = 'FAIL'; actual = e.message; issues.push(`${action}: ${e.message}`); }
  const filename = `${section === 'downstream' ? 'downstream' : 'step'}-${String(steps.length + 1).padStart(2, '0')}-${name.replace(/^downstream-/, '')}.png`;
  await screenshot(page, locator, filename);
  steps.push({ section, action, expected, actual: typeof actual === 'string' ? actual : JSON.stringify(actual), status, filename });
  console.log(`${status}: ${action}`);
  return status;
}
async function pageFor(session, branch, url, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport, timezoneId: 'Asia/Bangkok', serviceWorkers: 'block' });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.port === '5000' || url.pathname.startsWith('/api/')) {
      const target = new URL(base); target.pathname = url.pathname; target.search = url.search;
      requests.push({ method: route.request().method(), path: url.pathname, targetPort: target.port });
      return route.continue({ url: target.toString() });
    }
    return route.continue();
  });
  await context.addInitScript(({ session, branch }) => {
    localStorage.setItem('paradise_access_token', session.access_token);
    localStorage.setItem('paradise_user', JSON.stringify(session.user));
    localStorage.setItem('paradise_current_branch_id', branch);
  }, { session, branch });
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  page.on('pageerror', error => { pageErrors.push({ url: page.url(), message: error.message }); issues.push(`Browser error: ${error.message}`); });
  activePage = page;
  await page.goto(`http://localhost:3000${url}`, { waitUntil: 'networkidle' });
  return page;
}
async function buildFixture() {
  admin = new Client({ connectionString: originalUrl }); await admin.connect();
  await admin.query(`CREATE DATABASE "${dbName}"`); created = true;
  const isolated = new URL(originalUrl); isolated.pathname = '/' + dbName;
  process.env.DATABASE_URL = isolated.toString(); process.env.NODE_ENV = 'test'; process.env.AUTH_OTP_MODE = 'development';
  db = new Client({ connectionString: isolated.toString() }); await db.connect();
  assert.equal((await db.query('SELECT current_database() name')).rows[0].name, dbName);
  const migrations = path.join(root, 'backend/src/db/migrations');
  for (const file of fs.readdirSync(migrations).filter(f => f.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(migrations, file), 'utf8');
    await db.query(sql);
    migrationManifest.push({ file, sha256: createHash('sha256').update(sql).digest('hex') });
  }
  for (const role of ['QTV', 'RECEPTIONIST', 'PT', 'MEMBER']) await db.query('INSERT INTO roles(role_code,role_name) VALUES($1,$1)', [role]);
  const b1 = randomUUID(), b2 = randomUUID();
  for (const [id, name] of [[b1, 'Business Branch A'], [b2, 'Business Branch B']]) await db.query("INSERT INTO branches(id,branch_code,branch_name,phone,address,open_time,close_time) VALUES($1,$2,$2,'0909999999','Isolated E2E','00:00','23:59')", [id, name]);
  const a = await account('QTV', b1, '0909000001', true), l = await account('RECEPTIONIST', b1, '0909000002'), o = await account('RECEPTIONIST', b2, '0909000003');
  const app = require(path.join(root, 'backend/src/server')); pool = require(path.join(root, 'backend/src/db/postgres')).pool;
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const A = await login(a), L = await login(l), O = await login(o);
  const member = await api('/members', { token: L.access_token, method: 'POST', body: { full_name: 'Business Member A', phone: '0909000010', home_branch_id: b1 } });
  const pt = await api('/pt-bookings/trainers', { token: A.access_token, method: 'POST', body: { full_name: 'Business Trainer A', phone: '0909000020', branch_id: b1, specialties: 'Strength' } });
  const pt2 = await api('/pt-bookings/trainers', { token: A.access_token, method: 'POST', body: { full_name: 'Business Trainer B', phone: '0909000021', branch_id: b2, specialties: 'Strength' } });
  const P = await activate(pt), P2 = await activate(pt2), M = await activate(member);
  async function paid(pkg, owner = member) {
    const r = await api('/registrations', { token: L.access_token, method: 'POST', body: { member_id: owner.id, package_id: pkg.id, start_date: today, sold_branch_id: b1 } });
    await api('/payments', { token: L.access_token, method: 'POST', body: { registration_id: r.id, payment_method: 'CASH' } });
    return r;
  }
  const gym = await api('/packages', { token: A.access_token, method: 'POST', body: { package_name: 'Business Gym', package_type: 'GYM_SESSION', price: 500000, duration_days: 60, total_gym_sessions: 20, branch_ids: [b1] } });
  await paid(gym);
  const pkg = await api('/packages', { token: A.access_token, method: 'POST', body: { package_name: 'Business PT 90', package_type: 'PT_SESSION', price: 1000000, duration_days: 60, total_pt_sessions: 5, session_duration_minutes: 90, branch_ids: [b1] } });
  let registration = await paid(pkg);
  await api(`/registrations/${registration.id}/assign-pt`, { token: L.access_token, method: 'POST', body: { pt_id: pt.id } });
  registration = await api(`/registrations/${registration.id}`, { token: L.access_token });
  let accepted, pending, acceptedGym, acceptedSession;
  if (groupMode) {
    accepted = await api('/members', { token: L.access_token, method: 'POST', body: { full_name: 'Business Accepted Member', phone: '0909000011', home_branch_id: b1 } });
    pending = await api('/members', { token: L.access_token, method: 'POST', body: { full_name: 'Business Pending Member', phone: '0909000012', home_branch_id: b1 } });
    acceptedSession = await activate(accepted);
    acceptedGym = await paid(gym, accepted);
    // Isolated fixture only: membership is setup; bookings and confirmations always use the real API.
    await db.query("UPDATE registrations SET package_mode='GROUP_1_N',group_leader_member_id=$2,max_group_members_snapshot=3 WHERE id=$1", [registration.id, member.id]);
    for (const [person, status] of [[accepted, 'ACCEPTED'], [pending, 'PENDING']]) await db.query('INSERT INTO group_pt_members(registration_id,member_id,inviter_member_id,invitation_status) VALUES($1,$2,$3,$4)', [registration.id, person.id, member.id, status]);
    registration = await api(`/registrations/${registration.id}`, { token: L.access_token });
  }
  fixture = { b1, b2, member, pt, pt2, registration, date, groupMode, accepted, pending, acceptedGym };
  return { ...fixture, A, L, O, P, P2, M, acceptedSession };
}
async function main() {
  const f = await buildFixture(); console.log('Isolated fixture ready:', dbName);
  browser = await chromium.launch({ headless: true });
  phase = 'PT source UI';
  const page = await pageFor(f.P, f.b1, '/mobile/pt/');
  await page.locator('#bottomNav [data-tab="schedule"]').click();
  const create = page.locator('#ptCreateBooking');
  await record(page, create, 'pt-calendar', 'Open authenticated PT calendar', 'PT01-US03 Trigger: own PT can open booking from PT01', async () => { assert(await create.isVisible()); assert.equal(await page.evaluate(() => ptApp.currentUser.pt_profile_id), f.pt.id); return 'Own PT calendar and booking action visible'; });
  await create.click();
  const popup = page.getByRole('dialog', { name: 'Đặt lịch PT', exact: true });
  await page.waitForFunction(() => document.querySelector('[aria-label="PT phụ trách"]')?.value?.includes('Business Trainer A'));
  const save = popup.getByRole('button', { name: 'Đặt lịch', exact: true });
  await record(page, popup, 'booking-modal-open', 'Open booking modal', 'Main Flow 1: real PT/branch readonly; form opens without choices', async () => { assert(await popup.isVisible()); assert.equal(await page.getByLabel('PT phụ trách', { exact: true }).inputValue(), 'Business Trainer A · ' + f.pt.pt_code); return 'Visible popup with own trainer and branch from isolated API'; });
  await record(page, save, 'empty-form-validation', 'Attempt empty-form submission', 'Field specification: save disabled while required inputs missing', async () => { assert(await save.isDisabled()); assert.equal((await db.query('SELECT count(*)::int n FROM pt_bookings')).rows[0].n, 0); return 'Save disabled; zero bookings. No forced validation or synthetic click.'; });
  const dateInput = page.getByLabel('Ngày tập', { exact: true });
  await dateInput.locator('xpath=ancestor::*[contains(@class,"dx-datebox")][1]').locator('.dx-dropdowneditor-button').click();
  if (date.slice(0, 7) !== today.slice(0, 7)) await page.locator('.dx-calendar-navigator-next-month:visible').click();
  const dateCell = page.locator(`.dx-calendar-cell:visible:not(.dx-calendar-other-month)[data-value="${date.replaceAll('-', '/')}"]`).first();
  await record(page, dateCell, 'date-picker-options', 'Open date picker', 'Main Flow 4: choose future working date from calendar', async () => { assert.equal(await dateCell.count(), 1); return await dateCell.innerText(); });
  await dateCell.click();
  await page.waitForLoadState('networkidle');
  await record(page, dateInput, 'date-selected', 'Select future working date', 'Main Flow 4: date picker accepts future working date', async () => { assert.equal(await dateInput.inputValue(), date.split('-').reverse().join('/')); assert.equal(await page.evaluate(() => $('.pt-booking-popup .dx-form').dxForm('instance').option('formData').date), date); return date; });
  await page.getByLabel('Hội viên', { exact: true }).click();
  const memberOption = page.locator('.dx-list-item').filter({ hasText: 'Business Member A' });
  await record(page, memberOption, 'member-options', 'Open assigned-member dropdown', 'Main Flow 2: assigned members from API', async () => { assert.equal(await memberOption.count(), 1); return await memberOption.innerText(); });
  await memberOption.click();
  const regInput = page.getByLabel('Gói PT sử dụng', { exact: true });
  await regInput.waitFor();
  await page.waitForFunction(() => !$('.pt-booking-popup .dx-form').dxForm('instance').getEditor('registration_id').option('disabled'));
  await record(page, regInput, 'member-selected-contract-enabled', 'Select assigned member', 'Main Flow 3: contract choices enabled for selected member', async () => { assert(!(await regInput.isDisabled())); return await page.getByLabel('Hội viên', { exact: true }).inputValue(); });
  await regInput.click();
  const regOption = page.locator('.dx-list-item').filter({ hasText: 'Business PT 90' });
  await record(page, regOption, 'contract-options', 'Open contract dropdown', 'Main Flow 3: paid assigned contract has remaining sessions', async () => regOption.innerText());
  await regOption.click();
  if (groupMode) {
    const participants = page.getByLabel('Thành viên tham gia', { exact: true });
    await page.waitForFunction(() => document.querySelector('[aria-label="Thành viên tham gia"]')?.value.includes('Business Accepted Member'));
    await record(page, participants, 'group-participants-readonly', 'Inspect accepted participants after contract selection', 'PT01-US03 Main Flow 3: leader plus all ACCEPTED; PENDING excluded; no individual selection', async () => {
      const value = await participants.inputValue();
      assert(value.includes(f.member.full_name) && value.includes(f.accepted.full_name) && value.includes('Trưởng nhóm'));
      assert(!value.includes(f.pending.full_name)); assert(await participants.evaluate(el => el.readOnly));
      return value;
    });
  }
  await record(page, page.getByLabel('Thời lượng buổi tập', { exact: true }), 'contract-duration', 'Select paid assigned contract', 'Main Flow 4: duration comes from API contract and is readonly', async () => { assert.equal(await page.getByLabel('Thời lượng buổi tập', { exact: true }).inputValue(), '90 phút'); return '90 minutes; contract selected'; });
  await page.getByLabel('Giờ bắt đầu', { exact: true }).fill('08:00');
  await record(page, page.getByLabel('Giờ kết thúc', { exact: true }), 'time-derived', 'Enter 08:00 start time', 'Main Flow 4: 90 minutes produces readonly 09:30 end', async () => { assert.equal(await page.getByLabel('Giờ kết thúc', { exact: true }).inputValue(), '09:30'); return '08:00 - 09:30'; });
  await page.getByLabel('Ghi chú cho buổi (không bắt buộc)', { exact: true }).fill('business-20260920 own PT UI booking');
  await page.getByLabel('Ghi chú cho buổi (không bắt buộc)', { exact: true }).press('Tab');
  await record(page, popup, 'presubmit-filled-form', 'Review filled form before submit', 'Main Flow 5: chosen member, contract, date/time and note visible before save', async () => { assert(await save.isEnabled()); const data = await page.locator('.pt-booking-popup .dx-form').evaluate(el => $(el).dxForm('instance').option('formData')); assert.equal(data.date, date); assert.equal(data.note, 'business-20260920 own PT UI booking'); assert.equal(data.member_id, f.member.id); assert.equal(data.registration_id, f.registration.id); return data; });
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: width > 800 ? 900 : 844 });
    await record(page, popup, `booking-modal-responsive-${width}`, `Inspect filled booking modal at ${width}px`, 'Requested responsive nonoverlap: modal in viewport, content stays above action toolbar', async () => {
      const box = await popup.boundingBox(); const viewport = page.viewportSize();
      assert(box.x >= 0 && box.x + box.width <= viewport.width + 1 && box.y >= 0 && box.y + box.height <= viewport.height + 1);
      const content = await popup.locator('.dx-popup-content').first().boundingBox(), toolbar = await popup.locator('.dx-popup-bottom').boundingBox();
      assert(content.y + content.height <= toolbar.y + 1, 'Content overlaps save toolbar');
      return { box, content, toolbar };
    }, 'state');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  if (groupMode) {
    phase = 'Expired participant Gym rejection';
    const before = await counters(f.registration.id);
    const countBefore = (await db.query('SELECT count(*)::int n FROM pt_bookings')).rows[0].n;
    await db.query('UPDATE registrations SET end_date=$2 WHERE id=$1', [f.acceptedGym.id, today]);
    const rejectedPromise = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/pt-bookings') && r.request().method() === 'POST');
    await save.click();
    const rejected = await rejectedPromise; const rejectedBody = await rejected.json();
    const rejection = popup.locator('.pt-booking-message');
    await page.waitForFunction(message => document.querySelector('.pt-booking-message')?.textContent === message, rejectedBody.message);
    await record(page, rejection, 'expired-gym-blocks-whole-group', 'Submit while accepted participant Gym expires before booking date', 'PT01-US03 EF-02: reject whole group, retain input, no booking or session deduction', async () => {
      assert.equal(rejected.status(), 409, JSON.stringify(rejectedBody));
      assert(JSON.stringify(rejectedBody).includes('GROUP_GYM_REQUIRED'));
      assert(await popup.isVisible()); assert.equal(await rejection.innerText(), rejectedBody.message);
      assert.deepEqual(await counters(f.registration.id), before);
      assert.equal((await db.query('SELECT count(*)::int n FROM pt_bookings')).rows[0].n, countBefore);
      return { status: rejected.status(), payload: rejectedBody, counters: before };
    });
    await db.query('UPDATE registrations SET end_date=$2 WHERE id=$1', [f.acceptedGym.id, f.acceptedGym.end_date]);
    await record(page, popup, 'gym-restored-input-retained', 'Restore isolated participant entitlement and review retained form', 'EF-02 adjustment: unchanged form is ready to retry with valid Gym', async () => { assert(await save.isEnabled()); assert.equal(await page.getByLabel('Giờ bắt đầu', { exact: true }).inputValue(), '08:00'); return 'Gym expiry restored in isolated fixture; form retains 08:00 start and selected contract'; });
  }
  phase = 'Real booking POST';
  const responsePromise = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/pt-bookings') && r.request().method() === 'POST');
  await save.click();
  const response = await responsePromise; const result = await response.json();
  assert.equal(response.status(), 200, JSON.stringify(result)); booking = result.data;
  checks.push({ name: 'Actual browser booking POST', status: 'PASS', actual: { status: response.status(), body: response.request().postDataJSON(), bookingId: booking.id } });
  await popup.waitFor({ state: 'hidden' });
  const ownCard = page.locator(`[data-booking-id="${booking.id}"]`).first();
  await record(page, ownCard, 'booking-success-own-calendar', 'Submit booking and view own calendar', 'Main Flow 8-9: real POST creates booking, closes modal, selects date and refreshes calendar', async () => { assert(await ownCard.isVisible()); const text = await ownCard.innerText(); assert(text.includes('Business Member A')); return `booking_id=${booking.id}; ${text}`; });
  phase = 'State and scope checks';
  const row = (await db.query('SELECT * FROM registrations WHERE id=$1', [f.registration.id])).rows[0];
  assert.equal(row.remaining_pt_sessions, 4); assert.equal(row.booked_pt_sessions, 1); assert.equal(row.used_pt_sessions, 0);
  if (groupMode) {
    const details = await api(`/pt-bookings/${booking.id}`, { token: f.P.access_token });
    assert.deepEqual(details.participants.map(p => p.member_id).sort(), [f.member.id, f.accepted.id].sort());
    assert.equal(details.participants.find(p => p.is_leader).member_id, f.member.id);
    checks.push({ name: 'Immutable participants from actual booking POST/detail', status: 'PASS', actual: { bookingId: booking.id, participants: details.participants, post: response.request().postDataJSON() } });
    await record(page, ownCard, 'group-card-participants', 'Inspect created group booking card', 'PT01-US01: readonly snapshot includes leader and accepted member, excludes pending', async () => { const text = await ownCard.innerText(); assert(text.includes(f.member.full_name) && text.includes(f.accepted.full_name)); assert(!text.includes(f.pending.full_name)); return text; }, 'state');
  }
  checks.push({ name: 'Atomic reservation counters', status: 'PASS', actual: 'remaining=4, booked=1, used=0; total=5' });
  const body = { registration_id: f.registration.id, member_id: f.member.id, pt_id: f.pt.id, branch_id: f.b1, booking_date: date, start_time: '10:00', end_time: '11:30', session_duration_minutes: 90 };
  for (const [name, token, change] of [['PT2 attempts PT1 contract', f.P2.access_token, {}], ['PT1 forges PT2 id', f.P.access_token, { pt_id: f.pt2.id }], ['PT1 forges foreign branch', f.P.access_token, { branch_id: f.b2 }]]) {
    const before = (await db.query('SELECT count(*)::int n FROM pt_bookings')).rows[0].n;
    const r = await fetch(base + '/pt-bookings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...body, ...change }) });
    const value = await r.json(); const after = (await db.query('SELECT count(*)::int n FROM pt_bookings')).rows[0].n;
    const ok = [400, 403, 404, 409].includes(r.status) && after === before;
    checks.push({ name, status: ok ? 'PASS' : 'FAIL', actual: { status: r.status, body: value, before, after } });
    if (!ok) issues.push(`${name}: ${r.status}, booking count ${before}->${after}`);
  }
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 800 ? 900 : 844 });
    await record(page, ownCard, `responsive-${width}`, `Inspect PT calendar at ${width}px`, 'Requested responsive nonoverlap: card and fixed navigation do not intersect; no page overflow', async () => {
      const card = await ownCard.boundingBox(), nav = await page.locator('#bottomNav').boundingBox();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert(!overflow, 'Horizontal document overflow'); assert(card.y + card.height <= nav.y || card.x >= nav.x + nav.width || nav.x >= card.x + card.width, 'Booking card overlaps bottom navigation');
      return { card, nav, overflow };
    }, 'state');
  }
  phase = 'Downstream member UI';
  const hv = await pageFor(f.M, f.b1, '/mobile/member/#schedule');
  await hv.waitForFunction(() => window.MemberApp?.navigate);
  await hv.evaluate(() => MemberApp.navigate('schedule', 'mine'));
  await hv.waitForLoadState('networkidle');
  const hvCard = hv.locator(`[data-booking-id="${booking.id}"]`);
  await record(hv, hvCard, 'downstream-hv-same-booking', 'Open authenticated member training schedule', 'Main Flow 9: same created booking visible to its member', async () => { assert(!hv.url().endsWith('/mobile/')); assert(await hvCard.isVisible()); const text = await hvCard.innerText(); assert(text.includes('08:00 - 09:30')); assert(text.includes('Business Member A')); return `booking_id=${booking.id}; ${text}`; }, 'downstream');
  if (groupMode) await acceptedDownstream(f, booking.id, false);
  phase = 'Downstream receptionist UI';
  const lt = await pageFor(f.L, f.b1, '/web/#pt-schedule', { width: 1440, height: 900 });
  await lt.waitForFunction(() => window.ParadiseApp?.getCurrentUser());
  await lt.evaluate(({ date, pt, booking }) => ParadiseApp.navigateTo('pt-schedule', { date, pt_id: pt, booking_id: booking }), { date, pt: f.pt.id, booking: booking.id });
  const ltDetail = lt.locator('.dx-popup-content:visible').filter({ hasText: 'Business Member A' }).first();
  await record(lt, ltDetail, 'downstream-lt-same-booking', 'Open same booking in receptionist schedule', 'Main Flow 9: same booking appears in authorized branch Web UI', async () => { assert(await ltDetail.isVisible()); return `booking_id=${booking.id}; ${await ltDetail.innerText()}`; }, 'downstream');
  if (!(await ltDetail.innerText()).includes('Business PT 90')) checks.push({ name: 'Out-of-scope LT display observation', status: 'OBSERVATION', actual: 'Same booking/calendar identity verified, but detail package value is -- while calendar shows Business PT 90. Forward to Web owner; no source edit.' });
  const otherLt = await pageFor(f.O, f.b2, '/web/#pt-schedule', { width: 1440, height: 900 });
  await otherLt.waitForFunction(() => window.ParadiseApp?.getCurrentUser() && $('#ptSelector').dxSelectBox('instance')?.option('disabled') === false);
  await otherLt.locator('#ptSelector').click();
  const otherOption = otherLt.locator('.dx-list-item').filter({ hasText: 'Business Trainer B' });
  await record(otherLt, otherOption, 'branch-b-trainer-scope', 'Open Branch B receptionist trainer choices', 'EF-01 and branch scope: Branch B cannot see Branch A trainer/booking', async () => { assert(await otherOption.isVisible()); assert.equal(await otherLt.locator('.dx-list-item').filter({ hasText: 'Business Trainer A' }).count(), 0); return 'Branch B trainer visible; Branch A trainer absent'; }, 'downstream');
  report();
  story = 'PT01-US02'; output = prepareOutput(story);
  steps = []; issues = []; checks = []; phase = 'Confirmation fixture';
  await confirmFlow(f);
}
async function counters(registrationId) {
  return (await db.query('SELECT remaining_pt_sessions,booked_pt_sessions,used_pt_sessions,total_pt_sessions_snapshot FROM registrations WHERE id=$1', [registrationId])).rows[0];
}
async function acceptedDownstream(f, id, completed) {
  const page = await pageFor(f.acceptedSession, f.b1, '/mobile/member/#schedule');
  await page.waitForFunction(() => window.MemberApp?.navigate);
  await page.evaluate(() => MemberApp.navigate('schedule', 'mine'));
  const card = page.locator(`[data-booking-id="${id}"]`);
  await card.waitFor({ state: 'visible' });
  const commands = card.getByRole('button', { name: /Xác nhận|Hủy/ });
  const target = await commands.count() ? commands.last() : card;
  await record(page, target, 'accepted-member-same-booking', 'Open accepted nonleader schedule for same booking', 'PT01-US01/03: snapshot participant can view same booking, only leader may confirm or cancel', async () => {
    assert(await card.isVisible()); const text = await card.innerText();
    assert(text.includes('Business Member A'));
    if (completed) assert(text.includes('Đã hoàn thành'));
    const actions = await commands.evaluateAll(elements => elements.map(el => ({ text: el.textContent.trim(), disabled: el.disabled || el.getAttribute('aria-disabled') === 'true' })));
    assert(actions.every(action => action.disabled), `Nonleader ${f.accepted.id} viewing booking ${id} has enabled actions: ${JSON.stringify(actions)}; card: ${text}`);
    return { bookingId: id, viewer: f.accepted.id, text };
  }, 'downstream');
  const before = await counters(f.registration.id);
  const storedBefore = (await db.query('SELECT * FROM pt_bookings WHERE id=$1', [id])).rows[0];
  for (const suffix of ['member-confirm', 'cancel']) {
    const response = await fetch(`${base}/pt-bookings/${id}/${suffix}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${f.acceptedSession.access_token}` }, body: JSON.stringify(suffix === 'cancel' ? { reason: 'Nonleader denied test' } : {}) });
    const payload = await response.json();
    const ok = response.status === 403;
    checks.push({ name: `Nonleader ${suffix} denied`, status: ok ? 'PASS' : 'FAIL', actual: { bookingId: id, memberId: f.accepted.id, status: response.status, payload } });
    if (!ok) issues.push(`Nonleader ${suffix}: expected 403, actual ${response.status}`);
    assert.deepEqual(await counters(f.registration.id), before);
    assert.deepEqual((await db.query('SELECT * FROM pt_bookings WHERE id=$1', [id])).rows[0], storedBefore);
  }
}
async function confirmFlow(f) {
  let pastDate = new Date(Date.parse(today) - 86400000).toISOString().slice(0, 10);
  while ([0, 6].includes(new Date(pastDate).getUTCDay())) pastDate = new Date(Date.parse(pastDate) - 86400000).toISOString().slice(0, 10);
  const historical = await api('/pt-bookings', { token: f.P.access_token, method: 'POST', body: { registration_id: f.registration.id, member_id: f.member.id, pt_id: f.pt.id, branch_id: f.b1, booking_date: date, start_time: '10:00', end_time: '11:30', session_duration_minutes: 90 } });
  // Retain the real API snapshot and reservation while making all entitlements historically valid.
  assert.equal((await db.query('SELECT current_database() name')).rows[0].name, dbName);
  const identity = (await db.query('SELECT member_id,registration_id,participants_snapshot_xid FROM pt_bookings WHERE id=$1', [historical.id])).rows[0];
  const snapshot = (await db.query('SELECT * FROM pt_booking_participants WHERE booking_id=$1 ORDER BY member_id', [historical.id])).rows;
  const participantIds = snapshot.length ? snapshot.map(p => p.member_id) : [f.member.id];
  const relevant = (await db.query("SELECT id FROM registrations WHERE id=$1 OR (member_id=ANY($2::uuid[]) AND package_type_snapshot IN ('GYM_TIME','GYM_SESSION','GYM_SESSIONS','COMBO','COMBO_GYM_PT'))", [f.registration.id, participantIds])).rows.map(r => r.id);
  const paidAt = `${pastDate}T07:00:00+07:00`;
  await db.query('BEGIN');
  try {
    await db.query('UPDATE registrations SET end_date=end_date-($3::date-$2::date),start_date=$2,created_at=LEAST(created_at,$4::timestamptz),updated_at=$4 WHERE id=ANY($1::uuid[])', [relevant, pastDate, today, paidAt]);
    // Only historical fixture timestamps bypass this payment guard, never the snapshot guards.
    await db.query('ALTER TABLE payments DISABLE TRIGGER completed_payment_immutable');
    await db.query("UPDATE payments SET created_at=$2,confirmed_at=$2,updated_at=$2 WHERE registration_id=ANY($1::uuid[])", [relevant, paidAt]);
    await db.query('ALTER TABLE payments ENABLE TRIGGER completed_payment_immutable');
    await db.query('UPDATE receipts SET issued_at=$2 WHERE payment_id IN (SELECT id FROM payments WHERE registration_id=ANY($1::uuid[]))', [relevant, paidAt]);
    await db.query('UPDATE pt_bookings SET booking_date=$2 WHERE id=$1', [historical.id, pastDate]);
    await db.query('COMMIT');
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  assert.equal((await db.query("SELECT tgenabled FROM pg_trigger WHERE tgrelid='payments'::regclass AND tgname='completed_payment_immutable'")).rows[0].tgenabled, 'O');
  assert.deepEqual((await db.query('SELECT member_id,registration_id,participants_snapshot_xid FROM pt_bookings WHERE id=$1', [historical.id])).rows[0], identity);
  assert.deepEqual((await db.query('SELECT * FROM pt_booking_participants WHERE booking_id=$1 ORDER BY member_id', [historical.id])).rows, snapshot);
  const entitlements = (await db.query('SELECT id,member_id,package_type_snapshot,start_date,end_date FROM registrations WHERE id=ANY($1::uuid[])', [relevant])).rows;
  assert(entitlements.every(r => r.start_date <= pastDate && (!r.end_date || r.end_date >= pastDate)));
  for (const id of participantIds) assert(entitlements.some(r => r.member_id === id && r.id !== f.registration.id), `Historical Gym missing for ${id}`);
  const payments = (await db.query('SELECT p.id,p.registration_id,p.created_at,p.confirmed_at,rc.issued_at FROM payments p JOIN receipts rc ON rc.payment_id=p.id WHERE p.registration_id=ANY($1::uuid[])', [relevant])).rows;
  assert.equal(payments.length, relevant.length);
  assert(payments.every(p => new Date(p.confirmed_at) <= new Date(`${pastDate}T10:00:00+07:00`) && +new Date(p.confirmed_at) === +new Date(p.issued_at)));
  checks.push({ name: 'Historical entitlement/payment consistency and unchanged participant snapshot', status: 'PASS', actual: { entitlements, payments, identity, snapshot } });
  booking = { ...historical, booking_date: pastDate };
  fixture = { ...fixture, confirmationFixture: { bookingId: historical.id, pastDate, entitlementIds: relevant, paidAt, setup: 'Second booking created through real PT API. Isolated SQL moves booking date to previous working day; shifts linked PT and every snapshot participant Gym validity window together, preserving duration; aligns completed payment created/confirmed timestamps and receipt issued_at to 07:00 before the 10:00 session. Booking owner, registration, transaction marker and all participant snapshot rows remain byte-for-byte equivalent as asserted. No fabricated confirmation/counters or UI clock override; actual UI confirmation remains under test. Original PT01-US03 booking stays future.' } };
  fixture.confirmationFixture.paymentGuard = 'Only completed_payment_immutable temporarily disabled inside isolated fixture transaction for timestamp adjustment, then re-enabled and asserted before UI confirmation. All other constraints and all participant snapshot guards remain active.';
  assert.deepEqual(await counters(f.registration.id), { remaining_pt_sessions: 3, booked_pt_sessions: 2, used_pt_sessions: 0, total_pt_sessions_snapshot: 5 });
  checks.push({ name: 'Documented past fixture baseline', status: 'PASS', actual: await counters(f.registration.id) });
  phase = 'PT confirmation UI';
  const ptPage = await pageFor(f.P, f.b1, '/mobile/pt/');
  await ptPage.locator('#bottomNav [data-tab="schedule"]').click();
  await ptPage.locator('#ptCreateBooking').waitFor();
  await record(ptPage, ptPage.locator('#view-schedule'), 'open-confirmation-calendar', 'Open PT schedule from overview', 'PT01-US02 Trigger: authenticated PT selects schedule before finding a session', async () => { assert.equal(await ptPage.evaluate(() => ptApp.currentTab), 'schedule'); return 'Own PT calendar visible'; });
  if (pastDate.slice(0, 7) !== today.slice(0, 7)) await ptPage.locator('#btnPrevMonth').click();
  const dateChip = ptPage.locator(`.pt-date-chip[data-date="${pastDate}"]`);
  await dateChip.click();
  const card = ptPage.locator(`.pt-slot-card[data-booking-id="${historical.id}"]`);
  await record(ptPage, card, 'past-session-calendar', 'Select past working-day session', 'PT01-US02 Preconditions: assigned session has ended and neither party confirmed', async () => { assert(await card.isVisible()); assert(await card.locator('.btn-confirm-trigger').isEnabled()); return `booking_id=${historical.id}; ${await card.innerText()}`; });
  await card.locator('.btn-confirm-trigger').click();
  const popup = ptPage.getByRole('dialog', { name: 'Ghi nhận kết quả buổi PT', exact: true });
  await record(ptPage, popup, 'pt-confirmation-modal', 'Open PT confirmation modal', 'Main Flow 2-3: session/member/package prefill and completion result', async () => { assert(await popup.isVisible()); const text = await popup.innerText(); assert(text.includes('Business Member A')); assert(text.includes('Business PT 90')); assert(text.includes('10:00')); return text; });
  const note = 'Squat 3x10; completed with stable form; recovery advised.';
  const notes = ptPage.locator('#dxFitnessNotesInput');
  await notes.fill(note);
  await record(ptPage, notes, 'pt-notes-before-submit', 'Enter workout assessment before saving', 'Main Flow 4: optional PT notes retained in input before submit', async () => { assert.equal(await notes.inputValue(), note); return note; });
  const ptResponse = ptPage.waitForResponse(r => new URL(r.url()).pathname.endsWith(`/${historical.id}/pt-confirm`) && r.request().method() === 'POST');
  await popup.getByRole('button', { name: 'Lưu kết quả', exact: true }).click();
  const saved = await ptResponse; assert.equal(saved.status(), 200, await saved.text());
  await popup.waitFor({ state: 'hidden' });
  await ptPage.waitForFunction(id => { const b = ParadisePTSchedule.getState().bookings.find(x => x.id === id); return b?.ptConfirmed && !b.memberConfirmed; }, historical.id);
  await record(ptPage, card, 'pt-confirmed-awaiting-member', 'Save PT result and view pending member state', 'Main Flow 6-8: PT-only confirmation waits for member and does not consume another session', async () => { assert(await card.isVisible()); assert.equal(await card.locator('.btn-confirm-trigger:visible').count(), 0); return await card.innerText(); });
  let stored = (await db.query('SELECT * FROM pt_bookings WHERE id=$1', [historical.id])).rows[0];
  assert(stored.pt_confirmed_at); assert.equal(stored.member_confirmed_at, null); assert.equal(stored.workout_notes, note); assert.equal(stored.is_deducted, false);
  assert.deepEqual(await counters(f.registration.id), { remaining_pt_sessions: 3, booked_pt_sessions: 2, used_pt_sessions: 0, total_pt_sessions_snapshot: 5 });
  checks.push({ name: 'After PT-only confirmation', status: 'PASS', actual: { status: stored.status, notes: stored.workout_notes, counters: await counters(f.registration.id) } });
  phase = 'Downstream member confirmation';
  const hvPage = await pageFor(f.M, f.b1, '/mobile/member/#schedule');
  await hvPage.waitForFunction(() => window.MemberApp?.navigate);
  await hvPage.evaluate(() => MemberApp.navigate('schedule', 'mine'));
  const memberCard = hvPage.locator(`[data-booking-id="${historical.id}"]`);
  await record(hvPage, memberCard, 'hv-awaiting-confirmation', 'Open same member session after PT confirms', 'Main Flow 7: same booking awaits member confirmation', async () => { assert(await memberCard.isVisible()); const text = await memberCard.innerText(); assert(text.includes('PT đã xác nhận')); return `booking_id=${historical.id}; ${text}`; }, 'downstream');
  if (groupMode) await acceptedDownstream(f, historical.id, false);
  await memberCard.getByRole('button', { name: 'Xác nhận hoàn thành ngay', exact: true }).click();
  const memberDialog = hvPage.getByRole('dialog');
  await record(hvPage, memberDialog, 'hv-confirmation-modal', 'Open member confirmation dialog', 'Main Flow 7: same member confirms their completed session', async () => { assert(await memberDialog.isVisible()); return await memberDialog.innerText(); }, 'downstream');
  const memberResponse = hvPage.waitForResponse(r => new URL(r.url()).pathname.endsWith(`/${historical.id}/member-confirm`) && r.request().method() === 'POST');
  await memberDialog.getByRole('button', { name: 'Xác nhận hoàn thành', exact: true }).click();
  const completed = await memberResponse; assert.equal(completed.status(), 200, await completed.text());
  await memberDialog.waitFor({ state: 'hidden' });
  await hvPage.waitForFunction(id => document.querySelector(`[data-booking-id="${id}"]`)?.textContent.includes('Đã hoàn thành'), historical.id);
  await record(hvPage, memberCard, 'hv-dual-confirmed-completed', 'Submit member confirmation', 'Main Flow 7: dual confirmation completes exactly the same booking', async () => { const text = await memberCard.innerText(); assert(text.includes('Đã hoàn thành')); return text; }, 'downstream');
  stored = (await db.query('SELECT * FROM pt_bookings WHERE id=$1', [historical.id])).rows[0];
  assert.equal(stored.status, 'COMPLETED'); assert(stored.pt_confirmed_at && stored.member_confirmed_at && stored.is_deducted);
  const finalCounters = await counters(f.registration.id);
  assert.deepEqual(finalCounters, { remaining_pt_sessions: 3, booked_pt_sessions: 1, used_pt_sessions: 1, total_pt_sessions_snapshot: 5 });
  checks.push({ name: 'After both confirmations: no second remaining deduction', status: 'PASS', actual: finalCounters });
  if (groupMode) await acceptedDownstream(f, historical.id, true);
  phase = 'PT and receptionist completed state';
  await ptPage.locator('#bottomNav [data-tab="schedule"]').click();
  await ptPage.waitForFunction(id => ParadisePTSchedule.getState().bookings.find(x => x.id === id)?.status === 'DONE', historical.id);
  await record(ptPage, card, 'pt-dual-confirmation-refresh', 'Refresh PT calendar after member confirms', 'Main Flow 8: completed card readonly and persisted PT notes visible', async () => { assert(await card.isVisible()); const text = await card.innerText(); assert(text.includes(note)); assert.equal(await card.locator('.btn-confirm-trigger:visible').count(), 0); return text; }, 'state');
  const ltPage = await pageFor(f.L, f.b1, '/web/#pt-schedule', { width: 1440, height: 900 });
  await ltPage.waitForFunction(() => window.ParadiseApp?.getCurrentUser());
  await ltPage.evaluate(({ date, pt, booking }) => ParadiseApp.navigateTo('pt-schedule', { date, pt_id: pt, booking_id: booking }), { date: pastDate, pt: f.pt.id, booking: historical.id });
  const detail = ltPage.locator('.dx-popup-content:visible').filter({ hasText: 'Business Member A' }).first();
  await record(ltPage, detail, 'lt-completed-same-session', 'Open completed booking in receptionist UI', 'Cross-role synchronization: same session completed and notes retained', async () => { assert(await detail.isVisible()); const text = await detail.innerText(); assert(text.includes(note)); return `booking_id=${historical.id}; ${text}`; }, 'downstream');
  phase = 'AF-03 repeated confirmation API checks';
  const beforeRetry = (await db.query('SELECT * FROM pt_bookings WHERE id=$1', [historical.id])).rows[0];
  for (const [suffix, token] of [['pt-confirm', f.P.access_token], ['member-confirm', f.M.access_token]]) {
    const response = await fetch(`${base}/pt-bookings/${historical.id}/${suffix}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(suffix === 'pt-confirm' ? { workout_notes: note } : {}) });
    const payload = await response.json();
    assert.deepEqual(await counters(f.registration.id), finalCounters);
    assert.deepEqual((await db.query('SELECT * FROM pt_bookings WHERE id=$1', [historical.id])).rows[0], beforeRetry);
    const ok = response.status === 200;
    checks.push({ name: `AF-03 retry ${suffix}`, status: ok ? 'PASS' : 'FAIL', actual: { status: response.status, payload, counters: finalCounters } });
    if (!ok) issues.push(`AF-03 ${suffix}: expected 200 with current state; actual HTTP ${response.status}. Counters remain correct, so no duplicate deduction. Main PT/member confirmation UI flow passed. Backend source left unchanged.`);
  }
  checks.push({ name: 'Repeated confirmations do not deduct twice', status: 'PASS', actual: finalCounters });
  if (!(await detail.innerText()).includes('Business PT 90')) checks.push({ name: 'Out-of-scope LT display observation', status: 'OBSERVATION', actual: 'Booking detail package value is --; calendar has Business PT 90. Same booking, notes, completion and timestamps verified.' });
}
function reportBase() {
  const result = issues.length ? (booking ? 'FAIL' : 'BLOCKED') : 'PASS';
  const render = section => steps.filter(s => s.section === section).map(s => `### ${s.action}\n\n- Action / Input: ${s.action}\n- Expected Result: ${s.expected}\n- Actual Result: ${s.actual}\n- Status: **${s.status}**\n\n![${s.action}](./${s.filename})\n`).join('\n');
  fs.writeFileSync(path.join(output, `${story}-test.md`), `# ${story} - Isolated real UI business E2E\n\nRun: ${new Date().toISOString()}\n\nSources: docs/user-stories/pt/PT01-Lịch/${story} story (Main Flow, Field specification, Alternate/Exception Flows); docs/product-spec.md sections 4.2-4.6.\n\nDatabase: ${dbName}; frontend: http://localhost:3000; real backend: ${base}. Browser requests redirected with route.continue, no response mocks. Real API auth sessions. Shared configured DB receives no application writes. Scope: test artifacts only; mailbox/skill/source files unchanged by this runner.\n\nAll migrations present at startup applied: ${migrationManifest.map(m => m.file).join(', ')}. Hashes recorded in results.json. No group booking fixture.\n\nFixture: ${JSON.stringify(fixture)}\n\n## Source Action Verification\n\n${render('source')}\n## State Verification\n\n${checks.map(c => `- **${c.status}** ${c.name}: ${JSON.stringify(c.actual)}`).join('\n')}\n\n${render('state')}\n## Cross-Role / Downstream Verification\n\n${render('downstream') || 'BLOCKED: source/setup did not reach downstream checks.'}\n\n## Issues Found\n\n${issues.map(x => '- ' + x).join('\n') || 'None detected in executed checks.'}\n\n## Final Result\n\n**${result}**. ${steps.filter(s => s.status === 'PASS').length}/${steps.length} UI steps passed. Last phase: ${phase}. Scope is the recorded scenarios, not complete acceptance of every exception flow.\n\nRun: node tests/e2e/pt/business-20260920.cjs\n`);
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ result, migrationManifest, fixture, booking, steps, checks, issues, requests, screenshots: steps.map(s => ({ file: s.filename, sha256: createHash('sha256').update(fs.readFileSync(path.join(output, s.filename))).digest('hex') })) }, null, 2));
  console.log('RESULT', result, 'REPORT', output);
  if (issues.length) process.exitCode = 1;
}
function report() {
  reportBase();
  const resultPath = path.join(output, 'results.json');
  const data = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  if (blocked) data.result = 'BLOCKED';
  data.pageErrors = pageErrors;
  data.groupMode = groupMode;
  const history = path.join(output, 'history');
  data.priorRuns = fs.existsSync(history) ? fs.readdirSync(history) : [];
  fs.writeFileSync(resultPath, JSON.stringify(data, null, 2));
  const reportPath = path.join(output, `${story}-test.md`);
  let markdown = fs.readFileSync(reportPath, 'utf8').replace('No group booking fixture.', groupMode ? 'Group fixture: leader + ACCEPTED member; PENDING member excluded. SQL fixture setup is confined to the new isolated database. Participant Gym expiry is temporarily changed only for EF-02.' : 'Individual booking fixture.');
  if (blocked) markdown = markdown.replace(/\*\*(PASS|FAIL)\*\*\. (\d+\/\d+ UI steps passed)/, '**BLOCKED**. $2');
  markdown += `\nBrowser page errors: ${JSON.stringify(pageErrors)}\n\nPrior run evidence (retained before rerun):\n${data.priorRuns.map(run => `- [${run}](./history/${run}/${story}-test.md)`).join('\n') || 'No prior run in this folder.'}\n\nGroup mode: ${groupMode}. Run with PT_E2E_GROUP=1 for group coverage.\n`;
  fs.writeFileSync(reportPath, markdown);
}
main().catch(async error => {
  blocked = true;
  issues.push(`${phase}: ${error.stack}`); console.error(error);
  if (activePage && !activePage.isClosed()) {
    console.log('BLOCKER DOM:', (await activePage.locator('body').innerText()).slice(-9000));
    await record(activePage, activePage.locator('body'), 'blocker', `Blocked at ${phase}`, 'Complete the requested real UI flow', async () => { throw error; }, phase.startsWith('Downstream') ? 'downstream' : 'source').catch(() => {});
  }
}).finally(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await pool?.end(); await db?.end();
  if (created) { await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [dbName]); await admin.query(`DROP DATABASE "${dbName}"`); }
  await admin?.end(); report();
});

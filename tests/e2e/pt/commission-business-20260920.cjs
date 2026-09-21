const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
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
const output = path.join(__dirname, 'PT06-US02/commission-navigation-20260921');
if (fs.existsSync(path.join(output, 'results.json'))) {
  const archive = path.join(output, 'history', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(archive, { recursive: true });
  for (const file of fs.readdirSync(output, { withFileTypes: true })) {
    if (file.isFile()) fs.copyFileSync(path.join(output, file.name), path.join(archive, file.name));
  }
}
  fs.mkdirSync(output, { recursive: true });
const password = 'Isolated-Test-Password9';
const now = new Date(Date.now() + 7 * 3600000);
const year = now.getUTCFullYear(), month = now.getUTCMonth() + 1;
const period = `${year}-${String(month).padStart(2, '0')}`;
const previous = new Date(Date.UTC(year, month - 2, 1));
const legacyPeriod = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
const emptyPeriod = `${year}-01`;
const steps = [], state = [], issues = [], requests = [], responses = [], migrations = [], pageErrors = [];
const cleanup = {};
let admin, db, pool, server, browser, base, created = false, activePage, blocked = false, fixture;
const hash = data => createHash('sha256').update(data).digest('hex');
const watched = ['backend/src/modules/core/commissions.js', 'backend/src/db/migrations/012_pt_commission_session_snapshot.sql', 'frontend/mobile/pt/js/overview.js'];
const sources = Object.fromEntries(watched.map(f => [f, hash(fs.readFileSync(path.join(root, f)))]));
async function api(url, token, method = 'GET', body, expected = 200) {
  const response = await fetch(base + '/api/v1' + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const json = await response.json();
  assert.equal(response.status, expected, `${method} ${url}: ${JSON.stringify(json)}`);
  return json.data ?? json;
}
async function setup() {
  const served = await (await fetch('http://localhost:3000/mobile/pt/js/overview.js')).text();
  assert.equal(served.replace(/\r\n/g, '\n'), fs.readFileSync(path.join(root, watched[2]), 'utf8').replace(/\r\n/g, '\n'), 'Frontend must serve E:/Desktop/para');
  admin = new Client({ connectionString: originalUrl }); await admin.connect();
  await admin.query(`CREATE DATABASE "${dbName}"`); created = true;
  const isolated = new URL(originalUrl); isolated.pathname = '/' + dbName;
  process.env.DATABASE_URL = isolated.toString(); process.env.NODE_ENV = 'test'; process.env.AUTH_OTP_MODE = 'development';
  db = new Client({ connectionString: isolated.toString() }); await db.connect();
  assert.equal((await db.query('SELECT current_database() name')).rows[0].name, dbName);
  const dir = path.join(root, 'backend/src/db/migrations');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8'); await db.query(sql); migrations.push({ file, sha256: hash(sql) });
  }
  for (const role of ['QTV', 'PT', 'MEMBER', 'RECEPTIONIST']) await db.query('INSERT INTO roles(role_code,role_name) VALUES($1,$1)', [role]);
  const branches = [randomUUID(), randomUUID()];
  for (let i = 0; i < 2; i++) {
    await db.query("INSERT INTO branches(id,branch_code,branch_name,phone,address,open_time,close_time) VALUES($1,$2,$2,'0909999999','Isolated commission E2E','00:00','23:59')", [branches[i], `Commission Branch ${i ? 'B' : 'A'}`]);
    const config = (await db.query("UPDATE pt_commission_configs SET commission_percentage=25,effective_from='2025-01-01T00:00:00+07:00' WHERE branch_id=$1 AND pt_id IS NULL RETURNING id", [branches[i]])).rows[0];
    assert(config, 'Branch trigger creates default commission config');
    await db.query("UPDATE pt_commission_config_history SET commission_percentage=25,effective_from='2025-01-01T00:00:00+07:00' WHERE config_id=$1", [config.id]);
  }
  const ownerId = randomUUID();
  await db.query("INSERT INTO accounts(id,login_phone,password_hash,status,is_two_factor_enabled) VALUES($1,'0909000001',$2,'ACTIVE',false)", [ownerId, await bcrypt.hash(password, 4)]);
  await db.query("INSERT INTO account_roles(account_id,role_id) SELECT $1,id FROM roles WHERE role_code='QTV'", [ownerId]);
  await db.query('INSERT INTO account_branch_scopes(account_id,branch_id,is_all_branches) VALUES($1,$2,true)', [ownerId, branches[0]]);
  const app = require(path.join(root, 'backend/src/server')); pool = require(path.join(root, 'backend/src/db/postgres')).pool;
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
  const A = await api('/auth/login-password', null, 'POST', { login_phone: '0909000001', password });
  const trainers = [], sessions = [], members = [], regs = [], bookings = [];
  for (let i = 0; i < 2; i++) {
    const pt = await api('/pt-bookings/trainers', A.access_token, 'POST', { full_name: `Commission Trainer ${i ? 'B' : 'A'}`, phone: `090900002${i}`, branch_id: branches[i] }); trainers.push(pt);
    const otp = await api('/auth/request-otp', null, 'POST', { login_phone: pt.phone });
    sessions.push(await api('/auth/login-otp', null, 'POST', { login_phone: pt.phone, otp_code: otp.dev_otp, password }));
    members.push(await api('/members', A.access_token, 'POST', { full_name: `Commission Member ${i ? 'B' : 'A'}`, phone: `090900001${i}`, home_branch_id: branches[i] }));
    const gym = await api('/packages', A.access_token, 'POST', { package_name: `Commission Gym ${i}`, package_type: 'GYM_TIME', price: 500000, duration_days: 365, branch_ids: [branches[i]] });
    const gymReg = await api('/registrations', A.access_token, 'POST', { member_id: members[i].id, package_id: gym.id, start_date: now.toISOString().slice(0, 10), sold_branch_id: branches[i] });
    await api('/payments', A.access_token, 'POST', { registration_id: gymReg.id, payment_method: 'CASH' });
    await db.query('UPDATE registrations SET start_date=$2 WHERE id=$1', [gymReg.id, `${period}-01`]);
  }
  for (const [i, type, name, ptPrice] of [[0, 'PT_SESSION', 'Commission Personal', 1000000], [0, 'COMBO', 'Commission Combo', 600000], [1, 'PT_SESSION', 'Other PT Private', 1000000]]) {
    const pkg = await api('/packages', A.access_token, 'POST', { package_name: name, package_type: type, price: 1000000, pt_price: ptPrice, gym_price: 1000000 - ptPrice, duration_days: 365, total_pt_sessions: 5, branch_ids: [branches[i]] });
    const reg = await api('/registrations', A.access_token, 'POST', { member_id: members[i].id, package_id: pkg.id, start_date: now.toISOString().slice(0, 10), sold_branch_id: branches[i] });
    await api('/payments', A.access_token, 'POST', { registration_id: reg.id, payment_method: 'CASH' });
    await db.query('UPDATE registrations SET start_date=$2 WHERE id=$1', [reg.id, `${period}-01`]);
    await api(`/registrations/${reg.id}/assign-pt`, A.access_token, 'POST', { pt_id: trainers[i].id });
    regs.push(reg);
    const booking = (await db.query(`INSERT INTO pt_bookings(registration_id,member_id,pt_id,branch_id,session_number,booking_date,start_time,end_time,status,pt_confirmed_at,member_confirmed_at,is_deducted,workout_notes,fitness_assessment)
      VALUES($1,$2,$3,$4,1,$5,'08:00','09:00','COMPLETED',$5::date + interval '9 hours',$5::date + interval '9 hours',true,'Completed fixture','Good') RETURNING *`, [reg.id, members[i].id, trainers[i].id, branches[i], `${period}-${String(regs.length + 1).padStart(2, '0')}`])).rows[0];
    bookings.push(booking);
    await db.query('UPDATE registrations SET used_pt_sessions=1,remaining_pt_sessions=4 WHERE id=$1', [reg.id]);
  }
  for (const [day, status] of [[15, 'CANCELLED'], [26, 'BOOKED']]) await db.query("INSERT INTO pt_bookings(registration_id,member_id,pt_id,branch_id,session_number,booking_date,start_time,end_time,status) VALUES($1,$2,$3,$4,2,$5,'08:00','09:00',$6)", [regs[0].id, members[0].id, trainers[0].id, branches[0], `${period}-${day}`, status]);
  await db.query('UPDATE registrations SET remaining_pt_sessions=3,booked_pt_sessions=1 WHERE id=$1', [regs[0].id]);
  const legacy = (await db.query("INSERT INTO pt_commissions(pt_id,month,year,total_pt_sessions_taught,pt_revenue_share,commission_percentage,total_commission_amount,status,paid_at,payout_method) VALUES($1,$2,$3,7,1400000,25,350000,'PAID',NOW()-interval '30 days','CASH') RETURNING *", [trainers[0].id, previous.getUTCMonth() + 1, previous.getUTCFullYear()])).rows[0];
  fixture = { branches, trainers, members, regs, bookings, legacy, A, sessions };
  state.push({ fixture: { branches, trainers: trainers.map(p => ({ id: p.id, phone: p.phone })), memberIds: members.map(m => m.id), registrationIds: regs.map(r => r.id), bookingIds: bookings.map(b => b.id), legacyId: legacy.id }, note: 'SQL historical fixtures only in isolated database; API-created paid registrations/receipts. Bookings and confirmations are fixture setup, not UI confirmation coverage.' });
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  console.log('ISOLATED', dbName, base);
}
async function pageFor(session, branch, web = false) {
  const context = await browser.newContext({ viewport: web ? { width: 1440, height: 1000 } : { width: 390, height: 844 }, hasTouch: !web, timezoneId: 'Asia/Bangkok', serviceWorkers: 'block' });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.port === '5000' || url.pathname.startsWith('/api/')) {
      requests.push({ method: route.request().method(), path: url.pathname, query: url.search, targetPort: server.address().port });
      return route.continue({ url: base + url.pathname + url.search });
    }
    return route.continue();
  });
  await context.addInitScript(({ session, branch }) => {
    if (location.origin !== 'http://localhost:3000') return;
    localStorage.setItem('paradise_access_token', session.access_token);
    localStorage.setItem('paradise_user', JSON.stringify(session.user));
    localStorage.setItem('paradise_current_branch_id', branch);
  }, { session, branch });
  const page = await context.newPage(); page.setDefaultTimeout(12000); activePage = page;
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('response', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/')) responses.push({ path: u.pathname, query: u.search, status: r.status(), method: r.request().method() }); });
  await page.goto('http://localhost:3000/' + (web ? 'web/#commissions' : 'mobile/pt/'), { waitUntil: 'networkidle' });
  return page;
}
async function record(page, name, selector, action, expected, verify, section = 'source') {
  activePage = page; await page.waitForTimeout(250);
  let status = 'PASS', actual;
  try { actual = await verify(); } catch (e) { status = 'FAIL'; actual = e.message; issues.push({ name, severity: 'MAJOR', expected, actual }); }
  let target = page.locator(selector).first();
  if (!await target.isVisible()) { target = page.locator('body'); if (status === 'PASS') { status = 'FAIL'; actual = `Annotation target not visible: ${selector}`; issues.push({ name, actual }); } }
  await target.scrollIntoViewIfNeeded();
  const bounds = await target.boundingBox(), n = steps.length + 1;
  await page.evaluate(({ b, n }) => {
    const e = document.createElement('div'); e.id = 'commission-e2e-annotation';
    e.style.cssText = `position:fixed;left:${Math.max(2,b.x)}px;top:${Math.max(2,b.y)}px;width:${Math.min(b.width,innerWidth-4)}px;height:${Math.min(b.height,innerHeight-4)}px;border:3px solid #e11d48;pointer-events:none;z-index:2147483647;box-sizing:border-box`;
    const badge = document.createElement('span'); badge.textContent = n; badge.style.cssText = 'position:absolute;top:0;left:0;background:#e11d48;color:white;border:2px solid white;border-radius:50%;width:26px;height:26px;display:grid;place-items:center;font:bold 14px Arial'; e.append(badge); document.body.append(e);
  }, { b: bounds, n });
  const file = `${section === 'downstream' ? 'downstream' : 'step'}-${String(n).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(output, file) });
  await page.evaluate(() => document.querySelector('#commission-e2e-annotation')?.remove());
  steps.push({ n, name, action, expected, actual: typeof actual === 'string' ? actual : JSON.stringify(actual), status, file, section });
  console.log(status, name);
  return status;
}
async function textAt(page, selector, contains) {
  assert(await page.locator(selector).isVisible(), `Visible DOM required: ${selector}`);
  const text = await page.locator(selector).innerText(); if (contains !== undefined) assert(text.includes(contains), `Expected ${contains}; DOM=${text}`); return text;
}
async function settled(page) { await page.waitForFunction(() => !['Đang tải', ''].includes(document.querySelector('#commStatusBadge')?.textContent || '')); }
async function openPT(page) {
  await page.locator('[data-tab="overview"]').click();
  await record(page, 'open-overview', '#cardPtCommissions', 'Click PT06 overview', 'PT06-US02 Trigger: own commission card visible', () => textAt(page, '#cardPtCommissions'));
  await page.locator('#bottomNav [data-tab="commissions"]').click(); await settled(page);
  await record(page, 'commission-navigation', '#bottomNav', 'Open Hoa hong footer menu', 'Five navigation items; commission page active; footer matches green header', async () => {
    assert.equal(await page.locator('#bottomNav .nav-item').count(), 5);
    assert(await page.locator('#view-commissions.active').isVisible());
    assert.equal(await page.locator('#bottomNav [data-tab="commissions"]').getAttribute('aria-current'), 'page');
    const colors = await page.evaluate(() => [getComputedStyle(document.querySelector('#bottomNav')).backgroundColor, getComputedStyle(document.querySelector('#appHeader')).backgroundColor]);
    assert.equal(colors[0], colors[1]); return colors;
  });
}
async function domSummary(page, count, revenue, amount, label) {
  assert(!await page.locator('#commReconciliationError').isVisible(), 'Valid statement must not show a reconciliation warning');
  const money = n => new Intl.NumberFormat('vi-VN').format(n);
  const result = {};
  for (const [id, expected] of [['commTotalAmount', money(amount)], ['commSessionsCount', `${count} buổi`], ['commBaseRevenue', money(revenue)], ['commStatusBadge', label]]) result[id] = await textAt(page, '#' + id, expected);
  return result;
}
async function refresh(page) { await page.locator('#btnRefreshCommSheet').click(); await settled(page); }
async function setCustom(page, value) {
  await page.locator('.pt-comm-chip[data-filter="custom"]').click();
  await record(page, 'show-month-input', '#commMonthInput', 'Choose custom month', 'AF-01: month input becomes visible', async () => { assert(await page.locator('#commMonthInput').isVisible()); return page.locator('#commMonthInput').inputValue(); });
  await page.locator('#commMonthInput').fill(value); await page.locator('#commMonthInput').press('Tab'); await settled(page);
}
async function run() {
  await setup(); const f = fixture, token = f.sessions[0].access_token;
  const page = await pageFor(f.sessions[0], f.branches[0]); await openPT(page);
  const ownUrl = `/pt/my-commissions?month=${month}&year=${year}`;
  const before = await api(ownUrl, token);
  await record(page, 'unpaid-summary', '#view-commissions .pt-commission-page', 'Open current unpaid statement', 'Main Flow 4 / reconciliation: two completed sessions, PT base 320000, commission 80000 at 25%; exclude Combo Gym 400000, cancelled/booked and other PT', async () => {
    assert.equal(before.summary.pt_id, f.trainers[0].id); assert.equal(before.sessions.length, 2);
    assert(before.sessions.every(s => s.pt_id === f.trainers[0].id && s.pt_confirmed_at && s.member_confirmed_at));
    assert.equal(before.sessions.reduce((n,s) => n + Number(s.session_pt_value), 0), 320000);
    assert.equal(before.sessions.reduce((n,s) => n + Number(s.session_commission), 0), 80000);
    return domSummary(page, 2, 320000, 80000, 'Chờ chi trả');
  });
  await record(page, 'unpaid-session-details', '#commSessionsList', 'Inspect full two-row list', 'Main Flow 5: same member, package, date/time, PT values and per-session commissions', async () => {
    assert.equal(await page.locator('.pt-comm-session-item').count(), 2);
    for (const s of before.sessions) {
      const row = page.locator('.pt-comm-session-item').filter({ hasText: s.package_name_snapshot });
      const text = await row.innerText();
      for (const value of [s.member_name, s.member_code, s.start_time.slice(0,5), new Intl.NumberFormat('vi-VN').format(Number(s.session_pt_value)), new Intl.NumberFormat('vi-VN').format(Number(s.session_commission))]) assert(text.includes(value), text);
    }
    return textAt(page, '#commSessionsList');
  });
  state.push({ unpaid: before });
  const calculated = await api('/commissions/calculate', f.A.access_token, 'POST', { month, year });
  const comm = calculated.find(c => c.pt_id === f.trainers[0].id), other = calculated.find(c => c.pt_id === f.trainers[1].id);
  assert(comm && other); state.push({ setup: 'QTV calculate API materializes unpaid statements before UI payout', commissionId: comm.id, otherCommissionId: other.id });
  const web = await pageFor(f.A, f.branches[0], true);
  const row = web.locator('.dx-data-row').filter({ hasText: 'Commission Trainer A' }).first();
  await row.waitFor();
  const payoutButton = web.locator('.commissions-content .dx-button:visible').filter({ hasText: /^Chi trả$/ });
  await record(web, 'qtv-same-pt-unpaid', '.commissions-content', 'Open QTV W15 on Branch A', 'QTV-W15-US02 MF4/7: same PT row and positive unpaid payout action', async () => { assert.equal(await payoutButton.count(), 1); assert(await payoutButton.isVisible()); return row.innerText(); });
  await payoutButton.click();
  await record(web, 'qtv-payout-modal', '.dx-popup-content:visible', 'Click payout on same PT', 'QTV-W15-US02 MF8: payout form shows same PT and amount', () => textAt(web, '.dx-popup-content:visible', 'Commission Trainer A'));
  await web.getByLabel('Hình thức chi trả').click();
  await record(web, 'qtv-method-options', '.dx-overlay-wrapper .dx-list:visible', 'Open payout method choices', 'QTV-W15-US02 MF8: bank or cash choice', () => textAt(web, '.dx-overlay-wrapper .dx-list:visible', 'Tiền mặt tại quầy'));
  await web.locator('.dx-list-item:visible').filter({ hasText: 'Tiền mặt tại quầy' }).click();
  await record(web, 'qtv-cash-fields', '.dx-popup-content:visible', 'Select cash payout', 'QTV-W15-US02 conditional fields: cash receipt shown, bank account hidden', async () => { assert(await web.getByLabel('Số phiếu chi (tùy chọn)').isVisible()); assert(!await web.getByLabel('Số tài khoản', { exact: true }).isVisible()); return 'Cash receipt field visible; bank account field hidden'; });
  await web.getByLabel('Số phiếu chi (tùy chọn)').fill('E2E-COMMISSION-CASH');
  await record(web, 'qtv-cash-input-before-submit', '.dx-popup-content:visible', 'Enter cash reference E2E-COMMISSION-CASH before submit', 'Input captured before payout', async () => { assert.equal(await web.getByLabel('Số phiếu chi (tùy chọn)').inputValue(), 'E2E-COMMISSION-CASH'); return 'E2E-COMMISSION-CASH'; });
  await web.getByRole('button', { name: 'Xác nhận chi trả', exact: true }).click();
  await web.getByRole('button', { name: 'Xác nhận chi trả', exact: true }).waitFor({ state: 'hidden' });
  await record(web, 'qtv-paid-result', '.commissions-content', 'Confirm cash payout', 'QTV-W15-US02 MF9: same row PAID and payout action removed', async () => { assert((await row.innerText()).includes('Đã chi trả')); assert.equal(await row.getByRole('button', { name: 'Chi trả', exact: true }).count(), 0); return row.innerText(); });
  const paid = await api(ownUrl, token); assert.equal(paid.details_snapshot_available, true);
  assert.equal(paid.summary.status, 'PAID'); assert.deepEqual(paid.sessions, before.sessions);
  const stored = (await db.query('SELECT * FROM pt_commissions WHERE id=$1', [comm.id])).rows[0];
  assert.equal(stored.payout_ref, 'E2E-COMMISSION-CASH'); assert.equal(stored.details_snapshot.length, 2);
  state.push({ paid, payoutMethod: stored.payout_method, payoutReference: stored.payout_ref });
  await refresh(page);
  await record(page, 'pt-paid-after-qtv-payout', '#view-commissions', 'Refresh same PT after QTV payout', 'PT06-US02 PAID: totals, two frozen rows and paid timestamp visible', async () => { assert(await page.locator('#commPaidDateWrap').isVisible()); assert.equal(await page.locator('.pt-comm-session-item').count(), 2); return { ...await domSummary(page, 2, 320000, 80000, 'Đã chi trả'), paidDate: await textAt(page, '#commPaidDate') }; }, 'downstream');
  await db.query("UPDATE member_profiles SET full_name='Changed live member after payout' WHERE id=$1", [f.members[0].id]);
  await db.query("UPDATE registrations SET package_name_snapshot='Changed live package',pt_price_snapshot=9000000,used_pt_sessions=0,remaining_pt_sessions=5 WHERE id=$1", [f.regs[1].id]);
  await db.query("UPDATE pt_bookings SET status='CANCELLED',is_deducted=false,workout_notes='Changed after payout' WHERE id=$1", [f.bookings[1].id]);
  await db.query('UPDATE pt_commission_config_history SET commission_percentage=75 WHERE branch_id=$1', [f.branches[0]]);
  await refresh(page);
  await record(page, 'paid-frozen-after-sql-changes', '#commSessionsList', 'Refresh PAID after real SQL member/package/booking/rate edits', 'Approved snapshot rule: all historical rows and amounts stay frozen', async () => { assert.deepEqual(await api(ownUrl, token), paid); const t = await textAt(page, '#commSessionsList', 'Commission Member A'); assert(!t.includes('Changed live')); assert(t.includes('Commission Combo')); return { ...await domSummary(page, 2, 320000, 80000, 'Đã chi trả'), rows: t }; }, 'downstream');
  const modal = page.locator('#mainContent');
  await modal.evaluate(el => { el.scrollTop = 0; });
  const b = await modal.boundingBox(), x = Math.round(b.x + b.width / 2), y = Math.round(b.y + 100);
  const cdp = await page.context().newCDPSession(page);
  const requestCount = requests.filter(r => r.path.endsWith('/pt/my-commissions')).length;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 40 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 100 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(650); await settled(page); await cdp.detach();
  await record(page, 'paid-pull-touch-refresh', '#view-commissions', 'Browser CDP touch swipe down 100px from page scrollTop=0', 'MF6 / AF-02: gesture issues a real same-period request and keeps PAID snapshot unchanged', async () => {
    assert(requests.filter(r => r.path.endsWith('/pt/my-commissions')).length > requestCount, 'Touch gesture must issue an actual commission API request');
    assert.deepEqual(await api(ownUrl, token), paid); return { ...await domSummary(page, 2, 320000, 80000, 'Đã chi trả'), transport: 'CDP touch input; no direct handler invocation' };
  });
  await page.locator('.pt-comm-chip[data-filter="last_month"]').click(); await settled(page);
  await record(page, 'legacy-paid-null-warning', '#view-commissions', 'Choose previous month with legacy PAID NULL snapshot', 'AF-03: preserve 7 sessions / 1400000 base / 350000 history; warning, not empty-month text', async () => {
    const data = await api(`/pt/my-commissions?month=${previous.getUTCMonth()+1}&year=${previous.getUTCFullYear()}`, token);
    assert.equal(data.details_snapshot_available, false); assert.deepEqual(data.sessions, []);
    const t = await textAt(page, '#commSessionsList', 'không có bản chốt chi tiết'); assert(!t.includes('Bạn chưa có buổi')); assert(await page.locator('#commPaidDateWrap').isVisible());
    return { ...await domSummary(page, 7, 1400000, 350000, 'Đã chi trả'), warning: t };
  });
  await setCustom(page, emptyPeriod);
  await record(page, 'no-completed-entries', '#view-commissions', `Select empty period ${emptyPeriod}`, 'Exception Flow: no completed sessions, zero totals, unpaid, no paid timestamp', async () => { assert.equal(await page.locator('.pt-comm-session-item').count(), 0); assert(!await page.locator('#commPaidDateWrap').isVisible()); return { ...await domSummary(page, 0, 0, 0, 'Chờ chi trả'), empty: await textAt(page, '#commSessionsList', 'Bạn chưa có buổi dạy hoàn thành') }; });
  await page.locator('#bottomNav [data-tab="overview"]').click();
  await record(page, 'return-overview', '#bottomNav', 'Return to overview using footer', 'Only overview active; footer remains usable', async () => {
    assert(await page.locator('#view-overview.active').isVisible()); assert(!await page.locator('#view-commissions').isVisible()); return 'Overview active';
  });
  await page.locator('#btnQuickCommissions').click(); await settled(page);
  await record(page, 'overview-shortcut-preserves-period', '#view-commissions', 'Open commission shortcut from overview', 'Same dedicated screen and previously selected period, without modal', async () => {
    assert.equal(await page.locator('#commMonthInput').inputValue(), emptyPeriod);
    assert.equal(await page.locator('#bottomNav [data-tab="commissions"]').getAttribute('aria-current'), 'page');
    assert.equal(await page.locator('#commissionModalBackdrop').count(), 0);
    return domSummary(page, 0, 0, 0, 'Chờ chi trả');
  });
  // Force a real server error by temporarily making a required relation unavailable in this isolated DB.
  await db.query('ALTER TABLE pt_commissions RENAME TO e2e_unavailable_pt_commissions');
  try {
    await refresh(page);
    await record(page, 'real-api-error', '#view-commissions', 'Refresh while isolated PostgreSQL commission table is temporarily unavailable', 'Exception Flow: real API error; no fabricated zero/other PT statement; retry available', async () => { await textAt(page, '#commStatusBadge', 'Không thể tải'); assert.equal((await textAt(page, '#commTotalAmount')).trim(), '--'); assert(await page.locator('#btnRefreshCommSheet').isVisible()); return textAt(page, '#commSessionsList', 'Vui lòng bấm Làm mới'); });
  } finally { await db.query('ALTER TABLE e2e_unavailable_pt_commissions RENAME TO pt_commissions'); }
  await refresh(page);
  await record(page, 'real-api-retry-success', '#view-commissions', 'Restore SQL table; click refresh', 'Exception recovery: real API returns selected empty period again', () => domSummary(page, 0, 0, 0, 'Chờ chi trả'));
  await db.query('UPDATE pt_commission_config_history SET is_active=false WHERE branch_id=$1', [f.branches[0]]);
  await page.locator('.pt-comm-chip[data-filter="this_month"]').click(); await settled(page);
  await record(page, 'paid-with-missing-current-config', '#view-commissions', 'Disable rate history fixture and select PAID current month', 'Snapshot rule: missing new configuration cannot hide existing PAID', async () => { assert.deepEqual(await api(ownUrl, token), paid); return domSummary(page, 2, 320000, 80000, 'Đã chi trả'); });
  await setCustom(page, emptyPeriod);
  await record(page, 'missing-config-warning', '#commSessionsList', 'Choose unpaid period without active commission config', 'Exception Flow: explain missing commission config and contact QTV', async () => { const data = await api(`/pt/my-commissions?month=1&year=${year}`, token, 'GET', undefined, 409); state.push({ missingConfigApi: data }); return textAt(page, '#commSessionsList', 'Chưa có cấu hình'); });
  await db.query('UPDATE pt_commission_config_history SET is_active=true WHERE branch_id=$1', [f.branches[0]]);
  await page.locator('.pt-comm-chip[data-filter="this_month"]').click(); await settled(page);
  const forbidden = [];
  for (const [url, method, body] of [[`/commissions/${other.id}/details`, 'GET'], ['/commissions/monthly', 'GET'], ['/commissions/configs', 'GET'], ['/commissions/calculate', 'POST', { month, year }], [`/commissions/${comm.id}/status`, 'PUT', { status: 'PAID' }]]) {
    const result = await api(url, token, method, body, 403); forbidden.push({ url, method, status: 403, result });
  }
  assert.deepEqual(await api(ownUrl + '&pt_id=' + f.trainers[1].id, token), paid);
  state.push({ forbidden, ownQueryInjection: 'Other pt_id ignored; exact own PAID response unchanged' });
  await record(page, 'own-ui-after-forbidden-api', '#view-commissions', 'Attempt forbidden other-PT/detail/admin APIs with same real PT session, then refresh own UI', 'Own scope: forbidden calls expose no other-PT data and own UI remains intact', async () => { await refresh(page); const t = await textAt(page, '#commSessionsList'); assert(!t.includes('Other PT Private') && !t.includes('Commission Member B')); return { forbiddenCount: forbidden.length, ...await domSummary(page, 2, 320000, 80000, 'Đã chi trả') }; });
  const otherPage = await pageFor(f.sessions[1], f.branches[1]); await openPT(otherPage);
  await record(otherPage, 'branch-b-own-pt-only', '#view-commissions', 'Open real PT B session in Branch B', 'Own-scope rule: B sees only B one session / 200000 base / 50000; no A historical statement', async () => { const t = await textAt(otherPage, '#commSessionsList', 'Commission Member B'); assert(!t.includes('Commission Member A')); return domSummary(otherPage, 1, 200000, 50000, 'Chờ chi trả'); }, 'downstream');
  await api(`/commissions/${comm.id}/details`, f.sessions[1].access_token, 'GET', undefined, 403);
  state.push({ reverseScope: 'PT B forbidden reading PT A paid detail (403)' });
  await db.query('UPDATE pt_commission_config_history SET commission_percentage=0 WHERE branch_id=$1', [f.branches[1]]);
  await refresh(otherPage);
  await record(otherPage, 'zero-rate-with-completed-entry', '#view-commissions', 'Set real Branch B fixture rate to 0%; refresh PT B', 'Main Flow 4/5: zero commission does not imply empty teaching history; preserve one row and PT base', async () => {
    assert.equal(await otherPage.locator('.pt-comm-session-item').count(), 1);
    await textAt(otherPage, '#commRate', '0%');
    assert(!(await textAt(otherPage, '#commSessionsList')).includes('Bạn chưa có buổi'));
    return domSummary(otherPage, 1, 200000, 0, 'Chờ chi trả');
  });
  for (const width of [320, 360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await record(page, `paid-responsive-${width}`, '#view-commissions', `Resize paid statement to ${width}px`, 'Paid content remains visible; no horizontal document overflow', async () => { const metrics = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth })); assert(metrics.scroll <= metrics.width); return { ...metrics, ...await domSummary(page, 2, 320000, 80000, 'Đã chi trả') }; });
  }
}
function writeReport() {
  const changed = watched.filter(f => hash(fs.readFileSync(path.join(root, f))) !== sources[f]);
  if (changed.length) issues.push({ name: 'source-drift', severity: 'LIMIT', actual: changed.join(', ') });
  const result = blocked ? 'BLOCKED' : issues.length ? 'FAIL (scoped cases)' : 'PASS (scoped cases only)';
  const format = s => `### ${s.n}. ${s.name}\n\n- Action/Input: ${s.action}\n- Expected Result: ${s.expected}\n- Actual Result: ${s.actual}\n- Status: **${s.status}**\n\n![${s.name}](./${s.file})\n`;
  const report = `# PT06-US02 Commission Business E2E\n\nExecuted ${new Date().toISOString()}. Result: **${result}**.\n\nSources: PT06-US02 Main Flow, AF-01/02/03, field specification and exceptions; Product Spec commission ownership/snapshot rules; QTV-W15-US02 MF7-9 for cash payout. Backend source-ready confirmed by user after Pascal validation.\n\nScope: own unpaid reconciliation, real QTV cash payout, PAID snapshot source mutations, legacy NULL warning, empty period, real SQL-induced API error/retry, missing config, forbidden APIs and two PTs/two branches. No source edits, shared DB writes, response mocks or full-US claim. Mesh inboxes read; receipt/skill/report-archive writes outside explicitly owned paths were not made.\n\n## Source Action Verification\n\n${steps.filter(s => s.section === 'source').map(format).join('\n')}\n## State Verification\n\nIsolated PostgreSQL: ${dbName}. All ${migrations.length} on-disk SQL migrations applied, including 012/013 when present. Real password/OTP auth sessions. localhost:3000 served checkout checked; route.continue redirected API to ephemeral backend. SQL historical fixtures and post-payout mutations are explicitly setup, not simulated responses. Request routes, source/migration hashes, SQL/API assertions and cleanup are in results.json.\n\nCleanup: ${JSON.stringify(cleanup)}.\n\n## Cross-Role / Downstream Verification\n\n${steps.filter(s => s.section === 'downstream').map(format).join('\n')}\nSame PT/commission ID checked between QTV cash payout and PT detail. Other-PT security checks use real second account in Branch B; API-only denial evidence is supplemental and is not mislabeled as a UI error state.\n\n## Issues Found\n\n${issues.length ? issues.map(i => `- **${i.name}** (${i.severity || 'MAJOR'}): ${i.actual}`).join('\n') : 'No issues found in executed cases.'}\n\n## Final Result\n\n**${result}**; ${steps.filter(s => s.status === 'PASS').length} PASS, ${steps.filter(s => s.status === 'FAIL').length} FAIL recorded UI steps.\n\nLimits: this is not whole PT06-US02 acceptance. No native pull-to-refresh gesture, approval legacy state, group commission, multiple-rate/rounding policy, payout races/transaction rollback, all QTV payout validation/bank transfer, or full member/LT regression covered. Failure blocks dependent steps only; independent cases continue. Missing-config behavior is judged against PT06 exception text, not inferred from generic HTTP error. Frontend/backend sources are never modified by this runner.\n`;
  fs.writeFileSync(path.join(output, 'PT06-US02-test.md'), report.replace('No native pull-to-refresh gesture,', 'Browser CDP touch pull-to-refresh was verified. No physical-device gesture validation,'));
  const screenshots = steps.map(s => ({ file: s.file, bytes: fs.statSync(path.join(output, s.file)).size, sha256: hash(fs.readFileSync(path.join(output, s.file))) }));
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ result, dbName, sources, changedSources: changed, migrations, steps, state, issues, requests, responses, pageErrors, cleanup, screenshots }, null, 2));
}
(async () => {
  try { await run(); } catch (e) {
    blocked = true; issues.push({ name: 'execution-blocker', severity: 'BLOCKED', actual: e.stack }); console.error(e.stack);
    if (activePage && !activePage.isClosed()) await record(activePage, 'execution-blocker', 'body', 'Capture actual blocked DOM', 'Dependent steps blocked, no invented continuation', async () => { throw e; }).catch(() => {});
  } finally {
    try { if (browser) await browser.close(); cleanup.browserClosed = true; } catch (e) { cleanup.browser = e.message; }
    try { if (server) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); } cleanup.serverClosed = true; } catch (e) { cleanup.server = e.message; }
    try { if (pool) await pool.end(); if (db) await db.end(); cleanup.connectionsClosed = true; } catch (e) { cleanup.connections = e.message; }
    try { if (created) { await admin.query(`DROP DATABASE "${dbName}" WITH (FORCE)`); cleanup.databaseDropped = true; } if (admin) await admin.end(); } catch (e) { cleanup.database = e.message; }
    writeReport(); console.log('REPORT', path.join(output, 'PT06-US02-test.md'), JSON.stringify(cleanup));
    process.exitCode = blocked || issues.length ? 1 : 0;
  }
})();

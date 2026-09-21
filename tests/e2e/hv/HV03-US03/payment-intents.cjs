const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const dep = name => require(path.join(root, 'backend/node_modules', name));
const { Client } = dep('pg');
const bcrypt = dep('bcryptjs');
const { chromium } = require('C:/Users/Admin/.agents/skills/playwright-skill/node_modules/playwright');
dep('dotenv').config({ path: path.join(root, 'backend/.env'), quiet: true });
const originalUrl = process.env.DATABASE_URL;
assert(originalUrl);
const dbName = `paradise_test_hv_${process.pid}_${Date.now()}`;
assert(/^paradise_test_hv_\d+_\d+$/.test(dbName));
const output = path.join(__dirname, 'payment-intents', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(output, { recursive: true });
const steps = [], issues = [], migrations = [], state = [], requests = [], cleanup = {};
const password = 'Isolated-Test-Password9';
const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const plusDays = n => new Date(Date.parse(today) + n * 86400000).toISOString().slice(0, 10);
let admin, db, pool, server, browser, base, created, activePage, blocked, fixture;
const sha = value => createHash('sha256').update(value).digest('hex');
const watched = ['frontend/mobile/member/js/packages-notifications.js', 'frontend/mobile/member/index.html', 'frontend/web/js/modules/sales.js', 'backend/package.json', 'backend/package-lock.json', 'tests/e2e/hv/HV03-US03/payment-intents.cjs'];
function sourceSnapshot() {
  const files = new Set(watched);
  const walk = dir => {
    for (const item of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const file = `${dir}/${item.name}`;
      if (item.isDirectory()) walk(file);
      else if (/\.(js|cjs|json|sql|html|css)$/.test(item.name)) files.add(file);
    }
  };
  for (const dir of ['backend/src', 'frontend/mobile/member', 'frontend/shared']) walk(dir);
  return Object.fromEntries([...files].sort().map(f => [f, fs.existsSync(path.join(root, f)) ? sha(fs.readFileSync(path.join(root, f))) : null]));
}
const sources = sourceSnapshot();
async function api(url, token, method = 'GET', body) {
  const response = await fetch(base + '/api/v1' + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const json = await response.json();
  assert(response.ok, `${method} ${url}: ${response.status} ${JSON.stringify(json)}`);
  return json.data ?? json;
}
async function setup() {
  const source = watched[0];
  const served = await (await fetch('http://localhost:3000/mobile/member/js/packages-notifications.js')).text();
  assert.equal(served.replace(/\r\n/g, '\n'), fs.readFileSync(path.join(root, source), 'utf8').replace(/\r\n/g, '\n'));
  admin = new Client({ connectionString: originalUrl }); await admin.connect();
  await admin.query(`CREATE DATABASE "${dbName}"`); created = true;
  const isolated = new URL(originalUrl); isolated.pathname = '/' + dbName;
  process.env.DATABASE_URL = isolated.toString(); process.env.NODE_ENV = 'test'; process.env.AUTH_OTP_MODE = 'development';
  db = new Client({ connectionString: isolated.toString() }); await db.connect();
  assert.equal((await db.query('SELECT current_database() name')).rows[0].name, dbName);
  const dir = path.join(root, 'backend/src/db/migrations');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8'); await db.query(sql); migrations.push({ file, sha256: sha(sql) });
  }
  for (const role of ['QTV', 'PT', 'MEMBER', 'RECEPTIONIST']) await db.query('INSERT INTO roles(role_code,role_name) VALUES($1,$1)', [role]);
  const branches = [randomUUID(), randomUUID()];
  for (let i = 0; i < 2; i++) await db.query("INSERT INTO branches(id,branch_code,branch_name,phone,address,open_time,close_time) VALUES($1,$2,$2,'0909999999','Isolated HV E2E','00:00','23:59')", [branches[i], `HV Payment Branch ${i ? 'B' : 'A'}`]);
  for (const [role, phone, branch] of [['QTV', '0909000001', branches[0]], ['RECEPTIONIST', '0909000002', branches[0]], ['RECEPTIONIST', '0909000003', branches[1]]]) {
    const id = randomUUID();
    await db.query("INSERT INTO accounts(id,login_phone,password_hash,status,is_two_factor_enabled,full_name) VALUES($1,$2,$3,'ACTIVE',false,$4)", [id, phone, await bcrypt.hash(password, 4), role]);
    await db.query('INSERT INTO account_roles(account_id,role_id) SELECT $1,id FROM roles WHERE role_code=$2', [id, role]);
    await db.query('INSERT INTO account_branch_scopes(account_id,branch_id,is_all_branches) VALUES($1,$2,$3)', [id, branch, role === 'QTV']);
  }
  const app = require(path.join(root, 'backend/src/server')); pool = require(path.join(root, 'backend/src/db/postgres')).pool;
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
  const login = phone => api('/auth/login-password', null, 'POST', { login_phone: phone, password });
  const owner = await login('0909000001'), receptionist = await login('0909000002'), otherReceptionist = await login('0909000003');
  const member = await api('/members', owner.access_token, 'POST', { full_name: 'HV Purchase Member', phone: '0909000010', home_branch_id: branches[0] });
  await db.query("UPDATE accounts SET status='ACTIVE',password_hash=$2,is_two_factor_enabled=false WHERE id=$1", [member.account_id, await bcrypt.hash(password, 4)]);
  const session = await login(member.phone);
  const pkg = await api('/packages', owner.access_token, 'POST', { package_name: 'HV Purchase Gym', package_type: 'GYM_TIME', price: 500000, duration_days: 30, branch_ids: [branches[0]] });
  fixture = { branches, owner, receptionist, otherReceptionist, member, session, pkg };
  state.push({ fixture: { branches, memberId: member.id, packageId: pkg.id }, note: 'All fixtures via API or explicit setup SQL only in disposable DB; no shared seed/reset.' });
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  console.log('ISOLATED', dbName, base);
}
async function pageFor(session, branch, web = false) {
  const context = await browser.newContext({ viewport: web ? { width: 2240, height: 1100 } : { width: 390, height: 844 }, timezoneId: 'Asia/Bangkok', serviceWorkers: 'block' });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.port === '5000' || url.pathname.startsWith('/api/')) {
      requests.push({ method: route.request().method(), path: url.pathname, target: server.address().port });
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
  const page = await context.newPage(); page.setDefaultTimeout(15000); activePage = page;
  if (!web) await page.clock.install();
  await page.goto('http://localhost:3000/' + (web ? 'web/#registrations' : 'mobile/member/'), { waitUntil: 'networkidle' });
  return page;
}
async function capture(page, name, target, action, expected, verify, section = 'source') {
  activePage = page;
  await page.waitForTimeout(150);
  let status = 'PASS', actual;
  try { actual = await verify(); } catch (e) { status = 'FAIL'; actual = e.message; issues.push({ name, actual }); }
  let locator = typeof target === 'string' ? page.locator(target).first() : target;
  if (!await locator.isVisible()) { locator = page.locator('body'); if (status === 'PASS') { status = 'FAIL'; actual = 'Target invisible'; issues.push({ name, actual }); } }
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox(), n = steps.length + 1;
  await page.evaluate(({ b, n }) => {
    const e = document.createElement('div'); e.id = 'hv-e2e-mark';
    e.style.cssText = `position:fixed;left:${Math.max(2,b.x)}px;top:${Math.max(2,b.y)}px;width:${Math.min(b.width,innerWidth-4)}px;height:${Math.min(b.height,innerHeight-4)}px;border:3px solid #e11d48;pointer-events:none;z-index:2147483647;box-sizing:border-box`;
    const badge = document.createElement('span'); badge.textContent = n; badge.style.cssText = 'position:absolute;top:0;left:0;background:#e11d48;color:white;border:2px solid white;border-radius:50%;width:26px;height:26px;display:grid;place-items:center;font:bold 14px Arial'; e.append(badge);
    const openDialogs = document.querySelectorAll('dialog[open]');
    (openDialogs[openDialogs.length - 1] || document.body).append(e);
  }, { b: box, n });
  const file = `${section === 'downstream' ? 'downstream' : 'step'}-${String(n).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(output, file) });
  await page.evaluate(() => document.querySelector('#hv-e2e-mark')?.remove());
  steps.push({ n, name, action, expected, actual, status, file, section }); console.log(status, name);
  assert.equal(status, 'PASS', actual);
}
async function textAt(locator, text) {
  assert(await locator.isVisible());
  const actual = await locator.innerText(); if (text) assert(actual.includes(text), actual); return actual;
}
async function nav(page, route, sub) {
  await page.evaluate(({ route, sub }) => window.MemberApp.navigate(route, sub), { route, sub });
  await page.waitForTimeout(150);
}
const dialog = page => page.locator('dialog[open]').last();
async function buy(page, label) {
  await nav(page, 'packages', 'sale');
  const card = page.locator('#main article').filter({ hasText: fixture.pkg.package_name });
  await capture(page, `${label}-catalog`, card, 'Open Mua goi', 'HV03-US03 MF1: real API package name, price and purchase action', () => textAt(card, '500.000'));
  await card.getByRole('button', { name: 'Mua gói', exact: true }).click();
  await capture(page, `${label}-buy-dialog`, dialog(page), 'Click Mua goi', 'MF2: selected package and bank transfer purchase form', () => textAt(dialog(page), fixture.pkg.package_name));
  await page.locator('#btnApplyVoucher').click();
  await capture(page, `${label}-empty-voucher`, '#buyVoucherMsg', 'Apply blank voucher', 'Empty voucher validation leaves price unchanged', () => textAt(page.locator('#buyVoucherMsg'), 'Vui lòng nhập'));
  await page.locator('#btnProceedBuy').click();
  await page.locator('#paymentCheckAction button').first().waitFor();
  const regs = await api('/registrations', fixture.session.access_token);
  const pending = regs.filter(r => r.package_id === fixture.pkg.id && ['PENDING', 'PENDING_PAYMENT'].includes(r.status));
  assert.equal(pending.length, 1);
  const reg = pending[0];
  await capture(page, `${label}-qr`, dialog(page), 'Continue payment; create registration and intent', 'MF5/6 plus user override: pending registration, 15min QR intent; no final payment', async () => {
    assert.equal((await db.query('SELECT count(*)::int n FROM payments WHERE registration_id=$1', [reg.id])).rows[0].n, 0);
    const intent = (await db.query('SELECT * FROM payment_intents WHERE registration_id=$1 ORDER BY created_at DESC', [reg.id])).rows[0];
    assert(intent); assert(Math.abs((Date.parse(intent.expires_at) - Date.parse(intent.created_at)) / 1000 - 900) < 2);
    await textAt(page.locator('#qrExpiry'), 'Mã QR còn hiệu lực');
    const image = page.locator('#qrContainer img');
    await image.evaluate(img => img.decode());
    assert(await image.isVisible(), 'Real VietQR image must render after decoding');
    return { registrationId: reg.id, intentId: intent.id, expiry: intent.expires_at };
  });
  return reg;
}
async function downstream(page, reg, expected) {
  await page.reload({ waitUntil: 'networkidle' });
  const row = page.locator('.dx-data-row').filter({ hasText: reg.reg_code }).first();
  await row.waitFor();
  const statusCell = row.locator('td').filter({ hasText: expected }).first();
  await statusCell.scrollIntoViewIfNeeded();
  await capture(page, `lt-${reg.reg_code}-${expected}`, statusCell, 'Open LT registrations for the SAME registration', 'Same member/code and expected registration status visibly unobscured', async () => {
    assert(await statusCell.evaluate(el => {
      const r = el.getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth && el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    }), 'Status cell must be in viewport and not behind fixed columns');
    const text = await textAt(row, reg.reg_code); assert(text.includes(expected), text); return text;
  }, 'downstream');
}
async function run() {
  await setup();
  const f = fixture, page = await pageFor(f.session, f.branches[0]);
  const reg = await buy(page, 'purchase');
  const intent = (await db.query('SELECT * FROM payment_intents WHERE registration_id=$1', [reg.id])).rows[0];
  await page.getByRole('button', { name: 'Tôi đã chuyển khoản', exact: true }).click();
  await page.locator('#paymentStatus.success').waitFor();
  await capture(page, 'simulate-transfer-success', '#paymentStatus', 'Click Toi da chuyen khoan', 'User-approved simulate-transfer creates one final payment and receipt; activates same registration', async () => {
    const payments = (await db.query('SELECT * FROM payments WHERE registration_id=$1', [reg.id])).rows;
    assert.equal(payments.length, 1); assert(!Object.hasOwn(payments[0], 'status'));
    assert.equal((await db.query('SELECT count(*)::int n FROM receipts WHERE payment_id=$1', [payments[0].id])).rows[0].n, 1);
    state.push({ paidRegistrationId: reg.id, paymentId: payments[0].id });
    return textAt(page.locator('#paymentStatus'), 'Thanh toán thành công');
  });
  await page.getByRole('button', { name: 'Đến Gói của tôi', exact: true }).click();
  const card = page.locator(`[data-registration-id="${reg.id}"]`);
  await capture(page, 'paid-package-active', card, 'Open Goi cua toi after success', 'Same paid registration active, freeze available', async () => { assert(await card.getByRole('button', { name: 'Đóng băng', exact: true }).isVisible()); return textAt(card, reg.reg_code); });
  await nav(page, 'payments', 'history');
  await capture(page, 'successful-statusless-history', '#main .list', 'Open payment history', 'HV03-US06 MF2-4: successful payment renders without status property', async () => { assert.equal(await page.locator('#main article').count(), 1); return textAt(page.locator('#main .list'), f.pkg.package_name); });
  await page.getByRole('button', { name: 'Xem phiếu thu' }).click();
  await capture(page, 'receipt', dialog(page), 'Open receipt', 'Same member, purchased package and amount', () => textAt(dialog(page), f.member.full_name));
  await dialog(page).getByRole('button', { name: 'Đóng', exact: true }).click();
  const lt = await pageFor(f.receptionist, f.branches[0], true);
  await downstream(lt, reg, 'Đang');
  const repeated = await api(`/payments/${intent.id}/simulate-transfer`, f.session.access_token, 'POST');
  assert(repeated.payment.id); assert.equal((await db.query('SELECT count(*)::int n FROM payments WHERE registration_id=$1', [reg.id])).rows[0].n, 1);
  state.push({ retry: 'One final payment/receipt after repeating same approved simulation endpoint' });
  const pending = await buy(page, 'pending');
  await dialog(page).getByRole('button', { name: 'Đóng', exact: true }).click();
  await db.query("UPDATE payment_intents SET expires_at=NOW()-interval '1 second' WHERE registration_id=$1", [pending.id]);
  await db.query("UPDATE registrations SET created_at=NOW()-interval '4 days' WHERE id=$1", [pending.id]);
  await nav(page, 'payments', 'pending');
  const pendingCard = page.locator(`[data-registration-id="${pending.id}"]`);
  await capture(page, 'pending-older-than-three-days', pendingCard, 'Reload order after isolated 4-day age and QR expiry fixture', 'User override: QR expiry/age never auto-cancels registration; cancel action available', async () => { assert(await pendingCard.getByRole('button', { name: 'Hủy đơn', exact: true }).isVisible()); return textAt(pendingCard, pending.reg_code); });
  await nav(page, 'packages', 'mine');
  await page.getByRole('button', { name: /^Chờ xử lý \(/ }).click();
  const unpaidCard = page.locator(`[data-registration-id="${pending.id}"]`);
  await capture(page, 'pending-mine-freeze-blocked', unpaidCard, 'Open pending filter in Goi cua toi', 'Unpaid pending package has cancel/pay actions and no freeze', async () => {
    assert.equal(await unpaidCard.getByRole('button', { name: 'Đóng băng', exact: true }).count(), 0);
    assert(await unpaidCard.getByRole('button', { name: 'Hủy đơn', exact: true }).isVisible());
    return textAt(unpaidCard, pending.reg_code);
  });
  await unpaidCard.getByRole('button', { name: 'Chi tiết gói' }).click();
  await capture(page, 'pending-detail-freeze-blocked', dialog(page), 'Open unpaid package detail', 'No freeze action in unpaid detail', async () => { assert.equal(await page.locator('#modalFreezeBtn').count(), 0); return textAt(dialog(page), pending.reg_code); });
  await dialog(page).getByRole('button', { name: 'Đóng', exact: true }).first().click();
  await nav(page, 'payments', 'pending');
  await pendingCard.getByRole('button', { name: 'Thanh toán ngay (VietQR)', exact: true }).click();
  await page.locator('#qrExpiry').waitFor();
  await capture(page, 'expired-intent-reissued', '#qrExpiry', 'Continue payment after QR expiry', 'Fresh 15min QR for same pending order; final history still one successful payment', async () => {
    assert.equal((await db.query('SELECT count(*)::int n FROM payment_intents WHERE registration_id=$1', [pending.id])).rows[0].n, 2);
    return textAt(page.locator('#qrExpiry'), 'Mã QR còn hiệu lực');
  });
  await page.clock.fastForward(901000);
  await capture(page, 'qr-countdown-expired', '#qrExpiry', 'Advance browser clock 15min without waiting on real bank', 'Expired QR hidden, simulation unavailable, recreate action; order still pending', async () => {
    assert(!await page.getByRole('button', { name: 'Tôi đã chuyển khoản', exact: true }).isVisible());
    assert(await page.getByRole('button', { name: 'Tạo mã QR mới' }).isVisible());
    assert.equal(await page.locator('#qrContainer img').count(), 0);
    return textAt(page.locator('#qrExpiry'), 'Đơn đăng ký vẫn đang chờ');
  });
  await db.query("UPDATE payment_intents SET expires_at=NOW()-interval '1 second' WHERE registration_id=$1", [pending.id]);
  await page.clock.setSystemTime(new Date());
  await page.getByRole('button', { name: 'Tạo mã QR mới' }).click();
  await page.getByRole('button', { name: 'Tôi đã chuyển khoản', exact: true }).waitFor();
  await capture(page, 'recreate-qr-action', '#qrExpiry', 'Align isolated server expiry and browser clock; click recreate QR', 'Same registration gets a usable fresh QR with no payment', async () => {
    assert.equal((await db.query('SELECT count(*)::int n FROM payment_intents WHERE registration_id=$1', [pending.id])).rows[0].n, 3);
    assert.equal((await db.query('SELECT count(*)::int n FROM payments WHERE registration_id=$1', [pending.id])).rows[0].n, 0);
    return textAt(page.locator('#qrExpiry'), 'Mã QR còn hiệu lực');
  });
  await dialog(page).getByRole('button', { name: 'Hủy đơn', exact: true }).click();
  await capture(page, 'pending-cancel-confirmation', dialog(page), 'Click Huy don', 'Explicit confirmation before cancelling same order', () => textAt(dialog(page), pending.reg_code));
  await dialog(page).getByRole('button', { name: 'Xác nhận hủy đơn' }).click();
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await capture(page, 'pending-cancel-success', '#main', 'Confirm cancellation', 'Order disappears from pending; no final payment or receipt generated', async () => {
    assert.equal((await db.query('SELECT status FROM registrations WHERE id=$1', [pending.id])).rows[0].status, 'CANCELLED');
    assert.equal((await db.query('SELECT count(*)::int n FROM payments WHERE registration_id=$1', [pending.id])).rows[0].n, 0);
    return textAt(page.locator('#main'), 'Bạn không có đơn');
  });
  await downstream(lt, pending, 'Đã hủy');
  await page.clock.resume();
  await nav(page, 'packages', 'mine');
  await page.getByRole('button', { name: /^Đang sử dụng \(/ }).click();
  await card.getByRole('button', { name: 'Đóng băng', exact: true }).click();
  await capture(page, 'freeze-form', dialog(page), 'Open freeze for paid active package', 'Current paid package may freeze', () => textAt(dialog(page), reg.reg_code));
  await page.locator('#freezeDaysInput').fill('0');
  await capture(page, 'freeze-invalid-input', '#freezeDaysInput', 'Enter zero freeze days before submit', 'Input captured separately from validation submit', async () => { assert.equal(await page.locator('#freezeDaysInput').inputValue(), '0'); return '0'; });
  await page.locator('#btnSubmitFreeze').click();
  await capture(page, 'freeze-zero-validation', '#freezeError', 'Submit zero days', 'Invalid days blocked; contract remains ACTIVE', () => textAt(page.locator('#freezeError'), 'Vui lòng nhập'));
  await page.locator('#freezeDaysInput').fill('2');
  await capture(page, 'freeze-valid-input', '#freezeDaysInput', 'Enter two days before submit', 'Separate input screenshot', async () => { assert.equal(await page.locator('#freezeDaysInput').inputValue(), '2'); return '2 days'; });
  await page.locator('#btnSubmitFreeze').click();
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await capture(page, 'freeze-success', card, 'Confirm freeze', 'Paid active package becomes frozen', () => textAt(card, 'Đang đóng băng'));
  await downstream(lt, reg, 'Đang đóng băng');
  const scheduled = await api('/registrations', f.owner.access_token, 'POST', { member_id: f.member.id, package_id: f.pkg.id, start_date: plusDays(7), sold_branch_id: f.branches[0] });
  await api('/payments', f.owner.access_token, 'POST', { registration_id: scheduled.id, payment_method: 'CASH' });
  await nav(page, 'packages', 'mine');
  await page.getByRole('button', { name: /^Tất cả \(/ }).click();
  const scheduledCard = page.locator(`[data-registration-id="${scheduled.id}"]`);
  await capture(page, 'scheduled-freeze-blocked', scheduledCard, 'View paid future package fixture', 'User override: SCHEDULED package cannot freeze', async () => { assert.equal(await scheduledCard.getByRole('button', { name: 'Đóng băng', exact: true }).count(), 0); return textAt(scheduledCard, 'Chưa đến ngày'); });
  await scheduledCard.getByRole('button', { name: 'Chi tiết gói' }).click();
  await capture(page, 'scheduled-detail-freeze-blocked', dialog(page), 'Open scheduled package detail', 'No freeze action in detail either', async () => { assert.equal(await page.locator('#modalFreezeBtn').count(), 0); return textAt(dialog(page), scheduled.reg_code); });
  await dialog(page).getByRole('button', { name: 'Đóng', exact: true }).first().click();
  await expiryCases(page);
  const other = await pageFor(f.otherReceptionist, f.branches[1], true);
  await capture(other, 'lt-branch-b-isolation', '#mainViewport', 'Open authenticated LT Branch B', 'Branch B cannot see Branch A purchase member/order', async () => { const t = await other.locator('body').innerText(); assert(!t.includes(reg.reg_code)); assert(!t.includes(f.member.full_name)); return 'Branch B has no Branch A registration or member'; }, 'downstream');
  await nav(page, 'payments', 'history');
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await capture(page, `history-width-${width}`, '#main .list', `View real history at ${width}px`, 'Payment content remains visible with no horizontal overflow', async () => {
      const bounds = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert(bounds.scroll <= bounds.width); assert(await page.locator('#main article').first().isVisible()); return bounds;
    });
  }
}
async function expiryCases(page) {
  const f = fixture;
  const cases = [
    ['time-four-days', 'GYM_TIME', 4, null, null, true],
    ['time-five-days', 'GYM_TIME', 5, null, null, false],
    ['gym-three-sessions', 'GYM_SESSION', 20, null, 3, true],
    ['gym-four-sessions', 'GYM_SESSION', 1, null, 4, false],
    ['pt-three-sessions', 'PT_SESSION', 20, 3, null, true],
    ['pt-four-sessions', 'PT_SESSION', 1, 4, null, false],
    ['combo-time-or', 'COMBO', 4, 4, null, true],
    ['combo-pt-or', 'COMBO', 20, 3, null, true],
    ['combo-gym-or', 'COMBO', 20, 4, 3, true],
    ['combo-unlimited-gym', 'COMBO', 20, 4, null, false],
  ];
  for (const [name, type, days, pt, gym, expected] of cases) {
    const pkg = await api('/packages', f.owner.access_token, 'POST', { package_name: `Boundary ${name}`, package_type: type, price: 500000, ...(type === 'COMBO' ? { gym_price: 200000, pt_price: 300000 } : {}), duration_days: 30, ...(pt ? { total_pt_sessions: pt } : {}), ...(gym ? { total_gym_sessions: gym } : {}), branch_ids: [f.branches[0]] });
    if (type === 'COMBO' && gym) {
      await db.query('UPDATE packages SET total_gym_sessions=$2 WHERE id=$1', [pkg.id, gym]);
      state.push({ fixture: 'Legacy Combo actual Gym quota, not supported by new catalog creation', packageId: pkg.id, total_gym_sessions: gym });
    }
    const reg = await api('/registrations', f.owner.access_token, 'POST', { member_id: f.member.id, package_id: pkg.id, start_date: today, sold_branch_id: f.branches[0] });
    await api('/payments', f.owner.access_token, 'POST', { registration_id: reg.id, payment_method: 'CASH' });
    await db.query('UPDATE registrations SET end_date=$2 WHERE id=$1', [reg.id, plusDays(days)]);
    const real = (await api('/registrations', f.session.access_token)).find(r => r.id === reg.id);
    assert.equal(real.is_expiring, expected, `Backend canonical ${name}`);
    await nav(page, 'packages', 'mine');
    const card = page.locator(`[data-registration-id="${reg.id}"]`);
    await capture(page, name, card, 'Load real paid registration boundary fixture', `Backend canonical is_expiring=${expected}; ${type}, days=${days}, remaining PT=${pt}, remaining Gym=${gym}`, async () => {
      const t = await textAt(card, reg.reg_code); assert.equal(t.includes('Sắp hết hạn'), expected); return { is_expiring: real.is_expiring, display_status: real.display_status, text: t };
    });
    await card.getByRole('button', { name: 'Chi tiết gói' }).click();
    await capture(page, `${name}-detail`, dialog(page), 'Open detail for same boundary registration', 'Detail uses exactly the same backend flag as list', async () => { const t = await textAt(dialog(page), reg.reg_code); assert.equal(t.includes('Sắp hết hạn'), expected); return t; });
    await dialog(page).getByRole('button', { name: 'Đóng', exact: true }).first().click();
  }
}
function report() {
  const finalSources = sourceSnapshot();
  const changed = [...new Set([...Object.keys(sources), ...Object.keys(finalSources)])].filter(f => finalSources[f] !== sources[f]);
  if (changed.length) issues.push({ name: 'source-drift-during-run', actual: changed.join(', ') });
  const result = blocked ? 'BLOCKED' : issues.length ? 'FAIL' : 'PASS (scoped scenarios)';
  const format = s => `### ${s.n}. ${s.name}\n\n- Action/Input: ${s.action}\n- Expected Result: ${s.expected}\n- Actual Result: ${typeof s.actual === 'string' ? s.actual : JSON.stringify(s.actual)}\n- Status: **${s.status}**\n\n![${s.name}](./${s.file})\n`;
  fs.writeFileSync(path.join(output, 'HV03-US03-test.md'), `# HV Purchase / Payment Intent E2E\n\n${new Date().toISOString()} - ${result}. Sources: HV03-US01, HV03-US03 MF1-8/EF01-02, HV03-US06 MF2-4; explicit 2026-09-21 user override authorizes simulation, successful-only statusless ledger, 15min QR, pending cancel and freeze eligibility. Business docs left to main.\n\n## Source Action Verification\n\n${steps.filter(s => s.section === 'source').map(format).join('\n')}\n## State Verification\n\nDisposable PostgreSQL ${dbName}; ${migrations.length} migrations, hashes and API/SQL assertions in results.json. No mocked API responses. Browser-only clock acceleration explicitly identified. Cleanup: ${JSON.stringify(cleanup)}.\n\n## Cross-Role / Downstream Verification\n\n${steps.filter(s => s.section === 'downstream').map(format).join('\n')}\n## Issues Found\n\n${issues.length ? issues.map(i => `- ${i.name}: ${i.actual}`).join('\n') : 'None in executed cases.'}\n\n## Final Result\n\n${result}; ${steps.filter(s => s.status === 'PASS').length} PASS / ${steps.filter(s => s.status === 'FAIL').length} FAIL. Not full US acceptance or real bank integration certification.\n`);
  const screenshots = steps.map(s => ({ file: s.file, bytes: fs.statSync(path.join(output, s.file)).size, sha256: sha(fs.readFileSync(path.join(output, s.file))) }));
  const loadedBackendModules = Object.keys(require.cache).filter(f => f.startsWith(path.join(root, 'backend/src') + path.sep)).map(f => path.relative(root, f).replaceAll(path.sep, '/')).sort();
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ result, steps, issues, migrations, state, requests, sources, finalSources, loadedBackendModules, runtime: { node: process.version }, changed, cleanup, screenshots }, null, 2));
  console.log('REPORT', path.join(output, 'HV03-US03-test.md'));
}
(async () => {
  try { await run(); } catch (error) {
    blocked = true; issues.push({ name: 'execution-blocker', actual: error.stack }); console.error(error.stack);
    if (activePage && !activePage.isClosed()) await capture(activePage, 'execution-blocker', 'body', 'Capture blocked actual DOM', 'Dependent steps not claimed', async () => { throw error; }).catch(() => {});
  } finally {
    try { if (browser) await browser.close(); cleanup.browser = true; } catch (e) { cleanup.browser = e.message; }
    try { if (server) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); } cleanup.server = true; } catch (e) { cleanup.server = e.message; }
    try { if (pool) await pool.end(); if (db) await db.end(); cleanup.connections = true; } catch (e) { cleanup.connections = e.message; }
    try { if (created) { await admin.query(`DROP DATABASE "${dbName}" WITH (FORCE)`); cleanup.database = true; } if (admin) await admin.end(); } catch (e) { cleanup.database = e.message; }
    report(); process.exitCode = blocked || issues.length ? 1 : 0;
  }
})();

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
const original = process.env.DATABASE_URL;
assert(original, 'DATABASE_URL is required');
const dbName = `paradise_payment_test_${process.pid}_${Date.now()}`;
const password = 'Payment-Isolated9!';
const reports = [], migrations = [], network = [], provenance = [], cleanup = {};
let admin, db, pool, backend, staticServer, browser, base, ui, created = false, fixture, current, activePage;
const hash = input => createHash('sha256').update(input).digest('hex');
const watched = ['backend/src/modules/core/commerce.js', 'backend/src/modules/core/registrationState.js', 'backend/src/modules/core/operations.js', 'backend/src/modules/core/catalog.js', 'frontend/web/js/modules/sales.js', 'frontend/web/js/modules/customerCare.js', 'frontend/web/js/modules/checkin.js', 'frontend/web/js/modules/dashboard.js', 'frontend/web/js/modules/members.js', 'frontend/web/js/ui.js', 'frontend/mobile/member/js/packages-notifications.js'];
const sourceHashes = Object.fromEntries(watched.map(file => [file, hash(fs.readFileSync(path.join(root, file)))]));
const today = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
async function api(endpoint, token, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(base + '/api/v1' + endpoint, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const json = await response.json();
  assert.equal(response.status, 200, `${endpoint}: ${JSON.stringify(json)}`);
  return json.data ?? json;
}
const rows = response => Array.isArray(response) ? response : response.items;
async function setup() {
  admin = new Client({ connectionString: original }); await admin.connect();
  assert(/^paradise_payment_test_\d+_\d+$/.test(dbName));
  await admin.query(`CREATE DATABASE "${dbName}"`); created = true;
  const isolated = new URL(original); isolated.pathname = '/' + dbName;
  process.env.DATABASE_URL = isolated.toString(); process.env.NODE_ENV = 'test'; process.env.AUTH_OTP_MODE = 'development';
  process.env.BANK_BIN = '970422'; process.env.BANK_ACCOUNT_NO = '123456789'; process.env.BANK_ACCOUNT_NAME = 'PARADISE TEST';
  db = new Client({ connectionString: isolated.toString() }); await db.connect();
  assert.equal((await db.query('SELECT current_database() name')).rows[0].name, dbName);
  const dir = path.join(root, 'backend/src/db/migrations');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8'); await db.query(sql); migrations.push({ file, sha256: hash(sql) });
  }
  for (const role of ['QTV', 'RECEPTIONIST', 'PT', 'MEMBER']) await db.query('INSERT INTO roles(role_code,role_name) VALUES($1,$1)', [role]);
  const branches = [randomUUID(), randomUUID()];
  for (let i = 0; i < branches.length; i++) await db.query("INSERT INTO branches(id,branch_code,branch_name,phone,address,open_time,close_time) VALUES($1,$2,$2,'0909999999','Disposable payment test','00:00','23:59')", [branches[i], `Payment Branch ${i ? 'B' : 'A'}`]);
  for (const [phone, role, branch, all] of [['0909210100', 'QTV', branches[0], true], ['0909210101', 'RECEPTIONIST', branches[0], false], ['0909210102', 'RECEPTIONIST', branches[1], false]]) {
    const id = randomUUID();
    await db.query("INSERT INTO accounts(id,login_phone,password_hash,status,is_two_factor_enabled) VALUES($1,$2,$3,'ACTIVE',false)", [id, phone, await bcrypt.hash(password, 4)]);
    await db.query('INSERT INTO account_roles(account_id,role_id) SELECT $1,id FROM roles WHERE role_code=$2', [id, role]);
    await db.query('INSERT INTO account_branch_scopes(account_id,branch_id,is_all_branches) VALUES($1,$2,$3)', [id, branch, all]);
  }
  const app = require(path.join(root, 'backend/src/server')); pool = require(path.join(root, 'backend/src/db/postgres')).pool;
  backend = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  base = `http://127.0.0.1:${backend.address().port}`;
  const express = dep('express'), web = express(); web.use(express.static(path.join(root, 'frontend')));
  staticServer = await new Promise(resolve => { const server = web.listen(0, '127.0.0.1', () => resolve(server)); });
  ui = `http://127.0.0.1:${staticServer.address().port}`;
  for (const relative of ['web/index.html', 'web/js/modules/sales.js', 'web/js/ui.js', 'mobile/member/js/packages-notifications.js', 'shared/apiClient.js']) {
    const served = Buffer.from(await (await fetch(`${ui}/${relative}`)).arrayBuffer());
    assert.equal(hash(served), hash(fs.readFileSync(path.join(root, 'frontend', relative)))); provenance.push({ file: relative, sha256: hash(served) });
  }
  const sessions = [];
  for (const phone of ['0909210100', '0909210101', '0909210102']) sessions.push(await api('/auth/login-password', null, { login_phone: phone, password }));
  const member = await api('/members', sessions[0].access_token, { full_name: 'Payment Same Member', phone: '0909210110', home_branch_id: branches[0] });
  const otp = await api('/auth/request-otp', null, { login_phone: member.phone });
  const memberSession = await api('/auth/login-otp', null, { login_phone: member.phone, otp_code: otp.dev_otp, password });
  const packages = {}, regs = {};
  for (const name of ['QTV Cash', 'QTV Bank', 'LT Cash', 'LT Bank', 'Pending Cancel', 'Scheduled Paid', 'Near Four Days', 'Not Near Five Days', 'Create Pending']) {
    const pkg = await api('/packages', sessions[0].access_token, { package_name: name, package_type: 'GYM_TIME', price: 500000, duration_days: 30, branch_ids: [branches[0]] }); packages[name] = pkg;
    if (name === 'Create Pending') continue;
    const date = name === 'Scheduled Paid' ? new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10) : today();
    const reg = await api('/registrations', sessions[0].access_token, { member_id: member.id, package_id: pkg.id, sold_branch_id: branches[0], start_date: date }); regs[name] = reg;
    if (['Scheduled Paid', 'Near Four Days', 'Not Near Five Days'].includes(name)) await api('/payments', sessions[0].access_token, { registration_id: reg.id, payment_method: 'CASH' });
    if (name.startsWith('Near') || name.startsWith('Not Near')) await db.query("UPDATE registrations SET end_date=CURRENT_DATE+$2::int WHERE id=$1", [reg.id, name.startsWith('Near') ? 4 : 5]);
  }
  await db.query("UPDATE registrations SET created_at=NOW()-interval '4 days' WHERE id=$1", [regs['Pending Cancel'].id]);
  for (const [name, type, quota] of [['Undated Gym Three', 'GYM_SESSION', { total_gym_sessions: 3 }], ['Undated PT Three', 'PT_SESSION', { total_pt_sessions: 3 }]]) {
    const pkg = await api('/packages', sessions[0].access_token, { package_name: name, package_type: type, price: 500000, ...quota, branch_ids: [branches[0]] });
    const reg = await api('/registrations', sessions[0].access_token, { member_id: member.id, package_id: pkg.id, sold_branch_id: branches[0], start_date: today() });
    await api('/payments', sessions[0].access_token, { registration_id: reg.id, payment_method: 'CASH' }); regs[name] = reg;
  }
  fixture = { branches, sessions, member, memberSession, packages, regs };
  await api('/access-gate/manual-checkin', sessions[0].access_token, { member_id: member.id, registration_id: regs['Near Four Days'].id, branch_id: branches[0], direction: 'IN', reason: 'Isolated dashboard projection fixture' });
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  console.log('ISOLATED', dbName, base, ui);
}
function report(role) {
  const id = role === 'qtv' ? 'QTV-W08-US02' : 'LT-W08-US02';
  const dir = path.join(root, 'tests/e2e', role, id, 'payment-ledger-20260921', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(dir, { recursive: true });
  const result = { id, dir, role, steps: [], state: [], issues: [] }; reports.push(result); return result;
}
async function pageFor(session, branch, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, timezoneId: 'Asia/Bangkok', serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.port === '5000' || url.pathname.startsWith('/api/')) {
      network.push({ role: current.role, method: route.request().method(), path: url.pathname, isolated: base });
      return route.continue({ url: base + url.pathname + url.search });
    }
    return route.continue();
  });
  await context.addInitScript(({ session, branch, origin }) => {
    if (location.origin !== origin) return;
    localStorage.setItem('paradise_access_token', session.access_token);
    localStorage.setItem('paradise_user', JSON.stringify(session.user));
    localStorage.setItem('paradise_current_branch_id', branch);
  }, { session, branch, origin: ui });
  const page = await context.newPage(); page.setDefaultTimeout(15000); activePage = page;
  await page.goto(ui + (mobile ? '/mobile/member/#payments/history' : '/web/#payments'), { waitUntil: 'commit', timeout: 30000 });
  await page.locator(mobile ? 'article.record' : '.sales-kpi-summary').first().waitFor({ timeout: 60000 });
  return page;
}
async function record(page, name, locator, action, expected, verify, section = 'source') {
  activePage = page;
  let status = 'PASS', actual;
  try { await locator.waitFor({ state: 'visible' }); actual = await verify(); } catch (error) { status = 'FAIL'; actual = error.message; current.issues.push(`${name}: ${actual}`); }
  if (!await locator.isVisible()) locator = page.locator('body');
  await locator.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  const rect = await locator.boundingBox(), number = current.steps.length + 1;
  await page.evaluate(({ rect, number }) => {
    const box = document.createElement('div'); box.id = 'payment-e2e-annotation';
    box.style.cssText = `position:fixed;left:${Math.max(0, rect.x)}px;top:${Math.max(0, rect.y)}px;width:${Math.min(rect.width, innerWidth)}px;height:${Math.min(rect.height, innerHeight)}px;border:3px solid #e11d48;pointer-events:none;z-index:2147483647;box-sizing:border-box`;
    const badge = document.createElement('span'); badge.textContent = number;
    badge.style.cssText = 'position:absolute;top:0;left:0;background:#e11d48;color:white;border:2px solid white;border-radius:50%;width:26px;height:26px;display:grid;place-items:center;font:bold 14px Arial';
    box.append(badge); document.body.append(box);
  }, { rect, number });
  const filename = `${section === 'downstream' ? 'downstream' : 'step'}-${String(number).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(current.dir, filename) });
  await page.evaluate(() => document.querySelector('#payment-e2e-annotation')?.remove());
  current.steps.push({ name, action, expected, actual, status, section, filename }); console.log(current.role, status, name);
  if (status === 'FAIL') throw new Error(actual);
}
async function contains(locator, text) { assert(await locator.isVisible()); const actual = await locator.innerText(); assert(actual.includes(text), `Missing ${text}: ${actual}`); return actual; }
const modal = page => page.locator('.sales-modal .dx-popup-content:visible, .sales-detail-drawer .dx-popup-content:visible').last();
async function choose(page, label, text) {
  await page.getByLabel(label, { exact: false }).first().click();
  const list = page.locator('.dx-overlay-wrapper .dx-list:visible').last();
  await record(page, 'open-options', list, `Open ${label}`, 'US02 field-level searchable options shown', () => contains(list, text));
  await page.locator('.dx-list-item:visible').filter({ hasText: text }).first().click();
  await record(page, 'select-option', modal(page), `Choose ${text}`, 'Selected value shown before submit', () => modal(page).innerText());
}
async function ledgerControls(page) {
  await page.locator('.sales-kpi-summary').waitFor();
  await record(page, 'ledger-controls', page.locator('.sales-view'), 'Open payment ledger', 'User correction + US01/US03: two KPIs; no payment-status filter/column or pending KPI', async () => {
    const labels = await page.locator('.sales-view .filter-bar label').allTextContents(); assert(!labels.includes('Trạng thái'));
    assert.equal(await page.locator('.sales-kpi-summary strong').count(), 2);
    assert(!(await page.locator('.sales-kpi-summary').innerText()).includes('Đơn chờ'));
    const columns = await page.locator('.sales-view .dx-datagrid-headers td[role="columnheader"]').allTextContents(); assert(!columns.some(c => c.trim() === 'Trạng thái'));
    assert(columns.some(c => c.trim() === 'Số tiền'));
    return { labels, columns, kpis: await page.locator('.sales-kpi-summary').innerText() };
  });
  await page.getByRole('button', { name: 'Toàn thời gian', exact: true }).click(); await page.waitForTimeout(500);
  await record(page, 'all-time-ledger', page.locator('.sales-view'), 'Clear date restrictions', 'US01 date filters allow complete history', () => page.locator('.sales-view').innerText());
}
async function pay(page, name, method, session) {
  const reg = fixture.regs[name];
  await page.getByRole('button', { name: 'Ghi nhận thanh toán', exact: true }).click();
  await page.getByLabel('Gói tập đăng ký chờ thanh toán').waitFor();
  await record(page, 'open-payment', modal(page), `Open ${name} payment form`, 'US02 MF2: payment form with same active member and pending registrations', () => contains(modal(page), 'Hội viên cần thanh toán'));
  await choose(page, 'Gói tập đăng ký chờ thanh toán', name);
  if (method === 'BANK_TRANSFER') {
    await page.getByRole('radio', { name: 'Chuyển khoản', exact: true }).click();
    await page.getByRole('button', { name: 'Đối chiếu thủ công', exact: true }).waitFor();
    await page.waitForFunction(() => { const img = document.querySelector('img[alt="Mã VietQR thanh toán"]'); return img?.complete && img.naturalWidth > 0; }, null, { timeout: 45000 });
    await record(page, 'bank-qr-intent', page.locator('img[alt="Mã VietQR thanh toán"]'), 'Select bank transfer', 'US02 MF7: decoded QR visible, intent has 15-minute TTL; registration pending and absent from final ledger', async () => {
      const intents = (await db.query('SELECT * FROM payment_intents WHERE registration_id=$1 ORDER BY created_at DESC', [reg.id])).rows;
      assert.equal(intents[0].state, 'PENDING'); assert.equal(new Date(intents[0].expires_at) - new Date(intents[0].created_at), 900000);
      assert.equal((await db.query('SELECT count(*) FROM payments WHERE registration_id=$1', [reg.id])).rows[0].count, '0');
      assert.equal((await api(`/registrations/${reg.id}`, session.access_token)).status, 'PENDING_PAYMENT');
      assert(await page.locator('img[alt="Mã VietQR thanh toán"]').isVisible());
      return { registrationId: reg.id, intentId: intents[0].id, state: intents[0].state, ttlSeconds: 900 };
    });
    await page.getByRole('button', { name: 'Đối chiếu thủ công', exact: true }).click();
    await record(page, 'manual-bank-modal', modal(page), 'Open manual reconciliation', 'Manual BANK_TRANSFER form requires transaction reference and reconciliation checkbox', () => contains(modal(page), 'Mã giao dịch trên chứng từ ngân hàng'));
    await page.getByRole('button', { name: 'Xác nhận đã nhận đủ tiền', exact: true }).click();
    await record(page, 'required-bank-reference', modal(page), 'Submit with empty bank reference', 'User requirement: missing transaction reference blocks settlement', async () => {
      assert(await modal(page).locator('.dx-invalid').count() > 0);
      assert.equal((await db.query('SELECT count(*) FROM payments WHERE registration_id=$1', [reg.id])).rows[0].count, '0');
      return 'Required-field validation visible; no ledger row';
    });
    await page.getByLabel('Mã giao dịch trên chứng từ ngân hàng').fill(`REF-${name.replaceAll(' ', '-')}`);
    await page.getByRole('checkbox').last().click();
    await record(page, 'manual-bank-filled-before-submit', modal(page), 'Enter actual test reference and confirm reconciliation checkbox', 'Input Capture Before Submit: bank reference visible, method remains BANK_TRANSFER', async () => {
      assert.equal(await page.getByLabel('Mã giao dịch trên chứng từ ngân hàng').inputValue(), `REF-${name.replaceAll(' ', '-')}`);
      return contains(modal(page), 'Chuyển khoản');
    });
    await page.getByRole('button', { name: 'Xác nhận đã nhận đủ tiền', exact: true }).click();
  } else {
    await page.getByLabel('Ghi chú giao dịch').fill(`Cash ${name}`);
    await record(page, 'cash-filled-before-submit', modal(page), `Enter note for ${name}`, 'Cash selected; no bank-reference field; entered note captured before settlement', async () => {
      assert.equal(await page.getByLabel('Ghi chú giao dịch').inputValue(), `Cash ${name}`);
      assert.equal(await page.getByLabel('Mã giao dịch trên chứng từ ngân hàng').count(), 0);
      return contains(modal(page), 'Tiền mặt');
    });
    await page.getByRole('button', { name: 'Xác nhận đã thu đủ tiền mặt', exact: true }).click();
  }
  await page.locator('.sales-receipt').waitFor();
  let payment;
  await record(page, 'settled-receipt', page.locator('.sales-receipt'), `Confirm ${name} payment`, 'US02 MF10-12: exactly one final payment and receipt, same member, correct method, registration active', async () => {
    payment = rows(await api('/payments?member_id=' + fixture.member.id, session.access_token)).find(p => p.registration_id === reg.id);
    assert(payment); assert(!Object.hasOwn(payment, 'status')); assert.equal(payment.payment_method, method); assert.equal(payment.member_id, fixture.member.id);
    if (method === 'BANK_TRANSFER') assert.equal(payment.transaction_ref, `REF-${name.replaceAll(' ', '-')}`);
    assert.equal((await api(`/registrations/${reg.id}`, session.access_token)).status, 'ACTIVE');
    assert.equal((await db.query('SELECT count(*) FROM receipts WHERE payment_id=$1', [payment.id])).rows[0].count, '1');
    return contains(page.locator('.sales-receipt'), 'Payment Same Member');
  });
  current.state.push({ registrationId: reg.id, paymentId: payment.id, memberId: fixture.member.id, method, reference: payment.transaction_ref, amount: payment.amount });
  await modal(page).getByRole('button', { name: 'Đóng', exact: true }).click();
  await record(page, 'ledger-after-settlement', page.locator('.sales-view'), 'Close receipt', 'New successful row visible in source ledger without status', () => contains(page.locator('.sales-view'), name));
  const mobile = await pageFor(fixture.memberSession, fixture.branches[0], true);
  await mobile.waitForFunction(() => document.body.textContent.includes('Lịch sử thanh toán'));
  const card = mobile.locator('article.record').filter({ hasText: name }).first();
  await record(mobile, 'same-member-payment-history', card, 'Open authenticated same-member payment history', 'Downstream shows same package, amount and payment method after source settlement', async () => {
    const user = await mobile.evaluate(() => JSON.parse(localStorage.getItem('paradise_user'))); assert.equal(user.member_profile_id, fixture.member.id);
    await contains(card, method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản');
    if (payment.receipt_code) await contains(card, payment.receipt_code);
    return contains(card, '500.000');
  }, 'downstream');
  await mobile.close(); activePage = page;
}
async function registrationChecks(page) {
  await page.locator('#sidebarList [data-menu="registrations"]').click();
  await page.locator('.sales-view .dx-data-row').first().waitFor();
  const openDetail = async name => {
    await page.getByLabel('Tìm đăng ký', { exact: true }).fill(name);
    await page.waitForFunction(name => document.querySelector('.sales-view .dx-data-row')?.textContent.includes(name), name);
    await record(page, 'filter-registration', page.locator('.sales-view'), `Filter ${name}`, 'Matching registration visible before opening detail', () => contains(page.locator('.sales-view .dx-data-row').first(), name));
    await page.getByRole('button', { name: 'Chi tiết đăng ký', exact: true }).first().click(); await modal(page).getByRole('heading', { name: 'Thanh toán 100%' }).waitFor();
  };
  await openDetail('Scheduled Paid');
  await record(page, 'scheduled-no-freeze', modal(page), 'Inspect scheduled paid registration', 'User rule: paid scheduled package cannot freeze; receipt stays accessible without payment.status', async () => {
    assert.equal(await modal(page).getByRole('button', { name: 'Đóng băng gói', exact: true }).count(), 0);
    assert(await modal(page).getByRole('button', { name: 'Xem phiếu thu', exact: true }).isVisible());
    return contains(modal(page), 'Chưa đến ngày hiệu lực');
  });
  await page.locator('.dx-popup-title .dx-closebutton:visible').last().click();
  await openDetail('Near Four Days');
  await record(page, 'near-expiry-can-freeze', modal(page).getByRole('button', { name: 'Đóng băng gói', exact: true }), 'Inspect paid four-day registration', 'Backend is_expiring flag drives badge; active paid package may freeze', async () => {
    assert(await modal(page).getByRole('button', { name: 'Đóng băng gói', exact: true }).isVisible());
    return contains(modal(page), 'Sắp hết hạn');
  });
  await page.locator('.dx-popup-title .dx-closebutton:visible').last().click();
  await openDetail('Pending Cancel');
  await record(page, 'pending-persists-no-freeze', modal(page), 'Inspect registration created four days ago', 'No automatic cancellation; pending can be explicitly cancelled and cannot freeze', async () => {
    assert.equal(await modal(page).getByRole('button', { name: 'Đóng băng gói', exact: true }).count(), 0);
    assert(await modal(page).getByRole('button', { name: 'Hủy đơn đăng ký', exact: true }).isVisible());
    return contains(modal(page), 'Chờ thanh toán');
  });
  await page.getByRole('button', { name: 'Hủy đơn đăng ký', exact: true }).click();
  await page.getByLabel('Lý do hủy đơn').fill('Explicit test cancellation');
  await record(page, 'cancel-filled-before-submit', modal(page), 'Enter cancellation reason', 'Explicit user cancellation form captured before submit', async () => { assert.equal(await page.getByLabel('Lý do hủy đơn').inputValue(), 'Explicit test cancellation'); return modal(page).innerText(); });
  await page.getByRole('button', { name: 'Xác nhận hủy đơn', exact: true }).click();
  await page.waitForFunction(() => $('.sales-modal .dx-popup-content:visible, .sales-detail-drawer .dx-popup-content:visible').length === 0);
  await record(page, 'cancelled-registration', page.locator('.sales-view .dx-data-row').filter({ hasText: 'Pending Cancel' }).first(), 'Confirm cancellation', 'Registration changes to cancelled only after explicit request', () => contains(page.locator('.sales-view .dx-data-row').filter({ hasText: 'Pending Cancel' }).first(), 'Đã hủy'));
  await page.locator('#sidebarList [data-menu="customer-care"]').click();
  await page.getByRole('tab').filter({ hasText: 'Sắp hết hạn' }).click();
  for (const [name, label] of [['Undated Gym Three', 'Còn 3 lượt Gym'], ['Undated PT Three', 'Còn 3 buổi PT']]) {
    const row = page.locator('.customer-care-content .dx-data-row').filter({ hasText: name }).first();
    await record(page, 'undated-session-expiry', row, `Inspect ${name} in customer care`, 'Backend expiring list includes undated session package; render real remaining sessions and no fabricated day count', async () => {
      const text = await contains(row, label); assert(!text.includes('null')); assert(!text.includes('undefined')); assert(!text.includes('ngày'));
      return text;
    });
  }
}
async function scenario(name, fn) {
  try { await fn(); } catch (error) {
    current.issues.push(`${name}: ${error.message}`); current.blocked = name; console.error(current.role, 'BLOCKED', name, error.message);
    if (activePage && !activePage.isClosed()) await record(activePage, 'blocked', activePage.locator('body'), name, 'Complete scenario', async () => { throw error; }).catch(() => {});
    if (activePage && !activePage.isClosed()) await activePage.reload({ waitUntil: 'networkidle' }).catch(() => {});
  }
}
async function expiryProjections(page) {
  await page.locator('#sidebarList [data-menu="dashboard"]').click();
  const activity = page.locator('.activity-row').filter({ hasText: 'Near Four Days' }).first();
  await record(page, 'dashboard-canonical-expiry', activity, 'Open dashboard access-log projection', 'Same registration uses canonical backend expiry flag', () => contains(activity, 'Sắp hết hạn'));
  await page.locator('#sidebarList [data-menu="members"]').click();
  await page.getByRole('link', { name: fixture.member.member_code, exact: true }).click();
  const row = page.locator('.dx-popup-content:visible .dx-data-row').filter({ hasText: 'Near Four Days' }).first();
  await record(page, 'member-detail-canonical-expiry', row, 'Open same member registration list', 'Member-detail registration uses the same canonical expiry flag', () => contains(row, 'Sắp hết hạn'));
  const nonNear = page.locator('.dx-popup-content:visible .dx-data-row').filter({ hasText: 'Not Near Five Days' }).first();
  await record(page, 'member-detail-five-days-active', nonNear, 'Inspect five-day member registration', 'Five days does not meet four-day threshold', async () => {
    const text = await contains(nonNear, 'Đang hiệu lực'); assert(!text.includes('Sắp hết hạn')); return text;
  });
  await page.locator('.dx-popup-title .dx-closebutton:visible').last().click();
}
function writeReports() {
  for (const r of reports) {
    const result = r.blocked ? 'BLOCKED' : r.issues.length ? 'FAIL' : r.steps.length ? 'PASS' : 'NOT_RUN';
    const render = section => r.steps.filter(s => s.section === section).map(s => `### ${s.action}\n\nExpected: ${s.expected}\n\nActual: ${typeof s.actual === 'string' ? s.actual : JSON.stringify(s.actual)}\n\nStatus: **${s.status}**\n\n![${s.name}](./${s.filename})`).join('\n\n');
    const output = { result, database: dbName, backend: base, ui, migrations, provenance, sourceHashes, steps: r.steps, state: r.state, issues: r.issues, cleanup, network: network.filter(n => n.role === r.role), fixture: fixture && { memberId: fixture.member.id, branches: fixture.branches }, screenshots: r.steps.map(s => ({ file: s.filename, sha256: hash(fs.readFileSync(path.join(r.dir, s.filename))) })) };
    fs.writeFileSync(path.join(r.dir, 'results.json'), JSON.stringify(output, null, 2));
    fs.writeFileSync(path.join(r.dir, `${r.id}-test.md`), `# ${r.id} payment ledger E2E\n\nResult: **${result}**. Real isolated PostgreSQL and private static/API servers. No mock responses. Sources: ${r.id} MF1-12/field-level specification; sibling US01/US03 ledger; user corrections 2026-09-21 override stale payment status text. SQL fixtures only in disposable DB, API-created packages/registrations, activated same member. Migration hashes/provenance in results.json. Bank transfer is manual reconciliation with test reference, not a real bank settlement.\n\n## Source Action Verification\n\n${render('source')}\n\n## State Verification\n\n${JSON.stringify(r.state, null, 2)}\n\n## Cross-Role / Downstream Verification\n\n${render('downstream') || 'Not reached; no downstream PASS claimed.'}\n\n## Issues Found\n\n${r.issues.join('\n\n') || 'None in executed checks.'}\n\n## Final Result\n\n**${result}**; ${r.steps.filter(s => s.status === 'PASS').length}/${r.steps.length} steps passed. Cleanup: ${JSON.stringify(cleanup)}.\n`);
    const parent = path.resolve(r.dir, '../..');
    fs.writeFileSync(path.join(parent, `${r.id}-test.md`), `# ${r.id}\n\nLatest payment ledger run: **${result}**.\n\n[Detailed report](./${path.relative(parent, path.join(r.dir, `${r.id}-test.md`)).replaceAll('\\', '/')})\n`);
    console.log(r.id, result, r.dir);
  }
}
async function main() {
  current = report('qtv'); await setup();
  const qtv = await pageFor(fixture.sessions[0], fixture.branches[0]);
  await scenario('QTV ledger controls', () => ledgerControls(qtv));
  await scenario('QTV cash and member downstream', () => pay(qtv, 'QTV Cash', 'CASH', fixture.sessions[0]));
  await scenario('QTV manual bank and member downstream', () => pay(qtv, 'QTV Bank', 'BANK_TRANSFER', fixture.sessions[0]));
  await scenario('QTV registration guards', () => registrationChecks(qtv));
  await scenario('QTV canonical expiry projections', () => expiryProjections(qtv));
  current = report('lt');
  const lt = await pageFor(fixture.sessions[1], fixture.branches[0]);
  await scenario('LT ledger controls', () => ledgerControls(lt));
  await scenario('LT cash and member downstream', () => pay(lt, 'LT Cash', 'CASH', fixture.sessions[1]));
  await scenario('LT manual bank and member downstream', () => pay(lt, 'LT Bank', 'BANK_TRANSFER', fixture.sessions[1]));
  await scenario('LT other branch isolation', async () => {
    const other = await pageFor(fixture.sessions[2], fixture.branches[1]);
    await other.locator('.sales-kpi-summary').waitFor();
    await record(other, 'other-branch-no-ledger', other.locator('.sales-view'), 'Open receptionist of Branch B', 'LT US01 scope: cannot see Branch A member payments', async () => {
      assert.equal(await other.locator('.sales-view .dx-data-row').count(), 0);
      assert(!(await other.locator('.sales-view').innerText()).includes('Payment Same Member'));
      return other.locator('.sales-view').innerText();
    }, 'downstream');
  });
}
main().catch(error => { if (current) { current.blocked = 'setup'; current.issues.push(error.stack); } console.error(error); }).finally(async () => {
  const attempt = async (name, fn) => { try { await fn(); cleanup[name] = true; } catch (error) { cleanup[name] = error.message; process.exitCode = 1; } };
  await attempt('browserClosed', async () => browser?.close());
  for (const [name, server] of [['apiClosed', backend], ['staticClosed', staticServer]]) await attempt(name, async () => { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } });
  await attempt('poolsClosed', async () => { await pool?.end(); await db?.end(); });
  await attempt('databaseDropped', async () => {
    if (created) { await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [dbName]); await admin.query(`DROP DATABASE "${dbName}"`); assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [dbName])).rowCount, 0); }
    await admin?.end();
  });
  const drift = watched.filter(file => hash(fs.readFileSync(path.join(root, file))) !== sourceHashes[file]);
  if (drift.length) for (const r of reports) r.issues.push(`Source drift during run: ${drift.join(', ')}`);
  writeReports(); if (reports.some(r => r.issues.length || r.blocked)) process.exitCode = 1;
});

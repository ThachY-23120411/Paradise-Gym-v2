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
assert(originalUrl, 'DATABASE_URL required');
const dbName = `paradise_auth_test_${process.pid}_${Date.now()}`;
const password = 'Auth-Business-Test9!';
const reports = new Map();
const migrations = [], network = [], pageErrors = [];
const sourceProvenance = [], browserDocuments = [], lookupEvidence = [];
const cleanup = { browserClosed: false, serverClosed: false, uiClosed: false, databaseDropped: false, errors: [] };
let db, admin, pool, server, uiServer, browser, base, ui, created = false, fixture;
let current, activePage, phase;
function report(id) {
  if (!reports.has(id)) {
    const dir = path.join(__dirname, id, 'auth-business-20260921');
    if (fs.existsSync(path.join(dir, 'results.json'))) {
      const archive = path.join(dir, 'history', new Date().toISOString().replace(/[:.]/g, '-'));
      fs.mkdirSync(archive, { recursive: true });
      for (const file of fs.readdirSync(dir, { withFileTypes: true })) if (file.isFile()) fs.copyFileSync(path.join(dir, file.name), path.join(archive, file.name));
    }
    fs.mkdirSync(dir, { recursive: true });
    reports.set(id, { id, dir, steps: [], checks: [], issues: [], blocked: [] });
  }
  return reports.get(id);
}
async function api(endpoint, token, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const value = await response.json();
  assert.equal(response.status, 200, `${endpoint}: ${value.message}`);
  return value.data;
}
async function setup() {
  admin = new Client({ connectionString: originalUrl }); await admin.connect();
  assert(/^paradise_auth_test_\d+_\d+$/.test(dbName));
  await admin.query(`CREATE DATABASE "${dbName}"`); created = true;
  const target = new URL(originalUrl); target.pathname = '/' + dbName;
  process.env.DATABASE_URL = target.toString(); process.env.NODE_ENV = 'test'; process.env.AUTH_OTP_MODE = 'development';
  db = new Client({ connectionString: target.toString() }); await db.connect();
  assert.equal((await db.query('SELECT current_database() name')).rows[0].name, dbName);
  for (const file of fs.readdirSync(path.join(root, 'backend/src/db/migrations')).filter(x => x.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(root, 'backend/src/db/migrations', file), 'utf8');
    await db.query(sql); migrations.push({ file, sha256: createHash('sha256').update(sql).digest('hex') });
  }
  for (const role of ['QTV', 'RECEPTIONIST', 'PT', 'MEMBER']) await db.query('INSERT INTO roles(role_code,role_name) VALUES($1,$1)', [role]);
  const branch = randomUUID(), owner = randomUUID();
  await db.query("INSERT INTO branches(id,branch_code,branch_name,phone,address,open_time,close_time) VALUES($1,'AUTH-E2E','Auth Test Branch','0909999999','Disposable auth fixture','06:00','22:00')", [branch]);
  await db.query("INSERT INTO accounts(id,login_phone,password_hash,status,is_two_factor_enabled) VALUES($1,'0909210001',$2,'ACTIVE',false)", [owner, await bcrypt.hash(password, 4)]);
  await db.query("INSERT INTO account_roles(account_id,role_id) SELECT $1,id FROM roles WHERE role_code='QTV'", [owner]);
  await db.query('INSERT INTO account_branch_scopes(account_id,branch_id,is_all_branches) VALUES($1,$2,true)', [owner, branch]);
  const app = require(path.join(root, 'backend/src/server'));
  pool = require(path.join(root, 'backend/src/db/postgres')).pool;
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const express = dep('express'), staticApp = express();
  staticApp.use(express.static(path.join(root, 'frontend')));
  uiServer = await new Promise(resolve => { const s = staticApp.listen(0, '127.0.0.1', () => resolve(s)); });
  ui = `http://127.0.0.1:${uiServer.address().port}`;
  for (const relative of ['mobile/index.html', 'mobile/js/login.js', 'mobile/pt/index.html', 'mobile/pt/js/auth.js', 'mobile/pt/js/app.js', 'shared/apiClient.js']) {
    const sourcePath = path.join(root, 'frontend', relative);
    const url = `${ui}/${relative}`;
    const response = await fetch(url); assert.equal(response.status, 200);
    const bytes = Buffer.from(await response.arrayBuffer());
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const diskSha256 = createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
    assert.equal(sha256, diskSha256, `Served source differs: ${url}`);
    sourceProvenance.push({ url, sourcePath, sha256, diskSha256, matched: true });
  }
  const staff = await api('/auth/login-password', null, { login_phone: '0909210001', password });
  const trainer = await api('/pt-bookings/trainers', staff.access_token, { full_name: 'Auth Business Trainer', phone: '0909210020', branch_id: branch, specialties: 'Strength' });
  const state = (await db.query('SELECT status,password_hash FROM accounts WHERE id=$1', [trainer.account_id])).rows[0];
  assert.equal(state.status, 'PENDING_ACTIVATION'); assert.equal(state.password_hash, null);
  fixture = { trainer, branch, branchName: 'Auth Test Branch', setup: 'QTV created pending PT through real API. No activation/session injected into browser. 2FA later enabled as isolated account prerequisite.' };
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
}
async function page() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Bangkok', serviceWorkers: 'block' });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.port === '5000' || url.pathname.startsWith('/api/')) {
      const target = new URL(base); target.pathname = url.pathname; target.search = url.search;
      return route.continue({ url: target.toString() });
    }
    return route.continue();
  });
  const p = await context.newPage(); p.setDefaultTimeout(12000); activePage = p;
  p.on('pageerror', e => { pageErrors.push({ story: current.id, message: e.message }); current.issues.push(`Browser: ${e.message}`); });
  p.on('response', r => { if (new URL(r.url()).pathname.startsWith('/api/')) network.push({ story: current.id, path: new URL(r.url()).pathname, method: r.request().method(), status: r.status() }); });
  await p.goto(ui + '/mobile/pt/', { waitUntil: 'networkidle' });
  await p.locator('#panelPassword').waitFor({ state: 'visible' });
  browserDocuments.push({ story: current.id, requested: ui + '/mobile/pt/', final: p.url(), scripts: await p.locator('script[src]').evaluateAll(es => es.map(e => e.src)) });
  return p;
}
async function capture(p, locator, name, action, expected, verify, section = 'source') {
  await locator.waitFor({ state: 'visible' }); await locator.scrollIntoViewIfNeeded();
  await p.waitForTimeout(200);
  let status = 'PASS', actual;
  try { actual = await verify(); } catch (error) { status = 'FAIL'; actual = error.message; current.issues.push(`${action}: ${actual}`); }
  const number = current.steps.length + 1;
  const filename = `${section === 'downstream' ? 'downstream' : 'step'}-${String(number).padStart(2, '0')}-${name}.png`;
  const rect = await locator.boundingBox(); assert(rect);
  await p.evaluate(({ rect, number }) => {
    const box = document.createElement('div'); box.id = 'auth-e2e-annotation';
    box.style.cssText = `position:fixed;left:${rect.x}px;top:${rect.y}px;width:${rect.width}px;height:${rect.height}px;border:3px solid #e11d48;z-index:2147483647;pointer-events:none;box-sizing:border-box`;
    const badge = document.createElement('span'); badge.textContent = number;
    badge.style.cssText = 'position:absolute;left:0;top:0;background:#e11d48;color:white;border-radius:50%;width:24px;height:24px;text-align:center;font:bold 14px/24px Arial';
    box.append(badge); document.body.append(box);
  }, { rect, number });
  await p.screenshot({ path: path.join(current.dir, filename) });
  await p.evaluate(() => document.getElementById('auth-e2e-annotation')?.remove());
  current.steps.push({ action, expected, actual, status, section, filename });
  console.log(`${current.id} ${status}: ${action}`); writeReports();
}
async function filled(p, selector, value, label) {
  await p.locator(selector).fill(value);
  await capture(p, p.locator(selector), label, `Enter ${label}`, 'US input field retains entered value before submission', async () => { assert.equal(await p.locator(selector).inputValue(), value); return selector.toLowerCase().includes('password') ? 'Password input filled (value not logged)' : value; });
}
async function otp(p, container, code, label) {
  assert(/^\d{6}$/.test(code));
  const boxes = p.locator(`${container} .otp-box`); assert.equal(await boxes.count(), 6);
  for (let i = 0; i < 6; i++) await boxes.nth(i).fill(code[i]);
  await capture(p, p.locator(container), label, `Enter ${label}`, 'Six OTP digits entered before submit', async () => { assert.equal((await boxes.evaluateAll(es => es.map(e => e.value))).join(''), code); return 'Six test OTP digits entered; value excluded from JSON'; });
}
async function submit(p, button, endpoint) {
  const waiting = p.waitForResponse(r => new URL(r.url()).pathname === '/api/v1' + endpoint && r.request().method() === 'POST')
    .then(async response => ({ status: response.status(), value: await response.json() }));
  // Read the real body before the successful login redirects and discards it.
  const [result] = await Promise.all([waiting, p.locator(button).click()]);
  return result;
}
async function noSession(p) {
  assert.equal(await p.evaluate(() => localStorage.getItem('paradise_access_token')), null);
}
async function invalid(p, result, expectedCode, label, expectedStatus) {
  await p.locator('.login-toast').waitFor({ state: 'visible' });
  await capture(p, p.locator('.login-toast'), label, `Reject ${label}`, 'PT05 AF-04: invalid credential shows error, no session, retry remains available', async () => {
    assert.equal(result.status, expectedStatus); assert.equal(result.value.code, expectedCode);
    assert((await p.locator('.login-toast').innerText()).includes(result.value.message)); await noSession(p);
    const a = (await db.query('SELECT failed_login_attempts,locked_until FROM accounts WHERE id=$1', [fixture.trainer.account_id])).rows[0];
    assert(!a.locked_until || new Date(a.locked_until) <= new Date());
    return { status: result.status, code: result.value.code, message: result.value.message, failedAttempts: a.failed_login_attempts, sessionAbsent: true };
  });
}
async function entered(p, result, label) {
  assert.equal(result.status, 200, result.value.message);
  assert.equal(result.value.data.user.pt_profile_id, fixture.trainer.id);
  await p.waitForURL('**/mobile/pt/');
  await p.waitForFunction(() => window.ptApp?.currentUser?.pt_profile_id);
  await capture(p, p.locator('#bottomNav'), label, `${label}: authenticated PT destination`, 'PT05 Main Flow: valid session for same trainer opens PT06 overview', async () => {
    const state = await p.evaluate(() => ({ tab: ptApp.currentTab, id: ptApp.currentUser.pt_profile_id, role: ptApp.currentUser.active_role, hasToken: !!localStorage.getItem('paradise_access_token') }));
    assert.equal(state.id, fixture.trainer.id); assert.equal(state.role, 'PT'); assert(state.hasToken);
    assert.equal(state.tab, 'overview', `Authenticated correctly but landed on ${state.tab}; US requires PT06 overview`);
    return state;
  }, 'downstream');
  current.checks.push({ name: label + ' real session', status: 'PASS', actual: { accountId: result.value.data.user.account_id, trainerId: fixture.trainer.id, httpStatus: 200 } });
}
async function activation() {
  const p = await page();
  await capture(p, p.locator('#panelPassword'), 'login-entry', 'Open unauthenticated mobile entry', 'PT05-US02 Trigger: activation entry available, no session injected', async () => { await noSession(p); assert(await p.locator('#linkGoActivate').isVisible()); return 'Activation entry visible'; });
  await p.locator('#linkGoActivate').click();
  await capture(p, p.locator('#panelActivate'), 'open-activation', 'Open activation panel', 'US02 Trigger: activation fields visible', async () => { assert(await p.locator('#actIdentifier').isVisible()); return 'Activation panel visible'; });
  await filled(p, '#actIdentifier', fixture.trainer.phone, 'activation-phone');
  await p.locator('#actRole').selectOption('PT');
  await capture(p, p.locator('#actRole'), 'activation-role', 'Select PT for registered phone', 'PT phone activation uses explicit PT role', async () => { assert.equal(await p.locator('#actRole').inputValue(), 'PT'); return 'PT selected'; });
  const phoneLookup = await submit(p, '#btnActLookup', '/auth/activation-lookup');
  lookupEvidence.push({ url: base + '/auth/activation-lookup', pageUrl: p.url(), identifier: fixture.trainer.phone, requestedRole: 'PT', status: phoneLookup.status, response: phoneLookup.value });
  await capture(p, p.locator('#panelActivate'), 'phone-lookup', 'Look up pending PT by registered phone', 'US02 Main Flow 1-2: registered PT phone resolves pending trainer', async () => { assert.equal(phoneLookup.status, 200, `HTTP ${phoneLookup.status}: ${phoneLookup.value.message}`); assert.equal(phoneLookup.value.data.status, 'PENDING_ACTIVATION'); return 'Pending PT resolved'; });
  await filled(p, '#actIdentifier', fixture.trainer.pt_code, 'activation-pt-code');
  const lookup = await submit(p, '#btnActLookup', '/auth/activation-lookup'); assert.equal(lookup.status, 200);
  await filled(p, '#actIdentifier', fixture.trainer.phone, 'activation-return-phone');
  await capture(p, p.locator('#panelActivate'), 'identity-change-clears-preview', 'Change PT code to phone', 'Stale preview and OTP fields hidden until lookup', async () => { assert(!await p.locator('#actProfilePreview').isVisible()); assert(!await p.locator('#actStepOtp').isVisible()); return 'Previous identity invalidated'; });
  const phoneAgain = await submit(p, '#btnActLookup', '/auth/activation-lookup'); assert.equal(phoneAgain.status, 200);
  lookupEvidence.push({ url: base + '/auth/activation-lookup', pageUrl: p.url(), identifier: fixture.trainer.pt_code, requestedRole: 'PT', status: lookup.status, response: lookup.value });
  await capture(p, p.locator('#actProfilePreview'), 'profile-preview', 'Review pending trainer masked identity before activation', 'Privacy-preserving API contract: display returned masked_name and masked_code; do not require disclosure of full identity', async () => {
    const text = await p.locator('#actProfilePreview').innerText();
    assert.equal(lookup.value.data.branch_name, fixture.branchName);
    assert(text.includes(fixture.branchName));
    assert(!text.includes('Chi nhánh Paradise'));
    assert(!text.includes('Auth Business Trainer'));
    assert(text.includes(lookup.value.data.masked_name) && text.includes(lookup.value.data.masked_code), `API masked_name=${lookup.value.data.masked_name}; masked_code=${lookup.value.data.masked_code}; DOM=${text}. Generic branch is a portal fallback, not a branch returned by this API.`); return text;
  });
  const requested = await submit(p, '#btnActRequestOtp', '/auth/request-otp'); assert.equal(requested.status, 200);
  const code = requested.value.data.dev_otp; assert.equal(requested.value.data.delivery, 'DEVELOPMENT_ONLY');
  await capture(p, p.locator('#actOtpInputGroup'), 'activation-challenge', 'Request development activation OTP', 'US02: real six-digit challenge, server TTL 60 seconds; no production SMS claim', async () => { assert.equal(requested.value.data.ttl_seconds, 60); assert(await p.locator('#btnActRequestOtp').isDisabled()); return { delivery: requested.value.data.delivery, ttl: 60, resendDisabled: true }; });
  await otp(p, '#otpBoxesAct', code === '111111' ? '222222' : '111111', 'invalid-activation-otp');
  await filled(p, '#actPassword', password, 'activation-password');
  await filled(p, '#actConfirmPassword', password, 'activation-confirm-password');
  await invalid(p, await submit(p, '#btnActSubmit', '/auth/login-otp'), 'OTP_INVALID', 'invalid-activation-otp', 400);
  assert.equal((await db.query('SELECT status FROM accounts WHERE id=$1', [fixture.trainer.account_id])).rows[0].status, 'PENDING_ACTIVATION');
  await otp(p, '#otpBoxesAct', code, 'valid-activation-otp');
  const activated = await submit(p, '#btnActSubmit', '/auth/login-otp');
  await entered(p, activated, 'activation-success');
  const state = (await db.query('SELECT status,password_hash,otp_hash FROM accounts WHERE id=$1', [fixture.trainer.account_id])).rows[0];
  assert.equal(state.status, 'ACTIVE'); assert(await bcrypt.compare(password, state.password_hash)); assert.notEqual(state.password_hash, password); assert.equal(state.otp_hash, null);
  current.checks.push({ name: 'Activation persisted', status: 'PASS', actual: 'ACTIVE; password bcrypt hash verifies; consumed OTP cleared; same PT identity' });
}
async function passwordLogin(twoFactor = false) {
  const p = await page();
  await filled(p, '#loginIdentifier', fixture.trainer.pt_code, twoFactor ? '2fa-pt-code' : 'login-pt-code');
  if (!twoFactor) {
    await filled(p, '#loginPassword', 'Incorrect-Pass9!', 'invalid-password');
    await invalid(p, await submit(p, '#btnLoginPasswordSubmit', '/auth/login-password'), 'INVALID_CREDENTIALS', 'invalid-password', 401);
  }
  await filled(p, '#loginPassword', password, twoFactor ? '2fa-password' : 'valid-password');
  const response = await submit(p, '#btnLoginPasswordSubmit', '/auth/login-password');
  if (!twoFactor) { await entered(p, response, 'password-login'); return; }
  assert.equal(response.status, 200); const challenge = response.value.data;
  await capture(p, p.locator('#panel2Fa'), '2fa-challenge', 'Submit valid password with 2FA enabled', 'US01 Main Flow 5: challenge shown; no full session before second factor', async () => {
    assert.equal(challenge.requires_2fa, true); assert.equal(challenge.delivery, 'DEVELOPMENT_ONLY'); assert.equal(challenge.ttl_seconds, 60); await noSession(p);
    assert.equal(await p.locator('#twoFaMaskedPhone').innerText(), challenge.masked_phone); assert(await p.locator('#btnResend2FaOtp').isDisabled());
    return { requires2fa: true, delivery: challenge.delivery, ttl: challenge.ttl_seconds, maskedPhone: challenge.masked_phone, sessionAbsent: true };
  });
  await otp(p, '#otpBoxes2Fa', challenge.dev_otp === '111111' ? '222222' : '111111', 'invalid-2fa-otp');
  await invalid(p, await submit(p, '#btnVerify2FaSubmit', '/auth/verify-2fa'), 'OTP_INVALID', 'invalid-2fa-otp', 400);
  await otp(p, '#otpBoxes2Fa', challenge.dev_otp, 'valid-2fa-otp');
  await entered(p, await submit(p, '#btnVerify2FaSubmit', '/auth/verify-2fa'), '2fa-login');
}
async function otpLogin() {
  const p = await page(); await p.locator('#tabBtnOtp').click();
  await capture(p, p.locator('#panelOtp'), 'otp-mode', 'Switch to OTP login', 'US01 Trigger fields: phone visible, password hidden; OTP boxes hidden until request', async () => { assert(await p.locator('#loginOtpPhone').isVisible()); assert(!(await p.locator('#loginPassword').isVisible())); assert(!(await p.locator('#otpBoxesLogin').isVisible())); return 'OTP mode conditional fields correct'; });
  await filled(p, '#loginOtpPhone', fixture.trainer.phone, 'otp-login-phone');
  const requested = await submit(p, '#btnRequestLoginOtp', '/auth/request-otp'); assert.equal(requested.status, 200);
  const challenge = requested.value.data;
  await capture(p, p.locator('#otpBoxesGroup'), 'otp-login-challenge', 'Request login OTP', 'US01: real development challenge, 60-second TTL and six input boxes', async () => { assert.equal(challenge.delivery, 'DEVELOPMENT_ONLY'); assert.equal(challenge.ttl_seconds, 60); return { delivery: challenge.delivery, ttl: challenge.ttl_seconds }; });
  await otp(p, '#otpBoxesLogin', challenge.dev_otp === '111111' ? '222222' : '111111', 'invalid-login-otp');
  await invalid(p, await submit(p, '#btnLoginOtpSubmit', '/auth/login-otp'), 'OTP_INVALID', 'invalid-login-otp', 400);
  await otp(p, '#otpBoxesLogin', challenge.dev_otp, 'valid-login-otp');
  await entered(p, await submit(p, '#btnLoginOtpSubmit', '/auth/login-otp'), 'otp-login');
}
async function scenario(name, fn) {
  phase = name;
  try { await fn(); } catch (error) {
    current.blocked.push(name); current.issues.push(`${name}: ${error.message}`); console.error(`${current.id} BLOCKED ${name}: ${error.message}`);
    if (activePage && !activePage.isClosed()) await capture(activePage, activePage.locator('body'), 'blocker', `Blocked: ${name}`, 'Complete actual UI scenario', async () => { throw error; }).catch(() => {});
  }
  writeReports();
}
function writeReports() {
  for (const r of reports.values()) {
    const result = r.blocked.length ? 'BLOCKED' : r.issues.length ? 'FAIL' : r.steps.length ? 'PASS' : 'NOT_RUN';
    const render = section => r.steps.filter(s => s.section === section).map(s => `### ${s.action}\n\nExpected: ${s.expected}\n\nActual: ${typeof s.actual === 'string' ? s.actual : JSON.stringify(s.actual)}\n\nStatus: **${s.status}**\n\n![${s.action}](./${s.filename})`).join('\n\n');
    const history = path.join(r.dir, 'history');
    const data = { story: r.id, result, database: dbName, ui, backend: base, fixture, migrations, steps: r.steps, checks: r.checks, issues: r.issues, blocked: r.blocked, pageErrors: pageErrors.filter(e => e.story === r.id), network: network.filter(e => e.story === r.id), cleanup, screenshots: r.steps.map(s => ({ file: s.filename, sha256: createHash('sha256').update(fs.readFileSync(path.join(r.dir, s.filename))).digest('hex') })) };
    fs.writeFileSync(path.join(r.dir, 'results.json'), JSON.stringify(data, null, 2));
    fs.writeFileSync(path.join(r.dir, 'source-provenance.json'), JSON.stringify({ workspace: root, servedRoot: path.join(root, 'frontend'), server: ui, sourceProvenance, browserDocuments, lookupEvidence, privacy: 'masked_name/masked_code are intentional. Full-identity language in US02 is a documentation discrepancy; do not remove API privacy masking.' }, null, 2));
    fs.writeFileSync(path.join(r.dir, `${r.id}-test.md`), `# ${r.id} - Actual auth UI business E2E\n\nResult: **${result}**. Run: ${new Date().toISOString()}.\n\nSources: current docs/user-stories/pt/PT05-Dang nhap/${r.id} (Main Flow, input fields, AF-04); docs/product-spec.md PT navigation/integration rules.\n\nDatabase: ${dbName}; UI: ${ui}; isolated API: ${base}. Real API/SQL fixtures; browser auth performed through actual forms, with no injected PT tokens or mocked responses. All migrations applied; manifest in results.json. Development OTP only; **no production SMS delivery tested or claimed**. Separate ephemeral static server serves this checkout without touching the shared server.\n\n## Source Action Verification\n\n${render('source')}\n\n## State Verification\n\n${r.checks.map(c => `- **${c.status}** ${c.name}: ${JSON.stringify(c.actual)}`).join('\n') || 'No completed state checks yet.'}\n\n## Cross-Role / Downstream Verification\n\n${render('downstream') || 'Not reached. No downstream PASS claimed.'}\n\nAuth affects this same PT account; destination UI and real session identity checked. No member or financial entity is changed.\n\n## Issues Found\n\n${r.issues.map(x => '- ' + x).join('\n') || 'None in executed checks.'}\n\n## Final Result\n\n**${result}**; ${r.steps.filter(s => s.status === 'PASS').length}/${r.steps.length} recorded steps passed. Blocked scenarios: ${r.blocked.join(', ') || 'none'}.\n\nScope excludes production SMS, provider delivery, trusted-device detection, full resend-limit/expiry/5-attempt lockout coverage. No source fixes.\n\nCleanup: ${JSON.stringify(cleanup)}\n\nPrior evidence: ${fs.existsSync(history) ? fs.readdirSync(history).map(run => `[${run}](./history/${run}/${r.id}-test.md)`).join(', ') : 'none'}.\n`);
  }
}
async function main() {
  current = report('PT05-US02'); report('PT05-US01');
  await setup();
  await scenario('Activation by real UI', activation);
  current = report('PT05-US01');
  const state = (await db.query('SELECT status FROM accounts WHERE id=$1', [fixture.trainer.account_id])).rows[0];
  if (state.status !== 'ACTIVE') { current.blocked.push('Activation prerequisite failed'); return; }
  await scenario('Password login and invalid password', () => passwordLogin(false));
  await scenario('Passwordless OTP login and invalid OTP', otpLogin);
  await db.query('UPDATE accounts SET is_two_factor_enabled=true WHERE id=$1', [fixture.trainer.account_id]);
  current.checks.push({ name: '2FA prerequisite', status: 'PASS', actual: 'Enabled on the same activated account in disposable DB only; no existing sessions injected into new browser context.' });
  await scenario('Enabled 2FA login and invalid second factor', () => passwordLogin(true));
}
main().catch(error => { if (current) { current.blocked.push(phase || 'Setup'); current.issues.push(error.message); } console.error(error.message); }).finally(async () => {
  async function attempt(name, fn) { try { await fn(); } catch (error) { cleanup.errors.push(`${name}: ${error.message}`); } }
  await attempt('browser', async () => { await browser?.close(); cleanup.browserClosed = true; });
  await attempt('backend', async () => { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } cleanup.serverClosed = true; });
  await attempt('UI', async () => { if (uiServer) { uiServer.closeAllConnections(); await new Promise(resolve => uiServer.close(resolve)); } cleanup.uiClosed = true; });
  await attempt('pools', async () => { await pool?.end(); await db?.end(); });
  await attempt('database', async () => { if (created) { await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [dbName]); await admin.query(`DROP DATABASE "${dbName}"`); assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [dbName])).rowCount, 0); cleanup.databaseDropped = true; } await admin?.end(); });
  writeReports();
  for (const r of reports.values()) console.log(r.id, r.blocked.length ? 'BLOCKED' : r.issues.length ? 'FAIL' : 'PASS', `${r.steps.filter(s => s.status === 'PASS').length}/${r.steps.length}`, r.dir);
  if (cleanup.errors.length || [...reports.values()].some(r => r.issues.length || r.blocked.length)) process.exitCode = 1;
});

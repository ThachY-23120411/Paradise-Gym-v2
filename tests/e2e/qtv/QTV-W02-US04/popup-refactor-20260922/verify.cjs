const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '../../../../..');
const puppeteer = require(path.join(ROOT, 'backend/node_modules/puppeteer-core'));
const ORIGIN = 'http://localhost:3001';
const API = 'http://localhost:5000/api/v1';
const preliminary = process.argv.includes('--preliminary');
const mode = preliminary ? 'preliminary' : 'final';
const runName = process.env.E2E_RUN_NAME || mode;
assert(/^[a-zA-Z0-9-]+$/.test(runName), 'Run name must be a simple directory name');
const OUT = path.join(__dirname, runName);
const source = path.join(ROOT, 'frontend/web/js/modules/members.js');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sourceHash = digest(source);
const cssHash = digest(path.join(ROOT,'frontend/web/css/web.css'));
const freezePath = path.join(__dirname, 'ui-freeze.json');
if (!preliminary) {
  const freeze = fs.existsSync(freezePath) ? JSON.parse(fs.readFileSync(freezePath, 'utf8')) : {};
  assert(freeze.frozen && freeze.confirmedBy && freeze.membersSha256?.toLowerCase() === sourceHash,
    'BLOCKED: explicit UI/API freeze and matching members.js SHA256 required. Use --preliminary only for diagnostics.');
  if (freeze.cssSha256) assert.equal(freeze.cssSha256.toLowerCase(), digest(path.join(ROOT,'frontend/web/css/web.css')), 'CSS differs from UI freeze');
}
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const rows = response => Array.isArray(response?.data) ? response.data : response?.data?.items || [];
const steps = [], issues = [], httpErrors = [], blockedWrites = [], aborted = [], requests = [];
const tabs = ['Trang chủ', 'Lịch tập', 'Gói của tôi', 'Thanh toán', 'Tài khoản'];
let browser, page, subject, paymentExpected = [], overview, failurePattern = null, qtvSession;
const tabSelector = '.qtv-member-profile-tab';
const panelSelector = '.qtv-member-profile-main';
const scope = '.member-detail-drawer, .member-profile-popup, .member-overview-popup';
const refs = {
  list: 'QTV-W02-US04 Main Flow / Field-level specification / Exception Flows',
  popup: 'QTV-W02-US04 Main Flow 2-8, popup navigation field table and Business Rules; Product Spec W02',
  money: 'HV03-US01 payment-card source = confirmed 100% receipts; current user: successful confirmed ledger only',
  mobile: 'HV01-US01 ownership rule; HV03-US01 package/receipt fields; current user: same member, readonly',
  date: 'QTV-W02-US04 filter field table, AF02 and EF03: Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.',
};
function safe(message) {
  return String(message).replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_TOKEN]');
}
async function get(auth, route, branch = 'ALL') {
  const response = await fetch(API + route, { headers: { Authorization: `Bearer ${auth.token}`, 'x-branch-id': branch } });
  const result = await response.json();
  assert(response.ok && result.success !== false, `GET ${route.split('?')[0]} returned ${response.status}`);
  return result;
}
async function allPaymentRows(session) {
  const records = [], seen = new Set();
  for (let pageNumber = 1; pageNumber <= 100; pageNumber++) {
    const result = await get(session, '/payments?limit=100&page=' + pageNumber);
    for (const record of rows(result)) {
      assert(!seen.has(record.id), 'Payment pagination repeated ID');
      seen.add(record.id); records.push(record);
    }
    if (records.length >= result.data.total) return records;
    assert(rows(result).length, 'Payment pagination incomplete');
  }
  throw new Error('Payment pagination exceeded limit');
}
async function auth(phone, role) {
  const cache = path.join(ROOT, 'tests/e2e/.token_cache.json');
  const saved = fs.existsSync(cache) ? JSON.parse(fs.readFileSync(cache, 'utf8')) : {};
  for (const [key, entry] of Object.entries(saved)) {
    if (!key.startsWith(phone + '_') || !entry.token) continue;
    try {
      const me = await get(entry, '/auth/me');
      const user = me.data?.user || me.data;
      if ((user.active_role || user.role) === role) return { token: entry.token, user };
    } catch (_) { /* Expired shared cache: authenticate once, retain only in memory. */ }
  }
  const response = await fetch(API + '/auth/login-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_phone: phone, password: process.env.E2E_PASSWORD || 'Paradise@123', active_role: role })
  });
  let result = await response.json();
  if (result.data?.requires_2fa) {
    assert(result.data.dev_otp, 'Auth requires OTP unavailable to test environment');
    result = await fetch(API + '/auth/verify-2fa', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token: result.data.temp_token, otp_code: result.data.dev_otp })
    }).then(r => r.json());
  }
  assert(result.data?.access_token && result.data?.user, `Authentication failed for ${role}; no credentials logged`);
  return { token: result.data.access_token, user: result.data.user };
}
async function makePage(session, mobile = false) {
  const context = await browser.createBrowserContext();
  const p = await context.newPage();
  await p.setViewport({ width: mobile ? 390 : 1440, height: mobile ? 844 : 1000, deviceScaleFactor: 1 });
  await p.setCacheEnabled(false);
  await p.setRequestInterception(true);
  p.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      requests.push({ role: session.user.active_role || session.user.role, method: request.method(), path: url.pathname, query: url.search, branch: request.headers()['x-branch-id'] || null });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        blockedWrites.push({ method: request.method(), path: url.pathname });
        return request.abort('blockedbyclient');
      }
      if (failurePattern && url.pathname.includes(failurePattern)) {
        aborted.push(url.pathname);
        return request.abort('failed');
      }
    }
    return request.continue();
  });
  p.on('response', response => {
    const u = new URL(response.url());
    if (u.pathname.startsWith('/api/') && response.status() >= 400) httpErrors.push({ path: u.pathname, status: response.status() });
  });
  await p.evaluateOnNewDocument(session => {
    localStorage.setItem('paradise_access_token', session.token);
    localStorage.setItem('paradise_user', JSON.stringify(session.user));
    localStorage.setItem('paradise_current_branch_id', 'ALL');
  }, session);
  return p;
}
async function settle(p) {
  await p.waitForNetworkIdle({ idleTime: 400, timeout: 7000 }).catch(() => {});
  await sleep(450);
}
async function dom(p) {
  return p.evaluate(() => {
    const visible = el => !!el && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== 'hidden';
    const popup = [...document.querySelectorAll('.dx-overlay-content.dx-popup-normal')].filter(visible).at(-1);
    const root = popup || document.querySelector('#main') || document.body;
    const text = (root.innerText || '').trim();
    const grids = [...root.querySelectorAll('.dx-datagrid')].filter(visible).map(el => {
      const host = el.parentElement;
      const instance = window.jQuery && (window.jQuery(host).data('dxDataGrid') || window.jQuery(el).data('dxDataGrid'));
      return { text: el.innerText, badges: [...el.querySelectorAll('.dx-data-row .status-badge')].filter(visible).length, records: instance ? instance.getVisibleRows().filter(r => r.rowType === 'data').map(r => r.data) : [] };
    });
    return {
      url: location.pathname + location.hash, popup: !!popup, text, fullText: document.body.innerText,
      title: popup?.querySelector('.dx-popup-title')?.innerText || '',
      tabs: [...root.querySelectorAll('.qtv-member-profile-tab, .member-sidebar-item')].filter(visible).map(el => ({ text: el.innerText, active: el.classList.contains('is-active') || el.getAttribute('aria-selected') === 'true' })),
      errors: [...root.querySelectorAll('[role="alert"], .module-error, .dx-invalid-message')].filter(visible).map(el => el.innerText).filter(Boolean),
      loading: [...root.querySelectorAll('.dx-loadpanel-content')].some(visible),
      grids,
      inputs: [...root.querySelectorAll('input')].filter(visible).map(el => ({ label: el.getAttribute('aria-label') || el.placeholder, value: el.value })),
      authenticatedMemberId: window.MemberApp?.user?.member_profile_id || null,
      profile: window.MemberApp?.profile ? { id: window.MemberApp.profile.id, member_code: window.MemberApp.profile.member_code } : null
    };
  });
}
async function snap(p, filename, selector, number) {
  await p.evaluate(({ selector, number }) => {
    const visible = el => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
    const target = [...document.querySelectorAll(selector)].find(visible) || [...document.querySelectorAll('.dx-overlay-content.dx-popup-normal')].find(visible) || document.querySelector('#main') || document.body;
    const r = target.getBoundingClientRect();
    const x = Math.max(4, r.left), y = Math.max(16, r.top);
    const box = document.createElement('div');
    box.className = 'e2e-readonly-annotation';
    box.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${Math.max(20, Math.min(r.width, innerWidth - x - 4))}px;height:${Math.max(20, Math.min(r.height, innerHeight - y - 4))}px;border:3px solid #e11d48;box-sizing:border-box;pointer-events:none;z-index:2147483647`;
    const badge = document.createElement('span');
    badge.textContent = number;
    badge.style.cssText = 'position:absolute;top:-16px;left:0;width:28px;height:28px;border-radius:50%;background:#e11d48;color:white;border:2px solid white;display:grid;place-items:center;font:bold 14px Arial';
    box.appendChild(badge);
    (document.querySelector('dialog[open]') || document.body).appendChild(box);
  }, { selector, number });
  try { await p.screenshot({ path: path.join(OUT, filename) }); }
  finally { await p.evaluate(() => document.querySelectorAll('.e2e-readonly-annotation').forEach(el => el.remove())); }
}
async function step(section, name, expected, action, verify, selector = panelSelector, p = page) {
  const item = { number: steps.length + 1, section, name, expected, status: 'PASS' };
  item.image = `step-${String(item.number).padStart(2, '0')}-${name}.png`;
  try {
    if (action) await action();
    await settle(p);
    item.actual = await dom(p);
    await verify(item.actual);
  } catch (error) {
    item.status = 'FAIL'; item.error = safe(error.message);
    item.actual ||= await dom(p).catch(() => ({ text: 'DOM unavailable' }));
    issues.push({ step: item.number, name, message: item.error });
  }
  await snap(p, item.image, selector, item.number).catch(e => { item.status = 'FAIL'; item.error = 'Screenshot failed: ' + safe(e.message); });
  steps.push(item);
  console.log(`${item.status} ${item.number} ${name}${item.error ? ': ' + item.error : ''}`);
  writeReport();
  return item.status === 'PASS';
}
async function clickText(p, selector, text) {
  const handles = await p.$$(selector);
  for (const el of handles) {
    const match = await el.evaluate((node, wanted) => node.getBoundingClientRect().height > 0 && node.innerText.includes(wanted), text);
    if (match) { await el.click(); return; }
  }
  throw new Error(`Visible control missing: ${selector} text=${text}`);
}
async function closePopup(p) {
  await clickText(p, '.dx-popup-title .dx-closebutton', '');
  await settle(p);
}
async function gridRows(p) {
  return p.evaluate(() => {
    const grid = [...document.querySelectorAll('.dx-datagrid')].find(el => !el.closest('.dx-popup-content'));
    if (!grid) return [];
    const instance = jQuery(grid.parentElement).data('dxDataGrid') || jQuery(grid).data('dxDataGrid');
    return instance?.getVisibleRows().filter(r => r.rowType === 'data').map(r => r.data) || [];
  });
}
async function selectBranch(p, id) {
  await p.evaluate(id => jQuery('#globalBranchSelector').dxSelectBox('instance').option('value', id), id);
}
async function openByCode(p, code) {
  await clickText(p, '.card-panel .dx-data-row a', code);
}
function writeReport() {
  const sections = ['Source Action Verification', 'State Verification', 'Cross-Role / Downstream Verification'];
  let report = `# QTV-W02-US04 member popup readonly E2E\n\nMode: ${mode}. Started source SHA256: ${sourceHash}. CSS SHA256: ${cssHash}.\n\nFrontend: ${ORIGIN}/web/; API: ${API}.\n\nSubject: ${subject ? `${subject.member_code} / ${subject.id}` : 'not selected'}. No business mutation requests; auth/heartbeat allowed.\n\n`;
  report += 'Expected sources: QTV-W02-US04 Main Flow/field tables/AF02/EF02/EF03; Product Spec W02; HV01-US01; HV03-US01; current user requirements. Final field tables must be reread after documentation freeze.\n\n';
  for (const section of sections) {
    report += `## ${section}\n\n`;
    for (const s of steps.filter(s => s.section === section)) {
      const actual = s.actual;
      report += `### Step ${s.number}: ${s.name}\n\n- Action/Input: ${s.name.replaceAll('-', ' ')}. Visible inputs: ${JSON.stringify(actual.inputs || [])}.\n- Expected Result: ${s.expected}\n- Actual Result: URL ${actual.url || 'unknown'}; popup=${actual.popup}; title=${actual.title || '-'}; visible alerts=${JSON.stringify(actual.errors || [])}; visible grid rows=${actual.grids?.reduce((n,g)=>n+g.records.length,0) || 0}. ${s.error || 'DOM assertions passed; screenshot requires visual audit.'}\n- Status: ${s.status}\n\n![${s.name}](./${s.image})\n\n`;
    }
  }
  report += '## Issues Found\n\n';
  report += issues.map(i => `- Step ${i.step}: ${i.name}: ${i.message}`).join('\n') || '- No assertion failures recorded yet; this is not an all-PASS conclusion.';
  report += `\n\nAPI failures: ${JSON.stringify(httpErrors)}.\n\nBlocked write attempts: ${JSON.stringify(blockedWrites)}.\n\n## Final Result\n\n`;
  report += `PASS assertions: ${steps.filter(s => s.status === 'PASS').length}; FAIL assertions: ${steps.filter(s => s.status === 'FAIL').length}.\n\n`;
  report += preliminary ? '**BLOCKED for final acceptance: awaiting explicit API/UI freeze. Preliminary evidence only.**\n' : '**Pending visual audit and coverage review. Do not treat raw assertion counts as final acceptance.**\n';
  fs.writeFileSync(path.join(OUT, 'QTV-W02-US04-test.md'), safe(report));
  fs.writeFileSync(path.join(OUT, 'results.json'), safe(JSON.stringify({ mode, sourceHash, cssHash, subject: subject && { id: subject.id, member_code: subject.member_code }, steps, issues, httpErrors, blockedWrites, aborted, requests }, null, 2)));
}
async function main() {
  const qtv = await auth(process.env.E2E_QTV_PHONE || '0900000001', 'QTV');
  qtvSession=qtv;
  const memberSession = await auth(process.env.E2E_MEMBER_PHONE || '0987654321', 'MEMBER');
  const memberId = memberSession.user.member_profile_id;
  assert(memberId, 'Active MEMBER session must identify its member_profile_id');
  subject = (await get(qtv, '/members/' + memberId)).data;
  assert.equal(subject.id, memberId);
  paymentExpected = (await allPaymentRows(qtv)).filter(p => p.member_id === memberId && p.confirmed_at);
  try { overview = (await get(qtv, `/members/${memberId}/overview-data`)).data; }
  catch (error) { issues.push({ step: 0, name: 'overview-endpoint', message: safe(error.message) }); }
  browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
  page = await makePage(qtv);
  const sourceSection = 'Source Action Verification', state = 'State Verification', downstream = 'Cross-Role / Downstream Verification';
  const opened = await step(sourceSection, 'open-members-list', refs.list + ': readonly rows in branch scope',
    () => page.goto(ORIGIN + '/web/#members', { waitUntil: 'domcontentloaded' }),
    async d => { assert(d.text.includes('Hội viên')); assert((await gridRows(page)).length > 0, 'No actual member rows loaded'); }, '.card-panel');
  if (!opened) return;
  const first = (await gridRows(page))[0];
  await step(sourceSection, 'initial-row-opens-popup', refs.popup + ': clicking first visible member row opens that member profile',
    async () => { const el = await page.$('.card-panel .dx-data-row td:nth-child(2)'); assert(el); await el.click(); },
      d => { assert(d.popup, 'Popup not visible'); assert(d.title.includes(first.member_code), `Popup could not load clicked row: ${d.errors.join('; ') || d.title}`); }, '.dx-overlay-content.dx-popup-normal');
  if ((await dom(page)).popup) await step(sourceSection, 'close-initial-popup', 'Close returns to member list', () => closePopup(page), d => assert(!d.popup), '.card-panel');
  await step(sourceSection, 'search-same-active-mobile-member', refs.list + ': search exact phone and show matching row',
    async () => { const input = await page.$('.filter-bar .dx-textbox input'); assert(input); await input.click({ clickCount: 3 }); await input.type(subject.phone); },
    async () => { const found = await gridRows(page); assert(found.some(r => r.id === subject.id), 'Same member missing from actual grid'); }, '.filter-bar');
  const profileOpen = await step(sourceSection, 'open-same-member-popup', refs.popup + ': same member identity; exactly five menu tabs',
    () => openByCode(page, subject.member_code), d => { assert(d.popup); assert(d.title.includes(subject.member_code), `Selected member could not load: ${d.errors.join('; ') || d.title}`); assert.equal(d.tabs.length, 5); }, '.dx-overlay-content.dx-popup-normal');
  if (profileOpen) {
    if (['filters','search-clear'].includes(process.env.E2E_FOCUS)) {
      await popupFilters(state, sourceSection);
      return;
    }
    if (process.env.E2E_FOCUS === 'framing') {
      await extraFraming(state,sourceSection);
      return;
    }
    for (const [index, label] of tabs.entries()) {
      await step(sourceSection, `tab-${index + 1}-${['home','schedule','packages','payments','account'][index]}`, refs.popup + ': correct active menu and loaded business content',
        () => clickText(page, tabSelector, label), d => {
          assert(d.tabs.some(t => t.text.includes(label) && t.active), 'Requested tab not active');
          assert(!d.loading, 'Load panel remains visible');
          assert(d.text.length > 150, 'No meaningful profile content');
          assert.equal(d.errors.length, 0, `Business data failed to load: ${d.errors.join('; ')}`);
        });
      if (index === 1 || index === 2) await step(state, index === 1 ? 'booking-statuses-match-overview' : 'registration-statuses-match-overview', refs.popup + ': displayed IDs/statuses are the same selected-member projection',
        null, d => {
          assert(overview, 'Overview API unavailable for independent expected data');
          const expected = index === 1 ? overview.bookings : overview.registrations;
          const displayed = d.grids.flatMap(g => g.records);
          if (expected.length) assert(displayed.length, 'Expected records absent in visible grid');
          if(displayed.length) assert(d.grids.reduce((n,g)=>n+g.badges,0)>=displayed.length,'Required status badges absent from data rows');
          for (const row of displayed) {
            const match = expected.find(record => record.id === row.id);
            assert(match, 'Displayed row outside selected member projection: ' + row.id);
            assert.equal(row.status, match.status, 'Displayed status differs from projection');
          }
        });
      if (index === 3) await step(state, 'confirmed-payment-ledger-only', refs.money,
        null, d => {
          const displayed = d.grids.flatMap(g => g.records).filter(r => r.payment_code || r.payment_method);
          if (!displayed.length && paymentExpected.length) assert.fail('Confirmed payments exist but no payment rows are visible');
          for (const record of displayed) {
            assert(paymentExpected.some(p => p.id === record.id), `Non-confirmed ledger row displayed: ${record.payment_code || record.id}; status=${record.status}; confirmed_at=${!!record.confirmed_at}`);
            assert(d.text.includes(record.payment_code || record.receipt_code), 'Payment identifier missing from DOM');
          }
          assert(!/Chờ thanh toán|Đã hết hạn/.test(d.grids.filter(g=>g.records.some(r=>r.payment_code)).map(g=>g.text).join(' ')), 'Unsuccessful payment label invented in confirmed ledger');
        });
      if (index === 0) await step(state, 'home-active-packages-confirmed-paid-only', refs.popup + '; main correction: ACTIVE and is_paid === true only', null,
        d => {
          assert(overview, 'Overview unavailable for home expected values');
          const expected = overview.registrations.filter(r=>r.status === 'ACTIVE' && r.is_paid === true);
          const actual = d.grids[0]?.records || [];
          assert.equal(actual.length, Math.min(expected.length, 10), 'Home active package count differs');
          for (const row of actual) assert(expected.some(r=>r.id===row.id), 'Unpaid or inactive package shown as active: '+row.reg_code);
        });
    }
    await step(state, 'readonly-identity-without-biometric-claim', refs.popup + ': readonly identity only; no FaceID/enrollment claim derived from avatar', null, d => {
      assert(d.text.includes(subject.phone), 'Actual phone not shown');
      const enrolled = subject.has_biometric_face ?? subject.face_enrolled;
      if (enrolled === undefined) assert(!/Đã có Face ID|Đã đăng ký khuôn mặt/.test(d.text), 'Positive FaceID claim lacks API evidence');
      else if (!enrolled) assert(!/Đã có Face ID/.test(d.text), 'FaceID shown enrolled for false API field');
    });
    await popupFilters(state, sourceSection);
    await extraFraming(state, sourceSection);
    await step(sourceSection, 'narrow-popup-viewport-900', refs.popup + ': popup and navigation remain inside viewport',
      () => page.setViewport({ width: 900, height: 800, deviceScaleFactor: 1 }), async d => {
        assert(d.popup); assert.equal(d.tabs.length, 5);
        const geometry = await page.evaluate(() => [...document.querySelectorAll('.dx-overlay-content.dx-popup-normal')].filter(el => el.getBoundingClientRect().height).map(el => { const r=el.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom }; }));
        assert(geometry.every(r => r.left >= -1 && r.right <= 901 && r.top >= -1 && r.bottom <= 801), 'Popup extends beyond viewport');
      }, '.dx-overlay-content.dx-popup-normal');
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await step(sourceSection, 'close-popup-before-scope-change', 'Close profile before changing branch scope', () => closePopup(page), d => assert(!d.popup), '.card-panel');
  } else if ((await dom(page)).popup) {
    await step(sourceSection, 'close-blocked-profile', 'Close blocked profile before independent branch checks', () => closePopup(page), d => assert(!d.popup), '.card-panel');
  }
  const branches = rows(await get(qtv, '/branches'));
  assert(branches.length >= 2, 'Need two actual branches');
  for (const branch of [...branches.slice(0, 2), { id: 'ALL', branch_name: 'ALL' }]) {
    const scopeLabel=branch.id === 'ALL' ? 'ALL' : branches.indexOf(branch) === 0 ? 'A' : 'B';
    const expected = rows(await get(qtv, '/members?limit=20' + (branch.id === 'ALL' ? '' : '&branch_id=' + branch.id), branch.id));
    await step(state, `branch-scope-${scopeLabel}`, refs.list + ': selected branch determines actual visible members',
      () => selectBranch(page, branch.id), async () => {
        const actual = await gridRows(page);
        assert.deepEqual(actual.map(r => r.id).sort(), expected.map(r => r.id).sort(), 'Visible grid IDs differ from scoped API');
        if (branch.id !== 'ALL') assert(actual.every(r => r.home_branch_id === branch.id), 'Cross-branch data leaked into grid');
      }, '.card-panel');
    if (profileOpen && expected.length) {
      const row=expected[0];
      await step(state,`branch-${scopeLabel}-popup-retains-scope`,refs.popup + ': popup GET retains selected branch header and same clicked member',
        ()=>openByCode(page,row.member_code),d=>{
          assert(d.popup); assert(d.title.includes(row.member_code));
          const request=requests.filter(r=>r.path===`/api/v1/members/${row.id}/overview-data`).at(-1);
          assert(request,'No overview request for clicked scoped member');
          assert.equal(request.branch || 'ALL',branch.id,'Popup widened current branch scope');
          assert.equal(d.errors.length,0);
        });
      await step(sourceSection,`close-branch-${scopeLabel}-popup`,'Close readonly profile before next scope',()=>closePopup(page),d=>assert(!d.popup),'.card-panel');
    }
  }
  await step(sourceSection, 'network-abort-member-list', refs.list + ': loading error is visible and retry offered',
    async () => { failurePattern = '/members'; await page.reload({ waitUntil: 'domcontentloaded' }); },
    d => { assert(aborted.length > 0, 'Fault injection did not intercept actual request'); assert(d.errors.length > 0, 'Network failure concealed'); assert(d.text.includes('Thử lại'), 'Retry missing'); }, '.module-error');
  await step(sourceSection, 'network-retry-member-list', refs.list + ': retry loads real rows after network restored',
    async () => { failurePattern = null; await clickText(page, '.module-error .dx-button', 'Thử lại'); },
    async d => { assert((await gridRows(page)).length > 0); assert.equal(d.errors.length, 0); }, '.card-panel');
  if (profileOpen) {
    await step(state, 'qtv-popup-does-not-fetch-legacy-profile', 'QTV-W02-US04 Main Flow 2: browser uses whitelist overview projection, no legacy detail overfetch', null,
      () => assert(!requests.some(r => r.role === 'QTV' && /^\/api\/v1\/members\/[0-9a-f-]+$/i.test(r.path)), 'Browser fetched legacy member detail'), '.card-panel');
  }
  const mobile = await makePage(memberSession, true);
  await step(downstream, 'mobile-authenticated-same-member-home', refs.mobile,
    () => mobile.goto(ORIGIN + '/mobile/member/#home', { waitUntil: 'domcontentloaded' }), d => {
      assert.equal(d.authenticatedMemberId, subject.id); assert(d.url.startsWith('/mobile/member/'));
      assert(d.fullText.includes(subject.full_name), 'Same member name missing in mobile business UI');
    }, '#main', mobile);
  for (const route of ['schedule', 'packages', 'payments', 'account']) {
    await step(downstream, 'mobile-same-member-' + route, refs.mobile + ': authenticated business screen; API errors retained',
      () => clickText(mobile, `[data-route="${route}"]`, ''), d => {
        assert.equal(d.authenticatedMemberId, subject.id); assert(d.url.includes('#' + route));
        assert.equal(d.errors.length, 0, `Mobile data error: ${d.errors.join('; ')}`);
        if (route === 'payments' && paymentExpected.length) assert(paymentExpected.some(p => d.text.includes(p.receipt_code || p.payment_code)), `Mobile has no confirmed shared payment identifier; Web API has ${paymentExpected.length} confirmed records (legacy statuses: ${[...new Set(paymentExpected.map(p=>p.status))].join(', ')})`);
        if (route === 'account') assert(d.text.includes(subject.phone) || d.text.includes(subject.full_name), 'Same subject absent from account DOM');
      }, '#main', mobile);
    if (route === 'packages' && overview?.registrations?.length) {
      await step(downstream, 'mobile-package-filter-all-same-registration', refs.mobile + ': same registration code and package name as QTV overview',
        () => clickText(mobile, 'button', 'Tất cả ('), d => {
          const shared = overview.registrations.find(r => d.text.includes(r.reg_code));
          assert(shared, 'No same registration code present in Mobile packages');
          assert(d.text.includes(shared.package_name_snapshot), 'Same registration package name differs');
        }, '#main', mobile);
    }
  }
  const lt = await auth(process.env.E2E_LT_PHONE || '0900000002', 'RECEPTIONIST');
  const reception = await makePage(lt);
  await step(state, 'receptionist-existing-members-list', 'User scope: LT existing member experience retained; QTV refactor must not remove LT list',
    () => reception.goto(ORIGIN + '/web/#members', { waitUntil: 'domcontentloaded' }),
    async () => assert((await gridRows(reception)).length > 0), '.card-panel', reception);
  const ltRows = await gridRows(reception);
  if (ltRows.length) await step(state, 'receptionist-existing-profile', 'User scope: LT existing profile opens from visible row',
    () => openByCode(reception, ltRows[0].member_code), d => { assert(d.popup); assert(d.title.includes(ltRows[0].member_code)); }, '.dx-overlay-content.dx-popup-normal', reception);
  if (digest(source) !== sourceHash) issues.push({ step: 0, name: 'source-changed-during-run', message: 'UI source changed; rerun after explicit freeze' });
  if (blockedWrites.length) issues.push({step:0,name:'unexpected-write-attempt',message:'Business mutation request attempted and aborted; inspect request paths in report'});
}
async function popupFilters(state, sourceSection) {
  const panel = panelSelector;
  await step(sourceSection, 'open-packages-for-readonly-filter', refs.popup, () => clickText(page, tabSelector, 'Gói của tôi'), d => assert(d.tabs.some(t=>t.text.includes('Gói của tôi') && t.active)));
  const expectedRegs = overview?.registrations || [];
  const target = expectedRegs.find(r => r.is_group_member) || expectedRegs[0];
  if (target) {
    await step(state, 'package-search-input-auto-applies', refs.popup + ': search actual registration code, capture input (auto-apply; no submit button)',
      async () => { const input = await page.$(`${panel} input[aria-label="Tìm kiếm"]`); assert(input); await input.type(target.reg_code); },
      d => { const actual = d.grids.flatMap(g=>g.records); assert(actual.some(r=>r.id===target.id)); assert(actual.every(r=>r.reg_code?.includes(target.reg_code))); assert(d.text.includes(target.reg_code)); }, '.qtv-member-profile-filters');
    await step(sourceSection, 'clear-package-search', 'Clear readonly search and restore package list',
      async () => { const input=await page.$(`${panel} input[aria-label="Tìm kiếm"]`); await input.click(); await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control'); await input.press('Backspace'); },
      d => { assert(d.inputs.some(i=>i.label==='Tìm kiếm' && i.value===''), 'Search input did not clear'); assert.equal(d.grids.flatMap(g=>g.records).length,Math.min(expectedRegs.length,10)); }, '.qtv-member-profile-filters');
    if(process.env.E2E_FOCUS==='search-clear') return;
    await step(state, 'expand-same-registration-entitlements', refs.popup + ': expanded row shows package-level rights, assigned PT and allowed branches from same registration',
      async () => { const button = await page.$(`${panel} .dx-data-row .dx-datagrid-group-closed`); assert(button, 'Native detail expand control missing'); await button.click(); },
      d => {
        const row=d.grids.flatMap(g=>g.records)[0]; assert(row);
        assert(d.text.includes('Buổi PT') && d.text.includes('Chi nhánh sử dụng'), 'Entitlement detail not rendered');
        if(row.assigned_pt_name) assert(d.text.includes(row.assigned_pt_name), 'Assigned trainer omitted from expanded details');
        for(const b of row.allowed_branches || []) assert(d.text.includes(b.branch_name), 'Allowed branch missing from expanded details');
      });
    const status = target.display_status || target.status;
    await step(state, 'filter-existing-package-status', refs.popup + ': filter uses real registration status; no status mutation',
      () => page.evaluate(({ panel, status }) => { const input = document.querySelector(`${panel} input[aria-label="Trạng thái"]`); if (!input) throw Error('Status control missing'); jQuery(input.closest('.dx-selectbox')).dxSelectBox('instance').option('value', status); }, { panel, status }),
      d => { const actual=d.grids.flatMap(g=>g.records); assert(actual.length > 0); assert(actual.every(r=>(r.display_status || r.status)===status)); }, '.qtv-member-profile-filters');
  }
  await step(sourceSection, 'open-schedule-date-filter', refs.popup, () => clickText(page, tabSelector, 'Lịch tập'), d => assert(d.tabs.some(t=>t.text.includes('Lịch tập') && t.active)));
  const dateSet = async (label, value) => page.evaluate(({panel,label,value}) => {
    const input = document.querySelector(`${panel} input[aria-label="${label}"]`);
    if (!input) throw Error('Date filter missing: ' + label);
    jQuery(input.closest('.dx-datebox')).dxDateBox('instance').option('value', value);
  }, {panel,label,value});
  await step(sourceSection, 'input-from-date-2099-12-31', refs.date + ': capture from date before changing to date',
    () => dateSet('Từ ngày','2099-12-31'), d=>assert(d.inputs.some(i=>i.label==='Từ ngày' && i.value.includes('2099'))), '.qtv-member-profile-filters');
  await step(sourceSection, 'input-to-date-2000-01-01-invalid-range', refs.date + ': reversed interval displays validation error and no misleading data',
    () => dateSet('Đến ngày','2000-01-01'), d=>{ assert(d.errors.some(e=>e.includes('Ngày bắt đầu')),'Reversed date error missing'); assert.equal(d.grids.flatMap(g=>g.records).length,0); }, '.qtv-member-profile-warning');
  await step(sourceSection, 'correct-from-date-2000-01-01', refs.date + ': corrected interval removes validation error',
    () => dateSet('Từ ngày','2000-01-01'), d=>assert(!d.errors.some(e=>e.includes('Ngày bắt đầu'))), '.qtv-member-profile-filters');
  await step(sourceSection, 'clear-to-date-filter', refs.date + ': clear upper bound restores current bookings',
    () => dateSet('Đến ngày',null), d=>{ assert.equal(d.errors.length,0); if(overview?.bookings?.length) assert(d.grids.flatMap(g=>g.records).length>0); }, '.qtv-member-profile-filters');
  await step(sourceSection, 'open-payment-tab-for-network-error', refs.money, () => clickText(page,tabSelector,'Thanh toán'), d=>assert(d.tabs.some(t=>t.text.includes('Thanh toán')&&t.active)));
  if (paymentExpected.length) {
    const method=paymentExpected[0].payment_method;
    await step(state,'payment-method-filter-confirmed-ledger', refs.money + ': method filter only matches actual confirmed records; no payment-status dropdown',
      ()=>page.evaluate(({panel,method})=>{ const input=document.querySelector(`${panel} input[aria-label="Phương thức"]`); if(!input) throw Error('Payment method filter missing'); jQuery(input.closest('.dx-selectbox')).dxSelectBox('instance').option('value',method); },{panel,method}),
      d=>{ const displayed=d.grids.flatMap(g=>g.records); assert(displayed.length); assert(displayed.every(r=>r.payment_method===method && r.confirmed_at)); assert(!d.inputs.some(i=>i.label==='Trạng thái'),'Ledger must not invent legacy payment-status filter'); },'.qtv-member-profile-filters');
  }
  const before = aborted.length;
  await step(sourceSection, 'abort-payment-get-visible-error', refs.list + ': failed payment request shows error, not empty ledger',
    async()=>{ failurePattern='/payments'; await clickText(page,tabSelector,'Thanh toán'); },
    d=>{ assert(aborted.length>before); assert(d.errors.length>0); assert(d.text.includes('Thử lại')); }, '.module-error');
  await step(sourceSection, 'retry-payment-get-real-data', refs.money + ': retry after network restoration',
    async()=>{ failurePattern=null; await clickText(page,`${panel} .module-error .dx-button`,'Thử lại'); },
    d=>{ assert.equal(d.errors.length,0); if(paymentExpected.length) assert(d.grids.flatMap(g=>g.records).some(r=>paymentExpected.some(p=>p.id===r.id))); });
}
async function extraFraming(state, sourceSection) {
  await step(sourceSection,'schedule-before-horizontal-scroll',refs.popup,()=>clickText(page,tabSelector,'Lịch tập'),d=>assert(d.tabs.some(t=>t.text.includes('Lịch tập')&&t.active)));
  if(overview.bookings.some(r=>r.status==='COMPLETED')) await step(sourceSection,'filter-completed-bookings-for-confirmation-evidence',refs.popup + ': completed status filter matches real projection',
    ()=>page.evaluate(panel=>{ const input=document.querySelector(`${panel} input[aria-label="Trạng thái"]`); jQuery(input.closest('.dx-selectbox')).dxSelectBox('instance').option('value','COMPLETED'); },panelSelector),
    d=>{ const actual=d.grids.flatMap(g=>g.records); assert(actual.length); assert(actual.every(r=>r.status==='COMPLETED')); },'.qtv-member-profile-filters');
  await step(state,'schedule-right-columns-confirmations',refs.popup + ': scroll to actual confirmation and assessment columns',
    ()=>page.evaluate(panel=>{ const el=document.querySelector(`${panel} .dx-datagrid`); const instance=jQuery(el.parentElement).data('dxDataGrid') || jQuery(el).data('dxDataGrid'); instance.getScrollable().scrollTo({left:3000}); },panelSelector),
    d=>{ assert(d.text.includes('PT xác nhận') && d.text.includes('Hội viên xác nhận')); assert(d.grids.flatMap(g=>g.records).length); });
  const verifyRows=(actual,expected)=>{
    assert.equal(actual.errors.length,0,'Subtab shows load error');
    assert.equal(actual.grids.length,1,'Expected actual subtab grid');
    const records=actual.grids[0].records;
    assert.equal(records.length,Math.min(expected.length,10),'Subtab visible count differs from projection');
    for(const row of records){
      const match=expected.find(e=>e.id===row.id); assert(match,'Subtab row outside projection');
      assert.equal(row.status,match.status || match.invitation_status,'Subtab status mismatch');
      const label=row.title || row.package_name_snapshot;
      if(label) assert(actual.text.includes(label),'Subtab record label missing from DOM');
    }
    if(!expected.length) assert(actual.text.includes('Không có dữ liệu phù hợp'),'Actual empty state missing');
  };
  await step(state,'community-subtab-same-member-projection',refs.popup + ': registered community classes match overview.community_registrations, including genuine empty state',
    ()=>clickText(page,`${panelSelector} .dx-tab`,'Lớp cộng đồng'),d=>verifyRows(d,overview.community_registrations));
  await step(sourceSection,'packages-before-invitations-subtab',refs.popup,()=>clickText(page,tabSelector,'Gói của tôi'),d=>assert(d.tabs.some(t=>t.text.includes('Gói của tôi')&&t.active)));
  const invitations=[...overview.group_invitations.received,...overview.group_invitations.sent];
  await step(state,'group-invitations-subtab-same-member-projection',refs.popup + ': invitations match sent/received IDs and status from same selected member',
    ()=>clickText(page,`${panelSelector} .dx-tab`,'Lời mời nhóm'),d=>verifyRows(d,invitations));
  await step(sourceSection,'payment-ledger-before-pagination',refs.money,()=>clickText(page,tabSelector,'Thanh toán'),d=>assert(d.grids.flatMap(g=>g.records).length));
  await step(sourceSection,'clear-payment-method-before-pagination',refs.money + ': clear method filter and display complete confirmed ledger',
    ()=>page.evaluate(panel=>{const input=document.querySelector(`${panel} input[aria-label="Phương thức"]`); jQuery(input.closest('.dx-selectbox')).dxSelectBox('instance').option('value',null);},panelSelector),
    d=>{assert(d.inputs.some(i=>i.label==='Phương thức' && !i.value)); assert.equal(d.grids.flatMap(g=>g.records).length,Math.min(paymentExpected.length,10));},'.qtv-member-profile-filters');
  await step(state,'payment-ledger-second-page',refs.money + ': confirmed ledger contains remaining record on actual page 2',
    async()=>{
      await page.evaluate(panel=>{const el=document.querySelector(`${panel} .dx-pager`); el?.scrollIntoView({block:'center'});},panelSelector);
      await clickText(page,`${panelSelector} .dx-page`,'2');
    },d=>{
      const displayed=d.grids.flatMap(g=>g.records);
      assert.equal(displayed.length,paymentExpected.length-10);
      assert(displayed.every(r=>r.confirmed_at && paymentExpected.some(p=>p.id===r.id)));
    });
  const payment=(await dom(page)).grids.flatMap(g=>g.records)[0];
  if(payment){
    let receiptExpected;
    try { receiptExpected=(await get(qtvSession,`/payments/${payment.id}/receipt`)).data; }
    catch(error){ issues.push({step:0,name:'receipt-expected-read',message:safe(error.message)}); }
    await step(state,'open-readonly-receipt-matching-payment', 'QTV-W02-US04 receipt field table: inline receipt matches selected payment, no writes',
      async()=>{
        const button=await page.$(`${panelSelector} [aria-label="Xem phiếu thu"]`); assert(button,'Receipt action missing');
        await button.evaluate(el=>el.scrollIntoView({block:'center',inline:'center'})); await button.click(); await settle(page);
        await page.evaluate(()=>document.querySelector('.qtv-member-profile-receipt')?.scrollIntoView({block:'center'}));
      },d=>{
        assert(receiptExpected,'Expected receipt unavailable'); assert.equal(receiptExpected.payment_id,payment.id);
        assert.equal(d.errors.length,0); assert(d.text.includes('Chi tiết phiếu thu'));
        for(const value of [receiptExpected.receipt_code,receiptExpected.payment_code,receiptExpected.reg_code,receiptExpected.payer_name]) if(value) assert(d.text.includes(value),'Receipt field missing from DOM: '+value);
      },'.qtv-member-profile-receipt');
    await step(sourceSection,'close-readonly-receipt','QTV-W02-US04: close inline receipt, retain selected ledger and member',
      async()=>{ const button=await page.$('.qtv-member-profile-receipt [title="Đóng phiếu thu"]'); assert(button,'Receipt close icon missing'); await button.click(); },
      d=>{assert(!d.text.includes('Chi tiết phiếu thu'),'Receipt detail still visible after close'); assert(d.title.includes(subject.member_code));});
  }
  await step(state,'pending-payment-subtab-same-member-projection',refs.popup + ': pending owned registrations are separate from confirmed ledger',
    ()=>clickText(page,`${panelSelector} .dx-tab`,'Chờ thanh toán'),d=>verifyRows(d,overview.registrations.filter(r=>!r.is_group_member && r.member_id===subject.id && r.status==='PENDING_PAYMENT')));
}
main().catch(error => { issues.push({ step: 0, name: 'runner-blocker', message: safe(error.message) }); console.log('BLOCKED: ' + safe(error.message)); process.exitCode = 1; })
  .finally(async () => {
    failurePattern = null;
    if (browser) await browser.close();
    if(digest(source)!==sourceHash || digest(path.join(ROOT,'frontend/web/css/web.css'))!==cssHash) issues.push({step:0,name:'freeze-invalidated',message:'JS/CSS changed during run; historical evidence only, rerun on updated freeze'});
    writeReport();
  });

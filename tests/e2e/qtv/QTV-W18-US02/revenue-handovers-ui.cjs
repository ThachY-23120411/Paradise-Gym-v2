const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const { chromium } = require('C:/Users/Admin/.agents/skills/playwright-skill/node_modules/playwright');
const express = require(path.join(root, 'backend/node_modules/express'));
const hash = value => createHash('sha256').update(value).digest('hex');

async function runUI(f) {
  const sourceHashes = Object.fromEntries(['frontend/web/js/modules/revenueHandovers.js', 'frontend/web/js/app.js', 'frontend/web/index.html', 'backend/src/modules/core/revenueHandovers.js', 'backend/src/server.js'].map(file => [file, hash(fs.readFileSync(path.join(root, file)))]));
  assert(f.dbName && /^paradise_.*test_/.test(f.dbName), 'Only an explicitly isolated test fixture is accepted');
  assert.equal((await f.db.query('SELECT current_database() name')).rows[0].name, f.dbName);
  const run = new Date().toISOString().replace(/[:.]/g, '-');
  const reports = new Map(), network = [], errors = [];
  const locations = await f.request('/branches', f.qtv.access_token, null, f.branchA);
  const branchTimezone = locations.find(location => location.id === f.branchA).timezone;
  const formattedDay = f.day.split('-').reverse().join('/');
  const branchTime = value => new Date(value).toLocaleString('vi-VN', { timeZone: branchTimezone });
  let browser, server, page, current = 'QTV-W18-US01', batch, bank;
  const banks = [];
  const report = () => {
    if (!reports.has(current)) {
      const dir = path.join(root, 'tests/e2e/qtv', current, run);
      fs.mkdirSync(dir, { recursive: true });
      reports.set(current, { dir, steps: [], issues: [] });
    }
    return reports.get(current);
  };
  const popup = () => page.locator('.dx-popup-wrapper:visible .dx-popup-content').last();
  const button = (name, scope = page) => scope.getByRole('button', { name, exact: true });
  const main = () => page.locator('#mainViewport');
  const waitReady = () => page.waitForFunction(() => document.querySelector('#mainViewport .dx-datagrid') && !document.querySelector('#mainViewport .loading-state'));
  async function record(name, target, action, expected, check, section = 'source') {
    const r = report(), step = { name, action, expected, section, status: 'PASS' };
    try {
      await target.waitFor({ state: 'visible' });
      await page.waitForTimeout(350);
      await page.waitForFunction(() => !window.jQuery('.dx-loadpanel:visible, .dx-loadpanel-content:visible').length, null, { timeout: 10000 });
      step.actual = await check();
    }
    catch (err) { step.status = 'FAIL'; step.actual = err.message; r.issues.push(`${name}: ${err.message}`); }
    if (!await target.isVisible()) target = page.locator('body');
    await target.scrollIntoViewIfNeeded();
    const rect = await target.boundingBox(), number = r.steps.length + 1;
    await page.evaluate(({ rect, number }) => {
      const box = document.createElement('div'); box.id = 'handover-e2e-annotation';
      box.style.cssText = `position:fixed;left:${Math.max(0, rect.x)}px;top:${Math.max(0, rect.y)}px;width:${Math.min(rect.width, innerWidth)}px;height:${Math.min(rect.height, innerHeight)}px;border:3px solid #e11d48;pointer-events:none;z-index:2147483647;box-sizing:border-box`;
      const badge = document.createElement('span'); badge.textContent = number;
      badge.style.cssText = 'position:absolute;left:0;top:0;border:2px solid white;border-radius:50%;background:#e11d48;color:white;font:bold 14px Arial;padding:5px';
      box.append(badge); document.body.append(box);
    }, { rect, number });
    step.image = `${section}-${String(number).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(r.dir, step.image) });
    await page.evaluate(() => document.querySelector('#handover-e2e-annotation')?.remove());
    r.steps.push(step); console.log(current, step.status, name);
    if (step.status === 'FAIL') throw new Error(step.actual);
  }
  async function textHas(target, value) {
    const text = await target.innerText(); assert(text.includes(value), `Missing ${value}: ${text}`); return text;
  }
  async function onePopup() {
    assert.equal(await page.locator('.dx-popup-wrapper:visible').count(), 1);
    assert.equal(await popup().locator('.dx-form').count(), 1);
    return popup().innerText();
  }
  async function closePopup() {
    await page.locator('.dx-popup-wrapper:visible .dx-closebutton').last().click();
    await page.locator('.dx-popup-wrapper:visible').waitFor({ state: 'hidden' });
  }
  async function allocate() {
    const controls = main().locator('.dx-datagrid-rowsview .dx-selectbox');
    const count = await controls.count();
    for (let i = 0; i < count; i++) {
      bank = banks[i];
      await controls.nth(i).locator('.dx-dropdowneditor-button').click();
      const option = page.locator('.dx-list-item:visible').filter({ hasText: bank.account_no });
      await option.waitFor();
      await record(`bank-options-${i}`, option, 'Open receiving-account dropdown', 'User contract: only real API registry options', () => textHas(option, bank.account_name));
      const response = page.waitForResponse(r => r.url().endsWith('/revenue-handovers/preview') && r.request().method() === 'POST');
      await option.click(); await response; await waitReady();
      await record(`allocate-bank-${i}`, main(), 'Select verified bank account', 'User contract: re-preview after allocation; updated group from API', () => textHas(main(), bank.account_no));
    }
    assert.equal(await button('Xác nhận bàn giao', main()).isEnabled(), true);
  }
  let ui;
  async function sessionPage(session, branchId, route = 'revenue-handovers') {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1050 }, timezoneId: 'America/Los_Angeles', serviceWorkers: 'block' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) {
        const target = new URL(f.base);
        const redirected = target.origin + url.pathname + url.search;
        network.push({ method: route.request().method(), path: url.pathname, destination: target.origin });
        return route.continue({ url: redirected });
      }
      if (['localhost', '127.0.0.1'].includes(url.hostname) && url.origin !== ui) return route.abort();
      return route.continue();
    });
    await context.addInitScript(({ session, branchId, origin }) => {
      if (location.origin !== origin) return;
      localStorage.setItem('paradise_access_token', session.access_token);
      localStorage.setItem('paradise_user', JSON.stringify(session.user));
      if (branchId) localStorage.setItem('paradise_current_branch_id', branchId);
    }, { session, branchId, origin: ui });
    const p = await context.newPage(); p.setDefaultTimeout(20000);
    if (route === 'revenue-handovers') await p.clock.setFixedTime(new Date(`${f.day}T01:00:00Z`));
    p.on('pageerror', error => errors.push(error.message));
    await p.goto(`${ui}/web/#${route}`, { waitUntil: 'domcontentloaded' });
    await p.locator('#appShell:not([hidden])').waitFor();
    return p;
  }
  try {
    const app = express(); app.use(express.static(path.join(root, 'frontend')));
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    ui = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    page = await sessionPage(f.qtv, f.branchA);
    await waitReady();
    await record('branch-timezone-default-dates', main().locator('.filter-bar'), 'Open W18 in Los Angeles browser at a cross-date instant', 'Branch timezone from real /branches determines today; serialized YYYY-MM-DD does not shift to previous day', async () => {
      const browserClock = await page.evaluate(() => ({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, localDay: `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}` }));
      assert.equal(browserClock.timezone, 'America/Los_Angeles'); assert.notEqual(browserClock.localDay, f.day);
      const inputs = main().locator('.filter-bar .dx-datebox input.dx-texteditor-input');
      assert.equal(await inputs.nth(0).inputValue(), formattedDay); assert.equal(await inputs.nth(1).inputValue(), formattedDay);
      return { browserClock, branchTimezone, expectedDate: formattedDay };
    });
    const initialPreview = await f.request('/revenue-handovers/preview', f.qtv.access_token, { date_from: f.day, date_to: f.day });
    await record('pending-branch-time', main().locator('.data-section').last(), 'Inspect pending payment timestamps in Los Angeles browser', 'Payment time rendered in API branch timezone, not browser timezone', async () => {
      const row = main().locator('.data-section').last().locator('.dx-data-row').filter({ hasText: initialPreview.items[0].payment_code });
      const text = await row.innerText(); assert(text.includes(branchTime(initialPreview.items[0].confirmed_at))); return text;
    });
    await record('pending-unresolved', main(), 'Open W18 for branch A', 'US01 / BR03-BR05: eligible payments and unresolved transfers; confirm disabled', async () => {
      assert.equal(await button('Xác nhận bàn giao', main()).isEnabled(), false);
      return textHas(main(), 'Chưa xác định');
    });
    await button('Tài khoản nhận tiền').dblclick();
    await popup().locator('.dx-form').waitFor();
    await record('single-bank-popup', popup(), 'Double-click receiving-account registry', 'Exactly one popup and one form', onePopup);
    await button('Thêm tài khoản', popup()).click();
    await record('required-bank-fields', popup(), 'Submit blank account', 'US01: all three contract fields are required', async () => {
      assert.equal(await popup().locator('.dx-invalid').count(), 3); return popup().innerText();
    });
    const inputs = popup().locator('.dx-form input.dx-texteditor-input');
    await inputs.nth(0).fill('123');
    await record('short-bin-input', inputs.nth(0), 'Enter BIN 123', 'Contract requires six digits', () => inputs.nth(0).inputValue());
    await inputs.nth(1).fill('ABC');
    await record('invalid-account-input', inputs.nth(1), 'Enter account ABC', 'Contract permits only 1-30 digits', () => inputs.nth(1).inputValue());
    await inputs.nth(2).fill('W18 UI VERIFIED');
    await record('account-name-input', inputs.nth(2), 'Enter holder name', 'Entered name visible before submit', () => inputs.nth(2).inputValue());
    await button('Thêm tài khoản', popup()).click();
    await record('bank-format-errors', popup(), 'Submit malformed BIN/account', 'Validation blocks both invalid fields', async () => {
      assert.equal(await popup().locator('.dx-invalid').count(), 2); return popup().innerText();
    });
    await inputs.nth(0).fill('970422');
    await record('valid-bin-input', inputs.nth(0), 'Enter six-digit BIN', 'BIN retained as text', () => inputs.nth(0).inputValue());
    await inputs.nth(1).fill('000123456789');
    await record('leading-zero-account', inputs.nth(1), 'Enter 000123456789', 'Leading zeroes preserved', () => inputs.nth(1).inputValue());
    const created = page.waitForResponse(r => r.url().endsWith('/revenue-bank-accounts') && r.request().method() === 'POST');
    await button('Thêm tài khoản', popup()).click();
    const bankResponse = await created; assert.equal(bankResponse.status(), 200);
    bank = (await bankResponse.json()).data;
    await popup().getByText(bank.account_no, { exact: true }).waitFor();
    await record('account-created', popup(), 'Save receiving account through real API', 'US01 AF02: persistent registry row appears; original payments remain unresolved', async () => {
      assert.equal(bank.account_no, '000123456789'); await onePopup(); return textHas(popup(), bank.account_no);
    });
    banks.push(bank);
    for (const [index, value] of ['970436', '000987654321', 'W18 SECOND BANK'].entries()) {
      await inputs.nth(index).fill(value);
      await record(`second-account-field-${index}`, inputs.nth(index), `Enter second account field: ${value}`, 'New form values visible before submit', () => inputs.nth(index).inputValue());
    }
    const secondCreated = page.waitForResponse(r => r.url().endsWith('/revenue-bank-accounts') && r.request().method() === 'POST');
    await button('Thêm tài khoản', popup()).click();
    const secondResponse = await secondCreated; assert.equal(secondResponse.status(), 200);
    banks.push((await secondResponse.json()).data);
    await popup().getByText(banks[1].account_no, { exact: true }).waitFor();
    await record('second-account-created', popup(), 'Save second account through real UI', 'Registry has two distinct accounts, reset form does not resubmit first values', () => textHas(popup(), banks[1].account_no));
    await closePopup();
    await record('registry-closed', main(), 'Close receiving-account registry', 'No visible popup remains', async () => { assert.equal(await page.locator('.dx-popup-wrapper:visible').count(), 0); return main().innerText(); });
    await allocate();
    await record('three-source-groups', main().locator('.data-section').first(), 'Inspect re-preview summary', 'User contract: CASH 9m, bank A 5m, bank B 7m', async () => {
      const groups = await main().locator('.data-section').first().locator('.dx-data-row').allTextContents();
      assert.equal(groups.length, 3);
      for (const amount of ['5.000.000', '7.000.000', '9.000.000']) assert(groups.some(g => g.includes(amount)), `Missing visible ${amount}`);
      return groups;
    }, 'state');

    current = 'QTV-W18-US02';
    await button('Xác nhận bàn giao', main()).dblclick();
    await popup().getByRole('checkbox').waitFor();
    await record('confirm-single-popup', popup(), 'Double-click confirm handover', 'BR08: one confirmation popup, unchecked acknowledgement, disabled submit', async () => {
      assert.equal(await page.locator('.dx-popup-wrapper:visible').count(), 1);
      assert.equal(await popup().getByRole('checkbox').isChecked(), false);
      assert.equal(await button('Xác nhận bàn giao', popup()).isEnabled(), false);
      assert.equal(await popup().locator('textarea').getAttribute('maxlength'), '1000');
      return popup().innerText();
    });
    await popup().locator('textarea').fill('A'.repeat(1000));
    await record('note-boundary', popup().locator('textarea'), 'Enter 1000-character note', 'User correction: maxLength=1000, content retained before submit', async () => { assert.equal((await popup().locator('textarea').inputValue()).length, 1000); return '1000 characters visible in textarea; maxlength=1000'; });
    await popup().getByRole('checkbox').check();
    await record('acknowledgement', popup(), 'Check Xác nhận đã bàn giao đầy đủ', 'BR08: explicit acknowledgement enables confirm', async () => { assert(await button('Xác nhận bàn giao', popup()).isEnabled()); return popup().innerText(); });
    // A new successful payment makes the server fingerprint stale without changing the original ledger.
    await f.addPayment(100, 'CASH');
    const stale = page.waitForResponse(r => r.url().endsWith('/revenue-handovers') && r.request().method() === 'POST');
    await button('Xác nhận bàn giao', popup()).click();
    assert.equal((await stale).status(), 409);
    await page.locator('.dx-popup-wrapper:visible').waitFor({ state: 'hidden' }); await waitReady();
    await record('stale-preview-refresh', main(), 'Submit stale preview after a concurrent late payment', 'BR07: 409, refresh preview, no automatic confirm retry, unresolved assignment requires review', async () => {
      assert.equal(await button('Xác nhận bàn giao', main()).isEnabled(), false);
      assert.equal((await f.db.query('SELECT count(*) FROM revenue_handovers')).rows[0].count, '0');
      return main().innerText();
    });
    await allocate();
    await button('Xác nhận bàn giao', main()).click();
    await record('reopen-confirmation', popup(), 'Open refreshed confirmation', 'Fresh acknowledgement required after 409', async () => { assert.equal(await popup().getByRole('checkbox').isChecked(), false); return popup().innerText(); });
    await popup().locator('textarea').fill('W18 real isolated UI handover');
    await record('final-note-input', popup().locator('textarea'), 'Enter final handover note', 'Note visible before submit', () => popup().locator('textarea').inputValue());
    await popup().getByRole('checkbox').check();
    await record('fresh-acknowledgement', popup(), 'Acknowledge refreshed totals', 'Confirm enabled for fresh preview', async () => { assert(await button('Xác nhận bàn giao', popup()).isEnabled()); return popup().innerText(); });
    const confirmed = page.waitForResponse(r => r.url().endsWith('/revenue-handovers') && r.request().method() === 'POST');
    await button('Xác nhận bàn giao', popup()).click();
    const confirmedResponse = await confirmed; assert.equal(confirmedResponse.status(), 200);
    batch = (await confirmedResponse.json()).data;
    await popup().getByText(batch.batch.handover_code, { exact: true }).waitFor();
    await record('confirmed-detail', popup(), 'Confirm refreshed batch', 'BR08-BR09: single read-only detail popup shows API handover_code and snapshot amounts', async () => {
      assert.equal(await page.locator('.dx-popup-wrapper:visible').count(), 1);
      assert.equal(await popup().getByRole('checkbox').count(), 0);
      return textHas(popup(), batch.batch.handover_code);
    }, 'state');
    await closePopup();
    await record('pending-empty', main(), 'Close completed handover detail', 'Confirmed payments removed from pending; empty confirmation disabled', async () => { assert.equal(await button('Xác nhận bàn giao', main()).isEnabled(), false); return main().innerText(); }, 'state');

    current = 'QTV-W18-US03';
    await main().locator('.dx-tab').filter({ hasText: 'Lịch sử bàn giao' }).click();
    await main().getByText(batch.batch.handover_code, { exact: true }).waitFor();
    await record('history-code', main(), 'Open handover history', 'BR09 and user correction: visible handover_code from API', () => textHas(main(), batch.batch.handover_code));
    await record('history-confirmer', main(), 'Inspect confirmer snapshot column', 'User correction: Nguoi xac nhan uses confirmed_by_name', async () => {
      const text = await main().innerText(); assert(text.includes('Người xác nhận')); assert(text.includes(batch.batch.confirmed_by_name)); return text;
    });
    await record('history-timezone-dateonly', main(), 'Inspect history period and timestamp in Los Angeles browser', 'Calendar date is unchanged; confirmation timestamp uses the row snapshot timezone', async () => {
      const text = await main().locator('.dx-data-row').innerText();
      assert(text.includes(formattedDay)); assert(text.includes(new Date(batch.batch.confirmed_at).toLocaleString('vi-VN', { timeZone: batch.batch.timezone })));
      return text;
    });
    await f.db.query('UPDATE member_profiles SET full_name=$1 WHERE id=$2', ['AFTER SNAPSHOT', f.member]);
    await main().locator('.dx-data-row .dx-button').dblclick();
    await popup().getByText(batch.batch.handover_code, { exact: true }).waitFor();
    await record('immutable-detail', popup(), 'Double-click history detail after member-name change', 'BR09: one read-only popup retains snapshotted account/customer/payment values', async () => {
      assert.equal(await page.locator('.dx-popup-wrapper:visible').count(), 1);
      const text = await popup().innerText(); assert(text.includes('W18 UI VERIFIED')); assert(text.includes('Handover Member')); assert(!text.includes('AFTER SNAPSHOT'));
      assert(text.includes('Chi nhánh')); assert(text.includes(batch.batch.branch_name));
      assert(text.includes('Người xác nhận')); assert(text.includes(batch.batch.confirmed_by_name));
      assert(text.includes(`${formattedDay} - ${formattedDay}`));
      assert(text.includes(new Date(batch.items[0].confirmed_at).toLocaleString('vi-VN', { timeZone: batch.batch.timezone })));
      for (const item of batch.items) assert(text.includes(item.payment_code));
      assert.equal(await popup().getByRole('button', { name: /Sửa|Xóa|Lưu/ }).count(), 0);
      return text;
    }, 'state');
    const detailGrid = popup().locator('.data-section').last();
    await detailGrid.locator('.dx-data-row').last().scrollIntoViewIfNeeded();
    await detailGrid.locator('.dx-datagrid').evaluate(el => {
      const instance = window.DevExpress.ui.dxDataGrid.getInstance(el.parentElement);
      if (!instance) throw new Error('Detail grid host not found');
      instance.getScrollable().scrollTo({ left: 10000 });
    });
    await record('detail-bank-columns-scrolled', detailGrid, 'Scroll detail grid horizontally to receiving-account column', 'Snapshot bank accounts visible in the same customer/payment rows; no loading overlay', async () => {
      assert.equal(await page.locator('.dx-loadpanel:visible, .dx-loadpanel-content:visible').count(), 0);
      const viewport = await detailGrid.locator('.dx-datagrid-rowsview').boundingBox();
      for (const account of banks) {
        const cell = detailGrid.locator('.dx-data-row td').filter({ hasText: account.account_no });
        const box = await cell.boundingBox();
        assert(box && box.x >= viewport.x - 2 && box.x + box.width <= viewport.x + viewport.width + 2, 'Bank cell must be within the visible grid viewport');
      }
      return detailGrid.innerText();
    }, 'state');
    await closePopup();

    page = await sessionPage(f.lt, f.branchA, 'payments');
    await page.locator('.sales-view').waitFor();
    await page.locator('.sales-view .dx-data-row').first().waitFor();
    await record('lt-no-w18', page.locator('#sidebarList'), 'Open authenticated receptionist UI', 'BR01: receptionist has no W18 menu/shortcut', async () => {
      assert.equal(await page.locator('[data-menu="revenue-handovers"], [data-route="revenue-handovers"]').count(), 0);
      return page.locator('#sidebarList').innerText();
    }, 'downstream');
    await page.evaluate(() => window.ParadiseApp.navigateTo('revenue-handovers'));
    await record('lt-direct-route-denied', main(), 'Receptionist attempts direct W18 navigation', 'BR01: access denied; authenticated payment screen retained', async () => {
      assert.equal(await main().getByText('Bàn giao & tất toán doanh thu', { exact: true }).count(), 0);
      return main().innerText();
    }, 'downstream');
    await record('lt-payment-history-preserved', main(), 'Inspect same payments after handover', 'BR10: original payment history remains visible to LT', async () => {
      const text = await main().innerText();
      for (const item of batch.items) assert(text.includes(item.receipt_code), `LT missing receipt ${item.receipt_code} of payment ${item.payment_code}`);
      return text;
    }, 'downstream');

    page = await sessionPage(f.qtvB, f.branchB);
    await waitReady();
    await record('qtv-branch-b-pending', main(), 'Open QTV branch B', 'BR01: branch B contains none of branch A payments', async () => {
      const text = await main().innerText(); for (const item of batch.items) assert(!text.includes(item.payment_code)); assert(text.includes(f.payments[3].code)); return text;
    }, 'downstream');
    await main().locator('.dx-tab').filter({ hasText: 'Lịch sử bàn giao' }).click(); await waitReady();
    await record('qtv-branch-b-history', main(), 'Open branch B history', 'BR01: branch A batch is absent', async () => { const text = await main().innerText(); assert(!text.includes(batch.batch.handover_code)); return text; }, 'downstream');
    page = await sessionPage(f.qtv, null);
    await main().getByText('Chọn một chi nhánh để xem giao dịch chưa bàn giao.', { exact: true }).waitFor();
    await record('all-preview-blocked', main(), 'Open QTV ALL scope', 'BR01: no preview/create in ALL', async () => { assert.equal(await button('Xác nhận bàn giao', main()).isEnabled(), false); return main().innerText(); }, 'downstream');
    await record('all-empty-calendar-filters', main().locator('.filter-bar'), 'Inspect ALL default filters', 'No guessed timezone at ALL; both calendar filters empty', async () => {
      const inputs = main().locator('.filter-bar .dx-datebox input.dx-texteditor-input');
      assert.equal(await inputs.nth(0).inputValue(), ''); assert.equal(await inputs.nth(1).inputValue(), ''); return 'Both date filters empty';
    }, 'downstream');
    await main().locator('.dx-tab').filter({ hasText: 'Lịch sử bàn giao' }).click();
    await main().getByText(batch.batch.handover_code, { exact: true }).waitFor();
    await record('all-history-visible', main(), 'Open ALL history', 'BR01: lists allowed in ALL; branch A batch visible', () => textHas(main(), batch.batch.handover_code), 'downstream');
    await main().locator('.dx-data-row .dx-button').click();
    await popup().getByText(batch.batch.handover_code, { exact: true }).waitFor();
    await record('all-detail-snapshot-timezone', popup(), 'Open branch A batch detail from ALL in Los Angeles browser', 'Detail uses batch.timezone despite no selected branch timezone; date-only period stays unchanged', async () => {
      const text = await popup().innerText();
      assert(text.includes(`${formattedDay} - ${formattedDay}`));
      assert(text.includes(new Date(batch.batch.confirmed_at).toLocaleString('vi-VN', { timeZone: batch.batch.timezone })));
      assert(text.includes(new Date(batch.items[0].confirmed_at).toLocaleString('vi-VN', { timeZone: batch.batch.timezone })));
      return text;
    }, 'downstream');
  } catch (err) {
    report().issues.push(err.stack); console.error(err.stack);
    if (page && !page.isClosed()) {
      try { await record('blocked-current-screen', page.locator('body'), 'Capture failure', 'Remaining dependent steps BLOCKED', async () => { throw err; }); } catch {}
    }
    throw err;
  } finally {
    for (const [id, r] of reports) {
      const result = { id, database: f.dbName, migrations: f.migrations, sourceHashes, network, errors, ...r };
      fs.writeFileSync(path.join(r.dir, 'results.json'), JSON.stringify(result, null, 2));
      const sections = [['Source Action Verification', 'source'], ['State Verification', 'state'], ['Cross-Role / Downstream Verification', 'downstream']];
      const lines = [`# ${id} - Real isolated UI verification`, '', `Database: ${f.dbName}. Run: ${run}.`, '', 'Sources: QTV-W18 Epic BR01-BR10, US01/US02/US03 and explicit user API/UI contract. Main owns docs; per-row account selection follows the explicit contract.', '', 'Related reports: [US01](../QTV-W18-US01/QTV-W18-US01-test.md), [US02](../QTV-W18-US02/QTV-W18-US02-test.md), [US03](../QTV-W18-US03/QTV-W18-US03-test.md).', ''];
      for (const [heading, type] of sections) {
        lines.push(`## ${heading}`, '');
        const steps = r.steps.filter(s => s.section === type);
        if (!steps.length) lines.push(type === 'downstream' ? 'Cross-role verification for this same handover is recorded in [US03](../QTV-W18-US03/QTV-W18-US03-test.md): authenticated LT has no W18, retains the same receipts; QTV branch B is isolated; ALL history is visible.' : 'See linked W18 reports for related state coverage.', '');
        for (const s of steps) lines.push(`### ${s.name}`, '', `- Action/Input: ${s.action}`, `- Expected: ${s.expected}`, `- Actual: ${typeof s.actual === 'string' ? s.actual.replace(/\n/g, ' ').slice(0, 4000) : JSON.stringify(s.actual)}`, `- Status: ${s.status}`, '', `![${s.name}](${run}/${s.image})`, '');
      }
      lines.push('## Issues Found', '', ...(r.issues.length ? r.issues.map(i => `- ${i.replace(/\n/g, ' ')}`) : ['No assertion failures in executed scope.']), '', '## Final Result', '', r.issues.length ? 'FAIL / subsequent dependent steps BLOCKED.' : 'PASS for executed scope; see results.json for migration/source manifests and network destinations.', '', `Evidence: [results.json](${run}/results.json).`, '');
      fs.writeFileSync(path.join(root, 'tests/e2e/qtv', id, `${id}-test.md`), lines.join('\n'));
    }
    await browser?.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
}

module.exports = { runUI };

if (require.main === module) {
  (async () => {
    const { setup } = require(path.join(root, 'backend/tests/helpers/revenue-fixture.cjs'));
    const fixture = await setup();
    console.log('ISOLATED', fixture.name, fixture.base, `${fixture.migrations.length} migrations`);
    try {
      await runUI({ ...fixture, dbName: fixture.name, branchA: fixture.branches[0], branchB: fixture.branches[1], qtv: fixture.sessions.qtv, qtvB: fixture.sessions.qtvB, lt: fixture.sessions.lt });
    } finally {
      await fixture.close();
      console.log('CLEANUP isolated database and backend closed');
    }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}

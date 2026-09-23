const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setup } = require('./helpers/revenue-fixture.cjs');
(async () => {
  const f = await setup(); let checks = 0;
  const api = async (...args) => { const result = await f.request(...args); checks++; return result; };
  try {
    const A = f.sessions.qtv.access_token, B = f.sessions.qtvB.access_token, L = f.sessions.lt.access_token;
    const period = { date_from: f.day, date_to: f.day };
    await api('/revenue-handovers', null, null, null, 401);
    for (const token of [L, f.sessions.member.access_token, f.sessions.limited.access_token]) await api('/revenue-handovers', token, null, null, 403);
    await api('/revenue-handovers/preview', A, period, 'ALL', 400);
    await api('/revenue-handovers/preview', B, period, f.branches[0], 403);
    await api('/revenue-handovers/preview', A, { date_from: '2026-02-30', date_to: f.day }, undefined, 400);
    const preview = await api('/revenue-handovers/preview', A, period);
    assert.equal(preview.count, 3); assert.equal(preview.total_amount, '21000000.00'); assert.equal(preview.unresolved_count, 2);
    await api('/revenue-handovers', A, { ...period, preview_token: preview.preview_token, confirmed: false }, undefined, 400);
    await api('/revenue-handovers', A, { ...period, preview_token: preview.preview_token, confirmed: true, total_amount: 1 }, undefined, 400);
    await api('/revenue-handovers', A, { ...period, preview_token: preview.preview_token, confirmed: true }, undefined, 409);
    await api('/revenue-bank-accounts', A, { bank_bin: 'abc', account_no: '123', account_name: 'Invalid' }, undefined, 400);
    const bankA = await api('/revenue-bank-accounts', A, { bank_bin: '970422', account_no: '001234', account_name: 'Account A' });
    const bankB = await api('/revenue-bank-accounts', A, { bank_bin: '970436', account_no: '005678', account_name: 'Account B' });
    const largeRequest = await api('/revenue-handovers/preview', A, { ...period, allocations: Array.from({ length: 1000 }, () => ({ payment_id: f.payments[1].id, bank_account_id: bankA.id })) }, undefined, 400);
    assert.match(largeRequest.message, /Mỗi giao dịch/);
    await api('/revenue-bank-accounts', A, { bank_bin: '970422', account_no: '001234', account_name: 'Duplicate' }, undefined, 409);
    const outside = await api('/revenue-bank-accounts', B, { bank_bin: '970422', account_no: '009999', account_name: 'Branch B' }, f.branches[1]);
    await api('/revenue-handovers/preview', A, { ...period, allocations: [{ payment_id: f.payments[1].id, bank_account_id: outside.id }] }, undefined, 400);
    const body = { ...period, allocations: [{ payment_id: f.payments[1].id, bank_account_id: bankA.id }, { payment_id: f.payments[2].id, bank_account_id: bankB.id }] };
    const allocated = await api('/revenue-handovers/preview', A, body);
    assert.equal(allocated.unresolved_count, 0); assert.equal(allocated.groups.length, 3);
    assert.deepEqual(allocated.groups.map(g => g.amount).sort(), ['5000000.00', '7000000.00', '9000000.00']);
    await f.addPayment(100, 'CASH');
    await api('/revenue-handovers', A, { ...body, preview_token: allocated.preview_token, confirmed: true }, undefined, 409);
    const fresh = await api('/revenue-handovers/preview', A, body);
    const confirmedBody = { ...body, preview_token: fresh.preview_token, confirmed: true, note: 'Verified cash and two bank statements' };
    // Repeating the same reviewed payload resolves to the original immutable batch.
    const first = await api('/revenue-handovers', A, confirmedBody);
    const again = await api('/revenue-handovers', A, confirmedBody);
    assert.equal(first.batch.id, again.batch.id); assert.equal(first.items.length, 4);
    const response = await api('/revenue-handovers/preview', A, period); assert.equal(response.count, 0);
    assert.equal((await api('/revenue-handovers', B, null, f.branches[1])).total, 0);
    await api(`/revenue-handovers/${first.batch.id}`, B, null, f.branches[1], 403);
    await api(`/revenue-handovers/${first.batch.id}`, A, null, f.branches[1], 403);
    await api(`/revenue-handovers/${first.batch.id}`, L, null, f.branches[0], 403);
    await api(`/revenue-handovers/${first.batch.id}`, A, {}, f.branches[0], 404, 'DELETE');
    await f.db.query("UPDATE member_profiles SET full_name='Changed after handover' WHERE id=$1", [f.member]);
    const historical = await api(`/revenue-handovers/${first.batch.id}`, A);
    assert(historical.items.every(i => i.member_name === 'Handover Member'));
    for (const sql of [
      'UPDATE revenue_handovers SET total_amount=1', 'DELETE FROM revenue_handovers',
      'UPDATE revenue_handover_items SET amount=1', 'DELETE FROM revenue_handover_items',
      'UPDATE revenue_bank_accounts SET account_no=\'123\'',
      'UPDATE payments SET amount=1', 'DELETE FROM payments',
      `UPDATE receipts SET amount=1 WHERE id='${f.payments[0].receipt}'`,
      `DELETE FROM receipts WHERE id='${f.payments[0].receipt}'`,
      'TRUNCATE revenue_handovers CASCADE'
    ]) { await assert.rejects(f.db.query(sql), e => e.code === '23514'); checks++; }
    await f.addPayment(200, 'CASH');
    const next = await api('/revenue-handovers/preview', A, period); assert.equal(next.count, 1);
    const submits = await Promise.all([1, 2].map(() => api('/revenue-handovers', A, { ...period, preview_token: next.preview_token, confirmed: true })));
    assert.equal(submits[0].batch.id, submits[1].batch.id);
    assert.equal((await api('/revenue-handovers', A)).total, 2);
    await f.addPayment(300.01, 'CASH', f.branches[0], `${f.day}T00:00:00+07:00`);
    await f.addPayment(400.02, 'CASH', f.branches[0], `${f.day}T23:59:59+07:00`);
    const boundaries = await api('/revenue-handovers/preview', A, period);
    assert.equal(boundaries.count, 2); assert.equal(boundaries.total_amount, '700.03');
    const extra = boundaries.items[0];
    await assert.rejects(f.db.query(`INSERT INTO revenue_handover_items(handover_id,payment_id,receipt_id,bank_account_id,amount,payment_method,snapshot)
      VALUES($1,$2,$3,NULL,$4,'CASH',$5)`, [first.batch.id, extra.payment_id, extra.receipt_id, extra.amount, JSON.stringify(extra)]), e => e.code === '23514'); checks++;
    assert.equal((await api('/revenue-handovers/preview', A, period)).count, 2);
    await f.db.query("UPDATE branches SET timezone='America/Los_Angeles' WHERE id=$1", [f.branches[1]]);
    const localEdge = await f.addPayment(777.03, 'CASH', f.branches[1], `${f.day}T00:00:00+07:00`);
    const previousDay = new Date(Date.parse(f.day) - 86400000).toISOString().slice(0, 10);
    const western = await api('/revenue-handovers/preview', B, { date_from: previousDay, date_to: previousDay }, f.branches[1]);
    assert(western.items.some(i => i.payment_id === localEdge.id));
    const nextDay = await api('/revenue-handovers/preview', B, period, f.branches[1]);
    assert(!nextDay.items.some(i => i.payment_id === localEdge.id));
    const missingReceipt = await f.addPayment(15, 'CASH');
    await f.db.query('DELETE FROM receipts WHERE id=$1', [missingReceipt.receipt]);
    const inconsistent = await api('/revenue-handovers/preview', A, period, undefined, 409);
    assert.equal(inconsistent.code, 'RECEIPT_INCONSISTENT');
    const before = (await f.db.query('SELECT COUNT(*)::int n FROM revenue_handover_items')).rows[0].n;
    await f.db.query(fs.readFileSync(path.join(__dirname, '../src/db/migrations/017_revenue_handovers.sql'), 'utf8'));
    assert.equal((await f.db.query('SELECT COUNT(*)::int n FROM revenue_handover_items')).rows[0].n, before);
    console.log(`PASS ${checks} HTTP/database checks; source grouping, stale preview, role/branch scopes, idempotency, immutable snapshots, late receipts and migration replay.`);
  } finally { await f.close(); console.log('CLEANUP isolated database and server closed'); }
})().catch(error => { console.error(error); process.exitCode = 1; });

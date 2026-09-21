const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function commissionSnapshotCases({ request, db, A, P, pt, m, ptr, completed }) {
  const originalBooking = (await db.query('SELECT * FROM pt_bookings WHERE id=$1', [completed.id])).rows[0];
  const originalRegistration = (await db.query('SELECT * FROM registrations WHERE id=$1', [ptr.id])).rows[0];
  const originalMember = (await db.query('SELECT * FROM member_profiles WHERE id=$1', [m.id])).rows[0];
  const month = Number(originalBooking.booking_date.slice(5, 7));
  const year = Number(originalBooking.booking_date.slice(0, 4));
  async function insertCommission(periodMonth, periodYear, status = 'PENDING') {
    return (await db.query(`INSERT INTO pt_commissions
      (pt_id, month, year, total_pt_sessions_taught, pt_revenue_share, commission_percentage, total_commission_amount, status)
      VALUES ($1,$2,$3,1,200000,25,50000,$4) RETURNING *`, [pt.id, periodMonth, periodYear, status])).rows[0];
  }
  const comm = await insertCommission(month, year);
  const endpoint = `/commissions/${comm.id}/status`;
  const body = { status: 'PAID', payout_method: 'CASH', payout_ref: 'SNAPSHOT-PAYOUT' };
  const paid = await Promise.all([1, 2].map(() => request(endpoint, { token: A, method: 'PUT', body })));
  assert.deepEqual(paid[0], paid[1], 'Concurrent payout retries must return one persisted settlement');
  assert.equal(paid[0].total_commission_amount, 50000);
  assert(!Object.hasOwn(paid[0], 'details_snapshot'), 'Keep the Web summary shape without embedding detail arrays');
  const stored = (await db.query('SELECT * FROM pt_commissions WHERE id=$1', [comm.id])).rows[0];
  assert.equal(stored.status, 'PAID');
  assert.equal(stored.details_snapshot.length, 1);
  const snapshot = stored.details_snapshot[0];
  assert.equal(snapshot.id, completed.id);
  assert.equal(snapshot.registration_id, ptr.id);
  assert.equal(snapshot.member_id, m.id);
  assert.equal(snapshot.member_name, originalMember.full_name);
  assert.equal(snapshot.package_name_snapshot, originalRegistration.package_name_snapshot);
  assert.equal(Number(snapshot.commission_percentage), 25);
  assert.equal(Number(snapshot.session_commission), 50000);
  assert(snapshot.pt_confirmed_at && snapshot.member_confirmed_at);
  assert.equal((await db.query("SELECT count(*)::int n FROM audit_logs WHERE target_id=$1 AND action_name='COMMISSION_STATUS_PAID'", [comm.id])).rows[0].n, 1);
  assert.equal((await db.query("SELECT count(*)::int n FROM notifications WHERE reference_id=$1 AND event_type='COMMISSION_PAID'", [comm.id])).rows[0].n, 1);

  const ownUrl = `/pt/my-commissions?month=${month}&year=${year}`;
  const before = await request(ownUrl, { token: P });
  assert.deepEqual(Object.keys(before).sort(), ['details_snapshot_available', 'sessions', 'summary']);
  assert.equal(before.details_snapshot_available, true);
  assert.deepEqual(before.sessions, stored.details_snapshot);
  assert.equal(before.summary.total_commission_amount, 50000);
  await db.query("UPDATE member_profiles SET full_name='Changed after payout' WHERE id=$1", [m.id]);
  await db.query("UPDATE registrations SET pt_price_snapshot=9000000,package_name_snapshot='Changed package after payout' WHERE id=$1", [ptr.id]);
  await db.query("UPDATE pt_bookings SET status='CANCELLED',workout_notes='Changed after payout' WHERE id=$1", [completed.id]);
  try {
    assert.deepEqual(await request(ownUrl, { token: P }), before, 'PAID reads must not rebuild from changed live data');
    const web = await request(`/commissions/${comm.id}/details`, { token: A });
    assert.equal(web.details_snapshot_available, true);
    assert.deepEqual(web.sessions, before.sessions);
    assert.equal(web.commission.total_commission_amount, 50000);
    const calculated = await request('/commissions/calculate', { token: A, method: 'POST', body: { month, year, branch_id: pt.branch_id } });
    assert.equal(calculated.find(item => item.id === comm.id).total_commission_amount, 50000);
    assert.deepEqual((await db.query('SELECT * FROM pt_commissions WHERE id=$1', [comm.id])).rows[0], stored, 'Recalculation must preserve paid history after source edits');
    const repeated = await request(endpoint, { token: A, method: 'PUT', body: { ...body, payout_ref: 'IGNORE-RETRY', bank_name: 'Do not change', bank_account_no: '123' } });
    assert.deepEqual(repeated, paid[0]);
    await request(endpoint, { token: A, method: 'PUT', body: { status: 'PENDING' }, status: 409 });
    assert.deepEqual((await db.query('SELECT * FROM pt_commissions WHERE id=$1', [comm.id])).rows[0], stored);
    for (const sql of [
      "UPDATE pt_commissions SET details_snapshot='[]'::jsonb WHERE id=$1",
      'UPDATE pt_commissions SET total_commission_amount=1 WHERE id=$1',
      "UPDATE pt_commissions SET payout_method='BANK_TRANSFER' WHERE id=$1",
      "UPDATE pt_commissions SET payout_ref='REWRITTEN' WHERE id=$1",
      "UPDATE pt_commissions SET payout_note='REWRITTEN' WHERE id=$1",
      "UPDATE pt_commissions SET status='PENDING' WHERE id=$1",
      'DELETE FROM pt_commissions WHERE id=$1'
    ]) await assert.rejects(db.query(sql, [comm.id]), e => e.code === '23514');
  } finally {
    await db.query('UPDATE member_profiles SET full_name=$2 WHERE id=$1', [m.id, originalMember.full_name]);
    await db.query('UPDATE registrations SET pt_price_snapshot=$2,package_name_snapshot=$3 WHERE id=$1', [ptr.id, originalRegistration.pt_price_snapshot, originalRegistration.package_name_snapshot]);
    await db.query('UPDATE pt_bookings SET status=$2,workout_notes=$3 WHERE id=$1', [completed.id, originalBooking.status, originalBooking.workout_notes]);
  }

  const legacy = await insertCommission(1, 2035, 'PAID');
  await db.query(fs.readFileSync(path.join(__dirname, '../src/db/migrations/012_pt_commission_session_snapshot.sql'), 'utf8'));
  for (const url of ['/pt/my-commissions?month=1&year=2035', `/commissions/${legacy.id}/details`]) {
    const result = await request(url, { token: url.startsWith('/pt/') ? P : A });
    assert.equal(result.details_snapshot_available, false);
    assert.deepEqual(result.sessions, []);
    assert.equal((result.summary || result.commission).total_pt_sessions_taught, 1);
    assert.equal((result.summary || result.commission).total_commission_amount, 50000);
  }
  await request(`/commissions/${legacy.id}/status`, { token: A, method: 'PUT', body: { status: 'PAID' } });
  const legacyBeforeCalculate = (await db.query('SELECT * FROM pt_commissions WHERE id=$1', [legacy.id])).rows[0];
  await request('/commissions/calculate', { token: A, method: 'POST', body: { month: 1, year: 2035, branch_id: pt.branch_id } });
  assert.deepEqual((await db.query('SELECT * FROM pt_commissions WHERE id=$1', [legacy.id])).rows[0], legacyBeforeCalculate, 'Recalculation must not fabricate legacy history or change its totals');
  assert.equal((await db.query('SELECT details_snapshot FROM pt_commissions WHERE id=$1', [legacy.id])).rows[0].details_snapshot, null);
  await assert.rejects(db.query("UPDATE pt_commissions SET details_snapshot='[]'::jsonb WHERE id=$1", [legacy.id]), e => e.code === '23514');

  const rollback = await insertCommission(2, 2035);
  await assert.rejects(db.query("UPDATE pt_commissions SET status='PAID' WHERE id=$1", [rollback.id]), e => e.code === '23514');
  await assert.rejects(db.query("UPDATE pt_commissions SET status='PAID',details_snapshot='{}'::jsonb WHERE id=$1", [rollback.id]), e => e.code === '23514');
  const originalBank = (await db.query('SELECT bank_name,bank_account_no,bank_account_name FROM pt_profiles WHERE id=$1', [pt.id])).rows[0];
  // Force a failure after the payout update and notification insert, inside the isolated DB only.
  assert(/^[0-9a-f-]{36}$/.test(rollback.id));
  await db.query(`ALTER TABLE audit_logs ADD CONSTRAINT test_commission_atomicity CHECK (target_id IS DISTINCT FROM '${rollback.id}'::uuid)`);
  try {
    await request(`/commissions/${rollback.id}/status`, { token: A, method: 'PUT', body: { status: 'PAID', bank_name: 'Rollback bank', bank_account_no: '999' }, status: 409 });
    assert.deepEqual((await db.query('SELECT * FROM pt_commissions WHERE id=$1', [rollback.id])).rows[0], rollback);
    assert.deepEqual((await db.query('SELECT bank_name,bank_account_no,bank_account_name FROM pt_profiles WHERE id=$1', [pt.id])).rows[0], originalBank);
    assert.equal((await db.query('SELECT count(*)::int n FROM notifications WHERE reference_id=$1', [rollback.id])).rows[0].n, 0);
  } finally {
    await db.query('ALTER TABLE audit_logs DROP CONSTRAINT test_commission_atomicity');
  }
  await request(`/commissions/${rollback.id}/status`, { token: A, method: 'PUT', body: { status: 'PAID' } });
  const empty = await request('/pt/my-commissions?month=2&year=2035', { token: P });
  assert.equal(empty.details_snapshot_available, true, 'An actual empty snapshot differs from missing legacy history');
  assert.deepEqual(empty.sessions, []);
  assert.equal(empty.summary.total_commission_amount, 50000);
  console.log('PASS commission payout snapshots: atomic rollback, concurrent/idempotent payout, immutable details after source edits, DB guards, honest legacy flag and empty snapshot');
};

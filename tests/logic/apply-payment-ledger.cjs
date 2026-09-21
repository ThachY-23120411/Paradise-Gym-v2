const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const dep = name => require(path.join(root, 'backend/node_modules', name));
dep('dotenv').config({ path: path.join(root, 'backend/.env'), quiet: true });
const { Client } = dep('pg');
const digest = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex');

async function main() {
  assert(process.env.DATABASE_URL, 'Explicit DATABASE_URL required');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout='10s'");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('paradise-web-migration'))");
    await client.query('LOCK TABLE payments, receipts, registrations IN SHARE ROW EXCLUSIVE MODE');
    const legacy = (await client.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='status'")).rowCount > 0;
    const paid = (await client.query(`SELECT to_jsonb(p)-'status' AS data FROM payments p ${legacy ? "WHERE status='COMPLETED'" : ''} ORDER BY id`)).rows;
    const pending = legacy ? (await client.query("SELECT id FROM payments WHERE status<>'COMPLETED' ORDER BY id")).rows : [];
    const receipts = (await client.query('SELECT * FROM receipts ORDER BY id')).rows;
    const registrations = (await client.query('SELECT * FROM registrations ORDER BY id')).rows;
    await client.query(fs.readFileSync(path.join(root, 'backend/src/db/migrations/014_successful_payment_ledger.sql'), 'utf8'));
    const after = (await client.query('SELECT to_jsonb(p) AS data FROM payments p ORDER BY id')).rows;
    assert.equal(digest(after), digest(paid), 'Settled payment data must be preserved exactly except removed status');
    assert.equal(digest((await client.query('SELECT * FROM receipts ORDER BY id')).rows), digest(receipts), 'All receipt data preserved');
    assert.equal(digest((await client.query('SELECT * FROM registrations ORDER BY id')).rows), digest(registrations), 'Registration data unchanged');
    for (const { id } of pending) assert.equal((await client.query('SELECT id FROM payment_intents WHERE id=$1', [id])).rowCount, 1, 'Every unpaid attempt preserved as an intent');
    assert.equal((await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='status'")).rowCount, 0);
    const summary = { settledPayments: paid.length, receipts: receipts.length, registrations: registrations.length, relocatedAttempts: pending.length, preserved: true };
    const apply = process.argv.includes('--apply');
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    console.log(JSON.stringify({ mode: apply ? 'APPLIED' : 'DRY_RUN_ROLLED_BACK', ...summary }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

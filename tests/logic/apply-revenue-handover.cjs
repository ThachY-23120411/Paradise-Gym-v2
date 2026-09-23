const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
require(path.join(root, 'backend/node_modules/dotenv')).config({ path: path.join(root, 'backend/.env'), quiet: true });
const { Client } = require(path.join(root, 'backend/node_modules/pg'));
const digest = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex');
(async () => {
  assert(process.env.DATABASE_URL, 'Explicit DATABASE_URL required');
  const db = new Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
  try {
    await db.query('BEGIN'); await db.query("SET LOCAL lock_timeout='10s'");
    await db.query("SELECT pg_advisory_xact_lock(hashtext('paradise-web-migration'))");
    await db.query('LOCK TABLE payments,receipts,registrations IN SHARE ROW EXCLUSIVE MODE');
    const before = {};
    for (const table of ['payments', 'receipts', 'registrations']) before[table] = (await db.query(`SELECT * FROM ${table} ORDER BY id`)).rows;
    assert.equal((await db.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='status'")).rowCount, 0, 'Migration014 successful-only ledger is required; not altering legacy payments automatically');
    await db.query(fs.readFileSync(path.join(root, 'backend/src/db/migrations/017_revenue_handovers.sql'), 'utf8'));
    for (const table of Object.keys(before)) assert.equal(digest(before[table]), digest((await db.query(`SELECT * FROM ${table} ORDER BY id`)).rows), `${table} must be preserved`);
    await db.query(process.argv.includes('--apply') ? 'COMMIT' : 'ROLLBACK');
    console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'APPLIED' : 'DRY_RUN_ROLLED_BACK', preserved: Object.fromEntries(Object.entries(before).map(([name, rows]) => [name, rows.length])) }));
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { await db.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });

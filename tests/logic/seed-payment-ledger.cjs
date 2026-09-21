const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const backend = path.join(root, 'backend');
const dep = name => require(path.join(backend, 'node_modules', name));
dep('dotenv').config({ path: path.join(backend, '.env'), quiet: true });
const { Client } = dep('pg');
const name = `paradise_test_seed_${process.pid}_${Date.now()}`;

async function main() {
  assert(process.env.DATABASE_URL);
  assert(/^paradise_test_seed_\d+_\d+$/.test(name));
  const admin = new Client({ connectionString: process.env.DATABASE_URL });
  let db, created = false;
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${name}"`); created = true;
    const url = new URL(process.env.DATABASE_URL); url.pathname = '/' + name;
    const env = { ...process.env, DATABASE_URL: url.toString(), NODE_ENV: 'test' };
    delete env.ALLOW_DESTRUCTIVE_SEED;
    const run = file => spawnSync(process.execPath, [file], { cwd: backend, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
    const seed = run('src/db/seed.js');
    assert.equal(seed.status, 0, seed.stderr || seed.stdout);
    db = new Client({ connectionString: url.toString() }); await db.connect();
    assert.equal((await db.query("SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='status'")).rowCount, 0);
    assert((await db.query("SELECT to_regclass('public.payment_intents') name")).rows[0].name);
    const counts = (await db.query('SELECT (SELECT count(*)::int FROM accounts) accounts,(SELECT count(*)::int FROM payments) payments,(SELECT count(*)::int FROM receipts) receipts,(SELECT count(*)::int FROM payment_intents) intents')).rows[0];
    assert(counts.accounts > 0); assert.equal(counts.payments, counts.receipts);
    const migration = run('src/db/migrate.js');
    assert.equal(migration.status, 0, migration.stderr || migration.stdout);
    const refused = run('src/db/seed.js');
    assert.notEqual(refused.status, 0, 'Populated database seed must require explicit reset approval');
    assert.match(refused.stderr + refused.stdout, /Refusing to reset/);
    console.log(JSON.stringify({ result: 'PASS', seeded: counts, migrationReplay: 'PASS', populatedSeedGuard: 'PASS', sharedDatabaseUntouched: true }));
  } finally {
    if (db) await db.end();
    if (created) await admin.query(`DROP DATABASE "${name}"`);
    await admin.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

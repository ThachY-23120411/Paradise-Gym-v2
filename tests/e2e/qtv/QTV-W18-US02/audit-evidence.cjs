const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const run = process.argv[2];
assert(/^\d{4}-\d{2}-\d{2}T[\d-]+Z$/.test(run), 'Pass a recorded run directory name');
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const result = { run, stories: [], sourceHashesMatch: true, databaseRemoved: false, backendStopped: false };
(async () => {
  const databases = new Set(), origins = new Set();
  for (const id of ['QTV-W18-US01', 'QTV-W18-US02', 'QTV-W18-US03']) {
    const dir = path.join(root, 'tests/e2e/qtv', id, run);
    const report = JSON.parse(fs.readFileSync(path.join(dir, 'results.json')));
    assert.equal(report.errors.length, 0); assert.equal(report.issues.length, 0);
    assert(report.steps.every(step => step.status === 'PASS'));
    for (const [file, expected] of Object.entries(report.sourceHashes)) assert.equal(sha(path.join(root, file)), expected, `Source changed: ${file}`);
    const unique = new Set(report.steps.map(step => sha(path.join(dir, step.image))));
    assert.equal(unique.size, report.steps.length);
    assert(/^paradise_handover_test_\d+_\d+$/.test(report.database)); databases.add(report.database);
    for (const entry of report.network) origins.add(entry.destination);
    result.stories.push({ id, steps: report.steps.length, uniqueScreenshots: unique.size, migrations: report.migrations.length });
  }
  require(path.join(root, 'backend/node_modules/dotenv')).config({ path: path.join(root, 'backend/.env'), quiet: true });
  const { Client } = require(path.join(root, 'backend/node_modules/pg'));
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const remaining = await client.query('SELECT datname FROM pg_database WHERE datname=ANY($1::text[])', [[...databases]]);
    assert.equal(remaining.rows.length, 0, 'Disposable database still exists');
    result.databaseRemoved = true;
  } finally { await client.end(); }
  for (const origin of origins) {
    let reachable = false;
    try { await fetch(`${origin}/health`, { signal: AbortSignal.timeout(1000) }); reachable = true; } catch {}
    assert(!reachable, `Isolated backend still running: ${origin}`);
  }
  result.backendStopped = true;
  result.apiOrigins = [...origins];
  result.limitations = 'Desktop Chromium 1600x1050; executed scenarios only, not exhaustive new-document field parity, mobile, all date boundaries or network failures.';
  fs.writeFileSync(path.join(__dirname, run, 'verification.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });

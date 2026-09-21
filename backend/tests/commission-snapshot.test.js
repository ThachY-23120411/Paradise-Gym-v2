const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function harness(snapshot) {
  const calls = [];
  const comm = { id: 'commission', pt_id: 'pt', status: 'PAID', total_pt_sessions_taught: 7, total_commission_amount: 456, details_snapshot: snapshot };
  const db = { query: async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('FROM pt_commissions')) return { rows: [comm] };
    if (sql.includes('FROM pt_profiles')) return { rows: [{ id: 'pt', branch_id: 'branch' }] };
    throw new Error(`PAID request must not read live sessions or write data: ${sql}`);
  } };
  const cache = {};
  function load(name) {
    if (cache[name]) return cache[name];
    const filename = path.resolve(__dirname, `../src/modules/core/${name}.js`);
    const nativeRequire = createRequire(filename);
    const module = { exports: {} };
    const requireIsolated = id => id === '../../db/postgres' ? { pool: db, transaction: fn => fn(db) } : id === './http' ? load('http') : nativeRequire(id);
    vm.runInThisContext(`(function(require,module,exports){${fs.readFileSync(filename, 'utf8')}\n})`, { filename })(requireIsolated, module, module.exports);
    return (cache[name] = module.exports);
  }
  async function request(method, endpoint, body = {}, user = {}) {
    const route = load('commissions').router.stack.find(layer => layer.route?.path === endpoint && layer.route.methods[method]).route;
    return new Promise((resolve, reject) => route.stack[0].handle({ params: { id: comm.id }, query: {}, headers: {}, body,
      user: { active_role: 'PT', pt_profile_id: 'pt', branch_ids: ['branch'], ...user } }, { json: result => resolve(result.data) }, reject));
  }
  return { request, calls, comm };
}

for (const [label, snapshot, available] of [
  ['legacy', null, false],
  ['empty captured history', [], true],
  ['captured session', [{ id: 'booking', member_name: 'Name at payout', session_commission: 456 }], true]
]) for (const endpoint of ['/pt/my-commissions', '/commissions/:id/details']) test(`${endpoint} returns ${label} truthfully without live reads`, async () => {
  const h = harness(snapshot);
  const result = await h.request('get', endpoint);
  const summary = result.summary || result.commission;
  assert.deepEqual(Object.keys(result).sort(), [endpoint === '/pt/my-commissions' ? 'summary' : 'commission', 'sessions', 'details_snapshot_available'].sort());
  assert.equal(result.details_snapshot_available, available);
  assert.deepEqual(result.sessions, snapshot || []);
  assert.equal(summary.total_pt_sessions_taught, 7);
  assert.equal(summary.total_commission_amount, 456);
  assert(!Object.hasOwn(summary, 'details_snapshot'));
  assert(h.calls.every(c => !c.sql.includes('pt_bookings') && !c.sql.includes('pt_commission_config_history')));
});

test('Already PAID request is idempotent and cannot replace snapshot or payout metadata', async () => {
  const h = harness([{ id: 'original-booking' }]);
  const before = structuredClone(h.comm);
  const result = await h.request('put', '/commissions/:id/status', { status: 'PAID', payout_ref: 'forged', bank_name: 'New bank', bank_account_no: '123', details_snapshot: [] }, { active_role: 'QTV' });
  assert.equal(result.total_commission_amount, before.total_commission_amount);
  assert.deepEqual(h.comm, before);
  assert(h.calls.every(c => c.sql.trim().startsWith('SELECT')));
});

test('A legacy paid retry never backfills the missing historical snapshot', async () => {
  const h = harness(null);
  await h.request('put', '/commissions/:id/status', { status: 'PAID' }, { active_role: 'QTV' });
  assert.equal(h.comm.details_snapshot, null);
});

test('Snapshot details remain protected by PT ownership', async () => {
  const h = harness([{ member_name: 'Private history' }]);
  await assert.rejects(h.request('get', '/commissions/:id/details', {}, { pt_profile_id: 'other' }), e => e.status === 403);
});

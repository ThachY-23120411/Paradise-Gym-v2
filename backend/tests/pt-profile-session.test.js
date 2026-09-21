const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function harness(options = {}) {
  const calls = [];
  const profile = { id: 'pt', account_id: 'account', branch_id: 'branch', email: 'old@example.com', bio: 'Old bio', specialties: 'Strength', show_phone_to_members: false };
  const account = { id: 'account', status: 'ACTIVE', roles: ['PT'], pt_profile_id: 'pt', pt_branch_id: 'branch', session_version: 1, permissions: {}, notify_new_bookings: true, notify_result_reminders: true, is_two_factor_enabled: false, ...options.account };
  const session = { id: 'session', account_id: 'account', is_revoked: false, expires_at: '2099-01-01', ...options.session };
  const db = { query: async (sql, params = []) => {
    calls.push({ sql, params });
    let rows = [];
    if (sql.includes('SELECT a.*,m.id member_profile_id')) rows = [{ ...account }];
    else if (sql.startsWith('SELECT is_revoked, expires_at')) {
      if (options.sessionError) throw new Error('Session storage unavailable');
      rows = options.missingSession ? [] : [{ ...session }];
    } else if (sql.includes('FROM account_sessions WHERE account_id=$1')) rows = [{ ...session }];
    else if (sql.startsWith('UPDATE account_sessions SET is_revoked=TRUE')) {
      if (params[0] === 'session' || sql.includes('WHERE account_id=$1')) { session.is_revoked = true; rows = [{}]; }
    } else if (sql.startsWith('UPDATE accounts SET session_version')) account.session_version++;
    else if (sql.startsWith('UPDATE account_sessions SET last_active_at')) rows = [];
    else if (sql.startsWith('SELECT p.*,b.branch_name')) rows = [{ ...profile }];
    else if (sql.startsWith('SELECT * FROM pt_profiles')) rows = [{ ...profile }];
    else if (sql.startsWith('SELECT show_phone_to_members')) rows = [{ show_phone_to_members: profile.show_phone_to_members }];
    else if (sql.startsWith('SELECT notify_')) rows = [Object.fromEntries(sql.slice(7, sql.indexOf(' FROM')).split(',').map(key => [key, account[key]]))];
    else if (sql.startsWith('SELECT id FROM accounts')) rows = [{ id: account.id }];
    else if (sql.startsWith('UPDATE pt_profiles SET email=')) {
      Object.assign(profile, { email: params[1], bio: params[2], specialties: params[3] }); rows = [{ ...profile }];
    } else if (sql.startsWith('UPDATE pt_profiles SET show_phone_to_members')) profile.show_phone_to_members = params[1];
    else if (sql.startsWith('UPDATE accounts SET ')) {
      const fields = sql.slice('UPDATE accounts SET '.length, sql.indexOf(',updated_at')).split(',');
      fields.forEach((field, i) => { account[field.split('=')[0]] = params[i + 1]; });
    } else if (!sql.startsWith('INSERT INTO audit_logs')) throw new Error(`Unexpected query: ${sql}`);
    return { rows, rowCount: rows.length };
  } };
  const cache = {};
  const env = { JWT_SECRET: 'isolated-test-secret-not-a-real-credential', JWT_EXPIRES_IN: '5m', JWT_REFRESH_EXPIRES_IN: '1h' };
  function load(relative) {
    if (cache[relative]) return cache[relative];
    const filename = path.resolve(__dirname, '../src', relative);
    const nativeRequire = createRequire(filename);
    const module = { exports: {} };
    const requireIsolated = id => {
      if (id.endsWith('/db/postgres')) return { pool: db, transaction: fn => fn(db) };
      if (id.endsWith('/config/env')) return env;
      if (id === './http') return load('modules/core/http.js');
      if (id.endsWith('/utils/token')) return load('utils/token.js');
      return nativeRequire(id);
    };
    vm.runInThisContext(`(function(require,module,exports){${fs.readFileSync(filename, 'utf8')}\n})`, { filename })(requireIsolated, module, module.exports);
    return (cache[relative] = module.exports);
  }
  const tokens = load('utils/token.js');
  const payload = { account_id: 'account', active_role: 'PT', session_version: 1, session_id: 'session', ...options.payload };
  const access = tokens.signAccessToken(payload);
  const refresh = tokens.signRefreshToken(payload);
  async function request(moduleName, method, endpoint, body = {}, overrides = {}) {
    const req = { method: method.toUpperCase(), path: endpoint, headers: { authorization: `Bearer ${access}` }, params: { id: 'session' }, query: {}, body, user: { account_id: 'account', active_role: 'PT', pt_profile_id: 'pt', branch_ids: ['branch'] }, ...overrides };
    const route = load(`modules/core/${moduleName}.js`).router.stack.find(l => l.route?.path === endpoint && l.route.methods[method]).route;
    return new Promise((resolve, reject) => {
      let index = 0;
      const next = error => {
        if (error) return reject(error);
        const handler = route.stack[index++];
        if (!handler) return reject(new Error('Route did not respond'));
        Promise.resolve(handler.handle(req, { json: result => resolve(result.data) }, next)).catch(reject);
      };
      next();
    });
  }
  return { request, calls, profile, account, session, tokens, payload, refresh };
}

for (const [field, limit] of [['email', 150], ['specialties', 500], ['bio', 1000]]) {
  test(`PT profile accepts ${field} at ${limit} characters`, async () => {
    const h = harness();
    const value = field === 'email' ? `${'a'.repeat(limit - 6)}@x.com` : 'x'.repeat(limit);
    assert.equal((await h.request('mobile', 'put', '/mobile/profile', { [field]: value }))[field], value);
  });
  for (const value of [42, false, [], {}, 'x'.repeat(limit + 1)]) test(`PT profile rejects invalid ${field}: ${typeof value}/${String(value).length}`, async () => {
    const h = harness();
    await assert.rejects(h.request('mobile', 'put', '/mobile/profile', { [field]: value }), e => e.status === 400);
    assert.equal(h.calls.length, 0);
  });
  test(`PT profile allows null ${field} and preserves omitted fields`, async () => {
    const h = harness();
    const before = { ...h.profile };
    const result = await h.request('mobile', 'put', '/mobile/profile', { [field]: null });
    assert.equal(result[field], null);
    for (const other of ['email', 'bio', 'specialties'].filter(f => f !== field)) assert.equal(result[other], before[other]);
    assert(h.calls.some(c => c.sql.includes('UPDATE pt_profiles') && c.params[0] === 'pt'));
  });
}

for (const field of ['certificates', 'account_id', 'pt_profile_id', 'branch_id', 'phone']) test(`PT cannot update protected/removed field ${field}`, async () => {
  await assert.rejects(harness().request('mobile', 'put', '/mobile/profile', { [field]: 'other' }), e => e.status === 400);
});
test('Malformed email is rejected before profile update', async () => {
  const h = harness();
  await assert.rejects(h.request('mobile', 'put', '/mobile/profile', { email: 'bad email' }), e => e.status === 400);
  assert(!h.calls.some(c => c.sql.startsWith('UPDATE')));
});
test('Profile read is account-scoped and includes saved preferences', async () => {
  const h = harness();
  const result = await h.request('mobile', 'get', '/mobile/profile');
  assert.equal(result.certificates, undefined);
  assert.equal(result.preferences.notify_new_bookings, true);
  assert(h.calls.some(c => c.sql.includes('WHERE p.account_id=$1') && c.params[0] === 'account'));
});
test('PT preference changes persist, preserve omitted flags and are audited', async () => {
  const h = harness();
  const result = await h.request('mobile', 'put', '/mobile/preferences', { notify_new_bookings: false, show_phone_to_members: true, is_two_factor_enabled: true });
  assert.equal(result.notify_new_bookings, false);
  assert.equal(result.notify_result_reminders, true);
  assert.equal(result.show_phone_to_members, true);
  assert.equal(result.is_two_factor_enabled, true);
  assert(h.calls.some(c => c.sql.startsWith('INSERT INTO audit_logs')));
  assert.equal((await h.request('auth', 'get', '/me')).is_two_factor_enabled, true);
});
for (const body of [{}, { notify_in_app: true }, { notify_new_bookings: 'false' }, { notify_result_reminders: null }, { is_two_factor_enabled: 1 }]) test(`PT preferences reject ${JSON.stringify(body)}`, async () => {
  await assert.rejects(harness().request('mobile', 'put', '/mobile/preferences', body), e => e.status === 400);
});
test('Member cannot change PT privacy preferences', async () => {
  await assert.rejects(harness().request('mobile', 'put', '/mobile/preferences', { show_phone_to_members: true }, { user: { active_role: 'MEMBER' } }), e => e.status === 400);
});

test('Auth session read marks current device and scopes query to account', async () => {
  const h = harness();
  const list = await h.request('auth', 'get', '/sessions');
  assert.equal(list[0].is_current, true);
  assert(h.calls.some(c => c.sql.includes('WHERE account_id=$1 AND is_revoked=FALSE') && c.params[0] === 'account'));
});
for (const options of [{ session: { is_revoked: true } }, { session: { expires_at: '2020-01-01' } }, { account: { session_version: 2 } }, { account: { status: 'LOCKED' } }]) test(`Access and refresh reject invalid session ${JSON.stringify(options)}`, async () => {
  const h = harness(options);
  await assert.rejects(h.request('auth', 'get', '/me'), e => e.status === 401);
  await assert.rejects(h.request('auth', 'post', '/refresh-token', { refresh_token: h.refresh }), e => e.status === 401);
});
test('Refresh tokens and temporary 2FA tokens cannot authorize a session', async () => {
  const h = harness();
  for (const token of [h.refresh, h.tokens.signTemp2faToken(h.payload)]) await assert.rejects(h.request('auth', 'get', '/me', {}, { headers: { authorization: `Bearer ${token}` } }), e => e.status === 401);
});
test('Deleting another account session is rejected', async () => {
  const h = harness();
  await assert.rejects(h.request('auth', 'delete', '/sessions/:id', {}, { params: { id: 'other-session' } }), e => e.status === 404);
  assert(h.calls.some(c => c.sql.includes('WHERE id=$1 AND account_id=$2') && c.params[0] === 'other-session' && c.params[1] === 'account'));
});
for (const endpoint of ['/logout-current', '/logout-all']) test(`${endpoint} revokes existing access and refresh tokens`, async () => {
  const h = harness();
  await h.request('auth', 'post', endpoint);
  await assert.rejects(h.request('auth', 'get', '/me'), e => e.status === 401);
  await assert.rejects(h.request('auth', 'post', '/refresh-token', { refresh_token: h.refresh }), e => e.status === 401);
});

// These security regressions intentionally fail until the auth owner fixes them.
for (const options of [{ missingSession: true }, { sessionError: true }]) {
  test(`Access must reject an unverifiable device session ${JSON.stringify(options)}`, async () => {
    await assert.rejects(harness(options).request('auth', 'get', '/me'));
  });
  test(`Refresh must reject an unverifiable device session ${JSON.stringify(options)}`, async () => {
    const h = harness(options);
    await assert.rejects(h.request('auth', 'post', '/refresh-token', { refresh_token: h.refresh }));
  });
}

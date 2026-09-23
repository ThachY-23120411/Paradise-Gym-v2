const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Load the actual routes and access helpers with an in-memory query boundary.
// No postgres module, connection string, or shared database is loaded.
function harness(options = {}) {
  const calls = [];
  const registration = { id: 'reg', assigned_pt_id: 'pt', member_id: 'member', sold_branch_id: 'branch', package_id: 'package', status: 'ACTIVE', start_date: '2026-01-01', end_date: '2099-12-31', total_pt_sessions_snapshot: 10, remaining_pt_sessions: 8, price_snapshot: 1000, ...options.registration };
  const trainer = { id: 'pt', account_id: 'account', branch_id: 'branch', status: 'ACTIVE', work_days: 'MON_TO_FRI', work_start_time: '08:00:00', work_end_time: '18:00:00', ...options.trainer };
  const member = { id: 'member', status: 'ACTIVE', account_id: 'member-account' };
  const db = { query: async (sql, params = []) => {
    calls.push({ sql, params });
    let rows;
    if (sql.startsWith('SELECT * FROM registrations')) rows = [registration];
    else if (sql.includes('SELECT p.id, p.full_name, p.pt_code, p.branch_id')) rows = [trainer];
    else if (sql.startsWith('SELECT * FROM pt_profiles')) rows = [trainer];
    else if (sql.startsWith('SELECT * FROM member_profiles')) rows = [member];
    else if (sql.startsWith('SELECT * FROM branches')) rows = [{ id: 'branch', status: 'ACTIVE', open_time: '06:00:00', close_time: '22:00:00', ...options.branch }];
    else if (sql.includes('SELECT session_duration_minutes FROM packages')) rows = [{ session_duration_minutes: options.duration ?? 90 }];
    else if (sql.includes('FROM holidays')) rows = options.holiday ? [{}] : [];
    else if (sql.includes('FROM package_freezes')) rows = options.freeze ? [{}] : [];
    else if (sql.includes('FROM payments')) rows = options.unpaid ? [] : [{}];
    else if (sql.includes('FROM registration_allowed_branches')) rows = options.uncovered ? [] : [{}];
    else if (sql.includes('SELECT 1 FROM pt_bookings')) rows = options.overlap ? [{}] : [];
    else if (sql.includes('SELECT start_time,end_time FROM pt_bookings')) rows = options.busy || [];
    else if (sql.includes('MAX(session_number)')) rows = [{ n: 3 }];
    else if (sql.includes('FROM pt_booking_participants bp JOIN member_profiles')) rows = [];
    else if (sql.startsWith('INSERT INTO pt_bookings')) rows = [{ id: 'booking', registration_id: params[0], member_id: params[1], pt_id: params[2], branch_id: params[3], booking_date: params[4], start_time: params[5], end_time: params[6], session_duration_minutes: params[7] }];
    else if (sql.startsWith('UPDATE registrations') || sql.startsWith('INSERT INTO audit_logs')) rows = [];
    else if (sql.includes('FROM pt_commissions') || sql.includes('FROM pt_commissions c')) rows = options.commission ? [options.commission] : [];
    else if (sql.includes('FROM pt_commission_config_history')) rows = options.noRate ? [] : [{ commission_percentage: options.rate ?? 25, is_active: true }];
    else if (sql.includes('FROM pt_bookings b') && sql.includes("b.status = 'COMPLETED'")) rows = (options.sessions || [{ session_pt_value: '100.25' }, { session_pt_value: '150.75' }]).map(s => ({ ...s, session_commission: Math.round(Number(s.session_pt_value) * Number(params[3]) ) / 100 }));
    else if (sql.includes('FROM pt_assignment_requests a')) rows = [{ id: 'historical-request', status: 'ACCEPTED' }];
    else throw new Error(`Unexpected query: ${sql}`);
    return { rows, rowCount: rows.length };
  } };
  const cache = {};
  function load(name) {
    if (cache[name]) return cache[name];
    const filename = path.resolve(__dirname, '../src/modules/core', `${name}.js`);
    const nativeRequire = createRequire(filename);
    const module = { exports: {} };
    const localRequire = id => {
      if (id === '../../db/postgres') return { pool: db, transaction: fn => fn(db) };
      if (id === './notifications') return { emit: async () => {} };
      if (id === './catalog') return { trainerView: async (_req, p) => p };
      if (id === './http' || id === './commerce') return load(id.slice(2));
      return nativeRequire(id);
    };
    vm.runInThisContext(`(function(require,module,exports){${fs.readFileSync(filename, 'utf8')}\n})`, { filename })(localRequire, module, module.exports);
    cache[name] = module.exports;
    return module.exports;
  }
  async function request(moduleName, method, routePath, body = {}, user = {}, query = {}) {
    const route = load(moduleName).router.stack.find(layer => layer.route?.path === routePath && layer.route.methods[method]).route;
    return new Promise((resolve, reject) => route.stack[0].handle({ body, query, params: { id: 'commission' }, headers: {}, user: { active_role: 'PT', pt_profile_id: 'pt', account_id: 'account', member_profile_id: 'member', branch_ids: ['branch'], ...user } }, { json: result => resolve(result.data) }, reject));
  }
  return { request, calls };
}

const booking = { registration_id: 'reg', booking_date: '2099-01-05', start_time: '08:30' };
for (const [name, options, start, valid] of [
  ['PT opening boundary', {}, '08:00', true],
  ['PT closing boundary', {}, '16:30', true],
  ['before PT opens', {}, '07:59', false],
  ['after PT closes', {}, '16:31', false],
  ['branch opens later', { branch: { open_time: '09:15:00' } }, '09:14', false],
  ['branch opening boundary', { branch: { open_time: '09:15:00' } }, '09:15', true],
  ['branch closes earlier', { branch: { close_time: '16:15:00' } }, '14:46', false],
  ['branch closing boundary', { branch: { close_time: '16:15:00' } }, '14:45', true],
  ['configured hours outside old constants', { trainer: { work_start_time: '05:00', work_end_time: '23:00' }, branch: { open_time: '04:00', close_time: '23:30' } }, '05:00', true],
  ['disjoint hours', { branch: { open_time: '19:00', close_time: '23:00' } }, '19:00', false],
]) test(`Booking hours: ${name}`, async () => {
  const h = harness(options);
  const pending = h.request('bookings', 'post', '/pt-bookings', { ...booking, start_time: start });
  if (valid) assert.equal((await pending).start_time, start);
  else {
    await assert.rejects(pending, e => e.status === 400);
    assert(!h.calls.some(c => c.sql.startsWith('INSERT INTO pt_bookings')));
  }
});

test('Dynamic availability intersects branch and PT hours; every suggested slot is bookable', async () => {
  const options = { branch: { open_time: '09:15:00', close_time: '16:15:00' } };
  const result = await harness(options).request('bookings', 'get', '/pt-bookings/available-slots', {}, {}, { registration_id: 'reg', date: booking.booking_date });
  assert.equal(result.available_slots[0].start_time, '09:15');
  assert.equal(result.available_slots.at(-1).end_time, '16:15');
  for (const slot of result.available_slots) await harness(options).request('bookings', 'post', '/pt-bookings', { ...booking, start_time: slot.start_time, end_time: slot.end_time });
});

test('Legacy slots are unavailable outside the configured intersection', async () => {
  const result = await harness({ branch: { open_time: '09:00', close_time: '17:00' } }).request('bookings', 'get', '/pt-bookings/available-slots', {}, {}, { date: booking.booking_date });
  assert.equal(result.slots[0].is_available, false);
  assert.equal(result.slots.at(-1).is_available, false);
  assert.equal(result.available_slots.length, 3);
});

test('Disjoint working hours produce no dynamic slots', async () => {
  const result = await harness({ branch: { open_time: '19:00', close_time: '23:00' } }).request('bookings', 'get', '/pt-bookings/available-slots', {}, {}, { registration_id: 'reg', date: booking.booking_date });
  assert.equal(result.slots.length, 0);
});

test('Missing work hours fail explicitly on availability and creation', async () => {
  const h = harness({ trainer: { work_start_time: null } });
  await assert.rejects(h.request('bookings', 'post', '/pt-bookings', booking), e => e.status === 409);
  await assert.rejects(h.request('bookings', 'get', '/pt-bookings/available-slots', {}, {}, { date: booking.booking_date }), e => e.status === 409);
});

test('PT creates own assigned booking with package duration, derived IDs and reserved entitlement', async () => {
  const h = harness();
  const result = await h.request('bookings', 'post', '/pt-bookings', booking);
  assert.equal(result.pt_id, 'pt');
  assert.equal(result.member_id, 'member');
  assert.equal(result.end_time, '10:00');
  assert.equal(result.session_duration_minutes, 90);
  assert(h.calls.some(c => c.sql.includes('booked_pt_sessions=booked_pt_sessions+1')));
});

for (const [name, body, options, status] of [
  ['other PT', { pt_id: 'other' }, {}, 403],
  ['other assignment', {}, { registration: { assigned_pt_id: 'other' } }, 403],
  ['other branch', { branch_id: 'other' }, {}, 403],
  ['other member', { member_id: 'other' }, {}, 400],
  ['account mismatch', {}, { trainer: { account_id: 'other' } }, 403],
  ['duration tampering', { session_duration_minutes: 30 }, {}, 400],
  ['end tampering', { end_time: '09:00' }, {}, 400],
  ['invalid minute', { start_time: '08:99' }, {}, 400],
  ['trailing time text', { start_time: '08:30garbage' }, {}, 400],
  ['late end', { start_time: '21:00' }, {}, 400],
  ['past date', { booking_date: '2020-01-01' }, {}, 409],
  ['weekend', { booking_date: '2099-01-03' }, {}, 409],
  ['holiday', {}, { holiday: true }, 409],
  ['frozen date', {}, { freeze: true }, 409],
  ['unpaid', {}, { unpaid: true }, 409],
  ['no entitlement', {}, { uncovered: true }, 409],
  ['overlap', {}, { overlap: true }, 409],
  ['no sessions', {}, { registration: { remaining_pt_sessions: 0 } }, 409],
  ['expired', {}, { registration: { end_date: '2027-01-01' } }, 409],
  ['inactive PT', {}, { trainer: { status: 'INACTIVE' } }, 409],
]) test(`Booking rejects ${name} before insertion`, async () => {
  const h = harness(options);
  await assert.rejects(h.request('bookings', 'post', '/pt-bookings', { ...booking, ...body }), e => e.status === status);
  assert(!h.calls.some(c => c.sql.startsWith('INSERT INTO pt_bookings')));
});

for (const active_role of ['QTV', 'RECEPTIONIST', 'MEMBER']) test(`${active_role} retains booking creation`, async () => {
  const h = harness();
  assert.equal((await h.request('bookings', 'post', '/pt-bookings', booking, { active_role })).pt_id, 'pt');
});

test('PT cannot cancel bookings', async () => {
  const h = harness();
  await assert.rejects(h.request('bookings', 'post', '/pt-bookings/:id/cancel'), e => e.status === 403);
  assert.equal(h.calls.length, 0);
});

test('Availability uses package duration, member conflicts and holidays', async () => {
  const h = harness({ holiday: true });
  const result = await h.request('bookings', 'get', '/pt-bookings/available-slots', {}, {}, { registration_id: 'reg', date: booking.booking_date });
  assert.equal(result.session_duration_minutes, 90);
  assert.equal(result.slots[0].start_time, '08:00');
  assert.equal(result.slots[0].end_time, '09:30');
  assert.equal(result.available_slots.length, 0);
  assert(h.calls.some(c => c.sql.includes('OR member_id=$3') && c.params[2] === 'member'));
});

test('Legacy assignment writes are retired and history stays readable', async () => {
  const h = harness();
  await assert.rejects(h.request('bookings', 'post', '/pt-bookings/assignment-request', {}, { active_role: 'MEMBER' }), e => e.status === 410);
  await assert.rejects(h.request('bookings', 'post', '/pt-bookings/assignment-request/:id/respond'), e => e.status === 410);
  assert.equal(h.calls.length, 0);
  assert.equal((await h.request('bookings', 'get', '/pt-bookings/assignment-requests')).length, 1);
});

for (const status of ['PENDING', 'APPROVED']) test(`Commission ${status} summary reflects current session details`, async () => {
  const h = harness({ commission: { id: 'commission', pt_id: 'pt', status, total_commission_amount: 99999, total_pt_sessions_taught: 99 } });
  const { summary, sessions } = await h.request('commissions', 'get', '/pt/my-commissions', {}, {}, { month: '9', year: '2026' });
  assert.equal(summary.total_pt_sessions_taught, sessions.length);
  assert.equal(summary.total_commission_amount, 62.75);
  assert.equal(summary.pt_revenue_share, 251);
  assert(!h.calls.some(c => /^(UPDATE|INSERT)/.test(c.sql.trim())));
});

test('Zero commission rate is not replaced by a fallback', async () => {
  const h = harness({ rate: 0 });
  const result = await h.request('commissions', 'get', '/pt/my-commissions');
  assert.equal(result.summary.total_commission_amount, 0);
  assert(result.sessions.every(s => s.session_commission === 0));
});

test('PAID summary is preserved even when current sessions differ', async () => {
  const commission = { pt_id: 'pt', status: 'PAID', total_commission_amount: 123, total_pt_sessions_taught: 1, commission_percentage: 0 };
  const h = harness({ commission });
  const result = await h.request('commissions', 'get', '/pt/my-commissions');
  assert.deepEqual(result.summary, commission);
  assert(!h.calls.some(c => c.sql.includes('pt_commission_config_history')));
});

for (const active_role of ['MEMBER', 'PT']) for (const endpoint of ['/commissions/monthly', '/commissions/payout-history']) test(`${active_role} cannot read staff commission list ${endpoint}`, async () => {
  const h = harness();
  await assert.rejects(h.request('commissions', 'get', endpoint, {}, { active_role }), e => e.status === 403);
  assert.equal(h.calls.length, 0);
});

test('PT cannot view another trainer commission details', async () => {
  const h = harness({ commission: { pt_id: 'other' } });
  await assert.rejects(h.request('commissions', 'get', '/commissions/:id/details'), e => e.status === 403);
});

test('Invalid commission month is rejected before querying', async () => {
  const h = harness();
  await assert.rejects(h.request('commissions', 'get', '/pt/my-commissions', {}, {}, { month: '13' }), e => e.status === 400);
  assert.equal(h.calls.length, 0);
});

test('PAID commission cannot be reopened by QTV', async () => {
  const h = harness({ commission: { pt_id: 'pt', status: 'PAID' } });
  await assert.rejects(h.request('commissions', 'put', '/commissions/:id/status', { status: 'PENDING' }, { active_role: 'QTV' }), e => e.status === 409);
});

test('Paid zero-value commission is immutable during recalculation', async () => {
  const h = harness({ commission: { pt_id: 'pt', status: 'PAID', total_commission_amount: 0 } });
  const result = await h.request('commissions', 'post', '/commissions/calculate', { month: 9, year: 2026 }, { active_role: 'QTV' });
  assert.equal(result[0].total_commission_amount, 0);
  assert(!h.calls.some(c => /^(UPDATE|INSERT)/.test(c.sql.trim())));
  assert(h.calls.some(c => c.sql.includes('p.branch_id = ANY($2)') && c.params[1][0] === 'branch'));
});

test('QTV cannot calculate or update commissions outside branch scope', async () => {
  const h = harness({ trainer: { branch_id: 'other' }, commission: { pt_id: 'pt', status: 'PENDING' } });
  await assert.rejects(h.request('commissions', 'post', '/commissions/calculate', { month: 9, year: 2026, branch_id: 'other' }, { active_role: 'QTV' }), e => e.status === 403);
  await assert.rejects(h.request('commissions', 'put', '/commissions/:id/status', { status: 'APPROVED' }, { active_role: 'QTV' }), e => e.status === 403);
});

test('Own commission detail and summary use the same current rate and sessions', async () => {
  const h = harness({ commission: { pt_id: 'pt', month: 9, year: 2026, status: 'PENDING', commission_percentage: 80 } });
  const detail = await h.request('commissions', 'get', '/commissions/:id/details');
  const own = await h.request('commissions', 'get', '/pt/my-commissions', {}, {}, { month: 9, year: 2026 });
  assert.equal(detail.commission.total_commission_amount, own.summary.total_commission_amount);
  assert.equal(detail.commission.commission_percentage, 25);
});

test('Missing commission configuration returns an actionable business error', async () => {
  const h = harness({ noRate: true });
  await assert.rejects(h.request('commissions', 'get', '/pt/my-commissions'), e => e.status === 409 && e.code === 'BRANCH_DEFAULT_COMMISSION_NOT_CONFIGURED');
});

test('Scheduled registration can book on its future effective date', async () => {
  const h = harness({ registration: { status: 'SCHEDULED', start_date: booking.booking_date } });
  assert.equal((await h.request('bookings', 'post', '/pt-bookings', booking)).booking_date, booking.booking_date);
});

test('PT must have a profile even if a PT ID is supplied', async () => {
  const h = harness();
  await assert.rejects(h.request('bookings', 'post', '/pt-bookings', { ...booking, pt_id: 'pt' }, { pt_profile_id: null }), e => e.status === 403);
  assert.equal(h.calls.length, 0);
});

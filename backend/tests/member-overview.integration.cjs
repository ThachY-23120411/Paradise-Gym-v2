const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { setup } = require('./helpers/revenue-fixture.cjs');

(async () => {
  const f = await setup();
  let checks = 0;
  const check = (label, work) => { work(); checks++; console.log(`PASS ${label}`); };
  const endpoint = `/members/${f.member}/overview-data`;
  const get = async (token, branch = f.branches[0], expected = 200, url = endpoint) => {
    const result = await f.request(url, token, null, branch, expected);
    checks++; return result;
  };
  const manifest = f.migrations;
  try {
    const [a, b] = f.branches;
    await f.db.query("UPDATE branches SET timezone='Asia/Bangkok' WHERE id=$1", [a]);
    await f.db.query("UPDATE branches SET timezone='America/Los_Angeles' WHERE id=$1", [b]);
    const A = f.sessions.qtv.access_token;
    const leader = randomUUID(), other = randomUUID(), pt = randomUUID();
    for (const [id, code, name, phone, branch] of [
      [leader, 'HV-OV-L', 'Actual Inviter', '0909211891', a],
      [other, 'HV-OV-O', 'Actual Recipient', '0909211892', b]
    ]) await f.db.query('INSERT INTO member_profiles(id,home_branch_id,member_code,full_name,phone) VALUES($1,$2,$3,$4,$5)', [id, branch, code, name, phone]);
    await f.db.query("INSERT INTO pt_profiles(id,branch_id,pt_code,full_name,phone) VALUES($1,$2,'PT-OV','Overview Trainer','0909211893')", [pt, a]);
    const pkg = (await f.db.query('SELECT package_id FROM registrations WHERE id=$1', [f.payments[0].reg])).rows[0].package_id;
    let sequence = 0;
    async function registration(owner, branch, status = 'ACTIVE') {
      const id = randomUUID(); sequence++;
      await f.db.query(`INSERT INTO registrations(id,reg_code,member_id,package_id,sold_branch_id,assigned_pt_id,
        package_name_snapshot,package_type_snapshot,price_snapshot,total_pt_sessions_snapshot,remaining_pt_sessions,
        start_date,end_date,status,package_mode,group_leader_member_id,max_group_members_snapshot)
        VALUES($1,$2,$3,$4,$5,$6,'Overview Group','PT_SESSION',100,10,3,CURRENT_DATE-1,CURRENT_DATE+2,$7,'GROUP_1_N',$3,5)`,
      [id, `DK-OV-${sequence}`, owner, pkg, branch, pt, status]);
      for (const branchId of [a, b]) await f.db.query('INSERT INTO registration_allowed_branches VALUES($1,$2)', [id, branchId]);
      return id;
    }
    const accepted = await registration(leader, a), pending = await registration(leader, a);
    const rejected = await registration(leader, a), outside = await registration(leader, b);
    const own = await registration(f.member, a, 'SCHEDULED');
    for (const [reg, status] of [[accepted, 'ACCEPTED'], [pending, 'PENDING'], [rejected, 'REJECTED'], [outside, 'ACCEPTED']]) {
      await f.db.query('INSERT INTO group_pt_members(registration_id,member_id,inviter_member_id,invitation_status) VALUES($1,$2,$3,$4)', [reg, f.member, leader, status]);
    }
    await f.db.query("INSERT INTO group_pt_members(registration_id,member_id,inviter_member_id,invitation_status) VALUES($1,$2,$3,'PENDING')", [own, other, f.member]);
    await f.db.query(`INSERT INTO payments(registration_id,member_id,branch_id,payment_code,payment_method,amount,confirmed_at)
      VALUES($1,$2,$3,'PAY-OV','CASH',100,NOW())`, [accepted, leader, a]);
    await f.db.query(`INSERT INTO payment_intents(registration_id,member_id,branch_id,payment_code,payment_method,amount,state)
      VALUES($1,$2,$3,'INTENT-OV','CASH',100,'PENDING')`, [own, f.member, a]);
    let slot = 8;
    async function booking(reg, owner, branch, snapshot) {
      const id = randomUUID(), start = `${slot++}:00`, end = `${slot}:00`;
      await f.db.query('BEGIN');
      try {
        await f.db.query(`INSERT INTO pt_bookings(id,registration_id,member_id,pt_id,branch_id,booking_date,start_time,end_time,participants_snapshot_xid)
          VALUES($1,$2,$3,$4,$5,CURRENT_DATE,$6,$7,CASE WHEN $8 THEN txid_current() ELSE NULL END)`, [id, reg, owner, pt, branch, start, end, snapshot]);
        if (snapshot) await f.db.query('INSERT INTO pt_booking_participants(booking_id,member_id) VALUES($1,$2)', [id, f.member]);
        await f.db.query('COMMIT');
      } catch (error) { await f.db.query('ROLLBACK'); throw error; }
      return id;
    }
    const participated = await booking(accepted, leader, a, true);
    const legacy = await booking(accepted, leader, a, false);
    const cross = await booking(accepted, leader, b, true);
    const ownedBooking = await booking(own, f.member, a, false);
    for (const branchId of [a, b]) {
      const cls = randomUUID();
      await f.db.query("INSERT INTO community_classes(id,branch_id,title,instructor_name,class_date,start_time,end_time) VALUES($1,$2,'Overview Class','Overview Trainer',CURRENT_DATE,'18:00','19:00')", [cls, branchId]);
      await f.db.query('UPDATE community_classes SET discipline_id=(SELECT id FROM class_disciplines WHERE name=$1) WHERE id=$2', ['Yoga', cls]);
      await f.db.query('INSERT INTO community_class_registrations(class_id,member_id) VALUES($1,$2)', [cls, f.member]);
    }
    const tables = ['registrations', 'payments', 'payment_intents', 'group_pt_members', 'pt_bookings', 'pt_booking_participants', 'community_classes', 'community_class_registrations', 'package_freezes', 'member_profiles', 'audit_logs'];
    async function snapshot() {
      const result = {};
      for (const table of tables) result[table] = (await f.db.query(`SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) rows FROM ${table} t`)).rows[0].rows;
      return result;
    }
    const before = await snapshot();
    await get(null, a, 401);
    for (const key of ['lt', 'member']) await get(f.sessions[key].access_token, a, 403);
    await get(A, a, 400, '/members/not-a-uuid/overview-data');
    await get(A, 'invalid-branch', 400);
    await get(A, a, 400, endpoint + '?branch_id[]=invalid');
    await get(A, a, 403, endpoint + '?branch_id=' + b);
    await get(A, a, 404, `/members/${randomUUID()}/overview-data`);
    await get(A, b, 403);
    await get(f.sessions.qtvB.access_token, b, 403);
    const scoped = await get(A);
    check('profile whitelist and intended subject', () => {
      assert.equal(scoped.profile.id, f.member);
      assert.deepEqual(Object.keys(scoped.profile).sort(), ['id','member_code','full_name','phone','email','date_of_birth','gender','avatar_url','status','home_branch_id','home_branch_name','branch_timezone','created_at'].sort());
      assert.equal(scoped.profile.branch_timezone, 'Asia/Bangkok');
    });
    check('owned plus accepted only, once, sold-branch scoped', () => {
      const ids = scoped.registrations.map(r => r.id);
      assert(ids.includes(accepted)); assert(ids.includes(own));
      for (const id of [pending, rejected, outside]) assert(!ids.includes(id));
      assert.equal(ids.length, new Set(ids).size);
      assert(scoped.registrations.every(r => r.sold_branch_id === a));
    });
    check('canonical expiry and confirmed payment only', () => {
      const r = scoped.registrations.find(r => r.id === accepted);
      assert.equal(r.status, 'ACTIVE'); assert.equal(r.display_status, 'EXPIRING'); assert.equal(r.is_paid, true);
      assert.equal(r.is_group_member, true); assert.equal(r.assigned_pt_name, 'Overview Trainer');
      assert.equal(r.allowed_branches.length, 2);
      const unpaid = scoped.registrations.find(r => r.id === own);
      assert.equal(unpaid.status, 'ACTIVE'); assert.equal(unpaid.is_paid, false); assert.equal(unpaid.is_expiring, false);
    });
    check('received and sent real identities without mutation', () => {
      assert.equal(scoped.group_invitations.received.length, 3);
      assert(scoped.group_invitations.received.every(i => i.inviter_name === 'Actual Inviter' && i.recipient_name === 'Handover Member'));
      assert.equal(scoped.group_invitations.sent[0].recipient_name, 'Actual Recipient');
    });
    check('persisted participants only and booking branch scope', () => {
      assert.deepEqual(new Set(scoped.bookings.map(r => r.id)), new Set([participated, ownedBooking]));
      assert(!scoped.bookings.some(r => r.id === legacy || r.id === cross));
      assert.equal(scoped.booking_participants_available, true);
    });
    check('community class branch scope', () => {
      assert.equal(scoped.community_registrations.length, 1); assert.equal(scoped.community_registrations[0].branch_id, a);
      assert.equal(scoped.community_registrations[0].discipline_name, 'Yoga');
    });
    const all = await get(A, 'ALL');
    check('global authorized scope includes branch B', () => {
      assert(all.registrations.some(r => r.id === outside)); assert(all.bookings.some(r => r.id === cross));
      assert.equal(all.community_registrations.length, 2);
    });
    check('timezone follows actual home, booking and class branch', () => {
      for (const row of [...all.bookings, ...all.community_registrations]) {
        assert.equal(row.branch_timezone, row.branch_id === a ? 'Asia/Bangkok' : 'America/Los_Angeles');
      }
    });
    const limited = await get(f.sessions.limited.access_token);
    check('financial redaction across complete response', () => {
      assert(!/price|amount|token|password|biometric|account_id/i.test(JSON.stringify(limited)));
      assert(scoped.registrations.every(r => Object.hasOwn(r, 'price_snapshot')));
    });
    const after = await snapshot();
    check('projection GETs leave all business data unchanged', () => assert.deepEqual(after, before));

    // Direct handler checks isolate its authorization/query ordering from shared auth heartbeat.
    const { overviewData } = require('../src/modules/core/memberOverview');
    const { context } = require('../src/modules/core/auth');
    const { pool } = require('../src/db/postgres');
    const user = await context(f.accounts.qtv.id, 'QTV');
    const req = { user, params: { id: f.member }, headers: { 'x-branch-id': b }, query: {} };
    const connect = pool.connect.bind(pool), statements = [];
    pool.connect = async () => {
      const client = await connect();
      return { query: async (sql, values) => { statements.push(sql); return client.query(sql, values); }, release: () => client.release() };
    };
    try {
      await assert.rejects(overviewData(req), error => error.status === 403);
      check('authorization precedes profile and child queries', () => {
        assert.equal(statements.filter(s => /^SELECT/.test(s)).length, 1);
        assert(statements[0].includes('READ ONLY'));
      });
      statements.length = 0;
      await assert.rejects(overviewData({ ...req, user: { ...user, active_role: 'PT' } }), error => error.status === 403);
      check('PT rejected before any query', () => assert.equal(statements.length, 0));
    } finally { pool.connect = connect; }

    await f.db.query('ALTER TABLE pt_booking_participants RENAME TO overview_test_participants');
    try {
      const missing = await get(A);
      check('missing participant table declares owner-only limitation', () => {
        assert.equal(missing.booking_participants_available, false);
        assert.deepEqual(missing.bookings.map(r => r.id), [ownedBooking]);
      });
    } finally { await f.db.query('ALTER TABLE overview_test_participants RENAME TO pt_booking_participants'); }
    await f.db.query('ALTER TABLE community_class_registrations RENAME TO overview_test_classes');
    try { await get(A, a, 500); } finally { await f.db.query('ALTER TABLE overview_test_classes RENAME TO community_class_registrations'); }
    const recovered = await get(A);
    check('query failure is an error, recovery succeeds', () => assert.equal(recovered.profile.id, f.member));
    const source = fs.readFileSync(path.join(__dirname, '../src/modules/core/memberOverview.js'));
    console.log(JSON.stringify({ checks, database: f.name, source_sha256: createHash('sha256').update(source).digest('hex'), migrations: manifest, limitation: 'No business data writes. Standard auth session heartbeat is permitted. No UI E2E claim.' }, null, 2));
  } finally { await f.close(); console.log('Isolated database removed; test server and connections closed.'); }
})().catch(error => { console.error(error); process.exitCode = 1; });

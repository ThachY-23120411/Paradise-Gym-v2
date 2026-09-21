const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Only CREATE/DROP DATABASE touches the configured connection. All fixtures and
// API writes use a unique disposable database, never the application database.
assert(process.env.DATABASE_URL, 'Explicit DATABASE_URL required');
const sourceUrl = process.env.DATABASE_URL;
const dbName = `paradise_group_test_${process.pid}_${Date.now()}`;
const admin = new Client({ connectionString: sourceUrl });
let created = false, db, pool, server, base, checks = 0, scenarios = 0;
const password = 'Group-Test-Password9';
const day = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10);
const shift = n => new Date(Date.parse(day) + n * 86400000).toISOString().slice(0, 10);
async function request(url, token, body, status = 200) {
  const response = await fetch(base + url, { method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json();
  assert.equal(response.status, status, `${url}: ${JSON.stringify(result)}`); checks++;
  return result.data ?? result;
}
function passed(label) { scenarios++; console.log(`PASS ${label}`); }
async function main() {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${dbName}"`); created = true;
  const target = new URL(sourceUrl); target.pathname = `/${dbName}`;
  process.env.DATABASE_URL = target.toString(); process.env.NODE_ENV = 'test';
  process.env.AUTH_OTP_MODE = 'development';
  db = new Client({ connectionString: target.toString() }); await db.connect();
  const dir = path.join(__dirname, '../src/db/migrations');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) await db.query(fs.readFileSync(path.join(dir, file), 'utf8'));
  for (const role of ['QTV', 'RECEPTIONIST', 'PT', 'MEMBER']) await db.query('INSERT INTO roles(role_code,role_name) VALUES($1,$1)', [role]);
  const b1 = randomUUID(), b2 = randomUUID();
  for (const id of [b1, b2]) await db.query("INSERT INTO branches(id,branch_code,branch_name,phone,address,open_time,close_time) VALUES($1,$2,$2,'0909999999','Test','00:00','23:59')", [id, id.slice(0, 8)]);
  let serial = 0;
  async function account(role, branchId = b1) {
    const id = randomUUID(), phone = `0918${String(++serial).padStart(6, '0')}`;
    await db.query("INSERT INTO accounts(id,login_phone,password_hash,status) VALUES($1,$2,$3,'ACTIVE')", [id, phone, await bcrypt.hash(password, 4)]);
    await db.query('INSERT INTO account_roles(account_id,role_id) SELECT $1,id FROM roles WHERE role_code=$2', [id, role]);
    await db.query('INSERT INTO account_branch_scopes(account_id,branch_id,is_all_branches) VALUES($1,$2,false)', [id, branchId]);
    return { id, phone };
  }
  const staff = await account('QTV'), otherStaff = await account('RECEPTIONIST', b2);
  const app = require('../src/server'); pool = require('../src/db/postgres').pool;
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
  async function login(a) { return (await request('/auth/login-password', null, { login_phone: a.phone, password })).access_token; }
  const A = await login(staff), O = await login(otherStaff);
  async function person(role) {
    const a = await account(role), id = randomUUID();
    if (role === 'MEMBER') await db.query('INSERT INTO member_profiles(id,account_id,home_branch_id,member_code,full_name,phone) VALUES($1,$2,$3,$4,$4,$5)', [id, a.id, b1, `M${serial}`, a.phone]);
    else await db.query("INSERT INTO pt_profiles(id,account_id,branch_id,pt_code,full_name,phone,work_days) VALUES($1,$2,$3,$4,$4,$5,'EVERY_DAY')", [id, a.id, b1, `PT${serial}`, a.phone]);
    return { id, accountId: a.id, token: await login(a) };
  }
  const leader = await person('MEMBER'), member = await person('MEMBER'), pending = await person('MEMBER'), outsider = await person('MEMBER');
  const pt = await person('PT'), otherPt = await person('PT');
  const gym = await request('/packages', A, { package_name: 'Group test Gym', package_type: 'GYM_SESSION', price: 1000, duration_days: 365, total_gym_sessions: 20, branch_ids: [b1] });
  const group = await request('/packages', A, { package_name: 'Group test PT', package_type: 'PT_SESSION', package_mode: 'GROUP_1_N', max_group_members: 5, price: 1000, duration_days: 365, total_pt_sessions: 20, session_duration_minutes: 60, branch_ids: [b1] });
  async function registration(who, pkg, trainer) {
    const r = await request('/registrations', A, { member_id: who.id, package_id: pkg.id, start_date: new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10), sold_branch_id: b1 });
    const invoice = await request('/payments/create-invoice', A, { registration_id: r.id, payment_method: 'CASH' });
    await request(`/payments/${invoice.payment.id}/confirm`, A, {});
    if (trainer) await db.query('UPDATE registrations SET assigned_pt_id=$2 WHERE id=$1', [r.id, trainer.id]);
    return r;
  }
  const gyms = [];
  for (const who of [leader, member, pending, outsider]) gyms.push(await registration(who, gym));
  const reg = await registration(leader, group, pt);
  const single = await request('/packages', A, { package_name: 'Individual PT', package_type: 'PT_SESSION', price: 1000, duration_days: 365, total_pt_sessions: 20, session_duration_minutes: 60, branch_ids: [b1] });
  const individual = await registration(member, single, otherPt);
  async function invite(r, who, status) { await db.query('INSERT INTO group_pt_members(registration_id,member_id,inviter_member_id,invitation_status) VALUES($1,$2,$3,$4)', [r.id, who.id, leader.id, status]); }
  await invite(reg, member, 'ACCEPTED'); await invite(reg, pending, 'PENDING');
  const body = { registration_id: reg.id, booking_date: day, start_time: '09:00' };
  const counters = async () => (await db.query('SELECT remaining_pt_sessions,booked_pt_sessions,used_pt_sessions FROM registrations WHERE id=$1', [reg.id])).rows[0];
  const initial = await counters();
  async function rejectBoth(reason, who=member) {
    const rejected=await request('/pt-bookings', pt.token, body, 409);
    const unavailable=await request(`/pt-bookings/available-slots?pt_id=${pt.id}&registration_id=${reg.id}&date=${day}`, pt.token, undefined, 409);
    if(reason){
      const profile=(await db.query('SELECT full_name,member_code FROM member_profiles WHERE id=$1',[who.id])).rows[0];
      for(const result of [rejected,unavailable]){
        assert.equal(result.code,'GROUP_GYM_REQUIRED');
        assert(result.message.includes(`${profile.full_name} (${profile.member_code})`));
        assert.match(result.message,reason);
      }
    }
    assert.deepEqual(await counters(), initial);
    assert.equal((await db.query('SELECT count(*)::int n FROM pt_bookings')).rows[0].n, 0);
  }
  await db.query('UPDATE registrations SET group_leader_member_id=$2 WHERE id=$1',[reg.id,member.id]);
  for(const result of [await request('/pt-bookings',pt.token,body,409),await request('/pt-bookings',leader.token,body,409),await request(`/pt-bookings/available-slots?pt_id=${pt.id}&registration_id=${reg.id}&date=${day}`,pt.token,undefined,409)]){
    assert.equal(result.code,'GROUP_LEADER_MISMATCH');assert.match(result.message,/Trưởng nhóm không khớp/);
  }
  assert.deepEqual(await counters(),initial);
  assert.equal((await db.query('SELECT count(*)::int n FROM pt_bookings')).rows[0].n,0);
  await db.query('UPDATE registrations SET group_leader_member_id=$2 WHERE id=$1',[reg.id,leader.id]);
  passed('legacy transfer owner/leader mismatch rejects creation and availability with clear 409');
  await db.query("UPDATE member_profiles SET status='INACTIVE' WHERE id=$1", [leader.id]); await rejectBoth(/hội viên không hoạt động/,leader);
  await db.query("UPDATE member_profiles SET status='ACTIVE' WHERE id=$1", [leader.id]);
  await db.query("UPDATE member_profiles SET status='INACTIVE' WHERE id=$1", [member.id]); await rejectBoth(/hội viên không hoạt động/);
  await db.query("UPDATE member_profiles SET status='ACTIVE' WHERE id=$1", [member.id]);
  passed('inactive accepted member rejects the whole group atomically');
  for (const [column, bad, good, reason] of [['start_date', shift(1), shift(-10),/chưa đến ngày hiệu lực/], ['end_date', shift(-1), shift(300),/đã hết hạn/], ['remaining_gym_sessions', 0, 20,/đã hết lượt/], ['status', 'CANCELLED', 'ACTIVE',/trạng thái gói Gym không hợp lệ/], ['package_type_snapshot','PT_SESSION','GYM_SESSION',/chưa có hợp đồng Gym/]]) {
    await db.query(`UPDATE registrations SET ${column}=$2 WHERE id=$1`, [gyms[1].id, bad]); await rejectBoth(reason);
    await db.query(`UPDATE registrations SET ${column}=$2 WHERE id=$1`, [gyms[1].id, good]);
  }
  passed('every participant needs a valid-date Gym contract with sessions');
  await db.query('DELETE FROM registration_allowed_branches WHERE registration_id=$1', [gyms[1].id]); await rejectBoth(/không áp dụng tại chi nhánh tập/);
  await db.query('INSERT INTO registration_allowed_branches VALUES($1,$2)', [gyms[1].id, b1]);
  passed('participant Gym branch coverage is required');
  async function freeze(r, start, end) {
    return (await db.query("INSERT INTO package_freezes(registration_id,start_date,end_date,freeze_days,reason,approved_by_account_id,status) VALUES($1,$2,$3,2,'test',$4,'SCHEDULED') RETURNING id", [r.id, start, end, staff.id])).rows[0].id;
  }
  const f = await freeze(gyms[1], day, shift(1)); await rejectBoth(/bị đóng băng vào ngày tập/);
  await db.query('UPDATE package_freezes SET start_date=$2,end_date=$3 WHERE id=$1', [f, shift(1), shift(2)]);
  await db.query("UPDATE registrations SET status='ACTIVE' WHERE id=ANY($1::uuid[])", [[reg.id, gyms[1].id]]);
  await freeze(reg, shift(1), shift(2));
  const gf = await freeze(reg, day, day); await request('/pt-bookings', pt.token, body, 409);
  await db.query("UPDATE package_freezes SET status='CANCELLED' WHERE id=$1", [gf]);
  passed('Gym and group freeze ranges block only covered dates');
  await request('/pt-bookings', member.token, body, 403);
  await request('/pt-bookings', otherPt.token, body, 403);
  await request('/pt-bookings', pt.token, { ...body, participant_ids: [leader.id] }, 400);
  await request('/pt-bookings', pt.token, { ...body, branch_id: b2 }, 403);
  const booking = await request('/pt-bookings', pt.token, body);
  assert.deepEqual(booking.participants.map(p => p.member_id).sort(), [leader.id, member.id].sort());
  assert.equal(booking.participants.find(p => p.is_leader).member_id, leader.id);
  assert.equal(booking.participant_source, 'SNAPSHOT'); assert(!('participants_snapshot_xid' in booking));
  assert.deepEqual(await counters(), { remaining_pt_sessions: initial.remaining_pt_sessions - 1, booked_pt_sessions: 1, used_pt_sessions: 0 });
  passed('full accepted group snapshot, scheduled-freeze eligibility, one reservation and own scope');
  assert.equal((await db.query('SELECT count(*)::int n FROM notifications WHERE reference_id=$1', [booking.id])).rows[0].n, 0);
  async function configure(event) {
    const template = await request('/notifications/templates', A, { branch_id: b1, template_name: event, event_code: event, title_template: 'Group {{member_name}}', body_template: '{{booking_date}} {{time_slot}}' });
    await db.query("INSERT INTO notification_rules(branch_id,event_type,template_id,recipient_roles,modes,is_enabled,updated_by) VALUES($1,$2,$3,ARRAY['MEMBER','PT'],ARRAY['DIRECT'],true,$4)", [b1, event, template.id, staff.id]);
    return template;
  }
  for (const event of ['BOOKING_CREATED', 'BOOKING_CANCELLED', 'PT_SESSION_CONFIRMED']) await configure(event);
  const detail = await request(`/pt-bookings/${booking.id}`, member.token);
  assert.equal(detail.package_name, group.package_name); assert.equal(detail.package_name_snapshot, group.package_name);
  assert.equal((await request('/pt-bookings', member.token)).length, 1);
  await request(`/pt-bookings/${booking.id}`, pending.token, undefined, 404);
  await request(`/pt-bookings/${booking.id}`, O, undefined, 404);
  await request(`/pt-bookings/${booking.id}/cancel`, member.token, { reason: 'forbidden' }, 403);
  await request(`/pt-bookings/${booking.id}/member-confirm`, member.token, {}, 403);
  await request(`/pt-bookings/${booking.id}/cancel`, pt.token, {}, 403);
  passed('participant read-only scope, LT package alias and branch isolation');
  await db.query("UPDATE group_pt_members SET invitation_status='ACCEPTED' WHERE registration_id=$1 AND member_id=$2", [reg.id, pending.id]);
  await db.query('DELETE FROM group_pt_members WHERE registration_id=$1 AND member_id=$2', [reg.id, member.id]);
  assert.deepEqual((await request(`/pt-bookings/${booking.id}`, member.token)).participants, detail.participants);
  await request(`/pt-bookings/${booking.id}`, pending.token, undefined, 404);
  for (const [sql, args] of [
    ['UPDATE pt_booking_participants SET is_leader=false WHERE booking_id=$1', [booking.id]],
    ['DELETE FROM pt_booking_participants WHERE booking_id=$1', [booking.id]],
    ['INSERT INTO pt_booking_participants(booking_id,member_id) VALUES($1,$2)', [booking.id, pending.id]],
    ['UPDATE pt_bookings SET participants_snapshot_xid=NULL WHERE id=$1', [booking.id]],
    ['UPDATE pt_bookings SET member_id=$2 WHERE id=$1', [booking.id, pending.id]],
    ['UPDATE pt_bookings SET registration_id=$2 WHERE id=$1', [booking.id, gyms[0].id]]
  ]) await assert.rejects(db.query(sql, args), e => e.code === '23514');
  passed('membership changes never alter history; SQL rejects snapshot edits and late insertion');
  const individualBody = { ...body, registration_id: individual.id, start_time: '09:30' };
  await request('/pt-bookings', otherPt.token, individualBody, 409);
  const slots = await request(`/pt-bookings/available-slots?pt_id=${otherPt.id}&registration_id=${individual.id}&date=${day}`, otherPt.token);
  assert.equal(slots.slots.find(s => s.start_time === '09:30').is_available, false);
  const adjacent = await request('/pt-bookings', otherPt.token, { ...individualBody, start_time: '10:00' });
  assert.equal(adjacent.participant_source, 'LEGACY_OWNER_ONLY');
  await invite(reg, member, 'ACCEPTED');
  await request('/pt-bookings', pt.token, { ...body, start_time: '10:30' }, 409);
  const groupSlots = await request(`/pt-bookings/available-slots?pt_id=${pt.id}&registration_id=${reg.id}&date=${day}`, pt.token);
  assert.equal(groupSlots.slots.find(s => s.start_time === '10:30').is_available, false);
  passed('snapshot conflicts in both directions and adjacent intervals allowed');
  const race = await Promise.all([
    fetch(base + '/pt-bookings', { method: 'POST', headers: { Authorization: `Bearer ${pt.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, start_time: '12:00' }) }),
    fetch(base + '/pt-bookings', { method: 'POST', headers: { Authorization: `Bearer ${otherPt.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...individualBody, start_time: '12:30' }) })
  ]);
  assert.deepEqual(race.map(r => r.status).sort(), [200, 409]); checks += 2;
  for (const r of race) await r.json();
  passed('concurrent group versus individual overlap commits exactly one booking');
  const cancelBefore = await counters();
  const cancelled = await request(`/pt-bookings/${booking.id}/cancel`, leader.token, { reason: 'Group reschedule' });
  assert.equal(cancelled.refunded, true); assert(!('participants_snapshot_xid' in cancelled.booking));
  assert.equal((await counters()).remaining_pt_sessions, cancelBefore.remaining_pt_sessions + 1);
  assert.equal((await request(`/pt-bookings/${booking.id}`, member.token)).participants.length, 2);
  const cancelledRecipients = (await db.query("SELECT account_id FROM notifications WHERE reference_id=$1 AND event_type='BOOKING_CANCELLED'", [booking.id])).rows.map(n => n.account_id).sort();
  assert.deepEqual(cancelledRecipients, [leader.accountId, member.accountId, pt.accountId].sort());
  passed('leader cancellation refunds one session and preserves snapshot');
  const completion = await request('/pt-bookings', pt.token, { ...body, start_time: '15:00' });
  const creationRecipients = (await db.query("SELECT account_id FROM notifications WHERE reference_id=$1 AND event_type='BOOKING_CREATED'", [completion.id])).rows.map(n => n.account_id).sort();
  assert.deepEqual(creationRecipients, [leader.accountId, member.accountId, pending.accountId, pt.accountId].sort());
  passed('unconfigured events suppressed; configured events use immutable participants and PT');
  await db.query('UPDATE pt_bookings SET booking_date=$2 WHERE id=$1', [completion.id, shift(-10)]);
  await request(`/pt-bookings/${completion.id}/pt-confirm`, pt.token, { workout_notes: 'Original note', fitness_assessment: 'Original assessment' });
  await request(`/pt-bookings/${completion.id}/member-confirm`, member.token, {}, 403);
  const completed = await request(`/pt-bookings/${completion.id}/member-confirm`, leader.token, {});
  assert.equal(completed.is_completed, true);
  const beforeRepeat = await counters();
  const stored = (await db.query('SELECT * FROM pt_bookings WHERE id=$1', [completion.id])).rows[0];
  const repeated = await request(`/pt-bookings/${completion.id}/pt-confirm`, pt.token, { workout_notes: 'Must not change', fitness_assessment: 'Must not change' });
  assert.deepEqual(repeated, completed);
  assert.deepEqual(await request(`/pt-bookings/${completion.id}/member-confirm`, leader.token, {}), completed);
  assert.deepEqual(await counters(), beforeRepeat);
  assert.deepEqual((await db.query('SELECT * FROM pt_bookings WHERE id=$1', [completion.id])).rows[0], stored);
  assert.equal(beforeRepeat.used_pt_sessions, 1);
  passed('dual completion counts once; repeated 200 returns current state without editing notes or counters');
  const legacy = (await db.query("INSERT INTO pt_bookings(registration_id,member_id,pt_id,branch_id,booking_date,start_time,end_time) VALUES($1,$2,$3,$4,$5,'08:00','09:00') RETURNING id", [reg.id, leader.id, pt.id, b1, shift(3)])).rows[0];
  const legacyRead = await request(`/pt-bookings/${legacy.id}`, leader.token);
  assert.equal(legacyRead.participant_source, 'LEGACY_OWNER_ONLY');
  assert.deepEqual(legacyRead.participants.map(p => p.member_id), [leader.id]);
  await request(`/pt-bookings/${legacy.id}`, member.token, undefined, 404);
  await assert.rejects(db.query('INSERT INTO pt_booking_participants(booking_id,member_id) VALUES($1,$2)', [legacy.id, member.id]), e => e.code === '23514');
  passed('legacy group bookings stay owner-only with no fabricated historical membership');
  const last = await registration(leader, group, pt);
  await invite(last, member, 'ACCEPTED');
  await db.query('UPDATE registrations SET total_pt_sessions_snapshot=1,remaining_pt_sessions=1 WHERE id=$1', [last.id]);
  const lastRace = await Promise.all(['10:00', '12:00'].map(start_time => fetch(base + '/pt-bookings', {
    method: 'POST', headers: { Authorization: `Bearer ${pt.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ registration_id: last.id, booking_date: shift(3), start_time })
  })));
  assert.deepEqual(lastRace.map(r => r.status).sort(), [200, 409]); checks += 2;
  for (const result of lastRace) await result.json();
  assert.deepEqual((await db.query('SELECT remaining_pt_sessions,booked_pt_sessions,used_pt_sessions FROM registrations WHERE id=$1', [last.id])).rows[0], { remaining_pt_sessions: 0, booked_pt_sessions: 1, used_pt_sessions: 0 });
  assert.equal((await db.query('SELECT count(*)::int n FROM pt_bookings WHERE registration_id=$1', [last.id])).rows[0].n, 1);
  passed('two nonoverlapping concurrent requests cannot reserve the last contract session twice');
  await db.query(fs.readFileSync(path.join(dir, '013_pt_booking_participants.sql'), 'utf8'));
  assert.deepEqual((await request(`/pt-bookings/${booking.id}`, member.token)).participants, detail.participants);
  passed('migration 013 reruns without backfilling or changing historical participants');
  console.log(`PASS ${scenarios} group scenarios; ${checks} HTTP checks against isolated PostgreSQL; shared database untouched`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (pool) await pool.end(); if (db) await db.end();
  if (created && /^paradise_group_test_\d+_\d+$/.test(dbName)) await admin.query(`DROP DATABASE "${dbName}"`);
  await admin.end();
});

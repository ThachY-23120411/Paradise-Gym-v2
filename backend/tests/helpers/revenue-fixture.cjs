const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const root = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
async function setup() {
  const original = process.env.DATABASE_URL;
  assert(original, 'Explicit configured DATABASE_URL required for isolated DB creation');
  const name = `paradise_handover_test_${process.pid}_${Date.now()}`;
  assert(/^paradise_handover_test_\d+_\d+$/.test(name));
  const admin = new Client({ connectionString: original });
  let db, server, pool, created = false;
  const migrations = [], password = 'Handover-Test9!';
  async function close() {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (pool) await pool.end();
    if (db) await db.end();
    if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await admin.end();
  }
  try {
    await admin.connect(); await admin.query(`CREATE DATABASE "${name}"`); created = true;
    const isolated = new URL(original); isolated.pathname = '/' + name;
    process.env.DATABASE_URL = isolated.toString(); process.env.NODE_ENV = 'test';
    db = new Client({ connectionString: isolated.toString() }); await db.connect();
    const dir = path.join(root, 'src/db/migrations');
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await db.query(sql); migrations.push({ file, sha256: createHash('sha256').update(sql).digest('hex') });
    }
    for (const role of ['QTV', 'RECEPTIONIST', 'MEMBER']) await db.query('INSERT INTO roles(role_code,role_name) VALUES($1,$1)', [role]);
    const branches = [randomUUID(), randomUUID()];
    for (const [i, id] of branches.entries()) await db.query("INSERT INTO branches(id,branch_code,branch_name,address,phone,open_time,close_time) VALUES($1,$2,$3,'Test address','0909999999','00:00','23:59')", [id, `BG${i}`, `Handover Branch ${i ? 'B' : 'A'}`]);
    const accounts = {};
    for (const [key, role, phone, b, all, financial] of [
      ['qtv', 'QTV', '0909211801', branches[0], true, true],
      ['qtvB', 'QTV', '0909211802', branches[1], false, true],
      ['lt', 'RECEPTIONIST', '0909211803', branches[0], false, true],
      ['limited', 'QTV', '0909211804', branches[0], false, false],
      ['member', 'MEMBER', '0909211805', branches[0], false, false]
    ]) {
      const id = randomUUID(); accounts[key] = { id, phone };
      await db.query("INSERT INTO accounts(id,login_phone,password_hash,status,full_name,permissions) VALUES($1,$2,$3,'ACTIVE',$4,$5)", [id, phone, await bcrypt.hash(password, 4), `Handover ${key}`, { view_financial: financial }]);
      await db.query('INSERT INTO account_roles(account_id,role_id) SELECT $1,id FROM roles WHERE role_code=$2', [id, role]);
      await db.query('INSERT INTO account_branch_scopes(account_id,branch_id,is_all_branches) VALUES($1,$2,$3)', [id, b, all]);
    }
    const member = randomUUID(), pkg = randomUUID();
    await db.query("INSERT INTO member_profiles(id,account_id,home_branch_id,member_code,full_name,phone) VALUES($1,$2,$3,'HV-BG','Handover Member','0909211805')", [member, accounts.member.id, branches[0]]);
    await db.query("INSERT INTO packages(id,package_code,package_name,package_type,price,duration_days) VALUES($1,'PK-BG','Handover Gym','GYM_TIME',9000000,30)", [pkg]);
    for (const branchId of branches) await db.query('INSERT INTO package_branches(package_id,branch_id) VALUES($1,$2)', [pkg, branchId]);
    let sequence = 0;
    async function addPayment(amount, method, branchId = branches[0], confirmedAt = new Date().toISOString()) {
      const reg = randomUUID(), payment = randomUUID(), receipt = randomUUID(); sequence++;
      await db.query(`INSERT INTO registrations(id,reg_code,member_id,package_id,sold_branch_id,package_name_snapshot,package_type_snapshot,price_snapshot,duration_days_snapshot,start_date,end_date,status)
        VALUES($1,$2,$3,$4,$5,'Handover Gym','GYM_TIME',$6,30,CURRENT_DATE,CURRENT_DATE+30,'ACTIVE')`, [reg, `DK-BG${sequence}`, member, pkg, branchId, amount]);
      await db.query('INSERT INTO registration_allowed_branches(registration_id,branch_id) VALUES($1,$2)', [reg, branchId]);
      await db.query(`INSERT INTO payments(id,registration_id,member_id,branch_id,payment_code,payment_method,amount,collected_by,confirmed_at,transaction_ref)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [payment, reg, member, branchId, `PAY-BG${sequence}`, method, amount, accounts.lt.id, confirmedAt, method === 'BANK_TRANSFER' ? `FT-BG${sequence}` : null]);
      await db.query('INSERT INTO receipts(id,payment_id,receipt_code,amount,payer_name,payer_phone,issued_by) VALUES($1,$2,$3,$4,$5,$6,$7)', [receipt, payment, `PT-BG${sequence}`, amount, 'Handover Member', '0909211805', accounts.qtv.id]);
      return { id: payment, receipt, reg, code: `PAY-BG${sequence}` };
    }
    const payments = [await addPayment(9000000, 'CASH'), await addPayment(5000000, 'BANK_TRANSFER'), await addPayment(7000000, 'BANK_TRANSFER'), await addPayment(1000000, 'CASH', branches[1])];
    const app = require('../../src/server'); pool = require('../../src/db/postgres').pool;
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    async function request(endpoint, token, body, branchId = branches[0], expected = 200, method = body ? 'POST' : 'GET') {
      const response = await fetch(base + '/api/v1' + endpoint, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(branchId ? { 'x-branch-id': branchId } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const json = await response.json(); assert.equal(response.status, expected, `${endpoint}: ${JSON.stringify(json)}`);
      return json.data ?? json;
    }
    const sessions = {};
    for (const [key, account] of Object.entries(accounts)) sessions[key] = await request('/auth/login-password', null, { login_phone: account.phone, password }, null);
    return { db, base, branches, accounts, sessions, member, payments, addPayment, request, close, migrations, name, day: new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10) };
  } catch (error) { await close(); throw error; }
}
module.exports = { setup };

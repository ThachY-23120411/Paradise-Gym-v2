const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID,createHash}=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {Client,types}=require('pg');
types.setTypeParser(1082,value=>value);
types.setTypeParser(1700,Number);
require('dotenv').config({path:path.join(__dirname,'../.env')});
const configuredUrl=process.env.DATABASE_URL;
assert(configuredUrl,'DATABASE_URL required');
const name=`paradise_ledger_test_${process.pid}_${Date.now()}`;
const seedName=name+'_seed';
const admin=new Client({connectionString:configuredUrl});
const migrations=path.join(__dirname,'../src/db/migrations');
const files=fs.readdirSync(migrations).filter(f=>f.endsWith('.sql')).sort();
const manifest=files.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(migrations,file))).digest('hex')}));
const urlFor=n=>{const u=new URL(configuredUrl);u.pathname='/'+n;return u.toString();};
let db,pool,created=false,seedCreated=false;
const sql=file=>fs.readFileSync(path.join(migrations,file),'utf8');
const ledgerFile='014_successful_payment_ledger.sql';
const migrate014=async()=>{await db.query('BEGIN');try{await db.query(sql(ledgerFile));await db.query('COMMIT');}catch(e){await db.query('ROLLBACK');throw e;}};
const snapshot=async()=>({payments:(await db.query('SELECT * FROM payments ORDER BY id')).rows,receipts:(await db.query('SELECT * FROM receipts ORDER BY id')).rows,registrations:(await db.query('SELECT * FROM registrations ORDER BY id')).rows,intents:(await db.query('SELECT * FROM payment_intents ORDER BY id')).rows});
async function main(){
  await admin.connect();await admin.query(`CREATE DATABASE "${name}"`);created=true;
  process.env.DATABASE_URL=urlFor(name);
  db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
  for(const file of files.filter(f=>f<ledgerFile))await db.query(sql(file));
  const branch=randomUUID(),account=randomUUID(),member=randomUUID(),pkg=randomUUID(),discount=randomUUID();
  await db.query("INSERT INTO branches(id,branch_code,branch_name,phone,address) VALUES($1,'LEDGER','Ledger','0900000091','Isolated')",[branch]);
  await db.query("INSERT INTO accounts(id,login_phone,status) VALUES($1,'0900000092','ACTIVE')",[account]);
  await db.query("INSERT INTO member_profiles(id,member_code,full_name,phone,home_branch_id) VALUES($1,'LEDGER','Ledger member','0900000093',$2)",[member,branch]);
  await db.query("INSERT INTO packages(id,package_code,package_name,package_type,price,duration_days) VALUES($1,'LEDGER','Ledger package','GYM_TIME',100000,30)",[pkg]);
  await db.query("INSERT INTO discounts(id,code,title,discount_type,discount_value,start_date,end_date,used_count) VALUES($1,'LEDGER','Ledger voucher','FIXED_AMOUNT',10000,CURRENT_DATE,CURRENT_DATE+30,6)",[discount]);
  const regs=[];
  for(let n=0;n<5;n++){
    const id=randomUUID();regs.push(id);
    await db.query(`INSERT INTO registrations(id,reg_code,member_id,package_id,sold_branch_id,package_name_snapshot,package_type_snapshot,price_snapshot,duration_days_snapshot,start_date,end_date,status)
      VALUES($1,$2,$3,$4,$5,'Ledger package','GYM_TIME',100000,30,CURRENT_DATE,CURRENT_DATE+30,$6)`,[id,'LEDGER'+n,member,pkg,branch,n===0?'ACTIVE':n===3?'CANCELLED':'PENDING_PAYMENT']);
  }
  const ids=[];
  for(let n=0;n<6;n++){
    const id=randomUUID();ids.push(id);
    await db.query(`INSERT INTO payments(id,registration_id,member_id,branch_id,payment_code,payment_method,amount,status,transaction_ref,collected_by,confirmed_at,discount_id,discount_amount,created_at,expires_at)
      VALUES($1,$2,$3,$4,$5,'BANK_TRANSFER',90000,$6::varchar,$7,$8,CASE WHEN $6::varchar='COMPLETED' THEN NOW() ELSE NULL END,$9,10000,
        NOW()+($10::int*interval '1 second'),NOW()+($11::int*interval '1 minute'))`,
      [id,regs[n===5?4:n],member,branch,'PAY'+(100+n),n===0?'COMPLETED':'PENDING',n===0?'LEGACY-REF':null,account,discount,n===2?-3600:n,n===2?-1:15]);
  }
  const receipt=randomUUID();
  await db.query("INSERT INTO receipts(id,payment_id,receipt_code,amount,payer_name,payer_phone,issued_by) VALUES($1,$2,'RC-LEDGER',90000,'Ledger member','0900000093',$3)",[receipt,ids[0],account]);
  const before={paid:(await db.query("SELECT * FROM payments WHERE status='COMPLETED'")).rows,receipts:(await db.query('SELECT * FROM receipts')).rows,registrations:(await db.query('SELECT * FROM registrations ORDER BY id')).rows};
  await migrate014();
  let after=await snapshot();
  assert.deepEqual(after.payments,before.paid.map(({status,...p})=>p));
  assert.deepEqual(after.receipts,before.receipts);assert.deepEqual(after.registrations,before.registrations);
  assert.equal(after.intents.length,6);assert.deepEqual(after.intents.map(p=>p.id).sort(),ids.sort());
  const states=after.intents.reduce((a,p)=>(a[p.state]=(a[p.state]||0)+1,a),{});
  assert.deepEqual(states,{...states,COMPLETED:1,PENDING:2,EXPIRED:1,CANCELLED:2});
  assert.equal((await db.query('SELECT used_count FROM discounts WHERE id=$1',[discount])).rows[0].used_count,3);
  assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_name='payments' AND column_name='status'")).rows[0].n,0);
  await migrate014();assert.deepEqual(await snapshot(),after);
  assert.equal((await db.query('SELECT used_count FROM discounts WHERE id=$1',[discount])).rows[0].used_count,3);
  const {migrate}=require('../src/db/migrate');pool=require('../src/db/postgres').pool;
  await migrate();assert.deepEqual(await snapshot(),after);
  await assert.rejects(db.query('UPDATE payments SET amount=1 WHERE id=$1',[before.paid[0].id]),e=>e.code==='23514');
  await assert.rejects(db.query(`INSERT INTO payments(registration_id,member_id,branch_id,payment_code,payment_method,amount,discount_id,discount_amount,confirmed_at)
    VALUES($1,$2,$3,'DUPLICATE-REG','CASH',90000,$4,10000,NOW())`,[regs[0],member,branch,discount]),e=>e.code==='23505');
  await assert.rejects(db.query(`INSERT INTO payments(registration_id,member_id,branch_id,payment_code,payment_method,amount,transaction_ref,confirmed_at)
    VALUES($1,$2,$3,'DUPLICATE-REF','BANK_TRANSFER',100000,'LEGACY-REF',NOW())`,[regs[1],member,branch]),e=>e.code==='23505');
  await assert.rejects(db.query(`INSERT INTO payments(registration_id,member_id,branch_id,payment_code,payment_method,amount,confirmed_at)
    VALUES($1,$2,$3,'PARTIAL','CASH',99999,NOW())`,[regs[1],member,branch]),e=>e.code==='23514');
  // The bootstrap DDL must also be harmless against the latest schema.
  await db.query(sql('001_create_tables.sql'));assert.deepEqual(await snapshot(),after);
  console.log('PASS legacy ledger preservation, six retained intents, voucher release, direct014/full-runner/base-DDL replay and duplicate/full-payment guards');

  await admin.query(`CREATE DATABASE "${seedName}"`);seedCreated=true;
  const seed=spawnSync(process.execPath,['src/db/seed.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,DATABASE_URL:urlFor(seedName)},encoding:'utf8',timeout:60000});
  assert.equal(seed.status,0,seed.stderr||seed.stdout);
  const seeded=new Client({connectionString:urlFor(seedName)});await seeded.connect();
  try{
    assert.equal((await seeded.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_name='payments' AND column_name='status'")).rows[0].n,0);
    assert((await seeded.query("SELECT to_regclass('public.payment_intents') name")).rows[0].name);
    assert.equal((await seeded.query('SELECT count(*)::int n FROM payments p LEFT JOIN receipts r ON r.payment_id=p.id WHERE r.id IS NULL OR r.amount<>p.amount')).rows[0].n,0);
  }finally{await seeded.end();}
  console.log('PASS seed.js on separate empty disposable PostgreSQL database with latest schema');
  fs.writeFileSync(path.join(__dirname,'../reports/payment-ledger-migration-verification.json'),JSON.stringify({result:'PASS',time:new Date().toISOString(),migration_manifest:manifest,legacy_payments:6,retained_settled:1,retained_receipts:1,intents:6,states,voucher_reserved_before:6,voucher_reserved_after:3,replay:['014','migrate.js','001'],isolated_seed:'PASS',configured_database_mutated:false},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  if(pool)await pool.end();if(db)await db.end();
  if(created&&/^paradise_ledger_test_\d+_\d+$/.test(name))await admin.query(`DROP DATABASE "${name}"`);
  if(seedCreated&&/^paradise_ledger_test_\d+_\d+_seed$/.test(seedName))await admin.query(`DROP DATABASE "${seedName}"`);
  await admin.end();
});

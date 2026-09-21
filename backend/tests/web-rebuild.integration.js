const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {randomUUID}=require('node:crypto');
const {Client}=require('pg');
const bcrypt=require('bcryptjs');
require('dotenv').config({path:path.join(__dirname,'../.env')});

// No seed, truncation, or writes to the configured application database.
const originalUrl=process.env.DATABASE_URL;
assert(originalUrl,'DATABASE_URL is required; no implicit database fallback in tests');
const dbName=`paradise_test_${process.pid}_${Date.now()}`;
const avatarDirectory=path.join(os.tmpdir(),`avatars_${dbName}`);
process.env.AVATAR_STORAGE_DIR=avatarDirectory;
assert(/^paradise_test_\d+_\d+$/.test(dbName));
const admin=new Client({connectionString:originalUrl});
let databaseCreated=false,db,server,pool,base,checks=0;
const password='Isolated-Test-Password9';
const day=()=>new Date(Date.now()+7*3600000).toISOString().slice(0,10);
const shift=(date,n)=>new Date(Date.parse(date)+n*86400000).toISOString().slice(0,10);
async function request(url,{token,branch,method='GET',body,status=200}={}){
  const res=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{ }),...(branch?{'x-branch-id':branch}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const value=await res.json();assert.equal(res.status,status,`${method} ${url}: ${JSON.stringify(value)}`);checks++;
  return value.data??value;
}
async function account(role,b,phone,global=false,twoFactor=false){
  const id=randomUUID();await db.query("INSERT INTO accounts(id,login_phone,password_hash,status,is_two_factor_enabled) VALUES($1,$2,$3,'ACTIVE',$4)",[id,phone,await bcrypt.hash(password,4),twoFactor]);
  await db.query('INSERT INTO account_roles(account_id,role_id) SELECT $1,id FROM roles WHERE role_code=$2',[id,role]);
  await db.query('INSERT INTO account_branch_scopes(account_id,branch_id,is_all_branches) VALUES($1,$2,$3)',[id,b,global]);return {id,phone};
}
async function login(a){return (await request('/auth/login-password',{method:'POST',body:{login_phone:a.phone,password}})).access_token;}
async function main(){
  await admin.connect();await admin.query(`CREATE DATABASE "${dbName}"`);databaseCreated=true;
  const tempUrl=new URL(originalUrl);tempUrl.pathname='/'+dbName;process.env.DATABASE_URL=tempUrl.toString();process.env.NODE_ENV='test';process.env.AUTH_OTP_MODE='development';
  db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
  const migrationFiles = fs.readdirSync(path.join(__dirname, '../src/db/migrations')).filter(f => f.endsWith('.sql')).sort();
  for (const file of migrationFiles) await db.query(fs.readFileSync(path.join(__dirname, '../src/db/migrations', file), 'utf8'));
  for(const r of ['QTV','RECEPTIONIST','PT','MEMBER'])await db.query('INSERT INTO roles(role_code,role_name) VALUES($1,$1)',[r]);
  const b1=randomUUID(),b2=randomUUID();
  for(const [id,name] of [[b1,'Branch A'],[b2,'Branch B']])await db.query("INSERT INTO branches(id,branch_code,branch_name,phone,address,open_time,close_time) VALUES($1,$2,$2,'0909999999','Test address','00:00','23:59:59')",[id,name]);
  const qtv=await account('QTV',b1,'0909000001',true),lt=await account('RECEPTIONIST',b1,'0909000002'),outside=await account('RECEPTIONIST',b2,'0909000003'),otpAccount=await account('QTV',b1,'0909000004',false,true);
  const app=require('../src/server');pool=require('../src/db/postgres').pool;
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});base=`http://127.0.0.1:${server.address().port}/api/v1`;
  const A=await login(qtv),L=await login(lt),O=await login(outside);
  await request('/members',{token:'demo-token-admin',status:401});
  const challenge=await request('/auth/login-password',{method:'POST',body:{login_phone:otpAccount.phone,password}});
  assert.equal(challenge.delivery,'DEVELOPMENT_ONLY');assert(challenge.dev_otp);assert(challenge.requires_2fa);
  await request('/members',{token:challenge.temp_token,status:401});
  await db.query("UPDATE accounts SET otp_expires_at=NOW()-interval '1 second' WHERE id=$1",[otpAccount.id]);
  const resend=await request('/auth/request-otp',{method:'POST',body:{login_phone:otpAccount.phone,temp_token:challenge.temp_token}});
  const verified=await request('/auth/verify-2fa',{method:'POST',body:{temp_token:challenge.temp_token,otp_code:resend.dev_otp}});assert(verified.access_token);
  await request('/auth/verify-2fa',{method:'POST',body:{temp_token:challenge.temp_token,otp_code:resend.dev_otp},status:400});
  const oldMode=process.env.AUTH_OTP_MODE;delete process.env.AUTH_OTP_MODE;delete process.env.SMS_PROVIDER_URL;
  await request('/auth/request-otp',{method:'POST',body:{login_phone:lt.phone},status:503});process.env.AUTH_OTP_MODE=oldMode;
  console.log('PASS real bcrypt, token types, development-only OTP, resend and single use');

  const m=await request('/members',{token:L,method:'POST',body:{full_name:'Test Member',phone:'0909000010',home_branch_id:b1}});
  const other=await request('/members',{token:O,method:'POST',body:{full_name:'Cross Member',phone:'0909000011',home_branch_id:b2}});
  await request(`/members/${other.id}`,{token:L,status:403});
  await request(`/members/${m.id}`,{token:L,method:'PUT',body:{phone:'0909000012'},status:400});
  await request('/members',{token:L,method:'POST',body:{full_name:'Duplicate',phone:m.phone,home_branch_id:b1},status:409});
  await request('/members',{token:L,branch:b2,status:403});
  await request('/packages',{token:L,method:'POST',body:{},status:403});
  const pkg=await request('/packages',{token:A,method:'POST',body:{package_name:'Gym sessions',package_type:'GYM_SESSIONS',price:500000,duration_days:null,total_gym_sessions:5,branch_ids:[b1,b2]}});
  assert.equal(pkg.package_type,'GYM_SESSION');
  const listed=await request('/packages',{token:A,branch:'ALL'});assert(listed[0].allowed_branch_ids.includes(b2));
  const registration=await request('/registrations',{token:L,method:'POST',body:{member_id:m.id,package_id:pkg.id,start_date:day(),sold_branch_id:b1}});
  const cross=await request('/registrations',{token:O,method:'POST',body:{member_id:other.id,package_id:pkg.id,start_date:day(),sold_branch_id:b2}});
  await request(`/packages/${pkg.id}`,{token:A,method:'PUT',body:{price:600000}});
  const snap=await request(`/registrations/${registration.id}`,{token:L});assert.equal(snap.price_snapshot,500000);
  await request('/payments/create-invoice',{token:L,method:'POST',body:{registration_id:registration.id,amount:100,payment_method:'CASH'},status:400});
  const inv=await request('/payments/create-invoice',{token:L,method:'POST',body:{registration_id:registration.id,payment_method:'CASH'}});
  const first=await request(`/payments/${inv.payment.id}/confirm`,{token:L,method:'POST',body:{}});
  const repeat=await request(`/payments/${inv.payment.id}/confirm`,{token:L,method:'POST',body:{}});
  assert.equal(first.receipt.id,repeat.receipt.id);assert.equal(first.registration.status,'ACTIVE');
  await assert.rejects(db.query("UPDATE payments SET amount=1 WHERE id=$1",[inv.payment.id]),e=>e.code==='23514');
  assert.equal((await db.query('SELECT count(*)::int n FROM receipts WHERE payment_id=$1',[inv.payment.id])).rows[0].n,1);
  const raceReg=await request('/registrations',{token:L,method:'POST',body:{member_id:m.id,package_id:pkg.id,start_date:day(),sold_branch_id:b1}});
  const raceInvoice=await request('/payments/create-invoice',{token:L,method:'POST',body:{registration_id:raceReg.id,payment_method:'CASH'}});
  const confirmations=await Promise.all([1,2].map(()=>request(`/payments/${raceInvoice.payment.id}/confirm`,{token:L,method:'POST',body:{}})));
  assert.equal(confirmations[0].receipt.id,confirmations[1].receipt.id);
  assert.equal((await db.query('SELECT count(*)::int n FROM receipts WHERE payment_id=$1',[raceInvoice.payment.id])).rows[0].n,1);
  const bank=await request('/payments/create-invoice',{token:O,method:'POST',body:{registration_id:cross.id,payment_method:'BANK_TRANSFER_VIETQR'}});
  assert.deepEqual(bank.vietqr,bank.qr_data);assert.equal(bank.vietqr.transferContent,`${cross.reg_code} ${other.member_code} PARADISE`);
  await request(`/payments/${bank.payment.id}/confirm`,{token:L,method:'POST',body:{manual_confirmation:true},status:403});
  await request(`/payments/${bank.payment.id}/check-bank-status`,{token:O,method:'POST',body:{},status:503});
  await request(`/payments/${bank.payment.id}/confirm`,{token:O,method:'POST',body:{},status:400});
  const settled=await request(`/payments/${bank.payment.id}/confirm`,{token:O,method:'POST',body:{manual_confirmation:true,transaction_ref:'TEST-CROSS-TRANSFER'}});assert.equal(settled.payment.transaction_ref,'TEST-CROSS-TRANSFER');
  console.log('PASS scoped members/packages/registrations, price snapshots, full payments and one receipt');

  const crossLookup=await request('/access-gate/members?q=Cross',{token:L,branch:b1});assert.equal(crossLookup[0].id,other.id);assert(!('email' in crossLookup[0]));
  const gateDetail=await request(`/access-gate/member/${other.id}`,{token:L,branch:b1});assert.equal(gateDetail.registrations.length,1);assert(!('price_snapshot' in gateDetail.registrations[0]));
  const manual={member_id:other.id,registration_id:cross.id,branch_id:b1,direction:'IN',reason:'Verified at counter',event_time:new Date(Date.now()-180000).toISOString()};
  const entry=await request('/access-gate/manual-checkin',{token:L,branch:b1,method:'POST',body:manual});assert.equal(entry.allowed,true);assert.equal(entry.door_command_sent,false);
  const duplicate=await request('/access-gate/manual-checkin',{token:L,branch:b1,method:'POST',body:manual});assert.equal(duplicate.allowed,false);
  assert.equal(duplicate.denial_code,'DUPLICATE_SCAN');
  const reentry=await request('/access-gate/manual-checkin',{token:L,branch:b1,method:'POST',body:{...manual,event_time:new Date(Date.now()-60000).toISOString()}});assert.equal(reentry.allowed,true);
  assert.equal((await db.query('SELECT remaining_gym_sessions FROM registrations WHERE id=$1',[cross.id])).rows[0].remaining_gym_sessions,4);
  const inside=await request(`/access-gate/presence?member_id=${other.id}`,{token:L,branch:b1});assert.equal(inside.is_inside,true);
  await db.query("UPDATE registrations SET end_date=$2,status='EXPIRED' WHERE id=$1",[cross.id,shift(day(),-1)]);
  const out=await request('/access-gate/manual-checkin',{token:L,branch:b1,method:'POST',body:{...manual,direction:'OUT',event_time:new Date().toISOString()}});assert.equal(out.allowed,true);
  const expiredEntry=await request('/access-gate/manual-checkin',{token:L,branch:b1,method:'POST',body:{...manual,event_time:new Date(Date.now()+1000).toISOString()}});assert.equal(expiredEntry.denial_code,'REGISTRATION_EXPIRED');assert.equal(expiredEntry.reason,expiredEntry.log.denial_reason);
  const past=new Date(Date.parse(day())-86400000).toISOString();
  await request('/access-gate/manual-checkin',{token:L,branch:b1,method:'POST',body:{...manual,member_id:m.id,registration_id:registration.id,direction:'OUT',event_time:past}});
  const history=await request(`/access-gate/logs?member_id=${m.id}`,{token:L});assert.equal(history.length,1);assert.equal(history[0].member_id,m.id);
  const todayLogs=await request(`/access-gate/today-logs?member_id=${m.id}`,{token:L});assert.equal(todayLogs.length,0);
  await request(`/members/${m.id}/status`,{token:L,method:'PUT',body:{status:'INACTIVE'}});
  const blockedMember=await request('/access-gate/manual-checkin',{token:L,method:'POST',body:{...manual,member_id:m.id,registration_id:registration.id}});assert.equal(blockedMember.allowed,false);
  assert.equal(blockedMember.denial_code,'MEMBER_INACTIVE');
  await request(`/members/${m.id}/status`,{token:L,method:'PATCH',body:{status:'ACTIVE'}});
  await request(`/branches/${b1}`,{token:A,method:'PUT',body:{status:'INACTIVE'}});
  const blockedBranch=await request('/access-gate/manual-checkin',{token:L,method:'POST',body:{...manual,member_id:m.id,registration_id:registration.id}});assert.equal(blockedBranch.allowed,false);
  assert.equal(blockedBranch.denial_code,'BRANCH_INACTIVE');
  await request('/registrations',{token:L,method:'POST',body:{member_id:m.id,package_id:pkg.id,start_date:day(),sold_branch_id:b1},status:409});
  await request(`/branches/${b1}`,{token:A,method:'PUT',body:{status:'ACTIVE'}});
  const gateUnpaid=await request('/registrations',{token:L,method:'POST',body:{member_id:m.id,package_id:pkg.id,start_date:day(),sold_branch_id:b1}});
  const unpaidEntry=await request('/access-gate/manual-checkin',{token:L,method:'POST',body:{...manual,member_id:m.id,registration_id:gateUnpaid.id}});assert.equal(unpaidEntry.allowed,false);
  assert.equal(unpaidEntry.denial_code,'PAYMENT_REQUIRED');
  const ownEntry={...manual,member_id:m.id,registration_id:registration.id};
  await db.query('DELETE FROM registration_allowed_branches WHERE registration_id=$1 AND branch_id=$2',[registration.id,b1]);
  assert.equal((await request('/access-gate/manual-checkin',{token:L,method:'POST',body:ownEntry})).denial_code,'WRONG_BRANCH');
  await db.query('INSERT INTO registration_allowed_branches VALUES($1,$2)',[registration.id,b1]);
  await db.query('UPDATE registrations SET remaining_gym_sessions=0 WHERE id=$1',[registration.id]);
  assert.equal((await request('/access-gate/manual-checkin',{token:L,method:'POST',body:ownEntry})).denial_code,'GYM_SESSIONS_EXHAUSTED');
  await db.query('UPDATE registrations SET remaining_gym_sessions=5,start_date=$2 WHERE id=$1',[registration.id,shift(day(),1)]);
  assert.equal((await request('/access-gate/manual-checkin',{token:L,method:'POST',body:ownEntry})).denial_code,'REGISTRATION_NOT_STARTED');
  await db.query('UPDATE registrations SET start_date=$2 WHERE id=$1',[registration.id,day()]);
  await db.query("UPDATE branches SET open_time='08:00',close_time='18:00' WHERE id=$1",[b1]);
  assert.equal((await request('/access-gate/manual-checkin',{token:L,method:'POST',body:{...ownEntry,event_time:`${shift(day(),-1)}T01:00:00+07:00`}})).denial_code,'OUTSIDE_OPENING_HOURS');
  await db.query("UPDATE branches SET open_time='00:00',close_time='23:59:59' WHERE id=$1",[b1]);
  await request(`/members/${other.id}`,{token:L,status:403});
  console.log('PASS cross-branch minimal gate lookup, duplicate prevention, daily deduction, expired OUT and history');

  const pt=await request('/pt-bookings/trainers',{token:A,method:'POST',body:{full_name:'Trainer',phone:'0909000020',branch_id:b1,specialties:'Strength'}});
  const activate=await request('/auth/request-otp',{method:'POST',body:{login_phone:pt.phone}});
  const ptSession=await request('/auth/login-otp',{method:'POST',body:{login_phone:pt.phone,otp_code:activate.dev_otp,password}});const P=ptSession.access_token;
  const memberChallenge=await request('/auth/request-otp',{method:'POST',body:{login_phone:m.phone}});
  const memberSession=await request('/auth/login-otp',{method:'POST',body:{login_phone:m.phone,otp_code:memberChallenge.dev_otp,password}});const M=memberSession.access_token;
  async function financialSnapshot(regId){
    const payments=(await db.query('SELECT * FROM payments WHERE registration_id=$1 ORDER BY id',[regId])).rows;
    return {
      registration:(await db.query('SELECT * FROM registrations WHERE id=$1',[regId])).rows[0],payments,
      receipts:(await db.query('SELECT rc.* FROM receipts rc JOIN payments p ON p.id=rc.payment_id WHERE p.registration_id=$1 ORDER BY rc.id',[regId])).rows,
      notifications:(await db.query('SELECT * FROM notifications WHERE reference_id=$1 OR reference_id IN (SELECT id FROM payments WHERE registration_id=$1) ORDER BY id',[regId])).rows,
      audit:(await db.query("SELECT * FROM audit_logs WHERE (target_table='registrations' AND target_id=$1) OR (target_table='payments' AND target_id IN (SELECT id FROM payments WHERE registration_id=$1)) ORDER BY id",[regId])).rows
    };
  }
  for(const method of ['CASH','BANK_TRANSFER']){
    const owned=await request('/registrations',{token:M,method:'POST',body:{member_id:m.id,package_id:pkg.id,start_date:day(),sold_branch_id:b1}});
    const emptyState=await financialSnapshot(owned.id);assert.equal(emptyState.registration.status,'PENDING_PAYMENT');assert.equal(emptyState.payments.length,0);
    const forged={manual_confirmation:true,transaction_ref:`MEMBER-CLAIM-${method}`,provider_verified:true,status:'COMPLETED',collected_by:lt.id};
    const directDenied=await request('/payments',{token:M,method:'POST',body:{registration_id:owned.id,payment_method:method,...forged},status:403});
    assert.equal(directDenied.code,'PAYMENT_CONFIRMATION_FORBIDDEN');assert.deepEqual(await financialSnapshot(owned.id),emptyState);
    if(method==='CASH'){
      await request('/payments/create-invoice',{token:M,method:'POST',body:{registration_id:owned.id,payment_method:'CASH',...forged},status:403});
      assert.deepEqual(await financialSnapshot(owned.id),emptyState);
    }
    const intent=await request('/payments/create-invoice',{token:method==='CASH'?L:M,method:'POST',body:{registration_id:owned.id,payment_method:method}});
    assert.equal(intent.payment.member_id,m.id);assert.equal(intent.payment.status,'PENDING');
    const pendingState=await financialSnapshot(owned.id);assert.equal(pendingState.receipts.length,0);assert.equal(pendingState.registration.status,'PENDING_PAYMENT');
    for(const claim of [{manual_confirmation:true},{transaction_ref:`FAKE-${method}`},forged]){
      const denied=await request(`/payments/${intent.payment.id}/confirm`,{token:M,method:'POST',body:claim,status:403});
      assert.equal(denied.code,'PAYMENT_CONFIRMATION_FORBIDDEN');assert.deepEqual(await financialSnapshot(owned.id),pendingState);
    }
    await request('/payments',{token:M,method:'POST',body:{registration_id:owned.id,payment_method:method,...forged},status:403});
    assert.deepEqual(await financialSnapshot(owned.id),pendingState);
    await request(`/payments/${intent.payment.id}/receipt`,{token:M,status:404});
    const staffPaid=await request(`/payments/${intent.payment.id}/confirm`,{token:L,method:'POST',body:method==='CASH'?{}:{manual_confirmation:true,transaction_ref:'TEST-OWN-TRANSFER'}});
    assert.equal(staffPaid.is_settled,true);assert(!('status' in staffPaid.payment));assert.equal(staffPaid.registration.status,'ACTIVE');assert.equal(staffPaid.payment.collected_by,lt.id);assert.equal(staffPaid.payment.transaction_ref,method==='CASH'?null:'TEST-OWN-TRANSFER');
    const paidState=await financialSnapshot(owned.id);assert.equal(paidState.receipts.length,1);
    await request(`/payments/${intent.payment.id}/confirm`,{token:M,method:'POST',body:forged,status:403});assert.deepEqual(await financialSnapshot(owned.id),paidState);
    const ownReceipt=await request(`/payments/${intent.payment.id}/receipt`,{token:M});assert.equal(ownReceipt.id,staffPaid.receipt.id);
  }
  console.log('PASS owned-member CASH/BANK settlement and direct-payment rejection with SQL no-side-effect assertions; staff collection and member receipt read retained');
  if(process.env.PAYMENT_LEDGER_ONLY==='true'){
    await require('./payment-ledger.cases')({request,db,A,L,M,O,m,pkg,b1,b2,day,shift});
    console.log(`PASS ${checks} HTTP checks against isolated PostgreSQL database; configured DB untouched`);
    return;
  }

  const foreignTemplate=await request('/notifications/templates',{token:A,branch:b2,method:'POST',body:{template_name:'Branch B private notice',event_code:'FACILITY_NOTICE',title_template:'BRANCH_B_ONLY_SECRET',body_template:'BRANCH_B_ONLY_SECRET {{branch_name}}'}});
  const {emit,schemas}=require('../src/modules/core/notifications');
  const noticePayload=(overrides={})=>({event:'FACILITY_NOTICE',branchId:b1,referenceType:'TEST_NOTICE',referenceId:randomUUID(),accounts:[m.account_id,m.account_id,pt.account_id,lt.id],variables:{branch_name:'Test branch',effective_date:day()},title:'Caller cannot override',body:'Caller cannot bypass configuration',...overrides});
  async function noNotification(payload){
    const before=(await db.query('SELECT * FROM notifications ORDER BY id')).rows;
    assert.equal(await emit(db,payload),0);
    assert.deepEqual((await db.query('SELECT * FROM notifications ORDER BY id')).rows,before);
  }
  assert.equal((await db.query('SELECT count(*)::int n FROM notifications')).rows[0].n,0);
  await noNotification(noticePayload());
  const globalTemplate=(await db.query("INSERT INTO notification_templates(template_code,template_name,event_type,target_role,title_template,body_template,branch_id,created_by) VALUES('TEST-GLOBAL','Global notice','FACILITY_NOTICE','MEMBER','Global notice','Global {{branch_name}}',NULL,$1) RETURNING id",[qtv.id])).rows[0];
  const localTemplate=await request('/notifications/templates',{token:A,branch:b1,method:'POST',body:{template_name:'Branch A notice',event_code:'FACILITY_NOTICE',title_template:'Branch A notice',body_template:'Local {{branch_name}}'}});
  for(const event of Object.keys(schemas))await noNotification(noticePayload({event}));
  for(const branchId of [null,b2])await noNotification(noticePayload({branchId}));
  const noticeRule={event_code:'FACILITY_NOTICE',template_id:localTemplate.id,recipient_roles:['MEMBER'],recipient_modes:['DIRECT'],is_active:false};
  const off=await request('/notifications/rules',{token:A,branch:b1,method:'PUT',body:noticeRule});assert.equal(off.is_active,false);
  await noNotification(noticePayload());
  await request('/notifications/rules',{token:A,branch:b1,method:'PUT',body:{event_code:'FACILITY_NOTICE',is_active:true}});
  await request(`/notifications/templates/${localTemplate.id}`,{token:A,branch:b1,method:'PUT',body:{is_active:false}});
  await noNotification(noticePayload());
  await request(`/notifications/templates/${localTemplate.id}`,{token:A,branch:b1,method:'PUT',body:{is_active:true}});
  const configured=noticePayload();assert.equal(await emit(db,configured),1);
  const localNotes=(await db.query('SELECT * FROM notifications WHERE reference_id=$1',[configured.referenceId])).rows;
  assert.equal(localNotes.length,1);assert.equal(localNotes[0].account_id,m.account_id);assert.equal(localNotes[0].template_id,localTemplate.id);
  assert.equal(localNotes[0].title,'Branch A notice');assert.equal(localNotes[0].body,'Local Test branch');
  await noNotification(configured);
  await request('/notifications/rules',{token:A,branch:b1,method:'PUT',body:{event_code:'FACILITY_NOTICE',template_id:foreignTemplate.id},status:403});
  await request('/notifications/rules',{token:A,branch:b1,method:'PUT',body:{event_code:'FACILITY_NOTICE',template_id:globalTemplate.id,recipient_roles:['MEMBER','RECEPTIONIST'],recipient_modes:['DIRECT','BRANCH_BROADCAST']}});
  const broadcast=noticePayload({accounts:[m.account_id]});assert.equal(await emit(db,broadcast),2);
  const broadcastNotes=(await db.query('SELECT * FROM notifications WHERE reference_id=$1',[broadcast.referenceId])).rows;
  assert.deepEqual(broadcastNotes.map(n=>n.account_id).sort(),[m.account_id,lt.id].sort());
  assert(broadcastNotes.every(n=>n.template_id===globalTemplate.id&&n.title==='Global notice'&&n.body==='Global Test branch'));
  await noNotification(broadcast);
  await request('/notifications/rules',{token:A,branch:b1,method:'PUT',body:{event_code:'FACILITY_NOTICE',is_active:false}});
  const rules=await request('/notifications/rules',{token:A,branch:b1});assert.equal(rules.find(r=>r.event_code==='FACILITY_NOTICE').is_active,false);
  await noNotification(noticePayload());
  console.log('PASS configured-only notifications: no rule/OFF/inactive template suppress even caller text; active template/roles/modes/branch isolation/dedup and W09 toggles authoritative');
  const ptpkg=await request('/packages',{token:A,method:'POST',body:{package_name:'PT sessions',package_type:'PT_SESSION',price:1000000,duration_days:60,total_pt_sessions:5,session_duration_minutes:90,branch_ids:[b1]}});
  await request('/pt-bookings/trainers/check-phone?phone=0909000020',{token:A});
  const ptr=await request('/registrations',{token:L,method:'POST',body:{member_id:m.id,package_id:ptpkg.id,start_date:day(),sold_branch_id:b1}});
  await request('/payments',{token:L,method:'POST',body:{registration_id:ptr.id,payment_method:'CASH'}});
  assert.equal((await request('/access-gate/manual-checkin',{token:L,method:'POST',body:{...ownEntry,registration_id:ptr.id}})).denial_code,'GYM_ENTITLEMENT_REQUIRED');
  await request(`/registrations/${ptr.id}/assign-pt`,{token:L,method:'POST',body:{pt_id:pt.id}});
  const ptRegistrations=await request(`/registrations?pt_id=${pt.id}`,{token:P});
  const bookingRegistration=ptRegistrations.find(r=>r.id===ptr.id);
  assert(bookingRegistration,'Assigned registration must be available to the PT booking form');
  assert.equal(bookingRegistration.session_duration_minutes_snapshot??bookingRegistration.session_duration_minutes,90);
  let future=shift(day(),1);while([0,6].includes(new Date(future).getUTCDay()))future=shift(future,1);
  const originalHours=(await db.query('SELECT open_time,close_time FROM branches WHERE id=$1',[b1])).rows[0];
  await db.query("UPDATE branches SET open_time='09:15',close_time='16:15' WHERE id=$1",[b1]);
  const withinHours=await request(`/pt-bookings/available-slots?registration_id=${ptr.id}&date=${future}`,{token:P});
  assert.equal(withinHours.available_slots[0].start_time,'09:15');
  assert.equal(withinHours.available_slots.at(-1).end_time,'16:15');
  for(const start_time of ['09:14','14:46'])await request('/pt-bookings',{token:P,method:'POST',body:{registration_id:ptr.id,booking_date:future,start_time},status:400});
  await db.query('UPDATE branches SET open_time=$2,close_time=$3 WHERE id=$1',[b1,originalHours.open_time,originalHours.close_time]);
  for(const start_time of ['07:59','16:31'])await request('/pt-bookings',{token:P,method:'POST',body:{registration_id:ptr.id,booking_date:future,start_time},status:400});
  const ptHours=await request(`/pt-bookings/available-slots?registration_id=${ptr.id}&date=${future}`,{token:P});
  assert.equal(ptHours.available_slots[0].start_time,'08:00');
  assert.equal(ptHours.available_slots.at(-1).end_time,'18:00');
  const bookingBody={registration_id:ptr.id,member_id:m.id,pt_id:pt.id,branch_id:b1,booking_date:future,start_time:'08:00',end_time:'09:30'};
  await request('/pt-bookings',{token:P,method:'POST',body:{...bookingBody,end_time:'10:00'},status:400});
  await request('/pt-bookings',{token:P,method:'POST',body:{...bookingBody,session_duration_minutes:120},status:400});
  assert.equal((await db.query('SELECT remaining_pt_sessions FROM registrations WHERE id=$1',[ptr.id])).rows[0].remaining_pt_sessions,5);
  const booked=await request('/pt-bookings',{token:L,method:'POST',body:bookingBody});
  assert.equal(booked.session_duration_minutes,90);assert.equal(booked.end_time.slice(0,5),'09:30');
  await request('/pt-bookings',{token:L,method:'POST',body:bookingBody,status:409});
  let counters=(await db.query('SELECT remaining_pt_sessions,booked_pt_sessions,used_pt_sessions FROM registrations WHERE id=$1',[ptr.id])).rows[0];assert.deepEqual(counters,{remaining_pt_sessions:4,booked_pt_sessions:1,used_pt_sessions:0});
  await request(`/pt-bookings/${booked.id}/cancel`,{token:L,method:'POST',body:{reason:'Cancelled at counter'}});
  assert.equal((await db.query('SELECT remaining_pt_sessions FROM registrations WHERE id=$1',[ptr.id])).rows[0].remaining_pt_sessions,5);
  const completed=await request('/pt-bookings',{token:P,method:'POST',body:{registration_id:ptr.id,booking_date:future,start_time:'08:00'}});
  assert.equal(completed.pt_id,pt.id);assert.equal(completed.member_id,m.id);assert.equal(completed.branch_id,b1);
  assert.equal(completed.session_duration_minutes,90);assert.equal(completed.end_time.slice(0,5),'09:30');
  await request(`/pt-bookings/${completed.id}/cancel`,{token:P,method:'POST',body:{reason:'PT cannot cancel'},status:403});
  await db.query('UPDATE pt_bookings SET booking_date=$2 WHERE id=$1',[completed.id,shift(day(),-1)]);
  const reconciled=await request(`/pt-bookings/${completed.id}/confirm`,{token:L,method:'POST',body:{}});assert.equal(reconciled.is_completed,false);assert.equal(reconciled.booking.pt_confirmed_at,null);assert.equal(reconciled.booking.member_confirmed_at,null);
  await request(`/pt-bookings/${completed.id}/pt-confirm`,{token:L,method:'POST',body:{},status:403});
  await request(`/pt-bookings/${completed.id}/pt-confirm`,{token:P,method:'POST',body:{workout_notes:'Training completed'}});
  const both=await request(`/pt-bookings/${completed.id}/member-confirm`,{token:M,method:'POST',body:{}});assert.equal(both.is_completed,true);
  counters=(await db.query('SELECT remaining_pt_sessions,booked_pt_sessions,used_pt_sessions FROM registrations WHERE id=$1',[ptr.id])).rows[0];assert.deepEqual(counters,{remaining_pt_sessions:4,booked_pt_sessions:0,used_pt_sessions:1});
  assert.equal((await request(`/pt-bookings?date_from=${future}&date_to=${future}`,{token:L})).length,1);
  const renew=await request(`/registrations/${ptr.id}/renew`,{token:L,method:'POST',body:{package_id:ptpkg.id}});assert.equal(renew.previous_registration_id,ptr.id);assert(renew.start_date>ptr.end_date);
  const futureBody={...bookingBody,start_time:'10:00',end_time:'11:30'};
  const concurrent=await Promise.all([1,2].map(async()=>{const res=await fetch(base+'/pt-bookings',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${L}`},body:JSON.stringify(futureBody)});return {status:res.status,value:await res.json()};}));
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);checks+=2;
  const reminderBooking=concurrent.find(r=>r.status===200).value.data;
  console.log('PASS PT reservation/cancellation, double confirmation, staff reconciliation and renewal');

  const eventList=await request('/notifications/events',{token:L});assert(eventList.some(e=>e.event_code==='PAYMENT_CONFIRMED'));
  const template=await request('/notifications/templates',{token:A,branch:b1,method:'POST',body:{template_name:'Payment received',event_code:'PAYMENT_CONFIRMED',title_template:'Payment {{member_name}}',body_template:'{{package_name}}: {{amount}}'}});
  await request('/notifications/templates',{token:L,method:'POST',body:{},status:403});
  const rule=await request('/notifications/rules',{token:A,branch:b1,method:'PUT',body:{event_code:'PAYMENT_CONFIRMED',template_id:template.id,recipient_roles:['MEMBER'],recipient_modes:['DIRECT'],is_active:true}});assert.equal(rule.is_active,true);
  await request('/notifications/rules',{token:A,branch:b1,method:'PUT',body:{event_code:'PAYMENT_CONFIRMED',is_active:false}});
  await request('/notifications/rules',{token:A,branch:b1,method:'PUT',body:{event_code:'PAYMENT_CONFIRMED',is_active:true}});
  const renewalPayment=await request('/payments',{token:L,method:'POST',body:{registration_id:renew.id,payment_method:'CASH'}});
  const notes=await request('/notifications',{token:M}),paymentNotes=notes.filter(n=>n.event_type==='PAYMENT_CONFIRMED'&&n.reference_id===renewalPayment.payment.id);assert.equal(paymentNotes.length,1);assert(paymentNotes[0].title.includes(m.full_name));
  for(const event of ['BOOKING_REMINDER','PACKAGE_EXPIRING']){
    const template=await request('/notifications/templates',{token:A,branch:b1,method:'POST',body:{template_name:event,event_code:event,title_template:'Reminder {{member_name}}',body_template:event==='BOOKING_REMINDER'?'{{booking_date}} {{time_slot}}':'{{package_name}} {{days_left}}'}});
    await request('/notifications/rules',{token:A,branch:b1,method:'PUT',body:{event_code:event,template_id:template.id,recipient_roles:['MEMBER'],recipient_modes:['DIRECT'],is_active:true}});
  }
  const {runScheduledNotifications}=require('../src/modules/core/jobs');
  const sessionStart=new Date(`${reminderBooking.booking_date}T10:00:00+07:00`);
  const clock24=new Date(sessionStart.getTime()-23*3600000);
  await db.query('UPDATE registrations SET end_date=$2 WHERE id=$1',[ptr.id,shift(new Date(clock24.getTime()+7*3600000).toISOString().slice(0,10),7)]);
  assert.equal((await runScheduledNotifications(clock24)).sent,2);
  assert.equal((await runScheduledNotifications(clock24)).sent,0);
  assert.equal((await runScheduledNotifications(new Date(sessionStart.getTime()-3600000))).sent,1);
  assert.equal((await runScheduledNotifications(new Date(sessionStart.getTime()-3600000))).sent,0);
  const cs=await request(`/members/${m.id}/consents`,{token:L,method:'POST',body:{consent_type:'FACE_RECOGNITION',is_granted:true,evidence:{identity_verified:true,consent_version:'1.0'}}});assert.equal(cs.consents[0].is_granted,true);
  await request(`/members/${m.id}/recognition/capture`,{token:L,method:'POST',body:{},status:503});
  const detail=await request(`/members/${m.id}`,{token:L});assert(Array.isArray(detail.consents));assert(Array.isArray(detail.recent_access_logs));assert.equal(detail.has_biometric_face,false);
  const device=await request('/devices',{token:A,method:'POST',body:{device_code:'TESTCAM',device_name:'Camera',device_type:'FACE_CAMERA',direction:'IN',branch_id:b1,ip_address:'192.0.2.10',status:'ONLINE'}});assert.equal(device.status,'PENDING_SYNC');
  await request(`/devices/${device.id}/test`,{token:A,method:'POST',body:{},status:503});
  await request('/devices/incidents',{token:L,method:'POST',body:{device_id:device.id,description:'No camera response',severity:'HIGH'}});
  const deviceRead=await request(`/devices/${device.id}`,{token:L});assert.equal(deviceRead.branch_name,'Branch A');assert(deviceRead.updated_by_name);
  const incidents=await request('/devices/incidents',{token:L});assert.equal(incidents[0].branch_name,'Branch A');
  assert(cs.audit[0].actor_name);assert.equal(cs.audit[0].version,'1.0');
  const auditEntries=await request(`/audit-logs?date_from=${day()}&date_to=${day()}&action=DEVICE_CONFIGURED`,{token:A});assert.equal(auditEntries.total,1);
  const emptyAudit=await request(`/audit-logs?date_from=${shift(day(),-2)}&date_to=${shift(day(),-1)}`,{token:A});assert.equal(emptyAudit.total,0);
  const clearedIp=await request(`/devices/${device.id}`,{token:A,method:'PUT',body:{ip_address:null}});assert.equal(clearedIp.ip_address,null);assert.equal(clearedIp.configured_status,'ONLINE');
  const clearedRead=await request(`/devices/${device.id}`,{token:L});assert.equal(clearedRead.ip_address,null);
  assert.equal((await db.query('SELECT ip_address FROM devices WHERE id=$1',[device.id])).rows[0].ip_address,null);
  const clearAudit=(await db.query("SELECT old_values,new_values FROM audit_logs WHERE target_id=$1 AND action_name='DEVICE_CONFIGURED' ORDER BY created_at DESC LIMIT 1",[device.id])).rows[0];assert.equal(clearAudit.old_values.ip_address,'192.0.2.10');assert.equal(clearAudit.new_values.ip_address,null);
  assert.equal(device.configured_status,'ONLINE');assert.equal(device.connection_status,'PENDING_SYNC');
  const devicePath=`/devices/${device.id}`;
  async function deviceState(configured,connection,effective,enabled=true){
    const result=await request(devicePath,{token:L});
    assert.equal(result.configured_status,configured);assert.equal(result.connection_status,connection);assert.equal(result.status,effective);assert.equal(result.enabled,enabled);
    const persisted=(await db.query('SELECT status,enabled,last_heartbeat_at,last_synced_at,last_error FROM devices WHERE id=$1',[device.id])).rows[0];
    assert.equal(persisted.status,configured);assert.equal(persisted.enabled,enabled);
    const overview=await request('/dashboard',{token:L});assert.equal(overview.tasks.offline_devices,enabled&&effective!=='ONLINE'?1:0);
    return persisted;
  }
  await deviceState('ONLINE','PENDING_SYNC','PENDING_SYNC');
  for(const status of ['OFFLINE','ERROR','PENDING_SYNC']){
    const saved=await request(devicePath,{token:A,method:'PUT',body:{status}});
    assert.equal(saved.configured_status,status);assert.equal(saved.status,'PENDING_SYNC');
    const stored=await deviceState(status,'PENDING_SYNC','PENDING_SYNC');assert.equal(stored.last_heartbeat_at,null);assert.equal(stored.last_synced_at,null);assert.equal(stored.last_error,null);
    const audit=(await db.query("SELECT new_values FROM audit_logs WHERE target_table='devices' AND target_id=$1 AND action_name='DEVICE_CONFIGURED' ORDER BY created_at DESC LIMIT 1",[device.id])).rows[0];
    assert.equal(audit.new_values.status,status);
  }
  const beforeInvalid=(await db.query('SELECT count(*)::int n FROM audit_logs WHERE target_id=$1',[device.id])).rows[0].n;
  for(const status of ['BROKEN',null,42])await request(devicePath,{token:A,method:'PUT',body:{status},status:400});
  await request(devicePath,{token:A,method:'PUT',body:{enabled:'true'},status:400});
  await request(devicePath,{token:A,method:'PUT',body:{last_heartbeat_at:new Date().toISOString()},status:400});
  await request('/devices',{token:A,method:'POST',body:{device_code:'INVALID-CAMERA',device_type:'FACE_CAMERA',direction:'IN',branch_id:b1,status:'BROKEN'},status:400});
  assert.equal((await db.query('SELECT count(*)::int n FROM audit_logs WHERE target_id=$1',[device.id])).rows[0].n,beforeInvalid);
  assert.equal((await db.query("SELECT count(*)::int n FROM devices WHERE device_code='INVALID-CAMERA'")).rows[0].n,0);
  await deviceState('PENDING_SYNC','PENDING_SYNC','PENDING_SYNC');
  await request(devicePath,{token:A,method:'PUT',body:{device_name:'Renamed camera'}});
  await deviceState('PENDING_SYNC','PENDING_SYNC','PENDING_SYNC');
  await request(devicePath,{token:A,method:'PUT',body:{enabled:false}});
  await deviceState('PENDING_SYNC','INACTIVE','INACTIVE',false);
  await request(devicePath,{token:A,method:'PUT',body:{enabled:true,status:'ONLINE'}});
  await deviceState('ONLINE','PENDING_SYNC','PENDING_SYNC');
  await request(devicePath,{token:A,method:'PUT',body:{status:'INACTIVE'}});
  await deviceState('INACTIVE','INACTIVE','INACTIVE',false);
  await request(devicePath,{token:A,method:'PUT',body:{enabled:true,status:'ONLINE'}});
  await deviceState('ONLINE','PENDING_SYNC','PENDING_SYNC');

  // Trusted telemetry is inserted only into the isolated test DB; admin REST cannot write it.
  await db.query("UPDATE devices SET last_heartbeat_at=NOW()-interval '3 minutes',last_synced_at=NOW()-interval '3 minutes' WHERE id=$1",[device.id]);
  const stale=await deviceState('ONLINE','OFFLINE','OFFLINE');
  await request(devicePath,{token:A,method:'PUT',body:{status:'ONLINE'}});
  const unchanged=await deviceState('ONLINE','OFFLINE','OFFLINE');assert.deepEqual(unchanged,stale);
  await db.query('UPDATE devices SET last_heartbeat_at=NOW(),last_synced_at=NOW(),last_error=NULL WHERE id=$1',[device.id]);
  const healthy=await deviceState('ONLINE','ONLINE','ONLINE');
  for(const status of ['OFFLINE','ERROR','PENDING_SYNC','ONLINE']){
    await request(devicePath,{token:A,method:'PUT',body:{status}});
    const stored=await deviceState(status,'ONLINE',status);assert.deepEqual(stored.last_heartbeat_at,healthy.last_heartbeat_at);assert.deepEqual(stored.last_synced_at,healthy.last_synced_at);
  }
  await db.query("UPDATE devices SET last_error='Unresolved device fault' WHERE id=$1",[device.id]);
  await deviceState('ONLINE','ERROR','ERROR');
  await request(devicePath,{token:A,method:'PUT',body:{status:'ONLINE'}});
  const fault=await deviceState('ONLINE','ERROR','ERROR');assert.equal(fault.last_error,'Unresolved device fault');
  await request(`${devicePath}/test`,{token:A,method:'POST',body:{},status:503});
  await request(`/members/${m.id}/recognition/ready`,{token:A,method:'POST',body:{device_id:device.id},status:503});
  await db.query("UPDATE devices SET last_heartbeat_at=NOW()+interval '5 minutes',last_error=NULL WHERE id=$1",[device.id]);
  await deviceState('ONLINE','OFFLINE','OFFLINE');
  await db.query('UPDATE devices SET last_heartbeat_at=NULL,last_synced_at=NULL WHERE id=$1',[device.id]);
  const deviceList=await request('/devices',{token:L});assert.equal(deviceList[0].configured_status,'ONLINE');assert.equal(deviceList[0].connection_status,'PENDING_SYNC');assert.equal(deviceList[0].status,'PENDING_SYNC');
  console.log('PASS W12 configured status persistence/audit, validation, reenable, telemetry separation and dashboard truthfulness');
  await request('/devices',{token:L});await request(`/devices/${device.id}`,{token:L,method:'PUT',body:{enabled:false},status:403});
  const dashboard=await request('/dashboard',{token:L});assert(!('cash_received' in dashboard.metrics));assert.equal(dashboard.bookings.length,dashboard.metrics.pt_bookings);
  const reports=await request('/reports?period=month',{token:A,branch:'ALL'});assert(reports.metrics.cash_received>0);assert(Array.isArray(reports.distribution));await request('/reports',{token:L,status:403});
  await request('/accounts/stats',{token:A});await request(`/accounts/${qtv.id}`,{token:A,method:'PUT',body:{status:'LOCKED'},status:409});
  await request(`/accounts/${lt.id}`,{token:A,method:'PUT',body:{status:'LOCKED'}});await request('/members',{token:L,status:401});
  assert((await db.query('SELECT count(*)::int n FROM audit_logs')).rows[0].n>10);
  console.log('PASS notification configuration/delivery, consent persistence, honest devices, reports and account revocation');
  // Restore only the isolated staff fixture for mobile contract cases.
  await db.query("UPDATE accounts SET status='ACTIVE' WHERE id=$1",[lt.id]);
  const mobileStaff=await login(lt);
  await require('./payment-ledger.cases')({request,db,A,L:mobileStaff,M,O,m,pkg,b1,b2,day,shift});
  await require('./commission-snapshot.cases')({request,db,A,P,pt,m,ptr,completed});
  await require('./mobile-refactor.cases')({request,db,A,L:mobileStaff,M,P,m,pt,ptr,pkg,b1,b2,password,day,shift});
  console.log(`PASS ${checks} HTTP checks against isolated PostgreSQL database; configured DB untouched`);
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(server)await new Promise(resolve=>server.close(resolve));
  if(pool)await pool.end();if(db)await db.end();
  if(databaseCreated&&/^paradise_test_\d+_\d+$/.test(dbName))await admin.query(`DROP DATABASE "${dbName}"`);
  if(path.dirname(avatarDirectory)===path.resolve(os.tmpdir())&&path.basename(avatarDirectory)===`avatars_${dbName}`)fs.rmSync(avatarDirectory,{recursive:true,force:true});
  await admin.end();
});

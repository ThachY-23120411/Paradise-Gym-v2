const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');

module.exports=async function mobileCases({request,db,A,L,M,P,m,pt,ptr,pkg,b1,b2,password,day,shift}){
  const member=(body={},method='GET',url='/mobile/preferences',status=200)=>request(url,{token:M,method,body:method==='GET'?undefined:body,status});
  const trainer=(body={},method='GET',url='/mobile/preferences',status=200)=>request(url,{token:P,method,body:method==='GET'?undefined:body,status});
  const initial=await member();assert.deepEqual(initial,{notify_in_app:true,notify_pt_reminders:true,is_two_factor_enabled:false});
  assert.deepEqual(await trainer(),{notify_new_bookings:true,notify_result_reminders:true,is_two_factor_enabled:false,show_phone_to_members:false});
  await member({notify_new_bookings:false},'PUT','/mobile/preferences',400);
  await trainer({notify_in_app:false},'PUT','/mobile/preferences',400);
  await member({notify_in_app:'false'},'PUT','/mobile/preferences',400);
  await member({is_two_factor_enabled:1},'PUT','/auth/security',400);
  assert.deepEqual(await member(),initial);
  const saved=await member({notify_pt_reminders:false,is_two_factor_enabled:true},'PUT');assert.equal(saved.notify_pt_reminders,false);assert.equal(saved.is_two_factor_enabled,true);
  assert.equal((await member({},'GET','/mobile/profile')).preferences.notify_pt_reminders,false);
  assert.equal((await member({},'GET','/auth/me')).is_two_factor_enabled,true);
  assert.equal((await db.query('SELECT is_two_factor_enabled FROM accounts WHERE id=$1',[m.account_id])).rows[0].is_two_factor_enabled,true);
  const twoFactor=await request('/auth/login-password',{method:'POST',body:{login_phone:m.phone,password,active_role:'MEMBER'}});assert.equal(twoFactor.requires_2fa,true);
  await request('/mobile/profile',{token:twoFactor.temp_token,status:401});
  const secondFactor=await request('/auth/verify-2fa',{method:'POST',body:{temp_token:twoFactor.temp_token,otp_code:twoFactor.dev_otp}});assert(secondFactor.access_token);
  const oneSms=await request('/auth/request-otp',{method:'POST',body:{login_phone:m.phone,active_role:'MEMBER'}});
  const passwordless=await request('/auth/login-otp',{method:'POST',body:{login_phone:m.phone,otp_code:oneSms.dev_otp,active_role:'MEMBER'}});assert.equal(passwordless.requires_2fa,false);assert(passwordless.access_token);
  await member({notify_pt_reminders:true,is_two_factor_enabled:false},'PUT');
  await request('/auth/login-password',{method:'POST',body:{login_phone:pt.pt_code,password,active_role:'MEMBER'},status:401});
  assert((await request('/auth/login-password',{method:'POST',body:{login_phone:pt.pt_code,password,active_role:'PT'}})).access_token);

  // Verify certificates field is removed / rejected and PT self-edit forbidden
  await request(`/pt-bookings/trainers/${pt.id}`,{token:A,method:'PUT',body:{specialties:'Cardio & Thể hình',bio:'HLV chuyên nghiệp'}});
  const trainerProfile = await trainer({},'GET','/mobile/profile');
  assert.equal(trainerProfile.certificates, undefined);
  await request(`/pt-bookings/trainers/${pt.id}`,{token:P,method:'PUT',body:{specialties:'Self edit'},status:403});
  let listing=await request('/pt-bookings/trainers',{token:M});assert.equal(listing.find(p=>p.id===pt.id).phone,null);
  assert.equal((await request(`/pt-bookings/trainers/${pt.id}`,{token:M})).phone,null);
  assert.equal((await request(`/pt-bookings/trainers/${pt.id}`,{token:P})).phone,pt.phone);
  assert.equal(listing.find(p=>p.id===pt.id).certificates, undefined);
  assert.equal((await request(`/registrations/${ptr.id}`,{token:M})).assigned_pt.phone,null);
  await trainer({show_phone_to_members:true},'PUT');
  assert.equal((await request('/pt-bookings/trainers',{token:M})).find(p=>p.id===pt.id).phone,pt.phone);
  assert.equal((await request(`/registrations/${ptr.id}`,{token:M})).assigned_pt.phone,pt.phone);

  async function newMember(tel){
    const person=await request('/members',{token:L,method:'POST',body:{full_name:'Mobile isolated member',phone:tel,home_branch_id:b1}});
    const lookup=await request('/auth/activation-lookup',{method:'POST',body:{identifier:tel,active_role:'MEMBER'}});
    assert(lookup.can_activate);assert(!('full_name' in lookup));assert(!('branch_name' in lookup));assert(!('phone' in lookup));assert(!('id' in lookup));
    const challenge=await request('/auth/request-otp',{method:'POST',body:{login_phone:tel,active_role:'MEMBER'}});
    await request('/auth/login-otp',{method:'POST',body:{login_phone:tel,otp_code:challenge.dev_otp,password:'short',active_role:'MEMBER'},status:400});
    const session=await request('/auth/login-otp',{method:'POST',body:{login_phone:tel,otp_code:challenge.dev_otp,password:'Abc123',active_role:'MEMBER'}});
    return {person,session};
  }
  const other=await newMember('0909000080'),N=other.session.access_token;
  assert.equal((await request('/pt-bookings/trainers',{token:N})).find(p=>p.id===pt.id).phone,null);
  await request(`/members/${m.id}`,{token:N,status:403});
  await request(`/pt-bookings/available-slots?pt_id=${pt.id}&date=${day()}`,{token:N,status:403});
  await trainer({show_phone_to_members:false},'PUT');
  const available=await request(`/pt-bookings/available-slots?pt_id=${pt.id}&date=${day()}`,{token:M});assert.equal(available.pt.phone,null);assert(!JSON.stringify(available.slots).includes(m.id));
  await db.query('UPDATE member_profiles SET home_branch_id=$2 WHERE id=$1',[m.id,b2]);
  assert((await request('/members?limit=1000',{token:P})).items.some(item=>item.id===m.id));
  await db.query('UPDATE member_profiles SET home_branch_id=$2 WHERE id=$1',[m.id,b1]);
  await request('/mobile/pt/statistics',{token:M,status:403});
  for(const period of ['week','month','last_month']){
    const stats=await request(`/mobile/pt/statistics?period=${period}`,{token:P});assert.equal(stats.period,period);
    assert.equal(Object.keys(stats.metrics).length,5);assert(Object.values(stats.metrics).every(v=>Number.isInteger(v)&&v>=0));
    const expected=(await db.query("SELECT count(*)::int n FROM pt_bookings WHERE pt_id=$1 AND status='COMPLETED' AND pt_confirmed_at IS NOT NULL AND member_confirmed_at IS NOT NULL AND booking_date BETWEEN $2 AND $3",[pt.id,stats.start_date,stats.end_date])).rows[0].n;
    assert.equal(stats.metrics.completed_sessions,expected);
  }
  await request('/mobile/pt/statistics?period=other',{token:P,status:400});
  console.log('PASS Mobile role-scoped settings/2FA, PT-code auth, phone privacy, cross-home-branch students and actual statistics');

  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZgAAAABJRU5ErkJggg==';
  await request('/mobile/avatar',{method:'POST',body:{content_base64:png,mime_type:'image/png'},status:401});
  const ptAvatar = await request('/mobile/avatar',{token:P,method:'POST',body:{content_base64:png,mime_type:'image/png'}});
  assert.equal((await request('/mobile/profile',{token:P})).avatar_url,ptAvatar.avatar_url);
  await request('/mobile/avatar',{token:N,method:'POST',body:{content_base64:Buffer.from('<svg/>').toString('base64'),mime_type:'image/png'},status:400});
  const uploaded=await request('/mobile/avatar',{token:N,method:'POST',body:{content_base64:png,mime_type:'image/png'}});
  const image=await fetch(uploaded.avatar_url);assert.equal(image.status,200);assert.equal(image.headers.get('x-content-type-options'),'nosniff');assert.equal(image.headers.get('content-type'),'image/png');
  assert.equal((await request('/mobile/profile',{token:N})).avatar_url,uploaded.avatar_url);
  const avatarDb=(await db.query('SELECT avatar_url FROM member_profiles WHERE id=$1',[other.person.id])).rows[0].avatar_url;assert.equal(avatarDb,uploaded.avatar_url);assert(!avatarDb.startsWith('data:'));
  await request(`/members/${other.person.id}`,{token:N,method:'PUT',body:{avatar_url:'javascript:alert(1)'},status:400});
  await request(`/members/${other.person.id}`,{token:N,method:'PUT',body:{phone:'0909000081'},status:400});
  await request('/auth/request-phone-change',{token:N,method:'POST',body:{new_phone:m.phone},status:409});
  await request('/auth/request-phone-change',{token:P,method:'POST',body:{new_phone:'0909000081'},status:403});
  const phoneChallenge=await request('/auth/request-phone-change',{token:N,method:'POST',body:{new_phone:'0909000081'}});
  await request('/auth/confirm-phone-change',{token:N,method:'POST',body:{new_phone:'0909000082',otp_code:phoneChallenge.dev_otp,challenge_token:phoneChallenge.challenge_token},status:401});
  await request('/auth/confirm-phone-change',{token:M,method:'POST',body:{new_phone:'0909000081',otp_code:phoneChallenge.dev_otp,challenge_token:phoneChallenge.challenge_token},status:401});
  await request('/auth/confirm-phone-change',{token:N,method:'POST',body:{new_phone:'0909000081',otp_code:'wrong',challenge_token:phoneChallenge.challenge_token},status:400});
  const changed=await request('/auth/confirm-phone-change',{token:N,method:'POST',body:{new_phone:'0909000081',otp_code:phoneChallenge.dev_otp,challenge_token:phoneChallenge.challenge_token}});
  assert.equal(changed.user.phone,'0909000081');
  assert.equal((await db.query('SELECT phone FROM member_profiles WHERE id=$1',[other.person.id])).rows[0].phone,'0909000081');
  await request('/auth/me',{token:N,status:401});
  await request('/auth/refresh-token',{method:'POST',body:{refresh_token:other.session.refresh_token},status:401});
  await request('/auth/confirm-phone-change',{token:changed.access_token,method:'POST',body:{new_phone:'0909000081',otp_code:phoneChallenge.dev_otp,challenge_token:phoneChallenge.challenge_token},status:401});
  await request('/auth/login-password',{method:'POST',body:{login_phone:other.person.phone,password:'Abc123'},status:401});
  assert((await request('/auth/login-password',{method:'POST',body:{login_phone:'0909000081',password:'Abc123'}})).access_token);
  const passwordChange=await request('/auth/change-password',{token:changed.access_token,method:'POST',body:{current_password:'Abc123',new_password:'Updated-Pass8'}});
  await request('/auth/me',{token:changed.access_token,status:401});
  await request('/auth/login-password',{method:'POST',body:{login_phone:'0909000081',password:'Abc123'},status:401});
  assert((await request('/auth/login-password',{method:'POST',body:{login_phone:'0909000081',password:'Updated-Pass8'}})).access_token);
  await request('/auth/change-password',{token:passwordChange.access_token,method:'POST',body:{current_password:'Updated-Pass8',new_password:'x'.repeat(73)},status:400});
  const before=(await db.query('SELECT password_hash FROM accounts WHERE id=$1',[other.person.account_id])).rows[0].password_hash;
  for(let i=0;i<5;i++)await request('/auth/change-password',{token:passwordChange.access_token,method:'POST',body:{current_password:'Wrong-password',new_password:'DontSave-Pass9'},status:400});
  await request('/auth/change-password',{token:passwordChange.access_token,method:'POST',body:{current_password:'Updated-Pass8',new_password:'DontSave-Pass9'},status:423});
  assert.equal((await db.query('SELECT password_hash FROM accounts WHERE id=$1',[other.person.account_id])).rows[0].password_hash,before);
  const audits=(await db.query("SELECT new_values,old_values FROM audit_logs WHERE target_table='accounts'")).rows;
  assert(!JSON.stringify(audits).includes('password_hash'));assert(!JSON.stringify(audits).includes('otp_hash'));assert(!JSON.stringify(audits).includes('Updated-Pass8'));
  console.log('PASS Mobile avatar binary upload/persistence, target-bound OTP phone change, uniqueness, stale-token rejection and server password lockout');

  const capped=await request('/members',{token:L,method:'POST',body:{full_name:'OTP isolated test',phone:'0909000083',home_branch_id:b1}});
  let last;
  for(let i=0;i<4;i++){
    if(i)await db.query("UPDATE accounts SET otp_expires_at=NOW()-interval '1 second' WHERE id=$1",[capped.account_id]);
    last=await request('/auth/request-otp',{method:'POST',body:{login_phone:capped.phone,active_role:'MEMBER'}});assert.equal(last.resends_remaining,3-i);
    await request('/auth/request-otp',{method:'POST',body:{login_phone:capped.phone,active_role:'MEMBER'},status:429});
  }
  await db.query("UPDATE accounts SET otp_expires_at=NOW()-interval '1 second' WHERE id=$1",[capped.account_id]);
  const limit=await request('/auth/request-otp',{method:'POST',body:{login_phone:capped.phone},status:429});assert.equal(limit.code,'OTP_RESEND_LIMIT');
  await request('/auth/login-otp',{method:'POST',body:{login_phone:capped.phone,otp_code:last.dev_otp,password:'Abc123'},status:400});
  assert.equal((await db.query('SELECT status FROM accounts WHERE id=$1',[capped.account_id])).rows[0].status,'PENDING_ACTIVATION');
  for(let i=0;i<4;i++)await request('/auth/login-otp',{method:'POST',body:{login_phone:capped.phone,otp_code:'wrong',password:'Abc123'},status:400});
  await request('/auth/login-otp',{method:'POST',body:{login_phone:capped.phone,otp_code:last.dev_otp,password:'Abc123'},status:423});
  const pendingPT=await request('/pt-bookings/trainers',{token:A,method:'POST',body:{full_name:'Mobile isolated trainer',phone:'0909000084',branch_id:b1}});
  await request(`/pt-bookings/trainers/${pendingPT.id}`,{token:P,status:404});
  assert((await request('/pt-bookings/trainers',{token:P})).every(row=>row.id===pt.id));
  const ptLookup=await request('/auth/activation-lookup',{method:'POST',body:{identifier:pendingPT.pt_code,active_role:'PT'}});assert(ptLookup.can_activate);assert(!('full_name' in ptLookup));
  const ptChallenge=await request('/auth/request-otp',{method:'POST',body:{login_phone:pendingPT.pt_code,active_role:'PT'}});
  await request('/auth/login-otp',{method:'POST',body:{login_phone:pendingPT.pt_code,otp_code:ptChallenge.dev_otp,password:'abcdefgh',active_role:'PT'},status:400});
  assert((await request('/auth/login-otp',{method:'POST',body:{login_phone:pendingPT.pt_code,otp_code:ptChallenge.dev_otp,password:'Strong88',active_role:'PT'}})).access_token);
  console.log('PASS server OTP initial+3 resend cap, cooldown, expired challenge and no accidental activation');

  async function booking(start,status='BOOKED'){
    const local=new Date(start.getTime()+7*3600000).toISOString(),end=new Date(start.getTime()+9*3600000).toISOString();
    const row=(await db.query('INSERT INTO pt_bookings(registration_id,member_id,pt_id,branch_id,booking_date,start_time,end_time,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[ptr.id,m.id,pt.id,b1,local.slice(0,10),local.slice(11,19),end.slice(11,19),status])).rows[0];
    await db.query('UPDATE registrations SET booked_pt_sessions=booked_pt_sessions+1,remaining_pt_sessions=remaining_pt_sessions-1 WHERE id=$1',[ptr.id]);return row;
  }
  const late=await booking(new Date(Date.now()+3*3600000));
  await request(`/pt-bookings/${late.id}/cancel`,{token:P,method:'POST',body:{reason:'PT cannot cancel'},status:403});
  const counters=(await db.query('SELECT used_pt_sessions,remaining_pt_sessions,booked_pt_sessions FROM registrations WHERE id=$1',[ptr.id])).rows[0];
  const denied=await request(`/pt-bookings/${late.id}/cancel`,{token:M,method:'POST',body:{reason:'Health'},status:409});assert.equal(denied.code,'LATE_CANCELLATION_CONFIRMATION_REQUIRED');
  assert.deepEqual((await db.query('SELECT used_pt_sessions,remaining_pt_sessions,booked_pt_sessions FROM registrations WHERE id=$1',[ptr.id])).rows[0],counters);
  const cancelled=await request(`/pt-bookings/${late.id}/cancel`,{token:M,method:'POST',body:{reason:'Health',accept_late_fee:true}});assert.equal(cancelled.booking.status,'CANCELLED');assert.equal(cancelled.booking.is_deducted,true);assert.equal(cancelled.refunded,false);
  const after=(await db.query('SELECT used_pt_sessions,remaining_pt_sessions,booked_pt_sessions FROM registrations WHERE id=$1',[ptr.id])).rows[0];assert.equal(after.used_pt_sessions,counters.used_pt_sessions+1);assert.equal(after.remaining_pt_sessions,counters.remaining_pt_sessions);assert.equal(after.booked_pt_sessions,counters.booked_pt_sessions-1);
  await request(`/pt-bookings/${late.id}/cancel`,{token:M,method:'POST',body:{reason:'Again',accept_late_fee:true},status:409});
  const early=await booking(new Date(Date.now()+5*3600000));
  await request(`/pt-bookings/${early.id}/cancel`,{token:M,method:'POST',body:{},status:400});
  assert.equal((await request(`/pt-bookings/${early.id}/cancel`,{token:M,method:'POST',body:{reason:'Work'}})).refunded,true);
  const past=await booking(new Date(`${shift(day(),-2)}T08:00:00+07:00`));
  await request(`/pt-bookings/${past.id}/member-confirm`,{token:M,method:'POST',body:{workout_notes:'Forged'},status:400});
  await request(`/pt-bookings/${past.id}/pt-confirm`,{token:P,method:'POST',body:{workout_notes:'Actual PT note',fitness_assessment:'Actual assessment'}});
  await request(`/pt-bookings/${past.id}/pt-confirm`,{token:P,method:'POST',body:{workout_notes:'Overwrite'},status:409});
  const done=await request(`/pt-bookings/${past.id}/member-confirm`,{token:M,method:'POST',body:{}});assert(done.is_completed);assert.equal(done.booking.workout_notes,'Actual PT note');
  await request(`/pt-bookings/${past.id}/member-confirm`,{token:M,method:'POST',body:{},status:409});
  console.log('PASS 4h cancellation/explicit late-fee acknowledgement and exact-once participant-owned result confirmation');

  const {runScheduledNotifications}=require('../src/modules/core/jobs');
  const {emit}=require('../src/modules/core/notifications');
  const {transaction}=require('../src/db/postgres');
  async function configure(event,roles=['MEMBER','PT'],enabled=true){
    const t=await request('/notifications/templates',{token:A,branch:b1,method:'POST',body:{template_name:`Mobile ${event}`,event_code:event,title_template:'Event {{member_name}}',body_template:'Actual configured content'}});
    await request('/notifications/rules',{token:A,branch:b1,method:'PUT',body:{event_code:event,template_id:t.id,recipient_roles:roles,recipient_modes:['DIRECT'],is_active:enabled}});return t;
  }
  const scheduled=await booking(new Date(`${shift(day(),3)}T12:00:00+07:00`));
  await configure('BOOKING_REMINDER');
  const at=minutes=>new Date(new Date(`${scheduled.booking_date}T12:00:00+07:00`).getTime()-minutes*60000);
  await member({notify_pt_reminders:false},'PUT');await runScheduledNotifications(at(90));
  assert.equal((await db.query("SELECT count(*)::int n FROM notifications WHERE reference_id=$1 AND event_type='BOOKING_REMINDER'",[scheduled.id])).rows[0].n,0);
  await member({notify_pt_reminders:true},'PUT');
  await runScheduledNotifications(at(90));
  let notices=(await db.query("SELECT * FROM notifications WHERE reference_id=$1 AND event_type='BOOKING_REMINDER'",[scheduled.id])).rows;assert.equal(notices.length,1);assert.equal(notices[0].account_id,m.account_id);
  await runScheduledNotifications(at(45));assert.equal((await db.query("SELECT count(*)::int n FROM notifications WHERE reference_id=$1 AND event_type='BOOKING_REMINDER'",[scheduled.id])).rows[0].n,1);
  await runScheduledNotifications(at(20));await runScheduledNotifications(at(19));
  notices=(await db.query("SELECT * FROM notifications WHERE reference_id=$1 AND event_type='BOOKING_REMINDER'",[scheduled.id])).rows;assert.equal(notices.length,2);assert(notices.some(n=>n.account_id===pt.account_id));
  await configure('BOOKING_CREATED');await configure('PT_SESSION_AWAITING_CONFIRMATION');
  await trainer({notify_new_bookings:false,notify_result_reminders:false},'PUT');
  for(const event of ['BOOKING_CREATED','PT_SESSION_AWAITING_CONFIRMATION'])assert.equal(await transaction(db=>emit(db,{event,branchId:b1,referenceId:randomUUID(),referenceType:'PT_BOOKING',accounts:[pt.account_id],variables:{member_name:m.full_name}})),0);
  await trainer({notify_new_bookings:true,notify_result_reminders:true},'PUT');
  assert.equal(await transaction(db=>emit(db,{event:'BOOKING_CREATED',branchId:b1,referenceId:randomUUID(),referenceType:'PT_BOOKING',accounts:[pt.account_id],variables:{member_name:m.full_name}})),1);
  await db.query('UPDATE member_profiles SET date_of_birth=$2 WHERE id=$1',[m.id,'2000'+day().slice(4)]);
  const birthdayNow=new Date(`${day()}T00:01:00+07:00`);
  const birthdayCount=async()=>Number((await db.query("SELECT count(*) FROM notifications WHERE account_id=$1 AND event_type='MEMBER_BIRTHDAY'",[m.account_id])).rows[0].count);
  await runScheduledNotifications(birthdayNow);assert.equal(await birthdayCount(),0);
  const birthdayTemplate=await configure('MEMBER_BIRTHDAY',['MEMBER'],false);
  await runScheduledNotifications(birthdayNow);assert.equal(await birthdayCount(),0);
  await request('/notifications/rules',{token:A,branch:b1,method:'PUT',body:{event_code:'MEMBER_BIRTHDAY',is_active:true}});
  await request(`/notifications/templates/${birthdayTemplate.id}`,{token:A,method:'PUT',body:{is_active:false}});
  await runScheduledNotifications(birthdayNow);assert.equal(await birthdayCount(),0);
  await request(`/notifications/templates/${birthdayTemplate.id}`,{token:A,method:'PUT',body:{is_active:true}});
  await member({notify_in_app:false},'PUT');await runScheduledNotifications(birthdayNow);assert.equal(await birthdayCount(),0);
  await member({notify_in_app:true},'PUT');await runScheduledNotifications(birthdayNow);assert.equal(await birthdayCount(),1);
  await runScheduledNotifications(birthdayNow);assert.equal(await birthdayCount(),1);
  await runScheduledNotifications(new Date(`${shift(day(),1)}T00:01:00+07:00`));assert.equal(await birthdayCount(),1);
  await db.query('UPDATE registrations SET end_date=$2 WHERE id=$1',[ptr.id,day()]);
  await runScheduledNotifications(birthdayNow);
  assert.equal((await db.query("SELECT count(*)::int n FROM notifications WHERE reference_id=$1 AND event_key=$2",[ptr.id,`PACKAGE_EXPIRING:${ptr.id}:${day()}:0`])).rows[0].n,1);
  const inbox=await request('/notifications',{token:M});const birthday=inbox.find(n=>n.event_type==='MEMBER_BIRTHDAY');assert(birthday);
  await request(`/notifications/${birthday.id}/read`,{token:P,method:'PUT',status:404});
  await request('/notifications/read-all',{token:M,method:'PUT'});assert.equal((await request('/notifications',{token:M})).filter(n=>!n.is_read).length,0);
  console.log('PASS DOB birthday: no rule/OFF/inactive template/opt-out suppress, daily dedup; HV1-2h vs PT15-30min reminders and user preferences');

  const env=require('../src/config/env'),bank=env.BANK_ACCOUNT_NO;
  const unpaid=await request('/registrations',{token:M,method:'POST',body:{member_id:m.id,package_id:pkg.id,start_date:day()}});
  try{
    env.BANK_ACCOUNT_NO='';
    const response=await request('/payments/create-invoice',{token:M,method:'POST',body:{registration_id:unpaid.id,payment_method:'BANK_TRANSFER'},status:503});assert.equal(response.code,'BANK_CONFIGURATION_REQUIRED');
    assert.equal((await db.query('SELECT count(*)::int n FROM payments WHERE registration_id=$1',[unpaid.id])).rows[0].n,0);
  }finally{env.BANK_ACCOUNT_NO=bank;}
  await db.query(fs.readFileSync(path.join(__dirname,'../src/db/migrations/003_mobile_preferences.sql'),'utf8'));
  await db.query(fs.readFileSync(path.join(__dirname,'../src/db/migrations/005_remove_pt_certificates.sql'),'utf8'));
  assert.equal((await trainer({},'GET','/mobile/profile')).certificates, undefined);
  console.log('PASS explicit bank configuration/no invented beneficiary, rollback and idempotent approved migration');

  // Device Registry & Session Management (Decision 2)
  const memberLogin = await request('/auth/login-password', { method: 'POST', body: { login_phone: m.phone, password, active_role: 'MEMBER' } });
  const mToken = memberLogin.access_token;
  const sessions = await request('/auth/sessions', { token: mToken });
  assert(Array.isArray(sessions) && sessions.length >= 1);
  const currentSession = sessions.find(s => s.is_current);
  assert(currentSession);
  assert.equal(currentSession.is_revoked, false);

  // Login second device
  const secondLogin = await request('/auth/login-password', { method: 'POST', body: { login_phone: m.phone, password, active_role: 'MEMBER', device_name: 'Secondary iPad' } });
  const secondToken = secondLogin.access_token;
  const sessionsAfterSecond = await request('/auth/sessions', { token: secondToken });
  assert(sessionsAfterSecond.length >= 2);
  const secondSessObj = sessionsAfterSecond.find(s => s.device_name === 'Secondary iPad');
  assert(secondSessObj);

  // Revoke specific session
  await request(`/auth/sessions/${secondSessObj.id}`, { token: mToken, method: 'DELETE' });
  await request('/auth/me', { token: secondToken, status: 401 });

  // Logout current session
  await request('/auth/logout-current', { token: mToken, method: 'POST' });
  await request('/auth/me', { token: mToken, status: 401 });

  // Login again and test logout-all
  const relogin1 = await request('/auth/login-password', { method: 'POST', body: { login_phone: m.phone, password, active_role: 'MEMBER' } });
  const relogin2 = await request('/auth/login-password', { method: 'POST', body: { login_phone: m.phone, password, active_role: 'MEMBER' } });
  await request('/auth/logout-all', { token: relogin1.access_token, method: 'POST' });
  await request('/auth/me', { token: relogin1.access_token, status: 401 });
  await request('/auth/me', { token: relogin2.access_token, status: 401 });
  console.log('PASS Device registry: GET /auth/sessions, DELETE session, logout-current, logout-all');

  // Member Self-Registration & Public Branch Selection (HV06-US03)
  const publicBranches = await request('/branches?status=ACTIVE');
  assert(Array.isArray(publicBranches) && publicBranches.length >= 1);
  const targetBranch = publicBranches[0];

  // Try duplicate phone signup-otp
  await request('/auth/signup-otp', {
    method: 'POST',
    body: {
      login_phone: m.phone,
      full_name: 'Nguyễn Trùng Lặp',
      home_branch_id: targetBranch.id,
      password: 'Password123'
    },
    status: 409
  });

  // Try invalid branch
  await request('/auth/signup-otp', {
    method: 'POST',
    body: {
      login_phone: '0933112233',
      full_name: 'Khách Hàng Mới',
      home_branch_id: randomUUID(),
      password: 'Password123'
    },
    status: 400
  });

  // Valid signup OTP request
  const newPhone = '0933112233';
  const signupOtpRes = await request('/auth/signup-otp', {
    method: 'POST',
    body: {
      login_phone: newPhone,
      full_name: 'Khách Hàng Tự Đăng Ký',
      home_branch_id: targetBranch.id,
      email: 'khachmoi@paradise.test',
      password: 'Password123'
    }
  });
  assert(signupOtpRes.signup_token);
  assert(signupOtpRes.dev_otp);

  // Invalid OTP code
  await request('/auth/signup', {
    method: 'POST',
    body: {
      signup_token: signupOtpRes.signup_token,
      otp_code: '000000'
    },
    status: 400
  });

  // Successful signup
  const signupResult = await request('/auth/signup', {
    method: 'POST',
    body: {
      signup_token: signupOtpRes.signup_token,
      otp_code: signupOtpRes.dev_otp,
      device_name: 'iPhone 15 Pro Max'
    }
  });
  assert(signupResult.access_token);
  assert(signupResult.user);
  assert.equal(signupResult.user.role, 'MEMBER');
  assert.equal(signupResult.user.phone, newPhone);
  assert.deepEqual(signupResult.user.branch_ids, [targetBranch.id]);

  // Login with newly created credentials
  const newMemberLogin = await request('/auth/login-password', {
    method: 'POST',
    body: {
      login_phone: newPhone,
      password: 'Password123',
      active_role: 'MEMBER'
    }
  });
  assert(newMemberLogin.access_token);

  // Verify profile detail
  const newMemberProfile = await request(`/members/${signupResult.user.member_profile_id}`, {
    token: newMemberLogin.access_token
  });
  assert.equal(newMemberProfile.phone, newPhone);
  assert.equal(newMemberProfile.full_name, 'Khách Hàng Tự Đăng Ký');
  assert.equal(newMemberProfile.home_branch_id, targetBranch.id);
  assert(/^HV\d+$/.test(newMemberProfile.member_code));
  console.log('PASS Member self-registration with branch selection, OTP validation and login (HV06-US03)');
};

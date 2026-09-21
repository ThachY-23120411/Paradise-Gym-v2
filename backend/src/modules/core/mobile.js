const express=require('express');
const {pool,route,role,choice,today,addDays,fail,only,audit,date}=require('./http');
const {transaction}=require('../../db/postgres');
const router=express.Router();
const preferenceFields={MEMBER:['notify_in_app','notify_pt_reminders'],PT:['notify_new_bookings','notify_result_reminders']};
async function preferences(req,db=pool){
  role(req,'MEMBER','PT');
  const fields=preferenceFields[req.user.active_role];
  const value=(await db.query(`SELECT ${fields.join(',')},is_two_factor_enabled FROM accounts WHERE id=$1`,[req.user.account_id])).rows[0];
  if(req.user.active_role==='PT')value.show_phone_to_members=(await db.query('SELECT show_phone_to_members FROM pt_profiles WHERE id=$1',[req.user.pt_profile_id])).rows[0].show_phone_to_members;
  return value;
}
router.get('/mobile/preferences',route(req=>preferences(req)));
router.put('/mobile/preferences',route(async req=>{
  role(req,'MEMBER','PT');
  const fields=[...preferenceFields[req.user.active_role],'is_two_factor_enabled'];
  only(req.body,[...fields,...(req.user.active_role==='PT'?['show_phone_to_members']:[])]);
  if(!Object.keys(req.body).length||Object.values(req.body).some(v=>typeof v!=='boolean'))fail(400,'Cài đặt phải là giá trị bật/tắt hợp lệ.');
  return transaction(async db=>{
    await db.query('SELECT id FROM accounts WHERE id=$1 FOR UPDATE',[req.user.account_id]);
    const before=await preferences(req,db),changed=fields.filter(f=>Object.hasOwn(req.body,f));
    if(changed.length)await db.query(`UPDATE accounts SET ${changed.map((f,i)=>`${f}=$${i+2}`).join(',')},updated_at=NOW() WHERE id=$1`,[req.user.account_id,...changed.map(f=>req.body[f])]);
    if(Object.hasOwn(req.body,'show_phone_to_members'))await db.query('UPDATE pt_profiles SET show_phone_to_members=$2,updated_at=NOW() WHERE id=$1',[req.user.pt_profile_id,req.body.show_phone_to_members]);
    const saved=await preferences(req,db);await audit(db,req,'accounts',req.user.account_id,'MOBILE_PREFERENCES_UPDATED',before,saved,req.user.branch_ids[0]);return saved;
  });
}));

router.get('/mobile/profile',route(async req=>{
  role(req,'MEMBER','PT');
  const member=req.user.active_role==='MEMBER';
  const profile=(await pool.query(member?
    'SELECT m.*,b.branch_name home_branch_name,COALESCE(m.avatar_url,a.avatar_url) avatar_url,a.is_two_factor_enabled FROM member_profiles m JOIN branches b ON b.id=m.home_branch_id JOIN accounts a ON a.id=m.account_id WHERE m.account_id=$1':
    'SELECT p.*,b.branch_name,a.avatar_url,a.is_two_factor_enabled FROM pt_profiles p JOIN branches b ON b.id=p.branch_id JOIN accounts a ON a.id=p.account_id WHERE p.account_id=$1',[req.user.account_id])).rows[0];
  if(!profile)fail(404,'Không tìm thấy hồ sơ cá nhân.','PROFILE_NOT_FOUND');
  return {...profile,preferences:await preferences(req)};
}));

router.put('/mobile/profile',route(async req=>{
  role(req,'MEMBER','PT');
  if(req.user.active_role==='PT'){
    only(req.body,['email','bio','specialties']);
    for(const [field,limit] of [['email',150],['bio',1000],['specialties',500]]) {
      const value=req.body[field];
      if(value!==undefined&&value!==null&&(typeof value!=='string'||value.length>limit))fail(400,`${field} phải là văn bản tối đa ${limit} ký tự.`);
    }
    return transaction(async db=>{
      const old=(await db.query('SELECT * FROM pt_profiles WHERE id=$1 FOR UPDATE',[req.user.pt_profile_id])).rows[0];
      if(!old)fail(404,'Không tìm thấy hồ sơ HLV.');
      let nextEmail=old.email;
      if(req.body.email!==undefined){
        if(req.body.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email))fail(400,'Email liên hệ không hợp lệ.');
        nextEmail=req.body.email?String(req.body.email).trim().slice(0,150):null;
      }
      let nextBio=old.bio;
      if(req.body.bio!==undefined){
        if(req.body.bio&&req.body.bio.length>1000)fail(400,'Nội dung giới thiệu không được vượt quá 1.000 ký tự.');
        nextBio=req.body.bio?String(req.body.bio).trim():null;
      }
      let nextSpecialties=old.specialties;
      if(req.body.specialties!==undefined){
        if(req.body.specialties&&req.body.specialties.length>500)fail(400,'Chuyên môn không được vượt quá 500 ký tự.');
        nextSpecialties=req.body.specialties?String(req.body.specialties).trim():null;
      }
      const updated=(await db.query(
        'UPDATE pt_profiles SET email=$2,bio=$3,specialties=$4,updated_at=NOW() WHERE id=$1 RETURNING *',
        [old.id,nextEmail,nextBio,nextSpecialties]
      )).rows[0];
      await audit(db,req,'pt_profiles',old.id,'PT_PROFILE_UPDATED',old,updated,old.branch_id);
      return updated;
    });
  }else{
    only(req.body,['email','gender','date_of_birth']);
    return transaction(async db=>{
      const old=(await db.query('SELECT * FROM member_profiles WHERE id=$1 FOR UPDATE',[req.user.member_profile_id])).rows[0];
      if(!old)fail(404,'Không tìm thấy hồ sơ hội viên.');
      let nextEmail=old.email;
      if(req.body.email!==undefined){
        if(req.body.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email))fail(400,'Email không hợp lệ.');
        nextEmail=req.body.email?String(req.body.email).trim().slice(0,150):null;
      }
      let nextGender=req.body.gender!==undefined?choice(req.body.gender,['NAM','NU','KHAC','MALE','FEMALE','OTHER'],'gender'):old.gender;
      let nextDob=req.body.date_of_birth!==undefined?(req.body.date_of_birth?date(req.body.date_of_birth):null):old.date_of_birth;
      if(nextDob&&nextDob>today())fail(400,'Ngày sinh không thể ở tương lai.');
      const updated=(await db.query(
        'UPDATE member_profiles SET email=$2,gender=$3,date_of_birth=$4,updated_at=NOW() WHERE id=$1 RETURNING *',
        [old.id,nextEmail,nextGender,nextDob]
      )).rows[0];
      await audit(db,req,'member_profiles',old.id,'MEMBER_PROFILE_UPDATED',old,updated,old.home_branch_id);
      return updated;
    });
  }
}));

router.get('/mobile/pt/statistics',route(async req=>{
  role(req,'PT');
  const period=choice(req.query.period||'month',['week','month','last_month'],'period');
  const now=today(),year=Number(now.slice(0,4)),month=Number(now.slice(5,7));
  let start,end;
  if(period==='week'){
    const weekday=new Date(`${now}T12:00:00Z`).getUTCDay();
    start=addDays(now,-((weekday+6)%7));end=addDays(start,6);
  }else{
    const first=new Date(Date.UTC(year,month-1-(period==='last_month'?1:0),1));
    start=first.toISOString().slice(0,10);end=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).toISOString().slice(0,10);
  }
  const result=(await pool.query(`SELECT
    (SELECT count(DISTINCT r.member_id)::int FROM registrations r JOIN member_profiles m ON m.id=r.member_id
      WHERE r.assigned_pt_id=$1 AND m.status='ACTIVE' AND r.status IN ('ACTIVE','SCHEDULED','EXPIRED') AND r.start_date<=$3::date AND (r.end_date IS NULL OR r.end_date>=$2::date)
      AND EXISTS(SELECT 1 FROM payments p WHERE p.registration_id=r.id)) active_students,
    count(*) FILTER(WHERE bk.status='COMPLETED' AND bk.pt_confirmed_at IS NOT NULL AND bk.member_confirmed_at IS NOT NULL)::int completed_sessions,
    count(*) FILTER(WHERE bk.status='BOOKED' AND (bk.booking_date+bk.start_time) AT TIME ZONE b.timezone>NOW())::int upcoming_sessions,
    count(*) FILTER(WHERE bk.status IN ('PENDING_COMPLETION','AWAITING_CONFIRMATION') OR (bk.status='BOOKED' AND (bk.booking_date+bk.end_time) AT TIME ZONE b.timezone<=NOW()))::int awaiting_confirmation,
    (SELECT count(*)::int FROM pt_assignment_requests a WHERE a.pt_id=$1 AND a.status='PENDING' AND (a.requested_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN $2::date AND $3::date) pending_requests
    FROM pt_bookings bk JOIN branches b ON b.id=bk.branch_id WHERE bk.pt_id=$1 AND bk.booking_date BETWEEN $2::date AND $3::date`,[req.user.pt_profile_id,start,end])).rows[0];
  return {period,start_date:start,end_date:end,metrics:result};
}));

module.exports={router};

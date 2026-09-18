const express=require('express');
const bcrypt=require('bcryptjs');
const {transaction}=require('../../db/postgres');
const H=require('./http');
const {pool,route,fail,text,phone,date,today,choice,integer,only,isStaff,role,globalAdmin,branch,selected,scope,row,activeBranch,audit,code,page,search}=H;
const router=express.Router();
const profileStatuses=['ACTIVE','INACTIVE','ARCHIVED'];
const email=value=>{if(value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))fail(400,'Invalid email');return text(value,'email',150,false);};

async function canMember(req,member,db=pool) {
  if(isStaff(req)) {branch(req,member.home_branch_id);return;}
  if(req.user.active_role==='MEMBER'&&req.user.member_profile_id===member.id)return;
  if(req.user.active_role==='PT' && (await db.query('SELECT 1 FROM registrations WHERE member_id=$1 AND assigned_pt_id=$2',[member.id,req.user.pt_profile_id])).rowCount)return;
  fail(403,'Member outside authorized scope','FORBIDDEN');
}
router.get('/members/search-phone',route(async req=>{
  role(req,'QTV','RECEPTIONIST');
  const member=(await pool.query('SELECT m.*,b.branch_name home_branch_name FROM member_profiles m JOIN branches b ON b.id=m.home_branch_id WHERE m.phone=$1',[phone(req.query.phone)])).rows[0];
  if(member&&!req.user.is_all_branches&&!req.user.branch_ids.includes(member.home_branch_id))return {exists:true,member:null,outside_scope:true};
  return {exists:!!member,member:member||null};
}));
router.get('/members',route(async req=>{
  const ids=isStaff(req)?scope(req):null;
  const items=(await pool.query(`SELECT m.*,b.branch_name home_branch_name,
    EXISTS(SELECT 1 FROM registrations r WHERE r.member_id=m.id AND r.status IN ('ACTIVE','SCHEDULED') AND r.start_date<=CURRENT_DATE AND (r.end_date IS NULL OR r.end_date>=CURRENT_DATE)) has_active_package
    FROM member_profiles m JOIN branches b ON b.id=m.home_branch_id
    WHERE ($1::uuid[] IS NULL OR m.home_branch_id=ANY($1)) AND
    ($2 OR m.id=$3 OR EXISTS(SELECT 1 FROM registrations r WHERE r.member_id=m.id AND r.assigned_pt_id=$4)) ORDER BY m.created_at DESC`,[ids,isStaff(req),req.user.active_role==='MEMBER'?req.user.member_profile_id:null,req.user.active_role==='PT'?req.user.pt_profile_id:null])).rows;
  return page(search(items,req.query,['phone','full_name','member_code']),req.query);
}));
router.get('/members/:id',route(async req=>{
  const m=await row(pool,'member_profiles',req.params.id);await canMember(req,m);
  const branchInfo=await row(pool,'branches',m.home_branch_id);
  const registrations=(await pool.query('SELECT * FROM registrations WHERE member_id=$1',[m.id])).rows;
  if(req.user.active_role==='PT') registrations.forEach(r=>{delete r.price_snapshot;});
  const consents=req.user.active_role==='PT'?[]:(await pool.query('SELECT DISTINCT ON(consent_type) consent_type,is_granted,policy_version,created_at,revoked_at FROM member_consents WHERE member_id=$1 ORDER BY consent_type,created_at DESC',[m.id])).rows;
  const logs=req.user.active_role==='PT'?[]:(await pool.query(`SELECT l.id,l.direction,l.status,l.check_in_time,l.access_method,l.denial_reason,l.manual_reason,b.branch_name FROM access_logs l JOIN branches b ON b.id=l.branch_id WHERE l.member_id=$1 AND ($2::uuid[] IS NULL OR l.branch_id=ANY($2)) ORDER BY l.check_in_time DESC LIMIT 20`,[m.id,isStaff(req)?scope(req):null])).rows;
  const bio=req.user.active_role==='PT'?false:(await pool.query("SELECT 1 FROM biometric_face_data WHERE member_id=$1 AND status='ACTIVE'",[m.id])).rowCount>0;
  return {...m,home_branch_name:branchInfo.branch_name,consents,recent_access_logs:logs,has_biometric_face:bio,registrations:registrations.filter(r=>req.user.active_role!=='PT'||r.assigned_pt_id===req.user.pt_profile_id)};
}));
router.post('/members',route(async req=>{
  role(req,'QTV','RECEPTIONIST');
  only(req.body,['full_name','phone','email','date_of_birth','home_branch_id']);
  return transaction(async db=>{
    const branchId=selected(req,req.body.home_branch_id);await activeBranch(db,branchId);
    const name=text(req.body.full_name,'full_name',150),tel=phone(req.body.phone),birth=req.body.date_of_birth?date(req.body.date_of_birth):null;
    if(birth>today())fail(400,'Date of birth cannot be in the future');
    const account=(await db.query("INSERT INTO accounts(login_phone,full_name,status) VALUES($1,$2,'PENDING_ACTIVATION') RETURNING id",[tel,name])).rows[0];
    await db.query("INSERT INTO account_roles(account_id,role_id) SELECT $1,id FROM roles WHERE role_code='MEMBER'",[account.id]);
    const m=(await db.query(`INSERT INTO member_profiles(account_id,home_branch_id,member_code,full_name,phone,email,date_of_birth,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[account.id,branchId,await code(db,'member_profiles','member_code','HV'),name,tel,email(req.body.email),birth,req.user.account_id])).rows[0];
    await audit(db,req,'member_profiles',m.id,'MEMBER_CREATED',null,m,branchId);return m;
  });
}));
router.put('/members/:id',route(async req=>{
  return transaction(async db=>{
    const m=await row(db,'member_profiles',req.params.id,true);await canMember(req,m,db);
    if(req.user.active_role==='PT')fail(403,'PT cannot edit members','FORBIDDEN');
    const allowed=isStaff(req)?['full_name','email','date_of_birth']:['full_name','email','date_of_birth','gender','avatar_url'];only(req.body,allowed);
    const next={...m,...req.body};next.full_name=text(next.full_name,'full_name',150);next.email=email(next.email);next.date_of_birth=next.date_of_birth?date(next.date_of_birth):null;
    if(next.gender!=null)choice(next.gender,['NAM','NU','KHAC','MALE','FEMALE','OTHER'],'gender');
    if(next.avatar_url!=null){try{const url=new URL(next.avatar_url);if(!['http:','https:'].includes(url.protocol)||next.avatar_url.length>500)throw new Error();}catch{fail(400,'URL ảnh đại diện không hợp lệ.');}}
    if(next.date_of_birth>today())fail(400,'Date of birth cannot be in the future');
    const updated=(await db.query('UPDATE member_profiles SET full_name=$2,email=$3,date_of_birth=$4,gender=$5,avatar_url=$6,updated_at=NOW() WHERE id=$1 RETURNING *',[m.id,next.full_name,next.email,next.date_of_birth,next.gender,next.avatar_url])).rows[0];
    await audit(db,req,'member_profiles',m.id,'MEMBER_UPDATED',m,updated,m.home_branch_id);return updated;
  });
}));
router.route('/members/:id/status').put(memberStatus).patch(memberStatus);
function memberStatus(req,res,next){return route(async req=>{
  role(req,'QTV','RECEPTIONIST');return transaction(async db=>{
    const m=await row(db,'member_profiles',req.params.id,true);branch(req,m.home_branch_id);
    const updated=(await db.query('UPDATE member_profiles SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *',[m.id,choice(req.body.status,profileStatuses,'status')])).rows[0];
    await audit(db,req,'member_profiles',m.id,'MEMBER_STATUS',m,updated,m.home_branch_id,text(req.body.reason,'reason',255,false));return updated;
  });
})(req,res,next);}

async function packageList(req,db=pool) {
  const items=(await db.query(`SELECT p.*, ARRAY(SELECT pb.branch_id FROM package_branches pb WHERE pb.package_id=p.id) branch_ids,
    COALESCE((SELECT json_agg(json_build_object('id',b.id,'branch_name',b.branch_name)) FROM package_branches pb JOIN branches b ON b.id=pb.branch_id WHERE pb.package_id=p.id),'[]') branches
    FROM packages p WHERE ($1::uuid[] IS NULL OR EXISTS(SELECT 1 FROM package_branches pb WHERE pb.package_id=p.id AND pb.branch_id=ANY($1)))
    AND ($2 OR p.status='ACTIVE') ORDER BY p.package_code`,[scope(req),req.user.active_role==='QTV'])).rows;
  return search(items,req.query,['package_name','package_code']).map(p=>({...p,allowed_branch_ids:p.branch_ids}));
}
router.get('/packages',route(req=>packageList(req)));
router.get('/packages/:id',route(async req=>{const p=(await packageList(req)).find(x=>x.id===req.params.id);if(!p)fail(404,'Package not found');return p;}));
async function savePackage(req) {
  role(req,'QTV');only(req.body,['package_name','package_type','limit_type','price','duration_days','total_gym_sessions','total_pt_sessions','branch_ids','description','status']);
  return transaction(async db=>{
    const old=req.params.id?await row(db,'packages',req.params.id,true):null;
    if(old) {const ids=(await db.query('SELECT branch_id FROM package_branches WHERE package_id=$1',[old.id])).rows.map(x=>x.branch_id);ids.forEach(id=>branch(req,id));}
    const p={...old,...req.body};
    if(p.package_type==='GYM')p.package_type=p.limit_type==='SESSIONS'?'GYM_SESSION':'GYM_TIME';
    if(p.package_type==='PT')p.package_type='PT_SESSION';
    p.package_type=String(p.package_type||'').replace('_SESSIONS','_SESSION');
    choice(p.package_type,['GYM_TIME','GYM_SESSION','PT_SESSION','COMBO'],'package_type');
    if(old&&p.package_type!==old.package_type.replace('_SESSIONS','_SESSION'))fail(400,'Package type is immutable');
    p.package_name=text(p.package_name,'package_name',150);
    p.price=Number(p.price);if(!Number.isFinite(p.price)||p.price<=0||p.price>9999999999)fail(400,'Price must be positive');
    const duration=p.duration_days==null||p.duration_days===''?null:integer(p.duration_days,'duration_days');
    if(duration===null&&p.package_type!=='GYM_SESSION')fail(400,'Duration is required');
    const gym=p.package_type==='GYM_SESSION'?integer(p.total_gym_sessions,'total_gym_sessions'):old?.package_type==='COMBO'&&!Object.hasOwn(req.body,'total_gym_sessions')?old.total_gym_sessions:null;
    const pt=['PT_SESSION','COMBO'].includes(p.package_type)?integer(p.total_pt_sessions,'total_pt_sessions'):null;
    const branchIds=p.branch_ids||(old?(await db.query('SELECT branch_id FROM package_branches WHERE package_id=$1',[old.id])).rows.map(x=>x.branch_id):[]);
    if(!Array.isArray(branchIds)||!branchIds.length)fail(400,'Select at least one branch');
    for(const id of branchIds){branch(req,id);await row(db,'branches',id);}
    const values=[p.package_name,p.price,duration,gym,pt,choice(p.status||'ACTIVE',['ACTIVE','INACTIVE'],'status'),text(p.description,'description',3000,false)];
    const saved=old?(await db.query('UPDATE packages SET package_name=$1,price=$2,duration_days=$3,total_gym_sessions=$4,total_pt_sessions=$5,status=$6,description=$7,updated_at=NOW() WHERE id=$8 RETURNING *',[...values,old.id])).rows[0]:(await db.query('INSERT INTO packages(package_name,price,duration_days,total_gym_sessions,total_pt_sessions,status,description,package_type,package_code) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[...values,p.package_type,await code(db,'packages','package_code','G')])).rows[0];
    await db.query('DELETE FROM package_branches WHERE package_id=$1',[saved.id]);
    for(const id of new Set(branchIds))await db.query('INSERT INTO package_branches VALUES($1,$2)',[saved.id,id]);
    await audit(db,req,'packages',saved.id,old?'PACKAGE_UPDATED':'PACKAGE_CREATED',old,saved,branchIds[0]);return {...saved,branch_ids:branchIds};
  });
}
router.post('/packages',route(savePackage));router.put('/packages/:id',route(savePackage));
router.patch('/packages/:id/status',route(async req=>{only(req.body,['status']);return savePackage(req);}));
router.put('/packages/:id/status',route(async req=>{only(req.body,['status']);return savePackage(req);}));

async function trainerList(req,db=pool) {
  const member=req.user.active_role==='MEMBER';
  const items=(await db.query(`SELECT p.*,b.branch_name,p.specialties specialty,a.avatar_url,
    EXISTS(SELECT 1 FROM registrations r WHERE r.assigned_pt_id=p.id AND r.member_id=$2) assigned_to_member
    FROM pt_profiles p JOIN branches b ON b.id=p.branch_id LEFT JOIN accounts a ON a.id=p.account_id
    WHERE ($1::uuid[] IS NULL OR p.branch_id=ANY($1) OR ($2::uuid IS NOT NULL AND EXISTS(SELECT 1 FROM registrations r WHERE r.member_id=$2 AND (r.sold_branch_id=p.branch_id OR r.assigned_pt_id=p.id))))
    AND ($3::uuid IS NULL OR p.id=$3) ORDER BY p.pt_code`,[scope(req),member?req.user.member_profile_id:null,req.user.active_role==='PT'?req.user.pt_profile_id:null])).rows;
  for(const p of items){if(member&&(!p.show_phone_to_members||!p.assigned_to_member))p.phone=null;delete p.assigned_to_member;}
  return search(items,req.query,['full_name','phone','pt_code']);
}
async function trainerView(req,p,db=pool){
  if(!p)return null;
  const copy={...p};
  if(req.user.active_role==='MEMBER'&&(!p.show_phone_to_members||!(await db.query('SELECT 1 FROM registrations WHERE assigned_pt_id=$1 AND member_id=$2',[p.id,req.user.member_profile_id])).rowCount))copy.phone=null;
  copy.avatar_url=(await db.query('SELECT avatar_url FROM accounts WHERE id=$1',[p.account_id])).rows[0]?.avatar_url||null;
  return copy;
}
router.get('/pt-bookings/trainers',route(req=>trainerList(req)));
router.get('/pt-bookings/trainers/check-phone',route(async req=>{role(req,'QTV');return {exists:!!(await pool.query('SELECT 1 FROM accounts WHERE login_phone=$1',[phone(req.query.phone)])).rowCount};}));
router.get('/pt-bookings/trainers/:id',route(async req=>{const p=(await trainerList({user:req.user,headers:req.headers,query:{}})).find(p=>p.id===req.params.id);if(!p)fail(404,'Trainer not found');return p;}));
async function saveTrainer(req) {
  role(req,'QTV');only(req.body,['full_name','phone','email','branch_id','specialties','specialty','bio']);
  return transaction(async db=>{
    const old=req.params.id?await row(db,'pt_profiles',req.params.id,true):null;
    if(old)branch(req,old.branch_id);
    const p={...old,...req.body},branchId=branch(req,p.branch_id||selected(req));await activeBranch(db,branchId);
    const name=text(p.full_name,'full_name',150),tel=phone(p.phone);
    if(old&&tel!==old.phone)fail(400,'Phone is immutable');
    let accountId=old?.account_id;
    if(!old){accountId=(await db.query("INSERT INTO accounts(login_phone,full_name,status) VALUES($1,$2,'PENDING_ACTIVATION') RETURNING id",[tel,name])).rows[0].id;
      await db.query("INSERT INTO account_roles(account_id,role_id) SELECT $1,id FROM roles WHERE role_code='PT'",[accountId]);}
    const values=[name,email(p.email),branchId,text(p.specialties??p.specialty,'specialties',2000,false),text(p.bio,'bio',2000,false)];
    const saved=old?(await db.query('UPDATE pt_profiles SET full_name=$1,email=$2,branch_id=$3,specialties=$4,bio=$5,updated_at=NOW() WHERE id=$6 RETURNING *',[...values,old.id])).rows[0]:(await db.query('INSERT INTO pt_profiles(full_name,email,branch_id,specialties,bio,phone,account_id,pt_code) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[...values,tel,accountId,await code(db,'pt_profiles','pt_code','PT')])).rows[0];
    await db.query('INSERT INTO account_branch_scopes(account_id,branch_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[accountId,branchId]);
    await audit(db,req,'pt_profiles',saved.id,old?'PT_UPDATED':'PT_CREATED',old,saved,branchId);return saved;
  });
}
router.post('/pt-bookings/trainers',route(saveTrainer));router.put('/pt-bookings/trainers/:id',route(saveTrainer));
router.route('/pt-bookings/trainers/:id/status').put(trainerStatus).patch(trainerStatus);
function trainerStatus(req,res,next){return route(async req=>{
  role(req,'QTV');return transaction(async db=>{
    const p=await row(db,'pt_profiles',req.params.id,true);branch(req,p.branch_id);
    const saved=(await db.query('UPDATE pt_profiles SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *',[p.id,choice(req.body.status,profileStatuses,'status')])).rows[0];
    await audit(db,req,'pt_profiles',p.id,'PT_STATUS',p,saved,p.branch_id,text(req.body.reason,'reason',255,false));return saved;
  });
})(req,res,next);}

router.get('/branches',route(async req=>{
  const items=(await pool.query('SELECT * FROM branches WHERE ($1::uuid[] IS NULL OR id=ANY($1)) ORDER BY branch_code',[scope(req)])).rows;
  return search(items,req.query,['branch_name','branch_code']);
}));
router.get('/branches/:id',route(async req=>{branch(req,req.params.id);return row(pool,'branches',req.params.id);}));
async function saveBranch(req) {
  globalAdmin(req);only(req.body,['branch_name','phone','address','open_time','close_time','timezone','status']);
  return transaction(async db=>{
    const old=req.params.id?await row(db,'branches',req.params.id,true):null,p={...old,...req.body};
    const name=text(p.branch_name,'branch_name',100),address=text(p.address,'address',255),tel=phone(p.phone,true);
    if(name.length<3||address.length<5)fail(400,'Branch name/address is too short');
    for(const key of ['open_time','close_time'])if(!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(p[key]))fail(400,`Invalid ${key}`);
    if(p.open_time>=p.close_time)fail(400,'Closing time must be after opening time');
    const tz=p.timezone||'Asia/Ho_Chi_Minh';try{new Intl.DateTimeFormat('en',{timeZone:tz});}catch{fail(400,'Invalid timezone');}
    await db.query("SELECT pg_advisory_xact_lock(hashtext('branch-name'))");
    if((await db.query('SELECT 1 FROM branches WHERE lower(branch_name)=lower($1) AND ($2::uuid IS NULL OR id<>$2)',[name,old?.id||null])).rowCount)fail(409,'Branch name already exists');
    const vals=[name,address,tel,p.open_time,p.close_time,tz,choice(p.status||'ACTIVE',['ACTIVE','INACTIVE'],'status')];
    const saved=old?(await db.query('UPDATE branches SET branch_name=$1,address=$2,phone=$3,open_time=$4,close_time=$5,timezone=$6,status=$7,updated_at=NOW() WHERE id=$8 RETURNING *',[...vals,old.id])).rows[0]:(await db.query('INSERT INTO branches(branch_name,address,phone,open_time,close_time,timezone,status,branch_code) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[...vals,await code(db,'branches','branch_code','CN')])).rows[0];
    await audit(db,req,'branches',saved.id,old?'BRANCH_UPDATED':'BRANCH_CREATED',old,saved,saved.id);return saved;
  });
}
router.post('/branches',route(saveBranch));router.put('/branches/:id',route(saveBranch));

async function accounts(req,db=pool) {
  role(req,'QTV');if(!req.user.permissions.manage_accounts)fail(403,'Account administration permission required');
  return (await db.query(`SELECT a.id,a.login_phone,a.status,a.created_at,a.last_login_at,a.session_version,
    COALESCE(m.full_name,p.full_name,a.full_name,a.login_phone) full_name,COALESCE(m.member_code,p.pt_code) profile_code,
    ARRAY(SELECT r.role_code FROM account_roles ar JOIN roles r ON r.id=ar.role_id WHERE ar.account_id=a.id) roles,
    ARRAY(SELECT branch_id FROM account_branch_scopes s WHERE s.account_id=a.id UNION SELECT m.home_branch_id WHERE m.home_branch_id IS NOT NULL UNION SELECT p.branch_id WHERE p.branch_id IS NOT NULL) branch_ids,
    EXISTS(SELECT 1 FROM account_branch_scopes s WHERE s.account_id=a.id AND s.is_all_branches) is_all_branches
    FROM accounts a LEFT JOIN member_profiles m ON m.account_id=a.id LEFT JOIN pt_profiles p ON p.account_id=a.id
    WHERE ($1::uuid[] IS NULL OR m.home_branch_id=ANY($1) OR p.branch_id=ANY($1) OR EXISTS(SELECT 1 FROM account_branch_scopes s WHERE s.account_id=a.id AND s.branch_id=ANY($1)))
    ORDER BY a.created_at DESC`,[scope(req)])).rows;
}
router.get('/accounts',route(async req=>page(search(await accounts(req),req.query,['full_name','login_phone','profile_code']).filter(a=>!req.query.role||a.roles.includes(req.query.role)),req.query)));
router.get('/accounts/stats',route(async req=>{
  const list=await accounts(req),counts=Object.fromEntries(['QTV','RECEPTIONIST','PT','MEMBER'].map(r=>[r,list.filter(a=>a.roles.includes(r)).length]));return {total:list.length,active:list.filter(a=>a.status==='ACTIVE').length,pending_activation:list.filter(a=>a.status==='PENDING_ACTIVATION').length,locked:list.filter(a=>a.status==='LOCKED').length,roles:counts,role_counts:counts};
}));
router.get('/accounts/:id',route(async req=>{const a=(await accounts(req)).find(a=>a.id===req.params.id);if(!a)fail(404,'Record not found');return a;}));
router.get('/accounts/:id/branch-scopes',route(async req=>{const a=(await accounts(req)).find(a=>a.id===req.params.id);if(!a)fail(404,'Record not found');return {branch_ids:a.branch_ids,is_all_branches:a.is_all_branches};}));
router.get('/roles',route(async req=>{role(req,'QTV');return (await pool.query('SELECT * FROM roles ORDER BY role_code')).rows;}));
async function saveAccount(req) {
  role(req,'QTV');if(!req.user.permissions.manage_accounts)fail(403,'Account administration permission required');
  only(req.body,req.params.id?['status','roles','branch_ids','is_all_branches']:['login_phone','full_name','password','status','roles','branch_ids','is_all_branches']);
  return transaction(async db=>{
    await db.query("SELECT pg_advisory_xact_lock(hashtext('account-administration'))");
    const old=req.params.id?(await accounts({...req,query:{},headers:{}},db)).find(a=>a.id===req.params.id):null;
    if(req.params.id&&!old)fail(403,'Account outside authorized scope');
    if(old&&!req.user.is_all_branches&&(old.is_all_branches||old.roles.includes('QTV')||old.branch_ids.some(id=>!req.user.branch_ids.includes(id))))fail(403,'Cannot administer higher-scope account');
    const p={...old,...req.body},roles=p.roles;
    if(!Array.isArray(roles)||!roles.length)fail(400,'At least one role required');
    roles.forEach(r=>choice(r,['QTV','RECEPTIONIST','PT','MEMBER'],'role'));
    if(!req.user.is_all_branches&&(roles.includes('QTV')||p.is_all_branches))fail(403,'Cannot grant global or administrator access');
    const status=choice(p.status||'PENDING_ACTIVATION',['ACTIVE','PENDING_ACTIVATION','LOCKED'],'status');
    if(old?.id===req.user.account_id&&(status!=='ACTIVE'||!roles.includes('QTV')||(old.is_all_branches&&!p.is_all_branches)))fail(409,'Cannot remove your own administrator access');
    if(old?.is_all_branches&&old.roles.includes('QTV')&&(status!=='ACTIVE'||!roles.includes('QTV')||!p.is_all_branches)){
      const others=(await db.query(`SELECT a.id FROM accounts a WHERE a.id<>$1 AND a.status='ACTIVE' AND EXISTS(SELECT 1 FROM account_roles ar JOIN roles r ON r.id=ar.role_id WHERE ar.account_id=a.id AND r.role_code='QTV') AND EXISTS(SELECT 1 FROM account_branch_scopes s WHERE s.account_id=a.id AND s.is_all_branches)`,[old.id])).rows;
      if(!others.length)fail(409,'Cannot remove the last all-branches administrator');
    }
    let ids=p.branch_ids||[];if(!Array.isArray(ids))fail(400,'branch_ids must be an array');
    if(p.is_all_branches&&!roles.includes('QTV'))fail(400,'Only QTV can have all-branches scope');
    if(p.is_all_branches&&!ids.length)ids=[(await db.query('SELECT id FROM branches ORDER BY created_at LIMIT 1')).rows[0]?.id].filter(Boolean);
    if(roles.some(r=>r!=='MEMBER')&&!ids.length)fail(400,'Staff requires a branch scope');
    for(const id of ids){branch(req,id);await row(db,'branches',id);}
    let id=old?.id;
    if(old)await db.query('UPDATE accounts SET status=$2,session_version=session_version+1,updated_at=NOW() WHERE id=$1',[id,status]);
    else {globalAdmin(req);const password=req.body.password;if(status==='ACTIVE'&&(!password||password.length<8))fail(400,'Active account requires a strong password');
      id=(await db.query('INSERT INTO accounts(login_phone,full_name,password_hash,status) VALUES($1,$2,$3,$4) RETURNING id',[phone(req.body.login_phone),text(req.body.full_name,'full_name',150),password?await bcrypt.hash(password,12):null,status])).rows[0].id;}
    await db.query('DELETE FROM account_roles WHERE account_id=$1',[id]);await db.query('DELETE FROM account_branch_scopes WHERE account_id=$1',[id]);
    for(const r of new Set(roles))await db.query('INSERT INTO account_roles(account_id,role_id) SELECT $1,id FROM roles WHERE role_code=$2',[id,r]);
    for(const b of new Set(ids))await db.query('INSERT INTO account_branch_scopes(account_id,branch_id,is_all_branches) VALUES($1,$2,$3)',[id,b,!!p.is_all_branches]);
    const saved={id,status,roles,branch_ids:ids,is_all_branches:!!p.is_all_branches};await audit(db,req,'accounts',id,'ACCOUNT_PERMISSIONS',old,saved,ids[0]);return saved;
  });
}
router.post('/accounts',route(saveAccount));router.put('/accounts/:id',route(saveAccount));
router.get('/audit-logs',route(async req=>{
  role(req,'QTV');const from=req.query.date_from||req.query.from_date,to=req.query.date_to||req.query.to_date;
  if(from)date(from);if(to)date(to);
  const items=(await pool.query(`SELECT l.*,a.login_phone actor_phone,COALESCE(a.full_name,a.login_phone) actor_name,l.action_name action,l.new_values details FROM audit_logs l JOIN accounts a ON a.id=l.actor_account_id
    WHERE ($1::uuid[] IS NULL OR l.branch_id=ANY($1)) AND ($2::date IS NULL OR (l.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date>=$2) AND ($3::date IS NULL OR (l.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date<=$3)
    AND ($4::text IS NULL OR l.action_name ILIKE $4) ORDER BY l.created_at DESC LIMIT 1000`,[scope(req),from||null,to||null,req.query.action?'%'+req.query.action+'%':null])).rows;
  return page(search(items,req.query,['action_name','target_table','actor_phone','actor_name','target_id']),req.query);
}));
module.exports={router,canMember,trainerList,trainerView,packageList};

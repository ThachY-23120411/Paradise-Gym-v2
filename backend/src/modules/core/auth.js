const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomInt, createHmac, timingSafeEqual } = require('crypto');
const env = require('../../config/env');
const { signAccessToken,signRefreshToken,signTemp2faToken,verifyToken } = require('../../utils/token');
const { pool,route,fail,text,phone,choice,only,role,audit,code } = require('./http');
const { transaction } = require('../../db/postgres');
const router=express.Router();

async function context(id, activeRole, db=pool) {
  const {rows}=await db.query(`SELECT a.*,m.id member_profile_id,p.id pt_profile_id,
    COALESCE(m.full_name,p.full_name,a.full_name,a.login_phone) display_name,
    m.home_branch_id,p.branch_id pt_branch_id,m.avatar_url member_avatar_url,
    ARRAY(SELECT r.role_code FROM account_roles ar JOIN roles r ON r.id=ar.role_id WHERE ar.account_id=a.id ORDER BY r.role_code) roles,
    ARRAY(SELECT s.branch_id FROM account_branch_scopes s WHERE s.account_id=a.id) scope_ids,
    EXISTS(SELECT 1 FROM account_branch_scopes s WHERE s.account_id=a.id AND s.is_all_branches) all_branches
    FROM accounts a LEFT JOIN member_profiles m ON m.account_id=a.id LEFT JOIN pt_profiles p ON p.account_id=a.id WHERE a.id=$1`,[id]);
  const a=rows[0]; if(!a || a.status!=='ACTIVE') fail(401,'Account is inactive or locked','ACCOUNT_INACTIVE');
  const active=activeRole||['QTV','RECEPTIONIST','PT','MEMBER'].find(r=>a.roles.includes(r));
  if(!a.roles.includes(active)) fail(403,'Active role is not assigned to this account','FORBIDDEN');
  const staff=['QTV','RECEPTIONIST'].includes(active);
  const ids=staff ? a.scope_ids : active==='PT' ? [a.pt_branch_id].filter(Boolean) : [a.home_branch_id].filter(Boolean);
  return {account_id:a.id,phone:a.login_phone,login_phone:a.login_phone,full_name:a.display_name,avatar_url:active==='MEMBER'?(a.member_avatar_url||a.avatar_url):a.avatar_url,is_two_factor_enabled:a.is_two_factor_enabled,
    roles:a.roles,role:active,active_role:active,branch_ids:ids,is_all_branches:active==='QTV'&&a.all_branches,
    member_profile_id:a.member_profile_id,pt_profile_id:a.pt_profile_id,session_version:a.session_version,
    permissions:{view_financial:staff&&a.permissions.view_financial!==false,manage_devices:active==='QTV'&&a.permissions.manage_devices!==false,manage_accounts:active==='QTV'&&a.permissions.manage_accounts!==false,commission_config:active==='QTV'&&a.permissions.commission_config!==false}};
}
function parseDeviceName(ua) {
  if (!ua) return 'Thiết bị không xác định';
  if (/iPhone/i.test(ua)) return 'Apple iPhone';
  if (/iPad/i.test(ua)) return 'Apple iPad';
  if (/Android/i.test(ua)) return 'Thiết bị Android';
  if (/Macintosh|Mac OS/i.test(ua)) return 'Máy tính Mac';
  if (/Windows/i.test(ua)) return 'Máy tính Windows';
  if (/Linux/i.test(ua)) return 'Máy tính Linux';
  return 'Trình duyệt web';
}

async function recordSession(accountId, req, db = pool) {
  try {
    const userAgent = String(req.headers?.['user-agent'] || '').slice(0, 500);
    const ipAddress = String(req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '').slice(0, 50);
    const deviceName = req.body?.device_name ? String(req.body.device_name).slice(0, 150) : parseDeviceName(userAgent);
    const { rows } = await db.query(
      `INSERT INTO account_sessions (account_id, device_name, user_agent, ip_address, last_active_at, expires_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW() + interval '30 days')
       RETURNING id, account_id, device_name, user_agent, ip_address, last_active_at, is_revoked, expires_at, created_at`,
      [accountId, deviceName, userAgent || null, ipAddress || null]
    );
    if (!rows[0]) fail(503,'Không thể tạo phiên đăng nhập. Vui lòng thử lại.','SESSION_UNAVAILABLE');
    return rows[0];
  } catch (err) {
    if (err.status) throw err;
    fail(503,'Không thể tạo phiên đăng nhập. Vui lòng thử lại.','SESSION_UNAVAILABLE');
  }
}

async function authenticate(req,res,next) {
  try {
    const raw = String(req.headers.authorization||'').replace(/^Bearer /,'');
    if (!raw && req.method === 'GET' && req.path.replace(/\/$/, '') === '/branches') {
      req.user = null;
      return next();
    }
    const token=verifyToken(raw);
    if(!token||token.is_temp_2fa||token.token_type!=='access') fail(401,'Authentication required','UNAUTHORIZED');
    req.user=await context(token.account_id,req.headers['x-active-role']||token.active_role);
    if(req.user.session_version!==token.session_version) fail(401,'Session revoked','SESSION_REVOKED');
    if(token.session_id) {
      try {
        const { rows } = await pool.query('SELECT is_revoked, expires_at FROM account_sessions WHERE id=$1 AND account_id=$2', [token.session_id, token.account_id]);
        if (!rows[0] || rows[0].is_revoked || !rows[0].expires_at || !(new Date(rows[0].expires_at) > new Date())) {
          fail(401,'Session revoked','SESSION_REVOKED');
        }
        req.user.session_id = token.session_id;
        pool.query('UPDATE account_sessions SET last_active_at=NOW() WHERE id=$1', [token.session_id]).catch(() => {});
      } catch (e) {
        if (e.status) throw e;
        fail(503,'Không thể xác minh phiên đăng nhập. Vui lòng thử lại.','SESSION_UNAVAILABLE');
      }
    }
    next();
  } catch(err) {next(err);}
}
const tokens = (user, session = null) => {
  const payload = session ? { ...user, session_id: session.id } : user;
  return {
    access_token: signAccessToken(payload),
    refresh_token: signRefreshToken(payload),
    user,
    session_id: session?.id || null,
    requires_2fa: false
  };
};
async function account(identifier,activeRole) {
  const ptCode=typeof identifier==='string'&&/^PT[0-9]+$/i.test(identifier.trim());
  const a=(await pool.query(ptCode?'SELECT a.* FROM accounts a JOIN pt_profiles p ON p.account_id=a.id WHERE upper(p.pt_code)=$1':'SELECT * FROM accounts WHERE login_phone=$1',[ptCode?identifier.trim().toUpperCase():phone(identifier)])).rows[0];
  if(!a) fail(401,'Invalid phone or credentials','INVALID_CREDENTIALS');
  if(a.status==='LOCKED') fail(403,'Account locked','ACCOUNT_LOCKED');
  if(a.locked_until && new Date(a.locked_until)>new Date()) fail(423,'Too many attempts; try again later','LOGIN_LOCKED');
  if(activeRole){
    choice(activeRole,['QTV','RECEPTIONIST','PT','MEMBER'],'active_role');
    if(!(await pool.query('SELECT 1 FROM account_roles ar JOIN roles r ON r.id=ar.role_id WHERE ar.account_id=$1 AND r.role_code=$2',[a.id,activeRole])).rowCount)fail(401,'Invalid phone or credentials','INVALID_CREDENTIALS');
  }
  return a;
}
async function failed(id) {
  const windowMinutes = env.LOCKOUT_DURATION_MINUTES || 2;
  await pool.query(`UPDATE accounts SET failed_login_attempts=CASE WHEN locked_until<=NOW() THEN 1 ELSE failed_login_attempts+1 END,
    locked_until=CASE WHEN locked_until<=NOW() THEN NULL WHEN failed_login_attempts+1>=5 THEN NOW() + ($2 || ' minutes')::interval ELSE locked_until END WHERE id=$1`,[id, `${windowMinutes}`]);
}
const otpHash=(id,value)=>createHmac('sha256',env.JWT_SECRET).update(`${id}:${value}`).digest('hex');
async function challenge(a,purpose,targetPhone=a.login_phone) {
  return transaction(async db=>{
  const current=(await db.query('SELECT * FROM accounts WHERE id=$1 FOR UPDATE',[a.id])).rows[0];
  if(current.status==='LOCKED'||current.session_version!==a.session_version||current.login_phone!==a.login_phone)fail(401,'Account is inactive or locked','ACCOUNT_INACTIVE');
  if(current.locked_until&&new Date(current.locked_until)>new Date())fail(423,'Too many attempts; try again later','LOGIN_LOCKED');
  if(current.otp_expires_at && new Date(current.otp_expires_at)>new Date()) fail(429,'Wait until the current OTP expires','OTP_RATE_LIMIT');
  const windowMinutes = env.LOCKOUT_DURATION_MINUTES || 2;
  const sent=Number((await db.query(`SELECT count(*) FROM audit_logs WHERE actor_account_id=$1 AND action_name='OTP_REQUESTED' AND created_at>NOW() - ($2 || ' minutes')::interval`,[a.id, `${windowMinutes}`])).rows[0].count);
  if(sent>=4)fail(429,`Đã đạt giới hạn gửi lại OTP. Vui lòng thử lại sau ${windowMinutes} phút.`,'OTP_RESEND_LIMIT');
  const development=(env.NODE_ENV==='test'?process.env.AUTH_OTP_MODE==='development':(process.env.AUTH_OTP_MODE||'development')==='development')&&env.NODE_ENV!=='production';
  if(!development && !process.env.SMS_PROVIDER_URL) fail(503,'SMS provider is not configured','SMS_UNAVAILABLE');
  const otp=String(randomInt(100000,1000000));
  if(!development) {
    const result=await fetch(process.env.SMS_PROVIDER_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.SMS_PROVIDER_TOKEN||''}`},body:JSON.stringify({phone:targetPhone,code:otp,expires_in:60}),signal:AbortSignal.timeout(10000)});
    if(!result.ok) fail(503,'SMS provider did not accept the request','SMS_UNAVAILABLE');
  }
  await db.query("UPDATE accounts SET otp_hash=$2,otp_expires_at=NOW()+interval '60 seconds',otp_purpose=$3 WHERE id=$1",[a.id,otpHash(a.id,purpose==='PHONE_CHANGE'?`${otp}:${targetPhone}`:otp),purpose]);
  await db.query("INSERT INTO audit_logs(actor_account_id,action_name,target_table,target_id,new_values) VALUES($1,'OTP_REQUESTED','accounts',$1,$2)",[a.id,JSON.stringify({purpose})]);
  return {ttl_seconds:60,resends_remaining:3-sent,masked_phone:targetPhone.slice(0,3)+'****'+targetPhone.slice(-3),delivery:development?'DEVELOPMENT_ONLY':'PROVIDER_ACCEPTED',...(development?{dev_otp:otp}:{})};
  });
}
async function consume(a,value,purpose,onSuccess) {
  const expected=otpHash(a.id,String(value||''));
  const valid=await transaction(async db=>{
    const current=(await db.query('SELECT * FROM accounts WHERE id=$1 FOR UPDATE',[a.id])).rows[0];
    if(current.status==='LOCKED'||current.session_version!==a.session_version||(current.locked_until&&new Date(current.locked_until)>new Date())) return false;
    const valid=current.otp_hash&&current.otp_purpose===purpose&&new Date(current.otp_expires_at)>new Date()&&timingSafeEqual(Buffer.from(current.otp_hash),Buffer.from(expected));
    if(valid){await db.query('UPDATE accounts SET otp_hash=NULL,otp_expires_at=NULL,otp_purpose=NULL,failed_login_attempts=0,locked_until=NULL WHERE id=$1',[a.id]);return onSuccess?onSuccess(db,current):true;}
    return false;
  });
  if(!valid) {await failed(a.id);fail(400,'OTP is invalid or expired','OTP_INVALID');}
  return valid;
}
router.post('/login-password',route(async req=>{
  const a=await account(req.body.login_phone||req.body.identifier,req.body.active_role);
  const authenticated=await transaction(async db=>{
    const current=(await db.query('SELECT * FROM accounts WHERE id=$1 FOR UPDATE',[a.id])).rows[0];
    if(current.locked_until&&new Date(current.locked_until)>new Date())fail(423,'Too many attempts; try again later','LOGIN_LOCKED');
    if(typeof req.body.password!=='string'||Buffer.byteLength(req.body.password)>72||!current.password_hash||!await bcrypt.compare(req.body.password,current.password_hash))return null;
    if(current.status!=='ACTIVE')fail(403,'Activate the existing account first','ACTIVATION_REQUIRED');
    const user=await context(a.id,req.body.active_role,db);
    let session=null;
    if(!current.is_two_factor_enabled){
      await db.query('UPDATE accounts SET last_login_at=NOW(),failed_login_attempts=0,locked_until=NULL WHERE id=$1',[a.id]);
      session=await recordSession(a.id,req,db);
    }
    return {account:current,user,session};
  });
  if(!authenticated){await failed(a.id);fail(401,'Invalid phone or credentials','INVALID_CREDENTIALS');}
  if(authenticated.account.is_two_factor_enabled)return {requires_2fa:true,temp_token:signTemp2faToken(authenticated.user),...await challenge(authenticated.account,'2FA')};
  return tokens(authenticated.user,authenticated.session);
}));
router.post('/request-otp',route(async req=>{
  const a=await account(req.body.login_phone||req.body.identifier,req.body.active_role);
  if(req.body.temp_token){
    const temp=verifyToken(req.body.temp_token);
    if(!temp?.is_temp_2fa||temp.account_id!==a.id||temp.session_version!==a.session_version)fail(401,'Invalid second-factor session','UNAUTHORIZED');
    return challenge(a,'2FA');
  }
  return challenge(a,'LOGIN');
}));
router.post('/login-otp',route(async req=>{
  const a=await account(req.body.login_phone||req.body.identifier,req.body.active_role);
  const isPT=(await pool.query("SELECT 1 FROM account_roles ar JOIN roles r ON r.id=ar.role_id WHERE ar.account_id=$1 AND r.role_code='PT'",[a.id])).rowCount>0;
  if(a.status==='PENDING_ACTIVATION')validatePassword(req.body.password,isPT?'PT':'MEMBER');
  const hash=a.status==='PENDING_ACTIVATION'?await bcrypt.hash(req.body.password,12):null;
  let session=null;
  const user=await consume(a,req.body.otp_code,'LOGIN',async(db,current)=>{
    if(current.status==='PENDING_ACTIVATION')await db.query("UPDATE accounts SET status='ACTIVE',password_hash=$2 WHERE id=$1",[a.id,hash]);
    await db.query('UPDATE accounts SET last_login_at=NOW() WHERE id=$1',[a.id]);
    session=await recordSession(a.id,req,db);
    return context(a.id,req.body.active_role,db);
  });
  return tokens(user,session);
}));
router.post('/verify-2fa',route(async req=>{
  const temp=verifyToken(req.body.temp_token);
  if(!temp?.is_temp_2fa) fail(401,'Invalid second-factor session','UNAUTHORIZED');
  const a=await account(temp.phone);
  if(a.session_version!==temp.session_version) fail(401,'Session revoked','SESSION_REVOKED');
  await consume(a,req.body.otp_code,'2FA');
  await pool.query('UPDATE accounts SET last_login_at=NOW() WHERE id=$1',[a.id]);
  const session=await recordSession(a.id,req);
  return tokens(await context(a.id,temp.active_role),session);
}));
router.post('/refresh-token',route(async req=>{
  const token=verifyToken(req.body.refresh_token);
  if(token?.token_type!=='refresh') fail(401,'Invalid refresh token','UNAUTHORIZED');
  const user=await context(token.account_id,token.active_role);
  if(user.session_version!==token.session_version) fail(401,'Session revoked','SESSION_REVOKED');
  let session=null;
  if(token.session_id){
    try {
      const { rows } = await pool.query('SELECT is_revoked, expires_at FROM account_sessions WHERE id=$1 AND account_id=$2', [token.session_id, token.account_id]);
      if (!rows[0] || rows[0].is_revoked || !rows[0].expires_at || !(new Date(rows[0].expires_at) > new Date())) {
        fail(401,'Session revoked','SESSION_REVOKED');
      }
      session={id:token.session_id};
      pool.query('UPDATE account_sessions SET last_active_at=NOW() WHERE id=$1',[token.session_id]).catch(()=>{});
    } catch(e) {
      if(e.status) throw e;
      fail(503,'Không thể xác minh phiên đăng nhập. Vui lòng thử lại.','SESSION_UNAVAILABLE');
    }
  }
  return tokens(user,session);
}));
router.post('/social-login',route(()=>fail(503,'Verified OAuth provider is not configured','OAUTH_UNAVAILABLE')));
router.get('/me',authenticate,route(req=>req.user));
router.post('/activation-lookup',route(async req=>{
  const activeRole=choice(req.body.active_role,['MEMBER','PT'],'active_role');
  const a=await account(req.body.identifier||req.body.login_phone,activeRole);
  if(a.status!=='PENDING_ACTIVATION')return {can_activate:false,status:a.status};
  const result=(await pool.query(activeRole==='PT'?
    'SELECT p.full_name,p.pt_code profile_code,b.branch_name FROM pt_profiles p JOIN branches b ON b.id=p.branch_id WHERE p.account_id=$1':
    'SELECT m.full_name,m.member_code profile_code,b.branch_name FROM member_profiles m JOIN branches b ON b.id=m.home_branch_id WHERE m.account_id=$1',[a.id])).rows[0];
  if(!result)fail(404,'Không tìm thấy hồ sơ chờ kích hoạt.','PROFILE_NOT_FOUND');
  return {can_activate:true,status:a.status,masked_name:result.full_name.split(/\s+/u).map(word=>word[0]+'***').join(' '),masked_code:result.profile_code.slice(0,2)+'***'+result.profile_code.slice(-1),masked_phone:a.login_phone.slice(0,3)+'****'+a.login_phone.slice(-3),...(activeRole==='PT'?{branch_name:result.branch_name}:{})};
}));
router.post('/signup-otp',route(async req=>{
  only(req.body,['login_phone','full_name','home_branch_id','email','password']);
  const tel=phone(req.body.login_phone);
  const name=text(req.body.full_name,'full_name',150);
  const branchId=req.body.home_branch_id;
  if(!branchId) fail(400,'Chi nhánh sinh hoạt chính là bắt buộc.');
  const branchRow=(await pool.query('SELECT * FROM branches WHERE id=$1',[branchId])).rows[0];
  if(!branchRow||branchRow.status!=='ACTIVE') fail(400,'Chi nhánh cơ sở không hợp lệ hoặc đã ngừng hoạt động.');
  const mail=req.body.email?String(req.body.email).trim():null;
  if(mail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) fail(400,'Email không hợp lệ.');
  validatePassword(req.body.password,'MEMBER');

  const exists=await pool.query(
    `SELECT 1 FROM accounts WHERE login_phone=$1
     UNION ALL SELECT 1 FROM member_profiles WHERE phone=$1
     UNION ALL SELECT 1 FROM pt_profiles WHERE phone=$1`,
    [tel]
  );
  if(exists.rowCount){
    fail(409,'Số điện thoại này đã tồn tại trong hệ thống Paradise Gym. Vui lòng Đăng nhập hoặc Kích hoạt tài khoản để tiếp tục.','PHONE_EXISTS');
  }

  const development=(env.NODE_ENV==='test'?process.env.AUTH_OTP_MODE==='development':(process.env.AUTH_OTP_MODE||'development')==='development')&&env.NODE_ENV!=='production';
  if(!development&&!process.env.SMS_PROVIDER_URL) fail(503,'SMS provider is not configured','SMS_UNAVAILABLE');
  const otp=String(randomInt(100000,1000000));
  if(!development){
    const result=await fetch(process.env.SMS_PROVIDER_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.SMS_PROVIDER_TOKEN||''}`},
      body:JSON.stringify({phone:tel,code:otp,expires_in:60}),
      signal:AbortSignal.timeout(10000)
    });
    if(!result.ok) fail(503,'SMS provider did not accept the request','SMS_UNAVAILABLE');
  }

  const passwordHash=await bcrypt.hash(req.body.password,12);
  const hashedOtp=otpHash('SIGNUP',`${otp}:${tel}`);
  const signupToken=jwt.sign(
    {
      token_type:'signup',
      phone:tel,
      full_name:name,
      home_branch_id:branchId,
      email:mail,
      password_hash:passwordHash,
      otp_hash:hashedOtp
    },
    env.JWT_SECRET,
    {algorithm:'HS256',expiresIn:'10m'}
  );

  return {
    signup_token:signupToken,
    ttl_seconds:60,
    masked_phone:tel.slice(0,3)+'****'+tel.slice(-3),
    delivery:development?'DEVELOPMENT_ONLY':'PROVIDER_ACCEPTED',
    ...(development?{dev_otp:otp}:{})
  };
}));
router.post('/signup',route(async req=>{
  only(req.body,['signup_token','otp_code','device_name']);
  const token=verifyToken(req.body.signup_token);
  if(!token||token.token_type!=='signup') fail(400,'Phiên đăng ký không hợp lệ hoặc đã hết hạn.','SIGNUP_SESSION_EXPIRED');

  const expected=otpHash('SIGNUP',`${String(req.body.otp_code||'')}:${token.phone}`);
  if(!token.otp_hash||!timingSafeEqual(Buffer.from(token.otp_hash),Buffer.from(expected))){
    fail(400,'Mã OTP không hợp lệ hoặc đã hết hạn.','OTP_INVALID');
  }

  return transaction(async db=>{
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`phone:${token.phone}`]);
    const exists=await db.query(
      `SELECT 1 FROM accounts WHERE login_phone=$1
       UNION ALL SELECT 1 FROM member_profiles WHERE phone=$1
       UNION ALL SELECT 1 FROM pt_profiles WHERE phone=$1`,
      [token.phone]
    );
    if(exists.rowCount){
      fail(409,'Số điện thoại này đã tồn tại trong hệ thống Paradise Gym. Vui lòng Đăng nhập hoặc Kích hoạt tài khoản để tiếp tục.','PHONE_EXISTS');
    }
    const branchRow=(await db.query('SELECT * FROM branches WHERE id=$1 FOR UPDATE',[token.home_branch_id])).rows[0];
    if(!branchRow||branchRow.status!=='ACTIVE') fail(400,'Chi nhánh cơ sở không hợp lệ hoặc đã ngừng hoạt động.');

    const newAccount=(await db.query(
      "INSERT INTO accounts (login_phone, password_hash, status, last_login_at) VALUES ($1, $2, 'ACTIVE', NOW()) RETURNING *",
      [token.phone, token.password_hash]
    )).rows[0];

    await db.query(
      "INSERT INTO account_roles (account_id, role_id) SELECT $1, id FROM roles WHERE role_code='MEMBER'",
      [newAccount.id]
    );

    const memberCode=await code(db,'member_profiles','member_code','HV');
    const memberProfile=(await db.query(
      `INSERT INTO member_profiles (account_id, home_branch_id, member_code, full_name, phone, email, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE') RETURNING *`,
      [newAccount.id, token.home_branch_id, memberCode, token.full_name, token.phone, token.email]
    )).rows[0];

    const session=await recordSession(newAccount.id,req,db);

    await db.query(
      "INSERT INTO audit_logs(actor_account_id, branch_id, action_name, target_table, target_id, new_values) VALUES ($1, $2, 'MEMBER_REGISTERED', 'member_profiles', $3, $4)",
      [newAccount.id, token.home_branch_id, memberProfile.id, JSON.stringify({ member_code: memberCode, phone: token.phone, full_name: token.full_name })]
    );

    const user=await context(newAccount.id,'MEMBER',db);
    return tokens(user,session);
  });
}));
function validatePassword(value,activeRole){
  const minimum=activeRole==='MEMBER'?6:8;
  if(typeof value!=='string'||value.length<minimum||Buffer.byteLength(value)>72)fail(400,`Mật khẩu phải có ít nhất ${minimum} ký tự và tối đa 72 byte.`,`PASSWORD_INVALID`);
  if(activeRole==='PT'&&(!/[A-Z]/.test(value)||!/[a-z]/.test(value)||!/[0-9\W]/.test(value)))fail(400,'Mật khẩu PT cần chữ hoa, chữ thường và số hoặc ký tự đặc biệt.','PASSWORD_INVALID');
}
router.get('/security',authenticate,route(req=>({is_two_factor_enabled:req.user.is_two_factor_enabled})));
router.put('/security',authenticate,route(async req=>{
  role(req,'MEMBER','PT');only(req.body,['is_two_factor_enabled']);
  if(typeof req.body.is_two_factor_enabled!=='boolean')fail(400,'is_two_factor_enabled must be boolean');
  return transaction(async db=>{
    const a=(await db.query('SELECT is_two_factor_enabled FROM accounts WHERE id=$1 FOR UPDATE',[req.user.account_id])).rows[0];
    const saved=(await db.query('UPDATE accounts SET is_two_factor_enabled=$2,updated_at=NOW() WHERE id=$1 RETURNING is_two_factor_enabled',[req.user.account_id,req.body.is_two_factor_enabled])).rows[0];
    await audit(db,req,'accounts',req.user.account_id,'SECURITY_UPDATED',a,saved,req.user.branch_ids[0]);return saved;
  });
}));
router.post('/change-password',authenticate,route(async req=>{
  role(req,'MEMBER','PT');only(req.body,['current_password','new_password']);validatePassword(req.body.new_password,req.user.active_role);
  const changed=await transaction(async db=>{
    const a=(await db.query('SELECT * FROM accounts WHERE id=$1 FOR UPDATE',[req.user.account_id])).rows[0];
    if(a.session_version!==req.user.session_version)fail(401,'Session revoked','SESSION_REVOKED');
    if(a.locked_until&&new Date(a.locked_until)>new Date())fail(423,'Too many attempts; try again later','LOGIN_LOCKED');
    if(typeof req.body.current_password!=='string'||Buffer.byteLength(req.body.current_password)>72||!a.password_hash||!await bcrypt.compare(req.body.current_password,a.password_hash))return false;
    await db.query('UPDATE accounts SET password_hash=$2,session_version=session_version+1,otp_hash=NULL,otp_purpose=NULL,otp_expires_at=NULL,failed_login_attempts=0,locked_until=NULL,updated_at=NOW() WHERE id=$1',[a.id,await bcrypt.hash(req.body.new_password,12)]);
    await audit(db,req,'accounts',a.id,'PASSWORD_CHANGED',null,{sessions_revoked:true},req.user.branch_ids[0]);
    await db.query('UPDATE account_sessions SET is_revoked=TRUE WHERE account_id=$1',[a.id]);
    return recordSession(a.id,req,db);
  });
  if(!changed){await failed(req.user.account_id);fail(400,'Mật khẩu hiện tại không đúng.','PASSWORD_MISMATCH');}
  return tokens(await context(req.user.account_id,req.user.active_role),changed);
}));
async function uniquePhone(db,value,accountId){
  const exists=await db.query(`SELECT 1 FROM accounts WHERE login_phone=$1 AND id<>$2
    UNION ALL SELECT 1 FROM member_profiles WHERE phone=$1 AND account_id IS DISTINCT FROM $2
    UNION ALL SELECT 1 FROM pt_profiles WHERE phone=$1 AND account_id IS DISTINCT FROM $2`,[value,accountId]);
  if(exists.rowCount)fail(409,'Số điện thoại này đã được sử dụng bởi tài khoản khác.','PHONE_EXISTS');
}
router.post('/request-phone-change',authenticate,route(async req=>{
  role(req,'MEMBER');only(req.body,['new_phone']);const newPhone=phone(req.body.new_phone);
  if(newPhone===req.user.phone)fail(400,'Số điện thoại mới phải khác số hiện tại.');
  await uniquePhone(pool,newPhone,req.user.account_id);
  const a=await account(req.user.phone);
  const result=await challenge(a,'PHONE_CHANGE',newPhone);
  return {...result,challenge_token:jwt.sign({token_type:'phone_change',account_id:a.id,new_phone:newPhone,session_version:a.session_version},env.JWT_SECRET,{algorithm:'HS256',expiresIn:'5m'})};
}));
router.post('/confirm-phone-change',authenticate,route(async req=>{
  role(req,'MEMBER');only(req.body,['new_phone','otp_code','challenge_token']);const newPhone=phone(req.body.new_phone),token=verifyToken(req.body.challenge_token);
  if(token?.token_type!=='phone_change'||token.account_id!==req.user.account_id||token.new_phone!==newPhone||token.session_version!==req.user.session_version)fail(401,'Phiên đổi số điện thoại không hợp lệ.','PHONE_CHALLENGE_INVALID');
  const valid=await transaction(async db=>{
    const a=(await db.query('SELECT * FROM accounts WHERE id=$1 FOR UPDATE',[req.user.account_id])).rows[0];
    if(a.locked_until&&new Date(a.locked_until)>new Date())fail(423,'Too many attempts; try again later','LOGIN_LOCKED');
    const expected=otpHash(a.id,`${String(req.body.otp_code||'')}:${newPhone}`);
    if(a.session_version!==token.session_version||a.otp_purpose!=='PHONE_CHANGE'||!a.otp_hash||new Date(a.otp_expires_at)<=new Date()||!timingSafeEqual(Buffer.from(a.otp_hash),Buffer.from(expected)))return false;
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`phone:${newPhone}`]);await uniquePhone(db,newPhone,a.id);
    await db.query('UPDATE accounts SET login_phone=$2,session_version=session_version+1,otp_hash=NULL,otp_purpose=NULL,otp_expires_at=NULL,failed_login_attempts=0,locked_until=NULL,updated_at=NOW() WHERE id=$1',[a.id,newPhone]);
    await db.query('UPDATE member_profiles SET phone=$2,updated_at=NOW() WHERE account_id=$1',[a.id,newPhone]);
    await db.query('UPDATE pt_profiles SET phone=$2,updated_at=NOW() WHERE account_id=$1',[a.id,newPhone]);
    await audit(db,req,'accounts',a.id,'PHONE_CHANGED',{login_phone:a.login_phone},{login_phone:newPhone},req.user.branch_ids[0]);return true;
  });
  if(!valid){await failed(req.user.account_id);fail(400,'OTP is invalid or expired','OTP_INVALID');}
  return tokens(await context(req.user.account_id,req.user.active_role));
}));
router.get('/sessions',authenticate,route(async req=>{
  const {rows}=await pool.query(
    `SELECT id, device_name, user_agent, ip_address, last_active_at, created_at, expires_at, is_revoked
     FROM account_sessions WHERE account_id=$1 AND is_revoked=FALSE ORDER BY last_active_at DESC`,
    [req.user.account_id]
  );
  return rows.map(s=>({
    ...s,
    is_current: req.user.session_id ? s.id===req.user.session_id : false
  }));
}));
router.post('/logout-current',authenticate,route(async req=>{
  if(req.user.session_id){
    await pool.query('UPDATE account_sessions SET is_revoked=TRUE WHERE id=$1 AND account_id=$2',[req.user.session_id,req.user.account_id]);
  } else {
    await pool.query('UPDATE accounts SET session_version=session_version+1 WHERE id=$1',[req.user.account_id]);
  }
  return { message: 'Phiên hiện tại đã được đăng xuất thành công.' };
}));
router.post('/logout-all',authenticate,route(async req=>{
  await transaction(async db=>{
    await db.query('UPDATE account_sessions SET is_revoked=TRUE WHERE account_id=$1',[req.user.account_id]);
    await db.query('UPDATE accounts SET session_version=session_version+1 WHERE id=$1',[req.user.account_id]);
  });
  return { message: 'Toàn bộ các phiên trên mọi thiết bị đã được đăng xuất.' };
}));
router.delete('/sessions/:id',authenticate,route(async req=>{
  const sessionId=req.params.id;
  const {rowCount}=await pool.query(
    'UPDATE account_sessions SET is_revoked=TRUE WHERE id=$1 AND account_id=$2',
    [sessionId,req.user.account_id]
  );
  if(!rowCount) fail(404,'Không tìm thấy phiên đăng nhập hoặc phiên đã bị thu hồi.','SESSION_NOT_FOUND');
  return { message: 'Đã thu hồi phiên thiết bị thành công.' };
}));
router.post('/logout',authenticate,route(async req=>{
  if(req.user.session_id){
    await pool.query('UPDATE account_sessions SET is_revoked=TRUE WHERE id=$1 AND account_id=$2',[req.user.session_id,req.user.account_id]);
  }
  await pool.query('UPDATE accounts SET session_version=session_version+1 WHERE id=$1',[req.user.account_id]);
  return null;
}));
module.exports={router,authenticate,context};

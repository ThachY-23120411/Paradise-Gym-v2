const express=require('express');
const {transaction}=require('../../db/postgres');
const {bookingList}=require('./bookings');
const {isExpiring,registrationState,listExpiring}=require('./registrationState');
const {pool,route,fail,text,date,today,addDays,choice,role,financial,globalAdmin,branch,scope,selected,row,audit}=require('./http');
const router=express.Router();
async function accessLogs(req,db=pool) {
  role(req,'QTV','RECEPTIONIST');const day=req.query.date?date(req.query.date):req.history?null:today();
  const from=req.query.date_from?date(req.query.date_from):day,to=req.query.date_to?date(req.query.date_to):day;
  return (await db.query(`SELECT l.*,m.full_name member_name,m.member_code,m.phone member_phone,r.package_name_snapshot,r.package_name_snapshot package_name,r.end_date registration_end_date,
    CASE WHEN r.id IS NOT NULL THEN to_jsonb(r)||jsonb_build_object(
      'is_paid',EXISTS(SELECT 1 FROM payments p WHERE p.registration_id=r.id),
      'has_scheduled_freeze',EXISTS(SELECT 1 FROM package_freezes f WHERE f.registration_id=r.id AND f.status='SCHEDULED')) END expiry_context,
    COALESCE(l.device_code_snapshot,d.device_code,'Quầy lễ tân') device_code,COALESCE(l.device_code_snapshot,d.device_name,'Quầy lễ tân') scan_point,
    COALESCE(a.full_name,a.login_phone,'Hệ thống') actor_name,COALESCE(a.full_name,a.login_phone,'Hệ thống') performed_by_name,
    l.access_method source,l.check_in_time event_time,COALESCE(l.denial_reason,l.manual_reason) reason,b.branch_name
    FROM access_logs l JOIN member_profiles m ON m.id=l.member_id JOIN branches b ON b.id=l.branch_id LEFT JOIN registrations r ON r.id=l.registration_id LEFT JOIN devices d ON d.id=l.device_id LEFT JOIN accounts a ON a.id=l.manual_recorded_by
    WHERE ($1::uuid[] IS NULL OR l.branch_id=ANY($1)) AND ($2::date IS NULL OR (l.check_in_time AT TIME ZONE b.timezone)::date>=$2) AND ($3::date IS NULL OR (l.check_in_time AT TIME ZONE b.timezone)::date<=$3) AND ($4::uuid IS NULL OR l.member_id=$4) ORDER BY l.check_in_time DESC,l.recorded_at DESC LIMIT 1000`,[scope(req),from,to,req.query.member_id||null])).rows.map(({expiry_context,...log})=>({...log,is_expiring:isExpiring(expiry_context)}));
}
router.get('/access-gate/today-logs',route(req=>accessLogs(req)));
router.get('/access-gate/logs',route(req=>{req.history=true;return accessLogs(req);}));
const gateIdentity=m=>({id:m.id,member_id:m.id,full_name:m.full_name,member_name:m.full_name,member_code:m.member_code,phone:m.phone,status:m.status});
async function gateMember(req,id,b,db=pool){
  const m=(await db.query(`SELECT m.id,m.full_name,m.member_code,m.phone,m.status FROM member_profiles m WHERE m.id=$1 AND (m.home_branch_id=$2 OR EXISTS(SELECT 1 FROM registrations r JOIN registration_allowed_branches a ON a.registration_id=r.id WHERE r.member_id=m.id AND a.branch_id=$2) OR EXISTS(SELECT 1 FROM access_logs l WHERE l.member_id=m.id AND l.branch_id=$2))`,[id,b])).rows[0];
  if(!m)fail(404,'Member not found at working branch','NOT_FOUND');return gateIdentity(m);
}
async function presence(id,b){
  const last=(await pool.query(`SELECT direction FROM access_logs l JOIN branches b ON b.id=l.branch_id WHERE l.member_id=$1 AND l.branch_id=$2 AND l.status='ALLOWED' AND (l.check_in_time AT TIME ZONE b.timezone)::date=(NOW() AT TIME ZONE b.timezone)::date ORDER BY l.check_in_time DESC,l.recorded_at DESC LIMIT 1`,[id,b])).rows[0];
  return {is_inside:last?.direction==='IN'};
}
router.get('/access-gate/members',route(async req=>{
  role(req,'QTV','RECEPTIONIST');const b=selected(req),q=text(req.query.q,'q',100);
  if(q.length<2)fail(400,'Search requires at least two characters');
  const rows=(await pool.query(`SELECT m.id,m.full_name,m.member_code,m.phone,m.status FROM member_profiles m WHERE (m.full_name ILIKE $1 OR m.member_code ILIKE $1 OR m.phone ILIKE $1) AND (m.home_branch_id=$2 OR EXISTS(SELECT 1 FROM registrations r JOIN registration_allowed_branches a ON a.registration_id=r.id WHERE r.member_id=m.id AND a.branch_id=$2) OR EXISTS(SELECT 1 FROM access_logs l WHERE l.member_id=m.id AND l.branch_id=$2)) ORDER BY m.member_code LIMIT 30`,['%'+q.replace(/[\\%_]/g,'\\$&')+'%',b])).rows;
  return rows.map(gateIdentity);
}));
router.get('/access-gate/member/:id',route(async req=>{
  role(req,'QTV','RECEPTIONIST');const b=selected(req),m=await gateMember(req,req.params.id,b);
  const registrations=(await pool.query(`SELECT r.id,r.reg_code,r.package_name_snapshot,r.package_type_snapshot,r.status,r.start_date,r.end_date,r.remaining_gym_sessions,r.remaining_pt_sessions,r.total_gym_sessions_snapshot,r.is_frozen,EXISTS(SELECT 1 FROM payments p WHERE p.registration_id=r.id AND (p.amount+p.discount_amount)=r.price_snapshot) is_paid FROM registrations r JOIN registration_allowed_branches a ON a.registration_id=r.id WHERE r.member_id=$1 AND a.branch_id=$2 ORDER BY r.created_at DESC`,[m.id,b])).rows;
  return {...m,registrations,allowed_registrations:registrations,...await presence(m.id,b)};
}));
router.get('/access-gate/presence',route(async req=>{
  role(req,'QTV','RECEPTIONIST');const b=selected(req,req.query.branch_id),m=await gateMember(req,req.query.member_id,b);
  return presence(m.id,b);
}));
router.get('/access-gate/config',route(async req=>{role(req,'QTV','RECEPTIONIST');const b=await row(pool,'branches',selected(req));return {branch_id:b.id,...b.gate_config,open_time:b.open_time,close_time:b.close_time,timezone:b.timezone};}));
router.put('/access-gate/config',route(async req=>{
  role(req,'QTV');if(!req.user.permissions.manage_devices)fail(403,'Device permission required');
  if(req.body.duplicate_seconds!==60||req.body.daily_gym_deduction_limit!==1)fail(400,'Gate policy requires 60 seconds and one deduction per day');
  return transaction(async db=>{const b=await row(db,'branches',selected(req),true),config={duplicate_seconds:60,daily_gym_deduction_limit:1};await db.query('UPDATE branches SET gate_config=$2,updated_at=NOW() WHERE id=$1',[b.id,config]);await audit(db,req,'branches',b.id,'GATE_CONFIG',b.gate_config,config,b.id);return config;});
}));
router.post('/access-gate/check-in',route(()=>fail(503,'Trusted gate event integration is not configured; use authorized manual check-in','DEVICE_UNAVAILABLE')));
router.post('/access-gate/manual-checkin',route(async req=>{
  role(req,'QTV','RECEPTIONIST');return transaction(async db=>{
    const b=await row(db,'branches',selected(req,req.body.branch_id),true);
    let id=req.body.member_id;if(!id&&req.body.phone)id=(await db.query('SELECT id FROM member_profiles WHERE phone=$1',[req.body.phone])).rows[0]?.id;
    const m=await row(db,'member_profiles',id,true),direction=choice(req.body.direction||'IN',['IN','OUT'],'direction');
    await gateMember(req,m.id,b.id,db);
    const reason=text(req.body.reason||req.body.manual_reason,'reason',255);
    const event=req.body.event_time?new Date(req.body.event_time):new Date();
    if(Number.isNaN(event.getTime())||event.getTime()>Date.now()+60000)fail(400,'Invalid event time');
    const local=(await db.query("SELECT ($1::timestamptz AT TIME ZONE $2)::date AS day,($1::timestamptz AT TIME ZONE $2)::time AS clock",[event,b.timezone])).rows[0];
    let denial=null,denialCode=null,reg=null,deduct=false;
    const deny=(code,reason)=>{if(!denial){denialCode=code;denial=reason;}};
    if((await db.query("SELECT 1 FROM access_logs WHERE member_id=$1 AND branch_id=$2 AND direction=$3 AND status='ALLOWED' AND ABS(EXTRACT(EPOCH FROM (check_in_time-$4::timestamptz)))<60",[m.id,b.id,direction,event])).rowCount)deny('DUPLICATE_SCAN','Lượt quét trùng trong vòng 60 giây.');
    if(direction==='IN'&&!denial){
      if(b.status!=='ACTIVE')deny('BRANCH_INACTIVE','Chi nhánh đã ngừng hoạt động.');
      else if(m.status!=='ACTIVE')deny('MEMBER_INACTIVE','Hồ sơ hội viên không hoạt động.');
      else if(local.clock<b.open_time||local.clock>b.close_time)deny('OUTSIDE_OPENING_HOURS','Ngoài giờ mở cửa của chi nhánh.');
      const rows=(await db.query(`SELECT r.*,EXISTS(SELECT 1 FROM registration_allowed_branches a WHERE a.registration_id=r.id AND a.branch_id=$2) branch_allowed FROM registrations r WHERE r.member_id=$1 AND ($3::uuid IS NULL OR r.id=$3) ORDER BY r.end_date NULLS LAST,r.created_at FOR UPDATE OF r`,[m.id,b.id,req.body.registration_id||null])).rows;
      if(req.body.registration_id&&!rows.length)deny('REGISTRATION_NOT_OWNED','Đăng ký được chọn không thuộc hội viên này hoặc không tồn tại.');
      const already=(await db.query(`SELECT 1 FROM access_logs l WHERE l.member_id=$1 AND l.is_gym_session_deducted AND (l.check_in_time AT TIME ZONE $2)::date=$3`,[m.id,b.timezone,local.day])).rowCount>0;
      let failure=null;
      for(const r of rows){
        let invalid=null;
        if(!r.branch_allowed)invalid=['WRONG_BRANCH','Gói không có quyền sử dụng tại chi nhánh này.'];
        else if(r.is_frozen)invalid=['PACKAGE_FROZEN','Gói tập đang trong thời gian đóng băng bảo lưu.'];
        else if(r.package_type_snapshot.startsWith('PT'))invalid=['GYM_ENTITLEMENT_REQUIRED','Gói chỉ có quyền tập PT, không bao gồm quyền vào tập Gym.'];
        else if(!(await db.query("SELECT 1 FROM payments WHERE registration_id=$1 AND (amount + COALESCE(discount_amount,0)) >= $2",[r.id,r.price_snapshot])).rowCount)invalid=['PAYMENT_REQUIRED','Đăng ký chưa được thanh toán đủ 100%.'];
        else if(!['ACTIVE','SCHEDULED','EXPIRED'].includes(r.status))invalid=['REGISTRATION_INACTIVE','Đăng ký không ở trạng thái được phép sử dụng.'];
        else if(r.start_date>local.day)invalid=['REGISTRATION_NOT_STARTED','Gói chưa đến ngày bắt đầu hiệu lực.'];
        else if(r.end_date&&r.end_date<local.day)invalid=['REGISTRATION_EXPIRED','Gói đã hết hạn tại thời điểm vào tập.'];
        else if(r.remaining_gym_sessions!=null&&r.remaining_gym_sessions<=0&&!already)invalid=['GYM_SESSIONS_EXHAUSTED','Gói đã hết buổi Gym và chưa có lượt khấu trừ hợp lệ trong ngày.'];
        if(invalid){failure||=invalid;if(req.body.registration_id)reg=r;continue;}
        reg=r;deduct=r.remaining_gym_sessions!=null&&!already;break;
      }
      const matched=reg&&(!req.body.registration_id||!failure);
      if(!matched&&!denial)deny(...(failure||['NO_GYM_REGISTRATION','Hội viên chưa có đăng ký gói cho phép vào tập Gym.']));
    }
    if(direction==='OUT'&&req.body.registration_id){reg=await row(db,'registrations',req.body.registration_id);if(reg.member_id!==m.id)fail(400,'Registration does not belong to member');}
    const checkinMethod = req.body.checkin_method || 'MANUAL';
    const accessMethod = req.body.access_method || (checkinMethod === 'QR' ? 'QR_CODE' : 'MANUAL');
    const saved=(await db.query(`INSERT INTO access_logs(member_id,registration_id,branch_id,direction,access_method,checkin_method,status,denial_reason,is_duplicate_warning,is_gym_session_deducted,manual_recorded_by,manual_reason,check_in_time)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,[m.id,reg?.id||null,b.id,direction,accessMethod,checkinMethod,denial?'DENIED':'ALLOWED',denial,denialCode==='DUPLICATE_SCAN',!denial&&deduct,req.user.account_id,reason,event])).rows[0];
    if(!denial&&deduct){await db.query('UPDATE registrations SET remaining_gym_sessions=remaining_gym_sessions-1,updated_at=NOW() WHERE id=$1',[reg.id]);reg.remaining_gym_sessions-=1;}
    await audit(db,req,'access_logs',saved.id,'MANUAL_ACCESS',null,{direction,status:saved.status,event_time:event,member_id:m.id,denial_code:denialCode},b.id,reason);
    
    // Kiosk greeting payload (chúc mừng sinh nhật & cảnh báo sắp hết hạn <= 4 ngày)
    const isBirthday = m.date_of_birth ? (
      new Date(m.date_of_birth).getMonth() === new Date().getMonth() &&
      new Date(m.date_of_birth).getDate() === new Date().getDate()
    ) : false;
    const daysLeft = reg?.end_date ? Math.floor((Date.parse(reg.end_date) - Date.parse(today())) / 86400000) : null;
    const isExpiringSoon = isExpiring(reg);

    const kioskGreeting = {
      is_birthday_today: isBirthday,
      birthday_message: isBirthday ? `Chúc mừng sinh nhật ${m.full_name}! Paradise Gym chúc bạn tuổi mới ngập tràn năng lượng và sức khỏe!` : null,
      is_expiring_soon: isExpiringSoon,
      is_expiring: isExpiringSoon,
      days_remaining: daysLeft,
      remaining_pt_sessions: Number(reg?.total_pt_sessions_snapshot)>0 ? reg.remaining_pt_sessions : null,
      remaining_gym_sessions: Number(reg?.total_gym_sessions_snapshot)>0 ? reg.remaining_gym_sessions : null,
      expiring_message: isExpiringSoon ? 'Gói tập sắp hết hạn. Vui lòng liên hệ Lễ tân để gia hạn!' : null,
      days_left: daysLeft,
      avatar_url: m.avatar_url
    };

    return {
      allowed:!denial,reason:denial,denial_code:denialCode,reason_code:denialCode,log:saved,
      member:gateIdentity(m),registration:reg?{id:reg.id,reg_code:reg.reg_code,package_name_snapshot:reg.package_name_snapshot}:null,
      kiosk_greeting: kioskGreeting,
      door_command_sent:false,device_integration:'NOT_CONFIGURED'
    };
  });
}));

// POST /access-gate/qr-checkin - Check-in tự động bằng mã QR cá nhân trên App Hội viên
router.post('/access-gate/qr-checkin', route(async req => {
  const qrCode = req.body.qr_code;
  if (!qrCode) fail(400, 'Vui lòng cung cấp mã QR');
  const branchId = selected(req, req.body.branch_id);

  const member = (await pool.query('SELECT * FROM member_profiles WHERE qr_code = $1', [qrCode])).rows[0];
  if (!member) fail(404, 'Mã QR không hợp lệ hoặc không tìm thấy hội viên', 'MEMBER_NOT_FOUND');

  // Gọi logic check-in dùng chung với checkin_method = 'QR'
  req.body.member_id = member.id;
  req.body.branch_id = branchId;
  req.body.direction = req.body.direction || 'IN';
  req.body.manual_reason = 'Check-in bằng mã QR tại cổng';
  req.body.checkin_method = 'QR';
  req.body.access_method = 'QR_CODE';

  return transaction(async db => {
    const b = await row(db, 'branches', branchId, true);
    const m = member;
    const direction = req.body.direction;
    const event = new Date();
    const local = (await db.query("SELECT ($1::timestamptz AT TIME ZONE $2)::date AS day,($1::timestamptz AT TIME ZONE $2)::time AS clock", [event, b.timezone])).rows[0];
    let denial = null, denialCode = null, reg = null, deduct = false;
    const deny = (code, reason) => { if (!denial) { denialCode = code; denial = reason; } };

    if ((await db.query("SELECT 1 FROM access_logs WHERE member_id=$1 AND branch_id=$2 AND direction=$3 AND status='ALLOWED' AND ABS(EXTRACT(EPOCH FROM (check_in_time-$4::timestamptz)))<60", [m.id, b.id, direction, event])).rowCount) {
      deny('DUPLICATE_SCAN', 'Lượt quét trùng trong vòng 60 giây.');
    }

    if (direction === 'IN' && !denial) {
      if (b.status !== 'ACTIVE') deny('BRANCH_INACTIVE', 'Chi nhánh đã ngừng hoạt động.');
      else if (m.status !== 'ACTIVE') deny('MEMBER_INACTIVE', 'Hồ sơ hội viên không hoạt động.');
      else if (local.clock < b.open_time || local.clock > b.close_time) deny('OUTSIDE_OPENING_HOURS', 'Ngoài giờ mở cửa của chi nhánh.');
      
      const rows = (await db.query(`SELECT r.*, EXISTS(SELECT 1 FROM registration_allowed_branches a WHERE a.registration_id=r.id AND a.branch_id=$2) branch_allowed FROM registrations r WHERE r.member_id=$1 ORDER BY r.end_date NULLS LAST, r.created_at FOR UPDATE OF r`, [m.id, b.id])).rows;
      const already = (await db.query(`SELECT 1 FROM access_logs l WHERE l.member_id=$1 AND l.is_gym_session_deducted AND (l.check_in_time AT TIME ZONE $2)::date=$3`, [m.id, b.timezone, local.day])).rowCount > 0;
      let failure = null;

      for (const r of rows) {
        let invalid = null;
        if (!r.branch_allowed) invalid = ['WRONG_BRANCH', 'Gói không có quyền sử dụng tại chi nhánh này.'];
        else if (r.is_frozen) invalid = ['PACKAGE_FROZEN', 'Gói tập đang trong thời gian đóng băng bảo lưu.'];
        else if (r.package_type_snapshot.startsWith('PT')) invalid = ['GYM_ENTITLEMENT_REQUIRED', 'Gói chỉ có quyền tập PT, không bao gồm quyền vào tập Gym.'];
        else if (!(await db.query("SELECT 1 FROM payments WHERE registration_id=$1 AND (amount + COALESCE(discount_amount,0)) >= $2", [r.id, r.price_snapshot])).rowCount) invalid = ['PAYMENT_REQUIRED', 'Đăng ký chưa được thanh toán đủ 100%.'];
        else if (!['ACTIVE', 'SCHEDULED'].includes(r.status)) invalid = ['REGISTRATION_INACTIVE', 'Đăng ký không ở trạng thái được phép sử dụng.'];
        else if (r.start_date > local.day) invalid = ['REGISTRATION_NOT_STARTED', 'Gói chưa đến ngày bắt đầu hiệu lực.'];
        else if (r.end_date && r.end_date < local.day) invalid = ['REGISTRATION_EXPIRED', 'Gói đã hết hạn tại thời điểm vào tập.'];
        else if (r.remaining_gym_sessions != null && r.remaining_gym_sessions <= 0 && !already) invalid = ['GYM_SESSIONS_EXHAUSTED', 'Gói đã hết buổi Gym.'];
        
        if (invalid) { failure ||= invalid; continue; }
        reg = r; deduct = r.remaining_gym_sessions != null && !already; break;
      }
      if (!reg && !denial) deny(...(failure || ['NO_GYM_REGISTRATION', 'Hội viên chưa có đăng ký gói cho phép vào tập Gym.']));
    }

    const saved = (await db.query(`
      INSERT INTO access_logs(member_id, registration_id, branch_id, direction, access_method, checkin_method, status, denial_reason, is_duplicate_warning, is_gym_session_deducted, manual_recorded_by, manual_reason, check_in_time)
      VALUES($1, $2, $3, $4, 'QR_CODE', 'QR', $5, $6, $7, $8, $9, 'Check-in bằng mã QR tại cổng', $10)
      RETURNING *
    `, [m.id, reg?.id || null, b.id, direction, denial ? 'DENIED' : 'ALLOWED', denial, denialCode === 'DUPLICATE_SCAN', !denial && deduct, req.user.account_id, event])).rows[0];

    if (!denial && deduct) {await db.query('UPDATE registrations SET remaining_gym_sessions = remaining_gym_sessions - 1, updated_at = NOW() WHERE id = $1', [reg.id]);reg.remaining_gym_sessions-=1;}

    const isBirthday = m.date_of_birth ? (
      new Date(m.date_of_birth).getMonth() === new Date().getMonth() &&
      new Date(m.date_of_birth).getDate() === new Date().getDate()
    ) : false;
    const daysLeft = reg?.end_date ? Math.floor((Date.parse(reg.end_date) - Date.parse(today())) / 86400000) : null;
    const isExpiringSoon = isExpiring(reg);

    return {
      allowed: !denial,
      reason: denial,
      denial_code: denialCode,
      log: saved,
      member: gateIdentity(m),
      registration: reg ? { id: reg.id, reg_code: reg.reg_code, package_name_snapshot: reg.package_name_snapshot } : null,
      kiosk_greeting: {
        is_birthday_today: isBirthday,
        birthday_message: isBirthday ? `Chúc mừng sinh nhật ${m.full_name}! Paradise Gym chúc bạn tuổi mới ngập tràn năng lượng và sức khỏe!` : null,
        is_expiring_soon: isExpiringSoon,
        is_expiring: isExpiringSoon,
        days_remaining: daysLeft,
        remaining_pt_sessions: Number(reg?.total_pt_sessions_snapshot)>0 ? reg.remaining_pt_sessions : null,
        remaining_gym_sessions: Number(reg?.total_gym_sessions_snapshot)>0 ? reg.remaining_gym_sessions : null,
        expiring_message: isExpiringSoon ? 'Gói tập sắp hết hạn. Vui lòng liên hệ Lễ tân để gia hạn!' : null,
        days_left: daysLeft,
        avatar_url: m.avatar_url
      }
    };
  });
}));

// GET /access-gate/kiosk-greeting/:memberId - Lấy thông điệp chào mừng Kiosk K01
router.get('/access-gate/kiosk-greeting/:memberId', route(async req => {
  const m = await row(pool, 'member_profiles', req.params.memberId);
  const isBirthday = m.date_of_birth ? (
    new Date(m.date_of_birth).getMonth() === new Date().getMonth() &&
    new Date(m.date_of_birth).getDate() === new Date().getDate()
  ) : false;

  const reg = (await pool.query(`
    SELECT r.*, (r.end_date - CURRENT_DATE) AS days_left, EXISTS(SELECT 1 FROM payments p WHERE p.registration_id=r.id) is_paid
    FROM registrations r
    WHERE r.member_id = $1 AND r.status IN ('ACTIVE','SCHEDULED') AND r.start_date<=CURRENT_DATE AND (r.end_date IS NULL OR r.end_date >= CURRENT_DATE)
    ORDER BY r.end_date ASC LIMIT 1
  `, [m.id])).rows[0];

  const daysLeft = reg?.days_left == null ? null : Number(reg.days_left);
  const isExpiringSoon = isExpiring(reg);

  return {
    member_id: m.id,
    member_code: m.member_code,
    full_name: m.full_name,
    avatar_url: m.avatar_url,
    package_name: reg?.package_name_snapshot || null,
    days_left: daysLeft,
    is_birthday_today: isBirthday,
    birthday_message: isBirthday ? `Chúc mừng sinh nhật ${m.full_name}! Paradise Gym chúc bạn tuổi mới ngập tràn năng lượng và sức khỏe!` : null,
    is_expiring_soon: isExpiringSoon,
    is_expiring: isExpiringSoon,
    days_remaining: daysLeft,
    remaining_pt_sessions: Number(reg?.total_pt_sessions_snapshot)>0 ? reg.remaining_pt_sessions : null,
    remaining_gym_sessions: Number(reg?.total_gym_sessions_snapshot)>0 ? reg.remaining_gym_sessions : null,
    expiring_message: isExpiringSoon ? 'Gói tập sắp hết hạn. Vui lòng liên hệ Lễ tân để gia hạn!' : null
  };
}));

async function branchStats(req,db=pool) {
  globalAdmin(req);const b=await row(db,'branches',req.params.id);
  const counts=(await db.query(`SELECT
    (SELECT COUNT(*)::int FROM member_profiles WHERE home_branch_id=$1) member_count,
    (SELECT COUNT(*)::int FROM pt_profiles WHERE branch_id=$1 AND status='ACTIVE') pt_count,
    (SELECT COUNT(*)::int FROM (SELECT DISTINCT ON(member_id) direction FROM access_logs WHERE branch_id=$1 AND status='ALLOWED' AND (check_in_time AT TIME ZONE $2)::date=(NOW() AT TIME ZONE $2)::date ORDER BY member_id,check_in_time DESC,recorded_at DESC) l WHERE direction='IN') currently_training,
    (SELECT COUNT(*)::int FROM access_logs WHERE branch_id=$1 AND status='ALLOWED' AND direction='IN' AND date_trunc('month',check_in_time AT TIME ZONE $2)=date_trunc('month',NOW() AT TIME ZONE $2)) monthly_checkins,
    (SELECT COUNT(*)::int FROM pt_bookings WHERE branch_id=$1 AND status='COMPLETED' AND date_trunc('month',booking_date)=date_trunc('month',NOW() AT TIME ZONE $2)) monthly_completed_pt`,[b.id,b.timezone])).rows[0];
  const active=(await db.query(`SELECT r.package_type_snapshot type,COUNT(*)::int count FROM registrations r JOIN member_profiles m ON m.id=r.member_id WHERE m.home_branch_id=$1 AND r.status IN ('ACTIVE','SCHEDULED') AND r.start_date<=CURRENT_DATE AND (r.end_date IS NULL OR r.end_date>=CURRENT_DATE) AND EXISTS(SELECT 1 FROM payments p WHERE p.registration_id=r.id) GROUP BY r.package_type_snapshot`,[b.id])).rows;
  const parts={gym:0,pt:0,combo:0};for(const a of active)parts[a.type==='COMBO'?'combo':a.type.startsWith('PT')?'pt':'gym']+=a.count;
  return {...b,...counts,active_packages:parts};
}
router.get('/branches/:id/stats',route(req=>branchStats(req)));
router.get('/dashboard',route(async req=>{
  role(req,'QTV','RECEPTIONIST');const day=date(req.query.date||today()),ids=scope(req);
  const metrics=(await pool.query(`SELECT
    (SELECT COUNT(*)::int FROM member_profiles WHERE status='ACTIVE' AND ($1::uuid[] IS NULL OR home_branch_id=ANY($1))) active_members,
    (SELECT COALESCE(SUM(amount),0) FROM payments WHERE ($1::uuid[] IS NULL OR branch_id=ANY($1)) AND (confirmed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date=$2) cash_received,
    (SELECT COUNT(*)::int FROM pt_bookings WHERE status<>'CANCELLED' AND ($1::uuid[] IS NULL OR branch_id=ANY($1)) AND booking_date=$2) pt_bookings,
    (SELECT COUNT(*)::int FROM access_logs WHERE status='ALLOWED' AND direction='IN' AND ($1::uuid[] IS NULL OR branch_id=ANY($1)) AND (check_in_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date=$2) checkins,
    (SELECT COUNT(*)::int FROM registrations WHERE status='PENDING_PAYMENT' AND ($1::uuid[] IS NULL OR sold_branch_id=ANY($1))) pending_registrations,
    (SELECT COUNT(*)::int FROM pt_assignment_requests a JOIN registrations r ON r.id=a.registration_id WHERE a.status='PENDING' AND ($1::uuid[] IS NULL OR r.sold_branch_id=ANY($1))) pending_requests`,[ids,day])).rows[0];
  metrics.expiring_packages=(await listExpiring(pool,ids,day)).length;
  if(req.user.active_role!=='QTV'||!req.user.permissions.view_financial)delete metrics.cash_received;
  const tasks=(await pool.query(`SELECT
    (SELECT COUNT(*)::int FROM pt_bookings WHERE status='BOOKED' AND ($1::uuid[] IS NULL OR branch_id=ANY($1)) AND (booking_date+start_time)>(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')) upcoming_bookings,
    (SELECT COUNT(*)::int FROM pt_bookings WHERE status IN ('PENDING_COMPLETION','AWAITING_CONFIRMATION') AND ($1::uuid[] IS NULL OR branch_id=ANY($1))) awaiting_bookings,
    (SELECT COUNT(*)::int FROM registrations WHERE total_pt_sessions_snapshot>0 AND assigned_pt_id IS NULL AND status IN ('ACTIVE','SCHEDULED','PENDING_PAYMENT') AND ($1::uuid[] IS NULL OR sold_branch_id=ANY($1))) unassigned_registrations,
    (SELECT COUNT(*)::int FROM devices WHERE enabled AND status<>'INACTIVE' AND (last_heartbeat_at IS NULL OR last_heartbeat_at<=NOW()-interval '2 minutes' OR last_heartbeat_at>NOW() OR NULLIF(BTRIM(last_error),'') IS NOT NULL OR status<>'ONLINE') AND ($1::uuid[] IS NULL OR branch_id=ANY($1))) offline_devices`,[ids])).rows[0];
  const dailyReq={user:req.user,headers:req.headers,query:{...req.query,date:day}};
  return {metrics,tasks:{...tasks,pending_registrations:metrics.pending_registrations},access_logs:await accessLogs(dailyReq),bookings:(await bookingList(dailyReq)).filter(b=>b.status!=='CANCELLED')};
}));
router.get('/reports',route(async req=>{
  role(req,'QTV');financial(req);
  const period=choice(req.query.period||'month',['month','quarter','year'],'period'),now=today(),year=Number(req.query.year||now.slice(0,4)),month=Number(req.query.month||now.slice(5,7)),quarter=Number(req.query.quarter||Math.ceil(month/3));
  if(!Number.isInteger(year)||year<2000||year>2200||!Number.isInteger(month)||month<1||month>12||!Number.isInteger(quarter)||quarter<1||quarter>4)fail(400,'Invalid reporting period');
  const firstMonth=period==='year'?1:period==='quarter'?(quarter-1)*3+1:month,months=period==='year'?12:period==='quarter'?3:1;
  const start=`${year}-${String(firstMonth).padStart(2,'0')}-01`,endExclusive=new Date(Date.UTC(year,firstMonth-1+months,1)).toISOString().slice(0,10),last=addDays(endExclusive,-1),end=period==='month'&&now>=start&&now<=last?now:last;
  const ids=scope(req),bucket=period==='month'?'YYYY-MM-DD':'YYYY-MM';
  const revenue=(await pool.query(`SELECT to_char(p.confirmed_at AT TIME ZONE b.timezone,$4) period,COUNT(*)::int packages_sold,SUM(p.amount) cash_received,
    COUNT(*) FILTER(WHERE r.package_type_snapshot LIKE 'GYM%')::int gym,COUNT(*) FILTER(WHERE r.package_type_snapshot LIKE 'PT%')::int pt,COUNT(*) FILTER(WHERE r.package_type_snapshot='COMBO')::int combo
    FROM payments p JOIN registrations r ON r.id=p.registration_id JOIN branches b ON b.id=p.branch_id WHERE ($1::uuid[] IS NULL OR p.branch_id=ANY($1)) AND (p.confirmed_at AT TIME ZONE b.timezone)::date BETWEEN $2 AND $3 GROUP BY 1 ORDER BY 1`,[ids,start,end,bucket])).rows.map(r=>({...r,service_breakdown:`Gym: ${r.gym} | PT: ${r.pt} | Combo: ${r.combo}`,service_counts:{gym:r.gym,pt:r.pt,combo:r.combo}}));
  const metrics={cash_received:revenue.reduce((a,r)=>a+r.cash_received,0),packages_sold:revenue.reduce((a,r)=>a+r.packages_sold,0)};
  metrics.package_value=Number((await pool.query("SELECT COALESCE(SUM(price_snapshot),0) value FROM registrations WHERE status<>'CANCELLED' AND ($1::uuid[] IS NULL OR sold_branch_id=ANY($1)) AND (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN $2 AND $3",[ids,start,end])).rows[0].value);
  metrics.completed_pt=Number((await pool.query("SELECT COUNT(*) FROM pt_bookings WHERE status='COMPLETED' AND ($1::uuid[] IS NULL OR branch_id=ANY($1)) AND booking_date BETWEEN $2 AND $3",[ids,start,end])).rows[0].count);
  const distribution = (await pool.query(`SELECT r.package_name_snapshot package_name, COALESCE(r.package_type_snapshot, 'GYM') package_type, COUNT(*)::int count, COALESCE(SUM(p.amount), 0) revenue FROM payments p JOIN registrations r ON r.id=p.registration_id WHERE ($1::uuid[] IS NULL OR p.branch_id=ANY($1)) AND (p.confirmed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN $2 AND $3 GROUP BY 1, 2 ORDER BY 3 DESC`, [ids, start, end])).rows.map(r => ({ ...r, percentage: metrics.packages_sold ? Math.round(r.count / metrics.packages_sold * 10000) / 100 : 0 }));
  const pt_performance = (await pool.query(`
    SELECT pt.id, pt.full_name AS pt_name, pt.pt_code, pt.phone,
           COUNT(b.id)::int AS completed_sessions,
           COUNT(DISTINCT b.member_id)::int AS unique_students
    FROM pt_profiles pt
    LEFT JOIN pt_bookings b ON b.pt_id = pt.id 
      AND b.status = 'COMPLETED' 
      AND ($1::uuid[] IS NULL OR b.branch_id = ANY($1))
      AND b.booking_date BETWEEN $2 AND $3
    WHERE ($1::uuid[] IS NULL OR pt.branch_id = ANY($1))
    GROUP BY pt.id, pt.full_name, pt.pt_code, pt.phone
    ORDER BY completed_sessions DESC, pt.full_name ASC
  `, [ids, start, end])).rows;
  const comparison = [];
  for (let i = 2; i >= 0; i--) {
    const a = new Date(Date.UTC(year, firstMonth - 1 - i * months, 1)).toISOString().slice(0, 10), z = new Date(Date.UTC(year, firstMonth - 1 + (1 - i) * months, 1)).toISOString().slice(0, 10);
    const value = (await pool.query("SELECT COALESCE(SUM(amount),0) cash_received FROM payments WHERE ($1::uuid[] IS NULL OR branch_id=ANY($1)) AND (confirmed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= $2 AND (confirmed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date < $3", [ids, a, z])).rows[0].cash_received;
    comparison.push({ period: period === 'year' ? a.slice(0, 4) : period === 'quarter' ? `${a.slice(0, 4)} Q${Math.ceil(Number(a.slice(5, 7)) / 3)}` : a.slice(0, 7), cash_received: value });
  }
  return { metrics, revenue, comparison, distribution, pt_performance, start_date: start, end_date: end };
}));
module.exports={router,accessLogs,branchStats};

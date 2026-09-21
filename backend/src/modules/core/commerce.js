const express=require('express');
const {transaction}=require('../../db/postgres');
const {generateVietQR}=require('../../utils/vietqr');
const {emit}=require('./notifications');
const {canMember,trainerView}=require('./catalog');
const H=require('./http');
const {effective,registrationState}=require('./registrationState');
const {pool,route,fail,text,phone,date,today,addDays,choice,only,isStaff,role,financial,branch,selected,scope,row,activeBranch,audit,code,page,search}=H;
const router=express.Router();
async function registrationAccess(req,r) {
  if(isStaff(req)){branch(req,r.sold_branch_id);return;}
  if(req.user.active_role==='MEMBER') {
    if (r.member_id===req.user.member_profile_id || r.group_leader_member_id===req.user.member_profile_id) return;
    const inGroup = (await pool.query("SELECT 1 FROM group_pt_members WHERE registration_id=$1 AND member_id=$2 AND invitation_status='ACCEPTED'", [r.id, req.user.member_profile_id])).rowCount > 0;
    if (inGroup) return;
  }
  if(req.user.active_role==='PT'&&r.assigned_pt_id===req.user.pt_profile_id)return;
  fail(403,'Registration outside authorized scope','FORBIDDEN');
}
async function autoResolveFreezes(db = pool) {
  // 1. Tự động kết thúc các đợt đóng băng đã đến ngày hết hạn
  await db.query(`
    UPDATE package_freezes SET status = 'ENDED' WHERE status = 'ACTIVE' AND end_date <= CURRENT_DATE;
  `);
  // 2. Gỡ cờ is_frozen = FALSE cho các hợp đồng không còn đợt đóng băng nào ACTIVE
  await db.query(`
    UPDATE registrations r
    SET is_frozen = FALSE, updated_at = NOW()
    WHERE is_frozen = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM package_freezes pf WHERE pf.registration_id = r.id AND pf.status = 'ACTIVE'
      );
  `);
}
async function listRegistrations(req,db=pool) {
  await autoResolveFreezes(db);
  await db.query("UPDATE registrations SET status='ACTIVE', updated_at=NOW() WHERE status='SCHEDULED' AND start_date <= CURRENT_DATE");
  const list=(await db.query(`SELECT r.*,m.full_name member_name,m.member_code,m.phone member_phone,m.home_branch_id,
    b.branch_name sold_branch_name,b.branch_name,pt.full_name pt_name,pt.pt_code,pt.full_name assigned_pt_name,pt.pt_code assigned_pt_code,r.reg_code registration_code,
    (SELECT branch_name FROM branches WHERE id=m.home_branch_id) member_home_branch_name,
    ARRAY(SELECT branch_id FROM registration_allowed_branches WHERE registration_id=r.id) allowed_branch_ids,
    EXISTS(SELECT 1 FROM payments p WHERE p.registration_id=r.id) is_paid,
    FALSE has_scheduled_freeze,
    (SELECT COUNT(*)::int FROM group_pt_members gm WHERE gm.registration_id=r.id AND gm.invitation_status IN ('PENDING','ACCEPTED')) group_invited_count,
    COALESCE(pkg.session_duration_minutes, 60)::int session_duration_minutes
    FROM registrations r JOIN member_profiles m ON m.id=r.member_id JOIN branches b ON b.id=r.sold_branch_id LEFT JOIN pt_profiles pt ON pt.id=r.assigned_pt_id LEFT JOIN packages pkg ON pkg.id=r.package_id
    WHERE ($1::uuid[] IS NULL OR r.sold_branch_id=ANY($1)) AND ($2 OR r.member_id=$3 OR r.assigned_pt_id=$4 OR EXISTS (SELECT 1 FROM group_pt_members gm WHERE gm.registration_id=r.id AND gm.member_id=$3 AND gm.invitation_status='ACCEPTED'))
    ORDER BY r.created_at DESC`,[isStaff(req)?scope(req):null,isStaff(req),req.user.active_role==='MEMBER'?req.user.member_profile_id:null,req.user.active_role==='PT'?req.user.pt_profile_id:null])).rows.map(r=>({...r,status:effective(r),total_group_members:1+(r.group_invited_count||0),max_group_members:r.max_group_members_snapshot||3,is_group_member:Boolean(req.user.active_role==='MEMBER'&&req.user.member_profile_id&&r.member_id!==req.user.member_profile_id)}));
  const items=search(list,{...req.query,status:req.query.status==='EXPIRING'?null:req.query.status},['reg_code','member_name','member_phone','package_name_snapshot']).filter(r=>(!req.query.member_id||r.member_id===req.query.member_id)&&(!req.query.pt_id||r.assigned_pt_id===req.query.pt_id)&&
    (req.query.assigned_pt!=='assigned'||r.assigned_pt_id)&&(req.query.assigned_pt!=='unassigned'||(!r.assigned_pt_id&&r.total_pt_sessions_snapshot>0))&&(req.query.status!=='EXPIRING'||r.status==='ACTIVE'&&r.end_date<=addDays(today(),14)));
  if(req.user.active_role==='PT')items.forEach(r=>{delete r.price_snapshot;});return items;
}
router.get('/registrations',route(req=>listRegistrations(req)));
router.get('/registrations/:id',route(async req=>{
  await autoResolveFreezes();
  const r=await row(pool,'registrations',req.params.id);await registrationAccess(req,r);
  const member=await row(pool,'member_profiles',r.member_id),allowed=(await pool.query('SELECT b.* FROM registration_allowed_branches a JOIN branches b ON b.id=a.branch_id WHERE a.registration_id=$1',[r.id])).rows;
  const payments=req.user.active_role==='PT'?[]:(await pool.query('SELECT * FROM payments WHERE registration_id=$1 ORDER BY created_at DESC',[r.id])).rows;
  const assigned=r.assigned_pt_id?await trainerView(req,await row(pool,'pt_profiles',r.assigned_pt_id)):null;
  const creator=r.created_by?(await pool.query('SELECT COALESCE(full_name,login_phone) name FROM accounts WHERE id=$1',[r.created_by])).rows[0]:null;
  const checkins=Number((await pool.query("SELECT count(*) FROM access_logs WHERE registration_id=$1 AND status='ALLOWED' AND direction='IN'",[r.id])).rows[0].count);
  const freezes = (await pool.query(`
    SELECT pf.*, a.full_name approved_by_name
    FROM package_freezes pf
    LEFT JOIN accounts a ON a.id = pf.approved_by_account_id
    WHERE pf.registration_id = $1
    ORDER BY pf.created_at DESC
  `, [r.id])).rows;
  const transfers = (await pool.query(`
    SELECT pt.*,
      fm.full_name from_member_name, fm.member_code from_member_code,
      tm.full_name to_member_name, tm.member_code to_member_code,
      a.full_name approved_by_name
    FROM package_transfers pt
    JOIN member_profiles fm ON fm.id = pt.from_member_id
    JOIN member_profiles tm ON tm.id = pt.to_member_id
    LEFT JOIN accounts a ON a.id = pt.approved_by_account_id
    WHERE pt.registration_id = $1
    ORDER BY pt.created_at DESC
  `, [r.id])).rows;
  if(req.user.active_role==='PT')delete r.price_snapshot;
  r.has_scheduled_freeze = freezes.some(f => f.status === 'SCHEDULED');
  return {...r,registration_code:r.reg_code,status:effective(r),has_scheduled_freeze:r.has_scheduled_freeze,member,member_name:member.full_name,member_code:member.member_code,member_phone:member.phone,allowed_branches:allowed,assigned_pt:assigned,pt_name:assigned?.full_name||null,payments,created_by_name:creator?.name||null,freezes,transfers,
    progress:{elapsed_days:Math.max(0,Math.floor((Date.parse(today())-Date.parse(r.start_date))/86400000)),remaining_days:r.end_date?Math.max(0,Math.floor((Date.parse(r.end_date)-Date.parse(today()))/86400000)):null,total_days:r.duration_days_snapshot,checkins,total_pt_sessions:r.total_pt_sessions_snapshot,used_pt_sessions:r.used_pt_sessions,booked_pt_sessions:r.booked_pt_sessions,remaining_pt_sessions:r.remaining_pt_sessions}};
}));
async function createRegistration(req) {
  role(req,'QTV','RECEPTIONIST','MEMBER');
  only(req.body,['member_id','package_id','start_date','sold_branch_id','previous_registration_id']);
  return transaction(async db=>{
    const oldId=req.params.id||req.body.previous_registration_id;
    const old=oldId?await row(db,'registrations',oldId,true):null;if(old)await registrationAccess(req,old);
    const member=await row(db,'member_profiles',old?old.member_id:req.body.member_id,true);await canMember(req,member,db);
    if(member.status!=='ACTIVE')fail(409,'Member is inactive');
    const branchId=isStaff(req)?selected(req,req.body.sold_branch_id):(req.body.sold_branch_id||member.home_branch_id);
    if(!isStaff(req)&&branchId!==member.home_branch_id)fail(403,'Member purchase branch must be the home branch');
    await activeBranch(db,branchId);
    const p=await row(db,'packages',req.body.package_id||old?.package_id,true);
    if(p.status!=='ACTIVE')fail(409,'Package is not on sale');
    const allowed=(await db.query('SELECT branch_id FROM package_branches WHERE package_id=$1',[p.id])).rows.map(x=>x.branch_id);
    if(old && (old.is_frozen || effective(old) === 'FROZEN')) {
      fail(409, 'Gói tập đang ở trạng thái đóng băng, không thể gia hạn. Vui lòng mở đóng băng trước khi gia hạn.', 'FROZEN_CANNOT_RENEW');
    }
    if(old&&!old.end_date)fail(409,'Undated session package cannot be renewed as a continuous period');

    // RULE: Mua gói PT bắt buộc phải có gói Gym còn hiệu lực
    if (p.package_type === 'PT_SESSION') {
      const hasActiveGym = (await db.query(`
        SELECT 1 FROM registrations
        WHERE member_id = $1 AND package_type_snapshot IN ('GYM_TIME', 'GYM_SESSION', 'COMBO')
          AND status IN ('ACTIVE', 'SCHEDULED') AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        LIMIT 1
      `, [member.id])).rowCount > 0;
      if (!hasActiveGym) {
        fail(400, 'Hội viên bắt buộc phải có gói Gym còn hiệu lực sử dụng mới được đăng ký gói PT', 'ACTIVE_GYM_REQUIRED');
      }
    }


    const start=date(req.body.start_date||(old?addDays(old.end_date>today()?old.end_date:today(),1):today()));
    if(start<today())fail(400,'New registrations cannot start in the past');
    if(old&&old.end_date>=today()&&start<=old.end_date)fail(409,'Renewal must start after the previous period');
    const end=p.duration_days?addDays(start,p.duration_days):null;

    const gymPriceSnap = p.gym_price != null ? Number(p.gym_price) : (p.package_type.startsWith('GYM') ? Number(p.price) : (p.package_type === 'COMBO' ? Math.round(Number(p.price) * 0.3) : 0));
    const ptPriceSnap = p.pt_price != null ? Number(p.pt_price) : (p.package_type === 'PT_SESSION' ? Number(p.price) : (p.package_type === 'COMBO' ? Math.round(Number(p.price) * 0.7) : 0));
    const comboPriceSnap = p.combo_price != null ? Number(p.combo_price) : (p.package_type === 'COMBO' ? Number(p.price) : 0);
    const pkgMode = p.package_mode || 'INDIVIDUAL';
    const groupLeaderId = ['GROUP_PT', 'GROUP_1_N'].includes(pkgMode) ? member.id : null;
    const maxGroupMembersSnap = p.max_group_members != null ? Number(p.max_group_members) : (['GROUP_1_N', 'GROUP_PT'].includes(pkgMode) ? 3 : null);

    const r=(await db.query(`INSERT INTO registrations(reg_code,member_id,package_id,sold_branch_id,previous_registration_id,package_name_snapshot,package_type_snapshot,price_snapshot,gym_price_snapshot,pt_price_snapshot,combo_price_snapshot,duration_days_snapshot,total_gym_sessions_snapshot,total_pt_sessions_snapshot,start_date,end_date,remaining_gym_sessions,remaining_pt_sessions,package_mode,group_leader_member_id,max_group_members_snapshot,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$13,$14,$17,$18,$19,$20) RETURNING *`,[await code(db,'registrations','reg_code','DK'),member.id,p.id,branchId,old?.id||null,p.package_name,p.package_type,p.price,gymPriceSnap,ptPriceSnap,comboPriceSnap,p.duration_days,p.total_gym_sessions,p.total_pt_sessions,start,end,pkgMode,groupLeaderId,maxGroupMembersSnap,req.user.account_id])).rows[0];
    for(const id of allowed)await db.query('INSERT INTO registration_allowed_branches VALUES($1,$2)',[r.id,id]);
    await audit(db,req,'registrations',r.id,old?'REGISTRATION_RENEWED':'REGISTRATION_CREATED',null,r,branchId);return r;
  });
}
router.post('/registrations',route(createRegistration));router.post('/registrations/:id/renew',route(createRegistration));
router.post('/registrations/:id/assign-pt',route(async req=>{
  role(req,'QTV','RECEPTIONIST');return transaction(async db=>{
    const r=await row(db,'registrations',req.params.id,true);await registrationAccess(req,r);
    if(!r.total_pt_sessions_snapshot||r.assigned_pt_id||!['ACTIVE','SCHEDULED'].includes(effective(r)))fail(409,'Registration cannot be assigned');
    const p=await row(db,'pt_profiles',req.body.pt_id,true);if(p.branch_id!==r.sold_branch_id||p.status!=='ACTIVE')fail(409,'Trainer must be active at the registration branch');
    await activeBranch(db,r.sold_branch_id);
    const updated=(await db.query('UPDATE registrations SET assigned_pt_id=$2,updated_at=NOW() WHERE id=$1 RETURNING *',[r.id,p.id])).rows[0];
    await db.query("UPDATE pt_assignment_requests SET status='REJECTED',responded_at=NOW(),response_note='Assigned by staff' WHERE registration_id=$1 AND status='PENDING'",[r.id]);
    const m=await row(db,'member_profiles',r.member_id),b=await row(db,'branches',r.sold_branch_id);
    await emit(db,{event:'PT_REQUEST_ACCEPTED',branchId:b.id,referenceId:r.id,referenceType:'REGISTRATION',accounts:[m.account_id,p.account_id],variables:{member_name:m.full_name,pt_name:p.full_name,package_name:r.package_name_snapshot,branch_name:b.branch_name}});
    await audit(db,req,'registrations',r.id,'PT_ASSIGNED',r,updated,b.id,text(req.body.note,'note',255,false));return updated;
  });
}));

// POST /registrations/:id/freeze - Đóng băng gói tập (QTV / Lễ tân / Hội viên)
router.post('/registrations/:id/freeze', route(async req => {
  role(req, 'QTV', 'RECEPTIONIST', 'MEMBER');
  return transaction(async db => {
    const r = await row(db, 'registrations', req.params.id, true);
    await registrationAccess(req, r);
    if (req.user.active_role === 'MEMBER') {
      if (r.member_id !== req.user.member_profile_id) {
        fail(403, 'Chỉ chủ sở hữu hợp đồng mới có quyền đóng băng gói tập');
      }
      if (r.status === 'PENDING_PAYMENT') {
        fail(400, 'Gói tập chưa thanh toán không thể đóng băng');
      }
    }
    if (['CANCELLED', 'EXPIRED'].includes(effective(r))) fail(409, 'Gói tập đã hết hạn hoặc bị hủy, không thể đóng băng');
    if (r.is_frozen) fail(409, 'Gói tập này hiện đang ở trạng thái đóng băng', 'ALREADY_FROZEN');

    // Kiểm tra gói có thời hạn không
    if (!r.end_date) {
      fail(400, 'Gói tập vô thời hạn không cần đóng băng bảo lưu thời gian', 'INDEFINITE_PACKAGE');
    }

    const freezeDays = parseInt(req.body.freeze_days, 10);
    if (!freezeDays || freezeDays <= 0) fail(400, 'Số ngày đóng băng phải lớn hơn 0');
    const reason = text(req.body.reason || (req.user.active_role === 'MEMBER' ? 'Hội viên chủ động đóng băng gói trên ứng dụng' : 'Đóng băng theo yêu cầu hội viên'), 'reason', 255);
    
    // Ngày bắt đầu đóng băng luôn cố định là ngày hiện tại (áp dụng ngay lập tức)
    const startDate = today();
    const curEndDate = String(r.end_date).slice(0, 10);
    if (startDate >= curEndDate) {
      fail(400, `Gói tập đã đến ngày hết hạn (${curEndDate}), không thể đóng băng`);
    }

    // Ràng buộc số ngày đóng băng: không được vượt quá thời hạn còn lại của gói
    const maxAllowedDays = Math.round((Date.parse(curEndDate) - Date.parse(startDate)) / 86400000);
    if (freezeDays > maxAllowedDays) {
      fail(400, `Số ngày đóng băng (${freezeDays} ngày) không được vượt quá thời hạn còn lại của gói (${maxAllowedDays} ngày tính từ hôm nay đến ngày hết hạn hiện tại)`);
    }

    const endDate = addDays(startDate, freezeDays);
    const freezeStatus = 'ACTIVE';

    const freezeRecord = (await db.query(`
      INSERT INTO package_freezes (registration_id, start_date, end_date, freeze_days, reason, approved_by_account_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [r.id, startDate, endDate, freezeDays, reason, req.user.account_id, freezeStatus])).rows[0];

    // Cập nhật ngày kết thúc của gói lùi tương ứng số ngày đóng băng và kích hoạt is_frozen = TRUE
    const updated = (await db.query(`
      UPDATE registrations
      SET is_frozen = TRUE,
          freeze_days_total = freeze_days_total + $2,
          end_date = CASE WHEN end_date IS NOT NULL THEN end_date + ($2 || ' days')::interval ELSE NULL END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [r.id, freezeDays])).rows[0];

    await audit(db, req, 'registrations', r.id, 'PACKAGE_FROZEN', r, updated, r.sold_branch_id, reason);
    return { registration: updated, freeze: freezeRecord };
  });
}));

// POST /registrations/:id/unfreeze - Mở đóng băng gói tập trước hạn (QTV / Lễ tân / Hội viên)
router.post('/registrations/:id/unfreeze', route(async req => {
  role(req, 'QTV', 'RECEPTIONIST', 'MEMBER');
  return transaction(async db => {
    const r = await row(db, 'registrations', req.params.id, true);
    await registrationAccess(req, r);
    if (req.user.active_role === 'MEMBER' && r.member_id !== req.user.member_profile_id) {
      fail(403, 'Chỉ chủ sở hữu hợp đồng mới có quyền mở đóng băng gói tập');
    }
    if (!r.is_frozen) fail(409, 'Gói tập không ở trạng thái đóng băng');

    const activeFreeze = (await db.query(`
      SELECT * FROM package_freezes WHERE registration_id = $1 AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1
    `, [r.id])).rows[0];

    let unusedDays = 0;
    if (activeFreeze) {
      const todayDate = today();
      const freezeStart = String(activeFreeze.start_date).slice(0, 10);
      const actualFreezeDays = Math.max(0, Math.ceil((Date.parse(todayDate) - Date.parse(freezeStart)) / 86400000));
      unusedDays = Math.max(0, activeFreeze.freeze_days - actualFreezeDays);

      await db.query(`
        UPDATE package_freezes
        SET status = 'ENDED',
            end_date = $2,
            freeze_days = $3
        WHERE id = $1
      `, [activeFreeze.id, todayDate, actualFreezeDays]);
    }

    const updated = (await db.query(`
      UPDATE registrations
      SET is_frozen = FALSE,
          freeze_days_total = GREATEST(0, freeze_days_total - $2),
          end_date = CASE WHEN end_date IS NOT NULL THEN (end_date - ($2 || ' days')::interval)::date ELSE NULL END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [r.id, unusedDays])).rows[0];

    await audit(db, req, 'registrations', r.id, 'PACKAGE_UNFROZEN', r, updated, r.sold_branch_id);
    return { registration: updated, message: 'Đã mở khóa gói tập thành công', unused_days_returned: unusedDays };
  });
}));

// POST /registrations/:id/transfer - Chuyển nhượng quyền gói tập sang hội viên khác (QTV / Lễ tân)
router.post('/registrations/:id/transfer', route(async req => {
  role(req, 'QTV', 'RECEPTIONIST');
  return transaction(async db => {
    const r = await row(db, 'registrations', req.params.id, true);
    await registrationAccess(req, r);
    if (['CANCELLED', 'EXPIRED'].includes(effective(r))) fail(409, 'Gói tập không khả dụng để chuyển nhượng');

    const toMemberId = req.body.to_member_id;
    if (!toMemberId) fail(400, 'Vui lòng chọn hội viên thụ hưởng nhận chuyển nhượng');
    if (toMemberId === r.member_id) fail(400, 'Không thể chuyển nhượng cho chính chủ sở hữu hiện tại');

    const toMember = await row(db, 'member_profiles', toMemberId);
    if (toMember.status !== 'ACTIVE') fail(409, 'Hội viên nhận chuyển nhượng không còn hoạt động');

    // Nếu là gói Gym, kiểm tra hội viên B đã có gói Gym chưa
    if (['GYM_TIME', 'GYM_SESSION'].includes(r.package_type_snapshot)) {
      const hasGym = (await db.query(`
        SELECT 1 FROM registrations
        WHERE member_id = $1 AND package_type_snapshot IN ('GYM_TIME', 'GYM_SESSION')
          AND status IN ('ACTIVE', 'SCHEDULED') AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        LIMIT 1
      `, [toMemberId])).rowCount > 0;
      if (hasGym) fail(409, 'Hội viên nhận chuyển nhượng đã sở hữu 1 gói Gym còn hiệu lực');
    }

    const fee = Number(req.body.transfer_fee || 0);
    const reason = text(req.body.reason || 'Chuyển nhượng quyền sử dụng gói tại quầy', 'reason', 255);

    const transferRecord = (await db.query(`
      INSERT INTO package_transfers (registration_id, from_member_id, to_member_id, transfer_fee, reason, approved_by_account_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [r.id, r.member_id, toMemberId, fee, reason, req.user.account_id])).rows[0];

    const updated = (await db.query(`
      UPDATE registrations SET member_id = $2, updated_at = NOW() WHERE id = $1 RETURNING *
    `, [r.id, toMemberId])).rows[0];

    await audit(db, req, 'registrations', r.id, 'PACKAGE_TRANSFERRED', r, updated, r.sold_branch_id, reason);
    return { registration: updated, transfer: transferRecord };
  });
}));

// POST /registrations/:id/invite-member - Trưởng nhóm hoặc Nhân viên mời/thêm học viên vào gói PT 1-Nhiều
router.post('/registrations/:id/invite-member', route(async req => {
  role(req, 'MEMBER', 'QTV', 'RECEPTIONIST');
  return transaction(async db => {
    const r = await row(db, 'registrations', req.params.id, true);
    if (isStaff(req)) {
      await registrationAccess(req, r);
    } else {
      const currentMemberId = req.user.member_profile_id;
      if (r.member_id !== currentMemberId && r.group_leader_member_id !== currentMemberId) {
        fail(403, 'Chỉ người đại diện mua gói mới có quyền mời thành viên', 'FORBIDDEN');
      }
    }

    const isGroup = ['GROUP_1_N', 'GROUP_PT'].includes(r.package_mode) || ['GROUP_1_N', 'GROUP_PT'].includes(r.package_mode_snapshot);
    if (!isGroup) {
      fail(400, 'Chỉ gói tập hình thức 1 Kèm Nhiều mới có tính năng mời thành viên nhóm', 'NOT_GROUP_PACKAGE');
    }

    if (!['ACTIVE', 'SCHEDULED'].includes(effective(r))) {
      fail(400, 'Gói tập phải ở trạng thái Đang hiệu lực hoặc Chưa đến ngày hiệu lực mới có thể mời thành viên', 'INVALID_REGISTRATION_STATUS');
    }

    // 1. Kiểm tra giới hạn số lượng học viên tối đa của nhóm
    const maxMembers = r.max_group_members_snapshot || (await db.query('SELECT max_group_members FROM packages WHERE id=$1', [r.package_id])).rows[0]?.max_group_members || 3;
    const countRes = await db.query(`
      SELECT COUNT(*)::int as count FROM group_pt_members
      WHERE registration_id = $1 AND invitation_status IN ('PENDING', 'ACCEPTED')
    `, [r.id]);
    const currentInvited = countRes.rows[0]?.count || 0;
    const totalMembers = 1 + currentInvited; // 1 là trưởng nhóm đại diện

    if (totalMembers >= maxMembers) {
      fail(400, `Gói tập nhóm đã đạt số lượng học viên tối đa (${maxMembers} học viên). Không thể mời thêm.`, 'GROUP_LIMIT_REACHED');
    }

    // 2. Tìm kiếm học viên được mời theo ID hoặc Số điện thoại
    let friendMember = null;
    if (req.body.member_id) {
      friendMember = (await db.query('SELECT * FROM member_profiles WHERE id = $1', [req.body.member_id])).rows[0];
    } else if (req.body.phone) {
      const invitePhone = phone(req.body.phone);
      friendMember = (await db.query('SELECT * FROM member_profiles WHERE phone = $1', [invitePhone])).rows[0];
    } else {
      fail(400, 'Vui lòng cung cấp số điện thoại hoặc ID của hội viên cần mời');
    }
    if (!friendMember) fail(404, 'Số điện thoại này chưa đăng ký hội viên tại hệ thống', 'MEMBER_NOT_FOUND');

    // 3. Không được mời chính người đứng tên gói tập
    if (friendMember.id === r.member_id || friendMember.id === r.group_leader_member_id) {
      fail(400, 'Không thể mời chính người đại diện đứng tên hợp đồng gói tập', 'CANNOT_INVITE_SELF');
    }

    // 4. Kiểm tra điều kiện bắt buộc: Học viên được mời phải có gói Gym còn hiệu lực
    const hasGym = (await db.query(`
      SELECT 1 FROM registrations
      WHERE member_id = $1 AND package_type_snapshot IN ('GYM_TIME', 'GYM_SESSION', 'COMBO')
        AND status IN ('ACTIVE', 'SCHEDULED') AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      LIMIT 1
    `, [friendMember.id])).rowCount > 0;
    if (!hasGym) fail(400, 'Thành viên được mời bắt buộc phải có gói Gym còn hiệu lực sử dụng', 'GYM_REQUIRED');

    // 5. Kiểm tra trùng lặp
    const existing = (await db.query(`
      SELECT * FROM group_pt_members WHERE registration_id = $1 AND member_id = $2
    `, [r.id, friendMember.id])).rows[0];
    if (existing) {
      if (['REJECTED', 'CANCELLED'].includes(existing.invitation_status)) {
        await db.query('DELETE FROM group_pt_members WHERE id = $1', [existing.id]);
      } else {
        fail(409, existing.invitation_status === 'ACCEPTED' ? 'Hội viên này đã có trong nhóm tập' : 'Hội viên này đã được mời (đang chờ phản hồi)');
      }
    }

    const currentMemberId = req.user.member_profile_id || r.group_leader_member_id || r.member_id;
    const initialStatus = (isStaff(req) && req.body.auto_accept === true) ? 'ACCEPTED' : 'PENDING';
    const invitation = (await db.query(`
      INSERT INTO group_pt_members (registration_id, member_id, inviter_member_id, invitation_status, joined_at)
      VALUES ($1, $2, $3, $4, ${initialStatus === 'ACCEPTED' ? 'NOW()' : 'NULL'})
      RETURNING *
    `, [r.id, friendMember.id, currentMemberId, initialStatus])).rows[0];

    await audit(db, req, 'group_pt_members', invitation.id, 'GROUP_PT_MEMBER_INVITED', null, invitation, r.sold_branch_id, `Mời học viên ${friendMember.full_name} vào nhóm PT`);

    return {
      success: true,
      invitation,
      friend: { id: friendMember.id, full_name: friendMember.full_name, phone: friendMember.phone, member_code: friendMember.member_code },
      total_members: totalMembers + 1,
      max_members: maxMembers,
      available_slots: Math.max(0, maxMembers - (totalMembers + 1))
    };
  });
}));

// GET /registrations/:id/group-members - Xem danh sách & tiến độ thành viên trong nhóm PT 1-Nhiều
router.get('/registrations/:id/group-members', route(async req => {
  const r = await row(pool, 'registrations', req.params.id);
  await registrationAccess(req, r);
  const leader = (await pool.query(`
    SELECT m.id, m.full_name, m.member_code, m.phone, m.avatar_url, b.branch_name
    FROM member_profiles m LEFT JOIN branches b ON b.id = m.home_branch_id
    WHERE m.id = $1
  `, [r.group_leader_member_id || r.member_id])).rows[0];

  const members = (await pool.query(`
    SELECT gm.*, m.full_name, m.member_code, m.phone, m.avatar_url, b.branch_name
    FROM group_pt_members gm
    JOIN member_profiles m ON m.id = gm.member_id
    LEFT JOIN branches b ON b.id = m.home_branch_id
    WHERE gm.registration_id = $1
    ORDER BY gm.created_at ASC
  `, [r.id])).rows;

  const maxMembers = r.max_group_members_snapshot || (await pool.query('SELECT max_group_members FROM packages WHERE id=$1', [r.package_id])).rows[0]?.max_group_members || 3;
  const activeCount = members.filter(m => ['PENDING', 'ACCEPTED'].includes(m.invitation_status)).length;
  const totalCurrent = 1 + activeCount;

  return {
    registration_id: r.id,
    reg_code: r.reg_code,
    package_name: r.package_name_snapshot,
    package_mode: r.package_mode,
    max_group_members: maxMembers,
    total_current: totalCurrent,
    available_slots: Math.max(0, maxMembers - totalCurrent),
    is_full: totalCurrent >= maxMembers,
    leader: { ...leader, role: 'LEADER' },
    members
  };
}));

// DELETE /registrations/:id/group-members/:memberId - Xóa học viên hoặc thu hồi lời mời
router.delete('/registrations/:id/group-members/:memberId', route(async req => {
  role(req, 'MEMBER', 'QTV', 'RECEPTIONIST');
  return transaction(async db => {
    const r = await row(db, 'registrations', req.params.id, true);
    if (isStaff(req)) {
      await registrationAccess(req, r);
    } else {
      const currentMemberId = req.user.member_profile_id;
      if (r.member_id !== currentMemberId && r.group_leader_member_id !== currentMemberId) {
        fail(403, 'Chỉ người đại diện mua gói hoặc nhân viên mới có quyền xóa thành viên khỏi nhóm', 'FORBIDDEN');
      }
    }
    const member = (await db.query('SELECT * FROM group_pt_members WHERE registration_id = $1 AND member_id = $2', [r.id, req.params.memberId])).rows[0];
    if (!member) fail(404, 'Thành viên không có trong nhóm');
    await db.query('DELETE FROM group_pt_members WHERE id = $1', [member.id]);
    await audit(db, req, 'group_pt_members', member.id, 'GROUP_PT_MEMBER_REMOVED', member, null, r.sold_branch_id, 'Xóa học viên khỏi nhóm PT');
    return { success: true, message: 'Đã xóa học viên khỏi nhóm PT thành công' };
  });
}));

// GET /group-invitations - Danh sách lời mời vào nhóm PT (nhận được hoặc đã gửi)
router.get('/group-invitations', route(async req => {
  role(req, 'MEMBER');
  const memberId = req.user.member_profile_id;
  if (!memberId) fail(401, 'Chưa liên kết hồ sơ hội viên');
  const status = req.query.status;
  const type = req.query.type || 'received';

  if (type === 'sent') {
    const invitations = (await pool.query(`
      SELECT gm.id, gm.registration_id, gm.member_id, gm.inviter_member_id,
             gm.invitation_status, gm.joined_at, gm.created_at,
             r.reg_code, r.package_name_snapshot, r.package_mode,
             r.total_pt_sessions_snapshot, r.start_date, r.end_date, r.status as registration_status,
             r.sold_branch_id, b.branch_name, b.phone as branch_phone, b.address as branch_address,
             friend.full_name as friend_name, friend.phone as friend_phone, friend.member_code as friend_code,
             pt.full_name as assigned_pt_name
      FROM group_pt_members gm
      JOIN registrations r ON r.id = gm.registration_id
      JOIN member_profiles friend ON friend.id = gm.member_id
      LEFT JOIN branches b ON b.id = r.sold_branch_id
      LEFT JOIN pt_profiles pt ON pt.id = r.assigned_pt_id
      WHERE gm.inviter_member_id = $1
        AND ($2::text IS NULL OR gm.invitation_status = $2)
      ORDER BY gm.created_at DESC
    `, [memberId, status || null])).rows;
    return invitations;
  }

  const invitations = (await pool.query(`
    SELECT gm.id, gm.registration_id, gm.member_id, gm.inviter_member_id,
           gm.invitation_status, gm.joined_at, gm.created_at,
           r.reg_code, r.package_name_snapshot, r.package_mode,
           r.total_pt_sessions_snapshot, r.start_date, r.end_date, r.status as registration_status,
           r.sold_branch_id, b.branch_name, b.phone as branch_phone, b.address as branch_address,
           inviter.full_name as inviter_name, inviter.phone as inviter_phone, inviter.member_code as inviter_code,
           pt.full_name as assigned_pt_name
    FROM group_pt_members gm
    JOIN registrations r ON r.id = gm.registration_id
    JOIN member_profiles inviter ON inviter.id = gm.inviter_member_id
    LEFT JOIN branches b ON b.id = r.sold_branch_id
    LEFT JOIN pt_profiles pt ON pt.id = r.assigned_pt_id
    WHERE gm.member_id = $1
      AND ($2::text IS NULL OR gm.invitation_status = $2)
    ORDER BY gm.created_at DESC
  `, [memberId, status || null])).rows;
  return invitations;
}));

// DELETE /group-invitations/:id - Người gửi thu hồi lời mời
router.delete('/group-invitations/:id', route(async req => {
  role(req, 'MEMBER');
  const memberId = req.user.member_profile_id;
  if (!memberId) fail(401, 'Chưa liên kết hồ sơ hội viên');
  return transaction(async db => {
    const inv = (await db.query('SELECT * FROM group_pt_members WHERE id = $1 AND inviter_member_id = $2', [req.params.id, memberId])).rows[0];
    if (!inv) fail(404, 'Không tìm thấy lời mời hoặc bạn không có quyền thu hồi', 'NOT_FOUND');
    if (inv.invitation_status === 'ACCEPTED') {
      fail(400, 'Thành viên đã tham gia vào nhóm, vui lòng quản lý thành viên trong Chi tiết gói để xóa', 'CANNOT_REVOKE_ACCEPTED');
    }
    await db.query('DELETE FROM group_pt_members WHERE id = $1', [inv.id]);
    await audit(db, req, 'group_pt_members', inv.id, 'GROUP_PT_INVITATION_REVOKED', inv, null, null, 'Thu hồi lời mời tham gia nhóm PT');
    return { success: true, message: 'Đã thu hồi lời mời thành công' };
  });
}));

// POST /group-invitations/:id/respond - Chấp thuận hoặc từ chối lời mời vào nhóm PT
router.post('/group-invitations/:id/respond', route(async req => {
  role(req, 'MEMBER');
  const memberId = req.user.member_profile_id;
  if (!memberId) fail(401, 'Chưa liên kết hồ sơ hội viên');
  const action = (req.body.action || '').toUpperCase();
  if (!['ACCEPT', 'REJECT'].includes(action)) {
    fail(400, 'Hành động không hợp lệ (ACCEPT hoặc REJECT)', 'INVALID_ACTION');
  }

  return transaction(async db => {
    const invitation = (await db.query(`
      SELECT gm.*, r.sold_branch_id, r.max_group_members_snapshot, r.package_id, r.package_name_snapshot
      FROM group_pt_members gm
      JOIN registrations r ON r.id = gm.registration_id
      WHERE gm.id = $1 AND gm.member_id = $2
    `, [req.params.id, memberId])).rows[0];

    if (!invitation) fail(404, 'Không tìm thấy lời mời', 'NOT_FOUND');
    if (invitation.invitation_status !== 'PENDING') {
      fail(400, `Lời mời đã được xử lý trước đó (${invitation.invitation_status})`, 'ALREADY_PROCESSED');
    }

    if (action === 'ACCEPT') {
      // 1. Kiểm tra thành viên có gói Gym còn hiệu lực
      const hasGym = (await db.query(`
        SELECT 1 FROM registrations
        WHERE member_id = $1 AND package_type_snapshot IN ('GYM_TIME', 'GYM_SESSION', 'COMBO')
          AND status IN ('ACTIVE', 'SCHEDULED') AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        LIMIT 1
      `, [memberId])).rowCount > 0;
      if (!hasGym) {
        fail(400, 'Bạn cần có gói Gym còn hạn sử dụng để chấp thuận tham gia nhóm tập PT', 'GYM_REQUIRED');
      }

      // 2. Kiểm tra sĩ số nhóm còn chỗ không
      const maxMembers = invitation.max_group_members_snapshot || 3;
      const countRes = await db.query(`
        SELECT COUNT(*)::int as count FROM group_pt_members
        WHERE registration_id = $1 AND invitation_status IN ('PENDING', 'ACCEPTED') AND id != $2
      `, [invitation.registration_id, invitation.id]);
      const currentOther = countRes.rows[0]?.count || 0;
      const totalMembersIfAccept = 1 + currentOther + 1; // 1 trưởng nhóm + các thành viên khác + mình
      if (totalMembersIfAccept > maxMembers) {
        fail(400, 'Nhóm tập đã đủ số lượng học viên tối đa, không thể tham gia', 'GROUP_LIMIT_REACHED');
      }

      const updated = (await db.query(`
        UPDATE group_pt_members
        SET invitation_status = 'ACCEPTED', joined_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [invitation.id])).rows[0];

      await audit(db, req, 'group_pt_members', invitation.id, 'GROUP_PT_INVITATION_ACCEPTED', invitation, updated, invitation.sold_branch_id, 'Chấp thuận tham gia nhóm PT');
      return { success: true, message: 'Đã chấp nhận lời mời tham gia nhóm PT thành công', invitation: updated };
    } else {
      const updated = (await db.query(`
        UPDATE group_pt_members
        SET invitation_status = 'REJECTED'
        WHERE id = $1
        RETURNING *
      `, [invitation.id])).rows[0];

      await audit(db, req, 'group_pt_members', invitation.id, 'GROUP_PT_INVITATION_REJECTED', invitation, updated, invitation.sold_branch_id, 'Từ chối tham gia nhóm PT');
      return { success: true, message: 'Đã từ chối lời mời tham gia nhóm PT', invitation: updated };
    }
  });
}));

async function paymentAccess(req,p) {if(isStaff(req)){financial(req);branch(req,p.branch_id);}else if(req.user.active_role!=='MEMBER'||p.member_id!==req.user.member_profile_id)fail(403,'Payment outside authorized scope','FORBIDDEN');}
function settlementAuthority(req){
  // Ownership and client-submitted payment claims are not evidence of collected funds.
  if(!isStaff(req))fail(403,'Payment confirmation requires authorized staff','PAYMENT_CONFIRMATION_FORBIDDEN');
  financial(req);
}
const paymentStatus=p=>p.status==='PENDING'&&p.payment_method==='BANK_TRANSFER'&&new Date(p.expires_at||new Date(p.created_at).getTime()+900000)<new Date()?'EXPIRED':p.status;
async function listPayments(req,db=pool) {
  if(isStaff(req))financial(req);else role(req,'MEMBER');
  const from = req.query.date_from || req.query.from_date || (req.query.date_to || req.query.to_date ? null : req.query.date) || null;
  const to = req.query.date_to || req.query.to_date || (req.query.date_from || req.query.from_date ? null : req.query.date) || null;
  if (from) date(from); if (to) date(to);
  const list=(await db.query(`SELECT p.*,r.reg_code,r.reg_code registration_code,r.package_name_snapshot,m.full_name member_name,m.member_code,m.phone member_phone,b.branch_name,
    COALESCE(a.full_name,a.login_phone) collected_by_name,rc.receipt_code FROM payments p JOIN registrations r ON r.id=p.registration_id JOIN member_profiles m ON m.id=p.member_id JOIN branches b ON b.id=p.branch_id LEFT JOIN accounts a ON a.id=p.collected_by LEFT JOIN receipts rc ON rc.payment_id=p.id
    WHERE ($1::uuid[] IS NULL OR p.branch_id=ANY($1)) AND ($2 OR p.member_id=$3) AND ($4::date IS NULL OR (COALESCE(p.confirmed_at,p.created_at) AT TIME ZONE b.timezone)::date >=$4) AND ($5::date IS NULL OR (COALESCE(p.confirmed_at,p.created_at) AT TIME ZONE b.timezone)::date <=$5) ORDER BY p.created_at DESC`,[isStaff(req)?scope(req):null,isStaff(req),req.user.member_profile_id,from||null,to||null])).rows.map(p=>({...p,status:paymentStatus(p)}));
  return search(list,req.query,['payment_code','reg_code','member_name','member_phone','receipt_code']).filter(p=>(!req.query.payment_method||p.payment_method===req.query.payment_method.replace('BANK_TRANSFER_VIETQR','BANK_TRANSFER'))&&(!req.query.member_id||p.member_id===req.query.member_id));
}
router.get('/payments',route(async req=>page(await listPayments(req),req.query)));
router.get('/payments/stats',route(async req=>{
  financial(req);const list=await listPayments(req),paid=list.filter(p=>p.status==='COMPLETED'),pending=(await listRegistrations({user:req.user,headers:req.headers,query:{...req.query,status:'PENDING_PAYMENT'}}));
  return {cash_received:paid.reduce((a,p)=>a+p.amount,0),successful_payments:paid.length,pending_registrations:pending.length,pending_value:pending.reduce((a,r)=>a+r.price_snapshot,0)};
}));
async function invoice(req,db) {
  role(req,'QTV','RECEPTIONIST','MEMBER');if(isStaff(req))financial(req);
  const r=await row(db,'registrations',req.body.registration_id,true);await registrationAccess(req,r);
  if(r.status!=='PENDING_PAYMENT')fail(409,'Registration is not awaiting payment');
  if(req.body.branch_id&&req.body.branch_id!==r.sold_branch_id)fail(400,'Payment branch must match registration');

  const existing=(await db.query("SELECT * FROM payments WHERE registration_id=$1 AND status='PENDING' ORDER BY created_at DESC",[r.id])).rows.find(p=>paymentStatus(p)==='PENDING');

  let payableAmount = Number(r.price_snapshot);
  let discountId = null;
  let discountAmount = 0;

  if (req.body.discount_code) {
    const dCode = String(req.body.discount_code).trim().toUpperCase();
    const d = (await db.query('SELECT * FROM discounts WHERE code = $1', [dCode])).rows[0];
    if (!d) fail(404, 'Mã giảm giá không tồn tại', 'DISCOUNT_NOT_FOUND');
    if (!d.is_active) fail(400, 'Mã giảm giá đang bị tạm khóa', 'DISCOUNT_INACTIVE');
    if (d.start_date > today()) fail(400, 'Mã giảm giá chưa đến ngày hiệu lực', 'DISCOUNT_NOT_STARTED');
    if (d.end_date < today()) fail(400, 'Mã giảm giá đã hết hạn sử dụng', 'DISCOUNT_EXPIRED');
    if (d.usage_limit != null && d.used_count >= d.usage_limit && (!existing || existing.discount_id !== d.id)) fail(400, 'Mã giảm giá đã hết lượt sử dụng', 'DISCOUNT_LIMIT');
    if (d.branch_id && d.branch_id !== r.sold_branch_id) fail(400, 'Mã giảm giá không áp dụng cho chi nhánh này', 'DISCOUNT_BRANCH_MISMATCH');
    if (Array.isArray(d.branch_ids) && d.branch_ids.length > 0 && !d.branch_ids.includes(r.sold_branch_id)) fail(400, 'Mã giảm giá không áp dụng cho chi nhánh này', 'DISCOUNT_BRANCH_MISMATCH');
    if (payableAmount < Number(d.min_order_value)) fail(400, 'Giá trị đơn hàng chưa đạt điều kiện tối thiểu của mã giảm giá', 'DISCOUNT_MIN_ORDER');

    discountId = d.id;
    if (d.discount_type === 'PERCENT') {
      discountAmount = (payableAmount * Number(d.discount_value)) / 100;
      if (d.max_discount_amount && discountAmount > Number(d.max_discount_amount)) {
        discountAmount = Number(d.max_discount_amount);
      }
    } else {
      discountAmount = Math.min(payableAmount, Number(d.discount_value));
    }
    payableAmount = Math.max(0, payableAmount - discountAmount);

    if (!existing || existing.discount_id !== d.id) {
      if (existing?.discount_id) {
        await db.query('UPDATE discounts SET used_count = GREATEST(0, used_count - 1) WHERE id = $1', [existing.discount_id]);
      }
      await db.query('UPDATE discounts SET used_count = used_count + 1 WHERE id = $1', [d.id]);
    }
  }

  if(req.body.amount!==undefined && !req.body.discount_code && Number(req.body.amount)!==payableAmount)fail(400,'Payment must equal 100% of the payable price');
  const method=choice((req.body.payment_method||'CASH').replace('BANK_TRANSFER_VIETQR','BANK_TRANSFER'),['CASH','BANK_TRANSFER'],'payment_method');
  if(!isStaff(req)&&method!=='BANK_TRANSFER')fail(403,'Cash must be collected by staff');
  const member=await row(db,'member_profiles',r.member_id);
  const response=async p=>{
    let dCode = null;
    if (p.discount_id) {
      dCode = (await db.query('SELECT code FROM discounts WHERE id = $1', [p.discount_id])).rows[0]?.code || null;
    }
    const qr=method==='BANK_TRANSFER'?generateVietQR({amount:p.amount,description:`${r.reg_code} ${member.member_code} PARADISE`}):null;
    return {payment:{...p,discount_code:dCode},registration:r,qr_data:qr,vietqr:qr};
  };

  if(existing){
    if(existing.payment_method!==method)fail(409,'An open invoice already exists with a different method');
    if (req.body.clear_discount === true && existing.discount_id) {
      await db.query('UPDATE discounts SET used_count = GREATEST(0, used_count - 1) WHERE id = $1', [existing.discount_id]);
      const resetPayment = (await db.query(`
        UPDATE payments SET amount = $2, discount_id = NULL, discount_amount = 0, updated_at = NOW()
        WHERE id = $1 RETURNING *
      `, [existing.id, Number(r.price_snapshot)])).rows[0];
      return await response(resetPayment);
    }
    if (discountId && existing.discount_id !== discountId) {
      const updatedPayment = (await db.query(`
        UPDATE payments SET amount = $2, discount_id = $3, discount_amount = $4, updated_at = NOW()
        WHERE id = $1 RETURNING *
      `, [existing.id, payableAmount, discountId, discountAmount])).rows[0];
      return await response(updatedPayment);
    }
    return await response(existing);
  }
  const p=(await db.query(`INSERT INTO payments(registration_id,member_id,branch_id,payment_code,payment_method,amount,discount_id,discount_amount,collected_by,note,expires_at)
    VALUES($1,$2,$3,$4,$5::varchar,$6,$7,$8,$9,$10,CASE WHEN $5::varchar='BANK_TRANSFER' THEN NOW()+interval '15 minutes' ELSE NULL END) RETURNING *`,[r.id,r.member_id,r.sold_branch_id,await code(db,'payments','payment_code','PAY'),method,payableAmount,discountId,discountAmount,req.user.account_id,text(req.body.note,'note',255,false)])).rows[0];
  await audit(db,req,'payments',p.id,'PAYMENT_INVOICE',null,p,p.branch_id);
  return await response(p);
}
async function confirm(req,db,paymentId) {
  settlementAuthority(req);
  const initial=await row(db,'payments',paymentId);await paymentAccess(req,initial);
  const r=await row(db,'registrations',initial.registration_id,true),p=await row(db,'payments',paymentId,true);
  if(p.status==='COMPLETED')return {payment:p,registration:r,receipt:(await db.query('SELECT * FROM receipts WHERE payment_id=$1',[p.id])).rows[0]};
  if(paymentStatus(p)==='EXPIRED')fail(409,'Payment intent expired; create a new invoice');
  if(p.status!=='PENDING'||r.status!=='PENDING_PAYMENT')fail(409,'Payment cannot be confirmed');
  const reference=text(req.body.transaction_ref,'transaction_ref',100,false);
  if(p.payment_method==='BANK_TRANSFER'&&!reference&&req.body.manual_confirmation!==true)fail(400,'Bank transfer requires explicit staff confirmation or actual transaction reference');
  if(reference)await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`bank-reference:${reference}`]);
  if(reference&&(await db.query("SELECT 1 FROM payments WHERE transaction_ref=$1 AND id<>$2",[reference,p.id])).rowCount)fail(409,'Bank transaction reference already used');
  const saved=(await db.query("UPDATE payments SET status='COMPLETED',transaction_ref=$2,collected_by=$3,confirmed_at=NOW(),updated_at=NOW(),note=COALESCE($4,note) WHERE id=$1 RETURNING *",[p.id,reference,req.user.account_id,text(req.body.note,'note',255,false)])).rows[0];
  const status=r.end_date&&r.end_date<today()?'EXPIRED':r.start_date>today()?'SCHEDULED':'ACTIVE';
  const reg=(await db.query('UPDATE registrations SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *',[r.id,status])).rows[0];
  const m=await row(db,'member_profiles',r.member_id),b=await row(db,'branches',p.branch_id);
  const receipt=(await db.query('INSERT INTO receipts(payment_id,receipt_code,amount,payer_name,payer_phone,issued_by,note) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[p.id,await code(db,'receipts','receipt_code','PT'),p.amount,m.full_name,m.phone,req.user.account_id,saved.note])).rows[0];
  await audit(db,req,'payments',p.id,'PAYMENT_CONFIRMED',p,{...saved,manual_confirmation:req.body.manual_confirmation===true,provider_verified:false},p.branch_id,reference);
  const variables={
    member_name:m.full_name,
    ten_hoi_vien:m.full_name,
    package_name:r.package_name_snapshot,
    ten_goi:r.package_name_snapshot,
    amount:Number(p.amount).toLocaleString('vi-VN'),
    so_tien:Number(p.amount).toLocaleString('vi-VN'),
    payment_time:saved.confirmed_at.toISOString(),
    branch_name:b.branch_name,
    expiry_date:r.end_date||'Vô thời hạn',
    ngay_het_han:r.end_date||'Vô thời hạn',
    registration_code:r.reg_code,
    ma_hop_dong:r.reg_code
  };
  await emit(db,{
    event:'PAYMENT_CONFIRMED',
    branchId:b.id,
    referenceId:p.id,
    referenceType:'PAYMENT',
    accounts:[m.account_id],
    variables,
    title:'Xác nhận thanh toán thành công',
    body:`Paradise Gym đã nhận đủ số tiền ${Number(p.amount).toLocaleString('vi-VN')} VNĐ cho gói ${r.package_name_snapshot}.`
  });
  await emit(db,{
    event:'REGISTRATION_ACTIVATED',
    branchId:b.id,
    referenceId:r.id,
    referenceType:'REGISTRATION',
    accounts:[m.account_id],
    variables,
    title:'Kích hoạt gói tập thành công!',
    body:`Chúc mừng bạn đã kích hoạt thành công gói ${r.package_name_snapshot}. Hạn dùng đến ${r.end_date||'vô thời hạn'}.`
  });
  return {payment:saved,registration:reg,receipt};
}
router.post('/registrations/:id/cancel',route(async req=>{
  role(req,'QTV','RECEPTIONIST','MEMBER');
  return transaction(async db=>{
    const initial=await row(db,'registrations',req.params.id,true);await registrationAccess(req,initial);
    if(['CANCELLED','EXPIRED'].includes(effective(initial)))fail(409,'Gói tập đã hết hạn hoặc đã bị hủy trước đó');
    const cancelReason=text(req.body.reason||req.body.cancel_reason||'Hủy gói theo yêu cầu','cancel_reason',255,false);
    const updated=(await db.query("UPDATE registrations SET status='CANCELLED',updated_at=NOW() WHERE id=$1 RETURNING *",[initial.id])).rows[0];
    const m=await row(db,'member_profiles',updated.member_id),b=await row(db,'branches',updated.sold_branch_id);
    await audit(db,req,'registrations',updated.id,'REGISTRATION_CANCELLED',initial,updated,updated.sold_branch_id,cancelReason);
    const variables={
      member_name:m.full_name,
      ten_hoi_vien:m.full_name,
      package_name:updated.package_name_snapshot,
      ten_goi:updated.package_name_snapshot,
      registration_code:updated.reg_code,
      ma_hop_dong:updated.reg_code,
      cancel_reason:cancelReason,
      branch_name:b.branch_name
    };
    await emit(db,{
      event:'REGISTRATION_CANCELLED',
      branchId:b.id,
      referenceId:updated.id,
      referenceType:'REGISTRATION',
      accounts:[m.account_id],
      variables,
      title:'Gói tập đã bị hủy',
      body:`Gói tập ${updated.package_name_snapshot} (${updated.reg_code}) của bạn đã được hủy thành công.`
    });
    return {registration:updated,message:'Hủy gói tập thành công'};
  });
}));
router.post('/payments/create-invoice',route(req=>transaction(db=>invoice(req,db))));
router.post('/payments',route(req=>transaction(async db=>{settlementAuthority(req);const i=await invoice(req,db);return confirm(req,db,i.payment.id);})));
router.post('/payments/:id/confirm',route(req=>transaction(db=>confirm(req,db,req.params.id))));
router.post('/payments/:id/simulate-transfer',route(req=>transaction(async db=>{
  const initial=await row(db,'payments',req.params.id);await paymentAccess(req,initial);
  if(initial.status==='COMPLETED'){
    const r=await row(db,'registrations',initial.registration_id);
    const rc=(await db.query('SELECT * FROM receipts WHERE payment_id=$1',[initial.id])).rows[0];
    return {payment:initial,registration:r,receipt:rc};
  }
  if(paymentStatus(initial)==='EXPIRED')fail(409,'Payment intent expired; create a new invoice');
  const r=await row(db,'registrations',initial.registration_id,true),p=await row(db,'payments',req.params.id,true);
  if(p.status!=='PENDING'||r.status!=='PENDING_PAYMENT')fail(409,'Payment cannot be confirmed');
  let collectorId=req.user.account_id;
  if(!isStaff(req)){
    const staffAccount=(await db.query(`SELECT a.id FROM accounts a JOIN account_roles ar ON ar.account_id=a.id JOIN roles ro ON ro.id=ar.role_id WHERE ro.role_code IN ('RECEPTIONIST','QTV') AND (EXISTS (SELECT 1 FROM account_branch_scopes s WHERE s.account_id=a.id AND (s.branch_id=$1 OR s.is_all_branches=true))) ORDER BY CASE WHEN ro.role_code='RECEPTIONIST' THEN 1 ELSE 2 END LIMIT 1`,[p.branch_id])).rows[0];
    if(staffAccount)collectorId=staffAccount.id;
  }
  const reference=text(req.body.transaction_ref,'transaction_ref',100,false)||`MB-SIM-${Date.now()}`;
  const note=text(req.body.note,'note',255,false)||'Thanh toán VietQR Napas 247 (Mô phỏng thử nghiệm)';
  const saved=(await db.query("UPDATE payments SET status='COMPLETED',transaction_ref=$2,collected_by=$3,confirmed_at=NOW(),updated_at=NOW(),note=COALESCE(note,$4) WHERE id=$1 RETURNING *",[p.id,reference,collectorId,note])).rows[0];
  const status=r.end_date&&r.end_date<today()?'EXPIRED':r.start_date>today()?'SCHEDULED':'ACTIVE';
  const reg=(await db.query('UPDATE registrations SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *',[r.id,status])).rows[0];
  const m=await row(db,'member_profiles',r.member_id),b=await row(db,'branches',p.branch_id);
  const receipt=(await db.query('INSERT INTO receipts(payment_id,receipt_code,amount,payer_name,payer_phone,issued_by,note) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[p.id,await code(db,'receipts','receipt_code','PT'),p.amount,m.full_name,m.phone,collectorId,saved.note])).rows[0];
  await audit(db,req,'payments',p.id,'PAYMENT_CONFIRMED',p,{...saved,simulated_transfer:true,provider_verified:true},p.branch_id,reference);
  const variables={
    member_name:m.full_name,
    ten_hoi_vien:m.full_name,
    package_name:r.package_name_snapshot,
    ten_goi:r.package_name_snapshot,
    amount:Number(p.amount).toLocaleString('vi-VN'),
    so_tien:Number(p.amount).toLocaleString('vi-VN'),
    payment_time:saved.confirmed_at.toISOString(),
    branch_name:b.branch_name,
    expiry_date:r.end_date||'Vô thời hạn',
    ngay_het_han:r.end_date||'Vô thời hạn',
    registration_code:r.reg_code,
    ma_hop_dong:r.reg_code
  };
  await emit(db,{
    event:'PAYMENT_CONFIRMED',
    branchId:b.id,
    referenceId:p.id,
    referenceType:'PAYMENT',
    accounts:[m.account_id],
    variables,
    title:'Xác nhận thanh toán thành công',
    body:`Paradise Gym đã nhận đủ số tiền ${Number(p.amount).toLocaleString('vi-VN')} VNĐ cho gói ${r.package_name_snapshot}.`
  });
  await emit(db,{
    event:'REGISTRATION_ACTIVATED',
    branchId:b.id,
    referenceId:r.id,
    referenceType:'REGISTRATION',
    accounts:[m.account_id],
    variables,
    title:'Kích hoạt gói tập thành công!',
    body:`Chúc mừng bạn đã kích hoạt thành công gói ${r.package_name_snapshot}. Hạn dùng đến ${r.end_date||'vô thời hạn'}.`
  });
  return {payment:saved,registration:reg,receipt};
})));
router.post('/payments/:id/check-bank-status',route(async req=>{const p=await row(pool,'payments',req.params.id);await paymentAccess(req,p);fail(503,'Bank verification provider is not configured','BANK_UNAVAILABLE');}));
router.post('/payments/check-bank-status',route(async req=>{
  let id=req.body.payment_id||req.body.id;
  if(!id&&req.body.payment_code)id=(await pool.query('SELECT id FROM payments WHERE payment_code=$1',[req.body.payment_code])).rows[0]?.id;
  if(!id)fail(400,'payment_id required');const p=await row(pool,'payments',id);await paymentAccess(req,p);
  return {payment_id:p.id,status:paymentStatus(p),confirmed:p.status==='COMPLETED',is_paid:p.status==='COMPLETED',provider_status:'NOT_CONFIGURED',message:'Stored payment status only; bank verification is not configured.'};
}));
router.get('/payments/:id/receipt',route(async req=>{
  const p=await row(pool,'payments',req.params.id);await paymentAccess(req,p);
  const receipt=(await pool.query(`SELECT rc.*,p.payment_code,p.payment_method,p.transaction_ref,r.reg_code,r.package_name_snapshot,b.branch_name,b.address,b.phone branch_phone,COALESCE(a.full_name,a.login_phone) issued_by_name FROM receipts rc JOIN payments p ON p.id=rc.payment_id JOIN registrations r ON r.id=p.registration_id JOIN branches b ON b.id=p.branch_id JOIN accounts a ON a.id=rc.issued_by WHERE rc.payment_id=$1`,[p.id])).rows[0];
  if(!receipt)fail(404,'Receipt not available');return receipt;
}));
router.get('/payments/:id',route(async req=>{const p=await row(pool,'payments',req.params.id);await paymentAccess(req,p);return {...p,status:paymentStatus(p)};}));

// ==========================================
// PACKAGE TRANSFER REQUESTS (Chuyển nhượng gói tập)
// ==========================================

router.get('/transfer-requests/lookup-recipient', route(async req => {
  role(req, 'MEMBER', 'QTV', 'RECEPTIONIST');
  const q = String(req.query.query || req.query.phone || '').trim();
  if (!q) fail(400, 'Vui lòng nhập số điện thoại hoặc mã hội viên');

  const member = (await pool.query(`
    SELECT m.id, m.full_name, m.member_code, m.phone, m.status, b.branch_name home_branch_name
    FROM member_profiles m
    JOIN branches b ON b.id = m.home_branch_id
    WHERE m.phone = $1 OR UPPER(m.member_code) = UPPER($1)
    LIMIT 1
  `, [q])).rows[0];

  if (!member) {
    return { found: false, message: 'Không tìm thấy hội viên phù hợp' };
  }
  if (req.user.active_role === 'MEMBER' && member.id === req.user.member_profile_id) {
    return { found: false, message: 'Không thể chuyển nhượng cho chính mình' };
  }
  if (member.status !== 'ACTIVE') {
    return { found: false, message: 'Hội viên này đang không ở trạng thái hoạt động' };
  }

  return {
    found: true,
    member: {
      id: member.id,
      full_name: member.full_name,
      member_code: member.member_code,
      phone: member.phone,
      home_branch_name: member.home_branch_name
    }
  };
}));

router.get('/transfer-requests', route(async req => {
  const type = req.query.type; // 'sent' | 'received' | undefined
  const status = req.query.status; // 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | undefined
  let memberId = null;

  if (req.user.active_role === 'MEMBER') {
    memberId = req.user.member_profile_id;
    if (!memberId) {
      const mp = (await pool.query('SELECT id FROM member_profiles WHERE account_id = $1', [req.user.account_id])).rows[0];
      memberId = mp?.id;
    }
  }

  let whereClause = '1=1';
  const params = [];

  if (memberId) {
    if (type === 'sent') {
      params.push(memberId);
      whereClause += ` AND tr.from_member_id = $${params.length}`;
    } else if (type === 'received') {
      params.push(memberId);
      whereClause += ` AND tr.to_member_id = $${params.length}`;
    } else {
      params.push(memberId);
      whereClause += ` AND (tr.from_member_id = $${params.length} OR tr.to_member_id = $${params.length})`;
    }
  } else if (isStaff(req)) {
    if (req.query.member_id) {
      params.push(req.query.member_id);
      whereClause += ` AND (tr.from_member_id = $${params.length} OR tr.to_member_id = $${params.length})`;
    }
  }

  if (status && status !== 'ALL') {
    params.push(status);
    whereClause += ` AND tr.status = $${params.length}`;
  }

  const query = `
    SELECT
      tr.*,
      r.reg_code,
      r.package_name_snapshot,
      r.package_type_snapshot,
      r.price_snapshot,
      r.duration_days_snapshot,
      r.start_date,
      r.end_date,
      r.remaining_gym_sessions,
      r.remaining_pt_sessions,
      r.total_gym_sessions_snapshot,
      r.total_pt_sessions_snapshot,
      r.sold_branch_id,
      r.is_frozen,
      b.branch_name sold_branch_name,
      fm.full_name AS from_member_name,
      fm.member_code AS from_member_code,
      fm.phone AS from_member_phone,
      tm.full_name AS to_member_name,
      tm.member_code AS to_member_code,
      tm.phone AS to_member_phone
    FROM package_transfer_requests tr
    JOIN registrations r ON r.id = tr.registration_id
    JOIN branches b ON b.id = r.sold_branch_id
    JOIN member_profiles fm ON fm.id = tr.from_member_id
    JOIN member_profiles tm ON tm.id = tr.to_member_id
    WHERE ${whereClause}
    ORDER BY tr.created_at DESC
  `;

  const rows = (await pool.query(query, params)).rows;
  return rows;
}));

router.post('/transfer-requests', route(async req => {
  role(req, 'MEMBER', 'QTV', 'RECEPTIONIST');
  const { registration_id, recipient_phone, recipient_member_code, to_member_id, reason } = req.body;
  if (!registration_id) fail(400, 'Thiếu thông tin gói tập (registration_id)');
  if (!recipient_phone && !recipient_member_code && !to_member_id) {
    fail(400, 'Vui lòng nhập số điện thoại hoặc mã hội viên của người nhận');
  }

  return transaction(async db => {
    const reg = await row(db, 'registrations', registration_id, true);
    let fromMemberId = reg.member_id;
    if (req.user.active_role === 'MEMBER') {
      if (reg.member_id !== req.user.member_profile_id) {
        fail(403, 'Bạn không phải chủ sở hữu gói tập này');
      }
      fromMemberId = req.user.member_profile_id;
    }

    if (!['ACTIVE', 'SCHEDULED'].includes(reg.status)) {
      fail(400, 'Chỉ có thể chuyển nhượng gói tập đang hoạt động hoặc đã lên lịch');
    }
    if (reg.is_frozen) {
      fail(400, 'Gói tập đang bị đóng băng, không thể chuyển nhượng');
    }
    if (reg.end_date && reg.end_date < today()) {
      fail(400, 'Gói tập đã hết hạn, không thể chuyển nhượng');
    }

    const existingPending = (await db.query(
      "SELECT id FROM package_transfer_requests WHERE registration_id = $1 AND status = 'PENDING'",
      [reg.id]
    )).rows[0];
    if (existingPending) {
      fail(409, 'Gói tập này đang có một yêu cầu chuyển nhượng chờ xử lý');
    }

    let toMember = null;
    if (to_member_id) {
      toMember = (await db.query('SELECT * FROM member_profiles WHERE id = $1', [to_member_id])).rows[0];
    } else if (recipient_phone) {
      toMember = (await db.query('SELECT * FROM member_profiles WHERE phone = $1', [recipient_phone.trim()])).rows[0];
    } else if (recipient_member_code) {
      toMember = (await db.query('SELECT * FROM member_profiles WHERE UPPER(member_code) = UPPER($1)', [recipient_member_code.trim()])).rows[0];
    }

    if (!toMember) {
      fail(404, 'Không tìm thấy hội viên nhận chuyển nhượng');
    }
    if (toMember.status !== 'ACTIVE') {
      fail(400, 'Tài khoản hội viên nhận hiện không ở trạng thái hoạt động');
    }
    if (toMember.id === fromMemberId) {
      fail(400, 'Không thể chuyển nhượng gói tập cho chính mình');
    }

    const cleanReason = reason ? String(reason).trim().slice(0, 500) : null;

    const inserted = (await db.query(
      `INSERT INTO package_transfer_requests (registration_id, from_member_id, to_member_id, reason, status, transfer_fee)
       VALUES ($1, $2, $3, $4, 'PENDING', 0)
       RETURNING *`,
      [reg.id, fromMemberId, toMember.id, cleanReason]
    )).rows[0];

    const fromMember = (await db.query('SELECT full_name FROM member_profiles WHERE id = $1', [fromMemberId])).rows[0];
    if (toMember.account_id) {
      await db.query(
        `INSERT INTO notifications (account_id, title, body, reference_type, reference_id, branch_id, event_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          toMember.account_id,
          'Yêu cầu chuyển nhượng gói tập',
          `Hội viên ${fromMember?.full_name || 'khác'} đã gửi cho bạn yêu cầu nhận chuyển nhượng gói ${reg.package_name_snapshot} (${reg.reg_code}).`,
          'PACKAGE_TRANSFER',
          inserted.id,
          reg.sold_branch_id,
          'TRANSFER_REQUEST_RECEIVED'
        ]
      );
    }

    return {
      success: true,
      message: 'Gửi yêu cầu chuyển nhượng thành công',
      transfer_request: inserted
    };
  });
}));

router.post('/transfer-requests/:id/respond', route(async req => {
  role(req, 'MEMBER', 'QTV', 'RECEPTIONIST');
  const { action } = req.body;
  if (!['ACCEPT', 'REJECT'].includes(action)) {
    fail(400, 'Hành động không hợp lệ (yêu cầu ACCEPT hoặc REJECT)');
  }

  return transaction(async db => {
    const tr = (await db.query('SELECT * FROM package_transfer_requests WHERE id = $1 FOR UPDATE', [req.params.id])).rows[0];
    if (!tr) fail(404, 'Không tìm thấy yêu cầu chuyển nhượng');
    if (tr.status !== 'PENDING') {
      fail(409, `Yêu cầu chuyển nhượng đã ở trạng thái ${tr.status}`);
    }

    if (req.user.active_role === 'MEMBER' && tr.to_member_id !== req.user.member_profile_id) {
      fail(403, 'Bạn không phải là người nhận của yêu cầu chuyển nhượng này');
    }

    const reg = await row(db, 'registrations', tr.registration_id, true);
    const fromMember = (await db.query('SELECT * FROM member_profiles WHERE id = $1', [tr.from_member_id])).rows[0];
    const toMember = (await db.query('SELECT * FROM member_profiles WHERE id = $1', [tr.to_member_id])).rows[0];

    if (action === 'REJECT') {
      const updated = (await db.query(
        "UPDATE package_transfer_requests SET status = 'REJECTED', responded_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *",
        [tr.id]
      )).rows[0];

      if (fromMember?.account_id) {
        await db.query(
          `INSERT INTO notifications (account_id, title, body, reference_type, reference_id, branch_id, event_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            fromMember.account_id,
            'Yêu cầu chuyển nhượng bị từ chối',
            `Hội viên ${toMember?.full_name || 'Bên nhận'} đã từ chối yêu cầu chuyển nhượng gói ${reg.package_name_snapshot} (${reg.reg_code}).`,
            'PACKAGE_TRANSFER',
            tr.id,
            reg.sold_branch_id,
            'TRANSFER_REQUEST_REJECTED'
          ]
        );
      }

      return { success: true, message: 'Đã từ chối yêu cầu chuyển nhượng', transfer_request: updated };
    }

    // Action === 'ACCEPT'
    if (!['ACTIVE', 'SCHEDULED'].includes(reg.status)) {
      fail(400, 'Gói tập hiện không còn ở trạng thái khả dụng để chuyển nhượng');
    }
    if (reg.is_frozen) {
      fail(400, 'Gói tập đang bị đóng băng, không thể nhận chuyển nhượng');
    }
    if (reg.end_date && reg.end_date < today()) {
      fail(400, 'Gói tập đã hết hạn, không thể nhận chuyển nhượng');
    }
    if (reg.member_id !== tr.from_member_id) {
      fail(400, 'Chủ sở hữu gói tập đã thay đổi, yêu cầu này không còn hiệu lực');
    }

    if (['GYM_TIME', 'GYM_SESSION'].includes(reg.package_type_snapshot)) {
      const activeGym = (await db.query(
        `SELECT id, reg_code, package_name_snapshot FROM registrations
         WHERE member_id = $1 AND status = 'ACTIVE' AND package_type_snapshot IN ('GYM_TIME', 'GYM_SESSION')
           AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
        [toMember.id]
      )).rows[0];
      if (activeGym) {
        fail(409, `Bạn đang có gói Gym (${activeGym.package_name_snapshot} - ${activeGym.reg_code}) còn hiệu lực. Mỗi hội viên chỉ được sở hữu tối đa 1 gói Gym.`);
      }
    }

    const updatedReg = (await db.query(
      'UPDATE registrations SET member_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [toMember.id, reg.id]
    )).rows[0];

    const staffAccount = (await db.query(
      `SELECT a.id FROM accounts a
       JOIN account_roles ar ON ar.account_id = a.id
       JOIN roles ro ON ro.id = ar.role_id
       WHERE ro.role_code IN ('RECEPTIONIST', 'QTV')
       LIMIT 1`
    )).rows[0];
    const approvedBy = isStaff(req) ? req.user.account_id : (staffAccount?.id || toMember.account_id);

    await db.query(
      `INSERT INTO package_transfers (registration_id, from_member_id, to_member_id, transfer_fee, reason, approved_by_account_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [reg.id, fromMember.id, toMember.id, tr.transfer_fee || 0, tr.reason || 'Chuyển nhượng trực tiếp giữa hội viên', approvedBy]
    );

    const updatedReq = (await db.query(
      "UPDATE package_transfer_requests SET status = 'ACCEPTED', responded_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *",
      [tr.id]
    )).rows[0];

    await audit(db, req, 'registrations', reg.id, 'PACKAGE_TRANSFERRED', reg, updatedReg, reg.sold_branch_id, `Chuyển nhượng từ ${fromMember.full_name} sang ${toMember.full_name}`);

    if (fromMember?.account_id) {
      await db.query(
        `INSERT INTO notifications (account_id, title, body, reference_type, reference_id, branch_id, event_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          fromMember.account_id,
          'Chuyển nhượng gói tập thành công',
          `Gói tập ${reg.package_name_snapshot} (${reg.reg_code}) đã được chuyển nhượng thành công cho ${toMember.full_name}.`,
          'PACKAGE_TRANSFER',
          tr.id,
          reg.sold_branch_id,
          'PACKAGE_TRANSFERRED'
        ]
      );
    }
    if (toMember?.account_id) {
      await db.query(
        `INSERT INTO notifications (account_id, title, body, reference_type, reference_id, branch_id, event_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          toMember.account_id,
          'Nhận chuyển nhượng gói tập thành công',
          `Bạn đã nhận thành công gói tập ${reg.package_name_snapshot} (${reg.reg_code}) từ ${fromMember.full_name}.`,
          'PACKAGE_TRANSFER',
          tr.id,
          reg.sold_branch_id,
          'PACKAGE_TRANSFERRED'
        ]
      );
    }

    return {
      success: true,
      message: 'Chấp nhận chuyển nhượng gói tập thành công',
      transfer_request: updatedReq,
      registration: updatedReg
    };
  });
}));

router.delete('/transfer-requests/:id', route(async req => {
  role(req, 'MEMBER', 'QTV', 'RECEPTIONIST');
  return transaction(async db => {
    const tr = (await db.query('SELECT * FROM package_transfer_requests WHERE id = $1 FOR UPDATE', [req.params.id])).rows[0];
    if (!tr) fail(404, 'Không tìm thấy yêu cầu chuyển nhượng');
    if (tr.status !== 'PENDING') {
      fail(409, `Không thể thu hồi yêu cầu đang ở trạng thái ${tr.status}`);
    }

    if (req.user.active_role === 'MEMBER' && tr.from_member_id !== req.user.member_profile_id) {
      fail(403, 'Bạn không có quyền thu hồi yêu cầu này');
    }

    const updated = (await db.query(
      "UPDATE package_transfer_requests SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *",
      [tr.id]
    )).rows[0];

    return { success: true, message: 'Đã thu hồi yêu cầu chuyển nhượng', transfer_request: updated };
  });
}));

module.exports={router,effective,registrationAccess,listRegistrations,listPayments};

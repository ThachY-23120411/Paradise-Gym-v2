const express=require('express');
const {transaction}=require('../../db/postgres');
const {generateVietQR}=require('../../utils/vietqr');
const {emit}=require('./notifications');
const {canMember,trainerView}=require('./catalog');
const H=require('./http');
const {pool,route,fail,text,date,today,addDays,choice,only,isStaff,role,financial,branch,selected,scope,row,activeBranch,audit,code,page,search}=H;
const router=express.Router();
function effective(r,day=today()) {
  if(['ACTIVE','SCHEDULED','EXPIRED'].includes(r.status))return r.end_date&&r.end_date<day?'EXPIRED':r.start_date>day?'SCHEDULED':'ACTIVE';
  return r.status;
}
async function registrationAccess(req,r) {
  if(isStaff(req)){branch(req,r.sold_branch_id);return;}
  if(req.user.active_role==='MEMBER'&&r.member_id===req.user.member_profile_id)return;
  if(req.user.active_role==='PT'&&r.assigned_pt_id===req.user.pt_profile_id)return;
  fail(403,'Registration outside authorized scope','FORBIDDEN');
}
async function listRegistrations(req,db=pool) {
  const list=(await db.query(`SELECT r.*,m.full_name member_name,m.member_code,m.phone member_phone,m.home_branch_id,
    b.branch_name sold_branch_name,b.branch_name,pt.full_name pt_name,pt.pt_code,pt.full_name assigned_pt_name,pt.pt_code assigned_pt_code,r.reg_code registration_code,
    (SELECT branch_name FROM branches WHERE id=m.home_branch_id) member_home_branch_name,
    ARRAY(SELECT branch_id FROM registration_allowed_branches WHERE registration_id=r.id) allowed_branch_ids,
    EXISTS(SELECT 1 FROM payments p WHERE p.registration_id=r.id AND p.status='COMPLETED' AND p.amount=r.price_snapshot) is_paid
    FROM registrations r JOIN member_profiles m ON m.id=r.member_id JOIN branches b ON b.id=r.sold_branch_id LEFT JOIN pt_profiles pt ON pt.id=r.assigned_pt_id
    WHERE ($1::uuid[] IS NULL OR r.sold_branch_id=ANY($1)) AND ($2 OR r.member_id=$3 OR r.assigned_pt_id=$4)
    ORDER BY r.created_at DESC`,[isStaff(req)?scope(req):null,isStaff(req),req.user.active_role==='MEMBER'?req.user.member_profile_id:null,req.user.active_role==='PT'?req.user.pt_profile_id:null])).rows.map(r=>({...r,status:effective(r)}));
  const items=search(list,{...req.query,status:req.query.status==='EXPIRING'?null:req.query.status},['reg_code','member_name','member_phone','package_name_snapshot']).filter(r=>(!req.query.member_id||r.member_id===req.query.member_id)&&(!req.query.pt_id||r.assigned_pt_id===req.query.pt_id)&&
    (req.query.assigned_pt!=='assigned'||r.assigned_pt_id)&&(req.query.assigned_pt!=='unassigned'||(!r.assigned_pt_id&&r.total_pt_sessions_snapshot>0))&&(req.query.status!=='EXPIRING'||r.status==='ACTIVE'&&r.end_date<=addDays(today(),14)));
  if(req.user.active_role==='PT')items.forEach(r=>{delete r.price_snapshot;});return items;
}
router.get('/registrations',route(req=>listRegistrations(req)));
router.get('/registrations/:id',route(async req=>{
  const r=await row(pool,'registrations',req.params.id);await registrationAccess(req,r);
  const member=await row(pool,'member_profiles',r.member_id),allowed=(await pool.query('SELECT b.* FROM registration_allowed_branches a JOIN branches b ON b.id=a.branch_id WHERE a.registration_id=$1',[r.id])).rows;
  const payments=req.user.active_role==='PT'?[]:(await pool.query('SELECT * FROM payments WHERE registration_id=$1 ORDER BY created_at DESC',[r.id])).rows;
  const assigned=r.assigned_pt_id?await trainerView(req,await row(pool,'pt_profiles',r.assigned_pt_id)):null;
  const creator=r.created_by?(await pool.query('SELECT COALESCE(full_name,login_phone) name FROM accounts WHERE id=$1',[r.created_by])).rows[0]:null;
  const checkins=Number((await pool.query("SELECT count(*) FROM access_logs WHERE registration_id=$1 AND status='ALLOWED' AND direction='IN'",[r.id])).rows[0].count);
  if(req.user.active_role==='PT')delete r.price_snapshot;
  return {...r,registration_code:r.reg_code,status:effective(r),member,member_name:member.full_name,member_code:member.member_code,member_phone:member.phone,allowed_branches:allowed,assigned_pt:assigned,pt_name:assigned?.full_name||null,payments,created_by_name:creator?.name||null,
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
    if(!allowed.includes(branchId))fail(409,'Package is not sold at this branch');
    if(old&&!old.end_date)fail(409,'Undated session package cannot be renewed as a continuous period');
    const start=date(req.body.start_date||(old?addDays(old.end_date>today()?old.end_date:today(),1):today()));
    if(start<today())fail(400,'New registrations cannot start in the past');
    if(old&&old.end_date>=today()&&start<=old.end_date)fail(409,'Renewal must start after the previous period');
    const end=p.duration_days?addDays(start,p.duration_days):null;
    const r=(await db.query(`INSERT INTO registrations(reg_code,member_id,package_id,sold_branch_id,previous_registration_id,package_name_snapshot,package_type_snapshot,price_snapshot,duration_days_snapshot,total_gym_sessions_snapshot,total_pt_sessions_snapshot,start_date,end_date,remaining_gym_sessions,remaining_pt_sessions,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$10,$11,$14) RETURNING *`,[await code(db,'registrations','reg_code','DK'),member.id,p.id,branchId,old?.id||null,p.package_name,p.package_type,p.price,p.duration_days,p.total_gym_sessions,p.total_pt_sessions,start,end,req.user.account_id])).rows[0];
    for(const id of allowed)await db.query('INSERT INTO registration_allowed_branches VALUES($1,$2)',[r.id,id]);
    await audit(db,req,'registrations',r.id,old?'REGISTRATION_RENEWED':'REGISTRATION_CREATED',null,r,branchId);return r;
  });
}
router.post('/registrations',route(createRegistration));router.post('/registrations/:id/renew',route(createRegistration));
router.post('/registrations/:id/assign-pt',route(async req=>{
  role(req,'QTV','RECEPTIONIST');return transaction(async db=>{
    const r=await row(db,'registrations',req.params.id,true);await registrationAccess(req,r);
    if(!r.total_pt_sessions_snapshot||r.assigned_pt_id||['CANCELLED','EXPIRED'].includes(effective(r)))fail(409,'Registration cannot be assigned');
    const p=await row(db,'pt_profiles',req.body.pt_id,true);if(p.branch_id!==r.sold_branch_id||p.status!=='ACTIVE')fail(409,'Trainer must be active at the registration branch');
    await activeBranch(db,r.sold_branch_id);
    const updated=(await db.query('UPDATE registrations SET assigned_pt_id=$2,updated_at=NOW() WHERE id=$1 RETURNING *',[r.id,p.id])).rows[0];
    await db.query("UPDATE pt_assignment_requests SET status='REJECTED',responded_at=NOW(),response_note='Assigned by staff' WHERE registration_id=$1 AND status='PENDING'",[r.id]);
    const m=await row(db,'member_profiles',r.member_id),b=await row(db,'branches',r.sold_branch_id);
    await emit(db,{event:'PT_REQUEST_ACCEPTED',branchId:b.id,referenceId:r.id,referenceType:'REGISTRATION',accounts:[m.account_id,p.account_id],variables:{member_name:m.full_name,pt_name:p.full_name,package_name:r.package_name_snapshot,branch_name:b.branch_name}});
    await audit(db,req,'registrations',r.id,'PT_ASSIGNED',r,updated,b.id,text(req.body.note,'note',255,false));return updated;
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
  const from=req.query.date_from||req.query.from_date||req.query.date,to=req.query.date_to||req.query.to_date||req.query.date||from;
  if(from)date(from);if(to)date(to);
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
  if(req.body.amount!==undefined&&Number(req.body.amount)!==Number(r.price_snapshot))fail(400,'Payment must equal 100% of the snapshot price');
  const method=choice((req.body.payment_method||'CASH').replace('BANK_TRANSFER_VIETQR','BANK_TRANSFER'),['CASH','BANK_TRANSFER'],'payment_method');
  if(!isStaff(req)&&method!=='BANK_TRANSFER')fail(403,'Cash must be collected by staff');
  const member=await row(db,'member_profiles',r.member_id);
  const response=p=>{const qr=method==='BANK_TRANSFER'?generateVietQR({amount:p.amount,description:`${r.reg_code} ${member.member_code} PARADISE`}):null;return {payment:p,registration:r,qr_data:qr,vietqr:qr};};
  const existing=(await db.query("SELECT * FROM payments WHERE registration_id=$1 AND status='PENDING' ORDER BY created_at DESC",[r.id])).rows.find(p=>paymentStatus(p)==='PENDING');
  if(existing){if(existing.payment_method!==method)fail(409,'An open invoice already exists with a different method');return response(existing);}
  const p=(await db.query(`INSERT INTO payments(registration_id,member_id,branch_id,payment_code,payment_method,amount,collected_by,note,expires_at)
    VALUES($1,$2,$3,$4,$5::varchar,$6,$7,$8,CASE WHEN $5::varchar='BANK_TRANSFER' THEN NOW()+interval '15 minutes' ELSE NULL END) RETURNING *`,[r.id,r.member_id,r.sold_branch_id,await code(db,'payments','payment_code','PAY'),method,r.price_snapshot,req.user.account_id,text(req.body.note,'note',255,false)])).rows[0];
  await audit(db,req,'payments',p.id,'PAYMENT_INVOICE',null,p,p.branch_id);
  return response(p);
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
  if(reference&&(await db.query("SELECT 1 FROM payments WHERE transaction_ref=$1 AND status='COMPLETED' AND id<>$2",[reference,p.id])).rowCount)fail(409,'Bank transaction reference already used');
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
module.exports={router,effective,registrationAccess,listRegistrations,listPayments};

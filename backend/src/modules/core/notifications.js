const express=require('express');
const {transaction}=require('../../db/postgres');
const {pool,route,fail,text,role,branch,selected,scope,row,audit,code,page,search,choice,uuid,today,date}=require('./http');
const router=express.Router();
const schemas={
  PAYMENT_CONFIRMED:['member_name','package_name','amount','payment_time','branch_name'],
  BOOKING_CREATED:['member_name','pt_name','booking_date','time_slot','branch_name','cancel_reason'],
  BOOKING_CANCELLED:['member_name','pt_name','booking_date','time_slot','branch_name','cancel_reason'],
  BOOKING_REMINDER:['member_name','pt_name','booking_date','time_slot','branch_name'],
  PT_REQUEST_ACCEPTED:['member_name','pt_name','package_name','branch_name'],
  PT_REQUEST_REJECTED:['member_name','pt_name','package_name','branch_name','cancel_reason'],
  PT_ASSIGNMENT_REQUEST:['member_name','pt_name','package_name','branch_name'],
  PT_SESSION_AWAITING_CONFIRMATION:['member_name','pt_name','booking_date','time_slot','branch_name'],
  PT_SESSION_CONFIRMED:['member_name','pt_name','booking_date','time_slot','branch_name'],
  REGISTRATION_ACTIVATED:['member_name','package_name','expiry_date','branch_name'],
  REGISTRATION_CANCELLED:['member_name','package_name','registration_code','cancel_reason','branch_name'],
  PACKAGE_EXPIRING:['member_name','package_name','expiry_date','days_left'],
  FACILITY_NOTICE:['branch_name','effective_date'],
  MEMBER_BIRTHDAY:['member_name','birthday_date','branch_name']
};
const labels={member_name:'Họ tên hội viên',package_name:'Tên gói',amount:'Số tiền',payment_time:'Thời gian thanh toán',branch_name:'Chi nhánh',pt_name:'Tên PT',booking_date:'Ngày tập',time_slot:'Khung giờ',cancel_reason:'Lý do hủy',expiry_date:'Ngày hết hạn',days_left:'Số ngày còn lại',effective_date:'Ngày áp dụng',registration_code:'Mã đăng ký',birthday_date:'Ngày sinh nhật'};
const aliases={ten_hoi_vien:'member_name',ten_goi:'package_name',ngay_het_han:'expiry_date',ten_pt:'pt_name',thoi_gian_tap:'time_slot',gio_tap:'time_slot',so_tien:'amount',ma_hop_dong:'registration_code',ly_do_huy:'cancel_reason'};
function render(value,variables,strict=true) {
  return value.replace(/{{\s*([\w]+)\s*}}/g,(_,key)=>{const v=variables[key]??variables[aliases[key]];if(v==null&&strict)fail(400,`Missing notification variable: ${key}`);return v==null?'':String(v);});
}
function validateTemplate(t) {
  choice(t.event_type,Object.keys(schemas),'event_type');
  for(const m of `${t.title_template} ${t.body_template}`.matchAll(/{{\s*([^}]+)\s*}}/g))if(!schemas[t.event_type].includes(m[1])&&!schemas[t.event_type].includes(aliases[m[1]]))fail(400,`Unsupported variable: ${m[1]}`);
}
async function emit(db,{event,branchId,referenceId,referenceType,variables={},accounts=[],key,audienceRoles,personal=false}) {
  // Automatic delivery is opt-in per branch/event; callers cannot bypass W09 configuration.
  if(!branchId)return 0;
  const rule=(await db.query(`SELECT r.*,t.title_template,t.body_template,t.is_active
    FROM notification_rules r JOIN notification_templates t ON t.id=r.template_id
    WHERE r.branch_id=$1 AND r.event_type=$2 AND t.event_type=r.event_type
      AND (t.branch_id=r.branch_id OR t.branch_id IS NULL)`,[branchId,event])).rows[0];
  if(!rule?.is_enabled||!rule.is_active)return 0;
  const roles=audienceRoles?rule.recipient_roles.filter(r=>audienceRoles.includes(r)):rule.recipient_roles;
  const result=await db.query(`SELECT DISTINCT a.id FROM accounts a JOIN account_roles ar ON ar.account_id=a.id JOIN roles r ON r.id=ar.role_id
      WHERE a.status='ACTIVE' AND r.role_code=ANY($1) AND (($2 AND a.id=ANY($3::uuid[])) OR ($4 AND (
        EXISTS(SELECT 1 FROM account_branch_scopes s WHERE s.account_id=a.id AND (s.branch_id=$5 OR s.is_all_branches))
        OR EXISTS(SELECT 1 FROM member_profiles m WHERE m.account_id=a.id AND m.home_branch_id=$5)
        OR EXISTS(SELECT 1 FROM pt_profiles p WHERE p.account_id=a.id AND p.branch_id=$5))))
      AND (r.role_code<>'MEMBER' OR (a.notify_in_app AND ($6<>'BOOKING_REMINDER' OR a.notify_pt_reminders)))
      AND (r.role_code<>'PT' OR (($6 NOT IN ('BOOKING_CREATED','BOOKING_CANCELLED') OR a.notify_new_bookings)
        AND ($6<>'PT_SESSION_AWAITING_CONFIRMATION' OR a.notify_result_reminders)))`,[roles,rule.modes.includes('DIRECT'),accounts.filter(Boolean),rule.modes.includes('BRANCH'),branchId,event]);
  const recipients=result.rows.map(x=>x.id).filter(id=>!personal||accounts.includes(id));
  const title=render(rule.title_template,variables,false),body=render(rule.body_template,variables,false);
  let count=0;
  for(const id of new Set(recipients)){
    count+=(await db.query(`INSERT INTO notifications(account_id,template_id,title,body,reference_type,reference_id,branch_id,event_type,event_key)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,[id,rule.template_id,title,body,referenceType,referenceId,branchId,event,key||`${event}:${referenceId}:${id}`])).rowCount;
  }
  return count;
}
const eventNames={
  PAYMENT_CONFIRMED:'Thanh toán thành công',
  BOOKING_CREATED:'Đặt lịch PT',
  BOOKING_CANCELLED:'Hủy lịch PT',
  BOOKING_REMINDER:'Nhắc lịch PT',
  PT_REQUEST_ACCEPTED:'Chấp nhận phân công PT',
  PT_REQUEST_REJECTED:'Từ chối phân công PT',
  PT_ASSIGNMENT_REQUEST:'Yêu cầu phân công PT',
  PT_SESSION_AWAITING_CONFIRMATION:'Chờ xác nhận buổi PT',
  PT_SESSION_CONFIRMED:'Hoàn thành buổi PT',
  REGISTRATION_ACTIVATED:'Kích hoạt gói',
  REGISTRATION_CANCELLED:'Hủy gói tập',
  PACKAGE_EXPIRING:'Gói sắp hết hạn',
  FACILITY_NOTICE:'Thông báo cơ sở',
  MEMBER_BIRTHDAY:'Chúc mừng sinh nhật hội viên'
};
const eventCatalog=()=>Object.entries(schemas).map(([event_type,keys])=>({event_type,event_code:event_type,event_name:eventNames[event_type],channel:'IN_APP',variables:keys.map(key=>({key,label:labels[key]}))}));
const ruleView=r=>({...r,event_code:r.event_type,event_name:eventNames[r.event_type],is_active:r.is_enabled,recipient_modes:r.modes.map(m=>m==='BRANCH'?'BRANCH_BROADCAST':m)});
router.get('/notifications/events',route(req=>{role(req,'QTV','RECEPTIONIST');return eventCatalog();}));
async function templates(req,db=pool){role(req,'QTV');return (await db.query(`SELECT t.*,t.event_type event_code,COALESCE(t.template_name,t.template_code) name,a.full_name creator_name,'IN_APP' channel FROM notification_templates t LEFT JOIN accounts a ON a.id=t.created_by WHERE t.branch_id IS NULL OR $1::uuid[] IS NULL OR t.branch_id=ANY($1) ORDER BY t.created_at DESC`,[scope(req)])).rows;}
router.get('/notifications/templates',route(async req=>search(await templates(req),req.query,['template_name','template_code']).filter(t=>!(req.query.event_type||req.query.event_code)||t.event_type===(req.query.event_type||req.query.event_code))));
router.get('/notifications/templates/:id',route(async req=>{const t=(await templates(req)).find(t=>t.id===req.params.id);if(!t)fail(404,'Template not found');return {...t,variables:(schemas[t.event_type]||[]).map(key=>({key,label:labels[key]}))};}));
async function saveTemplate(req){
  role(req,'QTV');return transaction(async db=>{
    const old=req.params.id?await row(db,'notification_templates',req.params.id,true):null;
    if(old){if(old.branch_id)branch(req,old.branch_id);else if(!req.user.is_all_branches)fail(403,'Global template requires all-branches administrator');}
    const t={...old,...req.body};
    t.event_type=req.body.event_type||req.body.event_code||old?.event_type;
    t.template_name=text(t.template_name||t.name||t.template_code,'template_name',100);t.title_template=text(t.title_template,'title_template',150);t.body_template=text(t.body_template,'body_template',1000);validateTemplate(t);
    if(old&&old.event_type!==t.event_type&&(await db.query('SELECT 1 FROM notification_rules WHERE template_id=$1',[old.id])).rowCount)fail(409,'Cannot change event of a template used by a rule');
    const branchId=old?old.branch_id:selected(req,req.body.branch_id);
    const args=[t.template_name,t.event_type,t.title_template,t.body_template,t.is_active!==false];
    const saved=old?(await db.query('UPDATE notification_templates SET template_name=$1,event_type=$2,title_template=$3,body_template=$4,is_active=$5,updated_at=NOW() WHERE id=$6 RETURNING *',[...args,old.id])).rows[0]:(await db.query("INSERT INTO notification_templates(template_name,event_type,title_template,body_template,is_active,template_code,target_role,created_by,branch_id) VALUES($1,$2,$3,$4,$5,$6,'MEMBER',$7,$8) RETURNING *",[...args,await code(db,'notification_templates','template_code','TMP'),req.user.account_id,branchId])).rows[0];
    await audit(db,req,'notification_templates',saved.id,'NOTIFICATION_TEMPLATE_SAVED',old,saved,branchId);return saved;
  });
}
router.post('/notifications/templates',route(saveTemplate));router.put('/notifications/templates/:id',route(saveTemplate));
router.get('/notifications/rules',route(async req=>{
  role(req,'QTV');const rows=(await pool.query(`SELECT r.*,t.template_name,'IN_APP' channel FROM notification_rules r JOIN notification_templates t ON t.id=r.template_id WHERE ($1::uuid[] IS NULL OR r.branch_id=ANY($1))`,[scope(req)])).rows;
  const ids=scope(req);if(ids?.length===1){const b=ids[0];return eventCatalog().map(e=>ruleView(rows.find(r=>r.event_type===e.event_type)||{...e,branch_id:b,template_id:null,is_enabled:false,recipient_roles:[],modes:[],configured:false}));}
  return rows.map(ruleView);
}));
router.put('/notifications/rules',route(async req=>{
  role(req,'QTV');return transaction(async db=>{
    const b=selected(req,req.body.branch_id),event=choice(req.body.event_type||req.body.event_code,Object.keys(schemas),'event_type');
    const old=(await db.query('SELECT * FROM notification_rules WHERE branch_id=$1 AND event_type=$2 FOR UPDATE',[b,event])).rows[0];
    const p={...old,...req.body};if(!p.template_id)fail(400,'Select a template before configuring this event');
    const t=await row(db,'notification_templates',p.template_id);
    if(t.branch_id&&t.branch_id!==b)fail(403,'Template belongs to a different branch');
    if(t.event_type!==event)fail(400,'Template event mismatch');
    const roles=p.recipient_roles,modes=(req.body.recipient_modes||p.modes)?.map(m=>m==='BRANCH_BROADCAST'?'BRANCH':m);
    if(!Array.isArray(roles)||!roles.length||!Array.isArray(modes)||!modes.length)fail(400,'Select recipient roles and modes');
    roles.forEach(r=>choice(r,['QTV','RECEPTIONIST','PT','MEMBER'],'role'));modes.forEach(m=>choice(m,['DIRECT','BRANCH'],'mode'));
    const saved=(await db.query(`INSERT INTO notification_rules(branch_id,event_type,template_id,recipient_roles,modes,is_enabled,updated_by)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(branch_id,event_type) DO UPDATE SET template_id=$3,recipient_roles=$4,modes=$5,is_enabled=$6,updated_by=$7,updated_at=NOW() RETURNING *`,[b,event,t.id,roles,modes,req.body.is_active??p.is_enabled??false,req.user.account_id])).rows[0];
    await audit(db,req,'notification_rules',saved.id,'NOTIFICATION_RULE_SAVED',old,saved,b);return ruleView(saved);
  });
}));
router.get('/notifications/history',route(async req=>{
  role(req,'QTV','RECEPTIONIST');const from=date(req.query.date_from||req.query.from_date||req.query.date||today()),to=date(req.query.date_to||req.query.to_date||req.query.date||from);
  const list=(await pool.query(`SELECT n.*,COALESCE(m.full_name,p.full_name,a.full_name,a.login_phone) recipient_name,a.login_phone recipient_phone,COALESCE(m.member_code,p.pt_code) recipient_code,
    COALESCE(pay.payment_code,reg.reg_code,n.reference_id::text) reference_code
    FROM notifications n JOIN accounts a ON a.id=n.account_id LEFT JOIN member_profiles m ON m.account_id=a.id LEFT JOIN pt_profiles p ON p.account_id=a.id
    LEFT JOIN payments pay ON pay.id=n.reference_id AND n.reference_type='PAYMENT' LEFT JOIN registrations reg ON reg.id=n.reference_id AND n.reference_type='REGISTRATION'
    WHERE ($1::uuid[] IS NULL OR n.branch_id=ANY($1)) AND (n.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN $2 AND $3 ORDER BY n.created_at DESC`,[scope(req),from,to])).rows;
  return page(search(list,req.query,['recipient_name','recipient_phone','reference_code']).filter(n=>(req.user.active_role!=='RECEPTIONIST'||n.recipient_code)&&(!(req.query.event_type||req.query.event_code)||n.event_type===(req.query.event_type||req.query.event_code))&&(req.query.is_read===undefined||n.is_read===(req.query.is_read==='true'))).map(n=>({...n,event_code:n.event_type,event_name:eventNames[n.event_type]})),req.query);
}));
router.post('/notifications/send',route(async req=>{
  role(req,'QTV');return transaction(async db=>{
    const b=selected(req,req.body.branch_id),t=await row(db,'notification_templates',req.body.template_id);
    if(!t.is_active)fail(409,'Template is inactive');if(t.branch_id&&t.branch_id!==b)fail(403,'Template outside branch');
    const ids=req.body.account_ids;if(!Array.isArray(ids)||!ids.length||ids.length>500)fail(400,'Choose 1-500 recipients');
    const title=render(t.title_template,req.body.variables||{}),body=render(t.body_template,req.body.variables||{}),key=uuid();let sent=0;
    for(const id of new Set(ids)){
      const valid=await db.query(`SELECT a.id,a.notify_in_app FROM accounts a WHERE a.id=$1 AND a.status='ACTIVE' AND (EXISTS(SELECT 1 FROM member_profiles m WHERE m.account_id=a.id AND m.home_branch_id=$2) OR EXISTS(SELECT 1 FROM pt_profiles p WHERE p.account_id=a.id AND p.branch_id=$2) OR EXISTS(SELECT 1 FROM account_branch_scopes s WHERE s.account_id=a.id AND s.branch_id=$2))`,[id,b]);
      if(!valid.rowCount)fail(403,'Recipient outside branch or inactive');
      if(!valid.rows[0].notify_in_app)continue;
      await db.query('INSERT INTO notifications(account_id,template_id,title,body,branch_id,event_type,event_key) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,t.id,title,body,b,t.event_type,key]);sent++;
    }
    await audit(db,req,'notification_templates',t.id,'NOTIFICATION_MANUAL_SEND',null,{count:sent},b);return {sent,channel:'IN_APP'};
  });
}));
router.get('/notifications',route(async req=>(await pool.query('SELECT * FROM notifications WHERE account_id=$1 ORDER BY created_at DESC LIMIT 500',[req.user.account_id])).rows));
router.put('/notifications/read-all',route(async req=>{
  const res=await pool.query('UPDATE notifications SET is_read=TRUE,read_at=COALESCE(read_at,NOW()) WHERE account_id=$1 AND is_read=FALSE RETURNING id',[req.user.account_id]);
  return {updated_count:res.rowCount};
}));
router.put('/notifications/:id/read',route(async req=>{
  const n=(await pool.query('UPDATE notifications SET is_read=TRUE,read_at=COALESCE(read_at,NOW()) WHERE id=$1 AND account_id=$2 RETURNING *',[req.params.id,req.user.account_id])).rows[0];if(!n)fail(404,'Notification not found');return n;
}));
module.exports={router,emit,schemas};

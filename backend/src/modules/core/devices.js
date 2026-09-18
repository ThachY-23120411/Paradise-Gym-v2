const express=require('express');
const net=require('net');
const {transaction}=require('../../db/postgres');
const {canMember}=require('./catalog');
const {pool,route,fail,text,choice,role,branch,scope,selected,row,audit,search,only}=require('./http');
const router=express.Router();
const deviceStatuses=['ONLINE','OFFLINE','ERROR','PENDING_SYNC','INACTIVE'];
const deviceTypes=[{code:'FACE_CAMERA',name:'Camera nhận diện',directions:['IN','OUT','BOTH'],connection_fields:['ip_address'],supports_capture:true},{code:'CARD_READER',name:'Đầu đọc thẻ',directions:['IN','OUT','BOTH'],connection_fields:['ip_address'],supports_capture:false},{code:'KIOSK_K01',name:'Màn hình K01',directions:['IN','OUT','BOTH'],connection_fields:['ip_address'],supports_capture:false}];
const consentTypes=[{code:'FACE_RECOGNITION',name:'Nhận diện khuôn mặt',purpose:'Kiểm soát ra vào phòng tập',version:'1.0',is_recognition:true},{code:'PUBLIC_DISPLAY',name:'Hiển thị công khai',purpose:'Hiển thị tên và ảnh trên màn hình K01',version:'1.0',is_recognition:false},{code:'BIRTHDAY_DISPLAY',name:'Hiển thị sinh nhật',purpose:'Chúc mừng sinh nhật trên màn hình K01',version:'1.0',is_recognition:false},{code:'MARKETING',name:'Tin quảng bá',purpose:'Nhận thông tin quảng bá',version:'1.0',is_recognition:false}];
function manager(req){role(req,'QTV');if(!req.user.permissions.manage_devices)fail(403,'Device permission required','FORBIDDEN');}
function deviceView(d){
  const now=Date.now(),heartbeat=d.last_heartbeat_at?new Date(d.last_heartbeat_at).getTime():null;
  let connection='INACTIVE';
  if(d.enabled&&d.status!=='INACTIVE'){
    if(heartbeat===null)connection='PENDING_SYNC';
    else if(!Number.isFinite(heartbeat)||heartbeat<=now-120000||heartbeat>now)connection='OFFLINE';
    else connection=d.last_error?.trim()?'ERROR':'ONLINE';
  }
  // Configuration can restrict operation, but only telemetry can establish connectivity.
  const status=connection==='ONLINE'?d.status:connection;
  return {...d,configured_status:d.status,connection_status:connection,status,last_heartbeat:d.last_heartbeat_at,location:d.location_description,telemetry_available:heartbeat!==null&&Number.isFinite(heartbeat)&&heartbeat<=now,last_test_result:null};
}
async function deviceList(req){role(req,'QTV','RECEPTIONIST');return search((await pool.query('SELECT d.*,b.branch_name FROM devices d JOIN branches b ON b.id=d.branch_id WHERE ($1::uuid[] IS NULL OR d.branch_id=ANY($1)) ORDER BY d.device_code',[scope(req)])).rows.map(deviceView),req.query,['device_code','device_name','location_description']);}
async function deviceDetail(req){
  role(req,'QTV','RECEPTIONIST');const d=await row(pool,'devices',req.params.id);branch(req,d.branch_id);
  const b=await row(pool,'branches',d.branch_id),actor=(await pool.query("SELECT COALESCE(a.full_name,a.login_phone) name FROM audit_logs l JOIN accounts a ON a.id=l.actor_account_id WHERE l.target_table='devices' AND l.target_id=$1 AND l.action_name='DEVICE_CONFIGURED' AND l.branch_id=$2 ORDER BY l.created_at DESC LIMIT 1",[d.id,d.branch_id])).rows[0];
  return {...deviceView(d),branch_name:b.branch_name,updated_by_name:actor?.name||null};
}
router.get('/devices/catalog',route(req=>{role(req,'QTV','RECEPTIONIST');return {types:deviceTypes,statuses:deviceStatuses};}));
router.get('/devices/capabilities',route(req=>{role(req,'QTV','RECEPTIONIST');return deviceTypes;}));
router.get('/devices',route(deviceList));
router.get('/devices/incidents',route(async req=>{role(req,'QTV','RECEPTIONIST');return (await pool.query('SELECT i.*,d.device_code,d.device_name,b.branch_name FROM device_incidents i JOIN devices d ON d.id=i.device_id JOIN branches b ON b.id=i.branch_id WHERE ($1::uuid[] IS NULL OR i.branch_id=ANY($1)) ORDER BY i.created_at DESC',[scope(req)])).rows;}));
async function incident(req){
  role(req,'QTV','RECEPTIONIST');return transaction(async db=>{
    const old=req.params.id?await row(db,'device_incidents',req.params.id,true):null;
    if(old){manager(req);branch(req,old.branch_id);}
    const p={...old,...req.body},d=await row(db,'devices',p.device_id,true);branch(req,d.branch_id);
    if(old&&old.device_id!==d.id)fail(400,'Incident device is immutable');
    const description=text(p.description,'description',3000),severity=choice(p.severity,['LOW','MEDIUM','HIGH','CRITICAL'],'severity');
    const status=old?choice(p.status,['OPEN','IN_PROGRESS','RESOLVED'],'status'):'OPEN';
    const saved=old?(await db.query('UPDATE device_incidents SET description=$2,severity=$3,status=$4,updated_by=$5,updated_at=NOW() WHERE id=$1 RETURNING *',[old.id,description,severity,status,req.user.account_id])).rows[0]:(await db.query('INSERT INTO device_incidents(device_id,branch_id,description,severity,reported_by,updated_by) VALUES($1,$2,$3,$4,$5,$5) RETURNING *',[d.id,d.branch_id,description,severity,req.user.account_id])).rows[0];
    await audit(db,req,'device_incidents',saved.id,'DEVICE_INCIDENT',old,saved,old?.branch_id||d.branch_id);return saved;
  });
}
router.post('/devices/incidents',route(incident));router.put('/devices/incidents/:id',route(incident));
router.get('/devices/:id/events',route(async req=>{
  role(req,'QTV','RECEPTIONIST');const d=await row(pool,'devices',req.params.id);branch(req,d.branch_id);
  const events=(await pool.query("SELECT id,created_at occurred_at,created_at received_at,FALSE is_backfill,action_name event_type,reason message,new_values details,'ADMIN_AUDIT' source FROM audit_logs WHERE target_table='devices' AND target_id=$1 AND ($2::uuid[] IS NULL OR branch_id=ANY($2)) ORDER BY created_at DESC",[d.id,scope(req)])).rows;
  return events;
}));
router.post('/devices/:id/test',route(async req=>{manager(req);const d=await row(pool,'devices',req.params.id);branch(req,d.branch_id);fail(503,'Device adapter is not configured; no test or heartbeat was produced','DEVICE_UNAVAILABLE');}));
router.get('/devices/:id',route(deviceDetail));
async function saveDevice(req){
  manager(req);only(req.body,['device_code','device_name','device_type','branch_id','direction','status','enabled','ip_address','location_description','location']);
  return transaction(async db=>{
    const old=req.params.id?await row(db,'devices',req.params.id,true):null;if(old)branch(req,old.branch_id);
    const d={...old,...req.body},b=branch(req,d.branch_id||selected(req));await row(db,'branches',b);
    if(old&&d.device_code!==old.device_code)fail(400,'Device code is immutable');
    const name=text(d.device_name||d.device_code,'device_name',150),code=text(d.device_code,'device_code',50),type=choice(d.device_type,deviceTypes.map(x=>x.code),'device_type');
    const direction=choice(d.direction,deviceTypes.find(t=>t.code===type).directions,'direction');
    const ip=text(d.ip_address,'ip_address',45,false);if(ip&&!net.isIP(ip))fail(400,'Invalid IP address');
    const status=choice(Object.hasOwn(req.body,'status')?req.body.status:old?.status||'PENDING_SYNC',deviceStatuses,'status');
    if(Object.hasOwn(req.body,'enabled')&&typeof req.body.enabled!=='boolean')fail(400,'Invalid enabled');
    const enabled=d.enabled!==false&&status!=='INACTIVE';
    // Persist the selected configuration without changing heartbeat, sync or observed error.
    const args=[code,name,type,b,direction,ip,text(d.location_description||d.location,'location_description',255,false),enabled,status];
    const saved=old?(await db.query('UPDATE devices SET device_code=$1,device_name=$2,device_type=$3,branch_id=$4,direction=$5,ip_address=$6,location_description=$7,enabled=$8,status=$9,updated_at=NOW() WHERE id=$10 RETURNING *',[...args,old.id])).rows[0]:(await db.query('INSERT INTO devices(device_code,device_name,device_type,branch_id,direction,ip_address,location_description,enabled,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',args)).rows[0];
    await audit(db,req,'devices',saved.id,'DEVICE_CONFIGURED',old,saved,b);return deviceView(saved);
  });
}
router.post('/devices',route(saveDevice));router.put('/devices/:id',route(saveDevice));
router.get('/consents/catalog',route(req=>{role(req,'QTV','RECEPTIONIST','MEMBER');return {types:consentTypes};}));
async function consentAccess(req,db=pool){role(req,'QTV','RECEPTIONIST','MEMBER');const m=await row(db,'member_profiles',req.params.id);await canMember(req,m,db);return m;}
async function consentState(req,db=pool){
  const m=await consentAccess(req,db),consents=(await db.query('SELECT * FROM member_consents WHERE member_id=$1 ORDER BY created_at DESC',[m.id])).rows;
  const bio=(await db.query('SELECT status,enrolled_at,delete_scheduled_at FROM biometric_face_data WHERE member_id=$1',[m.id])).rows[0];
  return {member_id:m.id,consents,recognition_status:bio?.status||'NOT_ENROLLED',deletion_status:bio?.delete_scheduled_at?'PENDING':'NONE',audit:(await db.query("SELECT l.action_name,l.created_at,l.reason,COALESCE(a.full_name,a.login_phone) actor_name,l.new_values->>'policy_version' version,l.new_values->>'policy_version' policy_version FROM audit_logs l JOIN accounts a ON a.id=l.actor_account_id WHERE l.target_table='member_consents' AND l.target_id IN (SELECT id FROM member_consents WHERE member_id=$1) ORDER BY l.created_at DESC LIMIT 20",[m.id])).rows};
}
router.get('/members/:id/consents',route(req=>consentState(req)));
async function saveConsent(req,revoke=false){
  return transaction(async db=>{
    const m=await consentAccess(req,db);await row(db,'member_profiles',m.id,true);
    const type=choice(req.params.consent_type||req.body.consent_type||'FACE_RECOGNITION',consentTypes.map(t=>t.code),'consent_type');
    const grant=revoke?false:(req.body.is_granted??req.body.granted);if(typeof grant!=='boolean')fail(400,'Consent must be explicitly granted or refused');
    if(grant&&req.body.identity_verified===false)fail(400,'Identity must be verified');
    const evidenceObject=req.body.evidence&&typeof req.body.evidence==='object'&&!Array.isArray(req.body.evidence)?req.body.evidence:null;
    const verified=req.body.identity_verified===true||evidenceObject?.identity_verified===true;
    if(grant&&req.user.active_role!=='MEMBER'&&!verified)fail(400,'Identity must be verified');
    const evidence=text(evidenceObject?JSON.stringify(evidenceObject):req.body.evidence,'evidence',2000,false);
    const consent=(await db.query(`INSERT INTO member_consents(member_id,consent_type,is_granted,revoked_at,policy_version,recorded_by,evidence)
      VALUES($1,$2,$3,CASE WHEN $3 THEN NULL ELSE NOW() END,$4,$5,$6) RETURNING *`,[m.id,type,grant,text(req.body.consent_version||req.body.policy_version||'1.0','policy_version',50),req.user.account_id,evidence])).rows[0];
    if(!grant&&type==='FACE_RECOGNITION')await db.query("UPDATE biometric_face_data SET status='REVOKED',delete_scheduled_at=CASE WHEN $2 THEN NOW() ELSE delete_scheduled_at END WHERE member_id=$1",[m.id,req.body.delete_requested===true]);
    await audit(db,req,'member_consents',consent.id,grant?'CONSENT_GRANTED':'CONSENT_REVOKED',null,{member_id:m.id,consent_type:type,is_granted:grant,policy_version:consent.policy_version},m.home_branch_id);
    return consentState(req,db);
  });
}
router.post('/members/:id/consents',route(req=>saveConsent(req)));
router.post('/members/:id/revoke-biometric',route(req=>saveConsent(req,true)));
router.post('/members/:id/consents/:consent_type/revoke',route(req=>saveConsent(req,true)));
async function unavailableCapture(req){
  const m=await consentAccess(req);
  const c=(await pool.query("SELECT is_granted FROM member_consents WHERE member_id=$1 AND consent_type='FACE_RECOGNITION' ORDER BY created_at DESC LIMIT 1",[m.id])).rows[0];
  if(!c?.is_granted)fail(409,'Face recognition consent is required','CONSENT_REQUIRED');
  if(req.body.device_id){const d=await row(pool,'devices',req.body.device_id);branch(req,d.branch_id);}
  fail(503,'Trusted biometric capture/test provider is not configured; readiness cannot be confirmed','DEVICE_UNAVAILABLE');
}
router.post('/members/:id/biometric-enrollment',route(unavailableCapture));
router.post('/members/:id/recognition/capture',route(unavailableCapture));
router.post('/members/:id/recognition/test',route(unavailableCapture));
router.post('/members/:id/recognition/ready',route(unavailableCapture));
module.exports={router,deviceList,consentTypes};

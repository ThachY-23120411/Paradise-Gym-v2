const express=require('express');
const {transaction}=require('../../db/postgres');
const {emit}=require('./notifications');
const {effective,registrationAccess}=require('./commerce');
const {trainerView}=require('./catalog');
const {pool,route,fail,text,date,today,choice,only,role,isStaff,branch,scope,row,activeBranch,audit,search}=require('./http');
const router=express.Router();
const openStatuses=['BOOKED','PENDING_COMPLETION','AWAITING_CONFIRMATION'];
const slots=Array.from({length:5},(_,i)=>({start_time:`${String(8+i*2).padStart(2,'0')}:00`,end_time:`${String(10+i*2).padStart(2,'0')}:00`}));
const moment=(b,end=false)=>new Date(`${b.booking_date}T${(end?b.end_time:b.start_time).slice(0,5)}:00+07:00`);
function canBooking(req,b) {
  if(isStaff(req)){branch(req,b.branch_id);return;}
  if(req.user.active_role==='PT'&&b.pt_id===req.user.pt_profile_id)return;
  if(req.user.active_role==='MEMBER'&&b.member_id===req.user.member_profile_id)return;
  fail(403,'Booking outside authorized scope','FORBIDDEN');
}
async function bookingList(req,db=pool) {
  if(req.query.date)date(req.query.date);
  if(req.query.date_from)date(req.query.date_from);if(req.query.date_to)date(req.query.date_to);
  const list=(await db.query(`SELECT bk.*,m.full_name member_name,m.member_code,m.phone member_phone,m.avatar_url member_avatar_url,p.full_name pt_name,p.pt_code,b.branch_name,r.reg_code,r.package_name_snapshot
    FROM pt_bookings bk JOIN member_profiles m ON m.id=bk.member_id JOIN pt_profiles p ON p.id=bk.pt_id JOIN branches b ON b.id=bk.branch_id JOIN registrations r ON r.id=bk.registration_id
    WHERE ($1::uuid[] IS NULL OR bk.branch_id=ANY($1)) AND ($2 OR bk.member_id=$3 OR bk.pt_id=$4)
    AND ($5::uuid IS NULL OR bk.pt_id=$5) AND ($6::uuid IS NULL OR bk.member_id=$6) AND ($7::date IS NULL OR bk.booking_date=$7)
    ORDER BY bk.booking_date,bk.start_time`,[isStaff(req)?scope(req):null,isStaff(req),req.user.active_role==='MEMBER'?req.user.member_profile_id:null,req.user.active_role==='PT'?req.user.pt_profile_id:null,req.query.pt_id||null,req.query.member_id||null,req.query.date||null])).rows;
  return search(list,req.query,['member_name','pt_name','reg_code']).filter(b=>(!req.query.date_from||b.booking_date>=req.query.date_from)&&(!req.query.date_to||b.booking_date<=req.query.date_to)&&(!req.query.registration_id||b.registration_id===req.query.registration_id));
}
router.get('/pt-bookings',route(req=>bookingList(req)));
router.get('/pt-bookings/available-slots',route(async req=>{
  const p=await row(pool,'pt_profiles',req.query.pt_id),day=date(req.query.date);
  if(isStaff(req))branch(req,p.branch_id);
  else if(req.user.active_role==='PT'&&p.id!==req.user.pt_profile_id)fail(403,'Cannot view another PT schedule');
  else if(req.user.active_role==='MEMBER'&&!(await pool.query('SELECT 1 FROM registrations WHERE member_id=$1 AND assigned_pt_id=$2',[req.user.member_profile_id,p.id])).rowCount)fail(403,'Trainer is not assigned to this member');
  const existing=(await pool.query("SELECT start_time,end_time FROM pt_bookings WHERE pt_id=$1 AND booking_date=$2 AND status<>'CANCELLED'",[p.id,day])).rows;
  const weekday=new Date(`${day}T12:00:00Z`).getUTCDay();const working=p.work_days!=='MON_TO_FRI'||(weekday>0&&weekday<6);
  const b=await row(pool,'branches',p.branch_id);
  const result=slots.map(s=>({...s,is_available:working&&p.status==='ACTIVE'&&b.status==='ACTIVE'&&moment({booking_date:day,...s})>new Date()&&!existing.some(e=>e.start_time.slice(0,5)<s.end_time&&e.end_time.slice(0,5)>s.start_time)}));
  const busySlots=existing.map(e=>({start_time:e.start_time.slice(0,5),end_time:e.end_time.slice(0,5)}));
  return {pt:await trainerView(req,p),date:day,slots:result,available_slots:result.filter(s=>s.is_available),busy_slots:busySlots,work_days:p.work_days};
}));
router.post('/pt-bookings',route(async req=>{
  role(req,'QTV','RECEPTIONIST','MEMBER');return transaction(async db=>{
    const r=await row(db,'registrations',req.body.registration_id,true);await registrationAccess(req,r);
    const p=await row(db,'pt_profiles',req.body.pt_id||r.assigned_pt_id,true),m=await row(db,'member_profiles',r.member_id,true);
    if(req.body.member_id&&req.body.member_id!==m.id)fail(400,'Member does not own registration');
    const branchId=req.body.branch_id||p.branch_id;if(isStaff(req))branch(req,branchId);await activeBranch(db,branchId);
    if(p.status!=='ACTIVE'||m.status!=='ACTIVE'||p.id!==r.assigned_pt_id||p.branch_id!==branchId)fail(409,'Active assigned PT at this branch is required');
    const day=date(req.body.booking_date);const start=String(req.body.start_time||'').slice(0,5);
    if(!/^\d{2}:\d{2}$/.test(start))fail(400,'Giờ bắt đầu không đúng định dạng (HH:mm)');
    const [sh, sm]=start.split(':').map(Number);
    if(sh<6||sh>22)fail(400,'Giờ tập nằm ngoài thời gian hoạt động của phòng tập (06:00 - 22:00)');
    const pkgDuration=(await db.query('SELECT session_duration_minutes FROM packages WHERE id=$1',[r.package_id])).rows[0]?.session_duration_minutes||60;
    const durationMinutes=Number(req.body.session_duration_minutes)||Number(r.session_duration_minutes)||pkgDuration;
    let end=req.body.end_time?String(req.body.end_time).slice(0,5):null;
    if(!end){
      const totalMinutes=sh*60+sm+durationMinutes;
      const eh=Math.floor(totalMinutes/60)%24,em=totalMinutes%60;
      end=`${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`;
    }
    if(end<=start)fail(400,'Giờ kết thúc phải sau giờ bắt đầu');
    const weekday=new Date(`${day}T12:00:00Z`).getUTCDay();if(p.work_days==='MON_TO_FRI'&&(weekday===0||weekday===6))fail(409,'HLV chỉ nhận lịch từ thứ Hai đến thứ Sáu');
    if(new Date(`${day}T${start}:00+07:00`)<=new Date())fail(409,'Không thể đặt lịch ở thời điểm trong quá khứ');
    if(effective(r)!=='ACTIVE'||r.start_date>day||(r.end_date&&r.end_date<day)||!r.total_pt_sessions_snapshot||r.remaining_pt_sessions<=0)fail(409,'Gói tập không còn số buổi hoặc đã hết hạn sử dụng');
    if((await db.query("SELECT 1 FROM package_freezes WHERE registration_id=$1 AND status='ACTIVE' AND start_date <= $2 AND end_date >= $2",[r.id,day])).rowCount)fail(409,'Gói tập đang trong thời gian đóng băng trong ngày được chọn');
    if(!(await db.query("SELECT 1 FROM payments WHERE registration_id=$1 AND (amount + COALESCE(discount_amount,0)) >= $2",[r.id,r.price_snapshot])).rowCount)fail(409,'Gói tập chưa hoàn tất thanh toán 100%');
    if(!(await db.query('SELECT 1 FROM registration_allowed_branches WHERE registration_id=$1 AND branch_id=$2',[r.id,branchId])).rowCount)fail(409,'Chi nhánh phục vụ không thuộc phạm vi áp dụng của gói tập (Branch not covered by entitlement)');
    if((await db.query("SELECT 1 FROM pt_bookings WHERE (pt_id=$1 OR member_id=$2) AND booking_date=$3 AND status<>'CANCELLED' AND start_time<$5::time AND end_time>$4::time",[p.id,m.id,day,start,end])).rowCount)fail(409,'HLV hoặc Hội viên đã có lịch tập khác trong khung giờ này');
    const sequence=Number((await db.query('SELECT COALESCE(MAX(session_number),0)+1 n FROM pt_bookings WHERE registration_id=$1',[r.id])).rows[0].n);
    const booking=(await db.query(`INSERT INTO pt_bookings(registration_id,member_id,pt_id,branch_id,booking_date,start_time,end_time,session_duration_minutes,session_number,workout_notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[r.id,m.id,p.id,branchId,day,start,end,durationMinutes,sequence,text(req.body.workout_notes||req.body.note,'workout_notes',2000,false),req.user.account_id])).rows[0];
    await db.query('UPDATE registrations SET booked_pt_sessions=booked_pt_sessions+1,remaining_pt_sessions=remaining_pt_sessions-1,updated_at=NOW() WHERE id=$1',[r.id]);
    await audit(db,req,'pt_bookings',booking.id,'BOOKING_CREATED',null,booking,branchId);
    await bookingEvent(db,booking,'BOOKING_CREATED');return booking;
  });
}));
async function bookingEvent(db,b,event) {
  const m=await row(db,'member_profiles',b.member_id),p=await row(db,'pt_profiles',b.pt_id),branch=await row(db,'branches',b.branch_id);
  const timeSlot=`${b.start_time.slice(0,5)} - ${b.end_time.slice(0,5)}`;
  const variables={
    member_name:m.full_name,
    ten_hoi_vien:m.full_name,
    pt_name:p.full_name,
    ten_pt:p.full_name,
    booking_date:b.booking_date,
    time_slot:timeSlot,
    gio_tap:timeSlot,
    branch_name:branch.branch_name,
    cancel_reason:b.cancel_reason||''
  };
  return emit(db,{event,branchId:b.branch_id,referenceId:b.id,referenceType:'PT_BOOKING',accounts:[m.account_id,p.account_id],variables});
}
router.post('/pt-bookings/:id/cancel',route(async req=>transaction(async db=>{
  role(req,'QTV','RECEPTIONIST','MEMBER');
  const initial=await row(db,'pt_bookings',req.params.id);canBooking(req,initial);
  await row(db,'registrations',initial.registration_id,true);const b=await row(db,'pt_bookings',initial.id,true);
  if(!openStatuses.includes(b.status))fail(409,'Only open bookings can be cancelled');
  if(req.user.active_role==='MEMBER'&&(b.status!=='BOOKED'||moment(b)<=new Date()))fail(409,'Chỉ được hủy lịch sắp diễn ra.');
  const late=req.user.active_role==='MEMBER'&&moment(b)-new Date()<4*3600000;
  if(late&&req.body.accept_late_fee!==true)fail(409,'Hủy dưới 4 tiếng sẽ trừ 1 buổi. Vui lòng xác nhận lại.','LATE_CANCELLATION_CONFIRMATION_REQUIRED');
  const reason=text(req.body.reason,'reason',req.user.active_role==='MEMBER'?150:255,req.user.active_role==='MEMBER');
  const updated=(await db.query("UPDATE pt_bookings SET status=$2,cancelled_by=$3,cancel_reason=$4,cancelled_at=NOW(),is_deducted=$5,updated_at=NOW() WHERE id=$1 RETURNING *",[b.id,'CANCELLED',req.user.active_role,reason,late])).rows[0];
  await db.query('UPDATE registrations SET booked_pt_sessions=GREATEST(0,booked_pt_sessions-$4),remaining_pt_sessions=remaining_pt_sessions+$2,used_pt_sessions=GREATEST(0,used_pt_sessions+$3),updated_at=NOW() WHERE id=$1',[b.registration_id,late?0:1,late?(b.is_deducted?0:1):(b.is_deducted?-1:0),b.is_deducted?0:1]);
  await audit(db,req,'pt_bookings',b.id,'BOOKING_CANCELLED',b,updated,b.branch_id,reason);await bookingEvent(db,updated,'BOOKING_CANCELLED');return {booking:updated,refunded:!late,message:late?'Late cancellation charged one session':'Booking cancelled'};
})));
async function confirmation(req,side) {
  if(side==='PT')role(req,'PT');else if(side==='MEMBER')role(req,'MEMBER');else role(req,'QTV','RECEPTIONIST');
  const allowed = side === 'PT' ? ['workout_notes','fitness_assessment'] : (side === null ? ['confirm_for','workout_notes','fitness_assessment'] : []);
  only(req.body, allowed);
  return transaction(async db=>{
    const initial=await row(db,'pt_bookings',req.params.id);canBooking(req,initial);await row(db,'registrations',initial.registration_id,true);
    const b=await row(db,'pt_bookings',initial.id,true);if(!openStatuses.includes(b.status))fail(409,'Booking is no longer open');
    if(moment(b,side!=='PT')>new Date())fail(409,side==='PT'?'Session has not started':'Session has not ended');
    
    let pt = b.pt_confirmed_at;
    let member = b.member_confirmed_at;

    if(side === 'PT') {
      if(b.pt_confirmed_at) fail(409,'Confirmation has already been recorded');
      pt = new Date();
    } else if(side === 'MEMBER') {
      if(b.member_confirmed_at) fail(409,'Confirmation has already been recorded');
      member = new Date();
    } else {
      const target = req.body.confirm_for;
      if(target) choice(target, ['PT', 'MEMBER', 'BOTH'], 'confirm_for');
      if(target === 'PT') {
        if(b.pt_confirmed_at) fail(409, 'PT đã xác nhận trước đó rồi');
        pt = new Date();
      } else if(target === 'MEMBER') {
        if(b.member_confirmed_at) fail(409, 'Học viên đã xác nhận trước đó rồi');
        member = new Date();
      } else if(target === 'BOTH') {
        if(b.pt_confirmed_at && b.member_confirmed_at) fail(409, 'Cả hai bên đã xác nhận hoàn thành');
        pt = b.pt_confirmed_at || new Date();
        member = b.member_confirmed_at || new Date();
      }
    }

    const complete=!!pt&&!!member;
    const newStatus = complete ? 'COMPLETED' : (pt || member ? 'PENDING_COMPLETION' : b.status);
    const updated=(await db.query('UPDATE pt_bookings SET pt_confirmed_at=$2,member_confirmed_at=$3,status=$4,is_deducted=$5,workout_notes=COALESCE($6,workout_notes),fitness_assessment=COALESCE($7,fitness_assessment),updated_at=NOW() WHERE id=$1 RETURNING *',[b.id,pt,member,newStatus,complete||b.is_deducted,text(req.body.workout_notes,'workout_notes',2000,false),text(req.body.fitness_assessment,'fitness_assessment',2000,false)])).rows[0];
    if(complete&&!b.is_deducted)await db.query('UPDATE registrations SET booked_pt_sessions=GREATEST(0,booked_pt_sessions-1),used_pt_sessions=used_pt_sessions+1,updated_at=NOW() WHERE id=$1',[b.registration_id]);
    await audit(db,req,'pt_bookings',b.id,side?'BOOKING_CONFIRMED':'BOOKING_RECONCILED',b,updated,b.branch_id);
    const m=await row(db,'member_profiles',b.member_id),p=await row(db,'pt_profiles',b.pt_id),branch=await row(db,'branches',b.branch_id);
    const timeSlot=`${updated.start_time.slice(0,5)} - ${updated.end_time.slice(0,5)}`;
    const variables={
      member_name:m.full_name,
      ten_hoi_vien:m.full_name,
      pt_name:p.full_name,
      ten_pt:p.full_name,
      booking_date:updated.booking_date,
      time_slot:timeSlot,
      gio_tap:timeSlot,
      branch_name:branch.branch_name
    };
    if(complete){
      await bookingEvent(db,updated,'PT_SESSION_CONFIRMED');
    }else if((side==='PT'||req.body.confirm_for==='PT') && !b.pt_confirmed_at){
      await emit(db,{
        event:'PT_SESSION_AWAITING_CONFIRMATION',
        branchId:b.branch_id,
        referenceId:updated.id,
        referenceType:'PT_BOOKING',
        accounts:[m.account_id],
        variables,
        title:'Xác nhận kết quả buổi tập PT',
        body:`HLV ${p.full_name} đã ghi nhận hoàn thành buổi tập ngày ${updated.booking_date} (${timeSlot}). Vui lòng vào app kiểm tra và bấm xác nhận kết quả.`
      });
    }else if((side==='MEMBER'||req.body.confirm_for==='MEMBER') && !b.member_confirmed_at){
      await emit(db,{
        event:'PT_SESSION_AWAITING_CONFIRMATION',
        branchId:b.branch_id,
        referenceId:updated.id,
        referenceType:'PT_BOOKING',
        accounts:[p.account_id],
        variables,
        title:'Học viên đã xác nhận ca tập',
        body:`Học viên ${m.full_name} đã xác nhận ca tập ngày ${updated.booking_date} (${timeSlot}).`
      });
    }
    return {booking:updated,is_completed:complete};
  });
}
router.post('/pt-bookings/:id/pt-confirm',route(req=>confirmation(req,'PT')));
router.post('/pt-bookings/:id/member-confirm',route(req=>confirmation(req,'MEMBER')));
router.post('/pt-bookings/:id/confirm',route(req=>confirmation(req,null)));
router.get('/pt-bookings/assignment-requests',route(async req=>{
  return (await pool.query(`SELECT a.*,m.full_name member_name,m.member_code,m.phone member_phone,p.full_name pt_name,r.package_name_snapshot,r.reg_code,r.sold_branch_id branch_id,b.branch_name FROM pt_assignment_requests a JOIN member_profiles m ON m.id=a.member_id JOIN pt_profiles p ON p.id=a.pt_id JOIN registrations r ON r.id=a.registration_id JOIN branches b ON b.id=r.sold_branch_id
    WHERE ($1 OR a.member_id=$2 OR a.pt_id=$3) AND ($4::uuid[] IS NULL OR r.sold_branch_id=ANY($4)) AND ($5::text IS NULL OR a.status=$5) ORDER BY a.requested_at DESC`,[isStaff(req),req.user.active_role==='MEMBER'?req.user.member_profile_id:null,req.user.active_role==='PT'?req.user.pt_profile_id:null,isStaff(req)?scope(req):null,req.query.status||null])).rows;
}));
router.post('/pt-bookings/assignment-request',route(async req=>{
  role(req,'MEMBER');return transaction(async db=>{
    const r=await row(db,'registrations',req.body.registration_id,true);await registrationAccess(req,r);
    if(r.assigned_pt_id||!r.total_pt_sessions_snapshot||!['ACTIVE','SCHEDULED'].includes(effective(r)))fail(409,'Registration cannot request assignment');
    if(!(await db.query("SELECT 1 FROM payments WHERE registration_id=$1",[r.id])).rowCount)fail(409,'Full payment required');
    const p=await row(db,'pt_profiles',req.body.pt_id,true);if(p.status!=='ACTIVE'||p.branch_id!==r.sold_branch_id)fail(409,'Select an active PT at registration branch');
    if((await db.query("SELECT 1 FROM pt_assignment_requests WHERE registration_id=$1 AND status='PENDING'",[r.id])).rowCount)fail(409,'An assignment request is already pending');
    const a=(await db.query('INSERT INTO pt_assignment_requests(registration_id,member_id,pt_id,request_note) VALUES($1,$2,$3,$4) RETURNING *',[r.id,r.member_id,p.id,text(req.body.request_note,'request_note',255,false)])).rows[0];
    const m=await row(db,'member_profiles',r.member_id),b=await row(db,'branches',r.sold_branch_id);
    const variables={
      member_name:m.full_name,
      ten_hoi_vien:m.full_name,
      pt_name:p.full_name,
      ten_pt:p.full_name,
      package_name:r.package_name_snapshot,
      ten_goi:r.package_name_snapshot,
      branch_name:b.branch_name
    };
    await emit(db,{
      event:'PT_ASSIGNMENT_REQUEST',
      branchId:r.sold_branch_id,
      referenceId:a.id,
      referenceType:'PT_ASSIGNMENT',
      accounts:[p.account_id],
      variables,
      title:'Yêu cầu phân công học viên mới',
      body:`Học viên ${m.full_name} đã gửi yêu cầu chọn bạn làm HLV phụ trách gói ${r.package_name_snapshot}.`
    });
    await emit(db,{
      event:'PT_ASSIGNMENT_REQUEST',
      branchId:r.sold_branch_id,
      referenceId:a.id,
      referenceType:'PT_ASSIGNMENT',
      accounts:[m.account_id],
      variables,
      title:'Đã gửi yêu cầu ghép HLV',
      body:`Yêu cầu chọn HLV ${p.full_name} cho gói ${r.package_name_snapshot} đã được gửi thành công. Vui lòng chờ HLV phản hồi.`
    });
    return a;
  });
}));
router.post('/pt-bookings/assignment-request/:id/respond',route(async req=>{
  role(req,'PT');return transaction(async db=>{
    const initial=await row(db,'pt_assignment_requests',req.params.id);
    if(initial.pt_id!==req.user.pt_profile_id)fail(403,'Request belongs to another PT');
    const r=await row(db,'registrations',initial.registration_id,true),a=await row(db,'pt_assignment_requests',initial.id,true),p=await row(db,'pt_profiles',a.pt_id,true);
    if(a.status!=='PENDING'||r.assigned_pt_id)fail(409,'Request is no longer pending');
    const status=choice(req.body.status,['ACCEPTED','REJECTED'],'status');
    if(status==='ACCEPTED'){
      if(p.status!=='ACTIVE'||p.branch_id!==r.sold_branch_id||!['ACTIVE','SCHEDULED'].includes(effective(r)))fail(409,'Trainer is not eligible');
      await activeBranch(db,r.sold_branch_id);
      await db.query('UPDATE registrations SET assigned_pt_id=$2,updated_at=NOW() WHERE id=$1',[r.id,p.id]);
      await db.query("UPDATE pt_assignment_requests SET status='REJECTED',responded_at=NOW() WHERE registration_id=$1 AND id<>$2 AND status='PENDING'",[r.id,a.id]);
    }
    const saved=(await db.query('UPDATE pt_assignment_requests SET status=$2,response_note=$3,responded_at=NOW() WHERE id=$1 RETURNING *',[a.id,status,text(req.body.response_note,'response_note',255,false)])).rows[0];
    await audit(db,req,'pt_assignment_requests',a.id,'PT_REQUEST_RESPONDED',a,saved,r.sold_branch_id);
    const m=await row(db,'member_profiles',a.member_id),b=await row(db,'branches',r.sold_branch_id);
    const variables={
      member_name:m.full_name,
      ten_hoi_vien:m.full_name,
      pt_name:p.full_name,
      ten_pt:p.full_name,
      package_name:r.package_name_snapshot,
      ten_goi:r.package_name_snapshot,
      branch_name:b.branch_name,
      cancel_reason:saved.response_note||'HLV kín lịch'
    };
    if(status==='ACCEPTED'){
      await emit(db,{
        event:'PT_REQUEST_ACCEPTED',
        branchId:r.sold_branch_id,
        referenceId:r.id,
        referenceType:'REGISTRATION',
        accounts:[m.account_id,p.account_id],
        variables,
        title:'HLV đã tiếp nhận yêu cầu',
        body:`HLV ${p.full_name} đã đồng ý tiếp nhận bạn làm học viên cho gói ${r.package_name_snapshot}.`
      });
    }else{
      await emit(db,{
        event:'PT_REQUEST_REJECTED',
        branchId:r.sold_branch_id,
        referenceId:a.id,
        referenceType:'PT_ASSIGNMENT',
        accounts:[m.account_id],
        variables,
        title:'Yêu cầu ghép HLV không thành công',
        body:`HLV ${p.full_name} không thể tiếp nhận gói ${r.package_name_snapshot}. Lý do: ${saved.response_note||'HLV kín lịch'}.`
      });
    }
    return saved;
  });
}));
module.exports={router,bookingList,canBooking,slots};

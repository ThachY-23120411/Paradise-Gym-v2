const {transaction}=require('../../db/postgres');
const {emit}=require('./notifications');

async function runScheduledNotifications(now=new Date()) {
  return transaction(async db=>{
    const locked=(await db.query("SELECT pg_try_advisory_xact_lock(hashtext('scheduled-notifications')) locked")).rows[0].locked;
    if(!locked)return {sent:0,skipped:true};
    // Tự động kích hoạt các đơn đăng ký SCHEDULED thành ACTIVE khi đến ngày bắt đầu
    await db.query(`UPDATE registrations SET status='ACTIVE', updated_at=NOW() WHERE status='SCHEDULED' AND start_date <= ($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`, [now]);
    // Tự động hết hạn các đơn đăng ký đã qua ngày kết thúc
    await db.query(`UPDATE registrations SET status='EXPIRED', updated_at=NOW() WHERE status IN ('ACTIVE', 'SCHEDULED') AND end_date IS NOT NULL AND end_date < ($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`, [now]);
    let sent=0;
    const bookings=(await db.query(`SELECT bk.*,m.account_id member_account,m.full_name member_name,p.account_id pt_account,p.full_name pt_name,b.branch_name,
      EXTRACT(EPOCH FROM ((bk.booking_date+bk.start_time) AT TIME ZONE b.timezone-$1::timestamptz))/3600 hours_left
      FROM pt_bookings bk JOIN member_profiles m ON m.id=bk.member_id JOIN pt_profiles p ON p.id=bk.pt_id JOIN branches b ON b.id=bk.branch_id
      WHERE bk.status='BOOKED' AND ((bk.booking_date+bk.start_time) AT TIME ZONE b.timezone)>$1
      AND ((bk.booking_date+bk.start_time) AT TIME ZONE b.timezone)<=$1::timestamptz+interval '24 hours'
      AND EXISTS(SELECT 1 FROM notification_rules nr WHERE nr.branch_id=bk.branch_id AND nr.event_type='BOOKING_REMINDER' AND nr.is_enabled)`,[now])).rows;
    for(const b of bookings){
      const hours=Number(b.hours_left),memberWindow=hours>=23&&hours<=24?'24H':hours>=1&&hours<=2?'2H':null,ptWindow=hours>=0.25&&hours<=0.5?'30MIN':null;
      const variables={member_name:b.member_name,pt_name:b.pt_name,booking_date:b.booking_date,time_slot:`${b.start_time.slice(0,5)}-${b.end_time.slice(0,5)}`,branch_name:b.branch_name};
      if(memberWindow)sent+=await emit(db,{event:'BOOKING_REMINDER',branchId:b.branch_id,referenceId:b.id,referenceType:'PT_BOOKING',accounts:[b.member_account],audienceRoles:['MEMBER'],personal:true,key:`BOOKING_REMINDER:${b.id}:MEMBER:${memberWindow}`,variables});
      if(ptWindow)sent+=await emit(db,{event:'BOOKING_REMINDER',branchId:b.branch_id,referenceId:b.id,referenceType:'PT_BOOKING',accounts:[b.pt_account],audienceRoles:['PT'],personal:true,key:`BOOKING_REMINDER:${b.id}:PT:${ptWindow}`,variables});
    }
    const registrations=(await db.query(`SELECT r.*,m.account_id,m.full_name member_name,r.end_date-($1::timestamptz AT TIME ZONE b.timezone)::date days_left
      FROM registrations r JOIN member_profiles m ON m.id=r.member_id JOIN branches b ON b.id=r.sold_branch_id
      WHERE r.status IN ('ACTIVE','SCHEDULED') AND r.end_date-($1::timestamptz AT TIME ZONE b.timezone)::date IN (7,3,0)
      AND EXISTS(SELECT 1 FROM payments p WHERE p.registration_id=r.id AND p.status='COMPLETED')
      AND EXISTS(SELECT 1 FROM notification_rules nr WHERE nr.branch_id=r.sold_branch_id AND nr.event_type='PACKAGE_EXPIRING' AND nr.is_enabled)`,[now])).rows;
    for(const r of registrations)sent+=await emit(db,{event:'PACKAGE_EXPIRING',branchId:r.sold_branch_id,referenceId:r.id,referenceType:'REGISTRATION',accounts:[r.account_id],audienceRoles:['MEMBER'],personal:true,key:`PACKAGE_EXPIRING:${r.id}:${r.end_date}:${r.days_left}`,variables:{member_name:r.member_name,package_name:r.package_name_snapshot,expiry_date:r.end_date,days_left:r.days_left}});
    const birthdays=(await db.query(`SELECT m.id,m.account_id,m.full_name,m.home_branch_id,b.branch_name,($1::timestamptz AT TIME ZONE b.timezone)::date birthday_date
      FROM member_profiles m JOIN branches b ON b.id=m.home_branch_id
      WHERE m.status='ACTIVE' AND b.status='ACTIVE' AND m.date_of_birth IS NOT NULL
      AND to_char(m.date_of_birth,'MM-DD')=to_char($1::timestamptz AT TIME ZONE b.timezone,'MM-DD')
      AND EXISTS(SELECT 1 FROM notification_rules nr WHERE nr.branch_id=m.home_branch_id AND nr.event_type='MEMBER_BIRTHDAY' AND nr.is_enabled)`,[now])).rows;
    for(const m of birthdays)sent+=await emit(db,{event:'MEMBER_BIRTHDAY',branchId:m.home_branch_id,referenceId:m.id,referenceType:'MEMBER',accounts:[m.account_id],audienceRoles:['MEMBER'],personal:true,key:`MEMBER_BIRTHDAY:${m.id}:${m.birthday_date}`,variables:{member_name:m.full_name,birthday_date:m.birthday_date,branch_name:m.branch_name}});
    return {sent,skipped:false};
  });
}
function startNotificationScheduler(){
  if(process.env.NOTIFICATION_SCHEDULER_ENABLED==='false')return;
  let running=false;
  const tick=async()=>{if(running)return;running=true;try{await runScheduledNotifications();}catch(error){console.error('[notification scheduler]',error.message);}finally{running=false;}};
  const timer=setInterval(tick,60000);timer.unref();
  return ()=>clearInterval(timer);
}
module.exports={runScheduledNotifications,startNotificationScheduler};

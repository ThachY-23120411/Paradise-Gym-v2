const {today}=require('./http');

function effective(r,day=today()) {
  if (!['ACTIVE','SCHEDULED','EXPIRED'].includes(r.status)) return r.status;
  if (r.is_frozen) return 'FROZEN';
  return r.end_date&&r.end_date<day?'EXPIRED':r.start_date>day?'SCHEDULED':'ACTIVE';
}

function isExpiring(r,day=today()) {
  if (!r || effective(r,day)!=='ACTIVE' || r.is_paid===false) return false;
  const days=r.end_date?Math.floor((Date.parse(r.end_date)-Date.parse(day))/86400000):null;
  const time=days!==null&&days>=0&&days<=4;
  const low=value=>value!==null&&value!==undefined&&Number(value)>=0&&Number(value)<=3;
  switch(r.package_type_snapshot) {
    case 'GYM_TIME': return time;
    case 'GYM_SESSION': return low(r.remaining_gym_sessions);
    case 'PT_SESSION': return low(r.remaining_pt_sessions);
    case 'COMBO': return time||low(r.remaining_pt_sessions)||(Number(r.total_gym_sessions_snapshot)>0&&low(r.remaining_gym_sessions));
    default: return false;
  }
}

function registrationState(r,day=today()) {
  const status=effective(r,day),is_expiring=isExpiring(r,day);
  return {...r,status,is_expiring,display_status:is_expiring?'EXPIRING':status};
}

async function listExpiring(db,branchIds,day=today()) {
  const rows=(await db.query(`SELECT r.*,m.member_code,m.full_name member_name,m.phone member_phone,m.avatar_url,
    b.branch_name,pt.full_name pt_name,
    EXISTS(SELECT 1 FROM payments p WHERE p.registration_id=r.id) is_paid
    FROM registrations r JOIN member_profiles m ON m.id=r.member_id JOIN branches b ON b.id=r.sold_branch_id
    LEFT JOIN pt_profiles pt ON pt.id=r.assigned_pt_id
    WHERE ($1::uuid[] IS NULL OR r.sold_branch_id=ANY($1))
    ORDER BY r.end_date NULLS LAST,r.id`,[branchIds])).rows;
  return rows.map(r=>({...registrationState(r,day),days_left:r.end_date?Math.floor((Date.parse(r.end_date)-Date.parse(day))/86400000):null})).filter(r=>r.is_expiring);
}

module.exports={effective,isExpiring,registrationState,listExpiring};

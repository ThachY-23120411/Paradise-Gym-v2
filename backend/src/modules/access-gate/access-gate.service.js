const { store, uuid } = require('../../config/db');

function checkIn({ member_id, phone, member_code, branch_id, direction = 'IN', access_method = 'FACE_ID', device_id, manual_recorded_by, manual_reason }) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTimeStr = now.toTimeString().split(' ')[0];

  // 1. Resolve Member
  let member = null;
  if (member_id) {
    member = store.member_profiles.find(m => m.id === member_id);
  } else if (phone) {
    member = store.member_profiles.find(m => m.phone === phone);
  } else if (member_code) {
    member = store.member_profiles.find(m => m.member_code.toLowerCase() === member_code.toLowerCase());
  }

  const logId = uuid();

  if (!member) {
    const deniedLog = {
      id: logId,
      member_id: null,
      registration_id: null,
      device_id: device_id || null,
      branch_id,
      direction,
      access_method,
      status: 'DENIED',
      denial_reason: 'Không tìm thấy thông tin hội viên trên hệ thống',
      is_duplicate_warning: false,
      is_gym_session_deducted: false,
      manual_recorded_by: manual_recorded_by || null,
      manual_reason: manual_reason || null,
      check_in_time: now
    };
    store.access_logs.push(deniedLog);
    return { allowed: false, log: deniedLog, reason: deniedLog.denial_reason };
  }

  // Check Condition 1: Member Profile Status
  if (member.status !== 'ACTIVE') {
    const log = createDenialLog(logId, member.id, null, device_id, branch_id, direction, access_method, 'Hồ sơ hội viên đang bị khóa hoặc ngừng hoạt động', manual_recorded_by, manual_reason, now);
    return { allowed: false, log, reason: log.denial_reason };
  }

  // Check Branch & Condition 6: Branch Operating Hours
  const branch = store.branches.find(b => b.id === branch_id);
  if (branch && process.env.NODE_ENV !== 'test') {
    if (currentTimeStr < branch.open_time || currentTimeStr > branch.close_time) {
      const log = createDenialLog(logId, member.id, null, device_id, branch_id, direction, access_method, `Ngoài giờ mở cửa của phòng gym (${branch.open_time} - ${branch.close_time})`, manual_recorded_by, manual_reason, now);
      return { allowed: false, log, reason: log.denial_reason };
    }
  }

  // Check Anti-duplicate (60 seconds)
  const lastLog = store.access_logs
    .filter(l => l.member_id === member.id && l.direction === direction)
    .sort((a, b) => new Date(b.check_in_time) - new Date(a.check_in_time))[0];

  let isDuplicateWarning = false;
  if (lastLog) {
    const diffSeconds = (now.getTime() - new Date(lastLog.check_in_time).getTime()) / 1000;
    if (diffSeconds < 60) {
      isDuplicateWarning = true;
    }
  }

  // Find Active Registration for this member
  const validRegistrations = store.registrations.filter(r => 
    r.member_id === member.id && 
    r.status === 'ACTIVE' &&
    r.start_date <= todayStr && 
    r.end_date >= todayStr
  );

  if (validRegistrations.length === 0) {
    const log = createDenialLog(logId, member.id, null, device_id, branch_id, direction, access_method, 'Hội viên không có gói tập nào đang hoạt động hoặc gói đã hết hạn', manual_recorded_by, manual_reason, now);
    return { allowed: false, log, reason: log.denial_reason };
  }

  // Check Condition 4: Branch Scope
  let matchingReg = null;
  for (const reg of validRegistrations) {
    const allowedBranches = store.registration_allowed_branches.filter(rab => rab.registration_id === reg.id).map(rab => rab.branch_id);
    if (allowedBranches.includes(branch_id)) {
      matchingReg = reg;
      break;
    }
  }

  if (!matchingReg) {
    const log = createDenialLog(logId, member.id, null, device_id, branch_id, direction, access_method, 'Gói tập của hội viên không được phép sử dụng tại chi nhánh này', manual_recorded_by, manual_reason, now);
    return { allowed: false, log, reason: log.denial_reason };
  }

  // Check Condition 5: Session Balance for session-based packages
  const isSessionPkg = matchingReg.package_type_snapshot === 'GYM_SESSION' || matchingReg.package_type_snapshot === 'COMBO';
  if (isSessionPkg && (!matchingReg.remaining_gym_sessions || matchingReg.remaining_gym_sessions <= 0)) {
    const log = createDenialLog(logId, member.id, matchingReg.id, device_id, branch_id, direction, access_method, 'Gói tập theo buổi đã hết số lượt tập Gym khả dụng', manual_recorded_by, manual_reason, now);
    return { allowed: false, log, reason: log.denial_reason };
  }

  // Determine if gym session should be deducted
  let isGymSessionDeducted = false;
  if (direction === 'IN' && !isDuplicateWarning && isSessionPkg) {
    // Check if already deducted today
    const alreadyDeductedToday = store.access_logs.some(l => 
      l.member_id === member.id && 
      l.registration_id === matchingReg.id && 
      l.is_gym_session_deducted === true &&
      new Date(l.check_in_time).toISOString().split('T')[0] === todayStr
    );

    if (!alreadyDeductedToday) {
      isGymSessionDeducted = true;
      matchingReg.remaining_gym_sessions -= 1;
      matchingReg.updated_at = now;
    }
  }

  const successLog = {
    id: logId,
    member_id: member.id,
    registration_id: matchingReg.id,
    device_id: device_id || null,
    branch_id,
    direction,
    access_method,
    status: 'ALLOWED',
    denial_reason: null,
    is_duplicate_warning: isDuplicateWarning,
    is_gym_session_deducted: isGymSessionDeducted,
    manual_recorded_by: manual_recorded_by || null,
    manual_reason: manual_reason || null,
    check_in_time: now
  };

  store.access_logs.push(successLog);

  return {
    allowed: true,
    log: successLog,
    member_name: member.full_name,
    package_name: matchingReg.package_name_snapshot,
    remaining_gym_sessions: matchingReg.remaining_gym_sessions,
    is_duplicate_warning: isDuplicateWarning,
    message: isDuplicateWarning 
      ? 'Cảnh báo quét lặp trong 60 giây (Mở cổng nhưng không trừ thêm lượt)'
      : 'Xác thực thành công. Mở cổng hợp lệ!'
  };
}

function createDenialLog(id, member_id, reg_id, device_id, branch_id, direction, access_method, reason, manual_recorded_by, manual_reason, time) {
  const log = {
    id,
    member_id,
    registration_id: reg_id || null,
    device_id: device_id || null,
    branch_id,
    direction,
    access_method,
    status: 'DENIED',
    denial_reason: reason,
    is_duplicate_warning: false,
    is_gym_session_deducted: false,
    manual_recorded_by: manual_recorded_by || null,
    manual_reason: manual_reason || null,
    check_in_time: time
  };
  store.access_logs.push(log);
  return log;
}

function getTodayLogs({ branch_id, direction, status }) {
  const todayStr = new Date().toISOString().split('T')[0];
  let list = store.access_logs.filter(l => new Date(l.check_in_time).toISOString().split('T')[0] === todayStr);

  if (branch_id) list = list.filter(l => l.branch_id === branch_id);
  if (direction) list = list.filter(l => l.direction === direction);
  if (status) list = list.filter(l => l.status === status);

  return list.sort((a, b) => new Date(b.check_in_time) - new Date(a.check_in_time)).map(l => {
    const member = store.member_profiles.find(m => m.id === l.member_id);
    const reg = store.registrations.find(r => r.id === l.registration_id);
    const branch = store.branches.find(b => b.id === l.branch_id);
    return {
      ...l,
      member_name: member?.full_name || 'Khách vãng lai',
      member_code: member?.member_code || '',
      member_phone: member?.phone || '',
      package_name: reg?.package_name_snapshot || '',
      branch_name: branch?.branch_name || ''
    };
  });
}

module.exports = {
  checkIn,
  getTodayLogs
};

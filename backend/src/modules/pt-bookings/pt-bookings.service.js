const { store, uuid } = require('../../config/db');

const STANDARD_SLOTS = [
  { start_time: '08:00:00', end_time: '10:00:00' },
  { start_time: '10:00:00', end_time: '12:00:00' },
  { start_time: '14:00:00', end_time: '16:00:00' },
  { start_time: '16:00:00', end_time: '18:00:00' }
];

function getAvailableSlots(pt_id, dateStr) {
  const pt = store.pt_profiles.find(p => p.id === pt_id);
  if (!pt) return { error: 'Không tìm thấy huấn luyện viên', status: 404 };

  const targetDate = new Date(dateStr);
  const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 6 = Saturday

  // Check working days (Monday = 1 to Friday = 5)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { available_slots: [], message: 'HLV chỉ làm việc từ Thứ 2 đến Thứ 6 cố định (08:00 - 18:00)' };
  }

  // Find bookings on that date
  const existingBookings = store.pt_bookings.filter(b => 
    b.pt_id === pt_id && 
    b.booking_date === dateStr && 
    (b.status === 'BOOKED' || b.status === 'PENDING_COMPLETION')
  );

  const bookedStarts = existingBookings.map(b => b.start_time);

  const availableSlots = STANDARD_SLOTS.map(slot => ({
    ...slot,
    is_available: !bookedStarts.includes(slot.start_time)
  }));

  return { pt, date: dateStr, slots: availableSlots };
}

function createBooking({ registration_id, member_id, pt_id, branch_id, booking_date, start_time, end_time, created_by }) {
  const reg = store.registrations.find(r => r.id === registration_id);
  if (!reg) return { error: 'Không tìm thấy gói tập đăng ký', status: 404 };

  if (reg.status !== 'ACTIVE') {
    return { error: 'Gói tập chưa được kích hoạt hoặc đã hết hạn', status: 400 };
  }

  if (!reg.remaining_pt_sessions || reg.remaining_pt_sessions <= 0) {
    return { error: 'Gói tập đã hết số buổi PT khả dụng để đặt lịch', status: 400 };
  }

  // Check collision
  const collision = store.pt_bookings.find(b => 
    b.pt_id === pt_id && 
    b.booking_date === booking_date && 
    b.start_time === start_time &&
    (b.status === 'BOOKED' || b.status === 'PENDING_COMPLETION')
  );

  if (collision) {
    return { error: 'Khung giờ này HLV đã có lịch dạy với học viên khác', status: 409 };
  }

  const booking = {
    id: uuid(),
    registration_id,
    member_id,
    pt_id,
    branch_id: branch_id || reg.sold_branch_id,
    booking_date,
    start_time,
    end_time: end_time || (start_time.startsWith('08') ? '10:00:00' : '12:00:00'),
    status: 'BOOKED',
    cancelled_by: null,
    cancel_reason: null,
    cancelled_at: null,
    pt_confirmed_at: null,
    member_confirmed_at: null,
    is_deducted: false,
    created_by: created_by || null,
    created_at: new Date(),
    updated_at: new Date()
  };

  store.pt_bookings.push(booking);

  // Reserve session: hold in booked_pt_sessions
  reg.remaining_pt_sessions -= 1;
  reg.booked_pt_sessions += 1;
  reg.updated_at = new Date();

  return { booking };
}

function cancelBooking(booking_id, cancelled_by, cancel_reason) {
  const booking = store.pt_bookings.find(b => b.id === booking_id);
  if (!booking) return { error: 'Không tìm thấy lịch tập', status: 404 };

  if (booking.status !== 'BOOKED') {
    return { error: `Không thể hủy lịch ở trạng thái ${booking.status}`, status: 400 };
  }

  const now = new Date();
  const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
  const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  const reg = store.registrations.find(r => r.id === booking.registration_id);

  booking.cancelled_by = cancelled_by;
  booking.cancel_reason = cancel_reason || 'Hội viên/HLV yêu cầu hủy';
  booking.cancelled_at = now;
  booking.status = 'CANCELLED';

  if (hoursUntilBooking >= 12) {
    // Cancelled in advance (>= 12 hours) -> refund session
    booking.is_deducted = false;
    if (reg) {
      reg.booked_pt_sessions -= 1;
      reg.remaining_pt_sessions += 1;
      reg.updated_at = now;
    }
  } else {
    // Late cancellation (< 12 hours) -> penalize session
    booking.is_deducted = true;
    if (reg) {
      reg.booked_pt_sessions -= 1;
      reg.used_pt_sessions += 1;
      reg.updated_at = now;
    }
  }

  return {
    booking,
    is_penalized: booking.is_deducted,
    message: booking.is_deducted 
      ? 'Hủy muộn dưới 12h: Buổi tập bị khấu trừ theo quy định phòng gym'
      : 'Hủy trước 12h: Slot đã giải phóng và buổi tập được hoàn lại vào gói'
  };
}

function ptConfirmCompletion(booking_id) {
  const booking = store.pt_bookings.find(b => b.id === booking_id);
  if (!booking) return { error: 'Không tìm thấy lịch tập', status: 404 };

  if (booking.status === 'CANCELLED') {
    return { error: 'Không thể xác nhận buổi tập đã hủy', status: 400 };
  }

  const now = new Date();
  booking.pt_confirmed_at = now;

  // Check two-way confirmation
  if (booking.member_confirmed_at) {
    booking.status = 'COMPLETED';
    booking.is_deducted = true;
    const reg = store.registrations.find(r => r.id === booking.registration_id);
    if (reg) {
      reg.booked_pt_sessions -= 1;
      reg.used_pt_sessions += 1;
      reg.updated_at = now;
    }
  } else {
    booking.status = 'PENDING_COMPLETION';
  }

  booking.updated_at = now;
  return {
    booking,
    completed: booking.status === 'COMPLETED',
    message: booking.status === 'COMPLETED'
      ? 'Cả PT và Hội viên đã xác nhận. Buổi tập chính thức hoàn thành và khấu trừ 1 buổi.'
      : 'PT đã xác nhận. Đang chờ Hội viên bấm xác nhận đối ứng trên Mobile.'
  };
}

function memberConfirmCompletion(booking_id) {
  const booking = store.pt_bookings.find(b => b.id === booking_id);
  if (!booking) return { error: 'Không tìm thấy lịch tập', status: 404 };

  if (booking.status === 'CANCELLED') {
    return { error: 'Không thể xác nhận buổi tập đã hủy', status: 400 };
  }

  const now = new Date();
  booking.member_confirmed_at = now;

  // Check two-way confirmation
  if (booking.pt_confirmed_at) {
    booking.status = 'COMPLETED';
    booking.is_deducted = true;
    const reg = store.registrations.find(r => r.id === booking.registration_id);
    if (reg) {
      reg.booked_pt_sessions -= 1;
      reg.used_pt_sessions += 1;
      reg.updated_at = now;
    }
  } else {
    booking.status = 'PENDING_COMPLETION';
  }

  booking.updated_at = now;
  return {
    booking,
    completed: booking.status === 'COMPLETED',
    message: booking.status === 'COMPLETED'
      ? 'Cả PT và Hội viên đã xác nhận. Buổi tập chính thức hoàn thành và khấu trừ 1 buổi.'
      : 'Hội viên đã xác nhận đối ứng. Đang chờ HLV bấm xác nhận hoàn thành.'
  };
}

function listBookings({ pt_id, member_id, branch_id, date, status }) {
  let list = store.pt_bookings;
  if (pt_id) list = list.filter(b => b.pt_id === pt_id);
  if (member_id) list = list.filter(b => b.member_id === member_id);
  if (branch_id) list = list.filter(b => b.branch_id === branch_id);
  if (date) list = list.filter(b => b.booking_date === date);
  if (status) list = list.filter(b => b.status === status);

  return list.map(b => {
    const pt = store.pt_profiles.find(p => p.id === b.pt_id);
    const member = store.member_profiles.find(m => m.id === b.member_id);
    const branch = store.branches.find(br => br.id === b.branch_id);
    const reg = store.registrations.find(r => r.id === b.registration_id);
    return {
      ...b,
      pt_name: pt?.full_name || '',
      member_name: member?.full_name || '',
      member_code: member?.member_code || '',
      member_phone: member?.phone || '',
      package_name: reg?.package_name_snapshot || '',
      branch_name: branch?.branch_name || '',
      pt_confirmed: !!b.pt_confirmed_at,
      member_confirmed: !!b.member_confirmed_at
    };
  });
}

function createAssignmentRequest({ registration_id, member_id, pt_id, request_note }) {
  const reg = store.registrations.find(r => r.id === registration_id);
  if (!reg) return { error: 'Không tìm thấy gói đăng ký', status: 404 };

  const request = {
    id: uuid(),
    registration_id,
    member_id,
    pt_id,
    status: 'PENDING',
    request_note: request_note || null,
    response_note: null,
    requested_at: new Date(),
    responded_at: null
  };

  store.pt_assignment_requests.push(request);
  return { request };
}

function respondAssignmentRequest(request_id, status, response_note) {
  const req = store.pt_assignment_requests.find(r => r.id === request_id);
  if (!req) return { error: 'Không tìm thấy yêu cầu phân công PT', status: 404 };

  req.status = status; // ACCEPTED or REJECTED
  req.response_note = response_note || null;
  req.responded_at = new Date();

  if (status === 'ACCEPTED') {
    const reg = store.registrations.find(r => r.id === req.registration_id);
    if (reg) {
      reg.assigned_pt_id = req.pt_id;
      reg.updated_at = new Date();
    }
  }

  return { request: req };
}

function listAssignmentRequests({ pt_id, member_id, status } = {}) {
  let list = store.pt_assignment_requests || [];
  if (pt_id) list = list.filter(r => r.pt_id === pt_id);
  if (member_id) list = list.filter(r => r.member_id === member_id);
  if (status) list = list.filter(r => r.status === status);

  return list.map(r => {
    const member = store.member_profiles.find(m => m.id === r.member_id);
    const reg = store.registrations.find(reg => reg.id === r.registration_id);
    const pt = store.pt_profiles.find(p => p.id === r.pt_id);
    return {
      ...r,
      member_name: member?.full_name || '',
      member_code: member?.member_code || '',
      member_phone: member?.phone || '',
      package_name: reg?.package_name_snapshot || '',
      pt_name: pt?.full_name || ''
    };
  });
}

function listTrainers({ branch_id, status } = {}) {
  let list = store.pt_profiles;
  if (branch_id && branch_id !== 'ALL') {
    list = list.filter(p => p.branch_id === branch_id);
  }
  if (status) {
    list = list.filter(p => p.status === status);
  }
  return list.map(p => {
    const branch = store.branches.find(b => b.id === p.branch_id);
    return {
      ...p,
      branch_name: branch?.branch_name || ''
    };
  });
}

module.exports = {
  getAvailableSlots,
  createBooking,
  cancelBooking,
  ptConfirmCompletion,
  memberConfirmCompletion,
  listBookings,
  listTrainers,
  createAssignmentRequest,
  respondAssignmentRequest,
  listAssignmentRequests
};


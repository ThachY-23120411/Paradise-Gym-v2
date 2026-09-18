const ptService = require('./pt-bookings.service');
const { success, error } = require('../../utils/response');

function getSlots(req, res) {
  const { pt_id, date } = req.query;
  if (!pt_id || !date) return error(res, 'pt_id và date là bắt buộc', 400);

  const result = ptService.getAvailableSlots(pt_id, date);
  if (result.error) return error(res, result.error, result.status);
  return success(res, result, 'Lấy danh sách slot khả dụng thành công');
}

function createBooking(req, res) {
  const { registration_id, member_id, pt_id, branch_id, booking_date, start_time, end_time } = req.body;
  if (!registration_id || !member_id || !pt_id || !booking_date || !start_time) {
    return error(res, 'Vui lòng cung cấp đầy đủ thông tin đặt lịch PT', 400);
  }

  const result = ptService.createBooking({
    registration_id,
    member_id,
    pt_id,
    branch_id,
    booking_date,
    start_time,
    end_time,
    created_by: req.user?.account_id
  });

  if (result.error) return error(res, result.error, result.status);
  return success(res, result.booking, 'Đặt lịch PT thành công', 201);
}

function cancelBooking(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  const result = ptService.cancelBooking(id, req.user?.roles?.[0] || 'MEMBER', reason);
  if (result.error) return error(res, result.error, result.status);
  return success(res, result, result.message);
}

function ptConfirm(req, res) {
  const { id } = req.params;
  const result = ptService.ptConfirmCompletion(id);
  if (result.error) return error(res, result.error, result.status);
  return success(res, result, result.message);
}

function memberConfirm(req, res) {
  const { id } = req.params;
  const result = ptService.memberConfirmCompletion(id);
  if (result.error) return error(res, result.error, result.status);
  return success(res, result, result.message);
}

function listBookings(req, res) {
  const { pt_id, member_id, branch_id, date, status } = req.query;
  const list = ptService.listBookings({ pt_id, member_id, branch_id, date, status });
  return success(res, list, 'Lấy danh sách lịch tập PT thành công');
}

function listTrainers(req, res) {
  const { branch_id, status } = req.query;
  const list = ptService.listTrainers({ branch_id, status });
  return success(res, list, 'Lấy danh sách huấn luyện viên thành công');
}

function requestAssignment(req, res) {
  const { registration_id, member_id, pt_id, request_note } = req.body;
  if (!registration_id || !member_id || !pt_id) {
    return error(res, 'registration_id, member_id và pt_id là bắt buộc', 400);
  }

  const result = ptService.createAssignmentRequest({ registration_id, member_id, pt_id, request_note });
  if (result.error) return error(res, result.error, result.status);
  return success(res, result.request, 'Gửi yêu cầu chọn HLV cá nhân thành công', 201);
}

function respondAssignment(req, res) {
  const { id } = req.params;
  const { status, response_note } = req.body;
  if (!status || !['ACCEPTED', 'REJECTED'].includes(status)) {
    return error(res, 'status phải là ACCEPTED hoặc REJECTED', 400);
  }

  const result = ptService.respondAssignmentRequest(id, status, response_note);
  if (result.error) return error(res, result.error, result.status);
  return success(res, result.request, 'Phản hồi yêu cầu phân công PT thành công');
}

function listAssignmentRequests(req, res) {
  const { pt_id, member_id, status } = req.query;
  const list = ptService.listAssignmentRequests({ pt_id, member_id, status });
  return success(res, list, 'Lấy danh sách yêu cầu phân công PT thành công');
}

module.exports = {
  getSlots,
  createBooking,
  cancelBooking,
  ptConfirm,
  memberConfirm,
  listBookings,
  listTrainers,
  requestAssignment,
  respondAssignment,
  listAssignmentRequests
};


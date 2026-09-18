const accessGateService = require('./access-gate.service');
const { success, error } = require('../../utils/response');

function checkIn(req, res) {
  const { member_id, phone, member_code, branch_id, direction, access_method, device_id } = req.body;
  if (!branch_id || (!member_id && !phone && !member_code)) {
    return error(res, 'Vui lòng cung cấp branch_id và ít nhất một thông tin định danh (member_id, phone, hoặc member_code)', 400);
  }

  const result = accessGateService.checkIn({
    member_id,
    phone,
    member_code,
    branch_id,
    direction: direction || 'IN',
    access_method: access_method || 'FACE_ID',
    device_id
  });

  if (!result.allowed) {
    return res.status(403).json({
      success: false,
      message: `Từ chối vào cửa: ${result.reason}`,
      data: result
    });
  }

  return success(res, result, result.message);
}

function manualCheckIn(req, res) {
  const { member_id, phone, member_code, branch_id, direction, manual_reason } = req.body;
  if (!branch_id || (!member_id && !phone && !member_code)) {
    return error(res, 'Vui lòng cung cấp branch_id và thông tin hội viên', 400);
  }

  const result = accessGateService.checkIn({
    member_id,
    phone,
    member_code,
    branch_id,
    direction: direction || 'IN',
    access_method: 'MANUAL',
    manual_recorded_by: req.user?.account_id,
    manual_reason: manual_reason || 'Lễ tân hỗ trợ check-in thủ công'
  });

  if (!result.allowed) {
    return res.status(403).json({
      success: false,
      message: `Từ chối vào cửa: ${result.reason}`,
      data: result
    });
  }

  return success(res, result, 'Ghi nhận vào/ra thủ công thành công');
}

function getTodayLogs(req, res) {
  const { branch_id, direction, status } = req.query;
  const list = accessGateService.getTodayLogs({ branch_id, direction, status });
  return success(res, list, 'Lấy nhật ký ra vào hôm nay thành công');
}

module.exports = {
  checkIn,
  manualCheckIn,
  getTodayLogs
};

const registrationsService = require('./registrations.service');
const { success, error } = require('../../utils/response');

async function createRegistration(req, res) {
  const { member_id, package_id, sold_branch_id, start_date, previous_registration_id } = req.body;
  if (!member_id || !package_id || !sold_branch_id) {
    return error(res, 'member_id, package_id và sold_branch_id là bắt buộc', 400);
  }

  const result = await registrationsService.createRegistration({
    member_id,
    package_id,
    sold_branch_id,
    start_date,
    previous_registration_id,
    created_by: req.user?.account_id
  });

  if (result.error) return error(res, result.error, result.status);
  return success(res, result.registration, 'Tạo hợp đồng đăng ký gói thành công (Chờ thanh toán 100%)', 201);
}

function listRegistrations(req, res) {
  const { member_id, status, branch_id } = req.query;
  const list = registrationsService.listRegistrations({ member_id, status, branch_id });
  return success(res, list, 'Lấy danh sách đăng ký gói thành công');
}

function getRegistrationDetail(req, res) {
  const reg = registrationsService.getRegistrationDetail(req.params.id);
  if (!reg) return error(res, 'Không tìm thấy thông tin đăng ký gói', 404);
  return success(res, reg, 'Lấy chi tiết đăng ký gói thành công');
}

module.exports = {
  createRegistration,
  listRegistrations,
  getRegistrationDetail
};

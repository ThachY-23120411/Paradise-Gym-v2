const membersService = require('./members.service');
const { success, error } = require('../../utils/response');

async function searchPhone(req, res, next) {
  try {
    const { phone } = req.query;
    if (!phone) {
      return error(res, 'Vui lòng cung cấp tham số phone', 400);
    }
    const result = membersService.searchPhone(phone);
    return success(res, result, result.exists ? 'Số điện thoại đã tồn tại' : 'Số điện thoại khả dụng');
  } catch (err) {
    next(err);
  }
}

async function listMembers(req, res, next) {
  try {
    const { q, branch_id, status, page, limit } = req.query;
    const result = membersService.listMembers({ q, branch_id, status, page, limit });
    return success(res, result, 'Lấy danh sách hội viên thành công');
  } catch (err) {
    next(err);
  }
}

async function getMemberDetail(req, res, next) {
  try {
    const { id } = req.params;
    const member = membersService.getMemberDetail(id);
    if (!member) {
      return error(res, 'Không tìm thấy hồ sơ hội viên', 404);
    }
    return success(res, member, 'Lấy chi tiết hồ sơ hội viên thành công');
  } catch (err) {
    next(err);
  }
}

async function createMember(req, res, next) {
  try {
    const { full_name, phone, email, home_branch_id, date_of_birth, gender } = req.body;
    if (!full_name || !phone || !home_branch_id) {
      return error(res, 'Họ tên, số điện thoại và chi nhánh gốc là bắt buộc', 400);
    }

    const result = membersService.createMember({
      full_name,
      phone,
      email,
      home_branch_id,
      date_of_birth,
      gender,
      created_by: req.user?.account_id
    });

    if (result.error) {
      return error(res, result.error, result.status);
    }

    return success(res, result.member, 'Tạo hồ sơ hội viên thành công', 201);
  } catch (err) {
    next(err);
  }
}

async function updateMember(req, res, next) {
  try {
    const { id } = req.params;
    const updated = membersService.updateMember(id, req.body);
    if (!updated) {
      return error(res, 'Không tìm thấy hội viên cần cập nhật', 404);
    }
    return success(res, updated, 'Cập nhật hồ sơ hội viên thành công');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  searchPhone,
  listMembers,
  getMemberDetail,
  createMember,
  updateMember
};

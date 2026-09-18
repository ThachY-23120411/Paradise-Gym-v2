const branchesService = require('./branches.service');
const { success, error } = require('../../utils/response');

function listBranches(req, res) {
  const list = branchesService.listBranches(req.query.status);
  return success(res, list, 'Lấy danh sách chi nhánh thành công');
}

function getBranchById(req, res) {
  const branch = branchesService.getBranchById(req.params.id);
  if (!branch) return error(res, 'Không tìm thấy chi nhánh', 404);
  return success(res, branch, 'Lấy thông tin chi nhánh thành công');
}

function createBranch(req, res) {
  const { branch_code, branch_name, phone, address } = req.body;
  if (!branch_code || !branch_name || !phone || !address) {
    return error(res, 'Vui lòng cung cấp đầy đủ thông tin chi nhánh', 400);
  }

  const result = branchesService.createBranch(req.body);
  if (result.error) return error(res, result.error, result.status);
  return success(res, result.branch, 'Tạo chi nhánh mới thành công', 201);
}

module.exports = { listBranches, getBranchById, createBranch };

const packagesService = require('./packages.service');
const { success, error } = require('../../utils/response');

function listPackages(req, res) {
  const { branch_id, package_type, status } = req.query;
  const list = packagesService.listPackages({ branch_id, package_type, status });
  return success(res, list, 'Lấy danh mục gói tập thành công');
}

function getPackageDetail(req, res) {
  const pkg = packagesService.getPackageDetail(req.params.id);
  if (!pkg) return error(res, 'Không tìm thấy gói tập', 404);
  return success(res, pkg, 'Lấy chi tiết gói tập thành công');
}

function createPackage(req, res) {
  const { package_code, package_name, package_type, price, duration_days } = req.body;
  if (!package_code || !package_name || !package_type || !price || !duration_days) {
    return error(res, 'Vui lòng cung cấp đầy đủ thông tin bắt buộc của gói tập', 400);
  }

  const result = packagesService.createPackage(req.body);
  if (result.error) return error(res, result.error, result.status);
  return success(res, result.package, 'Tạo gói tập mới thành công', 201);
}

module.exports = { listPackages, getPackageDetail, createPackage };

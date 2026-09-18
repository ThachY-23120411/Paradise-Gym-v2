const paymentsService = require('./payments.service');
const { success, error } = require('../../utils/response');

async function createInvoice(req, res) {
  const { registration_id, payment_method, branch_id } = req.body;
  if (!registration_id) {
    return error(res, 'registration_id là bắt buộc', 400);
  }

  const result = await paymentsService.createPaymentInvoice({
    registration_id,
    payment_method,
    branch_id,
    collected_by: req.user?.account_id
  });

  if (result.error) return error(res, result.error, result.status);
  return success(res, result, 'Khởi tạo hóa đơn thanh toán 100% thành công', 201);
}

async function confirmPayment(req, res) {
  const { id } = req.params;
  const { transaction_ref } = req.body;

  const result = await paymentsService.confirmPayment({
    payment_id: id,
    transaction_ref,
    confirmed_by: req.user?.account_id
  });

  if (result.error) return error(res, result.error, result.status);
  return success(res, result, 'Xác nhận thanh toán 100% thành công, gói tập đã được kích hoạt');
}

function getReceipt(req, res) {
  const receipt = paymentsService.getReceiptByPaymentId(req.params.id);
  if (!receipt) return error(res, 'Không tìm thấy phiếu thu của giao dịch này', 404);
  return success(res, receipt, 'Lấy thông tin phiếu thu thành công');
}

module.exports = {
  createInvoice,
  confirmPayment,
  getReceipt
};

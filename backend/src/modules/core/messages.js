// Central Vietnamese messages keep REST error codes stable for all clients.
const codes = {
  UNAUTHORIZED: 'Vui lòng đăng nhập lại để tiếp tục.',
  INVALID_CREDENTIALS: 'Số điện thoại hoặc mật khẩu không đúng.',
  ACCOUNT_INACTIVE: 'Tài khoản chưa kích hoạt hoặc đã bị khóa.',
  ACCOUNT_LOCKED: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
  LOGIN_LOCKED: 'Đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.',
  ACTIVATION_REQUIRED: 'Vui lòng kích hoạt tài khoản bằng OTP trước khi đăng nhập.',
  SESSION_REVOKED: 'Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.',
  OTP_RATE_LIMIT: 'Vui lòng chờ mã OTP hiện tại hết hạn trước khi yêu cầu mã mới.',
  OTP_INVALID: 'Mã OTP không đúng hoặc đã hết hạn.',
  SMS_UNAVAILABLE: 'Chưa thể gửi SMS: nhà cung cấp chưa được cấu hình hoặc không phản hồi.',
  OAUTH_UNAVAILABLE: 'Chưa cấu hình nhà cung cấp đăng nhập mạng xã hội.',
  DEVICE_UNAVAILABLE: 'Chưa kết nối bộ tích hợp thiết bị. Chưa thể xác nhận nhận diện, đồng bộ hoặc mở cửa.',
  BANK_UNAVAILABLE: 'Chưa kết nối nhà cung cấp đối soát ngân hàng. Cần kiểm tra và xác nhận thu tiền tại quầy.',
  PAYMENT_CONFIRMATION_FORBIDDEN: 'Chỉ nhân viên có quyền thu tiền được xác nhận đã nhận tiền. Hội viên không thể tự xác nhận thanh toán bằng mã giao dịch hoặc xác nhận thủ công.',
  CONSENT_REQUIRED: 'Cần có sự đồng ý nhận diện khuôn mặt còn hiệu lực.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này hoặc dữ liệu nằm ngoài phạm vi chi nhánh.',
  NOT_FOUND: 'Không tìm thấy dữ liệu trong phạm vi được phép.'
};
const messages = {
  'Select a working branch': 'Vui lòng chọn chi nhánh làm việc.',
  'Invalid Vietnamese phone number': 'Số điện thoại Việt Nam không hợp lệ.',
  'Invalid email': 'Địa chỉ email không hợp lệ.',
  'Date of birth cannot be in the future': 'Ngày sinh không được nằm trong tương lai.',
  'Phone is immutable': 'Không được thay đổi số điện thoại định danh.',
  'Package type is immutable': 'Không được thay đổi loại gói đã tạo.',
  'Price must be positive': 'Giá gói phải là số dương hợp lệ.',
  'Duration is required': 'Vui lòng nhập thời hạn của gói.',
  'Select at least one branch': 'Vui lòng chọn ít nhất một chi nhánh.',
  'Branch is inactive': 'Chi nhánh đã ngừng hoạt động.',
  'Member is inactive': 'Hồ sơ hội viên không hoạt động.',
  'Package is not on sale': 'Gói hiện không được bán.',
  'Payment must equal 100% of the snapshot price': 'Số tiền thanh toán phải bằng 100% giá gói đã chốt khi đăng ký.',
  'Registration is not awaiting payment': 'Đăng ký không còn ở trạng thái chờ thanh toán.',
  'Payment intent expired; create a new invoice': 'Yêu cầu thanh toán đã hết hạn. Vui lòng tạo yêu cầu mới.',
  'Bank transaction reference already used': 'Mã giao dịch ngân hàng đã được sử dụng.',
  'PT or member already booked in this slot': 'PT hoặc hội viên đã có lịch trùng khung giờ.',
  'Session has not ended': 'Buổi tập chưa kết thúc, chưa thể xác nhận.',
  'Booking is no longer open': 'Lịch tập không còn ở trạng thái được phép thao tác.',
  'Full payment required': 'Cần thanh toán đủ 100% trước khi sử dụng quyền lợi.',
  'Identity must be verified': 'Cần xác minh danh tính trước khi ghi nhận sự đồng ý.',
  'Select a template before configuring this event': 'Vui lòng chọn mẫu thông báo trước khi bật sự kiện.',
  'Record not found': 'Không tìm thấy dữ liệu.',
  'Cannot remove your own administrator access': 'Không được tự khóa hoặc thu hồi quyền quản trị của chính mình.',
  'Cannot remove the last all-branches administrator': 'Phải giữ ít nhất một quản trị viên toàn hệ thống đang hoạt động.'
};
function localize(error) {
  if(codes[error.code])return codes[error.code];
  const message=error.message||'';
  if(messages[message])return messages[message];
  if(message.endsWith(' is required'))return `Vui lòng nhập trường ${message.slice(0,-12)}.`;
  if(message.endsWith(' is invalid'))return `Giá trị trường ${message.slice(0,-11)} không hợp lệ.`;
  if(message.startsWith('Invalid '))return `Giá trị không hợp lệ: ${message.slice(8)}.`;
  if(message.startsWith('Fields cannot be changed: '))return `Không được thay đổi các trường: ${message.slice(26)}.`;
  if(message.endsWith(' must be YYYY-MM-DD'))return 'Ngày phải đúng định dạng YYYY-MM-DD và là ngày hợp lệ.';
  if(error.status===403)return codes.FORBIDDEN;
  if(error.status===404)return codes.NOT_FOUND;
  return message;
}
module.exports={localize};

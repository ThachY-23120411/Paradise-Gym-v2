<!-- READ_BY: anti-2, anti-1 -->
# BÁO CÁO HOÀN THIỆN: 100% PHÂN HỆ MOBILE HỘI VIÊN (TAB 2)

**Dự án:** Paradise Gym  
**Phân hệ:** Mobile Hội viên (`frontend/mobile/member/` & `frontend/mobile/`)  
**Tab thực thi:** Tab 2 (`anti-2-HV`) & Tab 4 (`anti-4-Core-BE-DB`)  
**Ngày hoàn thiện:** 18/09/2026  
**Trạng thái kiểm thử:** 
- **Backend Integration Test:** PASS 368/368 HTTP checks (không mock data, chạy trên PostgreSQL độc lập).
- **Puppeteer E2E Test UI Thật:** PASS 100% (Đăng ký tài khoản chọn chi nhánh -> OTP SMS -> Đăng nhập vào HV01 -> Cài đặt thiết bị -> Đăng xuất).

---

## 1. Tóm Tắt Các Hạng Mục Đã Thực Hiện

### 1.1. Chọn Chi Nhánh Cơ Sở Khi Hội Viên Tự Đăng Ký (`HV06-US03`)
- **Backend REST API:**
  - Cập nhật `authenticate` middleware và hàm `scope(req)` trong `backend/src/modules/core/http.js` cho phép gọi `GET /branches?status=ACTIVE` công khai (unauthenticated).
  - Triển khai `POST /auth/signup-otp`: Tiếp nhận Họ tên, SĐT, `home_branch_id` (kiểm tra tồn tại và active trong DB), Email (tùy chọn), Mật khẩu (tối thiểu 6 ký tự). Xác thực SĐT chưa tồn tại trên hệ thống (nếu trùng trả về HTTP 409 `PHONE_EXISTS` theo đúng AF-01). Sinh mã OTP 60 giây và trả về JWT `signup_token`.
  - Triển khai `POST /auth/signup`: Xác thực `signup_token` và `otp_code`. Thực hiện transaction DB: tạo tài khoản `accounts` (`status='ACTIVE'`), gán quyền `MEMBER`, sinh mã hội viên tuần tự `HVxxx`, tạo hồ sơ `member_profiles` gắn đúng `home_branch_id`, ghi nhận phiên làm việc `account_sessions`, ghi `audit_logs` và trả về session token.
- **Frontend Web/Mobile SDK (`frontend/shared/apiClient.js`):**
  - Bổ sung `apiClient.auth.signupOtp(data)` và `apiClient.auth.signup(data)`.
- **Frontend Portal (`frontend/mobile/index.html` & `frontend/mobile/js/login.js`):**
  - Nạp danh mục chi nhánh hoạt động động 100% vào dropdown `#regHomeBranch` (`-- Chọn chi nhánh phòng tập * --`). Bắt buộc chọn, không chọn ngầm.
  - Bổ sung trường Email (tùy chọn).
  - Bổ sung nút `[ Nhận mã OTP ]`, bộ đếm thời gian 60s và hiển thị gợi ý OTP phát triển (`#regOtpDevHint`).
  - Lưới 6 ô nhập mã OTP (`#otpBoxesReg`).
  - Nút `[ HOÀN TẤT TẠO TÀI KHOẢN ]` gọi API hoàn tất đăng ký và tự động chuyển hướng vào `http://localhost:3000/mobile/member/#home`.
- **Frontend Member App (`frontend/mobile/member/js/auth-account.js`):**
  - Gỡ bỏ hoàn toàn thông báo khóa đăng ký cũ.
  - Tích hợp dropdown chi nhánh từ API, luồng OTP đăng ký và hoàn tất tạo tài khoản.

### 1.2. Quản Lý Phiên Thiết Bị Đăng Nhập (`HV04-US02` & `HV06-US04`)
- **Backend Session APIs:**
  - `GET /auth/sessions`: Trả về danh sách các phiên còn hiệu lực (`is_revoked = false`), đánh dấu `is_current: true/false`.
  - `POST /auth/logout-current`: Thu hồi phiên thiết bị hiện tại trong `account_sessions`.
  - `POST /auth/logout-all`: Thu hồi toàn bộ phiên trên mọi thiết bị và tăng `session_version`.
  - `DELETE /auth/sessions/:id`: Thu hồi phiên thiết bị chỉ định.
- **Frontend Mobile App (`frontend/mobile/member/js/auth-account.js`):**
  - Bổ sung khối UI **"Thiết bị đã đăng nhập"** trong tab `Tài khoản` -> `Cài đặt & bảo mật`.
  - Hiển thị thông tin từng thiết bị: Icon loại thiết bị (iPhone, Android, Laptop, Web), Tên thiết bị, IP, thời gian hoạt động gần nhất.
  - Thiết bị hiện tại có badge màu xanh lá: `[ Thiết bị hiện tại ]`.
  - Nút **`[ Đăng xuất ]`** trên thiết bị hiện tại: Mở popup xác nhận đăng xuất phiên hiện tại và điều hướng về trang đăng nhập an toàn.
  - Nút **`[ Thu hồi ]`** trên thiết bị khác: Mở popup xác nhận thu hồi phiên thiết bị cụ thể mà không ảnh hưởng đến phiên đang sử dụng.
  - Nút **`[ Đăng xuất khỏi tất cả thiết bị khác ]`**: Xuất hiện khi có từ 2 phiên trở lên, cho phép thu hồi toàn bộ thiết bị.

### 1.3. Rà Soát & Loại Bỏ Hoàn Toàn Member Tier
- Quét toàn bộ mã nguồn frontend mobile hội viên (`frontend/mobile/member/`) và web admin (`frontend/web/`):
  - 0 nhãn "VIP" / "Thường" hardcoded.
  - 0 trường hạng hội viên thừa.

### 1.4. Quản Lý Chứng Chỉ PT Phía Quản Trị Viên (QTV W05)
- Xác minh giao diện quản lý chứng chỉ tại `frontend/web/js/modules/ptScheduler.js`:
  - QTV có đầy đủ modal `showCertificateEditor` (thêm/sửa/xóa chứng chỉ: tên bằng, đơn vị cấp, ngày cấp, ngày hết hạn, mã số bằng).
  - Lễ tân và Mobile PT chỉ ở chế độ đọc (Read-only), đảm bảo tính phân quyền nghiêm ngặt.

---

## 2. Kết Quả Kiểm Thử (Verification & Validation)

### 2.1. Backend Test Suite (`npm test`)
```
PASS Device registry: GET /auth/sessions, DELETE session, logout-current, logout-all
PASS Member self-registration with branch selection, OTP validation and login (HV06-US03)
PASS 368 HTTP checks against isolated PostgreSQL database; configured DB untouched
```

### 2.2. Browser E2E Test UI Thật (Puppeteer)
1. **Màn hình Đăng ký Hội viên mới (`01-signup-form-filled.png`):**
   - Đã nạp thành công các chi nhánh phòng tập từ API `/branches?status=ACTIVE`.
   - Form hợp lệ, hỗ trợ ẩn/hiện mật khẩu, bắt buộc chọn chi nhánh.
2. **Màn hình Thử thách OTP (`02-signup-otp-challenge.png`):**
   - Đã gửi OTP thành công, bộ đếm lùi 60 giây hoạt động chuẩn xác, hiển thị mã thử nghiệm môi trường dev.
3. **Màn hình Trang chủ sau khi tạo tài khoản (`03-member-home-after-signup.png`):**
   - Tài khoản được kích hoạt `ACTIVE`, sinh mã hội viên tự động (ví dụ: `HV025`), tự động đăng nhập vào ứng dụng `HV01`.
4. **Màn hình Cài đặt & Quản lý thiết bị (`04-member-device-registry.png`):**
   - Danh sách thiết bị hiển thị phiên đăng nhập hiện tại, gắn nhãn `[ Thiết bị hiện tại ]`, IP và thời gian truy cập.
5. **Popup Xác nhận Đăng xuất (`05-logout-confirm-dialog.png`):**
   - Mở popup xác nhận đúng chuẩn UX, nhấn `Xác nhận đăng xuất` gọi `/auth/logout-current` thu hồi phiên và xóa sạch cache cục bộ.
6. **Màn hình quay về Đăng nhập (`06-returned-to-login.png`):**
   - Hoàn tất luồng an toàn.

---

## 3. Danh Mục File Mã Nguồn Đã Chỉnh Sửa

| STT | Đường dẫn File | Mục đích thay đổi |
|:---|:---|:---|
| 1 | `backend/src/modules/core/http.js` | Cho phép `scope(req)` trả về `null` khi `req.user` chưa đăng nhập |
| 2 | `backend/src/modules/core/auth.js` | Cho phép unauthenticated `GET /branches`; bổ sung `POST /auth/signup-otp` và `POST /auth/signup` |
| 3 | `backend/tests/mobile-refactor.cases.js` | Bổ sung integration test cases cho `GET /branches` và luồng self-signup OTP |
| 4 | `frontend/shared/apiClient.js` | Bổ sung `signupOtp()` và `signup()` vào SDK dùng chung |
| 5 | `frontend/mobile/index.html` | Bổ sung Email, nút nhận OTP và lưới 6 ô nhập OTP cho form đăng ký |
| 6 | `frontend/mobile/js/login.js` | Kết nối API nạp chi nhánh, xử lý OTP và đăng ký tài khoản tự động |
| 7 | `frontend/mobile/member/js/auth-account.js` | Mở khóa form đăng ký kèm chọn chi nhánh; bổ sung danh sách thiết bị trong Cài đặt & cập nhật đăng xuất hiện tại |
| 8 | `frontend/mobile/member/css/member.css` | Thêm style cho danh sách thiết bị (`.device-item`, `.device-registry`, nút thu hồi, badge) |

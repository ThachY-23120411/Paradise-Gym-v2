# Báo Cáo Triển Khai: Khung Mobile Member & Phân Hệ HV06 + HV04

**Subagent:** HV-1-Auth-Account (Lead Mobile Hội viên - Tab 2)  
**Ngày hoàn thành:** 16/09/2026  
**Thư mục chuyên trách:** `frontend/mobile/member/`

---

## 1. Kết Quả Triển Khai Chi Tiết

### 1.1. Khung Mobile Web View Responsive (`index.html` & `css/member.css`)
- **Smartphone Container 390x844:** Thiết kế vỏ ngoài giả lập smartphone iPhone 13/14/15/16 cao cấp (Dynamic Island, góc bo tròn 48px viền ánh kim, status bar hiển thị đồng hồ thời gian thực, pin, sóng wifi).
- **Mobile Fullscreen Responsive:** Tự động co giãn 100vw x 100vh trên màn hình thiết bị di động thật (`@media (max-width: 480px)`).
- **Bottom Navigation Bar 4 Tab chuẩn:**
  - Tab 1: HV01 · Trang chủ
  - Tab 2: HV02 · Lịch tập
  - Tab 3: HV03 · Gói của tôi
  - Tab 4: HV04 · Tài khoản
- **Thiết kế màu sắc thể thao sang trọng (Dark Emerald Theme):**
  - Màu chủ đạo: Xanh lá Emerald `#10B981` / `#059669`.
  - Nền tối: `#0B0F19` & Surface `#131D2E`.
  - Tuân thủ 100% quy tắc `ui-design-system.md`: Toàn bộ nút bấm filled (`.btn-primary`, `.btn-danger`) **luôn luôn dùng chữ trắng (`#FFFFFF`)** với độ tương phản cao.

---

### 1.2. Phân Hệ HV06 · Đăng Nhập (`js/auth-account.js`)
- **HV06-US01: Đăng nhập đa phương thức:**
  - Tab 1: Đăng nhập bằng Mật khẩu (SĐT + Mật khẩu, hỗ trợ ẩn/hiện mật khẩu).
  - Tab 2: Đăng nhập bằng mã OTP SMS không mật khẩu (nhập SĐT -> bấm nhận mã SMS -> đếm ngược 60s -> nhập 6 số OTP -> đăng nhập 1 bước).
  - **Xác thực 2 bước (2FA):** Tự động kích hoạt khi đăng nhập bằng Mật khẩu đối với tài khoản đã bật 2FA. Gồm 6 ô nhập OTP độc lập tự nhảy con trỏ, countdown đếm ngược 60s, nút gửi lại mã tối đa 3 lần.
  - **Cơ chế Account Lockout:** Đếm số lần nhập sai liên tiếp; nếu sai quá 5 lần, tự động khóa tạm thời tài khoản 15 phút kèm đồng hồ đếm ngược `15:00` và lưu trạng thái vào `localStorage`.
- **HV06-US02: Kích hoạt tài khoản Hội viên (Hồ sơ tại quầy):**
  - Nhập SĐT đã khai báo tại quầy lễ tân -> Tra cứu hồ sơ quầy -> Hiển thị thẻ tóm tắt xác nhận danh tính (Họ tên, Mã HV, Chi nhánh).
  - Bấm nhận mã OTP 60s -> Nhập OTP 6 số -> Thiết lập Mật khẩu mới & Xác nhận mật khẩu -> Kích hoạt tài khoản `ROLE_MEMBER` và điều hướng vào Trang chủ.
- **HV06-US03: Tạo tài khoản và đăng ký hồ sơ mới:**
  - Dành cho khách hàng mới: Nhập Họ tên, SĐT, Email, Mật khẩu mới.
  - Xác thực OTP qua SMS để đảm bảo SĐT chính chủ -> Hoàn tất tạo tài khoản & đăng nhập tức thì.
- **HV06-US04: Popup Xác nhận Đăng xuất:**
  - Hộp thoại Drawer bottom-sheet với backdrop blur xác nhận kết thúc phiên làm việc.
  - Thu hồi session qua `apiClient.auth.logout()`, xóa token và đưa về màn hình Đăng nhập an toàn.

---

### 1.3. Phân Hệ HV04 · Tài Khoản (`js/auth-account.js`)
- **HV04-US01: Cập nhật hồ sơ cá nhân:**
  - Ảnh đại diện Avatar (hỗ trợ chọn file ảnh từ máy và cập nhật preview tức thì).
  - Prefill và chỉnh sửa: Họ tên, Email, Ngày sinh, Giới tính.
  - **Quy tắc đổi SĐT:** Trigger khi thay đổi SĐT khác số hiện tại -> Hiển thị cảnh báo và ô nhập mã OTP xác thực SĐT mới -> Bắt buộc xác minh OTP mới cho phép lưu.
- **HV04-US02: Cài đặt thông báo & Bảo mật:**
  - Toggle Switch: Nhận thông báo In-app (Bật/Tắt).
  - Toggle Switch: Nhắc lịch PT tự động trước 2 tiếng (Bật/Tắt).
  - Toggle Switch: Xác thực 2 lớp (2FA khi đăng nhập) (Bật/Tắt).
  - Modal Đổi mật khẩu tài khoản: Kiểm tra mật khẩu hiện tại, mật khẩu mới tối thiểu 6 ký tự và xác nhận trùng khớp.

---

## 2. Tài Khoản Thử Nghiệm Tích Hợp (Demo & Offline Fallback)
1. **Tài khoản có bật 2FA:** SĐT: `0901234567` | Pass: `123456` -> Yêu cầu OTP 2FA (Test OTP: `123456`).
2. **Tài khoản thường (không 2FA):** SĐT: `0912345678` | Pass: `123456`.
3. **Hồ sơ quầy chờ kích hoạt:** SĐT: `0909112233` (Trần Quốc Bảo - Trụ sở Q.1) | SĐT: `0909445566` (Lê Mỹ Linh - Bình Thạnh).
4. **Mã OTP thử nghiệm:** `123456`.

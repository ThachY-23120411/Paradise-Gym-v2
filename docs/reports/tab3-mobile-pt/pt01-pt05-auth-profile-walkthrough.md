# Báo Cáo Bàn Giao (Walkthrough) — Subagent PT-1-Auth-Profile (Tab 3: anti-3-PT)

**Giai đoạn:** Dựng khung Mobile Web View PT & Triển khai PT05 (Đăng nhập HLV) + PT04 (Hồ sơ & Tài khoản HLV)  
**Thời gian:** 2026-09-16  
**Chuyên trách:** Subagent PT-1-Auth-Profile (`anti-3-PT`)  

---

## 1. Khung Sườn Ứng Dụng Mobile Web View PT (`frontend/mobile/pt/`)

Đã hoàn thành khung sườn ứng dụng chuẩn responsive mô phỏng smartphone (390x844px) trên desktop và tự động co giãn 100% full-screen trên thiết bị di động thật:

- **`frontend/mobile/pt/index.html`**:
  - Tích hợp chuẩn thư viện: jQuery 3.7.1, Google Font Plus Jakarta Sans, Font Awesome 6 Icons, và SDK chia sẻ `../../shared/apiClient.js`.
  - Header: Lời chào HLV cá nhân hóa ("Xin chào, HLV [Tên]"), Chi nhánh làm việc ("Chi nhánh Quận 1"), Avatar và Nút Chuông Thông Báo kèm Badge đếm thông báo chưa đọc.
  - Notification Bottom Sheet: Hỗ trợ trượt từ dưới lên xem thông báo yêu cầu phân công, nhắc nhở lịch tập, và nút "Đánh dấu đã đọc tất cả".
  - Bottom Navigation Bar chuẩn gồm **ĐÚNG 4 tab**:
    1. `[Tổng quan]` (`PT06`): Dashboard KPI tóm tắt ca dạy hôm nay và học viên phụ trách.
    2. `[Lịch]` (`PT01`): Lịch huấn luyện & điểm danh ca tập 1-1.
    3. `[Học viên]` (`PT02`): Danh sách học viên và tiếp nhận yêu cầu phân công.
    4. `[Tài khoản]` (`PT04`): Hồ sơ năng lực & cài đặt tài khoản HLV.

- **`frontend/mobile/pt/css/app.css`**:
  - Giao diện Gym sang trọng đẳng cấp cao (Luxury Dark Forest Theme) với màu xanh ngọc/xanh rừng đậm (`#064e3b`, `#047857`, `#10b981`), nhấn nhá ánh kim vàng kim loại (`#f59e0b`, `#fbbf24`).
  - Khung giả lập smartphone 390x844px bo cong viền cong 46px với Dynamic Island, thanh trạng thái (Pin/Wifi/Sóng), và Home Indicator.
  - Các thành phần card bo góc (`14px - 20px`), badge trạng thái, toggle switch kiểu iOS mượt mà, modal center và bottom sheet slide-up animation.

- **`frontend/mobile/pt/js/app.js`**:
  - Điều phối chuyển tab mượt mà giữa 4 tab.
  - Quản lý trạng thái phiên làm việc (Session) của HLV: Kiểm tra token qua `ParadiseApiClient`, hiển thị auth overlay nếu chưa đăng nhập, tự động lấy thông tin HLV (`/auth/me`) khi đã đăng nhập.
  - Quản lý đồng hồ thời gian thực và hệ thống Toast notification nổi.

---

## 2. Phân Hệ PT05 — Đăng Nhập & Xác Thực HLV (`frontend/mobile/pt/js/auth.js`)

- **PT05-US01 (Đăng nhập đa phương thức)**:
  - **Tab 1: Bằng Mật khẩu**: Hỗ trợ nhập Số điện thoại hoặc Mã PT (ví dụ `PT001` hoặc `0900000003`) kèm mật khẩu (`Paradise@123`), có icon ẩn/hiện mật khẩu.
  - **Tab 2: Bằng Mã OTP SMS (Passwordless)**: Nhập SĐT $\rightarrow$ Bấm nhận mã OTP $\rightarrow$ Bộ đếm ngược 60 giây $\rightarrow$ Nhập 6 số OTP để xác nhận đăng nhập.
- **PT05-US02 (Kích hoạt tài khoản PT bằng OTP)**:
  - Nhập SĐT / Mã PT $\rightarrow$ Kiểm tra thông tin hồ sơ nhân sự (hiển thị Họ tên, Mã PT, Chi nhánh làm việc).
  - Nhận mã OTP SMS kích hoạt (countdown 60s).
  - Thiết lập Mật khẩu mới + Xác nhận mật khẩu mới (kiểm tra chuẩn tối thiểu 8 ký tự, khớp 100%).
  - Kích hoạt tài khoản sang trạng thái `ACTIVE` và tự động đăng nhập.
- **PT05-US03 / Luồng Xác thực 2 bước (2FA)**:
  - 6 ô nhập mã OTP riêng biệt (`otp-box`), tự động nhảy con trỏ sang ô tiếp theo khi nhập số, lùi ô khi bấm Backspace, hỗ trợ dán (paste) chuỗi 6 chữ số tự động phân bổ vào 6 ô.
  - Countdown đếm ngược 60 giây.
  - Nút gửi lại mã OTP mở khi đếm về 0s, giới hạn tối đa 3 lần/phiên.
- **Cơ chế Chống dò quét & Khóa tài khoản (Account Lockout)**:
  - Ghi nhận số lần nhập sai liên tiếp; nếu sai quá 5 lần sẽ kích hoạt khóa tài khoản tạm thời 15 phút.
  - Hiển thị banner cảnh báo kèm đồng hồ đếm ngược 15:00 theo thời gian thực và vô hiệu hóa các nút đăng nhập (lưu `localStorage` chống bypass F5).

---

## 3. Phân Hệ PT04 — Hồ Sơ Năng Lực & Tài Khoản HLV (`frontend/mobile/pt/js/profile.js`)

- **PT04-US01 (Hồ sơ năng lực & Cài đặt cá nhân)**:
  - Hero Profile Card: Avatar HLV kèm badge "PRO PT", Họ tên đầy đủ, Mã PT (`PT001`), Chi nhánh làm việc, hàng chỉ số KPI (5+ năm kinh nghiệm, 4.9⭐ đánh giá, 45+ học viên).
  - Khối Thông tin liên hệ nhân sự: SĐT, Email, Ca trực cố định (08:00 - 18:00 Thứ 2 - Thứ 6).
  - Chuyên môn đào tạo: Giảm mỡ & Siết cơ, Hypertrophy tăng cơ, Boxing & Muay Thái, Phục hồi chức năng.
  - Bằng cấp & Chứng chỉ: NASM - Certified Personal Trainer, Cử nhân Khoa học TDTT, Chứng chỉ Sơ cấp cứu CPR & AED (AHA).
  - Tùy chọn cài đặt (Toggle Switches):
    * Nhận thông báo lịch mới
    * Nhắc ghi kết quả buổi học
    * Hiển thị SĐT cho học viên
    * Xác thực 2 lớp (2FA khi đăng nhập)
    * Nút `[ Lưu cài đặt ]` lưu cấu hình vào hệ thống và hiển thị toast phản hồi.
  - Modal Đổi mật khẩu: Kiểm tra mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu.
  - Popup Xác nhận Đăng xuất (PT05-US03): Hộp thoại modal xác nhận an toàn, thu hồi token, xóa dữ liệu phiên và chuyển về màn hình đăng nhập.

---

## 4. Kiểm Thử & Xác Nhận Tính Đồng Bộ

- Toàn bộ cú pháp mã nguồn JavaScript (`auth.js`, `profile.js`, `app.js`) đã được kiểm tra cú pháp thành công với Node.js runtime (`node -c`), hoàn toàn không có lỗi.
- Đã tuân thủ nghiêm ngặt quy tắc cô lập source code của Tab 3 (chỉ ghi trong `frontend/mobile/pt/` và `docs/reports/tab3-mobile-pt/`).

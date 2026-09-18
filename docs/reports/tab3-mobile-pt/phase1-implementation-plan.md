# KẾ HOẠCH TRIỂN KHAI FRONTEND MOBILE PT (TAB 3: anti-3-PT)

- **Đơn vị phụ trách:** Tab 3 — `anti-3-PT` (Lead Mobile PT)
- **Thư mục source code:** `frontend/mobile/pt/`
- **Tài liệu tham chiếu:**
  - `docs/implementation-plan.md`
  - `docs/user-stories/pt/` (PT01, PT02, PT03, PT04, PT05, PT06)
  - `brain-anti4/f3e35fdf-b62d-490a-b966-5bfef9037ca3/api_contracts.md`
  - SDK dùng chung: `frontend/shared/apiClient.js`
- **Nền tảng kỹ thuật:**
  - Responsive Mobile Web View container (mô phỏng smartphone chuẩn 390x844px)
  - HTML5, CSS3 hiện đại, Vanilla JS / jQuery, DevExtreme Components
  - Tích hợp RESTful API Backend qua `ParadiseApiClient`

---

## 1. PHÂN CHIA CÔNG VIỆC CHO 3 SUBAGENTS NỘI BỘ

### 1.1. Subagent `PT-1-Auth-Profile`:
- **File phụ trách:**
  - `frontend/mobile/pt/index.html` (Khung Shell ứng dụng Mobile PT, Bottom Navigation Bar 4 tab: Tổng quan, Lịch, Học viên, Tài khoản; Topbar chuông thông báo có badge đỏ).
  - `frontend/mobile/pt/css/app.css` (Style responsive smartphone, biến màu thương hiệu Paradise Gym, card, modal, bottom sheet, animation).
  - `frontend/mobile/pt/js/app.js` (Router điều hướng giữa các tab, State management người dùng PT hiện tại).
  - `frontend/mobile/pt/js/auth.js`:
    - `PT05-US01`: Đăng nhập đa phương thức (Tab Mật khẩu / Tab OTP SMS không mật khẩu).
    - `PT05-US02`: Kích hoạt tài khoản PT bằng OTP qua số điện thoại.
    - `PT05-US03`: Màn hình Xác thực 2 bước (2FA) 6 số tự động nhảy con trỏ, countdown đếm ngược 60s, gửi lại tối đa 3 lần.
    - Cơ chế Account Lockout: Khóa tạm thời 15 phút nếu nhập sai quá 5 lần.
  - `frontend/mobile/pt/js/profile.js`:
    - `PT04-US01`: Xem hồ sơ năng lực cá nhân của HLV (Mã PT, Họ tên, Chi nhánh, Chuyên môn, Bằng cấp/Chứng chỉ, Đổi mật khẩu, Cài đặt thông báo & Đăng xuất).

### 1.2. Subagent `PT-2-Schedule-Overview`:
- **File phụ trách:**
  - `frontend/mobile/pt/js/overview.js`:
    - `PT06-US01`: Dashboard Tổng quan hiệu suất HLV (Bộ lọc thời gian: Tuần này / Tháng này / Tháng trước; 5 thẻ chỉ số KPI: Học viên phụ trách, Buổi đã hoàn thành, Buổi sắp dạy, Buổi chờ xác nhận, Yêu cầu phân công mới).
  - `frontend/mobile/pt/js/schedule.js`:
    - `PT01-US01`: Xem lịch làm việc theo ngày; Calendar Strip cuộn ngang chọn ngày; Lưới 5 khung giờ cố định trong ngày (08:00-10:00, 10:00-12:00, 12:00-14:00, 14:00-16:00, 16:00-18:00); 5 trạng thái thẻ slot (`UPCOMING`, `AWAITING_CONFIRMATION`, `DONE`, `CANCELLED`, `Khung giờ trống`). PT không tự đặt hay hủy lịch.
    - `PT01-US02`: Bottom Sheet / Modal Ghi nhận kết quả buổi PT; PT bấm `[ Xác nhận hoàn thành ]` ghi chú đánh giá thể lực để phối hợp cùng Hội viên xác nhận kép trừ 1 buổi tập.

### 1.3. Subagent `PT-3-Clients-Notifications`:
- **File phụ trách:**
  - `frontend/mobile/pt/js/clients.js`:
    - `PT02-US01`: Danh sách học viên phụ trách; Thanh tìm kiếm realtime; Bộ chuyển tab (`Đang phụ trách` & `Yêu cầu phân công`); Thẻ học viên hiển thị avatar, họ tên, mã HV, SĐT, tên gói, hạn dùng, badge trạng thái, 2 chỉ số (Buổi PT còn lại, Lần cuối) và Thanh tiến độ (Progress Bar).
    - `PT02-US02`: Màn hình Chi tiết lộ trình & Lịch sử tập luyện của học viên; Thanh tiến độ lộ trình; Timeline các buổi tập đã hoàn thành kèm nội dung ghi chú thể lực của PT.
    - `PT02-US03`: Sub-tab Yêu cầu phân công PT; Thẻ yêu cầu phân công kèm 2 nút `[ Đồng ý tiếp nhận ]` / `[ Từ chối ]`; Bottom Sheet Xác nhận từ chối với lý do định sẵn và chi tiết.
  - `frontend/mobile/pt/js/notifications.js`:
    - `PT03-US01`: Hộp thư thông báo in-app mở từ icon chuông ở Header; Phân loại thông báo (Học viên mới, Lịch hẹn mới, Hủy lịch, Cần xác nhận kết quả); Đánh dấu đã đọc và điều hướng nhanh đến tab nghiệp vụ tương ứng.

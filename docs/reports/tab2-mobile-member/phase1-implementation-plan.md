# Kế Hoạch Triển Khai Tab 2: Mobile Hội Viên (Paradise Gym)

- **Vai trò định danh:** Mobile Member Lead (anti-2-HV)
- **Phạm vi mã nguồn:** \rontend/mobile/member/- **Thời gian lập:** 16/09/2026
- **Mục tiêu:** Xây dựng toàn bộ ứng dụng Mobile Hội viên (HV01 - HV06) trên nền tảng Mobile Web View responsive (390x844) sử dụng jQuery & DevExtreme jQuery UI components, bám sát 100% tài liệu User Stories và Product Spec.

---

## 1. Phân Chia Công Việc 3 Subagents

### Subagent 1: HV-1-Auth-Account
- **Nhiệm vụ:**
  1. Dựng khung sườn giao diện Mobile Web View responsive (smartphone 390x844) với Bottom Navigation Bar 4 tab (\HV01 · Trang chủ\, \HV02 · Lịch tập\, \HV03 · Gói của tôi\, \HV04 · Tài khoản\).
  2. Triển khai phân hệ **HV06 · Đăng nhập**:
     - Màn hình Đăng nhập đa phương thức: Tab Mật khẩu (SĐT + Pass) và Tab OTP SMS không mật khẩu.
     - Màn hình Xác thực 2 bước (2FA): 6 ô nhập OTP, countdown 60s, nút gửi lại mã.
     - Màn hình Kích hoạt tài khoản Hội viên (HV06-US02) dành cho người đã có hồ sơ tại quầy.
     - Màn hình Tạo tài khoản và hồ sơ mới (HV06-US03).
     - Cơ chế chống Brute-force: Khóa tạm 15 phút nếu sai quá 5 lần.
     - Popup Đăng xuất an toàn (HV06-US04).
  3. Triển khai phân hệ **HV04 · Tài khoản**:
     - Xem & cập nhật hồ sơ cá nhân (HV04-US01).
     - Cài đặt thông báo & bảo mật tài khoản (bật/tắt 2FA, đổi mật khẩu) (HV04-US02).

### Subagent 2: HV-2-Home-Schedule
- **Nhiệm vụ:**
  1. Triển khai phân hệ **HV01 · Trang chủ Dashboard**:
     - Chuẩn 4 khối theo HV01-US01:
       - Khối 1: Lời chào thân thiện kèm họ tên.
       - Khối 2: Thẻ việc cần xử lý (thẻ vàng amber hiển thị yêu cầu chọn PT đang chờ duyệt kèm nút [ Xem yêu cầu PT ], thẻ xanh green nếu không có việc).
       - Khối 3: Thẻ Lịch sắp tới (ngày giờ, HLV, gói tập kèm nút [ Xem lịch của tôi ]).
       - Khối 4: Thao tác nhanh quản lý gói tập với 2 nút [ Mua gói ] và [ Gói của tôi ].
       - Tuyệt đối không có check-in hay mã QR tại HV01.
  2. Triển khai phân hệ **HV02 · Lịch tập**:
     - Xem lịch tập cá nhân và lọc trạng thái (Đã đặt, Đã hủy, Hoàn thành).
     - Đặt lịch PT từ slot trống của PT được phân công.
     - Hủy lịch trước giờ quy định (kiểm soát bảo lưu / trừ buổi).
     - Nút [ Xác nhận hoàn thành buổi tập ] của Hội viên phối hợp xác nhận kép để trừ buổi.

### Subagent 3: HV-3-Packages-Notifications
- **Nhiệm vụ:**
  1. Triển khai phân hệ **HV03 · Gói của tôi**:
     - Danh sách gói tập đang sở hữu, thời hạn, số buổi còn lại.
     - Danh mục gói tập đang mở bán & modal xem chi tiết quyền lợi.
     - Giao diện Mua gói và khởi tạo thanh toán chuyển khoản VietQR 100%.
     - Giao diện Chọn PT và gửi yêu cầu phân công PT (kèm popup xác nhận).
     - Lịch sử thanh toán phiếu thu của cá nhân.
  2. Triển khai phân hệ **HV05 · Thông báo**:
     - Hộp thư thông báo in-app (lọc chưa đọc, đánh dấu đã đọc, xem chi tiết nội dung).

---

## 2. Quy Chuẩn Kỹ Thuật (Tech Stack & Architecture)
- Thư viện: jQuery + DevExtreme jQuery UI (\dxDataGrid\, \dxForm\, \dxPopup\, \dxTabs\, \dxScrollView\, \dxButton\, \dxDateBox\).
- File cấu trúc mã nguồn trong \rontend/mobile/member/\:
  - \index.html\: Shell giao diện chứa Mobile Web View responsive (390x844) và Bottom Navigation Bar.
  - \css/member.css\: Định kiểu giao diện mobile tối ưu trải nghiệm chạm, màu chủ đạo Paradise Gym.
  - \js/auth-account.js\: Xử lý HV06 (Auth, 2FA, OTP, Kích hoạt, Đăng xuất) & HV04 (Tài khoản, Hồ sơ, Bảo mật).
  - \js/home-schedule.js\: Xử lý HV01 (Trang chủ Dashboard) & HV02 (Lịch tập, Đặt lịch, Hủy lịch, Xác nhận kép).
  - \js/packages-notifications.js\: Xử lý HV03 (Gói tập, VietQR, Yêu cầu PT, Lịch sử) & HV05 (Thông báo in-app).
  - \js/app.js\: File điều phối chính, quản lý state và chuyển đổi tab.

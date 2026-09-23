# Báo Cáo Hoàn Thành: Refactor Popup Hồ Sơ Hội Viên & PT Chuẩn Design System & Đồng Bộ 100% Database

## 1. Tổng Quan & Yêu Cầu Người Dùng
- **Phản hồi từ Người Dùng:**
  1. Loại bỏ hoàn toàn các trường dữ liệu giả/hardcoded text không có trong Database; áp dụng triệt để bộ nhận diện Design System (`Administrative Forest Clean`).
  2. Đồng bộ 100% tiến độ và tính năng của 2 Conversation:
     - **Tab 2 (Mobile Member Lead):** Xem lộ trình tập luyện từng buổi (`[ Lộ trình ]`), Yêu cầu chuyển nhượng gói tập (`package_transfer_requests` - Migration 015), Xác nhận kép 2 chiều, Lịch sử thanh toán & Phiếu thu (`receipt_code` - Migration 014).
     - **Tab 3 (Mobile PT Lead):** Quy trình xác nhận hoa hồng 2 chiều trên app (Migration 018) với trạng thái `PENDING_CONFIRMATION` ("Chờ PT xác nhận"), `PAID` ("Đã thanh toán"), mốc thời gian PT ký nhận `pt_confirmed_at`; Lịch sử dạy có bài tập & thể lực; Tài khoản ngân hàng chi trả hoa hồng (`bank_name`, `bank_account_no`, `bank_account_name` - Migration 009).
  3. Kiểm thử tự động E2E trên đối tượng chuẩn có đầy đủ dữ liệu thực tế:
     - **Hội viên:** `HV001 - Lê Hoàng Nam` (11 gói đang kích hoạt, 19 hợp đồng, 31 ca tập, 11 thanh toán tích lũy 19.010.100 đ).
     - **Huấn luyện viên:** `PT001 - Nguyễn Văn Thể` (6 học viên phụ trách, 22 buổi dạy hoàn thành xác nhận kép, hoa hồng 2 chiều).

---

## 2. Chi Tiết Kỹ Thuật Đã Thực Hiện

### 2.1. Chuẩn Hóa CSS Design System (`frontend/web/css/web.css`)
- Thiết kế bố cục chuẩn Enterprise Modal Sidebar (tỉ lệ 260px Sidebar bên trái + Flex Main Panel bên phải).
- Bổ sung các class chuẩn:
  * `.profile-modal-wrap`, `.profile-modal-sidebar`, `.profile-sidebar-hero`
  * `.profile-sidebar-nav`, `.profile-sidebar-heading`, `.profile-sidebar-item`, `.profile-sidebar-count`
  * `.profile-modal-main`, `.profile-section-title`, `.profile-card-box`, `.profile-info-grid`, `.profile-info-item`
- Sử dụng bảng màu `Administrative Forest Clean`: `--primary: #237b58`, `--primary-dark: #185740`, `--primary-light: #eaf4ee`, `--border-color: #dfe6e2`, font Manrope cho số tiền và mã định danh.

### 2.2. Popup Hồ Sơ Hội Viên (`frontend/web/js/modules/members.js`)
- **Loại bỏ 100% dữ liệu giả:**
  * Xóa bỏ hoàn toàn các trường ảo: `qr_code`, `NOT_ENROLLED`, `NONE`, `Mã định danh hệ thống (QR)`.
  * Trạng thái Face ID lấy thực tế từ `biometric_face_data` (`hasBioFace`).
  * Bảng Lịch sử đồng ý xử lý dữ liệu cá nhân (PDPA Consents) lấy 100% từ bảng `member_consents`.
- **Đồng bộ tính năng Tab 2 (Mobile Member):**
  * **Trang chủ:** Bộ 4 thẻ KPI `.metric-card`, Thẻ Lịch tập tiếp theo, Thẻ Turnstile Pass (mã check-in tự động), Danh mục gói tập đang hoạt động có nút `[ Lộ trình ]`.
  * **Lịch tập:** Sub-tabs `Lịch tập PT 1-1` & `Lớp tập cộng đồng`. Bảng hiển thị cột "Xác nhận kép" (`✓ Cả 2 đã duyệt`, `PT đã duyệt`, `HV đã duyệt`), nội dung bài tập và đánh giá thể lực.
  * **Gói của tôi:** DataGrid danh sách hợp đồng + Bảng `Yêu Cầu Chuyển Nhượng Gói Tập` (`package_transfer_requests` - Migration 015) hiển thị chiều gửi/nhận, người liên quan, lý do, ngày gửi, trạng thái. Nút `[ Lộ trình ]` mở modal tiến độ và timeline từng buổi.
  * **Thanh toán:** Bảng lịch sử thanh toán hiển thị `payment_code`, thời gian, số tiền Manrope bold, phương thức, mã phiếu thu `receipt_code` (Migration 014), kèm Nhật ký quẹt thẻ Turnstile có bộ lọc ngày.
  * **Tài khoản:** Bảng thông tin cá nhân và quản trị 100% từ PostgreSQL, khối Face ID Kiosk, bảng PDPA consents.

### 2.3. Popup Hồ Sơ Huấn Luyện Viên (`frontend/web/js/modules/ptScheduler.js`)
- **Đồng bộ tính năng Tab 3 (Mobile PT):**
  * **Tổng quan:** 3 thẻ KPI `.metric-card` (Học viên phụ trách, Buổi đã dạy hoàn thành, Tổng hoa hồng đã nhận), Thẻ Ca dạy tiếp theo, Nhật ký check-in ca trực của HLV.
  * **Lịch PT 1:1:** Sub-tabs `Lịch dạy sắp tới` & `Lịch sử buổi dạy đã xong` (22 buổi hoàn thành có nội dung bài tập, đánh giá thể lực, xác nhận kép 2 chiều).
  * **Gói phụ trách:** DataGrid 6 hợp đồng học viên đang theo tập.
  * **Hoa hồng:** Thống kê ĐÃ THANH TOÁN (PAID) và CHỜ DUYỆT / CHỜ XÁC NHẬN. Bảng kê hoa hồng hiển thị badge `Chờ PT xác nhận` (`PENDING_CONFIRMATION`), `Đã thanh toán` (`PAID`), mốc thời gian PT ký nhận `pt_confirmed_at`.
  * **Tài khoản:** Thông tin nhân sự, chuyên môn năng lực và Tài khoản ngân hàng chi trả hoa hồng (`MB Bank - 0900000003 - NGUYEN VAN THE`).

---

## 3. Kết Quả Kiểm Thử E2E Nghiệm Thu

Kịch bản `tests/e2e/test_profile_multitabs.js` thực thi tự động qua Headless Chrome:
- **Hội viên HV001 - Lê Hoàng Nam:** Đầy đủ 11 gói kích hoạt, 90 lượt Gym, 167 buổi PT, 19.010.100 đ chi tiêu.
- **Huấn luyện viên PT001 - Nguyễn Văn Thể:** 6 học viên, 22 buổi hoàn thành, 1.400.000 đ đã nhận, 768.750 đ chờ xác nhận.

### 10 Ảnh Screenshot Nghiệm Thu Thực Tế (Artifacts):
1. `verify-member-menu1-home.png`: Trang chủ HV001 (4 thẻ KPI, Lịch tập tiếp theo, Turnstile Pass, Gói đang kích hoạt).
2. `verify-member-menu2-schedule.png`: Lịch tập HV001 (3 thẻ KPI, bảng lịch tập PT có xác nhận kép, bài tập, thể lực).
3. `verify-member-menu3-packages.png`: Gói của tôi HV001 (Hợp đồng có nút [ Lộ trình ], Bảng Yêu cầu chuyển nhượng gói tập).
4. `verify-member-menu4-payments.png`: Thanh toán HV001 (Giao dịch có mã phiếu thu điện tử `receipt_code`).
5. `verify-member-menu5-account.png`: Tài khoản HV001 (100% dữ liệu thật từ DB, Face ID Kiosk, bảng PDPA consents).
6. `verify-trainer-menu1-overview.png`: Tổng quan PT001 (3 thẻ KPI, Ca dạy tiếp theo, Check-in ca trực).
7. `verify-trainer-menu2-schedule.png`: Lịch dạy PT001 (Sắp tới & Lịch sử hoàn thành có bài tập, thể lực).
8. `verify-trainer-menu3-members.png`: Gói phụ trách PT001 (Danh sách 6 học viên và tiến độ).
9. `verify-trainer-menu4-commissions.png`: Hoa hồng PT001 (Quy trình 2 chiều, Chờ PT xác nhận & Đã thanh toán).
10. `verify-trainer-menu5-profile.png`: Tài khoản PT001 (Thông tin nhân sự, Chuyên môn, Tài khoản ngân hàng chi trả).

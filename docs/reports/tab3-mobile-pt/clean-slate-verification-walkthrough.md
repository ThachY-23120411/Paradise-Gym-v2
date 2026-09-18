# BÁO CÁO DỌN DẸP DỮ LIỆU SEED & THIẾT LẬP TRẠNG THÁI CLEAN SLATE

## 1. Mục Tiêu Thực Hiện
Theo yêu cầu trực tiếp từ Quý người dùng:
- Dừng hoàn toàn việc seed dữ liệu ảo phát sinh nghiệp vụ.
- Xóa sạch 100% dữ liệu hoạt động trong database để người dùng tự thao tác tạo mới, sửa, xóa và kiểm thử luồng CRUD thực tế.
- **Bảo toàn nguyên vẹn 100%**:
  - Dữ liệu tài khoản & hồ sơ người dùng (13 tài khoản, 4 vai trò, 7 hồ sơ hội viên, 4 hồ sơ huấn luyện viên PT, phân quyền chi nhánh).
  - Danh mục 7 gói tập mẫu (`packages` & `package_branches`) để có thể lập tức tạo hợp đồng, phân công PT, đặt lịch và thanh toán mà không phải tạo lại danh mục từ đầu.
  - Cấu hình chi nhánh (3 chi nhánh), thiết bị cổng (4 thiết bị) và mẫu thông báo hệ thống.

---

## 2. Kết Quả Kiểm Kê Database Sau Khi Dọn Dẹp

Toàn bộ các bảng trong cơ sở dữ liệu PostgreSQL (`localhost:5435/paradise_gym`) và In-Memory Store Backend đã được đồng bộ chuẩn xác:

| Nhóm dữ liệu | Bảng dữ liệu | Số lượng bản ghi | Trạng thái |
| :--- | :--- | :---: | :--- |
| **Hệ thống & Phân quyền** | `roles` | **4** | Đầy đủ (QTV, RECEPTIONIST, PT, MEMBER) |
| | `accounts` | **13** | Bảo toàn đầy đủ tài khoản đăng nhập |
| | `account_roles` | **13** | Bảo toàn liên kết vai trò |
| | `account_branch_scopes` | **6** | Bảo toàn phạm vi chi nhánh |
| | `branches` | **3** | Quận 1, Bình Thạnh, Thủ Đức |
| | `devices` | **4** | Cổng xoay RFID/FaceID, Kiosk |
| | `notification_templates` | **3** | Mẫu thông báo kích hoạt, thanh toán, xác nhận kép |
| **Người dùng** | `member_profiles` | **7** | Bảo toàn hồ sơ HV001 - HV007 |
| | `pt_profiles` | **4** | Bảo toàn hồ sơ PT001 - PT004 |
| **Danh mục gói tập** | `packages` | **7** | GYM-1M, GYM-3M, VIP-YEAR, PT-20S, PT-36S, PT-12S, COMBO-VIP |
| | `package_branches` | **14** | Phân bổ gói tập về các chi nhánh |
| **Dữ liệu Nghiệp vụ (Đã làm sạch)** | `registrations` | **0** | Clean Slate (Sẵn sàng tạo mới) |
| | `registration_allowed_branches`| **0** | Clean Slate |
| | `pt_assignment_requests` | **0** | Clean Slate |
| | `pt_bookings` | **0** | Clean Slate |
| | `payments` | **0** | Clean Slate |
| | `receipts` | **0** | Clean Slate |
| | `access_logs` | **0** | Clean Slate |
| | `notifications` | **0** | Clean Slate |
| | `audit_logs` | **0** | Clean Slate |

---

## 3. Các Thành Phần Mã Nguồn Đã Cập Nhật

1. **`backend/src/db/seeds/001_seed_data.sql`**:
   - Loại bỏ toàn bộ các câu lệnh `INSERT` dữ liệu phát sinh vào các bảng `registrations`, `registration_allowed_branches`, `pt_assignment_requests`, `payments`, `receipts`, `pt_bookings`, `access_logs`, `notifications`, `audit_logs`.
   - Giữ lại đầy đủ dữ liệu nền tảng: `branches`, `roles`, `accounts`, `account_roles`, `account_branch_scopes`, `member_profiles`, `pt_profiles`, `packages`, `package_branches`, `devices`, `notification_templates`.
2. **`backend/src/db/seed.js`**:
   - Cập nhật quy trình kiểm tra và xác nhận Clean Slate khi chạy `npm run db:seed`.
3. **`backend/src/config/db.js`**:
   - Chuyển toàn bộ các mảng dữ liệu mẫu hoạt động (`registrations`, `pt_bookings`, `payments`, `receipts`, `access_logs`, `notifications`, `audit_logs`) về mảng rỗng `[]`.
   - Cập nhật hàm `syncStoreFromPg(client)`: Gán trực tiếp dữ liệu từ PostgreSQL query vào `memoryStore` (loại bỏ điều kiện `if (rows.length > 0)` để khi bảng có 0 records, `memoryStore` phản ánh chính xác 0 records).
4. **Backend Server (Port 5000)**:
   - Đã khởi động lại server với cấu hình và kết nối database mới, đồng bộ 100% với PostgreSQL.

---

## 4. Thông Tin Tài Khoản Sẵn Sàng Kiểm Thử CRUD

Mật khẩu mặc định cho tất cả tài khoản: `Paradise@123`

| Vai trò | Họ và Tên | Mã định danh | Số điện thoại | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **Quản trị viên (QTV)** | Quản Trị Viên | `QTV` | `0900000001` | Toàn quyền hệ thống, 2FA SMS OTP (Dev OTP hiển thị trên màn hình/API) |
| **Lễ tân** | Nguyễn Thị Mai | `LT-Q1` | `0900000002` | Chi nhánh Quận 1 |
| **Huấn luyện viên (PT)** | Nguyễn Văn Thể | `PT001` | `0900000003` | Chi nhánh Quận 1 |
| **Huấn luyện viên (PT)** | Lê Văn Hùng | `PT002` | `0900000004` | Chi nhánh Quận 1 |
| **Huấn luyện viên (PT)** | Trần Bảo Ngọc | `PT003` | `0900000005` | Chi nhánh Bình Thạnh |
| **Huấn luyện viên (PT)** | Hoàng Đức Nam | `PT004` | `0900000006` | Chi nhánh Thủ Đức |
| **Hội viên (Member)** | Lê Hoàng Nam | `HV001` | `0987654321` | Chi nhánh Quận 1 |
| **Hội viên (Member)** | Trần Thị Bình | `HV002` | `0902345678` | Chi nhánh Quận 1 |
| **Hội viên (Member)** | Phạm Minh Trí | `HV003` | `0913456789` | Chi nhánh Bình Thạnh |

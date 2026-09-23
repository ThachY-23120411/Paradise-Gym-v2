# Kế Hoạch Triển Khai: Màn Hình Tập Trung Nhiều Tab Cho Hồ Sơ Hội Viên & Hồ Sơ Huấn Luyện Viên (W02 & W05)

## 1. Mục Tiêu & Yêu Cầu Người Dùng

Theo yêu cầu từ Người Dùng:
> "Trong menu Hội viên & khách hàng và menu Huấn luyện viên của web QTV/LT, khi click chọn vào 1 hội viên hoặc PT trên data grid view thì nếu:
> - **Hồ sơ PT:** Màn hình tập trung hiển thị thông tin cá nhân, danh sách hội viên đang phụ trách, lịch dạy, lịch sử dạy, lịch sử check-in/out và tổng hoa hồng đã nhận.
> - **Hồ sơ Hội viên:** Xem thông tin cá nhân, gói tập đang sử dụng, lịch sử đi tập (check-in).
> Và màn hình này hiện ra chứa nhiều tab."

---

## 2. Thiết Kế Chi Tiết Các Tab

### 2.1. Hồ Sơ Huấn Luyện Viên (PT Profile — Menu W05 `#trainers`)
Kích hoạt khi: Click vào bất kỳ hàng nào trên DataGrid PT (`onRowClick`), click vào `pt_code` hoặc click nút thao tác `card`.
Hiển thị: Modal / Drawer tập trung kích thước lớn (880px), thanh Header thông tin HLV + Thẻ tóm tắt chỉ số nhanh (Metric summary):
- **Header Card & Metric Summary:**
  * Avatar PT chân dung, Họ và tên, Mã PT, Chi nhánh phục vụ, Badge trạng thái (`Đang hoạt động`/`Ngừng hoạt động`), Badge nhận diện khuôn mặt.
  * 3 thẻ tóm tắt nhanh:
    1. **Hội viên phụ trách:** Số lượng hội viên/gói đang hoạt động.
    2. **Số buổi đã dạy:** Tổng buổi dạy `COMPLETED` trong lịch sử.
    3. **Tổng hoa hồng đã nhận:** Tổng số tiền hoa hồng lũy kế trạng thái `PAID` (₫).
  * Nút hành động trên Toolbar: `[Sửa hồ sơ PT]`, `[Đổi trạng thái]`, `[Bàn giao học viên]`.
- **Tab 1: Thông tin cá nhân (`personal_info`):**
  * Form chi tiết 2 cột (ReadOnly): Mã PT, Họ tên, SĐT, Email, Chi nhánh, Giới tính, Khung giờ làm việc (`08:00 - 18:00`), Ngày làm việc (`Thứ Hai - Thứ Sáu`), Chuyên môn / Chứng chỉ / Bio, Thông tin tài khoản ngân hàng (nếu có: Ngân hàng, STK, Tên chủ TK).
- **Tab 2: Hội viên đang phụ trách (`assigned_members`):**
  * Tải từ API `GET /registrations?pt_id=:pt_id` (với header `x-branch-id: 'ALL'`).
  * DataGrid hiển thị: Mã HV, Họ tên HV (kèm avatar), SĐT, Gói tập, Mã hợp đồng, Số buổi (Tổng / Đã dùng / Còn lại), Hạn gói tập, Badge trạng thái gói (`ACTIVE`, `FROZEN`, `EXPIRING`, `EXPIRED`).
- **Tab 3: Lịch dạy (`schedule`):**
  * Tải từ API `GET /pt-bookings?pt_id=:pt_id`.
  * Lọc các buổi sắp diễn ra hoặc đang chờ xử lý (`BOOKED`, `AWAITING_CONFIRMATION`, `PENDING_COMPLETION`).
  * DataGrid hiển thị: Ngày tập, Khung giờ, Hội viên, SĐT, Chi nhánh, Gói tập, Thứ tự buổi, Trạng thái.
- **Tab 4: Lịch sử dạy (`history`):**
  * Lọc các buổi đã hoàn thành (`COMPLETED`) hoặc lịch sử (`CANCELLED`, `NO_SHOW`).
  * DataGrid hiển thị: Ngày tập, Khung giờ, Hội viên, Thứ tự buổi, Nội dung bài tập & mức tạ (`workout_notes`), Đánh giá thể lực PT (`fitness_assessment`), Thời gian xác nhận kép (PT & HV), Trạng thái.
- **Tab 5: Lịch sử check-in/out (`checkin`):**
  * Tải từ API `GET /access-gate/logs?pt_id=:pt_id`.
  * DataGrid hiển thị: Thời gian quẹt thẻ, Chi nhánh, Chiều ra/vào (`VÀO`/`RA`), Điểm quét (Cổng / Thiết bị), Phương thức (Face ID, QR, Thẻ từ, Thủ công), Trạng thái hợp lệ.
- **Tab 6: Tổng hoa hồng đã nhận (`commissions`):**
  * Tải từ API `GET /commissions?pt_id=:pt_id`.
  * Khối tổng quan: Thẻ nổi bật **Tổng hoa hồng đã nhận: [Số tiền ₫]** tính trên các bản ghi `PAID`, số kỳ hoa hồng, tổng buổi dạy.
  * DataGrid danh sách các kỳ: Kỳ (Tháng/Năm), Số buổi dạy, Doanh thu chia sẻ, Tỷ lệ hoa hồng (%), Tiền hoa hồng (₫), Trạng thái (`PAID`, `PENDING_CONFIRMATION`, `APPROVED`), Ngày chi trả, Ngày PT xác nhận nhận tiền.

---

### 2.2. Hồ Sơ Hội Viên (Member Profile — Menu W02 `#members`)
Kích hoạt khi: Click vào bất kỳ hàng nào trên DataGrid Hội viên (`onRowClick`), click vào `member_code` hoặc click mở chi tiết.
Hiển thị: Modal / Drawer tập trung (840px), cấu trúc các tab chuẩn hóa:
- **Header Card & Quick Actions:**
  * Avatar hội viên, Họ tên, Mã HV, SĐT, Email, Chi nhánh tiếp nhận, Badge trạng thái hồ sơ, Badge đăng ký khuôn mặt.
  * Nút hành động nhanh: `[Sửa hồ sơ]`, `[Đổi trạng thái]`, `[Đăng ký gói]`, `[Xem mã QR]`, `[Thu thập khuôn mặt]`.
- **Tab 1: Thông tin cá nhân (`profile`):**
  * Form chi tiết: Mã HV, Họ và tên, Số điện thoại, Email, Chi nhánh tiếp nhận, Ngày sinh, Giới tính, Mã QR Check-in, Ngày tham gia hệ thống, Trạng thái nhận diện sinh trắc học.
- **Tab 2: Gói tập đang sử dụng (`registrations`):**
  * Tải từ dữ liệu hợp đồng hội viên (`registrations`).
  * DataGrid hiển thị: Mã hợp đồng (`reg_code`), Tên gói tập (`package_name_snapshot`), Ngày bắt đầu, Ngày hết hạn, Lượt Gym còn lại, Buổi PT còn lại, Huấn luyện viên phụ trách (`pt_name`), Trạng thái gói tập (`Đang hiệu lực`, `Đang đóng băng`, `Sắp hết hạn`, `Đã hết hạn`).
- **Tab 3: Lịch sử đi tập (check-in) (`access_logs`):**
  * Tải từ API `GET /access-gate/logs?member_id=:member_id`.
  * Tích hợp bộ chọn ngày xem lịch sử (`dxDateBox`) và xem toàn bộ lịch sử ra vào.
  * DataGrid hiển thị: Thời gian quẹt thẻ, Chi nhánh, Chiều Vào/Ra (`IN`/`OUT`), Phương thức ra vào (Khuôn mặt, Thẻ từ, Mã QR, Thủ công), Cổng/Thiết bị điểm quét, Trạng thái hợp lệ / Từ chối kèm lý do.
- **Tab 4: Lịch tập PT (`bookings`):**
  * Danh sách các buổi tập PT của hội viên: Ngày tập, Khung giờ, Huấn luyện viên, Trạng thái buổi tập.
- **Tab 5: Đồng ý & Nhận diện (`consents`):**
  * Trạng thái đồng ý bảo mật sinh trắc học và lịch sử đồng ý / rút đồng ý.

---

## 3. Các Thành Phần Thay Đổi Mã Nguồn (Proposed Changes)

### 3.1. Database & Backend
1. **[NEW] `backend/src/db/migrations/020_pt_access_logs.sql`:**
   - Cho phép `access_logs.member_id` nhận giá trị `NULL`.
   - Bổ sung cột `pt_id UUID NULL REFERENCES pt_profiles(id) ON DELETE CASCADE` vào bảng `access_logs`.
   - Ràng buộc kiểm tra `CHECK (member_id IS NOT NULL OR pt_id IS NOT NULL)`.
   - Tạo index `idx_access_logs_pt ON access_logs(pt_id, check_in_time DESC)`.
2. **[MODIFY] `docs/database/erd.md`:**
   - Đồng bộ 100% cột `pt_id` mới trong bảng `access_logs` và mối quan hệ `pt_profiles ||--o{ access_logs : "checks_in_at"`.
3. **[MODIFY] `backend/src/modules/core/operations.js`:**
   - Trong `accessLogs(req)`: Hỗ trợ lọc theo `req.query.pt_id`. `LEFT JOIN pt_profiles pt ON pt.id = l.pt_id` để trả về thông tin PT khi quét thẻ.
4. **[MODIFY] `backend/src/db/seed.js`:**
   - Bổ sung dữ liệu seed check-in/out mẫu cho các PT đang hoạt động tại các chi nhánh (vào ca 07:50 - ra ca 18:10) đảm bảo 100% dữ liệu động từ PostgreSQL, không mock data.

### 3.2. Frontend Web Admin (`frontend/web/`)
1. **[MODIFY] `frontend/web/js/modules/members.js`:**
   - Cập nhật DataGrid `grid`: Thêm sự kiện `onRowClick: e => { if (e.rowType === 'data') openDetail(e.data.id); }`.
   - Cập nhật `openDetail(id)`: Thiết kế TabPanel rõ ràng gồm: Tab 1 "Thông tin cá nhân", Tab 2 "Gói tập đang sử dụng", Tab 3 "Lịch sử đi tập (Check-in)", Tab 4 "Lịch tập PT", Tab 5 "Đồng ý bảo mật & Face ID".
2. **[MODIFY] `frontend/web/js/modules/ptScheduler.js`:**
   - Cập nhật DataGrid `trainersGrid`:
     * Thêm `onRowClick: e => { if (e.rowType === 'data') showTrainerDetail(state, e.data); }`.
     * Cột `pt_code` hiển thị dạng liên kết bấm mở `showTrainerDetail`.
   - Tái cấu trúc hàm `showTrainerDetail(state, pt)`:
     * Nạp đồng thời thông tin PT, hợp đồng đang phụ trách (`/registrations?pt_id=...`), lịch tập (`/pt-bookings?pt_id=...`), nhật ký ra vào (`/access-gate/logs?pt_id=...`), hoa hồng (`/commissions?pt_id=...`).
     * Hiển thị Header Card + 3 Metric Cards (HV phụ trách, Buổi đã dạy, Tổng hoa hồng đã nhận).
     * Render `dxTabs` với 6 tab:
       1. **Thông tin cá nhân**
       2. **Hội viên đang phụ trách**
       3. **Lịch dạy**
       4. **Lịch sử dạy**
       5. **Lịch sử check-in/out**
       6. **Tổng hoa hồng đã nhận**
3. **[MODIFY] `frontend/web/index.html`:**
   - Bump version cache buster cho `members.js?v=...` và `ptScheduler.js?v=...`.

---

## 4. Kế Hoạch Kiểm Thử (Verification Plan)

### Automated Tests (Puppeteer E2E)
- Tạo kịch bản kiểm thử E2E: `tests/e2e/test_profile_multitabs.js`:
  1. Đăng nhập QTV vào web admin.
  2. **Kiểm thử Menu Hội viên & khách hàng (`#members`):**
     - Click vào 1 hàng bất kỳ trên DataGrid hội viên.
     - Xác minh mở màn hình tập trung với các tab: Thông tin cá nhân, Gói tập đang sử dụng, Lịch sử đi tập (check-in).
     - Chuyển giữa các tab và xác minh DataGrid từng tab hiển thị đúng dữ liệu động từ PostgreSQL.
     - Chụp screenshot bằng chứng: `verify-member-detail-multitabs.png`.
  3. **Kiểm thử Menu Huấn luyện viên (`#trainers`):**
     - Click vào 1 hàng bất kỳ trên DataGrid PT (hoặc click mã PT).
     - Xác minh mở màn hình tập trung với Header tóm tắt (3 Metric Cards: HV phụ trách, Buổi đã dạy, Tổng hoa hồng đã nhận).
     - Kiểm tra đầy đủ 6 tab: Thông tin cá nhân, Danh sách hội viên đang phụ trách, Lịch dạy, Lịch sử dạy, Lịch sử check-in/out, Tổng hoa hồng đã nhận.
     - Chuyển qua từng tab, kiểm tra dữ liệu DataGrid tải động từ API.
     - Chụp screenshot bằng chứng: `verify-trainer-detail-multitabs.png`.

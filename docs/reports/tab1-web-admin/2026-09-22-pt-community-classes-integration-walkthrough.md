# Walkthrough: Tích Hợp Lớp Học Cộng Đồng Vào Lịch Huấn Luyện Viên (W06) & Hồ Sơ PT (W05)

## 1. Mục Tiêu Nghiệp Vụ & Yêu Cầu Cải Tiến
Theo yêu cầu từ Người Dùng:
1. **Làm rõ cấu trúc Tỷ trọng đóng góp gói dịch vụ (W10 BI):** Giữ nguyên tỷ trọng đóng góp theo **từng sản phẩm gói tập cụ thể** (Tên gói: PT 30 buổi, Gym 3 tháng, Combo VIP...) thay vì gộp nhóm loại gói.
2. **Cơ chế Thù lao lớp cộng đồng vs Hoa hồng PT:** Tách bạch hạch toán chi phí hoạt động nhưng đề xuất hợp nhất vào Bảng kê chi trả thu nhập hàng tháng để QTV duyệt chi qua VietQR 1 lần và HLV xác nhận 2 chiều.
3. **Ghi nhận lịch sử dạy lớp cộng đồng của Huấn luyện viên:** Bổ sung tab chuyên biệt "Lớp cộng đồng" và mini-card thống kê trong Hồ sơ Huấn luyện viên (W05).
4. **Hiển thị lớp cộng đồng trên Calendar Lịch PT (W06):** Khóa khung giờ, chống đặt trùng (anti double-booking) giữa lịch dạy 1:1 và lớp học nhóm.
5. **Điều kiện lọc Huấn luyện viên rảnh khi mở lớp:** Khi tạo lịch lớp cộng đồng, chỉ hiển thị HLV thuộc đúng chi nhánh tổ chức và hoàn toàn rảnh trong khung giờ (không trùng lịch dạy 1:1 và không trùng lớp cộng đồng khác).

---

## 2. Các Thay Đổi Kiến Trúc & Kỹ Thuật

### 2.1. Backend Core API (`backend/src/modules/core/community.js`):
- **API `GET /community-classes/available-instructors`:**
  - Nhận tham số: `branch_id`, `class_date`, `start_time`, `end_time`, `exclude_class_id`.
  - Lọc chính xác các HLV thuộc chi nhánh (`p.branch_id = $1 AND p.status = 'ACTIVE'`).
  - Kiểm tra xung đột đa chiều:
    * `NOT EXISTS` trong `pt_bookings` (`booking_date = $date AND status <> 'CANCELLED' AND start_time < $end AND end_time > $start`).
    * `NOT EXISTS` trong `community_classes` (`class_date = $date AND status <> 'CANCELLED' AND start_time < $end AND end_time > $start`).
- **Nâng cấp `GET /community-classes`:**
  - Hỗ trợ tham số truy vấn: `instructor_id`, `date_from`, `date_to`.
  - Cho phép tra cứu nhanh lịch sử đứng lớp cộng đồng của một PT cụ thể hoặc tải toàn bộ lớp trong khoảng ngày hiển thị của Calendar.

### 2.2. Frontend Web Admin (`frontend/web/js/modules/community.js`):
- Modal tạo lớp học cộng đồng (`openCreateClassModal`):
  - Tích hợp hàm `reloadAvailableTrainers()` tự động gọi API `/community-classes/available-instructors` mỗi khi thay đổi Chi nhánh, Ngày học, Giờ bắt đầu hoặc Thời lượng bộ môn.
  - Tự động hủy chọn và thông báo nếu khung giờ mới khiến HLV đã chọn bị trùng lịch.

### 2.3. Frontend Web Admin (`frontend/web/js/modules/ptScheduler.js`):
- **Hồ sơ Huấn luyện viên (`showTrainerDetail` - W05):**
  - Bổ sung menu item thứ 6: `Lớp cộng đồng` (kèm badge hiển thị tổng số lớp đã dạy).
  - Tab Tổng quan (Overview): Bổ sung thẻ KPI mini `Lớp cộng đồng đã dạy: X lớp (Thù lao: Y đ)`.
  - Tab Lớp cộng đồng: DataGrid chi tiết hiển thị: Ngày dạy, Khung giờ, Tên lớp & Bộ môn, Chi nhánh, Sĩ số học viên (`enrolled/max`), Thù lao nhận được (`base_price + bonus_amount`), Trạng thái và dòng tổng kết số lớp.
- **Calendar Lịch PT (`ptScheduler.js` - W06):**
  - Hàm `loadSchedule`: Tải đồng thời `pt-bookings` và `community-classes` của HLV trong dải ngày hiển thị.
  - Hàm `getAllAppointments`: Ánh xạ các lớp cộng đồng thành appointments đặc thù (`is_community_class: true`).
  - Hàm `checkCollision`: Chống đặt lịch hoặc kéo thả lịch 1:1 đè lên khung giờ lớp cộng đồng.
  - Thẻ lịch hẹn lớp cộng đồng: Thiết kế màu tím Gradient sang trọng (`#4c1d95` / `#7c3aed`), nhãn `[LỚP CỘNG ĐỒNG]`, sĩ số học viên và mức thù lao.
  - Tương tác: Click vào thẻ lớp cộng đồng hiển thị hộp thoại thông tin chi tiết kèm cảnh báo bảo lưu khung giờ.

---

## 3. Kết Quả Kiểm Thử E2E (Puppeteer Verification)
Đã thực thi kiểm thử tự động toàn diện qua file `tests/e2e/test_pt_community_integration.cjs` trên dữ liệu thực tế:
1. **Hồ sơ HLV PT002 (Lê Văn Hùng):**
   - Mở popup hồ sơ, nạp đầy đủ thông tin từ DB.
   - Xác nhận Tab "Lớp cộng đồng" hiển thị đầy đủ 93 lớp đã đứng lớp kèm mức thù lao chi tiết từng ca dạy.
   - Hình ảnh bằng chứng: `verify_trainer_profile_community_tab.png`.
2. **Calendar Lịch PT (W06) của HLV PT002:**
   - Ngày 21/09/2026 hiển thị 3 lớp cộng đồng:
     * 06:30 - 07:30: Yoga Trị Liệu Trâm (Thù lao 295.000 đ)
     * 08:00 - 09:00: Cardio HIIT Tuấn (Thù lao 300.000 đ)
     * 09:30 - 10:30: Zumba Gold Joy (Thù lao 235.000 đ)
   - Hình ảnh bằng chứng: `verify_calendar_pt_with_community_classes.png`.
3. **Hộp thoại chi tiết Lớp học cộng đồng:**
   - Click thẻ lớp cộng đồng mở dialog popup hiển thị chi tiết tên lớp, bộ môn, thời gian, chi nhánh, sĩ số và thù lao HLV.
   - Hình ảnh bằng chứng: `verify_calendar_community_class_detail_dialog.png`.

---

## 4. Tinh Chỉnh Giao Diện Thẻ Lớp & Bổ Sung Nút Xem Danh Sách Hội Viên (Phản Hồi Người Dùng)

### 4.1. Nguyên Nhân & Cách Khắc Phục Lỗi "2 Đường Sọc":
- **Nguyên nhân gốc rễ:** Thẻ hẹn DevExtreme Scheduler (`.dx-scheduler-appointment.pt-appointment-community`) đã có `border-left: 5px solid #a78bfa !important;` được thiết lập ở CSS bao ngoài và trong hook `onAppointmentRendered`. Đồng thời, trong template HTML nội bộ của thẻ (`.pt-community-card-body`), trước đó lại đặt thêm một thuộc tính `border-left: 4px solid #a78bfa;` cùng với padding/margin riêng. Kết quả là trên trình duyệt xuất hiện 2 đường sọc dọc màu tím song song cách nhau một khe hở nhỏ.
- **Giải pháp:** 
  - Đã loại bỏ hoàn toàn `border-left` bên trong `.pt-community-card-body` (đặt `border: none !important; border-left: none !important; background: transparent !important;`).
  - Giữ lại duy nhất 1 đường viền accent dày 5px màu tím `#a78bfa` ở mép ngoài cùng của thẻ hẹn, đồng bộ hoàn hảo với chuẩn thiết kế chung của các thẻ lịch PT 1:1 (xanh dương, vàng cam, xanh ngọc).

### 4.2. Bổ Sung Nút "Xem Danh Sách Hội Viên" & Popup DataGrid:
- **Nút trên thẻ lịch:**
  - Thêm nút `<button class="pt-btn-community-members">` ngay bên cạnh badge sĩ số (ví dụ: `15/35 HV [ Xem danh sách hội viên ]`).
  - Nút sử dụng icon `fa-list-check`, nền tím mờ `rgba(255,255,255,0.18)`, chữ trắng rõ nét, hiệu ứng hover mượt mà.
  - Khi click vào nút (hoặc click vào thân thẻ), hệ thống gọi hàm `openCommunityClassDetailModal(state, booking)` để mở popup.
- **Hộp thoại Danh sách hội viên (`dxPopup` & `dxDataGrid`):**
  - Banner tổng quan: Tên lớp, Bộ môn, Khung giờ, HLV phụ trách, Chi nhánh, Thù lao và Sĩ số hiện tại.
  - DataGrid chi tiết: Nạp dữ liệu thực tế từ API `GET /api/v1/community-classes/:id/members` gồm các cột:
    * `STT` (Tự động đánh số thứ tự 1, 2, 3...)
    * `Mã HV` (Badge xanh lá nhẹ: `HV009`, `HV010`,...)
    * `Họ và tên` (Chữ đậm)
    * `Số điện thoại`
    * `Thời điểm đăng ký` (Format: `dd/MM/yyyy HH:mm`)
    * `Trạng thái` (Badge xanh lá `Đã đăng ký` với icon check)
  - Đầy đủ phân trang (`dxDataGrid` pager) và nút Đóng.

### 4.3. Minh Chứng Xác Thực Giao Diện Thực Tế (E2E Screenshots):
- **Thẻ lịch lớp cộng đồng chuẩn 1 vạch accent & có nút xem DS hội viên:**
  `verify_community_card_single_stripe_with_button.png`
- **Modal danh sách 15 hội viên đã đăng ký lớp Cardio HIIT Toàn Thân:**
  `verify_community_class_members_modal.png`


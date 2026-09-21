# Walkthrough — Chuẩn Hóa Trạng Thái Gói Tập & Modal Đóng Băng (QTV/LT & Mobile Hội Viên)

**Ngày thực hiện:** 21/09/2026  
**Phân hệ phụ trách:** Web Admin Lead (`anti-1-QTV-LT`) & Mobile Member Lead (`anti-2-HV`)  
**Trạng thái kiểm thử:** ✅ PASSED 100% trên giao diện thật (Headless Chrome E2E).

---

## 1. Yêu Cầu & Mục Tiêu

1. **Chuẩn hóa danh mục trạng thái gói tập trên Mobile Hội viên (`#packages/mine`):**
   - Bổ sung và hiển thị đầy đủ 8 trạng thái đồng bộ với hệ thống:
     * `Tất cả (ALL)`
     * `Đang sử dụng (ACTIVE)`
     * `Chưa đến ngày hiệu lực (SCHEDULED)`
     * `Sắp hết hạn (EXPIRING)`
     * `Đang đóng băng (FROZEN)`
     * `Chờ thanh toán (PENDING_PAYMENT)`
     * `Đã hết hạn (EXPIRED)`
     * `Đã hủy (CANCELLED)`
   - Hiển thị số đếm thời gian thực (live count) trên từng nút lọc trạng thái.
   - Badge trên thẻ gói tập và modal chi tiết hiển thị đúng màu sắc và nhãn tiếng Việt (`Đang sử dụng`, `Chờ thanh toán`, `Sắp hết hạn`, `Đang đóng băng`,...).

2. **Loại bỏ hoàn toàn trạng thái "Chờ đóng băng" (`SCHEDULED_FREEZE`):**
   - Loại bỏ khái niệm đóng băng hẹn ngày tương lai trên toàn bộ hệ sinh thái (Web Admin, Mobile Member, Mobile PT, Backend REST API, Database ERD và User Stories).
   - Đóng băng gói tập là hành động kích hoạt ngay lập tức tại thời điểm thao tác.

3. **Cải tiến Modal Đóng Băng Gói Tập (Web Admin & Lễ Tân):**
   - Trường **Ngày bắt đầu đóng băng (`start_date`)**: Cố định `readOnly: true`, giá trị mặc định là ngày hiện tại (`today()`), không cho phép chỉnh sửa ngày bắt đầu trong quá khứ hoặc tương lai.
   - Hai trường **Số ngày tạm dừng / đóng băng (`freeze_days`)** và **Ngày mở lại dự kiến (`reactivate_date`)** đồng bộ tương hỗ 2 chiều với ngày hiện tại.
   - **Loại bỏ 100% hộp nhắc nhở / callout gợi ý** (`$summarySec` / "Trạng thái sau khi lưu: ❄ Kích hoạt đóng băng... Hạn dùng mới dự kiến...") theo đúng quy chuẩn Rule 3 trong `AGENTS.md` (Giao diện Web Admin dành cho quản lý chuyên nghiệp, tinh gọn, không info callouts/hints).

---

## 2. Chi Tiết Thay Đổi Code

### 2.1. Backend Core & Database
- `backend/src/modules/core/registrationState.js`:
  - Chuẩn hóa hàm `effective(r)`: kiểm tra `r.is_frozen` trả về trực tiếp `FROZEN`, loại bỏ `SCHEDULED_FREEZE`.
- `backend/src/modules/core/commerce.js`:
  - `autoResolveFreezes()`: Chỉ xử lý giải băng (unfreeze) tự động khi `pf.end_date <= CURRENT_DATE`.
  - `listRegistrations()`: Bỏ query `has_scheduled_freeze`, sửa lỗi tham chiếu `payments` (bảng `payments` không có cột `status` theo migration 014).
  - `POST /registrations/:id/freeze`: Luôn ghi nhận `start_date = today()`, `status = 'ACTIVE'`, kích hoạt `is_frozen = true`, audit log `PACKAGE_FROZEN`.
- `backend/src/modules/core/bookings.js`:
  - Xóa bỏ kiểm tra `SCHEDULED_FREEZE` trong điều kiện hợp lệ đặt lịch PT.

### 2.2. Web Admin (`frontend/web/js/modules/sales.js`)
- Loại bỏ nhãn `SCHEDULED_FREEZE: 'Chờ đóng băng'` khỏi `registrationStatuses` và `badge()`.
- Xóa bỏ các nhánh logic cho phép thao tác hợp đồng `SCHEDULED_FREEZE`.
- Trong `openFreezeModal()`:
  - Khóa trường `start_date`: `readOnly: true`, giá trị = `todayDate`.
  - Xóa toàn bộ `$summarySec`, `$statusPreview`, `$endDatePreview`, `updatePreview()`.
  - Giữ lại đúng 4 trường chuẩn DevExtreme: `start_date`, `freeze_days`, `reactivate_date`, `reason` và 2 nút bấm chuẩn ("Hủy", "Xác nhận đóng băng").

### 2.3. Mobile Member (`frontend/mobile/member/js/packages-notifications.js`)
- Bổ sung helpers `isPending(r)` và `nearExpiry(r)`.
- Mở rộng thanh lọc gói tập `filterItems` hiển thị đủ 8 trạng thái kèm đếm số lượng thời gian thực.
- Cập nhật card template và modal chi tiết hiển thị badge trạng thái chuẩn tiếng Việt.

### 2.4. Mobile PT (`frontend/mobile/pt/js/`)
- `schedule.js` & `clients.js`: Loại bỏ `SCHEDULED_FREEZE` khỏi danh sách trạng thái hợp đồng PT.

### 2.5. Tài Liệu Đặc Tả & User Stories
- Cập nhật `docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US06-Đóng băng gói tập.md` & `docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US06-Đóng băng gói tập.md`:
  - Bảng Field-level specification: `start_date` có Input state là `READONLY`, Pre-filled `today()`.
  - Cập nhật Main Flow và Activity Diagram Swimlane UML loại bỏ nhánh tương lai.
- Đồng bộ `docs/product-spec.md`, `docs/epic/pt/PT02-Học viên.md`, `docs/user-stories/pt/PT02-US01` và `docs/database/erd.md`.

---

## 3. Bằng Chứng Kiểm Thử Giao Diện Thực Tế (E2E Screenshots)

### 3.1. Web Admin — Modal Đóng Băng Gói Tập
- **Ảnh bằng chứng:** `verify_web_admin_freeze_modal.png`
- **Kết quả xác nhận:**
  - Hợp đồng: `DK-2026-09-011` (Vũ Minh Phúc)
  - Ngày bắt đầu đóng băng: `21/09/2026` (Input màu nhạt `readOnly: true`, không thể sửa).
  - Số ngày tạm dừng: `7` ngày.
  - Ngày mở lại dự kiến: `28/09/2026`.
  - Không còn bất kỳ khung nhắc nhở hay chữ gợi ý nào bên dưới form.

### 3.2. Mobile Hội Viên — Màn Hình "Gói Của Tôi"
- **Ảnh bằng chứng:** `verify_mobile_member_packages_mine.png`
- **Kết quả xác nhận:**
  - 8 nút lọc trạng thái hiển thị đầy đủ và chuẩn xác:
    * `Tất cả (18)`
    * `Đang sử dụng (11)`
    * `Chưa đến ngày hiệu lực (0)`
    * `Sắp hết hạn (0)`
    * `Đang đóng băng (0)`
    * `Chờ thanh toán (6)`
    * `Đã hết hạn (0)`
    * `Đã hủy (1)`
  - Tổng số lượng khớp chính xác 100% với cơ sở dữ liệu (11 + 6 + 1 = 18).
  - Thẻ gói tập hiển thị rõ badge `Đang sử dụng`, tiến độ buổi tập PT và nút `❄ Đóng băng`.

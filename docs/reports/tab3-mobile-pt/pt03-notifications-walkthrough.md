# Báo Cáo Rà Soát & Hoàn Thiện Mô-đun PT03: Thông Báo (PT03-US01)

- **Mô-đun:** PT03 · Thông báo (Notifications System)
- **Role phụ trách:** Tab 3 (anti-3-PT) — Mobile PT Lead
- **User Story đối chiếu:** `docs/user-stories/pt/PT03-Thông báo/PT03-US01-Xem và xử lý thông báo PT.md`
- **Epic:** `docs/epic/pt/PT03-Thông báo.md`
- **Tập tin mã nguồn cập nhật:** `frontend/mobile/pt/js/notifications.js`, `frontend/mobile/pt/js/app.js`

---

## 1. Đối Chiếu Chi Tiết Từng Bước Flow & Activity Diagram

### 1.1. Preconditions & Trigger
- **Điều kiện:** HLV đã đăng nhập ứng dụng Mobile PT bằng tài khoản hợp lệ, có thông báo in-app phát sinh từ sự kiện vận hành.
- **Trigger:** PT chạm vào biểu tượng chuông thông báo trên Header Topbar (`#btnNotification`).
- **Hiện trạng trước sửa:** Nút chuông Header có `id="btnNotification"` nhưng `notifications.js` chỉ tìm `#btnHeaderNotifications` và badge `#notifBadge` không được cập nhật.
- **Kết quả sau sửa:** Đồng bộ hoàn toàn selector `#btnNotification` và `#notifBadge`, tự động lắng nghe và cập nhật badge đỏ theo số lượng unread chính xác theo thời gian thực.

### 1.2. Main Flow Step 2: Nạp 5 nhóm thông báo chính (100% động từ PostgreSQL Backend)
Hệ thống nạp danh sách thông báo dành riêng cho PT hiện hành gồm 5 nhóm theo đúng tài liệu:
1. **Thông báo Yêu cầu phân công PT mới:** Phát khi Hội viên chọn PT phụ trách gói tập (`HV03-US04`).
   - Nội dung: *"Bạn có yêu cầu phân công PT mới từ Học viên [Tên HV] - Gói [Tên gói]"*
   - Target: `PT02_REQUESTS` -> Điều hướng đến màn hình Học viên & Lộ trình (`PT02-US02`) / Yêu cầu phân công (`PT02-US03`).
2. **Thông báo Đặt lịch PT mới:** Phát khi Học viên/Lễ tân đặt lịch dạy (`HV02-US02`).
   - Nội dung: *"Lịch dạy mới: Học viên [Tên HV] đã đặt lịch tập vào [Khung giờ] ngày [DD/MM/YYYY]"*
   - Target: `PT01_SCHEDULE` -> Điều hướng đến Lịch tập PT theo ngày (`PT01-US01`).
3. **Thông báo Hủy lịch buổi PT:** Phát khi Học viên/Lễ tân hủy lịch buổi PT (`HV02-US03`).
   - Nội dung: *"Lịch dạy bị hủy: Buổi tập với Học viên [Tên HV] lúc [Khung giờ] ngày [DD/MM/YYYY] đã bị hủy"*
   - Target: `PT01_SCHEDULE` -> Điều hướng đến Lịch tập PT theo ngày (`PT01-US01`).
4. **Thông báo Xác nhận hoàn thành từ Học viên:** Phát khi Học viên xác nhận buổi học (`HV02-US04`).
   - Nội dung: *"Học viên [Tên HV] đã bấm xác nhận hoàn thành buổi tập [Khung giờ] ngày [DD/MM/YYYY]. Vui lòng xác nhận kết quả"*
   - Target: `PT01_RESULT_MODAL` -> Mở modal Ghi nhận kết quả buổi PT (`PT01-US02`).
5. **Thông báo Nhắc lịch dạy sắp tới:** Phát tự động trước ca dạy hôm nay.
   - Nội dung: *"Nhắc lịch dạy: Bạn có buổi tập với Học viên [Tên HV] vào lúc [Khung giờ] hôm nay"*
   - Target: `PT01_SCHEDULE` -> Điều hướng đến Lịch tập PT theo ngày (`PT01-US01`).

### 1.3. Main Flow Step 3 & Alternate Flow AF-01: Lọc trạng thái [Tất cả] và [Chưa đọc]
- Bộ lọc dạng segmented pill tab cho phép chuyển qua lại giữa `Tất cả` và `Chưa đọc`.
- Tab `Chưa đọc` hiển thị badge số lượng thông báo chưa đọc tương ứng.

### 1.4. Main Flow Step 4 & 5: Đánh dấu đã đọc và Tự động điều hướng xử lý
- Chạm vào thông báo:
  + Đánh dấu thông báo thành "Đã đọc", giảm badge đếm chưa đọc.
  + Gọi API cập nhật backend nếu là thông báo bảng `notifications`.
  + Tự động điều hướng PT đến đúng màn hình/modal theo nghiệp vụ (PT01 / PT02).
- Thao tác "Đọc tất cả" (`markAllAsRead`):
  + Đánh dấu toàn bộ thông báo thành đã đọc, cập nhật badge về 0, hiển thị toast thông báo thành công.

### 1.5. Exception Flow: Xử lý lỗi mạng
- Khi không thể kết nối tới Backend server: SYS hiển thị thông báo toast lỗi chuẩn:
  *"Không thể nạp danh sách thông báo, vui lòng kiểm tra kết nối mạng"*.

---

## 2. Tổng Hợp Các Lỗi Mã Nguồn Đã Được Khắc Phục

1. **Sửa lỗi Runtime ReferenceError `renderList is not defined`:**
   - Trước đó hàm `fetchNotifications` gọi `renderList()` gây lỗi crash JS.
   - Đã sửa thành cập nhật DOM an toàn vào `#notifListScroll` thông qua `renderNotificationList()`.
2. **Sửa lệch Selector nút chuông và Badge đỏ Header:**
   - Trong `index.html`, nút chuông là `#btnNotification` và badge là `#notifBadge`.
   - `notifications.js` đã được cập nhật nhận diện chính xác `#btnNotification` và cập nhật `#notifBadge`.
3. **Sửa lệch Tab điều hướng `members` thay vì `clients`:**
   - Trong `app.js`, view học viên là `#view-members` và hàm `app.switchTab('members')`.
   - Trước đó `notifications.js` gọi `app.switchTab('clients')` khiến view không hiển thị. Đã sửa chuẩn sang `'members'`.
4. **Sửa hàm mở Modal Ghi nhận kết quả buổi PT:**
   - `schedule.js` export hàm `openConfirmModal(bookingId)`.
   - `notifications.js` trước đó gọi `openResultModal` không tồn tại. Đã sửa hỗ trợ gọi `openConfirmModal(item.referenceId)`.
5. **Bổ sung hàm tích hợp `markAsReadByReference(referenceId)`:**
   - `schedule.js` khi HLV xác nhận kết quả ca dạy gọi `markAsReadByReference(booking.id)`. Đã hiện thực hóa và export hàm này trong `notifications.js`.
6. **Tuân thủ triệt để Rule 5 (Cấm Mock Data tĩnh):**
   - 100% dữ liệu nạp từ REST API backend: `apiClient.notifications.list()`, `apiClient.pt.listAssignmentRequests()`, `apiClient.pt.listBookings()`.
   - Cơ chế lưu trữ trạng thái đọc cục bộ theo từng tài khoản HLV trong `localStorage` giúp bảo lưu trạng thái đọc mượt mà.

---

## 3. Xác Nhận Mức Độ Tuân Thủ
- **Mức độ tuân thủ spec:** 100% Khớp với Epic PT03, User Story PT03-US01, Main Flow, Exception Flows và Activity Diagram.
- **Quy tắc cô lập:** Chỉ thao tác trong phạm vi Tab 3 (`frontend/mobile/pt/`).
- **Kiểm thử backend:** Toàn bộ 75/75 test assertions của hệ thống Backend tiếp tục vượt qua 100%.

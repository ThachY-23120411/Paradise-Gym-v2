# Walkthrough: Cập Nhật Lưới Calendar Sang Bước 15 Phút (Hỗ Trợ Đặt Lịch Lúc 08:15, 08:30, 08:45...)

> **Thời điểm:** 2026-09-21  
> **Phân hệ phụ trách:** Web Quản Trị Viên & Lễ Tân (`anti-1-QTV-LT`)  
> **Mã tính năng liên đới:** QTV-W06-US01 & LT-W06-US01 (Lịch tập & buổi PT)

---

## 1. Yêu Cầu Nghiệp Vụ & Bối Cảnh

- **Yêu cầu từ Người Dùng:**
  > *"trong lưới này thì khoảng cách các mốc thời gian là 15p đi, nghĩa là có thể đặt 8h15 cũng được á"*
  > *(Kèm ảnh chụp màn hình cột thời gian Scheduler với các mốc cách nhau 30 phút trước đây)*

- **Mục tiêu kỹ thuật:**
  1. Điều chỉnh khoảng cách mỗi ô lưới (`cellDuration`) trên DevExtreme `dxScheduler` từ **30 phút** sang **15 phút**.
  2. Hiển thị rõ ràng các mốc thời gian 15 phút trên cột thời gian bên trái (`08:00`, `08:15`, `08:30`, `08:45`, `09:00`...).
  3. Cho phép người dùng click trực tiếp vào bất kỳ ô 15 phút nào (ví dụ ô `08:15`) trên Calendar để mở modal đặt lịch và tự động nhận `start_time = "08:15"`.
  4. Hỗ trợ tự động prefill giờ kết thúc theo thời lượng gói (ví dụ gói 120p, bắt đầu lúc 08:15 -> prefill 10:15).
  5. Cung cấp danh sách giờ kết thúc tùy chọn linh hoạt theo từng nấc 15 phút (`08:30`, `08:45`, `09:00`, `09:15`...).
  6. Áp dụng đồng bộ trên cả 3 chế độ xem: `day` (Ngày), `workWeek` (Tuần T2-T6), `week` (Toàn tuần).

---

## 2. Các Thay Đổi Kỹ Thuật Đã Thực Hiện

### 2.1. Cấu hình dxScheduler (`frontend/web/js/modules/ptScheduler.js`)
- **Khởi tạo ô lưới 15 phút:**
  ```javascript
  views: [
    { type: 'day', name: 'Ngày', intervalCount: 1, cellDuration: 15 },
    { type: 'workWeek', name: 'Tuần (T2-T6)', cellDuration: 15 },
    { type: 'week', name: 'Toàn tuần', cellDuration: 15 }
  ],
  cellDuration: 15, // 15 phút mỗi ô lưới
  ```
- **Template cột thời gian (`timeCellTemplate`):**
  - Căn giữa dọc chuẩn xác theo từng hàng 28px, không phụ thuộc vào vị trí viền hay `translateY(-50%)` gây đè chữ.
  - Phân cấp thị giác chuyên nghiệp:
    * Giờ chẵn (`m === '00'`): Font chữ đậm `font-weight: 700`, cỡ 12px, màu `#1e293b`.
    * Các mốc 15 phút (`m === '15'`, `'30'`, `'45'`): Font chữ thanh thoát `font-weight: 500`, cỡ 10.5px, màu `#64748b`.
- **Hỗ trợ khung giờ 15 phút đến cuối ngày:**
  - `generateStartTimeSlots`: hỗ trợ `endMinute = 45` để danh sách giờ bắt đầu có thể chọn đến `21:45`.

### 2.2. CSS Design Tokens (`frontend/web/css/web.css`)
- **Chuẩn hóa chiều cao ô lưới 15 phút:**
  ```css
  .dx-scheduler-cell-sizes-vertical { height: 28px !important; min-height: 28px !important; }
  .dx-scheduler-date-table-cell { height: 28px !important; min-height: 28px !important; }
  .dx-scheduler-time-panel-cell {
    height: 28px !important;
    min-height: 28px !important;
    vertical-align: middle !important;
    padding: 0 !important;
    position: relative !important;
    overflow: visible !important;
  }
  .pt-time-panel-label {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 4px;
    right: 4px;
    display: flex;
    align-items: center;
    z-index: 2;
    pointer-events: none;
    line-height: 1;
  }
  ```
  *Mỗi giờ gồm 4 hàng 28px = 112px/giờ, bảo đảm tỷ lệ hiển thị cân đối và giữ nguyên kích thước trực quan của các thẻ lịch tập 60p, 120p.*

### 2.3. Bumper Cache Version (`frontend/web/index.html`)
- `css/web.css?v=23`
- `js/modules/ptScheduler.js?v=20`

---

## 3. Kết Quả Kiểm Thử E2E Trực Quan (UI Thật)

Đã thực thi kiểm thử tự động toàn diện qua script Puppeteer `tests/e2e/test_click_0815.js`:

1. **Lưới lịch Calendar với các mốc 15 phút:**
   - Đã render thành công 64 mốc thời gian từ `06:00` đến `21:45`.
   - Các mốc `08:00`, `08:15`, `08:30`, `08:45`, `09:00`, `09:15`... hiển thị cách đều hoàn hảo, không có hiện tượng chồng đè hay cắt chữ.
   - **Ảnh bằng chứng:** `verify-15min-grid.png`

2. **Đặt lịch trực tiếp tại ô 08:15:**
   - Thao tác click vào ô `08:15` trên Calendar kích hoạt modal "Đặt lịch PT mới".
   - Trường **Giờ bắt đầu** tự động nhận giá trị: `08:15`.
   - Chọn gói tập 120 phút (`DK016`), trường **Giờ kết thúc** tự động prefill: `10:15 (120 phút)`.
   - Danh sách giờ kết thúc có sẵn các nấc 15 phút: `08:30 (15p)`, `08:45 (30p)`, `09:00 (45p)`, `09:15 (60p)`, `09:30 (75p)`, `09:45 (90p)`...
   - **Ảnh bằng chứng:** `verify-15min-booking-modal.png`

---

## 4. Kết Luận
Tính năng cập nhật lưới Calendar sang bước 15 phút đã hoàn tất 100%, đáp ứng đầy đủ yêu cầu người dùng và tuân thủ các quy chuẩn giao diện Paradise Gym.

# BÁO CÁO BÀN GIAO: GIAO DIỆN CALENDAR LỊCH PT ĐỘNG THEO THỜI LƯỢNG GÓI & KÉO THẢ GIỜ BẮT ĐẦU (W06)

**Phân hệ:** Quản Trị Viên (QTV) & Lễ Tân (LT)  
**Màn hình:** W06 — Lịch tập & buổi PT (`frontend/web/js/modules/ptScheduler.js`)  
**Tab thực hiện:** `anti-1-QTV-LT` (Web Admin Lead) & `anti-4-Core-BE-DB` (Backend Lead)  
**Ngày hoàn thành:** 19/09/2026  

---

## 1. Mục Tiêu & Yêu Cầu Nghiệp Vụ Chuẩn Hóa

1. **Chuẩn hóa trình tự logic đặt lịch PT:**
   - Thứ tự bắt buộc: **Chọn HLV ➔ Chọn Hội viên ➔ Chọn Gói PT ➔ Mới xác định Thời lượng buổi tập ➔ Mới kéo/chọn trên Calendar**.
   - Tuyệt đối không tạo thẻ dự kiến 60 phút ảo khi chưa biết Hội viên là ai và Gói tập có thời lượng bao nhiêu.
2. **Bỏ giới hạn 5 khung giờ cố định:**
   - Khách và nhân viên được tùy chọn bất kỳ giờ bắt đầu nào trong khung giờ mở cửa phòng tập (06:00 - 22:00, bước nhảy 15 phút trên form hoặc kéo thả tự do trên lịch).
   - Giờ kết thúc được hệ thống tự động tính toán dựa trên thời lượng thực tế của gói PT (`end_time = start_time + session_duration_minutes`).
3. **Trực quan hóa Calendar với chiều cao thẻ tỷ lệ thuận theo thời lượng:**
   - Lưới lịch `dxScheduler` bước nhảy 30 phút (`cellDuration: 30`, row height 42px).
   - Chiều cao của thẻ đặt lịch tỉ lệ chính xác theo thời lượng:
     * 30 phút = 1 ô (42px)
     * 60 phút = 2 ô (84px)
     * 90 phút = 3 ô (126px)
     * 120 phút = 4 ô (168px)
4. **Hai phương thức đặt lịch linh hoạt:**
   - **Cách 1: Đặt trực tiếp trong form:** Chọn Hội viên -> Chọn Gói PT -> Chọn giờ bắt đầu -> Bấm `[✓ Xác nhận đặt lịch]`.
   - **Cách 2: Kéo chọn giờ trực quan trên Calendar:** Sau khi chọn Hội viên & Gói PT, bấm nút `[📅 Kéo chọn giờ trên Calendar]` ở toolbar đáy modal ➔ Form đóng lại, thẻ xanh xuất hiện trên Calendar với **đúng chiều cao thời lượng của gói** và tên Hội viên + Gói PT. Người dùng nhấn giữ kéo lên/xuống hoặc click ô giờ trống để đặt mốc giờ ưng ý, rồi bấm `[✓ Xác nhận đặt lịch]` trên Floating Bar ở đáy màn hình.

---

## 2. Các Thay Đổi Kỹ Thuật Đã Thực Hiện

### 2.1. Backend (`backend/src/modules/core/bookings.js` & `commerce.js`)
- `POST /pt-bookings`:
  - Hỗ trợ `start_time` linh động bất kỳ định dạng `HH:mm` từ `06:00` đến `22:00`.
  - Tự động lấy `session_duration_minutes` từ request body, từ bản ghi `registrations`, hoặc từ bảng `packages`.
  - Tự động tính `end_time = start_time + duration`.
  - Kiểm tra xung đột ca tập thời gian thực qua PostgreSQL:
    `WHERE (pt_id=$1 OR member_id=$2) AND booking_date=$3 AND status<>'CANCELLED' AND start_time < $end::time AND end_time > $start::time`.
- `GET /registrations`:
  - Bổ sung `COALESCE(pkg.session_duration_minutes, 60)::int session_duration_minutes` vào câu truy vấn nạp hợp đồng đăng ký.

### 2.2. CSS Styling (`frontend/web/css/web.css`)
- Thẻ dự kiến `.pt-draft-appointment`:
  - Gradient xanh ngọc tươi `#ecfdf5` $\rightarrow$ `#d1fae5`, viền nét đứt emerald `#059669`.
  - Con trỏ `cursor: grab` / `cursor: grabbing` báo hiệu kéo thả.
  - Tay nắm kéo `.pt-draft-handle`, huy hiệu thời lượng `.pt-duration-tag` và nút hành động nhanh trên thẻ.
- Thanh công cụ nổi `.pt-floating-draft-bar`:
  - Ghim cố định góc dưới màn hình (`bottom: 24px`), đổ bóng nổi khối `box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15)`.
  - Hiển thị tên Hội viên, Tên gói, mốc giờ, thời lượng, nút `[✓ Xác nhận đặt lịch]`, `[✏️ Đổi gói / thông tin]`, `[✕ Hủy chọn]`.

### 2.3. Frontend Logic (`frontend/web/js/modules/ptScheduler.js`)
- **Tái cấu trúc luồng `showBookingForm`:**
  - Thứ tự trường: PT phụ trách ➔ Chi nhánh ➔ Hội viên ➔ Gói PT ➔ Thời lượng buổi tập (dynamic) ➔ Ngày tập ➔ Giờ bắt đầu ➔ Giờ kết thúc (tự động) ➔ Ghi chú.
  - Khi chưa chọn gói: Thời lượng và Giờ kết thúc hiển thị placeholder chờ xác định, nút `[📅 Kéo chọn giờ trên Calendar]` bị disable.
  - Khi đã chọn gói: Nạp `session_duration_minutes`, tự tính giờ kết thúc, kích hoạt nút `[📅 Kéo chọn giờ trên Calendar]`.
- **Sự kiện `onCellClick` trên Calendar:**
  - Nếu chưa có gói: Không tạo thẻ 60p ảo mà mở modal đặt lịch với mốc giờ click làm giờ dự kiến.
  - Nếu đã có thẻ dự kiến (đã chọn gói): Di chuyển thẻ dự kiến tới ô vừa click với đúng thời lượng của gói.
- **Sự kiện Drag & Drop (`onAppointmentUpdating` / `onAppointmentUpdated`):**
  - Chặn kéo lịch đã chốt, chỉ cho phép kéo thẻ dự kiến.
  - Khi thả thẻ: Tính toán mốc giờ mới, giữ nguyên thời lượng gói, kiểm tra collision thời gian thực và cập nhật Floating Bar.

---

## 3. Kết Quả Kiểm Thử

1. **Kiểm thử cú pháp JavaScript:**
   - Lệnh: `node --check frontend/web/js/modules/ptScheduler.js`
   - Kết quả: **PASS (0 syntax errors)**.
2. **Kiểm thử tích hợp Backend (Integration Tests):**
   - Lệnh: `npm test` trong `backend/`
   - Kết quả: **PASS 403/403 HTTP checks 100%** trên PostgreSQL độc lập.
3. **Đồng bộ tài liệu:**
   - Đã cập nhật User Stories [`QTV-W06-US02`](file:///e:/Desktop/para/docs/user-stories/qtv/QTV-W06-Lịch%20tập%20&%20buổi%20PT/QTV-W06-US02-Đặt%20lịch%20PT.md) và [`LT-W06-US02`](file:///e:/Desktop/para/docs/user-stories/le-tan/LT-W06-Lịch%20tập%20&%20buổi%20PT/LT-W06-US02-Đặt%20lịch%20PT.md).

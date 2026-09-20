# Báo Cáo Bàn Giao: Tùy Chọn Giờ Bắt Đầu & Thẻ Lịch Dự Kiến Kéo Thả Theo Thời Lượng Gói Tập (HV02-US02)

## 1. Tóm Tắt Nhiệm Vụ Đã Thực Hiện

Theo yêu cầu nghiệp vụ mới từ Người Dùng:
1. **Bỏ hoàn toàn cơ chế 5 khung giờ cố định 2 tiếng** (08:00 - 10:00, 10:00 - 12:00...) trên phân hệ Mobile Hội viên.
2. Cho phép hội viên **tùy chọn giờ bắt đầu tự do** (`start_time`) trong khung giờ hoạt động (06:00 - 22:00), còn **giờ kết thúc (`end_time`) được tính toán tự động** theo thời lượng của gói tập (`session_duration_minutes`: 30p, 45p, 60p, 90p, 120p; mặc định 60 phút).
3. **Thiết kế lại giao diện Đặt lịch PT theo Lịch biểu Dòng thời gian (Day Timeline Scheduler):**
   - Trục thời gian 16 tiếng từ 06:00 đến 22:00 chia làm 32 nấc 30 phút, kẻ vạch ngang 48px/nấc.
   - Hiển thị trực quan các khung giờ HLV có lịch bận (`busy_slots`) bằng khối xám sọc chéo làm mờ.
   - Hiển thị các buổi tập của chính hội viên bằng khối xanh dương.
4. **Thẻ Đặt Lịch Dự Kiến (Interactive Draft Card):**
   - **Chiều cao của thẻ tỉ lệ thuận 100% với thời lượng gói tập** (30p = 48px, 45p = 72px, 60p = 96px, 90p = 144px, 120p = 192px).
   - Hỗ trợ **nhấn giữ và kéo lên/xuống (Drag & Drop / Touch Move)** trên cả thiết bị di động (Touch) lẫn trình duyệt (Mouse), tự động "snap" tròn theo từng nấc **15 phút**.
   - Hỗ trợ **chạm trực tiếp** vào ô trống trên Timeline để thẻ nhảy ngay tới vị trí đó.
   - Tích hợp 2 nút tinh chỉnh `[-] 15p` và `[+] 15p` ngay trên thẻ.
   - Phát hiện trùng lịch realtime: Thẻ hiển thị màu xanh lá khi hợp lệ; chuyển sang màu đỏ cam cảnh báo khi bị kéo đè lên lịch bận của HLV hoặc ngoài giờ mở cửa.
5. **Thanh hành động nổi ở đáy màn hình (Floating Booking Bar):**
   - Hiển thị tóm tắt Ngày tập, Khung giờ, Thời lượng, Badge Khả dụng / Trùng lịch.
   - Nút **`[ Xác nhận đặt lịch ]`** chỉ kích hoạt khi khung giờ hợp lệ, bấm vào tạo booking thành công và chuyển ngay sang tab `Lịch của tôi`.

---

## 2. Các Hạng Mục Kỹ Thuật Đã Hoàn Thành

### A. Giao diện Mobile Hội viên (`frontend/mobile/member/`)

1. **Thanh Điều Hướng Ngày Tiện Lợi (`date-nav-bar`):**
   - Gồm nút Ngày trước `<`, Tiêu đề ngày dạng `Thứ X, DD/MM/YYYY`, nút Ngày sau `>`, và nút `[📅 Lịch tháng]` cho phép đóng/mở nhanh lưới lịch tháng DevExtreme `dxCalendar`.

2. **Lưới Dòng Thời Gian Dọc (Day Timeline 06:00 - 22:00):**
   - Chiều cao mỗi slot 30 phút là 48px (tương đương 1.6px mỗi phút).
   - Khung cuộn mượt mà `.timeline-scroll`, tự động cuộn đến khung giờ dự kiến ban đầu khi nạp màn hình.
   - Khối giờ bận HLV `.timeline-busy-card`: Vị trí và chiều cao chính xác theo mốc giờ của các buổi tập đã có, khóa tương tác và ẩn thông tin học viên khác để bảo vệ quyền riêng tư.
   - Khối buổi tập cá nhân `.timeline-own-card`: Nhận diện rõ các buổi tập đã đặt của chính hội viên trong ngày.

3. **Thẻ Đặt Lịch Dự Kiến Tương Tác (`timeline-draft-card`):**
   - Chiều cao động: `cardHeight = Math.round(duration * 1.6)` px.
   - Tương tác Touch: Hỗ trợ `touchstart`, `touchmove` (ngăn cuộn trang `e.preventDefault()`), `touchend`, `touchcancel`.
   - Tương tác Mouse: Hỗ trợ `mousedown`, `mousemove` (bắt sự kiện trên `window`), `mouseup`.
   - Tự động snap tròn theo 15 phút: `snappedMin = Math.round(rawMin / 15) * 15`.
   - Cảnh báo trực quan: Thêm class `.colliding` khi trùng lịch HLV, trùng lịch cá nhân, giờ trong quá khứ hoặc quá 22:00.
   - Nút tinh chỉnh nhanh `[-] 15p` và `[+] 15p`.

4. **Thanh Đặt Lịch Nổi Ở Đáy (`floating-booking-bar`):**
   - Vị trí `fixed` ở đáy màn hình ngay trên thanh điều hướng Bottom Nav.
   - Tóm tắt trực tiếp giờ bắt đầu, giờ kết thúc, thời lượng buổi tập.
   - Nút `[ Xác nhận đặt lịch ]` gọi `POST /pt-bookings`, toast thông báo và điều hướng sang tab `Lịch của tôi`.

---

### B. Backend REST API (`backend/src/modules/core/bookings.js`)

1. **`GET /pt-bookings/available-slots`:**
   - Trả về mảng `busy_slots: existing.map(e => ({ start_time: e.start_time.slice(0,5), end_time: e.end_time.slice(0,5) }))` chứa danh sách toàn bộ các khung giờ bận của HLV trong ngày được chọn.
   - Giữ nguyên `slots` và `available_slots` để tương thích ngược 100% với các bài test tích hợp trước đó.
2. **`POST /pt-bookings`:**
   - Đã hỗ trợ tiếp nhận `start_time` tùy chọn (định dạng `HH:mm`), tự động tính `end_time` dựa trên `session_duration_minutes` của gói tập, và kiểm tra chống trùng lặp `(start_time < end AND end_time > start)`.

---

### C. Đồng Bộ Hóa Hệ Thống Tài Liệu Đặc Tả (`docs/`)

1. **User Story [`HV02-US02`](file:///e:/Desktop/para/docs/user-stories/hoi-vien/HV02-Lịch%20tập/HV02-US02-Đặt%20lịch%20PT%20từ%20slot%20trống.md):**
   - Đổi tên thành **HV02-US02 — Đặt lịch PT tùy chọn giờ bắt đầu theo thời lượng gói (Timeline kéo thả)**.
   - Cập nhật Preconditions (không metadata), Trigger, Main Flow (13 bước), Field-level spec toàn diện, Alternate Flows, Exception Flows.
   - Sơ đồ Mermaid Activity Diagram Swimlane chuẩn UML 100% tuân thủ bất biến `Action = 1 IN + 1 OUT`.
2. **Epic [`HV02 · Lịch tập`](file:///e:/Desktop/para/docs/epic/hoi-vien/HV02-Lịch%20tập.md):**
   - Cập nhật dòng `HV02-US02` trong bảng User Stories & Giao diện tương ứng.

---

## 3. Kết Quả Kiểm Thử (Verification Results)

- **Cú pháp JS:** `node --check frontend/mobile/member/js/home-schedule.js` $\rightarrow$ **PASS (0 lỗi)**.
- **Backend Integration Test:** `npm test` $\rightarrow$ **PASS 406/406 HTTP checks** trên PostgreSQL độc lập:
  * Kiểm tra `busy_slots` trong `GET /pt-bookings/available-slots`.
  * Kiểm tra đặt lịch với giờ bắt đầu lẻ `08:30 - 09:30` theo thời lượng gói 60 phút.
  * Kiểm tra chặn đặt đè lịch trùng giờ `09:00 - 10:00` (HTTP 409).
  * Kiểm tra `available-slots` tự động cập nhật slot vừa đặt vào danh sách `busy_slots`.

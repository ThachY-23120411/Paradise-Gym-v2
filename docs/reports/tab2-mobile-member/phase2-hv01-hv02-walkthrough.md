# Báo Cáo Triển Khai: Phân Hệ HV01 Trang Chủ & HV02 Lịch Tập Mobile Hội Viên

**Subagent:** HV-2-Home-Schedule (Lead Mobile Hội viên - Tab 2)  
**Ngày hoàn thành:** 16/09/2026  
**Thư mục chuyên trách:** `frontend/mobile/member/`  
**Các file tạo / cập nhật:**
- `frontend/mobile/member/js/home-schedule.js` (NEW)
- `frontend/mobile/member/index.html` (UPDATE)
- `frontend/mobile/member/css/member.css` (UPDATE)

---

## 1. Kết Quả Triển Khai Chi Tiết

### 1.1. Phân Hệ HV01 · Trang Chủ Dashboard (HV01-US01)
- **Chuẩn 4 khối trực quan theo đúng tài liệu đặc tả UI:**
  1. **Khối 1 — Lời chào & Định hướng:**
     - Lời chào thân thiện kèm họ tên Hội viên: `"Xin chào, [Họ và tên]"` (ví dụ: *Xin chào, Nguyễn Văn An*).
     - Tiêu đề câu hỏi: `"Hôm nay bạn muốn làm gì?"` (font 20px, bold).
     - Đoạn mô tả định hướng: *"Trang tổng quan để bạn biết việc cần làm và đi nhanh đến đúng chức năng."*
  2. **Khối 2 — Trạng thái việc cần xử lý:**
     - **Thẻ Amber cảnh báo (khi có yêu cầu PT đang chờ phản hồi PENDING):** Nền vàng cam, icon đồng hồ `clock`, tiêu đề *"Yêu cầu PT đang chờ phản hồi"*, mô tả *"[Tên HLV] đang xem yêu cầu chọn PT của bạn."*, kèm nút CTA `[ Xem yêu cầu PT ]` để chuyển nhanh sang HV03.
     - **Thẻ Green rảnh rỗi (khi không có việc tồn đọng):** Nền xanh lục nhạt, icon tích xanh `check`, tiêu đề *"Không có việc cần xử lý"*, mô tả *"Bạn có thể mua gói mới hoặc đặt một buổi trong lịch PT."*, tự động ẩn nút `[ Xem yêu cầu PT ]`.
  3. **Khối 3 — Lịch sắp tới:**
     - Nhãn khối: *"Lịch sắp tới"*.
     - Khi có lịch tập sắp diễn ra: Hiển thị Ngày, Khung giờ (`08:00 - 10:00`), HLV phụ trách, Tên gói tập và badge trạng thái.
     - Khi chưa có lịch: Hiển thị *"Chưa có lịch sắp tới"*, ẩn thông tin chi tiết HLV/gói.
     - Nút secondary: `[ Xem lịch của tôi ]` điều hướng trực tiếp sang HV02 (sub-tab Lịch của tôi).
  4. **Khối 4 — Thao tác nhanh quản lý gói tập:**
     - Tiêu đề: *"Quản lý gói tập"* kèm mô tả.
     - Lưới 2 cột gồm: Nút primary xanh lá `[ Mua gói ]` và nút secondary `[ Gói của tôi ]` (điều hướng sang HV03).
- **Tuân thủ quy định:** Tuyệt đối **KHÔNG** có check-in hay mã QR code tại màn hình HV01.

---

### 1.2. Phân Hệ HV02 · Lịch Tập (HV02-US01 đến HV02-US04)

- **Sub-tab 1: HV02-US01 — Xem lịch tập & Lọc trạng thái buổi PT:**
  - **Widget Lịch tháng (Month Calendar) 7 cột (T2–CN):**
    - Điều hướng `< Tháng X Năm YYYY >`.
    - Đánh dấu ngày hôm nay (`.today`) và chấm tròn nhận diện ngày có buổi tập (`.has-event`).
    - **Cơ chế Toggle Trigger:** Click 1 ngày -> Highlight vòng tròn xanh dương và lọc danh sách chỉ hiển thị các buổi trong ngày đó; Click lại chính ngày đang chọn (Deselect) -> Bỏ chọn và tự động hiển thị lại toàn bộ các buổi tập.
  - **Bộ lọc Chip trạng thái linh hoạt:**
    - Gồm: `Tất cả (n)`, `Chờ xác nhận (n)`, `Đã đặt (n)`, `Đã hoàn thành (n)`, `Đã hủy (n)`.
    - Số lượng `(n)` tự động tính dynamic theo ngày đang chọn hoặc tất cả ngày.
  - **Thẻ buổi tập (Session Cards):**
    - Khung giờ, Tên chi nhánh, Họ tên PT phụ trách, Tên gói tập.
    - Badge trạng thái trực quan: `Chờ xác nhận` (Amber), `Đã đặt` (Blue), `Đã hoàn thành` (Green), `Đã hủy` (Red/Muted).
    - Nút CTA thao tác nhanh: `[ Xác nhận hoàn thành ]` trên thẻ chờ xác nhận và `[ Hủy lịch ]` trên thẻ đã đặt.

- **Sub-tab 2: HV02-US02 — Đặt lịch PT từ slot trống:**
  - **Combobox "Chọn gói muốn sử dụng" (TRIGGER):**
    - Lọc nghiêm ngặt 4 điều kiện: (1) Đã thanh toán 100% (`ACTIVE`), (2) Còn trong hạn sử dụng, (3) Còn số buổi PT khả dụng (`remaining_pt_sessions > 0`), (4) **ĐÃ CÓ PT PHỤ TRÁCH** (`assigned_pt_id != null`).
    - Định dạng chuẩn: `[Tên gói] · [Mã đăng ký]` (ví dụ: `Gói PT 20 buổi · DK002`).
    - Tự động hiển thị Empty State kèm nút điều hướng sang HV03 nếu chưa có gói nào đủ điều kiện.
  - **Card thông tin PT phụ trách:** Avatar viết tắt, Họ tên PT, Chi nhánh, Thời lượng chuẩn *"Mỗi buổi 2 giờ"*, Tiến độ buổi còn lại.
  - **Lịch tháng của PT phụ trách:** Chọn ngày muốn đặt lịch.
  - **Lưới 5 khung giờ chuẩn 2 tiếng trong ngày (08:00–10:00, 10:00–12:00, 12:00–14:00, 14:00–16:00, 16:00–18:00):**
    - **Khung giờ trống:** Thẻ xanh ngọc nhạt kèm nút CTA icon `[ + ]` màu xanh lá để đặt lịch.
    - **Khung giờ của người khác / PT bận:** Thẻ mờ (disabled), nhãn *"Đã bận • Khung giờ đã kín"*, ẩn thông tin cá nhân của người khác.
    - **Khung giờ là buổi của chính Hội viên:** Hiển thị thẻ buổi tập cá nhân kèm nút `[ Hủy lịch ]` hoặc `[ Xác nhận hoàn thành ]`.
  - **Tạo booking ngay lập tức:** Khi bấm `[ + ]`, hệ thống tạo ngay booking ở trạng thái `Đã đặt` (`BOOKED` / `UPCOMING`) và giữ chỗ 1 buổi mà **KHÔNG CẦN CHỜ PT DUYỆT**.

- **Modal HV02-US03 — Hủy lịch buổi tập PT:**
  - Prefill thông tin buổi tập cần hủy: Mã booking, Khung giờ, Tên PT, Tên gói tập.
  - **Kiểm soát mốc thời gian hủy & Chính sách bảo lưu:**
    - Hủy trước $\ge 4$ tiếng: Banner xanh thông báo bảo lưu số buổi tập vào gói.
    - Hủy sát giờ $< 4$ tiếng: Banner đỏ cảnh báo hủy muộn và khấu trừ 1 buổi tập theo chính sách phòng Gym.
  - **Lý do hủy (TRIGGER):** Dropdown các lý do (`Bận công việc đột xuất`, `Lý do sức khỏe`, `Trùng lịch hẹn khác`, `Thay đổi kế hoạch cá nhân`, `Khác`).
  - **Lý do chi tiết (CONDITIONAL):** Textarea tối đa 150 ký tự, hiện và bắt buộc khi chọn `"Khác"`, ẩn khi chọn các lý do khác.

- **Dialog HV02-US04 — Xác nhận hoàn thành buổi PT (Xác nhận kép 2 chiều):**
  - Hiển thị thông tin buổi tập và Trạng thái xác nhận của PT (`PT đã xác nhận hoàn thành` hoặc `Đang chờ PT xác nhận`).
  - Thông báo khấu trừ: Buổi tập chỉ chuyển sang `COMPLETED` và trừ chính xác 1 buổi khả dụng sau khi **CẢ HỘI VIÊN VÀ PT CÙNG HOÀN TẤT XÁC NHẬN**.

---

## 2. Dữ Liệu Thử Nghiệm Tích Hợp (Demo & Offline)
1. **Gói tập sẵn sàng đặt lịch:** `Gói PT 20 buổi · DK002` (HLV Nguyễn Văn Thể - CN Quận 1, còn 12 buổi).
2. **Gói Combo sẵn sàng đặt lịch:** `Combo VIP Toàn Diện Gym + 12 Buổi PT · DK003` (HLV Lê Văn Hùng - CN Bình Thạnh, còn 8 buổi).
3. **Gói chưa phân công PT (Test lọc combobox):** `Gói PT 10 buổi cơ bản · DK004` (Tự động bị loại khỏi danh sách đặt lịch).
4. **Buổi tập chờ xác nhận hoàn thành:** `BK088` (Hôm nay 08:00 - 10:00, HLV Nguyễn Văn Thể đã bấm xác nhận trước, sẵn sàng cho Hội viên bấm nút test xác nhận kép).
5. **Buổi tập sắp tới:** `BK092` (Ngày mai 08:00 - 10:00, sẵn sàng test hủy lịch trước 4h).

# Báo Cáo Bàn Giao: Modal Chọn Người Xác Nhận Hoàn Thành & Xử Lý Xác Nhận Kép PT (Web Admin)

## 1. Mục tiêu công việc
Giải quyết 2 yêu cầu của Người Dùng:
1. Khi bấm vào "Xác nhận hoàn thành", hiển thị modal cho phép chọn người xác nhận hoàn thành (PT hoặc Học viên, hoặc Cả hai). Sau đó tính xác nhận cho người đó.
2. Sửa lỗi logic bất hợp lý trước đó: Thẻ chuyển sang trạng thái "Chờ xác nhận hoàn thành" (`PENDING_COMPLETION`) nhưng cả 2 người đều là "Chưa xác nhận". Giờ đây khi 1 người xác nhận thì chỉ người đó có timestamp xác nhận và hiển thị rõ người còn lại chưa xác nhận; khi người thứ 2 xác nhận thì hoàn thành 100% (`COMPLETED`) và trừ buổi.

## 2. Các thay đổi đã thực hiện

### 2.1. Backend (`backend/src/modules/core/bookings.js`)
- Mở rộng hàm `confirmation(req, side)` cho vai trò Quản lý / Lễ tân (`side === null`):
  - Whitelist trường nhận từ request: `['confirm_for', 'workout_notes', 'fitness_assessment']`.
  - Hỗ trợ `confirm_for`:
    - `'PT'`: Gán `pt_confirmed_at = NOW()`.
    - `'MEMBER'`: Gán `member_confirmed_at = NOW()`.
    - `'BOTH'`: Gán cả hai timestamp.
  - Xử lý trạng thái (`status`):
    - Nếu cả 2 đều đã xác nhận (`pt && member`): `status = 'COMPLETED'`, `is_deducted = true`, khấu trừ 1 buổi trong `registrations`.
    - Nếu mới 1 bên xác nhận (`pt || member`): `status = 'PENDING_COMPLETION'`, chưa khấu trừ buổi (`is_deducted = false`).
    - Nếu không truyền `confirm_for` (body `{}` cho test đối soát): giữ nguyên trạng thái hiện tại `b.status`.

### 2.2. Frontend Web Admin (`frontend/web/js/modules/ptScheduler.js`)
- Xây dựng modal `showConfirmActorModal(state, booking, onDone)`:
  - Header: Tóm tắt thông tin ca tập (Hội viên, PT, khung giờ, gói tập).
  - Khối trạng thái xác nhận hiện tại: Hiển thị trạng thái của HLV và Học viên (kèm thời gian xác nhận nếu đã hoàn thành).
  - `dxRadioGroup` chọn đối tượng xác nhận thay: HLV, Học viên, Cả hai bên. Bên đã xác nhận sẽ tự động bị `disabled`.
  - Trường nhập tùy chọn: "Nội dung bài tập" (`workout_notes`) và "Đánh giá thể lực" (`fitness_assessment`), tự động ẩn/hiện khi chọn HLV / Cả hai bên.
  - Nút bấm:
    - [ Hủy ]: `stylingMode: 'outlined'`.
    - [ Xác nhận hoàn thành ]: Xanh lá `type: 'default'`, `stylingMode: 'contained'`, icon `check`.
- Kết nối `showConfirmActorModal` vào:
  - Nút "Xác nhận hoàn thành" và nút "Đối soát xác nhận" trên Day view.
  - Nút "Xác nhận hoàn thành" và nút "Đối soát xác nhận" trên Week view.
  - Nút "Xác nhận hoàn thành" trên Table view.
  - Nút "Xác nhận hoàn thành" trong thanh công cụ modal chi tiết `showBookingDetail`.
- Cập nhật cache buster `v=12` trong `frontend/web/index.html`.

### 2.3. Trạng thái dữ liệu kiểm thử
- Ca tập `bbbb0001-0000-0000-0000-000000000001` (PT001 Nguyễn Văn Thể, HV001 Lê Hoàng Nam, ngày 21/09/2026 khung giờ 06:00 - 08:00 AM, gói DK016) đã được reset về `status = 'BOOKED'`, `pt_confirmed_at = NULL`, `member_confirmed_at = NULL`, `is_deducted = false` để Người Dùng kiểm thử trực tiếp trên giao diện.

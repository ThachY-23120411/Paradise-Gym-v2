# Walkthrough Báo Cáo Bàn Giao: Ngăn Chặn Va Chạm & Tự Động Bật Về Vị Trí Cũ Khi Kéo Thả Lịch PT Trên Web QTV/LT

> **Tab:** anti-1-QTV-LT (Web Admin Lead)  
> **Ngày:** 2026-09-21  
> **Nhiệm vụ:** Khi đặt lịch ở Web QTV/LT mà kéo thả lịch tới chỗ lịch đã có từ trước thì khi thả chuột ra thẻ lịch sẽ lập tức nhảy về lại vị trí cũ, không đè lên card đặt lịch đã có từ trước, không chen lấn chia đôi cột.

---

## 1. Nguyên Nhân Gốc & Giải Pháp Kỹ Thuật

### 1.1. Hiện Trạng Trước Khi Sửa:
- Trong `dxScheduler` của DevExtreme, sự kiện `onAppointmentUpdating` chưa kiểm tra va chạm thời gian (`checkCollision`) trước khi cập nhật.
- Dữ liệu `state.draft` bị gán đè tọa độ mới ngay lập tức.
- Hàm `checkCollision` chỉ được gọi sau khi đã hoàn tất drop trong `onAppointmentUpdated`, dẫn tới việc chỉ hiển thị một toast cảnh báo (`notify`) nhưng thẻ lịch đã được render song song với thẻ lịch cũ, chia đôi độ rộng cột (50% - 50%) như hình ảnh phản hồi từ người dùng.

### 1.2. Giải Pháp Xử Lý Triệt Để:
1. **Kiểm tra va chạm sớm trong `onAppointmentUpdating`:**
   - Trước khi cập nhật tọa độ hoặc thời lượng cho `event.newData` và `state.draft`, hệ thống tiến hành kiểm tra:
     * Thời điểm trong quá khứ (`newStart.getTime() <= Date.now()`).
     * Ngày làm việc của HLV (`state.trainer?.work_days === 'MON_TO_FRI'`).
     * Khung giờ hoạt động phòng tập (`06:00` - `22:00`).
     * Va chạm với bất kỳ ca tập nào đang hoạt động của HLV (`checkCollision(state, newDateStr, newStartStr, newEndStr, item.id)`).
   - Nếu phát hiện va chạm:
     * Đặt `event.cancel = true;` để DevExtreme hủy hoàn toàn thao tác cập nhật.
     * Cảnh báo người dùng qua toast: `⚠️ Khung giờ ... đã có lịch đặt từ trước. Thẻ lịch tự động quay về vị trí cũ!`.
     * **Tuyệt đối không cập nhật `state.draft`**, bảo toàn 100% vị trí hợp lệ trước đó.
     * Kích hoạt `setTimeout(() => { refreshSchedulerAppointments(state); renderDraftFloatingBar(state); }, 0);` để vẽ lại lịch sạch sẽ, trả thẻ về đúng vị trí cũ ngay lập tức.
2. **Khóa chống chen lấn trong `onCellClick`:**
   - Khi click vào một ô trên lịch trong khi đang có thẻ dự kiến, nếu ô đó trùng với ca tập có sẵn, hệ thống chặn di chuyển thẻ và phát cảnh báo.
   - Nếu chưa có thẻ dự kiến, click vào ô đã có lịch cũng sẽ bị chặn mở form đè lên ca đó.
3. **Đồng bộ hóa tài liệu đặc tả:**
   - Cập nhật mục `Exception Flows` trong cả hai tài liệu `QTV-W06-US02` và `LT-W06-US02`.

---

## 2. Kết Quả Kiểm Thử E2E Tự Động

- **Script:** `tests/e2e/test_pt_drag_collision.js`
- **Các kịch bản đã kiểm tra:**
  1. Tạo thẻ lịch dự kiến 120 phút tại ô trống 12:00 - 14:00 ngày 21/09/2026.
  2. Kéo thả thẻ dự kiến vào khung giờ đã có lịch từ trước (15:00 - 17:00 của học viên Lê Hoàng Nam).
  3. Kết quả: `updatingCancelled = true`, thẻ lịch lập tức bật về vị trí 12:00 - 14:00, không bị chia đôi cột hay đè lên lịch cũ.
  4. Click vào ô đã có lịch: Kết quả bị chặn, thẻ lịch giữ nguyên vị trí 12:00 - 14:00.

---

## 3. Hình Ảnh Bằng Chứng Kiểm Thử

| Bước | Mô tả | Trạng thái |
| :--- | :--- | :--- |
| **Ảnh 1** | Thẻ lịch dự kiến 120 phút kích hoạt thành công tại ô trống 12:00 - 14:00 | Đạt ✅ |
| **Ảnh 2** | Thao tác kéo thả vào ô đã có lịch (15:00 - 17:00) bị hủy bỏ ngay lập tức, thẻ tự động bật về vị trí cũ, không bị chia đôi cột | Đạt ✅ |

---
*Báo cáo hoàn tất và tuân thủ 100% AGENTS.md.*

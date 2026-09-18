# BÁO CÁO HOÀN THÀNH PHÂN HỆ PT01 (LỊCH DẠY PT) & PT06 (TỔNG QUAN HIỆU SUẤT PT)
- **Subagent thực hiện:** `PT-2-Schedule-Overview` (Tab 3: `anti-3-PT`)
- **Tài liệu tham chiếu:**
  - `docs/user-stories/pt/PT06-Tổng quan/PT06-US01-Xem tổng quan và thống kê hiệu suất PT.md`
  - `docs/user-stories/pt/PT01-Lịch/PT01-US01-Xem lịch PT theo ngày.md`
  - `docs/user-stories/pt/PT01-Lịch/PT01-US02-Xác nhận hoàn thành và ghi kết quả buổi học.md`
- **Các tệp mã nguồn xây dựng & cập nhật:**
  - `frontend/mobile/pt/js/overview.js` (Phân hệ PT06)
  - `frontend/mobile/pt/js/schedule.js` (Phân hệ PT01)
  - `frontend/mobile/pt/index.html` (Tích hợp thẻ script)
  - `frontend/mobile/pt/js/app.js` (Đồng bộ vòng đời Tab và trigger refresh)

---

## 1. Phân hệ PT06: Tổng quan hiệu suất PT (`frontend/mobile/pt/js/overview.js`)

### Các tính năng đã hoàn thiện:
1. **PT06-US01 — Dashboard tổng quan năng suất huấn luyện:**
   - Cung cấp bức tranh toàn cảnh về khối lượng dạy và tiến độ đồng hành cùng Hội viên trong kỳ.
   - **Bộ lọc thời gian (TRIGGER):** Segmented control 3 mức (`Tuần này` / `Tháng này` [mặc định/prefill] / `Tháng trước`). Khi chạm đổi mốc, tự động kích hoạt tính toán và nhảy số mượt mà (counter animation).
2. **Cụm 5 thẻ chỉ số KPI hiệu suất chuẩn hóa (DYNAMIC):**
   - **1) Học viên phụ trách:** Tổng số học viên có hợp đồng PT `ACTIVE` được phân công cho PT (tự động đồng bộ với `ParadisePTClients`).
   - **2) Buổi đã hoàn thành:** Tổng số buổi tập đạt đủ xác nhận kép (`DONE`) trong kỳ lọc (căn cứ đối soát thù lao dạy thực tế).
   - **3) Buổi đã được book (sắp dạy):** Tổng số ca tập ở trạng thái `Đã đặt` (`UPCOMING`) trong tương lai của kỳ.
   - **4) Buổi chờ xác nhận:** Tổng số ca tập ở trạng thái `Chờ xác nhận` (`AWAITING_CONFIRMATION`).
   - **5) Yêu cầu phân công mới:** Tổng số yêu cầu chọn HLV từ học viên đang ở trạng thái `PENDING`.
3. **Quy tắc tuân thủ nghiêm ngặt:**
   - **Tuyệt đối KHÔNG hiển thị ca dạy tiếp theo hay doanh thu tại PT06** (đã tinh gọn theo quy tắc dự án và spec).
   - Có các phím tắt nghiệp vụ nhanh điều hướng trực tiếp sang Tab `Lịch dạy` (PT01) hoặc Sub-tab `Duyệt phân công` (PT02).
   - Hàm `ParadisePTOverview.refresh()` sẵn sàng nhận lệnh từ PT01 khi có ca tập hoàn thành.

---

## 2. Phân hệ PT01: Lịch dạy PT & Ghi nhận kết quả (`frontend/mobile/pt/js/schedule.js`)

### Các tính năng đã hoàn thiện:
1. **PT01-US01 — Lịch dạy theo ngày trong khung giờ cố định 08:00 - 18:00 Thứ 2 - Thứ 6:**
   - **Bộ chọn tháng:** Điều hướng tháng trước / tháng sau (`< Tháng 9 Năm 2026 >`).
   - **Calendar Horizontal Strip:** Dải cuộn ngang hiển thị các ngày trong tháng, bao gồm Thứ (T2, T3, T4...), Số ngày (15, 16, 17...) và Chấm indicator trạng thái (Xanh lá: có ca `DONE`, Vàng: có ca `AWAITING_CONFIRMATION`, Xanh dương: có ca `UPCOMING`). Tự động cuộn mượt đưa ngày được chọn vào tầm nhìn trung tâm.
   - **Tiêu đề ngày & Khung giờ:** Hiển thị `DD/MM/YYYY - Khung làm việc cố định: 08:00 - 18:00`. Tự động phát hiện ngày nghỉ cuối tuần và hiển thị alert thân thiện.
   - **Lưới 5 khung giờ 2 tiếng cố định:** `08:00 - 10:00`, `10:00 - 12:00`, `12:00 - 14:00`, `14:00 - 16:00`, `16:00 - 18:00`.
   - **5 loại Thẻ khung giờ chi tiết:**
     - **Khung giờ trống:** Thẻ viền nét đứt màu xám nhạt (`border: 1.5px dashed rgba(255,255,255,0.16)`), hiển thị nhãn `Khung giờ trống`. **Chỉ đọc, tuyệt đối KHÔNG có nút đặt lịch hay icon `[ + ]`** vì PT không tự đặt lịch.
     - **Thẻ Đã đặt (`UPCOMING`):** Thẻ viền bên trái xanh dương, badge `Đã đặt`, thông tin học viên, gói tập, chi nhánh. Nút `[ Xác nhận hoàn thành ]` màu xanh sẵn sàng thao tác khi đến giờ.
     - **Thẻ Chờ xác nhận (`AWAITING_CONFIRMATION`):** Thẻ viền vàng cam, badge `Chờ xác nhận`. Nếu PT chưa xác nhận -> Nút `[ Xác nhận hoàn thành ]`; nếu PT đã xác nhận -> Nhãn `Chờ Hội viên xác nhận` (badge vàng cam, khóa nút).
     - **Thẻ Hoàn thành (`DONE`):** Thẻ viền xanh lá, badge `Đã ghi nhận`. Hiển thị ghi chú thể lực của PT và dòng chữ `Đã đủ 2 chiều xác nhận • Đã trừ 1 buổi`. Khóa thao tác.
     - **Thẻ Đã hủy (`CANCELLED`):** Thẻ mờ màu xám, badge `Đã hủy`, lý do hủy. Khóa tương tác. PT không có quyền hủy lịch.
2. **PT01-US02 — Bottom Sheet Ghi nhận kết quả buổi PT:**
   - Kích hoạt khi PT bấm `[ Xác nhận hoàn thành ]`.
   - Giao diện Bottom Sheet trượt mượt mà từ dưới lên, có drag handle và nút đóng `[ ✕ ]`.
   - **Thông tin ca tập:** `READONLY (PREFILL)` mã buổi, khung giờ, ngày, học viên, gói tập, chi nhánh.
   - **Kết quả buổi tập:** Cố định `Hoàn thành` (`USER-INPUT + PREFILL`).
   - **Ghi chú thể lực:** Ô Textarea cho PT nhập đánh giá thể lực, nội dung bài tập (ví dụ: Deadlift 75kg, thể lực tốt).
   - **Cơ chế xác nhận kép & Gọi API:**
     - Gọi `POST /api/v1/pt-bookings/:id/pt-confirm` (qua `apiClient.pt.ptConfirm(id)`).
     - Nếu Hội viên đã xác nhận trước -> Chuyển sang `DONE`, trừ 1 buổi khả dụng, thông báo toast: `"Cả PT và Hội viên đã xác nhận. Buổi tập chính thức hoàn thành (DONE) và đã trừ 1 buổi khả dụng!"`.
     - Nếu Hội viên chưa xác nhận -> Chuyển sang `AWAITING_CONFIRMATION`, thông báo toast: `"PT đã ghi nhận kết quả thành công! Đang chờ Hội viên bấm xác nhận đối ứng trên Mobile."`.
     - Tự động cập nhật lại lịch ngày trên UI và đồng bộ sang Module PT06 để tính lại 5 thẻ KPI ngay lập tức.

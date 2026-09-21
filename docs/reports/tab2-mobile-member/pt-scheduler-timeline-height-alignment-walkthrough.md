# Báo Cáo Khắc Phục Lỗi Hiển Thị Chiều Cao Thẻ Buổi Tập Trên Timeline Hội Viên (Mobile Member)

> Ngày kiểm tra & hoàn tất: 2026-09-21
> Phạm vi: Mobile Hội viên (`frontend/mobile/member/`)

## 1. Vấn Đề Ghi Nhận
Người dùng phản ánh thẻ buổi tập 06:00 - 08:00 (120 phút) trên giao diện đặt lịch PT của Hội viên (`#schedule/book`) chỉ hiển thị đến khoảng 07:00 / 07:30.

## 2. Nguyên Nhân
1. Mốc nhãn giờ `06:00`, `06:30`, `07:00`, `07:30`, `08:00` nằm ở trung tâm của từng ô thời gian 48px thay vì nằm trên vạch kẻ ngăn cách.
2. Dữ liệu kiểm thử trên database có 2 buổi tập trùng khung giờ (06:00 - 08:00 và 07:30 - 08:30). Thẻ 07:30 - 08:30 vẽ đè lên phần 07:30 - 08:00 của thẻ 06:00 - 08:00 do cùng dùng `left: 6px; right: 6px`.

## 3. Khắc Phục
1. `frontend/mobile/member/css/member.css`: Định dạng nhãn `.timeline-time-text` căn thẳng vào vạch ngăn cách ngang bằng `transform: translateY(-50%)`.
2. `frontend/mobile/member/js/home-schedule.js`:
   - Bổ sung nhãn `22:00` ở cuối ngày.
   - Thêm thuật toán phân bổ đa cột (multi-column slotting) cho các thẻ buổi tập bị trùng giờ để hiển thị song song cạnh nhau, không bao giờ vẽ đè che lấp lẫn nhau.
3. Di dời buổi tập kiểm thử trùng giờ trên PostgreSQL sang 14:00 - 15:00.
4. Cập nhật cache buster `css/member.css?v=12`, `js/home-schedule.js?v=20260921-unified-cards-v3`.

## 4. Đo Lường Thực Tế
- Thẻ 06:00 - 08:00: `top: 0px`, `height: 192px` (4 ô x 48px). Mép trên khớp chính xác vạch `06:00`, mép dưới chạm chính xác vạch `08:00`.
- Thẻ 14:00 - 15:00: `top: 768px`, `height: 96px` (2 ô x 48px). Khớp chuẩn từ `14:00` đến `15:00`.

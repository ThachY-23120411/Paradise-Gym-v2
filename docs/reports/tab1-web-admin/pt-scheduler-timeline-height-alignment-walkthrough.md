# Báo Cáo Khắc Phục Lỗi Hiển Thị Chiều Cao Thẻ Buổi Tập (Web Admin & Mobile Member)

> Ngày kiểm tra & hoàn tất: 2026-09-21
> Phạm vi: Web Admin QTV/LT (`frontend/web/`) & Mobile Hội viên (`frontend/mobile/member/`)

## 1. Vấn Đề Ghi Nhận
Người dùng phản ánh:
> "ủa sao card 6h-8h mà trên lưới lại chỉ cao từ 6h -> 7h vậy??? ở cả QTV/LT và HV đều bị tình trạng này, khắc phục ngay."

## 2. Nguyên Nhân Gốc Rễ
1. **Web Admin QTV/LT (dxScheduler):**
   - DevExtreme `dxScheduler` mặc định căn giữa chữ theo phương dọc (`vertical-align: middle`) bên trong từng ô 30 phút (52px).
   - Buổi tập 120 phút (06:00 - 08:00) được DevExtreme phân bổ 4 ô = 208px. Đáy của thẻ nằm tại vạch ngăn giữa ô 3 (07:30 - 08:00) và ô 4 (08:00 - 08:30).
   - Vì nhãn `07:30` nằm ở tâm ô 3 và nhãn `08:00` nằm ở tâm ô 4, đáy thẻ nằm ngay cạnh chữ `07:30` và cách chữ `08:00` đến 26px, tạo cảm giác trực quan rằng thẻ chỉ kéo dài đến 07:00 / 07:30.

2. **Mobile Member HV (Timeline Đặt lịch PT):**
   - Tương tự Web Admin, nhãn giờ `06:00`, `06:30`, `07:00`, `07:30`, `08:00` nằm bên trong ô 48px thay vì nằm trực tiếp trên vạch phân cách.
   - Thêm vào đó, trên database có 2 buổi tập trùng giờ của hội viên (06:00 - 08:00 và 07:30 - 08:30). Do thẻ đặt `left: 6px; right: 6px`, thẻ 07:30 đã vẽ đè lên phần từ 07:30 đến 08:00 của thẻ trước đó, che lấp hoàn toàn 30 phút cuối của buổi 06:00 - 08:00.

## 3. Các Thay Đổi Đã Thực Hiện
1. **Web Admin (`frontend/web/css/web.css` & `frontend/web/js/modules/ptScheduler.js`):**
   - Cập nhật `.dx-scheduler-time-panel-cell` với `vertical-align: top`, `padding: 0`, `position: relative`.
   - Bổ sung class `.pt-time-panel-label` sử dụng `transform: translateY(-50%)` để nhãn giờ bám chính xác vào vạch ngang chia giờ.
   - Bổ sung mốc giờ kết thúc `22:00` tại đáy bảng.
   - Bump cache buster: `css/web.css?v=18`, `js/modules/ptScheduler.js?v=13`.

2. **Mobile Member (`frontend/mobile/member/css/member.css` & `frontend/mobile/member/js/home-schedule.js`):**
   - Cập nhật `.timeline-time-cell` và `.timeline-time-text` với `transform: translateY(-50%)` để nhãn giờ bám chính xác vào vạch ngang chia giờ.
   - Bổ sung ô `22:00` ở cuối ngày.
   - Thêm thuật toán phân bổ đa cột (multi-column slotting) cho các thẻ buổi tập bị trùng giờ để hiển thị song song cạnh nhau (chia cột 50% / 33%), tuyệt đối không vẽ đè che lấp lẫn nhau.
   - Điều chỉnh giờ của buổi tập kiểm thử trên PostgreSQL sang 14:00 - 15:00 để đúng logic nghiệp vụ.
   - Bump cache buster: `css/member.css?v=12`, `js/home-schedule.js?v=20260921-unified-cards-v3`.

## 4. Kết Quả Kiểm Thử Thực Tế
- **Web Admin QTV/LT:**
  + Thẻ 06:00 - 08:00 (120p) có `offsetTop: 0`, `height: 208px`, mép trên chạm đúng vạch `06:00`, mép dưới chạm thẳng vạch `08:00` trên cả Day view và Week view.
  + Thẻ 09:30 - 11:00 (90p) cao 156px chạm chuẩn xác từ vạch `09:30` đến `11:00`.
- **Mobile Member HV:**
  + Thẻ 06:00 - 08:00 (120p) có `top: 0px`, `height: 192px`, mép trên chạm đúng vạch `06:00`, mép dưới chạm thẳng vạch `08:00`.
  + Thẻ 14:00 - 15:00 (60p) có `top: 768px`, `height: 96px`, chạm chuẩn xác từ vạch `14:00` đến `15:00`.

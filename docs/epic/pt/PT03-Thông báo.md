# PT03 - Thông báo

- Role: PT; Platform: Mobile.
- Entry: chuông thông báo; không phải tab footer. Điều hướng chung xem [PT index](README.md).
- Scope: thông báo own account từ GET notifications; sự kiện lịch mới/hủy/xác nhận, phân công chính thức và nhắc lịch do backend cấu hình.
- PUT read/read-all thành công mới cập nhật UI/badge. Không sinh thông báo tại frontend, không lưu trạng thái đọc bằng localStorage.
- Deep link chờ API đích tải xong và kiểm tra quyền/trạng thái. Phân công chính thức mở PT02-US02; legacy mở PT02-US03 chỉ đọc; lịch mở PT01 đúng ngày; xác nhận chỉ mở PT01-US02 khi đủ điều kiện.
- Lỗi tải/đọc có Thử lại, giữ sự thật server. Rỗng khác lỗi; provider SMS/push chưa cấu hình là giới hạn ngoài hệ thống, không tuyên bố đã giao tin.
- [PT03-US01](../../user-stories/pt/PT03-Thông%20báo/PT03-US01-Xem%20và%20xử%20lý%20thông%20báo%20PT.md): fields, main/alternate/exception và diagram.

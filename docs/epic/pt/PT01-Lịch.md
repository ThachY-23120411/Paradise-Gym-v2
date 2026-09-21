# PT01 - Lịch

- Role: PT; Platform: Mobile.
- Goal: Xem lịch giờ thực tế, đặt lịch hộ học viên được phân công và ghi nhận kết quả xác nhận kép.
- Scope: Server giới hạn chính PT phiên; không cấp quyền hủy hoặc tự phân công.

## Thành phần nghiệp vụ
- Calendar chọn ngày, chuyển tháng và thu gọn/mở rộng; mặc định hôm nay theo chi nhánh.
- Danh sách booking sắp theo start/end thực tế từ API, không dùng năm ca cố định. Hiển thị học viên/nhóm được phép xem, gói, chi nhánh và trạng thái.
- Đặt lịch mở PT01-US03: PT/chi nhánh API chỉ đọc; hội viên điều khiển danh sách hợp đồng; nhập ngày/giờ bắt đầu; thời lượng hợp đồng/gói chỉ đọc; giờ kết thúc tính tự động; ghi chú tùy chọn. Field-level spec đầy đủ tại US03.
- Xác nhận hoàn thành chỉ khi đã hết giờ, chưa xác nhận PT và trạng thái/quyền còn hợp lệ; field-level spec modal tại US02.
- Booking giữ buổi khi đặt; hoàn thành xác nhận kép chuyển booked sang used đúng một lần. Lịch hoàn thành/hủy chỉ đọc.
- API lỗi hiển thị lỗi và Thử lại; ngày không có lịch hiển thị rỗng, không tự tạo slot.
- Booking nhóm đặt toàn bộ ACCEPTED gồm trưởng nhóm, danh sách readonly. Server chặn toàn bộ nếu bất kỳ người nào inactive, không có Gym hợp lệ ngày tập, đóng băng, sai quyền chi nhánh hoặc trùng lịch. Chỉ giữ một buổi hợp đồng nhóm.
- Booking lưu snapshot người tham gia bất biến; lịch cũ không tự thêm người mới gia nhập. PT xem snapshot trên lịch; trưởng nhóm đại diện phía Hội viên xác nhận/hủy, các thành viên khác chỉ xem. PT vẫn không được hủy. Backend owner phụ trách schema/ERD snapshot.

## User Stories
- PT01-US01: Xem lịch PT theo ngày.
- PT01-US02: Xác nhận hoàn thành và ghi kết quả buổi học.
- PT01-US03: Đặt lịch hộ hội viên được phân công; own scope, paid, period/freeze, workdays/holiday, overlap PT/hội viên và remaining kiểm tra server khi ghi.

## Traceability
- [User Stories PT](../../user-stories/pt/README.md)
- [Product Spec](../../product-spec.md), mục 4.6.
- [Screen audit PT](../../ui-related-screen-audit.md)

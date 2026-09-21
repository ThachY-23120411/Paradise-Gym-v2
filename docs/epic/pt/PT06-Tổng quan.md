# PT06 - Tổng quan

- Role: PT; Platform: Mobile; màn hình vào ứng dụng sau xác thực đầy đủ.
- Scope: đúng bốn KPI, Đặt lịch nhanh và bảng kê hoa hồng own PT chỉ đọc.

## Thành phần nghiệp vụ
- Bộ lọc Tuần này / Tháng này (mặc định) / Tháng trước.
- Bốn KPI: học viên đang phụ trách (số hội viên duy nhất hiện tại); buổi hoàn thành đủ xác nhận kép; buổi đã đặt sắp dạy; buổi chờ xác nhận. Ba KPI buổi dùng ngày tập trong kỳ; nguồn API của chính PT.
- Không còn KPI yêu cầu phân công. Đặt lịch nhanh mở PT01-US03 với PT/chi nhánh API chỉ đọc; thành công tải lại KPI và lịch đúng ngày.
- Xem bảng kê hoa hồng mở màn hình riêng PT06-US02 tại tab Hoa hồng; thẻ và lối tắt ở Tổng quan cũng mở cùng màn hình. Không phải KPI thứ năm, không còn là modal; quyền PT vẫn chỉ đọc bảng kê của mình.
- Hoa hồng own scope, chỉ tính phần PT của buổi COMPLETED. PENDING = Chờ chi trả; chi trả trực tiếp, PT không duyệt/trả tiền.
- Tổng số buổi/doanh thu PT/hoa hồng phải khớp toàn bộ chi tiết cùng kỳ. PAID đọc lịch sử đã khóa, không tính lại bằng tỷ lệ hiện tại; hiển thị ngày chi trả API.
- Lỗi/thiếu cấu hình/không đối soát được hiển thị trung thực; không dựng số liệu mẫu.
- Snapshot đã được người dùng phê duyệt: chi trả mới lưu tổng và chi tiết từng buổi nguyên tử, bất biến. PAID legacy không snapshot trả details_snapshot_available=false và sessions=[]; UI giữ tổng lịch sử, báo rõ thiếu chi tiết, không hiển thị thành 0 hoặc tái dựng dữ liệu sống. Backend agent phụ trách migration/ERD; Main xác nhận triển khai/runtime, tài liệu PT không tự thiết kế schema.

## User Stories
- PT06-US01: Bốn KPI, bộ lọc và nút Đặt lịch nhanh/Xem bảng kê.
- PT06-US02: Kỳ hoa hồng, tổng và từng buổi, trạng thái chi trả, lịch sử PAID.
- [User Stories PT](../../user-stories/pt/README.md) chứa field-level spec và diagrams.

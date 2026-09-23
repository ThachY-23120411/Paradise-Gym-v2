# QTV-W18 - Bàn giao & tất toán doanh thu

- **Role / Platform:** QTV / Quản lý có quyền tài chính, Web.
- **Menu:** W18 - Bàn giao & tất toán doanh thu.
- **Goal:** Đối chiếu các khoản thực thu chưa bàn giao, xác nhận một đợt bàn giao nội bộ và tra cứu bằng chứng lịch sử bất biến.

## Scope

1. Xem nguồn thu theo khoảng ngày tùy chọn; mặc định hôm nay theo múi giờ chi nhánh. Gom riêng tiền mặt và từng tài khoản nhận chuyển khoản.
2. Thêm tài khoản ngân hàng nhận vào danh mục lưu bền qua API; xác minh rồi chọn tài khoản ngay trên từng dòng chuyển khoản trong preview, gồm cả khoản cũ/mới chưa xác định.
3. Xem trước và xác nhận đã bàn giao đầy đủ; lưu kỳ chọn, tổng, chi tiết nguồn thu, người tạo, thời điểm và ghi chú.
4. Tra cứu danh sách và chi tiết đợt đã bàn giao; không sửa, xóa hoặc mở lại.

## Business Rules

- W18-BR01: Mọi thao tác đọc/ghi W18 yêu cầu đồng thời role QTV và quyền tài chính, trong branch scope được cấp. LT/HV/PT không được truy cập W18. Tạo đợt, thêm tài khoản và gán tài khoản yêu cầu một chi nhánh cụ thể; phạm vi ALL không được xác nhận đợt mới.
- W18-BR02: Kỳ nguồn thu lọc theo `payments.confirmed_at`, không theo thời điểm tạo đăng ký, tạo QR, tạo phiếu thu hoặc thời điểm bàn giao. Từ ngày và Đến ngày là ngày địa phương của chi nhánh, bao gồm cả hai đầu: từ 00:00 ngày đầu đến trước 00:00 ngày sau ngày cuối. Có thể chọn một ngày, nhiều ngày hoặc nhiều tuần bất kỳ; không mặc định cố định tuần/tháng và không hardcode năm. Múi giờ chi nhánh do hệ thống cung cấp.
- W18-BR03: Chỉ các khoản thanh toán thành công có phiếu thu hợp lệ, thuộc chi nhánh và kỳ chọn, chưa nằm trong bất kỳ đợt đã xác nhận nào mới đủ điều kiện. Payment ledger hiện hữu không có trạng thái mới; payment intent/chờ thanh toán không phải nguồn thu. Payment gốc luôn bất biến cả trước và sau bàn giao; không có thao tác mở khóa trước bàn giao.
- W18-BR04: Nhóm CASH riêng; BANK_TRANSFER gom theo tài khoản registry có danh tính duy nhất `bank_bin + account_no` trong chi nhánh, không gom theo tên chủ tài khoản. Giữ số tài khoản dưới dạng chuỗi, không làm mất số 0 đầu. Registry chỉ phục vụ phân loại thủ công W18, không tự thu nhận snapshot ngân hàng cho payment cũ hoặc mới.
- W18-BR05: Chuyển khoản chưa được phân loại ở preview nằm trong nhóm `Chưa xác định tài khoản`. QTV kiểm chứng chứng từ rồi chọn `Tài khoản nhận tiền` ngay trên dòng từ danh mục lưu bền; lựa chọn chỉ tồn tại trong allocation của preview và được chụp vào batch khi xác nhận, không lưu assignment/audit riêng vào payment. Không suy đoán từ ENV, cấu hình hiện tại, tài khoản mặc định hoặc tài khoản duy nhất. Còn khoản chưa xác định thì chặn batch. Câu hỏi legacy chưa được trả lời không cho phép đoán tài khoản hoặc bỏ qua khoản đó.
- W18-BR06: Danh mục được đọc và tạo qua API, lưu bền; thêm tài khoản không tự gán cho khoản cũ/mới và không đổi VietQR global config. Cặp BIN + số tài khoản không trùng trong chi nhánh. Popup `Tài khoản nhận tiền` có form `BIN ngân hàng`, `Số tài khoản`, `Tên tài khoản` và hành động `Thêm tài khoản`; chọn tài khoản để phân loại thực hiện inline ở grid. Chi tiết US01.
- W18-BR07: Tập xác nhận là toàn bộ khoản đủ điều kiện trong chi nhánh/kỳ của lần xem trước; tìm kiếm/phân trang chỉ đổi hiển thị. Server cấp fingerprint `preview_token`, kiểm tra lại toàn bộ tập, tổng, allocation, quyền, scope. Token mới bị stale hoặc tranh payment với đợt khác phải bị từ chối và làm mới, không xác nhận một phần. Gửi lại cùng token đã xác nhận trong đúng kỳ/chi nhánh trả batch gốc (idempotent), không tạo batch khác hoặc sửa snapshot/ghi chú. Một payment chỉ thuộc một batch.
- W18-BR08: QTV phải tích `Xác nhận đã bàn giao đầy đủ`; mặc định không tích. `Ghi chú` tùy chọn, tối đa 1000 ký tự. Batch có mã canonical `handover_code`; lưu nguyên tử snapshot khách hàng, gói, hợp đồng, phiếu thu, phương thức, tài khoản nhận, số tiền từng khoản cùng kỳ chọn, múi giờ, tổng, người tạo và thời điểm xác nhận. Không lưu đợt rỗng/thiếu chi tiết. Popup xác nhận chỉ hiển thị tổng hợp, checkbox và ghi chú; grid payment được đối chiếu ở US01.
- W18-BR09: Lịch sử dùng snapshot tại xác nhận, không tính lại từ dữ liệu hồ sơ/gói/danh mục tài khoản hiện tại. Không sửa/xóa/mở lại batch. Kỳ là điều kiện lựa chọn tại thời điểm xác nhận, không khóa vĩnh viễn lịch: khoản ghi nhận muộn vẫn đi vào đợt tiếp theo nếu đủ điều kiện, kể cả khi hai kỳ chồng lấn. Khoản đã thuộc đợt trước không được tính lại.
- W18-BR10: Đây là bàn giao/tất toán doanh thu nội bộ vận hành, không phải khóa sổ kế toán Nhà nước, quyết toán thuế, kê khai thuế hay lập hóa đơn thuế. Không đổi doanh thu đã ghi nhận, quyền lợi gói hoặc lịch sử thanh toán của các vai trò khác.

## UI và User Stories

Các nhãn, control, trạng thái nhập liệu và hành vi form được đặc tả đầy đủ tại từng US; không lặp lại các thành phần layout dùng chung.

| User Story | Màn hình / form | Phạm vi |
| --- | --- | --- |
| [QTV-W18-US01](<../../user-stories/qtv/QTV-W18-Bàn giao & tất toán doanh thu/QTV-W18-US01-Xem và đối chiếu nguồn thu chưa bàn giao.md>) | Chưa bàn giao; popup Tài khoản nhận tiền; dropdown trên dòng | Khoản đủ điều kiện, tổng theo nơi nhận; phân loại thủ công cho preview |
| [QTV-W18-US02](<../../user-stories/qtv/QTV-W18-Bàn giao & tất toán doanh thu/QTV-W18-US02-Xác nhận bàn giao doanh thu.md>) | Xác nhận bàn giao | Xem trước, checkbox, ghi chú, kiểm tra fingerprint, tạo snapshot |
| [QTV-W18-US03](<../../user-stories/qtv/QTV-W18-Bàn giao & tất toán doanh thu/QTV-W18-US03-Tra cứu lịch sử bàn giao.md>) | Lịch sử bàn giao; Chi tiết bàn giao | Lịch sử chỉ đọc theo phạm vi được cấp |

## Traceability

- [Product Spec - W18](../../product-spec.md#w18---bàn-giao--tất-toán-doanh-thu-21092026).
- [Screen mapping](../../ui-related-screen-audit.md#w18---bàn-giao--tất-toán-doanh-thu).
- W08 là nguồn payment/phiếu thu thành công; W18 chỉ tiêu thụ nguồn này, không thay luồng thu tiền hiện hành.
- [Kế hoạch và bàn giao](../../reports/tab1-web-admin/2026-09-21-revenue-handover-docs.md).

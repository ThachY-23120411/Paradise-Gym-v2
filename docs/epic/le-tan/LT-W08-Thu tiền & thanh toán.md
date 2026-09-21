# LT-W08 — Thu tiền & thanh toán

- **Role:** Lễ tân
- **Platform:** Web only
- **Menu:** W08
- **Goal:** Tra cứu sổ thu thành công, ghi nhận thanh toán đủ 100% và đối soát chuyển khoản trong chi nhánh phục vụ của Lễ tân.

## Phạm vi nghiệp vụ
- payments chỉ lưu giao dịch thành công, bất biến, không có status; mỗi payment có đúng một phiếu thu.
- payment_intents lưu riêng yêu cầu QR, hạn 15 phút. Hết hạn QR giữ đăng ký chờ; không tự hủy sau 3 ngày. Hủy chủ động chỉ khi đăng ký còn chờ.
- Thu CASH khi thực nhận tiền mặt. BANK_TRANSFER đối soát thủ công bắt buộc mã giao dịch ngân hàng; không chuyển thành CASH. Mô phỏng chuyển khoản được giữ cho kiểm thử; chưa cần IPN/webhook.
- Ghi nhận đủ tiền chuyển đăng ký ACTIVE hoặc SCHEDULED theo ngày hiệu lực; gửi lại không ghi trùng.

## Thành phần nghiệp vụ
- Hai KPI chỉ đọc: Tổng thực thu và Lượt thanh toán thành công. Không có KPI đơn chờ thanh toán hoặc thao tác lọc KPI theo status.
- Danh sách 9 cột: Mã phiếu, Thời gian, Hội viên (tên, mã, SĐT), Đăng ký, Phương thức, Số tiền, Người thu, Chi nhánh, Xem/in phiếu thu. Không có cột/bộ lọc trạng thái payment.
- Bộ lọc ngày/khoảng ngày (Hôm nay), phương thức và từ khóa; cùng scope và điều kiện cho danh sách/hai KPI.
- Nút Ghi nhận thanh toán mở modal chọn hội viên, đăng ký chờ, voucher, số tiền và CASH/BANK_TRANSFER. Field và flow QR/đối soát theo W08-US02; đăng ký chờ tiếp tục được xử lý ở W04.

## User Stories trong Epic

| User Story | Loại giao diện | Khối UI tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [LT-W08-US01 — Xem danh sách payment](../../user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US01-Xem danh sách payment.md) | Màn hình chính | **Bảng Danh sách Payment (Datagridview)** | Xem sổ thu thành công, lọc thời gian/phương thức/từ khóa và xem/in phiếu thu |
| [LT-W08-US02 — Tạo payment](../../user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US02-Tạo payment.md) | Modal chuyên sâu | **Modal Ghi nhận thanh toán** | Tìm đăng ký chờ thanh toán chi nhánh, nạp 100% số tiền gói, hỗ trợ Tiền mặt và Quét QR chuyển khoản tích hợp, kích hoạt gói |
| [LT-W08-US03 — Xem thống kê](../../user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US03-Xem thống kê.md) | Khối trên đầu trang | **Khối Thống kê nhanh (KPI Summary Cards)** | Hai KPI Tổng thực thu và Lượt thanh toán thành công theo cùng bộ lọc/scope |

---

## Flow specification

Mỗi User Story của `LT-W08` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.

## Traceability

- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

- Trường hợp thanh toán khi toàn bộ kỳ gốc đã qua: PAY-OQ-01 còn mở; hiện giữ ngày gốc và trả EXPIRED, không tự dời ngày và không cam kết quyền tập ACTIVE/SCHEDULED.

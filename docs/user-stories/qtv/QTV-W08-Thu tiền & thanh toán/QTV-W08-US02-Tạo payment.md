# QTV-W08-US02 - Tạo payment

## Preconditions
- QTV đã đăng nhập vào Web QTV, có quyền thu tiền tài chính.
- Đã tồn tại bản ghi Đăng ký gói tập (`Registration`) ở trạng thái **`PENDING_PAYMENT` (Chờ thanh toán)** được khởi tạo từ menu W04.

## Trigger
- QTV bấm nút **[ + Ghi nhận thanh toán ]** trên màn hình W08 (hoặc được hệ thống tự động chuyển tiếp sau khi tạo đăng ký mới tại W04).
- Màn hình liên quan: Web QTV — W08 Thu tiền & thanh toán, modal **Ghi nhận thanh toán** (`payment-form`).

## Main Flow

1. QTV bấm nút **[ + Ghi nhận thanh toán ]**.
2. SYS mở modal **Ghi nhận thanh toán**.
3. Tại trường **Đơn đăng ký chờ thanh toán**, QTV gõ tìm kiếm theo SĐT, Họ tên hội viên hoặc Mã đơn đăng ký.
4. SYS hiển thị danh sách gợi ý các đơn đăng ký (`Registration`) đang ở trạng thái **`PENDING_PAYMENT`**.
5. QTV chọn đơn đăng ký cần thu tiền từ danh sách.
6. SYS tự động nạp và hiển thị toàn bộ thông tin liên quan:
   - Thông tin Hội viên (Họ tên, SĐT).
   - Mã đăng ký và Tên gói tập.
   - Số tiền thanh toán 100% (Giá niêm yết của gói đăng ký, thanh toán 1 lần duy nhất).
7. QTV chọn **Phương thức thanh toán**: `Tiền mặt` (`CASH`) hoặc `Chuyển khoản` (`BANK_TRANSFER`):
   - **Nếu chọn Tiền mặt**: QTV nhận tiền mặt đủ 100% tại quầy.
   - **Nếu chọn Chuyển khoản**: SYS tự động sinh và hiển thị **Mã QR VietQR động** chứa chính xác số tiền 100% và cú pháp nội dung chuyển khoản để hội viên quét mã bằng ứng dụng ngân hàng.
8. QTV (nếu cần) nhập ghi chú giao dịch.
9. QTV bấm nút xác nhận thanh toán trên modal (hoặc hệ thống tự động ghi nhận khi nhận tín hiệu chuyển khoản thành công).
10. SYS kiểm tra tính hợp lệ và ghi nhận giao dịch Payment thành công (100% số tiền đã thu, tuyệt đối không có trạng thái Pending cho bản ghi Payment).
11. SYS tự động kích hoạt Đơn đăng ký (`Registration`) từ `PENDING_PAYMENT` sang **`ACTIVE`** (hoặc **`SCHEDULED`** nếu ngày bắt đầu gói ở tương lai).
12. SYS đóng modal, làm mới danh sách payment W08 và hiển thị tùy chọn xem/in phiếu thu cho hội viên.

### Field-level specification — Modal Ghi nhận thanh toán
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Tra cứu Đơn đăng ký / Hội viên | `Combobox (Search & Select)` | `USER-INPUT` | required | `TRIGGER` | Ô tìm kiếm theo SĐT, Họ tên hội viên hoặc Mã đơn; danh sách chỉ hiển thị các đơn đang ở trạng thái `PENDING_PAYMENT`. Khi người dùng chọn 1 đơn, kích hoạt nạp dữ liệu cho các trường bên dưới |
| Thông tin Hội viên | `Readonly Text` | `READONLY` | required | `DYNAMIC` | Hiển thị Họ tên, Mã HV và SĐT của hội viên (ví dụ: `Nguyễn Văn A · HV00123 · 0901 234 567`) từ đơn đăng ký được chọn ở trường trên; chỉ đọc, không cho sửa |
| Gói tập đăng ký | `Readonly Text` | `READONLY` | required | `DYNAMIC` | Hiển thị Mã đơn và Tên gói tập tương ứng từ đơn đăng ký được chọn ở trường trên; chỉ đọc, không cho sửa |
| Số tiền thanh toán 100% | `Readonly Text (Green)` | `READONLY` | required | `DYNAMIC` | Hiển thị 100% giá niêm yết của gói đăng ký (chữ xanh lá nổi bật, ví dụ: `1.350.000 đ`); chỉ đọc, cố định thanh toán 1 lần duy nhất, không chỉnh sửa |
| Phương thức thanh toán | `Radio Group` | `USER-INPUT (PREFILL)` | required | `TRIGGER` | Mặc định chọn `Tiền mặt` (`CASH`); tùy chọn: `Tiền mặt` hoặc `Chuyển khoản` (`BANK_TRANSFER`). Đóng vai trò kích hoạt hiển thị mã VietQR động |
| Khối Mã QR VietQR | `QR Code Display` | `READONLY` | conditional | `CONDITIONAL`: **Hiện khi** Phương thức thanh toán là `Chuyển khoản`; **Ẩn khi** Phương thức thanh toán là `Tiền mặt`. Mã VietQR động chứa số tài khoản gym, số tiền 100% và cú pháp `{Mã ĐK} {Mã HV} PARADISE` |
| Ghi chú giao dịch | `Text Area` | `USER-INPUT` | optional | Không | Ghi chú thêm cho giao dịch thu tiền (tối đa 255 ký tự) |

- **Business rules / logic:**
  - **Quy trình kích hoạt gói**: `Registration (PENDING_PAYMENT)` ➔ **Tạo Payment (100% thành công)** ➔ `Registration (ACTIVE / SCHEDULED)`.
  - Payment được tạo ra luôn ở trạng thái đã hoàn tất (100% đã thu tiền). Tuyệt đối không tồn tại trạng thái Pending đối với bản ghi Payment.
  - Hỗ trợ cả 2 hình thức thanh toán trong cùng 1 modal tiện lợi: tiền mặt trực tiếp hoặc quét VietQR động.
  - Hệ thống hoàn toàn không có module giảm giá, không có thanh toán nhiều lần và không ghi nhận công nợ.

## Exception Flows
- Không tìm thấy đơn đăng ký nào ở trạng thái `PENDING_PAYMENT` theo thông tin nhập: SYS hiển thị thông báo "Không tìm thấy đơn đăng ký chờ thanh toán phù hợp".

## Activity Diagram — Swimlane
**Trigger:** QTV bấm nút Ghi nhận thanh toán tại menu W08.

```mermaid
flowchart TB
  subgraph B["Boundary — Web QTV W08 / Modal Ghi nhận thanh toán"]
    subgraph L0["Swimlane — QTV"]
      I01(("Initial"))
      A01["Bấm nút Ghi nhận thanh toán"]
      A02["Tìm và chọn Đơn đăng ký PENDING_PAYMENT từ combobox"]
      A03["Chọn Phương thức: Tiền mặt hoặc Chuyển khoản (quét VietQR) & Xác nhận"]
      F01((("Final — Tạo payment 100% & Kích hoạt gói thành công")))

      I01 --> A01
    end
    subgraph L1["Swimlane — SYS"]
      S01["Mở modal Ghi nhận thanh toán"]
      S02["Lọc danh sách Registration PENDING_PAYMENT"]
      S03["Prefill thông tin Hội viên, Gói tập & Số tiền 100% giá gói"]
      S04["Hiển thị mã VietQR động nếu chọn Chuyển khoản"]
      S05["Ghi nhận bản ghi Payment thành công 100%"]
      S06["Cập nhật trạng thái Registration sang ACTIVE / SCHEDULED"]
      S07["Đóng modal & làm mới danh sách payment W08"]

      A01 --> S01
      S01 --> A02
      A02 --> S02 --> S03 --> A03
      A03 --> S04 --> S05 --> S06 --> S07 --> F01
    end
  end
```

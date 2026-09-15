# QTV-W04-US01 - Tạo đăng ký gói mới

## Preconditions
- QTV đã đăng nhập, hội viên đã có hồ sơ hợp lệ trên hệ thống và có ít nhất một gói tập đang mở bán (`selling`).
- QTV thao tác trong phạm vi chi nhánh được phân quyền (branch scope).

## Trigger
- QTV chọn nút **Tạo đăng ký gói mới** tại màn hình W04 Đăng ký & gia hạn.
- Màn hình liên quan: Web QTV — W04 Đăng ký & gia hạn, modal **Tạo đăng ký gói mới**.

## Main Flow

1. QTV mở form **Tạo đăng ký gói mới**.
2. Hội viên cung cấp SĐT hoặc Họ tên; QTV nhập tra cứu và chọn Hội viên.
3. Hội viên cho biết gói muốn đăng ký; QTV chọn Gói đăng ký.
4. SYS tự động pre-fill **Giá gốc hiện hành**.
5. QTV chọn **Ngày bắt đầu**.
6. SYS tự động pre-fill **Ngày kết thúc dự kiến** dựa theo thời hạn của gói được chọn.
7. QTV chọn **Xác nhận lưu đăng ký**.
8. SYS tạo bản ghi đăng ký (`Registration` ở trạng thái `PENDING_PAYMENT`), snapshot giá/quyền lợi và tự động ghi nhận Chi nhánh bán ngầm.

### Field-level specification — modal Tạo đăng ký gói mới
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Hội viên | `Search Combobox (Autocomplete)` | `USER-INPUT` | required | Không | QTV nhập SĐT (10 số) hoặc họ tên để tra cứu realtime trong `MEMBER_PROFILE` thuộc branch scope; chọn 1 hội viên |
| Gói đăng ký | `Select Dropdown` | `USER-INPUT` | required | `TRIGGER`: Kích hoạt nạp giá niêm yết và tính Ngày kết thúc dự kiến | QTV chọn 1 gói trong danh mục các gói đang mở bán (`ACTIVE`) |
| Ngày bắt đầu | `Date Picker` | `USER-INPUT` | required | `TRIGGER`: Làm mốc thời gian để hệ thống tính toán Ngày kết thúc dự kiến | QTV chọn ngày hiệu lực (định dạng `DD/MM/YYYY`), mặc định là ngày hôm nay |
| Ngày kết thúc dự kiến [AUTO] | `Readonly Text / Date` | `READONLY (AUTO-FILL)` | required | `DYNAMIC`: Luôn hiển thị; tự động tính toán = `Ngày bắt đầu` + `Thời hạn gói` | SYS tự động tính toán dựa trên Gói đăng ký và Ngày bắt đầu đã chọn |
| Giá gốc hiện hành | `Currency Readonly Text (VND)` | `READONLY (PREFILL)` | required | `DYNAMIC`: Luôn hiển thị; tự động lấy giá niêm yết theo *Gói đăng ký* (`TRIGGER`) đã chọn | Snapshot từ `PACKAGE.price` của gói đăng ký được chọn (ví dụ: "2.000.000 đ") |

- **Business rules / logic:**
  - **Chi nhánh bán**: Được tự động ghi nhận ngầm trong dữ liệu đăng ký và audit log theo chi nhánh của tài khoản QTV đang thao tác, không hiển thị trên Modal UI.
  - **Trạng thái đăng ký ban đầu**: Đăng ký mới luôn bắt đầu ở trạng thái **`PENDING_PAYMENT` (Chờ thanh toán)**. Đăng ký chưa thanh toán đủ 100% không được dùng để Check-in hoặc đặt lịch PT.
  - **Phân công PT**: Với gói PT hoặc Combo, thuộc tính PT phụ trách ban đầu để trống, chờ hội viên gửi yêu cầu chọn PT (assignment request) và được PT chấp nhận (`ACCEPT`) sau khi đã thanh toán 100%.

## Alternate Flows

### AF-01 - Hủy Thao Tác
1. QTV chọn **Hủy** hoặc nút **X**.
2. SYS đóng modal và không tạo đăng ký.

## Exception Flows
- Chưa chọn hội viên hoặc chưa chọn gói đăng ký: SYS chặn không cho lưu đăng ký.
- Gói tập đã ngừng bán: SYS không hiển thị trong danh sách lựa chọn.

## Activity Diagram — Swimlane
**Trigger:** QTV chọn Tạo đăng ký gói mới trong menu W04.

```mermaid
flowchart TB
  subgraph B["Boundary — Web QTV W04 / Modal Tạo đăng ký gói mới"]
    subgraph L0["Swimlane — QTV"]
      I01(("Initial"))
      A01["Mở form Tạo đăng ký gói mới"]
      A02["Tìm & chọn Hội viên theo SĐT/Họ tên"]
      A03["Chọn Gói đăng ký"]
      A04["Chọn Ngày bắt đầu"]
      A05["Xác nhận lưu đăng ký"]
      F01((("Final — Registration chờ thanh toán được tạo")))
      I01 --> A01
      A02 --> A03
    end
    subgraph L1["Swimlane — Hội viên"]
      A11["Cung cấp SĐT/Họ tên và gói muốn đăng ký"]
      A01 --> A11 --> A02
    end
    subgraph L2["Swimlane — SYS"]
      S01["Pre-fill Giá gốc hiện hành"]
      S02["Pre-fill Ngày kết thúc dự kiến dựa vào thời hạn gói được chọn"]
      S03["Tạo đăng ký (Registration PENDING_PAYMENT)"]
      A03 --> S01 --> A04 --> S02 --> A05 --> S03 --> F01
    end
  end
```

# PT01-US01 - Xem lịch PT theo ngày

## Preconditions
- PT đã đăng nhập bằng tài khoản hợp lệ; danh sách lịch có thể rỗng.

## Trigger
- PT mở PT01 · Lịch.

## Main Flow
1. SYS chọn hôm nay theo múi giờ chi nhánh và tải lịch của chính PT từ API.
2. PT chọn ngày bằng Calendar thu gọn/mở rộng; SYS nạp lại dữ liệu theo ngày.
3. SYS sắp xếp booking theo giờ bắt đầu thực tế; mỗi thẻ hiển thị ngày, giờ bắt đầu/kết thúc, học viên hoặc danh sách nhóm từ snapshot booking được phép xem, gói, chi nhánh và trạng thái. Không tạo năm ca hai tiếng hay khung trống giả.
4. Trạng thái API BOOKED hiển thị Đã đặt; PENDING_COMPLETION/AWAITING_CONFIRMATION hiển thị Chờ xác nhận; COMPLETED hiển thị Hoàn thành; CANCELLED hiển thị Đã hủy. DONE/UPCOMING chỉ là tên hiển thị legacy, không phải trạng thái mới.
5. PT mở Ghi nhận kết quả (PT01-US02) khi buổi đã kết thúc, chưa xác nhận vế PT và API cho phép; mở Đặt lịch hộ (PT01-US03) từ nút Đặt lịch.
6. SYS luôn kiểm tra own scope. PT không được hủy lịch; lịch đã hủy/hoàn thành chỉ đọc. Đổi ngày xem không tạo/sửa booking.

### Field-level specification — Màn hình Lịch
| Field / control | UI | State | Required | Conditional / dynamic | Source / validation |
| --- | --- | --- | --- | --- | --- |
| Ngày xem | Calendar / Date picker | PREFILL, USER-INPUT | required | TRIGGER | Hôm nay theo chi nhánh; chọn ngày tải API lịch |
| Chuyển tháng; mở rộng/thu gọn lịch | Icon buttons | USER-INPUT | optional | Không | Điều khiển Calendar, không thay đổi booking |
| Ngày và giờ làm việc | Text | READONLY | required | Không | Ngày đã chọn và cấu hình API; thiếu cấu hình ghi chưa cập nhật, không mặc định 08:00–18:00 |
| Danh sách booking | List | READONLY | required | DYNAMIC: luôn hiện, tập bản ghi theo ngày | API lịch own scope, giờ thực tế và trạng thái máy chủ |
| Học viên, gói, chi nhánh, giờ, trạng thái trên thẻ | Text / badges | READONLY | required | Không | Bản ghi booking; không thay giờ bằng ca cố định |
| Người tham gia và trưởng nhóm | Readonly list | READONLY | conditional | CONDITIONAL: hiện với booking nhóm; ẩn với booking cá nhân | Snapshot bất biến của booking API; không bổ sung người mới từ nhóm hiện tại |
| Xác nhận hoàn thành | Button | USER-INPUT | conditional | CONDITIONAL: hiện khi đã hết giờ, chưa xác nhận vế PT và còn quyền; ẩn khi chưa hết giờ, đã xác nhận, hoàn thành/hủy hoặc mất quyền | PT01-US02; kiểm tra lại trên server |
| Đặt lịch | Icon + text button | USER-INPUT | required | Không | PT01-US03; không cấp quyền hủy |
| Rỗng / lỗi | Status | READONLY | conditional | CONDITIONAL: hiện khi tải thành công không có lịch hoặc tải lỗi; ẩn khi có dữ liệu hợp lệ | Phân biệt ngày không có lịch với lỗi API |
| Thử lại | Button | USER-INPUT | conditional | CONDITIONAL: hiện khi tải lỗi; ẩn khi đang tải hoặc thành công | Gọi lại API theo ngày hiện tại |

- Booking nhóm hiển thị toàn bộ snapshot gồm trưởng nhóm; người gia nhập sau không tự thêm vào lịch cũ. Trưởng nhóm đại diện phía Hội viên xác nhận/hủy; các thành viên khác chỉ đọc lịch. PT không được hủy; một booking nhóm chỉ dùng một buổi hợp đồng.

## Alternate Flows
- AF-01: Đổi ngày/tháng hoặc chế độ Calendar, SYS tải lại lịch của ngày được chọn.
- AF-02: Không có lịch, SYS hiển thị trạng thái rỗng; vẫn có thể mở form đặt lịch.
- AF-03: Chọn Đặt lịch mở PT01-US03; chọn ca đủ điều kiện mở PT01-US02; không chọn thao tác thì kết thúc xem.

## Exception Flows
- EF-01: Lỗi API hoặc phiên hết hạn: hiển thị lỗi/thông báo đăng nhập lại; không tạo dữ liệu lịch thay thế.
- EF-02: Quyền/trạng thái ca thay đổi: kiểm tra lại trước khi mở thao tác, từ chối và tải trạng thái mới.

## Activity Diagram — Swimlane

```mermaid
flowchart TB
  subgraph B["Boundary - Mobile PT / PT01 - Lịch"]
    subgraph L0["Swimlane - PT"]
      I(("Initial"))
      A["Mở Lịch và chọn ngày"]
      D{"Thao tác tiếp theo?"}
      C["Chọn ngày khác"]
      B["Chọn Đặt lịch"]
      R["Chọn Xác nhận hoàn thành"]
    end
    subgraph L1["Swimlane - SYS"]
      M(("Merge - Tải ngày"))
      S["Truy vấn lịch own scope"]
      E{"Kết quả tải?"}
      ERR["Báo lỗi tải hoặc phiên"]
      FE((("Final - Chưa tải được")))
      EMPTY["Hiển thị ngày không có lịch"]
      LIST["Hiển thị booking giờ thực và snapshot người tham gia nhóm nếu có"]
      V(("Merge - Đã hiển thị"))
      FB((("Final - Mở PT01-US03")))
      Q{"Ca còn đủ quyền xác nhận?"}
      OK["Mở PT01-US02"]
      FO((("Final - Ghi nhận kết quả")))
      NO["Báo trạng thái thay đổi"]
      FN((("Final - Không mở thao tác")))
      F((("Final - Đã xem")))
    end
    I --> A
    A --> M
    C --> M
    M --> S
    S --> E
    E -->|Lỗi| ERR
    ERR --> FE
    E -->|Rỗng| EMPTY
    E -->|Có lịch| LIST
    EMPTY --> V
    LIST --> V
    V --> D
    D -->|Đổi ngày| C
    D -->|Đặt lịch| B
    B --> FB
    D -->|Xác nhận| R
    R --> Q
    Q -->|Có| OK
    OK --> FO
    Q -->|Không| NO
    NO --> FN
    D -->|Xong| F
  end
```

# QTV-W09-US03 - Tra cứu lịch sử gửi thông báo

## Preconditions
- Quản trị viên (QTV) đã đăng nhập vào hệ thống Web QTV với quyền tra cứu lịch sử thông báo.
- Hệ thống đã tự động ghi nhận nhật ký (notification log) khi các sự kiện nghiệp vụ phát sinh thông báo in-app.

## Trigger
- QTV chọn tab **Lịch sử gửi thông báo** tại menu `W09 · Quản lý thông báo`.
- Màn hình liên quan: Web QTV — Tab `W09 · Lịch sử gửi thông báo`.

## Main Flow

1. Khi các sự kiện nghiệp vụ xảy ra (Thanh toán thành công, Đặt lịch PT, Hủy lịch, Phân công PT...), Hệ thống (SYS) tự động gửi in-app notification và lưu bản ghi nhật ký thông báo (`notification_log`).
2. QTV truy cập menu **W09 · Quản lý thông báo** $\rightarrow$ chọn tab **Lịch sử gửi thông báo**.
3. SYS tải và hiển thị **Bảng Nhật ký Lịch sử gửi thông báo (Datagridview 6 cột)**:
   - **Thời gian**: Ngày và giờ phát thông báo (`DD/MM/YYYY HH:mm`).
   - **Sự kiện**: Mã sự kiện phát sinh (ví dụ: `PAYMENT_CONFIRMED`, `BOOKING_CREATED`).
   - **Người nhận**: Ô 2 dòng: Dòng trên là Họ tên (`Nguyễn Văn A`), dòng dưới là `Mã định danh · SĐT` (`HV00123 · 0901 234 567`) giúp nhận diện chính xác người nhận.
   - **Tiêu đề thông báo**: Tiêu đề thông báo thực tế người nhận đã xem (sau khi SYS đã render thay thế các biến động thành dữ liệu thực tế).
   - **Mã tham chiếu**: Mã chứng từ hoặc hồ sơ nguồn dạng link (ví dụ: `PT00123`, `BK00456`), bấm vào để mở xem chi tiết giao dịch hoặc lịch tập tương ứng.
   - **Trạng thái đọc**: Badge `Đã đọc` (màu xanh) hoặc `Chưa đọc` (màu xám).
   - **Thao tác**: Nút **`[ 👁 ]`** để mở xem toàn văn nội dung chi tiết thông báo đã gửi.
4. QTV sử dụng thanh công cụ lọc và tìm kiếm:
   - **Bộ lọc thời gian**: `Date / Date Range Picker` (Mặc định hôm nay `TODAY`, chọn 1 ngày hoặc khoảng ngày).
   - **Bộ lọc Sự kiện**: Dropdown chọn sự kiện phát sinh (`Tất cả`, `Thanh toán`, `Đặt lịch`, `Gói sắp hết hạn`...).
   - **Bộ lọc Trạng thái đọc**: Dropdown chọn `Tất cả`, `Đã đọc`, `Chưa đọc`.
   - **Ô tìm kiếm**: Tìm theo Họ tên, SĐT người nhận hoặc Mã tham chiếu.
5. Khi QTV thay đổi bộ lọc hoặc nhập từ khóa tìm kiếm, SYS lọc và làm mới danh sách nhật ký tương ứng.
6. Khi QTV bấm vào mã tham chiếu hoặc nút **`[ 👁 ]`**, SYS hiển thị chi tiết nội dung đầy đủ đã phát và điều hướng deep-link đến giao dịch/lịch tập gốc nếu cần.

### Field-level specification — Bảng Nhật ký Lịch sử gửi thông báo (Màn hình chính Tab 3)
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Bộ lọc thời gian gửi | `Date / Date Range Picker` | `USER-INPUT (PREFILL)` | required | `TRIGGER` | Mặc định điền sẵn **Hôm nay (`TODAY`)**; hỗ trợ chọn 1 ngày hoặc khoảng ngày (*Từ ngày — Đến ngày*). Khi thay đổi, hệ thống tự động lọc lại nhật ký thông báo |
| Bộ lọc Sự kiện | `Select Dropdown` | `USER-INPUT` | optional | Không | Mặc định `Tất cả`; tùy chọn: `PAYMENT_CONFIRMED`, `BOOKING_CREATED`, `PACKAGE_EXPIRING`... |
| Bộ lọc Trạng thái đọc | `Select Dropdown` | `USER-INPUT` | optional | Không | Mặc định `Tất cả`; tùy chọn: `Đã đọc`, `Chưa đọc` |
| Ô tìm kiếm nhật ký | `Text Input (Search)` | `USER-INPUT` | optional | Không | Tìm kiếm theo Họ tên, SĐT người nhận hoặc Mã tham chiếu |
| Cột Thời gian | `Readonly Text` | `READONLY` | required | Không | Thời điểm phát sinh thông báo (`DD/MM/YYYY HH:mm`) |
| Cột Sự kiện | `Status Badge` | `READONLY` | required | `DYNAMIC` | Tên mã sự kiện phát sinh thông báo (ví dụ: `PAYMENT_CONFIRMED`) |
| Cột Người nhận | `Readonly Text (Two-line Cell)` | `READONLY` | required | Không | Hiển thị 2 dòng: Dòng 1 Họ tên người nhận (chữ đậm), Dòng 2 `Mã định danh · SĐT` (chữ xám nhỏ) tránh trùng tên |
| Cột Tiêu đề thông báo | `Readonly Text` | `READONLY` | required | `DYNAMIC` | Tiêu đề thông báo thực tế đã gửi (sau khi nạp biến động thành dữ liệu thật, ví dụ: *"Thanh toán thành công gói Gym 1 Tháng"*). Giúp bảng gọn gàng, không bị tràn dòng; xem toàn văn nội dung tại nút `[ 👁 ]` |
| Cột Mã tham chiếu | `Link Text` | `READONLY` | optional | `DYNAMIC` | Mã chứng từ hoặc hồ sơ nguồn dạng link (ví dụ: `PT00123`, `BK00456`); click điều hướng đến màn hình chi tiết tương ứng (hiển thị `-` nếu là thông báo chung) |
| Cột Trạng thái đọc | `Status Badge` | `READONLY` | required | `DYNAMIC` | Trạng thái đọc thông báo trên app: `Đã đọc` (badge xanh lá) hoặc `Chưa đọc` (badge xám) |
| Nút Xem chi tiết `[ 👁 ]` | `Icon Button` | `USER-INPUT` | optional | Không | Nút icon con mắt trên từng dòng; click mở popup/drawer xem toàn văn nội dung thông báo |

- **Business rules / logic:**
  - Màn hình lịch sử phục vụ mục đích **Tra cứu và Kiểm tra nhật ký kiểm toán (Read-only)**. QTV tuyệt đối không có quyền chỉnh sửa, thu hồi hay xóa log thông báo đã phát.
  - Trạng thái `Đã đọc` được cập nhật tự động khi người dùng mở xem thông báo trên Mobile App.

## Exception Flows
- Không tìm thấy nhật ký thỏa mãn điều kiện lọc: SYS hiển thị thông báo danh sách trống.

## Activity Diagram — Swimlane
**Trigger:** QTV truy cập tab Lịch sử gửi thông báo trong W09.

```mermaid
flowchart TB
  subgraph B["Boundary — Web QTV W09 / Nhật ký lịch sử gửi thông báo"]
    subgraph L0["Swimlane — Quản trị viên (QTV)"]
      I01(("Initial"))
      A01["Truy cập tab Lịch sử gửi thông báo trong W09"]
      A02["Xem danh sách nhật ký thông báo"]
      A03{"Chọn hành động"}
      A04["Thay đổi bộ lọc thời gian / sự kiện / trạng thái đọc hoặc tìm kiếm"]
      A05["Bấm [👁] hoặc click mã chứng từ nguồn để xem chi tiết / điều hướng"]
      F01((("Final — Tra cứu và kiểm tra lịch sử thông báo thành công")))

      I01 --> A01
      A02 --> A03
      A03 -->|Lọc hoặc tìm kiếm| A04
      A03 -->|Xem chi tiết| A05
    end

    subgraph L1["Swimlane — SYS"]
      S01["Tải danh sách nhật ký thông báo theo mốc lọc mặc định hôm nay"]
      S02["Lọc và làm mới hiển thị bảng Datagridview theo điều kiện lọc"]
      S03["Hiển thị toàn văn nội dung thông báo và điều hướng deep-link đến chứng từ nguồn"]

      A01 --> S01 --> A02
      A04 --> S02 --> A02
      A05 --> S03 --> F01
    end
  end
```

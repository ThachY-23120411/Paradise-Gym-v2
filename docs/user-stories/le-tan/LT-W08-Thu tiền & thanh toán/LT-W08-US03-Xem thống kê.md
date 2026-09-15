# LT-W08-US03 - Xem thống kê

## Preconditions
- Lễ tân đã đăng nhập vào Web Lễ tân, có quyền thu tiền và đang ở menu W08 Thu tiền & thanh toán trong chi nhánh phục vụ.

## Trigger
- Lễ tân truy cập menu **W08 · Thu tiền & thanh toán** trên thanh điều hướng chính hoặc thay đổi giá trị tại **Bộ lọc thời gian thanh toán**.
- Màn hình liên quan: Web Lễ tân — W08 Thu tiền & thanh toán, Khối Thống kê nhanh (KPI Summary Cards).

## Main Flow

1. Lễ tân truy cập menu W08 Thu tiền & thanh toán (hoặc điều chỉnh giá trị tại Bộ lọc thời gian thanh toán).
2. SYS tự động tổng hợp và hiển thị **Khối Thống kê nhanh (KPI Summary Cards)** thuộc chi nhánh phục vụ ở phần trên cùng của màn hình theo mốc thời gian đã chọn (mặc định là Hôm nay `TODAY`):
   - **Thẻ Tổng thực thu**: Tổng số tiền thực thu 100% từ các giao dịch thanh toán thành công trong mốc thời gian lọc tại chi nhánh (ví dụ: `5.650.000 đ`).
   - **Thẻ Lượt thanh toán thành công**: Tổng số lượt giao dịch payment đã thu tiền thành công 100% trong mốc thời gian lọc tại chi nhánh (ví dụ: `12 lượt`).
   - **Thẻ Đơn chờ thanh toán**: Tổng số lượng đơn đăng ký (`Registration`) đang ở trạng thái `PENDING_PAYMENT` và tổng giá trị các đơn này tại chi nhánh đang chờ khách đóng tiền để kích hoạt gói (ví dụ: `3 đơn · 4.500.000 đ`).
3. Lễ tân theo dõi các chỉ số tài chính dòng tiền thực thu và tình hình các đơn chờ thanh toán tại chi nhánh theo thời gian thực.
4. Khi Lễ tân chọn ngày khác hoặc khoảng ngày tại **Bộ lọc thời gian thanh toán**, SYS lập tức tính toán và làm mới số liệu của cả 3 thẻ KPI đồng bộ với bảng danh sách payment chi nhánh bên dưới.

### Field-level specification — Khối Thống kê nhanh (KPI Summary Cards)
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Thẻ Tổng thực thu | `Stat Card (Currency)` | `READONLY` | required | `DYNAMIC` | Tổng số tiền đã thu thành công 100% theo ngày/khoảng ngày được chọn tại Bộ lọc thời gian thanh toán (mặc định hôm nay `TODAY`, ví dụ: `5.650.000 đ`). Nguồn từ các bản ghi Payment `CONFIRMED` thuộc branch scope |
| Thẻ Lượt thanh toán thành công | `Stat Card (Count)` | `READONLY` | required | `DYNAMIC` | Tổng số lượt giao dịch thanh toán thành công 100% theo ngày/khoảng ngày được chọn tại Bộ lọc thời gian thanh toán (mặc định hôm nay `TODAY`, ví dụ: `12 lượt`) tại chi nhánh |
| Thẻ Đơn chờ thanh toán | `Stat Card (Count & Currency)` | `READONLY` | required | `DYNAMIC` | Số lượng đơn và tổng giá trị các gói đang ở trạng thái `PENDING_PAYMENT` tại chi nhánh chờ hội viên đóng tiền để kích hoạt gói tính đến hiện tại hoặc theo thời gian lọc (ví dụ: `3 đơn · 4.500.000 đ`) |

- **Business rules / logic:**
  - Các chỉ số KPI phản ánh trung thực và tức thời dòng tiền thực thu 100% từ các giao dịch thành công tại chi nhánh của Lễ tân.
  - Tuyệt đối không có chỉ số công nợ hay nợ đọng; phân định rõ số tiền đã thu vào quỹ và số tiền của các đơn đăng ký đang chờ đóng tiền (`PENDING_PAYMENT`).
  - Số liệu tự động cập nhật ngay khi:
    1. Thay đổi ngày/khoảng ngày tại Bộ lọc thời gian thanh toán.
    2. Có giao dịch thanh toán mới thành công tại chi nhánh.
    3. Có đơn đăng ký mới được tạo ở trạng thái `PENDING_PAYMENT` từ menu W04 tại chi nhánh.

## Activity Diagram — Swimlane
**Trigger:** Lễ tân mở menu W08 hoặc đổi bộ lọc thời gian để theo dõi thống kê dòng tiền chi nhánh.

```mermaid
flowchart TB
  subgraph B["Boundary — Web Lễ tân W08 / Khối Thống kê nhanh"]
    subgraph L0["Swimlane — Lễ tân"]
      I01(("Initial"))
      A01["Mở menu W08 Thu tiền & thanh toán hoặc đổi Bộ lọc thời gian"]
      A02["Theo dõi các thẻ chỉ số KPI dòng tiền thực thu và đơn chờ thanh toán chi nhánh"]
      F01((("Final — Đã nắm bắt tình hình dòng tiền theo thời gian chọn tại chi nhánh")))

      I01 --> A01
      A02 --> F01
    end
    subgraph L1["Swimlane — SYS"]
      S01["Tính toán tổng số tiền thực thu 100% từ các Payment thành công tại chi nhánh theo mốc thời gian lọc"]
      S02["Thống kê số lượng đơn Registration đang PENDING_PAYMENT tại chi nhánh và tổng giá trị"]
      S03["Hiển thị và làm mới 3 thẻ KPI Summary lên đầu trang W08 của Lễ tân"]

      A01 --> S01
      S01 --> S02
      S02 --> S03
      S03 --> A02
    end
  end
```

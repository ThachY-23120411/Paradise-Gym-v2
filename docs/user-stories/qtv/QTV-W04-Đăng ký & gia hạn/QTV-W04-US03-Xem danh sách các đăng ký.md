# QTV-W04-US03 - Xem danh sách các đăng ký

## Preconditions
- QTV đã đăng nhập, branch scope của QTV đã được xác định.

## Trigger
- QTV mở menu W04 hoặc chọn **Đăng ký & gia hạn**.
- Màn hình liên quan: Web QTV — W04 Đăng ký & gia hạn.

## Main Flow

1. QTV mở danh sách các đăng ký.
2. SYS xác định branch scope của QTV.
3. SYS hiển thị danh sách các đăng ký gói theo branch scope (Mã đăng ký, Tên hội viên, SĐT, Tên gói, Ngày bắt đầu, Ngày kết thúc, Trạng thái đăng ký).

- **Business rules / logic:**
  - Chỉ trả dữ liệu thuộc role và branch scope của QTV.
  - Danh sách là read-only; các thao tác Tạo đăng ký gói mới hay Gia hạn sử dụng các User Story tương ứng.

## Exception Flows
- Lỗi tải dữ liệu: hiển thị thông báo lỗi.

## Activity Diagram — Swimlane
**Trigger:** QTV mở Danh sách các đăng ký trong menu W04.

```mermaid
flowchart TB
  subgraph B["Boundary — QTV Web / W04 Danh sách các đăng ký"]
    subgraph L0["Swimlane — QTV"]
      I01(("Initial"))
      A01["Mở danh sách các đăng ký"]
      F01((("Final — Danh sách được hiển thị")))
      I01 --> A01
    end
    subgraph L1["Swimlane — SYS"]
      S01["Xác định branch scope"]
      S02["Hiển thị danh sách các đăng ký theo branch scope (Mã đăng ký, Tên hội viên, SĐT, Tên gói, Trạng thái)"]
      A01 --> S01 --> S02 --> F01
    end
  end
```

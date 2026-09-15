# QTV-W05-US03 - Cập nhật trạng thái hồ sơ PT

## Preconditions
- QTV đã đăng nhập, hồ sơ PT đã tồn tại thuộc chi nhánh mà QTV quản lý (branch scope).
- Đổi trạng thái không xóa hồ sơ PT hoặc lịch sử các buổi tập đã hoàn thành.

## Trigger
- QTV mở hồ sơ PT và chọn **Đổi trạng thái**.
- Màn hình liên quan: Web QTV — W05 Huấn luyện viên, modal **Đổi trạng thái hồ sơ PT**.

## Main Flow

1. QTV mở modal **Đổi trạng thái hồ sơ PT**.
2. SYS hiển thị trạng thái hiện tại của PT.
3. QTV chọn Trạng thái mới và nhập Lý do (nếu muốn).
4. QTV chọn **Lưu thay đổi**.
5. SYS cập nhật trạng thái mới, ghi audit log (bao gồm lý do nếu có) và hiển thị kết quả.

### Field-level specification — modal Đổi trạng thái hồ sơ PT
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Huấn luyện viên | `Readonly Text` | `READONLY (PREFILL)` | required | Không | SYS nạp từ hồ sơ PT được chọn; hiển thị họ tên và mã PT định danh (ví dụ: "Nguyễn Văn Hùng (PT001)") |
| Trạng thái hiện tại | `Status Badge` | `READONLY (PREFILL)` | required | Không | SYS nạp từ hồ sơ PT được chọn; hiển thị badge trực quan của trạng thái hiện tại (ví dụ: `Đang hoạt động`, `Ngừng hoạt động`) |
| Trạng thái mới | `Select Dropdown` | `USER-INPUT` | required | Không | QTV chọn trạng thái mới mong muốn (`Đang hoạt động`, `Ngừng hoạt động`, `Đã lưu trữ`) |
| Lý do đổi trạng thái | `Textarea` | `USER-INPUT` | optional | Không | QTV nhập tự do (nếu muốn) để ghi nhận lý do vào nhật ký kiểm toán (audit log) |

- **Business rules / logic:**
  - Trạng thái PT `Ngừng hoạt động` chỉ ngăn không cho phân công mới hoặc đặt lịch PT mới; không làm mất lịch sử các buổi tập đã hoàn thành.
  - Lý do đổi trạng thái là không bắt buộc, chỉ dùng để lưu vết audit log nếu QTV nhập.
  - Sau khi lưu thay đổi, hệ thống cập nhật tức thì trạng thái hồ sơ PT và làm mới giao diện danh sách PT.

## Alternate Flows

### AF-01 - Hủy Thao Tác
1. QTV chọn **Hủy** hoặc đóng modal.
2. SYS giữ nguyên trạng thái hiện tại của PT.

## Exception Flows
- Hồ sơ PT không tồn tại hoặc ngoài branch scope: không cho thao tác.
- Lỗi kết nối/lưu dữ liệu: giữ trạng thái cũ và báo thất bại.

## Activity Diagram — Swimlane
**Trigger:** QTV mở hồ sơ PT và chọn Đổi trạng thái.

```mermaid
flowchart TB
  subgraph B["Boundary — Web QTV W05 / Modal Đổi trạng thái hồ sơ PT"]
    subgraph L0["Swimlane — QTV"]
      I01(("Initial"))
      A01["Mở modal Đổi trạng thái"]
      A02["Chọn Trạng thái mới, nhập Lý do (nếu có)"]
      A03["Chọn Lưu thay đổi"]
      F01((("Final — Trạng thái được cập nhật")))
      I01 --> A01
      A02 --> A03
    end
    subgraph L1["Swimlane — SYS"]
      S01["Nạp thông tin và trạng thái hiện tại của PT"]
      S02["Cập nhật trạng thái mới và ghi audit log"]
      A01 --> S01 --> A02
      A03 --> S02 --> F01
    end
  end
```

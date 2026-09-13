# QTV-W05-US02 - Sửa hồ sơ PT

## Preconditions
- QTV đã đăng nhập, hồ sơ PT đã tồn tại thuộc chi nhánh mà QTV quản lý (branch scope).

## Trigger
- QTV mở một hồ sơ trong danh sách W05 và chọn **Sửa hồ sơ**.
- Màn hình liên quan: Web QTV — W05 Huấn luyện viên, modal **Sửa hồ sơ PT**.

## Main Flow

1. QTV mở modal **Sửa hồ sơ PT**.
2. SYS nạp dữ liệu hiện tại và khóa các field không thuộc phạm vi sửa (Số điện thoại, Chi nhánh phục vụ).
3. QTV cập nhật các trường được phép (Họ tên, Chuyên môn/Ghi chú).
4. QTV chọn **Lưu thay đổi**.
5. SYS kiểm tra required field và định dạng dữ liệu.
6. SYS cập nhật hồ sơ PT, ghi lịch sử thay đổi và hiển thị kết quả.

### Field-level specification — modal Cập nhật hồ sơ PT
| Field / control | State | Required | Conditional / dynamic | Source / validation |
| --- | --- | --- | --- | --- |
| Họ và tên | `USER-INPUT` | required | Không | Giá trị hiện tại `PREFILL`, QTV cập nhật |
| Số điện thoại | `READONLY (PREFILL)` | required | Không | Giá trị hiện tại hiển thị cố định; SĐT là khóa định danh, không được phép sửa |
| Chi nhánh phục vụ | `READONLY (PREFILL)` | required | Không | Trường cố định: lấy từ hồ sơ khởi tạo, không thể thay đổi |
| Chuyên môn / Ghi chú | `USER-INPUT` | optional | Không | QTV cập nhật mô tả chuyên môn hoặc ghi chú của PT |

- **Business rules / logic:**
  - Không cho phép sửa đổi số điện thoại để đảm bảo tính toàn vẹn của dữ liệu định danh và tài khoản.
  - Sửa hồ sơ không đồng nghĩa đổi trạng thái; đổi trạng thái dùng `QTV-W05-US03`.

## Alternate Flows

### AF-01 - Không Có Thay Đổi
1. QTV mở hồ sơ nhưng không sửa field nào.
2. Nút **Lưu thay đổi** ở trạng thái không khả dụng hoặc thao tác kết thúc không phát sinh bản ghi mới.

## Exception Flows
- Hồ sơ không tồn tại hoặc ngoài branch scope: từ chối truy cập.
- Xóa required field: không cho lưu và chỉ rõ field lỗi.

## Activity Diagram — Swimlane
**Trigger:** QTV mở hồ sơ PT và chọn Sửa hồ sơ.

```mermaid
flowchart TB
  subgraph B["Boundary — QTV Web W05 / Modal Sửa hồ sơ PT"]
    subgraph L0["Swimlane — QTV"]
      I01(("Initial"))
      A01["Mở hồ sơ và chọn Sửa hồ sơ PT"]
      A02["Sửa các trường được phép (Họ tên, Chuyên môn)"]
      A03["Chọn Lưu thay đổi"]
      F01((("Final — Hồ sơ PT được cập nhật")))
      F02((("Final — Hồ sơ giữ nguyên")))
      I01 --> A01
      A02 --> A03
    end
    subgraph L1["Swimlane — SYS"]
      S01["Nạp dữ liệu PREFILL, khóa SĐT"]
      D01{"Dữ liệu hợp lệ?"}
      S02["Cập nhật hồ sơ PT và ghi lịch sử audit"]
      S03["Trả lỗi, không cập nhật record"]
      A01 --> S01 --> A02
      A03 --> D01
      D01 -->|Có| S02 --> F01
      D01 -->|Không| S03 --> F02
    end
  end
```

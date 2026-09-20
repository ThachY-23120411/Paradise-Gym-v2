# LT-W04-US05 - Gán PT phụ trách cho gói đăng ký tại quầy

## Preconditions
- Lễ tân đã đăng nhập hệ thống, trong phạm vi branch scope quầy tiếp đón.
- Gói đăng ký là gói PT hoặc COMBO thuộc chi nhánh của Lễ tân, đã hoàn tất thanh toán 100% (ở trạng thái `Đang hiệu lực` hoặc `Chưa đến ngày hiệu lực`) và chưa có PT phụ trách (`assigned_pt_id` đang để trống).
- Theo quy định mới: Hội viên không tự chọn PT trên ứng dụng Mobile; Lễ tân trực tiếp chọn và gán PT cho khách hàng tại quầy.

## Trigger
- Lễ tân bấm nút **[Gán PT]** trên dòng đăng ký tại Data Grid View menu W04 (hoặc trong drawer chi tiết đăng ký sau khi thu tiền).
- Màn hình liên quan: Web Lễ tân — W04 Đăng ký & gia hạn, modal **Gán PT phụ trách**.

## Main Flow

1. Lễ tân bấm nút **[Gán PT]** tại dòng đăng ký gói PT hoặc COMBO đã thanh toán đủ 100%.
2. SYS mở modal **Gán PT phụ trách**.
3. SYS tự động nạp thông tin đăng ký: Mã đăng ký, Hội viên, Gói đăng ký, Chi nhánh.
4. SYS nạp danh sách các Huấn luyện viên đang hoạt động (`ACTIVE`) tại chi nhánh của Lễ tân vào Combobox chọn PT.
5. Lễ tân tư vấn và chọn Huấn luyện viên phụ trách phù hợp với yêu cầu/nguyện vọng của hội viên.
6. Lễ tân nhập ghi chú phân công (nếu có).
7. Lễ tân bấm nút **Xác nhận gán PT**.
8. SYS lưu `assigned_pt_id` vào hợp đồng `REGISTRATIONS`, gửi thông báo in-app cho Huấn luyện viên và Hội viên, ghi audit log và đóng modal.
9. SYS cập nhật hiển thị dòng đăng ký: Cột `PT phụ trách` cập nhật tên HLV.

### Field-level specification — modal Gán PT phụ trách
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Mã đăng ký | `Readonly Text` | `READONLY (PREFILL)` | required | `Không` | Mã đăng ký từ `REGISTRATIONS.reg_code` |
| Hội viên | `Readonly Text` | `READONLY (PREFILL)` | required | `Không` | Thông tin hội viên `{Họ tên} ({Mã HV} · {SĐT})` |
| Gói đăng ký | `Readonly Text` | `READONLY (PREFILL)` | required | `Không` | Tên gói đăng ký |
| Chi nhánh | `Readonly Text` | `READONLY (PREFILL)` | required | `Không` | Chi nhánh quầy đang làm việc |
| Huấn luyện viên phụ trách | `Select Dropdown (Searchable)` | `USER-INPUT` | required | `Không` | Lễ tân tìm kiếm & chọn HLV `ACTIVE` tại chi nhánh |
| Ghi chú phân công | `Textarea` | `USER-INPUT` | optional | `Không` | Ghi chú nguyện vọng hoặc lưu ý thể lực của khách |

## Alternate Flows

### AF-01 - Hủy Thao Tác
1. Lễ tân chọn **Hủy** hoặc nút **✕** trên modal.
2. SYS đóng modal và giữ nguyên trạng thái gói đăng ký chưa gán PT.

## Exception Flows
- **Chưa thanh toán đủ 100%:** SYS chặn gán PT đối với các gói chưa thanh toán thành công.
- **Không có Huấn luyện viên khả dụng:** Chi nhánh không có PT nào đang ở trạng thái `ACTIVE`. SYS thông báo *"Không tìm thấy HLV khả dụng tại chi nhánh"* và vô hiệu hóa nút xác nhận.

## Activity Diagram — Swimlane
**Trigger:** Lễ tân bấm nút Gán PT tại dòng đăng ký gói trong menu W04.

```mermaid
flowchart TB
  subgraph B["Boundary — Web Lễ tân W04 / Modal Gán PT phụ trách"]
    subgraph L0["Swimlane — Lễ tân"]
      I01(("Initial"))
      A01["Bấm nút [Gán PT] tại dòng đăng ký đã thanh toán 100%"]
      A02["Tìm kiếm & chọn Huấn luyện viên từ combobox"]
      A03["Nhập ghi chú (nếu có) và bấm Xác nhận gán PT"]
      F01((("Final — Gói đăng ký đã được gán HLV phụ trách")))
      F02((("Final — Hủy thao tác")))
    end

    subgraph L1["Swimlane — SYS"]
      S01["Kiểm tra điều kiện: Gói đã thanh toán 100% và chưa có PT"]
      D01{"Đủ điều kiện?"}
      S02["Hiển thị modal gán PT và nạp danh sách HLV ACTIVE"]
      S03["Lưu assigned_pt_id, gửi thông báo in-app cho PT & HV, ghi audit log"]
      S04["Báo lỗi chưa thanh toán hoặc chưa có PT khả dụng"]

      I01 --> A01 --> S01 --> D01
      D01 -->|Đủ điều kiện| S02 --> A02 --> A03 --> S03 --> F01
      D01 -->|Không đủ điều kiện| S04 --> F02
    end
  end
```

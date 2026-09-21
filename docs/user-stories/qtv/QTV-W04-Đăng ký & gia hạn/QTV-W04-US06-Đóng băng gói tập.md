# QTV-W04-US06 - Đóng băng gói tập

## Preconditions
- QTV đã đăng nhập hệ thống, trong phạm vi branch scope.
- Gói đã thanh toán đủ 100%, hiện đang có hiệu lực ACTIVE (bao gồm hiển thị Sắp hết hạn từ is_expiring), còn thời hạn bảo lưu, chưa đóng băng. Không áp dụng cho gói chưa trả hoặc chưa đến ngày hiệu lực SCHEDULED.
- Hội viên có nhu cầu tạm dừng tập luyện (đi công tác, điều trị chấn thương, lý do cá nhân).

## Trigger
- QTV bấm nút **[Đóng băng gói]** tại dòng đăng ký gói trong menu W04 (hoặc trong drawer chi tiết đăng ký).
- Màn hình liên quan: Web QTV — W04 Đăng ký & gia hạn, modal **Đóng băng gói tập**.

## Main Flow

1. QTV bấm nút **[Đóng băng gói]** tại hợp đồng đăng ký gói của hội viên (áp dụng cho mọi gói có thời hạn sử dụng `end_date IS NOT NULL`, bao gồm cả gói ngày và gói buổi PT).
2. SYS kiểm tra lại thanh toán, hiệu lực hiện tại và quyền/scope trước khi mở modal **Đóng băng gói tập**; kiểm tra lại một lần nữa khi xác nhận.
3. SYS hiển thị thông tin hợp đồng hiện tại: Mã đăng ký, Tên hội viên, Thời hạn hiện tại.
4. SYS hiển thị **Ngày bắt đầu đóng băng** ở trạng thái chỉ đọc (`READONLY`), mặc định và cố định là ngày hiện tại (áp dụng đóng băng lập tức).
5. QTV nhập **Số ngày tạm dừng / đóng băng** (tối đa bằng số ngày còn lại của gói tính từ ngày hiện tại đến ngày hết hạn hiện tại) HOẶC chọn **Ngày mở lại dự kiến** (hệ thống tự động tính toán đồng bộ 2 chiều giữa 2 trường).
6. QTV nhập **Lý do đóng băng** (ví dụ: *"Hội viên đi công tác nước ngoài 2 tuần"*).
7. QTV bấm **Xác nhận đóng băng**.
8. SYS tạo bản ghi trong bảng `package_freezes` với `status = 'ACTIVE'`, cập nhật `is_frozen = true` trên hợp đồng, tạm khóa quyền check-in và đặt lịch PT, tự động kéo dài ngày hết hạn `end_date` của gói và tăng `freeze_days_total`, gửi thông báo in-app cho hội viên và ghi audit log.
9. SYS đóng modal, cập nhật badge trạng thái gói trên danh sách dữ liệu thành `❄️ ĐANG ĐÓNG BĂNG`.

### Field-level specification — modal Đóng băng gói tập
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Thông tin hợp đồng | `Readonly Text Group` | `READONLY (PREFILL)` | required | `Không` | Mã ĐK, Họ tên hội viên, Thời hạn hiện tại (`dd/MM/yyyy - dd/MM/yyyy`) |
| Ngày bắt đầu đóng băng | `Date Box` | `READONLY (PREFILL)` | required | `Không` | Mặc định và cố định ngày hiện tại; không cho phép sửa ngày tương lai |
| Số ngày tạm dừng / đóng băng | `Number Box` | `USER-INPUT` | required | `TRIGGER` | Mặc định 7 (hoặc tối đa số ngày còn lại nếu $< 7$); min: 1, max: số ngày còn lại của gói tính từ hôm nay |
| Ngày mở lại dự kiến | `Date Box` | `USER-INPUT` | required | `DYNAMIC` | Tự động đồng bộ 2 chiều với Số ngày đóng băng; min: `Hôm nay + 1`, max: `Ngày hết hạn hiện tại` |
| Lý do đóng băng | `Textarea` | `USER-INPUT` | required | `Không` | QTV nhập lý do theo đề nghị của hội viên (tối đa 255 ký tự) |

## Alternate Flows

### AF-01 - Hủy thao tác
1. QTV bấm nút `Hủy` hoặc icon `✕`.
2. SYS đóng modal, không thay đổi trạng thái gói.

## Exception Flows
- Gói chưa thanh toán hoặc ngày bắt đầu còn ở tương lai (SCHEDULED): ẩn nút, từ chối cả khi gọi thao tác trực tiếp. Cùng điều kiện cho QTV, Lễ tân và Hội viên; không có ngoại lệ quyền staff.
- Gói hiển thị Sắp hết hạn vẫn được bảo lưu nếu hiện đang có hiệu lực, đã trả đủ và thỏa các điều kiện còn lại; không đổi status ACTIVE thành enum DB mới.
- **Gói đã hết hạn hoặc đã bị hủy:** SYS chặn thao tác và thông báo gói không đủ điều kiện đóng băng.
- **Gói tập vô thời hạn:** SYS thông báo gói tập vô thời hạn không cần đóng băng bảo lưu thời gian.
- **Số ngày đóng băng vượt quá số ngày còn lại:** SYS chặn và báo lỗi số ngày đóng băng không được vượt quá số ngày còn lại của gói.

## Activity Diagram — Swimlane
**Trigger:** QTV bấm nút Đóng băng gói trong menu W04.

```mermaid
flowchart TB
  subgraph B["Boundary - Web QTV / W04 Bảo lưu"]
    subgraph L0["Swimlane - QTV"]
      I(("Initial"))
      A["Bấm Đóng băng gói"]
      INPUT["Nhập số ngày/ngày mở lại và nhập lý do đóng băng"]
      CHOICE{"Xác nhận hay đóng modal?"}
    end
    subgraph L1["Swimlane - SYS"]
      CHECK["Kiểm tra scope, trả đủ, hiện ACTIVE kể cả cận hạn và đủ điều kiện bảo lưu"]
      D{"Đủ điều kiện?"}
      FORM["Mở modal với dữ liệu hợp đồng, ngày bắt đầu readonly là hôm nay"]
      VALID["Kiểm tra lại điều kiện, thời lượng và ngày hết hạn"]
      DV{"Dữ liệu hợp lệ?"}
      NOW["Ghi đợt đang đóng băng ACTIVE, kích hoạt is_frozen và tạm dừng quyền tập"]
      SAVE["Cập nhật hạn gói, lưu audit, thông báo và làm mới danh sách"]
      F((("Final - Đã kích hoạt đóng băng")))
      ME(("Merge - Không đủ điều kiện"))
      ERR["Báo lỗi, giữ nguyên gói"]
      FE((("Final - Từ chối")))
      FC((("Final - Đóng modal không thay đổi")))
    end
    I --> A
    A --> CHECK
    CHECK --> D
    D -->|Có| FORM
    FORM --> INPUT
    INPUT --> CHOICE
    CHOICE -->|Đóng| FC
    CHOICE -->|Xác nhận| VALID
    VALID --> DV
    DV -->|Không| ME
    DV -->|Có| NOW
    NOW --> SAVE
    SAVE --> F
    D -->|Không, gồm chưa trả hoặc SCHEDULED| ME
    ME --> ERR
    ERR --> FE
  end
```

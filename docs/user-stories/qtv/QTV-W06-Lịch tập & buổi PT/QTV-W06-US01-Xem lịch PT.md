# QTV-W06-US01 - Xem lịch PT

## Preconditions
- QTV đã đăng nhập, branch scope của QTV đã được xác định.

## Trigger
- QTV mở menu W06 hoặc chọn **Lịch tập PT**.
- Màn hình liên quan: Web QTV — W06 Lịch tập PT.

## Main Flow

1. QTV mở màn hình **Lịch tập PT** (W06).
2. QTV gõ Tên, SĐT hoặc Mã PT để tìm và chọn HLV từ combobox **Chọn HLV để xem lịch**.
3. QTV chọn Ngày/Tháng/Năm từ bộ chọn lịch (Date picker / Mini Calendar).
4. SYS hiển thị thông tin PT đã chọn và danh sách các khung giờ làm việc cố định trong ngày (08:00 - 18:00, mỗi buổi kéo dài 2 giờ):
   - **08:00 - 10:00**
   - **10:00 - 12:00**
   - **12:00 - 14:00**
   - **14:00 - 16:00**
   - **16:00 - 18:00**
5. Với các khung giờ đã có người đặt, SYS hiển thị tên hội viên, tên gói PT và trạng thái buổi tập (`Đã đặt`, `Chờ xác nhận hoàn thành`, `Hoàn thành`).
6. Với các khung giờ chưa có người đặt, SYS hiển thị nhãn `Khung giờ trống` kèm nút **Chọn khung giờ +**.

- **Business rules / logic:**
  - Lịch làm việc cố định của PT từ 08:00 đến 18:00, chia làm 5 khung giờ 2 tiếng.
  - Màn hình hiển thị lịch phản ánh realtime trạng thái các khung giờ của PT được chọn.

## Exception Flows
- Lỗi kết nối/tải dữ liệu: SYS hiển thị thông báo lỗi.

## Activity Diagram — Swimlane
**Trigger:** QTV chọn HLV và ngày để xem lịch PT trong menu W06.

```mermaid
flowchart TB
  subgraph B["Boundary — Web QTV W06 / Màn hình Xem lịch PT"]
    subgraph L0["Swimlane — QTV"]
      I01(("Initial"))
      A01["Mở màn hình Lịch tập PT (W06)"]
      A02["Tìm & chọn HLV từ combobox và chọn ngày trên Date picker"]
      F01((("Final — Lịch PT theo ngày được hiển thị")))
      I01 --> A01 --> A02
    end
    subgraph L1["Swimlane — SYS"]
      S01["Nạp danh sách các khung giờ 2h trong ngày (08h-18h) của HLV"]
      S02["Hiển thị khung giờ đã đặt và khung giờ trống kèm nút Chọn khung giờ +"]
      A02 --> S01 --> S02 --> F01
    end
  end
```

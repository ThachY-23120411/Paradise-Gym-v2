# HV02-US03 - Hủy lịch buổi PT

## Preconditions
- Hội viên đã đăng nhập Mobile bằng tài khoản hợp lệ.
- Hội viên có buổi tập PT ở trạng thái `Đã đặt` (`UPCOMING`).

## Trigger
- Hội viên bấm nút `[ Hủy lịch ]` trên Card buổi tập tại sub-tab `Lịch của tôi`.
- Màn hình liên quan: Mobile App — Tab `HV02 · Lịch tập`, sub-tab `Lịch của tôi`, Modal xác nhận hủy lịch.

## Main Flow

1. Tại sub-tab **Lịch của tôi**, Hội viên chọn buổi tập ở trạng thái `Đã đặt` (`UPCOMING`) và bấm nút `[ Hủy lịch ]`.
2. SYS hiển thị **Modal xác nhận hủy lịch** kèm quy định về mốc thời gian hủy.
3. Hội viên chọn lý do hủy (nếu có) và bấm `[ Xác nhận hủy ]`.
4. SYS kiểm tra thời điểm hiện tại so với giờ bắt đầu buổi tập:
   - **Hủy hợp lệ (trước mốc quy định)**: SYS chuyển trạng thái booking sang `CANCELLED` (Đã hủy), mở lại khung giờ (Slot 2h) cho PT, và **không khấu trừ** buổi tập trong gói.
   - **Hủy muộn (sau mốc quy định)**: SYS hiển thị cảnh báo quy định hủy muộn. Nếu Hội viên vẫn xác nhận hủy $\rightarrow$ SYS chuyển booking sang `CANCELLED` và **khấu trừ 1 buổi** theo quy định.
5. SYS cập nhật lại danh sách buổi tập trên màn hình `Lịch của tôi`.

### Field-level specification — Modal Xác nhận Hủy lịch buổi PT
| Field / Control | Interaction State | Required | Conditional / Dynamic | Data Source / Validation |
| :--- | :--- | :--- | :--- | :--- |
| **Buổi tập cần hủy** | `PREFILL` + `READONLY` | required | Không | Tự động nạp thông tin buổi tập được chọn: `[Mã lịch] · [Khung giờ - Ngày] · [Tên PT]` (ví dụ: `BK092 · 09:00 09/09/2026 · PT Nguyễn Thành Long`) |
| **Gói tập áp dụng** | `PREFILL` + `READONLY` | required | Không | Hiển thị tên gói tập của buổi (ví dụ: `Gói PT 20 buổi`) |
| **Thời điểm hủy & Chính sách** | `AUTO-FILL` + `READONLY` | required | `DYNAMIC`: Hệ thống đối soát thời gian hiện tại với giờ bắt đầu | Hiển thị nhãn chính sách: "Hủy trước 4 tiếng: Bảo lưu buổi tập" HOẶC "Hủy sát giờ (< 4 tiếng): Khấu trừ 1 buổi tập" |
| **Cảnh báo hậu quả** | `READONLY` | required | `DYNAMIC`: Tính toán theo mốc giờ | Badge/Alert cảnh báo: Màu xanh "Trong hạn: Giữ nguyên số buổi tập" HOẶC Màu đỏ "Quá hạn quy định: Bạn sẽ bị trừ 1 buổi tập trong gói" |
| **Lý do hủy** | `USER-INPUT` | required | `TRIGGER`: Nếu chọn "Khác" sẽ kích hoạt hiện trường nhập lý do chi tiết | Dropdown chọn lý do: `Bận công việc đột xuất`, `Lý do sức khỏe`, `Trùng lịch hẹn khác`, `Thay đổi kế hoạch cá nhân`, `Khác` |
| **Lý do chi tiết** | `USER-INPUT` | conditional | `CONDITIONAL`: **Hiện và bắt buộc khi** *Lý do hủy* = `Khác`; **Ẩn và không áp dụng khi** *Lý do hủy* nhận bất kỳ giá trị nào khác | Text input/textarea cho phép nhập lý do cụ thể (tối đa 150 ký tự) |

- **Business rules / logic:**
  - Hủy lịch không xóa vĩnh viễn bản ghi booking mà chuyển trạng thái sang `CANCELLED` để lưu vết audit log.
  - Hủy hợp lệ trước mốc thời gian quy định sẽ mở lại khung giờ (Slot 2h) cho PT và bảo lưu số buổi tập khả dụng cho Hội viên.
  - Hủy muộn sau mốc thời gian quy định sẽ thực hiện khấu trừ 1 buổi tập theo chính sách phòng Gym.

## Alternate Flows

### AF-01 — Hội viên hủy thao tác trên Modal
1. Tại Modal xác nhận hủy lịch, Hội viên chọn `[ Bỏ qua / Đóng ]`.
2. SYS đóng modal và giữ nguyên trạng thái booking `Đã đặt` (`UPCOMING`).

## Exception Flows

- Booking đã `DONE` hoặc `CANCELLED`: ẩn nút `[ Hủy lịch ]`.
- Lỗi kết nối mạng: SYS hiển thị thông báo lỗi hủy không thành công và hoàn tác trạng thái.

## Activity Diagram — Swimlane
**Trigger:** Hội viên bấm Hủy lịch trên Card buổi tập tại tab Lịch của tôi.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App Hội viên / HV02 · Hủy lịch buổi PT"]
    subgraph L0["Swimlane — Hội viên"]
      I01(("Initial"))
      A01["Bấm nút [ Hủy lịch ] trên Card buổi tập Đã đặt"]
      A02["Xem quy định hủy trên Modal và bấm [ Xác nhận hủy ]"]
      F01((("Final — Booking chuyển trạng thái Đã hủy (CANCELLED)")))

      I01 --> A01 --> A02
    end

    subgraph L1["Swimlane — SYS"]
      S01["Hiển thị Modal xác nhận hủy kèm mốc thời gian quy định"]
      S02["Kiểm tra thời điểm hiện tại so với giờ bắt đầu buổi tập"]
      D01{"Hủy trước mốc thời gian quy định?"}
      S03["Đổi trạng thái sang CANCELLED, mở lại Slot 2h cho PT và KHÔNG trừ buổi"]
      S04["Đổi trạng thái sang CANCELLED và trừ 1 buổi theo quy định hủy muộn"]
      S02 --> D01
      A02 --> S01
      D01 -->|Có| S03 --> F01
      D01 -->|Không| S04 --> F01
      S01 --> S02
    end
  end
```

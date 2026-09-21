# PT01-US02 - Xác nhận hoàn thành và ghi kết quả buổi học

## Preconditions
- PT đang đăng nhập ứng dụng Mobile PT và xem danh sách lịch tập tại `PT01 · Lịch`.
- Buổi tập được chọn thuộc phạm vi phân công của PT hiện hành, đã hết giờ, chưa xác nhận vế PT và chưa hoàn thành/hủy.

## Trigger
- PT bấm nút `[ Xác nhận hoàn thành ]` tại một buổi tập trên màn hình `PT01 · Lịch`.
- Màn hình liên quan: Mobile App PT — Modal / Form `Ghi nhận kết quả buổi PT`.

## Main Flow

1. PT bấm nút `[ Xác nhận hoàn thành ]` tại buổi tập đã hết giờ tập.
2. Hệ thống hiển thị modal `Ghi nhận kết quả buổi PT` với thông tin prefill của buổi tập (Mã buổi, Khung giờ, Tên học viên, Tên gói tập).
3. PT chọn kết quả buổi tập (mặc định: `Hoàn thành`).
4. PT nhập ghi chú buổi tập (đánh giá thể trạng, nội dung bài tập, lưu ý cho học viên).
5. PT bấm `[ Lưu kết quả ]`.
6. Hệ thống ghi nhận kết quả xác nhận của PT.
7. Hệ thống kiểm tra vế xác nhận của Hội viên (xác nhận 2 chiều):
   - Nếu đủ xác nhận 2 chiều: Chuyển trạng thái buổi tập sang `DONE` (`Đã ghi nhận`) và chuyển 1 buổi đang giữ lịch sang đã dùng trong gói tập của Hội viên.
   - Nếu chưa đủ xác nhận 2 chiều: Đặt trạng thái buổi tập thành `Chờ xác nhận hoàn thành` (`AWAITING_CONFIRMATION`).
8. Hệ thống thông báo thành công và cập nhật lại trạng thái buổi tập trên màn hình lịch.

### Field-level specification — Modal Ghi nhận kết quả buổi PT
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Thông tin ca tập (Mã buổi & Khung giờ)** | `Readonly Text` | `READONLY (PREFILL)` | required | Không | Tự động prefill từ ca tập được chọn (ví dụ: `SES00452 · 08:00 - 10:00, 15/09/2026`) |
| **Học viên & Gói tập** | `Readonly Text` | `READONLY (PREFILL)` | required | Không | Tự động prefill từ ca tập được chọn (ví dụ: `Trần Thị Bình · Gói PT 20 buổi`) |
| **Kết quả buổi tập** | `Radio / Select Dropdown` | `USER-INPUT (PREFILL)` | required | Không | Mặc định prefill `Hoàn thành` (Radio / Select cố định: `Hoàn thành`) |
| **Đánh giá của PT** | `Textarea` | `USER-INPUT` | optional | Không | PT nhập đánh giá buổi học, thể trạng học viên hoặc dặn dò (hỗ trợ tiếng Việt) |

- **Business rules / logic:**
  - PT **không có quyền hủy lịch tập**. Nút `[ Xác nhận hoàn thành ]` là nút thao tác duy nhất của PT để ghi nhận kết quả và hoàn tất vế xác nhận của mình.
  - PT chỉ thực hiện ghi nhận kết quả 1 lần duy nhất cho mỗi buổi tập; sau khi buổi học hoàn tất (`DONE`), thẻ ca tập chuyển sang trạng thái chỉ đọc và khóa thao tác. Mọi điều chỉnh sau khi hoàn tất thuộc thẩm quyền của QTV/Lễ tân trên Web (`W06`).
  - Các buổi tập có trạng thái `Đã hủy` sẽ không hiển thị nút `[ Xác nhận hoàn thành ]` trên giao diện.
  - Việc ghi nhận đã dùng 1 buổi chỉ xảy ra khi buổi học đủ xác nhận 2 chiều và chưa từng trừ buổi trước đó.

## Alternate Flows

- AF-01: Chưa có xác nhận hội viên → lưu vế PT, chờ hội viên; đã có → hoàn thành xác nhận kép.
- AF-02: Đóng form trước khi lưu → không thay đổi buổi tập.
- AF-03: Gửi lại sau khi đã xác nhận → trả trạng thái hiện tại, không trừ/ghi nhận buổi lần nữa.

- Booking đã giữ buổi khi đặt: không giảm remaining lần thứ hai khi xác nhận kép. Trạng thái API hoàn thành là COMPLETED; DONE chỉ là nhãn legacy.

## Exception Flows

- Lỗi kết nối khi lưu: SYS thông báo lỗi và giữ nguyên dữ liệu trong modal để PT thử lại.

- Chưa hết giờ, đã hủy hoặc mất own scope: server từ chối ghi kết quả; tải lại trạng thái.

## Activity Diagram — Swimlane
**Trigger:** PT bấm nút Xác nhận hoàn thành tại buổi tập trên màn hình lịch PT01.


```mermaid
flowchart TB
  subgraph B["Boundary - Mobile PT / PT01-US02"]
    subgraph L0["Swimlane - PT"]
      I(("Initial"))
      A["Chọn Xác nhận hoàn thành"]
      INPUT["Nhập ghi chú và chọn Hoàn thành"]
      U{"Lưu hay đóng?"}
      SAVE["Bấm Lưu"]
    end
    subgraph L1["Swimlane - SYS"]
      CHECK["Server kiểm tra own scope, giờ kết thúc, trạng thái"]
      D{"Đủ điều kiện?"}
      ERR["Báo chưa đủ điều kiện hoặc trả trạng thái đã xác nhận"]
      FE((("Final - Không ghi lặp")))
      FORM["Hiển thị dữ liệu ca từ API"]
      FC((("Final - Đóng không lưu")))
      WRITE["Gửi xác nhận PT"]
      DW{"API lưu thành công?"}
      EW["Giữ bản nháp và báo lỗi"]
      FW((("Final - Chưa lưu")))
      DUAL{"Đủ xác nhận kép?"}
      DONE["Chuyển COMPLETED; booked sang used đúng một lần"]
      WAIT["Giữ trạng thái chờ vế hội viên"]
      M(("Merge - Kết quả xác nhận"))
      REF["Tải lại lịch"]
      F((("Final - Ghi nhận xong")))
    end
    I --> A
    A --> CHECK
    CHECK --> D
    D -->|Không hoặc đã xác nhận| ERR
    ERR --> FE
    D -->|Có| FORM
    FORM --> INPUT
    INPUT --> U
    U -->|Đóng| FC
    U -->|Lưu| SAVE
    SAVE --> WRITE
    WRITE --> DW
    DW -->|Không hoặc timeout| EW
    EW --> FW
    DW -->|Có| DUAL
    DUAL -->|Có| DONE
    DUAL -->|Chưa| WAIT
    DONE --> M
    WAIT --> M
    M --> REF
    REF --> F
  end
```

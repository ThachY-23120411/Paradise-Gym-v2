# HV02-US02 - Đặt lịch PT tùy chọn giờ bắt đầu theo thời lượng gói (Timeline kéo thả)

## Preconditions
- Hội viên đã đăng nhập thành công vào ứng dụng Mobile Hội viên.
- Hội viên sở hữu ít nhất một đăng ký gói PT hoặc Combo (PT + Gym) còn hiệu lực, còn số buổi sử dụng và đã có PT phụ trách.

## Trigger
- Hội viên chọn sub-tab **`Đặt lịch PT`** trong menu **`HV02 · Lịch tập`**.
- Màn hình liên quan: Mobile App — Tab `HV02 · Lịch tập`, sub-tab `Đặt lịch PT`.

## Main Flow

1. Hội viên mở tab **HV02 · Lịch tập** và chọn sub-tab **`Đặt lịch PT`**.
2. SYS lọc và nạp danh sách các gói PT hoặc Combo (PT + Gym) của Hội viên thỏa mãn đồng thời các điều kiện vào Combobox **"Chọn gói muốn sử dụng"**:
   - Đã thanh toán 100%.
   - Gói còn trong hạn sử dụng và còn số buổi tập chưa sử dụng.
   - Đã có PT phụ trách (loại trừ các gói chưa phân công PT).
3. Hội viên chọn một gói trong Combobox.
4. SYS xác định thời lượng buổi tập của gói (`session_duration_minutes`: 30p, 45p, 60p, 90p, 120p; mặc định 60 phút), hiển thị **Card thông tin PT phụ trách** (Avatar viết tắt, Họ tên PT, Chi nhánh phục vụ, thời lượng buổi tập).
5. SYS hiển thị **Thanh điều hướng ngày** `< Ngày DD/MM/YYYY >` kèm nút `[📅 Lịch tháng]` (cho phép mở/đóng lịch tháng DevExtreme để chọn ngày linh hoạt).
6. SYS nạp lịch làm việc, danh sách các khung giờ bận của PT (`busy_slots`) và các buổi tập của chính Hội viên trong ngày đã chọn.
7. SYS hiển thị **Lịch biểu Dòng thời gian trong ngày (Day Timeline từ 06:00 đến 22:00)**:
   - Cột trục thời gian bên trái hiển thị các mốc giờ cách nhau 30 phút (06:00, 06:30, ..., 22:00).
   - Rãnh lịch (Track) hiển thị các vạch kẻ ngang cách nhau 48px cho mỗi 30 phút.
   - **Phân định Ngày quá khứ vs Ngày hiện tại/tương lai:**
     * **Nếu ngày được chọn trước ngày hiện tại (`bookingDay < today`):** SYS hiển thị Banner thông báo lịch sử ngày đã qua, **ẨN HOÀN TOÀN** Thẻ đặt lịch dự kiến (`draftCard`) và Thanh hành động nổi ở đáy (`floatingBar`). Chỉ hiển thị các buổi tập đã diễn ra trong ngày:
       + Buổi tập của chính hội viên với màu sắc & trạng thái chuẩn US: `Đã hoàn thành` (Xanh lá), `Chờ xác nhận` (Vàng cam), `Đang diễn ra` (Xanh tím), `Đã đặt` (Xanh dương), `Đã hủy` (Đỏ).
       + Buổi tập của học viên khác / HLV bận (Khối màu xám sọc chéo `Học viên khác đã đặt • Đã kín`).
     * **Nếu ngày được chọn từ ngày hiện tại trở đi (`bookingDay >= today`):** Cho phép đặt lịch. Hiển thị realtime các khung giờ bận của học viên khác (`busySlots`) để hội viên nắm rõ khung giờ nào trống, khung giờ nào đã kín.
8. Với ngày hiện tại hoặc tương lai, SYS khởi tạo **Thẻ đặt lịch dự kiến (Draft Booking Card)** trên timeline:
   - Chiều cao chuẩn xác tỉ lệ thuận với thời lượng gói tập (48px/30 phút).
   - **Vị trí bắt đầu thông minh:** Tự động tìm và định vị tại khung giờ tương lai khả dụng đầu tiên trong ngày (nếu là hôm nay thì tìm từ giờ hiện tại làm tròn lên 15 phút, không chọn giờ quá khứ).
9. Hội viên điều chỉnh giờ bắt đầu mong muốn bằng một trong các cách:
   - **Kéo thả (Touch / Mouse Drag):** Nhấn giữ thẻ và kéo lên/xuống dọc timeline; hệ thống tự động "snap" tròn theo từng nấc **15 phút**.
   - **Chạm trực tiếp:** Chạm vào bất kỳ mốc giờ trống nào trên timeline để thẻ nhảy ngay tới vị trí đó.
   - **Nút tinh chỉnh:** Bấm nút `[-] 15p` hoặc `[+] 15p` trực tiếp trên thẻ để tăng/giảm giờ bắt đầu.
10. SYS tự động tính toán giờ kết thúc theo công thức: `end_time = start_time + session_duration_minutes`.
11. SYS kiểm tra điều kiện khả dụng realtime:
    - Nếu khung giờ hợp lệ: Thẻ hiển thị màu xanh lá kèm nhãn `Khung giờ hợp lệ`. Nút xác nhận ở thanh đáy được kích hoạt.
    - Nếu khung giờ bị trùng lịch của học viên khác, trùng lịch của bạn hoặc ngoài giờ mở cửa: Thẻ chuyển sang màu đỏ cảnh báo kèm nhãn lỗi. Nút xác nhận ở thanh đáy bị vô hiệu hóa.
12. Hội viên kiểm tra thông tin tóm tắt trên **Thanh hành động nổi ở đáy màn hình (Floating Booking Bar)** và bấm **`[ Xác nhận đặt lịch ]`**.
13. SYS gọi API `POST /pt-bookings`, tạo booking ở trạng thái **`Đã đặt` (`BOOKED`)**, giữ chỗ và trừ 1 buổi khả dụng trong gói, hiển thị Toast thông báo thành công và chuyển hướng sang sub-tab **`Lịch của tôi`**.

- **Business rules / logic:**
  - Trước ngày hiện tại (`bookingDay < today`): Không cho phép kéo thả đặt lịch, không hiển thị thẻ dự kiến và nút xác nhận; chỉ phục vụ xem lại lịch các buổi tập đã diễn ra với màu sắc trạng thái chuẩn US.
  - Từ ngày hiện tại trở đi (`bookingDay >= today`): Cho phép đặt lịch; hiển thị đầy đủ các khối học viên khác đã đặt (`busySlots`) màu xám sọc chéo `Học viên khác đã đặt • Đã kín` để người đặt biết rõ ràng khung giờ nào khả dụng và khung giờ nào đã kín.
  - Hội viên tự do lựa chọn giờ bắt đầu (`start_time`), không bị giới hạn trong 5 khung giờ cố định. Giờ kết thúc (`end_time`) được tính toán tự động dựa trên thời lượng gói tập đã cấu hình (`session_duration_minutes`).
  - Chiều cao của Thẻ đặt lịch dự kiến tỉ lệ thuận 100% với thời lượng gói: 30p = 48px, 45p = 72px, 60p = 96px, 90p = 144px, 120p = 192px.
  - Thao tác kéo thả thẻ hỗ trợ cả cảm ứng (Touch) trên thiết bị di động lẫn chuột (Mouse) trên trình duyệt, tự động làm tròn bước nhảy 15 phút.
  - Hệ thống kiểm tra xung đột realtime: Khóa nút xác nhận và hiển thị cảnh báo đỏ khi thẻ bị kéo đè lên khung giờ bận của HLV, trùng lịch khác của hội viên, rơi vào ngày nghỉ của PT, hoặc kết thúc sau 22:00.

### Field-level specification — Sub-tab Đặt lịch PT (HV02-US02)
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Chọn gói muốn sử dụng** | `Select Dropdown (Combobox)` | `USER-INPUT` | required | `TRIGGER` | Đóng vai trò TRIGGER điều khiển toàn bộ màn hình: lọc danh sách các gói PT hoặc Combo (PT + Gym) thỏa mãn: (1) Đã thanh toán 100%, (2) Còn hạn sử dụng, (3) Còn số buổi tập, (4) Đã phân công PT. Định dạng hiển thị: `[Tên gói] · [Mã đăng ký]` |
| **Card thông tin PT phụ trách** | `Card Component` | `READONLY (AUTO-FILL)` | required | `DYNAMIC` | Hiển thị Avatar, Họ tên PT phụ trách, Chi nhánh phục vụ, thời lượng buổi tập (`XX phút/buổi`) theo gói được chọn |
| **Thanh điều hướng ngày** | `Navigation Bar (Prev/Next/Today)` | `USER-INPUT` | required | `TRIGGER` | Gồm nút Ngày trước `<`, Tiêu đề ngày dạng `Thứ X, DD/MM/YYYY`, nút Ngày sau `>`, và nút `[📅 Lịch tháng]`. Kích hoạt tải lại dữ liệu lịch bận của ngày được chọn |
| **Banner thông báo ngày quá khứ** | `Alert / Banner` | `READONLY` | conditional | `CONDITIONAL`: **Hiện khi** ngày đang chọn $<$ ngày hiện tại (`bookingDay < today`); **Ẩn khi** ngày đang chọn $\ge$ ngày hiện tại | Banner thông báo: `Lịch sử ngày đã qua — Chỉ xem danh sách các buổi tập đã diễn ra trong ngày` |
| **Lịch tháng thu gọn/mở rộng** | `Calendar Picker (dxCalendar)` | `USER-INPUT` | conditional | `CONDITIONAL`: **Hiện khi** bấm nút `[📅 Lịch tháng]`; **Ẩn khi** bấm đóng hoặc mặc định | Widget lưới lịch tháng 7 cột (`T2`–`CN`) cho phép nhảy nhanh đến bất kỳ ngày nào trong tháng |
| **Lịch biểu Dòng thời gian (Timeline 06:00 - 22:00)** | `Timeline Container` | `READONLY` | required | `DYNAMIC` | Trục thời gian 16 tiếng chia thành 32 slot 30 phút (chiều cao 48px/slot), cuộn dọc mượt mà |
| **Khối khung giờ học viên khác đã đặt** | `Busy Block Component` | `READONLY` | conditional | `CONDITIONAL`: **Hiện khi** HLV có lịch dạy học viên khác trong ngày; **Ẩn khi** HLV không có lịch bận | Khối xám sọc chéo hiển thị `Học viên khác đã đặt • Đã kín (XX:XX - YY:YY)`, khóa tương tác |
| **Khối buổi tập của chính Hội viên** | `Own Booking Block` | `READONLY` | conditional | `CONDITIONAL`: **Hiện khi** trong ngày có buổi tập của chính hội viên; **Ẩn khi** hội viên không có buổi tập nào | Khối màu sắc theo trạng thái chuẩn US: Xanh lá (`COMPLETED`), Hổ phách (`PENDING_COMPLETION`), Xanh tím (`ONGOING`), Xanh dương (`BOOKED`), Xám (`CANCELLED`) |
| **Thẻ đặt lịch dự kiến (Draft Card kéo thả)** | `Interactive Draggable Card` | `USER-INPUT` | conditional | `CONDITIONAL`: **Hiện khi** ngày đang chọn $\ge$ ngày hiện tại; **Ẩn khi** ngày đang chọn $<$ ngày hiện tại | Thẻ có chiều cao tỉ lệ thuận với thời lượng gói (48px/30p). Hỗ trợ kéo thả (Touch / Mouse) snap 15p, hiển thị giờ bắt đầu - kết thúc, đổi màu xanh khi hợp lệ, đỏ khi trùng lịch |
| **Nút tinh chỉnh [-] 15p / [+] 15p** | `Button Group` | `USER-INPUT` | conditional | `CONDITIONAL`: **Hiện khi** ngày đang chọn $\ge$ ngày hiện tại (nằm trên Thẻ dự kiến); **Ẩn khi** ngày đang chọn $<$ ngày hiện tại | 2 nút nhỏ trực tiếp trên thẻ cho phép tăng hoặc giảm giờ bắt đầu mỗi lần 15 phút |
| **Thanh hành động nổi ở đáy (Floating Bar)** | `Bottom Floating Bar` | `READONLY` | conditional | `CONDITIONAL`: **Hiện khi** ngày đang chọn $\ge$ ngày hiện tại; **Ẩn khi** ngày đang chọn $<$ ngày hiện tại | Nằm cố định ở đáy màn hình, hiển thị tóm tắt Ngày tập, Khung giờ, Thời lượng và Badge trạng thái |
| **Nút [ Xác nhận đặt lịch ]** | `Button (Primary)` | `USER-INPUT` | conditional | `CONDITIONAL`: **Hiện khi** ngày đang chọn $\ge$ ngày hiện tại (nằm trên Thanh nổi đáy); **Ẩn khi** ngày đang chọn $<$ ngày hiện tại | Kích hoạt (Enabled) khi khung giờ hợp lệ; Vô hiệu hóa (Disabled) khi khung giờ bị trùng lịch hoặc quá hạn |

## Alternate Flows

### AF-01 — Chưa có gói nào đã chọn PT
1. Hội viên mở sub-tab `Đặt lịch PT` nhưng không có gói PT/Combo nào đã có PT phụ trách.
2. SYS hiển thị thông báo rỗng: `Bạn chưa có gói PT nào sẵn sàng để đặt lịch` kèm nút điều hướng đến `Gói của tôi`.

### AF-02 — Chuyển ngày tập qua thanh điều hướng hoặc Lịch tháng
1. Hội viên bấm nút `<` (ngày trước) hoặc `>` (ngày sau) trên thanh điều hướng ngày (hoặc chọn 1 ngày trên Lịch tháng mở rộng).
2. SYS cập nhật ngày được chọn (`S.bookingDay`), gọi API nạp lại các khung giờ bận của PT trong ngày mới và vẽ lại Timeline.

### AF-03 — Chạm trực tiếp vào Timeline để dời thẻ
1. Hội viên chạm vào một mốc giờ trống bất kỳ trên rãnh Timeline (ví dụ mốc 14:00).
2. Thẻ đặt lịch dự kiến lập tức di chuyển đến vị trí mốc giờ vừa chạm, tự động tính lại giờ kết thúc và cập nhật trạng thái khả dụng.

## Exception Flows

- **Trùng lịch bận của HLV:** Khung giờ dự kiến bị giao thoa với lịch bận của HLV. Thẻ chuyển sang màu đỏ cảnh báo, hiển thị nhãn *"Trùng lịch HLV bận"* và nút xác nhận bị vô hiệu hóa.
- **Trùng với buổi tập khác của hội viên:** Khung giờ dự kiến bị giao thoa với buổi tập khác của chính hội viên. Thẻ báo lỗi *"Trùng lịch của bạn"*.
- **Giờ trong quá khứ:** Khung giờ được chọn có thời điểm bắt đầu nhỏ hơn thời điểm hiện tại. Thẻ báo lỗi *"Không thể đặt giờ trong quá khứ"*.
- **Vượt quá giờ hoạt động:** Giờ kết thúc buổi tập vượt quá 22:00. Thẻ báo lỗi *"Quá giờ đóng cửa (22:00)"*.

## Activity Diagram — Swimlane
**Trigger:** Hội viên chọn sub-tab Đặt lịch PT trong HV02.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App Hội viên / HV02 · Đặt lịch PT"]
    subgraph L0["Swimlane — Hội viên"]
      I01(("Initial"))
      A01["Mở tab HV02 và chọn sub-tab Đặt lịch PT"]
      A02["Chọn gói muốn sử dụng trong combobox"]
      A03["Điều chỉnh giờ bắt đầu (kéo thả / click timeline / tinh chỉnh 15p)"]
      D02{"Thao tác của Hội viên?"}
      A04["Xem thông báo thành công và chuyển sang Lịch của tôi"]
      F01((("Final — Đặt lịch PT thành công")))
      F02((("Final — Chưa thể đặt lịch")))
    end

    subgraph L1["Swimlane — SYS"]
      S01["Lọc gói hợp lệ đã có PT và nạp vào combobox"]
      D01{"Có gói hợp lệ đã phân công PT?"}
      S02["Hiển thị thông báo rỗng: Bạn chưa có gói PT nào sẵn sàng để đặt lịch"]
      S03["Nạp thời lượng gói, nạp timeline 06:00-22:00 và hiển thị thẻ dự kiến kéo thả"]
      M01(("Merge — Timeline sẵn sàng"))
      S07["Cập nhật ngày, tải lại lịch bận của HLV và làm mới timeline"]
      S04["Kiểm tra tính khả dụng realtime (không trùng lịch, không quá khứ, trong hạn)"]
      D03{"Khung giờ hợp lệ?"}
      S05["Đổi thẻ sang màu đỏ cảnh báo và disable nút xác nhận"]
      S06["Tạo booking trạng thái BOOKED, trừ 1 buổi tập và chuyển sang Lịch của tôi"]
    end

    I01 --> A01
    A01 --> S01
    S01 --> D01
    D01 -->|Không| S02
    S02 --> F02
    D01 -->|Có| A02
    A02 --> S03
    S03 --> M01
    M01 --> A03
    A03 --> D02
    D02 -->|Đổi ngày tập| S07
    S07 --> M01
    D02 -->|Điều chỉnh giờ và bấm [ Xác nhận đặt lịch ]| S04
    S04 --> D03
    D03 -->|Không hợp lệ| S05
    S05 --> M01
    D03 -->|Hợp lệ| S06
    S06 --> A04
    A04 --> F01
  end
```
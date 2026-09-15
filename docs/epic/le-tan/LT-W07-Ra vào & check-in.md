# LT-W07 — Ra vào & check-in

- **Role:** Lễ tân
- **Platform:** Web only
- **Menu:** `W07`
- **Goal:** Giám sát sự kiện ra vào (check-in / check-out) của hội viên tại chi nhánh theo thời gian thực, hỗ trợ hội viên check-in thủ công tại quầy khi nhận diện thất bại và theo dõi trạng thái hoạt động của thiết bị cổng kiểm soát.
- **Scope:** 
  1. Giám sát check-in tự động qua Camera / Cổng nhận diện khuôn mặt trong chi nhánh (kiểm tra 6 điều kiện hợp lệ: Profile ACTIVE, Gói còn hạn, Thanh toán 100%, Đúng chi nhánh, Còn số buổi, Trong giờ hoạt động).
  2. Ghi nhận Vào/Ra thủ công qua Card thao tác nhanh hoặc qua Modal chuyên sâu (hỗ trợ chọn gói sử dụng khi hội viên có nhiều gói, xử lý khi FaceID lỗi hoặc không nhận diện được; kiểm soát nghiêm ngặt 6 điều kiện hợp lệ, không có ngoại lệ đặc cách).
  3. Giám sát trạng thái thiết bị (Online/Offline, Kiosk K01) và bảng nhật ký sự kiện ra vào thời gian thực trong ngày tại chi nhánh.

---

## Thành phần giao diện (UI Components & Layout)

Menu `W07 · Ra / Vào` được thiết kế theo **Bố cục 2 cột (Split View Layout)** chia màn hình thành 2 khu vực chức năng trực quan:

### 1. Cột trái (Chiếm ~35% chiều rộng): Kiểm soát thao tác & Thiết bị

Bao gồm 2 Card chức năng nguyên khối:

#### Card 1: Kiểm soát ra/vào (Quick Check-in)
- **Tiêu đề khối:** `Kiểm soát ra/vào` — phụ đề `Nhập mã HV, tên hoặc số điện thoại`.
- **Ô tìm kiếm / tra cứu:** Textbox có icon Scan/Tìm kiếm, hỗ trợ gõ SĐT, Họ tên hoặc Mã HV (hoặc quét mã QR hội viên trên ứng dụng di động). Placeholder: `HV001 · Nguyễn Văn An · 0901...`.
- **Nút CTA chính (Màu xanh lá):** **`[ [·] Ghi nhận vào ]`** (tự động đổi thành **`[ Ghi nhận ra ]`** nếu hội viên đang ở trong phòng Gym).

#### Card 2: Thiết bị (Device & Kiosk Status)
- **Tiêu đề khối:** `Thiết bị`.
- **Thông tin cổng & đồng bộ:** `{Tên thiết bị} · đồng bộ {HH:mm}` (Ví dụ: `Gate-Q1-01 · đồng bộ 09:43`).
- **Hệ thống Status Badge:**
  - Badge trạng thái cổng: `Online` (xanh lá) hoặc `Offline` (đỏ).
  - Badge màn hình chào mừng Kiosk: `K01 sẵn sàng` (xanh dương) hoặc `K01 ngắt kết nối` (xám).
- **Cụm 2 nút thao tác:**
  - Nút **`[⚙ Cấu hình]`**: Nút màu đen, click để chuyển nhanh sang cấu hình thiết bị tại menu `W12 · Hệ thống & thiết bị`.
  - Nút **`[⟲ Thủ công]`**: Nút màu đen, click để mở **modal Ghi nhận ra/vào thủ công**.

---

### 2. Cột phải (Chiếm ~65% chiều rộng): Bảng Nhật ký ra/vào (Datagridview)

Bảng dữ liệu hiển thị các lượt ra/vào phát sinh theo ngày, hỗ trợ giám sát thời gian thực (realtime) cho ngày hiện tại và tra cứu lịch sử các ngày trong quá khứ:
- **Header danh sách:**
  - Bên trái: Tiêu đề `Nhật ký ra/vào` và badge đếm `{N} sự kiện`.
  - Bên phải: **Bộ chọn ngày (`Date Picker`)**, mặc định chọn ngày hôm nay (`TODAY`), cho phép chọn ngày quá khứ $\le$ ngày hiện tại để truy vấn lịch sử ra/vào của ngày đó.
- **Cấu trúc 9 cột trên mỗi dòng dữ liệu (Datagridview Columns):**
  1. `Thời gian`: Cột giờ:phút phát sinh sự kiện (`09:42`, `09:38`, `09:21`,...).
  2. `Loại sự kiện`: Badge bo góc `VÀO` (viền xanh lá nhạt) hoặc `RA` (viền xám nhạt).
  3. `Hội viên`: Họ tên kèm Mã hội viên (chữ đậm nổi bật, ví dụ: `Nguyễn Văn An · HV001`).
  4. `Gói tập`: Tên gói tập áp dụng cho lượt ra/vào (ví dụ: `Gói 3 tháng`, `Gói PT 10 buổi`).
  5. `Điểm quét`: Cổng nhận diện hoặc quầy thao tác (ví dụ: `Gate-Q1-01`, `Quầy lễ tân`).
  6. `Cách thức`: Phương thức ghi nhận sự kiện: `Quét khuôn mặt` (tự động qua camera/cổng) hoặc `Thủ công` (Lễ tân ghi nhận tại quầy).
  7. `Lý do / Ghi chú`: Lý do thao tác thủ công (ví dụ: `Thiết bị lỗi`, `Không nhận diện được khuôn mặt`) hoặc lý do từ chối khi không đủ điều kiện (ví dụ: `Gói hết hạn`, `Sai chi nhánh`); hiển thị `-` nếu quét tự động hợp lệ.
  8. `Người thực hiện`: Tên nhân viên/lễ tân thao tác (nếu ghi nhận thủ công) hoặc `Hệ thống` (nếu quét tự động qua cổng).
  9. `Trạng thái`:
     - Badge viền xanh lá: `Hợp lệ` (Đủ 6 điều kiện, cửa mở cho vào/ra thành công).
     - Badge viền đỏ: `Không đủ điều kiện` (Bị từ chối do hết hạn, chưa thanh toán, sai chi nhánh, hết buổi, hoặc vi phạm vào/ra).

---

### 3. Modal Ghi nhận ra/vào thủ công (Khi bấm nút [⟲ Thủ công])

Giao diện modal chuyên sâu hỗ trợ xử lý khi thiết bị nhận diện khuôn mặt thất bại, đảm bảo kiểm tra đúng điều kiện gói tập:
- **Header:** Tiêu đề `Ghi nhận ra/vào thủ công`, phụ đề `Hỗ trợ nhận diện thất bại mà không bỏ qua điều kiện tập.`, nút `✕ Đóng`.
- **Form nhập liệu tinh gọn (Bên trái):**
  - `Hội viên` (Bắt buộc): Ô tìm kiếm chọn hội viên theo SĐT, Mã HV hoặc Tên.
  - `Gói tập sử dụng` (Bắt buộc): Dropdown chọn gói tập hợp lệ của hội viên (hệ thống tự động nạp danh sách các gói đang ACTIVE và có hiệu lực tại chi nhánh; tự chọn sẵn nếu hội viên chỉ có 1 gói).
  - `Chi nhánh / điểm vào` (Readonly): Mặc định hiển thị chi nhánh và quầy/cổng hiện tại (`Quận 1 · Gate-Q1-01`).
  - `Loại sự kiện` (Bắt buộc): Dropdown chọn `Vào` hoặc `Ra`.
  - `Thời điểm ghi nhận` (Bắt buộc): DateTime picker nạp thời điểm hiện tại.
  - `Lý do thủ công` (Bắt buộc): Dropdown danh mục (`Thiết bị lỗi`, `Không nhận diện được khuôn mặt`, `Khác`).
  - `Mô tả lý do khác` (Conditional): Bắt buộc nhập diễn giải khi chọn lý do `Khác`.
- **Khối nguyên tắc vận hành (Bên phải):**
  - Kiểm tra 6 điều kiện: Đủ 6 điều kiện mới cho vào; thiếu bất kỳ điều kiện nào (hết hạn, chưa thanh toán, sai chi nhánh, hết buổi) hệ thống dứt khoát từ chối, tuyệt đối không có ngoại lệ đặc cách.
  - Tính minh bạch & bảo mật: Tách biệt ghi nhật ký và lệnh mở cửa; màn hình công cộng K01 không lộ thông tin cá nhân/SĐT; lưu vết đầy đủ tài khoản nhân viên thao tác.
- **Action Buttons:** Nút tím nổi bật **`[ Ghi nhận thủ công ]`** và Nút đen **`[ Hủy ]`**.

---

## User Stories và Modal tương ứng trong Epic

| User Story | Loại giao diện | Modal / Form tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [LT-W07-US01 — Xử lý check-in tự động qua thiết bị](../../user-stories/le-tan/LT-W07-Ra vào & check-in/LT-W07-US01-Xử lý check-in tự động qua thiết bị.md) | Hệ thống ngầm | Giao tiếp tự động Thiết bị $\leftrightarrow$ SYS | Tự động quét khuôn mặt tại cổng, kiểm tra 6 điều kiện hợp lệ (Profile ACTIVE, Gói còn hạn, Thanh toán 100%, Đúng chi nhánh, Còn số buổi, Trong giờ hoạt động), phát lệnh mở cửa và ghi log |
| [LT-W07-US02 — Ghi nhận Vào/Ra thủ công](../../user-stories/le-tan/LT-W07-Ra vào & check-in/LT-W07-US02-Ghi nhận Vào Ra thủ công.md) | Form trái & Modal | **Card Kiểm soát ra/vào** & **Modal Ghi nhận ra/vào thủ công** | Thao tác nhanh qua ô tra cứu SĐT hoặc mở modal tinh gọn hỗ trợ chọn gói khi có nhiều gói; kiểm tra nghiêm ngặt 6 điều kiện, không có ngoại lệ đặc cách |
| [LT-W07-US03 — Xem nhật ký Ra/Vào và theo dõi trạng thái thiết bị](../../user-stories/le-tan/LT-W07-Ra vào & check-in/LT-W07-US03-Xem nhật ký Ra Vào và theo dõi trạng thái thiết bị.md) | Màn hình chính | **Bảng Nhật ký ra/vào hôm nay** & **Card Thiết bị** | Hiển thị trạng thái Online/Offline, Kiosk K01, danh sách sự kiện thời gian thực trong ngày tại chi nhánh, cách thức ghi nhận (Quét khuôn mặt/Thủ công) và trạng thái hợp lệ (Hợp lệ/Không đủ điều kiện) |

---

## Flow specification

Mỗi User Story của `LT-W07` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/le-tan/`](../../system-flow-specs/le-tan/README.md).

## Traceability

- Shared capability catalog: [`W07` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).
- Screenshot tham chiếu: `screenshot/le-tan/light-web-W07-ra-vao.png` và `screenshot/le-tan/light-web-modal-ghi-nhan-ra-vao-thu-cong.png`.

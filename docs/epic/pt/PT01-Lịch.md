# PT01 — Lịch

- **Role:** Huấn luyện viên cá nhân (PT)
- **Platform:** Mobile only
- **Menu:** `PT01` (Footer tab `Lịch`)
- **Goal:** Cung cấp cho PT công cụ quản lý lịch dạy 5 ca cố định theo ngày và ghi nhận kết quả buổi học trực tiếp trên ứng dụng di động.
- **Scope:** Xem lịch làm việc 5 khung giờ theo ngày được chọn trên Calendar, mở modal ghi nhận kết quả hoàn thành buổi học (xác nhận 2 chiều). PT không có quyền hủy lịch tập.

---

## Thành phần giao diện (UI Components & Layout)

Giao diện `PT01 · Lịch` là phân hệ điều hành lịch làm việc hàng ngày của Huấn luyện viên trên nền tảng Mobile App, bao gồm các khối thành phần nghiệp vụ sau:

### 1. Bộ chọn ngày linh hoạt 2 chế độ (Expandable / Collapsible Calendar)
- **Thanh tiêu đề tháng & Điều hướng:** Hiển thị `Tháng MM/YYYY`, cụm 2 nút chuyển tháng `<` `>`, và icon/nút chuyển đổi chế độ. Chạm vào tiêu đề tháng hoặc thanh toggle để mở rộng hoặc thu gọn.
- **Chế độ Thu gọn (Compact Horizontal Strip):** Dải cuộn ngang lướt nhanh các ngày trong tuần/tháng; mỗi ô ngày bo góc mềm mại, hiển thị Thứ và Ngày; ngày được chọn nổi bật với nền màu xanh ngọc sáng rực rỡ và số ngày to đậm, kèm chấm trạng thái ca tập; tự động cuộn vào giữa màn hình.
- **Chế độ Mở rộng (Full Month Grid Calendar):** Mở ra toàn bộ lưới lịch tháng 7 cột (`T2`, `T3`, `T4`, `T5`, `T6`, `T7`, `CN`), hiển thị toàn bộ các ngày từ 1 đến 30/31; ngày được chọn khoanh tròn nổi bật; cho phép PT chạm chọn bất kỳ ngày nào trong tháng một cách tức thì mà không cần phải vuốt ngang.
- **Thanh chuyển đổi chế độ (Toggle Bar):** Nằm ở đáy card lịch, cho phép PT chuyển đổi linh hoạt giữa dải ngày thu gọn và mở rộng lưới cả tháng.

### 2. Tiêu đề ngày làm việc & Khung giờ hành chính
- Hiển thị ngày được chọn (`DD/MM/YYYY`) kèm thông tin: `Khung làm việc cố định: 08:00 - 18:00`.

### 3. Lưới 5 khung giờ làm việc cố định trong ngày (5 Time Slots Grid)
- **Slot 1:** `08:00 - 10:00`
- **Slot 2:** `10:00 - 12:00`
- **Slot 3:** `12:00 - 14:00`
- **Slot 4:** `14:00 - 16:00`
- **Slot 5:** `16:00 - 18:00`

### 4. Thẻ hiển thị trạng thái khung giờ (Session Slot Cards)
Gồm 5 trạng thái thẻ chi tiết khớp với 4 trạng thái booking chuẩn của hệ thống (`UPCOMING`, `AWAITING_CONFIRMATION`, `DONE`, `CANCELLED`) và khung giờ trống:
- **Thẻ khung giờ trống:** Viền nét đứt màu xám nhạt, nhãn `Khung giờ trống` (**chỉ đọc, tuyệt đối không có nút đặt lịch hay icon `[ + ]`** vì PT không tự đặt lịch).
- **Thẻ ca tập — Trạng thái `Đã đặt` (`UPCOMING`):** Thẻ viền xanh dương, hiển thị Họ tên học viên, Gói tập, Chi nhánh, Badge `Đã đặt`. Khi đến giờ hoặc qua giờ tập, hiển thị nút màu xanh `[ Xác nhận hoàn thành ]` (mở Bottom Sheet `PT01-US02`).
- **Thẻ ca tập — Trạng thái `Chờ xác nhận hoàn thành` (`AWAITING_CONFIRMATION`):** Thẻ viền vàng cam, Badge `Chờ xác nhận`. Hiển thị nút màu xanh `[ Xác nhận hoàn thành ]` nếu PT chưa ghi nhận kết quả (hoặc nhãn `Chờ Hội viên xác nhận` nếu PT đã ghi nhận).
- **Thẻ ca tập — Trạng thái `Hoàn thành` (`DONE` / Đã ghi nhận):** Thẻ viền xanh lá, Badge `Đã ghi nhận` (đã đủ xác nhận 2 chiều và trừ 1 buổi; không có nút thao tác).
- **Thẻ ca tập — Trạng thái `Đã hủy` (`CANCELLED`):** Thẻ làm mờ màu xám, Badge `Đã hủy` (không có nút thao tác).

### 5. Modal / Bottom Sheet Ghi nhận kết quả buổi PT (PT01-US02)
- Mở khi PT bấm nút `[ Xác nhận hoàn thành ]` tại Thẻ ca tập trên lịch.
- Trình bày dạng Bottom Sheet chuẩn Mobile, hiển thị tóm tắt thông tin ca tập (`Mã buổi`, `Thời gian`, `Học viên`, `Gói tập`), trường nhập kết quả (`Hoàn thành`) và trường ghi chú bài tập.

---

## User Stories và Modal tương ứng trong Epic

| User Story | Loại giao diện | Modal / Bottom Sheet tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [PT01-US01 — Xem lịch PT theo ngày](../../user-stories/pt/PT01-Lịch/PT01-US01-Xem%20l%E1%BB%8Bch%20PT%20theo%20ng%C3%A0y.md) | Màn hình Lịch ngày (Mobile) | Không có | Bảng Field-level spec toàn diện màn hình: Calendar Strip chọn ngày, Dải 5 khung giờ 2 tiếng, Thẻ ca tập, Thẻ giờ trống, Nút mở modal xác nhận |
| [PT01-US02 — Xác nhận hoàn thành và ghi kết quả buổi học](../../user-stories/pt/PT01-Lịch/PT01-US02-X%C3%A1c%20nh%E1%BA%ADn%20ho%C3%A0n%20th%C3%A0nh%20v%C3%A0%20ghi%20k%E1%BA%BFt%20qu%E1%BA%A3%20bu%E1%BB%95i%20h%E1%BB%8Dc.md) | Modal / Bottom Sheet | **Ghi nhận kết quả buổi PT** | Bảng Field-level spec modal 6 trường dữ liệu: Mã buổi tập, Thời gian, Học viên, Gói tập, Kết quả, Ghi chú, Tác động số buổi, Lý do sửa kết quả |

---

## Flow specification

Mỗi User Story của `PT01` chứa precondition, trigger, main/alternate/exception flow, logic nghiệp vụ và activity diagram Mermaid swimlane.
Flow index role: [`docs/system-flow-specs/pt/`](../../system-flow-specs/pt/README.md).

## Traceability

- Role Epic index: [`docs/epic/pt/README.md`](README.md).
- System Flow Specs: [`docs/system-flow-specs/pt/README.md`](../../system-flow-specs/pt/README.md).
- Product Spec: [`docs/product-spec.md`](../../product-spec.md).

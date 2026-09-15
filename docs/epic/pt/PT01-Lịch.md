# PT01 — Lịch

- **Role:** Huấn luyện viên cá nhân (PT)
- **Platform:** Mobile only
- **Menu:** `PT01` (Footer tab `Lịch`)
- **Goal:** Cung cấp cho PT công cụ theo dõi hiệu suất huấn luyện, quản lý lịch dạy 5 ca cố định theo ngày và ghi nhận kết quả buổi học trực tiếp trên ứng dụng di động.
- **Scope:** Xem tổng quan hiệu suất trong kỳ, xem lịch làm việc theo ngày/ca tập, mở modal ghi nhận kết quả hoàn thành buổi học (xác nhận 2 chiều). PT không có quyền hủy lịch tập.

---

## Thành phần giao diện (UI Components & Layout)

Giao diện `PT01 · Lịch` là phân hệ làm việc trung tâm của Huấn luyện viên trên nền tảng Mobile App, bao gồm các khối thành phần nghiệp vụ sau:

### 1. Bộ chuyển đổi chế độ xem (View Mode Switcher)
- **Segmented Control (2 tab chuyển đổi nhanh):**
  - Tab 1: `Tổng quan` — Kích hoạt hiển thị màn hình Dashboard thống kê hiệu suất PT (`PT01-US00`).
  - Tab 2: `Lịch dạy` — Kích hoạt hiển thị màn hình Lịch làm việc 5 ca theo ngày (`PT01-US01`).

### 2. Khối màn hình Tổng quan & Hiệu suất PT (PT01-US00)
- **Bộ lọc mốc thời gian (Time Filter Segmented/Chips):**
  - 3 tùy chọn: `Tuần này`, `Tháng này` (mặc định), `Tháng trước`.
  - Tác vụ: Tính toán và nạp lại dữ liệu cho toàn bộ các thẻ KPI bên dưới khi chuyển đổi mốc thời gian.
- **Khối Thẻ chỉ số hiệu suất (Performance Metric Cards - 5 chỉ số):**
  1. `Học viên phụ trách`: Tổng số học viên đang được gán phụ trách active cho PT.
  2. `Buổi đã hoàn thành`: Tổng số buổi tập đã đạt đủ xác nhận 2 chiều (`DONE`) trong kỳ chọn.
  3. `Buổi đã đặt (Sắp dạy)`: Tổng số ca tập ở trạng thái `Đã đặt` (`UPCOMING`) trong tương lai.
  4. `Buổi chờ xác nhận`: Tổng số ca tập ở trạng thái `Chờ xác nhận hoàn thành` (`AWAITING_CONFIRMATION`).
  5. `Yêu cầu phân công`: Số yêu cầu chọn PT từ hội viên đang chờ xử lý (`PENDING`).
- **Khối Ca dạy tiếp theo gần nhất (Next Session Highlight Card):**
  - Hiển thị nổi bật ca tập kế tiếp: Giờ bắt đầu - Giờ kết thúc, Ngày, Họ tên học viên, Tên gói tập.
  - **Nút Xác nhận hoàn thành (Primary CTA):** Nút màu xanh, xuất hiện khi ca tập đang diễn ra hoặc đã kết thúc, bấm để mở modal `Ghi nhận kết quả buổi PT` (`PT01-US02`).

### 3. Khối màn hình Lịch dạy PT theo ngày (PT01-US01)
- **Thanh điều hướng lịch ngày (Calendar Strip / DatePicker):**
  - Bộ chọn tháng kèm nút chuyển `< Tháng MM/YYYY >`.
  - Dải cuộn 7 ngày trong tuần/tháng (Calendar Horizontal Strip), ngày hiện tại được đánh dấu viền sáng; chạm để chuyển ngày xem lịch.
- **Tiêu đề ngày làm việc:**
  - Hiển thị ngày được chọn (`DD/MM/YYYY`) kèm thông tin ca làm việc cố định: `Khung làm việc cố định: 08:00 - 18:00`.
- **Danh sách 5 Khung giờ cố định trong ngày (5 Time Slots — mỗi slot 2 tiếng):**
  - Slot 1: `08:00 - 10:00`
  - Slot 2: `10:00 - 12:00`
  - Slot 3: `12:00 - 14:00`
  - Slot 4: `14:00 - 16:00`
  - Slot 5: `16:00 - 18:00`
- **Thẻ hiển thị trạng thái khung giờ (Session Slot Cards):**
  - *Trường hợp Khung giờ đã có lịch đặt:* Hiển thị Thẻ ca tập gồm Họ tên học viên, Tên gói tập, Badge trạng thái (`Đã đặt` - xanh dương, `Chờ xác nhận` - cam, `Đã ghi nhận` - xanh lá, `Đã hủy` - xám). Với ca đang diễn ra hoặc đã kết thúc, hiển thị nút `[ Xác nhận hoàn thành ]`.
  - *Trường hợp Khung giờ trống:* Hiển thị Thẻ rỗng với nhãn `Khung giờ trống` (màu xám nhạt, không có nút hành động).

### 4. Modal / Bottom Sheet Ghi nhận kết quả buổi PT (PT01-US02)
- Mở khi PT bấm nút `[ Xác nhận hoàn thành ]` tại Thẻ ca dạy tiếp theo (US00) hoặc tại Thẻ ca tập trên lịch (US01).
- Trình bày dạng Bottom Sheet chuẩn Mobile, hiển thị tóm tắt thông tin ca tập (`Mã buổi`, `Thời gian`, `Học viên`, `Gói tập`), trường nhập kết quả (`Hoàn thành`), trường ghi chú bài tập, thông báo tác động số buổi (`Trừ 1 buổi sau khi hoàn tất`), và trường nhập lý do (nếu chỉnh sửa).

---

## User Stories và Modal tương ứng trong Epic

| User Story | Loại giao diện | Modal / Bottom Sheet tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [PT01-US00 — Xem tổng quan và thống kê hiệu suất PT](../../user-stories/pt/PT01-Lịch/PT01-US00-Xem%20t%E1%BB%95ng%20quan%20v%C3%A0%20th%E1%BB%91ng%20k%C3%AA%20hi%E1%BB%87u%20su%E1%BA%A5t%20PT.md) | Màn hình Dashboard (Mobile) | Không có | Bảng Field-level spec toàn diện màn hình: Bộ lọc mốc thời gian, 5 thẻ chỉ số KPI, Thẻ ca dạy gần nhất kèm nút mở modal xác nhận |
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

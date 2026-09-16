# HV02 — Lịch tập

- **Role:** Hội viên
- **Platform:** Mobile only
- **Menu:** `HV02 · Lịch tập`
- **Goal:** Cung cấp không gian tự phục vụ để Hội viên theo dõi lịch tập cá nhân, đặt lịch PT mới từ các khung giờ trống, quản lý hủy lịch và xác nhận hoàn thành buổi tập.
- **Scope:** Xem lịch tập theo ngày, lọc trạng thái buổi tập, đặt lịch PT từ các gói hợp lệ đã có PT phụ trách, hủy lịch có kiểm soát mốc thời gian và xác nhận hoàn thành buổi tập 2 chiều với PT.

## Thành phần giao diện (UI Components & Layout)

Không gian nghiệp vụ bên trong Menu **`HV02 · Lịch tập`** (nằm giữa Header và Bottom Navigation Bar chung của ứng dụng) được phân chia thành **2 sub-tab chính** thông qua bộ chuyển tab nội bộ (Segmented Control):

1. **Sub-tab `Lịch của tôi`:**
   - Vai trò: Màn hình mặc định khi vào menu `HV02`, cho phép Hội viên theo dõi danh sách buổi tập theo ngày/tháng, lọc theo trạng thái và thực hiện các tác vụ nhanh (hủy lịch, xác nhận hoàn thành).
   - Chi tiết đặc tả UI toàn diện (thanh chọn ngày, chip lọc, thẻ buổi tập, nút thao tác): Xem tại [HV02-US01](../../user-stories/hoi-vien/HV02-Lịch tập/HV02-US01-Xem lịch tập và lọc trạng thái buổi PT.md).

2. **Sub-tab `Đặt lịch PT`:**
   - Vai trò: Màn hình đặt lịch chủ động, cho phép Hội viên chọn gói PT/Combo hợp lệ, xem lịch làm việc của PT phụ trách và chọn các slot 2 tiếng còn trống để đặt lịch.
   - Chi tiết đặc tả UI toàn diện (chọn gói, hiển thị PT, widget lịch làm việc, chọn slot giờ, ghi chú và nút CTA Đặt lịch): Xem tại [HV02-US02](../../user-stories/hoi-vien/HV02-Lịch tập/HV02-US02-Đặt lịch PT từ slot trống.md).

---

## Danh sách User Stories và Giao diện tương ứng trong Epic

| User Story | Phân loại giao diện | Thành phần giao diện tương ứng | Phạm vi đặc tả UI |
| :--- | :--- | :--- | :--- |
| [HV02-US01 — Xem lịch tập và lọc trạng thái buổi PT](../../user-stories/hoi-vien/HV02-Lịch tập/HV02-US01-Xem lịch tập và lọc trạng thái buổi PT.md) | Màn hình Sub-tab | **Sub-tab `Lịch của tôi`** | Bảng Field-level spec toàn diện cho tab: Widget Lịch tháng (Trigger), chip lọc trạng thái, thẻ buổi tập cá nhân và các nút thao tác trên thẻ |
| [HV02-US02 — Đặt lịch PT từ slot trống](../../user-stories/hoi-vien/HV02-Lịch tập/HV02-US02-Đặt lịch PT từ slot trống.md) | Màn hình Sub-tab | **Sub-tab `Đặt lịch PT`** | Bảng Field-level spec toàn diện cho tab: Combobox chọn gói (Trigger), Card thông tin PT phụ trách, Widget Lịch tháng (Trigger), Lưới 5 khung giờ (Thẻ slot trống [+], Thẻ slot đã bận, Thẻ buổi tập của chính Hội viên theo trạng thái Đã đặt/Chờ xác nhận/Hoàn thành) |
| [HV02-US03 — Hủy lịch buổi PT](../../user-stories/hoi-vien/HV02-Lịch tập/HV02-US03-Hủy lịch buổi PT.md) | Modal xác nhận | **Modal Xác nhận Hủy lịch buổi PT** | Bảng Field-level spec 6 trường nhập/hiển thị của modal (mở từ nút Hủy lịch tại tab Lịch của tôi) |
| [HV02-US04 — Xác nhận hoàn thành buổi PT](../../user-stories/hoi-vien/HV02-Lịch tập/HV02-US04-Xác nhận hoàn thành buổi PT.md) | Dialog xác nhận | **Dialog Xác nhận Hoàn thành buổi PT** | Bảng Field-level spec 3 trường hiển thị thông tin & trạng thái của dialog (mở từ nút Xác nhận hoàn thành tại tab Lịch của tôi) |

---

## Flow specification

Mỗi User Story của `HV02` chứa precondition, trigger, main/alternate/exception flow, field-level specification chuẩn và activity diagram Mermaid swimlane.
Flow index role: [`docs/system-flow-specs/hoi-vien/`](../../system-flow-specs/hoi-vien/README.md).

## Traceability

- Menu catalog: [`docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

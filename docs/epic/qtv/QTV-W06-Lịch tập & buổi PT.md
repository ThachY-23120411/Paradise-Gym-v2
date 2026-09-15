# QTV-W06 — Lịch tập & buổi PT

- **Role:** QTV / Quản lý
- **Platform:** Web only
- **Menu:** `W06`
- **Goal:** Quản lý lịch PT, đặt lịch tập, xác nhận hoàn thành và hủy lịch PT theo chi nhánh.
- **Scope:** Xem lịch PT theo HLV, Đặt lịch PT, Xác nhận hoàn thành buổi học (xác nhận kép) và Hủy lịch PT.

## Thành phần giao diện (UI Components & Layout)

Màn hình `W06 · Lịch tập PT` trên nền tảng Web của QTV được thiết kế theo luồng tương tác 2 trạng thái: **Khởi tạo (Empty State)** $\rightarrow$ **Chọn HLV** $\rightarrow$ **Xem lịch chi tiết (`QTV-W06-US01`)**.

### 1. Trạng thái khởi tạo (Empty State — Khi chưa chọn HLV)
- **Header & Control Bar:**
  - **Tiêu đề trang:** `Chọn HLV để xem lịch`.
  - **Phụ đề:** `Khung làm việc cố định 08:00–18:00. Mỗi buổi mặc định kéo dài 2 giờ.`
  - **Bộ điều khiển chọn HLV (Searchable Combobox):** Đặt tại góc trên bên phải Header gồm:
    - Ô tìm kiếm từ khóa `Tìm theo tên, SĐT hoặc mã PT`.
    - Dropdown danh sách `Chọn huấn luyện viên ⌵` (lọc các PT đang hoạt động trong phạm vi chi nhánh quản lý `branch scope`).
- **Khu vực nội dung chính (Empty State Content Area):**
  - Khung giao diện tối màu ở giữa màn hình:
    - Icon đồng hồ: 🕒
    - Tiêu đề thông báo: `Chưa có HLV được chọn`
    - Mô tả hướng dẫn: `Tìm theo tên hoặc số điện thoại, sau đó chọn một HLV để xem các buổi đã đặt và khung giờ còn trống.`

### 2. Giao diện xem lịch chi tiết (Khi đã chọn HLV — QTV-W06-US01)
Ngay khi QTV chọn được một HLV từ combobox, màn hình chuyển sang giao diện xem lịch chi tiết:
- **Header:** Giữ combobox hiển thị tên HLV đang chọn, cho phép click để tìm kiếm hoặc đổi HLV khác bất kỳ lúc nào.
- **Bộ chọn ngày (Date Picker / Calendar):** Cho phép chọn ngày tra cứu lịch (mặc định chọn ngày hiện tại `TODAY`).
- **Lưới 5 khung giờ làm việc cố định trong ngày (08:00 – 18:00, 2 giờ/buổi):**
  - `08:00 – 10:00`
  - `10:00 – 12:00`
  - `12:00 – 14:00`
  - `14:00 – 16:00`
  - `16:00 – 18:00`
- **Cấu trúc hiển thị trên từng khung giờ (Slot Card):**
  - **Khung giờ đã đặt (Booked Slot):**
    - Thông tin học viên: Họ tên, Mã HV và Tên gói PT sử dụng.
    - Status Badge: `Đã đặt` (xanh dương), `Chờ xác nhận hoàn thành` (vàng cam), `Hoàn thành` (xanh lá).
    - Thao tác: Nút đỏ **[Hủy lịch]** (`QTV-W06-US04`) và Nút **[Xác nhận hoàn thành]** (`QTV-W06-US03` — màu xám khi chưa qua khung giờ buổi tập đó, chuyển sang màu xanh lá khi đã qua khung giờ buổi tập đó).
  - **Khung giờ trống (Available Slot):**
    - Nhãn thông báo: `Khung giờ trống`.
    - Nút CTA nổi bật: **`[Chọn khung giờ +]`** (màu xanh lá, click để mở modal Đặt lịch PT `QTV-W06-US02`).

---

## User Stories và Modal tương ứng trong Epic

| User Story | Loại giao diện | Modal / Form tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [QTV-W06-US01 — Xem lịch PT](../../user-stories/qtv/QTV-W06-Lịch tập & buổi PT/QTV-W06-US01-Xem lịch PT.md) | Màn hình chính | **Màn hình Lịch tập PT** | Khởi tạo Empty State; chọn HLV từ Combobox trên Header để chuyển sang giao diện 5 khung giờ cố định và Date picker |
| [QTV-W06-US02 — Đặt lịch PT](../../user-stories/qtv/QTV-W06-Lịch tập & buổi PT/QTV-W06-US02-Đặt lịch PT.md) | Modal | **Đặt lịch PT** | Bảng Field-level spec: Tự động prefill PT, ngày, khung giờ, chi nhánh; tìm chọn Hội viên $\rightarrow$ dynamic form nạp danh sách gói PT/COMBO của hội viên đã được chọn PT phụ trách |
| [QTV-W06-US03 — Xác nhận hoàn thành buổi học](../../user-stories/qtv/QTV-W06-Lịch tập & buổi PT/QTV-W06-US03-Xác nhận hoàn thành buổi học.md) | Nút thao tác trên Slot | **Xác nhận hoàn thành buổi PT** | Quy tắc xác nhận kép (PT + Hội viên): đủ 2 bên mới chuyển `Hoàn thành` và trừ 1 buổi trong gói; mới 1 bên giữ `Chờ xác nhận` |
| [QTV-W06-US04 — Hủy lịch PT](../../user-stories/qtv/QTV-W06-Lịch tập & buổi PT/QTV-W06-US04-Hủy lịch PT.md) | Popup xác nhận | **Xác nhận hủy lịch PT** | Hủy slot đã đặt trước giờ tập, giải phóng khung giờ về trạng thái trống, hoàn trả buổi PT (nếu có) và ghi audit |

---

## Flow specification

Mỗi User Story của `QTV-W06` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/qtv/`](../../system-flow-specs/qtv/README.md).

## Traceability

- Shared capability catalog: [`W06` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

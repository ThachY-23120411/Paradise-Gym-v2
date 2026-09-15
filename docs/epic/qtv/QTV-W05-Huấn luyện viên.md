# QTV-W05 — Huấn luyện viên

- **Role:** QTV / Quản lý
- **Platform:** Web only
- **Menu:** `W05`
- **Goal:** Quản lý hồ sơ PT, trạng thái hoạt động và tra cứu danh sách PT trong phạm vi chi nhánh.
- **Scope:** Thêm hồ sơ PT, sửa hồ sơ PT, cập nhật trạng thái hồ sơ PT và xem danh sách PT.

## Thành phần giao diện (UI Components & Layout)

Màn hình `W05 · Huấn luyện viên` trên nền tảng Web của QTV được thiết kế dạng bảng dữ liệu trực quan (Data Grid View) với các khối thành phần chính:

### 1. Header & Action Bar
- **Tiêu đề trang:** `Huấn luyện viên` kèm tổng số lượng PT trong chi nhánh quản lý.
- **Nút Thêm hồ sơ PT (Primary CTA Button):**
  - Vị trí: Góc trên bên phải trang.
  - Định dạng: Nút màu xanh lá, chữ trắng, icon `+ Thêm hồ sơ PT`.
  - Tác vụ: Mở modal **Thêm mới hồ sơ PT** (`QTV-W05-US01`).

### 2. Search & Filter Bar (Thanh tìm kiếm & Bộ lọc)
- **Ô tìm kiếm (Search Box):** Tìm kiếm tức thì theo Họ tên, Số điện thoại hoặc Mã PT.
- **Dropdown lọc Chi nhánh:** Lựa chọn chi nhánh trong phạm vi `branch scope` của QTV (mặc định là chi nhánh làm việc hiện tại).
- **Dropdown lọc Trạng thái:** `[Tất cả]`, `[Đang hoạt động]`, `[Ngừng hoạt động]`, `[Đã lưu trữ]`.

### 3. Bảng danh sách huấn luyện viên (Data Grid View — QTV-W05-US04)
- **Mã PT:** Mã định danh duy nhất do SYS tự động sinh (ví dụ: `PT001`, `PT002`).
- **Họ và tên:** Tên huấn luyện viên từ `PT_PROFILE.full_name` (ví dụ: `Nguyễn Văn Hùng`).
- **Số điện thoại:** Số điện thoại định danh duy nhất của PT (ví dụ: `0909 888 777`).
- **Email:** Địa chỉ email liên hệ của PT (ví dụ: `pt.hung@paradise.vn`), hiển thị `--` nếu chưa cập nhật.
- **Chi nhánh phục vụ:** Tên chi nhánh nơi PT đang trực tiếp công tác (ví dụ: `Quận 1`, `Quận 3`).
- **Chuyên môn / Ghi chú:** Mô tả tóm tắt kỹ năng chuyên môn, chứng chỉ thể hình (ví dụ: `Cardio & Thể hình, Chứng chỉ NASM`).
- **Trạng thái:** Badge trực quan theo trạng thái (`Đang hoạt động` - xanh lá, `Ngừng hoạt động` - vàng/xám, `Đã lưu trữ` - đỏ).
- **Thao tác:**
  - Nút **[Sửa]**: Mở modal **Sửa hồ sơ PT** (`QTV-W05-US02`).
  - Nút **[Đổi trạng thái]**: Mở modal **Đổi trạng thái hồ sơ PT** (`QTV-W05-US03`).

---

## User Stories và Modal tương ứng trong Epic

| User Story | Loại giao diện | Modal / Form tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [QTV-W05-US01 — Thêm hồ sơ PT](../../user-stories/qtv/QTV-W05-Huấn luyện viên/QTV-W05-US01-Thêm hồ sơ PT.md) | Modal | **Thêm mới hồ sơ PT** | Bảng Field-level spec: Nhập Họ tên, SĐT (unique định danh), Email (optional), Chi nhánh phục vụ (select trong branch scope), Chuyên môn/Ghi chú (optional) |
| [QTV-W05-US02 — Sửa hồ sơ PT](../../user-stories/qtv/QTV-W05-Huấn luyện viên/QTV-W05-US02-Sửa hồ sơ PT.md) | Modal | **Sửa hồ sơ PT** | Bảng Field-level spec: Nạp sẵn thông tin cũ; khóa cứng SĐT (`READONLY`); cho phép cập nhật Họ tên, Email, Chi nhánh phục vụ (điều chuyển PT), Chuyên môn |
| [QTV-W05-US03 — Cập nhật trạng thái hồ sơ PT](../../user-stories/qtv/QTV-W05-Huấn luyện viên/QTV-W05-US03-Cập nhật trạng thái hồ sơ PT.md) | Modal | **Đổi trạng thái hồ sơ PT** | Bảng Field-level spec: Hiển thị PT và trạng thái hiện tại; chọn Trạng thái mới (`Đang hoạt động`, `Ngừng hoạt động`, `Đã lưu trữ`); nhập Lý do (optional) |
| [QTV-W05-US04 — Xem danh sách PT](../../user-stories/qtv/QTV-W05-Huấn luyện viên/QTV-W05-US04-Xem danh sách PT.md) | Màn hình chính | **Bảng danh sách huấn luyện viên** | Bảng Field-level spec: Data Grid View 7 cột, lọc theo branch scope, tìm kiếm và nút thao tác trực tiếp |

---

## Flow specification

Mỗi User Story của `QTV-W05` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/qtv/`](../../system-flow-specs/qtv/README.md).

## Traceability

- Shared capability catalog: [`W05` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

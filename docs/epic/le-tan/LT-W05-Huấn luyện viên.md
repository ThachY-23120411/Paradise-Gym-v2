# LT-W05 — Huấn luyện viên

- **Role:** Lễ tân
- **Platform:** Web only
- **Menu:** `W05`
- **Goal:** Tra cứu danh sách, số điện thoại và thông tin chuyên môn của các huấn luyện viên đang công tác tại chi nhánh phục vụ việc tư vấn cho hội viên.
- **Scope:** Màn hình chỉ đọc (Read-only) danh sách PT thuộc chi nhánh của Lễ tân (`branch scope`). Không có thẩm quyền thêm mới, chỉnh sửa hồ sơ hoặc cập nhật trạng thái hoạt động của PT (các quyền này thuộc QTV tại `QTV-W05`).

## Thành phần giao diện (UI Components & Layout)

Màn hình `W05 · Huấn luyện viên` trên nền tảng Web của Lễ tân được thiết kế dạng bảng dữ liệu trực quan (Data Grid View) ở chế độ tra cứu chỉ đọc:

### 1. Header & Action Bar
- **Tiêu đề trang:** `Huấn luyện viên` kèm tổng số lượng PT tại chi nhánh phục vụ.
- **Phân quyền thao tác:** **Không hiển thị nút `+ Thêm hồ sơ PT`** (tính năng quản trị nhân sự chỉ dành cho QTV).

### 2. Search & Filter Bar (Thanh tìm kiếm & Bộ lọc)
- **Ô tìm kiếm (Search Box):** Tìm kiếm nhanh theo Họ tên, Số điện thoại hoặc Mã PT.
- **Phạm vi chi nhánh:** Cố định theo chi nhánh làm việc hiện tại của Lễ tân (`branch scope`), không có dropdown chuyển chi nhánh khác.
- **Dropdown lọc Trạng thái:** `[Tất cả]`, `[Đang hoạt động]`, `[Ngừng hoạt động]`.

### 3. Bảng danh sách huấn luyện viên (Data Grid View — LT-W05-US01)
- **Mã PT:** Mã định danh duy nhất do SYS sinh tự động (ví dụ: `PT001`, `PT002`).
- **Họ và tên:** Họ và tên của huấn luyện viên từ `PT_PROFILE.full_name` (ví dụ: `Nguyễn Văn Hùng`).
- **Số điện thoại:** Số điện thoại liên hệ của PT (ví dụ: `0909 888 777`).
- **Email:** Địa chỉ email của PT (ví dụ: `pt.hung@paradise.vn`), hiển thị `--` nếu chưa có.
- **Chi nhánh phục vụ:** Chi nhánh nơi Lễ tân và PT đang công tác (ví dụ: `Quận 1`).
- **Chuyên môn / Ghi chú:** Mô tả chuyên môn, chứng chỉ thể hình (ví dụ: `Cardio & Thể hình, Chứng chỉ NASM`).
- **Trạng thái:** Badge trực quan (`Đang hoạt động` - xanh lá, `Ngừng hoạt động` - vàng/xám, `Đã lưu trữ` - đỏ).
- **Phân quyền thao tác:** **Không có cột nút thao tác `[Sửa]` hay `[Đổi trạng thái]`**.

---

## User Stories trong Epic

| User Story | Loại giao diện | Chức năng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [LT-W05-US01 — Xem danh sách PT](../../user-stories/le-tan/LT-W05-Huấn luyện viên/LT-W05-US01-Xem danh sách PT.md) | Màn hình chính | **Bảng danh sách huấn luyện viên (Read-only)** | Bảng Data Grid View 7 cột, lọc theo chi nhánh phục vụ, tìm kiếm PT để tư vấn hội viên tại quầy |

---

## Flow specification

User Story của `LT-W05` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/le-tan/`](../../system-flow-specs/le-tan/README.md).

## Traceability

- Shared capability catalog: [`W05` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- QTV corresponding epic: [`docs/epic/qtv/QTV-W05-Huấn luyện viên.md`](../qtv/QTV-W05-Huấn luyện viên.md).

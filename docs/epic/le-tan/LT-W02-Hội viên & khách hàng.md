# LT-W02 — Hội viên & khách hàng

- **Role:** Lễ tân
- **Platform:** Web only
- **Menu:** `W02`
- **Goal:** Quản lý hồ sơ hội viên và tra cứu lịch sử phục vụ thống nhất trong phạm vi chi nhánh trực quầy được phân công.
- **Scope:** Thêm, sửa, đổi trạng thái và xem danh sách hội viên trong chi nhánh. Chuẩn hóa/kiểm tra duy nhất số điện thoại là rule trong flow thêm/sửa.

## Thành phần giao diện (UI Components & Layout)

Menu `W02 · Hội viên & khách hàng` là màn hình danh sách trung tâm (Data Management View) trên nền tảng Web của Lễ tân, gồm 4 khối thành phần giao diện chính:

### 1. Header & Action Bar (Thanh tiêu đề & Tác vụ chính)
- **Tiêu đề trang:** `Hội viên & khách hàng`.
- **Breadcrumb:** `Trang chủ` / `Hội viên & khách hàng`. Click "Trang chủ" điều hướng về W01.
- **Nút Thêm hội viên (Primary CTA):** Nút màu xanh, chữ trắng, icon `+ Thêm hội viên`.
  - Tác vụ: Kích hoạt mở modal **Thêm mới hồ sơ hội viên** (`LT-W02-US01`).
  - Cơ chế điền dữ liệu: Tự động `PREFILL` + `READONLY` trường *Chi nhánh tiếp nhận* theo chi nhánh trực của Lễ tân; các trường Họ tên, SĐT, Email, Ngày sinh để trống chờ nhập mới.

### 2. Search & Filter Bar (Bộ lọc & Tìm kiếm)
- **Ô tìm kiếm (Search Box):** Text input có icon kính lúp, placeholder "Tìm kiếm theo mã HV, họ tên, SĐT...". Tìm kiếm/lọc danh sách realtime theo từ khóa.
- **Lọc Trạng thái (Dropdown):** Mặc định chọn `Tất cả` (tùy chọn: `Tất cả`, `Đang hoạt động`, `Ngừng hoạt động`, `Đã lưu trữ`). Lọc bảng theo trạng thái hồ sơ.
- **Chi nhánh hiện tại:** Badge text cố định hiển thị tên chi nhánh Lễ tân đang làm việc (`READONLY (PREFILL)`), khóa cứng theo branch scope trực quầy.
- **Nút Đặt lại (Outline Button):** Reset toàn bộ bộ lọc và ô tìm kiếm về mặc định ban đầu.

### 3. Data Table (Bảng danh sách hội viên — LT-W02-US04)
- **Cột hiển thị dữ liệu (7 cột):**
  1. `Mã HV`: Text link (ví dụ: `HV00123`), click để xem nhanh tóm tắt hồ sơ.
  2. `Họ và tên`: Text đậm kèm Avatar 2 ký tự viết tắt tên hội viên (hỗ trợ tiếng Việt).
  3. `Số điện thoại`: Định dạng 10 số chuẩn hóa (ví dụ: `0908 111 222`).
  4. `Email`: Địa chỉ email liên hệ (hoặc hiển thị `-` nếu chưa có).
  5. `Chi nhánh`: Tên chi nhánh tiếp nhận ban đầu của hồ sơ.
  6. `Trạng thái hồ sơ`: Status badge màu (`Đang hoạt động` - xanh, `Ngừng hoạt động` - cam, `Đã lưu trữ` - xám).
  7. `Thao tác (Row Actions)`:
     - **Icon Sửa (📝):** Mở modal **Sửa hồ sơ hội viên** (`LT-W02-US02`). Tự động `PREFILL` dữ liệu của dòng được chọn: *Họ và tên* (cho sửa), *Số điện thoại* (khóa cứng `READONLY`), *Email* (cho sửa), *Chi nhánh tiếp nhận* (khóa cứng `READONLY`), *Ngày sinh* (đổ vào Date Picker nếu có).
     - **Icon Đổi trạng thái:** Mở modal **Đổi trạng thái hội viên** (`LT-W02-US03`). Tự động `PREFILL` và hiển thị cố định (`READONLY`): *Mã & Họ tên hội viên*, *Trạng thái hiện tại*; để trống chọn *Trạng thái mới* và nhập *Lý do*.
     - **Icon Xem chi tiết / Gói tập (👁️):** Chuyển hướng sang menu `LT-W04`, tự động lọc bảng theo *Mã hội viên* được chọn để xem danh sách đăng ký / gói tập.

### 4. Pagination (Phân trang)
- **Bộ chọn số bản ghi:** Dropdown chọn `10`, `20`, `50` dòng/trang.
- **Bộ chuyển trang:** Nút `<` (Trang trước), `>` (Sau), số trang hiện tại và tổng số bản ghi.

---

## User Stories và Modal tương ứng trong Epic

| User Story | Loại giao diện | Modal / Form tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [LT-W02-US01 — Thêm hội viên](../../user-stories/le-tan/LT-W02-Hội viên & khách hàng/LT-W02-US01-Thêm hội viên.md) | Modal | **Thêm mới hồ sơ hội viên** | Bảng Field-level spec 5 trường: Họ và tên, SĐT (Dynamic Unique), Email, Chi nhánh tiếp nhận (Prefill Readonly), Ngày sinh |
| [LT-W02-US02 — Sửa hồ sơ hội viên](../../user-stories/le-tan/LT-W02-Hội viên & khách hàng/LT-W02-US02-Sửa hồ sơ hội viên.md) | Modal | **Sửa hồ sơ hội viên** | Bảng Field-level spec 5 trường: Họ và tên, SĐT (Readonly khóa cứng), Email, Chi nhánh tiếp nhận (Readonly), Ngày sinh |
| [LT-W02-US03 — Đổi trạng thái hội viên](../../user-stories/le-tan/LT-W02-Hội viên & khách hàng/LT-W02-US03-Đổi trạng thái hội viên.md) | Modal | **Đổi trạng thái hội viên** | Bảng Field-level spec 4 trường: Hội viên (Readonly), Trạng thái hiện tại (Readonly), Trạng thái mới (Select), Lý do |
| [LT-W02-US04 — Xem danh sách hội viên](../../user-stories/le-tan/LT-W02-Hội viên & khách hàng/LT-W02-US04-Xem danh sách hội viên.md) | Màn hình danh sách chính | Không có modal | Bảng Field-level spec 6 trường hiển thị trên Data Table |

---

## Flow specification

Mỗi User Story của `LT-W02` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/le-tan/`](../../system-flow-specs/le-tan/README.md).

## Traceability

- Shared capability catalog: [`W02` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

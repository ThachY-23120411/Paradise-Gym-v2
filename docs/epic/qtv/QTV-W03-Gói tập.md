# QTV-W03 — Gói tập

- **Role:** QTV / Quản lý
- **Platform:** Web only
- **Menu:** `W03`
- **Goal:** Quản lý danh mục gói, quyền lợi, giá và trạng thái bán.
- **Scope:** Gói Gym, PT, Combo; thời hạn, số buổi, quyền lợi, giá, phạm vi chi nhánh. Chi tiết lượt đăng ký thuộc W04.

## Thành phần giao diện (UI Components & Layout)

Menu `W03 · Gói tập` được thiết kế theo dạng **Lưới thẻ (Card Grid Layout)** trực quan trên nền tảng Web của QTV, gồm 2 khối thành phần giao diện chính:

### 1. Header & Filter Bar (Thanh công cụ & Bộ lọc)
- **Tab lọc trạng thái bán (Segmented Control):**
  - Gồm 3 tab chuyển đổi nhanh: `[Tất cả]`, `[Đang bán]`, `[Ngừng bán]`.
  - Mặc định chọn `Tất cả`.
  - Thao tác: Click chuyển tab để lọc tức thì danh sách gói tập tương ứng hiển thị trên Card Grid.
- **Nút Tạo gói mới (Primary CTA Button):**
  - Vị trí: Đặt bên cạnh cụm tab lọc.
  - Định dạng: Nút màu xanh lá, chữ trắng, icon `+ Tạo gói mới`.
  - Tác vụ: Kích hoạt mở modal **Tạo mới danh mục gói tập** (`QTV-W03-US02`). Form khởi tạo các trường rỗng, mặc định trạng thái `Đang bán`.

### 2. Lưới thẻ gói tập (Card Grid Layout — QTV-W03-US01)
- **Cấu trúc bố cục lưới (Layout):**
  - **Số cột:** Cố định **3 cột / hàng** (`grid grid-cols-3`).
  - **Số hàng:** Tự động mở rộng theo tổng số gói tập trong danh mục (ví dụ: 9 gói = 3 hàng × 3 cột).
  - **Cách bố trí card:** Các thẻ card hình chữ nhật bo tròn góc được xếp đều đặn từ trái sang phải, từ trên xuống dưới, khoảng cách (gap) đồng nhất.
- **Cấu trúc chi tiết hiển thị trên từng thẻ (Card Components):**
  - **Tên gói (Card Title):** Tiêu đề chữ đậm màu đen nổi bật (ví dụ: `Gói 1 tháng`, `Combo Gym 3 tháng + PT 10 buổi`).
  - **Trạng thái gói (Status Badge):** Đặt tại góc trên bên phải của thẻ:
    - Badge màu xanh lá: `Đang bán`
    - Badge màu xám: `Ngừng bán`
  - **Mã gói & Phân loại:** Dòng phụ chữ xám bên dưới tên gói, hiển thị theo cú pháp `{Mã gói} · {Loại gói} - {Cách giới hạn}` (ví dụ: `G01 · GYM - Theo ngày`, `G05 · GYM - Theo buổi`, `G06 · PT - Theo buổi`, `G08 · COMBO - Theo ngày + buổi`).
  - **Giá niêm yết (Price):** Số tiền to đậm màu xanh lá nổi bật theo định dạng tiền tệ VND (ví dụ: `500.000 đ`, `3.200.000 đ`).
  - **Hạn định / Quyền lợi:** Dòng thông tin thời hạn sử dụng và/hoặc số buổi tập (ví dụ: `Thời hạn: 30 ngày`, `Thời hạn: 90 ngày · PT: 10 buổi`).
  - **Chi nhánh áp dụng:** Danh sách các chi nhánh được phép sử dụng gói (ví dụ: `Áp dụng: Quận 1, Bình Thạnh`).
- **Các nút thao tác dưới chân thẻ (Card Footer Actions):**
  - **Nút [Chi tiết]:** Nút icon thông tin `[ℹ Chi tiết]`. Click mở popup **Chi tiết gói tập** hiển thị toàn diện các khối thông tin của gói: Phân loại & Giá bán niêm yết, Quyền lợi & Hạn mức sử dụng (thời hạn/vô thời hạn theo buổi, số lượt Gym, số buổi PT, hình thức 1-1 hay nhóm 1-N), Phạm vi áp dụng & Mô tả chi tiết, cùng các nút thao tác nhanh (`[Sửa gói]`, `[Ngừng bán / Mở bán lại]`, `[Đóng]`).
  - **Nút [Sửa]:** Nút nền tối, chữ trắng, icon cây bút 📝. Click mở modal **Cập nhật danh mục gói tập** (`QTV-W03-US03`), tự động `PREFILL` toàn bộ thông tin của gói hiện tại (Loại gói & Cách giới hạn khóa cứng `READONLY`, Tên gói, Thời hạn, Số lượt Gym / Số buổi PT, Giá bán, Chi nhánh áp dụng, Trạng thái bán, Mô tả).
  - **Nút chuyển trạng thái bán:**
    - Khi gói đang ở trạng thái `Đang bán`: Hiển thị nút đỏ **[Ngừng bán]**. Click mở popup xác nhận ngừng bán (`QTV-W03-US04`).
    - Khi gói đang ở trạng thái `Ngừng bán`: Hiển thị nút tối **[Mở bán lại]**. Click để khôi phục gói về trạng thái `Đang bán`.

---

## User Stories và Modal tương ứng trong Epic

| User Story | Loại giao diện | Modal / Form tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [QTV-W03-US01 — Xem danh sách gói tập](../../user-stories/qtv/QTV-W03-Gói tập/QTV-W03-US01-Xem danh sách gói tập.md) | Màn hình chính & Popup chi tiết | Giao diện Card Grid (3 cột / hàng) & **Popup Chi tiết gói tập** | Đặc tả chi tiết các trường hiển thị trên từng thẻ gói tập, popup xem chi tiết toàn diện và bộ lọc trạng thái bán |
| [QTV-W03-US02 — Thêm gói tập](../../user-stories/qtv/QTV-W03-Gói tập/QTV-W03-US02-Thêm gói tập.md) | Modal | **Tạo mới danh mục gói tập** | Bảng Field-level spec: Chọn Loại gói (`GYM`/`PT`/`COMBO`) $\rightarrow$ Chọn Cách giới hạn $\rightarrow$ Dynamic form nhập hạn định (Thời hạn, Số lượt Gym, Số buổi PT), Giá bán, Chi nhánh, Trạng thái |
| [QTV-W03-US03 — Sửa gói tập](../../user-stories/qtv/QTV-W03-Gói tập/QTV-W03-US03-Sửa gói tập.md) | Modal | **Cập nhật danh mục gói tập** | Bảng Field-level spec: Prefill thông tin gói; khóa cứng `Loại gói` và `Cách giới hạn` (`READONLY`); cho sửa Tên, Giá, Hạn định (Thời hạn/Số buổi), Chi nhánh, Trạng thái, Mô tả |
| [QTV-W03-US04 — Ngừng bán gói](../../user-stories/qtv/QTV-W03-Gói tập/QTV-W03-US04-Ngừng bán gói.md) | Popup xác nhận | **Xác nhận ngừng bán gói tập** | Popup cảnh báo tác động: chỉ ngừng bán cho đăng ký mới, giữ nguyên hiệu lực cho các gói đã bán |

---

## Flow specification

Mỗi User Story của `QTV-W03` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/qtv/`](../../system-flow-specs/qtv/README.md).

## Traceability

- Shared capability catalog: [`W03` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

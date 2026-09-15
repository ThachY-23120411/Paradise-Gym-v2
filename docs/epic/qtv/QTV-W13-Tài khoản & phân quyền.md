# QTV-W13 — Tài khoản & phân quyền

- **Role:** QTV / Quản lý
- **Platform:** Web only
- **Menu:** `W13`
- **Goal:** Quản trị tập trung danh sách tài khoản người dùng toàn hệ thống, theo dõi các chỉ số KPI tài khoản theo thời gian thực và phân quyền truy cập, vai trò cùng phạm vi chi nhánh đảm bảo đúng người, đúng quyền và bảo mật.
- **Scope:** 
  1. **Hàng 4 Thẻ KPI thống kê:** Đo lường tức thời Tổng tài khoản, Tài khoản đang hoạt động, Tài khoản chờ kích hoạt và Tài khoản đã khóa/tạm dừng.
  2. **Bộ công cụ lọc & Tra cứu:** Tìm kiếm nhanh theo SĐT đăng nhập, Tên người dùng hoặc Mã hồ sơ liên kết; lọc danh sách theo nhóm vai trò (`QTV`, `Lễ tân`, `PT`, `Hội viên`) và theo trạng thái tài khoản.
  3. **Bảng dữ liệu tài khoản (Datagridview):** Hiển thị chi tiết định danh đăng nhập, người sử dụng & hồ sơ liên kết, vai trò được cấp, chi nhánh công tác và trạng thái hoạt động.
  4. **Modal Sửa tài khoản & Phân quyền:** Điều chỉnh thông tin hiển thị, vai trò, chi nhánh công tác, quyền nhạy cảm, trạng thái tài khoản, consent thông báo, sinh nhật kiosk K01 và bắt buộc nhập lý do khi sửa quyền nhạy cảm hoặc khóa tài khoản; hỗ trợ tính năng xem trước quyền.

---

## Thành phần giao diện (UI Components & Layout)

Menu `W13 · Tài khoản & phân quyền` được thiết kế theo bố cục Dashboard quản trị danh sách kết hợp Modal phân quyền chi tiết:

### 1. Hàng 4 Thẻ KPI Chỉ số tài khoản (Stat Cards)
- **Thẻ Tổng tài khoản hệ thống:** Đếm tổng số lượng tài khoản đăng ký theo định danh SĐT duy nhất trên toàn chuỗi.
- **Thẻ Đang hoạt động:** Đếm số lượng tài khoản có trạng thái `ACTIVE`, đã kích hoạt và đang đăng nhập sử dụng bình thường.
- **Thẻ Chờ kích hoạt:** Đếm số lượng tài khoản `PENDING_ACTIVATION` (những người đã có hồ sơ tại phòng tập nhưng chưa kích hoạt tài khoản App qua OTP và chưa tạo mật khẩu).
- **Thẻ Đã khóa:** Đếm số lượng tài khoản có trạng thái `LOCKED` (tài khoản bị khóa do vi phạm, nhân sự nghỉ việc hoặc tạm ngừng sử dụng, không được phép đăng nhập).

### 2. Thanh công cụ Tìm kiếm & Bộ lọc (Search & Filter Bar)
- **Ô tìm kiếm tài khoản:** Ô nhập liệu có icon kính lúp, hỗ trợ tra cứu nhanh theo Số điện thoại đăng nhập, Họ tên người dùng hoặc Mã hồ sơ (`HV001`, `PT001`).
- **Bộ lọc Vai trò (Role Filter):** Danh sách chọn nhanh theo vai trò: `Tất cả`, `Quản trị viên (QTV)`, `Lễ tân`, `Huấn luyện viên (PT)`, `Hội viên`.
- **Bộ lọc Trạng thái (Status Filter):** Dropdown lọc theo 3 trạng thái tài khoản: `Tất cả`, `Hoạt động`, `Chờ kích hoạt`, `Đã khóa`.
- **Nút Đặt lại bộ lọc:** Nút bấm viền xám giúp khôi phục toàn bộ tiêu chí lọc về mặc định.

### 3. Bảng danh sách Tài khoản (Data Table — QTV-W13-US01)
Bảng dữ liệu hiển thị danh sách tài khoản người dùng gồm 6 cột thông tin:
- **Cột SĐT Đăng nhập:** Hiển thị số điện thoại duy nhất đóng vai trò là định danh đăng nhập tài khoản.
- **Cột Người sử dụng:** Hiển thị Họ tên người dùng (chữ in đậm) kèm mã hồ sơ liên kết ở dòng phụ bên dưới (ví dụ: `Hồ sơ: PT001` hoặc `Hồ sơ: HV001`).
- **Cột Vai trò:** Status badge màu thể hiện vai trò được cấp (`QTV`, `Quản lý`, `Lễ tân`, `PT`, `Hội viên`).
- **Cột Chi nhánh áp dụng:** Chi nhánh làm việc được phân công (`Quận 1`, `Bình Thạnh` hoặc `Toàn hệ thống`).
- **Cột Trạng thái:** Badge trạng thái tài khoản (`Hoạt động` - xanh lá, `Chờ kích hoạt` - vàng, `Đã khóa` - đỏ/xám).
- **Cột Thao tác:** Nút **`[ 📝 Sửa ]`** trên từng dòng, click mở modal Sửa tài khoản & Phân quyền (`QTV-W13-US02`).
- **Khối Phân trang (Pagination):** Bộ chọn số dòng trên trang (`10`, `20`, `50`) và cụm nút chuyển trang kèm tổng số bản ghi.

### 4. Modal Sửa tài khoản (QTV-W13-US02)
Modal cửa sổ pop-up tinh gọn cho phép QTV cập nhật nhanh quyền hạn và trạng thái của tài khoản:
- **Tiêu đề modal:** `Sửa tài khoản` kèm nút đóng `[ ✕ ]`.
- **Các trường thông tin trên Form:**
  1. `SĐT đăng nhập`: Hiển thị số điện thoại định danh duy nhất (khóa chỉ đọc `READONLY`), ghi chú *SĐT dùng đăng nhập là duy nhất và không đổi trực tiếp tại đây*.
  2. `Trạng thái tài khoản`: Dropdown bắt buộc chọn 1 trong 3 trạng thái: `ACTIVE` (Hoạt động), `PENDING_ACTIVATION` (Chờ kích hoạt), `LOCKED` (Đã khóa).
  3. `Vai trò`: Multi-select tags/pills bắt buộc chọn một hoặc nhiều vai trò (`MEMBER`, `PT`, `RECEPTIONIST`, `QTV`), ghi chú *Một tài khoản có thể có nhiều vai trò; quyền không tự cộng gộp ngoài phạm vi được cấp*.
  4. `Phạm vi chi nhánh`: Dropdown tùy chọn chi nhánh công tác (`Quận 1`, `Bình Thạnh`, `Toàn hệ thống`), ghi chú *Chỉ áp dụng với role nhân viên: PT, Lễ tân, QTV*.
- **Chân Modal:** Nút **`[ Hủy ]`** (màu tối) và Nút **`[ Lưu thay đổi ]`** (màu tím/xanh).

---

## User Stories trong Epic

| User Story | Loại giao diện | Khối UI tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [QTV-W13-US01 — Xem danh sách tài khoản và thống kê KPI](../../user-stories/qtv/QTV-W13-Tài khoản & phân quyền/QTV-W13-US01-Xem danh sách tài khoản và thống kê KPI.md) | Màn hình chính | **Dashboard KPI & Bảng tài khoản** | Xem 4 thẻ KPI thống kê, tìm kiếm, lọc vai trò/trạng thái và xem danh sách tài khoản người dùng |
| [QTV-W13-US02 — Sửa tài khoản](../../user-stories/qtv/QTV-W13-Tài khoản & phân quyền/QTV-W13-US02-Sửa tài khoản.md) | Modal pop-up | **Modal Tài khoản và phân quyền** | Cập nhật tên hiển thị, vai trò, chi nhánh công tác, quyền nhạy cảm, trạng thái tài khoản và ghi nhận lý do audit |

---

## Flow specification

Mỗi User Story của `QTV-W13` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/qtv/`](../../system-flow-specs/qtv/README.md).

## Traceability

- Shared capability catalog: [`W13` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit & Screenshot: [`screenshot/qtv/light-web-modal-tai-khoan-va-phan-quyen.png`](../../screenshot/qtv/light-web-modal-tai-khoan-va-phan-quyen.png).


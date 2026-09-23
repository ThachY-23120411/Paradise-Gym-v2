# QTV-W02 — Hội viên & khách hàng

- **Role:** QTV / Quản lý
- **Platform:** Web only
- **Menu:** `W02`
- **Goal:** Quản lý hồ sơ hội viên và tra cứu lịch sử phục vụ thống nhất trong phạm vi được cấp.
- **Scope:** Thêm, sửa, đổi trạng thái, xem danh sách và popup tra cứu hồ sơ cùng hội viên theo 5 menu Mobile. Popup mới chỉ dành QTV; các luồng CRUD hiện hữu và popup LT được giữ riêng. Chuẩn hóa/kiểm tra duy nhất số điện thoại là rule trong flow thêm/sửa.

## Thành phần giao diện (UI Components & Layout)

Menu `W02 · Hội viên & khách hàng` là màn hình danh sách trung tâm (Data Management View) trên nền tảng Web của QTV, gồm 4 khối thành phần giao diện chính:

### 1. Header & Action Bar (Thanh tiêu đề & Tác vụ chính)
- **Tiêu đề trang:** `Hội viên & khách hàng`.
- **Breadcrumb:** `Trang chủ` / `Hội viên & khách hàng`. Click "Trang chủ" điều hướng về W01.
- **Nút Thêm hội viên (Primary CTA):** Nút màu xanh, chữ trắng, icon `+ Thêm hội viên`.
  - Tác vụ: Kích hoạt mở modal **Thêm mới hồ sơ hội viên** (`QTV-W02-US01`).
  - Cơ chế điền dữ liệu: Tự động `PREFILL` + `READONLY` trường *Chi nhánh tiếp nhận* theo chi nhánh làm việc của tài khoản QTV đang thao tác; các trường Họ tên, SĐT, Email, Ngày sinh để trống chờ nhập mới.

### 2. Search & Filter Bar (Bộ lọc & Tìm kiếm)
- **Ô tìm kiếm (Search Box):** Text input có icon kính lúp, placeholder "Tìm kiếm theo mã HV, họ tên, SĐT...". Tìm kiếm/lọc danh sách realtime theo từ khóa.
- **Lọc Trạng thái (Dropdown):** Mặc định chọn `Tất cả` (tùy chọn: `Tất cả`, `Đang hoạt động`, `Ngừng hoạt động`, `Đã lưu trữ`). Lọc bảng theo trạng thái hồ sơ.
- **Lọc Chi nhánh (Dropdown/Combobox):** Cho phép QTV chọn lọc theo từng chi nhánh trong branch scope được phân quyền.
- **Nút Đặt lại (Outline Button):** Reset toàn bộ bộ lọc và ô tìm kiếm về mặc định ban đầu.

### 3. Data Table (Bảng danh sách hội viên — QTV-W02-US04)
- **Cột hiển thị dữ liệu (7 cột):**
  1. `Mã HV`: Text link (ví dụ: `HV00123`), click để xem nhanh tóm tắt hồ sơ.
  2. `Họ và tên`: Text đậm kèm Avatar 2 ký tự viết tắt tên hội viên (hỗ trợ tiếng Việt).
  3. `Số điện thoại`: Định dạng 10 số chuẩn hóa (ví dụ: `0908 111 222`).
  4. `Email`: Địa chỉ email liên hệ (hoặc hiển thị `-` nếu chưa có).
  5. `Chi nhánh`: Tên chi nhánh tiếp nhận ban đầu của hồ sơ.
  6. `Trạng thái hồ sơ`: Status badge màu (`Đang hoạt động` - xanh, `Ngừng hoạt động` - cam, `Đã lưu trữ` - xám).
  7. `Thao tác (Row Actions)`:
     - **Icon Sửa (📝):** Mở modal **Sửa hồ sơ hội viên** (`QTV-W02-US02`). Tự động `PREFILL` dữ liệu của dòng được chọn: *Họ và tên* (cho sửa), *Số điện thoại* (khóa cứng `READONLY`), *Email* (cho sửa), *Chi nhánh tiếp nhận* (khóa cứng `READONLY`), *Ngày sinh* (đổ vào Date Picker nếu có).
     - **Icon Đổi trạng thái:** Mở modal **Đổi trạng thái hội viên** (`QTV-W02-US03`). Tự động `PREFILL` và hiển thị cố định (`READONLY`): *Mã & Họ tên hội viên*, *Trạng thái hiện tại*; để trống chọn *Trạng thái mới* và nhập *Lý do*.
     - **Mở hồ sơ:** Bấm Mã HV hoặc dòng hội viên mở popup tra cứu (`QTV-W02-US04`). Không đồng nhất thao tác này với nút `Xem đăng ký gói` điều hướng W04 theo chính hội viên.
     - **Xem đăng ký gói:** Điều hướng menu W04 với ngữ cảnh cùng hội viên; không thay điều kiện đăng ký hoặc quyền thao tác.

### 4. Pagination (Phân trang)
- **Bộ chọn số bản ghi:** Dropdown chọn `10`, `20`, `50` dòng/trang.
- **Bộ chuyển trang:** Nút `<` (Trang trước), `>` (Trang sau), số trang hiện tại và tổng số bản ghi.

---

## User Stories và Modal tương ứng trong Epic

| User Story | Loại giao diện | Modal / Form tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [QTV-W02-US01 — Thêm hội viên](../../user-stories/qtv/QTV-W02-Hội viên & khách hàng/QTV-W02-US01-Thêm hội viên.md) | Modal | **Thêm mới hồ sơ hội viên** | Bảng Field-level spec 5 trường: Họ và tên, SĐT (Dynamic Unique), Email, Chi nhánh (Prefill Readonly), Ngày sinh |
| [QTV-W02-US02 — Sửa hồ sơ hội viên](../../user-stories/qtv/QTV-W02-Hội viên & khách hàng/QTV-W02-US02-Sửa hồ sơ hội viên.md) | Modal | **Sửa hồ sơ hội viên** | Bảng Field-level spec 5 trường: Họ và tên, SĐT (Readonly khóa cứng), Email, Chi nhánh (Readonly), Ngày sinh |
| [QTV-W02-US03 — Đổi trạng thái hội viên](../../user-stories/qtv/QTV-W02-Hội viên & khách hàng/QTV-W02-US03-Đổi trạng thái hội viên.md) | Modal | **Đổi trạng thái hội viên** | Bảng Field-level spec 4 trường: Hội viên (Readonly), Trạng thái hiện tại (Readonly), Trạng thái mới (Select), Lý do |
| [QTV-W02-US04 — Xem danh sách hội viên](<../../user-stories/qtv/QTV-W02-Hội viên & khách hàng/QTV-W02-US04-Xem danh sách hội viên.md>) | Danh sách + popup tra cứu QTV | Hồ sơ hội viên theo 5 menu Mobile | Bảng field-level, bộ lọc và luồng đọc dữ liệu cùng hội viên; không giả danh thao tác Mobile |

## Popup tra cứu QTV theo menu Hội viên (22/09/2026)

- Năm khu vực: Trang chủ, Lịch tập, Gói của tôi, Thanh toán, Tài khoản, cùng tổ chức thông tin với 5 menu Mobile Hội viên hiện hành. Thông báo là route riêng từ chuông Mobile, không mặc nhiên là menu thứ sáu trong popup.
- Nguồn tra cứu chỉ đọc QTV `GET /members/:id/overview-data` do backend owner triển khai: profile theo danh sách field cho phép, registrations sở hữu và tham gia nhóm, lời mời, lịch PT, lớp cộng đồng trong phạm vi được cấp. Popup mới lấy profile từ projection, không gọi detail cũ trả thừa giá/biometric. Payment hiện có chỉ dùng khi có quyền tài chính, đúng subject/scope và đủ phân trang. Không thêm schema hoặc giả lập bằng thông tin mặc định.
- Luôn giữ đúng member ID và phạm vi chi nhánh đang chọn; không ép ALL để lấy thêm dữ liệu. Thất bại API phải báo lỗi/thử lại, không đổi thành danh sách rỗng hay chỉ số 0.
- Tài khoản là phần tra cứu hồ sơ; không cung cấp mật khẩu, phiên/thiết bị cá nhân, đăng xuất, cài đặt riêng hay thao tác thay mặt hội viên. Đồng bộ thông tin không đồng nghĩa đồng bộ quyền tự phục vụ.
- Các quyền thêm/sửa/đổi trạng thái, đăng ký gói, điều phối lịch, consent và thu tiền của QTV tiếp tục theo US/permission hiện hữu ở màn hình quản trị tương ứng; popup không thay business rule của các flow này. LT giữ popup hiện hữu, không được gọi projection QTV-only.
- Field/control và hành động popup chốt theo code của UI owner trong US04. [Audit, nguồn và kết quả đồng bộ](../../reports/tab1-web-admin/2026-09-22-member-popup-walkthrough.md).

---

## Flow specification

Mỗi User Story của `QTV-W02` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/qtv/`](../../system-flow-specs/qtv/README.md).

## Traceability

- Shared capability catalog: [`W02` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

# QTV-W04 — Đăng ký & gia hạn

- **Role:** QTV / Quản lý
- **Platform:** Web only
- **Menu:** `W04`
- **Goal:** Quản lý danh sách các hợp đồng đăng ký gói tập, tạo đăng ký mới, gia hạn gói nối tiếp cho hội viên và theo dõi trạng thái sử dụng dịch vụ.
- **Scope:** Tạo registration, gia hạn nối tiếp, xem danh sách đăng ký và snapshot dữ liệu bán. Nghiệp vụ thu tiền 100% thuộc W08; phân công PT thuộc W05 / Mobile Hội viên.

## Thành phần giao diện (UI Components & Layout)

Menu `W04 · Đăng ký & gia hạn` là màn hình quản lý hợp đồng đăng ký dịch vụ (Subscription / Registration View) trên nền tảng Web của QTV, gồm 4 khối thành phần giao diện chính:

### 1. Header & Action Bar (Thanh tiêu đề & Tác vụ chính)
- **Tiêu đề trang:** `Đăng ký & gia hạn`.
- **Breadcrumb:** `Trang chủ` / `Đăng ký & gia hạn`. Click "Trang chủ" điều hướng về W01.
- **Nút Tạo đăng ký gói mới (Primary CTA Button):**
  - Vị trí: Đặt tại góc trên bên phải trang.
  - Định dạng: Nút màu xanh lá, chữ trắng, icon `+ Tạo đăng ký gói mới`.
  - Tác vụ: Kích hoạt mở modal **Tạo đăng ký gói mới** (`QTV-W04-US01`). 
  - Cơ chế khởi tạo: Form để trống chờ chọn Hội viên và Gói tập; Ngày bắt đầu mặc định là ngày hôm nay; Chi nhánh bán được SYS tự động ghi nhận ngầm theo tài khoản QTV đang thao tác.

### 2. Search & Filter Bar (Thanh tìm kiếm & Bộ lọc tinh gọn)
- **Ô tìm kiếm (Search Box):** Text input có icon kính lúp, placeholder *"Tìm kiếm theo mã ĐK, họ tên HV, SĐT, tên gói..."*. Tìm kiếm và lọc danh sách đăng ký theo thời gian thực (realtime).
- **Bộ lọc Trạng thái đăng ký (Dropdown / Select):**
  - Mặc định: `Tất cả`.
  - Các tùy chọn lọc:
    - `Tất cả`
    - `Chờ thanh toán` (`PENDING_PAYMENT`): Đăng ký vừa tạo, chưa thanh toán.
    - `Đang hoạt động` (`ACTIVE`): Đã thanh toán 100%, đang trong thời hạn hiệu lực.
    - `Sắp hết hạn`: Còn hạn $\le$ 7 ngày hoặc còn $\le$ 2 buổi.
    - `Đã hết hạn` (`EXPIRED`): Đã qua ngày kết thúc hoặc đã dùng hết số buổi.
    - `Đã hủy` (`CANCELLED`): Đăng ký bị hủy do sai sót hoặc vi phạm.
- **Bộ lọc Tình trạng gán PT (Dropdown / Select):**
  - Mặc định: `Tất cả`.
  - Các tùy chọn lọc:
    - `Tất cả`
    - `Chưa gán PT`: Lọc nhanh các đơn gói PT hoặc COMBO chưa có Huấn luyện viên phụ trách để Lễ tân/QTV kịp thời gán PT.
    - `Đã gán PT`: Lọc các đơn đã được phân công PT phụ trách.
- **Nút Đặt lại (Outline Button):** Reset toàn bộ ô tìm kiếm và các bộ lọc về giá trị mặc định ban đầu.

#### 3. Data Table (Bảng danh sách đăng ký gói tập — QTV-W04-US03)
- **Cấu trúc bảng dữ liệu (8 cột chuẩn, thanh toán 100% không công nợ):**
  1. `Mã`: Mã đăng ký (ví dụ: `DK001`, `DK002`), hiển thị văn bản mã đăng ký.
  2. `Hội viên`: Họ tên hội viên (chữ đậm nổi bật); dòng phụ bên dưới hiển thị `{Mã HV} · {Chi nhánh}` (ví dụ: `Nguyễn Văn An`<br>`HV001 · Quận 1`, `Trần Thị Bình`<br>`HV002 · Quận 1`).
  3. `Gói đăng ký`: Tên gói đăng ký niêm yết (ví dụ: `Gói 3 tháng`, `Gói PT 20 buổi`).
  4. `Kỳ hiệu lực`: Khoảng thời gian từ ngày bắt đầu đến ngày kết thúc `{start_date} → {end_date}` theo định dạng `DD/MM/YYYY` (ví dụ: `15/07/2026 → 15/10/2026`).
  5. `Số tiền`: Tổng giá trị thanh toán 100% của gói (ví dụ: `1.350.000 đ`, `3.800.000 đ`); hệ thống áp dụng thanh toán 100% 1 lần duy nhất, không áp dụng công nợ.
  6. `PT phụ trách`: Huấn luyện viên phụ trách gói:
     - Gói GYM: Hiển thị dấu gạch ngang `--`.
     - Gói có PT (PT / COMBO): Hiển thị `{Tên PT} ({Mã PT})` nếu đã phân công (ví dụ: `Nguyễn Thành Long (PT001)`), hoặc hiển thị `Chưa có PT phụ trách` nếu chưa phân công.
  7. `Trạng thái`: Status badge viền màu trực quan:
     - Badge viền xanh lá: `Đang hiệu lực`
     - Badge viền vàng cam: `Chờ thanh toán`
     - Badge viền xám: `Đã hết hạn`
     - Badge viền đỏ: `Đã hủy`
  8. `Thao tác (Row Actions)`:
     - **Với gói PT/COMBO chưa có PT:** Nút nổi bật **`[Gán PT]`** (mở modal Gán PT phụ trách `QTV-W04-US05`).
     - **Khi `Đang hiệu lực`:** Nút `Chi tiết` (mở sidebar drawer `QTV-W04-US04`) và Nút viền xanh `Gia hạn` (mở modal gia hạn gói `QTV-W04-US02`).
     - **Khi `Chờ thanh toán`:** Nút nền vàng nổi bật `Thu tiền` (mở nhanh modal thanh toán 100% W08) và Nút `Chi tiết`.
     - **Khi `Đã hết hạn`:** Nút `Chi tiết` và Nút `Gia hạn`.

---

### 4. Sidebar Drawer Xem chi tiết lượt đăng ký gói (Khi bấm nút [Chi tiết] — QTV-W04-US04)
Thông tin chi tiết gói tập và **Tiến độ / Số buổi** được xem trong Sidebar Drawer trượt từ cạnh phải màn hình để bảng danh sách không bị chật chội:
- **Thông tin Hội viên:** Avatar, Họ tên, Mã HV, SĐT và Chi nhánh hội viên.
- **Thông tin Gói tập:** Tên gói, Phân loại gói (`GYM`, `PT`, `COMBO`), Kỳ hiệu lực, Chi nhánh áp dụng và Nhân viên tiếp nhận.
- **Thông tin Thanh toán 100%:** Giá trị trọn gói 100%, Trạng thái thanh toán (`Đã thanh toán 100%` kèm phương thức và thời gian thanh toán, hoặc `Chờ thanh toán 100%` kèm nút nhanh `[Thu tiền ngay]`). Hoàn toàn không có công nợ.
- **Quyền lợi & Tiến độ sử dụng:**
  - *🏋️ Quyền tập Gym (Gói Gym / Combo):* Số ngày còn lại, thanh Progress bar xanh lá, thông số đã qua / tổng thời hạn, tổng số lượt check-in thực tế.
  - *🥊 Quyền huấn luyện PT (Gói PT / Combo):* Số buổi còn lại, thanh Progress bar cam, thông số đã tập / tổng số buổi, HLV phụ trách (nếu chưa có PT, hiển thị kèm nút nhanh `[Gán PT phụ trách]` mở `QTV-W04-US05`).

---

### 5. Pagination (Phân trang)
- **Bộ chọn số bản ghi:** Dropdown chọn `10`, `20`, `50` dòng/trang.
- **Bộ chuyển trang:** Nút `<` (Trang trước), `>` (Trang sau), hiển thị số trang hiện tại và tổng số dòng đăng ký.

---

## User Stories và Modal tương ứng trong Epic

| User Story | Loại giao diện | Modal / Form tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [QTV-W04-US01 — Tạo đăng ký gói mới](../../user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US01-Tạo đăng ký gói mới.md) | Modal | **Tạo đăng ký gói mới** | Form chọn Hội viên (tìm kiếm SĐT/tên), Gói tập (chỉ gói đang bán), Ngày bắt đầu; tự động tính Ngày kết thúc và hiển thị Giá gốc; tạo đăng ký trạng thái `PENDING_PAYMENT` |
| [QTV-W04-US02 — Gia hạn đăng ký gói](../../user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US02-Gia hạn đăng ký gói.md) | Modal | **Gia hạn đăng ký gói** | Form prefill Hội viên, Gói cũ, Ngày hết hạn cũ; tự động tính Ngày bắt đầu mới (nếu còn hạn = Ngày hết hạn cũ + 1; nếu hết hạn = Ngày hiện tại + 1) và Ngày kết thúc mới; tạo đăng ký gia hạn trạng thái `PENDING_PAYMENT` |
| [QTV-W04-US03 — Xem danh sách các đăng ký](../../user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US03-Xem danh sách các đăng ký.md) | Màn hình chính | Giao diện Data Grid View (8 cột) | Đặc tả 8 cột dữ liệu chuẩn theo UI, thanh toán 100% không công nợ, bộ lọc trạng thái, bộ lọc tình trạng gán PT, thanh tìm kiếm và các action row ([Gán PT], [Gia hạn], [Thu tiền], [Chi tiết]) |
| [QTV-W04-US04 — Xem chi tiết lượt đăng ký gói](../../user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US04-Xem chi tiết lượt đăng ký gói.md) | Sidebar Drawer | **Chi tiết Lượt Đăng ký Gói** | Sidebar trượt từ phải: Khối Hội viên, Gói tập, Thanh toán 100% (không công nợ), Quyền lợi & Tiến độ (Progress bar Gym & Progress bar PT), nút gán PT nhanh nếu chưa phân công |
| [QTV-W04-US05 — Gán PT phụ trách cho gói đăng ký](../../user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US05-Gán PT phụ trách cho gói đăng ký.md) | Modal | **Gán PT phụ trách** | Form modal prefill thông tin gói, hội viên, chi nhánh; combobox tìm kiếm & chọn HLV đang hoạt động tại chi nhánh; gán HLV trực tiếp cho gói PT/COMBO tại quầy |

---

## Flow specification

Mỗi User Story của `QTV-W04` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/qtv/`](../../system-flow-specs/qtv/README.md).

## Traceability

- Shared capability catalog: [`W04` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

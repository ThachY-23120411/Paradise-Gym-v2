# QTV-W09 — Quản lý thông báo

- **Role:** QTV / Quản lý
- **Platform:** Web only
- **Menu:** `W09`
- **Goal:** Quản lý kiến trúc phát hành thông báo in-app tự động theo sự kiện nghiệp vụ (Event-Driven Notification), cấu hình ánh xạ mẫu thông báo với sự kiện, quản lý thư viện mẫu template thông minh và tra cứu nhật ký lịch sử gửi thông báo.
- **Scope:** 
  1. **Thông báo tự động theo sự kiện:** Hệ thống (SYS) tự động kích hoạt gửi thông báo in-app khi các sự kiện nghiệp vụ phát sinh (Thanh toán thành công, Đặt lịch PT, Hủy lịch, Phân công PT, Gói tập sắp hết hạn). QTV không soạn gửi tin nhắn thủ công rải rác từng người.
  2. **Cấu hình quy tắc & Bật/Tắt:** QTV quản lý bật/tắt (`ON`/`OFF`) việc tự động gửi cho từng sự kiện và lựa chọn mẫu thông báo áp dụng. Chỉ phát khi có quy tắc `ON` và mẫu được gán đang sử dụng; không có quy tắc, quy tắc `OFF` hoặc mẫu ngừng sử dụng thì không phát. Không tự gửi bằng mẫu mặc định. Kênh cố định `IN_APP`; backend xác định người nhận theo Vai trò và Hình thức gửi do QTV cấu hình trong `QTV-W09-US01`.
  3. **Thư viện mẫu thông minh (Template Library):** Quản lý các mẫu thông báo với công cụ soạn thảo trực quan, hỗ trợ bộ nút biến động tiếng Việt theo ngữ cảnh sự kiện để chèn dữ liệu tự động.
  4. **Nhật ký kiểm toán minh bạch (Audit Trail):** Tra cứu toàn bộ lịch sử thông báo in-app đã gửi với đầy đủ thông tin thời gian, người nhận, nội dung thực tế đã render và liên kết chứng từ nguồn.

---

## Thành phần giao diện (UI Components & Layout)

Menu `W09 · Quản lý thông báo` được thiết kế theo bố cục điều hướng 3 Tab chức năng:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Tab 1: Cấu hình tự động]    [Tab 2: Mẫu thông báo]    [Tab 3: Lịch sử gửi thông báo]   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ (Nội dung thay đổi linh hoạt theo Tab được chọn bên dưới)                               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### TAB 1: CẤU HÌNH THÔNG BÁO TỰ ĐỘNG (`QTV-W09-US01`)

Quản lý danh sách các sự kiện nghiệp vụ hệ thống, gán mẫu thông báo tương ứng và Bật/Tắt tự động gửi:

- **Danh sách cấu hình sự kiện (Datagridview):**
  1. `Sự kiện (Event)`: Mã và tên sự kiện nghiệp vụ hệ thống (ví dụ: `PAYMENT_CONFIRMED - Thanh toán thành công`, `BOOKING_CREATED - Đặt lịch PT`).
  2. `Người nhận (Recipient)`: Đối tượng nhận cố định theo nghiệp vụ (ví dụ: `Hội viên sở hữu gói`, `Hội viên & PT`).
  3. `Mẫu áp dụng (Template)`: Tên mẫu thông báo in-app đang gán cho sự kiện (ví dụ: *"Thông báo thanh toán thành công"*).
  4. `Kênh gửi`: Kênh phát hành cố định: `IN_APP`.
  5. `Trạng thái tự động`: Công tắc Bật/Tắt (`ON` / `OFF`) nhanh ngay tại dòng.
  6. `Thao tác`: Nút **`[ ✎ ]`** (Mở Drawer cấu hình chi tiết sự kiện).

- **Drawer Cấu hình chi tiết sự kiện (Mở từ bên phải khi bấm `[ ✎ ]`):**
  - Tên sự kiện & Kênh gửi: Hiển thị chỉ đọc (`READONLY`).
  - Vai trò nhận (Role): `Checkbox Group` cho phép QTV tick chọn 1 hoặc nhiều vai trò (`[ ] Hội viên`, `[ ] Huấn luyện viên (PT)`, `[ ] Lễ tân`, `[ ] Quản trị viên / Quản lý`).
  - Hình thức gửi (Scope / Mode): `Checkbox Group` cho phép tick chọn phạm vi phát tin (`[ ] Người liên quan trực tiếp`, `[ ] Gửi toàn bộ (Broadcast chi nhánh)`).
  - Chọn Mẫu thông báo áp dụng: `Select Dropdown` (chọn từ danh sách Template khả dụng ở Tab 2).
  - Trạng thái kích hoạt: `Switch ON/OFF`.

---

### TAB 2: QUẢN LÝ MẪU THÔNG BÁO IN-APP (`QTV-W09-US02`)

Quản lý thư viện mẫu (Template). Hỗ trợ soạn tiêu đề và nội dung với **Bộ nút biến động tiếng Việt thông minh**:

- **Thanh Header & Bảng Danh sách Mẫu thông báo (Datagridview):**
  - **Cụm Header:** Ô tìm kiếm mẫu; Dropdown lọc theo Sự kiện áp dụng; Nút **`[ + Thêm mẫu thông báo ]`** (Màu xanh lá nổi bật).
  - **Cấu trúc cột dữ liệu:**
    1. `Mã mẫu`: Mã định danh duy nhất (`TMP-2026-001`...).
    2. `Tên mẫu`: Tên gọi quản trị (ví dụ: *Mẫu thông báo thanh toán thành công*).
    3. `Sự kiện áp dụng`: Badge sự kiện liên kết (`PAYMENT_CONFIRMED`, `BOOKING_CREATED`...).
    4. `Tiêu đề mẫu`: Tiêu đề hiển thị trên app hội viên.
    5. `Trạng thái`: Badge `Đang sử dụng` (xanh lá) / `Ngừng sử dụng` (xám).
    6. `Thao tác`: Cụm icon `[ 👁 Chi tiết ]`, `[ ✎ Sửa ]` và `[ ⊘ Ngừng dùng ]`.

- **Modal Thêm / Sửa Mẫu thông báo (Soạn thảo thông minh):**
  - `Tên mẫu thông báo`: Ô nhập tên quản trị.
  - `Sự kiện áp dụng`: Dropdown chọn Sự kiện nghiệp vụ (`TRIGGER`). Khi chọn, hệ thống tự động nạp bộ nút biến tiếng Việt tương ứng.
  - `Bộ nút biến tiếng Việt ngữ cảnh`: Lấy từ **Từ điển biến chuẩn hệ thống (System Event Schema)** gắn liền 1-1 với cấu trúc dữ liệu Payload sự kiện backend (`[Họ tên hội viên]`, `[Tên gói]`, `[Số tiền]`, `[Tên PT]`, `[Ngày tập]`, `[Khung giờ]`, `[Chi nhánh]`). Click nút nào sẽ tự chèn mã `{{key}}` vào vị trí con trỏ trong ô Nội dung.
  - `Tiêu đề thông báo`: Ô nhập tiêu đề hiển thị trên app di động.
  - `Nội dung thông báo`: Ô soạn thảo văn bản tự do, nhận văn bản và nhận mã chèn tự động khi click các nút biến.

- **Drawer Chi tiết Mẫu thông báo (`QTV-W09-US04`):**
  - Mở trượt từ cạnh phải khi click nút **`[ 👁 ]`**.
  - Hiển thị gọn gàng các thông tin thiết lập (Mã, Tên, Sự kiện, Kênh, Trạng thái, Người tạo), Tiêu đề và Toàn bộ Nội dung mẫu (các biến hiển thị dưới dạng thẻ tag tiếng Việt thân thiện).
  - Hỗ trợ nút chuyển nhanh sang chỉnh sửa `[ ✎ Sửa mẫu ]` và nút `[ ✕ Đóng ]`.

---

### TAB 3: TRA CỨU LỊCH SỬ GỬI THÔNG BÁO (`QTV-W09-US03`)

Bảng nhật ký kiểm toán (Audit Log) lưu vết toàn bộ thông báo in-app đã phát hành tự động:

- **Thanh công cụ lọc & Tìm kiếm:**
  - `Bộ lọc thời gian`: `Date / Date Range Picker` (Mặc định hôm nay `TODAY`, chọn 1 ngày hoặc khoảng ngày).
  - `Bộ lọc Sự kiện`: Dropdown chọn sự kiện phát sinh (`Tất cả`, `Thanh toán`, `Đặt lịch`, `Gói sắp hết hạn`...).
  - `Bộ lọc Trạng thái đọc`: Dropdown chọn `Tất cả`, `Đã đọc`, `Chưa đọc`.
  - `Ô tìm kiếm`: Tra cứu theo Tên người nhận, SĐT hoặc Mã tham chiếu.

- **Cấu trúc Bảng Nhật ký Lịch sử (Datagridview):**
  1. `Thời gian`: Ngày và giờ phát thông báo (`DD/MM/YYYY HH:mm`).
  2. `Sự kiện`: Badge mã sự kiện phát sinh (ví dụ: `PAYMENT_CONFIRMED`).
  3. `Người nhận`: Ô 2 dòng: Dòng trên Họ tên (`Nguyễn Văn A`), dòng dưới `Mã định danh · SĐT` (`HV00123 · 0901 234 567`).
  4. `Tiêu đề thông báo`: Tiêu đề thông báo thực tế người nhận đã xem (sau khi hệ thống thay thế biến động thành dữ liệu thật; giúp bảng gọn gàng, không bị tràn dòng).
  5. `Mã tham chiếu`: Mã chứng từ hoặc hồ sơ nguồn liên kết dạng link (ví dụ: `PT00123`, `BK00456`). Bấm vào để mở xem chi tiết giao dịch hoặc lịch tập liên quan.
  6. `Trạng thái đọc`: Badge `Đã đọc` (xanh) hoặc `Chưa đọc` (xám).
  7. `Thao tác`: Nút **`[ 👁 ]`** (Mở popup/drawer xem toàn văn nội dung chi tiết thông báo đã gửi).

---

## User Stories trong Epic

| User Story | Loại giao diện | Khối UI tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [QTV-W09-US01 — Cấu hình thông báo tự động](../../user-stories/qtv/QTV-W09-Thông báo/QTV-W09-US01-Cấu hình thông báo tự động.md) | Tab 1 (Màn hình chính) | **Danh sách cấu hình sự kiện (Datagridview) & Drawer chi tiết** | Quản lý danh mục sự kiện nghiệp vụ, Bật/Tắt tự động gửi và cấu hình 2 Checkbox (Vai trò nhận & Hình thức gửi) |
| [QTV-W09-US02 — Quản lý mẫu thông báo in-app](../../user-stories/qtv/QTV-W09-Thông báo/QTV-W09-US02-Quản lý mẫu thông báo in-app.md) | Tab 2 (Màn hình chính) | **Bảng Danh sách Mẫu & Modal Soạn thảo biến** | CRUD danh sách mẫu thông báo in-app, soạn nội dung với bộ nút biến tiếng Việt ngữ cảnh |
| [QTV-W09-US03 — Tra cứu lịch sử gửi thông báo](../../user-stories/qtv/QTV-W09-Thông báo/QTV-W09-US03-Tra cứu lịch sử gửi thông báo.md) | Tab 3 (Màn hình chính) | **Bảng Nhật ký Lịch sử gửi thông báo** | Tra cứu nhật ký thông báo in-app đã gửi theo thời gian, sự kiện, người nhận và deep-link chứng từ nguồn |
| [QTV-W09-US04 — Xem chi tiết mẫu thông báo](../../user-stories/qtv/QTV-W09-Thông báo/QTV-W09-US04-Xem chi tiết mẫu thông báo.md) | Drawer Tab 2 | **Drawer Chi tiết Mẫu thông báo** | Tra cứu chi tiết cấu hình, tiêu đề và toàn bộ nội dung mẫu thông báo in-app |

---

## Flow specification

Mỗi User Story của `QTV-W09` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/qtv/`](../../system-flow-specs/qtv/README.md).

## Traceability

- Shared capability catalog: [`W09` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

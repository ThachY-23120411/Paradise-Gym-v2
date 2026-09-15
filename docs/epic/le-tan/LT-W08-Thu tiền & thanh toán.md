# LT-W08 — Thu tiền & thanh toán

- **Role:** Lễ tân
- **Platform:** Web only
- **Menu:** `W08`
- **Goal:** Quản lý danh sách các giao dịch Payment tại chi nhánh, theo dõi trạng thái thanh toán thời gian thực (Thành công, Chờ thanh toán QR, Hết hạn), hỗ trợ kiểm tra tức thời qua API ngân hàng / duyệt thủ công tại quầy, và theo dõi thống kê dòng tiền thực thu của chi nhánh theo ngày/khoảng ngày linh hoạt.
- **Scope:** 
  1. **Thanh toán 100% 1 lần duy nhất:** Thu tiền mặt hoặc hỗ trợ quét QR chuyển khoản 100% tại quầy; hệ thống quản lý các trạng thái giao dịch thực tế gồm `Thành công`, `Chờ thanh toán` (VietQR) và `Hết hạn`.
  2. **Kích hoạt gói tự động:** Thu tiền 100% (qua Webhook, API query hoặc xác nhận thủ công) kích hoạt đơn đăng ký (`Registration`) từ `PENDING_PAYMENT` sang `ACTIVE` (hoặc `SCHEDULED`).
  3. **Xử lý tắc nghẽn Webhook tại quầy:** Cung cấp nút `[ ⟳ ]` để hệ thống chủ động gọi Query API sang ngân hàng và nút `[ ✓ ]` duyệt thủ công đối chiếu bill bằng mắt khi mạng chập chờn giúp khách vào tập ngay.
  4. **Giới hạn phạm vi chi nhánh:** Lễ tân chỉ thao tác và theo dõi dòng tiền trong phạm vi chi nhánh làm việc (`branch scope`).

---

## Thành phần giao diện (UI Components & Layout)

Menu `W08 · Thu tiền & thanh toán` được thiết kế theo bố cục Dashboard & Datagridview tích hợp tại chi nhánh:

### 1. Khối Top Bar: KPI Summary & Cụm Action Buttons

- **Khối Thống kê nhanh (Bên trái):**
  - Thẻ `Tổng thực thu`: Hiển thị tổng số tiền 100% thực thu từ các payment có trạng thái `Thành công` theo mốc thời gian lọc tại chi nhánh (mặc định hôm nay `TODAY`, ví dụ: `5.650.000 đ`).
  - Thẻ `Lượt thanh toán thành công`: Đếm số lượt giao dịch `Thành công` theo mốc thời gian lọc tại chi nhánh (mặc định hôm nay `TODAY`, ví dụ: `12 lượt`).
  - Thẻ `Đơn chờ thanh toán`: Đếm số lượng đơn `PENDING_PAYMENT` và tổng giá trị gói tại chi nhánh đang chờ khách đóng tiền tính đến hiện tại hoặc theo thời gian lọc (ví dụ: `3 đơn · 4.500.000 đ`).
- **Nút Action Button (Bên phải):**
  - Nút **`[ + Ghi nhận thanh toán ]`** (Màu xanh lá): Click mở modal Ghi nhận thanh toán 100% (`LT-W08-US02`) hỗ trợ cả Tiền mặt và Quét mã VietQR chuyển khoản tại quầy.

---

### 2. Khối Bảng Danh sách Payment (Datagridview) & Bộ lọc

Bảng dữ liệu hiển thị các giao dịch payment tại chi nhánh theo thời gian thực:
- **Thanh công cụ lọc & Tìm kiếm:**
  - **Bộ lọc thời gian thanh toán**: Control `Date / Date Range Picker` (mặc định điền sẵn Hôm nay `TODAY`). Cho phép chọn nhanh 1 ngày cụ thể hoặc một khoảng ngày (*Từ ngày — Đến ngày*). Khi thay đổi thời gian, hệ thống tự động lọc lại bảng Datagridview chi nhánh đồng thời tính lại số liệu cho cả 3 thẻ KPI phía trên.
  - **Ô tìm kiếm**: Tra cứu nhanh theo Mã phiếu, Mã đơn đăng ký, Họ tên hội viên hoặc SĐT.
  - **Bộ lọc phương thức**: Dropdown chọn `Tất cả`, `Tiền mặt`, `Chuyển khoản`.
  - **Bộ lọc trạng thái**: Dropdown chọn `Tất cả`, `Thành công`, `Chờ thanh toán`, `Hết hạn` (hỗ trợ lễ tân lọc nhanh các giao dịch chờ xử lý tại quầy).
- **Cấu trúc 10 cột dữ liệu:**
  1. `Mã phiếu`: Mã phiếu thu duy nhất (`PT00123`, `PT00122`...).
  2. `Thời gian`: Giờ:phút hoặc ngày ghi nhận giao dịch.
  3. `Hội viên`: Hiển thị 2 dòng: Dòng trên Họ tên hội viên (chữ đậm) và Dòng dưới `Mã HV · SĐT` (chữ xám nhỏ) giúp nhận diện chính xác, tránh trùng tên.
  4. `Đăng ký`: Mã đơn đăng ký gói liên kết (`DK001`...) kèm tên gói tập.
  5. `Phương thức`: `Tiền mặt` hoặc `Chuyển khoản`.
  6. `Số tiền`: Số tiền 100% thanh toán (màu xanh lá nổi bật).
  7. `Người thu`: Họ tên Lễ tân đã ghi nhận thu tiền tại quầy hoặc `Hệ thống`.
  8. `Chi nhánh`: Chi nhánh làm việc của Lễ tân.
  9. `Trạng thái`: Badge `Thành công` (xanh lá), `Chờ thanh toán` (vàng/cam), `Hết hạn` (xám).
  10. `Thao tác`:
      - Dòng `Thành công`: Nút `[👁]` (Xem/in phiếu thu tài chính 100% cho hội viên).
      - Dòng `Chờ thanh toán`: Nút `[ ⟳ ]` (Gửi API kiểm tra ngay từ ngân hàng) và nút `[ ✓ ]` (Xác nhận nhận tiền thủ công khi đã đối chiếu bill của khách).

---

### 3. Modal thao tác tài chính

#### Modal Ghi nhận thanh toán chi nhánh (Tích hợp Tiền mặt & Quét QR 100%)
- Tìm chọn đơn đăng ký đang ở trạng thái `PENDING_PAYMENT` tại chi nhánh.
- Hệ thống tự động nạp thông tin Hội viên, Gói tập và điền sẵn 100% số tiền gói cần thanh toán (cố định, không cho sửa lẻ).
- Chọn phương thức thanh toán:
  - **Tiền mặt**: Thu tiền trực tiếp tại quầy $\rightarrow$ bấm xác nhận chuyển sang `Thành công` ngay lập tức.
  - **Chuyển khoản**: Hệ thống tự động hiển thị mã **VietQR động** chứa chính xác số tiền và cú pháp chuyển khoản `{Mã ĐK} {Mã HV} PARADISE` để khách quét $\rightarrow$ bản ghi được tạo ở trạng thái `Chờ thanh toán`. Khi nhận Webhook hoặc bấm kiểm tra API thành công $\rightarrow$ chuyển sang `Thành công`.
- Kích hoạt đơn đăng ký từ `PENDING_PAYMENT` sang `ACTIVE` / `SCHEDULED`.

---

## User Stories trong Epic

| User Story | Loại giao diện | Khối UI tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [LT-W08-US01 — Xem danh sách payment](../../user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US01-Xem danh sách payment.md) | Màn hình chính | **Bảng Danh sách Payment (Datagridview)** | Xem danh sách payment chi nhánh với 3 trạng thái thực tế, bộ lọc thời gian & trạng thái, kiểm tra API ngân hàng tức thì và xem/in phiếu thu |
| [LT-W08-US02 — Tạo payment](../../user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US02-Tạo payment.md) | Modal chuyên sâu | **Modal Ghi nhận thanh toán** | Tìm đơn đăng ký PENDING_PAYMENT chi nhánh, nạp 100% số tiền gói, hỗ trợ Tiền mặt và Quét QR chuyển khoản tích hợp, kích hoạt gói |
| [LT-W08-US03 — Xem thống kê](../../user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US03-Xem thống kê.md) | Khối trên đầu trang | **Khối Thống kê nhanh (KPI Summary Cards)** | Theo dõi tức thời Tổng thực thu, Số lượt thanh toán thành công và Đơn chờ thanh toán tại chi nhánh đồng bộ theo mốc thời gian lọc |

---

## Flow specification

Mỗi User Story của `LT-W08` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/le-tan/`](../../system-flow-specs/le-tan/README.md).

## Traceability

- Shared capability catalog: [`W08` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

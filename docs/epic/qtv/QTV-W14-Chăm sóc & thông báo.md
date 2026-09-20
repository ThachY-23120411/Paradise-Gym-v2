# QTV-W14 — Chăm sóc & thông báo

- **Role:** QTV / Quản lý, Lễ tân
- **Platform:** Web only
- **Menu:** `W14`
- **Goal:** Cung cấp trung tâm chăm sóc khách hàng chủ động, theo dõi sinh nhật hội viên để chúc mừng/giữ chân khách, giám sát các gói tập sắp hết hạn (<= 4 ngày) để kịp thời liên hệ tư vấn gia hạn tiếp tục thu tiền, và quản lý các yêu cầu gia hạn / công nợ chưa thanh toán.
- **Scope:**
  1. **Danh sách Sinh nhật hôm nay:** Liệt kê các hội viên có ngày sinh trùng với ngày hôm nay, cung cấp nút thao tác nhanh `Gọi điện`, `Liên hệ` (ghi chú/tặng quà).
  2. **Danh sách Gói sắp hết hạn (<= 4 ngày):** Liệt kê hội viên có gói tập còn thời hạn <= 4 ngày, hiển thị số ngày còn lại và giá trị gói để nhân viên gọi điện mời gia hạn.
  3. **Danh sách Gia hạn gói chờ xử lý:** Các yêu cầu gia hạn gói đang chờ lễ tân/QTV xác nhận thanh toán.
  4. **Danh sách Chờ thanh toán:** Các đơn đăng ký gói chưa đóng đủ tiền.

---

## Thành phần giao diện (UI Components & Layout)

### 1. Header & Bộ lọc thời gian
- Tiêu đề trang `Chăm sóc & thông báo`, bộ lọc chi nhánh và bộ lọc trạng thái xử lý (`Tất cả`, `Chưa liên hệ`, `Đã liên hệ`, `Đã gia hạn`).

### 2. Bảng 4 Khối tác nghiệp CSKH
- **Khối 1 — Sinh nhật hôm nay:** Card danh sách hội viên: Họ tên, SĐT, Gói đang tập, ngày sinh; nút `Gọi điện` (quay số nhanh), nút `Ghi nhận liên hệ` (modal ghi chú tặng voucher/quà).
- **Khối 2 — Nhắc sắp hết hạn (<= 4 ngày):** Card danh sách hội viên: Họ tên, tên gói, ngày hết hạn (còn X ngày), giá trị gói; nút `Gọi điện` và nút `Tạo đơn gia hạn nhanh`.
- **Khối 3 — Gia hạn gói chờ xử lý:** Danh sách đơn gia hạn kèm trạng thái và số tiền cần thu.
- **Khối 4 — Đơn chờ thanh toán:** Danh sách đăng ký gói chưa hoàn tất thu tiền 100%.

---

## User Stories trong Epic

| User Story | Loại giao diện | Khối UI tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [QTV-W14-US01 — Quản lý tác nghiệp Chăm sóc khách hàng](../../user-stories/qtv/QTV-W14-Chăm%20sóc%20&%20thông%20báo/QTV-W14-US01-Quản%20lý%20tác%20nghiệp%20Chăm%20sóc%20khách%20hàng.md) | Màn hình chính | Bảng 4 khối CSKH | Xem danh sách sinh nhật, sắp hết hạn, thao tác gọi điện, ghi nhận liên hệ và tạo đơn gia hạn |

---

## Traceability
- Product Spec: [`docs/product-spec.md`](../../product-spec.md)
- Phản hồi sếp Cường: Trang 1 & Trang 2 file `ghi chú a Cường (1).pdf`.

# LT-W14 — Chăm sóc & thông báo

- **Role:** Lễ tân
- **Platform:** Web only
- **Menu:** `W14`
- **Goal:** Hỗ trợ nhân viên Lễ tân tại quầy chủ động thực hiện các tác nghiệp chăm sóc khách hàng: gọi điện chúc mừng sinh nhật, liên hệ nhắc nhở gia hạn đối với các gói tập sắp hết hạn (<= 4 ngày hoặc <= 3 buổi) và xử lý các yêu cầu gia hạn gói, nhằm tối ưu tỷ lệ giữ chân khách và gia tăng doanh số.
- **Scope:**
  1. **Danh sách Sinh nhật hôm nay:** Hiển thị danh sách hội viên sinh nhật trong ngày tại chi nhánh; nút `Gọi điện`, modal `Ghi nhận lời chúc / tặng quà`.
  2. **Danh sách Gói sắp hết hạn (<= 4 ngày hoặc <= 3 buổi):** Hiển thị hội viên có gói sắp hết hạn; nút `Gọi điện`, nút `Tạo đăng ký gia hạn nhanh`.
  3. **Yêu cầu gia hạn & Chờ thanh toán:** Tra cứu và thu tiền hoàn tất các đơn đang mở.

---

- Chỉ báo cận hạn và danh sách dùng chung is_expiring/display_status từ API: theo ngày <= 4 hoặc theo buổi <= 3, Combo OR. Nhóm đã hết hạn trong 14 ngày qua không đổi; không dùng tên trường legacy để suy ra chỉ lọc theo ngày.

## User Stories trong Epic

| User Story | Loại giao diện | Khối UI tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [LT-W14-US01 — Tác nghiệp Chăm sóc khách hàng tại quầy](../../user-stories/le-tan/LT-W14-Chăm%20sóc%20&%20thông%20báo/LT-W14-US01-Tác%20nghiệp%20Chăm%20sóc%20khách%20hàng%20tại%20quầy.md) | Màn hình chính | 4 khối CSKH | Xem danh sách sinh nhật, sắp hết hạn <= 4 ngày hoặc <= 3 buổi, gọi điện và tạo đơn gia hạn |

---

## Traceability
- Product Spec: [`docs/product-spec.md`](../../product-spec.md) (Mục 4.8)
- Phản hồi sếp Cường: Trang 1 & 2 file `ghi chú a Cường (1).pdf`.

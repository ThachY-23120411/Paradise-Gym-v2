# BÁO CÁO BÀN GIAO: TÍNH NĂNG ÁP DỤNG VOUCHER & MÃ GIẢM GIÁ TRÊN MOBILE HỘI VIÊN (HV03-US03)

**Dự án:** Paradise Gym  
**Phân hệ:** Mobile Hội viên (`frontend/mobile/member/`) & Backend Core (`backend/src/modules/core/`)  
**Tab thực thi:** Tab 2 (`anti-2-HV`)  
**Ngày hoàn thiện:** 20/09/2026  
**Trạng thái kiểm thử:** PASS 464/464 HTTP checks trên PostgreSQL độc lập.

---

## 1. Yêu Cầu & Bối Cảnh Nghiệp Vụ
- Người dùng phản ánh giao diện thanh toán gói tập trên Mobile Hội viên (modal VietQR) không có chỗ nhập hay chọn mã giảm giá / voucher khuyến mãi.
- Cần bổ sung đầy đủ luồng áp dụng voucher ở cả hai vị trí:
  1. Hộp thoại **Mua gói** (`buyPackage`) trước khi khởi tạo đơn đăng ký.
  2. Trực tiếp trên modal **Thanh toán VietQR** (`openPayment`) đối với các đơn đang chờ thanh toán (`PENDING_PAYMENT`).
- Khi áp dụng mã giảm giá, số tiền phải thanh toán được cập nhật ngay lập tức, hiển thị giá gốc gạch ngang, badge giảm giá, và tự động tạo lại mã VietQR tương ứng chính xác số tiền thực thu.

---

## 2. Giải Pháp Triển Khai

### 2.1. Backend (`backend/src/modules/core/commerce.js`)
- Nâng cấp hàm `invoice(req, db)` (`POST /payments/create-invoice`):
  - Hỗ trợ tham số `discount_code` cho cả đơn mới và đơn thanh toán đang chờ (`existing` pending payment).
  - Tự động kiểm tra tính hợp lệ của mã giảm giá (`discounts` table): trạng thái kích hoạt, thời hạn sử dụng, giới hạn số lượt, chi nhánh áp dụng và giá trị đơn hàng tối thiểu.
  - Tự động quản lý số lượt sử dụng (`used_count`): tăng lượt khi áp dụng mã mới, hoàn trả lượt cũ khi đổi mã hoặc hủy mã.
  - Hỗ trợ cờ `clear_discount: true`: cho phép hội viên chủ động bỏ voucher và khôi phục giá gốc.
  - Đảm bảo trigger PostgreSQL `validate_full_payment()` luôn thỏa mãn với ràng buộc toàn vẹn `amount + discount_amount = price_snapshot`.
  - Hàm `response(p)` trả về kèm `discount_code` và sinh mã VietQR với số tiền thực thu đã giảm trừ.

### 2.2. Frontend Mobile Hội viên (`frontend/mobile/member/js/packages-notifications.js`)
- Triển khai hàm `openAvailableVouchersModal(orderAmount, branchId, onSelect)`:
  - Gọi `GET /discounts` để lấy danh sách voucher đang hiệu lực.
  - Hiển thị danh sách thẻ voucher trực quan: mã, tiêu đề, mức giảm (% hoặc số tiền cố định), điều kiện đơn tối thiểu, hạn sử dụng và nút `[ Dùng mã ]`.
- Nâng cấp modal `buyPackage(p)`:
  - Tích hợp khối voucher gồm ô nhập mã, nút `[ Áp dụng ]` (gọi `POST /discounts/validate`) và nút `[ Chọn voucher ]`.
  - Hiển thị song song giá gốc gạch ngang, số tiền giảm và giá thực thu.
  - Khi bấm `[ Tiếp tục thanh toán ]`, truyền mã voucher sang bước thanh toán VietQR.
- Nâng cấp modal `openPayment(reg, initialDiscountCode)`:
  - Khởi tạo hoặc cập nhật hóa đơn thanh toán kèm voucher.
  - Hiển thị khối voucher trên modal VietQR: nếu chưa có voucher sẽ hiển thị ô nhập mã và nút chọn voucher; nếu đã có voucher sẽ hiển thị thông tin mã và nút `[ Bỏ mã ]`.
  - Khi áp dụng, đổi mã hoặc bỏ mã: giao diện tự động render lại ảnh VietQR, số tiền thực thu, thông tin chuyển khoản và các nút sao chép mà không cần thoát modal.

---

## 3. Kết Quả Kiểm Thử Tự Động (E2E & Integration)
- Bổ sung bộ kiểm thử tự động tại `backend/tests/mobile-refactor.cases.js`:
  - Tạo voucher kiểm thử với mức giảm 10% (tối đa 100.000đ).
  - Xác thực qua `POST /discounts/validate`.
  - Khởi tạo invoice ban đầu với giá gốc 1.000.000đ.
  - Áp dụng voucher vào invoice đang chờ thanh toán $\rightarrow$ số tiền giảm còn 900.000đ, VietQR cập nhật 900.000đ.
  - Thử cờ `clear_discount: true` $\rightarrow$ số tiền khôi phục về 1.000.000đ.
  - Áp dụng lại voucher và xác nhận thanh toán thành công qua `POST /payments/:id/confirm` $\rightarrow$ trạng thái `COMPLETED`, vượt qua trigger kiểm tra snapshot 100%.
- Kết quả chạy test toàn hệ thống: **PASS 464/464 HTTP checks** (không có lỗi phát sinh).

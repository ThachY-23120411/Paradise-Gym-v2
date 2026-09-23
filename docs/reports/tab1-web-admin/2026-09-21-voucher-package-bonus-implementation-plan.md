# Kế Hoạch Triển Khai: Ràng Buộc Gói Tập & Hình Thức Khuyến Mãi Tặng Buổi/Ngày Cho Voucher (Tab 1 & Tab 4)

## 1. Mục Tiêu
- Bổ sung trường ràng buộc **Gói tập áp dụng** (`applicable_package_id`, khóa ngoại trỏ bảng `packages`, đơn chọn).
- Mở rộng phạm vi chọn gói: theo chi nhánh hiện tại của QTV hoặc toàn bộ hệ thống nếu là QTV toàn chuỗi (`ALL`).
- Bổ sung hình thức khuyến mãi tặng thời hạn / buổi tập (`discount_type` mở rộng: `SESSION`, `DAY`, `BOTH`):
  * **TH1 (Gói theo buổi)**: Bổ sung tùy chọn `SESSION` (Buổi) ➔ Nhập `bonus_pt_sessions`.
  * **TH2 (Gói theo ngày)**: Bổ sung tùy chọn `DAY` (Ngày) ➔ Nhập `bonus_days`.
  * **TH3 (Gói Combo)**: Tự động chọn và khóa `readOnly: true` tùy chọn `BOTH` (Cả 2) ➔ Nhập cả `bonus_days` và `bonus_pt_sessions`.
  * **TH0 (Tất cả gói tập)**: Giữ nguyên `%` và `VNĐ`.
- Tự động cộng dồn ngày tập (`end_date`, `duration_days_snapshot`) và buổi PT (`remaining_pt_sessions`, `total_pt_sessions_snapshot`) khi kích hoạt đơn hàng.

## 2. Các Thành Phần Thay Đổi
1. **Database PostgreSQL (Migration 019)**:
   - `019_voucher_package_and_bonus_entitlements.sql`: Thêm `applicable_package_id`, `bonus_pt_sessions`, `bonus_days`, default `discount_value = 0`, cập nhật CHECK constraint `discounts_discount_type_check` cho phép `('PERCENT', 'FIXED_AMOUNT', 'SESSION', 'DAY', 'BOTH')`.
   - Cập nhật tài liệu kiến trúc `docs/database/erd.md`.
2. **Backend REST APIs**:
   - `backend/src/modules/core/discounts.js`: Bổ sung JOIN `packages`, hỗ trợ `applicable_package_id`, `bonus_pt_sessions`, `bonus_days` trong `GET`, `POST`, `PUT`, và kiểm tra tương thích gói trong `POST /discounts/validate`.
   - `backend/src/modules/core/commerce.js`: Kiểm tra `applicable_package_id` khi tạo invoice, tự động cộng thời hạn và buổi tập khi xác nhận thanh toán `POST /payments/:id/confirm` và `/simulate-transfer`.
3. **Frontend Web Admin**:
   - `frontend/web/js/modules/discounts.js`: Thêm cột "Gói áp dụng" và hiển thị tóm tắt mức khuyến mãi tặng buổi/ngày trên DataGrid; modal tạo voucher hỗ trợ `applicable_package_id` (dxSelectBox) kích hoạt cơ chế Trigger/Dynamic/Conditional cho TH0, TH1, TH2, TH3.
4. **User Story & Tài Liệu**:
   - Cập nhật `docs/user-stories/qtv/QTV-W17-Khuyến mãi & giảm giá/QTV-W17-US01-Quản lý chương trình khuyến mãi và mã giảm giá.md`.

# Báo Cáo Bàn Giao: Ràng Buộc Gói Tập & Khuyến Mãi Tặng Buổi/Ngày Cho Voucher (Tab 1 & Tab 4)

**Ngày thực hiện:** 2026-09-21  
**Phân hệ phụ trách:** Tab 1 (`anti-1-QTV-LT` - Web Admin Lead) & Tab 4 (`anti-4-Core-BE-DB` - Backend & DB Lead)  
**Trạng thái kiểm thử:** 100% Đạt (Passed)

---

## 1. Tóm Tắt Nghiệp Vụ & Thay Đổi

Hệ thống đã nâng cấp toàn diện phân hệ Voucher & Khuyến mãi (W17) theo yêu cầu mới:
1. **Ràng buộc gói tập áp dụng (`applicable_package_id`)**:
   - Trường đơn chọn (`dxSelectBox`), cho phép chọn áp dụng voucher cho một gói tập cụ thể hoặc `Tất cả gói tập (Không giới hạn)`.
   - Danh sách gói tập được lọc theo chi nhánh hoạt động của QTV; nếu là QTV toàn hệ thống (`ALL`), hiển thị tất cả các gói tập của toàn bộ chi nhánh.
2. **Cơ chế Trigger & Dynamic/Conditional cho 4 trường hợp (TH0, TH1, TH2, TH3)**:
   - **TH1 (Gói theo buổi - `PT_SESSION` / `GYM_SESSION`)**: Hình thức khuyến mãi có thêm tùy chọn **"Tặng số buổi tập (Buổi)"** (`SESSION`). Khi chọn, hiện trường **"Số buổi khuyến mãi"** (`bonus_pt_sessions`, `dxNumberBox`, min: 1). Ẩn các trường số tiền giảm.
   - **TH2 (Gói theo ngày - `GYM_TIME`)**: Hình thức khuyến mãi có thêm tùy chọn **"Tặng thời gian tập (Ngày)"** (`DAY`). Khi chọn, hiện trường **"Số ngày khuyến mãi"** (`bonus_days`, `dxNumberBox`, min: 1). Ẩn các trường số tiền giảm.
   - **TH3 (Gói Combo - `COMBO`)**: Hình thức khuyến mãi cung cấp 3 tùy chọn: **"Giảm theo tỷ lệ phần trăm (%)"** (`PERCENT`), **"Giảm số tiền cố định (VNĐ)"** (`FIXED_AMOUNT`), và **"Khuyến mãi theo buổi và ngày"** (`BOTH`). Không khóa cố định (`readOnly: false`), cho phép QTV tự do lựa chọn. Khi chọn "Khuyến mãi theo buổi và ngày", hiển thị đồng thời 2 trường: **"Số ngày gym khuyến mãi"** và **"Số buổi PT khuyến mãi"**; khi chọn `%` hoặc `VNĐ`, ẩn 2 trường tặng kèm và hiển thị trường giá trị giảm tương ứng.
   - **TH0 (Tất cả gói tập)**: Giữ nguyên tùy chọn `%` (Phần trăm) và `VNĐ` (Số tiền cố định), ẩn các trường tặng buổi/ngày.
3. **Hiển thị DataGrid W17**:
   - Bổ sung cột **"Gói áp dụng"** hiển thị tên gói tập cụ thể màu xanh thương hiệu hoặc text `Tất cả gói tập`.
   - Cột **"Mức giảm / Khuyến mãi"** tự động hiển thị linh hoạt: `Giảm X%`, `Giảm X.XXX đ`, `Tặng X buổi`, `Tặng X ngày`, hoặc `Tặng X ngày + Y buổi PT`.
4. **Backend REST API & Database**:
   - Migration 019: Thêm các cột `applicable_package_id`, `bonus_pt_sessions`, `bonus_days`, nới lỏng CHECK constraint `discounts_discount_type_check`.
   - Endpoint `POST /discounts/validate` và tạo invoice `POST /payments/create-invoice`: Tự động kiểm tra tính tương thích giữa gói tập đăng ký và voucher áp dụng; chặn kịp thời với mã lỗi `PACKAGE_MISMATCH` / `DISCOUNT_PACKAGE_MISMATCH` nếu áp sai gói.
   - Endpoint thanh toán `POST /payments/:id/confirm` và `simulate-transfer`: Tự động cộng dồn số ngày vào `end_date` và `duration_days_snapshot`, cộng dồn số buổi PT vào `remaining_pt_sessions` và `total_pt_sessions_snapshot` của hợp đồng đăng ký.

---

## 2. Kết Quả Kiểm Thử Thực Tế (E2E Test)

Kịch bản kiểm thử tự động toàn trình `tests/scratch/verify_voucher_package_rules.cjs` đã thực thi thành công 100%:

### 2.1. Kiểm thử REST API Backend:
- Khởi tạo thành công voucher TH1 (`TEST_PT_6737`): Gói PT 20 buổi, `discount_type: 'SESSION'`, `bonus_pt_sessions: 5`.
- Khởi tạo thành công voucher TH2 (`TEST_GYM_6737`): Gói Gym 1 Tháng, `discount_type: 'DAY'`, `bonus_days: 15`.
- Khởi tạo thành công voucher TH3 (`TEST_CMB_6737`): Gói Combo VIP, `discount_type: 'BOTH'`, `bonus_days: 30`, `bonus_pt_sessions: 10`.
- Kiểm tra `POST /discounts/validate`:
  * Áp voucher TH1 đúng gói PT ➔ **Thành công 200 OK** (trả về `bonus_pt_sessions = 5`, `discount_amount = 0`).
  * Áp voucher TH1 vào gói Gym ➔ **Từ chối chính xác 400 Bad Request** với mã lỗi `PACKAGE_MISMATCH` và thông báo `"Mã khuyến mãi này chỉ áp dụng cho gói tập: Gói PT 20 buổi theo nhóm"`.

### 2.2. Kiểm thử Giao Diện Web Admin (Puppeteer):
- Mở danh sách DataGrid W17, xác nhận các cột dữ liệu mới.
- Mở modal tạo voucher, chọn gói PT ➔ Tùy chọn "Tặng số buổi tập (Buổi)" xuất hiện, điền số buổi = 5.
- Chọn gói Gym ➔ Tùy chọn "Tặng thời gian tập (Ngày)" xuất hiện, điền số ngày = 15.
- Chọn gói Combo ➔ Cung cấp đủ 3 tùy chọn (`%`, `VNĐ`, `Khuyến mãi theo buổi và ngày`), `readOnly = false`.
  * Chọn `%`: Hiển thị "Giá trị giảm (%)" và "Giảm tối đa (VNĐ)", ẩn 2 trường tặng ngày/buổi.
  * Chọn `Khuyến mãi theo buổi và ngày`: Hiển thị 2 trường "Số ngày gym khuyến mãi" và "Số buổi PT khuyến mãi", ẩn các trường số tiền giảm.
  * Điền 30 ngày gym và 10 buổi PT, bấm [Tạo mã voucher] ➔ Lưu thành công lên database và hiển thị chính xác trên DataGrid W17 (`Tặng 30 ngày + 10 buổi PT`).

---

## 3. Ảnh Chụp Bằng Chứng Giao Diện

| Nội dung kiểm thử | Ảnh bằng chứng |
| :--- | :--- |
| **Bảng danh sách DataGrid W17** với các cột mới (Gói áp dụng, Mức giảm / Khuyến mãi) | `verify_voucher_grid_columns.png` |
| **TH1 - Gói theo buổi**: Chọn gói PT ➔ Hình thức "Buổi", trường "Số buổi khuyến mãi" | `verify_voucher_th1_session.png` |
| **TH2 - Gói theo ngày**: Chọn gói Gym ➔ Hình thức "Ngày", trường "Số ngày khuyến mãi" | `verify_voucher_th2_days.png` |
| **TH3 - Gói Combo**: Chọn hình thức "Khuyến mãi theo buổi và ngày" (không khóa), hiển thị 2 trường "Số ngày gym khuyến mãi" và "Số buổi PT khuyến mãi" | `verify_voucher_th3_combo.png` |

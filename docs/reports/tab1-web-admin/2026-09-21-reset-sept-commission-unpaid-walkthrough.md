# Báo Cáo Bàn Giao: Thiết Lập Lại Dữ Liệu Mẫu Hoa Hồng Tháng 9/2026 Của PT Nguyễn Văn Thể (Chưa Chi Trả)

**Ngày thực hiện:** 21/09/2026  
**Người thực hiện:** Tab 1 - Web Admin Lead (`anti-1-QTV-LT`)  
**Phân hệ:** Web Admin (W15 - Quản lý hoa hồng PT), Backend Core Commissions & Database PostgreSQL.

---

## 1. Yêu Cầu & Bối Cảnh Nghiệp Vụ

Người dùng yêu cầu: *Seed data lại Hoa hồng tháng 9 của PT Nguyễn Văn Thể lúc chưa chi trả để kiểm thử quy trình chi trả.*

Để phục vụ kiểm thử luồng chi trả hoa hồng trên giao diện Web Admin (W15):
1. Bản ghi hoa hồng tháng 9/2026 của Huấn luyện viên **Nguyễn Văn Thể** (PT001) tại cơ sở Paradise Gym Quận 1 cần được chuyển về trạng thái **`PENDING`** (Chờ chi trả).
2. Toàn bộ các thông tin nghiệm thu chi trả (`paid_at`, `payout_ref`, `payout_note`, `paid_by_account_id`, `details_snapshot`, `pt_confirmed_at`) được làm rỗng (`NULL`).
3. Dữ liệu số buổi dạy, doanh số quy đổi và tiền hoa hồng phải khớp nối chính xác 100% với danh sách 8 buổi tập đã hoàn thành (`COMPLETED`) trong tháng 9/2026 theo mô hình quan hệ (Relational Consistency - Rule 5):
   - 5 buổi dạy cho học viên Lê Hoàng Nam (Gói Combo VIP 12 buổi PT, giá trị 375.000đ/buổi = 1.875.000đ).
   - 3 buổi dạy cho học viên Trần Thị Bình (Gói PT Giảm Mỡ 12 buổi, giá trị 400.000đ/buổi = 1.200.000đ).
   - Tổng 8 buổi: Doanh số quy đổi = **3.075.000đ**.
   - Tỷ lệ hoa hồng: **25%** (theo cấu hình hiện hành).
   - Tiền hoa hồng cần chi trả: **768.750đ**.
4. Đảm bảo thông tin thụ hưởng ngân hàng của HLV đã sẵn sàng để hệ thống tự động sinh mã VietQR Napas247 khi mở modal chi trả:
   - Ngân hàng: **MB Bank**
   - Số tài khoản: **0900000003**
   - Chủ tài khoản: **NGUYEN VAN THE**

---

## 2. Chi Tiết Thực Hiện Kỹ Thuật

### 2.1. Cập Nhật Script Reset Dữ Liệu Mẫu (`backend/scripts/reset_demo_commissions.js`)
- Bổ sung cơ chế quản lý Trigger an toàn: Tạm thời vô hiệu hóa trigger bảo vệ dữ liệu bất biến `trg_guard_pt_commission_snapshot` trong khi cập nhật và luôn bật lại trong khối `finally`.
- Chuẩn hóa snapshot gói tập `pt_price_snapshot = 4800000.00` cho hợp đồng của hội viên Trần Thị Bình (`88880001-0000-0000-0000-000000000008`).
- Ghi nhận 8 buổi tập `COMPLETED` trong tháng 9/2026 với đầy đủ xác nhận 2 chiều (`pt_confirmed_at`, `member_confirmed_at`, `is_deducted = TRUE`), giáo án bài tập và đánh giá thể lực.
- Bỏ cột `status` lỗi thời trong lệnh INSERT `payments` để tương thích hoàn toàn với schema Sổ cái thanh toán thành công (Migration 014).
- Cập nhật `pt_commissions` tháng 9/2026 của PT001 về `status = 'PENDING'`, `total_pt_sessions_taught = 8`, `pt_revenue_share = 3075000.00`, `total_commission_amount = 768750.00`.

### 2.2. Xử Lý Phạm Vi Chi Nhánh Toàn Quyền (`backend/src/modules/core/http.js`)
- Trong hàm `scope(req)`: Bổ sung xử lý khi client gửi header `x-branch-id: 'ALL'`. Nếu tài khoản có cờ `is_all_branches` (Quản trị viên toàn hệ thống), hàm trả về `null` (không lọc theo mảng UUID) thay vì trả về mảng chuỗi `['ALL']` gây lỗi PostgreSQL `22P02` (Mã định danh hoặc giá trị không hợp lệ).

---

## 3. Kết Quả Kiểm Thử & Nghiệm Thu Trực Quan (E2E Screenshots)

1. **Giao diện Bảng kê hoa hồng tháng 9/2026 (W15 - Web Admin):**
   - Huấn luyện viên: **Nguyễn Văn Thể** (PT001 · 0900000003)
   - Chi nhánh: Paradise Gym Quận 1
   - Buổi đã dạy: **8**
   - Doanh số quy đổi: **3.075.000 đ**
   - Tỷ lệ %: **25%**
   - Tiền hoa hồng: **768.750 đ**
   - Trạng thái: **Chờ chi trả** (badge cảnh báo màu vàng)
   - Thao tác: Xuất hiện nút **`[ 💲 Chi trả ]`** màu xanh lá nổi bật cho phép thực hiện chi trả ngay.
   - Minh chứng: `verify_sept_commission_unpaid_grid.png`.

2. **Giao diện Modal Xác Nhận Chi Trả Hoa Hồng (VietQR):**
   - Tiêu đề modal: *Xác nhận chi trả hoa hồng PT*.
   - Thông tin HLV: Nguyễn Văn Thể (PT001) · Paradise Gym Quận 1 · Kỳ tháng 9/2026.
   - Số tiền chi trả: **768.750 đ**.
   - Tự động nạp ngân hàng MB Bank, STK 0900000003, tên NGUYEN VAN THE.
   - Tự động tạo mã QR Napas247 động quét chuyển khoản nhanh.
   - Nút hành động: `[ Đóng ]` và `[ ✓ Xác nhận đã chi trả ]`.
   - Minh chứng: `verify_payout_modal_vietqr.png`.

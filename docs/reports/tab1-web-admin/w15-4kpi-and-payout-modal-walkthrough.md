# Báo Cáo Bàn Giao: Nâng Cấp Bộ 4 Thẻ KPI Dynamic & Modal Xác Nhận Chi Trả Hoa Hồng PT (W15 - QTV)

**Ngày thực hiện:** 20/09/2026  
**Vai trò phụ trách:** Tab 1 — `anti-1-QTV-LT` (Web Admin Lead)  
**Phân hệ:** Quản lý hoa hồng Huấn luyện viên PT (W15 - Quản Trị Viên)  
**Trạng thái kiểm thử:** PASS 427/427 HTTP checks (100% test case trên PostgreSQL độc lập)  

---

## 1. Tóm Tắt Nhiệm Vụ & Bối Cảnh

Xuất phát từ phản hồi và yêu cầu trực tiếp từ Người Dùng:
1. *"Nâng cấp thành bộ 4 thẻ KPI (Số buổi dạy · Doanh số dạy PT · Tổng tiền hoa hồng · Tiến độ chi trả) với tính năng dynamic theo từng PT?"*
2. *"Xây dựng Modal Xác Nhận Chi Trả Hoa Hồng chuyên nghiệp (chọn Chuyển khoản / Tiền mặt, mã giao dịch, ghi chú, chặn chi trả khi hoa hồng = 0đ)?"*
3. *"PT nhận tiền kiểu gì nhỉ?":* Hệ thống cần phương thức chi trả rõ ràng, hỗ trợ quét mã VietQR tự động, quản lý thông tin ngân hàng của HLV, lưu vết chứng từ kế toán và gửi thông báo in-app cho HLV trên Mobile.

---

## 2. Chi Tiết Các Cải Tiến Đã Thực Hiện

### 2.1. Bộ 4 Thẻ KPI Dynamic (`W().metrics`)
- **4 Thẻ số liệu toàn diện:**
  1. `Tổng số buổi dạy`: Tổng số ca tập `COMPLETED` trong tháng đã qua xác nhận kép.
  2. `Tổng doanh số dạy PT`: Doanh thu gói PT tương ứng quy đổi từ các ca dạy hoàn thành (`pt_revenue_share`).
  3. `Tổng tiền hoa hồng tháng`: Chi phí hoa hồng thực tế phát sinh cần thanh toán cho đội ngũ HLV.
  4. `Tiến độ chi trả`: Thống kê số tiền và tỷ lệ phần trăm đã giải ngân (`PAID`) so với tổng hoa hồng tháng.
- **Tương tác dynamic thông minh:**
  - Click vào dòng của một HLV trong bảng kê: Cả 4 thẻ KPI lập tức tính toán và hiển thị riêng cho HLV đó kèm chỉ dẫn và tỷ lệ % hoa hồng cá nhân.
  - Click lại vào dòng HLV (bỏ chọn): 4 thẻ KPI lập tức hoàn tác về số liệu tổng hợp của toàn chi nhánh.

### 2.2. Chặn Chi Trả Hoa Hồng 0đ (Zero-Commission Guard)
- **Giao diện người dùng:** Nút `[ Chi trả ]` chỉ hiển thị khi `status === 'APPROVED'` VÀ `total_commission_amount > 0`. Đối với các HLV có 0 buổi dạy hoặc 0đ hoa hồng, nút chi trả tự động bị ẩn.
- **Backend API:** Endpoint `PUT /commissions/:id/status` kiểm tra nếu yêu cầu chuyển sang `PAID` mà `total_commission_amount <= 0` sẽ lập tức từ chối với HTTP 400 `CANNOT_PAY_ZERO_COMMISSION`.

### 2.3. Modal Xác Nhận Chi Trả Hoa Hồng (Payout Modal)
- **Thông tin minh bạch:** Hiển thị Họ tên, Mã HLV, SĐT, Chi nhánh, Số buổi hoàn thành, Doanh số quy đổi và Khối số tiền hoa hồng thực lĩnh được thiết kế nổi bật.
- **Phương thức thanh toán:**
  - `Chuyển khoản (VietQR)`: Cho phép chọn/nhập tên ngân hàng, số tài khoản và tên chủ tài khoản thụ hưởng của HLV.
  - `Tiền mặt`: Khi chọn tiền mặt, các trường ngân hàng và mã VietQR tự động ẩn đi.
- **Tự động sinh mã VietQR Napas247:**
  - Sinh URL mã VietQR chuẩn Compact2 chứa đúng số tiền hoa hồng, số tài khoản thụ hưởng và nội dung chuyển khoản (`HOA HONG PT T[month]/[year] [pt_code]`).
  - Kế toán / QTV chỉ cần mở app ngân hàng quét mã là thực hiện chuyển khoản chuẩn xác 100%, không lo sai sót số tiền hay số tài khoản.
- **Chứng từ kế toán:** Nhập mã giao dịch ngân hàng / số phiếu chi, ngày chi trả (mặc định hôm nay), và ghi chú chi trả.
- **Lưu vết và Cập nhật tự động:**
  - Lưu `payout_method`, `payout_ref`, `payout_note`, `paid_by_account_id`, và `paid_at = NOW()`.
  - Tự động lưu thông tin tài khoản ngân hàng mới vào `pt_profiles` của HLV để các kỳ sau tự động prefill.
  - Tự động sinh thông báo in-app `COMMISSION_PAID` gửi về tài khoản Mobile của HLV.

### 2.4. Khối Chứng Từ Chi Trả Trong Popup Chi Tiết
- Khi QTV bấm `[ Chi tiết ]` trên một bản kê đã chi trả (`status === 'PAID'`), modal hiển thị thêm khối **Chứng từ chi trả**:
  - Thời điểm hoàn tất chi trả
  - Phương thức chi trả (Chuyển khoản / Tiền mặt)
  - Mã giao dịch ngân hàng / Số phiếu chi
  - Người thực hiện chi trả (Họ tên QTV)
  - Ghi chú đối soát

---

## 3. Cơ Sở Dữ Liệu & Kiểm Thử

### 3.1. Migration 009 (`009_pt_commission_payout_details.sql`)
- Bổ sung vào bảng `pt_commissions`:
  * `payout_method VARCHAR(30) DEFAULT 'BANK_TRANSFER'`
  * `payout_ref VARCHAR(100)`
  * `payout_note TEXT`
  * `paid_by_account_id UUID REFERENCES accounts(id)`
- Bổ sung vào bảng `pt_profiles`:
  * `bank_name VARCHAR(100)`
  * `bank_account_no VARCHAR(50)`
  * `bank_account_name VARCHAR(150)`
- Seed sẵn số tài khoản mẫu cho PT Nguyễn Văn Thể (MB Bank) và PT Phạm Quốc Bảo (Vietcombank).

### 3.2. Kiểm Thử Backend Tích Hợp (`npm test`)
- Bổ sung Step 11 trong `backend/tests/commission-configs.cases.js`:
  1. Kiểm thử từ chối chi trả hoa hồng 0đ (HTTP 400).
  2. Kiểm thử chi trả hoa hồng hợp lệ (> 0đ) qua `BANK_TRANSFER`, lưu mã giao dịch `FT26092026123` và ghi chú.
  3. Kiểm tra thông tin ngân hàng được tự động đồng bộ vào `pt_profiles`.
  4. Kiểm tra endpoint `GET /commissions/:id/details` trả về đầy đủ metadata chứng từ chi trả và người chi trả.
  5. Kiểm tra danh sách tháng `GET /commissions/monthly` trả về đúng trạng thái `PAID`.
  6. Kiểm tra thông báo in-app `COMMISSION_PAID` được gửi đến tài khoản của HLV.
- **Kết quả kiểm thử:**
  `PASS 427 HTTP checks against isolated PostgreSQL database; configured DB untouched` (100% pass).

---

## 4. Danh Mục Tài Liệu Đồng Bộ
- **ERD:** Cập nhật `docs/database/erd.md` (bổ sung các trường vào sơ đồ Mermaid, Data Dictionary và phụ lục Migration 009).
- **User Story:** Cập nhật `docs/user-stories/qtv/QTV-W15-Quản lý hoa hồng PT/QTV-W15-US02-Tính và duyệt bảng kê hoa hồng PT theo tháng.md` (đặc tả 4 KPI, Payout Modal và sơ đồ Swimlane Activity Diagram tuân thủ nghiêm ngặt `Action 1 IN + 1 OUT`).
- **Hộp thư nội bộ:** Đồng bộ thông tin vào `brain-anti1/notes.md`.

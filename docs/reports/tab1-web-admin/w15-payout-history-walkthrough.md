# BÁO CÁO HOÀN THIỆN: PHÂN HỆ LỊCH SỬ CHI TRẢ HOA HỒNG PT (TAB 2 - QTV W15)

**Dự án:** Paradise Gym  
**Phân hệ:** Quản Trị Viên (Web QTV W15 - Quản lý hoa hồng PT)  
**Tab thực thi:** Tab 1 (`anti-1-QTV-LT`)  
**Ngày hoàn thiện:** 20/09/2026  
**Căn cứ thiết kế:** User Story `QTV-W15-US03` & Skill `qtv-ui-design-system`.

---

## 1. Mục Tiêu Nghiệp Vụ
- Bổ sung chuyên mục **Lịch sử chi trả** (`payout-history`) dành riêng cho Quản trị viên và Kế toán phòng gym nhằm:
  1. Theo dõi, tra cứu toàn bộ các khoản hoa hồng đã được thanh toán cho HLV theo thời gian thực.
  2. Hỗ trợ lọc đa chiều: theo Huấn luyện viên, theo Chi nhánh, theo Hình thức (Chuyển khoản VietQR / Tiền mặt tại quầy), theo Khoảng ngày chi trả.
  3. Cung cấp bộ 4 thẻ KPI thống kê tổng tiền và hình thức giải ngân: Tổng lượt chi, Tổng tiền giải ngân, Chi qua VietQR, Chi tiền mặt.
  4. Hỗ trợ tra cứu mã giao dịch ngân hàng (Mã FT) / Số phiếu chi tiền mặt để đối soát sổ sách.
  5. Xuất báo cáo chứng từ ra file CSV/Excel phục vụ lưu trữ kế toán.

---

## 2. Các Thành Phần Kỹ Thuật Đã Triển Khai

### 2.1. Backend API (`backend/src/modules/core/commissions.js`)
- Bổ sung endpoint `GET /api/v1/commissions/payout-history`:
  - Lọc các bản ghi `pt_commissions` có `status = 'PAID'`.
  - Hỗ trợ các query parameters: `pt_id`, `payout_method`, `from_date`, `to_date`, `branch_id`, `search`.
  - JOIN với `pt_profiles`, `branches`, `accounts` (người duyệt chi).
  - Sắp xếp: `paid_at DESC, updated_at DESC`.

### 2.2. Giao Diện Web Admin (`frontend/web/js/modules/commissions.js`)
- Nâng cấp hệ thống Tabs của màn hình W15 thành 3 tab chuẩn phong cách **Administrative Forest Clean** (không icon emoji):
  - **Tab 1: Bảng kê hoa hồng tháng** (`monthly`)
  - **Tab 2: Lịch sử chi trả** (`history`)
  - **Tab 3: Cấu hình tỷ lệ hoa hồng** (`configs`)
- Triển khai chức năng `renderHistoryTab`:
  - **Thanh tìm kiếm & lọc:** Ô tìm kiếm debounce, SelectBox hình thức chi trả, DateBox Từ ngày - Đến ngày.
  - **Bộ 4 thẻ KPI tóm tắt:** Tổng lượt đã chi trả, Tổng tiền đã giải ngân, Chi qua VietQR, Chi tiền mặt tại quầy.
  - **Lưới dữ liệu DevExtreme DataGrid:** Phân trang 15 dòng, hiển thị chi tiết từng giao dịch kèm nút `[Chi tiết]`.
  - **Chức năng xuất file:** Xuất danh sách ra định dạng CSV/Excel mã hóa UTF-8 với 12 cột thông tin chứng từ.
  - **Chuẩn hóa khối chứng từ:** Bỏ hoàn toàn các icon emoji và viền nét đứt trong popup xem chi tiết buổi dạy.

---

## 3. Kết Quả Kiểm Thử
- **Cú pháp:** `node -c frontend/web/js/modules/commissions.js` $\rightarrow$ 0 lỗi syntax.
- **Backend Test:** PASS 427/427 HTTP integration test cases trên PostgreSQL độc lập.
- **Dữ liệu thực tế:** Đã có các bản ghi lịch sử thực tế (Tháng 7 qua Tiền mặt, Tháng 8 qua VietQR) và tháng 9 (PENDING) để kiểm thử luồng chi trả chuyển sang lịch sử.

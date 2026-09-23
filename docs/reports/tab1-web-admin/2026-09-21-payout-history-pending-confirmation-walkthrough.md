# Báo Cáo Bàn Giao: Hiển Thị Bản Kê Chờ PT Xác Nhận Trong Lịch Sử Chi Trả & Bổ Sung Bộ Lọc Trạng Thái (Tab 1 - Web Admin)

**Ngày thực hiện:** 21/09/2026  
**Vai trò phụ trách:** Tab 1 - Web Admin Lead (`anti-1-QTV-LT`)  
**Mã nghiệp vụ liên quan:** `QTV-W15-US03` (Tra cứu và đối soát lịch sử chi trả hoa hồng PT)  

---

## 1. Mục Tiêu Nghiệp Vụ
1. Đưa các bản kê hoa hồng ở trạng thái **Chờ PT xác nhận** (`PENDING_CONFIRMATION`) vào tab **Lịch sử chi trả** (`#commissions/history`), thay vì chỉ hiển thị các bản ghi đã hoàn tất (`PAID`). Giúp Quản trị viên và Lễ tân theo dõi trực tiếp tiến trình giải ngân và đối soát các khoản đã phát lệnh nhưng HLV chưa bấm xác nhận trên Mobile App.
2. Bổ sung **Bộ lọc Trạng thái chi trả** (`status`) trên thanh công cụ lọc của tab Lịch sử chi trả (`Tất cả trạng thái`, `Đã chi trả`, `Chờ PT xác nhận`).
3. Cập nhật bảng dữ liệu DataGrid hiển thị cột **Trạng thái** kèm Badge DevExtreme đồng bộ (xanh lá `Đã chi trả` - `success`, xanh dương `Chờ PT xác nhận` - `info`).
4. Cập nhật bộ 4 thẻ KPI thống kê phản ánh chính xác số lượt đã chi và số lượt đang chờ PT xác nhận.
5. Cập nhật hàm kết xuất file CSV (`exportHistory`) bổ sung cột Trạng thái chi trả (13 cột).

---

## 2. Chi Tiết Thay Đổi Kỹ Thuật

### 2.1. Backend API (`backend/src/modules/core/commissions.js`)
- Endpoint: `GET /commissions/payout-history`
  * Mở rộng điều kiện truy vấn gốc:
    ```sql
    WHERE c.status IN ('PAID', 'PENDING_CONFIRMATION')
    ```
  * Tiếp nhận query parameter `status`:
    ```javascript
    if (status && status !== 'ALL') {
      params.push(status);
      query += ` AND c.status = $${params.length}`;
    }
    ```
  * Chuẩn hóa bộ lọc thời gian: Sử dụng `COALESCE(c.paid_at, c.created_at)` để bao quát cả giao dịch mới phát lệnh lẫn giao dịch hoàn tất.

### 2.2. Frontend Web Admin (`frontend/web/js/modules/commissions.js`)
- **Bộ lọc Trạng thái chi trả:** Thêm `dxSelectBox` (width: 180px) vào `filterBar` trong `renderHistoryTab`:
  * Tùy chọn: `ALL` (Tất cả trạng thái), `PAID` (Đã chi trả), `PENDING_CONFIRMATION` (Chờ PT xác nhận).
- **Bộ 4 thẻ KPI (`updateHistoryMetrics`):**
  * `Tổng lượt chi trả`: Tính tổng số lượt kèm caption động (`X đã chi · Y chờ PT xác nhận` hoặc `Đã quyết toán hoàn tất`).
  * `Tổng tiền chi trả`: Tổng số tiền hoa hồng trong danh sách lọc.
  * `Chi qua VietQR / Ngân hàng`: Tổng tiền và số giao dịch ngân hàng.
  * `Chi tiền mặt tại quầy`: Tổng tiền và số phiếu chi tiền mặt.
- **Bảng dữ liệu DataGrid (`dxDataGrid`):**
  * Thêm cột `Trạng thái` (`dataField: 'status'`, width: 150px, center):
    - `PAID`: Badge `Đã chi trả` (tone: `success` - xanh lá).
    - `PENDING_CONFIRMATION`: Badge `Chờ PT xác nhận` (tone: `info` - xanh dương).
- **Xuất file CSV (`exportHistory`):**
  * Bổ sung cột `Trạng thái` vào headers và rows (13 cột dữ liệu chuẩn UTF-8).

### 2.3. Đồng bộ tài liệu đặc tả
- Cập nhật `docs/user-stories/qtv/QTV-W15-Quản lý hoa hồng PT/QTV-W15-US03-Tra cứu và đối soát lịch sử chi trả hoa hồng PT.md`:
  * Cập nhật `## Preconditions`, `## Main Flow`.
  * Cập nhật bảng `Field-level specification` (thêm Bộ lọc Trạng thái chi trả và cột Trạng thái DataGrid).
  * Cập nhật Activity Diagram Swimlane node `S01`.

---

## 3. Kết Quả Kiểm Thử E2E Bằng UI Thật (Puppeteer)

Kịch bản E2E tự động (`tests/e2e/test_history_payout_status.cjs`) chạy trên Google Chrome thật:
1. **Bước 1 (Đăng nhập & Điều hướng):** Đăng nhập tài khoản QTV (`0900000001` / `Paradise@123` qua 2FA OTP), điều hướng tới `#commissions`, chuyển sang tab "Lịch sử chi trả".
2. **Bước 2 (Hiển thị Tất cả trạng thái):**
   - Bản ghi Tháng 9/2026 của HLV Nguyễn Văn Thể hiển thị với badge xanh dương `Chờ PT xác nhận` (768.750 đ).
   - Bản ghi Tháng 8/2026 và Tháng 7/2026 hiển thị với badge xanh lá `Đã chi trả`.
   - Thẻ KPI hiển thị: **3 lượt** (`2 đã chi · 1 chờ PT xác nhận`), tổng tiền: **2.168.750 đ**.
   - *Snapshot minh chứng:* `verify_history_pending_confirmation.png`
3. **Bước 3 (Lọc Chờ PT xác nhận):**
   - Chọn dropdown `Chờ PT xác nhận`: Bảng chỉ hiển thị đúng 1 bản ghi Tháng 9/2026.
   - Thẻ KPI cập nhật: **1 lượt** (768.750 đ).
   - *Snapshot minh chứng:* `verify_history_filter_pending.png`
4. **Bước 4 (Lọc Đã chi trả):**
   - Chọn dropdown `Đã chi trả`: Bảng chỉ hiển thị đúng 2 bản ghi Tháng 8 và Tháng 7.
   - Thẻ KPI cập nhật: **2 lượt** (1.400.000 đ).
   - *Snapshot minh chứng:* `verify_history_filter_paid.png`
5. **Bước 5 (Popup Chi tiết):**
   - Bấm `[Chi tiết]` trên bản ghi `PENDING_CONFIRMATION`: Popup hiển thị badge `Chờ PT xác nhận`, thời gian phát lệnh `21/09/2026 23:43`, ghi chú, dòng trạng thái *Chờ HLV bấm xác nhận trên app*, và bảng 8 buổi dạy chi tiết.
   - *Snapshot minh chứng:* `verify_history_details_modal_pending.png`

---

## 4. Kết Luận
Toàn bộ tính năng đã được triển khai hoàn chỉnh, tuân thủ tuyệt đối quy chuẩn Administrative Forest Clean UI, không hardcode mock data, và vượt qua 100% các bước kiểm thử tự động.

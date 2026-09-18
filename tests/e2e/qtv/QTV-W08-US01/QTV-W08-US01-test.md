# Báo Cáo Kiểm Thử E2E — QTV-W08-US01: Xem danh sách payment

- **User Story:** `QTV-W08-US01`
- **Epic / Menu:** W08 · Thu tiền & thanh toán
- **Vai trò thực hiện (Primary Role):** Quản trị viên (QTV)
- **Phạm vi kiểm thử:** Mobile App PT (390x844 kết nối PostgreSQL qua REST API)
- **Ngày thực hiện:** 2026-09-18
- **Trạng thái tổng thể:** **`PASS`**

---

## 1. Overview & Preconditions

### 1.1. Mục tiêu kiểm thử
Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story `QTV-W08-US01` trên giao diện thực tế.

### 1.2. Điều kiện tiên quyết (Preconditions)
- [x] Tài khoản vai trò Quản trị viên (QTV) có quyền hạn và trạng thái hợp lệ trên hệ thống.
- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).
- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.

---

## 2. Source Action Verification (Step-by-Step)

### Step 1: Mở màn hình Quản lý Thu tiền & thanh toán (W08)
- **Action / Input:** QTV truy cập menu W08 (#payments)
- **Expected Result:** Giao diện hiển thị thanh KPI doanh thu, thanh công cụ bộ lọc đa chiều và DataGrid danh sách phiếu thu/thanh toán
- **Actual Result:** Màn hình tải hoàn chỉnh với đầy đủ các cột: Mã phiếu, Thời gian, Hội viên, Đăng ký, Phương thức, Số tiền, Người thu, Chi nhánh, Trạng thái và Thao tác
- **Status:** `PASS`

![Step 1 - Mở màn hình Quản lý Thu tiền & thanh toán (W08)](./step-01-payments-grid.png)

---

### Step 2: Lọc danh sách theo Phương thức "Tiền mặt"
- **Action / Input:** QTV chọn "Tiền mặt" trên dropdown Phương thức
- **Expected Result:** DataGrid chỉ hiển thị các giao dịch thu bằng Tiền mặt
- **Actual Result:** DataGrid làm mới và hiển thị chính xác các dòng giao dịch Tiền mặt
- **Status:** `PASS`

![Step 2 - Lọc danh sách theo Phương thức "Tiền mặt"](./step-02-filter-cash-payments.png)

---

### Step 3: Lọc danh sách theo Trạng thái "Thành công"
- **Action / Input:** QTV chọn "Thành công" trên dropdown Trạng thái
- **Expected Result:** DataGrid chỉ hiển thị các giao dịch đã hoàn tất thành công với badge màu xanh
- **Actual Result:** Các dòng giao dịch hiển thị badge Thành công màu xanh lá nổi bật
- **Status:** `PASS`

![Step 3 - Lọc danh sách theo Trạng thái "Thành công"](./step-03-filter-completed-payments.png)

---

## 3. State Verification (Data & UI Consistency)

Dữ liệu và trạng thái giao diện nội tại đồng bộ chính xác theo các thao tác đã thực hiện.

---

## 4. Cross-Role / Downstream Verification

*User Story này là thao tác xem/truy vấn dữ liệu nội bộ của QTV hoặc không phát sinh thay đổi dữ liệu ảnh hưởng trực tiếp đến vai trò downstream.*

---

## 5. Issues Found

| STT | Mã lỗi | Tiêu đề vấn đề | Mức độ | Bước phát hiện | Ảnh bằng chứng | Trạng thái |
| :---: | :--- | :--- | :---: | :---: | :--- | :---: |
| 1 | *Không có* | Hệ thống hoạt động chính xác 100% theo đặc tả nghiệp vụ | - | - | - | RESOLVED |

---

## 6. Final Result

- **Tổng số bước kiểm thử (Steps):** 3
- **Số bước đạt (Passed):** 3
- **Số bước không đạt (Failed):** 0
- **Số bước bị tắc nghẽn (Blocked):** 0
- **KẾT LUẬN CUỐI CÙNG:** **`PASS`**

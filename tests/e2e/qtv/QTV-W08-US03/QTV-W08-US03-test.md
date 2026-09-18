# Báo Cáo Kiểm Thử E2E — QTV-W08-US03: Xem thống kê

- **User Story:** `QTV-W08-US03`
- **Epic / Menu:** W08 · Thu tiền & thanh toán
- **Vai trò thực hiện (Primary Role):** Quản trị viên (QTV)
- **Phạm vi kiểm thử:** Mobile App PT (390x844 kết nối PostgreSQL qua REST API)
- **Ngày thực hiện:** 2026-09-18
- **Trạng thái tổng thể:** **`PASS`**

---

## 1. Overview & Preconditions

### 1.1. Mục tiêu kiểm thử
Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story `QTV-W08-US03` trên giao diện thực tế.

### 1.2. Điều kiện tiên quyết (Preconditions)
- [x] Tài khoản vai trò Quản trị viên (QTV) có quyền hạn và trạng thái hợp lệ trên hệ thống.
- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).
- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.

---

## 2. Source Action Verification (Step-by-Step)

### Step 1: Xem khối KPI thống kê doanh thu và lượt thanh toán
- **Action / Input:** QTV quan sát khối thẻ KPI phía trên bảng giao dịch
- **Expected Result:** Khối thống kê hiển thị 3 chỉ số chính: "Tổng thực thu", "Lượt thanh toán thành công", "Đơn chờ thanh toán" được tính toán tự động
- **Actual Result:** Các số liệu KPI hiển thị rõ ràng, định dạng tiền tệ VNĐ chuẩn và số lượng đơn chính xác
- **Status:** `PASS`

![Step 1 - Xem khối KPI thống kê doanh thu và lượt thanh toán](./step-01-kpi-summary.png)

---

### Step 2: Cập nhật KPI thống kê theo khoảng thời gian tùy chọn
- **Action / Input:** QTV mở rộng bộ lọc ngày "Từ ngày" về trước 30 ngày
- **Expected Result:** Các chỉ số KPI và danh sách giao dịch tự động tính toán lại theo khoảng thời gian vừa chọn
- **Actual Result:** Số liệu KPI tự động tái tính toán và hiển thị tổng thực thu trong 30 ngày qua
- **Status:** `PASS`

![Step 2 - Cập nhật KPI thống kê theo khoảng thời gian tùy chọn](./step-02-kpi-dynamic-update.png)

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

- **Tổng số bước kiểm thử (Steps):** 2
- **Số bước đạt (Passed):** 2
- **Số bước không đạt (Failed):** 0
- **Số bước bị tắc nghẽn (Blocked):** 0
- **KẾT LUẬN CUỐI CÙNG:** **`PASS`**

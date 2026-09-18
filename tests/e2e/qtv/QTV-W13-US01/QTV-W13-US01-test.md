# Báo Cáo Kiểm Thử E2E — QTV-W13-US01: Xem danh sách tài khoản và thống kê KPI

- **User Story:** `QTV-W13-US01`
- **Epic / Menu:** W13 · Tài khoản & phân quyền
- **Vai trò thực hiện (Primary Role):** Quản trị viên (QTV)
- **Phạm vi kiểm thử:** Mobile App PT (390x844 kết nối PostgreSQL qua REST API)
- **Ngày thực hiện:** 2026-09-18
- **Trạng thái tổng thể:** **`PASS`**

---

## 1. Overview & Preconditions

### 1.1. Mục tiêu kiểm thử
Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story `QTV-W13-US01` trên giao diện thực tế.

### 1.2. Điều kiện tiên quyết (Preconditions)
- [x] Tài khoản vai trò Quản trị viên (QTV) có quyền hạn và trạng thái hợp lệ trên hệ thống.
- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).
- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.

---

## 2. Source Action Verification (Step-by-Step)

### Step 1: Xem danh sách tài khoản và thẻ KPI thống kê (W13)
- **Action / Input:** QTV truy cập menu W13 (#users-rbac), tab "Tài khoản"
- **Expected Result:** Màn hình hiển thị khối KPI (Tổng tài khoản, Đang hoạt động, Chờ kích hoạt, Đã khóa), thanh bộ lọc đa tiêu chí và DataGrid tài khoản: SĐT đăng nhập, Người sử dụng, Vai trò, Chi nhánh áp dụng, Trạng thái và Thao tác sửa
- **Actual Result:** Khối KPI và DataGrid tài khoản hiển thị đầy đủ, chính xác các tài khoản trong hệ thống
- **Status:** `PASS`

![Step 1 - Xem danh sách tài khoản và thẻ KPI thống kê (W13)](./step-01-accounts-kpi-and-grid.png)

---

### Step 2: Lọc danh sách tài khoản theo Vai trò "Lễ tân"
- **Action / Input:** QTV chọn vai trò "Lễ tân" từ dropdown bộ lọc
- **Expected Result:** DataGrid chỉ hiển thị các tài khoản có vai trò RECEPTIONIST với badge vai trò màu tím
- **Actual Result:** DataGrid lọc chính xác các tài khoản Lễ tân
- **Status:** `PASS`

![Step 2 - Lọc danh sách tài khoản theo Vai trò "Lễ tân"](./step-02-filter-receptionist-accounts.png)

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

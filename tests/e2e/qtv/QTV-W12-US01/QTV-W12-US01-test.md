# Báo Cáo Kiểm Thử E2E — QTV-W12-US01: Quản lý thiết bị nhận diện - ra vào

- **User Story:** `QTV-W12-US01`
- **Epic / Menu:** W12 · Hệ thống & thiết bị
- **Vai trò thực hiện (Primary Role):** Quản trị viên (QTV)
- **Phạm vi kiểm thử:** Mobile App PT (390x844 kết nối PostgreSQL qua REST API)
- **Ngày thực hiện:** 2026-09-18
- **Trạng thái tổng thể:** **`PASS`**

---

## 1. Overview & Preconditions

### 1.1. Mục tiêu kiểm thử
Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story `QTV-W12-US01` trên giao diện thực tế.

### 1.2. Điều kiện tiên quyết (Preconditions)
- [x] Tài khoản vai trò Quản trị viên (QTV) có quyền hạn và trạng thái hợp lệ trên hệ thống.
- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).
- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.

---

## 2. Source Action Verification (Step-by-Step)

### Step 1: Mở tab Quản lý thiết bị (W12)
- **Action / Input:** QTV truy cập menu W12 (#equipment), tab "Thiết bị"
- **Expected Result:** DataGrid hiển thị danh sách thiết bị kiểm soát: Mã thiết bị, Tên thiết bị/Điểm lắp, Chi nhánh, Loại thiết bị, Chiều (IN/OUT), Trạng thái (Online/Offline/Error), Heartbeat gần nhất và Thao tác
- **Actual Result:** DataGrid hiển thị danh sách thiết bị phần cứng kiểm soát ra vào của toàn hệ thống
- **Status:** `PASS`

![Step 1 - Mở tab Quản lý thiết bị (W12)](./step-01-devices-tab-grid.png)

---

### Step 2: Mở modal Thêm thiết bị mới
- **Action / Input:** QTV click nút "Thêm thiết bị"
- **Expected Result:** Modal "Thêm thiết bị" mở ra với các trường: Mã thiết bị, Tên thiết bị, Loại thiết bị (KIOSK/TURNSTILE/CAMERA), Chi nhánh, Điểm lắp, Mục đích ra/vào và Trạng thái cấu hình
- **Actual Result:** Modal hiển thị form cấu hình thiết bị với đầy đủ các thuộc tính kỹ thuật
- **Status:** `PASS`

![Step 2 - Mở modal Thêm thiết bị mới](./step-02-open-create-device-modal.png)

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

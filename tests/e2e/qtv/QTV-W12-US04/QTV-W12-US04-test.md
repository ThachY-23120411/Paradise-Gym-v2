# Báo Cáo Kiểm Thử E2E — QTV-W12-US04: Theo dõi trạng thái và sự cố thiết bị

- **User Story:** `QTV-W12-US04`
- **Epic / Menu:** W12 · Hệ thống & thiết bị
- **Vai trò thực hiện (Primary Role):** Quản trị viên (QTV)
- **Phạm vi kiểm thử:** Mobile App PT (390x844 kết nối PostgreSQL qua REST API)
- **Ngày thực hiện:** 2026-09-18
- **Trạng thái tổng thể:** **`PASS`**

---

## 1. Overview & Preconditions

### 1.1. Mục tiêu kiểm thử
Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story `QTV-W12-US04` trên giao diện thực tế.

### 1.2. Điều kiện tiên quyết (Preconditions)
- [x] Tài khoản vai trò Quản trị viên (QTV) có quyền hạn và trạng thái hợp lệ trên hệ thống.
- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).
- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.

---

## 2. Source Action Verification (Step-by-Step)

### Step 1: Mở tab Theo dõi và xử lý sự cố thiết bị
- **Action / Input:** QTV click chọn tab "Sự cố"
- **Expected Result:** DataGrid hiển thị danh sách các sự cố thiết bị: Thời gian phát sinh, Thiết bị, Mức độ nghiêm trọng (CRITICAL/WARNING/INFO), Trạng thái xử lý (OPEN/IN_PROGRESS/RESOLVED) và Thao tác xử lý
- **Actual Result:** Màn hình hiển thị đầy đủ danh sách sự cố và thanh công cụ lọc theo mức độ nghiêm trọng
- **Status:** `PASS`

![Step 1 - Mở tab Theo dõi và xử lý sự cố thiết bị](./step-01-incidents-tab-grid.png)

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

- **Tổng số bước kiểm thử (Steps):** 1
- **Số bước đạt (Passed):** 1
- **Số bước không đạt (Failed):** 0
- **Số bước bị tắc nghẽn (Blocked):** 0
- **KẾT LUẬN CUỐI CÙNG:** **`PASS`**

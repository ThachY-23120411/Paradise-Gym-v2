# Báo Cáo Kiểm Thử E2E — QTV-W07-US03: Xem nhật ký Ra Vào và theo dõi trạng thái thiết bị

- **User Story:** `QTV-W07-US03`
- **Epic / Menu:** W07 · Ra vào & check-in
- **Vai trò thực hiện (Primary Role):** Quản trị viên (QTV)
- **Phạm vi kiểm thử:** Mobile App PT (390x844 kết nối PostgreSQL qua REST API)
- **Ngày thực hiện:** 2026-09-18
- **Trạng thái tổng thể:** **`PASS`**

---

## 1. Overview & Preconditions

### 1.1. Mục tiêu kiểm thử
Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story `QTV-W07-US03` trên giao diện thực tế.

### 1.2. Điều kiện tiên quyết (Preconditions)
- [x] Tài khoản vai trò Quản trị viên (QTV) có quyền hạn và trạng thái hợp lệ trên hệ thống.
- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).
- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.

---

## 2. Source Action Verification (Step-by-Step)

### Step 1: Theo dõi danh sách và trạng thái thiết bị điểm kiểm soát
- **Action / Input:** QTV quan sát khung danh sách Thiết bị tại panel bên trái
- **Expected Result:** Khung Thiết bị hiển thị danh sách các cổng/kiosk cùng trạng thái hoạt động (badge Online màu xanh / Offline màu đỏ) và thời gian đồng bộ
- **Actual Result:** Hiển thị danh sách thiết bị kiểm soát cổng, thời gian heartbeat và badge trạng thái rõ ràng
- **Status:** `PASS`

![Step 1 - Theo dõi danh sách và trạng thái thiết bị điểm kiểm soát](./step-01-device-status-panel.png)

---

### Step 2: Bộ lọc Ngày xem nhật ký và Thống kê tổng số sự kiện
- **Action / Input:** QTV kiểm tra DateBox lọc ngày và số lượng sự kiện tại tiêu đề
- **Expected Result:** DateBox hiển thị ngày hiện tại, badge số lượng sự kiện đếm chính xác tổng số lượt quét trong ngày
- **Actual Result:** Badge hiển thị số sự kiện hôm nay khớp chuẩn xác với tổng số dòng trong DataGrid
- **Status:** `PASS`

![Step 2 - Bộ lọc Ngày xem nhật ký và Thống kê tổng số sự kiện](./step-02-date-filter-and-counter.png)

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

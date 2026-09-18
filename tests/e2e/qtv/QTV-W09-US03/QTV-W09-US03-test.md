# Báo Cáo Kiểm Thử E2E — QTV-W09-US03: Tra cứu lịch sử gửi thông báo

- **User Story:** `QTV-W09-US03`
- **Epic / Menu:** W09 · Thông báo
- **Vai trò thực hiện (Primary Role):** Quản trị viên (QTV)
- **Phạm vi kiểm thử:** Mobile App PT (390x844 kết nối PostgreSQL qua REST API)
- **Ngày thực hiện:** 2026-09-18
- **Trạng thái tổng thể:** **`PASS`**

---

## 1. Overview & Preconditions

### 1.1. Mục tiêu kiểm thử
Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story `QTV-W09-US03` trên giao diện thực tế.

### 1.2. Điều kiện tiên quyết (Preconditions)
- [x] Tài khoản vai trò Quản trị viên (QTV) có quyền hạn và trạng thái hợp lệ trên hệ thống.
- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).
- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.

---

## 2. Source Action Verification (Step-by-Step)

### Step 1: Mở tab Tra cứu lịch sử gửi thông báo
- **Action / Input:** QTV click tab "Lịch sử gửi"
- **Expected Result:** DataGrid hiển thị danh sách thông báo đã gửi: Thời gian, Sự kiện, Người nhận, Tiêu đề, Mã tham chiếu, Trạng thái đọc và nút Xem toàn văn
- **Actual Result:** Bảng lịch sử thông báo hiển thị đầy đủ thông tin chi tiết nhật ký gửi
- **Status:** `PASS`

![Step 1 - Mở tab Tra cứu lịch sử gửi thông báo](./step-01-notification-history-grid.png)

---

### Step 2: Mở popup Xem toàn văn nội dung thông báo
- **Action / Input:** QTV click nút "Xem toàn văn" (icon eyeopen) tại một dòng thông báo
- **Expected Result:** Popup "Chi tiết thông báo" mở ra, hiển thị: Người nhận, Thời gian gửi, Sự kiện, Tiêu đề và Toàn bộ nội dung thông báo
- **Actual Result:** Popup hiển thị toàn bộ nội dung thông báo thực tế được gửi đến tài khoản người dùng
- **Status:** `PASS`

![Step 2 - Mở popup Xem toàn văn nội dung thông báo](./step-02-notification-full-detail.png)

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

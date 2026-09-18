# Báo Cáo Kiểm Thử E2E — QTV-W09-US02: Quản lý mẫu thông báo in-app

- **User Story:** `QTV-W09-US02`
- **Epic / Menu:** W09 · Thông báo
- **Vai trò thực hiện (Primary Role):** Quản trị viên (QTV)
- **Phạm vi kiểm thử:** Mobile App PT (390x844 kết nối PostgreSQL qua REST API)
- **Ngày thực hiện:** 2026-09-18
- **Trạng thái tổng thể:** **`PASS`**

---

## 1. Overview & Preconditions

### 1.1. Mục tiêu kiểm thử
Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story `QTV-W09-US02` trên giao diện thực tế.

### 1.2. Điều kiện tiên quyết (Preconditions)
- [x] Tài khoản vai trò Quản trị viên (QTV) có quyền hạn và trạng thái hợp lệ trên hệ thống.
- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).
- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.

---

## 2. Source Action Verification (Step-by-Step)

### Step 1: Mở tab Quản lý mẫu thông báo in-app
- **Action / Input:** QTV click chọn tab "Mẫu thông báo"
- **Expected Result:** Giao diện hiển thị nút "Thêm mẫu thông báo", thanh tìm kiếm theo sự kiện và DataGrid danh sách các mẫu thông báo
- **Actual Result:** DataGrid hiển thị danh sách mẫu: Mã mẫu, Tên mẫu, Sự kiện, Tiêu đề mẫu và Trạng thái
- **Status:** `PASS`

![Step 1 - Mở tab Quản lý mẫu thông báo in-app](./step-01-templates-tab.png)

---

### Step 2: Mở modal Thêm mẫu thông báo
- **Action / Input:** QTV click nút "Thêm mẫu thông báo"
- **Expected Result:** Modal "Thêm mẫu thông báo" mở ra với các trường: Tên mẫu, Sự kiện áp dụng, Biến nội dung, Tiêu đề thông báo và Nội dung thông báo
- **Actual Result:** Modal hiển thị form nhập liệu hoàn chỉnh theo đặc tả kỹ thuật
- **Status:** `PASS`

![Step 2 - Mở modal Thêm mẫu thông báo](./step-02-add-template-modal.png)

---

### Step 3: Nhập thông tin mẫu và chèn biến động vào nội dung
- **Action / Input:** QTV nhập Tên mẫu, chọn Sự kiện BOOKING_REMINDER và chèn các biến: {{member_name}}, {{pt_name}}, {{time_slot}}, {{branch_name}}
- **Expected Result:** Các trường được điền đầy đủ và đúng cú pháp biến được hỗ trợ bởi sự kiện
- **Actual Result:** Form hiển thị tiêu đề và nội dung mẫu với các biến động hợp lệ
- **Status:** `PASS`

![Step 3 - Nhập thông tin mẫu và chèn biến động vào nội dung](./step-03-fill-template-form.png)

---

### Step 4: Xác nhận tạo mẫu thông báo thành công
- **Action / Input:** QTV click nút "Lưu" để hoàn tất tạo mẫu
- **Expected Result:** Modal đóng, DataGrid cập nhật mẫu mới với badge trạng thái "Đang sử dụng"
- **Actual Result:** Mẫu thông báo mới được lưu vào hệ thống và hiển thị trên DataGrid
- **Status:** `PASS`

![Step 4 - Xác nhận tạo mẫu thông báo thành công](./step-04-template-saved-success.png)

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

- **Tổng số bước kiểm thử (Steps):** 4
- **Số bước đạt (Passed):** 4
- **Số bước không đạt (Failed):** 0
- **Số bước bị tắc nghẽn (Blocked):** 0
- **KẾT LUẬN CUỐI CÙNG:** **`PASS`**

# Báo Cáo Kiểm Thử E2E — QTV-W09-US01: Cấu hình thông báo tự động

- **User Story:** `QTV-W09-US01`
- **Epic / Menu:** W09 · Thông báo
- **Vai trò thực hiện (Primary Role):** Quản trị viên (QTV)
- **Phạm vi kiểm thử:** Mobile App PT (390x844 kết nối PostgreSQL qua REST API)
- **Ngày thực hiện:** 2026-09-18
- **Trạng thái tổng thể:** **`PASS`**

---

## 1. Overview & Preconditions

### 1.1. Mục tiêu kiểm thử
Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story `QTV-W09-US01` trên giao diện thực tế.

### 1.2. Điều kiện tiên quyết (Preconditions)
- [x] Tài khoản vai trò Quản trị viên (QTV) có quyền hạn và trạng thái hợp lệ trên hệ thống.
- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).
- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.

---

## 2. Source Action Verification (Step-by-Step)

### Step 1: Mở màn hình Cấu hình thông báo tự động (W09)
- **Action / Input:** QTV truy cập menu W09 (#notifications), tab "Cấu hình tự động"
- **Expected Result:** DataGrid hiển thị danh mục các sự kiện hệ thống: Sự kiện, Người nhận, Mẫu áp dụng, Kênh gửi, Tự động gửi (switch Bật/Tắt) và nút Sửa cấu hình
- **Actual Result:** Bảng cấu hình hiển thị đầy đủ danh mục sự kiện tự động theo chuẩn thiết kế
- **Status:** `PASS`

![Step 1 - Mở màn hình Cấu hình thông báo tự động (W09)](./step-01-notification-rules-grid.png)

---

### Step 2: Thao tác Bật/Tắt tính năng Tự động gửi của sự kiện
- **Action / Input:** QTV click switch "Tự động gửi" tại dòng sự kiện đầu tiên
- **Expected Result:** Trạng thái switch thay đổi, hệ thống lưu cấu hình qua API và hiển thị phản hồi mượt mà
- **Actual Result:** Switch chuyển đổi trạng thái thành công, cấu hình được lưu trực tiếp vào cơ sở dữ liệu
- **Status:** `PASS`

![Step 2 - Thao tác Bật/Tắt tính năng Tự động gửi của sự kiện](./step-02-toggle-auto-rule.png)

---

### Step 3: Mở modal Cấu hình thông báo tự động
- **Action / Input:** QTV click nút "Sửa cấu hình" (icon edit) tại một sự kiện
- **Expected Result:** Modal "Cấu hình thông báo tự động" hiển thị các trường: Tên sự kiện, Vai trò nhận (checkbox), Hình thức gửi (checkbox), Kênh thông báo, Mẫu áp dụng và Switch Tự động gửi
- **Actual Result:** Modal hiển thị đúng thiết kế, tải sẵn danh sách mẫu thông báo hợp lệ cho sự kiện tương ứng
- **Status:** `PASS`

![Step 3 - Mở modal Cấu hình thông báo tự động](./step-03-rule-editor-modal.png)

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

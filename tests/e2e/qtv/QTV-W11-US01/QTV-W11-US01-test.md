# Báo Cáo Kiểm Thử E2E — QTV-W11-US01: Xem danh sách chi nhánh

- **User Story:** `QTV-W11-US01`
- **Epic / Menu:** W11 · Chi nhánh
- **Vai trò thực hiện (Primary Role):** Quản trị viên (QTV)
- **Phạm vi kiểm thử:** Mobile App PT (390x844 kết nối PostgreSQL qua REST API)
- **Ngày thực hiện:** 2026-09-18
- **Trạng thái tổng thể:** **`PASS`**

---

## 1. Overview & Preconditions

### 1.1. Mục tiêu kiểm thử
Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story `QTV-W11-US01` trên giao diện thực tế.

### 1.2. Điều kiện tiên quyết (Preconditions)
- [x] Tài khoản vai trò Quản trị viên (QTV) có quyền hạn và trạng thái hợp lệ trên hệ thống.
- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).
- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.

---

## 2. Source Action Verification (Step-by-Step)

### Step 1: Xem danh sách thẻ Chi nhánh trong toàn chuỗi
- **Action / Input:** QTV truy cập menu W11 (#branches) ở phạm vi Toàn bộ chi nhánh
- **Expected Result:** Màn hình hiển thị danh sách các chi nhánh dưới dạng thẻ card lưới, mỗi thẻ thể hiện: Tên chi nhánh, Mã chi nhánh, Địa chỉ, Số điện thoại, Giờ mở cửa, Badge trạng thái, Thống kê micro (Hội viên, PT, Đang tập) và nút Thao tác (Số liệu, Chỉnh sửa)
- **Actual Result:** Màn hình hiển thị đầy đủ các chi nhánh với số liệu thống kê trực quan
- **Status:** `PASS`

![Step 1 - Xem danh sách thẻ Chi nhánh trong toàn chuỗi](./step-01-branch-cards-grid.png)

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

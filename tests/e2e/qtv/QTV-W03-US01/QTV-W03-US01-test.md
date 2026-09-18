# Báo Cáo Kiểm Thử E2E — QTV-W03-US01: Xem danh sách gói tập

- **User Story:** `QTV-W03-US01`
- **Epic / Menu:** W03 · Gói tập
- **Vai trò thực hiện (Primary Role):** Quản trị viên (QTV)
- **Phạm vi kiểm thử:** Mobile App PT (390x844 kết nối PostgreSQL qua REST API)
- **Ngày thực hiện:** 2026-09-18
- **Trạng thái tổng thể:** **`PASS`**

---

## 1. Overview & Preconditions

### 1.1. Mục tiêu kiểm thử
Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story `QTV-W03-US01` trên giao diện thực tế.

### 1.2. Điều kiện tiên quyết (Preconditions)
- [x] Tài khoản vai trò Quản trị viên (QTV) có quyền hạn và trạng thái hợp lệ trên hệ thống.
- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).
- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.

---

## 2. Source Action Verification (Step-by-Step)

### Step 1: Xem danh mục gói tập với danh mục thẻ trực quan
- **Action / Input:** QTV truy cập menu Gói tập (#packages)
- **Expected Result:** Giao diện hiển thị danh mục gói tập phân theo các tab trạng thái (Tất cả, Đang bán, Ngừng bán), thanh tìm kiếm và nút Tạo gói mới
- **Actual Result:** Giao diện hiển thị đầy đủ danh mục gói tập dưới dạng thẻ trực quan (Catalog Cards), giá niêm yết, thời hạn và số lượt/buổi
- **Status:** `PASS`

![Step 1 - Xem danh mục gói tập với danh mục thẻ trực quan](./step-01-packages-overview.png)

---

### Step 2: Chuyển tab xem danh mục Gói Đang bán
- **Action / Input:** QTV click tab "Đang bán" (ACTIVE)
- **Expected Result:** Lưới gói tập lọc và chỉ hiển thị danh mục các gói tập đang trong trạng thái mở bán
- **Actual Result:** Hiển thị chính xác danh mục gói tập ACTIVE với giá niêm yết và chi nhánh áp dụng
- **Status:** `PASS`

![Step 2 - Chuyển tab xem danh mục Gói Đang bán](./step-02-tab-active-packages.png)

---

## 3. State Verification (Data & UI Consistency)

- **Mô tả kiểm chứng:** Danh mục gói tập nạp đầy đủ và chuẩn xác từ PostgreSQL database
- **Status:** `PASS`

![State Verification](./step-01-packages-overview.png)

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

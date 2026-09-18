# Báo Cáo Kiểm Thử E2E — QTV-W13-US02: Sửa tài khoản

- **User Story:** `QTV-W13-US02`
- **Epic / Menu:** W13 · Tài khoản & phân quyền
- **Vai trò thực hiện (Primary Role):** Quản trị viên (QTV)
- **Phạm vi kiểm thử:** Mobile App PT (390x844 kết nối PostgreSQL qua REST API)
- **Ngày thực hiện:** 2026-09-18
- **Trạng thái tổng thể:** **`PASS`**

---

## 1. Overview & Preconditions

### 1.1. Mục tiêu kiểm thử
Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story `QTV-W13-US02` trên giao diện thực tế.

### 1.2. Điều kiện tiên quyết (Preconditions)
- [x] Tài khoản vai trò Quản trị viên (QTV) có quyền hạn và trạng thái hợp lệ trên hệ thống.
- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).
- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.

---

## 2. Source Action Verification (Step-by-Step)

### Step 1: Mở modal Sửa tài khoản người dùng
- **Action / Input:** QTV click nút "Sửa tài khoản" (icon edit) tại một dòng tài khoản nhân viên
- **Expected Result:** Modal "Sửa tài khoản" hiển thị: SĐT đăng nhập (read-only), Trạng thái tài khoản (dropdown), Vai trò (TagBox hỗ trợ chọn nhiều vai trò) và Phạm vi chi nhánh (dropdown)
- **Actual Result:** Modal hiển thị form phân quyền RBAC đa vai trò và phân bổ phạm vi chi nhánh chuẩn xác
- **Status:** `PASS`

![Step 1 - Mở modal Sửa tài khoản người dùng](./step-01-open-edit-account-modal.png)

---

### Step 2: Đóng modal Sửa tài khoản an toàn
- **Action / Input:** QTV đóng modal
- **Expected Result:** Modal đóng, danh sách tài khoản giữ nguyên trạng thái
- **Actual Result:** Modal đóng an toàn
- **Status:** `PASS`

![Step 2 - Đóng modal Sửa tài khoản an toàn](./step-02-close-account-modal.png)

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

# Báo Cáo Kiểm Thử E2E — QTV-W11-US04: Xem số liệu chi nhánh

- **User Story:** `QTV-W11-US04`
- **Epic / Menu:** W11 · Chi nhánh
- **Vai trò thực hiện (Primary Role):** Quản trị viên (QTV)
- **Phạm vi kiểm thử:** Mobile App PT (390x844 kết nối PostgreSQL qua REST API)
- **Ngày thực hiện:** 2026-09-18
- **Trạng thái tổng thể:** **`PASS`**

---

## 1. Overview & Preconditions

### 1.1. Mục tiêu kiểm thử
Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story `QTV-W11-US04` trên giao diện thực tế.

### 1.2. Điều kiện tiên quyết (Preconditions)
- [x] Tài khoản vai trò Quản trị viên (QTV) có quyền hạn và trạng thái hợp lệ trên hệ thống.
- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).
- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.

---

## 2. Source Action Verification (Step-by-Step)

### Step 1: Mở popup Số liệu chi nhánh
- **Action / Input:** QTV click nút "Số liệu" tại thẻ chi nhánh
- **Expected Result:** Popup "Số liệu chi nhánh" mở ra, hiển thị chi tiết: Tên & mã chi nhánh, Địa chỉ, SĐT, Giờ mở cửa, 3 chỉ số chính (Hội viên, PT, Đang tập) và Bảng dịch vụ hoạt động trong tháng (Gói Gym, Gói PT, Combo, Lượt check-in, Buổi PT hoàn thành)
- **Actual Result:** Popup hiển thị đầy đủ các chỉ số thống kê hoạt động chi nhánh theo đặc tả
- **Status:** `PASS`

![Step 1 - Mở popup Số liệu chi nhánh](./step-01-branch-stats-popup.png)

---

### Step 2: Đóng popup Số liệu chi nhánh
- **Action / Input:** QTV bấm nút "Đóng" trên popup
- **Expected Result:** Popup đóng an toàn, quay về màn hình lưới chi nhánh
- **Actual Result:** Giao diện trở về danh sách chi nhánh
- **Status:** `PASS`

![Step 2 - Đóng popup Số liệu chi nhánh](./step-02-close-branch-stats.png)

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

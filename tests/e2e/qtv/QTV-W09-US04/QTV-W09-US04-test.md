# Báo Cáo Kiểm Thử E2E — QTV-W09-US04: Xem chi tiết mẫu thông báo

- **User Story:** `QTV-W09-US04`
- **Epic / Menu:** W09 · Thông báo
- **Vai trò thực hiện (Primary Role):** Quản trị viên (QTV)
- **Phạm vi kiểm thử:** Mobile App PT (390x844 kết nối PostgreSQL qua REST API)
- **Ngày thực hiện:** 2026-09-18
- **Trạng thái tổng thể:** **`PASS`**

---

## 1. Overview & Preconditions

### 1.1. Mục tiêu kiểm thử
Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story `QTV-W09-US04` trên giao diện thực tế.

### 1.2. Điều kiện tiên quyết (Preconditions)
- [x] Tài khoản vai trò Quản trị viên (QTV) có quyền hạn và trạng thái hợp lệ trên hệ thống.
- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).
- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.

---

## 2. Source Action Verification (Step-by-Step)

### Step 1: Mở popup Chi tiết mẫu thông báo
- **Action / Input:** QTV click nút "Xem chi tiết mẫu" (icon eyeopen) tại một dòng mẫu thông báo
- **Expected Result:** Popup "Chi tiết mẫu thông báo" mở ra, hiển thị: Mã mẫu, Tên mẫu, Sự kiện áp dụng, Kênh thông báo, Ngày tạo/Người tạo, Tiêu đề mẫu và Khối nội dung mẫu có gắn badge màu các biến động
- **Actual Result:** Popup hiển thị đầy đủ thông tin mẫu với các biến động được tag badge màu tím nổi bật
- **Status:** `PASS`

![Step 1 - Mở popup Chi tiết mẫu thông báo](./step-01-template-detail-popup.png)

---

### Step 2: Đóng popup Chi tiết mẫu thông báo
- **Action / Input:** QTV đóng popup để quay lại danh sách mẫu
- **Expected Result:** Popup đóng, DataGrid danh sách mẫu giữ nguyên trạng thái
- **Actual Result:** Popup đóng an toàn và giao diện sẵn sàng thao tác
- **Status:** `PASS`

![Step 2 - Đóng popup Chi tiết mẫu thông báo](./step-02-close-template-detail.png)

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

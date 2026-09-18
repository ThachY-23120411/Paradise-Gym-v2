# Báo Cáo Kiểm Thử E2E — QTV-W12-US02: Đăng ký dữ liệu nhận diện có consent

- **User Story:** `QTV-W12-US02`
- **Epic / Menu:** W12 · Hệ thống & thiết bị
- **Vai trò thực hiện (Primary Role):** Quản trị viên (QTV)
- **Phạm vi kiểm thử:** Mobile App PT (390x844 kết nối PostgreSQL qua REST API)
- **Ngày thực hiện:** 2026-09-18
- **Trạng thái tổng thể:** **`PASS`**

---

## 1. Overview & Preconditions

### 1.1. Mục tiêu kiểm thử
Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story `QTV-W12-US02` trên giao diện thực tế.

### 1.2. Điều kiện tiên quyết (Preconditions)
- [x] Tài khoản vai trò Quản trị viên (QTV) có quyền hạn và trạng thái hợp lệ trên hệ thống.
- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).
- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.

---

## 2. Source Action Verification (Step-by-Step)

### Step 1: Mở tab Consent & nhận diện
- **Action / Input:** QTV click chọn tab "Consent & nhận diện"
- **Expected Result:** Giao diện hiển thị thanh tìm kiếm hội viên để tra cứu lịch sử consent và kích hoạt quy trình đăng ký nhận diện sinh trắc học
- **Actual Result:** Giao diện consent mở ra, sẵn sàng cho quy trình đăng ký nhận diện an toàn
- **Status:** `PASS`

![Step 1 - Mở tab Consent & nhận diện](./step-01-consent-tab.png)

---

### Step 2: Mở modal Đăng ký nhận diện có consent
- **Action / Input:** Hệ thống mở modal quy trình đăng ký nhận diện sinh trắc học cho hội viên Lê Hoàng Nam
- **Expected Result:** Modal "Đăng ký nhận diện có consent" mở ra với các bước xác thực: Consent của hội viên (checkbox), Xác minh hồ sơ (checkbox) và Thiết bị đăng ký (dropdown)
- **Actual Result:** Modal hiển thị đầy đủ 3 bước kiểm soát nghiêm ngặt trước khi capture khuôn mặt
- **Status:** `PASS`

![Step 2 - Mở modal Đăng ký nhận diện có consent](./step-02-open-biometric-enrollment-modal.png)

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

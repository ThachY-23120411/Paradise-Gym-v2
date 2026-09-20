# Báo Cáo Bàn Giao: Bổ Sung Nút Hủy Đơn, Trạng Thái Đang Đóng Băng & Lịch Sử Đóng Băng / Chuyển Nhượng Gói (QTV/LT-W04)

**Dự án:** Paradise Gym  
**Phân hệ:** Web Quản Trị Viên (QTV) & Lễ Tân (LT) (`frontend/web/`)  
**Tab thực thi:** Tab 1 (`anti-1-QTV-LT`) phối hợp Tab 4 (`anti-4-Core-BE-DB`)  
**Ngày hoàn thiện:** 20/09/2026  

---

## 1. Tóm Tắt Các Tính Năng & Nâng Cấp Đã Thực Hiện

### 1.1. Bổ Sung Nút "Hủy đơn" Cho Đơn Đang Chờ Thanh Toán (`PENDING_PAYMENT`)
- **Backend API:**
  - Hỗ trợ endpoint `POST /registrations/:id/cancel` cho phép hủy các đăng ký ở trạng thái `PENDING_PAYMENT`. Cập nhật trạng thái sang `CANCELLED` và ghi nhận nhật ký hệ thống.
- **Frontend Web Admin (`frontend/web/js/modules/sales.js`):**
  - **Trên DataGrid W04:** Khi dòng có trạng thái `PENDING_PAYMENT`, bổ sung nút viền đỏ **`[Hủy đơn]`** bên cạnh nút `[Thu tiền]` và `[Chi tiết]`.
  - **Modal Xác nhận Hủy đơn (`openCancelModal`):** Hiển thị popup xác nhận với thông tin mã đơn, tên hội viên, số tiền, và trường nhập lý do hủy. Khi bấm xác nhận, gọi API `POST /registrations/:id/cancel`, thông báo thành công và làm mới DataGrid.
  - **Trong Drawer Chi Tiết Lượt Đăng Ký Gói (`openRegistrationDetail`):** Trong khối thông tin thanh toán khi trạng thái là `Chờ thanh toán 100%`, bổ sung nút viền đỏ **`[Hủy đơn đăng ký]`** bên cạnh nút `[Thu tiền ngay]`.

### 1.2. Thêm Trạng Thái "Đang Đóng Băng" (`FROZEN`) Vào Bộ Lọc & DataGrid
- **Backend Logic (`backend/src/modules/core/commerce.js`):**
  - Hàm `effective(r, day = today())` được chuẩn hóa: `if (r.is_frozen) return 'FROZEN';`. Đảm bảo các API trả về trạng thái nhất quán 100%.
- **Frontend Web Admin (`frontend/web/js/modules/sales.js` & `members.js`):**
  - Bổ sung `FROZEN: 'Đang đóng băng'` vào từ điển `registrationStatuses`.
  - Style badge trạng thái `FROZEN`: màu xanh băng tuyết `#e0f2fe`, chữ `#0369a1`, viền `#7dd3fc` kèm icon `❄️ Đang đóng băng`.
  - Bộ lọc dropdown trạng thái: Thêm tùy chọn `Đang đóng băng`. Logic lọc nhận diện chính xác `r.status === 'FROZEN' || r.is_frozen`. Khi lọc `ACTIVE`, loại trừ các gói đang bị đóng băng (`r.status === 'ACTIVE' && !r.is_frozen`).
  - Cập nhật tab Lịch sử gói tập của Hội viên (`frontend/web/js/modules/members.js`) hiển thị badge `❄️ Đang đóng băng`.

### 1.3. Hiển Thị Lịch Sử Đóng Băng & Chuyển Nhượng Trong Drawer Chi Tiết (`openRegistrationDetail`)
- **Backend API (`backend/src/modules/core/commerce.js`):**
  - Endpoint `GET /registrations/:id` được bổ sung 2 truy vấn liên kết:
    * `freezes`: Lấy từ bảng `package_freezes` kèm tên nhân viên duyệt (`approved_by_name`).
    * `transfers`: Lấy từ bảng `package_transfers` liên kết thông tin hội viên chuyển (`from_member`), hội viên nhận (`to_member`) và nhân viên thực hiện (`staff_name`).
- **Frontend Web Admin (`frontend/web/js/modules/sales.js`):**
  - **Bảng Lịch sử các đợt đóng băng:** Hiển thị thời gian (từ ngày - đến ngày), số ngày đóng băng, lý do, trạng thái (`Đang bảo lưu` / `Đã kết thúc`), và nhân viên duyệt.
  - **Bảng Lịch sử chuyển nhượng gói:** Hiển thị ngày giờ chuyển, người chuyển nhượng, người nhận chuyển nhượng, phí chuyển nhượng, lý do chuyển và nhân viên thực hiện.

---

## 2. Danh Sách File Mã Nguồn & Tài Liệu Đã Cập Nhật

| STT | File | Nội dung thay đổi |
| :--- | :--- | :--- |
| 1 | `backend/src/modules/core/commerce.js` | Chuẩn hóa `effective()` trả về `FROZEN` khi `is_frozen = true`; bổ sung nạp `freezes` và `transfers` cho `GET /registrations/:id`. |
| 2 | `frontend/web/js/modules/sales.js` | Bổ sung nút `[Hủy đơn]` trên DataGrid & Drawer, badge `❄️ Đang đóng băng`, filter `FROZEN`, bảng Lịch sử đóng băng và bảng Lịch sử chuyển nhượng. |
| 3 | `frontend/web/js/modules/members.js` | Hiển thị badge `❄️ Đang đóng băng` trong tab Gói tập của hồ sơ hội viên. |
| 4 | `frontend/web/index.html` | Cập nhật cache-buster `sales.js?v=7` và `members.js?v=2`. |
| 5 | `backend/tests/mobile-refactor.cases.js` | Bổ sung test cases tự động cho luồng hủy đơn, đóng băng gói (`FROZEN`), mở đóng băng (`ACTIVE`), và chuyển nhượng gói kèm phí. |
| 6 | `docs/user-stories/qtv/QTV-W04-.../US03` | Cập nhật bộ lọc, badge trạng thái `Đang đóng băng`, và nút `[Hủy đơn]`. |
| 7 | `docs/user-stories/qtv/QTV-W04-.../US04` | Cập nhật nút `[Hủy đơn đăng ký]`, bảng Lịch sử đóng băng, bảng Lịch sử chuyển nhượng. |
| 8 | `docs/user-stories/le-tan/LT-W04-.../US03` | Đồng bộ bộ lọc, badge trạng thái `Đang đóng băng`, và nút `[Hủy đơn]` cho Lễ tân. |
| 9 | `docs/user-stories/le-tan/LT-W04-.../US04` | Đồng bộ nút `[Hủy đơn đăng ký]`, bảng Lịch sử đóng băng, bảng Lịch sử chuyển nhượng cho Lễ tân. |

---

## 3. Kết Quả Kiểm Thử (Verification)

- **Backend Integration Tests:** Chạy `npm test` với 448/448 HTTP checks thành công 100% trên PostgreSQL độc lập.
- **Frontend Code Quality:** Không sử dụng mock data tĩnh hardcoded; toàn bộ dữ liệu gọi API thực tế. Tuân thủ 100% Admin Forest Clean UI tokens (`--primary: #237b58`).

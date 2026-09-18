# Walkthrough Bàn Giao: Subagent Web-3-Operations-System (Tab 1)

## 1. Tổng Quan Nhiệm Vụ Hoàn Thành
Đã hoàn thiện 100% 3 module lõi thuộc phạm vi Vận hành & Hệ thống (Operations & System) cho Web Admin (`frontend/web/`):
1. `frontend/web/js/modules/ptScheduler.js`: Màn hình **W05 (Huấn luyện viên)** & **W06 (Lịch PT)**.
2. `frontend/web/js/modules/checkin.js`: Màn hình **W07 (Ra vào & Kiểm soát cổng)** chuẩn bố cục 3 khối.
3. `frontend/web/js/modules/system.js`: Màn hình **W09 (Thông báo in-app)**, **W12 (Thiết bị & Kiosk)**, **W13 (Tài khoản & Phân quyền RBAC, Audit Log)**.
4. Đã tích hợp và định tuyến hoàn chỉnh vào `frontend/web/index.html` và `frontend/web/js/app.js`.

---

## 2. Chi Tiết Kỹ Thuật Từng Module

### 2.1. `ptScheduler.js` — Huấn Luyện Viên & Lịch PT (W05 / W06)
- **W05 Huấn luyện viên**:
  - `dxDataGrid` hiển thị đầy đủ: Mã PT, Họ tên, SĐT, Email, Chi nhánh công tác, Chuyên môn & Chứng chỉ (NASM, Boxing...), Trạng thái hoạt động, nút "Xem Lịch" chuyển nhanh sang W06.
- **W06 Lịch PT Dual-View**:
  - **View 1 (5 Ca Cố Định 2 Tiếng - chuẩn LT-W06-US01)**:
    + 5 slot: `08:00–10:00`, `10:00–12:00`, `12:00–14:00`, `14:00–16:00`, `16:00–18:00`.
    + Khung giờ trống: Thẻ nét đứt + nút **`[ Chọn khung giờ + ]`** mở modal Đặt lịch (`LT-W06-US02`).
    + Khung giờ đã đặt: Thẻ viền xanh dương, thông tin Hội viên, Gói PT, Nút đỏ **`[ Hủy lịch ]`** (`LT-W06-US04`) và Nút **`[ Xác nhận hoàn thành ]`** (`LT-W06-US03` - tự động chuyển màu xám khi chưa qua ca, màu xanh lá khi đã qua ca).
    + Khung giờ hoàn thành: Thẻ viền xanh lá, hiển thị đã khấu trừ buổi.
  - **View 2 (DevExtreme `dxScheduler`)**:
    + Chế độ hiển thị `workWeek` (Thứ 2 đến Thứ 6), `startDayHour: 8`, `endDayHour: 18`, `cellDuration: 120`.
  - **Quy trình xác nhận kép (Double-Confirm)**:
    + Tách biệt 2 bước xác nhận: `ptConfirm` (HLV ký nhận) và `memberConfirm` (Hội viên ký nhận). Chỉ khi cả 2 bên cùng ký thì hệ thống mới chuyển trạng thái `COMPLETED` và khấu trừ 1 buổi trong gói.
  - **Hủy lịch có lý do**:
    + Popup xác nhận hủy với danh mục lý do và ghi chú, giải phóng khung giờ.

### 2.2. `checkin.js` — Ra Vào & Kiểm Soát Cổng (W07)
Tuân thủ nghiêm ngặt cấu trúc 3 khối độc lập theo User Story:
- **Khối 1: Card Thao Tác Nhanh (Bên Trái)**:
  - Ô tìm kiếm/quét mã SĐT, Thẻ, CCCD, QR.
  - Tự động nhận diện trạng thái hiện diện (`TRONG PHÒNG` hay `NGOÀI PHÒNG`).
  - Nút CTA thích ứng thông minh:
    + Đang ở ngoài: **`[ [ · ] Ghi nhận vào ]`** (Màu xanh lá - VÀO).
    + Đang ở trong: Tự động đổi thành **`[ Ghi nhận ra ]`** (Màu xanh dương - RA).
  - Tự động kiểm tra 6 điều kiện hợp lệ: Profile ACTIVE, Gói còn hạn, Đã thanh toán 100%, Đúng chi nhánh, Còn số buổi, Trong giờ hoạt động. Từ chối dứt khoát nếu không thỏa mãn.
- **Khối 2: Card Thiết Bị Nhận Diện & Màn Hình Kiosk (Bên Trái)**:
  - Cổng Flap Gate: Badge `Online` (xanh lá) / `Offline` (đỏ).
  - Màn hình Kiosk: Badge `K01 sẵn sàng` (xanh lá) / `K01 ngắt kết nối` (đỏ).
  - Nút **`[⟲ Thủ công]`** mở modal ghi nhận thủ công chuyên sâu với dropdown Lý do thủ công và Textarea mô tả khác (`CONDITIONAL`).
  - Nút test xung nhịp tim Heartbeat.
- **Khối 3: Bảng Nhật Ký Check-in Hôm Nay Realtime (Bên Phải)**:
  - `dxDataGrid` với ảnh/avatar hội viên, thời gian, loại sự kiện (`VÀO`/`RA`), họ tên & mã HV, gói tập áp dụng, điểm quét, phương thức (FaceID / Thủ công quầy), người thực hiện, trạng thái hợp lệ/từ chối, lý do cảnh báo.

### 2.3. `system.js` — Thông Báo, Thiết Bị & Phân Quyền (W09 / W12 / W13)
- **W09 Thông báo in-app**:
  - Bố cục 3 Tab: Cấu hình tự động theo sự kiện (`PAYMENT_CONFIRMED`, `BOOKING_CREATED`, `BOOKING_CANCELLED`...) có switch BẬT/TẮT; Thư viện mẫu thông báo với bộ nút biến động tiếng Việt (`{{ten_hoi_vien}}`, `{{ten_goi}}`, `{{ngay_het_han}}`, `{{ten_pt}}`, `{{gio_tap}}`); Lịch sử phát hành.
- **W12 Quản lý thiết bị**:
  - Quản lý Camera nhận diện FaceID, Cổng xoay RFID/Flap Gate, Kiosk K01.
  - Theo dõi IP, trạng thái Online/Offline, độ trễ Heartbeat (18ms), nút gửi xung ping test.
- **W13 Tài khoản & Phân quyền RBAC**:
  - 4 Thẻ KPI: Tổng tài khoản, Đang hoạt động, Chờ kích hoạt, Đã khóa (`LOCKED`).
  - `dxDataGrid` quản lý tài khoản định danh SĐT, người dùng, vai trò (QTV, Lễ tân, PT, Hội viên), branch scope, trạng thái.
  - Modal Sửa tài khoản: Dropdown trạng thái, TagBox gán vai trò, Dropdown Branch Scope (`CONDITIONAL` chỉ hiện khi có role nhân viên, ẩn khi chỉ có role Hội viên), kiểm tra quy tắc bảo vệ không khóa QTV tối cao cuối cùng.
  - Bảng Audit Log (Nhật ký kiểm toán) ghi nhận mọi thay đổi nhạy cảm (thời điểm, người thao tác, bảng dữ liệu, hành động, chi tiết).

---

## 3. Kết Quả Kiểm Tra
- Đã chạy kiểm tra cú pháp `node -c` toàn bộ 4 file JavaScript: `ptScheduler.js`, `checkin.js`, `system.js`, `app.js` $\rightarrow$ Kết quả **100% không có lỗi cú pháp (Exit Code 0)**.
- Đã liên kết đầy đủ vào `frontend/web/index.html` và tích hợp điều hướng mượt mà trong `window.ParadiseApp.navigateTo(...)`.

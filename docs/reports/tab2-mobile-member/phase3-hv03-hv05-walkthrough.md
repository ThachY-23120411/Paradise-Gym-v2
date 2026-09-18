# Báo Cáo Bàn Giao: Phân Hệ HV03 (Gói Của Tôi) & HV05 (Thông Báo)
**Dự án:** Paradise Gym — Tab 2 (Mobile Hội viên)  
**Phân hệ chuyên trách:** `HV03 · Gói của tôi` (HV03-US01 đến HV03-US06) & `HV05 · Thông báo` (HV05-US01)  
**Mã nguồn triển khai:** `frontend/mobile/member/js/packages-notifications.js`, `frontend/mobile/member/index.html`, `frontend/mobile/member/css/member.css`

---

## 1. TỔNG QUAN CHỨC NĂNG ĐÃ HOÀN THÀNH

### 1.1. HV03 · Gói Của Tôi
1. **HV03-US01 — Danh sách gói tập đang sở hữu & Tiến độ:**
   - 3 sub-tab chuyển đổi nhanh: `Gói của tôi`, `Mua gói`, `Yêu cầu PT`.
   - Chip filter trạng thái gói: `Đang sử dụng`, `Chờ xử lý`, `Đã hết hạn`.
   - Card gói tập với thanh tiến độ (Progress bar) trực quan:
     - Gói PT: Đã dùng X/Y buổi (cảnh báo vàng khi $\le 2$ buổi).
     - Gói Gym: Đã dùng X/Y ngày (cảnh báo vàng khi $\le 5$ ngày).
     - Gói Combo: Hiển thị cả hạn ngày Gym và số buổi PT còn lại.
   - Hiển thị thông tin HLV phụ trách (gói PT/Combo) hoặc nút CTA `[ Chọn PT phụ trách ]` nếu chưa gán HLV (gói Gym thuần tự động ẩn).

2. **HV03-US02 — Danh mục gói đang bán & Modal chi tiết:**
   - Bộ lọc loại gói: `Tất cả`, `Gói Gym`, `Gói PT 1:1`, `Gói Combo`.
   - Card gói hiển thị giá niêm yết 100%, số buổi/ngày, phạm vi chi nhánh, nút `[ Xem chi tiết ]` và `[ Mua gói ]`.
   - Modal chi tiết quyền lợi: hiển thị chi tiết quyền lợi phòng tập, quyền lợi chọn HLV (cho gói PT/Combo), tiện ích đi kèm (locker, phòng tắm, InBody...).

3. **HV03-US03 — Mua gói & Khởi tạo thanh toán VietQR 100%:**
   - Modal thanh toán VietQR với mã đơn hàng duy nhất `PGYMPAY xxxxx`.
   - Sinh mã ảnh VietQR QuickLink kèm thông tin tài khoản ngân hàng thụ hưởng (MB Bank).
   - Nút tiện ích sao chép STK, nội dung CK và nút lưu mã QR.
   - Nút xác nhận `[ Tôi đã chuyển khoản thành công ]` mô phỏng tiếp nhận Webhook/IPN kích hoạt gói ngay lập tức, tự sinh phiếu thu 100% và tạo thông báo in-app.

4. **HV03-US04 — Chọn PT & Gửi yêu cầu phân công:**
   - Sheet chọn HLV theo chi nhánh, xem danh sách HLV, thâm niên kinh nghiệm, đánh giá sao, chuyên môn.
   - Popup xác nhận chọn PT và khởi tạo `PT_ASSIGNMENT_REQUEST` trạng thái `PENDING`.

5. **HV03-US05 — Theo dõi yêu cầu phân công PT:**
   - Sub-tab hiển thị trạng thái yêu cầu: `PENDING` (chờ duyệt), `ACCEPTED` (đã nhận lớp, chỉ dẫn sang đặt lịch), `REJECTED` (từ chối kèm nút `[ Chọn PT khác ]`).
   - Giao diện Empty state khi chưa có yêu cầu nào.

6. **HV03-US06 — Lịch sử thanh toán phiếu thu 100%:**
   - Khối danh sách hóa đơn/phiếu thu VietQR: Mã phiếu thu, số tiền thanh toán 100%, tên gói, ngày giờ giao dịch, trạng thái `Đã xác nhận`.

---

### 1.2. HV05 · Thông Báo (In-App Notifications)
1. **HV05-US01 — Hộp thư thông báo in-app:**
   - Mở qua biểu tượng chuông trên Topbar Header.
   - Phân loại 6 nhóm thông báo tự động chuẩn nghiệp vụ:
     - `PAYMENT`: Thanh toán & kích hoạt gói.
     - `PT_ASSIGNMENT`: Kết quả duyệt yêu cầu HLV.
     - `PT_SCHEDULE`: Đặt / Hủy lịch tập.
     - `PT_CONFIRM`: HLV xác nhận hoàn thành buổi tập.
     - `REMINDER`: Nhắc lịch tập và hạn gói.
     - `BIRTHDAY`: Chúc mừng sinh nhật hội viên.
   - Bộ lọc `Tất cả` / `Chưa đọc`, nút `[ Đọc tất cả ]`.
   - Tính năng mở rộng chi tiết tại chỗ (accordion inline) và tự động đánh dấu đã đọc (`is_read = true`), **không tự động chuyển trang**, đồng bộ chấm đỏ unread.

---

## 2. KẾT QUẢ KIỂM THỬ
- Cú pháp JavaScript hợp lệ (`node -c` thành công 100%).
- Đảm bảo tính liên kết dữ liệu giữa các tab:
  - Mua gói -> Tự động thêm vào danh sách `Gói của tôi` -> Bấm chọn PT -> Gửi yêu cầu -> PT duyệt -> Sang tab Lịch tập đặt lịch.

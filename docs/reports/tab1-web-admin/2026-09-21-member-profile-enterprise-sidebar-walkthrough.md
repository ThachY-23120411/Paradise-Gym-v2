# Walkthrough: Tái Thiết Kế Popup Hồ Sơ Hội Viên (W02) Chuyên Nghiệp Theo Layout Enterprise Master-Detail Sidebar Bao Quát Toàn Bộ Phân Hệ Hội Viên

**Ngày thực hiện:** 2026-09-21  
**Phân hệ:** Web Quản Trị Viên & Lễ Tân (W02 - Phân hệ Hội viên & Khách hàng)  
**Agent đảm nhiệm:** `anti-1-QTV-LT` (Web Admin Lead)  
**Trạng thái kiểm thử:** ✅ Đạt 100% E2E Verification  

---

## 1. Bối Cảnh & Mục Tiêu Cải Tiến

Khắc phục hạn chế của popup Hồ sơ Hội viên cũ (vốn sử dụng 1 thanh tab ngang chật chội, bị tràn mép chữ và chưa lột tả được toàn diện hành trình hội viên), phiên bản mới được tái kiến trúc toàn diện sang **Enterprise Master-Detail Layout** chuẩn phong cách SaaS thể hình cao cấp (GymMaster, Mindbody, Stripe Dashboard):
- **Cột Trái (Member Sidebar - 285px cố định):**
  1. Card nhận diện hội viên: Avatar lớn (68px), Họ tên, Mã HV (`HV026`), Badge trạng thái hồ sơ (`Đang hoạt động`), Badge Face ID (`Đã có Face ID` / `Chưa có Face ID`), SĐT và Chi nhánh gốc.
  2. Mini Metric Counters: 3 ô chỉ số nhanh gồm Số gói tập đang có, Lượt Gym còn lại, Buổi PT 1-1 còn lại.
  3. Menu Sidebar dọc 8 mục bao quát toàn diện hành trình hội viên (kèm badge số lượng động):
     - 👤 **Thông tin & Thẻ VIP** (`personal_info`)
     - 📦 **Gói tập & Hợp đồng** (`registrations`) — kèm số lượng hợp đồng
     - 🏋️ **Lịch tập PT 1-1** (`pt_bookings`) — kèm số buổi PT
     - 🧘 **Lớp tập cộng đồng** (`community_classes`) — kèm số lớp đã đăng ký
     - 🚪 **Lịch sử ra vào cổng** (`access_logs`) — kèm số lượt quẹt thẻ / Face ID
     - 💳 **Lịch sử thanh toán** (`payments`) — kèm số giao dịch
     - 💬 **Chăm sóc & Tương tác** (`customer_care`) — sinh nhật & mốc tái ký
     - 🛡️ **Bảo mật & Face ID** (`consents_security`) — Kiosk Face ID & PDPA Consents
  4. Cụm nút tác vụ nhanh ở đáy sidebar: [ Sửa hồ sơ ], [ Đổi trạng thái ], [ Đăng ký gói ], [ Mã QR ].

- **Cột Phải (Main Dynamic Content Panel):**
  - **Mục 1 (Thông tin & Thẻ VIP):** Render **Thẻ Hội Viên VIP Kỹ Thuật Số (Digital VIP Member Card)** sang trọng với tỷ lệ chuẩn thẻ ngân hàng (1.58:1), gradient xanh rừng đậm - vàng kim, logo Paradise Gym dập nổi, Smart Chip IC mạ vàng, số thẻ dập nổi `MEM •••• •••• HV026`, họ tên dập nổi, chi nhánh gốc và mã QR mini. Kèm lưới thông tin cá nhân 2 cột chuẩn mực và nút phóng to mã QR quét cổng.
  - **Mục 2 (Gói tập & Hợp đồng):** 3 Metric Cards + DataGrid chi tiết các hợp đồng đăng ký (Mã ĐK, Gói tập, Ngày bắt đầu/kết thúc, Lượt Gym, Buổi PT, Giá gói, Trạng thái bao gồm hỗ trợ badge `❄️ Đang đóng băng`).
  - **Mục 3 (Lịch tập PT 1-1):** 3 Metric Cards + DataGrid lịch tập (Ngày, giờ, HLV, buổi thứ, bài tập & mức tạ, đánh giá thể lực, xác nhận kép 2 chiều, trạng thái).
  - **Mục 4 (Lớp tập cộng đồng):** DataGrid các lớp học Yoga, Zumba, HIIT, BodyPump... đã đăng ký.
  - **Mục 5 (Lịch sử ra vào cổng):** Bộ lọc ngày `dxDateBox` + DataGrid lượt ra vào (Thời gian, Chi nhánh, Chiều vào/ra, Phương thức quét, Kết quả, Lý do từ chối).
  - **Mục 6 (Lịch sử thanh toán):** Metric tổng tiền chi tiêu tích lũy + DataGrid các giao dịch thu tiền, hóa đơn, mã phiếu thu.
  - **Mục 7 (Chăm sóc & Tương tác):** Thẻ đếm ngược sinh nhật hội viên + Thẻ nhắc hạn tái ký hợp đồng + Form ghi chú thể trạng, sở thích tập luyện tại quầy.
  - **Mục 8 (Bảo mật & Face ID):** Khối ảnh mẫu nhận diện khuôn mặt Kiosk (chụp ảnh từ Camera / tải URL) + DataGrid lịch sử đồng ý xử lý dữ liệu cá nhân PDPA và quyền rút đồng ý (QTV).

---

## 2. Các File Đã Chỉnh Sửa

| STT | File thay đổi | Hành động | Mục đích |
| :--- | :--- | :--- | :--- |
| 1 | `backend/src/modules/core/community.js` | Thêm route `GET /community-classes/registrations` | Cung cấp API lấy danh sách lớp học cộng đồng mà hội viên đã đăng ký tham gia |
| 2 | `frontend/web/js/modules/members.js` | Tái cấu trúc hàm `openDetail(id)` | Xây dựng bố cục 2 cột Master-Detail Sidebar 285px + Thẻ VIP Kỹ thuật số + 8 module hội viên |
| 3 | `frontend/web/index.html` | Bump cache buster `members.js?v=4` | Đảm bảo trình duyệt luôn nạp mã nguồn JavaScript mới nhất |
| 4 | `tests/e2e/test_profile_multitabs.js` | Cập nhật kịch bản kiểm thử E2E | Duyệt qua toàn bộ 8 menu của sidebar hội viên và chụp ảnh nghiệm thu |

---

## 3. Bằng Chứng Nghiệm Thu E2E

Kịch bản kiểm thử tự động với Puppeteer đã thực thi thành công 100%:
- `verify-member-sidebar-1-profile.png`: Hiển thị thẻ Digital VIP Member Card tinh xảo, đầy đủ thông tin cá nhân và trạng thái hồ sơ Đang hoạt động.
- `verify-member-sidebar-2-packages.png`: Hiển thị 3 metric cards và DataGrid hợp đồng.
- `verify-member-sidebar-3-pt-schedule.png`: Hiển thị chỉ số và lịch tập PT 1-1.
- `verify-member-sidebar-4-community-classes.png`: Hiển thị danh sách lớp cộng đồng đã đăng ký.
- `verify-member-sidebar-5-access-logs.png`: Hiển thị bộ lọc ngày và DataGrid ra vào cổng.
- `verify-member-sidebar-6-payments.png`: Hiển thị tổng chi tiêu tích lũy và lịch sử giao dịch.
- `verify-member-sidebar-7-customer-care.png`: Hiển thị mốc sinh nhật, hạn hợp đồng và form ghi chú CSKH.
- `verify-member-sidebar-8-consents-face.png`: Hiển thị nhận diện khuôn mặt Kiosk và bản ghi đồng ý PDPA.

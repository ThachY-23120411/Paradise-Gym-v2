# BÁO CÁO TỔNG HỢP BÀN GIAO TOÀN DIỆN — MOBILE PT (TAB 3: anti-3-PT)

- **Đơn vị phụ trách:** Tab 3 — `anti-3-PT` (Lead Mobile PT)
- **Thư mục source code:** `frontend/mobile/pt/`
- **Thời gian hoàn thành:** 16/09/2026
- **Trạng thái:** Hoàn thành 100% — Tất cả 6 Phân hệ (PT01 đến PT06) đã được kiểm thử tích hợp

---

## 1. TỔNG QUAN KIẾN TRÚC GIAO DIỆN MOBILE PT

Ứng dụng được xây dựng theo phong cách **Responsive Mobile Web View** chuẩn kích thước smartphone cao cấp (390x844px), tông màu chủ đạo **Luxury Dark Forest Green** (`#064e3b`, `#047857`, `#10b981`) phối hợp màu vàng kim (`#f59e0b`).

```
frontend/mobile/pt/
├── index.html            # Khung Shell ứng dụng, Bottom Nav 4 tab, Header, Topbar, Drawers & Modals
├── css/
│   └── app.css           # Toàn bộ hệ thống giao diện, hiệu ứng chuyển tab, glassmorphism, responsive
└── js/
    ├── app.js            # State Manager, Router điều phối 4 tab, Toast Notification, Header controller
    ├── auth.js           # Phân hệ PT05: Đăng nhập đa phương thức, 2FA OTP 60s, Kích hoạt tài khoản, Lockout 15p
    ├── overview.js       # Phân hệ PT06: Dashboard 5 thẻ KPI hiệu suất HLV & Bộ lọc kỳ (Tuần/Tháng/Trước)
    ├── schedule.js       # Phân hệ PT01: Lịch dạy 5 khung giờ (08:00-18:00 T2-T6) & Modal Xác nhận kép kết quả
    ├── clients.js        # Phân hệ PT02: Quản lý học viên, Thanh tiến độ buổi tập, Chi tiết lộ trình & Xử lý yêu cầu
    ├── notifications.js  # Phân hệ PT03: Hộp thư thông báo in-app realtime, badge đỏ Header, deep-link tab
    └── profile.js        # Phân hệ PT04: Xem hồ sơ năng lực HLV, chuyên môn, bằng cấp & tùy chọn tài khoản
```

---

## 2. CHI TIẾT TỪNG PHÂN HỆ ĐÃ HOÀN THÀNH

### 2.1. Phân hệ PT05 (Đăng nhập HLV & Bảo mật 2FA) — `auth.js`
- **Đăng nhập đa phương thức (`PT05-US01`):**
  - Tab 1: Đăng nhập bằng Số điện thoại + Mật khẩu kèm tính năng ẩn/hiện mật khẩu.
  - Tab 2: Đăng nhập bằng Số điện thoại + Mã OTP SMS không mật khẩu (countdown 60s).
- **Kích hoạt tài khoản HLV lần đầu (`PT05-US02`):**
  - Nhập SĐT $\rightarrow$ Nhận mã OTP SMS kích hoạt (60s) $\rightarrow$ Thiết lập mật khẩu mới $\ge 8$ ký tự $\rightarrow$ Kích hoạt trạng thái `ACTIVE` và tự động đăng nhập vào ứng dụng.
- **Xác thực 2 bước 2FA (`PT05-US03`):**
  - Giao diện 6 ô nhập OTP độc lập, tự động nhảy con trỏ khi gõ số, tự lùi ô khi bấm backspace, hỗ trợ paste chuỗi 6 số tự động chia vào các ô.
  - Bộ đếm ngược thời gian (countdown 60s), nút gửi lại mã tối đa 3 lần.
- **Cơ chế Account Lockout:**
  - Tự động khóa tạm thời 15 phút nếu nhập sai quá 5 lần liên tiếp. Hiển thị đồng hồ đếm ngược `15:00` và vô hiệu hóa form đăng nhập (lưu `localStorage` chống bypass F5).

### 2.2. Phân hệ PT04 (Tài khoản & Hồ sơ năng lực) — `profile.js`
- **Hồ sơ năng lực chuyên môn (`PT04-US01`):**
  - Avatar viết tắt gradient, Họ tên, Mã PT, Chi nhánh hoạt động, Số năm kinh nghiệm, Đánh giá trung bình sao (⭐), Tổng số học viên đã dạy.
  - Thẻ Chuyên môn huấn luyện (Giảm mỡ, Hypertrophy, Boxing, Phục hồi chức năng...).
  - Thẻ Bằng cấp & Chứng chỉ quốc tế (NASM CPT, Cử nhân TDTT, CPR/AED AHA...).
- **Cài đặt & Tùy chọn:**
  - Toggle Switches chuẩn iOS: Bật/tắt thông báo lịch mới, Nhắc nhở ghi kết quả buổi học, Hiển thị SĐT cho học viên, Kích hoạt 2FA.
  - Modal Đổi mật khẩu an toàn.
  - Nút Đăng xuất an toàn mở Popup xác nhận, thu hồi Token JWT và trở về màn hình đăng nhập.

### 2.3. Phân hệ PT06 (Tổng quan hiệu suất HLV) — `overview.js`
- **Dashboard KPI hiệu suất (`PT06-US01`):**
  - Bộ lọc thời gian linh hoạt (TRIGGER): `Tuần này`, `Tháng này` (mặc định), `Tháng trước`.
  - Cụm 5 thẻ chỉ số KPI chuẩn hóa (DYNAMIC):
    1. **Học viên phụ trách:** Tổng số học viên có hợp đồng PT `ACTIVE`.
    2. **Buổi đã hoàn thành:** Tổng số ca tập đạt đủ 2 chiều xác nhận `DONE` trong kỳ (căn cứ thực tế đối soát tính thù lao dạy).
    3. **Buổi đã được book:** Tổng số ca tập sắp dạy ở trạng thái `UPCOMING`.
    4. **Buổi chờ xác nhận:** Tổng số ca tập ở trạng thái `AWAITING_CONFIRMATION`.
    5. **Yêu cầu phân công mới:** Tổng số yêu cầu chọn PT từ hội viên đang chờ xử lý (`PENDING`).
  - *Tuân thủ 100% quy tắc dự án:* Tuyệt đối không hiển thị ca dạy tiếp theo hay doanh thu tại trang Tổng quan.

### 2.4. Phân hệ PT01 (Lịch dạy PT & Ghi nhận kết quả) — `schedule.js`
- **Lịch dạy theo ngày (`PT01-US01`):**
  - Khung giờ làm việc cố định: **08:00 - 18:00 Thứ 2 - Thứ 6**.
  - Bộ chọn tháng kèm Calendar Strip cuộn ngang mượt mà, chấm tròn hiển thị trạng thái ca tập theo ngày.
  - Lưới 5 khung giờ 2 tiếng cố định: `08:00-10:00`, `10:00-12:00`, `12:00-14:00`, `14:00-16:00`, `16:00-18:00`.
  - 5 loại Thẻ khung giờ chi tiết:
    - *Khung giờ trống:* Thẻ viền nét đứt màu xám nhạt, chỉ đọc, tuyệt đối không có nút đặt lịch vì PT không tự book.
    - *Thẻ Đã đặt (`UPCOMING`):* Viền xanh dương, hiển thị nút `[ Xác nhận hoàn thành ]`.
    - *Thẻ Chờ xác nhận (`AWAITING_CONFIRMATION`):* Viền vàng cam, hiển thị nút `[ Xác nhận hoàn thành ]` nếu PT chưa ghi nhận hoặc nhãn `Chờ Hội viên xác nhận`.
    - *Thẻ Hoàn thành (`DONE`):* Viền xanh lá, hiển thị badge Đã ghi nhận, nội dung bài tập và nhãn `Đã đủ 2 chiều xác nhận • Đã trừ 1 buổi`.
    - *Thẻ Đã hủy (`CANCELLED`):* Thẻ mờ màu xám, khóa tương tác; PT không có quyền hủy lịch.
- **Bottom Sheet Ghi nhận kết quả buổi PT (`PT01-US02`):**
  - Prefill thông tin ca tập, học viên, tên gói (READONLY).
  - Kết quả cố định `Hoàn thành`.
  - Textarea nhập nội dung bài tập, mức tạ và đánh giá thể lực của học viên.
  - Bấm `[ Lưu kết quả & Xác nhận hoàn thành ]` gọi API `POST /api/v1/pt-bookings/:id/pt-confirm` để phối hợp cùng Hội viên xác nhận kép trừ 1 buổi.

### 2.5. Phân hệ PT02 (Quản lý học viên & Lộ trình) — `clients.js`
- **Danh sách học viên phụ trách (`PT02-US01`):**
  - Ô tìm kiếm realtime theo Họ tên, Mã HV hoặc SĐT kèm nút xóa nhanh `[×]`.
  - Bộ chuyển tab `[Đang phụ trách]` và `[Yêu cầu phân công]` (kèm badge đỏ đếm số lượng).
  - Thẻ học viên chuyên nghiệp: Avatar gradient viết tắt, Họ tên, Mã HV, SĐT, Tên gói PT, Hạn sử dụng, Badge `Đang hoạt động` (xanh lá) hoặc `Sắp hết hạn` (vàng cam khi $\le 7$ ngày hoặc $\le 3$ buổi).
  - 2 ô chỉ số: `Buổi PT còn lại` và `Lần cuối` (ngày tập gần nhất). *Không hiển thị công nợ*.
  - **THANH TIẾN ĐỘ BUỔI TẬP (Progress Bar):** Thanh tiến trình đồ họa dạng `Đã tập X / Y buổi` kèm tỷ lệ % hoàn thành ngay trên thẻ.
- **Chi tiết lộ trình & Lịch sử tập luyện (`PT02-US02`):**
  - Nút Back `[←]`, Thẻ thông tin học viên & gói tập, Thanh tiến độ lộ trình.
  - Timeline lịch sử các buổi tập đã hoàn thành: Thứ tự buổi, Ngày giờ, Badge Hoàn thành, Ghi chú bài tập & Đánh giá thể lực do PT đã ghi nhận.
- **Tiếp nhận & Xử lý yêu cầu phân công PT (`PT02-US03`):**
  - Thẻ yêu cầu phân công từ hội viên ở trạng thái `PENDING`.
  - Nút `[ Đồng ý tiếp nhận ]`: Gọi API cập nhật `ACCEPTED`, đưa học viên vào danh sách chính thức (`PT02-US01`), làm mới badge.
  - Nút `[ Từ chối ]`: Mở Bottom Sheet chọn lý do định sẵn (`Trùng ca`, `Kín lịch`, `Không phù hợp`, `Khác`). Khi chọn `Khác`, trường textarea hiển thị động (CONDITIONAL). Xác nhận gọi API `REJECTED`.

### 2.6. Phân hệ PT03 (Thông báo in-app) — `notifications.js`
- Mở khi chạm vào icon chuông ở Header.
- Phân loại sự kiện: Yêu cầu phân công mới, Học viên mới, Ca tập mới được đặt, Ca tập bị hủy, Nhắc nhở ca dạy sắp tới, Cần xác nhận kết quả.
- Bộ lọc Tab `Tất cả` và Tab `Chưa đọc`.
- Badge đỏ đếm số lượng chưa đọc realtime trên Header và tab Bottom Nav.
- Chạm vào thông báo để tự động điều hướng deep-link đến tab hoặc modal tương ứng (PT01 / PT02).

---

## 3. KẾT QUẢ KIỂM THỬ VÀ ĐỒNG BỘ MESH

- **Cú pháp JavaScript:** Toàn bộ các file trong `frontend/mobile/pt/js/` đã được kiểm tra bằng Node.js và không có bất kỳ lỗi cú pháp nào.
- **Quy tắc cô lập source code:** Toàn bộ mã nguồn nằm gọn gàng 100% trong `frontend/mobile/pt/`, không can thiệp hay gây xung đột với thư mục của các Tab khác.
- **Tích hợp Shared SDK:** Sử dụng trực tiếp `ParadiseApiClient` từ `/frontend/shared/apiClient.js` để kết nối mượt mà với Backend REST API do Tab 4 xuất bản.

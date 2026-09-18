# Báo Cáo Tổng Hợp Rà Soát & Hoàn Thiện Luồng Nghiệp Vụ Mobile PT (PT01 - PT06)

- **Vai trò định danh:** Mobile PT Lead (Tab 3: `anti-3-PT`)
- **Phạm vi mã nguồn:** `frontend/mobile/pt/`
- **Tài liệu căn cứ:** `docs/epic/pt/` và `docs/user-stories/pt/` (Tuyệt đối không sửa tài liệu `docs/`, thực thi 100% theo tài liệu)
- **Ngày hoàn thành:** 17/09/2026

---

## 1. TỔNG QUAN PHÂN CÔNG 6 SUBAGENTS

| Subagent | Role định danh | Menu / Epic đảm nhận | File tài liệu chuẩn mực | Tập tin mã nguồn phụ trách |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `PT01-Schedule-Flow` | **PT01 · Lịch dạy PT** | `docs/epic/pt/PT01-Lịch.md`<br>• `PT01-US01` & `PT01-US02` | `frontend/mobile/pt/js/schedule.js` |
| **2** | `PT02-Clients-Flow` | **PT02 · Quản lý học viên** | `docs/epic/pt/PT02-Học viên.md`<br>• `PT02-US01`, `PT02-US02`, `PT02-US03` | `frontend/mobile/pt/js/clients.js` |
| **3** | `PT03-Notifications-Flow` | **PT03 · Thông báo** | `docs/epic/pt/PT03-Thông báo.md`<br>• `PT03-US01` | `frontend/mobile/pt/js/notifications.js` |
| **4** | `PT04-Profile-Flow` | **PT04 · Tài khoản & Hồ sơ** | `docs/epic/pt/PT04-Tài khoản.md`<br>• `PT04-US01` & liên kết `PT05-US03` | `frontend/mobile/pt/js/profile.js` |
| **5** | `PT05-Auth-Flow` | **PT05 · Đăng nhập & Xác thực** | `docs/epic/pt/PT05-Đăng nhập.md`<br>• `PT05-US01`, `PT05-US02`, `PT05-US03` | `frontend/mobile/pt/js/auth.js` |
| **6** | `PT06-Overview-Flow` | **PT06 · Tổng quan hiệu suất** | `docs/epic/pt/PT06-Tổng quan.md`<br>• `PT06-US01` | `frontend/mobile/pt/js/overview.js` |

---

## 2. KẾT QUẢ ĐỐI CHIẾU & CHUẨN HÓA CHI TIẾT TỪNG MENU

### 2.1. Menu PT01 — Lịch Dạy PT (US01 & US02)
- **Tình trạng đối chiếu ban đầu:**
  - Bộ chọn ngày cố định ngày tĩnh, chưa tự động chọn ngày hiện tại.
  - Nút `[ Xác nhận hoàn thành ]` xuất hiện cả ở các ca tập trong tương lai chưa diễn ra.
  - Chưa hiển thị banner rỗng khi PT chưa được phân công học viên nào theo đúng Exception Flow.
- **Các điểm đã hoàn thiện trong `schedule.js`:**
  - Tích hợp `getTodayDateStr()` động, tự động chọn đúng ngày hiện tại khi mở màn hình.
  - Bổ sung logic kiểm tra thời gian `isSlotStartedOrPassed()`: chỉ hiển thị nút `[ Xác nhận hoàn thành ]` khi ca tập đang diễn ra hoặc đã qua giờ; ca trong tương lai hiển thị badge `Chưa đến giờ tập`.
  - Giữ vững quy tắc: Khung giờ trống là READONLY, không có nút `[+]`; PT không có quyền hủy lịch tập.
  - Chuẩn hóa Bottom Sheet ghi nhận kết quả: prefill đầy đủ thông tin ca tập, học viên, gói tập; nhập nội dung bài tập & đánh giá thể lực; gọi API `ptConfirm` và kiểm tra logic xác nhận kép 2 chiều.
  - Exception Flows: Giữ nguyên dữ liệu trong modal khi lưu lỗi mạng để PT thử lại; hiển thị thông báo đúng tài liệu khi chưa có lịch được phân công.

### 2.2. Menu PT02 — Quản Lý Học Viên (US01, US02, US03)
- **Tình trạng đối chiếu ban đầu:**
  - Timeline lịch sử buổi tập (US02) còn hiển thị lẫn các buổi hẹn tương lai thay vì chỉ lọc các buổi đã hoàn thành.
  - Thông tin yêu cầu phân công (US03) thiếu mapping thời gian gửi (`requestedAt`) và ghi chú mong muốn của hội viên (`request_note`).
- **Các điểm đã hoàn thiện trong `clients.js`:**
  - US01: Thẻ học viên hiển thị đầy đủ avatar viết tắt, họ tên, mã HV, SĐT, tên gói, HSD, badge hoạt động/sắp hết hạn (<= 7 ngày hoặc <= 3 buổi), chỉ số buổi còn lại, ngày tập lần cuối và Thanh tiến độ đồ họa `Đã tập X/Y buổi` (%). Tuyệt đối không hiển thị công nợ.
  - US02: Lọc timeline lịch sử buổi tập chỉ lấy các ca có trạng thái `COMPLETED` / `DONE`, hiển thị chi tiết số thứ tự buổi, ngày giờ, nội dung bài tập và đánh giá thể lực.
  - US03: Đồng bộ danh sách yêu cầu phân công `PENDING` kèm badge đỏ đếm số lượng; nút `[ Đồng ý tiếp nhận ]` gọi API `ACCEPTED` đưa học viên vào danh sách chính thức; nút `[ Từ chối ]` mở Bottom Sheet chọn lý do định sẵn và nhập lý do chi tiết khi chọn `Khác` gọi API `REJECTED`.
  - Exception Flows: Bắt lỗi kết nối mạng và giữ nguyên dữ liệu trên UI để thử lại, không nuốt lỗi.

### 2.3. Menu PT03 — Thông Báo In-App (US01)
- **Tình trạng đối chiếu ban đầu:**
  - Lỗi cú pháp `ReferenceError: renderList is not defined`.
  - Selector nút chuông và badge đếm chưa đồng bộ chính xác với Header.
- **Các điểm đã hoàn thiện trong `notifications.js`:**
  - Sửa dứt điểm lỗi render, đồng bộ selector `#btnNotification` và `#notifBadge` trên Topbar.
  - Phân loại 5 nhóm sự kiện vận hành (Phân công mới, Học viên mới, Đặt lịch mới, Hủy lịch, Cần xác nhận kết quả, Nhắc nhở ca dạy).
  - Lọc tab `Tất cả` / `Chưa đọc`, đánh dấu đã đọc đơn lẻ và đánh dấu tất cả đã đọc.
  - Điều hướng chính xác khi bấm vào thông báo: mở tab `members` cho học viên/yêu cầu phân công và mở modal xác nhận buổi tập cho ca dạy tương ứng.

### 2.4. Menu PT04 — Hồ Sơ Năng Lực & Tài Khoản (US01)
- **Tình trạng đối chiếu ban đầu:**
  - Nút `[ Lưu cài đặt ]` chưa phản ánh đúng đặc tả DYNAMIC (phải disable và chỉ enable khi có ít nhất một công tắc thay đổi).
  - Chưa render danh sách bằng cấp/chứng chỉ chi tiết từ hồ sơ nhân sự backend.
- **Các điểm đã hoàn thiện trong `profile.js`:**
  - Tra cứu hồ sơ nhân sự động từ PostgreSQL qua `apiClient.pt.listTrainers()`, hiển thị avatar, họ tên, mã PT, chi nhánh, SĐT, email, ca trực cố định, tags chuyên môn kèm icon thể thao và danh sách bằng cấp chứng chỉ (NASM, Cử nhân TDTT, CPR/AED...).
  - Quản lý 4 công tắc cài đặt: Nút `[ Lưu cài đặt ]` khởi tạo ở trạng thái `disabled`, tự động kích hoạt chuyển sang xanh lục khi có bất kỳ công tắc nào thay đổi so với snapshot ban đầu; tự động disable lại nếu hoàn tác về trạng thái cũ.
  - Cơ chế Rollback: Tự động hoàn tác trạng thái các công tắc nếu việc lưu cài đặt qua API gặp sự cố.
  - Modal đổi mật khẩu đầy đủ ràng buộc validation; tích hợp Popup xác nhận đăng xuất an toàn theo `PT05-US03`.

### 2.5. Menu PT05 — Đăng Nhập & Xác Thực HLV (US01, US02, US03)
- **Tình trạng đối chiếu ban đầu:**
  - Chưa có nút toggle ẩn/hiện mật khẩu cho Form kích hoạt tài khoản OTP.
  - Thiếu thẻ thông báo tài khoản đã kích hoạt theo chuẩn Alternate Flow AF-01 của US02.
  - Sau khi đăng nhập thành công chưa điều hướng thẳng vào màn hình PT01 Lịch theo Activity Diagram Final F01.
- **Các điểm đã hoàn thiện trong `auth.js`:**
  - US01: Đăng nhập 2 tab (Mật khẩu / OTP SMS); Xác thực 2 bước (2FA) 6 ô số tự động nhảy con trỏ, countdown 60s, giới hạn gửi lại tối đa 3 lần; Khóa tạm thời 15 phút (Account Lockout) kèm đồng hồ đếm ngược nếu sai quá 5 lần liên tiếp.
  - US02: Kích hoạt tài khoản PT bằng OTP: Xử lý chuẩn 3 nhánh: (1) Chưa có hồ sơ nhân sự, (2) Đã kích hoạt (hiển thị thẻ cảnh báo AF-01 và nút về Đăng nhập), (3) Chờ kích hoạt (gửi OTP, thiết lập mật khẩu mới phức tạp >= 8 ký tự có toggle con mắt, chuyển sang ACTIVE).
  - Sau khi đăng nhập hoặc kích hoạt thành công, hệ thống điều hướng trực tiếp vào màn hình `PT01 · Lịch` (`schedule`).
  - US03: Đăng xuất an toàn: Popup xác nhận với đúng nội dung quy định, hủy session, xóa sạch token nhạy cảm (`clearAuth()`) và quay về màn hình Đăng nhập.

### 2.6. Menu PT06 — Tổng Quan Hiệu Suất PT (US01)
- **Tình trạng đối chiếu ban đầu:**
  - Dữ liệu `this_week` và `this_month` bị gán chung một giá trị tổng gộp; mốc `last_month` chưa được tính toán (luôn bằng 0).
  - Template HTML ban đầu chứa các con số tĩnh hardcoded.
  - Thiếu banner thông báo lỗi kết nối mạng theo đúng Exception Flow.
- **Các điểm đã hoàn thiện trong `overview.js`:**
  - Xóa sạch 100% placeholder tĩnh trong HTML, khởi tạo bằng 0 và nạp động từ database qua `apiClient`.
  - Xây dựng bộ tính toán Date Range chuẩn (`this_week`, `this_month`, `last_month`) không bị lệch múi giờ.
  - Tính toán chính xác 5 thẻ KPI hiệu suất chuẩn hóa: (1) Học viên phụ trách, (2) Buổi đã hoàn thành, (3) Buổi đã được book, (4) Buổi chờ xác nhận, (5) Yêu cầu phân công mới.
  - Tuyệt đối KHÔNG hiển thị ca dạy tiếp theo hay doanh thu tại PT06 (tuân thủ phân tách ranh giới nghiệp vụ).
  - Exception Flow: Hiển thị banner lỗi `"Không thể nạp dữ liệu thống kê, vui lòng kiểm tra kết nối mạng"` kèm nút "Thử lại".

---

## 3. XÁC NHẬN TUÂN THỦ CÁC NGUYÊN TẮC DỰ ÁN

1. **Nguyên tắc Tài liệu (`AGENTS.md` - Mục 1):**
   - Giữ nguyên vẹn 100% nội dung các file tài liệu trong `docs/epic/pt/` và `docs/user-stories/pt/`. Tuyệt đối không chỉnh sửa Main Flow, Alternate Flows hay Activity Diagram.
2. **Quy tắc Cô lập mã nguồn (`AGENTS.md` - Rule 4.1):**
   - Toàn bộ chỉnh sửa nằm trọn vẹn trong thư mục được phân công của Tab 3 (`frontend/mobile/pt/`), không can thiệp vào mã nguồn của Tab 1, Tab 2 hay Tab 4.
3. **Quy tắc Dữ liệu & Cấm Mock Data (`AGENTS.md` - Rule 5):**
   - 100% dữ liệu hiển thị nạp trực tiếp từ Backend PostgreSQL qua `apiClient`.
   - Khởi tạo mảng rỗng `[]` và số đếm `0`, có đầy đủ Loading Spinner, Empty State và Error Handling khi mất kết nối mạng.
4. **Kiểm tra Cú pháp:**
   - Toàn bộ các file JavaScript (`schedule.js`, `clients.js`, `notifications.js`, `profile.js`, `auth.js`, `overview.js`, `app.js`) đã được kiểm tra cú pháp bằng `node -c` và đều đạt mã thoát `0`.

# BÁO CÁO TỔNG HỢP: RÀ SOÁT VÀ ĐỒNG BỘ 100% FLOW (MAIN FLOW & ACTIVITY DIAGRAM) 6 MENU HỘI VIÊN (HV01 - HV06)

**Dự án:** Paradise Gym — Tab 2 (`anti-2-HV`: Mobile Member Lead)  
**Tập tin tài liệu tham chiếu:** `docs/epic/hoi-vien/` & `docs/user-stories/hoi-vien/`  
**Thư mục mã nguồn:** `frontend/mobile/member/`  
**Ngày thực hiện:** 17/09/2026  
**Cam kết tuân thủ:**
- Giữ nguyên vẹn 100% tài liệu `docs/epic/` và `docs/user-stories/` (tuyệt đối không sửa Main Flow hay Activity Diagram).
- Tuân thủ Quy tắc 5 (`AGENTS.md`): Cấm mock data hardcoded, dữ liệu động 100% từ Database qua `apiClient`.

---

## 1. KẾT QUẢ ĐỐI CHIẾU & ĐỒNG BỘ CHI TIẾT THEO 6 MENU

| Menu (Epic) | User Stories | Trạng thái đối chiếu Main Flow & Activity Diagram | Các điểm đã hiệu chỉnh mã nguồn |
| :--- | :--- | :--- | :--- |
| **HV01 · Trang chủ** | `HV01-US01` | **Khớp 100%** | - Hoàn thiện 4 khối chuẩn UI: Lời chào, Việc cần làm (thẻ vàng/xanh), Lịch sắp tới, Thao tác nhanh.<br>- Điều hướng sâu đúng sub-tab (`pt-requests`, `sale-packages`, `my-packages`, `mySchedule`).<br>- Xóa bỏ mock fallback, quản trị trạng thái loading/error.<br>- Khẳng định không có Check-in hay QR code. |
| **HV02 · Lịch tập** | `HV02-US01`<br>`HV02-US02`<br>`HV02-US03`<br>`HV02-US04` | **Khớp 100%** | - Lịch tháng tương tác Toggle Filter, chip trạng thái động theo ngày chọn.<br>- Đặt lịch slot trống 2h tạo booking tức thì (xử lý xung đột slot 409).<br>- Modal hủy lịch kiểm soát mốc 4h: $\ge 4h$ bảo lưu buổi, $< 4h$ trừ 1 buổi kèm cảnh báo đỏ và dropdown lý do hủy chuẩn đặc tả.<br>- Xác nhận kép 2 chiều: chỉ trừ buổi khi cả PT và Hội viên cùng hoàn tất xác nhận.<br>- Sửa lỗi ReferenceError và lọc chuẩn xác slot của học viên. |
| **HV03 · Gói của tôi** | `HV03-US01`<br>`HV03-US02`<br>`HV03-US03`<br>`HV03-US04`<br>`HV03-US05`<br>`HV03-US06` | **Khớp 100%** | - Danh sách gói sở hữu hiển thị progress bar số buổi/ngày, badge trạng thái và nút `[ Chọn PT phụ trách ]`.<br>- Danh mục bán với modal chi tiết quyền lợi phòng tập và HLV.<br>- Mua gói VietQR 100% tích hợp quy trình gọi API Backend `registrations.create` $\rightarrow$ `payments.createInvoice` $\rightarrow$ `payments.confirm` kích hoạt gói.<br>- Chọn HLV khả dụng theo chi nhánh, popup xác nhận gửi yêu cầu `PENDING`.<br>- Theo dõi yêu cầu PT 3 trạng thái (`PENDING`, `ACCEPTED`, `REJECTED` kèm nút `[ Chọn PT khác ]`).<br>- Lịch sử phiếu thu thanh toán 100%. |
| **HV04 · Tài khoản** | `HV04-US01`<br>`HV04-US02` | **Khớp 100%** | - Header hồ sơ cá nhân hiển thị Avatar, Họ tên, Mã HV, SĐT và Hạng hội viên VIP/Thường.<br>- Form cập nhật hồ sơ, luồng đổi SĐT yêu cầu xác thực OTP SMS 60s và kiểm tra trùng qua API.<br>- Nút `[ Lưu thay đổi ]` và `[ Lưu cài đặt ]` quản lý trạng thái DYNAMIC (chỉ enable khi có thay đổi).<br>- Cài đặt thông báo in-app, nhắc lịch, bật/tắt 2FA và đổi mật khẩu. |
| **HV05 · Thông báo** | `HV05-US01` | **Khớp 100%** | - Hộp thư Drawer Bottom-Sheet kích hoạt từ Chuông Header và Menu Footer, đồng bộ chấm đỏ realtime.<br>- Phân loại chuẩn 6 nhóm thông báo (`PAYMENT`, `PT_ASSIGNMENT`, `PT_SCHEDULE`, `PT_CONFIRM`, `REMINDER`, `BIRTHDAY`).<br>- Mở rộng nội dung tại chỗ (accordion inline) và tự động đánh dấu đã đọc (`is_read = true`), **tuyệt đối không tự động chuyển trang**.<br>- Bộ lọc `Tất cả` / `Chưa đọc`, nút `Đọc tất cả`. |
| **HV06 · Đăng nhập** | `HV06-US01`<br>`HV06-US02`<br>`HV06-US03`<br>`HV06-US04` | **Khớp 100%** | - Đăng nhập đa phương thức: Tab Mật khẩu & Tab OTP SMS không mật khẩu.<br>- Màn hình 2FA OTP 6 số tự động nhảy con trỏ, countdown 60s, gửi lại tối đa 3 lần.<br>- Khóa tạm thời 15 phút khi nhập sai 5 lần.<br>- Kích hoạt tài khoản quầy (`HV06-US02`) sửa lỗi bóc tách object `{ exists, member }`.<br>- Tạo tài khoản mới (`HV06-US03`) bổ sung `home_branch_id`, chỉ tạo role Hội viên (PT không thể tự tạo TK).<br>- Popup xác nhận đăng xuất an toàn thu hồi token và session. |

---

## 2. KẾT QUẢ KIỂM THỬ KỸ THUẬT
- Đã chạy kiểm tra cú pháp toàn bộ các tập tin JavaScript bằng lệnh `node -c`:
  - `frontend/mobile/member/js/auth-account.js` $\rightarrow$ **PASS**
  - `frontend/mobile/member/js/home-schedule.js` $\rightarrow$ **PASS**
  - `frontend/mobile/member/js/packages-notifications.js` $\rightarrow$ **PASS**
- Không còn bất kỳ mảng mock data hardcoded tĩnh nào trong mã nguồn giao diện.

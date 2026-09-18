# BÁO CÁO KIỂM THỬ END-TO-END (E2E TESTING WALKTHROUGH)
## PHÂN HỆ MOBILE HUẤN LUYỆN VIÊN (PT) — PARADISE GYM

**Thời điểm hoàn thành:** 18/09/2026  
**Vai trò phụ trách:** `anti-3-PT` (Mobile PT Lead)  
**Tiêu chuẩn áp dụng:** Kỹ năng bắt buộc `.agents/skills/us-e2e-test-recorder/SKILL.md`  
**Kết quả tổng quan:** **12/12 User Stories PASS (100%)** — Kiểm thử UI thực tế qua Headless Chrome kết nối PostgreSQL qua REST API, chụp ảnh từng thao tác kèm Visual Annotation (Bounding Box & Numbered Badges), kiểm chứng Downstream chéo vai trò (Cross-Role UI Synchronization) trung thực với DOM.

---

## 1. BẢNG TỔNG HỢP KẾT QUẢ KIỂM THỬ 12 USER STORIES

| STT | Mã US | Tên User Story | Phân hệ | Số Step | Kết quả | Downstream Verification | Báo cáo chi tiết |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | **PT05-US01** | Đăng nhập đa phương thức và xác thực 2 lớp PT | PT05 · Đăng nhập | 7 | **PASS** | Kiểm tra Session & Phân quyền PT | `tests/e2e/PT05-US01/PT05-US01-test.md` |
| 2 | **PT05-US02** | Kích hoạt tài khoản PT bằng OTP | PT05 · Đăng nhập | 5 | **PASS** | Kích hoạt HLV Phạm Quốc Bảo (ACTIVE) | `tests/e2e/PT05-US02/PT05-US02-test.md` |
| 3 | **PT05-US03** | Đăng xuất tài khoản PT Mobile | PT05 · Đăng nhập | 3 | **PASS** | Xóa sạch phiên & Token | `tests/e2e/PT05-US03/PT05-US03-test.md` |
| 4 | **PT04-US01** | Xem hồ sơ và tùy chọn tài khoản PT | PT04 · Tài khoản | 4 | **PASS** | Mobile Hội viên (Lê Hoàng Nam) | `tests/e2e/PT04-US01/PT04-US01-test.md` |
| 5 | **PT04-US02** | Cập nhật hồ sơ cá nhân PT | PT04 · Tài khoản | 3 | **PASS** | Web Admin QTV (W05 Huấn luyện viên) | `tests/e2e/PT04-US02/PT04-US02-test.md` |
| 6 | **PT06-US01** | Xem tổng quan và thống kê hiệu suất PT | PT06 · Tổng quan | 4 | **PASS** | Tính toán động 5 thẻ KPI hiệu suất | `tests/e2e/PT06-US01/PT06-US01-test.md` |
| 7 | **PT01-US01** | Xem lịch PT theo ngày | PT01 · Lịch dạy | 4 | **PASS** | Dải ngày cuộn ngang & dxCalendar cả tháng | `tests/e2e/PT01-US01/PT01-US01-test.md` |
| 8 | **PT01-US02** | Xác nhận hoàn thành và ghi kết quả buổi học | PT01 · Lịch dạy | 3 | **PASS** | Mobile Hội viên (Xác nhận kép & trừ 1 buổi) | `tests/e2e/PT01-US02/PT01-US02-test.md` |
| 9 | **PT02-US01** | Xem danh sách học viên được phân công | PT02 · Học viên | 3 | **PASS** | Tìm kiếm realtime, Progress Bar buổi tập | `tests/e2e/PT02-US01/PT02-US01-test.md` |
| 10 | **PT02-US02** | Xem lộ trình và lịch sử tập luyện của học viên | PT02 · Học viên | 3 | **PASS** | Timeline buổi tập & đánh giá thể lực | `tests/e2e/PT02-US02/PT02-US02-test.md` |
| 11 | **PT02-US03** | Tiếp nhận và xử lý yêu cầu phân công PT | PT02 · Học viên | 3 | **PASS** | Mobile Hội viên (Gói của tôi - HLV đã gán) | `tests/e2e/PT02-US03/PT02-US03-test.md` |
| 12 | **PT03-US01** | Xem và xử lý thông báo PT | PT03 · Thông báo | 3 | **PASS** | Hộp thư in-app, lọc Chưa đọc, Mark read | `tests/e2e/PT03-US01/PT03-US01-test.md` |

---

## 2. CHI TIẾT KẾT QUẢ THEO TỪNG PHÂN HỆ

### Phân hệ PT05: Đăng nhập & Xác thực tài khoản
- **PT05-US01 (Đăng nhập đa phương thức):** Kiểm thử thành công luồng Exception EF-01 (nhập sai mật khẩu hiển thị cảnh báo lỗi), chuyển tab Đăng nhập bằng OTP (đếm ngược 60s), và đăng nhập thành công bằng mật khẩu HLV Nguyễn Văn Thể (PT001), tự động điều hướng vào Mobile PT Dashboard.
- **PT05-US02 (Kích hoạt tài khoản bằng OTP):** Kiểm thử thành công quy trình kích hoạt cho HLV Phạm Quốc Bảo (`0918776655`) từ trạng thái `PENDING_ACTIVATION`: tra cứu hồ sơ hợp lệ, nhận mã OTP kích hoạt, thiết lập mật khẩu mới `Paradise@123` lần đầu và tự động chuyển sang trạng thái `ACTIVE`.
- **PT05-US03 (Đăng xuất tài khoản):** Kiểm thử hộp thoại xác nhận DevExtreme Popup và xóa sạch dữ liệu phiên/token trong localStorage, quay về cổng đăng nhập an toàn.

### Phân hệ PT04: Tài khoản & Cài đặt HLV
- **PT04-US01 (Xem hồ sơ & tùy chọn):** Kiểm tra hiển thị thông tin nhân sự HLV, chuyên môn đào tạo, xác nhận **không còn bất kỳ thẻ/trường Bằng cấp/Chứng chỉ nào** theo chỉ thị mới của Người Dùng. Thao tác bật/tắt toggle quyền riêng tư hiển thị SĐT, bấm Lưu cài đặt và kiểm chứng Cross-Role downstream sang ứng dụng Mobile Hội viên Lê Hoàng Nam.
- **PT04-US02 (Cập nhật hồ sơ cá nhân):** Mở modal DevExtreme cập nhật Email và Bio giới thiệu bản thân, lưu thành công vào PostgreSQL. Kiểm chứng Cross-Role downstream bằng việc đăng nhập Web Admin QTV (`0900000001`), mở màn hình `W05 · Huấn luyện viên` và xác thực DataGrid hiển thị email mới đồng bộ 100%.

### Phân hệ PT06: Tổng quan hiệu suất huấn luyện
- **PT06-US01 (Thống kê hiệu suất PT):** Kiểm thử đầy đủ 5 thẻ KPI hiệu suất (Học viên phụ trách, Buổi đã hoàn thành DONE, Buổi đã được book UPCOMING, Buổi chờ xác nhận AWAITING_CONFIRMATION, Yêu cầu phân công PENDING). Kiểm thử chuyển đổi bộ lọc thời gian Tuần này / Tháng này / Tháng trước bằng dxButtonGroup, xác nhận số liệu tính toán động từ CSDL.

### Phân hệ PT01: Lịch dạy PT & Ghi nhận kết quả
- **PT01-US01 (Xem lịch PT theo ngày):** Kiểm thử bộ chọn ngày Calendar Horizontal Strip cuộn ngang, mở rộng lưới cả tháng DevExtreme dxCalendar và thu gọn mượt mà. Kiểm chứng 5 khung giờ làm việc cố định `08:00 - 18:00`: phân định rõ thẻ Khung giờ trống (chỉ đọc, không nút), thẻ ca tập đã hủy (CANCELLED làm mờ) và thẻ ca tập đã đặt (UPCOMING).
- **PT01-US02 (Xác nhận hoàn thành & ghi kết quả):** Bấm nút `[ Xác nhận hoàn thành ]`, mở Bottom Sheet với thông tin prefill học viên và gói tập, nhập nội dung ghi chú thể lực. Bấm `[ Lưu kết quả ]` gọi API xác nhận của PT. Kiểm chứng cơ chế xác nhận kép: ca tập chuyển sang `COMPLETED / DONE` và số buổi khả dụng của Hội viên Lê Hoàng Nam bị trừ 1 buổi chuẩn xác.

### Phân hệ PT02: Quản lý học viên & Lộ trình tập luyện
- **PT02-US01 (Danh sách học viên phụ trách):** Hiển thị thẻ học viên kèm Avatar, Mã HV, SĐT, tên gói PT, hạn dùng, cụm chỉ số buổi và **Thanh tiến độ (Progress Bar)** đồ họa thể hiện `Đã tập X / Y buổi` kèm tỷ lệ %. Kiểm thử tìm kiếm realtime theo tên/SĐT.
- **PT02-US02 (Lộ trình & lịch sử tập luyện):** Mở màn hình chi tiết lộ trình học viên Lê Hoàng Nam: thanh tiến độ gói tập, timeline chi tiết từng buổi tập đã hoàn thành kèm nội dung ghi chú bài tập và đánh giá thể lực sau mỗi ca dạy.
- **PT02-US03 (Tiếp nhận yêu cầu phân công):** Chuyển sang sub-tab Yêu cầu phân công, mở Bottom Sheet từ chối chọn lý do định sẵn. Bấm nút màu xanh `[ Đồng ý tiếp nhận ]` gọi API cập nhật `ACCEPTED`, thêm học viên vào danh sách chính thức và kiểm chứng downstream trên Mobile Hội viên.

### Phân hệ PT03: Thông báo in-app
- **PT03-US01 (Hộp thư thông báo PT):** Mở Drawer thông báo từ biểu tượng chuông Header. Kiểm tra 5 nhóm sự kiện vận hành, chuyển tab lọc Chưa đọc, bấm `[ Đánh dấu tất cả đã đọc ]` cập nhật trạng thái và dọn sạch badge chuông trên Header.

---

## 3. CÁC TÀI LIỆU VÀ ARTIFACTS ĐÃ ĐỒNG BỘ
- Thư mục kiểm thử E2E: `tests/e2e/` (gồm 12 thư mục `tests/e2e/<US-ID>/` chứa 12 file Markdown báo cáo và đầy đủ screenshot trực quan).
- Thư mục báo cáo bàn giao: `docs/reports/tab3-mobile-pt/pt-e2e-testing-walkthrough.md`.
- Hộp thư Mesh đồng bộ ngữ cảnh: `brain-anti3/notes.md`.

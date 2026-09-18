# BÁO CÁO TỔNG KẾT KIỂM THỬ E2E TOÀN DIỆN PHÂN HỆ HỘI VIÊN (HV01 - HV06)
**Dự án:** Paradise Gym — Hệ thống quản lý và vận hành phòng Gym cao cấp  
**Vai trò phụ trách:** `anti-2-HV` (Mobile Member Lead)  
**Thời gian thực hiện:** 18/09/2026  
**Tiêu chuẩn chất lượng:** Tuân thủ 100% Kỹ năng `us-e2e-test-recorder`, 16 Nguyên tắc Vàng (DOM Truthfulness, Input Capture Before Submit Rule, Authenticated Downstream Screen Rule, No Mock Data).

---

## 1. TỔNG QUAN KẾT QUẢ KIỂM THỬ

- **Tổng số User Stories phân hệ Hội viên:** 18 / 18 User Stories.
- **Tỷ lệ kiểm thử thành công:** **100% PASS (18/18)**.
- **Dữ liệu thực thi:** Kết nối 100% PostgreSQL Database (Port 5435) thông qua REST API Backend Express.js (`http://localhost:5000/api/v1`), tuyệt đối không mock hardcoded frontend.
- **Giao diện thực tế:** Viewport chuẩn di động Mobile (`390 x 844`, DPR: 2), chụp ảnh màn hình thật sau từng thao tác có ý nghĩa, gắn nhãn trực quan (Bounding Box + Numbered Badges).
- **Kiểm chứng hạ nguồn (Cross-Role / Downstream Verification):** Mở phiên làm việc đã xác thực của đúng đối tượng thụ hưởng trên trình duyệt (Web Admin QTV `http://localhost:3000/web/`, Web Lễ tân RECEPTIONIST `http://localhost:3000/web/`, Mobile PT `http://localhost:3000/mobile/pt/`), 0% ảnh chụp màn hình đăng nhập login.

---

## 2. BẢNG TỔNG HỢP TIẾN ĐỘ & KẾT QUẢ TỪNG USER STORY

| STT | Mã US | Tên User Story | Trạng thái | Số bước test | Kiểm chứng Hạ nguồn (Downstream Role) | Thư mục báo cáo & Ảnh chụp |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| **I** | **HV06** | **Đăng nhập, Kích hoạt, Đăng ký & Đăng xuất** | | | | |
| 1 | `HV06-US01` | Đăng nhập đa phương thức & 2FA | **PASS** | 5 steps | Đăng nhập OTP passwordless | `tests/e2e/HV06-US01/` |
| 2 | `HV06-US02` | Kích hoạt tài khoản Hội viên (Pending) | **PASS** | 4 steps | Web Admin QTV (W04 - Member ACTIVE) | `tests/e2e/HV06-US02/` |
| 3 | `HV06-US03` | Đăng ký tài khoản Hội viên mới | **PASS** | 4 steps | Web Admin QTV (W04 - New Member Profile) | `tests/e2e/HV06-US03/` |
| 4 | `HV06-US04` | Đăng xuất tài khoản & Thu hồi Session | **PASS** | 3 steps | Quản lý thiết bị & Thu hồi phiên | `tests/e2e/HV06-US04/` |
| **II** | **HV01** | **Trang chủ** | | | | |
| 5 | `HV01-US01` | Xem tổng quan và lối tắt Trang chủ | **PASS** | 4 steps | Điều hướng nhanh Gói tập & Lịch tập | `tests/e2e/HV01-US01/` |
| **III** | **HV02** | **Lịch tập** | | | | |
| 6 | `HV02-US01` | Xem lịch tập và lọc trạng thái buổi PT | **PASS** | 4 steps | Lịch tháng Month Calendar & Filter Chips | `tests/e2e/HV02-US01/` |
| 7 | `HV02-US02` | Đặt lịch PT từ slot trống | **PASS** | 3 steps | Mobile PT (PT01 - Lịch làm việc PT) | `tests/e2e/HV02-US02/` |
| 8 | `HV02-US03` | Hủy lịch buổi PT | **PASS** | 3 steps | Mobile PT (PT01 - Giải phóng Slot giờ) | `tests/e2e/HV02-US03/` |
| 9 | `HV02-US04` | Xác nhận hoàn thành buổi PT | **PASS** | 3 steps | Web Admin QTV (W06 - Quản lý lịch tập) | `tests/e2e/HV02-US04/` |
| **IV** | **HV03** | **Gói của tôi** | | | | |
| 10 | `HV03-US01` | Xem gói, quyền lợi và tiến độ sử dụng | **PASS** | 4 steps | Phân loại gói có/chưa có PT phụ trách | `tests/e2e/HV03-US01/` |
| 11 | `HV03-US02` | Xem chi tiết và quyền lợi gói đang bán | **PASS** | 3 steps | Catalog gói bán Active & Modal chi tiết | `tests/e2e/HV03-US02/` |
| 12 | `HV03-US03` | Mua gói và khởi tạo thanh toán Mobile | **PASS** | 2 steps | Web Lễ tân LT (LT-W03 - Đơn chờ thu tiền) | `tests/e2e/HV03-US03/` |
| 13 | `HV03-US04` | Chọn PT và gửi yêu cầu phân công | **PASS** | 3 steps | Mobile PT (PT02 - Tab Học viên nhận lớp) | `tests/e2e/HV03-US04/` |
| 14 | `HV03-US05` | Theo dõi yêu cầu phân công PT | **PASS** | 2 steps | Vòng đời Yêu cầu: PENDING -> REJECTED | `tests/e2e/HV03-US05/` |
| 15 | `HV03-US06` | Xem lịch sử thanh toán | **PASS** | 2 steps | Phiếu thu điện tử đối soát 100% | `tests/e2e/HV03-US06/` |
| **V** | **HV04** | **Tài khoản** | | | | |
| 16 | `HV04-US01` | Xem và chỉnh sửa hồ sơ cá nhân | **PASS** | 3 steps | Web Admin QTV (W04 - Hồ sơ DataGrid) | `tests/e2e/HV04-US01/` |
| 17 | `HV04-US02` | Cài đặt thông báo & thiết bị đăng nhập | **PASS** | 3 steps | Lưu cấu hình Notification & Security | `tests/e2e/HV04-US02/` |
| **VI** | **HV05** | **Thông báo** | | | | |
| 18 | `HV05-US01` | Xem danh sách và chi tiết thông báo | **PASS** | 4 steps | Accordion chi tiết & Đánh dấu đã đọc | `tests/e2e/HV05-US01/` |

---

## 3. CHI TIẾT CÁC BATCH KIỂM THỬ THỰC HIỆN

### 3.1. Batch HV1 (HV06 & HV01 & HV04 & HV05 - 8 User Stories)
- File script: `tests/e2e/test_batch_hv1.js` & `tests/e2e/test_batch_hv2.js`.
- Điểm nhấn kỹ thuật:
  + `HV06-US01`: Kiểm chứng luồng đăng nhập password thường, test biên mật khẩu sai hiển thị Toast báo lỗi đỏ (Exception Flow), sau đó đăng nhập passwordless OTP SMS thành công.
  + `HV06-US02`: Lookup tài khoản ở trạng thái `PENDING_ACTIVATION`, gửi mã OTP kích hoạt, thiết lập mật khẩu mới và xác nhận chuyển sang `ACTIVE` trên Web Admin QTV.
  + `HV06-US03`: Tải danh sách chi nhánh hoạt động từ API `/branches`, hoàn tất form đăng ký và kiểm chứng tài khoản mới được ghi nhận tức thì trong cơ sở dữ liệu.
  + `HV06-US04`: Truy cập màn hình Quản lý thiết bị, nhận diện chính xác badge `[ Thiết bị hiện tại ]`, mở popup xác nhận đăng xuất và thu hồi session.
  + `HV01-US01`: Nạp đầy đủ thông tin cá nhân trên Dashboard, hiển thị Task Band việc cần xử lý, thẻ Lịch sắp tới và Quick Actions chuyển tab.
  + `HV04-US01` & `HV04-US02`: Áp dụng nghiêm ngặt Rule 15 (Input Capture Before Submit Rule), chụp ảnh màn hình sau khi chỉnh sửa Email mới trước khi bấm Lưu; kiểm chứng trực quan trên Web Admin QTV DataGrid.
  + `HV05-US01`: Nạp thông báo thật từ PostgreSQL, kiểm chứng cập nhật số đếm badge chưa đọc khi mở xem nội dung chi tiết.

### 3.2. Batch HV3 (HV03 - 6 User Stories: Gói của tôi)
- File script: `tests/e2e/test_batch_hv3.js`.
- Điểm nhấn kỹ thuật:
  + `HV03-US01`: Hiển thị thẻ gói tập nạp từ `registrations`, phân biệt rõ ràng giữa gói chưa có PT (hiển thị nút CTA màu đen `[ Chọn PT phụ trách ]`) và gói đã có PT (`PT: Nguyễn Văn Thể`). Kiểm chứng empty state khi lọc gói hết hạn (AF-01).
  + `HV03-US02`: Danh mục mở bán từ `/packages?status=ACTIVE` kèm giá niêm yết 100%, modal chi tiết gói tập hiển thị đầy đủ thông số thời hạn, phạm vi chi nhánh và notice tự chọn HLV.
  + `HV03-US03`: Khởi tạo đơn mua gói, sinh mã VietQR kèm số tài khoản, chủ tài khoản và cú pháp chuyển khoản chuẩn xác; downstream kiểm chứng đơn hàng xuất hiện tức thì ở trạng thái `PENDING_PAYMENT` tại màn hình Đăng ký của Lễ tân.
  + `HV03-US04`: Quy trình chọn HLV từ danh sách HLV thuộc chi nhánh Quận 1 (`/pt-bookings/trainers`), mở popup xác nhận và phát hành request; downstream kiểm chứng HLV Nguyễn Văn Thể (`0900000003`) nhận được yêu cầu phân công trong tab Học viên trên Mobile PT.
  + `HV03-US05`: Thẻ yêu cầu hiển thị badge `Đang chờ phản hồi` (PENDING - cam); sau khi HLV từ chối, thẻ tự động chuyển sang badge `Đã từ chối` (REJECTED - đỏ) và kích hoạt nút `[ Chọn PT khác ]` (AF-02).
  + `HV03-US06`: Xem lịch sử thanh toán các phiếu thu thành công (màu xanh lục), mở xem chi tiết Phiếu thu điện tử với đầy đủ mã đối soát tài chính.

### 3.3. Batch HV4 (HV02 - 4 User Stories: Lịch tập)
- File script: `tests/e2e/test_batch_hv4.js`.
- Điểm nhấn kỹ thuật:
  + `HV02-US01`: Tương tác 2 chiều với Widget Lịch tháng (`dxCalendar`): Chọn ngày 17 kích hoạt highlight vòng tròn và lọc danh sách theo ngày; click lại chính ngày 17 kích hoạt cơ chế Toggle Deselect quay về hiển thị tất cả các ngày. Lọc các chip trạng thái `Đã hoàn thành`, `Chờ xác nhận`.
  + `HV02-US02`: Combobox lọc chính xác gói `DK002` (gói đã thanh toán 100%, còn hạn và đã gán HLV Nguyễn Văn Thể); hiển thị card PT phụ trách và lưới 5 khung giờ 2 tiếng của ngày 21/09/2026. Bấm `[ + ]` tại khung giờ trống `08:00 - 10:00` tạo booking ngay lập tức ở trạng thái `Đã đặt` (`UPCOMING`) không cần duyệt; downstream kiểm chứng ca dạy mới xuất hiện trên Mobile PT của HLV Nguyễn Văn Thể.
  + `HV02-US03`: Mở Modal Xác nhận Hủy lịch, kiểm tra mốc thời gian (> 4 tiếng) hiển thị thông báo "Hủy trước 4 tiếng: Bảo lưu buổi tập", bắt input lý do "Bận công việc đột xuất", submit hủy thành công và downstream kiểm chứng khung giờ được giải phóng trên Mobile PT.
  + `HV02-US04`: Kiểm chứng cơ chế Xác nhận kép 2 chiều: Thẻ buổi tập có badge `Chờ xác nhận`, mở dialog hiển thị trạng thái "PT đã xác nhận hoàn thành", Hội viên bấm `[ Xác nhận hoàn thành ]`, backend kích hoạt khấu trừ chính xác 1 buổi khả dụng và chuyển booking sang `COMPLETED` (`DONE`); downstream kiểm chứng buổi tập hoàn tất trên DataGrid Lịch tập của Web Admin QTV.

---

## 4. KẾT LUẬN & TRẠNG THÁI SẴN SÀNG VẬN HÀNH

- Phân hệ **Mobile Hội viên (HV01 đến HV06)** đã đạt **100% độ hoàn thiện kỹ thuật và độ tin cậy kiểm thử**.
- Toàn bộ 18 báo cáo Markdown chi tiết kèm thư viện ảnh chụp thực tế đã được lưu trữ hoàn chỉnh tại `tests/e2e/HV*-*/`.
- Hệ thống sẵn sàng 100% cho việc nghiệm thu, vận hành thử nghiệm và bàn giao cho Người Dùng.

# Báo Cáo Bàn Giao: Rà Soát & Chuẩn Hóa Toàn Diện Phân Hệ Hội Viên (Mobile Member HV)

## 1. Mục tiêu hoàn thành
1. Rà soát toàn bộ 18 User Stories của phân hệ Hội viên (HV01 đến HV06).
2. Chuẩn hóa 100% bảng Field-level specification sang định dạng 6 cột chuẩn AGENTS.md:
   Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation.
3. Bổ sung trường bắt buộc **Chi nhánh cơ sở (home_branch_id)** vào Main Flow và đặc tả UI của HV06-US03 - Tạo tài khoản và đăng ký hồ sơ mới để đảm bảo tính toàn vẹn dữ liệu với PostgreSQL database.
4. Rà soát sạch sẽ các quy tắc nghiệp vụ: Không còn dấu vết phân hạng Member Tier (VIP/Thường), không còn ## Result hay metadata trong ## Preconditions.
5. Xác minh mã nguồn rontend/mobile/member/: Không có mock data hardcoded tĩnh, 100% kết nối REST API động.

## 2. Danh sách User Stories đã chuẩn hóa 6 cột
- **HV01 - Trang chủ:**
  - HV01-US01-Xem tổng quan và thao tác nhanh.md: 15 trường/control chuẩn hóa 6 cột.
- **HV02 - Lịch tập:**
  - HV02-US01-Xem lịch tập và lọc trạng thái buổi PT.md: 5 trường/control chuẩn hóa 6 cột.
  - HV02-US02-Đặt lịch PT từ slot trống.md: Đã chuẩn hóa 6 cột.
  - HV02-US03-Hủy lịch buổi PT.md: 6 trường/control chuẩn hóa 6 cột (modal form, không chứa action buttons).
  - HV02-US04-Xác nhận hoàn thành buổi PT.md: 3 trường/control chuẩn hóa 6 cột (dialog popup).
- **HV03 - Gói của tôi:**
  - HV03-US01-Xem gói, quyền lợi và tiến độ sử dụng.md: 7 trường/control chuẩn hóa 6 cột.
  - HV03-US02-Xem chi tiết và quyền lợi gói đang bán.md: 2 bảng (Sub-tab Mua gói 4 controls & Modal Chi tiết 6 fields) chuẩn hóa 6 cột.
  - HV03-US03-Mua gói và khởi tạo thanh toán Mobile.md: 10 controls chuẩn hóa 6 cột.
  - HV03-US04-Chọn PT và gửi yêu cầu phân công.md: 2 bảng (Màn hình Chọn PT 3 controls & Popup Xác nhận 3 fields) chuẩn hóa 6 cột.
  - HV03-US05-Theo dõi yêu cầu phân công PT.md: 4 controls chuẩn hóa 6 cột.
  - HV03-US06-Xem lịch sử thanh toán.md: 3 controls chuẩn hóa 6 cột.
- **HV04 - Tài khoản:**
  - HV04-US01-Cập nhật hồ sơ cá nhân.md: 8 controls chuẩn hóa 6 cột (Avatar Cloudinary, SĐT OTP, Ngày sinh, Giới tính).
  - HV04-US02-Cài đặt thông báo và bảo mật tài khoản.md: 5 controls chuẩn hóa 6 cột (Toggle Switch in-app, nhắc lịch, 2FA).
- **HV05 - Thông báo:**
  - HV05-US01-Xem và xử lý thông báo Hội viên.md: 8 controls chuẩn hóa 6 cột.
- **HV06 - Đăng nhập:**
  - HV06-US01-Đăng nhập đa phương thức và xác thực 2 lớp.md: 2 bảng (Đăng nhập đa phương thức 8 controls & Bước 2FA 6 controls) chuẩn hóa 6 cột.
  - HV06-US02-Kích hoạt tài khoản Hội viên bằng OTP.md: 8 controls chuẩn hóa 6 cột.
  - HV06-US03-Tạo tài khoản và đăng ký hồ sơ mới.md: Bổ sung home_branch_id bắt buộc + 10 controls chuẩn hóa 6 cột.
  - HV06-US04-Đăng xuất tài khoản Mobile.md: 2 fields chuẩn hóa 6 cột.

## 3. Kết quả kiểm thử tự động
- Chạy 
pm test: **367/367 tests passed (100%)** trên PostgreSQL database.

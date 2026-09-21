# Epic Mobile — PT / Huấn luyện viên

Role `PT` chỉ sử dụng **Mobile**, không có Web. 

Ứng dụng Mobile của PT có thanh điều hướng dưới cùng (**Footer navigation gồm đúng 5 menu chính**) cùng với tính năng Thông báo tại Header. Nền footer dùng cùng màu xanh lá với Header; mục đang chọn có nền sáng hơn, chữ/icon trắng và chỉ báo trạng thái.
- **Header:** Icon chuông thông báo (kèm badge đỏ khi có thông báo mới) mở màn hình **PT03 · Thông báo**.
- **Footer Navigation Bar (5 menu chính):**
  1. `PT06` — **Tổng quan**: Màn hình thống kê KPI hiệu suất và ca dạy gần nhất.
  2. `PT01` — **Lịch**: Lịch làm việc giờ thực tế và đặt lịch hộ theo ngày và ghi kết quả buổi học.
  3. `PT02` — **Học viên**: Danh sách học viên phụ trách, lộ trình tập luyện và lịch sử phân công chỉ đọc.
  4. `PT06-US02` — **Hoa hồng**: Màn hình riêng tra cứu bảng kê theo tháng, chi tiết buổi và trạng thái chi trả của chính PT; chỉ đọc.
  5. `PT04` — **Tài khoản**: Hồ sơ PT, đổi mật khẩu và tùy chọn bảo mật.

| Epic | Vị trí giao diện | Chức năng chính |
| --- | --- | --- |
| [PT06](PT06-Tổng%20quan.md) | Footer tab `Tổng quan` | Dashboard thống kê hiệu suất, KPI và ca dạy gần nhất |
| [PT06-US02](../../user-stories/pt/PT06-Tổng%20quan/PT06-US02-Xem%20bảng%20kê%20hoa%20hồng%20tháng.md) | Footer tab `Hoa hồng` | Bảng kê theo kỳ của chính PT; API hiện hành, không cấp quyền chi trả |
| [PT01](PT01-Lịch.md) | Footer tab `Lịch` | Quản lý lịch dạy theo giờ thực tế và xác nhận kết quả |
| [PT02](PT02-Học%20viên.md) | Footer tab `Học viên` | Xem học viên được phân công, lộ trình tập và lịch sử phân công chỉ đọc |
| [PT03](PT03-Thông%20báo.md) | Icon Chuông Header | Danh sách thông báo hệ thống (phân công chính thức, lịch mới...) |
| [PT04](PT04-Tài%20khoản.md) | Footer tab `Tài khoản` | Hồ sơ PT, preference và tùy chọn bảo mật |
| [PT05](PT05-Đăng%20nhập.md) | Màn hình Auth | Đăng nhập đa phương thức, 2FA, kích hoạt tài khoản và đăng xuất |

Không đưa màn hình Web W05 hoặc W06 vào Epic Mobile PT; đó là capability vận hành của QTV/Lễ tân trên Web. User Story role-specific PT nằm tại [`docs/user-stories/pt/`](../../user-stories/pt/): PT06 (US01–US02), PT01 (US01–US03), PT02 (US01–US03), PT03-US01, PT04 (US01–US02) và PT05 (US01–US03).

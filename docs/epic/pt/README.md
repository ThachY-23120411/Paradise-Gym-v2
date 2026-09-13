# Epic Mobile — PT / Huấn luyện viên

Role `PT` chỉ sử dụng **Mobile**, không có Web. Epic của PT được tổ chức theo footer navigation trong `fe/src/mobile.tsx`:

| Epic | Footer menu | Chức năng chính |
| --- | --- | --- |
| [PT01](PT01-Lịch.md) | Lịch | Xem lịch của PT, mở buổi và ghi kết quả |
| [PT02](PT02-Học viên.md) | Học viên | Xem học viên được phân công |
| [PT03](PT03-Thông báo.md) | Thông báo | Nhận yêu cầu phân công, lịch mới, đổi lịch và nhắc ghi kết quả |
| [PT04](PT04-Tài khoản.md) | Tài khoản | Hồ sơ PT, preference và phiên Mobile |

Không đưa màn hình Web W05 hoặc W06 vào Epic Mobile PT; đó là capability vận hành của QTV/Lễ tân trên Web. User Story role-specific PT nằm tại [`docs/user-stories/pt/`](../../user-stories/pt/): PT01-US01, PT02-US01, PT03-US01 và PT04-US01.

# UI Related Screen Audit theo Role / Platform

Canonical rule:

- QTV và Lễ tân chỉ có Web.
- Hội viên và PT chỉ có Mobile.
- Epic Mobile của Hội viên chính là năm mục footer `HV01`–`HV05`.
- Các capability W01–W13 dùng chung chỉ là traceability; không dùng để gán Hội viên/PT vào Web hoặc QTV/Lễ tân vào Mobile.

## Platform boundary

| Role | Canonical UI | Không thuộc scope |
| --- | --- | --- |
| QTV / Quản lý | Web W01–W13 theo permission | Mobile |
| Lễ tân | Web W01, W02, W04, W06, W07, W08, W09 | Mobile |
| Hội viên | Mobile HV01, HV02, HV03, HV04, HV05 | Web |
| PT | Mobile PT01, PT02, PT03, PT04 | Web |

## Mobile Hội viên — footer Epic mapping

| Epic/Menu | Source UI | Canonical User Stories | Audit kết quả |
| --- | --- | --- | --- |
| HV01 · Trang chủ | `MemberMobile`, tab `HV01` | HV01-US01 | Hiển thị lời chào, trạng thái yêu cầu PT, lịch sắp tới và quick action tới HV02/HV03. Chỉ đọc/điều hướng, không chỉnh nghiệp vụ trực tiếp. |
| HV02 · Lịch tập | `MemberSchedule`, tab `HV02` | HV02-US01 đến HV02-US04 | Gồm 2 sub-tab: Lịch của tôi (Lịch tháng trigger, chip filter, card buổi tập, modal hủy lịch, dialog xác nhận hoàn thành) và Đặt lịch PT (chọn gói, hiển thị PT, lịch làm việc, chọn slot giờ 2h). Booking chỉ hợp lệ khi payment/assignment/slot đủ điều kiện. |
| HV03 · Gói của tôi | `MemberPackages`, tab `HV03` | HV03-US01 đến HV03-US05 | Có tab `Gói của tôi`/`Mua gói`/`Yêu cầu PT`, filter trạng thái gói, progress, chi tiết quyền lợi, thanh toán, chọn PT, request tracking và payment history. |
| HV04 · Tài khoản | `MemberAccount`, `MemberAuthFlow`, tab `HV04` | HV04-US01 đến HV04-US04 | Có đăng nhập SĐT/mật khẩu, tạo/kích hoạt qua OTP theo 3 case, cập nhật hồ sơ/preference và đăng xuất. Không hiển thị Web admin permission. |
| HV05 · Thông báo | `MemberNotifications`, tab `HV05` | HV05-US01 | Nhận thông báo tự động (Thanh toán, PT assignment, Lịch tập, Xác nhận buổi học, Nhắc hạn gói, Sinh nhật), lọc chưa đọc, mở rộng chi tiết nội dung và đánh dấu đã đọc (không tự động điều hướng). |

## Mobile Hội viên — các điểm cần giữ đồng bộ

| User Story | Related Screen | Quy tắc UI/flow |
| --- | --- | --- |
| HV01-US01 | `HV01 · Trang chủ` | Chỉ hiển thị dữ liệu của Hội viên hiện hành; action card điều hướng về HV02/HV03. |
| HV02-US01 | `HV02 · Lịch tập` | Lọc theo ngày và trạng thái `Chờ xác nhận`, `Đã đặt`, `Đã hủy`, `Hoàn thành`; ngày quá khứ chỉ xem lịch sử. |
| HV02-US02 | `HV02 · Lịch tập` → Modal `Đặt lịch PT` | Chỉ hiển thị gói PT/Combo đủ điều kiện (đã thanh toán 100%), PT đã ACCEPT và slot trống; không cho đặt khi chưa thanh toán/hết buổi/hết hạn. |
| HV02-US03 | `HV02 · Lịch tập` → Modal `Hủy lịch buổi PT` | Hủy không xóa record; kiểm soát mốc thời gian (hủy trước 4h bảo lưu buổi, hủy muộn trừ 1 buổi). |
| HV02-US04 | `HV02 · Lịch tập` → Dialog `Xác nhận hoàn thành buổi PT` | Hoàn thành chỉ sau xác nhận kép 2 chiều PT + Hội viên mới trừ 1 buổi; Hội viên đánh giá sao và gửi nhận xét. |
| HV03-US01 | `HV03 · Gói của tôi` | Hiển thị quyền lợi, thời hạn, tiến độ, số buổi và trạng thái PT/request/payment. |
| HV03-US02 | `HV03` → `Mua gói` → `Xem chi tiết` | Package detail là read-only; giá/quyền lợi lấy từ danh mục được phép bán. |
| HV03-US03 | `HV03` → `Thanh toán gói` | Payment pending không được coi là đã thu đủ; IPN/Webhook phải idempotent; adjustment thực hiện trên Web. |
| HV03-US04 | `HV03` → `Chọn PT phụ trách` | Tạo `PT_ASSIGNMENT_REQUEST = PENDING`; Hội viên không tự ACCEPT. |
| HV03-US05 | `HV03` → `Yêu cầu PT`/`Lịch sử thanh toán` | Request và payment history chỉ đọc, không xóa/sửa từ Mobile. |
| HV04-US01, HV04-US02 | `MemberAuthFlow` | SĐT duy nhất; xử lý account đã tồn tại, profile có sẵn chưa có account, hoặc tạo profile mới; OTP/mật khẩu không ghi audit. |
| HV04-US03 | `HV04` → `Cập nhật hồ sơ` | Chỉ sửa trường được phép và preference; không sửa gói, số buổi hoặc ghi chú nội bộ. |
| HV04-US04 | `HV04` → `Đăng xuất tài khoản` | Chỉ kết thúc session, không xóa profile, package, payment hoặc booking. |
| HV05-US01 | `HV05 · Thông báo` | Chỉ hiển thị thông báo của Hội viên đang đăng nhập, đánh dấu Đã đọc và mở rộng nội dung tại chỗ (không tự động điều hướng). |

## Cross-role traceability

| Mobile User Story | Role tương tác | Platform của role tương tác |
| --- | --- | --- |
| HV02-US02 | Web QTV/Lễ tân điều phối | Mobile Hội viên đặt self-service |
| HV02-US03 | Mobile PT + Mobile Hội viên | QTV xác nhận/xem kết quả và điều chỉnh trên Web qua QTV-W06-US04 khi có lý do |
| HV03-US03 | Web QTV/Lễ tân xử lý nhạy cảm | Mobile Hội viên theo dõi payment của mình |
| HV03-US04 | Mobile Hội viên gửi request | Mobile PT ACCEPT/REJECT |
| HV04-US03 | Mobile Hội viên tự cập nhật | Phần được phép |

## Web-only mapping

| Role | Menu Web | UI scope |
| --- | --- | --- |
| QTV | W01–W13 | Toàn bộ menu theo permission và branch scope; W07 xử lý check-in/ra vào, K01 chỉ là public/shared consumer |
| Lễ tân | W01, W02, W04, W05, W06, W07, W08, W09 | Chỉ menu vận hành được cấp trong chi nhánh |

Canonical User Story Web:

- QTV: [`docs/user-stories/qtv/`](user-stories/qtv/), activity flow index [`docs/system-flow-specs/qtv/`](system-flow-specs/qtv/).
- Lễ tân: [`docs/user-stories/le-tan/`](user-stories/le-tan/), activity flow index [`docs/system-flow-specs/le-tan/`](system-flow-specs/le-tan/).


## Screenshot bổ sung mới

| File | Nằm trong Related Screen |
| --- | --- |
| `screenshot/le-tan/light-mobile-modal-thanh-toan-chuyen-khoan.png` | Web/mobile operational reference cho E08-US02; không phải Mobile Hội viên canonical |
| `screenshot/qtv/light-web-modal-dieu-chinh-payment-da-xac-nhan.png` | Web QTV E08-US05 / audit payment |
| `screenshot/hoi-vien/light-mobile-HV-dang-nhap.png` | HV04-US01 |
| `screenshot/hoi-vien/light-mobile-HV-tao-tai-khoan-nhap-sdt.png` | HV04-US02 |
| `screenshot/hoi-vien/light-mobile-HV-tao-tai-khoan-case2-lien-ket-ho-so-quay.png` | HV04-US02 |
| `screenshot/hoi-vien/light-mobile-HV-tao-tai-khoan-case2-xac-thuc-otp.png` | HV04-US02 |
| `screenshot/hoi-vien/light-mobile-HV-tao-tai-khoan-case3-tu-dang-ky-ho-so-moi.png` | HV04-US02 |
| `screenshot/hoi-vien/light-mobile-HV-tao-tai-khoan-case3-xac-thuc-otp.png` | HV04-US02 |

## Kiểm tra link

- Canonical Mobile Hội viên: [`docs/epic/hoi-vien/`](epic/hoi-vien/), [`docs/user-stories/hoi-vien/`](user-stories/hoi-vien/), [`docs/system-flow-specs/hoi-vien/`](system-flow-specs/hoi-vien/).
- Canonical Web QTV/Lễ tân và Mobile PT được tách namespace riêng; không dùng story của role khác làm Related Screen chính.
- Tài liệu legacy vẫn giữ tại [`docs/user-stories-legacy/`](user-stories-legacy/).



# Epics - Paradise Gym

Tài liệu này chia Epic theo business capability của Paradise Gym, không chia máy móc theo menu. Nguồn chính: `docs/product-spec.md`.

`Prerequisites` là các Epic cần có trước hoặc cần có nền tối thiểu để Epic này vận hành đúng. `Related Epics` là các Epic có tương tác nghiệp vụ nhưng không phải điều kiện bắt buộc để triển khai theo thứ tự.

## E01 - Member & Customer Profile

| Field | Content |
| --- | --- |
| Epic ID | E01 |
| Name | Member & Customer Profile |
| Goal | Quản lý hồ sơ hội viên/khách hàng thống nhất, đủ dữ liệu vận hành và tránh trùng lặp sai. |
| Actors | QTV / Quản lý, Lễ tân, PT, Hội viên |
| Scope | Tạo, tìm, cập nhật hồ sơ; số điện thoại/email liên hệ; cảnh báo nghi trùng; xác nhận lý do khi dùng chung contact; trạng thái hồ sơ; lịch sử gói, lịch, ra/vào, thanh toán theo quyền; hội viên cập nhật thông tin cá nhân được phép. |
| Related requirements | Product Spec §2 Actors & Permissions; §3 Hội viên & khách hàng; §4 Hội viên; §6 OPEN-05. |
| Prerequisites | E07 Branch Operations & Data Scope; E08 Accounts, Roles, Permissions & Audit. |
| Related Epics | E02 Package Catalog, Registration & Entitlements; E04 Payment, Debt & Receipts; E05 PT Assignment, Schedule & Session Lifecycle; E06 Gym Access, Check-in & Visit History; E09 Notifications & Member Care; E10 Devices & Recognition Consent. |

## E02 - Package Catalog, Registration & Entitlements

| Field | Content |
| --- | --- |
| Epic ID | E02 |
| Name | Package Catalog, Registration & Entitlements |
| Goal | Quản lý danh mục gói, đăng ký, gia hạn và quyền lợi tập theo đúng điều kiện đã bán. |
| Actors | QTV / Quản lý, Lễ tân, Hội viên |
| Scope | Danh mục Gym theo thời gian, Gym theo buổi, PT theo buổi và Combo Gym + PT; gói được phép bán; tạo đăng ký mới/gia hạn (gói PT/Combo không phân công PT ngay, PT được gán sau khi gửi assignment request và PT chấp nhận); kỳ hiệu lực; snapshot giá/quyền lợi/phạm vi chi nhánh; liên kết lịch sử khi gia hạn; quyền Gym, quyền PT, Combo và quy tắc không chồng thời gian tương đương. |
| Related requirements | Product Spec §3 Danh mục gói tập, Đăng ký & gia hạn; §4 Gói tập; §6 OPEN-04, OPEN-09. |
| Prerequisites | E01 Member & Customer Profile. |
| Related Epics | E03 Pricing & Discount Governance; E04 Payment, Debt & Receipts; E05 PT Assignment, Schedule & Session Lifecycle; E06 Gym Access, Check-in & Visit History; E09 Notifications & Member Care; E11 Operational Reporting & Insights. |

## E03 - Pricing & Discount Governance

| Field | Content |
| --- | --- |
| Epic ID | E03 |
| Name | Pricing & Discount Governance |
| Goal | Kiểm soát chính sách giảm giá và ngăn việc sửa giá tùy ý trong quá trình bán/gia hạn. |
| Actors | QTV / Quản lý, Lễ tân |
| Scope | QTV cấu hình chính sách giảm giá; lễ tân áp dụng chính sách hợp lệ hoặc gửi yêu cầu duyệt; kiểm soát giảm ngoài chính sách; giữ lịch sử giảm giá đã xác nhận; đảm bảo đăng ký đã bán giữ snapshot giá và giảm giá. |
| Related requirements | Product Spec §3 Giảm giá; §4 Giảm giá, Gói tập; §6 OPEN-03. |
| Prerequisites | E02 Package Catalog, Registration & Entitlements; E08 Accounts, Roles, Permissions & Audit. |
| Related Epics | E04 Payment, Debt & Receipts; E11 Operational Reporting & Insights. |

## E04 - Payment, Debt & Receipts

| Field | Content |
| --- | --- |
| Epic ID | E04 |
| Name | Payment, Debt & Receipts |
| Goal | Theo dõi phải thu, đã thu, còn phải thu và phiếu thu cho từng đăng ký, bảo vệ quyền tập khỏi trạng thái thanh toán chưa đủ điều kiện. |
| Actors | QTV / Quản lý, Lễ tân, Hội viên |
| Scope | Thu nhiều lần cho một đăng ký; tiền mặt; chuyển khoản ngân hàng VND; xác nhận chuyển khoản tự động khi thông báo hợp lệ; luồng đối soát thủ công cho giao dịch bất thường; công nợ; khóa quyền tập/booking khi chưa thanh toán đủ; phiếu thu nội bộ; xem/xuất/in phiếu theo quyền; điều chỉnh sai sót đã xác nhận theo quy trình có duyệt. |
| Related requirements | Product Spec §3 Thanh toán & công nợ; §4 Thanh toán; §6 OPEN-04. |
| Prerequisites | E02 Package Catalog, Registration & Entitlements; E08 Accounts, Roles, Permissions & Audit. |
| Related Epics | E03 Pricing & Discount Governance; E05 PT Assignment, Schedule & Session Lifecycle; E06 Gym Access, Check-in & Visit History; E09 Notifications & Member Care; E11 Operational Reporting & Insights. |

## E05 - PT Assignment, Schedule & Session Lifecycle

| Field | Content |
| --- | --- |
| Epic ID | E05 |
| Name | PT Assignment, Schedule & Session Lifecycle |
| Goal | Quản lý yêu cầu phân công PT (assignment request), lịch làm việc cố định, booking và tiêu thụ buổi PT theo xác nhận kép. |
| Actors | QTV / Quản lý, Lễ tân, PT, Hội viên |
| Scope | Hồ sơ PT; giờ làm việc cố định (T2→T6, 8h→17h); PT_ASSIGNMENT_REQUEST (PENDING/ACCEPTED/REJECTED) — hội viên chọn PT và gửi yêu cầu, PT chấp nhận hoặc từ chối; slot khả dụng = giờ cố định - booking đã xác nhận; Lễ tân đặt lịch thay cho hội viên (kể cả chưa có account mobile); đặt/đổi/hủy lịch; giữ chỗ buổi PT; tổng buổi, đã sử dụng/khấu trừ, đang giữ chỗ, còn có thể đặt; xác nhận kép (PT + Hội viên) để hoàn thành buổi và trừ buổi; vắng mặt, hủy muộn, lỗi từ PT/phòng tập; QTV sửa kết quả có lý do và audit. |
| Related requirements | Product Spec §3 Quản lý PT, Lịch tập & buổi PT; §4 PT/lịch tập; §6 OPEN-08. |
| Prerequisites | E01 Member & Customer Profile; E02 Package Catalog, Registration & Entitlements; E07 Branch Operations & Data Scope; E08 Accounts, Roles, Permissions & Audit. |
| Related Epics | E04 Payment, Debt & Receipts; E06 Gym Access, Check-in & Visit History; E09 Notifications & Member Care; E11 Operational Reporting & Insights. |

## E06 - Gym Access, Check-in & Visit History

| Field | Content |
| --- | --- |
| Epic ID | E06 |
| Name | Gym Access, Check-in & Visit History |
| Goal | Xác định quyền vào tập và ghi nhận lịch sử ra/vào chính xác, riêng tư và theo phạm vi chi nhánh. |
| Actors | QTV / Quản lý, Lễ tân, Hội viên, K01 / Màn hình công cộng |
| Scope | Ghi nhận IN/OUT khi chi nhánh hỗ trợ; kiểm tra điều kiện vào tập; xử lý nhận diện thành công nhưng không đủ điều kiện; ghi nhận thủ công theo quyền và lý do; chống tính trùng sự kiện; trừ buổi Gym theo buổi tối đa một lần/ngày; hiển thị K01 ở mức tối thiểu, không lộ dữ liệu riêng tư. |
| Related requirements | Product Spec §3 Check-in / ra vào; §4 Check-in/ra vào; §6 OPEN-07. |
| Prerequisites | E01 Member & Customer Profile; E02 Package Catalog, Registration & Entitlements; E04 Payment, Debt & Receipts; E07 Branch Operations & Data Scope; E08 Accounts, Roles, Permissions & Audit. |
| Related Epics | E05 PT Assignment, Schedule & Session Lifecycle; E09 Notifications & Member Care; E10 Devices & Recognition Consent; E11 Operational Reporting & Insights. |

## E07 - Branch Operations & Data Scope

| Field | Content |
| --- | --- |
| Epic ID | E07 |
| Name | Branch Operations & Data Scope |
| Goal | Hỗ trợ mô hình một chi nhánh chính và nhiều chi nhánh trực thuộc với dữ liệu, quyền và vận hành đúng phạm vi. |
| Actors | QTV / Quản lý, Lễ tân, PT, Hội viên |
| Scope | Quản lý chi nhánh, giờ hoạt động, trạng thái; chi nhánh chính và chi nhánh con; chi nhánh bán và chi nhánh sử dụng; phạm vi gói theo chi nhánh; dữ liệu hội viên toàn hệ thống nhưng truy cập theo quyền; chuyển chi nhánh làm việc; lịch tuần, ngày nghỉ/ngoại lệ, múi giờ; xử lý chi nhánh ngừng hoạt động. |
| Related requirements | Product Spec §3 Chi nhánh; §4 Chi nhánh. |
| Prerequisites | None. |
| Related Epics | E01 Member & Customer Profile; E02 Package Catalog, Registration & Entitlements; E05 PT Assignment, Schedule & Session Lifecycle; E06 Gym Access, Check-in & Visit History; E08 Accounts, Roles, Permissions & Audit; E10 Devices & Recognition Consent; E11 Operational Reporting & Insights. |

## E08 - Accounts, Roles, Permissions & Audit

| Field | Content |
| --- | --- |
| Epic ID | E08 |
| Name | Accounts, Roles, Permissions & Audit |
| Goal | Kiểm soát tài khoản, vai trò, phạm vi chi nhánh, permission nhạy cảm và audit cho các nghiệp vụ quan trọng. |
| Actors | QTV / Quản lý, Lễ tân, PT, Hội viên |
| Scope | Role QTV, Lễ tân, PT, Hội viên/Khách hàng; tài khoản tách với hồ sơ nghiệp vụ; số điện thoại đăng nhập duy nhất; nhiều role trên một tài khoản nhưng không cộng gộp quyền; chuyển role/chi nhánh theo ngữ cảnh; trạng thái tài khoản; permission cho thao tác nhạy cảm; audit hành động quan trọng theo phạm vi. |
| Related requirements | Product Spec §2 Actors & Permissions; §3 Tài khoản & phân quyền; §4 Tài khoản/phân quyền. |
| Prerequisites | E07 Branch Operations & Data Scope. |
| Related Epics | E01 Member & Customer Profile; E03 Pricing & Discount Governance; E04 Payment, Debt & Receipts; E05 PT Assignment, Schedule & Session Lifecycle; E06 Gym Access, Check-in & Visit History; E10 Devices & Recognition Consent; E11 Operational Reporting & Insights. |

## E09 - Notifications & Member Care

| Field | Content |
| --- | --- |
| Epic ID | E09 |
| Name | Notifications & Member Care |
| Goal | Gửi thông báo đúng người, đúng sự kiện và hỗ trợ chăm sóc hội viên theo consent. |
| Actors | QTV / Quản lý, Lễ tân, PT, Hội viên |
| Scope | In-app notification; nhóm sự kiện đăng ký/gia hạn, thanh toán, phân công PT, lịch PT, quyền lợi gói, sinh nhật, thiết bị/hệ thống; mốc nhắc gói và PT; người nhận theo đối tượng liên quan, chi nhánh, người phụ trách và quyền; tách trạng thái đọc/gửi/xử lý; chống tạo trùng; mẫu nội dung đã duyệt; consent cho giao dịch, chăm sóc, tiếp thị và sinh nhật công khai; ghi nhận liên hệ chăm sóc. |
| Related requirements | Product Spec §3 Chăm sóc & thông báo; §4 Thông báo; §6 OPEN-06. |
| Prerequisites | E07 Branch Operations & Data Scope; E08 Accounts, Roles, Permissions & Audit. |
| Related Epics | E01 Member & Customer Profile; E02 Package Catalog, Registration & Entitlements; E04 Payment, Debt & Receipts; E05 PT Assignment, Schedule & Session Lifecycle; E06 Gym Access, Check-in & Visit History; E10 Devices & Recognition Consent; E11 Operational Reporting & Insights. |

## E10 - Devices & Recognition Consent

| Field | Content |
| --- | --- |
| Epic ID | E10 |
| Name | Devices & Recognition Consent |
| Goal | Quản lý thiết bị nhận diện/ra vào, trạng thái thiết bị và consent nhận diện mà chưa mặc định điều khiển khóa/cổng. |
| Actors | QTV / Quản lý, Lễ tân, Hội viên, K01 / Màn hình công cộng |
| Scope | Thiết bị nhận diện/đầu đọc ra-vào và màn hình K01; mã thiết bị, chi nhánh, điểm lắp, mục đích IN/OUT/BOTH nếu hỗ trợ; trạng thái Online, Offline, Error, Pending Sync; quy trình consent nhận diện; ảnh hồ sơ không tự thành dữ liệu nhận diện; rút consent; xử lý lỗi thiết bị; lưu lịch sử vào/ra và log thiết bị theo thời hạn đã chốt. |
| Related requirements | Product Spec §3 Thiết bị & nhận diện; §4 Thiết bị/nhận diện; §6 OPEN-07. |
| Prerequisites | E01 Member & Customer Profile; E06 Gym Access, Check-in & Visit History; E07 Branch Operations & Data Scope; E08 Accounts, Roles, Permissions & Audit. |
| Related Epics | E09 Notifications & Member Care; E11 Operational Reporting & Insights. |

## E11 - Operational Reporting & Insights

| Field | Content |
| --- | --- |
| Epic ID | E11 |
| Name | Operational Reporting & Insights |
| Goal | Cung cấp số liệu vận hành theo kỳ, chi nhánh và quyền để QTV theo dõi tình hình phòng gym. |
| Actors | QTV / Quản lý, Lễ tân |
| Scope | Tổng quan vận hành; việc cần xử lý; lịch hôm nay; cảnh báo gói/lịch/check-in/thanh toán; báo cáo theo kỳ/chi nhánh/quyền; tách giá trị đăng ký sau giảm, tiền thực thu và còn phải thu; xem/xuất dữ liệu trong phạm vi được cấp. |
| Related requirements | Product Spec §3 Tổng quan vận hành, Báo cáo; §4 Thanh toán, Chi nhánh, Tài khoản/phân quyền. |
| Prerequisites | E02 Package Catalog, Registration & Entitlements; E03 Pricing & Discount Governance; E04 Payment, Debt & Receipts; E05 PT Assignment, Schedule & Session Lifecycle; E06 Gym Access, Check-in & Visit History; E07 Branch Operations & Data Scope; E08 Accounts, Roles, Permissions & Audit; E10 Devices & Recognition Consent. |
| Related Epics | E09 Notifications & Member Care. |

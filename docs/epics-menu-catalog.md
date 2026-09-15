# Epics / Menu Modules - Paradise Gym

Tài liệu này dùng mô hình phân cấp thống nhất:

```text
Product Spec → Epic/Menu → User Story → Activity Diagram → UI Screen
```

Mỗi Epic là **một module/menu lớn trên hệ thống**. Mỗi User Story là **một chức năng nằm trong menu đó**; phần cuối của từng User Story có đặc tả luồng hoạt động bằng activity diagram dạng swimlane.

> Đây là catalog capability/menu dùng chung được giữ để đối chiếu. Epic canonical hiện được phân theo role và platform tại `docs/epic/`; không dùng các `E##/W##` trong file này để thay thế cho role-specific Epic Mobile của Hội viên/PT.

Quy ước chung:

- `E##` là Epic ID và `W##` là Menu ID tương ứng.
- `C` = Create; `R` = Read; `U` = Update; `CRUD` = quản lý dữ liệu.
- `Workflow` = luồng chuyển trạng thái, phê duyệt hoặc xác nhận.
- `Export` = xuất báo cáo/phiếu.
- Bản ghi nghiệp vụ có lịch sử như đăng ký, thanh toán, booking, buổi PT và audit không bị xóa vật lý; dùng trạng thái, hủy, archive hoặc adjustment.
- Phạm vi dữ liệu luôn được kiểm soát theo role, permission và branch scope.

## E01 - W01 Tổng quan vận hành

| Field | Content |
| --- | --- |
| Epic ID | E01 |
| Menu ID | W01 |
| Module name | Tổng quan vận hành |
| Goal | Cung cấp màn hình tổng quan vận hành phân hóa theo role (QTV vs Lễ tân) để nắm bắt trạng thái hệ thống trong ngày và danh sách công việc cần xử lý. |
| Actors | QTV / Quản lý, Lễ tân, SYS |
| Scope | Phân hóa 5 khối thành phần Dashboard theo Role: 1. Bộ lọc (QTV: Kỳ & Combobox chi nhánh; Lễ tân: Scope chi nhánh cố định); 2. KPI vận hành (QTV: 4 nhóm chỉ số quản trị & thanh toán 100%, không công nợ; Lễ tân: 4 chỉ số quầy hôm nay); 3. Thẻ Việc cần xử lý (Cards click được điều hướng sang W04/W05/W06/W07/W12); 4. Hoạt động hôm nay (Lịch PT hôm nay & Check-in); 5. Cảnh báo & Quick Actions (QTV: Thêm HV, Tạo đăng ký, Cấu hình thông báo, Báo cáo; Lễ tân: Thêm HV, Tạo đăng ký, Đặt lịch PT, Ghi nhận Ra/Vào). |
| CRUD/workflow summary | `R`; dữ liệu tổng hợp theo role, permission, branch scope và thời điểm hiện tại. Không thực hiện chỉnh sửa nghiệp vụ trực tiếp tại W01. |
| Related UI | Web W01 Tổng quan (QTV Dashboard & Lễ tân Counter Dashboard). |
| User Stories | `QTV-W01-US01` — Xem tổng quan vận hành QTV; `LT-W01-US01` — Xem tổng quan vận hành chi nhánh Lễ tân |

## E02 - W02 Hội viên & khách hàng

| Field | Content |
| --- | --- |
| Epic ID | E02 |
| Menu ID | W02 |
| Module name | Hội viên & khách hàng |
| Goal | Quản lý hồ sơ hội viên/khách hàng thống nhất, bảo đảm dữ liệu liên hệ duy nhất và tra cứu được danh sách phục vụ. |
| Actors | QTV / Quản lý, Lễ tân, PT, Hội viên, SYS |
| Scope | Thêm, sửa hồ sơ, đổi trạng thái và xem danh sách hội viên theo quyền. Chuẩn hóa/kiểm tra duy nhất số điện thoại là rule trong form thêm/sửa; lịch sử gói, thanh toán, lịch PT và ra/vào là dữ liệu liên quan được mở từ hồ sơ. Hồ sơ nghiệp vụ độc lập với tài khoản đăng nhập. |
| CRUD/workflow summary | `C/U/R`; đổi trạng thái là workflow có lý do và audit khi cần; không xóa hồ sơ có lịch sử bằng thao tác thông thường. |
| Related UI | Web W02 Hội viên & KH; mobile M02 Hội viên; các modal thêm/sửa hồ sơ và đổi trạng thái. |
| User Stories | `E02-US01` — Thêm hội viên; `E02-US02` — Sửa hồ sơ hội viên; `E02-US03` — Đổi trạng thái hội viên; `E02-US04` — Xem danh sách hội viên |

## E03 - W03 Gói tập

| Field | Content |
| --- | --- |
| Epic ID | E03 |
| Menu ID | W03 |
| Module name | Gói tập |
| Goal | Quản lý danh mục gói và quyền lợi được phép bán. |
| Actors | QTV / Quản lý, Lễ tân, PT, Hội viên, SYS |
| Scope | Gói Gym theo thời gian, Gym theo buổi, PT theo buổi và Combo Gym + PT; giá, quyền Gym/PT, thời hạn, trạng thái bán, phạm vi chi nhánh; xem chi tiết catalog. Chi tiết lượt đăng ký của hội viên thuộc W04. |
| CRUD/workflow summary | `CRUD` cho danh mục; `R` cho chi tiết gói/quyền lợi; ngừng bán dùng trạng thái thay vì xóa gói đã phát sinh giao dịch. |
| Related UI | Web W03 Gói tập; modal tạo/sửa danh mục; drawer xem chi tiết gói. |
| User Stories | `E03-US01` — Xem danh sách gói tập; `E03-US02` — Thêm gói tập; `E03-US03` — Sửa gói tập; `E03-US04` — Ngừng bán gói |

## E04 - W04 Đăng ký & gia hạn

| Field | Content |
| --- | --- |
| Epic ID | E04 |
| Menu ID | W04 |
| Module name | Đăng ký & gia hạn |
| Goal | Tạo đăng ký mới và gia hạn đúng gói, giá, quyền lợi và phạm vi chi nhánh. |
| Actors | QTV / Quản lý, Lễ tân, Hội viên, SYS |
| Scope | Chọn hội viên và gói, tạo registration, xem chi tiết registration/quyền lợi, tạo registration gia hạn nối tiếp, snapshot giá/quyền lợi/phạm vi. Gói PT/Combo được xử lý tiếp qua luồng phân công PT. |
| CRUD/workflow summary | `C/R` cho registration; `Workflow` cho chờ thanh toán; registration cũ không bị sửa để thay thế dữ liệu lịch sử. |
| Related UI | Web W04 Đăng ký & gia hạn; danh sách/drawer registration; modal đăng ký/gia hạn. |
| User Stories | `US01` — Tạo đăng ký gói mới; `US02` — Gia hạn đăng ký gói; `US03` — Xem danh sách các đăng ký; `US04` — Xem chi tiết lượt đăng ký gói; `US05` — Gán PT phụ trách cho gói đăng ký |

## E05 - W05 Huấn luyện viên

| Field | Content |
| --- | --- |
| Epic ID | E05 |
| Menu ID | W05 |
| Module name | Huấn luyện viên |
| Goal | Quản lý hồ sơ, trạng thái PT và yêu cầu phân công PT cho hội viên có quyền PT. |
| Actors | QTV / Quản lý, Lễ tân, PT, Hội viên, SYS |
| Scope | Hồ sơ PT, trạng thái hoạt động; hội viên hoặc Lễ tân chọn PT; PT tiếp nhận, chấp nhận hoặc từ chối assignment request. Lịch làm việc cố định là system configuration dùng để tính slot W06, không phải User Story quản trị độc lập. |
| CRUD/workflow summary | `CRUD/U` cho hồ sơ; `Workflow` cho request `PENDING → ACCEPTED/REJECTED`; assignment chỉ có hiệu lực sau khi PT chấp nhận. |
| Related UI | Web W05 Huấn luyện viên; màn hình danh sách PT và yêu cầu phân công. |
| User Stories | QTV: `QTV-W05-US01` (Thêm hồ sơ PT), `QTV-W05-US02` (Sửa hồ sơ PT), `QTV-W05-US03` (Cập nhật trạng thái hồ sơ PT), `QTV-W05-US04` (Xem danh sách PT); Lễ tân: `LT-W05-US01` (Xem danh sách PT - Read-only) |

## E06 - W06 Lịch tập & buổi PT

| Field | Content |
| --- | --- |
| Epic ID | E06 |
| Menu ID | W06 |
| Module name | Lịch tập & buổi PT |
| Goal | Quản lý slot, booking và vòng đời buổi PT, bảo đảm số buổi chỉ được khấu trừ khi đủ điều kiện xác nhận. |
| Actors | QTV / Quản lý, Lễ tân, PT, Hội viên, SYS |
| Scope | Xem lịch theo PT, đặt lịch, đổi/hủy lịch, giữ chỗ, kiểm tra gói và assignment, cập nhật trạng thái `UPCOMING`, `AWAITING_CONFIRMATION`, `DONE`, `CANCELLED`; xác nhận kép và điều chỉnh kết quả buổi PT. |
| CRUD/workflow summary | `C/Workflow` khi đặt; `U/Workflow` khi đổi hoặc hủy; `Workflow/U` khi xác nhận/điều chỉnh kết quả; booking hủy vẫn giữ record và audit. |
| Related UI | Web W06 Lịch tập & buổi PT; mobile Lịch của tôi/Đặt lịch PT; modal đặt, đổi/hủy, xác nhận và điều chỉnh kết quả. |
| User Stories | `E06-US01` — Xem lịch PT; `E06-US02` — Đặt lịch PT; `E06-US03` — Xác nhận hoàn thành buổi học; `E06-US04` — Hủy lịch PT |

## E07 - W07 Ra vào & check-in

| Field | Content |
| --- | --- |
| Epic ID | E07 |
| Menu ID | W07 |
| Module name | Ra / Vào |
| Goal | Màn hình kiểm soát check-in/check-out của hội viên tại phòng Gym, ghi nhận Vào/Ra thủ công và theo dõi trạng thái thiết bị cùng nhật ký ra vào. |
| Actors | QTV / Quản lý, Lễ tân, SYS, Thiết bị nhận diện |
| Scope | Kiểm tra 6 điều kiện tự động (Profile ACTIVE, Gói còn hạn, Thanh toán 100%, Đúng chi nhánh, Còn số buổi, Trong giờ); Ghi nhận Vào/Ra thủ công (Card kiểm soát nhanh bên trái & Modal thủ công chuyên sâu 9 trường); Card trạng thái thiết bị (Online/Offline, Kiosk K01); Bảng Nhật ký Ra/Vào thời gian thực ở bên phải. |
| CRUD/workflow summary | `C/Workflow` cho sự kiện Vào/Ra tự động & thủ công; `R` cho trạng thái thiết bị & nhật ký ra vào. |
| Related UI | Web W07 Ra / Vào; Card Kiểm soát ra/vào; Card Thiết bị; Modal Ghi nhận ra/vào thủ công; Bảng Nhật ký ra/vào hôm nay. |
| User Stories | `QTV-W07-US01` / `LT-W07-US01` — Xử lý check-in tự động qua thiết bị; `QTV-W07-US02` / `LT-W07-US02` — Ghi nhận Vào/Ra thủ công; `QTV-W07-US03` / `LT-W07-US03` — Xem nhật ký Ra/Vào và theo dõi trạng thái thiết bị |

## E08 - W08 Thu tiền & thanh toán

| Field | Content |
| --- | --- |
| Epic ID | E08 |
| Menu ID | W08 |
| Module name | Thu tiền & thanh toán |
| Goal | Xem danh sách Payment 100%, Tạo payment cho các đăng ký PENDING_PAYMENT và Xem thống kê thu tiền. |
| Actors | QTV / Quản lý, Lễ tân, SYS |
| Scope | Xem danh sách Payment (100% đã thu tiền thành công, không có Payment pending); Tạo Payment (kích hoạt đăng ký từ PENDING_PAYMENT sang ACTIVE/SCHEDULED); Xem thống kê thu tiền thực tế (Tiền mặt, Chuyển khoản). |
| CRUD/workflow summary | `R` cho danh sách Payment & Thống kê; `C/Workflow` cho Tạo Payment. |
| Related UI | Web W08 Thu tiền & thanh toán; modal Tạo payment (`payment-form`); tab Thống kê. |
| User Stories | `QTV-W08-US01` / `LT-W08-US01` — Xem danh sách payment; `QTV-W08-US02` / `LT-W08-US02` — Tạo payment; `QTV-W08-US03` / `LT-W08-US03` — Xem thống kê |

## E09 - W09 Quản lý thông báo

| Field | Content |
| --- | --- |
| Epic ID | E09 |
| Menu ID | W09 |
| Module name | Quản lý thông báo |
| Goal | Cấu hình loại/quy tắc thông báo hệ thống, quản lý mẫu (template) in-app và tra cứu lịch sử phát hành thông báo tự động từ sự kiện nghiệp vụ. |
| Actors | QTV / Quản lý, Lễ tân, PT, Hội viên, SYS |
| Scope | Kiến trúc kiến tạo thông báo tự động theo sự kiện (Event-Driven Notification): Việc phát và gửi thông báo được Hệ thống (SYS) thực hiện tự động khi các sự kiện nghiệp vụ phát sinh (Payment, Booking, PT Assignment, Expiring Package...). W09 đóng vai trò cấu hình quy tắc loại thông báo, CRUD template mẫu và tra cứu nhật ký lịch sử gửi in-app. |
| CRUD/workflow summary | `R/U` cho Quy tắc loại thông báo (`US01`); `C/R/U` cho Mẫu Template (`US02`); `R` cho Lịch sử thông báo đã gửi (`US03`). Không cho phép QTV soạn gửi thủ công hoặc xóa nhật ký thông báo đã phát. |
| Related UI | Web W09 Quản lý thông báo (Tab Quy tắc loại thông báo, Tab Mẫu thông báo, Tab Lịch sử gửi). |
| User Stories | `QTV-W09-US01` — Cấu hình thông báo tự động; `QTV-W09-US02` — Quản lý mẫu thông báo in-app; `QTV-W09-US03` — Tra cứu lịch sử gửi thông báo; `LT-W09-US01` — Tra cứu lịch sử gửi thông báo chi nhánh |

## E10 - W10 Báo cáo

| Field | Content |
| --- | --- |
| Epic ID | E10 |
| Menu ID | W10 |
| Module name | Báo cáo |
| Goal | Cung cấp số liệu báo cáo quản trị tổng hợp kinh doanh và vận hành theo kỳ (Tháng/Quý/Năm) và chi nhánh. |
| Actors | QTV / Quản lý, SYS |
| Scope | Bộ lọc bộ mốc thời gian [Tháng] [Quý] [Năm] & [Chi nhánh ▼]; 4 nhóm báo cáo: 1. Tài chính (Tổng thực thu, Số giao dịch, Tiền mặt, Chuyển khoản); 2. Bán gói (Tổng gói bán, Doanh số Gym/PT/Combo, Gói bán chạy); 3. Hội viên (Hội viên mới, Hội viên đang hoạt động, Lượt check-in); 4. PT (Buổi PT hoàn thành, Buổi PT từng HLV, Số hội viên có PT). |
| CRUD/workflow summary | `R` cho báo cáo tổng hợp 4 nhóm chỉ số quản trị. |
| Related UI | Web W10 Báo cáo. |
| User Stories | `QTV-W10-US01` — Xem báo cáo tổng hợp |

## E11 - W11 Chi nhánh

| Field | Content |
| --- | --- |
| Epic ID | E11 |
| Menu ID | W11 |
| Module name | Chi nhánh |
| Goal | Quản lý danh sách chi nhánh, thêm chi nhánh mới, chỉnh sửa thông tin chi nhánh và xem số liệu chi nhánh (Độc quyền QTV cấp tối cao - Toàn chuỗi). |
| Actors | QTV cấp tối cao (Quản trị viên - Toàn chuỗi), SYS |
| Scope | Xem danh sách các Card chi nhánh kèm 3 chỉ số tổng quan (Hội viên, HLV, Đang tập); Thêm chi nhánh mới; Chỉnh sửa thông tin chi nhánh; Xem số liệu chi nhánh. |
| CRUD/workflow summary | `R` cho danh sách và số liệu; `C` cho thêm chi nhánh; `U` cho chỉnh sửa chi nhánh. |
| Related UI | Web W11 Chi nhánh; Card chi nhánh; modal Thêm/Sửa chi nhánh; Drawer Số liệu. |
| User Stories | `QTV-W11-US01` — Xem danh sách chi nhánh; `QTV-W11-US02` — Thêm chi nhánh; `QTV-W11-US03` — Chỉnh sửa chi nhánh; `QTV-W11-US04` — Xem số liệu chi nhánh |

## E12 - W12 Hệ thống & thiết bị

| Field | Content |
| --- | --- |
| Epic ID | E12 |
| Menu ID | W12 |
| Module name | Hệ thống & thiết bị |
| Goal | Quản lý thiết bị nhận diện/ra vào và consent nhận diện, bảo đảm sự cố thiết bị không làm mất sự kiện vận hành. |
| Actors | QTV / Quản lý, Lễ tân, Hội viên, Thiết bị, SYS |
| Scope | Hồ sơ thiết bị, chi nhánh/điểm lắp, mục đích IN/OUT/BOTH, trạng thái Online/Offline/Error/Pending Sync; đăng ký/rút consent; thử nhận diện; theo dõi sự cố và xử lý event gửi bù trong cùng capability. |
| CRUD/workflow summary | `CRUD/U` cho thiết bị; `C/Workflow` cho đăng ký consent; `U/Workflow` cho rút consent và theo dõi trạng thái/sự cố; event gửi bù/chống trùng là system rules. |
| Related UI | Web W12 Hệ thống & thiết bị; modal thiết bị/kết nối; luồng consent và thử nhận diện. |
| User Stories | `E12-US01` — Quản lý thiết bị nhận diện/ra vào; `E12-US02` — Đăng ký dữ liệu nhận diện có consent; `E12-US03` — Rút consent nhận diện; `E12-US04` — Theo dõi trạng thái và sự cố thiết bị |

## E13 - W13 Tài khoản & phân quyền

| Field | Content |
| --- | --- |
| Epic ID | E13 |
| Menu ID | W13 |
| Module name | Tài khoản & phân quyền |
| Goal | Quản lý xem danh sách tài khoản, thống kê KPI và sửa tài khoản (trạng thái, vai trò, phạm vi chi nhánh). |
| Actors | QTV / Quản lý, SYS |
| Scope | Xem danh sách tài khoản, 4 thẻ KPI thống kê (Tổng tài khoản, Hoạt động, Chờ kích hoạt, Đã khóa/Tạm dừng), tìm kiếm theo SĐT/Tên, lọc vai trò/trạng thái; sửa tài khoản (cập nhật trạng thái, chọn nhiều vai trò, chọn phạm vi chi nhánh cho nhân viên). |
| CRUD/workflow summary | `R` cho danh sách & KPI; `U` cho sửa tài khoản (trạng thái, vai trò, phạm vi chi nhánh). |
| Related UI | Web W13 Tài khoản & phân quyền; modal Sửa tài khoản. |
| User Stories | `QTV-W13-US01` — Xem danh sách tài khoản và thống kê KPI; `QTV-W13-US02` — Sửa tài khoản |

## Traceability

- Product Spec: `docs/product-spec.md`
- Epic canonical theo role: `docs/epic/`
- User Story canonical theo role: `docs/user-stories/`
- User Story legacy để đối chiếu lịch sử: `docs/user-stories-legacy/`
- Chỉ mục activity diagram theo role: `docs/system-flow-specs/`
- Đối chiếu UI/screen: `docs/ui-related-screen-audit.md`



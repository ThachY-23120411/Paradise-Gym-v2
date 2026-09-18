# 1. Overview & Goals

Paradise Gym là hệ thống quản trị và vận hành chuỗi phòng gym đa chi nhánh trên hai nền tảng Web và Mobile, phục vụ đồng bộ 4 nhóm đối tượng: Quản trị viên (QTV), Lễ tân, Huấn luyện viên (PT) và Hội viên.

| Mục | Nội dung |
| --- | --- |
| Nguồn đầu vào | Yêu cầu nghiệp vụ chuỗi phòng gym, hồ sơ thiết kế UI/UX, catalog phân hệ và danh mục quyết định nghiệp vụ đã thống nhất |
| Nguyên tắc cốt lõi | Tài liệu mô tả bản chất nghiệp vụ (WHAT); giao diện là công cụ trực quan hóa luồng vận hành, không tự suy diễn chi tiết đồ họa thành quy tắc nghiệp vụ khi chưa chuẩn hóa |
| Phạm vi mô tả | Định nghĩa vai trò (Actors), ma trận phân quyền, danh mục tính năng cốt lõi (Core Features), quy tắc nghiệp vụ chi tiết (Business Rules), phạm vi loại trừ (Out of Scope) và các vấn đề mở |
| Không thuộc tài liệu này | Thiết kế kỹ thuật chi tiết, lựa chọn framework/cơ sở dữ liệu, kiến trúc hạ tầng triển khai và mã nguồn ứng dụng |

**Mục tiêu hệ thống (Goals):**

- **Quản lý vận hành xuyên suốt:** Kết nối liền mạch toàn bộ vòng đời hội viên từ tiếp nhận, đăng ký/gia hạn gói tập, phân công PT, đặt và xác nhận lịch tập, thanh toán 100%, kiểm soát ra vào/check-in, thông báo tự động đến báo cáo kinh doanh.
- **Phân quyền chặt chẽ theo 3 lớp:** Vai trò người dùng (Role), phạm vi chi nhánh làm việc (Branch Scope) và quyền hạn tác vụ chi tiết (Permission).
- **Tách bạch 4 thực thể nghiệp vụ cốt lõi:** Hồ sơ hội viên (Profile) $\neq$ Hiệu lực đăng ký gói (Registration) $\neq$ Quyền vào cửa (Access Right) $\neq$ Quyền đặt lịch PT (Booking Right).
- **Vận hành chuỗi đa chi nhánh:** Hỗ trợ mô hình một trụ sở chính và nhiều chi nhánh thành viên; phân định rành mạch quyền dữ liệu nội bộ từng chi nhánh và quyền điều hành toàn chuỗi.
- **Tính toàn vẹn và Audit Trail:** Lưu vết kiểm toán bất biến (Audit Log) cho toàn bộ các thao tác tài chính, kích hoạt quyền tập, quản trị tài khoản, consent dữ liệu cá nhân và can thiệp nghiệp vụ nhạy cảm.

---

# 2. Actors & Permissions

| Actor | Nền tảng | Quyền hạn và phạm vi thao tác | Giới hạn nghiệp vụ chính |
| --- | --- | --- | --- |
| **QTV / Quản lý** | Web only | - Quản trị hệ thống theo phạm vi chi nhánh được phân công (Toàn chuỗi hoặc Chi nhánh phụ trách).<br>- Giám sát Dashboard (W01), quản lý hồ sơ Hội viên (W02), danh mục Gói tập (W03), Đăng ký & gia hạn (W04), hồ sơ PT (W05), điều phối Lịch PT (W06), giám sát Check-in (W07), Thu tiền & thanh toán 100% (W08), quản lý mẫu Thông báo (W09), xem Báo cáo gom dòng (W10), cấu hình Thiết bị (W12), quản lý Tài khoản & phân quyền (W13).<br>- Riêng QTV toàn chuỗi: độc quyền quản trị Chi nhánh (W11). | - Không có ứng dụng Mobile canonical.<br>- Quyền hạn trên Web tuân thủ nghiêm ngặt theo `Role + Branch Scope + Permission`; không mặc định mọi QTV đều có quyền toàn chuỗi.<br>- Không được phép tự khóa hoặc hạ quyền tài khoản QTV tối cao của chính mình. |
| **Lễ tân** | Web only | - Tiếp nhận và tạo hồ sơ hội viên tại quầy (W02).<br>- Tạo đăng ký gói mới và gia hạn gói tập (W04).<br>- Đặt lịch tập PT thay cho hội viên theo PT phụ trách hợp lệ (W06).<br>- Ghi nhận thanh toán tiền mặt 100% hoặc xác nhận chuyển khoản VietQR tại quầy, xuất phiếu thu (W08).<br>- Hỗ trợ check-in tại quầy và ghi nhận lượt ra vào thủ công khi có sự cố thiết bị (W07).<br>- Tra cứu thông báo và lịch sử chăm sóc hội viên trong chi nhánh (W09). | - Không có ứng dụng Mobile canonical.<br>- Phạm vi dữ liệu gắn cứng với chi nhánh đang làm việc (Active Branch).<br>- Không được chỉnh sửa giá gói hoặc tạo gói tập mới (W03).<br>- Không được quản trị chi nhánh (W11), cấu hình thiết bị (W12) hoặc quản lý tài khoản/phân quyền (W13).<br>- Không xem báo cáo doanh thu quản trị cấp cao (W10). |
| **Huấn luyện viên (PT)** | Mobile only | - Quản lý lịch dạy cá nhân theo khung giờ làm việc cố định (PT01).<br>- Xem danh sách học viên được phân công chính thức (PT02).<br>- Tiếp nhận và xử lý yêu cầu phân công học viên (`PT_ASSIGNMENT_REQUEST`: Đồng ý / Từ chối) (PT03 / HV01).<br>- Ghi nhận và xác nhận hoàn thành buổi tập đã diễn ra (PT01). | - Không có giao diện Web canonical.<br>- Làm việc theo khung giờ cố định do trung tâm ban hành (Thứ 2 - Thứ 6, 08:00 - 18:00); PT **không** tự cấu hình giờ rảnh (availability).<br>- Không được xem doanh thu, lịch sử thanh toán hay chi tiết tiền gói của học viên.<br>- Không xem được học viên ngoài danh sách phân công; không tự cấp quyền hay can thiệp hồ sơ gốc. |
| **Hội viên** | Mobile only | - Sử dụng ứng dụng Mobile 4 tab chính: Trang chủ (HV01), Lịch tập (HV02), Gói của tôi (HV03), Tài khoản (HV04).<br>- Xem thông tin gói tập, tiến độ buổi dạy; chủ động chọn PT mong muốn tại chi nhánh cho gói PT/Combo (HV03).<br>- Đặt, đổi, hủy lịch tập PT theo slot khả dụng (HV02 - hủy trước ít nhất 12 giờ).<br>- Xác nhận hoàn thành buổi tập (xác nhận 2 chiều cùng PT) (HV02).<br>- Xem lịch sử thanh toán 100% và tra cứu phiếu thu của chính mình (HV03).<br>- Tự kích hoạt tài khoản bằng OTP qua SĐT đã đăng ký tại quầy (HV04/HV05). | - Không có giao diện Web canonical.<br>- Không tự chỉnh sửa số buổi, thời hạn gói, trạng thái thanh toán hoặc ghi chú nội bộ của nhân viên.<br>- Không thể xem dữ liệu của hội viên khác. |
| **K01 / Màn hình công cộng** | Public Screen | - Hiển thị phản hồi tức thì trạng thái quẹt thẻ/nhận diện ra vào tại cửa (Hợp lệ / Không hợp lệ) cùng thông điệp hướng dẫn trung tính. | - Không phải là role tài khoản người dùng.<br>- Tuyệt đối không hiển thị thông tin nhạy cảm: Số điện thoại, email, giá tiền gói, công nợ, ghi chú vận hành.<br>- Chỉ hiển thị họ tên, ảnh đại diện và lời chúc sinh nhật khi hội viên đã cấp Consent công khai. |

---

# 3. Scope & Core Features

### Phân hệ Quản trị Web (QTV & Lễ tân: W01 - W13)

| Mã Menu | Tên Phân hệ | Đối tượng | Phạm vi và chức năng chính |
| --- | --- | --- | --- |
| **W01** | Tổng quan | QTV, Lễ tân | Dashboard số liệu vận hành thời gian thực theo chi nhánh/toàn chuỗi: hội viên đang tập, lịch PT hôm nay, cảnh báo gói sắp hết hạn, công việc cần xử lý. |
| **W02** | Hội viên & khách hàng | QTV, Lễ tân | Quản lý hồ sơ hội viên; chuẩn hóa và kiểm tra trùng lặp Số điện thoại (SĐT) theo thời gian thực (real-time); cập nhật trạng thái hồ sơ (Hoạt động, Ngừng hoạt động, Đã lưu trữ); xem 360° hồ sơ gói, lịch tập, ra vào. |
| **W03** | Gói tập | QTV Web | Quản lý danh mục 4 loại gói cơ sở (Gym thời gian, Gym buổi, PT buổi, Combo Gym+PT); thiết lập quyền lợi, giá niêm yết, thời hạn, số buổi; cơ chế snapshot đóng băng thông tin gói tại thời điểm bán. |
| **W04** | Đăng ký & gia hạn | QTV, Lễ tân | Tạo mới đăng ký gói tập tại quầy; gia hạn gói tập nối tiếp quyền lợi đang có; quản lý trạng thái đăng ký (`PENDING_PAYMENT`, `SCHEDULED`, `ACTIVE`, `EXPIRED`, `CANCELLED`); không tự ý gán cứng PT khi tạo gói PT/Combo. |
| **W05** | Huấn luyện viên | QTV Web | Quản lý danh sách hồ sơ PT, chi nhánh công tác, trạng thái làm việc; giám sát số lượng học viên đang phụ trách; khung giờ làm việc cố định tính slot. |
| **W06** | Lịch tập & buổi PT | QTV, Lễ tân | Giám sát lịch tập PT toàn chi nhánh; hỗ trợ Lễ tân đặt lịch thay cho hội viên theo đúng PT đã nhận phân công; cơ chế hủy lịch trước 12h; ghi nhận xác nhận hoàn thành 2 chiều (PT + Hội viên); điều chỉnh kết quả buổi tập kèm audit log. |
| **W07** | Ra vào & check-in | QTV, Lễ tân | Giám sát luồng quẹt thẻ/nhận diện IN/OUT; tự động kiểm tra điều kiện vào tập; thuật toán chống quét trùng trong 60 giây; ghi nhận lượt ra vào thủ công có lý do; đồng bộ hiển thị lên K01. |
| **W08** | Thu tiền & thanh toán | QTV, Lễ tân | Thu tiền mặt 100% 1 lần duy nhất tại quầy; tích hợp VietQR chuyển khoản tự động xác nhận qua IPN/Webhook; xóa bỏ hoàn toàn công nợ/trả góp; sinh phiếu thu bất biến; xử lý điều chỉnh sai sót có kiểm soát và audit. |
| **W09** | Quản lý thông báo | QTV, Lễ tân | Quản lý danh mục loại thông báo và mẫu nội dung in-app template có biến động tiếng Việt `{{variable_key}}`; hệ thống (SYS) tự động gửi in-app theo System Event Schema; tra cứu nhật ký gửi; quản lý consent hội viên. |
| **W10** | Báo cáo | QTV Web | Báo cáo thanh toán & doanh thu theo kỳ (Tháng, Quý, Năm); bảng dữ liệu gom dòng thông minh 1 dòng duy nhất / mốc thời gian (Tháng: theo ngày; Quý/Năm: theo tháng) với 4 cột chuẩn; Giá trị đăng ký luôn bằng Tiền thực thu 100%. |
| **W11** | Chi nhánh | QTV toàn chuỗi | Độc quyền QTV toàn chuỗi; giao diện lưới Card chi nhánh với 3 mini stats (Hội viên, HLV, Đang tập); modal thêm/sửa chi nhánh (mã CN khóa READONLY); Drawer xem nhanh số liệu; quy trình ngừng hoạt động chi nhánh an toàn. |
| **W12** | Hệ thống & thiết bị | QTV, Lễ tân | Quản lý thiết bị nhận diện, đầu đọc thẻ và màn hình K01; theo dõi trạng thái kết nối (Online/Offline/Error/Pending Sync); quy trình thu thập và rút Consent dữ liệu nhận diện khuôn mặt. |
| **W13** | Tài khoản & phân quyền | QTV Web | 4 thẻ KPI tài khoản; bộ lọc vai trò `Role (count)` và trạng thái combobox; quản lý 3 trạng thái tài khoản (`ACTIVE`, `PENDING_ACTIVATION`, `LOCKED`); modal phân quyền 4 trường; bảo vệ tài khoản QTV tối cao; tra cứu audit log. |

### Phân hệ Ứng dụng Mobile

| Mã Menu | Tên Màn hình | Đối tượng | Phạm vi và chức năng chính |
| --- | --- | --- | --- |
| **HV01** | Trang chủ Hội viên | Hội viên | Hiển thị lời chào cá nhân hóa, thẻ gói tập hiện tại, thông báo nhắc lịch tập sắp tới, trạng thái yêu cầu phân công PT đang chờ duyệt và lối tắt tiện ích. |
| **HV02** | Lịch tập Hội viên | Hội viên | Xem lịch tập cá nhân dạng Calendar/Timeline; chủ động đặt lịch PT từ slot khả dụng của PT phụ trách; đổi/hủy lịch trước 12h; xác nhận buổi tập đã hoàn thành. |
| **HV03** | Gói của tôi | Hội viên | Xem chi tiết các gói tập đang sở hữu, số buổi PT còn lại, thời hạn sử dụng; danh sách PT tại chi nhánh để gửi yêu cầu phân công (`PT_ASSIGNMENT_REQUEST`); theo dõi lịch sử thanh toán 100% và xem phiếu thu. |
| **HV04** | Tài khoản Hội viên | Hội viên | Quản lý thông tin cá nhân cơ bản; cài đặt Consent nhận diện và thông báo; quản lý đăng nhập/đổi mật khẩu; đăng xuất ứng dụng. |
| **HV05** | Kích hoạt tài khoản | Hội viên | Xác thực OTP qua SĐT đã đăng ký tại quầy để kích hoạt tài khoản lần đầu (`PENDING_ACTIVATION` $\rightarrow$ `ACTIVE`) và thiết lập mật khẩu cá nhân. |
| **PT01** | Lịch dạy PT | Huấn luyện viên | Xem lịch dạy theo ngày/tuần trong khung giờ làm việc cố định (08:00 - 18:00); xác nhận buổi tập đã diễn ra thành công để chờ Hội viên xác nhận đối ứng. |
| **PT02** | Học viên PT | Huấn luyện viên | Xem danh sách học viên đang chính thức phụ trách; tra cứu tiến độ buổi tập và lịch sử các buổi đã dạy của từng học viên. |
| **PT03** | Yêu cầu phân công | Huấn luyện viên | Tiếp nhận danh sách `PT_ASSIGNMENT_REQUEST` gửi từ hội viên; thực hiện `ACCEPT` (nhận phụ trách) hoặc `REJECT` (từ chối do quá tải). |
| **PT04** | Tài khoản PT | Huấn luyện viên | Xem thông tin hồ sơ PT, chi nhánh làm việc, ca làm việc cố định; đổi mật khẩu và quản lý phiên đăng nhập. |

---

# 4. Business Rules

### 4.1. Hồ sơ Hội viên & Khách hàng
- **Định danh duy nhất:** Mỗi hội viên bắt buộc có đúng một Số điện thoại (SĐT) duy nhất trên toàn hệ thống chuỗi. SĐT đóng vai trò là khóa định danh nghiệp vụ chính, không được phép thay đổi sau khi tạo hồ sơ.
- **Kiểm tra trùng lặp thời gian thực:** Khi nhập SĐT tại màn hình tạo mới (W02), hệ thống tự động chuẩn hóa định dạng và kiểm tra trùng lặp ngay lập tức (real-time). Nếu SĐT đã tồn tại, hệ thống chặn lưu (BLOCK) và hiển thị thông báo kèm liên kết trực tiếp mở hồ sơ hiện có.
- **Loại bỏ hoàn toàn cơ chế cũ:** Xóa bỏ toàn bộ logic về nghi trùng, cảnh báo nghi trùng, dùng chung SĐT, người giám hộ hoặc giải quyết trùng lặp thủ công.
- **Thông tin hồ sơ:** Bắt buộc có Họ tên, Số điện thoại, Chi nhánh tiếp nhận. Email, Ngày sinh, Ảnh chân dung và Ghi chú là tùy chọn. Mã hội viên do hệ thống tự sinh định dạng chuẩn.
- **Trạng thái hồ sơ:** Gồm 3 trạng thái độc lập: `Đang hoạt động` (`ACTIVE`), `Ngừng hoạt động` (`INACTIVE`), `Đã lưu trữ` (`ARCHIVED`). Trạng thái hồ sơ độc lập hoàn toàn với trạng thái từng gói tập. Hồ sơ đã phát sinh giao dịch tài chính hoặc lịch tập không bị xóa vĩnh viễn khỏi CSDL.

### 4.2. Gói tập & Đăng ký sử dụng
- **4 loại gói cơ sở:**
  1. *Gym theo thời gian:* Tập không giới hạn số lượt trong khoảng thời hạn (ngày/tháng/năm).
  2. *Gym theo buổi:* Số lượt tập cố định có thời hạn sử dụng tối đa.
  3. *PT theo buổi:* Số buổi tập cùng huấn luyện viên có thời hạn sử dụng tối đa.
  4. *Combo Gym + PT:* Tích hợp quyền tập Gym và số buổi tập PT với hạn sử dụng độc lập trong cùng một đăng ký.
- **Cơ chế Snapshot:** Khi tạo đăng ký bán gói, toàn bộ thông số tại thời điểm bán (tên gói, giá niêm yết, số tiền thanh toán, thời hạn, số buổi, danh sách chi nhánh được phép sử dụng) được đóng băng (snapshot) vào bản ghi đăng ký. Mọi thao tác sửa đổi danh mục gói sau đó không làm thay đổi các gói đã bán.
- **Quy tắc kích hoạt:** Gói tập chỉ chính thức chuyển sang trạng thái có hiệu lực (`ACTIVE`) khi đã thanh toán đủ 100% trong một lần duy nhất và đã tới ngày bắt đầu hiệu lực. Nếu chưa tới ngày bắt đầu, gói ở trạng thái `SCHEDULED`.
- **Gia hạn nối tiếp:** Hội viên gia hạn gói cùng loại, thời hạn gói mới sẽ tự động nối tiếp ngày kết thúc của gói hiện tại; không cộng dồn chồng chéo làm sai lệch thời hạn. Với gói Combo, số buổi PT mới chỉ có hiệu lực từ ngày bắt đầu của kỳ Combo mới.

### 4.3. Huấn luyện viên (PT) & Điều phối Lịch tập
- **Khung giờ làm việc cố định:** PT là nhân viên trực thuộc phòng gym với thời gian làm việc tiêu chuẩn: **Thứ 2 đến Thứ 6, từ 08:00 đến 18:00**. PT không tự cấu hình hay chỉnh sửa khung giờ rảnh (availability).
- **Công thức tính Slot Khả Dụng:**
  $$\text{Slot Khả Dụng} = \text{Khung giờ làm việc cố định} - \text{Các Booking đang giữ chỗ}$$
  Các lịch tập đã hủy (`CANCELLED`) lập tức giải phóng slot cho người khác đặt.
- **Quy trình phân công PT 2 bước:**
  1. Khi đăng ký gói PT hoặc Combo, hệ thống **không** gán cứng PT. Trường PT phụ trách ban đầu để trống.
  2. Sau khi gói thanh toán đủ 100%, Hội viên mở ứng dụng Mobile (HV03), xem danh sách PT đang hoạt động tại chi nhánh và gửi yêu cầu phân công (`PT_ASSIGNMENT_REQUEST` ở trạng thái `PENDING`).
  3. PT nhận yêu cầu trên Mobile (PT03): Nếu quá tải, PT bấm `REJECT` (Hội viên sẽ chọn PT khác); nếu đồng ý, PT bấm `ACCEPT`. Lúc này PT chính thức trở thành PT phụ trách duy nhất gắn với gói tập đó.
- **Quản lý số buổi PT:** Hệ thống quản lý chặt chẽ 4 chỉ số: `Tổng buổi`, `Đã tập`, `Đang giữ chỗ` và `Còn lại có thể đặt`.
  $$\text{Còn lại có thể đặt} = \text{Tổng buổi} - \text{Đã tập} - \text{Đang giữ chỗ}$$
- **Xác nhận hoàn thành 2 chiều (Xác nhận kép):** Buổi tập sau khi diễn ra phải được CẢ PT VÀ HỘI VIÊN cùng bấm xác nhận trên ứng dụng Mobile thì mới chính thức chuyển trạng thái `COMPLETED` và trừ đúng 1 buổi vào gói tập.
- **Quy tắc hủy/đổi lịch:**
  - Hội viên hủy/đổi lịch trước giờ bắt đầu ít nhất **12 giờ**: Được hoàn lại 1 quyền đặt chỗ, không bị trừ buổi.
  - Hủy muộn dưới 12 giờ hoặc Hội viên vắng mặt (No-show): Hệ thống tự động ghi nhận vắng và khấu trừ 1 buổi của gói.
  - Sự cố phát sinh từ phía PT hoặc cơ sở vật chất: Không khấu trừ buổi của hội viên và xếp lịch bù.
- **Lễ tân đặt lịch hộ:** Lễ tân tại quầy (W06) được phép đặt lịch thay cho hội viên bằng Searchable Dropdown theo SĐT dạng `<Mã HV> - <Họ tên>`, hệ thống tự động lọc gói PT/Combo hợp lệ và tự động khóa đúng PT đã `ACCEPT`, ngăn chặn việc đặt sai huấn luyện viên.

### 4.4. Thu tiền & Thanh toán (Nguyên tắc 100%)
- **Thanh toán 100% 1 lần duy nhất:** Mọi giao dịch mua mới hoặc gia hạn gói tập bắt buộc phải thanh toán đủ 100% giá trị trong một lần duy nhất để kích hoạt gói.
- **Tuyệt đối không công nợ:** Hệ thống không hỗ trợ thanh toán nhiều lần, không hỗ trợ trả góp và không quản lý công nợ.
- **Phương thức thanh toán:**
  1. *Tiền mặt:* Nhân viên thu ngân/Lễ tân tiếp nhận tại quầy và xác nhận trên Web (W08).
  2. *Chuyển khoản VietQR:* Hệ thống sinh mã VietQR động chứa chính xác số tiền 100% và mã đơn hàng; giao dịch được xác nhận tự động thông qua IPN/Webhook từ ngân hàng đối tác hoặc nhân viên đối soát xác nhận.
- **Chứng từ tài chính bất biến:** Bản ghi thanh toán khi đã ở trạng thái `COMPLETED` là chứng từ bất biến, tuyệt đối không bị sửa đè hoặc xóa. Mọi xử lý sai sót phải thông qua quy trình điều chỉnh/hoàn tiền có lý do và lưu vết audit nghiêm ngặt.
- **Phiếu thu nội bộ:** Mỗi giao dịch thanh toán thành công tự động sinh một Phiếu thu nội bộ có mã duy nhất phục vụ in ấn và đối soát.

### 4.5. Kiểm soát Ra vào & Check-in
- **Điều kiện vào tập hợp lệ:** Hội viên chỉ được hệ thống chấp thuận check-in IN khi thỏa mãn đồng thời:
  1. Hồ sơ hội viên đang ở trạng thái `ACTIVE`.
  2. Sở hữu gói Gym (thời gian hoặc theo buổi) đang trong thời hạn hiệu lực (`ACTIVE`). Gói PT đơn lẻ không cấp quyền vào tập Gym tự do.
  3. Đăng ký đã thanh toán đủ 100%.
  4. Chi nhánh check-in nằm trong danh sách chi nhánh được phép sử dụng của gói.
  5. Thời điểm quẹt thẻ nằm trong khung giờ mở cửa của chi nhánh.
  6. Còn số buổi khả dụng (đối với gói Gym theo buổi).
- **Chống quét lặp (Anti-passback & Anti-duplicate):** Mọi sự kiện quẹt thẻ/nhận diện cùng một hội viên tại cùng một chiều trong vòng **60 giây** sẽ bị hệ thống đánh dấu trùng lặp và không tính thêm lượt.
- **Trừ buổi Gym hợp lý:** Đối với gói Gym theo buổi, hệ thống trừ tối đa 1 buổi trong một ngày; hội viên ra vào nhiều lần trong cùng ngày không bị trừ lặp.
- **Màn hình công cộng K01:** Chỉ hiển thị thông điệp chấp thuận/từ chối trung tính. Tuyệt đối không để lộ dữ liệu cá nhân, tài chính hay ghi chú nghiệp vụ.

### 4.6. Quản lý Thông báo In-App
- **Kênh thông báo chuẩn:** Toàn bộ thông báo hệ thống được gửi tự động qua kênh In-App trên ứng dụng Mobile và Web.
- **Mẫu thông báo chuẩn hóa:** Nội dung thông báo được định nghĩa theo các Template mẫu, sử dụng các biến động tiếng Việt chuẩn: `{{ten_hoi_vien}}`, `{{ten_goi}}`, `{{ngay_het_han}}`, `{{ten_pt}}`, `{{thoi_gian_tap}}`.
- **Phát tin tự động theo sự kiện (System Event Schema):** Hệ thống tự động kích hoạt thông báo khi phát sinh sự kiện: Đăng ký/gia hạn thành công, Xác nhận thanh toán 100%, Nhận yêu cầu phân công PT, Đặt/đổi/hủy lịch tập, Nhắc lịch tập trước 24h và 2h, Cảnh báo gói sắp hết hạn trước 7 ngày và 3 ngày.
- **Điều kiện phát tin do QTV kiểm soát:** Chỉ gửi khi QTV đã lưu quy tắc sự kiện tại chi nhánh ở trạng thái `ON` và mẫu được gán đang sử dụng. Chưa có quy tắc, quy tắc `OFF` hoặc mẫu ngừng sử dụng thì không gửi; không có cơ chế tự gửi bằng mẫu mặc định để bỏ qua cấu hình này.
- **Chống gửi trùng:** Hệ thống kiểm soát không gửi lặp thông báo cho cùng một đối tượng tại cùng một sự kiện/mốc thời gian.
- **Tách biệt Consent:** Quyền gửi thông báo nhắc việc vận hành tách biệt hoàn toàn với Consent chúc mừng sinh nhật trên màn hình K01 hoặc các tin tức quảng bá.

### 4.7. Báo cáo Vận hành & Doanh thu
- **Kỳ báo cáo chuẩn:** Hỗ trợ 3 mốc kỳ báo cáo: `Tháng`, `Quý`, `Năm`.
- **Cơ chế gom dòng thông minh (Smart Aggregation):** Bảng dữ liệu hiển thị duy nhất 1 dòng cho mỗi mốc thời gian:
  - Kỳ `Tháng`: Gom dòng theo từng ngày trong tháng (từ ngày 01 đến ngày cuối tháng).
  - Kỳ `Quý` hoặc `Năm`: Gom dòng theo từng tháng trong kỳ (Tháng 01 đến Tháng 12).
- **4 cột dữ liệu chuẩn:**
  1. *Mốc thời gian:* Ngày (đối với tháng) hoặc Tháng (đối với quý/năm).
  2. *Tổng gói bán:* Tổng số lượng đăng ký gói phát sinh trong mốc.
  3. *Phân rã dịch vụ:* Chi tiết số lượng theo từng loại hình: `Gym: X | PT: Y | Combo: Z`.
  4. *Doanh thu thực thu 100%:* Tổng số tiền thực thu về tài khoản (luôn bằng 100% giá trị đăng ký).

### 4.8. Chi nhánh & Phạm vi Vận hành
- **Độc quyền QTV toàn chuỗi:** Chỉ tài khoản QTV có phạm vi Toàn chuỗi mới có quyền truy cập menu Chi nhánh (W11) để tạo mới, cấu hình hoặc ngừng hoạt động chi nhánh.
- **Giao diện lưới Card:** Hiển thị trực quan toàn bộ chi nhánh dưới dạng Card với 3 chỉ số mini stats thời gian thực: *Hội viên trực thuộc*, *HLV đang làm việc*, *Khách đang tập hiện tại*.
- **Quy trình đóng cửa/ngừng hoạt động chi nhánh:** Khi một chi nhánh chuyển sang trạng thái ngừng hoạt động, hệ thống lập tức khóa chức năng bán gói mới và đặt lịch mới tại chi nhánh đó; giữ nguyên toàn bộ lịch sử dữ liệu cũ, không tự động điều chuyển hội viên nếu chưa có lệnh can thiệp của QTV.

### 4.9. Hệ thống, Thiết bị & Dữ liệu Nhận diện
- **Quản lý thiết bị:** Quản lý danh mục đầu đọc thẻ, camera nhận diện khuôn mặt và màn hình K01 gắn với từng điểm kiểm soát (Turnstile/Door) tại chi nhánh. Giám sát trạng thái kết nối thời gian thực: `Online`, `Offline`, `Error`, `Pending Sync`.
- **Cấu hình và kết nối thiết bị:** Lưu riêng ý nghĩa trạng thái cấu hình do QTV chọn và trạng thái hiệu lực được hiển thị từ cấu hình/heartbeat. Thao tác lưu cấu hình không tạo tín hiệu kết nối; thiết bị thiếu hoặc quá hạn heartbeat không được báo `Online`.
- **Consent dữ liệu sinh trắc học:** Việc thu thập ảnh nhận diện khuôn mặt là hoàn toàn tự nguyện và bắt buộc phải có Consent của hội viên. Ảnh hồ sơ thông thường không tự động chuyển thành dữ liệu nhận diện.
- **Rút Consent:** Khi hội viên yêu cầu rút Consent, hệ thống lập tức vô hiệu hóa tính năng nhận diện tại cửa và đưa vào hàng đợi xóa an toàn dữ liệu sinh trắc học.

### 4.10. Tài khoản & Phân quyền Truy cập
- **3 trạng thái tài khoản chuẩn:** Hệ thống chuẩn hóa duy nhất 3 trạng thái tài khoản:
  1. `Hoạt động` (`ACTIVE`): Tài khoản đang được phép đăng nhập và thao tác bình thường.
  2. `Chờ kích hoạt` (`PENDING_ACTIVATION`): Hồ sơ hội viên hoặc PT đã được tạo tại quầy/hệ thống, nhưng người dùng chưa kích hoạt tài khoản trên ứng dụng Mobile.
  3. `Đã khóa` (`LOCKED`): Tài khoản bị tạm khóa hoặc ngừng sử dụng vĩnh viễn do vi phạm chính sách hoặc nghỉ việc. (Gom trạng thái Đã khóa và Ngừng sử dụng làm một).
- **Bản chất trạng thái Chờ kích hoạt:**
  $$\text{Số tài khoản Chờ kích hoạt} = \text{Số hồ sơ đã tạo} - \text{Số người đã kích hoạt tài khoản App}$$
  Khi tạo hồ sơ nhân viên hoặc hội viên tại quầy, hệ thống tự động sinh bản ghi tài khoản liên kết theo SĐT ở trạng thái `PENDING_ACTIVATION`. Người dùng tải app Mobile, nhập SĐT, xác thực mã OTP gửi về máy và thiết lập mật khẩu lần đầu thì tài khoản tự động chuyển sang `ACTIVE`.
- **Giao diện quản trị W13:**
  - 4 thẻ KPI tổng quan: *Tổng số tài khoản*, *Đang hoạt động*, *Chờ kích hoạt*, *Đã khóa*.
  - Bộ lọc Vai trò hiển thị kèm số lượng: `Role (count)` (ví dụ: `QTV (2)`, `Lễ tân (5)`, `PT (12)`, `Hội viên (350)`).
  - Bộ lọc Trạng thái tài khoản dạng Combobox chuẩn.
  - Modal chỉnh sửa tài khoản gồm đúng 4 trường: SĐT đăng nhập (`READONLY`), Trạng thái tài khoản, Vai trò (Role), Chi nhánh phụ trách (Branch Scope).
- **Nguyên tắc bảo vệ tài khoản tối cao:** Hệ thống ngăn chặn tuyệt đối việc QTV tự khóa tài khoản của chính mình hoặc tự tước quyền QTV tối cao khi đang đăng nhập phiên làm việc.

---

# 5. Out of Scope

Các hạng mục và nghiệp vụ sau đây **không** thuộc phạm vi của phiên bản hiện tại:

1. **Thiết kế kỹ thuật & mã nguồn:** Không bao gồm kiến trúc hạ tầng cloud chi tiết, benchmark hiệu năng, mã nguồn backend/frontend hoặc script triển khai CI/CD.
2. **Triển khai Production vật lý:** Không bao gồm việc cấu hình mạng LAN thực tế, bấm dây mạng hoặc lắp ráp cơ học thiết bị tại phòng gym.
3. **Điều khiển cổng khóa cơ điện trực tiếp:** Hệ thống dừng lại ở mức xác thực phần mềm và gửi tín hiệu logic đóng/mở chuẩn; không can thiệp sâu vào vi điều khiển phần cứng của các loại barrier/cổng xoay chưa được chứng nhận.
4. **Công nợ và thanh toán trả góp:** Tuyệt đối không xây dựng module theo dõi nợ đọng, nhắc nợ, tính lãi suất trả góp hay thu tiền nhiều đợt.
5. **Cổng thanh toán phức tạp:** Không bao gồm thanh toán quốc tế qua thẻ tín dụng tự động trừ định kỳ (auto-debit recurring), ví điện tử trả sau.
6. **Kế toán thuế chuyên sâu:** Không xuất hóa đơn điện tử GTGT có mã của cơ quan thuế; hệ thống chỉ xuất Phiếu thu nội bộ phục vụ kiểm soát vận hành.
7. **Nghiệp vụ hội viên nâng cao:** Không hỗ trợ bảo lưu gói, chuyển nhượng gói tập cho người khác, nâng cấp/hạ cấp gói đang dùng hoặc hoàn tiền tự động trên phần mềm.
8. **Lịch tập phức tạp:** Không hỗ trợ đặt lịch PT định kỳ hàng tuần, không đặt lịch cho nhóm nhiều người tập cùng 1 PT trong 1 buổi; không quản lý lớp học nhóm (Group X / Yoga theo lớp).
9. **Bán lẻ & kho vận:** Không quản lý kho bán thực phẩm bổ sung, nước uống, phụ kiện tập luyện hoặc tính khấu hao thiết bị máy móc phòng gym.
10. **Kênh truyền thông bên ngoài:** Không tích hợp SMS Brandname trả phí, Zalo ZNS hoặc chiến dịch Email Marketing trong phạm vi chuẩn.

---

# 6. Open Questions còn lại

| ID | Trạng thái | Nội dung câu hỏi | Hướng xử lý đề xuất |
| --- | --- | --- | --- |
| **OPEN-04** | OPEN | Quy trình xử lý đối với các đăng ký gói tập đã thanh toán 100% nhưng phát sinh khiếu nại, tranh chấp đặc biệt cần hủy bỏ và hoàn tiền thủ công ngoài hệ thống sẽ được ghi nhận audit như thế nào trên phần mềm? | Đề xuất bổ sung quyền hạn QTV tối cao được phép thực hiện thao tác `Hủy giao dịch đặc biệt` kèm lý do bắt buộc và biên bản đối soát đính kèm. |
| **OPEN-05** | OPEN | Quy trình tuân thủ quyền được lãng quên (Right to be Forgotten) theo Nghị định bảo vệ dữ liệu cá nhân khi hội viên yêu cầu xóa vĩnh viễn dữ liệu cá nhân khỏi CSDL nhưng vẫn phải lưu vết hóa đơn/thanh toán theo luật kế toán? | Đề xuất giải pháp ẩn danh hóa (Anonymization): Thay thế tên, SĐT, email thành chuỗi hash vô danh nhưng vẫn giữ nguyên giá trị giao dịch tài chính phục vụ báo cáo. |
| **OPEN-06** | OPEN | Nếu phòng gym muốn triển khai thêm kênh gửi mã OTP qua Zalo ZNS để tiết kiệm chi phí so với SMS truyền thống khi kích hoạt tài khoản thì quy trình fallback khi không có Zalo sẽ xử lý ra sao? | Mặc định ưu tiên SMS OTP tiêu chuẩn cho lần kích hoạt đầu tiên; kênh ZNS sẽ được cân nhắc bổ sung khi có thông tin Official Account của đơn vị vận hành. |
| **OPEN-07** | OPEN | Đối với gói tập PT/Combo, nếu hội viên đã thanh toán 100% nhưng quá 14 ngày vẫn không chủ động chọn PT phụ trách trên ứng dụng thì hệ thống có tự động gán PT ngẫu nhiên hoặc cảnh báo cho Lễ tân gọi điện hỗ trợ không? | Đề xuất đưa vào cảnh báo trên Dashboard W01 của Lễ tân để nhân viên chủ động liên hệ hỗ trợ hội viên chọn PT tại quầy. |

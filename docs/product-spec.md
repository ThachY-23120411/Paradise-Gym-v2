# 1. Overview & Goals

Paradise Gym là hệ thống quản trị và vận hành chuỗi phòng gym đa chi nhánh trên hai nền tảng Web và Mobile, phục vụ đồng bộ 4 nhóm đối tượng: Quản trị viên (QTV), Lễ tân, Huấn luyện viên (PT) và Hội viên.

| Mục | Nội dung |
| --- | --- |
| Nguồn đầu vào | Yêu cầu nghiệp vụ chuỗi phòng gym, hồ sơ thiết kế UI/UX, catalog phân hệ, phản hồi từ sếp Cường (`ghi chú a Cường (1).pdf`) và hệ thống tham khảo thực tế Paradise Gym |
| Nguyên tắc cốt lõi | Tài liệu mô tả bản chất nghiệp vụ (WHAT); giao diện là công cụ trực quan hóa luồng vận hành, không tự suy diễn chi tiết đồ họa thành quy tắc nghiệp vụ khi chưa chuẩn hóa |
| Phạm vi mô tả | Định nghĩa vai trò (Actors), ma trận phân quyền, danh mục tính năng cốt lõi (Core Features), quy tắc nghiệp vụ chi tiết (Business Rules), phạm vi loại trừ (Out of Scope) và các vấn đề mở |
| Không thuộc tài liệu này | Thiết kế kỹ thuật chi tiết, lựa chọn framework/cơ sở dữ liệu, kiến trúc hạ tầng triển khai và mã nguồn ứng dụng |

**Mục tiêu hệ thống (Goals):**

- **Quản lý vận hành xuyên suốt & Tối ưu dòng tiền (Revenue-Driven):** Kết nối liền mạch toàn bộ vòng đời hội viên từ tiếp nhận, đăng ký/gia hạn gói tập, phân công PT tại quầy, quản lý lịch tập PT và lớp cộng đồng, thanh toán 100%, kiểm soát ra vào/check-in 3 hình thức (Face, QR, Thủ công), cảnh báo gia hạn giữ chân khách, tính hoa hồng PT minh bạch đến báo cáo kinh doanh.
- **Phân quyền chặt chẽ theo 3 lớp:** Vai trò người dùng (Role), phạm vi chi nhánh làm việc (Branch Scope) và quyền hạn tác vụ chi tiết (Permission).
- **Tách bạch 4 thực thể nghiệp vụ cốt lõi:** Hồ sơ hội viên (Profile) $\neq$ Hiệu lực đăng ký gói (Registration) $\neq$ Quyền vào cửa (Access Right) $\neq$ Quyền đặt lịch PT (Booking Right).
- **Vận hành chuỗi đa chi nhánh:** Hỗ trợ mô hình một trụ sở chính và nhiều chi nhánh thành viên; phân định rành mạch quyền dữ liệu nội bộ từng chi nhánh và quyền điều hành toàn chuỗi.
- **Linh hoạt & Giữ chân khách hàng (Customer Retention):** Tích hợp phân hệ Chăm sóc khách hàng (nhắc sinh nhật, sắp hết hạn <= 4 ngày hoặc <= 3 buổi, gia hạn gói), hỗ trợ đóng băng gói tập tạm thời và chuyển nhượng gói tập an toàn.
- **Tính toàn vẹn và Audit Trail:** Lưu vết kiểm toán bất biến (Audit Log) cho toàn bộ các thao tác tài chính, kích hoạt quyền tập, quản trị tài khoản, consent dữ liệu cá nhân và can thiệp nghiệp vụ nhạy cảm.

---

# 2. Actors & Permissions

| Actor | Nền tảng | Quyền hạn và phạm vi thao tác | Giới hạn nghiệp vụ chính |
| :--- | :--- | :--- | :--- |
| **QTV / Quản lý** | Web only | - Quản trị hệ thống theo phạm vi chi nhánh được phân công (Toàn chuỗi hoặc Chi nhánh phụ trách).<br>- Giám sát Dashboard tập trung dòng tiền & CSKH (W01), quản lý hồ sơ Hội viên có Face enrollment & avatar (W02), danh mục Gói tập bóc tách 3 giá (W03), Đăng ký & gia hạn (W04 - bao gồm Đóng băng và Chuyển nhượng gói), hồ sơ PT & xử lý nghỉ việc (W05), điều phối Lịch PT linh động & Lịch ngày lễ (W06), giám sát Check-in Face/QR/Thủ công (W07), Thu tiền 100% & giảm giá (W08), quản lý mẫu Thông báo (W09), xem Báo cáo doanh thu bóc tách hoa hồng PT (W10), quản trị Chi nhánh (W11), cấu hình Thiết bị & Bật/Tắt module nâng cao (W12), quản lý Tài khoản (W13), Chăm sóc khách hàng (W14), Quản lý hoa hồng PT (W15), Quản lý lớp cộng đồng (W16), Quản lý khuyến mãi (W17). | - Không có ứng dụng Mobile canonical.<br>- Quyền hạn trên Web tuân thủ nghiêm ngặt theo `Role + Branch Scope + Permission`; không mặc định mọi QTV đều có quyền toàn chuỗi.<br>- Không được phép tự khóa hoặc hạ quyền tài khoản QTV tối cao của chính mình. |
| **Lễ tân** | Web only | - Tiếp nhận và tạo hồ sơ hội viên tại quầy kèm chụp Face enrollment làm avatar (W02).<br>- Tạo đăng ký gói mới, kiểm tra điều kiện gói Gym trước khi bán PT, gán PT phụ trách sau thanh toán, thực hiện Đóng băng gói và Chuyển nhượng gói (W04).<br>- Đặt lịch tập PT thay cho hội viên theo khung giờ linh động (W06).<br>- Ghi nhận thanh toán tiền mặt 100% hoặc xác nhận chuyển khoản VietQR, áp mã voucher, xuất phiếu thu (W08).<br>- Hỗ trợ check-in Face/QR/Thủ công tại quầy và theo dõi màn hình chào K01 (W07).<br>- Thao tác gọi điện/liên hệ hội viên sinh nhật, nhắc gia hạn gói sắp hết hạn <= 4 ngày hoặc <= 3 buổi trong module Chăm sóc khách hàng (W10 / W14).<br>- Tiếp nhận đăng ký lớp cộng đồng tại quầy (W16). | - Không có ứng dụng Mobile canonical.<br>- Phạm vi dữ liệu gắn cứng với chi nhánh đang làm việc (Active Branch).<br>- Không được chỉnh sửa giá gói niêm yết hoặc tạo gói tập mới (W03).<br>- Không được quản trị chi nhánh (W11), cấu hình hệ thống (W12), tính hoa hồng PT (W15) hoặc phân quyền (W13).<br>- Không xem báo cáo doanh thu quản trị cấp cao (W10). |
| **Huấn luyện viên (PT)** | Mobile only | - Quản lý lịch dạy cá nhân theo khung giờ làm việc linh động (PT01).<br>- Đặt lịch hộ hội viên/hợp đồng gán chính PT, gồm toàn bộ nhóm ACCEPTED với danh sách readonly (PT01-US03); không có quyền hủy lịch.<br>- Xem danh sách học viên được Lễ tân/QTV gán phụ trách chính thức (PT02).<br>- Ghi nhận và xác nhận hoàn thành buổi tập đã diễn ra (PT01).<br>- Xem bảng kê thống kê số buổi dạy và hoa hồng ước tính nhận được trong tháng (PT06). | - Không có giao diện Web canonical.<br>- PT không tự cấu hình giá gói hay trích hoa hồng.<br>- Không xem được học viên ngoài danh sách được gán; không tự can thiệp hồ sơ gốc của học viên. |
| **Hội viên** | Mobile only | - Sử dụng ứng dụng Mobile 4 tab chính: Trang chủ (HV01), Lịch tập (HV02), Gói của tôi (HV03), Tài khoản (HV04).<br>- Quét mã QR cá nhân để check-in tại quầy/cổng tự động (HV01 / HV04).<br>- Đặt, đổi, hủy lịch tập PT theo slot khả dụng linh động với PT được gán (HV02).<br>- Xem danh sách và đăng ký tham gia Lớp tập cộng đồng (HV02).<br>- Quản lý gói tập, xem PT phụ trách, gửi lời mời bạn bè vào gói PT 1-Nhiều (HV03).<br>- Xác nhận hoàn thành buổi tập (xác nhận 2 chiều cùng PT) (HV02).<br>- Xem lịch sử thanh toán 100% và tra cứu phiếu thu của chính mình (HV03). | - Không có giao diện Web canonical.<br>- Hội viên không tự chọn PT khi mua gói (do Lễ tân/QTV gán tại quầy).<br>- Không tự chỉnh sửa số buổi hay thời hạn gói; bảo lưu/mở bảo lưu qua thao tác có kiểm tra điều kiện. |
| **K01 / Màn hình công cộng** | Public Screen | - Hiển thị phản hồi tức thì trạng thái nhận diện ra vào (Face / QR / Thẻ).<br>- Tự động phát banner/lời chúc mừng sinh nhật nếu hôm đó là sinh nhật hội viên.<br>- Tự động hiển thị cảnh báo nhắc nhở nếu gói tập sắp hết hạn (<= 4 ngày hoặc <= 3 buổi) để hội viên chuẩn bị gia hạn. | - Không phải là role tài khoản người dùng.<br>- Tuyệt đối không hiển thị thông tin nhạy cảm: Số điện thoại, giá tiền gói, ghi chú nội bộ của nhân viên. |

---

# 3. Scope & Core Features

### Phân hệ Quản trị Web (QTV & Lễ tân: W01 - W17)

| Mã Menu | Tên Phân hệ | Đối tượng | Phạm vi và chức năng chính |
| :--- | :--- | :--- | :--- |
| **W01** | **Tổng quan vận hành** | QTV, Lễ tân | Dashboard tập trung dòng tiền thời gian thực: Thẻ KPI Doanh thu thực thu hôm nay, Hội viên đang tập, Gói sắp hết hạn (<= 4 ngày hoặc <= 3 buổi); Khối "Cần xử lý hôm nay" (CSKH: Gia hạn gói, Nhắc sắp hết hạn, Sinh nhật); Danh sách "Đăng ký mới hôm nay"; Danh sách "Ra/vào gần đây" và "Lịch PT hôm nay". |
| **W02** | **Hội viên & khách hàng** | QTV, Lễ tân | Quản lý hồ sơ hội viên; kiểm tra trùng SĐT real-time; **chụp ảnh Face Enrollment làm avatar định danh và dữ liệu nhận diện Kiosk**; xem hồ sơ 360° gói tập, lịch sử tập, ra vào. |
| **W03** | **Gói tập** | QTV Web | Quản lý danh mục gói: Gym (buổi hoặc thời gian), PT (1-1 hoặc 1-Nhiều, thời lượng buổi tập), Combo (**tách rõ 3 trường giá: gym_price, pt_price, combo_price** để làm căn cứ tính hoa hồng PT). |
| **W04** | **Đăng ký & gia hạn** | QTV, Lễ tân | Tạo mới đăng ký gói tại quầy; áp dụng mã giảm giá/voucher; **kiểm tra điều kiện bắt buộc có gói Gym còn hạn mới cho mua gói PT**; quy tắc 1 hội viên chỉ sở hữu 1 gói Gym hiệu lực duy nhất; **gán PT phụ trách trực tiếp sau khi thanh toán 100%**; thực hiện **Đóng băng gói tập** và **Chuyển nhượng gói tập**. |
| **W05** | **Huấn luyện viên** | QTV Web | Quản lý hồ sơ PT, avatar, chi nhánh làm việc, ca làm việc; **quy trình xử lý PT nghỉ ngang/nghỉ việc và chuyển giao học viên**. |
| **W06** | **Lịch tập & buổi PT** | QTV, Lễ tân | Điều phối lịch PT toàn chi nhánh; **đặt lịch linh động theo giờ bắt đầu + thời lượng buổi tập**; xác nhận kép 2 chiều; **quản lý lịch ngày lễ (Holidays)**. |
| **W07** | **Ra vào & check-in** | QTV, Lễ tân | Giám sát check-in 3 hình thức: **Khuôn mặt (Face), Mã QR, Thủ công**; kiểm tra hiệu lực gói Gym; kết nối màn hình Kiosk K01 hiển thị chúc mừng sinh nhật và nhắc hết hạn (<= 4 ngày hoặc <= 3 buổi). |
| **W08** | **Thu tiền & thanh toán** | QTV, Lễ tân | Sổ thu thành công không payment.status; CASH thực nhận hoặc BANK_TRANSFER đối soát có transaction_ref; QR chờ thuộc payment_intents. Hai KPI thực thu/số lượt; không cột/bộ lọc trạng thái payment hoặc KPI đơn chờ. |
| **W09** | **Quản lý thông báo** | QTV, Lễ tân | Quản lý template thông báo in-app: sinh nhật, sắp hết hạn, lịch lớp cộng đồng mới mở; tra cứu nhật ký gửi. |
| **W10** | **Báo cáo** | QTV Web | Báo cáo doanh thu bóc tách: Doanh thu Gym thuần + Doanh thu PT - Tiền hoa hồng phải trả cho PT = Lợi nhuận phòng tập. |
| **W11** | **Chi nhánh** | QTV toàn chuỗi | Quản trị mạng lưới chi nhánh, giám sát số liệu chi nhánh. |
| **W12** | **Hệ thống & thiết bị** | QTV Web | Quản lý thiết bị cổng Kiosk, camera FaceID, máy quét QR; **cấu hình bật/tắt module nâng cao (Simple UI vs Advanced UI)**. |
| **W13** | **Tài khoản & phân quyền** | QTV Web | Quản lý tài khoản, avatar người dùng, phân quyền 17 menu cho nhân sự. |
| **W14** | **Chăm sóc & thông báo** | QTV, Lễ tân | Module CSKH chuyên biệt: Danh sách sinh nhật hôm nay, Danh sách gói sắp hết hạn (<= 4 ngày hoặc <= 3 buổi), Nhắc gia hạn gói; nút thao tác nhanh `Gọi điện`, `Liên hệ`, `Ghi nhận`. |
| **W15** | **Quản lý hoa hồng PT** | QTV Web | Cấu hình tỷ lệ hoa hồng (%); Bảng tính hoa hồng PT theo tháng dựa trên: **% hoa hồng $\times$ Giá trị phần gói PT (`pt_price`) $\times$ Số buổi PT thực dạy trong tháng**; xuất phiếu thanh toán hoa hồng. |
| **W16** | **Lớp tập cộng đồng** | QTV, Lễ tân | Lập lịch lớp cộng đồng (Cardio, Aerobic, Yoga, Zumba,...); phân công giáo viên; thiết lập số chỗ tối đa (max slots); theo dõi số lượng và danh sách hội viên đăng ký tham gia. |
| **W17** | **Khuyến mãi & giảm giá** | QTV Web | Tạo và quản lý mã coupon/voucher khuyến mãi (theo % hoặc số tiền cố định, hạn dùng, giới hạn lượt dùng). |

---

### Phân hệ Ứng dụng Mobile

| Mã Menu | Tên Màn hình | Đối tượng | Phạm vi và chức năng chính |
| :--- | :--- | :--- | :--- |
| **HV01** | **Trang chủ Hội viên** | Hội viên | Lời chào cá nhân hóa, thẻ gói tập, **nút mở mã QR cá nhân để check-in tại cửa**, banner thông báo lớp tập cộng đồng hôm nay. |
| **HV02** | **Lịch tập Hội viên** | Hội viên | Gồm 2 tab: (1) **Lịch của tôi**: Đặt/đổi/hủy lịch với PT phụ trách theo khung giờ linh động; (2) **Lịch cộng đồng**: Xem danh sách lớp nhóm theo ngày, xem số chỗ trống (ví dụ 25/40), bấm Đăng ký tham gia. |
| **HV03** | **Gói của tôi** | Hội viên | Xem gói Gym và PT đang có; hiển thị PT phụ trách (do Lễ tân gán); theo dõi trạng thái gói (Đang dùng / Đang đóng băng); **chức năng Mời người vào gói PT 1-Nhiều**; tra cứu lịch sử thanh toán và phiếu thu. |
| **HV04** | **Tài khoản Hội viên** | Hội viên | Avatar chân dung, mã QR định danh cá nhân, cài đặt bảo mật và thông báo. |
| **PT01** | **Lịch dạy PT** | Huấn luyện viên | Xem giờ bắt đầu/kết thúc thực tế; đặt lịch hộ hội viên đã được gán cho chính PT (PT01-US03); hiển thị lớp PT 1-1 hoặc 1-Nhiều theo quyền hiện hành; xác nhận kép sau buổi tập. Không có quyền hủy lịch PT. |
| **PT02** | **Học viên PT** | Huấn luyện viên | Xem học viên và own registrations ACTIVE/SCHEDULED/FROZEN/EXPIRED để tra cứu tiến độ/lịch sử; phân công do nhân viên quyết định. PT02-US03 giữ lịch sử legacy chỉ đọc, không accept/reject. |
| **PT03** | **Thông báo PT** | Huấn luyện viên | Mở từ chuông, GET notifications là nguồn duy nhất; PUT read/read-all thành công mới đổi UI, chờ deep link tải dữ liệu và kiểm tra quyền. |
| **PT04** | **Tài khoản PT** | Huấn luyện viên | Avatar, bio/chuyên môn chỉ đọc ở màn hình xem, ngày làm việc API, đổi mật khẩu và registry thiết bị hiện có. Chứng chỉ đã gỡ theo migration 005. |
| **PT06** | **Tổng quan & Hoa hồng** | Huấn luyện viên | Đúng 4 KPI: học viên phụ trách, buổi hoàn thành, buổi sắp dạy, buổi chờ xác nhận; Đặt lịch nhanh; bảng kê hoa hồng own PT chỉ đọc. |

Điều hướng PT: 5 tab: Tổng quan (PT06-US01), Lịch (PT01), Học viên (PT02), Hoa hồng (PT06-US02), Tài khoản (PT04); PT03 mở từ chuông; PT05 là xác thực. Hợp đồng không có ngày hết hạn hiển thị `Không giới hạn` khi API end_date là null, không tự tạo hạn dùng. OTP/SMS/push và lưu ảnh cloud phụ thuộc provider thực tế; chưa cấu hình phải báo không khả dụng, không coi là hoàn tất tích hợp.

---

# 4. Business Rules

### 4.1. Hồ sơ Hội viên & Định danh Khuôn mặt (Face Enrollment)
- **Định danh duy nhất:** Số điện thoại (SĐT) là khóa định danh duy nhất trên toàn hệ thống chuỗi. SĐT không được phép sửa đổi sau khi tạo.
- **Trường Avatar & Đăng ký khuôn mặt tại quầy:**
  - Bổ sung trường `avatar_url` trong hồ sơ hội viên và nhân viên.
  - Khi tạo hoặc sửa hồ sơ Hội viên / PT tại quầy (W02 / W05), Lễ tân/QTV thực hiện bước **Đăng ký nhận diện khuôn mặt (Face Enrollment)** thông qua camera hoặc tải ảnh chân dung.
  - Ảnh khuôn mặt đạt chuẩn vừa được dùng làm ảnh đại diện (`avatar`), vừa được trích xuất vector nhận diện phục vụ Kiosk check-in tại cửa.
- **Kiểm tra trùng lặp real-time:** Hệ thống kiểm tra trùng SĐT ngay khi nhập liệu; nếu trùng lập tức chặn và dẫn đến hồ sơ đang có.

#### Tra cứu hồ sơ QTV W02 theo Mobile Hội viên (22/09/2026)

Popup W02 của QTV tổ chức dữ liệu đúng hội viên theo 5 menu Mobile hiện hành: Trang chủ, Lịch tập, Gói của tôi, Thanh toán, Tài khoản. Đây là bản tra cứu chỉ đọc có branch scope, bao gồm gói sở hữu và tham gia nhóm được phép xem; không giả danh hội viên hoặc sao chép quyền tự phục vụ. Thông báo Mobile nằm ngoài 5 menu chính; không tự bổ sung một tab dữ liệu cá nhân khi chưa có quyền/nguồn đọc đúng hội viên.

Tài khoản trong popup không cung cấp mật khẩu, phiên/thiết bị cá nhân, đăng xuất hoặc cài đặt riêng của tài khoản đang đăng nhập. Mọi dữ liệu lấy từ API đúng member/scope; không ép ALL, không suy thiếu dữ liệu thành 0 hoặc biến lỗi tải thành empty state. Gói không giới hạn/đóng băng phải giữ đúng ý nghĩa quyền lợi; avatar hồ sơ không tự chứng minh đăng ký sinh trắc hay consent.

Refactor này chỉ thay popup QTV. LT giữ giao diện/luồng hiện hữu. Các nghiệp vụ thêm/sửa/đổi trạng thái hội viên, thu tiền, đăng ký gói, lịch tập và consent tiếp tục theo US quản trị và quyền hiện hữu; không bổ sung quyền thay mặt Mobile. Chi tiết tại [QTV-W02-US04](<user-stories/qtv/QTV-W02-Hội viên & khách hàng/QTV-W02-US04-Xem danh sách hội viên.md>) và [Epic W02](<epic/qtv/QTV-W02-Hội viên & khách hàng.md>).

### 4.2. Gói tập & 3 Loại Hình Tập Luyện
Hệ thống hỗ trợ chuẩn hóa 3 loại hình tập luyện tại phòng gym:
1. **Loại 1 — Tập tự do (Gói Gym tiêu chuẩn):**
   - Hỗ trợ cả 2 hình thức: **Gym theo thời gian** (ngày/tháng/năm) và **Gym theo buổi**.
   - Hội viên đến quẹt thẻ/quét mặt vào tập, mệt thì về.
2. **Loại 2 — Lớp tập cộng đồng (Community Class):**
   - Phòng gym thuê giáo viên đứng lớp nhóm (Cardio, Aerobic, Yoga, Zumba,...).
   - Hệ thống phát thông báo in-app đến toàn thể hội viên có gói Gym hợp lệ.
   - Hội viên mở app Mobile (HV02 - Tab Lịch cộng đồng), chọn ngày, xem danh sách lớp, xem số lượng đã đăng ký / tối đa (ví dụ: `25/40 chỗ`) và bấm đăng ký tham gia.
3. **Loại 3 — Gói PT 1-Nhiều (Small Group PT):**
   - 1 Huấn luyện viên kèm cho 1 nhóm học viên.
   - Người đại diện nhóm đăng ký gói và thanh toán trọn gói 100%.
   - Trong ứng dụng Mobile (HV03), người đại diện dùng tính năng "Mời thành viên vào gói" (nhập SĐT thành viên).
   - Thành viên nhận lời mời trên app và bấm Chấp nhận (Accept).
   - **Điều kiện bắt buộc:** Mọi thành viên trong nhóm **đều phải có gói GYM còn hạn**. Nếu ai chưa có hoặc gói Gym hết hạn thì không được tham gia buổi tập cùng PT.

- **Đặt lịch hộ nhóm bởi PT (quyết định PT-OQ-03):** Toàn bộ thành viên ACCEPTED gồm trưởng nhóm là người tham gia, UI chỉ đọc. Bất kỳ người nào inactive, thiếu Gym hợp lệ ngày tập, đóng băng, sai quyền chi nhánh hoặc trùng lịch đều làm từ chối toàn booking. Giữ đúng một buổi hợp đồng nhóm; snapshot người tham gia được lưu nguyên tử và bất biến, không tự thêm người gia nhập sau vào booking cũ. Trưởng nhóm là đại diện member xác nhận/hủy; thành viên khác chỉ xem lịch snapshot. PT không được hủy. Backend owner cập nhật schema/ERD.

### 4.3. Quy Tắc Gói Combo Tách 3 Giá & Tính Hoa Hồng PT
- **Bóc tách 3 trường giá gói Combo:**
  - Gói Combo Gym + PT bắt buộc phải bóc tách rõ ràng 3 trường:
    * `gym_price`: Giá trị phần tập Gym.
    * `pt_price`: Giá trị phần tập PT.
    * `combo_price`: Giá bán thực tế của gói Combo ($\le \text{gym\_price} + \text{pt\_price}$).
- **Quy tắc trích hoa hồng cho PT:**
  - Phòng gym hưởng trọn vẹn 100% doanh thu gói Gym thuần.
  - Đối với gói PT hoặc Combo: Doanh thu thực của phòng gym phải trừ đi phần hoa hồng trả cho PT.
  - **Công thức tính hoa hồng PT:** PT được hưởng tỷ lệ hoa hồng (ví dụ: $k\%$) tính trên **tổng giá trị phần gói PT** (`pt_price`) và **tỷ lệ số buổi PT mà họ đã thực dạy ở gói đó trong tháng**:
    $$\text{Hoa hồng 1 buổi dạy} = \frac{\text{pt\_price}}{\text{total\_pt\_sessions}} \times k\%$$
    $$\text{Tổng hoa hồng tháng của PT} = \sum (\text{Hoa hồng 1 buổi} \times \text{Số buổi thực dạy trong tháng})$$

Phạm vi PT đọc hoa hồng: chỉ dữ liệu của chính PT; `PENDING` = `Chờ chi trả`, chi trả trực tiếp không thêm bước PT duyệt. Tổng buổi/doanh thu phần PT/hoa hồng phải khớp toàn bộ chi tiết cùng kỳ. `PAID` giữ tỷ lệ, chi tiết và số tiền lịch sử đã chốt, không tính lại theo cấu hình mới. PT không cấu hình/duyệt/chi trả hoa hồng.

Snapshot PAID đã được duyệt: lần chi trả mới lưu tổng và chi tiết từng buổi nguyên tử, bất biến. Với PAID legacy không snapshot, API `details_snapshot_available=false` / `sessions=[]`: PT vẫn xem tổng lịch sử và thông báo thiếu chi tiết; không diễn giải là 0 hoặc tái dựng từ dữ liệu sống. Thiết kế DB/ERD do backend owner cập nhật; đặc tả chi trả QTV do owner Web đồng bộ.

### 4.4. Quy Tắc Mua Gói & Phân Công PT Tại Quầy
- **Quy tắc 1 gói Gym hiệu lực duy nhất:** Một hội viên tại một thời điểm **chỉ được sở hữu duy nhất 1 gói Gym có hiệu lực** (`ACTIVE`). Hệ thống không cho phép tồn tại đồng thời 2 gói Gym cùng có hiệu lực song song.
- **Điều kiện mua gói PT:** Hội viên **bắt buộc phải sở hữu gói Gym đang còn hiệu lực** thì mới được phép mua hoặc kích hoạt gói PT. Nếu hội viên chưa có gói Gym hoặc gói Gym đã hết hạn, hệ thống chặn đăng ký và yêu cầu mua gói Gym trước.
- **Phân công PT tại quầy (Thay đổi luồng):**
  - Hội viên **không** tự chọn PT trên ứng dụng Mobile.
  - PT phụ trách sẽ do **Lễ tân hoặc QTV trực tiếp chọn/gán cho hội viên tại quầy** ngay khi gói tập được thanh toán đủ 100%.

### 4.4.1. Sổ Thu Thành Công Và Yêu Cầu QR
- payments chỉ lưu giao dịch đã thanh toán đủ 100% sau giảm giá, không có trường status. Mỗi payment sinh đúng một phiếu thu bất biến; gửi lại không tạo payment/phiếu/doanh thu trùng.
- payment_intents là yêu cầu QR riêng, hết hiệu lực sau 15 phút. Đăng ký PENDING_PAYMENT không tự hủy theo hạn QR hoặc sau 3 ngày; chỉ kết thúc chờ khi thanh toán hoặc người có quyền chủ động hủy. Hủy bất kỳ lúc nào còn chờ, kiểm tra lại trạng thái khi xác nhận và vô hiệu yêu cầu cũ; không dùng luồng này hủy gói đã thanh toán.
- Giữ mô phỏng chuyển khoản có chủ đích để kiểm thử. Chưa yêu cầu IPN/webhook hay xác nhận từ ngân hàng tự động trong giai đoạn này.
- QTV/Lễ tân hỗ trợ tiền chuyển khoản chưa ghi nhận bằng đối soát thủ công: đúng hội viên/đăng ký, đủ tiền, mã giao dịch ngân hàng transaction_ref bắt buộc và không trùng; phương thức vẫn BANK_TRANSFER. CASH chỉ cho tiền mặt thực nhận.
- W08 QTV/LT chỉ có Tổng thực thu và Lượt thanh toán thành công; không cột/bộ lọc trạng thái payment, không KPI đơn chờ. W04/HV03 vẫn có trạng thái đăng ký chờ và các thao tác tiếp tục/hủy.
- Sau thu đủ: ACTIVE khi kỳ gói hiện có hiệu lực, SCHEDULED khi chưa bắt đầu. Trường hợp thanh toán sau khi toàn bộ kỳ gốc đã qua còn chờ quyết định PAY-OQ-01 tại docs/open-questions.md: hiện giữ ngày gốc và trả EXPIRED; không tự dời ngày hoặc cam kết được tập.

### 4.4.2. Chỉ Báo Sắp Hết Hạn Dùng Chung
- Gói đã thanh toán, đang có hiệu lực và chưa hết hạn: theo thời gian còn <= 4 ngày, theo buổi còn <= 3 buổi; Combo dùng OR giữa các quyền lợi áp dụng. Nguồn hiển thị là is_expiring và display_status do SYS/API tính; status nội bộ ACTIVE vẫn dùng cho kiểm tra quyền tập. Không tạo enum/field DB mới và không tự tính ngưỡng riêng trên UI.
- Theo ngày bao gồm đúng 4 ngày; theo buổi bao gồm đúng 3 buổi. Gói không có ngày kết thúc chỉ xét quyền lợi theo buổi; không đặt ngày hết hạn giả. Dùng cùng kết quả cho W01/W04/W14, nhắc hạn/K01, HV03 và PT02. Nhóm CSKH đã hết hạn trong 14 ngày qua vẫn là nhóm riêng, không đổi thành ngưỡng cận hạn.

### 4.5. Đóng Băng Gói Tập (Freeze) & Chuyển Nhượng Gói (Transfer)
- **Đóng băng gói tập (Bảo lưu):**
  - QTV, Lễ tân và Hội viên đều chỉ bảo lưu gói đã trả đủ, hiện đang có hiệu lực ACTIVE/Sắp hết hạn; không cho gói chưa thanh toán, SCHEDULED chưa bắt đầu, đã hủy/hết hạn hoặc đã có đợt bảo lưu đang chờ/đang thực hiện. Kiểm tra trước mở form và khi xác nhận. Sắp hết hạn là display_status/is_expiring; status nội bộ ACTIVE vẫn hợp lệ.
  - Hẹn bảo lưu tương lai trên gói hiện đang ACTIVE không đồng nghĩa cho bảo lưu gói SCHEDULED chưa có hiệu lực.
  - Hội viên có nhu cầu tạm ngừng tập (đi công tác, điều trị chấn thương) có thể liên hệ Lễ tân để xin đóng băng gói.
  - Lễ tân thao tác chức năng Đóng băng gói (W04): Nhập ngày bắt đầu đóng băng, ngày kết thúc đóng băng và lý do.
  - Trong thời gian đóng băng, gói chuyển trạng thái tạm dừng, hội viên không được check-in vào tập; ngày hết hạn của gói tự động được cộng lùi tương ứng với số ngày đóng băng.
- **Chuyển nhượng gói tập:**
  - Hội viên A có quyền chuyển nhượng số ngày/số buổi còn lại của gói cho Hội viên B.
  - Lễ tân thực hiện thủ tục chuyển nhượng tại quầy (W04): Chọn gói chuyển nhượng, chọn Hội viên nhận (B), ghi nhận phí chuyển nhượng (nếu có) và lý do.
  - Gói của A chấm dứt hiệu lực, hệ thống sinh gói mới cho B kế thừa toàn bộ quyền lợi còn lại.

### 4.6. Lịch Tập PT Linh Động & Xử Lý Sự Cố
- **Khung giờ linh động theo thời lượng:**
  - Bãi bỏ quy định 5 ca cứng cố định.
  - Trong mỗi gói PT có cấu hình **thời lượng buổi tập** (`session_duration_minutes`: 60, 90, 120 phút).
  - Hội viên và PT có thể linh động chọn giờ bắt đầu bất kỳ trong ngày làm việc (ví dụ 09:00 - 10:30, 09:30 - 11:00) miễn là PT còn trống lịch.
- **Quản lý lịch ngày lễ:** QTV thiết lập danh mục các ngày nghỉ lễ toàn chuỗi hoặc theo chi nhánh. Trong các ngày nghỉ lễ, hệ thống tự động khóa xếp lịch PT.
- **Xử lý PT nghỉ ngang:** Khi một PT nghỉ việc hoặc gặp sự cố dài hạn, QTV sử dụng chức năng **Chuyển giao học viên** (W05) để điều chuyển toàn bộ học viên và các ca đặt trước sang một PT khác tiếp quản, kèm thông báo tự động đến hội viên.

**Đặt lịch hộ bởi PT (PT01-US03):** PT được tạo booking cho hội viên/hợp đồng đã được nhân viên gán cho chính PT. Họ tên PT và chi nhánh lấy API chỉ đọc; hội viên là TRIGGER của options hợp đồng DYNAMIC luôn hiển thị; ngày/giờ bắt đầu do PT chọn, thời lượng lấy hợp đồng/gói chỉ đọc, giờ kết thúc tính tự động, ghi chú tùy chọn. Field-level spec và Main/Alternate/Exception/Activity Diagram canonical tại [PT01-US03](user-stories/pt/PT01-Lịch/PT01-US03-Đặt%20lịch%20hộ%20hội%20viên%20được%20phân%20công.md).

Server xác định own PT từ phiên và kiểm tra lại phân công, active member/PT/branch, thanh toán đủ theo giá phải trả sau giảm giá hợp lệ, quyền chi nhánh, hiệu lực gói và freeze ACTIVE/SCHEDULED theo ngày tập, ngày làm việc/nghỉ lễ/giờ hoạt động, overlap cả PT lẫn hội viên và số buổi khả dụng trong thao tác ghi nguyên tử. Ngày trước khoảng đóng băng đã hẹn vẫn được đặt nếu các điều kiện khác hợp lệ. Giữ buổi khi đặt, chuyển booked sang used đúng một lần khi đủ xác nhận kép; không giảm remaining lần thứ hai. Quyền tạo lịch này không cấp quyền hủy hay tự phân công cho PT. Điều kiện nhóm đã chốt tại PT-OQ-03: toàn bộ ACCEPTED gồm trưởng nhóm, giữ một buổi và snapshot người tham gia bất biến.

### 4.7. Kiểm Soát Ra Vào & Check-In 3 Hình Thức
- **3 phương thức check-in chuẩn:**
  1. *Quét khuôn mặt (Face Recognition):* Camera Kiosk K01 tự động nhận diện khuôn mặt hội viên.
  2. *Quét mã QR:* Hội viên mở mã QR cá nhân trên ứng dụng Mobile và đưa vào máy quét tại cửa/quầy.
  3. *Thủ công:* Lễ tân tra cứu và ghi nhận vào/ra trực tiếp trên Web (W07).
- **Màn hình chào mừng Kiosk K01:**
  - Kiểm tra điều kiện gói Gym còn hiệu lực.
  - Nếu hôm đó là sinh nhật hội viên: Màn hình phát hiệu ứng và banner **Chúc mừng sinh nhật**.
  - Nếu gói tập sắp hết hạn (<= 4 ngày hoặc <= 3 buổi): Màn hình hiển thị cảnh báo gói sắp hết hạn và đề nghị liên hệ Lễ tân; số ngày hoặc số buổi còn lại lấy theo quyền lợi thực tế từ API. Gói chỉ theo buổi không hiển thị số ngày giả.
- **Mục tiêu thương mại:** Cảnh báo check-in giúp Lễ tân chủ động tiếp cận, mời chào gia hạn ngay tại cửa để tối đa hóa doanh thu tái đăng ký.

### 4.8. Chăm Sóc Khách Hàng (Customer Care) & Tổng Quan (W01)
- **Menu W14 · Chăm sóc & thông báo:**
  - Tổng hợp 4 nhóm danh sách cần xử lý:
    1. *Sinh nhật hôm nay:* Để lễ tân gọi điện chúc mừng, tặng quà ưu đãi giữ chân khách.
    2. *Sắp hết hạn (<= 4 ngày hoặc <= 3 buổi):* Để nhân viên gọi điện mời gia hạn trước khi gói hết hạn.
    3. *Gia hạn gói chờ xử lý:* Các yêu cầu gia hạn chưa hoàn tất.
    4. *Đăng ký chờ thanh toán:* Giữ trạng thái và thao tác tiếp tục/hủy tại W04; không tính là công nợ hoặc đưa vào KPI W08.
  - Tích hợp các nút hành động trực tiếp: `Gọi điện`, `Liên hệ ghi chú`, `Tạo đơn gia hạn nhanh`.
- **Khối Tổng quan W01 (Dashboard):**
  - Tập trung cao nhất vào **DÒNG TIỀN & DOANH THU**: Thẻ KPI "Tiền thực thu hôm nay", "Hội viên đang hoạt động", "Gói sắp hết hạn (<= 4 ngày hoặc <= 3 buổi)", "Buổi PT hôm nay".
  - Danh sách "Đăng ký mới hôm nay" (biết ngay hôm nay thu được bao nhiêu tiền từ ai).
  - Khối "Cần xử lý hôm nay" (đồng bộ từ module CSKH).

### 4.9. Cấu Hình Bật/Tắt Module Nâng Cao (Simple UI vs Advanced UI)
- Trong menu Hệ thống & thiết bị (W12), QTV có tùy chọn cấu hình giao diện:
  - **Chế độ Đơn giản (Simple UI):** Chỉ hiển thị các menu vận hành cơ bản nhất (Tổng quan, Hội viên, Gói tập, Đăng ký, Check-in, Thu tiền).
  - **Chế độ Đầy đủ / Nâng cao (Advanced UI):** Hiển thị toàn bộ 17 menu (bao gồm Hoa hồng PT, Lớp cộng đồng, Đóng băng/Chuyển nhượng, Khuyến mãi, CSKH chuyên sâu).

---

# 5. Out of Scope

Các hạng mục sau đây **không** thuộc phạm vi của phiên bản hiện tại:
1. Thiết kế hạ tầng phần cứng vi điều khiển mạch nhúng sâu cho cổng xoay cơ khí chưa chuẩn hóa.
2. Quản lý kho hàng bán lẻ thực phẩm chức năng phức tạp (tồn kho đa kho, hạn dùng từng lô bột protein).
3. Tích hợp thanh toán quốc tế thẻ tín dụng trả sau (Visa/Mastercard recurring auto-debit).
4. Kế toán thuế chuyên sâu xuất hóa đơn đỏ VAT điện tử trực tiếp sang cổng Tổng cục Thuế.
5. Chiến dịch Marketing đa kênh quy mô lớn (Email Marketing automation, SMS Brandname đấu nối viễn thông phức tạp).

---

# 6. Traceability Matrix

Tài liệu Product Spec này làm kim chỉ nam nghiệp vụ cho toàn bộ các tài liệu thiết kế chi tiết:
- **Cơ sở dữ liệu:** [`docs/database/erd.md`](database/erd.md)
- **Danh mục Epics:** [`docs/epics.md`](epics.md)
- **User Stories Web QTV:** [`docs/user-stories/qtv/`](user-stories/qtv/)
- **User Stories Web Lễ tân:** [`docs/user-stories/le-tan/`](user-stories/le-tan/)
- **User Stories Mobile Hội viên:** [`docs/user-stories/hoi-vien/`](user-stories/hoi-vien/)
- **User Stories Mobile Huấn luyện viên:** [`docs/user-stories/pt/`](user-stories/pt/)

## W18 - Bàn giao & tất toán doanh thu (21/09/2026)

Phần bổ sung này mở rộng danh mục QTV W01-W17 bằng **W18**, không thay nghiệp vụ thu tiền W08 hoặc quyền của vai trò khác. W18 là bàn giao/tất toán doanh thu nội bộ vận hành, không phải khóa sổ kế toán Nhà nước, quyết toán/kê khai thuế hay lập hóa đơn thuế.

- **Quyền:** chỉ QTV có quyền tài chính `view_financial`, trong branch scope được cấp. Xem trước/tạo đợt và thêm tài khoản yêu cầu chi nhánh cụ thể; ALL chỉ đọc lịch sử/danh mục trong phạm vi được cấp. LT/HV/PT không truy cập W18.
- **Kỳ nguồn thu:** mặc định hôm nay, chọn ngày/tuần bất kỳ bằng Từ ngày/Đến ngày; bao gồm hai đầu theo ngày địa phương của chi nhánh, lọc `payments.confirmed_at`. Chỉ payment thành công với phiếu thu khớp tiền, chưa thuộc batch; không có intent/chờ thanh toán. Trên 10.000 khoản yêu cầu thu hẹp kỳ, không cắt bớt ngầm.
- **Đối chiếu:** CASH gom Tiền mặt; BANK_TRANSFER gom theo registry tài khoản duy nhất bởi `bank_bin + account_no` trong chi nhánh. Registry lưu bền qua API chỉ dùng cho phân loại thủ công W18, không đổi VietQR global config hoặc tự ghi ngân hàng nhận vào payment cũ/mới. QTV kiểm chứng chứng từ rồi chọn tài khoản ngay trên dòng cho từng preview; allocation chỉ được lưu trong snapshot khi xác nhận batch. Không suy từ ENV hoặc tài khoản mặc định. Khoản chưa xác định, nhất là legacy còn chờ làm rõ, phải bị chặn trước xác nhận.
- **Xác nhận:** toàn bộ tập preview, không theo trang/tìm kiếm grid; checkbox `Xác nhận đã bàn giao đầy đủ` phải được tích chủ động, `Ghi chú` tùy chọn tối đa 1000 ký tự. Server kiểm tra fingerprint `preview_token`, quyền/scope/tập/tổng/tài khoản lại. Token mới bị stale/xung đột phải từ chối và xem lại; replay cùng token đã thành công trả batch gốc, không tạo thêm/sửa batch.
- **Bất biến:** một payment chỉ thuộc một batch; mã batch canonical `handover_code`. Lưu nguyên tử snapshot khách hàng, gói, hợp đồng, phiếu thu, phương thức, tài khoản nhận, số tiền cùng kỳ, múi giờ, tổng, người tạo và thời điểm xác nhận. Payment hiện hữu luôn bất biến trước/sau bàn giao, không thêm payment.status, không mở khóa trước bàn giao. Batch không sửa/xóa/mở lại; lịch sử đọc snapshot, không dựng lại từ cấu hình hiện tại.
- **Kỳ chồng lấn:** kỳ chỉ xác định tập tại thời điểm xác nhận, không khóa ngày vĩnh viễn. Khoản ghi nhận muộn vẫn vào đợt sau nếu đủ điều kiện dù kỳ chồng đợt cũ; khoản đã bàn giao không lặp lại. Lọc lịch sử theo ngày xác nhận batch ở múi giờ lưu trên batch, không nhầm với ngày thu của payment.
- **UI:** route `revenue-handovers`; tab Chưa bàn giao và Lịch sử bàn giao. Popup Tài khoản nhận tiền, dropdown phân loại inline, popup Xác nhận bàn giao doanh thu và Chi tiết bàn giao được đặc tả field-level tại US01-US03; không thêm layout dùng chung vào đặc tả.

Traceability: [Epic QTV-W18](<epic/qtv/QTV-W18-Bàn giao & tất toán doanh thu.md>), [US01](<user-stories/qtv/QTV-W18-Bàn giao & tất toán doanh thu/QTV-W18-US01-Xem và đối chiếu nguồn thu chưa bàn giao.md>), [US02](<user-stories/qtv/QTV-W18-Bàn giao & tất toán doanh thu/QTV-W18-US02-Xác nhận bàn giao doanh thu.md>), [US03](<user-stories/qtv/QTV-W18-Bàn giao & tất toán doanh thu/QTV-W18-US03-Tra cứu lịch sử bàn giao.md>).

# 1. Overview & Goals

Paradise Gym là hệ thống quản lý vận hành phòng gym trên Web và Mobile, phục vụ QTV, lễ tân, PT và hội viên.

| Mục | Nội dung |
| --- | --- |
| Nguồn đầu vào | Requirement PDF, screenshot phác thảo, PDF quyết định Open Questions v1.0, `docs/open-questions.md` |
| Nguyên tắc | Screenshot chỉ là UI tham khảo, không tự biến mọi chi tiết trong ảnh thành business rule |
| Phạm vi mô tả | WHAT của sản phẩm: actor, permission, feature, rule nghiệp vụ, out of scope và câu hỏi còn mở |
| Không thuộc tài liệu này | Thiết kế kỹ thuật, lựa chọn công nghệ, kiến trúc triển khai, code |

**Goals**

- Quản lý xuyên suốt hội viên, gói tập, đăng ký/gia hạn, lịch PT, thanh toán, check-in và chăm sóc.
- Phân quyền theo vai trò, phạm vi chi nhánh và permission nhạy cảm.
- Tách rõ hồ sơ hội viên, hiệu lực gói, quyền vào tập và quyền đặt lịch PT.
- Hỗ trợ vận hành nhiều chi nhánh trong cùng một đơn vị.
- Lưu lịch sử, trạng thái và audit cho các nghiệp vụ ảnh hưởng tiền, quyền tập, dữ liệu cá nhân và quyền truy cập.

# 2. Actors & Permissions

| Actor | Surface | Được làm | Giới hạn chính |
| --- | --- | --- | --- |
| QTV / Quản lý | Web only | Quản trị theo phạm vi được cấp; xem tổng quan, báo cáo, hội viên, gói, PT, lịch, thanh toán, chi nhánh, tài khoản, thiết bị, chính sách, audit | Không có Mobile canonical; quyền Web phụ thuộc role + branch scope + permission; không mặc định mọi QTV đều toàn chuỗi |
| Lễ tân | Web only | Tiếp nhận hội viên, đăng ký/gia hạn, điều phối lịch, ghi nhận tiền mặt, hỗ trợ check-in, chăm sóc, xem/xuất phiếu trong chi nhánh | Không có Mobile canonical; không tự sửa giá/gói, không xem tài chính toàn hệ thống, không quản trị permission/chi nhánh/toàn bộ thiết bị |
| PT | Mobile only | Xem lịch của mình, học viên được phân công, xem và xử lý yêu cầu phân công (assignment request), xác nhận buổi tập đã diễn ra | Không có Web canonical; không xem lịch sử thanh toán/payment; không xem học viên ngoài phân công; không tự cấp quyền hoặc sửa hồ sơ gốc; không tự cấu hình giờ rảnh/availability |
| Hội viên | Mobile only | Dùng footer HV01 Trang chủ, HV02 Lịch tập, HV03 Gói của tôi và HV04 Tài khoản; xem hồ sơ/gói/phiếu của mình, đặt/đổi/hủy lịch PT, mua/gia hạn khi self-service được cho phép, cập nhật thông tin cá nhân được phép | Không có Web canonical; không tự sửa gói, số buổi, trạng thái thanh toán, ghi chú nội bộ hoặc dữ liệu người khác |
| K01 / Màn hình công cộng | Public screen | Hiển thị kết quả check-in và hướng dẫn tối thiểu | Không phải role tài khoản; không hiển thị dữ liệu riêng tư như lịch sử thanh toán, số điện thoại, email, giá gói, ghi chú |

# 3. Scope & Core Features

| Feature | Surface | Nội dung chính |
| --- | --- | --- |
| Tổng quan QTV/Lễ tân | Web only | Chỉ số theo quyền, việc cần xử lý, lịch hôm nay, cảnh báo gói/lịch/check-in/thanh toán |
| HV01 Trang chủ | Mobile Hội viên only | Lời chào, yêu cầu PT đang chờ, lịch sắp tới và lối tắt tới HV02/HV03 |
| Hội viên & khách hàng | Web QTV/Lễ tân | Tìm, thêm, sửa hồ sơ, đổi trạng thái và xem danh sách hội viên; mở dữ liệu gói/lịch/ra-vào/thanh toán theo quyền |
| HV04 Tài khoản | Mobile Hội viên only | Đăng nhập/kích hoạt, hồ sơ cá nhân được phép, preference và đăng xuất |
| Danh mục gói tập | Web QTV; Mobile Hội viên xem gói đang bán | Web quản lý danh mục và xem chi tiết gói/quyền lợi Gym/PT/Combo; Mobile Hội viên xem trước khi mua; chi tiết registration thuộc W04 |
| Đăng ký & gia hạn | Web QTV/Lễ tân; Mobile Hội viên self-service | Web tạo, xem chi tiết và gia hạn theo vận hành; Mobile Hội viên mua gói khi self-service được bật; gói PT/Combo không phân công PT ngay |
| HV03 Gói của tôi | Mobile Hội viên only | Xem gói/tiến độ, mua gói, khởi tạo thanh toán, chọn PT và theo dõi request/payment |
| Thanh toán & thu tiền | Web QTV/Lễ tân; Mobile Hội viên xem/tracking self-service | Web xử lý nghiệp vụ thu tiền mặt, chuyển khoản và điều chỉnh thanh toán 100% 1 lần; Mobile Hội viên tạo yêu cầu thanh toán và xem trạng thái/phiếu của mình |
| Quản lý PT | Web QTV; Mobile PT/Hội viên theo scope | Web QTV quản lý hồ sơ/trạng thái PT; lịch cố định là cấu hình hệ thống dùng để tính slot; PT dùng Mobile xem lịch/học viên/request; Hội viên dùng HV03 chọn PT |
| HV02 Lịch tập | Mobile Hội viên only | Hội viên xem lịch, đặt/đổi/hủy và xác nhận buổi của mình |
| PT01 Lịch / PT02 Học viên | Mobile PT only | PT xem lịch của mình và học viên được phân công, ghi nhận kết quả |
| Check-in / ra vào | Web QTV/Lễ tân, K01, thiết bị | Web xử lý event IN/OUT và ghi nhận thủ công; điều kiện gói, chống trùng và trừ buổi là rules trong flow; K01 chỉ hiển thị kết quả public |
| Quản lý thông báo | Web QTV/Lễ tân; Mobile Hội viên/PT nhận thông báo | Web quản lý quy tắc loại thông báo, mẫu in-app template và tra cứu nhật ký gửi; Hệ thống (SYS) tự động phát in-app theo sự kiện nghiệp vụ |
| Báo cáo | Web QTV/Lễ tân được cấp quyền | Xem số liệu theo kỳ/chi nhánh/quyền; không có Mobile canonical |
| Chi nhánh | Web QTV only | Quản lý chi nhánh, giờ hoạt động, trạng thái, phạm vi quyền và phạm vi gói; chuyển context làm việc thuộc W13 |
| Tài khoản & phân quyền | Web QTV only; Mobile HV/PT cho login/kích hoạt/tài khoản cá nhân | W13 quản trị account/role/scope/permission và tra cứu audit trên Web; Mobile chỉ phục vụ credential activation và self-account của đúng role |
| Thiết bị & nhận diện | Web QTV/Lễ tân theo quyền, K01 | Quản lý thiết bị, trạng thái kết nối, dữ liệu nhận diện và consent |

# 4. Business Rules

| Nhóm | Rules |
| --- | --- |
| --- | --- |
| Hội viên | Bắt buộc khi tạo hồ sơ: họ tên, số điện thoại, chi nhánh tiếp nhận. Email, ngày sinh, ảnh, ghi chú là tùy chọn. Mã hội viên, trạng thái, thời điểm tạo và người tạo do hệ thống ghi nhận. |
| Hội viên | Mỗi MEMBER_PROFILE bắt buộc có đúng 1 số điện thoại và SĐT phải UNIQUE trên toàn hệ thống. SĐT là khóa định danh (không được phép chỉnh sửa sau khi tạo). Khi nhập SĐT (tạo mới), hệ thống phải chuẩn hoá (normalize) và kiểm tra trùng lặp ngay lập tức (real-time). Nếu SĐT đã tồn tại: BLOCK không cho lưu hồ sơ mới, hiển thị thông báo lỗi "SĐT đã tồn tại" và cung cấp liên kết/nút bấm mở hồ sơ hiện có. |
| Hội viên | Bỏ toàn bộ logic cũ về nghi trùng, cảnh báo nghi trùng, cho phép nhiều hội viên dùng chung số điện thoại, nhập lý do dùng chung, guardian/shared contact và các luồng resolve duplicate. Không dùng tên hay mã hội viên để phát hiện duplicate; SĐT là khóa nghiệp vụ chính duy nhất. |
| Hội viên | Form tạo hội viên check duplicate SĐT realtime, tuyệt đối không cho lưu nếu trùng. |
| Hội viên | Trạng thái hồ sơ gồm Đang hoạt động, Ngừng hoạt động, Đã lưu trữ. Trạng thái hồ sơ độc lập với trạng thái từng gói. Hồ sơ có lịch sử không bị xóa bằng thao tác thông thường. |
| Hội viên | QTV/lễ tân sửa hồ sơ trong phạm vi phục vụ. PT chỉ ghi thông tin huấn luyện cho học viên được phân công. Hội viên chỉ sửa thông tin cá nhân được phép, không sửa gói, số buổi hoặc ghi chú nội bộ. |
| Gói tập | Phạm vi cơ sở gồm 4 loại chính thức: Gym theo thời gian; Gym theo buổi có hạn sử dụng; PT theo buổi có hạn sử dụng; Combo Gym + PT. |
| Gói tập | Gói chỉ có hiệu lực khi đã xác nhận thanh toán đủ 100% trong 1 lần duy nhất và đã tới ngày bắt đầu. Nếu thanh toán muộn, thời hạn ban đầu không được cộng bù. Nếu quá ngày kết thúc mới thanh toán đủ, đăng ký cũ không được kích hoạt. |
| Gói tập | Với gói N ngày, ngày cuối được dùng là ngày bắt đầu + N - 1 ngày. Với gói theo tháng/năm, tính tới ngày trước mốc cùng ngày kỳ sau; nếu ngày đó không tồn tại thì dùng ngày cuối tháng đích. |
| Gói tập | Một hội viên có thể có nhiều đăng ký. Quyền Gym tương đương không chồng thời gian; gói Gym/gia hạn mới nối tiếp quyền Gym hiện tại. Gói PT có thể tồn tại độc lập; khi đặt lịch phải xác định gói PT được sử dụng. Combo là một registration chứa quyền Gym và quyền PT độc lập. Khi gia hạn, Combo mới nối tiếp Combo hiện tại; số buổi PT của Combo mới không được cộng gộp vào quyền PT của Combo cũ và chỉ có hiệu lực từ ngày bắt đầu của Combo mới. Nếu PT của Combo hiện tại hết trước Gym, hội viên có thể mua thêm gói PT riêng để sử dụng ngay. |
| Gói tập | Registration gia hạn phải liên kết với registration trước đó để giữ lịch sử; không sửa trực tiếp đăng ký cũ hoặc làm mất lịch sử thanh toán/quyền lợi của lần mua trước. |
| Gói tập | Registration gia hạn được tạo theo danh mục, giá, quyền lợi và phạm vi chi nhánh đang áp dụng tại thời điểm gia hạn; không mặc định kế thừa điều kiện của lần mua trước. Các giá trị áp dụng cho lần gia hạn được snapshot vào registration mới. |
| Gói tập | Gói đã bán giữ snapshot tại thời điểm bán: tên gói, giá gốc, số tiền phải thu, thời hạn, số buổi/quyền lợi và phạm vi chi nhánh. Sửa giá hoặc ngừng bán chỉ ảnh hưởng đăng ký mới. |
| PT/lịch tập | Khi tạo đăng ký gói PT hoặc Combo, hệ thống KHÔNG phân công PT ngay. Thuộc tính PT phụ trách ban đầu để trống. Sau khi đăng ký đủ điều kiện sử dụng (đã thanh toán đủ 100%), hội viên xem danh sách PT đang hoạt động tại chi nhánh và chọn PT mong muốn. Hệ thống gửi PT_ASSIGNMENT_REQUEST (status = PENDING) tới PT được chọn. PT xem xét yêu cầu: nếu quá tải có thể từ chối (REJECT), hội viên chọn PT khác và gửi request mới; nếu đồng ý (ACCEPT), PT trở thành PT phụ trách cố định (assigned_pt_id) của registration đó. Mỗi registration chỉ gắn 1 PT phụ trách duy nhất. |
| PT/lịch tập | Với quyền PT theo buổi, hệ thống quản lý tối thiểu `tổng buổi`, `đã sử dụng/khấu trừ`, `đang giữ chỗ` và `còn có thể đặt`; số buổi còn có thể đặt = tổng buổi - đã sử dụng/khấu trừ - đang giữ chỗ và chỉ có giá trị khi quyền PT còn hiệu lực. |
| PT/lịch tập | Công thức tính Slot Khả Dụng: Slot Khả Dụng = (Giờ làm việc cố định của PT: Thứ 2 → Thứ 6, 08:00 → 18:00) - (Booking đang giữ chỗ của PT). PT là nhân viên với giờ làm việc cố định, PT KHÔNG tự cấu hình/cập nhật giờ rảnh hay availability. Booking CANCELLED không chiếm slot nhưng vẫn giữ record lịch sử và audit. Ngày quá khứ chỉ được xem lịch sử, không được tạo booking mới. |
| PT/lịch tập | Hội viên chỉ được đặt lịch PT sau khi PT đã ACCEPT assignment request. Lịch PT xác nhận ngay khi đủ điều kiện; xem/chọn giờ chưa giữ chỗ; đặt thành công mới giữ một quyền buổi PT. |
| PT/lịch tập | Hủy/đổi miễn khấu trừ khi tiếp nhận trước giờ bắt đầu ít nhất 12 giờ. Hủy lịch chuyển trạng thái CANCELLED, ghi audit, không xóa record và release slot ngay. Hủy muộn hoặc hội viên vắng khấu trừ 1 buổi; lỗi từ PT/phòng tập không khấu trừ và cần sắp xếp bù. |
| PT/lịch tập | Khi booking thành công chỉ giữ buổi, chưa tính đã dùng. W06 hiển thị rõ các trạng thái Đã đặt, Chờ xác nhận hoàn thành, Hoàn thành và Đã hủy. Buổi chỉ chuyển sang COMPLETED/Hoàn thành và trừ đúng 1 buổi trong gói khi CẢ PT VÀ HỘI VIÊN đều xác nhận buổi tập đã diễn ra (xác nhận kép); mọi thay đổi trạng thái phải ghi audit. Hủy muộn hoặc hội viên vắng khấu trừ 1 buổi theo quy định. Check-in vào gym không tự hoàn tất buổi PT. |
| PT/lịch tập | Sau buổi tập kết thúc, PT xác nhận buổi tập đã diễn ra và hội viên xác nhận buổi tập đã diễn ra. Khi cả hai bên đã xác nhận, hệ thống tự động chuyển buổi sang COMPLETED. QTV được phép sửa kết quả sau đó với lý do và audit. |
| PT/lịch tập | Lễ tân được phép đặt lịch PT thay cho hội viên (kể cả hội viên chưa tạo tài khoản self-service trên mobile app). Trong modal, Lễ tân tìm hội viên bằng Searchable Dropdown theo SĐT; hệ thống chỉ hiển thị hội viên dạng `<Mã HV> - <Tên>`, tự lọc registration PT/Combo đã thanh toán đủ, còn hiệu lực và còn buổi. Chi nhánh lấy theo branch active của Lễ tân; PT phụ trách lấy theo assignment đã ACCEPT và không cho đổi trong lúc booking. Khi mở từ slot trống, ngày/giờ/PT/chi nhánh auto-fill và khóa. Nếu hội viên không thuộc PT đang xem, hệ thống block booking. Scope hiện tại là một hội viên - một PT - một buổi; chưa hỗ trợ đặt buổi định kỳ hoặc lớp nhóm. |
| Thanh toán | Báo cáo tài chính thanh toán gồm hai chỉ số chính: giá trị đăng ký và tiền thực thu (luôn bằng 100% giá trị đăng ký). Các chỉ số này phục vụ vận hành, không mặc định là doanh thu kế toán. |
| Thanh toán | Đăng ký gói tập bắt buộc thanh toán đủ 100% trong 1 lần duy nhất khi tạo mới hoặc gia hạn. KHÔNG hỗ trợ thanh toán nhiều lần, trả góp hay ghi nhận lịch sử thanh toán. |
| Thanh toán | Phương thức trong phạm vi hiện tại: tiền mặt và chuyển khoản ngân hàng bằng VND. Ảnh chứng từ chỉ là bằng chứng hỗ trợ, không tự xác nhận đã thu. |
| Thanh toán | Tiền mặt do lễ tân/QTV có quyền ghi nhận. Chuyển khoản được xác nhận tự động thông qua IPN/Webhook từ ngân hàng/payment provider (hoặc nhân viên xác nhận khi đã nhận tiền vào tài khoản). Hệ thống chỉ xác nhận payment khi thông báo nhận được hợp lệ, đúng giao dịch, đúng số tiền 100% và báo trạng thái thành công; việc xử lý phải chống ghi nhận trùng khi provider gửi lại. |
| Thanh toán | Thanh toán bắt buộc khớp đúng 100% giá trị gói. Chưa hỗ trợ hoàn tiền hoặc bù trừ tự động giữa các gói trong phạm vi hiện tại. |
| Thanh toán | Payment đã xác nhận là chứng từ tài chính bất biến, không sửa đè, không xóa, không điều chỉnh hay hoàn/hủy trên phần mềm; lưu vết audit trail đầy đủ. |
| Thanh toán | Mỗi lần thanh toán đã xác nhận có phiếu thu nội bộ. Phiếu thu không mặc định là hóa đơn điện tử. QTV/lễ tân xem/xuất/in trong phạm vi; hội viên xem/xuất phiếu của mình. |
| Thanh toán | Mobile Hội viên có thể khởi tạo mua gói/thanh toán self-service khi capability được bật, theo dõi trạng thái và xem phiếu của chính mình. Ghi nhận thanh toán tiền mặt hoặc quét VietQR tại quầy thực hiện trên Web QTV/Lễ tân được cấp quyền. |
| Check-in/ra vào | Hệ thống mô tả cả IN và OUT. Từng chi nhánh chỉ bật OUT nếu thiết bị/quy trình hỗ trợ. Nơi chỉ có IN không được suy ra chính xác số người đang ở phòng. |
| Check-in/ra vào | Được vào tập khi hồ sơ được phục vụ, có quyền Gym còn hiệu lực, đã thanh toán đủ, đúng chi nhánh, còn buổi nếu áp dụng và trong giờ hoạt động. Gói PT không tự cấp quyền vào Gym. |
| Check-in/ra vào | Nhận diện thành công chỉ xác định người; vẫn phải kiểm tra điều kiện sử dụng gói. Lễ tân thấy lý do chi tiết; K01 chỉ hiển thị thông báo trung tính cho hội viên. |
| Check-in/ra vào | Sự kiện lặp từ cùng thiết bị không được tính hai lần. Cùng người/điểm/chiều trong 60 giây được đánh dấu nghi lặp để tránh sai thống kê. |
| Check-in/ra vào | QTV/lễ tân có quyền được ghi nhận thủ công tại chi nhánh, bắt buộc có người ghi, hội viên, điểm vào/ra, thời điểm, lý do và tham chiếu sự kiện nếu có. Ghi thủ công không được dùng để vượt điều kiện gói. |
| Check-in/ra vào | Với Gym theo buổi, trừ tối đa một buổi/ngày cho cùng hội viên; vào lại trong ngày không trừ lặp. Ra/vào có thể hiển thị khách đã đến nhưng không tự hoàn tất buổi PT. |
| Check-in/ra vào | K01 mặc định chỉ hiển thị kết quả và hướng dẫn. Tên/ảnh/sinh nhật chỉ hiển thị khi có consent phù hợp; không hiển thị điện thoại, email, ngày sinh đầy đủ, giá gói, ghi chú. |
| Chi nhánh | Hỗ trợ một chi nhánh chính và nhiều chi nhánh trực thuộc. Quyền truy cập xác định theo role + branch scope + permission. Chi nhánh con không mặc định thấy dữ liệu của nhau. |
| Chi nhánh | Mỗi hội viên có một mã/hồ sơ duy nhất trên toàn hệ thống; quyền xem dữ liệu vẫn phụ thuộc vai trò và chi nhánh. |
| Chi nhánh | Gói có danh sách chi nhánh được sử dụng, lưu snapshot khi bán. Chi nhánh bán và chi nhánh sử dụng là hai thuộc tính khác nhau. Chi nhánh mới không tự được thêm vào gói đã bán. |
| Chi nhánh | Tài khoản chỉ chuyển chi nhánh khi được cấp quyền nhiều chi nhánh. Khi chuyển, phải xử lý nội dung chưa lưu và tải lại dữ liệu theo chi nhánh mới. |
| Chi nhánh | Chi nhánh quản lý lịch tuần, ngày nghỉ/ngoại lệ và múi giờ. Mặc định Asia/Ho_Chi_Minh. Ngày nghỉ cụ thể ưu tiên hơn lịch tuần. Chưa hỗ trợ ca qua đêm. |
| Chi nhánh | Chi nhánh ngừng hoạt động thì dừng bán/lịch mới, rà soát gói/lịch/thiết bị, không tự chuyển khách hoặc lịch. Dữ liệu lịch sử vẫn thuộc chi nhánh cũ. |
| Tài khoản/phân quyền | Role chính thức: QTV, Lễ tân, PT, Hội viên/Khách hàng. Chủ phòng/quản lý gom vào QTV; khác biệt thể hiện bằng phạm vi chi nhánh và permission nhạy cảm. |
| Tài khoản/phân quyền | Chưa làm khu vực desktop riêng cho PT/hội viên; tác vụ của họ ưu tiên Mobile. |
| Tài khoản/phân quyền | Định danh đăng nhập chính là ACCOUNT.login_phone đã xác minh và mật khẩu. SĐT đăng nhập phải duy nhất cho một tài khoản. Giao diện Mobile Hội viên hiển thị màn hình Đăng nhập (SĐT + Mật khẩu) và liên kết [Tạo tài khoản]. Khi chọn [Tạo tài khoản], nhập SĐT và hệ thống tự động xử lý theo 3 trường hợp: (1) SĐT đã có Account: thông báo SĐT đã có tài khoản và yêu cầu quay lại Đăng nhập; (2) SĐT đã có Profile tại quầy nhưng CHƯA có Account: hiển thị thẻ nhận diện hồ sơ hiện có -> gửi & xác nhận OTP -> đặt Password -> tạo Account (ROLE_MEMBER) & liên kết với Profile có sẵn; (3) SĐT CHƯA có Profile: mở modal điền thông tin cá nhân (Họ tên, Email, Ngày sinh) -> gửi & xác nhận OTP -> đặt Password -> tự động tạo đồng thời Account + Profile mới. |
| Tài khoản/phân quyền | Với PT: Hồ sơ PT (PT_PROFILE) và Tài khoản (ACCOUNT) tách biệt. Tạo PT_PROFILE không tự động sinh ACCOUNT. PT dùng ứng dụng Mobile để đăng ký/kích hoạt tài khoản bằng OTP trên SĐT đã lưu và thiết lập mật khẩu lần đầu. QTV không cấp hoặc tạo tài khoản PT từ W13. |
| Tài khoản/phân quyền | Tài khoản đăng nhập tách biệt với hồ sơ nghiệp vụ. Role hội viên liên kết đúng một hồ sơ hội viên; role PT liên kết đúng một hồ sơ PT. Một tài khoản có thể có nhiều role nhưng không cộng gộp quyền giữa các role. |
| Tài khoản/phân quyền | Khi chuyển role/chi nhánh phải xử lý thay đổi chưa lưu, bỏ dữ liệu không còn thuộc quyền khỏi giao diện và áp quyền theo ngữ cảnh mới. |
| Tài khoản/phân quyền | Thao tác nhạy cảm gồm đổi role/permission/branch scope, khóa/mở tài khoản, xử lý payment nhạy cảm, miễn/điều chỉnh buổi PT, sửa kết quả PT, ngừng hồ sơ/PT/chi nhánh, quản lý dữ liệu nhận diện. Các thao tác này cần permission riêng, xác nhận/lý do và audit. |
| Tài khoản/phân quyền | Màn hình riêng W13 "Tài khoản & phân quyền" trên Web Sidebar cung cấp 4 thẻ KPI tổng quan (Tổng số tài khoản, Hoạt động, Khóa, Chờ kích hoạt/Ngừng sử dụng), bộ lọc theo Role có kèm số lượng `Role (count)` (ví dụ `QTV (1)`, `Lễ tân (1)`), bộ lọc theo Trạng thái dạng Combobox (không đếm số lượng), và danh sách tài khoản hiện có. Form tài khoản tập trung vào thông tin credential (SĐT đăng nhập, vai trò, phạm vi chi nhánh, trạng thái, lý do khóa), loại bỏ các trường hồ sơ cá nhân/tùy chọn riêng tư không thuộc scope tài khoản; không có thao tác QTV tạo/cấp tài khoản PT hoặc hội viên. |
| Tài khoản/phân quyền | Tài khoản có trạng thái Chờ kích hoạt, Hoạt động, Khóa, Ngừng sử dụng. Chỉ QTV có permission phù hợp được quản lý tài khoản trong phạm vi được cấp. |
| Tài khoản/phân quyền | Audit lưu hành động quan trọng, người thực hiện, role/chi nhánh, đối tượng, giá trị trước/sau khi phù hợp, lý do và thời điểm. Chỉ QTV có permission audit được xem trong phạm vi. |
| Thông báo | Kênh bắt buộc hiện tại là in-app. Push, SMS chăm sóc, Zalo, email tiếp thị chưa là tích hợp bắt buộc. |
| Thông báo | Nhóm thông báo: đăng ký/gia hạn, thanh toán, phân công PT, lịch PT, quyền lợi gói, sinh nhật, thiết bị/hệ thống. |
| Thông báo | Người nhận xác định theo đối tượng liên quan, người phụ trách, chi nhánh và quyền truy cập. Không broadcast mọi sự kiện cho toàn bộ role. |
| Thông báo | Mốc nhắc đề xuất: gói 7 ngày, 3 ngày và ngày hết hạn; PT 24 giờ và 2 giờ trước buổi; sinh nhật nội bộ đúng ngày. Cho bật/tắt từng mốc. |
| Thông báo | Trạng thái đã đọc/chưa đọc, trạng thái gửi và trạng thái xử lý công việc là ba nhóm độc lập. Đọc thông báo không tự đổi trạng thái nghiệp vụ liên quan. |
| Thông báo | Không tạo trùng thông báo cho cùng sự kiện/mốc/người nhận. Lễ tân chỉ dùng mẫu đã duyệt; PT/hội viên không gửi hàng loạt. |
| Thông báo | Tách đồng ý cho thông báo giao dịch, chăm sóc tùy chọn, tiếp thị và sinh nhật công khai. Đồng ý nhận nhắc lịch không đồng nghĩa đồng ý quảng cáo hoặc công khai sinh nhật. |
| Thiết bị/nhận diện | Phạm vi cơ sở gồm thiết bị nhận diện/đầu đọc ra-vào và màn hình K01. Khóa cửa/cổng xoay là mở rộng, chưa mặc định có. |
| Thiết bị/nhận diện | Product Spec mô tả dữ liệu vào/ra, trạng thái, quyền và xử lý lỗi. Tích hợp thiết bị thật chỉ chốt sau khi có thiết bị và tài liệu kết nối. |
| Thiết bị/nhận diện | Mỗi thiết bị có mã duy nhất, chi nhánh hiện hành, điểm lắp và mục đích IN/OUT/BOTH nếu hỗ trợ. Chuyển nơi lắp phải giữ lịch sử; event cũ giữ bối cảnh phát sinh. |
| Thiết bị/nhận diện | Trạng thái thiết bị gồm Online, Offline, Error, Pending Sync và lần đồng bộ cuối. Không hiển thị dữ liệu cũ như realtime; sự kiện gửi bù không phát lại lời chào cũ. |
| Thiết bị/nhận diện | QTV có permission thiết bị được thêm/sửa/test/ngừng hoạt động. Lễ tân chỉ xem trạng thái và báo sự cố. |
| Thiết bị/nhận diện | Dữ liệu nhận diện là quy trình riêng: giải thích mục đích, lấy consent, xác minh đúng hồ sơ, đăng ký, thử nhận diện, xác nhận sẵn sàng. Rút consent phải ngừng sử dụng và theo dõi yêu cầu xóa đến khi hoàn tất. |
| Thiết bị/nhận diện | Ảnh hồ sơ không tự trở thành dữ liệu nhận diện. Hệ thống không lưu mật khẩu, OTP, secret hoặc dữ liệu sinh trắc thô trong nhật ký/audit nghiệp vụ. |
| Thiết bị/nhận diện | Phạm vi hiện tại chỉ kiểm tra điều kiện, ghi sự kiện và hiển thị kết quả; chưa điều khiển khóa/cổng. |
| Thiết bị/nhận diện | Log kỹ thuật thiết bị lưu 90 ngày; lịch sử vào/ra định danh lưu 12 tháng. QTV xem theo phạm vi, lễ tân xem để phục vụ, hội viên xem lịch sử của mình, PT không mặc định xem đầy đủ. |

# 5. Out of Scope

- Thiết kế kỹ thuật, lựa chọn công nghệ, kiến trúc triển khai, code.
- Hoàn thiện sản phẩm production, phát hành ứng dụng hoặc vận hành hạ tầng.
- Tích hợp thiết bị thật, điều khiển khóa/cửa/cổng xoay trong phạm vi cơ sở.
- Thanh toán thẻ, ví điện tử, auto-debit, recurring payment.
- Hóa đơn điện tử, kế toán, quyết toán thuế.
- Bảo lưu, chuyển nhượng, nâng/hạ cấp, chuyển quyền lợi giữa gói sau khi đã thu/đã dùng.
- Hoàn tiền hoặc bù trừ tự động giữa các gói.
- Đặt lịch PT định kỳ, đặt hàng loạt, nhiều hội viên cùng buổi, lớp nhóm.
- Quản lý kho/bán hàng đầy đủ, bảo trì máy tập, dinh dưỡng, lương/hoa hồng PT.
- Push, SMS chăm sóc, Zalo, email tiếp thị nếu chưa được duyệt thành tích hợp bắt buộc.

# 6. Open Questions còn lại

| ID | Trạng thái | Câu hỏi |
| --- | --- | --- |
| OPEN-04 | OPEN | Quy trình xử lý đăng ký đã thu/đã dùng nhưng cần hủy, điều chỉnh hoặc tranh chấp sẽ được đưa vào phiên bản nào? |
| OPEN-05 | OPEN | Quy trình xóa dữ liệu cá nhân theo yêu cầu hội viên ngoài thao tác lưu trữ/ngừng phục vụ cần được chốt riêng. |
| OPEN-06 | OPEN | Nếu đơn vị vận hành muốn push/SMS/Zalo/email chăm sóc ngay trong phiên bản đầu, cần chốt kênh, consent, mẫu nội dung và trách nhiệm vận hành. |
| OPEN-07 | OPEN | Nếu muốn điều khiển khóa/cổng xoay thật, cần chốt phạm vi nghiệp vụ, trách nhiệm khi mở thủ công và trạng thái xác nhận từ thiết bị. |
| OPEN-08 | OPEN | Nếu gói PT đã thanh toán đủ nhưng đến ngày bắt đầu vẫn chưa được phân công PT do phía phòng Gym, kỳ hiệu lực có tiếp tục chạy hay phải điều chỉnh ngày bắt đầu/ngày hết hạn? |
| OPEN-09 | OPEN | Hội viên được tự tạo registration và thanh toán gói trên mobile hay chỉ xem gói/gửi nhu cầu để Lễ tân xử lý? |

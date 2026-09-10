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
- Tách rõ hồ sơ hội viên, hiệu lực gói, công nợ, quyền vào tập và quyền đặt lịch PT.
- Hỗ trợ vận hành nhiều chi nhánh trong cùng một đơn vị.
- Lưu lịch sử, trạng thái và audit cho các nghiệp vụ ảnh hưởng tiền, quyền tập, dữ liệu cá nhân và quyền truy cập.

# 2. Actors & Permissions

| Actor | Surface | Được làm | Giới hạn chính |
| --- | --- | --- | --- |
| QTV / Quản lý | Web, Mobile | Quản trị theo phạm vi được cấp; xem tổng quan, báo cáo, hội viên, gói, PT, lịch, thanh toán, chi nhánh, tài khoản, thiết bị, chính sách, audit | Quyền thực tế phụ thuộc role + branch scope + permission; không mặc định mọi QTV đều toàn chuỗi |
| Lễ tân | Web, Mobile | Tiếp nhận hội viên, đăng ký/gia hạn, điều phối lịch, ghi nhận tiền mặt, hỗ trợ check-in, chăm sóc, xem/xuất phiếu trong chi nhánh | Không tự sửa giá/gói, không xem tài chính toàn hệ thống, không quản trị permission/chi nhánh/toàn bộ thiết bị |
| PT | Mobile | Xem lịch của mình, học viên được phân công, xem và xử lý yêu cầu phân công (assignment request), xác nhận buổi tập đã diễn ra | Không xem công nợ/payment/giảm giá; không xem học viên ngoài phân công; không tự cấp quyền hoặc sửa hồ sơ gốc; không tự cấu hình giờ rảnh/availability |
| Hội viên | Mobile | Xem hồ sơ/gói/phiếu của mình, đặt/đổi/hủy lịch PT, xem gói và thực hiện mua/gia hạn khi chức năng self-service được cho phép, cập nhật thông tin cá nhân được phép | Không tự sửa gói, công nợ, số buổi, trạng thái thanh toán, ghi chú nội bộ hoặc dữ liệu người khác |
| K01 / Màn hình công cộng | Public screen | Hiển thị kết quả check-in và hướng dẫn tối thiểu | Không phải role tài khoản; không hiển thị dữ liệu riêng tư như công nợ, số điện thoại, email, giá gói, ghi chú |

# 3. Scope & Core Features

| Feature | Surface | Nội dung chính |
| --- | --- | --- |
| Tổng quan vận hành | Both | Chỉ số theo quyền, việc cần xử lý, lịch hôm nay, cảnh báo gói/lịch/check-in/thanh toán |
| Hội viên & khách hàng | Both | Tìm, tạo, cập nhật hồ sơ, cảnh báo nghi trùng, trạng thái hồ sơ, lịch sử gói/lịch/ra-vào/thanh toán theo quyền |
| Danh mục gói tập | Web, Mobile | Web quản lý danh mục gồm Gym theo thời gian, Gym theo buổi, PT theo buổi và Combo Gym + PT; Mobile cho hội viên xem các gói đang được phép bán |
| Đăng ký & gia hạn | Both | Tạo đăng ký mới/gia hạn, xác định kỳ hiệu lực và quyền lợi; với gói PT hoặc Combo, không phân công PT ngay khi tạo đăng ký, hoãn phân công PT cho tới khi hội viên gửi yêu cầu chọn PT và PT chấp nhận (PT_ASSIGNMENT_REQUEST) |
| Giảm giá | Web | QTV cấu hình chính sách giảm giá; lễ tân chỉ áp dụng chính sách hợp lệ hoặc gửi yêu cầu duyệt |
| Thanh toán & công nợ | Both | Theo dõi phải thu/đã thu/còn phải thu, tiền mặt, chuyển khoản, phiếu thu; mobile nội bộ được tạo thanh toán chuyển khoản và xem/xuất phiếu |
| Quản lý PT | Web, Mobile | Web QTV quản lý hồ sơ PT; mobile PT xem lịch/học viên, xem yêu cầu phân công (assignment request) và xác nhận buổi tập |
| Lịch tập & buổi PT | Both | Đặt, đổi, hủy lịch; Lễ tân đặt lịch thay cho hội viên; giữ quyền buổi; xác nhận kép (PT + Hội viên) để hoàn thành buổi; xử lý trùng lịch và vắng mặt |
| Check-in / ra vào | Both, K01 | Ghi nhận IN/OUT nếu chi nhánh hỗ trợ, kiểm tra điều kiện vào tập, xử lý lỗi nhận diện, ghi nhận thủ công theo quyền |
| Chăm sóc & thông báo | Both | Thông báo đăng ký/gia hạn, thanh toán, PT, lịch, sắp hết hạn, sinh nhật, thiết bị; ghi nhận liên hệ chăm sóc |
| Báo cáo | Both | QTV xem số liệu theo kỳ/chi nhánh/quyền; tách giá trị đăng ký, tiền thực thu và còn phải thu |
| Chi nhánh | Web | Quản lý chi nhánh, giờ hoạt động, trạng thái, phạm vi quyền, phạm vi gói |
| Tài khoản & phân quyền | Web, Mobile | Tài khoản, role, phạm vi chi nhánh, trạng thái tài khoản, hồ sơ cá nhân, tùy chọn thông báo |
| Thiết bị & nhận diện | Web, K01 | Quản lý thiết bị nhận diện/đầu đọc ra-vào, trạng thái kết nối, dữ liệu nhận diện và consent |

# 4. Business Rules

| Nhóm | Rules |
| --- | --- |
| Hội viên | Bắt buộc khi tạo hồ sơ: họ tên, số điện thoại, chi nhánh tiếp nhận. Email, ngày sinh, ảnh, ghi chú là tùy chọn. Mã hội viên, trạng thái, thời điểm tạo và người tạo do hệ thống ghi nhận. |
| Hội viên | Số điện thoại là bắt buộc để tạo hồ sơ; email không bắt buộc. Hội viên muốn tự phục vụ trên mobile phải có tài khoản gắn với số điện thoại đã xác minh. |
| Hội viên | Nhiều hồ sơ hội viên có thể dùng chung số điện thoại/email liên hệ trong trường hợp được phép như người thân/người giám hộ; hệ thống phải cảnh báo và yêu cầu xác nhận lý do. Tuy nhiên, số điện thoại dùng làm định danh đăng nhập chỉ thuộc một tài khoản. |
| Hội viên | Nghi trùng ưu tiên theo số điện thoại; email/ngày sinh hỗ trợ tăng độ tin cậy; họ tên trùng chỉ là gợi ý. Không tự gộp hồ sơ. Tạo mới khi nghi trùng phải có đối chiếu và lý do; trường hợp chưa rõ chuyển QTV. |
| Hội viên | Trạng thái hồ sơ gồm Đang hoạt động, Ngừng hoạt động, Đã lưu trữ. Trạng thái hồ sơ độc lập với trạng thái từng gói. Hồ sơ có lịch sử không bị xóa bằng thao tác thông thường. |
| Hội viên | QTV/lễ tân sửa hồ sơ trong phạm vi phục vụ. PT chỉ ghi thông tin huấn luyện cho học viên được phân công. Hội viên chỉ sửa thông tin cá nhân được phép, không sửa gói, nợ, số buổi hoặc ghi chú nội bộ. |
| Gói tập | Phạm vi cơ sở gồm 4 loại chính thức: Gym theo thời gian; Gym theo buổi có hạn sử dụng; PT theo buổi có hạn sử dụng; Combo Gym + PT. |
| Gói tập | Gói chỉ có hiệu lực khi đã xác nhận đủ tiền và đã tới ngày bắt đầu. Nếu thanh toán muộn, thời hạn ban đầu không được cộng bù. Nếu quá ngày kết thúc mới thanh toán đủ, đăng ký cũ không được kích hoạt. |
| Gói tập | Với gói N ngày, ngày cuối được dùng là ngày bắt đầu + N - 1 ngày. Với gói theo tháng/năm, tính tới ngày trước mốc cùng ngày kỳ sau; nếu ngày đó không tồn tại thì dùng ngày cuối tháng đích. |
| Gói tập | Một hội viên có thể có nhiều đăng ký. Quyền Gym tương đương không chồng thời gian; gói Gym/gia hạn mới nối tiếp quyền Gym hiện tại. Gói PT có thể tồn tại độc lập; khi đặt lịch phải xác định gói PT được sử dụng. Combo là một registration chứa quyền Gym và quyền PT độc lập. Khi gia hạn, Combo mới nối tiếp Combo hiện tại; số buổi PT của Combo mới không được cộng gộp vào quyền PT của Combo cũ và chỉ có hiệu lực từ ngày bắt đầu của Combo mới. Nếu PT của Combo hiện tại hết trước Gym, hội viên có thể mua thêm gói PT riêng để sử dụng ngay. |
| Gói tập | Registration gia hạn phải liên kết với registration trước đó để giữ lịch sử; không sửa trực tiếp đăng ký cũ hoặc làm mất lịch sử thanh toán/quyền lợi của lần mua trước. |
| Gói tập | Registration gia hạn được tạo theo danh mục, giá, chính sách giảm giá, quyền lợi và phạm vi chi nhánh đang áp dụng tại thời điểm gia hạn; không mặc định kế thừa điều kiện của lần mua trước. Các giá trị áp dụng cho lần gia hạn được snapshot vào registration mới. |
| Gói tập | Gói đã bán giữ snapshot tại thời điểm bán: tên gói, giá gốc, giảm giá, số phải thu, thời hạn, số buổi/quyền lợi và phạm vi chi nhánh. Sửa giá hoặc ngừng bán chỉ ảnh hưởng đăng ký mới. |
| Gói tập | Chưa hỗ trợ bảo lưu, chuyển nhượng, nâng/hạ cấp hoặc chuyển quyền lợi giữa gói trong phạm vi hiện tại. QTV chỉ hủy đăng ký chưa có khoản thu và chưa phát sinh quyền lợi; trường hợp đã thu/đã dùng cần quy trình riêng. |
| Giảm giá | Chỉ QTV tạo/sửa chính sách giảm giá. Lễ tân không tự đổi giá gốc hoặc nhập mức giảm tùy ý; giảm ngoài chính sách phải được QTV duyệt. Lịch sử giảm giá đã xác nhận không được sửa/xóa tùy ý. |
| PT/lịch tập | Khi tạo đăng ký gói PT hoặc Combo, hệ thống KHÔNG phân công PT ngay. Thuộc tính PT phụ trách ban đầu để trống. Sau khi đăng ký đủ điều kiện sử dụng (đã thanh toán đủ 100%), hội viên xem danh sách PT đang hoạt động tại chi nhánh và chọn PT mong muốn. Hệ thống gửi PT_ASSIGNMENT_REQUEST (status = PENDING) tới PT được chọn. PT xem xét yêu cầu: nếu quá tải có thể từ chối (REJECT), hội viên chọn PT khác và gửi request mới; nếu đồng ý (ACCEPT), PT trở thành PT phụ trách cố định (assigned_pt_id) của registration đó. Mỗi registration chỉ gắn 1 PT phụ trách duy nhất. |
| PT/lịch tập | Với quyền PT theo buổi, hệ thống quản lý tối thiểu `tổng buổi`, `đã sử dụng/khấu trừ`, `đang giữ chỗ` và `còn có thể đặt`; số buổi còn có thể đặt = tổng buổi - đã sử dụng/khấu trừ - đang giữ chỗ và chỉ có giá trị khi quyền PT còn hiệu lực. |
| PT/lịch tập | Công thức tính Slot Khả Dụng: Slot Khả Dụng = (Giờ làm việc cố định của PT: Thứ 2 → Thứ 6, 08:00 → 17:00) - (Tất cả booking đã xác nhận của PT). PT là nhân viên với giờ làm việc cố định, PT KHÔNG tự cấu hình/cập nhật giờ rảnh hay availability. Khung giờ nào trong T2→T6 (8h→17h) mà chưa có ai đặt (booking) thì mặc định là slot trống và hội viên có thể đặt. |
| PT/lịch tập | Hội viên chỉ được đặt lịch PT sau khi PT đã ACCEPT assignment request. Lịch PT xác nhận ngay khi đủ điều kiện; xem/chọn giờ chưa giữ chỗ; đặt thành công mới giữ một quyền buổi PT. |
| PT/lịch tập | Hủy/đổi miễn khấu trừ khi tiếp nhận trước giờ bắt đầu ít nhất 12 giờ. Hủy muộn hoặc hội viên vắng khấu trừ 1 buổi; lỗi từ PT/phòng tập không khấu trừ và cần sắp xếp bù. |
| PT/lịch tập | Khi booking thành công chỉ giữ buổi, chưa tính đã dùng. Buổi chỉ chuyển sang COMPLETED và trừ 1 buổi trong gói khi CẢ PT VÀ HỘI VIÊN đều xác nhận buổi tập đã diễn ra (xác nhận kép). Hủy muộn hoặc hội viên vắng khấu trừ 1 buổi theo quy định. Check-in vào gym không tự hoàn tất buổi PT. |
| PT/lịch tập | Sau buổi tập kết thúc, PT xác nhận buổi tập đã diễn ra và hội viên xác nhận buổi tập đã diễn ra. Khi cả hai bên đã xác nhận, hệ thống tự động chuyển buổi sang COMPLETED. QTV được phép sửa kết quả sau đó với lý do và audit. |
| PT/lịch tập | Lễ tân được phép đặt lịch PT thay cho hội viên (kể cả hội viên chưa tạo tài khoản self-service trên mobile app). Khi hội viên gọi điện yêu cầu đặt lịch, lễ tân xem lịch PT và báo lại giờ trống cho hội viên xem xét và chốt. Chỉ khi hội viên đã thanh toán đầy đủ và đã có PT phụ trách (PT đã ACCEPT) thì lễ tân mới đặt lịch được. Scope hiện tại là một hội viên - một PT - một buổi; chưa hỗ trợ đặt buổi định kỳ hoặc lớp nhóm. |
| Thanh toán | Báo cáo tách ba chỉ số: giá trị đăng ký sau giảm, tiền thực thu, còn phải thu. Các chỉ số này phục vụ vận hành, không mặc định là doanh thu kế toán. |
| Thanh toán | Cho phép thu nhiều lần cho một đăng ký. Còn nợ không được kích hoạt gói, vào tập hoặc đặt lịch PT; nợ của gói này không tự khóa gói khác đã đủ điều kiện. |
| Thanh toán | Phương thức trong phạm vi hiện tại: tiền mặt và chuyển khoản ngân hàng bằng VND. Ảnh chứng từ chỉ là bằng chứng hỗ trợ, không tự xác nhận đã thu. |
| Thanh toán | Tiền mặt do lễ tân/QTV có quyền ghi nhận. Chuyển khoản được xác nhận tự động thông qua IPN/Webhook từ ngân hàng/payment provider. Hệ thống chỉ xác nhận payment khi thông báo nhận được hợp lệ, đúng giao dịch, đúng số tiền và báo trạng thái thành công; việc xử lý phải chống ghi nhận trùng khi provider gửi lại. Giao dịch bất thường được chuyển sang luồng đối soát thủ công. |
| Thanh toán | Không cho ghi thu vượt số còn thiếu. Chưa hỗ trợ hoàn tiền hoặc bù trừ tự động giữa các gói trong phạm vi hiện tại. |
| Thanh toán | Payment đã xác nhận không sửa đè hoặc xóa; sai sót xử lý bằng bản ghi điều chỉnh có lý do, người thực hiện và người phê duyệt. |
| Thanh toán | Mỗi lần thanh toán đã xác nhận có phiếu thu nội bộ. Phiếu thu không mặc định là hóa đơn điện tử. QTV/lễ tân xem/xuất/in trong phạm vi; hội viên xem/xuất phiếu của mình. |
| Thanh toán | Mobile nội bộ được tạo đăng ký/gia hạn, khởi tạo thanh toán chuyển khoản, theo dõi trạng thái và xem/xuất phiếu. Thu tiền mặt, đối soát nhạy cảm và điều chỉnh payment đã xác nhận thực hiện trên Web. |
| Check-in/ra vào | Hệ thống mô tả cả IN và OUT. Từng chi nhánh chỉ bật OUT nếu thiết bị/quy trình hỗ trợ. Nơi chỉ có IN không được suy ra chính xác số người đang ở phòng. |
| Check-in/ra vào | Được vào tập khi hồ sơ được phục vụ, có quyền Gym còn hiệu lực, đã thanh toán đủ, đúng chi nhánh, còn buổi nếu áp dụng và trong giờ hoạt động. Gói PT không tự cấp quyền vào Gym. |
| Check-in/ra vào | Nhận diện thành công chỉ xác định người; vẫn phải kiểm tra điều kiện sử dụng gói. Lễ tân thấy lý do chi tiết; K01 chỉ hiển thị thông báo trung tính cho hội viên. |
| Check-in/ra vào | Sự kiện lặp từ cùng thiết bị không được tính hai lần. Cùng người/điểm/chiều trong 60 giây được đánh dấu nghi lặp để tránh sai thống kê. |
| Check-in/ra vào | QTV/lễ tân có quyền được ghi nhận thủ công tại chi nhánh, bắt buộc có người ghi, hội viên, điểm vào/ra, thời điểm, lý do và tham chiếu sự kiện nếu có. Ghi thủ công không được dùng để vượt điều kiện gói. |
| Check-in/ra vào | Với Gym theo buổi, trừ tối đa một buổi/ngày cho cùng hội viên; vào lại trong ngày không trừ lặp. Ra/vào có thể hiển thị khách đã đến nhưng không tự hoàn tất buổi PT. |
| Check-in/ra vào | K01 mặc định chỉ hiển thị kết quả và hướng dẫn. Tên/ảnh/sinh nhật chỉ hiển thị khi có consent phù hợp; không hiển thị điện thoại, email, ngày sinh đầy đủ, công nợ, giá gói, ghi chú. |
| Chi nhánh | Hỗ trợ một chi nhánh chính và nhiều chi nhánh trực thuộc. Quyền truy cập xác định theo role + branch scope + permission. Chi nhánh con không mặc định thấy dữ liệu của nhau. |
| Chi nhánh | Mỗi hội viên có một mã/hồ sơ duy nhất trên toàn hệ thống; quyền xem dữ liệu vẫn phụ thuộc vai trò và chi nhánh. |
| Chi nhánh | Gói có danh sách chi nhánh được sử dụng, lưu snapshot khi bán. Chi nhánh bán và chi nhánh sử dụng là hai thuộc tính khác nhau. Chi nhánh mới không tự được thêm vào gói đã bán. |
| Chi nhánh | Tài khoản chỉ chuyển chi nhánh khi được cấp quyền nhiều chi nhánh. Khi chuyển, phải xử lý nội dung chưa lưu và tải lại dữ liệu theo chi nhánh mới. |
| Chi nhánh | Chi nhánh quản lý lịch tuần, ngày nghỉ/ngoại lệ và múi giờ. Mặc định Asia/Ho_Chi_Minh. Ngày nghỉ cụ thể ưu tiên hơn lịch tuần. Chưa hỗ trợ ca qua đêm. |
| Chi nhánh | Chi nhánh ngừng hoạt động thì dừng bán/lịch mới, rà soát gói/lịch/công nợ/thiết bị, không tự chuyển khách hoặc lịch. Dữ liệu lịch sử vẫn thuộc chi nhánh cũ. |
| Tài khoản/phân quyền | Role chính thức: QTV, Lễ tân, PT, Hội viên/Khách hàng. Chủ phòng/quản lý gom vào QTV; khác biệt thể hiện bằng phạm vi chi nhánh và permission nhạy cảm. |
| Tài khoản/phân quyền | Chưa làm khu vực desktop riêng cho PT/hội viên; tác vụ của họ ưu tiên Mobile. |
| Tài khoản/phân quyền | Định danh đăng nhập chính là số điện thoại đã xác minh và mật khẩu. Email đã xác minh là kênh khôi phục bổ sung. Số điện thoại đăng nhập là duy nhất cho một tài khoản. |
| Tài khoản/phân quyền | Tài khoản đăng nhập tách biệt với hồ sơ nghiệp vụ. Role hội viên liên kết đúng một hồ sơ hội viên; role PT liên kết đúng một hồ sơ PT. Một tài khoản có thể có nhiều role nhưng không cộng gộp quyền giữa các role. |
| Tài khoản/phân quyền | Khi chuyển role/chi nhánh phải xử lý thay đổi chưa lưu, bỏ dữ liệu không còn thuộc quyền khỏi giao diện và áp quyền theo ngữ cảnh mới. |
| Tài khoản/phân quyền | Thao tác nhạy cảm gồm đổi role/permission/branch scope, khóa/mở tài khoản, xử lý payment nhạy cảm, miễn/điều chỉnh buổi PT, sửa kết quả PT, ngừng hồ sơ/PT/chi nhánh, quản lý dữ liệu nhận diện. Các thao tác này cần permission riêng, xác nhận/lý do và audit. |
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
| OPEN-03 | OPEN | Các loại chính sách giảm giá cụ thể, quota/ngân sách, giới hạn theo hội viên và ngưỡng cần QTV duyệt là bao nhiêu? |
| OPEN-04 | OPEN | Quy trình xử lý đăng ký đã thu/đã dùng nhưng cần hủy, điều chỉnh hoặc tranh chấp sẽ được đưa vào phiên bản nào? |
| OPEN-05 | OPEN | Quy trình xóa dữ liệu cá nhân theo yêu cầu hội viên ngoài thao tác lưu trữ/ngừng phục vụ cần được chốt riêng. |
| OPEN-06 | OPEN | Nếu đơn vị vận hành muốn push/SMS/Zalo/email chăm sóc ngay trong phiên bản đầu, cần chốt kênh, consent, mẫu nội dung và trách nhiệm vận hành. |
| OPEN-07 | OPEN | Nếu muốn điều khiển khóa/cổng xoay thật, cần chốt phạm vi nghiệp vụ, trách nhiệm khi mở thủ công và trạng thái xác nhận từ thiết bị. |
| OPEN-08 | OPEN | Nếu gói PT đã thanh toán đủ nhưng đến ngày bắt đầu vẫn chưa được phân công PT do phía phòng Gym, kỳ hiệu lực có tiếp tục chạy hay phải điều chỉnh ngày bắt đầu/ngày hết hạn? |
| OPEN-09 | OPEN | Hội viên được tự tạo registration và thanh toán gói trên mobile hay chỉ xem gói/gửi nhu cầu để Lễ tân xử lý? |

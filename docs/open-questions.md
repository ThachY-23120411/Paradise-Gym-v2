# Open Questions - Paradise Gym

Tài liệu này liệt kê các vấn đề nghiệp vụ cần được quyết định trước khi viết Product Spec. Các mục dưới đây chỉ là câu hỏi mở, không bao gồm phương án trả lời hoặc giả định triển khai.

## Hội viên

- HV-01: Khi tạo hồ sơ hội viên/khách hàng, những trường nào là bắt buộc tối thiểu?
- HV-02: Có cho phép tạo hồ sơ khi chưa có số điện thoại hoặc email không?
- HV-03: Quy tắc kiểm tra duy nhất SĐT (real-time duplicate check) khi tạo/sửa hồ sơ hội viên như thế nào?
- HV-04: Xử lý ra sao khi SĐT nhập vào đã tồn tại trên hệ thống (chặn lưu hồ sơ mới & cung cấp liên kết mở hồ sơ hiện có)?
- HV-05: Có cho phép dùng chung số điện thoại hoặc gộp hồ sơ trùng SĐT không? (Không, SĐT phải duy nhất 100%).
- HV-06: Trạng thái hồ sơ hội viên gồm những trạng thái nào, và khác gì với hiệu lực gói tập?
- HV-07: Hồ sơ đã có đăng ký, lịch hoặc giao dịch thì được xóa, lưu trữ hay chỉ ngừng hoạt động?
- HV-08: Ai được sửa tên, liên hệ, ảnh hồ sơ, ngày sinh và ghi chú vận hành của hội viên?
- HV-09: Hội viên được tự cập nhật những thông tin cá nhân nào trên mobile?
- HV-10: Những loại dữ liệu cá nhân hoặc nhạy cảm nào không được thu trong phạm vi hệ thống?

## Gói tập/gia hạn

- PKG-01: Hệ thống cần quản lý chính thức những loại gói nào: Gym theo thời gian, Gym theo buổi, PT, combo hay loại khác?
- PKG-02: Cách tính ngày bắt đầu và ngày hết hạn của gói được quy định như thế nào?
- PKG-03: Khi gia hạn gói còn hiệu lực, ngày mới nối tiếp gói cũ hay bắt đầu theo ngày người dùng chọn?
- PKG-04: Có cho phép một hội viên có nhiều gói cùng lúc hoặc nhiều gói chồng thời gian không?
- PKG-05: Gói áp dụng theo một chi nhánh, nhiều chi nhánh hay toàn chuỗi?
- PKG-06: Với gói theo buổi/PT, cần phân biệt các số liệu nào: tổng buổi, đã dùng, đang giữ chỗ, còn có thể đặt?
- PKG-07: Khi nào gói được coi là có hiệu lực: sau khi lưu đăng ký, sau khi thu đủ tiền hay theo điều kiện khác?
- PKG-08: Có hỗ trợ bảo lưu, chuyển gói, chuyển nhượng, nâng cấp, hạ cấp hoặc hủy gói không?
- PKG-09: Khuyến mãi, giảm giá hoặc mã giảm giá có nằm trong phạm vi Product Spec không?
- PKG-10: Ai được sửa giá, điều kiện gói hoặc ngừng bán gói?
- PKG-11: Khi danh mục gói đổi giá hoặc ngừng bán, lịch sử đăng ký đã bán trước đó hiển thị theo quy tắc nào?
- PKG-12: Hội viên gửi yêu cầu gia hạn thì quầy xử lý theo những trạng thái nào?

## PT/lịch tập

- PT-01: Gói PT có bắt buộc phân công PT cố định không, hay hội viên được chọn PT khi đặt lịch?
- PT-02: Trường hợp chưa phân công PT có được phép lưu đăng ký PT không?
- PT-03: Ai được tạo, sửa hoặc khóa lịch làm việc của PT?
- PT-04: PT có được tự cập nhật lịch rảnh/lịch bận của mình không?
- PT-05: Lịch PT được xác nhận ngay sau khi đặt hay cần phê duyệt?
- PT-06: Nếu cần phê duyệt lịch, ai là người duyệt và trạng thái chờ duyệt giữ chỗ trong bao lâu?
- PT-07: Hạn đổi/hủy lịch trước giờ tập là bao lâu?
- PT-08: Trễ hạn hủy, hội viên vắng mặt hoặc PT vắng mặt thì xử lý quyền lợi buổi tập như thế nào?
- PT-09: Buổi PT bị trùng lịch với PT, hội viên, chi nhánh hoặc gói không hợp lệ thì xử lý theo thứ tự ưu tiên nào?
- PT-10: Số buổi PT bị trừ tại thời điểm nào: khi đặt lịch, khi xác nhận, khi check-in hay khi PT ghi kết quả?
- PT-11: PT được ghi nhận kết quả cho những buổi nào và có được sửa kết quả đã ghi không?
- PT-12: Có hỗ trợ đặt lịch một lần, đặt định kỳ, đặt nhiều người cùng buổi hoặc lớp nhóm không?
- PT-13: Khi PT ngừng hoạt động nhưng còn lịch tương lai, ai xử lý và xử lý theo quy trình nào?

## Thanh toán/công nợ

- PAY-01: "Doanh thu" trong báo cáo được định nghĩa là tiền thực thu, giá trị gói đã bán, hay một chỉ số khác?
- PAY-02: Hệ thống có cho phép công nợ hoặc thu một phần không?
- PAY-03: Nếu còn nợ, hội viên có được kích hoạt gói, vào tập hoặc đặt lịch PT không?
- PAY-04: Các phương thức thanh toán chính thức cần quản lý là gì?
- PAY-05: Chuyển khoản được xác nhận bằng thông tin nào: mã tham chiếu, ảnh chứng từ, đối soát thủ công hay cách khác?
- PAY-06: Ảnh chứng từ có giá trị như bằng chứng hỗ trợ hay được coi là xác nhận đã thu?
- PAY-07: Ai được ghi nhận thu tiền, xác nhận đã thu, lưu chờ đối soát hoặc hủy/điều chỉnh giao dịch?
- PAY-08: Có cho phép thu vượt số còn phải thu, hoàn tiền hoặc bù trừ sang gói khác không?
- PAY-09: Khi thao tác thu tiền bị mất mạng hoặc chưa rõ kết quả, quy trình kiểm tra tránh thu trùng là gì?
- PAY-10: Phiếu thu là chứng từ nội bộ hay cần đáp ứng quy định hóa đơn/chứng từ khác?
- PAY-11: Mẫu phiếu thu cần có những thông tin nào và ai được xem, xuất hoặc in phiếu?
- PAY-12: Mobile nội bộ có được ghi nhận khoản thu mới không, hay chỉ xem/xuất phiếu đã có?

## Check-in/ra vào

- ACC-01: Hệ thống có quản lý cả check-in và check-out không, hay chỉ ghi nhận lượt vào?
- ACC-02: Điều kiện để hội viên được vào tập gồm những yếu tố nào: gói còn hạn, còn buổi, không nợ, đúng chi nhánh hay yếu tố khác?
- ACC-03: Nhận diện thành công có tự đồng nghĩa được phép vào tập không?
- ACC-04: Khi không đủ điều kiện vào tập, lễ tân thấy lý do chi tiết nào và hội viên thấy thông báo nào?
- ACC-05: Sự kiện nhận diện lặp trong thời gian ngắn được xử lý thế nào?
- ACC-06: Trường hợp không nhận diện được, nhận diện nhầm hoặc thiết bị mất kết nối cần có quy trình nào?
- ACC-07: Ai được ghi nhận ra/vào thủ công?
- ACC-08: Ghi nhận thủ công có cần lý do, phê duyệt hoặc dấu vết thao tác nào?
- ACC-09: Ghi nhận ra/vào có liên kết với buổi PT trong ngày không?
- ACC-10: Màn hình chào mừng K01 được phép hiển thị những thông tin cá nhân nào?
- ACC-11: Có hiển thị chúc mừng sinh nhật trên K01 không, và cần hội viên đồng ý theo cách nào?

## Chi nhánh

- BR-01: Phiên bản Product Spec cần hỗ trợ một chi nhánh hay nhiều chi nhánh?
- BR-02: Vai trò quản lý, lễ tân và PT được cấp quyền theo từng chi nhánh hay theo toàn chuỗi?
- BR-03: Hội viên được nhận diện và tra cứu xuyên chi nhánh như thế nào?
- BR-04: Gói tập được sử dụng tại chi nhánh bán, chi nhánh được cấu hình trong gói hay toàn bộ chi nhánh?
- BR-05: Chi nhánh phát sinh giao dịch và chi nhánh sử dụng gói có thể khác nhau không?
- BR-06: Khi đổi chi nhánh đang làm việc, dữ liệu đang xem, bộ lọc và thông báo cần xử lý thế nào?
- BR-07: Giờ mở cửa, ngày nghỉ và múi giờ của từng chi nhánh được quản lý ở mức nào?
- BR-08: Khi chi nhánh ngừng hoạt động, các gói, lịch, thiết bị và báo cáo lịch sử liên quan được xử lý ra sao?
- BR-09: Báo cáo toàn chuỗi và báo cáo từng chi nhánh được cấp cho vai trò nào?

## Tài khoản/phân quyền

- AUTH-01: Các vai trò chính thức của hệ thống gồm những vai trò nào?
- AUTH-02: Chủ phòng/quản lý và quản trị viên có phải cùng một vai trò không?
- AUTH-03: PT và hội viên có cần quyền truy cập web, hay chỉ nằm trong phạm vi mobile?
- AUTH-04: Định danh đăng nhập chính là email, số điện thoại hay phương án khác?
- AUTH-05: Tài khoản người dùng được liên kết với hồ sơ hội viên hoặc hồ sơ PT theo quy tắc nào?
- AUTH-06: Một tài khoản có được có nhiều vai trò không?
- AUTH-07: Khi chuyển vai trò hoặc chi nhánh, hệ thống cần xử lý dữ liệu đang hiển thị và thao tác chưa lưu như thế nào?
- AUTH-08: Vai trò nào được xem thông tin tiền, công nợ, số điện thoại, email và ghi chú nội bộ?
- AUTH-09: Vai trò nào được tạo/sửa/xóa hồ sơ, gói, đăng ký, lịch, giao dịch, chi nhánh, thiết bị và tài khoản?
- AUTH-10: Những quyền nào được coi là quyền nhạy cảm cần xác nhận hoặc ghi lý do khi thay đổi?
- AUTH-11: Ai được cấp, sửa, khóa hoặc khôi phục tài khoản?
- AUTH-12: Quy trình mời tài khoản, khôi phục truy cập và khóa tài khoản cần những trạng thái nào?
- AUTH-13: Nhật ký thao tác cần lưu những loại hành động nào và ai được xem nhật ký?

## Thông báo

- NOTI-01: Những loại thông báo nghiệp vụ nào cần có trong Product Spec?
- NOTI-02: Thông báo đăng ký mới, gia hạn, lịch PT, sắp hết hạn và sinh nhật được gửi cho vai trò nào?
- NOTI-03: Người nhận thông báo được xác định theo chi nhánh, người phụ trách, vai trò hay tiêu chí khác?
- NOTI-04: Các kênh thông báo chính thức là gì: trong ứng dụng, push, SMS, email, Zalo hay kênh khác?
- NOTI-05: Ngưỡng nhắc trước hết hạn, trước buổi PT hoặc trước sinh nhật được cấu hình như thế nào?
- NOTI-06: Trạng thái "chưa đọc", "đã đọc", "đã gửi", "gửi lỗi" và "đã xử lý" khác nhau ra sao?
- NOTI-07: Quy tắc tránh gửi trùng thông báo hoặc nhắc lại quá nhiều lần là gì?
- NOTI-08: Ai được soạn mẫu, sửa nội dung, gửi thử và gửi thật thông báo?
- NOTI-09: Hội viên có được chọn loại thông báo muốn nhận không?
- NOTI-10: Thông báo chăm sóc, thông báo giao dịch và thông báo tiếp thị có cần tách riêng chính sách đồng ý không?

## Thiết bị/nhận diện

- DEV-01: Phạm vi thiết bị cần quản lý gồm những loại nào: máy nhận diện, khóa cửa, máy in phiếu hay thiết bị khác?
- DEV-02: Giai đoạn Product Spec cần mô tả tích hợp thiết bị thật hay chỉ mô tả trạng thái nghiệp vụ cần hỗ trợ?
- DEV-03: Mỗi thiết bị được gắn với chi nhánh, điểm lắp và mục đích sử dụng theo quy tắc nào?
- DEV-04: Thiết bị mất kết nối, dữ liệu cũ hoặc chưa đồng bộ được hiển thị và xử lý thế nào?
- DEV-05: Ai được thêm, sửa, kiểm tra kết nối, ngừng hoạt động hoặc xem thông tin cấu hình thiết bị?
- DEV-06: Dữ liệu nhận diện được đăng ký, xác nhận, rút lại và xóa theo quy trình nào?
- DEV-07: Hội viên cần đồng ý những nội dung nào trước khi sử dụng dữ liệu nhận diện?
- DEV-08: Ảnh hồ sơ có được dùng cho nhận diện không, hay dữ liệu nhận diện là quy trình riêng?
- DEV-09: Khi nhận diện thành công, hệ thống chỉ ghi nhật ký hay có gửi lệnh mở cửa?
- DEV-10: Nếu có mở cửa, ai chịu trách nhiệm khi mở thủ công hoặc khi thiết bị trả kết quả không rõ?
- DEV-11: Nhật ký thiết bị và nhận diện cần lưu trong bao lâu và ai được xem?

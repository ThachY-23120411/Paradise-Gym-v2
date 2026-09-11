# UI Related Screen Audit

Rà theo `docs/user-stories/**/Related Screen` và source UI hiện tại.

## Kết quả chính

| User story | Related Screen | Bổ sung / chỉnh sửa UI |
| --- | --- | --- |
| E01-US01, E01-US03, E10-US02 | Web/Mobile modal Thêm/Sửa hồ sơ hội viên | Đánh dấu số điện thoại và chi nhánh là bắt buộc; chuẩn hoá SĐT, kiểm tra duy nhất SĐT realtime và chặn lưu nếu trùng kèm liên kết mở hồ sơ hiện có. Rút gọn các trường thừa (Mã HV tự sinh, Trạng thái mặc định, Ảnh hồ sơ, Ghi chú vận hành). Bỏ hoàn toàn modal nghi trùng/dùng chung contact. |
| E01-US02 | Web/Mobile modal Cập nhật hồ sơ và modal Thay đổi trạng thái hồ sơ | Tách trạng thái hồ sơ khỏi trạng thái gói; cập nhật hồ sơ giữ nguyên dữ liệu nghiệp vụ, đổi trạng thái cần lý do và ghi audit. |
| E02-US01, E02-US02, E02-US04, E07-US02 | Web W03 Gói tập; Web modal Tạo/Sửa danh mục gói tập | Bổ sung đủ 4 loại gói trong spec: Gym theo thời gian, Gym theo buổi, PT theo buổi, Combo Gym + PT; thêm trường quyền Gym/quyền PT và dữ liệu demo Combo. |
| E02-US02, E02-US03, E03-US02, E03-US03, E05-US02 | Web/Mobile modal Đăng ký/Gia hạn gói | Bổ sung lựa chọn Combo, ngày kết thúc dự kiến, quyền lợi snapshot, chính sách giảm giá và luồng gửi QTV duyệt ngoài chính sách. |
| E03-US01, E03-US02, E03-US03 | Web modal Cấu hình chính sách | Bổ sung nhóm chính sách giảm giá, mức giảm tối đa/quota và phạm vi áp dụng. |
| E04-US02 | Mobile nội bộ modal Thanh toán chuyển khoản | Tạo modal mới `bank-transfer-payment` cho Mobile Lễ tân; cập nhật Related Screen tới `screenshot/le-tan/light-mobile-modal-thanh-toan-chuyen-khoan.png`. |
| E04-US02 | Mobile HV03 Gói của tôi | Bổ sung trạng thái chuyển khoản đang chờ IPN/Webhook và ghi chú ảnh chứng từ không tự xác nhận đã thu. |
| E04-US05, E08-US04 | Web modal Điều chỉnh payment đã xác nhận | Tạo modal mới `payment-adjustment` cho QTV; cập nhật Related Screen tới `screenshot/qtv/light-web-modal-dieu-chinh-payment-da-xac-nhan.png`. |
| E04-US01, E04-US02, E04-US04, E04-US05 | Web modal Ghi nhận thu tiền; Web W08 Thu tiền & công nợ | Bổ sung nguồn xác nhận chuyển khoản, mã chống ghi nhận trùng, IPN/Webhook hợp lệ và nút khởi tạo CK/điều chỉnh trên W08. |
| E05-US03, E05-US04, E05-US05, E08-US04 | Web W06 Lịch tập & buổi PT / Web modal Đặt lịch, Đổi/Hủy lịch, Ghi nhận kết quả | Calendar theo một PT với trạng thái Đã đặt, Chờ xác nhận hoàn thành, Hoàn thành, Đã hủy; booking còn hiệu lực có Hủy lịch; hủy chuyển CANCELLED, ghi audit, release slot nhưng giữ record; booking đã qua giờ có action cập nhật kết quả và xác nhận kép để trừ đúng 1 buổi. Modal Đặt lịch tối giản cho Lễ tân: Searchable Dropdown hội viên theo SĐT, gói PT/Combo hợp lệ tự lọc, branch/PT readonly và auto-fill ngày/giờ/PT/branch khi mở từ slot. |
| E06-US02 | Web/Mobile modal Ghi nhận ra/vào thủ công | Bổ sung thời điểm ghi nhận và tham chiếu sự kiện thiết bị, khớp rule bắt buộc của story. |
| E07-US01, E07-US04 | Web/Mobile modal Tạo/Sửa chi nhánh | Bổ sung lịch tuần, ngày nghỉ/ngoại lệ và rà soát gói/lịch/công nợ/thiết bị khi ngừng hoạt động. |
| E08-US01, E08-US02, E08-US03, E08-US04, E09-US04 | Web W13 Tài khoản & phân quyền / Web/Mobile modal Tài khoản và phân quyền & Mobile Đăng nhập Hội viên | Đưa Tài khoản & phân quyền thành menu W13 riêng trên Web Sidebar; bổ sung 4 thẻ KPI tổng quan (Tổng số, Active, Khóa, Chờ/Ngừng), bộ lọc Role kèm tổng số lượng (ví dụ QTV (1)), Combobox lọc trạng thái không kèm số lượng, thích ứng màu sắc Light/Dark mode tự động; loại bỏ các trường hồ sơ cá nhân thừa và thao tác QTV cấp/tạo tài khoản khỏi form tài khoản. Màn hình Đăng nhập Mobile Hội viên/PT & luồng kích hoạt bằng OTP. |
| E10-US01, E10-US02, E10-US03, E10-US04 | Web/Mobile modal Thiết bị và kết nối | Bổ sung mục đích IN/OUT, trạng thái thiết bị, trạng thái consent nhận diện và kết quả thử nhận diện. |

## Screenshot bổ sung mới

| File | Nằm trong Related Screen |
| --- | --- |
| `screenshot/le-tan/light-mobile-modal-thanh-toan-chuyen-khoan.png` | `E04-US02` |
| `screenshot/qtv/light-web-modal-dieu-chinh-payment-da-xac-nhan.png` | `E04-US05` |
| `screenshot/hoi-vien/light-mobile-HV-dang-nhap.png` | `E08-US01` |
| `screenshot/hoi-vien/light-mobile-HV-tao-tai-khoan-nhap-sdt.png` | `E08-US01` |
| `screenshot/hoi-vien/light-mobile-HV-tao-tai-khoan-case2-lien-ket-ho-so-quay.png` | `E08-US01` |
| `screenshot/hoi-vien/light-mobile-HV-tao-tai-khoan-case2-xac-thuc-otp.png` | `E08-US01` |
| `screenshot/hoi-vien/light-mobile-HV-tao-tai-khoan-case3-tu-dang-ky-ho-so-moi.png` | `E08-US01` |
| `screenshot/hoi-vien/light-mobile-HV-tao-tai-khoan-case3-xac-thuc-otp.png` | `E08-US01` |

## Kiểm tra link

- Tất cả link screenshot dạng `../../../screenshot/...` trong `Related Screen` đã được kiểm tra tồn tại sau khi bổ sung.

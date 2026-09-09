# UI Related Screen Audit

Rà theo `docs/user-stories/**/Related Screen` và source UI hiện tại.

## Kết quả chính

| User story | Related Screen | Bổ sung / chỉnh sửa UI |
| --- | --- | --- |
| E01-US01, E01-US03, E10-US02 | Web/Mobile modal Thêm/Sửa hồ sơ hội viên | Đánh dấu số điện thoại và chi nhánh là bắt buộc; thêm ảnh hồ sơ, consent nhận diện và lý do dùng chung liên hệ/nghi trùng. |
| E01-US02 | Web/Mobile modal Cập nhật hồ sơ và modal Thay đổi trạng thái hồ sơ | Tách trạng thái hồ sơ khỏi trạng thái gói; cập nhật hồ sơ giữ nguyên dữ liệu nghiệp vụ, đổi trạng thái cần lý do và ghi audit. |
| E02-US01, E02-US02, E02-US04, E07-US02 | Web W03 Gói tập; Web modal Tạo/Sửa danh mục gói tập | Bổ sung đủ 4 loại gói trong spec: Gym theo thời gian, Gym theo buổi, PT theo buổi, Combo Gym + PT; thêm trường quyền Gym/quyền PT và dữ liệu demo Combo. |
| E02-US02, E02-US03, E03-US02, E03-US03, E05-US02 | Web/Mobile modal Đăng ký/Gia hạn gói | Bổ sung lựa chọn Combo, ngày kết thúc dự kiến, quyền lợi snapshot, chính sách giảm giá và luồng gửi QTV duyệt ngoài chính sách. |
| E03-US01, E03-US02, E03-US03 | Web modal Cấu hình chính sách | Bổ sung nhóm chính sách giảm giá, mức giảm tối đa/quota và phạm vi áp dụng. |
| E04-US02 | Mobile nội bộ modal Thanh toán chuyển khoản | Tạo modal mới `bank-transfer-payment` cho Mobile Lễ tân; cập nhật Related Screen tới `screenshot/le-tan/light-mobile-modal-thanh-toan-chuyen-khoan.png`. |
| E04-US02 | Mobile HV03 Gói của tôi | Bổ sung trạng thái chuyển khoản đang chờ IPN/Webhook và ghi chú ảnh chứng từ không tự xác nhận đã thu. |
| E04-US05, E08-US04 | Web modal Điều chỉnh payment đã xác nhận | Tạo modal mới `payment-adjustment` cho QTV; cập nhật Related Screen tới `screenshot/qtv/light-web-modal-dieu-chinh-payment-da-xac-nhan.png`. |
| E04-US01, E04-US02, E04-US04, E04-US05 | Web modal Ghi nhận thu tiền; Web W08 Thu tiền & công nợ | Bổ sung nguồn xác nhận chuyển khoản, mã chống ghi nhận trùng, IPN/Webhook hợp lệ và nút khởi tạo CK/điều chỉnh trên W08. |
| E06-US02 | Web/Mobile modal Ghi nhận ra/vào thủ công | Bổ sung thời điểm ghi nhận và tham chiếu sự kiện thiết bị, khớp rule bắt buộc của story. |
| E07-US01, E07-US04 | Web/Mobile modal Tạo/Sửa chi nhánh | Bổ sung lịch tuần, ngày nghỉ/ngoại lệ và rà soát gói/lịch/công nợ/thiết bị khi ngừng hoạt động. |
| E08-US01, E08-US02, E08-US03, E08-US04, E09-US04 | Web/Mobile modal Tài khoản và phân quyền | Chỉnh định danh đăng nhập theo số điện thoại đã xác minh, thêm trạng thái Ngừng sử dụng và các consent thông báo/sinh nhật K01. |
| E10-US01, E10-US02, E10-US03, E10-US04 | Web/Mobile modal Thiết bị và kết nối | Bổ sung mục đích IN/OUT, trạng thái thiết bị, trạng thái consent nhận diện và kết quả thử nhận diện. |

## Screenshot bổ sung mới

| File | Nằm trong Related Screen |
| --- | --- |
| `screenshot/le-tan/light-mobile-modal-thanh-toan-chuyen-khoan.png` | `E04-US02` |
| `screenshot/qtv/light-web-modal-dieu-chinh-payment-da-xac-nhan.png` | `E04-US05` |

## Kiểm tra link

- Tất cả link screenshot dạng `../../../screenshot/...` trong `Related Screen` đã được kiểm tra tồn tại sau khi bổ sung.

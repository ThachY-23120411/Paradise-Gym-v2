# PT02 - Gói phụ trách

- Role: PT; Platform: Mobile.
- Scope: Tra cứu học viên và hợp đồng gói tập PT được Lễ tân/QTV gán cho chính PT, xem danh sách gói của học viên, xem lộ trình/lịch sử; không hiển thị công nợ hay tài chính học viên.

## Thành phần nghiệp vụ
- Menu footer Mobile PT: `PT02 · Gói phụ trách` (trước đây là `Học viên`).
- Cấu trúc 3 tab chính:
  * **Tab 1 - Học viên phụ trách**: Gom nhóm danh sách theo từng học viên duy nhất (mỗi học viên 1 dòng dù có nhiều gói mà PT phụ trách). Hiển thị pill badge số lượng gói PT đang phụ trách. Chạm vào học viên mở Màn hình phụ danh sách các gói của học viên đó (`#memberPackagesSubscreen`) mà PT đang phụ trách. Chạm vào từng gói sẽ mở màn hình chi tiết lộ trình tập luyện `PT02-US02`.
  * **Tab 2 - Gói đang phụ trách**: Danh sách phẳng tất cả các hợp đồng gói PT cụ thể mà PT đang phụ trách (mỗi thẻ là 1 gói). Chạm vào gói mở trực tiếp màn hình chi tiết lộ trình tập luyện `PT02-US02`.
  * **Tab 3 - Yêu cầu phụ trách**: Hiển thị danh sách các yêu cầu phân công HLV kèm số đếm trên tab và trạng thái (`Đã tiếp nhận`, `Đã từ chối`, `Yêu cầu cũ chưa xử lý`).
- Cơ chế quay lại (Back navigation 3 cấp độ): Nút `[←]` trên chi tiết lộ trình tự động nhận diện nguồn mở để quay về đúng màn hình trước đó (về Màn hình phụ danh sách gói nếu mở từ Tab 1, hoặc về Tab 2 nếu mở từ Tab 2). Nút `[←]` trên Màn hình phụ danh sách gói quay về Tab 1.
- Tìm kiếm tên/SĐT trong own scope áp dụng tức thì theo thời gian thực cho tab đang mở.
- Danh sách gồm own registrations ACTIVE, SCHEDULED, FROZEN, EXPIRED để tra cứu lịch sử. Badge lấy nhãn API, end_date null = Không giới hạn. Không coi mọi hợp đồng được hiển thị là đủ điều kiện đặt lịch.
- Badge cận hạn dùng reg.is_expiring và reg.display_status từ API: <= 4 ngày theo thời gian hoặc <= 3 buổi theo quyền lợi buổi; Combo OR. Giữ reg.status ACTIVE cho điều kiện sử dụng; không tự tính ngưỡng 7 ngày hoặc thêm field/enum DB.
- Thẻ gói hiển thị tên/mã/SĐT, avatar, gói, hạn, số buổi khả dụng, lần tập cuối và tiến độ used/total. Tổng = used + booked + remaining; không bỏ qua buổi đang giữ lịch.
- Chi tiết lộ trình dùng giờ thực tế, session number, ghi chú/đánh giá từ API. Chỉ đọc lịch sử hoàn thành.

## User Stories
- PT02-US01: Danh sách học viên và gói phụ trách (gồm 3 tab: Học viên phụ trách, Gói đang phụ trách và Yêu cầu phụ trách, cùng màn hình phụ danh sách gói của học viên).
- PT02-US02: Chi tiết lộ trình/lịch sử tập luyện (hỗ trợ điều hướng quay lại theo ngữ cảnh nguồn).
- PT02-US03: Lịch sử phân công PT (tích hợp trực tiếp tại Tab 3 Yêu cầu phụ trách).
- Field-level specification của từng khối nằm tại US tương ứng.

## Traceability
- [User Stories PT](../../user-stories/pt/README.md)
- [Product Spec](../../product-spec.md), mục 4.4.


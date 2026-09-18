# QTV/LT Web Rebuild - Ban Giao

Ngày: 17/09/2026. Phạm vi: toàn bộ Web QTV W01-W13 và các US tương ứng của lễ tân.

## Chạy Thử

- Web đang chạy: http://localhost:3000/web/
- API PostgreSQL: http://localhost:5000/health
- Khởi động lại web: `node frontend/web/dev-server.cjs` từ repository; có thể chọn cổng khác bằng biến `PORT`.
- Khởi động lại API: `npm run dev` trong `backend/`.
- Tài khoản seed local QTV: `0900000001`; lễ tân: `0900000002`; mật khẩu seed được tài liệu hóa: `Paradise@123`.
- QTV vẫn bật 2FA. Chỉ khi local `AUTH_OTP_MODE=development`, mã OTP do server sinh mới hiện cùng nhãn môi trường phát triển. Đây không phải SMS đã gửi thật.

## Đã Thay Đổi

- Viết lại shell, điều hướng, tab làm việc, đăng nhập, bộ chọn chi nhánh, CSS và toàn bộ tám module nghiệp vụ web.
- Giao diện dựa trên màn hình phần mềm trong [trang Paradise Gym tham chiếu](https://phanmemtinhluong.com/phan-mem-quan-ly-phong-gym-paradise-gym/): topbar xanh lá đậm, sidebar trắng, nền trung tính, bảng/form DevExtreme gọn và nhất quán.
- Tách dashboard QTV/LT; tách đăng ký/gia hạn khỏi thu tiền; bổ sung form động, readonly, validation, lỗi/retry, trạng thái rỗng và thao tác theo quyền.
- Xóa cơ chế demo/fallback dữ liệu của web. Danh sách, KPI, lịch, quyền lợi, thanh toán và thiết bị dùng REST API/PostgreSQL thật.
- Core worker bổ sung API còn thiếu, migration không reset dữ liệu, bảo vệ thanh toán, scope và audit; ERD đã được đồng bộ.
- Sửa W12 để lưu đúng trạng thái cấu hình, tách kết nối theo heartbeat và trạng thái vận hành; W07 không báo sẵn sàng khi thiết bị chỉ có kết nối nhưng đang bị ngừng vận hành. Field-level specification W12, Epic và Product Spec được làm rõ tương ứng.
- Quyết định người dùng chốt khi bàn giao: thông báo tự động chỉ gửi khi QTV đã lưu quy tắc Bật, đúng W09-US01. Không có quy tắc, quy tắc Tắt hoặc mẫu ngừng sử dụng thì không gửi; không dùng thông báo mặc định để vượt qua cấu hình QTV.
- Không sửa source Mobile Member/PT. Main Flow/Activity Diagram giữ làm chuẩn nghiệp vụ; riêng W09 được làm rõ nhánh gửi/không gửi và lỗi lưu theo quyết định trực tiếp của người dùng, không đổi US để hợp thức hóa chức năng tự gửi mặc định.

## Truy Vết

Đã đọc và đối chiếu **65 US: 43 QTV + 22 LT**. Đây là số tài liệu được rà soát, không phải tuyên bố 65 US đều đã nghiệm thu end-to-end với thiết bị thật.

| Nhóm | Báo cáo đối chiếu |
| --- | --- |
| W01, W07, W10; shell/auth | [9 US và kiểm thử vận hành](rebuild-operations-audit.md) |
| W02, W03, W11 | [16 US hội viên/gói/chi nhánh](rebuild-members-packages-branches-audit.md) |
| W04, W08 | [16 US đăng ký/thanh toán](rebuild-sales-audit.md) |
| W05, W06 | [13 US PT/lịch tập](rebuild-pt-scheduler-audit.md) |
| W09, W12, W13 | [11 US thông báo/thiết bị/tài khoản](rebuild-system-audit.md) |
| API, database, quy tắc nghiệp vụ | [Contract và kiểm chứng backend](../tab4-backend-db/web-rebuild-api-contracts.md) |

Mapping đầy đủ từng route đến từng file US: [Screen audit](../../ui-related-screen-audit.md). Kế hoạch: [Implementation plan](web-rebuild-implementation-plan.md).

## Bằng Chứng Kiểm Thử

- `npm test` trong backend: điều phối chạy độc lập vòng cuối và đạt **213 HTTP checks**, cùng SQL assertions, trên database PostgreSQL tạm riêng; database tạm được xóa sau chạy, không dùng dữ liệu nghiệp vụ hiện tại để thử ghi. Bổ sung kiểm tra quyền thu tiền CASH/BANK, ghi nhận trạng thái thiết bị và chính sách thông báo do QTV bật.
- Đã mở đủ **13 menu QTV và 8 menu LT** bằng đăng nhập thật; không có lỗi JavaScript hoặc HTTP bất ngờ sau các sửa lỗi tích hợp.
- Kiểm tra màn hình 1440px, 768px, 390px; ảnh chụp được kiểm tra trực quan, không chỉ đo chiều rộng trang. Lỗi bộ lọc thanh toán tablet đã được sửa; lượt chạy lại đủ 13 menu QTV và 8 menu LT ở ba kích thước, tổng 63 trường hợp màn hình, không còn tràn ngang trang.
- **24 assertions vận hành live**: tra cứu check-in/presence, field Khác ẩn/hiện/bắt buộc, modal co giãn và đóng khi điều hướng, tổng KPI/bảng, Excel bốn sheet, đổi kỳ, lỗi mạng/retry, phiếu thu và chi tiết đăng ký có thật, điều hướng task lịch PT.
- **12 kiểm tra bổ sung W12/W07**: prefill trạng thái đã lưu, kết nối readonly, catalog, payload/lỗi lưu, xóa IP tùy chọn, form tablet/mobile và readiness. Gồm 11 kiểm tra form/dữ liệu thật hoặc PUT bị chặn trước khi ghi, một kiểm tra response cô lập cho thiết bị có kết nối nhưng bị cấu hình Offline. Không giả lập telemetry trong frontend sản phẩm.
- Các worker kiểm tra bổ sung form hội viên/gói/chi nhánh, hợp đồng/thanh toán, scheduler, thông báo/consent/RBAC. Báo cáo từng nhóm phân biệt test API thật và test contract cô lập.
- `node --check` toàn bộ JavaScript web đạt; `git diff --check` không có lỗi whitespace. Các thay đổi tài liệu có sẵn của người dùng được giữ nguyên.
- Activity Diagram W09-US01 đã parse thành công bằng Mermaid; có nhánh gửi/không gửi và lưu thất bại rõ ràng.

## Giới Hạn Chưa Hoàn Tất

- **Chưa nghiệm thu 100% toàn hệ thống.** Adapter đối soát ngân hàng, camera/FaceID, cổng vật lý, kiosk telemetry và xóa dữ liệu sinh trắc trên thiết bị chưa được triển khai/kết nối với nhà cung cấp. Các điểm này trả trạng thái unavailable, không báo thành công giả. SMS thật cần cấu hình nhà cung cấp; local chỉ dùng OTP phát triển có nhãn rõ ràng.
- W07 cập nhật log bằng polling 15 giây khi xem hôm nay và refresh ngay sau thao tác tại quầy; chưa có luồng push từ thiết bị.
- Dữ liệu cũ có đăng ký thiếu `reg_code`, template thiếu metadata và event legacy; giao diện hiển thị `--` hoặc dữ liệu thực, không bịa mã hoặc sửa lịch sử. Bản ghi mới dùng contract chuẩn.
- Các mâu thuẫn tài liệu về ngày làm việc PT, pending payment, gán PT trực tiếp và Combo cũ được ghi riêng trong audit; không tự ý đổi quy tắc đã được viết ở US.
- Chưa kiểm thử với quy mô dữ liệu production, mọi tổ hợp quyền/concurrency hoặc hệ thống phần cứng thật. DevExtreme cần license phù hợp khi sử dụng thương mại.
- Chưa hồi quy toàn bộ Mobile. Backend thật từ chối demo token, hội viên tự xác nhận đã nhận tiền và kích hoạt thiếu mật khẩu; các màn Mobile từng dựa vào các shortcut cũ cần được chủ sở hữu tab tương ứng rà soát theo contract mới.

## Bảo Toàn Dữ Liệu

Không chạy reseed/reset database nghiệp vụ. Core worker chỉ sửa 13 mật khẩu seed khớp chính xác ID/SĐT/hash placeholder lỗi đã xác minh, có audit; không đổi mật khẩu tùy ý hoặc dữ liệu giao dịch. Hộp thư các tab đã đọc được tiêu thụ theo quy tắc mesh; context delta mới nằm trong `brain-anti1/web-rebuild-20260917/`.

Cập nhật đồng thời từ tab backend `c1565f83-1b41-4884-8904-6b6d76286806` báo đã dọn dữ liệu giao dịch phục vụ kiểm thử của họ. Các bằng chứng receipt/registration live phía trên được thu trước cập nhật đó; màn hình hiện tại phải phản ánh database hiện tại, không khôi phục hoặc tạo giao dịch mẫu trên frontend. Đợt rebuild này không thực hiện lần dọn dữ liệu đó.

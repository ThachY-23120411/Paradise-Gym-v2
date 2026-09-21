# UI / User Story audit - PT

Ngày 20/09/2026. Phạm vi audit tài liệu PT; không phải báo cáo runtime/E2E. Các màn hình dưới thuộc `/mobile/pt/`; định danh màn hình/US là canonical, không tạo route kỹ thuật mới.

| Màn hình / flow | Epic | User Story | Quy tắc đồng bộ |
| --- | --- | --- | --- |
| Lịch ngày | PT01 | PT01-US01 | Giờ thực tế API; Calendar; booking own scope, không năm ca cố định |
| Ghi kết quả | PT01 | PT01-US02 | Sau giờ kết thúc, xác nhận kép, booked sang used đúng một lần; không PT hủy |
| Đặt lịch hộ từ Lịch hoặc Tổng quan | PT01 | PT01-US03 | Chính PT/chi nhánh readonly; hội viên → hợp đồng; ngày/giờ nhập, thời lượng readonly, end tính; server kiểm tra mọi eligibility |
| Học viên / Đang phụ trách | PT02 | PT02-US01 | Own registrations kể cả SCHEDULED/FROZEN/EXPIRED để xem lịch sử; nhãn API; null end = Không giới hạn |
| Lộ trình học viên | PT02 | PT02-US02 | Cùng member/registration, giờ thực, số buổi API; không lộ tài chính |
| Lịch sử phân công | PT02 | PT02-US03 | Giữ ID/file legacy; chỉ đọc, không accept/reject; không xóa audit |
| Thông báo | PT03 | PT03-US01 | GET notifications; PUT read/read-all thành công mới đổi UI; await đích và scope; không synthetic/localStorage |
| Hồ sơ / preference / mật khẩu / popup Thiết bị | PT04 | PT04-US01 | Bio/specialties readonly; work_days API; registry own account còn hiệu lực; xác nhận thu hồi một/tất cả |
| Sửa hồ sơ | PT04 | PT04-US02 | Email 150, specialties 500, bio 1000; avatar provider có điều kiện; không chứng chỉ |
| Đăng nhập / 2FA | PT05 | PT05-US01 | Challenge backend, phân biệt OTP phát triển và SMS; không tuyên bố provider hoàn tất |
| Kích hoạt | PT05 | PT05-US02 | Hồ sơ staff tạo trước; OTP hợp lệ, không tự tạo PT; vào PT06 sau xác thực đầy đủ |
| Đăng xuất hiện tại | PT05 | PT05-US03 | logout-current; mạng lỗi chỉ xác nhận xóa phiên cục bộ |
| Tổng quan | PT06 | PT06-US01 | Đúng 4 KPI + Đặt lịch nhanh; không pending-assignment KPI |
| Hoa hồng (`view-commissions`) | PT06 | PT06-US02 | Tab riêng; own readonly; đổi kỳ/làm mới qua API; PENDING Chờ chi trả; tổng khớp chi tiết; PAID khóa lịch sử |

## Điều hướng dùng chung
Chỉ đặc tả ở cấp ứng dụng: footer gồm 5 mục Tổng quan (PT06-US01), Lịch (PT01), Học viên (PT02), Hoa hồng (PT06-US02), Tài khoản (PT04); nền xanh lá đồng bộ Header. Chuông mở PT03. PT05 ngoài footer. Không thêm layout dùng chung vào bảng field từng màn hình.

## Giới hạn và bàn giao
- Main triển khai UI/API song song; audit này xác nhận tài liệu, không xác nhận runtime.
- Không sửa US vai trò khác. Tham chiếu cũ từ Hội viên chọn PT hoặc PT duyệt không cấp lại quyền đã retired; cần owner các tài liệu đó đồng bộ khi còn tồn tại.
- Không tạo field DB, khôi phục chứng chỉ hay mở quyền PT hủy. Hạn chế provider và điểm cần quyết định xem [open questions](open-questions.md).
- Thông báo cơ sở mở dialog nội dung API chỉ đọc; không điều hướng Calendar với ID giả. Tiến độ học viên hiển thị booked cạnh used/total; remaining đã loại booked. Đổi mật khẩu tạo registry session mới cho thiết bị hiện tại, registry fail closed.
- Snapshot PAID đã được duyệt: tổng/chi tiết lần chi trả mới lưu nguyên tử và bất biến; legacy details_snapshot_available=false/sessions=[] hiện thiếu chi tiết lịch sử, không phải 0. Backend agent sở hữu migration/ERD; runtime acceptance do Main xác nhận, không còn blocker chờ phê duyệt.

## Đồng bộ nghiệp vụ thanh toán - 21/09/2026

| Màn hình / flow | Epic | User Story | Quy tắc đồng bộ |
| --- | --- | --- | --- |
| W08 QTV/LT: sổ thu và KPI | QTV-W08, LT-W08 | US01, US03 của mỗi Epic | payments thành công không status; 9 cột, hai KPI; bỏ bộ lọc/cột trạng thái và KPI đơn chờ |
| W08 QTV/LT: ghi nhận/đối soát | QTV-W08, LT-W08 | US02 của mỗi Epic | CASH thực nhận; QR ở payment_intents, 15 phút; BANK_TRANSFER đối soát có transaction_ref, mô phỏng kiểm thử được duyệt |
| W04 QTV/LT: tạo/gia hạn, danh sách/chi tiết | QTV-W04, LT-W04 | US01-US04 của mỗi Epic | Giữ trạng thái đăng ký chờ, tiếp tục thanh toán/hủy bất kỳ lúc nào còn chờ; không tự hủy theo hạn QR/3 ngày |
| W04 QTV/LT: đóng băng | QTV-W04, LT-W04 | US06 của mỗi Epic | Đã trả đủ và hiện ACTIVE/Sắp hết hạn; từ chối chưa trả/SCHEDULED |
| HV03 gói, VietQR, lịch sử | HV03 | HV03-US01, HV03-US03, HV03-US06 | Intent riêng, hủy đơn chờ có xác nhận; ledger cả CASH/BANK_TRANSFER; bảo lưu cùng điều kiện staff |
| Chỉ báo cận hạn W01/W14, W04, K01/HV05 | QTV/LT-W01, W14, W04, W07; HV05 | W01-US01, W14-US01, W04-US03, W07-US01, HV05-US01 | <= 4 ngày hoặc <= 3 buổi, Combo OR; giữ cohort đã hết hạn 14 ngày |
| Thẻ học viên PT | PT02 | PT02-US01 | reg.is_expiring / reg.display_status từ API; reg.status ACTIVE giữ nguyên; bỏ tính 7 ngày cục bộ |

Tài liệu nghiệp vụ, không phải xác nhận E2E/runtime. Kỳ đăng ký gốc đã hết khi thanh toán còn chờ quyết định PAY-OQ-01; không tự dời ngày. Schema/ERD, backend và UI do các owner tương ứng thực hiện.

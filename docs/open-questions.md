# Open Questions - PT (2026-09-20)

## Follow-up 2026-09-21
- User approved and implementation verified: HV group nonleader hides Cancel/Confirm; shared portal activates PT by phone with explicit role and real API preview. See reports/tab3-mobile-pt/2026-09-21-approved-cross-role-walkthrough.md.
- Footer now has five entries, including the approved standalone Hoa hồng screen; the four-entry decision below is historical.

## Quyết định đã chốt
- PT được đặt hộ hội viên có hợp đồng gán chính PT; không PT hủy. Thời gian động, không năm ca cố định.
- Phân công do Lễ tân/QTV; PT02-US03 giữ lịch sử chỉ đọc cùng file ID; không accept/reject hay KPI chờ phân công.
- 4 footer + chuông; 4 KPI + Đặt lịch nhanh; commissions own readonly, PENDING = Chờ chi trả, chi trả trực tiếp, PAID khóa lịch sử.
- Không khôi phục chứng chỉ đã gỡ migration 005. Bio/specialties và registry phiên dùng dữ liệu hiện có; không phát minh field DB.
- Hồ sơ work_days từ API, ALL_WEEK = Cả tuần; end_date null = Không giới hạn.

## Cần quyết định / xác nhận ngoài phạm vi tài liệu

| ID | Vấn đề | Xử lý trong tài liệu / người xử lý |
| --- | --- | --- |
| PT-OQ-01 | Chưa có bằng chứng cấu hình và nghiệm thu SMS/push production, delivery receipt; nhịp nhắc lịch thực tế phụ thuộc scheduler/config | Main/vận hành xác nhận provider và lịch gửi. DEVELOPMENT_ONLY không SMS; PROVIDER_ACCEPTED chưa xác nhận giao tin. Không tự thêm OTP/social login hoặc cam kết gửi nhắc 15–30 phút |
| PT-OQ-02 | Avatar hỗ trợ cloud hoặc lưu cục bộ; cần nghiệm thu nguồn lưu trữ triển khai thực tế | Không chặn chỉ vì thiếu cloud. Kiểm thử local không chứng minh cloud production; xác nhận ảnh tải lại được từ URL API và báo đúng trường hợp lưu một phần |
| PT-OQ-03 (đã chốt) | Đặt toàn bộ ACCEPTED gồm trưởng nhóm; người tham gia readonly | Từ chối cả booking nếu bất kỳ người nào inactive/không Gym hợp lệ ngày tập/freeze/sai chi nhánh/conflict. Giữ một buổi hợp đồng nhóm; snapshot người tham gia bất biến, không tự thêm người mới. Trưởng nhóm đại diện member xác nhận/hủy, thành viên khác chỉ xem lịch. Backend owner phụ trách snapshot/ERD; không cấp PT hủy |
| PT-OQ-04 (quyết định đã chốt) | Người dùng đã duyệt snapshot từng buổi PAID bất biến; không còn chờ phê duyệt | Backend agent triển khai migration/ERD và transaction chi trả lưu tổng/chi tiết nguyên tử. Legacy PAID thiếu snapshot: details_snapshot_available=false, sessions=[]; giữ tổng lịch sử, báo thiếu chi tiết, không coi là 0/tái dựng từ live. Main xác nhận triển khai/kiểm thử; PT docs không tự thiết kế schema |

## Khoảng cách triển khai cần Main xác minh
- Quyền POST booking own PT, lịch khả dụng động, holiday/workday/eligible period/freeze/remaining/concurrency và server không tin duration/end do client sửa phải khớp PT01-US03.
- API legacy accept/reject còn tồn tại không có nghĩa PT vẫn được cấp quyền theo quyết định mới; Main xác minh chặn thao tác cũ nhưng giữ lịch sử.
- Registry trả đúng own account, phiên còn hiệu lực; logout-all bao gồm phiên hiện tại. Thông báo hoàn toàn từ API, đợi read/read-all và deep link.
- Backend/UI đang được Main sửa song song; mục này là checklist bàn giao, không khẳng định code hiện còn lỗi và không thay thế E2E.
- Chỉ tham chiếu tối thiểu tài liệu vai trò khác; các US Hội viên/Web nếu còn mô tả chọn PT/duyệt cần owner tương ứng đồng bộ riêng.

## Thanh toán và cận hạn - Quyết định 21/09/2026
- Đã chốt: payments thành công không status; payment_intents QR hạn 15 phút; đăng ký còn chờ đến khi thanh toán/hủy chủ động, không tự hủy sau 3 ngày. Hủy chỉ trong phạm vi đơn còn chờ.
- Đã chốt: mô phỏng chuyển khoản để kiểm thử được chấp thuận; chưa cần IPN. Đối soát giữ BANK_TRANSFER, transaction_ref bắt buộc; không dùng CASH thay chuyển khoản.
- Đã chốt: is_expiring và display_status=EXPIRING từ API, status nội bộ ACTIVE giữ nguyên. <= 4 ngày hoặc <= 3 buổi; Combo OR. Không thêm field/enum DB cho chỉ báo UI.
- Đã chốt: mọi vai trò chỉ bảo lưu gói đã trả đủ và hiện đang hiệu lực ACTIVE/Sắp hết hạn; không bảo lưu gói chưa trả hoặc SCHEDULED chưa bắt đầu.

| ID | Câu hỏi còn mở | Giới hạn tài liệu / xử lý |
| --- | --- | --- |
| PAY-OQ-01 | Đăng ký chờ được thanh toán sau khi ngày kết thúc gốc đã qua: tính lại kỳ từ ngày thanh toán hay yêu cầu chọn ngày bắt đầu mới? | Chưa có câu trả lời. Hành vi hiện tại giữ ngày gốc và trả EXPIRED; không ngầm duyệt tự dời kỳ, không cam kết mọi khoản thu chuyển ACTIVE/SCHEDULED. Các luồng QR/ledger/hủy đơn chờ vẫn thực hiện độc lập; Main xác nhận chính sách và đồng bộ riêng khi có quyết định. |

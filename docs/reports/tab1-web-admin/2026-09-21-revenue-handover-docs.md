# W18 - Kế hoạch và bàn giao tài liệu nghiệp vụ (21/09/2026)

## Implementation Plan

- Phạm vi: business docs QTV-W18 tại `E:/Desktop/para`; Epic mới, US01-US03, chỉ mục QTV, Product Spec, screen mapping và changelog trung tâm.
- Đã đọc mesh anti-2/3/4: không có tin mới chưa đọc cho anti-1 lúc bắt đầu. Áp dụng `activity-diagram`, `ui-docs-sync`, `.agents/rules/docs-sync.md`.
- Ghi rõ quyền QTV + tài chính, chi nhánh cụ thể khi tạo mới, kỳ theo `confirmed_at` và múi giờ chi nhánh, đối chiếu tài khoản legacy có xác minh, fingerprint và lịch sử snapshot bất biến.
- Định nghĩa nhãn UI bằng bảng 6 cột; gửi hợp đồng nhãn cho worker chính, đối chiếu với code mới khi có. Không triển khai API/schema/UI, không chạy database dùng chung.
- Kiểm tra tĩnh liên kết, cấu trúc US, bảng 6 cột, ID sơ đồ toàn cục, arity và nhãn cạnh; ghi kết quả và giới hạn bàn giao ở cuối file.

## Walkthrough

Hoàn tất tài liệu nghiệp vụ W18; đã đọc code thực tế `frontend/web/js/modules/revenueHandovers.js`, `frontend/web/js/ui.js`, route W18 và backend `revenueHandovers.js` để đối chiếu nhãn/hành vi. Không sửa các file triển khai đó.

- US01: đúng bộ chỉ số Tổng tiền/Giao dịch/Chưa xác định, popup Tài khoản nhận tiền với ba trường BIN ngân hàng/Số tài khoản/Tên tài khoản, nút Thêm tài khoản. Phân loại inline bằng dropdown Tài khoản nhận tiền; allocation chỉ thuộc preview, chỉ lưu trong snapshot lúc xác nhận batch.
- US02: popup chỉ có tổng hợp, checkbox và ghi chú tối đa 1000 ký tự; không mô tả grid/chi nhánh/ngày/múi giờ không hiển thị. Token mới stale/concurrent bị từ chối; replay cùng token thành công trả batch gốc; handover_code canonical.
- US03: đã xác nhận code mới có cột Người xác nhận (`confirmed_by_name`) và metadata Chi nhánh/Người xác nhận trong popup rồi cập nhật field tables/Main Flow. Chi tiết đọc snapshot, không thêm sửa/xóa/mở lại.
- Registry W18 không đổi VietQR global config, không tự ghi tài khoản nhận vào payment cũ/mới. Legacy chưa kiểm chứng tiếp tục unresolved và bị chặn; câu hỏi người dùng chưa trả lời không được suy đoán.
- Chỉ bổ sung các mục W18 trong tài liệu dùng chung; không sửa nội dung W01-W17. Chỉ mục ghi phần tăng thêm +1 Epic/+3 US, không tự kiểm đếm lại các mục cũ.

## Files

1. [Epic QTV-W18](<../../epic/qtv/QTV-W18-Bàn giao & tất toán doanh thu.md>).
2. [QTV-W18-US01](<../../user-stories/qtv/QTV-W18-Bàn giao & tất toán doanh thu/QTV-W18-US01-Xem và đối chiếu nguồn thu chưa bàn giao.md>).
3. [QTV-W18-US02](<../../user-stories/qtv/QTV-W18-Bàn giao & tất toán doanh thu/QTV-W18-US02-Xác nhận bàn giao doanh thu.md>).
4. [QTV-W18-US03](<../../user-stories/qtv/QTV-W18-Bàn giao & tất toán doanh thu/QTV-W18-US03-Tra cứu lịch sử bàn giao.md>).
5. [Epic QTV README](../../epic/qtv/README.md).
6. [User Story QTV README](../../user-stories/qtv/README.md).
7. [Product Spec - mục W18 mới](../../product-spec.md#w18---bàn-giao--tất-toán-doanh-thu-21092026).
8. [Screen mapping - W18](../../ui-related-screen-audit.md#w18---bàn-giao--tất-toán-doanh-thu).
9. [Changelog trung tâm - W18](../../menu-and-user-stories-changes.md).
10. Báo cáo kế hoạch/bàn giao này: `docs/reports/tab1-web-admin/2026-09-21-revenue-handover-docs.md`.

Mesh: `brain-anti1/w18-business-docs/implementation_plan.md`, `brain-anti1/w18-business-docs/task_done.md`.

## Validation sau khi chốt US03

| Kiểm tra | Kết quả |
| --- | --- |
| `node tests/docs/payment-diagrams.cjs <3 đường dẫn US W18 tương đối từ repo>` | PASS: 5 diagrams / 104 nodes / 99 edges; 3 namespace regression checks. Action 1-in/1-out, decision có nhãn, final kết thúc; boundary không trùng node |
| `node tests/docs/payment-render.cjs <3 đường dẫn US W18 tương đối từ repo>` | PASS: Mermaid 11.4.1 render đủ 5 sơ đồ với SVG geometry khác rỗng; số node từng sơ đồ 23, 15, 20, 25, 21 |
| Kiểm tra cấu trúc US và field tables bằng Node đọc file | PASS: 3 US đủ Main/Alternate/Exception/Activity; không Result/metadata trong Preconditions; 6 bảng, 82 dòng, mỗi dòng đúng 6 cột; CONDITIONAL có required=conditional và điều kiện hiện/ẩn |
| Kiểm tra namespace xuyên cả 5 sơ đồ | PASS: 119 ID duy nhất tính cả boundary/swimlane; không trùng ID |
| Kiểm tra liên kết cục bộ trong phần W18 | PASS: 33 liên kết đến file tồn tại; không tuyên bố audit link cũ ngoài phạm vi |
| `git diff --check` trên tài liệu thuộc nhiệm vụ | PASS; chỉ cảnh báo chuẩn hóa LF/CRLF của Git, không lỗi whitespace |

Lần gọi CLI đầu truyền absolute paths bị ENOENT vì runner ghép repo root; đã chạy lại bằng relative paths và PASS như trên. Một lần kiểm tra Node qua PowerShell bị chuyển mã Unicode; đã dùng script ASCII đọc nội dung UTF-8 và chạy lại PASS. Đây là lỗi lệnh kiểm tra đã khắc phục, không phải lỗi sơ đồ.

## Giới hạn và bàn giao

- Đây là kiểm tra tài liệu, nhãn/control từ source và render Mermaid, **không phải audit đầy đủ layout hoặc E2E**. Không mở/chạy/seed/reset database dùng chung; không sửa ERD/backend/frontend/tests.
- Main thông báo backend đạt 42 HTTP/DB checks và phiên E2E mới nhất đạt 43 PASS cho 3 US. Đây là kết quả Main cung cấp, không phải các lượt test do docs worker thực thi; hồ sơ/bằng chứng runtime do worker E2E quản lý.
- Điểm đã báo Main: UI đọc hôm nay bằng `W().dateKey(new Date())` và hiển thị giờ bằng `toLocaleString('vi-VN')`, tức timezone trình duyệt; backend lọc theo timezone chi nhánh/batch. Yêu cầu nghiệp vụ vẫn là timezone chi nhánh. Chưa có bằng chứng tại lượt kiểm tra tài liệu này cho trường hợp trình duyệt khác timezone chi nhánh; Main phụ trách xác minh/điều chỉnh triển khai, không tự đổi quy tắc nghiệp vụ.
- Câu hỏi legacy vẫn mở: tiếp tục chặn khoản chưa kiểm chứng; Main sẽ chuyển quyết định người dùng nếu có. Không giả định tự phân bổ hoặc bỏ qua khoản chưa xác định.

### Main follow-up

Timezone finding resolved in W18 frontend: today comes from the selected branch timezone via API; date-only strings retain their calendar date; timestamps use branch/batch timezone, including ALL detail. ALL history defaults to empty date bounds. Final UI run 2026-09-21T14-26-27-424Z includes America/Los_Angeles browser versus Asia/Ho_Chi_Minh branch checks. Main added receipt-inconsistency exception/diagram label to US01 and updated US03 defaults. Revalidated all5diagrams/104nodes/99edges and Mermaid rendering. Main API/database checks now50PASS; finalUI49stepsPASS. See the implementation walkthrough for evidence and integration limits.

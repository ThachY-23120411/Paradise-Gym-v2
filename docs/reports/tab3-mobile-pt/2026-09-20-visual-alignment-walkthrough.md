# Đồng nhất giao diện PT và rà soát hệ thống

Ngày: 20/09/2026. Workspace thực hiện: `E:/Desktop/para`.

## Phạm vi

Chỉ thay đổi source giao diện trong `frontend/mobile/pt/`. Không sửa QTV, LT, HV, shared SDK, backend, database, Main Flow hoặc Activity Diagram. Các báo cáo và ảnh kiểm tra là tài liệu bổ sung, không phải thay đổi đặc tả nghiệp vụ.

Đã đọc ba thư mục lịch sử Antigravity được cung cấp, các quyết định/handoff liên quan, quy tắc và skill của repo, cùng toàn bộ ba trang PDF `ghi chú a Cường (1).pdf`. Quyết định mới được duyệt trong lịch sử được ưu tiên khi khác bản PDF cũ.

## Thay đổi PT

- Nền sáng, màu thương hiệu xanh forest, font Be Vietnam Pro, viền và trạng thái đồng nhất với hệ thống hiện tại.
- Bỏ khung điện thoại giả lập, bố cục thích ứng mobile/tablet/desktop; bốn tab chính, thông báo qua chuông trên header.
- Chuẩn hóa Tổng quan, Lịch, Học viên, Tài khoản, thông báo và popup DevExtreme.
- Bổ sung CSS đúng với markup thực của danh sách học viên và màn lộ trình, thay cho các selector cũ không khớp.
- Sửa cấu trúc HTML khiến bảng kê hoa hồng nằm bên trong popup hồ sơ bị ẩn; không thay đổi API hoặc phép tính hoa hồng.
- Sửa avatar dự phòng xuất hiện cùng ảnh thật; tăng độ rõ của input, nút, trạng thái chọn và thông báo validation trên popup.
- Hỗ trợ bàn phím cho thẻ học viên/KPI, nhãn nút quay lại/đóng, Escape đóng bảng kê; giữ dữ liệu từ API, không thêm mock data.

Các file source được sửa: `index.html`, `css/app.css`, `js/clients.js`, `js/overview.js`, `js/profile.js`, `js/schedule.js`, `js/notifications.js`.

## Kiểm tra

- `node --check` đạt cho cả năm file JavaScript chỉnh sửa; `git diff --check -- frontend/mobile/pt` không có lỗi whitespace.
- Playwright dùng tài khoản PT ACTIVE và PostgreSQL hiện có, không seed/migrate, không gửi thao tác ghi dữ liệu.
- Viewport 375, 390, 412, 768 và 1440px; màn chính, lịch mở rộng, chi tiết học viên, tìm kiếm rỗng, yêu cầu phân công, hồ sơ, đổi mật khẩu, xác nhận đăng xuất rồi hủy, thông báo, bảng kê và chọn tháng khác.
- Tách bước nhập email sai và bước submit; kiểm tra toast validation. Chặn request thống kê để kiểm tra lỗi kết nối rồi khôi phục API và bấm Thử lại.
- Kết quả cuối và ảnh được lưu ở [JSON PT](../../../tests/e2e/pt/visual-20260920-results.json), cùng các thư mục `tests/e2e/pt/<US-ID>/visual-20260920/`.
- Lượt PT cuối hoàn tất 35 ảnh: không lỗi JavaScript, không API HTTP >=400, không tràn ngang, không có request mutation. Lỗi mạng ở bước kiểm tra ngoại lệ là ngắt request chủ động, không phải phản hồi giả.
- Đây là visual smoke/kiểm tra tương tác không ghi dữ liệu, không phải chứng nhận toàn bộ User Story đạt E2E. Không xác nhận lưu hồ sơ, thanh toán, chốt buổi tập, phân quyền hay đồng bộ sau mutation.
- QTV/LT/HV có 35 ảnh chỉ đọc: 17 menu QTV và hai tab báo cáo bổ sung, 10 menu LT, sáu màn HV. Không thấy lỗi JavaScript hoặc API HTTP >=400 trong lượt mở màn; QTV có tràn ngang ở 1440px, giữ nguyên theo phạm vi chỉ đọc.
- Đối chiếu SHA256 của 98 file Web/HV/shared/backend trước và sau: không thay đổi, không mất file.
- Giới hạn chỉ đọc: browser không submit dữ liệu, nhưng GET registrations của backend hiện có tự xử lý lịch freeze. Không có snapshot DB trước/sau nên không khẳng định dữ liệu DB tuyệt đối bất biến; kết quả SHA256 chỉ chứng minh source được bảo vệ không đổi.

## Nghiệp vụ còn lệch, chưa sửa

1. PT vẫn có lịch năm khung cố định và nhãn T2-T6, trong khi QTV/HV đã chuyển sang giờ và thời lượng động. `schedule.js` khớp booking theo giờ bắt đầu cố định, nên lịch 09:30 có nguy cơ không hiện và ca 10:00-11:30 bị gắn nhãn slot 10:00-12:00. Đây là kết luận từ code, chưa phải test tạo ca mới. Hồ sơ API có lịch làm việc khác. Không sửa logic này trong phạm vi CSS/UI.
2. Yêu cầu phân công vẫn hiện trong PT, trong khi quyết định mới chuyển việc gán PT về nhân viên. Cần thống nhất phạm vi giữ lịch sử/yêu cầu cũ trước khi bỏ luồng.
3. Dữ liệu bảng kê tháng hiện kiểm tra có summary sáu buổi nhưng danh sách chi tiết bảy ca. UI hiển thị dữ liệu nhận được; chưa sửa hay tính đè để che lệch này.
4. Nhãn hoa hồng còn “Chờ duyệt” dù lịch sử mới chọn chi trả trực tiếp. Cần đồng bộ ý nghĩa trạng thái giữa API, tài liệu và các role.
5. PT03-US01 còn mô tả lối vào thông báo trên footer, trong khi README PT mô tả bốn tab chính và chuông header. Bản giao diện theo cấu trúc bốn tab; Main Flow/Activity Diagram chưa được sửa.
6. Gói không có ngày hết hạn vẫn có thể hiện “Chưa cập nhật” tại PT. Cần thống nhất cách diễn giải `end_date = null` theo loại gói, không tự đoán dữ liệu.

## Bàn giao

- Trải nghiệm PT: http://localhost:3000/mobile/pt/
- [Đánh giá QTV/LT/HV và W10](../tab1-web-admin/2026-09-20-readonly-audit.md).
- Backend chạy ở `127.0.0.1:5000`; frontend ở `127.0.0.1:3000`. Phiên kiểm tra khởi động backend với `NODE_ENV=test` để không chạy background jobs. Không đổi `.env` của dự án.
- Không commit hoặc reset các thay đổi có sẵn trong worktree.

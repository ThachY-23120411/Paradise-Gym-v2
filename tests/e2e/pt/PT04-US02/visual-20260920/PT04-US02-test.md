# PT04-US02 - PT Visual Smoke

Ngày: 20/09/2026. Role PT, dữ liệu PostgreSQL hiện có. Chỉ kiểm tra giao diện/tương tác không ghi dữ liệu, không phải toàn bộ US.
Nguồn: [US](<E:/Desktop/para/docs/user-stories/pt/PT04-Tài khoản/PT04-US02-Cập nhật hồ sơ cá nhân PT.md>), [kế hoạch](<E:/Desktop/para/docs/reports/tab3-mobile-pt/2026-09-20-visual-alignment-implementation-plan.md>).

## Source Action Verification

### Step 1: step-01-edit-profile-dialog

Action/Input: Popup hồ sơ có trường readonly và editable.
Expected: Popup hồ sơ có trường readonly và editable. Kỳ vọng chỉ thuộc phạm vi visual smoke, không thay thế AC chưa chạy.
Actual: phần tử mục tiêu hiện trên DOM; viewport 390 x 844px; document rộng 390px. 
Result: PASS trong phạm vi kiểm tra trên.

![step-01-edit-profile-dialog](step-01-edit-profile-dialog.png)

### Step 2: step-02-invalid-email-input

Action/Input: Input hiển thị email sai trước khi submit.
Expected: Input hiển thị email sai trước khi submit. Kỳ vọng chỉ thuộc phạm vi visual smoke, không thay thế AC chưa chạy.
Actual: phần tử mục tiêu hiện trên DOM; viewport 390 x 844px; document rộng 390px. 
Result: PASS trong phạm vi kiểm tra trên.

![step-02-invalid-email-input](step-02-invalid-email-input.png)

### Step 3: step-03-email-validation

Action/Input: Submit email sai hiện thông báo validation; không gửi request lưu.
Expected: Submit email sai hiện thông báo validation; không gửi request lưu. Kỳ vọng chỉ thuộc phạm vi visual smoke, không thay thế AC chưa chạy.
Actual: phần tử mục tiêu hiện trên DOM; viewport 390 x 844px; document rộng 390px. Toast Email liên hệ không hợp lệ hiển thị trên popup; không phát sinh request ghi dữ liệu.
Result: PASS trong phạm vi kiểm tra trên.

![step-03-email-validation](step-03-email-validation.png)

### Step 4: responsive-375-edit-profile

Action/Input: Mở màn/popup tại 375 x 667px.
Expected: Nội dung vẫn hiển thị, không tràn ngang tại viewport kiểm tra. Kỳ vọng chỉ thuộc phạm vi visual smoke, không thay thế AC chưa chạy.
Actual: phần tử mục tiêu hiện trên DOM; viewport 375 x 667px; document rộng 375px. 
Result: PASS trong phạm vi kiểm tra trên.

![responsive-375-edit-profile](responsive-375-edit-profile.png)

## State Verification

Không seed/migrate. API nghiệp vụ vẫn đọc dữ liệu thật. Browser chặn request mutation; lượt cuối ghi nhận 0 request mutation. 0 lỗi JavaScript, 0 API HTTP >=400. Riêng PT06 chủ động ngắt một request thống kê để thử lỗi mạng, sau đó khôi phục.

## Cross-Role / Downstream Verification

Không áp dụng: không tạo/sửa trạng thái nghiệp vụ. QTV/LT/HV chỉ được kiểm tra độc lập, không được coi là bằng chứng downstream của một mutation.

## Issues Found

- Các lệch nghiệp vụ còn giữ nguyên được liệt kê trong [walkthrough](<E:/Desktop/para/docs/reports/tab3-mobile-pt/2026-09-20-visual-alignment-walkthrough.md>).
- Chưa kiểm thử ghi dữ liệu, toàn bộ nhánh nghiệp vụ, xác nhận kép, phân quyền đa chi nhánh hoặc thiết bị vật lý.
- Các lượt chạy nháp bị gián đoạn do selector popup đang đóng và toast chuyển động; lượt cuối đã dùng selector nội dung riêng và chờ đúng trạng thái. Không dùng lượt nháp để báo PASS.

## Final Result

Visual smoke PASS trong phạm vi các bước trên; toàn bộ US: PARTIAL / NOT FULLY TESTED. [Kết quả máy đọc](../../visual-20260920-results.json).


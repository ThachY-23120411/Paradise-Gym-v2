# PT02-US01 - PT Visual Smoke

Ngày: 20/09/2026. Role PT, dữ liệu PostgreSQL hiện có. Chỉ kiểm tra giao diện/tương tác không ghi dữ liệu, không phải toàn bộ US.
Nguồn: [US](<E:/Desktop/para/docs/user-stories/pt/PT02-Học viên/PT02-US01-Xem danh sách học viên được phân công.md>), [kế hoạch](<E:/Desktop/para/docs/reports/tab3-mobile-pt/2026-09-20-visual-alignment-implementation-plan.md>).

## Source Action Verification

### Step 1: step-01-clients-mobile

Action/Input: Danh sách học viên và gói được phân công hiển thị.
Expected: Danh sách học viên và gói được phân công hiển thị. Kỳ vọng chỉ thuộc phạm vi visual smoke, không thay thế AC chưa chạy.
Actual: phần tử mục tiêu hiện trên DOM; viewport 390 x 844px; document rộng 390px. 
Result: PASS trong phạm vi kiểm tra trên.

![step-01-clients-mobile](step-01-clients-mobile.png)

### Step 2: step-02-empty-search

Action/Input: Từ khóa không khớp hiển thị trạng thái rỗng.
Expected: Từ khóa không khớp hiển thị trạng thái rỗng. Kỳ vọng chỉ thuộc phạm vi visual smoke, không thay thế AC chưa chạy.
Actual: phần tử mục tiêu hiện trên DOM; viewport 390 x 844px; document rộng 390px. 
Result: PASS trong phạm vi kiểm tra trên.

![step-02-empty-search](step-02-empty-search.png)

### Step 3: responsive-375-members

Action/Input: Mở màn/popup tại 375 x 667px.
Expected: Nội dung vẫn hiển thị, không tràn ngang tại viewport kiểm tra. Kỳ vọng chỉ thuộc phạm vi visual smoke, không thay thế AC chưa chạy.
Actual: phần tử mục tiêu hiện trên DOM; viewport 375 x 667px; document rộng 375px. 
Result: PASS trong phạm vi kiểm tra trên.

![responsive-375-members](responsive-375-members.png)

### Step 4: responsive-412-members

Action/Input: Mở màn/popup tại 412 x 915px.
Expected: Nội dung vẫn hiển thị, không tràn ngang tại viewport kiểm tra. Kỳ vọng chỉ thuộc phạm vi visual smoke, không thay thế AC chưa chạy.
Actual: phần tử mục tiêu hiện trên DOM; viewport 412 x 915px; document rộng 412px. 
Result: PASS trong phạm vi kiểm tra trên.

![responsive-412-members](responsive-412-members.png)

### Step 5: responsive-768-members

Action/Input: Mở màn/popup tại 768 x 1024px.
Expected: Nội dung vẫn hiển thị, không tràn ngang tại viewport kiểm tra. Kỳ vọng chỉ thuộc phạm vi visual smoke, không thay thế AC chưa chạy.
Actual: phần tử mục tiêu hiện trên DOM; viewport 768 x 1024px; document rộng 768px. 
Result: PASS trong phạm vi kiểm tra trên.

![responsive-768-members](responsive-768-members.png)

### Step 6: responsive-1440-members

Action/Input: Mở màn/popup tại 1440 x 1000px.
Expected: Nội dung vẫn hiển thị, không tràn ngang tại viewport kiểm tra. Kỳ vọng chỉ thuộc phạm vi visual smoke, không thay thế AC chưa chạy.
Actual: phần tử mục tiêu hiện trên DOM; viewport 1440 x 1000px; document rộng 1440px. 
Result: PASS trong phạm vi kiểm tra trên.

![responsive-1440-members](responsive-1440-members.png)

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


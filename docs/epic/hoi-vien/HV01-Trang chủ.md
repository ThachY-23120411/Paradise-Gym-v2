# HV01 — Trang chủ

- **Role:** Hội viên
- **Platform:** Mobile only
- **Menu:** `HV01 · Trang chủ` (Footer tab 1)
- **Goal:** Cung cấp bảng thông tin tổng quan (dashboard) cá nhân hóa cho Hội viên ngay khi đăng nhập, giúp hội viên nhanh chóng nắm bắt các việc cần xử lý (yêu cầu PT đang chờ), theo dõi lịch tập sắp diễn ra gần nhất và cung cấp các lối tắt (quick actions) để điều hướng tức thì tới chức năng Đặt lịch hoặc Mua/Quản lý gói tập.
- **Scope:** 
  - Hiển thị thông điệp chào đón kèm họ tên hội viên hiện hành.
  - Thẻ trạng thái việc cần xử lý (Action Card): Cảnh báo khi có yêu cầu chọn PT đang chờ duyệt hoặc thông báo trạng thái rảnh rỗi.
  - Thẻ theo dõi lịch tập sắp tới (Upcoming Session Card): Hiển thị buổi học gần nhất (ngày giờ, HLV phụ trách, gói tập) và nút tắt xem toàn bộ lịch tập.
  - Thẻ thao tác nhanh (Quick Actions Card): Các nút tắt điều hướng nhanh tới `Mua gói` hoặc `Gói của tôi` tại `HV03`.
  - Giữ nguyên tắc chỉ đọc dữ liệu tổng hợp và điều hướng; không thực hiện chỉnh sửa nghiệp vụ, đặt lịch hay thanh toán trực tiếp trên màn hình Trang chủ.

## Thành phần giao diện (UI Components & Layout)

Giao diện **`HV01 · Trang chủ`** được thiết kế dạng thẻ (Cards) xếp dọc theo luồng ưu tiên:

1. **Khối Lời chào & Định hướng (Greeting Card):**
   - Lời chào cá nhân hóa theo họ tên Hội viên đang đăng nhập.
   - Tiêu đề câu hỏi tương tác (*"Hôm nay bạn muốn làm gì?"*) và dòng mô tả định hướng chức năng.

2. **Khối Trạng thái việc cần xử lý (Action / Warning Card):**
   - Tự động thay đổi phong cách dựa theo dữ liệu thực tế của Hội viên:
     - **Trạng thái có việc cần xử lý (Accent Amber):** Hiển thị khi Hội viên có yêu cầu chọn PT đang chờ phản hồi (`PENDING`), nêu rõ tên HLV đang duyệt kèm nút `[ Xem yêu cầu PT ]`.
     - **Trạng thái bình thường (Accent Green):** Hiển thị icon tích xanh kèm thông báo không có việc tồn đọng và gợi ý tập luyện.

3. **Khối Lịch sắp tới (Upcoming Session Card):**
   - Hiển thị buổi tập gần nhất sắp diễn ra (Ngày, Giờ tập, HLV phụ trách, Tên gói tập).
   - Hiển thị trạng thái rỗng (*"Chưa có lịch sắp tới"*) nếu Hội viên chưa đặt ca tập nào.
   - Nút hành động dạng khối `[ Xem lịch của tôi ]` điều hướng sang `HV02 · Lịch tập`.

4. **Khối Thao tác nhanh - Quản lý gói tập (Quick Action Card):**
   - Giới thiệu chức năng quản lý gói tập, tiến độ và HLV.
   - Lưới 2 nút hành động nhanh: Nút chính `[ Mua gói ]` và nút phụ `[ Gói của tôi ]` điều hướng sang các sub-tab tương ứng tại `HV03`.

---

## Danh sách User Stories và Giao diện tương ứng trong Epic

| User Story | Phân loại giao diện | Thành phần giao diện tương ứng | Phạm vi đặc tả UI |
| :--- | :--- | :--- | :--- |
| [HV01-US01 — Xem tổng quan và thao tác nhanh](../../user-stories/hoi-vien/HV01-Trang%20chủ/HV01-US01-Xem%20tổng%20quan%20và%20thao%20tác%20nhanh.md) | Màn hình Dashboard chính | **Màn hình `HV01 · Trang chủ`** | Bảng Field-level spec màn hình Trang chủ: Lời chào, Thẻ trạng thái việc cần xử lý, Nút Xem yêu cầu PT, Thẻ Lịch sắp tới, Nút Xem lịch của tôi, Thẻ Thao tác nhanh, Nút Mua gói và Nút Gói của tôi |

---

## Flow specification

User Story của `HV01` chứa precondition, trigger, main flow, alternate flow, exception flow, field-level specification chuẩn 5 cột và activity diagram Mermaid swimlane.
Flow index role: [`docs/system-flow-specs/hoi-vien/`](../../system-flow-specs/hoi-vien/README.md).

## Traceability

- Menu catalog: [`docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).\n
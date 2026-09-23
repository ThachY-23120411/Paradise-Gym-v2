# Báo Cáo Bàn Giao: Cập Nhật Bộ Lọc Trạng Thái, Bỏ Tab Trang Chủ & Hiển Thị Tiến Độ Học Tập Gói PT/Combo

- **Phân hệ**: Web Admin (QTV / Lễ tân) — Quản lý Hội viên (`frontend/web/js/modules/members.js`)
- **Ngày thực hiện**: 2026-09-22
- **Tác giả**: anti-1-QTV-LT (Web Admin Lead)
- **Trạng thái**: ✅ Đã hoàn thành và kiểm chứng tự động bằng Puppeteer

---

## 1. Yêu Cầu Người Dùng Đã Giải Quyết

1. **Bỏ tab "Trang chủ" & Mặc định vào tab "Gói của tôi"**:
   - Loại bỏ tab "Trang chủ" khỏi sidebar của popup Hồ sơ hội viên.
   - Khi mở popup Hồ sơ hội viên, hệ thống mặc định hạ cánh (default landing) vào tab **"Gói của tôi"** (`packages`).
   - Các tabs còn lại: `Gói của tôi` (`packages`), `Lịch tập` (`schedule`), `Thanh toán` (`payments`), `Tài khoản` (`account`).

2. **Xem Tiến Độ Học Tập Trong Gói PT/Combo Của Học Viên**:
   - Trong bảng **Gói đã đăng ký**:
     * Bổ sung cột **Tiến độ học tập**: Hiển thị số buổi hoàn thành trên tổng số buổi (`used/total buổi (pct%)`), số buổi còn lại và thanh tiến độ màu xanh Forest Green (`#237b58`).
     * Bổ sung cột **Lộ trình**: Nút bấm `[Tiến độ]` có icon `fa-solid fa-route`.
     * Cột tiến độ và lộ trình được đặt ngay sau cột Trạng thái, giúp người dùng nắm bắt tiến độ ngay mà không cần cuộn ngang.
   - Mở rộng dòng chi tiết (**MasterDetail**):
     * Khi bấm mở rộng dòng gói PT, hiển thị thẻ tiến độ học tập tóm tắt kèm thanh tiến độ và nút bấm *"Xem chi tiết lộ trình buổi học"*.
   - **Modal Lộ Trình Chi Tiết (`openRoadmapModal`)**:
     * Hiển thị thanh tiến độ tổng thể, số buổi đã hoàn thành, số buổi đang đặt lịch, số buổi còn lại.
     * Hiển thị danh sách timeline các buổi tập theo thứ tự thời gian (`Buổi 1`, `Buổi 2`, ...), huấn luyện viên phụ trách, ghi chú nội dung buổi tập và đánh giá thể lực từ HLV.

3. **Bổ Sung Bộ Lọc Đầy Đủ Trạng Thái Gói Tập Trong Tab "Gói của tôi"**:
   - Dropdown filter "Trạng thái" hiển thị đầy đủ 7 trạng thái chuẩn của gói tập:
     1. `Đang hiệu lực` (`ACTIVE`)
     2. `Chờ thanh toán` (`PENDING_PAYMENT`)
     3. `Chưa tới thời gian hiệu lực` (`SCHEDULED`)
     4. `Đang đóng băng` (`FROZEN`)
     5. `Sắp hết hạn` (`EXPIRING`)
     6. `Đã hủy` (`CANCELLED`)
     7. `Đã hết hạn` (`EXPIRED`)

4. **Bổ Sung Bộ Lọc Đầy Đủ Trạng Thái Buổi Học Trong Tab "Lịch tập" (PT)**:
   - Dropdown filter "Trạng thái" trong subtab PT hiển thị đầy đủ 4 trạng thái buổi học:
     1. `Hoàn thành` (`COMPLETED`)
     2. `Đã đặt lịch` (`BOOKED`, `CONFIRMED`)
     3. `Chờ xác nhận` (`PENDING`, `PENDING_CONFIRMATION`, `PENDING_COMPLETION`)
     4. `Đã hủy` (`CANCELLED`)

---

## 2. Các Thay Đổi Kỹ Thuật

- **File cập nhật**: `frontend/web/js/modules/members.js`
  - Đảm bảo khai báo `const $ = window.jQuery || window.$;` ở đầu module.
  - Sửa hàm `detailGrid` trả về instance DevExtreme DataGrid (`dxDataGrid('instance')`).
  - Nâng cấp `registrationColumns` với 2 cột mới: `Tiến độ học tập` và `Lộ trình` (nút `[Tiến độ]`).
  - Xây dựng modal `openRoadmapModal(reg)` truy xuất danh sách `pt-bookings` theo `registration_id`, tính toán tiến độ và hiển thị timeline buổi tập.
  - Tích hợp inline progress card vào `masterDetail` của gói PT/Combo.
  - Cấu hình danh sách đầy đủ các trạng thái và matcher cho dropdown filter "Trạng thái" ở cả 2 tab `packages` và `schedule`.

---

## 3. Bằng Chứng Kiểm Chứng Bằng Puppeteer (UI Screenshots)

1. **Hạ cánh mặc định tại "Gói của tôi" (Bỏ tab "Trang chủ") & Cột Tiến độ học tập**:
   - Screenshot: `verify_profile_landing_packages_progress.png`
   - Kiểm chứng: Sidebar chỉ còn 4 tabs, tab `Gói của tôi` đang active mặc định. Cột `Tiến độ học tập` và `Lộ trình` hiển thị rõ ràng.

2. **Dropdown bộ lọc trạng thái đầy đủ 7 trạng thái gói**:
   - Screenshot: `verify_packages_filter_full_statuses.png`
   - Kiểm chứng: Hiển thị đầy đủ Đang hiệu lực, Chờ thanh toán, Chưa tới thời gian hiệu lực, Đang đóng băng, Sắp hết hạn, Đã hủy, Đã hết hạn.

3. **MasterDetail mở rộng dòng gói PT hiển thị thẻ tiến độ**:
   - Screenshot: `verify_package_master_detail_progress.png`
   - Kiểm chứng: Thẻ tóm tắt tiến độ PT kèm thanh tiến độ, số buổi đã dùng, đã đặt, còn lại.

4. **Modal chi tiết lộ trình học tập**:
   - Screenshot: `verify_roadmap_modal_progress.png`
   - Kiểm chứng: Header hiển thị tiến độ hoàn thành (ví dụ 6/12 buổi - 50%), danh sách từng buổi tập kèm ngày giờ, HLV, bài tập và đánh giá thể lực.

5. **Dropdown bộ lọc trạng thái buổi tập trong tab Lịch tập (PT)**:
   - Screenshot: `verify_schedule_filter_full_statuses.png`
   - Kiểm chứng: Hiển thị đầy đủ Hoàn thành, Đã đặt lịch, Chờ xác nhận, Đã hủy.

# Báo Cáo Bàn Giao: Bổ Sung Tab "Lớp Tập CĐ Phụ Trách" Vào Menu Gói Phụ Trách (Mobile PT)

**Ngày hoàn tất:** 22/09/2026  
**Người thực hiện:** anti-3-PT (Mobile PT Lead)  
**Phạm vi:** `frontend/mobile/pt/js/clients.js`, Menu "Gói phụ trách" (Clients)

---

## 1. Yêu Cầu & Bối Cảnh Thực Hiện

Người dùng yêu cầu bổ sung vào menu **Gói phụ trách** thêm 1 tab: **"Lớp tập CĐ phụ trách"**.
- Khi bấm vào 1 lớp trong danh sách sẽ hiển thị popup modal gồm:
  1. **Thông tin lớp học**: Tên lớp, bộ môn, ngày giờ, chi nhánh, sĩ số đăng ký (`enrolled_slots / max_slots`), thù lao ca dạy (Cơ bản + Thưởng sĩ số).
  2. **Danh sách thành viên tham gia**: Sắp xếp theo thứ tự đăng ký, hiển thị STT, Họ tên, Mã hội viên, Số điện thoại.
- Menu Gói phụ trách từ 2 sub-tabs (`Học viên phụ trách` và `Gói đang phụ trách`) nay nâng cấp thành **3 Sub-tabs chuẩn hóa**:
  1. `Học viên phụ trách (3)`
  2. `Gói đang phụ trách (9)`
  3. `Lớp tập CĐ phụ trách (11)`
- Đảm bảo 100% dữ liệu động lấy từ backend API (`GET /community-classes?instructor_id=${currentPtId}`), không mock dữ liệu tĩnh.

---

## 2. Chi Tiết Thực Hiện Mã Nguồn (`frontend/mobile/pt/js/clients.js`)

1. **Quản Lý Trạng Thái (ClientsState)**:
   - Bổ sung `communityClasses: []` vào state.
   - Thêm helper hàm tiền tệ `formatVnd(val)`.
2. **Nạp Dữ Liệu Động Song Song (`fetchClientsData`)**:
   - Gọi đồng thời `GET /registrations?assigned_pt_id=${currentPtId}` và `GET /community-classes?instructor_id=${currentPtId}` qua `apiClient`.
   - Lưu trữ danh sách 11 lớp học cộng đồng thực tế từ PostgreSQL vào `ClientsState.communityClasses`.
3. **Bố Cục 3 Sub-tabs Cân Đối**:
   - Bổ sung tab button thứ 3: `#tabBtnCommunityClasses` (`Lớp tập CĐ phụ trách`).
   - Tận dụng quy tắc CSS grid có sẵn trong `app.css` (`body .pt-clients-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }`), chia đều 3 cột đẹp mắt, không bị lệch giao diện.
4. **Render Danh Sách Lớp Cộng Đồng Phụ Trách (`renderAssignedCommunityClassesList`)**:
   - Mỗi thẻ lớp mang phong cách Purple Clean:
     * Badge bộ môn & trạng thái (Hôm nay / Sắp diễn ra / Đã kết thúc).
     * Mức thù lao dự kiến cho ca dạy (`+270.000 đ`, `+330.000 đ`,...).
     * Tên lớp học, khung giờ & ngày học, tên chi nhánh.
     * Thanh tiến độ sĩ số đăng ký trực quan kèm tỷ lệ lấp đầy (`15/30 HV (50%)`).
     * Cơ cấu thù lao (Cơ bản + Thưởng sĩ số).
     * Nút thao tác nhanh `[Xem danh sách hội viên]`.
5. **Tương Tác Realtime & Modal Toàn Cục**:
   - Tìm kiếm realtime trong tab: Hỗ trợ tìm theo tên lớp, bộ môn, chi nhánh, ngày học. Tự động chuyển placeholder: `"Tìm lớp tập cộng đồng phụ trách..."`.
   - Nhấp vào bất kỳ thẻ lớp hoặc nút "Xem danh sách hội viên" sẽ gọi `window.openPTCommunityClassModal(classId)` (tái sử dụng modal toàn cục `dxPopup`), hiển thị chi tiết lớp học và danh sách 15 hội viên đăng ký thành công mà không có nhãn thừa.
6. **Bổ Sung Badges & Quản Trị Vòng Đời**:
   - Cập nhật hàm `updateBadges()` tính toán badge số lượng `(${communityClassesCount})` hiển thị tức thì trên tab.
   - Hàm `reset()` làm rỗng `ClientsState.communityClasses = []` khi chuyển tài khoản hoặc reset màn hình.
   - Export `getCommunityClassesCount` ra interface của `ParadisePTClients`.

---

## 3. Xác Minh Kiểm Thử Thực Tế (E2E Test Runner)

Kịch bản kiểm thử E2E: `tests/scratch/verify_pt_clients_community_classes.js` chạy trên Chrome giả lập Mobile PT001 (Nguyễn Văn Thể) với độ phân giải chuẩn iPhone 390x844:
- **Khởi tạo & Đăng nhập:** Đăng nhập thành công PT001, mở Menu Gói phụ trách.
- **Kiểm tra 3 Sub-tabs:**
  * Tab 1: `Học viên phụ trách (3)`
  * Tab 2: `Gói đang phụ trách (9)`
  * Tab 3: `Lớp tập CĐ phụ trách (11)`
  * Cả 3 tab hiển thị đầy đủ, không tràn viền.
- **Chuyển tab Lớp tập CĐ phụ trách:**
  * Hiển thị chính xác 11 ca dạy lớp cộng đồng.
  * Thẻ lớp đầu tiên: `Cycling RPM Cuối Tuần`, `08:30 - 09:30 · 26/09/2026`, `Quận 1`, `Sĩ số 15/30 HV (50%)`, `Thù lao: 270.000 đ`.
- **Mở Modal Chi Tiết & Danh Sách Học Viên:**
  * Popup hiển thị chuẩn xác thông tin lớp học và danh sách 15 học viên đã đăng ký.
- **Tìm kiếm Realtime:**
  * Tìm từ khóa `"Cardio"`: Lọc chính xác 4 lớp học khớp tiêu chí.

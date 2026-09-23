# Báo Cáo Walkthrough: Bổ Sung Nút Gán Lại PT Cho Lớp Tập Cộng Đồng (Chưa Qua Thời Gian)

**Dự án:** Paradise Gym - Hệ thống Quản trị Web Admin (QTV / Lễ Tân)  
**Tác vụ:** Thêm nút gán lại PT nếu chưa qua thời gian buổi tập  
**Mã User Story:** `QTV-W16-US01`  
**Ngày thực hiện:** 22/09/2026  
**Người thực hiện:** `anti-1-QTV-LT` (Web Admin Lead)  

---

## 1. Yêu Cầu Người Dùng & Bối Cảnh Nghiệp Vụ

- **Yêu cầu từ Người Dùng:** *"thêm nút gán lại PT nếu chưa qua thời gian buổi tập đi."*
- **Hình ảnh người dùng cung cấp:** Ảnh chụp màn hình popup *"Chi tiết lớp tập: Aerobic Năng Lượng Buổi Sáng"* (lớp diễn ra từ 06:30 đến 07:30 ngày 22/09/2026). Thanh nút thao tác chỉ có `[Xóa lớp]`, `[Danh sách học viên]`, `[Ghi danh hội viên]`, `[Đóng]`, chưa có cơ chế điều phối hoặc đổi huấn luyện viên đứng lớp.
- **Nguyên tắc nghiệp vụ bất biến:**
  1. **Quy tắc thời gian (Session Time Lock):** Chỉ cho phép gán lại hoặc thay đổi HLV khi buổi tập **chưa kết thúc** (`!isPassed`). Nếu lớp học đã kết thúc trong quá khứ (ví dụ: lớp 06:30 - 07:30 sáng nay khi thời gian hiện tại đã trôi qua), hệ thống gắn nhãn `ĐÃ KẾT THÚC` và **ẩn hoàn toàn** nút `[Gán lại PT]` để bảo toàn tính lịch sử và không làm sai lệch bảng kê hoa hồng/thù lao.
  2. **Quy tắc cô lập chi nhánh & chống xung đột (`db-seed-integrity`):** Huấn luyện viên mới được gán phải thuộc cùng chi nhánh với lớp tập và phải rảnh lịch (không trùng ca dạy PT 1:1 hay lớp cộng đồng khác).
  3. **Visual Style & Giao diện chuẩn mực (`qtv-ui-design-system`):** Giao diện Administrative Forest Clean (`#237b58`), không callout gợi ý rườm rà, nút bấm và nhãn trường hiển thị gọn gàng, bề rộng modal 720px không bị co cắt chữ.

---

## 2. Các Thay Đổi Kỹ Thuật Đã Thực Hiện

### 2.1. Backend REST API (`backend/src/modules/core/community.js`):
- Xây dựng handler xử lý điều chuyển HLV: `reassignInstructorHandler` với các endpoint:
  * `PUT /api/v1/community-classes/:id/instructor`
  * `POST /api/v1/community-classes/:id/reassign-instructor`
- **Ràng buộc kiểm tra đa tầng:**
  * Phân quyền: Chỉ cho phép QTV hoặc Lễ Tân (`role(req, 'QTV', 'RECEPTIONIST')`).
  * Khóa thời gian quá khứ:
    ```javascript
    const classTimePassed = (new Date(`${cls.class_date}T${cls.end_time || cls.start_time}:00+07:00`)) <= (new Date());
    if (classTimePassed) {
      return res.status(400).json({ error: 'Không thể gán lại HLV vì buổi tập đã qua thời gian diễn ra' });
    }
    ```
  * Khóa chi nhánh: `pt.branch_id !== cls.branch_id` trả về lỗi `400 Bad Request`.
  * Khóa xung đột lịch (Conflict Check): Kiểm tra trùng giờ với bảng `pt_bookings` và các lớp khác trong bảng `community_classes` của HLV đó; nếu trùng trả về `409 Conflict`.
  * Ghi nhật ký kiểm toán hệ thống: `COMMUNITY_CLASS_INSTRUCTOR_REASSIGNED`.

### 2.2. Frontend Web Admin (`frontend/web/js/modules/community.js`):
- **Hàm kiểm tra thời gian buổi tập:**
  ```javascript
  function isClassSessionPassed(cls) {
    if (!cls || !cls.class_date) return false;
    try {
      const dateStr = typeof cls.class_date === 'string' ? cls.class_date.split('T')[0] : W().dateKey(cls.class_date);
      const timeStr = String(cls.end_time || cls.start_time || '23:59').slice(0, 5);
      const sessionEnd = new Date(`${dateStr}T${timeStr}:00+07:00`);
      return sessionEnd.getTime() <= Date.now();
    } catch (e) {
      return false;
    }
  }
  ```
- **Nâng cấp modal `openClassDetailModal(cls)`:**
  * Hiển thị badge trực quan: `ĐÃ HỦY` (đỏ), `ĐÃ KẾT THÚC` (xám trung tính), `ĐÃ ĐỦ CHỖ` (vàng cam), hoặc `ĐANG MỞ ĐĂNG KÝ` (xanh lá).
  * Nút `[Gán lại PT]` (`stylingMode: 'outlined'`, icon `'user'`) được hiển thị có điều kiện khi `!isPassed && (isAdmin || isStaff)`.
  * Mở rộng bề rộng modal lên `720px` và cấu hình `flex-wrap: wrap; gap: 8px;` cho thanh nút bấm, khắc phục triệt để hiện tượng co giật và cắt cụt chữ (`Xó...`, `Gán l...`).
- **Xây dựng modal `openReassignInstructorModal(cls)`:**
  * Hiển thị card tóm tắt: Chi nhánh, Bộ môn, Thời gian học, HLV hiện tại.
  * SelectBox chọn HLV phụ trách mới: Nạp danh sách HLV rảnh từ API `/community-classes/available-instructors`.
  * TextArea nhập lý do điều chuyển / ghi chú.
  * Nút `[Xác nhận gán lại PT]` gửi yêu cầu API `PUT /community-classes/:id/instructor`, thông báo thành công và tự động tải lại lịch tuần.

---

## 3. Kết Quả Kiểm Thử & Bằng Chứng UI (End-to-End Visual Verification)

Kịch bản kiểm thử E2E tự động hóa thực tế trên trình duyệt thực (`tests/scratch/verify_reassign_pt_community.js`):

### 3.1. Đối với lớp tập đã qua thời gian (Quá khứ):
- **Lớp kiểm tra:** *Aerobic Năng Lượng Buổi Sáng* (06:30 - 07:30 ngày 22/09/2026).
- **Kết quả:** 
  * Badge hiển thị: `ĐÃ KẾT THÚC` (màu xám trung tính).
  * Danh sách nút footer: `[Xóa lớp]`, `[Danh sách học viên (15)]`, `[Đóng]`.
  * **Nút `[Gán lại PT]` hoàn toàn KHÔNG xuất hiện**, ngăn chặn tuyệt đối việc sửa đổi HLV của ca dạy đã hoàn tất.
- **Bằng chứng chụp màn hình:** `verify_community_past_class_no_reassign_btn.png`

### 3.2. Đối với lớp tập chưa qua thời gian (Sắp diễn ra):
- **Lớp kiểm tra:** *Yoga Vinyasa Nâng Cao* (06:30 - 07:30 ngày 23/09/2026).
- **Kết quả:**
  * Badge hiển thị: `ĐANG MỞ ĐĂNG KÝ` (màu xanh lá).
  * Danh sách nút footer: `[Xóa lớp]`, **`[Gán lại PT]`**, `[Danh sách học viên (15)]`, `[Ghi danh hội viên]`, `[Đóng]`.
  * Toàn bộ 5 nút bấm hiển thị đầy đủ, sắc nét, không bị che khuất hay cắt cụt nhãn.
- **Bằng chứng chụp màn hình:** `verify_community_upcoming_with_reassign_btn.png`

### 3.3. Thao tác gán lại HLV phụ trách mới:
- **Hành vi:** Bấm vào nút `[Gán lại PT]` ➔ Modal `Gán lại HLV: Yoga Vinyasa Nâng Cao` mở ra.
- **Thông tin hiển thị:** Đầy đủ thông tin lớp, HLV hiện tại Lê Văn Hùng, danh sách HLV khả dụng, ô ghi chú điều chuyển.
- **Thực thi:** Chọn HLV, nhập ghi chú *"Điều phối ca dạy thay cho HLV theo lịch tuần"*, bấm `[Xác nhận gán lại PT]`.
- **Kết quả:** Hệ thống phản hồi thành công (`Success`), cập nhật database và mở lại modal chi tiết với thông tin HLV mới.
- **Bằng chứng chụp màn hình:** 
  * Modal gán lại PT: `verify_community_reassign_pt_modal.png`
  * Kết quả cập nhật thành công: `verify_community_reassigned_success.png`

---

## 4. Danh Sách File Đã Tác Động

1. `backend/src/modules/core/community.js`: Thêm route và handler `reassignInstructorHandler` kiểm tra khóa thời gian quá khứ, chi nhánh và xung đột ca dạy.
2. `frontend/web/js/modules/community.js`: Thêm helper `isClassSessionPassed`, điều kiện hiển thị nút `[Gán lại PT]`, mở rộng modal lên 720px và modal gán lại HLV.
3. `frontend/web/index.html`: Cache-busting `community.js?v=4`.
4. `docs/user-stories/qtv/QTV-W16-Lớp tập cộng đồng/QTV-W16-US01-Lập lịch và quản lý lớp tập cộng đồng.md`: Đồng bộ đặc tả trường `modal Chi tiết lớp tập`, `modal Gán lại HLV`, quy tắc nghiệp vụ Reassign PT và luồng phụ `AF-04`.
5. `tests/scratch/verify_reassign_pt_community.js`: Bộ kịch bản kiểm thử E2E xác thực tự động cả 2 trường hợp (lớp quá khứ vs lớp tương lai).

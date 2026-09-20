# BÁO CÁO BÀN GIAO: TÍNH NĂNG CHỦ ĐỘNG ĐÓNG BĂNG, MỞ ĐÓNG BĂNG & CHẶN GIA HẠN KHI ĐÓNG BĂNG (HV03)

**Dự án:** Paradise Gym  
**Phân hệ:** Mobile Hội viên (`frontend/mobile/member/`) & Backend REST API (`backend/src/modules/core/commerce.js`)  
**Tab thực thi:** Tab 2 (`anti-2-HV`)  
**Ngày hoàn thành:** 20/09/2026  
**Trạng thái kiểm thử:** PASS 455/455 HTTP checks (`npm test` trên PostgreSQL độc lập).

---

## 1. Tóm Tắt Nghiệp Vụ & Yêu Cầu

1. **Hội viên chủ động đóng băng gói (`Freeze Package`):**
   - Hội viên có thể chủ động đóng băng các gói tập đang hiệu lực của mình ngay trên ứng dụng Mobile.
   - Thao tác tại: Nút `[Đóng băng]` trên thẻ gói hoặc trong modal `Chi tiết gói tập`.
   - Hộp thoại đóng băng cho phép chọn nhanh các khoảng thời gian phổ biến (7, 14, 30, 60 ngày) hoặc nhập số ngày tùy chỉnh (1-180 ngày), kèm lý do.
   - Khi đóng băng thành công, trạng thái gói chuyển sang `❄️ Đang đóng băng` (`FROZEN`), ngày kết thúc của hợp đồng được tự động lùi tương ứng số ngày đóng băng và lưu vết vào `package_freezes`.

2. **Hội viên chủ động mở đóng băng (`Unfreeze Package`):**
   - Khi gói đang ở trạng thái `❄️ Đang đóng băng`, thẻ gói và modal chi tiết hiển thị nút `[Mở đóng băng]`.
   - Bấm vào mở hộp thoại xác nhận kích hoạt lại gói tập.
   - Khi xác nhận, gói tập lập tức quay về trạng thái `Đang hoạt động` (`ACTIVE`) để hội viên tiếp tục vào tập Gym và đặt lịch PT; đợt đóng băng trong `package_freezes` chuyển sang `ENDED`.

3. **Quy tắc chặn gia hạn khi đang đóng băng (`Renewal Guard`):**
   - Khi gói tập đang ở trạng thái đóng băng (`is_frozen = true`), hội viên **KHÔNG ĐƯỢC PHÉP** gia hạn gói.
   - **Frontend:** Ẩn nút `[Gia hạn gói]` trong modal chi tiết, hiển thị thông báo bảo lưu `Gói tập đang trong thời gian đóng băng bảo lưu. Không thể gia hạn gói khi đang đóng băng.`. Hàm `renewPackage(r)` chặn cảnh báo toast nếu cố tình gọi.
   - **Backend:** `createRegistration` kiểm tra nếu `old.is_frozen || effective(old) === 'FROZEN'` sẽ từ chối với HTTP 409 `FROZEN_CANNOT_RENEW`.

4. **Phân quyền bảo mật:**
   - Chỉ chủ sở hữu hợp đồng (`r.member_id === req.user.member_profile_id`) hoặc nhân viên (`QTV`, `RECEPTIONIST`) mới có quyền đóng băng / mở đóng băng.
   - Thành viên nhóm trong gói PT 1-Nhiều không có quyền đóng băng gói của Trưởng nhóm (HTTP 403 `FORBIDDEN`).

---

## 2. Chi Tiết File Thay Đổi

1. **`backend/src/modules/core/commerce.js`:**
   - `createRegistration`: Thêm kiểm tra chặn gia hạn gói đang đóng băng (`HTTP 409 FROZEN_CANNOT_RENEW`).
   - `POST /registrations/:id/freeze`: Bổ sung vai trò `'MEMBER'` vào middleware `role(...)`, kiểm tra quyền sở hữu của hội viên, mặc định lý do `'Hội viên chủ động đóng băng gói trên ứng dụng'`.
   - `POST /registrations/:id/unfreeze`: Bổ sung vai trò `'MEMBER'` vào middleware `role(...)`, kiểm tra quyền sở hữu của hội viên.

2. **`frontend/mobile/member/js/packages-notifications.js`:**
   - Thẻ gói trong danh sách:
     * Hiển thị nút `[Mở đóng băng]` (`openUnfreezeModal`) khi `isFrozen && !isGroupMember`.
     * Hiển thị nút `[Đóng băng]` (`openFreezeModal`) khi `ACTIVE/SCHEDULED`, đã thanh toán, chưa đóng băng và `!isGroupMember`.
   - Modal `Chi tiết gói tập` (`openPackageDetailModal`):
     * Nếu gói đóng băng: Hiển thị banner cảnh báo bảo lưu, hiển thị nút `[Mở đóng băng gói]`, ẩn hoàn toàn nút `[Gia hạn gói]`.
     * Nếu gói không đóng băng: Hiển thị nút `[Đóng băng gói]` và nút `[Gia hạn gói]`.
   - `openFreezeModal(r)`: Hộp thoại chọn ngày đóng băng với preset 7, 14, 30, 60 ngày, nhập lý do, gọi `POST /registrations/:id/freeze`.
   - `openUnfreezeModal(r)`: Hộp thoại xác nhận mở đóng băng, gọi `POST /registrations/:id/unfreeze`.
   - `renewPackage(r)`: Guard chặn gia hạn gói khi `is_frozen === true`.
   - Dọn dẹp trạng thái `Đang tải dữ liệu...` sau khi nạp xong dữ liệu với `pane.replaceChildren()`, loại bỏ tiêu đề `h2` trùng lặp với tên sub-tab để các Chip lọc trạng thái nằm gọn gàng, thoáng đãng ngay dưới thanh điều hướng.

3. **`frontend/mobile/member/index.html`:**
   - Bump cache buster: `js/packages-notifications.js?v=5`.

4. **`backend/tests/mobile-refactor.cases.js`:**
   - Bổ sung 7 checks kiểm thử toàn diện:
     * Non-owner bị chặn HTTP 403 khi freeze gói người khác.
     * Owner freeze gói thành công -> `is_frozen = true`, `status = 'FROZEN'`.
     * Cố gắng gia hạn gói đang đóng băng (cả bởi Member và Lễ tân) bị chặn HTTP 409 `FROZEN_CANNOT_RENEW`.
     * Non-owner bị chặn HTTP 403 khi unfreeze.
     * Owner unfreeze gói thành công -> `is_frozen = false`, `status = 'ACTIVE'`.
     * Sau khi mở đóng băng, gia hạn gói thành công 100%.

5. **`docs/user-stories/hoi-vien/HV03-Gói của tôi/HV03-US01-Xem gói, quyền lợi và tiến độ sử dụng.md`:**
   - Cập nhật Main Flow, Business rules, Field-level specification.
   - Bổ sung `AF-04 (Đóng băng gói tập chủ động)`, `AF-05 (Mở đóng băng gói tập trước hạn)`, `EF-02 (Chặn gia hạn khi đang đóng băng)`.
   - Cập nhật Activity Diagram Swimlane chuẩn UML tuân thủ nghiêm ngặt arity mũi tên.

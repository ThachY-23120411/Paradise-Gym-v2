# Kế hoạch Triển khai: Bỏ Tự Chọn PT (Liên hệ Lễ tân qua Popup) & Chuyển Đổi Sub-tab "Lời mời vào Gói" (HV03)

## 1. Bối cảnh & Yêu cầu Nghiệp vụ mới

1. **Quy tắc phân công PT mới:**
   - Hội viên **không còn được tự chọn PT phụ trách** cho gói của mình trực tiếp trên app Mobile nữa. Việc lựa chọn và phân công PT bắt buộc phải thông qua Lễ tân / Quản trị viên phòng tập để đảm bảo chuyên môn và lịch trình phù hợp.
   - Nút **`[ Chọn PT phụ trách ]`** trên thẻ gói tập (khi gói có PT nhưng chưa có HLV):
     - Khi bấm vào, hệ thống **không mở danh sách PT** nữa.
     - Thay vào đó, hiển thị **1 POPUP (Modal)** cung cấp thông tin liên hệ tới Lễ tân chi nhánh phục vụ của gói tập: Tên chi nhánh, Địa chỉ, Số điện thoại Lễ tân (ví dụ: `028 3822 1111` hoặc hotline chi nhánh) cùng lời nhắc hội viên liên hệ quầy lễ tân để được xếp HLV phù hợp nhất. Có nút gọi trực tiếp (`tel:...`).

2. **Chuyển đổi Sub-tab thứ 3 từ `Yêu cầu PT` thành `Lời mời vào Gói`:**
   - Giao diện menu `HV03 · Gói của tôi` hiện có 3 sub-tab:
     * Tab 1: `Gói của tôi` (`mine`)
     * Tab 2: `Mua gói` (`sale`)
     * Tab 3: **`Lời mời vào Gói`** (`invitations`) *(thay thế cho `Yêu cầu PT`)*
   - Chức năng của sub-tab `Lời mời vào Gói`:
     * Hiển thị danh sách các **Lời mời tham gia gói PT 1-Nhiều (`GROUP_1_N`)** mà hội viên này nhận được từ bạn bè/trưởng nhóm.
     * **Bộ lọc Filter Chips**:
       - `Tất cả`
       - `Chờ chấp thuận` (`PENDING`)
       - `Đã tham gia` (`ACCEPTED`)
       - `Đã từ chối` (`REJECTED`)
     * Với lời mời `Chờ chấp thuận`:
       - Hiển thị card chi tiết: Tên gói PT 1-N, Người mời/Trưởng nhóm (Họ tên, SĐT), Chi nhánh, Số buổi PT, Ngày mời.
       - Nút thao tác: **`[ Chấp thuận ]`** và **`[ Từ chối ]`**.
       - Khi bấm `[ Chấp thuận ]`: Kiểm tra điều kiện có gói Gym còn hiệu lực. Nếu chưa có, cảnh báo và điều hướng sang tab Mua gói Gym. Nếu hợp lệ, cập nhật vào nhóm và đồng bộ gói vào "Gói của tôi".
       - Khi bấm `[ Từ chối ]`: Cập nhật trạng thái `REJECTED`.
     * Với lời mời `Đã tham gia`: Hiển thị badge xanh và nút `[ Xem gói ]`.

3. **Cập nhật màn hình Trang chủ (`home-schedule.js`):**
   - Thay thế việc đếm yêu cầu PT cũ bằng việc đếm **Lời mời vào gói đang chờ phản hồi**.
   - Nếu có lời mời đang chờ: hiển thị thông báo "Bạn có X lời mời vào nhóm PT đang chờ phản hồi" kèm nút điều hướng đến sub-tab `Lời mời vào Gói`.

---

## 2. Các Thay Đổi Đề Xuất (Proposed Changes)

### Backend REST API (`backend/src/modules/core/commerce.js`)
#### [MODIFY] [commerce.js](file:///e:/Desktop/para/backend/src/modules/core/commerce.js)
- Thêm `GET /group-invitations`: Trả về danh sách lời mời vào nhóm PT của hội viên hiện tại kèm thông tin gói, người mời, chi nhánh và HLV.
- Thêm `POST /group-invitations/:id/respond`: Xử lý `ACCEPT` (kiểm tra gói Gym, kiểm tra sĩ số tối đa của nhóm) hoặc `REJECT`.
- Cập nhật `listRegistrations`: Bổ sung điều kiện lấy cả các gói tập mà hội viên tham gia với vai trò thành viên nhóm đã chấp thuận (`EXISTS in group_pt_members WHERE member_id = $1 AND invitation_status = 'ACCEPTED'`).

---

### Frontend Mobile Hội viên (`frontend/mobile/member/`)
#### [MODIFY] [packages-notifications.js](file:///e:/Desktop/para/frontend/mobile/member/js/packages-notifications.js)
- Đổi sub-tab thứ 3 từ `requests` ("Yêu cầu PT") thành `invitations` ("Lời mời vào Gói").
- Bỏ hàm `selectPt(reg)` và `requests(root, alive)` cũ.
- Viết mới hàm `openContactReceptionistModal(r)`: Mở popup thông báo liên hệ Lễ tân chi nhánh kèm SĐT và nút gọi trực tiếp.
- Gắn `openContactReceptionistModal(r)` vào nút `[ Chọn PT phụ trách ]` trên thẻ gói tập và trong Modal Chi tiết gói.
- Viết mới hàm `invitations(root, alive)`:
  * Nạp dữ liệu từ `GET /group-invitations`.
  * Hiển thị Filter Chips: `Tất cả`, `Chờ chấp thuận`, `Đã tham gia`, `Đã từ chối` kèm số lượng.
  * Render danh sách card lời mời với thông tin đầy đủ, badge trạng thái và các nút hành động `[ Chấp thuận ]` / `[ Từ chối ]`.
  * Xử lý chấp thuận với kiểm tra điều kiện gói Gym in-app.

#### [MODIFY] [home-schedule.js](file:///e:/Desktop/para/frontend/mobile/member/js/home-schedule.js)
- Nạp lời mời nhóm từ `GET /group-invitations?status=PENDING`.
- Cập nhật widget việc cần xử lý: hiển thị lời mời vào gói PT chờ duyệt và nút chuyển hướng đến sub-tab `Lời mời vào Gói`.

---

### Đồng Bộ Tài Liệu Đặc Tả (`docs/`)
#### [MODIFY] [HV03-US04-Chọn PT và gửi yêu cầu phân công.md](file:///e:/Desktop/para/docs/user-stories/hoi-vien/HV03-Gói%20của%20tôi/HV03-US04-Chọn%20PT%20và%20gửi%20yêu%20cầu%20phân%20công.md)
- Đổi tên & nghiệp vụ thành: **HV03-US04 — Liên hệ Lễ tân chọn PT phụ trách qua Popup**.
- Cập nhật Preconditions, Main Flow, Field-level Spec (Modal liên hệ Lễ tân, SĐT chi nhánh, nút Gọi ngay), Activity Diagram Swimlane tuân thủ `Action = 1 IN + 1 OUT`.

#### [MODIFY] [HV03-US05-Theo dõi yêu cầu phân công PT.md](file:///e:/Desktop/para/docs/user-stories/hoi-vien/HV03-Gói%20của%20tôi/HV03-US05-Theo%20dõi%20yêu%20cầu%20phân%20công%20PT.md)
- Đổi tên & nghiệp vụ thành: **HV03-US05 — Xem và phản hồi lời mời tham gia gói PT 1-Nhiều**.
- Cập nhật Preconditions, Sub-tab `Lời mời vào Gói`, Filter chips, Thẻ lời mời, Nút Chấp thuận & Từ chối, kiểm tra điều kiện gói Gym, Activity Diagram Swimlane tuân thủ `Action = 1 IN + 1 OUT`.

#### [MODIFY] [HV03-Gói của tôi.md](file:///e:/Desktop/para/docs/epic/hoi-vien/HV03-Gói%20của%20tôi.md)
- Cập nhật Sub-tab 3 thành `Lời mời vào Gói` và cập nhật bảng Traceability.

---

## 3. Kế Hoạch Kiểm Thử (Verification Plan)

### Kiểm thử Tự Động (Automated Tests)
- `node --check frontend/mobile/member/js/packages-notifications.js`
- `node --check frontend/mobile/member/js/home-schedule.js`
- Chạy toàn bộ integration tests backend: `npm test` trong thư mục `backend/`.
- Viết thêm test case kiểm thử `GET /group-invitations` và `POST /group-invitations/:id/respond` trong `backend/tests/mobile-refactor.cases.js`.

### Kiểm thử Giao Diện & Trực Quan (Manual Verification)
- Mở `http://localhost:3000/mobile/member/#packages`
- Xác nhận 3 sub-tab: `Gói của tôi` | `Mua gói` | `Lời mời vào Gói`.
- Kiểm tra bấm nút `[ Chọn PT phụ trách ]` trên thẻ gói chưa có HLV $\rightarrow$ Hiển thị popup hướng dẫn liên hệ Lễ tân chi nhánh kèm đúng SĐT và nút gọi.
- Kiểm tra sub-tab `Lời mời vào Gói`:
  * Filter chips hoạt động mượt mà giữa các trạng thái.
  * Lời mời hiển thị đúng thông tin người mời, gói tập, số buổi, ngày mời.
  * Thao tác `[ Chấp thuận ]` và `[ Từ chối ]`.

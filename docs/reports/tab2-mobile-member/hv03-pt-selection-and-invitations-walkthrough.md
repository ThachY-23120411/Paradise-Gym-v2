# Báo Cáo Bàn Giao: Bỏ Tự Chọn PT (Liên Hệ Lễ Tân Qua Popup) & Phân Tách 2 Tab "Lời Mời Tôi Nhận" / "Lời Mời Tôi Gửi" (HV03)

## 1. Tóm Tắt Nhiệm Vụ Đã Thực Hiện

Theo yêu cầu nghiệp vụ mới từ Người Dùng:
1. Hội viên không còn được tự chọn PT phụ trách trực tiếp trên ứng dụng Mobile. Toàn bộ việc gán HLV phụ trách sẽ do Lễ tân hoặc Quản trị viên phòng tập thực hiện tại quầy hoặc qua hotline chi nhánh.
2. Sub-tab thứ 3 trong menu **HV03 · Gói của tôi** được chuyển đổi thành **`Lời mời vào Gói`**.
3. **Phân tách 2 tab bên trong Sub-tab `Lời mời vào Gói`**:
   - **`Lời mời tôi nhận`**: Quản lý danh sách các lời mời tham gia nhóm PT 1-N do người khác gửi tới hội viên.
   - **`Lời mời tôi gửi`**: Quản lý danh sách các lời mời tham gia nhóm PT 1-N do chính hội viên gửi đi với vai trò Trưởng nhóm / Người đại diện.
   - Bổ sung tính năng **Thu hồi lời mời** (`DELETE /group-invitations/:id`) dành cho Trưởng nhóm khi lời mời đang ở trạng thái Chờ phản hồi (`PENDING`).

---

## 2. Các Hạng Mục Kỹ Thuật Đã Hoàn Thành

### A. Giao diện Mobile Hội viên (`frontend/mobile/member/`)

1. **Popup Liên Hệ Lễ Tân Chi Nhánh (`openContactReceptionistModal`):**
   - Nút **`[ Chọn PT phụ trách ]`** trên thẻ gói PT/Combo chưa có HLV (và nút **`[ Liên hệ Lễ tân ]`** trong modal Chi tiết gói) khi bấm vào sẽ mở Popup hướng dẫn chuyên nghiệp.
   - Popup hiển thị:
     * Banner thông điệp: *"Để đảm bảo chất lượng huấn luyện và sắp xếp lịch tập phù hợp nhất với thể trạng & mục tiêu của bạn, việc phân công Huấn luyện viên phụ trách sẽ do Lễ tân chi nhánh trực tiếp hỗ trợ."*
     * Bảng thông tin: Tên gói, Mã hợp đồng, Cơ sở tập luyện (`branch_name`), Địa chỉ chi nhánh (`address`), Số điện thoại Lễ tân (`phone`).
     * Nút gọi trực tiếp: **`[ Gọi Lễ tân (<SĐT>) ]`** (liên kết cuộc gọi `tel:...`) giúp hội viên kết nối nhanh chỉ với 1 chạm.
     * Nút **`[ Đóng ]`**.

2. **Chuyển đổi Sub-tab 3 thành `Lời mời vào Gói` với 2 Tab chuyên biệt (`invitations`):**
   - Bộ chuyển đổi Tab (Segment Navigation):
     * **`Lời mời tôi nhận`** (mặc định)
     * **`Lời mời tôi gửi`**
   - **Tab `Lời mời tôi nhận`:**
     * Filter Chips: `Tất cả (X)`, `Chờ chấp thuận (Y)`, `Đã tham gia (Z)`, `Đã từ chối (W)`.
     * Thẻ hiển thị: Tên gói PT 1-N, Mã hợp đồng, Badge trạng thái, Trưởng nhóm / Người mời (Họ tên, SĐT), Số buổi PT, Chi nhánh, HLV phụ trách, Thời gian gửi lời mời.
     * Hành động khi `PENDING`: Nút **`[ Chấp thuận ]`** (mở dialog xác nhận, kiểm tra điều kiện gói Gym còn hạn, nếu chưa có gói Gym hướng dẫn sang `#packages/sale`, nếu đủ điều kiện gọi API và điều hướng sang "Gói của tôi") và Nút **`[ Từ chối ]`** (cập nhật `REJECTED`).
     * Hành động khi `ACCEPTED`: Nút **`[ Xem gói của tôi ]`**.
   - **Tab `Lời mời tôi gửi`:**
     * Filter Chips: `Tất cả (X)`, `Chờ phản hồi (Y)`, `Đã tham gia (Z)`, `Đã từ chối (W)`.
     * Thẻ hiển thị: Tên gói PT 1-N, Mã hợp đồng, Badge trạng thái, Học viên được mời / Người nhận (Họ tên, SĐT, Mã HV), Số buổi PT, Chi nhánh, Thời gian gửi, Thời gian tham gia.
     * Hành động khi `PENDING`: Nút **`[ Thu hồi lời mời ]`** (mở popup xác nhận $\rightarrow$ gọi `DELETE /group-invitations/:id` $\rightarrow$ giải phóng slot trong nhóm $\rightarrow$ toast thông báo $\rightarrow$ tự động làm mới danh sách).
     * Hành động khi `ACCEPTED`: Nút **`[ Xem gói trong Gói của tôi ]`**.

3. **Cập nhật Màn hình Trang chủ (`home-schedule.js`):**
   - Widget công việc cần xử lý theo dõi **Lời mời vào gói đang chờ phản hồi** (`GET /group-invitations?status=PENDING`).
   - Hiển thị thông báo khi có lời mời chờ duyệt kèm nút điều hướng nhanh đến sub-tab `Lời mời vào Gói`.

---

### B. Nâng cấp Backend REST API (`backend/src/modules/core/commerce.js`)

1. **`GET /group-invitations`**:
   - Dành cho role `MEMBER`, hỗ trợ tham số `type=received` (mặc định) và `type=sent`, kèm bộ lọc `status`.
   - Khi `type=sent`: Lấy danh sách các lời mời do hội viên hiện tại gửi đi (`WHERE gm.inviter_member_id = $1`), join `friend` (`member_profiles`) để lấy thông tin người nhận (`friend_name`, `friend_phone`, `friend_code`).
   - Khi `type=received`: Lấy danh sách các lời mời gửi tới hội viên (`WHERE gm.member_id = $1`), join `inviter` để lấy thông tin trưởng nhóm.
2. **`DELETE /group-invitations/:id`**:
   - Dành cho Trưởng nhóm thu hồi lời mời gửi đi.
   - Kiểm tra quyền sở hữu (`inviter_member_id = current_member`). Chặn thu hồi nếu lời mời đã ở trạng thái `ACCEPTED` (HTTP 400 `CANNOT_REVOKE_ACCEPTED`).
   - Xóa bản ghi trong `group_pt_members`, giải phóng slot nhóm và ghi log `audit_logs` (`GROUP_PT_INVITATION_REVOKED`).
3. **`POST /group-invitations/:id/respond`**:
   - Dành cho người nhận phản hồi lời mời (`ACCEPT` hoặc `REJECT`).
   - Khi `ACCEPT`: Kiểm tra chặt chẽ điều kiện sở hữu gói Gym còn hiệu lực (`GYM_REQUIRED`), kiểm tra sĩ số tối đa của nhóm (`GROUP_LIMIT_REACHED`), cập nhật `invitation_status = 'ACCEPTED'`, `joined_at = NOW()`, ghi log `audit_logs`.
   - Khi `REJECT`: Cập nhật `invitation_status = 'REJECTED'`, ghi log `audit_logs`.
4. **Cập nhật `listRegistrations`**:
   - Tự động hiển thị hợp đồng gói PT nhóm trong danh sách "Gói của tôi" của các học viên đã chấp thuận tham gia nhóm (`EXISTS in group_pt_members WHERE member_id = $3 AND invitation_status = 'ACCEPTED'`).
   - Bổ sung cờ `is_group_member` để phân biệt Trưởng nhóm và Thành viên nhóm trên UI.

---

### C. Đồng Bộ Hóa Toàn Diện Hệ Thống Tài Liệu (`docs/`)

1. **User Story [`HV03-US05`](file:///e:/Desktop/para/docs/user-stories/hoi-vien/HV03-Gói%20của%20tôi/HV03-US05-Theo%20dõi%20yêu%20cầu%20phân%20công%20PT.md):**
   - Đổi tên thành **HV03-US05 — Quản lý lời mời tham gia gói PT 1-Nhiều (Lời mời tôi nhận & Lời mời tôi gửi)**.
   - Bổ sung chi tiết đặc tả 2 tab: Bộ chuyển đổi Tab (`TRIGGER`), Tiêu đề (`DYNAMIC`), Filter Chips (`DYNAMIC`), Thẻ lời mời nhận & Thẻ lời mời gửi (`CONDITIONAL`), Nút [ Chấp thuận ], Nút [ Từ chối ], Nút [ Thu hồi lời mời ] (`CONDITIONAL`), Nút [ Xem gói của tôi ].
   - Bổ sung các luồng: AF-01 (Chuyển đổi giữa hai tab), AF-02 (Thu hồi lời mời đã gửi), AF-03 (Từ chối lời mời), AF-04 (Chưa có gói Gym khi chấp thuận).
   - Thiết kế sơ đồ Mermaid Activity Diagram Swimlane chuẩn UML 100%, bảo đảm quy tắc bất biến `Action = 1 IN + 1 OUT`, không đứt đoạn, có Merge node và Final nodes chuẩn xác.
2. **User Story [`HV03-US04`](file:///e:/Desktop/para/docs/user-stories/hoi-vien/HV03-Gói%20của%20tôi/HV03-US04-Chọn%20PT%20và%20gửi%20yêu%20cầu%20phân%20công.md):**
   - Cập nhật quy chuẩn nút [ Chọn PT phụ trách ] mở popup liên hệ Lễ tân chi nhánh kèm Activity Diagram chuẩn UML.
3. **Epic [`HV03 · Gói của tôi`](file:///e:/Desktop/para/docs/epic/hoi-vien/HV03-Gói%20của%20tôi.md):**
   - Cập nhật Sub-tab 3 thành không gian quản lý 2 tab `Lời mời tôi nhận` và `Lời mời tôi gửi`, đồng bộ Traceability table.

---

## 3. Kết Quả Kiểm Thử (Verification Results)

- **Cú pháp JS:** `node --check frontend/mobile/member/js/packages-notifications.js` $\rightarrow$ **PASS (0 lỗi)**.
- **Backend Integration Test:** `npm test` $\rightarrow$ **PASS 403/403 HTTP checks** (toàn bộ các test cases hệ thống + test suite chuyên sâu cho `GET /group-invitations?type=sent`, `DELETE /group-invitations/:id` thu hồi lời mời PENDING, chặn thu hồi khi đã ACCEPTED, và trả lỗi 404 khi không tồn tại).

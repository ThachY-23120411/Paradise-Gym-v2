# Báo Cáo Bàn Giao: Kiểm Soát Chuyển Nhượng & Đóng Băng Gói Tập Tại Quầy (Staff-Only 3 Bên)

**Ngày thực hiện:** 21/09/2026  
**Người thực hiện:** Tab 1 - Web Admin Lead (`anti-1-QTV-LT`)  
**Phân hệ ảnh hưởng:** Mobile Member (App Hội viên HV03), Backend Core Commerce, Web Admin & Lễ tân (W04).

---

## 1. Mục Tiêu & Bối Cảnh Nghiệp Vụ

Nhằm giải quyết triệt để tình trạng **mua bán chui gói tập / giao dịch ngầm ngoài hệ thống**, bảo vệ quyền lợi hội viên và tính minh bạch tài chính của cơ sở phòng gym:
1. **Kiểm soát chặt chẽ danh tính hội viên thực tế:** Quy trình chuyển nhượng gói tập bắt buộc phải diễn ra **trực tiếp tại quầy Lễ tân** với sự xác nhận đồng thời của 3 bên:
   - **Người chuyển nhượng**
   - **Người nhận nhượng**
   - **Lễ tân / Quản trị viên phòng gym**
2. **Loại bỏ quyền tự thao tác trên Mobile App của Hội viên:**
   - Hội viên **không thể** tự ý tạo yêu cầu hay thực hiện chuyển nhượng hoặc đóng băng gói tập trên Mobile App.
   - Hai chức năng Chuyển nhượng và Đóng băng gói tập được quy hoạch là **độc quyền tại quầy Lễ tân** (thực hiện qua Web Admin W04).
3. **Cơ chế chuyển giao trực tiếp & Thông báo tự động:**
   - Khi Lễ tân thao tác chuyển nhượng tại quầy, quyền sở hữu gói tập chuyển ngay lập tức sang người nhận nhượng trong database.
   - Hệ thống tự động đẩy thông báo in-app đến cả 2 bên (Người chuyển và Người nhận) để lưu vết lịch sử minh bạch, không phát sinh luồng chờ phê duyệt trung gian trên app di động.

---

## 2. Chi Tiết Các Thay Đổi Mã Nguồn

### 2.1. Mobile Member Frontend (`frontend/mobile/member/js/packages-notifications.js`)
- **Thu gọn thanh Segmented Tabs (`packages`):**
  * Loại bỏ hoàn toàn sub-tab `transfers` ("Chuyển nhượng").
  * Danh sách tab trên thanh điều hướng chỉ còn 3 mục: `mine` ("Gói của tôi"), `sale` ("Mua gói"), `invitations` ("Lời mời vào Gói").
  * Điều hướng an toàn: nếu người dùng truy cập trực tiếp hash `#packages/transfers`, hệ thống tự động fallback về `#packages/mine`.
- **Làm sạch các nút hành động trên Thẻ gói tập (`mine`):**
  * Xóa bỏ hoàn toàn nút `[ Đóng băng ]` (`freezeBtn`), `[ Mở đóng băng trước hạn ]` (`unfreezeBtn`), và `[ Chuyển nhượng ]` (`transferBtn`) khỏi card gói tập.
  * Các nút hành động hợp lệ còn lại: `[ Chi tiết gói ]`, `[ Xem lộ trình ]`, `[ Mời bạn vào nhóm ]` (dành cho Trưởng nhóm gói Group PT 1-N), `[ Tiếp tục thanh toán ]` (cho đơn PENDING_PAYMENT), và `[ Chọn PT phụ trách ]` (cho gói PT chưa gán HLV).
- **Làm sạch Modal Chi Tiết Gói (`openPackageDetailModal`):**
  * Loại bỏ hoàn toàn nút `[ Đóng băng gói ]` (`#modalFreezeBtn`) và `[ Mở đóng băng gói ]` (`#modalUnfreezeBtn`) khỏi phần footer của dialog.

### 2.2. Backend REST API (`backend/src/modules/core/commerce.js`)
- **Handler `POST /registrations/:id/transfer`:**
  * Bổ sung logic tự động tạo 2 thông báo in-app trong bảng `notifications`:
    1. Gửi cho Hội viên chuyển nhượng (`fromMember`): Báo cáo gói tập đã được chuyển nhượng thành công cho người nhận tại quầy lễ tân.
    2. Gửi cho Hội viên nhận nhượng (`toMember`): Báo cáo đã nhận thành công gói tập từ người chuyển, kèm hướng dẫn kiểm tra thông tin và thời hạn sử dụng trong menu "Gói của tôi".
  * Đảm bảo tính toàn vẹn dữ liệu trong transaction PostgreSQL.

### 2.3. Cập Nhật Tài Liệu Nghiệp Vụ & User Story
- **Epic HV03 (`docs/epic/hoi-vien/HV03-Gói của tôi.md`):**
  * Bổ sung quy định bắt buộc xác nhận 3 bên tại quầy lễ tân cho chuyển nhượng và đóng băng gói.
  * Ghi rõ phân quyền Staff-only (Lễ tân/QTV) tại quầy.
- **User Story HV03-US01 (`docs/user-stories/hoi-vien/HV03-Gói của tôi/HV03-US01-Xem gói, quyền lợi và tiến độ sử dụng.md`):**
  * Bỏ tab Chuyển nhượng khỏi Field-level specification.
  * Bỏ các nút Đóng băng / Chuyển nhượng khỏi bảng đặc tả UI thẻ gói tập và modal chi tiết.
  * Cập nhật Main Flow và Mermaid Activity Diagram chuẩn UML (`1 IN + 1 OUT` cho các Action node).

---

## 3. Kết Quả Kiểm Thử Tự Động (E2E Test)

Kịch bản kiểm thử E2E được thực thi tự động qua Puppeteer (`tests/e2e/test_member_no_transfer_freeze.js`) trên trình duyệt Chromium:

| Bước kiểm tra | Nội dung xác thực | Kết quả |
| :--- | :--- | :---: |
| **Tab navigation** | Kiểm tra danh sách tab trong menu Gói tập của Member `0987654321`. Đảm bảo KHÔNG có tab "Chuyển nhượng". | **PASS** |
| **Card buttons** | Quét toàn bộ nút hành động trên các thẻ gói tập. Đảm bảo KHÔNG có nút "Đóng băng", "Mở đóng băng", "Chuyển nhượng". | **PASS** |
| **Detail modal** | Mở modal "Chi tiết gói" và quét footer actions. Đảm bảo KHÔNG có nút "Đóng băng gói". | **PASS** |

**Hình ảnh snapshot nghiệm thu:**
- `verify_member_tabs_no_transfer.png`: Minh chứng thanh sub-tabs chỉ còn 3 mục (Gói của tôi, Mua gói, Lời mời vào Gói).
- `verify_member_card_no_freeze_transfer.png`: Minh chứng thẻ gói tập sạch sẽ, không còn nút Đóng băng / Chuyển nhượng.
- `verify_member_detail_modal_no_freeze.png`: Minh chứng modal chi tiết gói không có nút Đóng băng.

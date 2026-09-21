# Báo Cáo Bàn Giao (Walkthrough) — Phân Hệ Chuyển Nhượng Gói Tập Hội Viên (Mobile Member)

**Ngày thực hiện:** 21/09/2026  
**Vai trò:** `anti-2-HV (Mobile Member Lead)`  
**Trạng thái:** ✅ **HOÀN THÀNH 100% & KIỂM THỬ E2E PASS**

---

## 1. Tổng Quan Yêu Cầu

Người dùng yêu cầu bổ sung tab thứ 4 trong mục **Gói của tôi** (`#packages`) trên ứng dụng Mobile Hội viên:
> *"thêm 1 tab nữa là yêu cầu chuyển nhượng nữa, trong tab đó sẽ có là yêu cầu đã gửi, yêu cầu đã nhận"*

### Chi tiết các thành phần bàn giao:
1. **Cơ sở dữ liệu (PostgreSQL - Migration 015):**
   - Bảng mới: `package_transfer_requests` liên kết khóa ngoại tới `registrations(id)` và `member_profiles(id)`.
   - Ràng buộc: Trạng thái `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`.
   - Partial Unique Index `idx_one_pending_transfer_per_reg` bảo vệ một gói tập chỉ có tối đa 1 yêu cầu PENDING cùng lúc.
   - Cập nhật đồng bộ 100% vào tài liệu thiết kế cơ sở dữ liệu `docs/database/erd.md` theo Quy tắc 6 (`AGENTS.md`).

2. **Backend REST API (`backend/src/modules/core/commerce.js`):**
   - `GET /api/v1/transfer-requests`: Danh sách yêu cầu chuyển nhượng (hỗ trợ lọc `type=sent|received` và `status`).
   - `GET /api/v1/transfer-requests/lookup-recipient`: Tra cứu thông tin hội viên nhận chuyển nhượng theo SĐT hoặc Mã hội viên (kèm chi nhánh gốc và kiểm tra trạng thái hoạt động).
   - `POST /api/v1/transfer-requests`: Gửi yêu cầu chuyển nhượng gói tập mới (kiểm tra điều kiện gói `ACTIVE`/`SCHEDULED`, chưa đóng băng, chưa hết hạn, chặn chuyển cho chính mình).
   - `POST /api/v1/transfer-requests/:id/respond`: Phản hồi yêu cầu chuyển nhượng (`action: 'ACCEPT' | 'REJECT'`). Khi ACCEPT, hệ thống thực hiện transaction nguyên tử: cập nhật chủ sở hữu hợp đồng `registrations.member_id`, ghi log lịch sử `package_transfers`, cập nhật `package_transfer_requests.status = 'ACCEPTED'`, ghi nhật ký kiểm toán `audit_logs` và bắn thông báo in-app cho cả 2 hội viên.
   - `DELETE /api/v1/transfer-requests/:id`: Thu hồi yêu cầu chuyển nhượng đang chờ phản hồi (`status = 'CANCELLED'`).

3. **Giao diện Mobile Hội viên (`frontend/mobile/member/`):**
   - Bổ sung tab thứ 4: `["transfers", "Chuyển nhượng"]` trên thanh phân đoạn (`.segments`).
   - Tinh chỉnh khoảng cách (`gap: 2px; padding: 10px 5px; font-size: 12.5px;`) giúp toàn bộ 4 tab hiển thị vừa vặn 100% trên màn hình di động chuẩn (390px) mà không bị che khuất hay cắt cụt chữ.
   - Sub-tab chuyển đổi giữa **"Yêu cầu đã gửi"** (`sent`) và **"Yêu cầu đã nhận"** (`received`).
   - Nút `[ Gửi yêu cầu mới ]` mở modal dialog cho phép chọn gói tập đang sở hữu, nhập SĐT/Mã HV người nhận, bấm nút `[ Kiểm tra ]` để preview thông tin người nhận theo thời gian thực (hiển thị checkmark xanh, họ tên, SĐT và chi nhánh), nhập lý do và bấm gửi.
   - Các chip lọc trạng thái: *Tất cả*, *Chờ phản hồi / Chờ chấp thuận*, *Đã chuyển nhượng*, *Đã từ chối*, *Đã hủy*.
   - Thẻ hiển thị chi tiết từng yêu cầu: Mã hợp đồng, tên gói, loại gói, quyền lợi buổi/ngày còn lại, hạn sử dụng, thông tin người nhận/người gửi, lý do chuyển nhượng và thời gian gửi/phản hồi.
   - Các nút hành động nghiệp vụ:
     * Tab Đã gửi: Nút `[ ↺ Thu hồi yêu cầu ]`.
     * Tab Đã nhận: Nút `[ ✔ Chấp nhận chuyển nhượng ]` (xanh lá) và nút `[ ✖ Từ chối ]` (đỏ).
   - Tab "Gói của tôi" (`mine`): Bổ sung nút `[ ⇄ Chuyển nhượng ]` trên từng thẻ gói tập đang hoạt động để mở nhanh modal chuyển nhượng với gói tập đã được chọn sẵn.

---

## 2. Bằng Chứng Hình Ảnh Kiểm Thử (Screenshots)

### 2.1. Sub-tab "Yêu cầu đã gửi" (Sent Transfers)
![Yêu cầu đã gửi](verify_transfer_sent.png)
*Hình 1: Tab Yêu cầu chuyển nhượng > Sub-tab Yêu cầu đã gửi hiển thị đầy đủ thẻ yêu cầu đang chờ phản hồi với người nhận Trần Bảo Long (HV009), đầy đủ thông tin quyền lợi và nút [ Thu hồi yêu cầu ].*

---

### 2.2. Modal "Yêu cầu chuyển nhượng gói tập"
![Modal chuyển nhượng](verify_transfer_modal.png)
*Hình 2: Modal chuyển nhượng với danh sách chọn gói tập khả dụng, ô nhập SĐT/Mã HV người nhận, tính năng kiểm tra trực tiếp trả về hội viên Trần Bảo Long (0988811178 · HV009) - Paradise Gym Quận 1, ô lý do và nút gửi yêu cầu.*

---

### 2.3. Sub-tab "Yêu cầu đã nhận" (Received Transfers)
![Yêu cầu đã nhận](verify_transfer_received.png)
*Hình 3: Sub-tab Yêu cầu đã nhận hiển thị yêu cầu chuyển nhượng từ hội viên Trần Thị Bình (HV002), quyền lợi 7 buổi PT, hạn dùng 31/12/2026 kèm 2 nút hành động [ Chấp nhận chuyển nhượng ] và [ Từ chối ].*

---

### 2.4. Nút "Chuyển nhượng" trên thẻ "Gói của tôi"
![Nút chuyển nhượng trên Gói của tôi](verify_mine_transfer_btn.png)
*Hình 4: Tab "Gói của tôi" bổ sung nút [ Chuyển nhượng ] cạnh nút [ Chi tiết gói ] và [ Đóng băng ] trên các gói tập đang sử dụng.*

---

## 3. Danh Sách File Thay Đổi

1. `backend/src/db/migrations/015_package_transfer_requests.sql` (Tạo bảng, FK, Indexes)
2. `docs/database/erd.md` (Đồng bộ tài liệu ERD schema 38 bảng, quan hệ Mermaid, từ điển dữ liệu mục 2.8.1)
3. `backend/src/modules/core/commerce.js` (4 API endpoints: lookup, list, create, respond, delete)
4. `frontend/mobile/member/js/packages-notifications.js` (Thêm tab thứ 4, sub-segments sent/received, modal tạo yêu cầu, nút chuyển nhượng trên thẻ gói)
5. `frontend/mobile/member/css/member.css` (Cấu hình cuộn ngang cho `.segments` và kích thước responsive)
6. `frontend/mobile/member/index.html` (Bump cache busters `css/member.css?v=13` & `js/packages-notifications.js?v=13`)
7. `tests/test_member_transfers_e2e.cjs` (Script kiểm thử tự động E2E Puppeteer)

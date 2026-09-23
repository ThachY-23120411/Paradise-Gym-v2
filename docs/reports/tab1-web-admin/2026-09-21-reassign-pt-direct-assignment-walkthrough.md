# Walkthrough - Gán lại PT phụ trách (QTV/LT) & Rút gọn 2 Tab Mobile PT (Bỏ Yêu cầu phụ trách)

> Báo cáo xác nhận kiểm thử E2E và bàn giao tính năng theo yêu cầu nghiệp vụ ngày 21/09/2026:
> 1. Gán PT do LT/QTV thực hiện trực tiếp, không cần PT chấp thuận (gán là phụ trách luôn).
> 2. Bỏ phần "Yêu cầu phụ trách" trong menu *Gói phụ trách* của Mobile PT app, rút gọn còn 2 tab (`Học viên phụ trách` và `Gói đang phụ trách`).
> 3. Bổ sung nút **[Gán lại PT]** cho role QTV/LT sau khi gói đã được gán 1 PT trong menu *Đăng ký & gia hạn* (W04).

---

## 1. Tóm Tắt Thay Đổi Đã Thực Hiện

### 1.1. Backend API (`backend/src/modules/core/commerce.js`)
- Cập nhật handler `assignPtHandler` (phục vụ cả `POST /registrations/:id/assign-pt` và alias `POST /registrations/:id/reassign-pt`):
  * Cho phép gán khi `assigned_pt_id` đang rỗng (gán lần đầu) hoặc đã có giá trị (gán lại PT).
  * Ràng buộc kiểm tra chọn trùng: Trả về HTTP 400 kèm thông báo rõ ràng nếu `pt_id` mới trùng khớp với `assigned_pt_id` hiện tại.
  * Kiểm tra HLV mới có trạng thái `ACTIVE` tại chi nhánh bán gói (`sold_branch_id`).
  * Cập nhật `assigned_pt_id` trực tiếp trong bảng `registrations`.
  * Ghi audit log chuẩn hóa: `PT_REASSIGNED` khi gán lại (hoặc `PT_ASSIGNED` khi gán lần đầu), kèm metadata: `old_pt_id`, `new_pt_id`, `note`.
  * Gửi thông báo in-app realtime đến cả HLV mới, HLV cũ (nếu gán lại), và Hội viên.

### 1.2. Frontend Web Admin W04 (`frontend/web/js/modules/sales.js`)
- **Bảng danh sách đăng ký (DataGrid):**
  * Hiển thị nút **[Gán PT]** đối với gói PT/Combo chưa có HLV phụ trách (`!c.data.assigned_pt_id`).
  * Tự động hiển thị nút **[Gán lại PT]** đối với gói PT/Combo đã có HLV phụ trách (`c.data.assigned_pt_id && ['ACTIVE', 'SCHEDULED', 'FROZEN'].includes(c.data.status)`).
- **Drawer chi tiết đăng ký (`openRegistrationDetail`):**
  * Bổ sung nút hành động chính **[Gán lại PT]** (`type: 'default'`, contained) khi gói đã có `assigned_pt_id`.
- **Modal Gán lại PT phụ trách (`openAssignment`):**
  * Nhận diện cờ `isReassign = !!r.assigned_pt_id`.
  * Đổi tiêu đề popup: `"Gán lại PT phụ trách"`.
  * Bổ sung trường hiển thị chỉ đọc: `HLV phụ trách hiện tại` (`ptName(r)`).
  * Đổi nhãn trường chọn HLV: `Chọn HLV phụ trách mới *` kèm placeholder `"Chọn HLV thay thế phụ trách gói..."`.
  * Đổi nhãn ghi chú: `Lý do gán lại / Ghi chú bàn giao`.
  * Nút lưu dữ liệu: `Xác nhận gán lại PT` (màu xanh lá `--primary`, contained).
  * Chặn chọn trùng HLV hiện tại ngay tại client, hiển thị lỗi trong error banner.

### 1.3. Frontend Mobile PT PT02 (`frontend/mobile/pt/js/clients.js`)
- Loại bỏ hoàn toàn Tab 3 ("Yêu cầu phụ trách") và nút `#tabBtnRequests` khỏi thanh chuyển tab.
- Giao diện menu *Gói phụ trách* chỉ còn chuẩn hóa 2 tab:
  1. `Học viên phụ trách`: Gom nhóm học viên duy nhất, hiển thị thẻ học viên, pill badge số gói đang phụ trách, tổng số buổi còn lại và mở màn hình phụ xem các gói.
  2. `Gói đang phụ trách`: Danh sách phẳng từng gói tập cụ thể, thanh tiến độ buổi tập đồ họa.
- Cập nhật logic tìm kiếm, badge số lượng, và `switchTab` sang cấu trúc 2 tab.

### 1.4. Tài Liệu Đặc Tả & User Stories
- Đồng bộ hóa 100% các tài liệu:
  * `docs/epic/pt/PT02-Học viên.md`: Cập nhật cấu trúc 2 tab, bỏ yêu cầu phụ trách.
  * `docs/user-stories/pt/PT02-Học viên/PT02-US01-Xem danh sách học viên được phân công.md`: Đặc tả 2 tab, Field-level specification và Sơ đồ Swimlane Activity Diagram chuẩn UML.
  * `docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US05-Gán PT phụ trách cho gói đăng ký.md`: Bổ sung AF-02 (Gán lại PT phụ trách), trường HLV hiện tại `CONDITIONAL`.
  * `docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US05-Gán PT phụ trách cho gói đăng ký.md`: Tương tự cho phân hệ Lễ tân tại quầy.

---

## 2. Kết Quả Kiểm Thử Tự Động End-to-End (Puppeteer)

Kịch bản E2E: `tests/e2e/test_reassign_pt_and_pt_tabs.js` đã thực thi hoàn chỉnh và vượt qua 100% các tiêu chí xác thực:

```
[Test] Starting Reassign PT & Mobile PT 2-tabs verification...
[Runner] Launching Headless Chrome...

--- PART 1: Web QTV W04 Gán lại PT ---
[Test] Sales grid loaded.
[Test] "Gán lại PT" button already visible on grid: true
[Test] Clicking "Gán lại PT" button...
[Test] Popup "Gán lại PT phụ trách" opened.
[Test] Modal Details: {
  title: 'Gán lại PT phụ trách',
  labels: [
    'Mã đăng ký:',
    'Hội viên:',
    'Gói đăng ký:',
    'Chi nhánh:',
    'HLV phụ trách hiện tại:',
    'Chọn HLV phụ trách mới:',
    'Lý do gán lại / Ghi chú bàn giao:'
  ],
  currentPtRow: true,
  newPtRow: true
}
[Test] Captured screenshot 1: verify-reassign-pt-modal.png
[Test] Selecting a different PT and entering note...
[Test] Select new PT result: {
  success: true,
  newPtName: 'Phạm Quốc Bảo',
  newPtId: 'bf969011-aecb-438d-9683-6f7ee9384eb7'
}
[Test] Clicking "Xác nhận gán lại PT"...
[Test] Button click result: { success: true }
[Test] Captured screenshot 2: verify-reassign-pt-success.png

--- PART 2: Mobile PT PT02 2 Tabs Layout ---
[Test] Mobile PT Tabs Info: {
  hasTabMembers: true,
  hasTabPackages: true,
  hasTabRequests: false,
  visibleTabsText: [ 'Học viên phụ trách (2)', 'Gói đang phụ trách (6)' ]
}
[Test] Captured screenshot 3: verify-pt-2tabs-layout.png

✅ ALL E2E VERIFICATIONS PASSED SUCCESSFULLY!
```

---

## 3. Ảnh Chụp Bằng Chứng Giao Diện Thực Tế

### 3.1. Modal Gán Lại PT Phụ Trách trên Web QTV W04
Hiển thị đầy đủ thông tin: Mã DK016, Hội viên, Gói đăng ký, Chi nhánh, trường `HLV phụ trách hiện tại: Nguyễn Văn Thể · PT001`, dropdown `Chọn HLV phụ trách mới *`, ô lý do điều chuyển và nút `[Xác nhận gán lại PT]`:
![verify-reassign-pt-modal](file:///E:/Antigravity%20-%20Copy/Profiles/Profile3/.gemini/antigravity/brain/8f603014-e613-4055-a510-ef40fa67cfcb/verify-reassign-pt-modal.png)

### 3.2. Thông Báo Gán Lại Thành Công & Cập Nhật Bảng Đăng Ký
Sau khi gán lại sang HLV mới, modal tự động đóng, thông báo toast xanh lá "✔ Đã gán lại PT phụ trách thành công!" xuất hiện và bảng DataGrid cập nhật nút `[Gán lại PT]`:
![verify-reassign-pt-success](file:///E:/Antigravity%20-%20Copy/Profiles/Profile3/.gemini/antigravity/brain/8f603014-e613-4055-a510-ef40fa67cfcb/verify-reassign-pt-success.png)

### 3.3. Giao Diện 2 Tab Của Mobile PT (Đã Bỏ Yêu Cầu Phụ Trách)
Menu *Gói phụ trách* của Mobile PT chỉ còn 2 tab: `Học viên phụ trách (2)` và `Gói đang phụ trách (6)`. Hoàn toàn không còn Tab 3 hay bất kỳ dấu vết nào của yêu cầu phụ trách:
![verify-pt-2tabs-layout](file:///E:/Antigravity%20-%20Copy/Profiles/Profile3/.gemini/antigravity/brain/8f603014-e613-4055-a510-ef40fa67cfcb/verify-pt-2tabs-layout.png)

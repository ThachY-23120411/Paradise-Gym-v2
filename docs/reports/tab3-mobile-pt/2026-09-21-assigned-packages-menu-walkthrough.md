# Báo Cáo Bàn Giao: Tái Cấu Trúc Menu "Gói Phụ Trách" & Điều Hướng 2 Tab Cho Huấn Luyện Viên (Mobile PT)

**Mã phân hệ:** `PT02` - Gói phụ trách  
**Ngày thực hiện:** 21/09/2026  
**Vai trò:** `anti-3-PT (Mobile PT Lead)`  
**Trạng thái:** ✅ HOÀN THÀNH 100% (Đã kiểm thử E2E Playwright & Đồng bộ tài liệu Spec/US)

---

## 1. Tổng Quan Yêu Cầu & Giải Pháp Kỹ Thuật

Theo yêu cầu nghiệp vụ của dự án:
1. **Đổi tên Menu Footer:** Đổi nhãn tab footer thứ 3 từ `"Học viên"` thành **`"Gói phụ trách"`**, cập nhật icon `fa-boxes-stacked`.
2. **Cấu trúc 2 Tab chính bên trong màn hình:**
   - **Tab 1: "Học viên phụ trách"**:
     - Hiển thị danh sách các học viên được phân công cho PT hiện tại.
     - Mỗi học viên chỉ xuất hiện **1 dòng duy nhất** (group by `memberId`), kể cả khi học viên đó đăng ký nhiều gói tập khác nhau mà PT này phụ trách.
     - Thẻ học viên tóm tắt (`Member Summary Card`) hiển thị: Avatar chữ cái viết tắt họ tên, Họ tên, Mã HV, Số điện thoại, Pill tag xanh lá nhạt (`X gói PT đang phụ trách`), và Tổng số buổi PT còn lại cộng dồn.
     - **Tương tác**: Chạm vào một học viên sẽ mở **Màn hình phụ Danh sách các gói của học viên đó** (`#memberPackagesSubscreen`).
     - **Phạm vi bảo mật**: Danh sách gói trong màn hình phụ chỉ hiển thị các gói của học viên đó **do chính PT này phụ trách** (`assigned_pt_id === currentPtId`).
     - Chạm vào từng gói sẽ mở màn hình chi tiết lộ trình tập luyện & lịch sử buổi học (`PT02-US02`).
   - **Tab 2: "Gói đang phụ trách"**:
     - Hiển thị danh sách phẳng tất cả các gói tập cá nhân mà PT đang phụ trách (khớp 100% bố cục thiết kế chuẩn).
     - Mỗi thẻ gói tập (`Package Card`) hiển thị: Avatar, Họ tên học viên, Mã HV, SĐT, Tên gói PT, Ngày hết hạn gói, Badge trạng thái (`Đang hoạt động`, `Sắp hết hạn`), Buổi PT còn lại, Thời gian tập lần cuối, và Thanh tiến độ hoàn thành (`Đã tập X / Y buổi` kèm tỷ lệ %).
     - **Tương tác**: Chạm vào thẻ gói tập sẽ mở trực tiếp màn hình chi tiết lộ trình tập luyện & lịch sử buổi học (`PT02-US02`).
3. **Cơ chế Điều Hướng Quay Lại (3-Level Back Navigation):**
   - Nút `[←]` trên màn hình chi tiết lộ trình (`#clientDetailSubscreen`) nhận diện biến ngữ cảnh nguồn (`ClientsState.navigationSource`):
     * Nếu mở từ Màn hình phụ danh sách gói của học viên (`member_packages`): Nút `[←]` quay về đúng màn hình phụ danh sách gói của học viên đó.
     * Nếu mở trực tiếp từ Tab 2 (`assigned_packages`): Nút `[←]` quay về danh sách gói tại Tab 2.
   - Nút `[←]` trên Màn hình phụ danh sách gói của học viên đóng subscreen và quay về Tab 1 (`Học viên phụ trách`).
4. **Tìm kiếm thời gian thực (Live Search):**
   - Hỗ trợ tìm kiếm theo Họ tên hoặc Số điện thoại áp dụng ngay lập tức cho danh sách ở tab đang kích hoạt.

---

## 2. Các File Mã Nguồn Đã Chỉnh Sửa

| STT | Đường dẫn file | Nội dung thay đổi |
| :--- | :--- | :--- |
| 1 | `frontend/mobile/pt/index.html` | Đổi nhãn bottom nav thành `"Gói phụ trách"`, cập nhật tab segmented 3 nút (`tabBtnMembersGrouped`, `tabBtnAssigned`, `tabBtnRequests`), bổ sung subscreen `#memberPackagesSubscreen`. |
| 2 | `frontend/mobile/pt/js/clients.js` | Viết logic gom nhóm học viên duy nhất `getUniqueAssignedMembers()`, render thẻ học viên `renderAssignedMembersList()`, render thẻ gói `renderAssignedPackagesList()`, modal danh sách gói `openMemberPackages()`, điều hướng 3 cấp `openClientDetail(clientId, source)`. |
| 3 | `docs/user-stories/pt/PT02-Học viên/PT02-US01-Xem danh sách học viên được phân công.md` | Đồng bộ toàn diện Field-level spec (bổ sung pill badge, thẻ tóm tắt, subscreen), Main Flow và Activity Diagram Swimlane chuẩn UML. |
| 4 | `docs/user-stories/pt/PT02-Học viên/PT02-US02-Xem lộ trình và lịch sử tập luyện của học viên.md` | Cập nhật Trigger mở từ 2 nguồn và quy tắc nút quay lại `[←]` theo ngữ cảnh. |
| 5 | `docs/epic/pt/PT02-Học viên.md` | Cập nhật tên Epic `PT02 - Gói phụ trách`, cấu trúc 2 tab và cơ chế điều hướng. |

---

## 3. Kết Quả Kiểm Thử Tự Động (E2E Playwright)

Kịch bản kiểm thử tự động đã được xây dựng tại: `tests/e2e/pt/test_assigned_packages_menu.cjs`.  
Chạy trực tiếp trên trình duyệt Chromium headless thật kết nối với hệ thống backend API (`http://localhost:5000`) và PostgreSQL:

```
[TEST 1] Testing Bottom Nav label...
  ✓ Bottom nav label: "Gói phụ trách"

[TEST 2] Testing Tab 1: Unique Assigned Members...
  ✓ Member cards rendered: 2 members
  ✓ Unique member names: [ 'Lê Hoàng Nam', 'Trần Thị Bình' ]
  ✓ Pill tag text: "5 gói PT đang phụ trách"

[TEST 3] Testing Member Packages Subscreen...
  ✓ Subscreen title: "Gói của học viên"
  ✓ Total packages listed for Lê Hoàng Nam: 5
  ✓ All packages belong strictly to this member: true

[TEST 4] Testing Client Detail Subscreen from Member Packages...
  ✓ Roadmap detail visible for: "Gói PT Tăng cơ 24 buổi"
  ✓ Member name in header: "Lê Hoàng Nam"

[TEST 5] Testing Back Navigation from Detail to Member Packages Subscreen...
  ✓ Detail subscreen closed
  ✓ Member packages subscreen still visible: true

[TEST 6] Testing Back Navigation from Member Packages to Tab 1...
  ✓ Member packages subscreen closed
  ✓ Tab 1 visible: true

[TEST 7] Testing Tab 2: Assigned Packages List...
  ✓ Tab 2 active
  ✓ Assigned package cards count: 6

[TEST 8] Testing Direct Detail from Tab 2...
  ✓ Direct detail opened for package

[TEST 9] Testing Back Navigation from Detail to Tab 2...
  ✓ Detail subscreen closed
  ✓ Tab 2 still active: true

[TEST 10] Testing Search Filtering...
  ✓ Empty state displayed for non-matching keyword: "Không tìm thấy học viên hoặc gói phụ trách phù hợp"

=== TEST COMPLETED 100% PASS! ALL USER STORIES VALIDATED! ===
```

### Danh sách ảnh chụp màn hình kiểm chứng (Artifacts):
- `tests/e2e/pt/screenshots/01-tab1-assigned-members.png`: Giao diện Tab 1 hiển thị danh sách học viên duy nhất với pill badge `X gói PT đang phụ trách`.
- `tests/e2e/pt/screenshots/02-member-packages-subscreen.png`: Màn hình phụ danh sách 5 gói của Lê Hoàng Nam do PT phụ trách.
- `tests/e2e/pt/screenshots/03-client-detail-from-member.png`: Chi tiết lộ trình & các buổi tập hoàn thành khi mở từ màn hình phụ.
- `tests/e2e/pt/screenshots/04-tab2-packages-list.png`: Giao diện Tab 2 "Gói đang phụ trách" hiển thị phẳng các thẻ hợp đồng gói tập.
- `tests/e2e/pt/screenshots/05-client-detail-from-tab2.png`: Chi tiết lộ trình mở trực tiếp từ Tab 2.
- `tests/e2e/pt/screenshots/06-search-empty-state.png`: Trạng thái danh sách rỗng khi tìm kiếm từ khóa không khớp.

---

## 4. Kết Luận & Bàn Giao
- Phân hệ PT02 trên ứng dụng Mobile PT đáp ứng 100% yêu cầu người dùng đề ra, đảm bảo tính phân quyền chặt chẽ (chỉ PT phụ trách mới thấy gói của học viên), giao diện chuẩn hóa và trải nghiệm điều hướng mượt mà, trực quan.

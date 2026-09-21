# Walkthrough — Chuẩn Hóa Header Giao Diện Mobile Hội Viên Đồng Bộ Với Mobile PT

**Ngày thực hiện:** 21/09/2026  
**Phân hệ phụ trách:** Mobile Member Lead (`anti-2-HV`)  
**Trạng thái kiểm thử:** ✅ PASSED 100% trên giao diện thật (Headless Chrome E2E).

---

## 1. Yêu Cầu & Mục Tiêu

Đồng bộ thiết kế thanh tiêu đề (Header) của ứng dụng Mobile Hội viên cho giống hoàn toàn với Mobile Huấn luyện viên (PT):
1. **Khối nhận diện cá nhân bên trái (`.header-left`):**
   - **Ảnh đại diện (`.header-member-avatar`):** Tròn, đường kính 48px, viền sáng `#b9e3cd`, hiển thị ảnh đại diện hội viên hoặc chữ cái viết tắt (fallback) khi chưa có ảnh.
   - **Tên thương hiệu (`.member-brand`):** `PARADISE` (màu trắng) + `GYM` (màu xanh chanh `#b2d988`).
   - **Lời chào (`h2`):** `Xin chào, ${fullName}` (ví dụ: `Xin chào, Lê Hoàng Nam`).
   - **Thông tin chi nhánh & mã hội viên (`.header-subtitle`):**
     * Icon định vị `fa-solid fa-location-dot` màu `#b9e3cd`.
     * Tên chi nhánh đăng ký (ví dụ: `Paradise Gym Quận 1`).
     * Dấu chấm ngăn cách `•`.
     * Huy hiệu mã hội viên dạng pill badge bo góc (ví dụ: `HV001`).
2. **Khối thao tác bên phải (`.header-actions`):**
   - Nút chuông thông báo vuông bo góc mềm (`.btn-icon-circle`, 44x44px), viền mờ `rgba(255, 255, 255, 0.35)`, icon `fa-solid fa-bell`.
   - Huy hiệu đếm số thông báo chưa đọc màu đỏ bo tròn (`.badge-dot-count`, ví dụ: `2`).
3. **Tính bền vững (Persistent Header):**
   - Header cố định (`position: sticky; top: 0; z-index: 80`) duy trì nhất quán trên mọi màn hình điều hướng (Trang chủ, Lịch tập, Gói của tôi, Thanh toán, Tài khoản).
   - Dọn dẹp khối `.welcome` trùng lặp trước đây tại Trang chủ.

---

## 2. Chi Tiết Thay Đổi Code

### 2.1. Cấu Trúc HTML (`frontend/mobile/member/index.html`)
- Thay thế thẻ `<header class="app-header">` cũ bằng cấu trúc chuẩn PT:
  * `.header-left`: chứa `#headerAvatar`, `#headerAvatarFallback`, `.member-brand`, `#headerMemberName`, `#headerBranchName` (`#headerBranchText`, `#headerMemberCodeBadge`).
  * `.header-actions`: chứa `#btnHeaderNotifications` dạng `.btn-icon-circle` và `#unreadBellDot` dạng `.badge-dot-count`.
- Nâng cấp phiên bản cache buster: `css/member.css?v=11`, `js/app.js?v=5`, `js/home-schedule.js?v=11`.

### 2.2. CSS Styling (`frontend/mobile/member/css/member.css`)
- Thiết kế layout `.app-header` nền xanh rừng rậm `var(--forest)` (`#185740`), padding chuẩn `12px 16px`.
- Áp dụng các token màu sắc: viền avatar `#b9e3cd`, chữ GYM `#b2d988`, viền nút chuông mờ `rgba(255, 255, 255, 0.35)`, huy hiệu mã HV `rgba(255, 255, 255, 0.18)`.
- Khắc phục giới hạn cứng `height: 60px` trong media query `@media (max-width: 620px)` giúp header hiển thị đầy đủ 3 dòng không bị che khuất.

### 2.3. Logic Ứng Dụng (`frontend/mobile/member/js/app.js` & `home-schedule.js`)
- `A.refreshPersistentHeader()`: Tự động nạp dữ liệu từ `A.profile` & `A.user`, cập nhật avatar/fallback, tên hội viên, chi nhánh và mã HV.
- `A.updateUnreadNotifications()`: Hiển thị số lượng thông báo chưa đọc vào `#unreadBellDot` (ví dụ: `2`).
- Loại bỏ khối chào mừng duplicate tại `home-schedule.js` để giao diện Trang chủ thông thoáng và liền mạch.

---

## 3. Bằng Chứng Kiểm Thử UI Thực Tế

- **Trang chủ (`#home`):** `verify_member_header_home.png`  
  *Khớp 100% với ảnh mẫu thiết kế từ HLV PT: avatar, thương hiệu PARADISE GYM, lời chào "Xin chào, Lê Hoàng Nam", chi nhánh "Paradise Gym Quận 1", badge "HV001" và chuông báo số 2.*
- **Trang Gói của tôi (`#packages/mine`):** `verify_member_header_packages.png`  
  *Header hiển thị đồng bộ, nhất quán và bền vững khi chuyển tab.*

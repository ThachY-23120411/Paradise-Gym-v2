# Báo Cáo Triển Khai: PT04-US02 — Cập Nhật Hồ Sơ Cá Nhân PT & Cloud Avatar Storage

**Ngày thực hiện:** 17/09/2026  
**Chuyên trách:** Mobile PT Lead (Tab 3) & Backend Lead (Tab 4)  
**Trạng thái:** Hoàn tất 100% & Đã vượt qua 367/367 bài kiểm thử tích hợp HTTP  

---

## 1. Mục Tiêu & Yêu Cầu Đã Thực Hiện

1. **User Story mới:** `PT04-US02 - Cập nhật hồ sơ cá nhân PT`:
   - Ảnh đại diện (`avatar_url`): Chuyển thành `USER-INPUT` + `PREFILL`. HLV có thể tải ảnh chụp thể hình chuyên nghiệp từ thiết bị (PNG/JPEG/WebP, tối đa 5MB).
   - Chuyên môn & Giới thiệu (`specialties` & `bio`): Chuyển thành `USER-INPUT` + `PREFILL`, tối đa 1.000 ký tự.
   - Email liên hệ (`email`): Chuyển thành `USER-INPUT` + `PREFILL`, kiểm tra định dạng RFC 5322.
   - Bằng cấp & Chứng chỉ (`certificates`): Tuân thủ **Phương án A** (Giữ `READONLY` trên Mobile, chỉ QTV được thêm/duyệt trên Web W05).
   - Mã PT, Họ tên, Chi nhánh, SĐT: Giữ `READONLY`.

2. **Dịch vụ Đám Mây Lưu Trữ Avatar (Cloudinary Integration & Intelligent Fallback):**
   - Tích hợp thư viện chính thức `cloudinary` v2 trong backend.
   - Xây dựng module `src/utils/cloudStorage.js`:
     - Khi phát hiện cấu hình Cloudinary trong `.env` (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` hoặc `CLOUDINARY_URL`), ảnh sẽ được nén tối ưu tự động, cắt cúp thông minh nhận diện gương mặt (`crop: 'fill', gravity: 'face'`) và lưu trữ trên CDN toàn cầu của Cloudinary.
     - **Cơ chế Fallback thông minh:** Nếu chưa cấu hình key Cloudinary trong `.env`, hệ thống tự động lưu vào thư mục cục bộ `storage/avatars/`, đảm bảo môi trường dev/staging không bị crash hay gián đoạn.

3. **Backend REST API (`backend/src/modules/core/`):**
   - Cập nhật `avatar.js`: Mở quyền cho role `PT` (trước đó chỉ có `MEMBER`), cập nhật `avatar_url` đồng bộ cho `accounts` và ghi audit log.
   - Cập nhật `mobile.js`: Bổ sung endpoint `PUT /api/v1/mobile/profile` cho phép PT cập nhật `email`, `bio`, `specialties`.

4. **Frontend SDK & Mobile PT UI (`frontend/mobile/pt/`):**
   - Cập nhật `frontend/shared/apiClient.js`: Bổ sung `apiClient.mobile.updateProfile(data)`.
   - Cập nhật `frontend/mobile/pt/index.html`:
     - Thêm nút `[ Chỉnh sửa hồ sơ cá nhân ]` tại Card Hero HLV.
     - Thêm Modal Chỉnh sửa hồ sơ `#editProfileModalBackdrop` kèm trình chọn avatar, camera badge, preview ảnh trực tiếp và các trường nhập liệu.
   - Cập nhật `frontend/mobile/pt/js/profile.js`:
     - Bắt sự kiện chọn ảnh, validate chuẩn PNG/JPG/WebP <= 5MB.
     - Xử lý submit: chuyển base64 gọi `uploadAvatar` $\rightarrow$ gọi `updateProfile` $\rightarrow$ refresh giao diện tức thì.

---

## 2. Kết Quả Kiểm Thử Tự Động

Toàn bộ 367 HTTP checks trong bộ kiểm thử `tests/web-rebuild.integration.js` đều vượt qua:
```
PASS Mobile role-scoped settings/2FA, PT-code auth, structured certificates, phone privacy, cross-home-branch students and actual statistics
PASS Mobile avatar binary upload/persistence, target-bound OTP phone change, uniqueness, stale-token rejection and server password lockout
PASS 367 HTTP checks against isolated PostgreSQL database; configured DB untouched
```

# Báo Cáo Bàn Giao: Cổng Đăng Nhập Mobile Dùng Chung & Quản Lý Thiết Bị Phiên Đăng Nhập

**Giai đoạn:** Hoàn thiện 4 quyết định kỹ thuật từ phiên Codex & Hợp nhất cổng đăng nhập Mobile  
**Ngày thực hiện:** 17/09/2026  
**Phạm vi:** Backend, Database (PostgreSQL), Frontend Mobile (Member & PT), Frontend Web (Admin QTV W05)

---

## 1. Mục Tiêu Tác Vụ Đã Thực Hiện

1. **Hợp nhất cổng đăng nhập Mobile (`/mobile/`):**
   - Hội viên (MEMBER) và Huấn luyện viên (PT) dùng chung 1 màn hình đăng nhập duy nhất tại `/mobile/`.
   - Cơ chế điều hướng tự động dựa trên vai trò (`role-based routing`):
     - Tài khoản Hội viên (`role === 'MEMBER'`) -> Tự động chuyển hướng sang `/mobile/member/`.
     - Tài khoản HLV (`role === 'PT'`) -> Tự động chuyển hướng sang `/mobile/pt/`.
   - Cơ chế bảo vệ chéo (Cross-guarding):
     - Nếu tài khoản PT cố tình vào `/mobile/member/` -> Tự động redirect về `/mobile/pt/`.
     - Nếu tài khoản Member cố tình vào `/mobile/pt/` -> Tự động redirect về `/mobile/member/`.
     - Nếu chưa đăng nhập hoặc phiên hết hạn -> Tự động redirect về `/mobile/`.

2. **Quyết định 1 (Đăng ký tài khoản Hội viên chọn chi nhánh động):**
   - Bổ sung dropdown `home_branch_id` bắt buộc khi đăng ký Hội viên trên Mobile, nạp dữ liệu động từ `GET /api/v1/branches`.

3. **Quyết định 2 (Quản lý thiết bị & Phiên đăng nhập `account_sessions`):**
   - Thêm bảng `account_sessions` trong migration `004_device_sessions.sql` ghi nhận thiết bị, IP, User-Agent, thời gian hoạt động.
   - Thêm API:
     - `GET /api/v1/auth/sessions`: Lấy danh sách thiết bị đang hoạt động, có cờ `is_current: true` cho phiên hiện tại.
     - `POST /api/v1/auth/logout-current`: Đăng xuất thu hồi phiên trên thiết bị hiện tại.
     - `POST /api/v1/auth/logout-all`: Thu hồi toàn bộ phiên trên tất cả thiết bị và tăng `session_version`.
     - `DELETE /api/v1/auth/sessions/:id`: Thu hồi phiên thiết bị cụ thể.
   - Đồng bộ 100% sơ đồ Mermaid ERD và Từ điển dữ liệu trong `docs/database/erd.md` (tuân thủ Rule 6).

4. **Quyết định 3 (Xóa badge hạng hội viên giả):**
   - Loại bỏ hiển thị `Hạng hội viên: Chưa có dữ liệu` trên Mobile Member để tránh gây nhầm lẫn khi chưa có tính năng này.

5. **Quyết định 4 (Quản lý chứng chỉ HLV trên Web QTV W05):**
   - Bổ sung giao diện CRUD chứng chỉ chuyên môn (Tên, Đơn vị cấp, Ngày cấp, Ngày hết hạn, Số hiệu) trong form HLV trên Web Admin (`W05`) cho Quản trị viên (`QTV`).
   - Cung cấp popup xem chi tiết hồ sơ & chứng chỉ ở chế độ Read-only cho Lễ tân (`RECEPTIONIST`).

---

## 2. Danh Sách File Đã Tạo & Chỉnh Sửa

| STT | File | Hành động | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| 1 | `frontend/mobile/index.html` | Tạo mới | Cổng đăng nhập dùng chung cho Member & PT với đầy đủ Password, OTP, 2FA, Kích hoạt, Đăng ký |
| 2 | `frontend/mobile/css/login.css` | Tạo mới | Giao diện chuẩn Luxury Forest Dark Theme |
| 3 | `frontend/mobile/js/login.js` | Tạo mới | Controller xử lý xác thực và phân quyền điều hướng `dispatchRole()` |
| 4 | `frontend/mobile/member/js/app.js` | Chỉnh sửa | Điều hướng về `/mobile/`, phân quyền chéo (PT redirect `/mobile/pt/`) |
| 5 | `frontend/mobile/member/js/auth-account.js` | Chỉnh sửa | Xóa badge hạng hội viên chưa có trong spec |
| 6 | `frontend/mobile/pt/js/app.js` | Chỉnh sửa | Điều hướng về `/mobile/`, phân quyền chéo (Member redirect `/mobile/member/`) |
| 7 | `frontend/mobile/pt/js/profile.js` | Chỉnh sửa | Đăng xuất chuyển hướng về `/mobile/` |
| 8 | `backend/src/db/migrations/004_device_sessions.sql` | Tạo mới | DDL tạo bảng `account_sessions` và index |
| 9 | `backend/src/db/migrate.js` | Chỉnh sửa | Đăng ký chạy additive migration `004_device_sessions.sql` |
| 10 | `backend/src/modules/core/auth.js` | Chỉnh sửa | Ghi nhận session khi đăng nhập, kiểm tra revocation trong middleware, thêm endpoints quản lý thiết bị |
| 11 | `frontend/shared/apiClient.js` | Chỉnh sửa | Bổ sung helper `getSessions()`, `logoutCurrent()`, `logoutAll()`, `revokeSession()` |
| 12 | `docs/database/erd.md` | Chỉnh sửa | Bổ sung Mermaid ERD quan hệ `accounts ||--o{ account_sessions` và Từ điển dữ liệu bảng `account_sessions` |
| 13 | `frontend/web/js/modules/ptScheduler.js` | Chỉnh sửa | Bổ sung quản lý chứng chỉ CRUD cho QTV và xem chi tiết cho Lễ tân |
| 14 | `backend/tests/mobile-refactor.cases.js` | Chỉnh sửa | Bổ sung test cases tự động kiểm tra `account_sessions`, `logout-current`, `logout-all` |

---

## 3. Kết Quả Kiểm Thử (Verification)

- Toàn bộ test suite tự động `web-rebuild.integration.js` chạy trên cơ sở dữ liệu PostgreSQL cách ly:
  - **Kết quả:** `366 HTTP checks against isolated PostgreSQL database; configured DB untouched` — **PASS 100% (0 lỗi)**.
  - Kiểm tra đầy đủ: bcrypt, JWT tokens, 2FA, OTP rate limit & resend, device registry sessions, delete session, logout-current, logout-all.

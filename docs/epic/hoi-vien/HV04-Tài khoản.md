# HV04 — Tài khoản

- **Role:** Hội viên
- **Platform:** Mobile only
- **Menu:** `HV04 · Tài khoản` (Footer tab 4)
- **Goal:** Cung cấp không gian tự phục vụ để Hội viên quản lý hồ sơ cá nhân, cập nhật thông tin liên hệ chính chủ, tùy chọn nhận thông báo và cấu hình các biện pháp bảo mật tài khoản (Xác thực 2 lớp 2FA, Đổi mật khẩu).
- **Scope:** 
  - Xem và cập nhật thông tin cá nhân: Ảnh đại diện, họ tên, email, ngày sinh, giới tính.
  - Thay đổi số điện thoại đăng nhập chính chủ kèm xác thực mã OTP.
  - Tùy chọn thông báo: Bật/tắt thông báo in-app và thông báo nhắc lịch tập tự động.
  - Cấu hình bảo mật tài khoản: Bật/tắt Xác thực 2 lớp (2FA khi đăng nhập) và đổi mật khẩu.
  - Nút Đăng xuất tài khoản chuyển tiếp sang luồng đăng xuất an toàn (`HV06-US04`).

## Thành phần giao diện (UI Components & Layout)

Không gian nghiệp vụ của Tab **`HV04 · Tài khoản`** gồm 2 khối màn hình chính:

1. **Màn hình Hồ sơ cá nhân (`HV04-US01`):**
   - Khối Header hồ sơ: Avatar, Họ và tên, Mã hội viên, Hạng hội viên (Thường, VIP).
   - Form chỉnh sửa thông tin cá nhân: Họ và tên, Email, Ngày sinh, Giới tính.
   - Luồng Đổi số điện thoại: Trường SĐT kèm nút `[ Thay đổi ]`, modal xác thực OTP đổi SĐT.

2. **Màn hình Cài đặt thông báo & Bảo mật (`HV04-US02`):**
   - Nhóm tùy chọn thông báo: Toggle Switch bật/tắt nhận thông báo In-app và Nhắc lịch PT tự động.
   - Nhóm tùy chọn bảo mật: Toggle Switch bật/tắt Xác thực 2 lớp (2FA) và nút Đổi mật khẩu.
   - Nút `[ Đăng xuất ]` ở cuối trang: Bấm để mở Popup Xác nhận Đăng xuất (`HV06-US04`).

---

## Danh sách User Stories và Giao diện tương ứng trong Epic

| User Story | Phân loại giao diện | Thành phần giao diện tương ứng | Phạm vi đặc tả UI |
| :--- | :--- | :--- | :--- |
| [HV04-US01 — Cập nhật hồ sơ cá nhân](../../user-stories/hoi-vien/HV04-Tài%20khoản/HV04-US01-Cập%20nhật%20hồ%20sơ%20cá%20nhân.md) | Màn hình Hồ sơ | **Màn hình `Hồ sơ cá nhân`** | Bảng Field-level spec màn hình hồ sơ: Avatar, Họ tên, Mã HV, Email, Ngày sinh, Giới tính, SĐT, Nút Đổi SĐT, Modal Xác thực OTP đổi SĐT và Nút CTA `[ Lưu thay đổi ]` |
| [HV04-US02 — Cài đặt thông báo và bảo mật tài khoản](../../user-stories/hoi-vien/HV04-Tài%20khoản/HV04-US02-Cài%20đặt%20thông%20báo%20và%20bảo%20mật%20tài%20khoản.md) | Màn hình Cài đặt | **Màn hình `Cài đặt & Bảo mật`** | Bảng Field-level spec màn hình cài đặt: Toggle thông báo in-app, Toggle nhắc lịch PT, Toggle 2FA, Nút Đổi mật khẩu và Nút CTA `[ Lưu cài đặt ]` |

---

## Flow specification

Mỗi User Story của `HV04` chứa precondition, trigger, main/alternate/exception flow, field-level specification chuẩn và activity diagram Mermaid swimlane.
Flow index role: [`docs/system-flow-specs/hoi-vien/`](../../system-flow-specs/hoi-vien/README.md).

## Traceability

- Menu catalog: [`docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).\n
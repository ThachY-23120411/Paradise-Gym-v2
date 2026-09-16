# HV06 — Đăng nhập

- **Role:** Hội viên
- **Platform:** Mobile only
- **Menu:** `HV06 · Đăng nhập` (Module Xác thực & Quản lý phiên)
- **Goal:** Cung cấp cơ chế xác thực danh tính an toàn, bảo mật cao cho Hội viên, hỗ trợ đăng nhập đa phương thức (Mật khẩu hoặc OTP SMS), kích hoạt bảo vệ tài khoản bằng xác thực 2 lớp (2FA), tách bạch rõ 2 màn hình riêng biệt: Kích hoạt tài khoản (cho người đã có hồ sơ tại quầy) và Tạo tài khoản mới (cho người chưa có hồ sơ), cùng quy trình kết thúc phiên làm việc (Đăng xuất) an toàn.
- **Scope:** 
  - Đăng nhập đa phương thức: SĐT + Mật khẩu, hoặc SĐT + Mã OTP qua SMS.
  - Cơ chế Xác thực 2 lớp (2FA): Bắt buộc nhập mã OTP khi đăng nhập trên thiết bị mới hoặc khi tài khoản đã bật 2FA.
  - Cơ chế bảo mật: Khóa tạm thời tài khoản sau 5 lần nhập sai liên tiếp, mã OTP hết hạn sau 60 giây.
  - Màn hình Kích hoạt tài khoản độc lập: Dành riêng cho hội viên đã có hồ sơ tại quầy lễ tân liên kết và tạo mật khẩu.
  - Màn hình Tạo tài khoản độc lập: Dành riêng cho khách hàng mới đăng ký hồ sơ cá nhân lần đầu.
  - Đăng xuất tài khoản an toàn, thu hồi session token và xóa dữ liệu cục bộ.

## Thành phần giao diện (UI Components & Layout)

Không gian nghiệp vụ của Menu **`HV06 · Đăng nhập`** là module độc lập phục vụ trước khi vào ứng dụng hoặc khi kết thúc phiên:

1. **Màn hình Đăng nhập đa phương thức & Xác thực 2 lớp (`HV06-US01`):**
   - Tab chuyển đổi phương thức đăng nhập: `Bằng Mật khẩu` và `Bằng mã OTP`.
   - Bước / Màn hình Xác thực lớp 2 (2FA Verification): Nhập OTP 6 số khi phát hiện thiết bị mới hoặc khi tài khoản bật 2FA.
   - Text links điều hướng riêng biệt: `[ Kích hoạt tài khoản ]` và `[ Tạo tài khoản mới ]`.

2. **Màn hình Kích hoạt tài khoản Hội viên (`HV06-US02`):**
   - Dành riêng cho hội viên đã đăng ký hồ sơ tại quầy lễ tân.
   - Nhập SĐT $\rightarrow$ Hiển thị thông tin hồ sơ hội viên khớp $\rightarrow$ Xác thực OTP SMS $\rightarrow$ Thiết lập mật khẩu mới $\rightarrow$ Đăng nhập.

3. **Màn hình Tạo tài khoản mới (`HV06-US03`):**
   - Dành riêng cho khách hàng mới chưa từng có hồ sơ.
   - Nhập thông tin hồ sơ (Họ tên, SĐT, Email, Mật khẩu) $\rightarrow$ Xác thực OTP SMS xác minh SĐT $\rightarrow$ Tạo hồ sơ và đăng nhập.

4. **Luồng Đăng xuất tài khoản & Popup Xác nhận (`HV06-US04`):**
   - Popup Xác nhận Đăng xuất an toàn trước khi kết thúc phiên làm việc và điều hướng về màn hình đăng nhập.

---

## Danh sách User Stories và Giao diện tương ứng trong Epic

| User Story | Phân loại giao diện | Thành phần giao diện tương ứng | Phạm vi đặc tả UI |
| :--- | :--- | :--- | :--- |
| [HV06-US01 — Đăng nhập đa phương thức và xác thực 2 lớp](../../user-stories/hoi-vien/HV06-Đăng%20nhập/HV06-US01-Đăng%20nhập%20đa%20phương%20thức%20và%20xác%20thực%202%20lớp.md) | Màn hình Đăng nhập & Màn hình 2FA | **Màn hình Đăng nhập & Bước Xác thực 2FA** | Bảng Field-level spec màn hình đăng nhập (Tab mật khẩu/OTP, SĐT, Mật khẩu, Link Kích hoạt, Link Tạo tài khoản, CTA Đăng nhập) và Bảng spec Bước xác thực 2FA (OTP 6 số, đếm ngược 60s) |
| [HV06-US02 — Kích hoạt tài khoản Hội viên bằng OTP](../../user-stories/hoi-vien/HV06-Đăng%20nhập/HV06-US02-Kích%20hoạt%20tài%20khoản%20Hội%20viên%20bằng%20OTP.md) | Màn hình Kích hoạt | **Màn hình `Kích hoạt tài khoản Hội viên`** | Bảng Field-level spec màn hình kích hoạt: SĐT tại quầy, Thông tin hồ sơ khớp, Mã OTP, Mật khẩu mới, Xác nhận mật khẩu và CTA `[ Kích hoạt & Đăng nhập ]` |
| [HV06-US03 — Tạo tài khoản và đăng ký hồ sơ mới](../../user-stories/hoi-vien/HV06-Đăng%20nhập/HV06-US03-Tạo%20tài%20khoản%20và%20đăng%20ký%20hồ%20sơ%20mới.md) | Màn hình Đăng ký | **Màn hình `Tạo tài khoản mới`** | Bảng Field-level spec màn hình tạo tài khoản: SĐT đăng ký, Họ và tên, Email, Mật khẩu mới, Xác nhận mật khẩu, Mã OTP SMS và CTA `[ Hoàn tất tạo tài khoản ]` |
| [HV06-US04 — Đăng xuất tài khoản Mobile](../../user-stories/hoi-vien/HV06-Đăng%20nhập/HV06-US04-Đăng%20xuất%20tài%20khoản%20Mobile.md) | Popup xác nhận | **Popup Xác nhận Đăng xuất** | Bảng Field-level spec cho Popup Xác nhận Đăng xuất an toàn khỏi ứng dụng |

---

## Flow specification

Mỗi User Story của `HV06` chứa precondition, trigger, main/alternate/exception flow, field-level specification chuẩn và activity diagram Mermaid swimlane.
Flow index role: [`docs/system-flow-specs/hoi-vien/`](../../system-flow-specs/hoi-vien/README.md).

## Traceability

- Menu catalog: [`docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).\n
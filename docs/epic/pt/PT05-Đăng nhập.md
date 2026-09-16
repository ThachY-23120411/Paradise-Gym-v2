# PT05 — Đăng nhập

- **Role:** Huấn luyện viên (PT)
- **Platform:** Mobile only
- **Menu:** `PT05 · Đăng nhập` (Module Xác thực & Quản lý phiên PT)
- **Goal:** Cung cấp cơ chế xác thực danh tính an toàn, bảo mật cao cho HLV (PT), hỗ trợ đăng nhập đa phương thức (Mật khẩu hoặc OTP qua SMS), kích hoạt bảo vệ tài khoản bằng xác thực 2 lớp (2FA), kích hoạt tài khoản PT lần đầu (dành cho HLV đã được Lễ tân tạo hồ sơ nhân sự) và kết thúc phiên làm việc (Đăng xuất) an toàn.
- **Scope:** 
  - Đăng nhập đa phương thức: SĐT/Mã nhân viên PT + Mật khẩu, hoặc SĐT + Mã OTP qua SMS.
  - Cơ chế Xác thực 2 lớp (2FA): Bắt buộc nhập mã OTP khi đăng nhập trên thiết bị mới hoặc khi tài khoản PT đã bật 2FA.
  - Cơ chế bảo mật: Khóa tạm thời tài khoản sau 5 lần nhập sai liên tiếp, mã OTP hết hạn sau 60 giây.
  - Kích hoạt tài khoản PT lần đầu qua OTP: HLV không tự tạo hồ sơ; bắt buộc Lễ tân hoặc Admin phải tạo hồ sơ nhân sự trên hệ thống Web trước, sau đó HLV vào app kích hoạt và tạo mật khẩu.
  - Đăng xuất tài khoản an toàn, thu hồi session token và xóa dữ liệu làm việc cục bộ.

## Thành phần giao diện (UI Components & Layout)

Không gian nghiệp vụ của Menu **`PT05 · Đăng nhập`** là module độc lập phục vụ trước khi vào ứng dụng hoặc khi kết thúc phiên:

1. **Màn hình Đăng nhập đa phương thức & Xác thực 2 lớp (`PT05-US01`):**
   - Tab chuyển đổi phương thức đăng nhập: `Bằng Mật khẩu` (SĐT/Mã PT) và `Bằng mã OTP`.
   - Bước / Màn hình Xác thực lớp 2 (2FA Verification): Nhập OTP 6 số khi phát hiện thiết bị mới hoặc khi tài khoản PT bật 2FA.
   - Text link điều hướng: `[ Kích hoạt tài khoản PT ]`. Không hỗ trợ tự tạo hồ sơ PT trên ứng dụng.

2. **Màn hình Kích hoạt tài khoản PT (`PT05-US02`):**
   - Dành cho PT đã được Lễ tân tạo hồ sơ nhân sự trên hệ thống.
   - Nhập SĐT / Mã PT $\rightarrow$ Hiển thị thông tin HLV khớp $\rightarrow$ Nhận mã OTP SMS $\rightarrow$ Thiết lập mật khẩu mới $\rightarrow$ Đăng nhập.

3. **Luồng Đăng xuất tài khoản & Popup Xác nhận (`PT05-US03`):**
   - Popup Xác nhận Đăng xuất an toàn trước khi kết thúc phiên làm việc và điều hướng về màn hình đăng nhập PT.

---

## Danh sách User Stories và Giao diện tương ứng trong Epic

| User Story | Phân loại giao diện | Thành phần giao diện tương ứng | Phạm vi đặc tả UI |
| :--- | :--- | :--- | :--- |
| [PT05-US01 — Đăng nhập đa phương thức và xác thực 2 lớp PT](../../user-stories/pt/PT05-Đăng%20nhập/PT05-US01-Đăng%20nhập%20đa%20phương%20thức%20và%20xác%20thực%202%20lớp%20PT.md) | Màn hình Đăng nhập & Màn hình 2FA | **Màn hình `Đăng nhập PT` & Bước `Xác thực 2FA`** | Bảng Field-level spec màn hình đăng nhập (Tab mật khẩu/OTP, SĐT/Mã PT, Mật khẩu, Link Kích hoạt PT, CTA Đăng nhập) và Bảng spec Bước xác thực 2FA (OTP 6 số, đếm ngược 60s) |
| [PT05-US02 — Kích hoạt tài khoản PT bằng OTP](../../user-stories/pt/PT05-Đăng%20nhập/PT05-US02-Kích%20hoạt%20tài%20khoản%20PT%20bằng%20OTP.md) | Màn hình Kích hoạt | **Màn hình `Kích hoạt tài khoản PT`** | Bảng Field-level spec màn hình kích hoạt: SĐT / Mã PT, Thông tin HLV khớp, Mã OTP, Mật khẩu mới, Xác nhận mật khẩu và CTA `[ Kích hoạt & Đăng nhập ]` |
| [PT05-US03 — Đăng xuất tài khoản PT Mobile](../../user-stories/pt/PT05-Đăng%20nhập/PT05-US03-Đăng%20xuất%20tài%20khoản%20PT%20Mobile.md) | Popup xác nhận | **Popup Xác nhận Đăng xuất** | Bảng Field-level spec cho Popup Xác nhận Đăng xuất an toàn khỏi ứng dụng PT |

---

## Flow specification

Mỗi User Story của `PT05` chứa precondition, trigger, main/alternate/exception flow, field-level specification chuẩn và activity diagram Mermaid swimlane.
Flow index role: [`docs/system-flow-specs/pt/`](../../system-flow-specs/pt/README.md).

## Traceability

- Menu catalog: [`docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).\n
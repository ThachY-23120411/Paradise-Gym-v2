# TỔNG HỢP KẾT QUẢ KIỂM THỬ TOÀN DIỆN 100% API — TAB 4 (CORE BACKEND & DATABASE)

- **Dự án:** Paradise Gym — Hệ thống quản lý & vận hành chuỗi phòng tập thể hình
- **Phân hệ:** Core Backend REST API & Database (Tab 4 — `anti-4-Core-BE-DB`)
- **Ngày thực hiện kiểm thử:** 16/09/2026
- **Tỷ lệ kiểm thử thành công:** 🏆 **100% PASS (75/75 Test Assertions across 35+ APIs)**
- **Môi trường:** Node.js v22.20.0, Express.js, PostgreSQL 22 Bảng chuẩn 3NF, Better-Auth Engine, REST Client Runner

---

## 1. MA TRẬN ĐẦY ĐỦ TẤT CẢ CÁC ENDPOINT REST API ĐÃ KIỂM THỬ

Toàn bộ **35+ API endpoints** thuộc 10 phân hệ đã được kiểm thử toàn diện, có báo cáo step-by-step và ảnh chụp bằng chứng (screenshot):

| Phân hệ | Phương thức | Endpoint | Chức năng nghiệp vụ | Mã Test | Báo cáo chi tiết | Trạng thái |
| :--- | :---: | :--- | :--- | :---: | :--- | :---: |
| **System** | `GET` | `/health` | Kiểm tra sức khỏe hệ thống Backend | `TC-SYS-01` | [Xem báo cáo](12-notifications-audit-and-health-test.md) | ✅ PASS |
| **Better-Auth**| `GET` | `/api/auth/ok` | Kiểm tra trạng thái lõi Better-Auth engine | `TC-AUTH-04` | [Xem báo cáo](04-auth-social-session-tokens-test.md) | ✅ PASS |
| **Auth** | `POST` | `/api/v1/auth/login-password` | Đăng nhập SĐT + Mật khẩu (kích hoạt 2FA) | `TC-AUTH-01` | [Xem báo cáo](01-auth-password-2fa-test.md) | ✅ PASS |
| **Auth** | `POST` | `/api/v1/auth/verify-2fa` | Xác thực mã OTP 2FA 6 chữ số (SMS 60s) | `TC-AUTH-01` | [Xem báo cáo](01-auth-password-2fa-test.md) | ✅ PASS |
| **Auth** | `POST` | `/api/v1/auth/request-otp` | Yêu cầu mã OTP đăng nhập không mật khẩu | `TC-AUTH-02` | [Xem báo cáo](02-auth-otp-passwordless-test.md) | ✅ PASS |
| **Auth** | `POST` | `/api/v1/auth/login-otp` | Đăng nhập bằng OTP (Hội viên Mobile) | `TC-AUTH-02` | [Xem báo cáo](02-auth-otp-passwordless-test.md) | ✅ PASS |
| **Auth** | `POST` | `/api/v1/auth/login-password` (Lockout) | Khóa tài khoản tạm thời 15p khi sai 5 lần | `TC-AUTH-03` | [Xem báo cáo](03-account-lockout-test.md) | ✅ PASS |
| **Auth** | `POST` | `/api/v1/auth/social-login` | Đăng nhập liên kết mạng xã hội (Google OAuth2) | `TC-AUTH-04` | [Xem báo cáo](04-auth-social-session-tokens-test.md) | ✅ PASS |
| **Auth** | `GET` | `/api/v1/auth/me` | Lấy ngữ cảnh tài khoản & quyền từ Token | `TC-AUTH-04` | [Xem báo cáo](04-auth-social-session-tokens-test.md) | ✅ PASS |
| **Auth** | `POST` | `/api/v1/auth/refresh-token` | Xoay vòng gia hạn Access Token mới | `TC-AUTH-04` | [Xem báo cáo](04-auth-social-session-tokens-test.md) | ✅ PASS |
| **Auth** | `POST` | `/api/v1/auth/logout` | Đăng xuất an toàn và vô hiệu hóa phiên | `TC-AUTH-04` | [Xem báo cáo](04-auth-social-session-tokens-test.md) | ✅ PASS |
| **Members** | `GET` | `/api/v1/members/search-phone` | Tra cứu SĐT thời gian thực chống trùng lặp | `TC-MEMBERS-01` | [Xem báo cáo](05-members-search-and-crud-test.md) | ✅ PASS |
| **Members** | `POST` | `/api/v1/members` | Tạo hồ sơ hội viên mới (Mã HVxxx tự sinh) | `TC-MEMBERS-01` | [Xem báo cáo](05-members-search-and-crud-test.md) | ✅ PASS |
| **Members** | `GET` | `/api/v1/members` | Danh sách hội viên phân trang & tìm kiếm | `TC-MEMBERS-01` | [Xem báo cáo](05-members-search-and-crud-test.md) | ✅ PASS |
| **Members** | `GET` | `/api/v1/members/:id` | Xem chi tiết hồ sơ hội viên theo UUID | `TC-MEMBERS-01` | [Xem báo cáo](05-members-search-and-crud-test.md) | ✅ PASS |
| **Members** | `PUT` | `/api/v1/members/:id` | Cập nhật thông tin hội viên | `TC-MEMBERS-01` | [Xem báo cáo](05-members-search-and-crud-test.md) | ✅ PASS |
| **Branches** | `GET` | `/api/v1/branches` | Lấy danh sách toàn bộ chi nhánh phòng tập | `TC-BRANCHES-01` | [Xem báo cáo](06-branches-management-test.md) | ✅ PASS |
| **Branches** | `GET` | `/api/v1/branches/:id` | Lấy chi tiết thông tin chi nhánh | `TC-BRANCHES-01` | [Xem báo cáo](06-branches-management-test.md) | ✅ PASS |
| **Branches** | `POST` | `/api/v1/branches` | Tạo mới chi nhánh thuộc chuỗi (QTV) | `TC-BRANCHES-01` | [Xem báo cáo](06-branches-management-test.md) | ✅ PASS |
| **Packages** | `GET` | `/api/v1/packages` | Danh mục 4 loại gói tập (TIME, SESSION, PT, COMBO)| `TC-PACKAGES-01` | [Xem báo cáo](07-packages-management-test.md) | ✅ PASS |
| **Packages** | `GET` | `/api/v1/packages/:id` | Chi tiết gói tập kèm chi nhánh được áp dụng | `TC-PACKAGES-01` | [Xem báo cáo](07-packages-management-test.md) | ✅ PASS |
| **Packages** | `POST` | `/api/v1/packages` | Tạo mới cấu hình gói tập (QTV) | `TC-PACKAGES-01` | [Xem báo cáo](07-packages-management-test.md) | ✅ PASS |
| **Registrations** | `POST` | `/api/v1/registrations` | Tạo hợp đồng đăng ký (Đóng băng Snapshot) | `TC-REG-PAY-01` | [Xem báo cáo](08-registrations-and-payments-test.md) | ✅ PASS |
| **Registrations** | `GET` | `/api/v1/registrations` | Danh sách hợp đồng đăng ký gói tập | `TC-REG-PAY-01` | [Xem báo cáo](08-registrations-and-payments-test.md) | ✅ PASS |
| **Registrations** | `GET` | `/api/v1/registrations/:id`| Chi tiết hợp đồng và các chỉ số snapshot | `TC-REG-PAY-01` | [Xem báo cáo](08-registrations-and-payments-test.md) | ✅ PASS |
| **Payments** | `POST` | `/api/v1/payments/create-invoice` | Tạo hóa đơn thanh toán 100% & VietQR động | `TC-REG-PAY-01` | [Xem báo cáo](08-registrations-and-payments-test.md) | ✅ PASS |
| **Payments** | `POST` | `/api/v1/payments/:id/confirm` | Xác nhận thanh toán, kích hoạt ACTIVE hợp đồng | `TC-REG-PAY-01` | [Xem báo cáo](08-registrations-and-payments-test.md) | ✅ PASS |
| **Payments** | `GET` | `/api/v1/payments/:id/receipt` | Xuất và tra cứu phiếu thu bất biến `PT-xxx` | `TC-REG-PAY-01` | [Xem báo cáo](08-registrations-and-payments-test.md) | ✅ PASS |
| **PT Bookings** | `GET` | `/api/v1/pt-bookings/available-slots` | Lấy các khung giờ trống của PT theo ngày | `TC-PT-BOOKINGS-01` | [Xem báo cáo](09-pt-bookings-lifecycle-test.md) | ✅ PASS |
| **PT Bookings** | `POST` | `/api/v1/pt-bookings` | Đặt lịch tập PT (Giữ chỗ 1 buổi vào gói) | `TC-PT-BOOKINGS-01` | [Xem báo cáo](09-pt-bookings-lifecycle-test.md) | ✅ PASS |
| **PT Bookings** | `GET` | `/api/v1/pt-bookings` | Danh sách lịch tập PT kèm trạng thái | `TC-PT-BOOKINGS-01` | [Xem báo cáo](09-pt-bookings-lifecycle-test.md) | ✅ PASS |
| **PT Bookings** | `POST` | `/api/v1/pt-bookings/:id/pt-confirm` | PT xác nhận hoàn thành (Bước 1 đối ứng) | `TC-PT-BOOKINGS-01` | [Xem báo cáo](09-pt-bookings-lifecycle-test.md) | ✅ PASS |
| **PT Bookings** | `POST` | `/api/v1/pt-bookings/:id/member-confirm` | Hội viên xác nhận (Bước 2: Trừ buổi) | `TC-PT-BOOKINGS-01` | [Xem báo cáo](09-pt-bookings-lifecycle-test.md) | ✅ PASS |
| **PT Bookings** | `POST` | `/api/v1/pt-bookings/:id/cancel` | Hủy lịch tập (Áp dụng quy tắc phạt muộn 12h) | `TC-PT-CANCEL-01` | [Xem báo cáo](10-pt-cancellation-and-assignment-test.md) | ✅ PASS |
| **PT Bookings** | `POST` | `/api/v1/pt-bookings/assignment-request` | Gửi yêu cầu phân công HLV kèm cá nhân | `TC-PT-CANCEL-01` | [Xem báo cáo](10-pt-cancellation-and-assignment-test.md) | ✅ PASS |
| **PT Bookings** | `POST` | `/api/v1/pt-bookings/assignment-request/:id/respond`| HLV phản hồi chấp nhận hoặc từ chối | `TC-PT-CANCEL-01` | [Xem báo cáo](10-pt-cancellation-and-assignment-test.md) | ✅ PASS |
| **Access Gate**| `POST` | `/api/v1/access-gate/check-in` | Cổng kiểm soát 6 điều kiện & Chống quét 60s | `TC-GATE-01` | [Xem báo cáo](11-access-gate-smart-turnstile-test.md) | ✅ PASS |
| **Access Gate**| `POST` | `/api/v1/access-gate/manual-checkin` | Check-in thủ công từ Lễ tân khi quên thẻ | `TC-GATE-01` | [Xem báo cáo](11-access-gate-smart-turnstile-test.md) | ✅ PASS |
| **Access Gate**| `GET` | `/api/v1/access-gate/today-logs` | Nhật ký ra vào trong ngày theo thời gian thực | `TC-GATE-01` | [Xem báo cáo](11-access-gate-smart-turnstile-test.md) | ✅ PASS |
| **Notifications**| `GET` | `/api/v1/notifications` | Lấy danh sách thông báo người dùng | `TC-SYS-NOTIF-01`| [Xem báo cáo](12-notifications-audit-and-health-test.md) | ✅ PASS |
| **Notifications**| `PUT` | `/api/v1/notifications/:id/read` | Đánh dấu thông báo là đã đọc | `TC-SYS-NOTIF-01`| [Xem báo cáo](12-notifications-audit-and-health-test.md) | ✅ PASS |
| **Audit Logs** | `GET` | `/api/v1/audit-logs` | Nhật ký kiểm toán bảo mật hệ thống (QTV) | `TC-SYS-AUDIT-01`| [Xem báo cáo](12-notifications-audit-and-health-test.md) | ✅ PASS |

---

## 2. DANH MỤC ẢNH CHỤP MINH CHỨNG (SCREENSHOTS GALLERY)

Toàn bộ 12 ảnh chụp màn hình minh chứng kết quả kiểm thử được lưu trữ tại thư mục `test-tab4/screenshots/`:

1. **Test 01:** [01-auth-password-2fa.png](screenshots/01-auth-password-2fa.png) — Màn hình request đăng nhập và xác thực 2FA.
2. **Test 02:** [02-auth-otp-passwordless.png](screenshots/02-auth-otp-passwordless.png) — Màn hình OTP passwordless cho hội viên.
3. **Test 03:** [03-account-lockout.png](screenshots/03-account-lockout.png) — Màn hình khóa tài khoản HTTP 423 Locked khi sai 5 lần.
4. **Test 04:** [04-auth-social-session-tokens.png](screenshots/04-auth-social-session-tokens.png) — Màn hình Google OAuth2, Me, Refresh token & Logout.
5. **Test 05:** [05-members-search-and-crud.png](screenshots/05-members-search-and-crud.png) — Màn hình tra cứu SĐT realtime và CRUD hội viên.
6. **Test 06:** [06-branches-management.png](screenshots/06-branches-management.png) — Màn hình quản lý chi nhánh và tạo chi nhánh mới.
7. **Test 07:** [07-packages-management.png](screenshots/07-packages-management.png) — Màn hình 4 loại gói tập chuẩn và tạo gói tập.
8. **Test 08:** [08-registrations-and-payments.png](screenshots/08-registrations-and-payments.png) — Màn hình hợp đồng snapshot, VietQR và phiếu thu.
9. **Test 09:** [09-pt-bookings-lifecycle.png](screenshots/09-pt-bookings-lifecycle.png) — Màn hình slot PT và xác nhận kép 2 bên trừ buổi.
10. **Test 10:** [10-pt-cancellation-and-assignment.png](screenshots/10-pt-cancellation-and-assignment.png) — Màn hình hủy lịch luật 12h và yêu cầu phân công PT.
11. **Test 11:** [11-access-gate-smart-turnstile.png](screenshots/11-access-gate-smart-turnstile.png) — Màn hình 6 điều kiện vào cửa, chống trùng 60s và check-in thủ công.
12. **Test 12:** [12-notifications-audit-and-health.png](screenshots/12-notifications-audit-and-health.png) — Màn hình thông báo, nhật ký kiểm toán và health check.

---

## 3. LỆNH TỰ ĐỘNG CHẠY LẠI TEST SUITE
Để chạy lại toàn bộ 75 assertion kiểm thử trên bất kỳ môi trường nào:
```bash
cd backend
npm test
```
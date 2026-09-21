# PT04-US01 Account Business UI Audit

Date: 2026-09-20T17:27:05.652Z. Result: **PASS** (scoped checks only).

Source: PT04-Tài khoản\PT04-US01-Xem hồ sơ và tùy chọn tài khoản PT.md; user-requested two-device/password regression contract.
Real Chrome 390x844, Web 1440x1000; http://localhost:3000/mobile/pt/. Database: paradise_test_34212_1789925124977. Production server code with Playwright route.continue to http://127.0.0.1:55398; no mocked responses, no writes to configured application database. Fixture notifications created through real template/send API. Profile subject: PT Account Audit / 0909000020.

## Source Action Verification

### Step 1

- Action/Input: Toggle new booking notifications
- Expected Result: PT04-US01 Main Flow 3: Save enabled for changed value
- Actual Result: notify_new_bookings=false; Save enabled
- Status: **PASS**

![Toggle new booking notifications](./step-01-toggle-preference.png)

### Step 2

- Action/Input: Click Save preferences
- Expected Result: PT04-US01 Main Flow 5: success only after API persistence
- Actual Result: Đã lưu cài đặt.
- Status: **PASS**

![Click Save preferences](./step-02-save-preference.png)

### Step 3

- Action/Input: Reload account preferences
- Expected Result: Saved switch survives reload
- Actual Result: notify_new_bookings=false
- Status: **PASS**

![Reload account preferences](./step-03-reload-preference.png)

### Step 4

- Action/Input: Change toggle before offline submission
- Expected Result: Input captured before submit
- Actual Result: notify_new_bookings=true
- Status: **PASS**

![Change toggle before offline submission](./step-04-offline-preference-input.png)

### Step 5

- Action/Input: Save while browser network is offline (no mocked response)
- Expected Result: PT04-US01 Exception Flow: error and restore last saved switch
- Actual Result: Failed to fetch
- Status: **PASS**

![Save while browser network is offline (no mocked response)](./step-05-offline-preference-reverted.png)

### Step 6

- Action/Input: Open independent second PT session
- Expected Result: Same PT is authenticated before password change
- Actual Result: PT Account Audit
- Status: **PASS**

![Open independent second PT session](./step-07-password-second-session-before.png)

### Step 7

- Action/Input: Open change password
- Expected Result: PT04-US01 change password control opens form
- Actual Result: Three password inputs visible
- Status: **PASS**

![Open change password](./step-08-open-change-password.png)

### Step 8

- Action/Input: Enter weak-password password field 1 (masked)
- Expected Result: Input recorded separately before submit
- Actual Result: Masked input matches requested boundary case
- Status: **PASS**

![Enter weak-password password field 1 (masked)](./step-09-weak-password-input-1.png)

### Step 9

- Action/Input: Enter weak-password password field 2 (masked)
- Expected Result: Input recorded separately before submit
- Actual Result: Masked input matches requested boundary case
- Status: **PASS**

![Enter weak-password password field 2 (masked)](./step-10-weak-password-input-2.png)

### Step 10

- Action/Input: Enter weak-password password field 3 (masked)
- Expected Result: Input recorded separately before submit
- Actual Result: Masked input matches requested boundary case
- Status: **PASS**

![Enter weak-password password field 3 (masked)](./step-11-weak-password-input-3.png)

### Step 11

- Action/Input: Submit weak-password
- Expected Result: User-requested password constraints: inline error, form retained, no mutation
- Actual Result: Mật khẩu cần ít nhất 8 ký tự, tối đa 72 byte, gồm chữ hoa, chữ thường và số hoặc ký tự đặc biệt.
- Status: **PASS**

![Submit weak-password](./step-12-weak-password-rejected.png)

### Step 12

- Action/Input: Enter missing-uppercase password field 1 (masked)
- Expected Result: Input recorded separately before submit
- Actual Result: Masked input matches requested boundary case
- Status: **PASS**

![Enter missing-uppercase password field 1 (masked)](./step-13-missing-uppercase-input-1.png)

### Step 13

- Action/Input: Enter missing-uppercase password field 2 (masked)
- Expected Result: Input recorded separately before submit
- Actual Result: Masked input matches requested boundary case
- Status: **PASS**

![Enter missing-uppercase password field 2 (masked)](./step-14-missing-uppercase-input-2.png)

### Step 14

- Action/Input: Enter missing-uppercase password field 3 (masked)
- Expected Result: Input recorded separately before submit
- Actual Result: Masked input matches requested boundary case
- Status: **PASS**

![Enter missing-uppercase password field 3 (masked)](./step-15-missing-uppercase-input-3.png)

### Step 15

- Action/Input: Submit missing-uppercase
- Expected Result: User-requested password constraints: inline error, form retained, no mutation
- Actual Result: Mật khẩu cần ít nhất 8 ký tự, tối đa 72 byte, gồm chữ hoa, chữ thường và số hoặc ký tự đặc biệt.
- Status: **PASS**

![Submit missing-uppercase](./step-16-missing-uppercase-rejected.png)

### Step 16

- Action/Input: Enter over-72-bytes password field 1 (masked)
- Expected Result: Input recorded separately before submit
- Actual Result: Masked input matches requested boundary case
- Status: **PASS**

![Enter over-72-bytes password field 1 (masked)](./step-17-over-72-bytes-input-1.png)

### Step 17

- Action/Input: Enter over-72-bytes password field 2 (masked)
- Expected Result: Input recorded separately before submit
- Actual Result: Masked input matches requested boundary case
- Status: **PASS**

![Enter over-72-bytes password field 2 (masked)](./step-18-over-72-bytes-input-2.png)

### Step 18

- Action/Input: Enter over-72-bytes password field 3 (masked)
- Expected Result: Input recorded separately before submit
- Actual Result: Masked input matches requested boundary case
- Status: **PASS**

![Enter over-72-bytes password field 3 (masked)](./step-19-over-72-bytes-input-3.png)

### Step 19

- Action/Input: Submit over-72-bytes
- Expected Result: User-requested password constraints: inline error, form retained, no mutation
- Actual Result: Mật khẩu cần ít nhất 8 ký tự, tối đa 72 byte, gồm chữ hoa, chữ thường và số hoặc ký tự đặc biệt.
- Status: **PASS**

![Submit over-72-bytes](./step-20-over-72-bytes-rejected.png)

### Step 20

- Action/Input: Enter confirmation-mismatch password field 1 (masked)
- Expected Result: Input recorded separately before submit
- Actual Result: Masked input matches requested boundary case
- Status: **PASS**

![Enter confirmation-mismatch password field 1 (masked)](./step-21-confirmation-mismatch-input-1.png)

### Step 21

- Action/Input: Enter confirmation-mismatch password field 2 (masked)
- Expected Result: Input recorded separately before submit
- Actual Result: Masked input matches requested boundary case
- Status: **PASS**

![Enter confirmation-mismatch password field 2 (masked)](./step-22-confirmation-mismatch-input-2.png)

### Step 22

- Action/Input: Enter confirmation-mismatch password field 3 (masked)
- Expected Result: Input recorded separately before submit
- Actual Result: Masked input matches requested boundary case
- Status: **PASS**

![Enter confirmation-mismatch password field 3 (masked)](./step-23-confirmation-mismatch-input-3.png)

### Step 23

- Action/Input: Submit confirmation-mismatch
- Expected Result: User-requested password constraints: inline error, form retained, no mutation
- Actual Result: Mật khẩu xác nhận không trùng khớp!
- Status: **PASS**

![Submit confirmation-mismatch](./step-24-confirmation-mismatch-rejected.png)

### Step 24

- Action/Input: Fill password field (redacted)
- Expected Result: Entered value captured before submission; field remains masked
- Actual Result: Password input populated and masked
- Status: **PASS**

![Fill password field (redacted)](./step-25-fill-dxcpcurrentpassword.png)

### Step 25

- Action/Input: Fill password field (redacted)
- Expected Result: Entered value captured before submission; field remains masked
- Actual Result: Password input populated and masked
- Status: **PASS**

![Fill password field (redacted)](./step-26-fill-dxcpnewpassword.png)

### Step 26

- Action/Input: Fill password field (redacted)
- Expected Result: Entered value captured before submission; field remains masked
- Actual Result: Password input populated and masked
- Status: **PASS**

![Fill password field (redacted)](./step-27-fill-dxcpconfirmpassword.png)

### Step 27

- Action/Input: Submit change password
- Expected Result: Requested regression: current session retained; old peer session revoked
- Actual Result: Đã đổi mật khẩu thành công.; current /auth/me=200; peer /auth/me=401
- Status: **PASS**

![Submit change password](./step-28-change-password-success.png)

### Step 28

- Action/Input: Reload current device after password change
- Expected Result: Current UI remains authenticated
- Actual Result: PT Account Audit
- Status: **PASS**

![Reload current device after password change](./step-29-password-current-reload-kept.png)

## State Verification

Preference success and offline rollback compared with actual checkbox DOM. No role privacy setting changed.

Old password rejected by real login API; current token accepted, peer token revoked.

Cleanup verified: {"databaseDropped":true,"serverClosed":true,"browserClosed":true,"errors":[],"ownedUiServerClosed":true,"avatarDirectoryRemoved":true}

## Cross-Role / Downstream Verification

### Step 1

- Action/Input: Other roles
- Expected Result: Account-local notification preference
- Actual Result: N/A: only notify_new_bookings changed; no phone visibility/2FA changes.
- Status: **N/A**

### Step 2

- Action/Input: Reload second device
- Expected Result: Revoked peer returns to login
- Actual Result: Login UI at http://localhost:3000/mobile/: PARADISE GYM

Hệ Thống Quản Trị Chuỗi Phòng Tập Thể Hình

Đăng nhập Hội viên & Huấn luyện viên (PT)
Bằng Mật Khẩu
Bằng Mã OTP
Số điện thoại hoặc Mã PT *
Mật khẩu *
ĐĂNG NHẬP NGAY
Chưa có mật khẩu? Kích hoạt tài khoản
Hội viên mới? Đăng ký tham gia ng
- Status: **PASS**

![Reload second device](./downstream-30-password-peer-revoked.png)

## Issues Found

No failures in executed scope.

## Final Result

**PASS**. 28 source steps, 1 downstream screenshots. Not full US certification: all operational notification event types, PT05 activation and login/2FA UI flows are outside this requested audit. Source files were not edited.

Avatar scope: real local storage upload only; no external cloud uploads. Cloud deployment/provider delivery remains unverified. OTP activation and password login used for fixture setup do not certify PT05 UI flows.

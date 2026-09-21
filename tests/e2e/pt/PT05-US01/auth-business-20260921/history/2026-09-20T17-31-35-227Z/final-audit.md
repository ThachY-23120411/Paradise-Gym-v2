# PT05 bounded auth audit - final handoff

Actual forms, real isolated API and disposable PostgreSQL; no PT tokens injected into browsers. Development OTP only, not production SMS. No HV, frontend/backend source, shared database or seed edits.

## Source Action Verification

- Activation by PT code: valid dev OTP plus new password creates ACTIVE account and authenticates the same PT. Invalid activation OTP returns 400 OTP_INVALID and leaves the account pending without a browser session.
- Password login: valid credentials authenticate; wrong password returns 401 INVALID_CREDENTIALS without a session or premature lockout.
- Passwordless login: valid dev OTP authenticates; invalid OTP returns 400 OTP_INVALID without a session.
- Enabled 2FA: real password response requires challenge, has DEVELOPMENT_ONLY delivery and server TTL 60, and grants no full session. Invalid second factor returns 400; correct OTP authenticates.

## State Verification

Activation password is hashed and verifies with bcrypt; consumed OTP is cleared. Every authenticated session belongs to the same account/PT. 2FA was enabled on that account as an explicit isolated SQL prerequisite; the enabling-settings UI was not tested.

## Cross-Role / Downstream Verification

Each successful authentication opens the real PT app with the same trainer name, PT code and branch. No member entities changed. Destination is incorrectly PT01 schedule instead of the PT06 overview required by current US01/02.

## Issues Found

1. PT activation lookup by registered phone returns 401. Entering the existing PT code recovers and allows activation. Source review: frontend/mobile/js/login.js infers MEMBER for phone identifiers in activation handlers.
2. Activation profile preview shows masked `A*** B*** T***`, no PT code, and generic `Chi nhanh Paradise` instead of the actual fixture branch. This differs from US02's name/code/branch field specification; it is a UI/API contract mismatch, not a claim that masking itself is unsafe.
3. All four successful auth flows land on schedule, not overview. Source review: frontend/mobile/pt/js/app.js initSession defaults to schedule.

Evidence is embedded in the detailed reports, with annotated screenshots. No bugs were auto-fixed.

## Final Result

| Story | Result | UI steps | Blocked | Browser errors |
| --- | --- | --- | --- | --- |
| PT05-US02 activation | FAIL | 10/13 PASS | 0 | 0 |
| PT05-US01 password/OTP/2FA | FAIL | 16/19 PASS | 0 | 0 |

Both JSON files parse; all 32 screenshot hashes match. Final visual inspection checked phone-lookup failure, incorrect profile preview, invalid activation/login/2FA OTP, invalid password, 2FA challenge and authenticated PT destination. Browser, backend and static server closed; disposable DB dropped and absence verified; cleanup errors empty. Runner exited 1 for recorded spec mismatches, not a runtime blocker.

Uncovered: production SMS/provider delivery, trusted-device behavior, OTP expiry/resend-limit exhaustion, five-attempt lockout, weak/mismatched activation-password boundaries, missing/locked/already-active profiles, network failure and settings UI for enabling 2FA. No full-US certification claimed.

- [US01 detailed report](./PT05-US01-test.md)
- [US02 detailed report](../../PT05-US02/auth-business-20260921/PT05-US02-test.md)
- [US01 source](../../../../../docs/user-stories/pt/PT05-Đăng%20nhập/PT05-US01-Đăng%20nhập%20đa%20phương%20thức%20và%20xác%20thực%202%20lớp%20PT.md)
- [US02 source](../../../../../docs/user-stories/pt/PT05-Đăng%20nhập/PT05-US02-Kích%20hoạt%20tài%20khoản%20PT%20bằng%20OTP.md)

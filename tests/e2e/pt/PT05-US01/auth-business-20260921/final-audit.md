# PT05 bounded auth audit - final handoff

> Historical audit below. After user approval, both shared-portal issues were fixed and rerun: PT05-US02 16/16 PASS (activation by phone), PT05-US01 19/19 PASS. Current evidence is in the sibling US test reports and docs/reports/tab3-mobile-pt/2026-09-21-approved-cross-role-walkthrough.md. Prior failures remain documented below for traceability.

Actual forms, real isolated API and disposable PostgreSQL; no PT tokens injected into browsers. Development OTP only, not production SMS. No HV, frontend/backend source, shared database or seed edits.

## Source Action Verification

- Activation by PT code: valid dev OTP plus new password creates ACTIVE account and authenticates the same PT. Invalid activation OTP returns 400 OTP_INVALID and leaves the account pending without a browser session.
- Password login: valid credentials authenticate; wrong password returns 401 INVALID_CREDENTIALS without a session or premature lockout.
- Passwordless login: valid dev OTP authenticates; invalid OTP returns 400 OTP_INVALID without a session.
- Enabled 2FA: real password response requires challenge, has DEVELOPMENT_ONLY delivery and server TTL 60, and grants no full session. Invalid second factor returns 400; correct OTP authenticates.

## State Verification

Activation password is hashed and verifies with bcrypt; consumed OTP is cleared. Every authenticated session belongs to the same account/PT. 2FA was enabled on that account as an explicit isolated SQL prerequisite; the enabling-settings UI was not tested.

## Cross-Role / Downstream Verification

Each successful authentication now opens the real PT06 overview with the same trainer name, PT code and branch after main's routing fix. No member entities changed. Previous schedule-routing failures and the intermediate recorder response/navigation race remain archived in history; the final run has no blocked scenarios.

## Issues Found

1. PT activation lookup by registered phone returns 401. Entering the existing PT code recovers and allows activation. Source review: frontend/mobile/js/login.js infers MEMBER for phone identifiers in activation handlers.
2. Shared activation preview displays the returned masked_name but omits returned masked_code (`PT***1`) and invents generic `Chi nhanh Paradise` although the API supplies no branch. Masking is intentional and must stay. The US02 wording requiring full name/code/branch is a separate documentation discrepancy; do not unmask private identity to satisfy that old expectation.

Both shared-portal activation issues remain FAIL pending user approval. The previously reported PT06 destination issue is resolved and verified in all four auth success flows.

Evidence is embedded in the detailed reports, with annotated screenshots. No bugs were auto-fixed.

## Final Result

| Story | Result | UI steps | Blocked | Browser errors |
| --- | --- | --- | --- | --- |
| PT05-US02 activation | FAIL | 11/13 PASS | 0 | 0 |
| PT05-US01 password/OTP/2FA | PASS | 19/19 PASS | 0 | 0 |

Both JSON files parse; all 32 screenshot hashes match. Final visual inspection checked activation/2FA overview destination, preserved activation preview/phone errors and authentication evidence. Browser, backend and static server closed; disposable DB dropped and absence verified; cleanup errors empty. Runner exited 1 solely for two retained shared-activation issues, not a runtime blocker.

## Exact Source Provenance

Private static server served E:/Desktop/para/frontend at http://127.0.0.1:63596. Starting at /mobile/pt/ naturally redirected to /mobile/ via PT app.showAuthScreen; the browser then loaded /mobile/js/login.js. No competing server or other checkout was used. Full URL/path/hash checks are in [source-provenance.json](./source-provenance.json), including both index files, PT auth.js/app.js and shared apiClient.js; every served hash equals the corresponding para disk file.

| Exact served URL | SHA256 |
| --- | --- |
| http://127.0.0.1:63596/mobile/index.html | 6c5d5218435a02b21e9236b122561e4dce77cdee4f44e14531f4a66f3f0a7d19 |
| http://127.0.0.1:63596/mobile/js/login.js | 27be09044c32dec141a6877548210c985e5794687fd380a30a8dfd5ce300e4c8 |
| http://127.0.0.1:63596/mobile/pt/index.html | a28245f04c3d3aceeea0d40070b6246a2e128a39500c24df7a4175aa4aa4907e |
| http://127.0.0.1:63596/mobile/pt/js/auth.js | 8d4ec30a1213ce00da49fdac0b7ae722cb0685baad8e79cbd1837da4a33df1ae |
| http://127.0.0.1:63596/mobile/pt/js/app.js | 196f67f21aa39e24f3718b5949dabc03c5f7d15f6eeaf964d677d38c109f5ab4 |

Exact isolated lookup API: http://127.0.0.1:63594/api/v1/auth/activation-lookup. Phone 0909210020 with portal-selected MEMBER role returns 401 INVALID_CREDENTIALS; PT001 with PT role returns 200 PENDING_ACTIVATION, masked_name A*** B*** T***, masked_code PT***1 and masked_phone 090****020, with no branch field. Full fixture-specific responses and observed document/script URLs are saved in source-provenance.json. These ephemeral servers are closed after cleanup.

Uncovered: production SMS/provider delivery, trusted-device behavior, OTP expiry/resend-limit exhaustion, five-attempt lockout, weak/mismatched activation-password boundaries, missing/locked/already-active profiles, network failure and settings UI for enabling 2FA. No full-US certification claimed.

- [US01 detailed report](./PT05-US01-test.md)
- [US02 detailed report](../../PT05-US02/auth-business-20260921/PT05-US02-test.md)
- [US01 source](../../../../../docs/user-stories/pt/PT05-Đăng%20nhập/PT05-US01-Đăng%20nhập%20đa%20phương%20thức%20và%20xác%20thực%202%20lớp%20PT.md)
- [US02 source](../../../../../docs/user-stories/pt/PT05-Đăng%20nhập/PT05-US02-Kích%20hoạt%20tài%20khoản%20PT%20bằng%20OTP.md)

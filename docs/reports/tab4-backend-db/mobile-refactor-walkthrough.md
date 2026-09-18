# Mobile Refactor Backend Walkthrough

Date: 2026-09-17. Owner: anti-4-Core-BE-DB. Scope: backend, frontend/shared, ERD and Tab4 reports only. Frontend Mobile/Web and User Story field tables belong to parent/mobile owners.

## Result

**353 HTTP checks PASS** with additional SQL/state/binary assertions on a newly created disposable PostgreSQL database. The configured application database is never used for business mutations in tests. Existing213 HTTP regression checks remain, with the old24h scheduler expectation explicitly revised to the approved specific Mobile US timing. New cases add140 HTTP checks (including isolated staff re-login).

Commands: `npm test`, `node --check` for core/shared/test JavaScript, `git diff --check`. Syntax checks passed; diff check only reported existing line-ending warnings in concurrent documentation files. No browser/UI verification claimed by Tab4.

Approved migration003 was applied locally via `npm run db:migrate` at2026-09-17 08:57 UTC. Schema readback confirmed six approved columns. `http://localhost:5000/health` returned UP/POSTGRESQL. Existing watcher retained. No live seed/reset/hash repair, profile/preference write, booking write, payment or receipt operation was invoked. Normal application background scheduler remains running.

## Approved Schema Only

- Accounts: `notify_in_app`, `notify_pt_reminders`, `notify_new_bookings`, `notify_result_reminders`, BOOLEAN NOT NULL DEFAULT TRUE. Existing `is_two_factor_enabled` reused, never duplicated.
- PT profile: `show_phone_to_members` BOOLEAN NOT NULL DEFAULT FALSE; `certificates` JSONB NOT NULL DEFAULT `[]`.
- Certificate objects: name required, optional issuer/issue date/expiry date/credential ID; max50; reject unknown keys, invalid date/type, expiry before issue. Database `valid_pt_certificates` function and `pt_certificates_structure` CHECK enforce structure even for direct SQL.
- ERD Mermaid, table fields, defaults, validation function/constraint and no-new-relationship statement updated. No certificate seed and no parsing biography into invented certificates.

## API and Security

- Own profile and server-calculated PT statistics use real joins/counters with ownership enforcement. Assigned students remain visible to their PT when home branch differs.
- GET/PUT mobile preferences persist per-role settings; unsupported keys/non-booleans reject atomically. PT phone visibility additionally requires an actual assigned-registration relationship. List, trainer detail, registration assigned_pt and availability all obey it.
- QTV can maintain structured certificates through existing personnel API; PT cannot modify core personnel/certificate data.
- PT trainer list/detail return only own personnel profile. Final tests caught and fixed an Express request-spread bug losing inherited headers in trainer detail; authorized detail returns200 and unrelated PT detail404, never500.
- Password and OTP login accept PT code; active-role checks run server-side. OTP-only login is one verified SMS; password login applies stored2FA flag. Pending MEMBER password minimum6; PT minimum8+uppercase/lowercase+digit/symbol; maximum72 UTF-8 bytes.
- OTP initial send +3 resends maximum per account/15-minute rolling window, 60s cooldown/expiry, single-use, keyed HMAC at rest. Limits survive UI reload. Five invalid attempts lock15min. Existing audit stores only purpose, never OTP/password/hash.
- Password update verifies existing hash under a row lock, tracks failed attempts and revokes previous sessions. Password login validates against locked current account state, preventing old-password/new-version races.
- Member phone change uses signed target-bound challenge and OTP delivered to the new number. Checks unique number before request and again inside atomic update. Updates existing linked identity fields, clears challenge and revokes old access/refresh tokens. Replay, target swapping and cross-account use rejected.
- Avatar upload: authenticated MEMBER, PNG/JPEG/WebP signature checks, maximum5MiB, server UUID file, existing member/account avatar_url updated transactionally. No base64 in DB or audit. Public image route has nosniff/CSP headers; PT avatar remains readonly. Filesystem storage requires deployment persistence/backups; old avatar files are not automatically pruned.
- Settlement boundary preserved: MEMBER cannot confirm CASH/BANK or use direct POST payments to activate a package. Explicit server bank configuration required; removed fallback bank identity. Missing config rolls invoice creation back with503. Bank verification adapter remains unavailable, never fake-paid.

## Bookings and Notifications

- PT cannot cancel bookings. PT notes are writable only by assigned PT; member confirmation cannot overwrite notes. Each confirmation side is once-only; deduction only after both sides, no staff impersonation. PT can record during/after the session; MEMBER after end.
- Specific HV02-US03 cancellation wins over general12h wording: upcoming BOOKED only,4h threshold, required reason<=150. Late cancellation requires `accept_late_fee:true`, remains CANCELLED, frees slot and charges one session exactly once. No Main Flow/Diagram rewritten; parent owns conflicting-spec resolution.
- Every automatic emit still requires QTV W09 enabled rule plus matching assigned active template; personal preferences can only suppress delivery, not enable it independently. Default-true preferences do not create default notifications.
- HV reminders:1-2h before start. PT reminders:15-30min before start. Scheduled personal notifications target actual participants even if a rule uses branch recipient mode. Deduplication is per role-window/reference/recipient. No24h catch-all and no delivery falsely reported outside the selected window.
- Birthday event `MEMBER_BIRTHDAY` derives from actual member DOB and home-branch timezone; first available scheduler tick on birthday day, once per member/day. Null DOB/inactive profile/branch and OFF/unconfigured/inactive-template/opt-out do not deliver. Feb29 is not silently remapped to another birthday.
- Expiry reminders at7/3/0days use paid registrations. Scheduler runs every60s; no guarantee of catch-up if service remains down throughout a reminder window. SMS/push delivery is not implied by persisted in-app notification.
- Own inbox/read/read-all retained. Reading never changes booking/assignment state.

## Verification Evidence

- Existing213 regression checks, full-payment/one-receipt/branch scope/W09 guards/device honesty retained.
- Persisted settings and2FA, invalid partial update rollback, one-SMS login, PT-code role rejection.
- Certificate API and direct SQL validation; migration rerun preserves recorded certificates/settings.
- Phone privacy at list/detail/assigned registration/availability; unrelated member denied; assigned cross-home-branch student visible.
- Statistics actual SQL parity for3 periods; member cannot access PT statistics.
- Avatar anonymous/PT/fake SVG rejection, valid binary readback and matching DB URL.
- Phone duplicate/target swap/wrong OTP/cross-account/replay/stale token rejection; atomic phone update and new login.
- Password old credential rejected after change, old sessions revoked, oversize password rejected,5-failure lockout without hash mutation.
- OTP resend cooldown/cap, expired activation and5-failure OTP lockout; PT strong password validation preserves valid challenge.
- Late cancellation no-side-effect before acknowledgement, exact counters after charge, early refund and repeat rejection; one-time dual confirmation preserves PT notes.
- Birthday no-rule/OFF/inactive template/opt-out suppression, daily dedup; HV/PT correct reminder windows; PT preferences; expiry-day0 delivery; inbox ownership/read-all.
- Missing bank config cannot create invoice row or fake settlement. All fixtures/uploads removed with the disposable database/test-only directory.

## Deferred / Not Claimed

- Signup branch/default policy, trusted-device registry/per-device logout, member tier: NO approval, NO implementation/schema additions. Current logout revokes account sessions with existing session_version, not just one device.
- Activation lookup is intentionally masked before OTP; parent approved field-table clarification, full owned profile available only after authentication.
- Actual SMS provider, bank verification, hardware/FaceID/capture/readiness adapters remain unverified/unimplemented as previously documented. Development OTP explicitly labelled; no real delivery claim.
- Phone change and avatar save are separate API transactions from the remaining profile form fields; frontend must display each persisted outcome honestly and avoid fake all-or-nothing success.

## Changed Files

1. `backend/src/config/env.js`
2. `backend/src/db/migrate.js`
3. `backend/src/db/migrations/003_mobile_preferences.sql`
4. `backend/src/modules/core/auth.js`
5. `backend/src/modules/core/avatar.js` (new)
6. `backend/src/modules/core/bookings.js`
7. `backend/src/modules/core/catalog.js`
8. `backend/src/modules/core/commerce.js`
9. `backend/src/modules/core/jobs.js`
10. `backend/src/modules/core/mobile.js` (new)
11. `backend/src/modules/core/notifications.js`
12. `backend/src/server.js`
13. `backend/src/utils/vietqr.js`
14. `backend/tests/mobile-refactor.cases.js` (new)
15. `backend/tests/web-rebuild.integration.js`
16. `frontend/shared/apiClient.js`
17. `docs/database/erd.md`
18. `docs/reports/tab4-backend-db/mobile-refactor-contracts.md` (new)
19. `docs/reports/tab4-backend-db/mobile-refactor-implementation-plan.md` (new)
20. `docs/reports/tab4-backend-db/mobile-refactor-walkthrough.md` (new)

No source outside those ownership boundaries edited by this workstream. No Main Flow, Activity Diagram, seed, Web or Mobile source changes performed.

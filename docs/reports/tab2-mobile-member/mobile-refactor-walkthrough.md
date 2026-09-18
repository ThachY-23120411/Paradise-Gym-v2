# Mobile Member Refactor Walkthrough

Status: completed for the current approved mobile scope, 2026-09-17. Scope: `frontend/mobile/member`, mobile-related docs, and integration notes. Main Flow and Activity Diagram sections were protected and not edited.

## Delivered

- Restored the complete member mobile controller set imported by `frontend/mobile/member/index.html`: `auth-account.js`, `home-schedule.js`, and `packages-notifications.js`.
- All member screen data now reads through `apiClient` from backend APIs. Empty/error/loading states are shown when API data is unavailable; no frontend mock records, fake accounts, fake packages, fake bookings, or fake notifications are rendered.
- HV06 auth supports password login, OTP login, 2FA continuation, activation lookup, activation OTP, password setup, signup pending state, and logout through server APIs.
- HV01/HV02 use API-backed registrations, PT bookings, available slots, cancellation, and member confirmation.
- HV03/HV05 use API-backed owned packages, sale packages, payment invoices, payment history, receipts, PT assignment requests, PT trainer list, and notification read/read-all state.
- HV04 uses API-backed profile, notification/security preferences, password change, phone change OTP, and avatar upload.
- MEMBER booking reminders are backend-scheduled 1-2h before start and require W09 enabled rule/template plus personal preferences.
- PT trainer experience and star rating are not displayed because the user chose to remove those hardcoded UI values.
- PT certificates are displayed only from API field `certificates`; empty means no recorded certificates.
- Signup does not silently choose a branch. The missing `home_branch_id` source remains a pending product decision.

## Verification

- `node --check` passed for all member JS modules.
- Playwright visible Chromium against `http://localhost:3000/mobile/member/` passed on 375x667, 412x915, and 768x1024:
  - no JavaScript console errors;
  - no page errors;
  - no horizontal overflow;
  - all expected modules present: `account`, `auth`, `home`, `notifications`, `packages`, `schedule`;
  - all visible touch targets meet the mobile threshold.
- Hardcode scan found no `4.9`, `128`, `5+`, `kinh nghiệm`, `VIP`, `Thường`, mock/fake data records, fixed OTP, or seeded credential rendering in member source.
- Backend integration suite passed: `PASS 353 HTTP checks against isolated PostgreSQL database; configured DB untouched`.
- Documentation guard passed: protected Main Flow, Alternate/Exception Flow, and Activity Diagram content unchanged across 29 mobile user stories.

## Pending Product Decisions

- Signup branch source for `member_profiles.home_branch_id`.
- Trusted/current-device registry for HV06 device/session UI.
- Member tier field vs hiding the tier concept entirely.

## Evidence

- Playwright screenshots: `%TEMP%/paradise-member-iphone-se.png`, `%TEMP%/paradise-member-pixel-7.png`, `%TEMP%/paradise-member-tablet.png`.
- Test script: `%TEMP%/playwright-mobile-hv-pt.js`.

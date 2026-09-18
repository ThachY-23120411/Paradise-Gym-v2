# Mobile PT Refactor Walkthrough

Status: completed for the current approved mobile scope, 2026-09-17. Scope: `frontend/mobile/pt`, mobile-related docs, and integration notes. Main Flow and Activity Diagram sections were protected and not edited.

## Delivered

- Removed the hardcoded PT experience indicator and star/review metrics from the mobile experience per user decision.
- Kept PT certificates as structured API data only. Certificates are read from `pt_profiles.certificates` through backend responses; PT cannot self-edit personnel certificates.
- PT profile preferences use persisted backend fields: booking notifications, result reminders, phone visibility to assigned members, and 2FA.
- PT booking reminders are backend-scheduled 15-30min before start and require W09 enabled rule/template plus personal preferences.
- PT phone visibility follows backend policy: member-facing APIs receive phone only when `show_phone_to_members=true` and the member is actually assigned to that PT.
- Login, OTP login, 2FA, activation, schedule, member list, notifications, profile, and overview remain API-driven through `apiClient`.
- Adjusted mobile touch ergonomics:
  - password eye buttons are 44x44;
  - PT activation link has a 44px touch area;
  - icon buttons use 44px minimum targets.

## Verification

- `node --check` passed for PT modules: `auth.js`, `app.js`, `profile.js`, `schedule.js`, `clients.js`, `notifications.js`, and `overview.js`.
- Playwright visible Chromium against `http://localhost:3000/mobile/pt/` passed on 375x667, 412x915, and 768x1024:
  - no JavaScript console errors;
  - no page errors;
  - no horizontal overflow;
  - PT app object initialized;
  - no visible small touch targets after the CSS fix.
- Hardcode scan found no `4.9`, `128`, `5+`, or PT experience/rating data rendering.
- Remaining scan matches are non-business UI text/classes: notification `preview`, activation placeholders, old `demo-` token cleanup, and fitness assessment labels.
- Backend integration suite passed: `PASS 353 HTTP checks against isolated PostgreSQL database; configured DB untouched`.

## Pending Product Decisions

- Trusted/current-device registry for PT05 device/session UI.
- Whether QTV W05 personnel screens should expose full certificate management UI in this phase. Backend/API already accepts structured certificates.

## Evidence

- Playwright screenshots: `%TEMP%/paradise-pt-iphone-se.png`, `%TEMP%/paradise-pt-pixel-7.png`, `%TEMP%/paradise-pt-tablet.png`.
- Test script: `%TEMP%/playwright-mobile-hv-pt.js`.

# W01 / W07 / W10 Audit

Date: 2026-09-17. Owner: web coordinator. This report distinguishes implemented UI, live API verification, and external integration that is not available locally.

## Source And Scope

Read Main Flow, Alternate/Exception Flows, Activity Diagram and Field-level specification of the nine stories below, their related epics and Product Spec. Routes are indexed in `docs/ui-related-screen-audit.md`. No source US or diagram was rewritten to match code.

| Story | Implementation | Evidence / boundary |
| --- | --- | --- |
| QTV-W01-US01 | Today/past date picker; four API metrics; financial KPI conditional on permission; recent access direction/result/expiry badges; timed PT list with detail navigation | Live QTV dashboard and branch switching; backend owns aggregate truth. Empty lists are actual DB state, not sample records. |
| LT-W01-US01 | Fixed branch; four desk metrics; actionable task list; red offline-device task; member/registration/PT/gate quick actions; no financial administration | Live LT dashboard and menu restrictions. Pending-registration context is consumed by Sales; booking task context is consumed by PT module. |
| QTV-W07-US01 | Actual device state and log display; no synthetic recognition, opening command, or successful hardware event | Automated physical recognition/door actuation is not configured. API explicitly refuses an untrusted simulated device event; this story is not end-to-end hardware verified. |
| LT-W07-US01 | Same actual log/telemetry display within fixed branch, without QTV configuration control | Live LT read verified. Same external hardware boundary. |
| QTV-W07-US02 | Searchable identity lookup; presence-derived IN/OUT CTA; manual form with seven specified fields; dynamic active Gym entitlement list; readonly location; date/time; required Other reason only when selected | Live search and presence, dynamic visibility/validation, cancel, responsive popup checked. Successful writes and all six entry guards are covered by backend isolated-DB verification, not by modifying live member data. |
| LT-W07-US02 | Same form with fixed branch; narrow cross-branch check-in identity API allows legitimate entitlements without granting access to another branch's full member profile | Shared live form/API contract checked; server remains authority for branch, payment, date, status, session and opening-hour conditions. |
| QTV-W07-US03 | Actual device names/heartbeat and K01 state; conditional configuration button; date <= today; nine log columns; manual source badge; immediate refresh after own write | Live read and date query checked. Today auto-refreshes every 15 seconds while visible; it is polling, not a hardware push/SSE subscription. |
| LT-W07-US03 | Same scoped history and manual action, without configuration mutation | Live LT screen, empty state and API read verified. |
| QTV-W10-US01 | Month/quarter/year segmented control; scope badge; four KPIs; three-period chart; package distribution; aggregated four-column grid; complete XLSX export | Live cash and quantity equal row sums. Download parsed with ExcelJS: four worksheets and all revenue rows. Period changes, request failure, disabled export, retry and snapshot-safe export checked. |

## Shell And Auth

- Rebuilt topbar, sidebar, tabs, branch selector, loading/error states and login; shared DevExtreme components retain actual API transport.
- QTV has 13 permitted menus; LT has eight corresponding menus. W11 requires global QTV; W10 requires financial permission.
- Password/OTP/2FA use real server responses. Only explicit development OTP delivery is shown in the development environment. No hardcoded frontend credential or fallback token exists.
- Global selection sends no branch header. Branch choices are loaded across authorized scope and remain available after selecting a branch and reloading. LT cannot change its working branch.
- Module disposal invalidates pending view updates and stops gate polling when leaving the screen.

## Executed Browser Checks

Visible Chromium against `http://localhost:3000/web/` and PostgreSQL-backed API `http://localhost:5000/api/v1`.

- Actual QTV and LT password login, QTV development 2FA, role-specific menus and logout clearing tested.
- All 13 QTV and eight LT menus loaded without browser JavaScript errors or unexpected HTTP errors after integration fixes.
- Desktop 1440px, tablet 768px and narrow 390px layouts checked. Wide grids retain internal horizontal scrolling.
- Operations test: 24 successful assertions including scoped gate lookup, dynamic Other reason, modal bounds after resize and disposal on navigation, report totals, actual XLSX parsing, period changes and failure/retry. The same live QTV session verified an existing paid registration detail, receipt member/amount, and both dashboard booking-task contexts.
- A screenshot exposed a popup width frozen at opening time. It was changed to a viewport-aware width callback and the dialog bounds assertion then passed.
- Theme typography overrides, global branch label and LT notification event-catalog permission were found during live checks and corrected.
- Final W12 contract correction: W07 readiness reads effective `status`, not raw `connection_status`; all five status labels are distinct. A focused isolated response check verifies that reachable-but-configured-OFFLINE never renders ready. Device form/detail uses actual API values and separate configuration/connectivity fields.

Local verification artifacts:

- `%TEMP%/playwright-test-paradise-menus.js`, `paradise-QTV-menus.json`, `paradise-LT-menus.json`.
- `%TEMP%/playwright-test-paradise-operations.js`, `paradise-operations-checks.json`.
- `%TEMP%/paradise-manual-desktop.png`, `paradise-manual-mobile.png`, `paradise-reports-desktop.png`, `paradise-live-report.xlsx`.

## Remaining External Boundaries

- Real SMS delivery requires provider configuration. Bank verification, camera capture, gate actuation, kiosk telemetry and physical biometric deletion still require trusted adapter implementation plus provider/device contracts and credentials. Their current API boundaries return unavailable; they are not integrations that can be enabled by setting an environment variable alone. Empty/offline/unavailable states are intentional, not fabricated success.
- Manual check-in persists a business event but must not be described as physically opening an unconnected gate.
- Hardware real-time push and final personal-data deletion procedures cannot be certified by this local UI pass.
- Commercial DevExtreme use requires an appropriate license. The existing CDN build reports its missing-license warning; this was not hidden or bypassed.

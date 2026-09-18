# Mobile PT: decisions and API gaps

2026-09-17. Owner anti-3-PT. Scope frontend/mobile/pt only. No US Main Flow or Activity Diagram edits.

## Decisions received from parent

- USER APPROVED remove experience and rating/review count. Removed literals from index.html.
- USER APPROVED structured certificates, persisted notification preferences and phone visibility. Frontend now targets `/mobile/profile`, `/mobile/preferences`, actual `certificates` array. Empty certificates show empty state, no biography-derived or fabricated entries.
- Trusted-device/current-device sessions decision pending with parent; no fabricated state.
- PT04/PT03 Field-level updates handled by parent; UI owner does not touch US. PT03 footer notification entry added to match existing written Main Flow, bell retained.

## Live verification checkpoint

Latest 2026-09-17: port5000 still returns404 for `/mobile/profile` and `/mobile/pt/statistics`; process10844 is a plain `node src/server.js` started14:52 local, not a hot-reload watcher. Core/parent must reload that process. Current source routes verified through a temporary API process with scheduler disabled:24 real-DB readonly browser checks PASS, including profile identity/certificates/preferences/inbox and all five KPI values for three periods. No live business writes/seed/reset; temporary process closed after test.

Unresolved DTO gap verified directly in `backend/src/modules/core/bookings.js`: GET `/pt-bookings/assignment-requests` SELECT omits `member_phone` and `branch_name`. PT02-US03 requires both. Pending members are not yet in assigned member list, so frontend cannot safely infer them. Core: return actual `member_profiles.phone` and joined sold branch name under ownership guard; this requires no new schema or user decision.

`playwright-test-pt-mobile-refactor.js`: real PT password login PASS; schedule, clients, overview, profile at320/390/768 =>12 geometry checks PASS; no JS errors. NOT FINAL: current running5000 returns404 `/mobile/profile` and `/mobile/pt/statistics`, so new profile/statistics integrations await Core mount/restart/migration before final rerun. No live business writes made. All PT JS node --check PASS.

`playwright-test-pt-mobile-contract.js`:40 browser assertions PASS; all API fixtures only in OS Temp. Eleven write requests intercepted (never live): notes confirmation/error, preference rollback/success, password error/success, rejection255 chars, persisted notification read/error. Same-slot cancellation/rebooking and foreign-PT exclusion, script-injection escaping,320/390/768 screenshots, five footer tabs in one row. Parent/Core: please make new routes live then main live check can finish.

## Initial inventory (superseded by decisions above)

| Fact/control | Current source | Existing storage | Decision |
| --- | --- | --- | --- |
| Experience `5+ Nam` | index.html literal | No verified structured experience field | Parent already asked; leave block until decision |
| Rating `4.9` / `128` reviews | index.html literals | No verified ratings source | Parent already asked; leave block until decision |
| NASM, university degree, CPR/AED credentials | profile.js static array | bio exists, but not verified credentials structure | Parent already asked; leave block until decision |
| Schedule notification switch | localStorage default true | No verified persistent preference field | Need choice |
| Session-result notification switch | localStorage default true | No verified persistent preference field | Need choice |
| Expose phone to assigned clients switch | localStorage default true | No verified privacy preference field | Need choice |

## Existing data: replace fabricated fallback with API/empty now

- PT code-to-phone map and five-person pre-login registry: real accounts/pt_profiles exist. Need safe auth lookup API, not unauthenticated trainer-list fallback.
- Header/name/PT code/branch/email/avatar/specialties/work shift: existing profile/account/branch fields; remove fabricated names, stock portrait, email and specialties.
- Profile assigned count `45+`: derive unique active assigned members from registrations; zero is valid, failed fetch must not display a stale count.
- Client workout/fitness history defaults: booking notes/fitness_assessment exist; use actual values or empty.
- Notification objects derived from bookings/assignment requests and local read-state: use only persisted notifications API; configured-only W09 policy must remain authoritative.

## Backend/shared owner requests

1. Login identifier supports real pt_code or phone; PT role guard. Safe activation lookup returns minimal personnel confirmation only, no whole registry. Suggested SDK auth.lookupPtActivation(identifier); need confirmed contract before wiring.
2. PT04 change-password API accepting current_password/new_password exists in UI spec but currently no mounted core route/SDK verified. Must persist hash and report failures, not timeout success.
3. PT04 is_two_factor_enabled already stored accounts: authenticated API update/get and SDK needed; preference fields above await user choice.
4. PT01 ptConfirm currently called without notes; existing SDK/backend payload support will be verified, frontend must submit workout notes.
5. PT04 own profile and PT02 assigned members/registration DTOs must include required profile metadata without exposing other PT/unassigned members or financial information.

## Additional integration findings for parent/Core

- `members.list()` returns paginated `data.items`; previous PT ignored it. Parsing fixed, requesting limit1000 for assigned list. Assignment requests also need member_phone and branch_name; pending member is not yet included in assigned members list, so cannot legitimately fill from members lookup.
- PT03 US says assignment notification -> client detail, but pending request has no assigned client detail. PT02-US03 explicitly says assignment notifications open pending requests. UI targets requests for pending event; parent interpretation needed for conflict, no Main Flow/Diagram rewrite.
- PT03 reminder US15-30min conflicts existing Product Spec24h/2h. Backend/QTV rules remain authoritative, frontend will not manufacture reminders.
- Existing SDK ptConfirm did not transmit second argument; Core contract says payload extension coming. Frontend now supplies workout_notes.
- Core activation lookup masks name/code/phone and omits branch; US requires branch confirmation. Waiting final contract/parent Field-level decision; frontend no invented branch.

## Implementation approach

Read all 6 epics and 11 PT US; retain existing jQuery mobile components, fix API authority, field validation, dual-confirmation and error states. No live business-data writes in browser verification; isolated contract fixtures only in temporary tests. Do not invent business values or seed records. Do not edit any US, database, shared client, mailbox or non-PT source.

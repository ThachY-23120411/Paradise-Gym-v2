# W02 member popup verification coordination

Owner: verification agent; source and database remain owned by main/UI agents.
UI owner: Einstein `01a0c445-9b07-70a1-803b-617d577d783e`.

Direct agent messaging is unavailable in this session. This file is the coordination handoff.

## Requested Freeze Handoff

Please provide popup root, five tab selectors, tab content root, filter inputs/apply/reset selectors, date validation selector, and retry selector. Confirm UI freeze with the current source hash in a new `ui-freeze.json` beside this report:

```json
{"confirmedBy":"Einstein","frozen":true,"membersSha256":"<SHA256 of frontend/web/js/modules/members.js>","confirmedAt":"<ISO timestamp>"}
```

Final verification must wait for this handoff. Preliminary diagnostics are not release verification.

User steering: backend agent is adding QTV-only readonly `/members/:id/overview-data`, including group registrations, invitations, bookings and community classes without schema changes. Freeze must follow API completion. Legacy payment statuses are not being repaired: verify that only confirmed successful ledger entries are displayed. Lễ tân retains its existing profile experience. Browser business requests stay GET-only; authentication is allowed.

## Documentation Finding

QTV-W02-US04 is the closest view/list mapping. Current US04 only specifies six list columns, branch scope, empty state and connection errors. W02 Epic specifies member-code quick profile, but maps US04 to "no modal" and the eye action to W04. Product spec W02 describes 360-degree profile/packages/training/access history. Five-tab popup filters/date validation do not yet have complete canonical expected results. Main agent should synchronize the affected specs; verification will not invent acceptance criteria.

## Planned Readonly Coverage

- First visible row -> actual popup; same active member identified by member_profile_id for mobile comparison.
- Five tabs, API-backed values/statuses, no inferred successful payment or FaceID enrollment.
- Input capture before apply, valid filters and reversed date validation where implemented and documented.
- Existing records only; all browser API methods other than GET/HEAD/OPTIONS aborted.
- Real network failure via request.abort (Puppeteer equivalent of Playwright route.abort), error display and retry.
- Branch A, B, ALL; narrower desktop popup; authenticated mobile business screens.
- Per-step DOM assertions and numbered rectangle screenshots; independent failures retained.
- Final run gated on explicit freeze and matching SHA256; no shared seed/reset or source changes.

## Preliminary Environment Update

Frontend 3001 / backend 5000 and QTV, HV001, LT authentication are reachable. First preliminary run completed 17 steps. A/B/ALL list comparisons and real request.abort -> visible error -> retry exercised. Screenshots saved under preliminary/.

Do not use preliminary raw PASS counts for acceptance: source changed during the run. New overview endpoint returned 404 early; later new QTV markup was served while CSS was still incomplete. Legacy LT called group-invitations and received 403. Mobile HV001 authenticated correctly; payment history showed empty. Runner initially used old popup tab selectors and checked name only inside main, missing visible Mobile header; these are harness failures, being corrected rather than reported as product defects.

Backend contract read (profile whitelist, group memberships, participant relation and read-only transaction). Source currently UI expects overview.member whereas contract says profile: integration owners must align before freeze. Session middleware heartbeat is documented by backend owner; no direct SQL or business POST/PATCH/DELETE is issued by this runner. Auth/cache tokens never written to reports.

Docs owner Rawls is updating docs/reports/tab1-web-admin/2026-09-22-member-popup-* and canonical field expectations. Await updated specs and freeze; no purchase lifecycle, no migration/seed/reset.

### Preliminary 02: concrete runtime blocker

New popup currently opens an error surface: **Route not found / Thử lại**. Real GET `/api/v1/members/:id/overview-data` returns HTTP 404 on backend 5000 for first row and HV001. This blocks five-tab content/filter validation until backend mount/restart is complete. Evidence: preliminary-02/step-05-open-same-member-popup.png. No restart performed by verification owner.

Runner selectors now match `.qtv-member-profile-tab[data-member-tab]`, `.qtv-member-profile-main`, `.qtv-member-profile-filters`, and date inputs `aria-label="Từ ngày"` / `"Đến ngày"`. Filters auto-apply; there is no Apply button. Separate input screenshots precede the second date and capture validation immediately.

Read updated QTV-W02-US04 field tables and EF03 date-error text. Rawls has resolved the initial high-level popup mapping gap; detailed area fields are still being synchronized.

### Backend Runtime Update From Main

At 19:08:26Z main restarted backend 5000 from E:/Desktop/para/backend (old PID 12468, new PID 9260), health UP, current endpoint mounted; backend isolated checks reported 30 PASS. Earlier 404 is an old-process deployment/readiness issue, not a source defect. Preserve preliminary screenshots as historical evidence. Wait for UI freeze, then integration rerun.

Same-member Mobile payment mismatch remains an independent legacy limitation: 11 confirmed_at records have no status, while Mobile filters COMPLETED. No source or data fixes by verification.

Readiness independently confirmed after restart: HV001 overview-data HTTP 200, success true, 19 registrations, 29 bookings, booking_participants_available true. No token output. Frozen backend response read and runner updated to profile/complete arrays/display_status.

UI handoff read; ui-freeze.json currently frozen:false despite handoff heading. Final run remains gated until true and matching JS/CSS hashes. Tests now cover auto-apply search, canonical display_status, registration expand/entitlements, date reverse+correction, payment-method filter (no invented payment-status select), real ledger abort/retry, five tabs, 900px viewport, branch A/B/ALL, same-member Mobile and LT retained popup. No purchases.

Final launch attempted after main freeze confirmation, correctly blocked before browser/auth: marker had returned to false and source hash was 6E797B3B9E841CC9F05EEF1DC8AE12F194EECEC930BDFE2984E114B1D0DDF616, not marker's 84AF06... (source write at local 02:11:05). ACTIVE && is_paid === true correction is present. Waiting refreshed marker; no final evidence generated on changing source.

## First Frozen Run And Supplemental Evidence

On 6E797B...: final/ has 51 steps, one product mismatch (Mobile payment history step48); zero business write attempts. Main reviewed home/ledger/narrow/rights screenshots. Verification inspected home, schedule, packages, ledger, account, reversed dates, network error, narrow viewport, and same-member mobile packages/payment screenshots. Account step15's historical filename refers to FaceID but actual assertion is identity-only/no fabricated FaceID claim; runner name corrected.

Search-clear screenshot audit found the initial clear operation left a character; old PASS was too weak. Stronger test now uses Puppeteer keyboard Control down/A/up/Backspace and asserts empty input plus full row count. search-clear-recheck/ 8/8 passed. filter-recheck/ contains an intermediate harness-only Unknown key Control+A error (Playwright syntax not accepted by Puppeteer); preserve as diagnostics, not a product bug.

supplemental/ 14/14 DOM assertions passed: completed bookings/right confirmation columns; community subtab; invitations subtab; confirmed ledger page2; pending payments subtab matched actual overview arrays. Waiting final badge freeze to recapture combined full acceptance on new source hash, preserving these runs as historical.

Lesson for main to append to skill (verification does not own skill): gate acceptance on matching frozen JS/CSS hashes and visual-audit assertions; legacy payments with confirmed_at but no status can render correctly on QTV while Mobile's COMPLETED-only filter remains empty, so distinguish QTV acceptance from cross-role parity instead of reporting all-PASS.

Acceptance run on JS6457B.../old CSS88CA... exercised 62 steps (61 PASS assertions, only Mobile ledger FAIL), including all three requested nested subtabs, completed booking confirmation columns, ledger page2 and matching inline receipt. CSS changed to D7799D... mid-run, so acceptance/ is historical. Full acceptance-frozen/ rerun started on JS6457B... + CSSD7799D... frozen19:17:30Z, now also explicit receipt close. No implementation edits by verification.

# W05/W06 rebuild audit

Owner: `frontend/web/js/modules/ptScheduler.js` only. Status: implementation and handoff finalized on 2026-09-17. Own isolated browser verification passed; coordinator additionally reports live QTV status-context checks and a passing backend HTTP suite. Evidence scopes are separated below; no claim of 100% end-to-end completion.

## Integration notice for coordinator and Planck

This worker has no callable agent messaging tool. Coordination with Planck (`01a0ae18-24cd-71b2-bf0c-32f328159640`) used the shared API contract and coordinator messages. Backend/shared/ERD ownership stays with Planck. No US, Mobile, shared API, backend, CSS or mailbox edits were made by this worker.

Contract reconciled with latest `docs/reports/tab4-backend-db/web-rebuild-api-contracts.md`, including coordinator confirmation of trainer phone lookup. Exact calls in the implementation:

- `GET /pt-bookings/trainers?branch_id=&status=` -> scoped PT array; local searchable grid. Required fields: id,pt_code,full_name,phone,email,branch_id,branch_name,specialties,status.
- `GET /pt-bookings/trainers/:id` -> fresh profile before editing.
- `POST /pt-bookings/trainers` -> full_name,phone,email,branch_id,specialties. Phone normalized from +84/spaces; name trimmed; no token or account manufactured.
- `PUT /pt-bookings/trainers/:id` -> full_name,email,branch_id,specialties; phone omitted.
- `PATCH /pt-bookings/trainers/:id/status` -> status,reason.
- `GET /pt-bookings/trainers/check-phone?phone=` -> data.exists boolean, async field validation; verification errors block submission.
- `GET /pt-bookings/available-slots?pt_id=&date=` -> data.slots with start_time,end_time,is_available; five 2h cells are the layout, only server-authorized availability enables booking.
- `GET /pt-bookings?pt_id=&branch_id=&date_from=&date_to=` for calendar; `?pt_id=&branch_id=&date=` for fresh detail; quick-action lookup uses booking_id against scoped list.
- Dashboard task lists use `GET /pt-bookings?branch_id=&status=&date=&date_from=` without `pt_id`, permitting multiple PTs inside the authorized scope. BOOKED defaults to future start times and sends today's date_from unless a date is selected; PENDING_COMPLETION has no implicit date cutoff. The visible status/date/upcoming controls reload the API. Server authorization remains authoritative; defensive client filtering also excludes wrong branch/date/status.
- `POST /pt-bookings` -> registration_id,member_id,pt_id,branch_id,booking_date,start_time,end_time,workout_notes. Availability rechecked before submission.
- `POST /pt-bookings/:id/confirm` -> staff reconciliation only. No calls to pt-confirm/member-confirm; no client-side deductions or locally fabricated confirmations.
- `POST /pt-bookings/:id/cancel` -> empty body after confirmation and fresh status check. Server owns refund/audit.
- `/members?q=&branch_id=&status=ACTIVE&page=&limit=`, `/members/:id`, `/registrations?member_id=`, `/branches` supply selectors.

## Documentation read

Full Main/Alternate/Exception Flows, Mermaid Activity Diagrams and every Field-level specification read for QTV-W05-US01..04, QTV-W06-US01..04, LT-W05-US01, LT-W06-US01..04 and LT-W01-US01 dashboard entry points. Related four epics, Product Spec 4.1-4.3, project UI and docs-sync rules read. Referenced `docs/ui-related-screen-audit.md` and `docs/open-questions.md` are absent in this checkout.

## Source conflicts to retain visibly in handoff

- QTV W06 US01 mentions Monday-Sunday per shift configuration; Product Spec 4.3 specifies Monday-Friday. Availability API remains authority; frontend will not fabricate weekend availability.
- W06 US01 says awaiting-confirmation cards have no actions, while US03 allows reconciliation of BOOKED or awaiting sessions. Calendar/list shows awaiting cards read-only; detail may expose reconciliation after session end.
- Staff US04 refunds cancellation; Product Spec general cancellation policy penalizes member late cancellations. Staff UI uses server result and never computes a fake refund.
- Historical observation only: the original backend inspected at task start had four slots, no trainer writes/staff reconciliation, and allowed QTV access to participant confirmation routes. Planck's contract supersedes that implementation. This is not a statement about the current deployed backend; coordinator's subsequent verification is recorded below.

## Story-by-story traceability

All listed stories were read in full, including their Mermaid flows. UI behavior follows these stories; source conflicts above remain documented without changing them. The table records this worker's checks and detailed proof gaps; read it together with the coordinator evidence below. A reported passing backend operation does not by itself prove every listed authorization, concurrency or accounting assertion.

| Story | Implemented fields and conditions | Actual own verification | Remaining integration proof |
| --- | --- | --- | --- |
| QTV-W05-US01 | Name/phone/branch required; email/specialties optional; active branch prefill; normalized phone + global async duplicate validation; RFC-style DevExtreme email check; cancel without save; server generates code/status/account lifecycle | Chromium required validation, duplicate number, invalid email, normalized payload, API failure preserves inputs, successful retry | Real global unique constraint, audit and account activation lifecycle |
| QTV-W05-US02 | Fresh prefill of all five fields; phone READONLY and excluded from PUT; editable branch/name/email/specialties; unchanged save disabled | Chromium immutable phone, unchanged button, edit PUT without phone | Real branch transfer scope, audit, concurrent edit handling |
| QTV-W05-US03 | Readonly trainer/current status; ACTIVE/INACTIVE/ARCHIVED select; optional reason; no-op disabled | Chromium INACTIVE PATCH with reason and refreshed grid | Persistence, history preservation, active booking prevention by backend |
| QTV-W05-US04 | All seven data columns, optional values --, status badges, search, scoped branch/status filters, add/edit/state actions, paging, loading/error/retry | Chromium rendered rows, retry after load failure; static inspection of columns and scoped query | Real API branch exclusion, filtering/search with production-size data |
| LT-W05-US01 | Same seven data fields; no create, edit, status actions or local branch selector; fixed current branch and search/state filter | Chromium RECEPTIONIST shows no add/edit actions; scoped query checked | Real LT role and cross-branch denial |
| QTV-W06-US01 | Searchable PT combobox; date/calendar hidden until selected; real day/workWeek dxScheduler plus five-row list; API-derived availability; booked/pending/completed variants and detail | Chromium initial state, five daily cells, five list rows including noon, 25 workweek cells; screenshot/pixel bounds at 1440/390px | Real scheduling feed, workday configuration, concurrent slot occupancy |
| LT-W06-US01 | Same calendar under LT branch scope; state lookup and drilldown; historical inactive PT resolved through authorized profile detail with no booking availability | Same browser schedule scenario executed with RECEPTIONIST role fixture; inactive PT task row drills down to its correct date and appointment without booking controls | Real LT role and scope enforcement |
| LT-W01-US01 -> W06 | BOOKED/PENDING_COMPLETION dashboard contexts open a scoped cross-PT list directly; explicit status/date/upcoming filters; member/code, PT, package, branch, date/time/status; detail and calendar actions; refresh after cancellation/reconciliation | Chromium two-PT upcoming list excludes past/wrong-branch/pending rows; pending list accepts both pending status aliases; status/date/upcoming controls change results; API error clears stale rows and retry restores them; detail cancellation and reconciliation each remove changed rows; inactive PT calendar drilldown; actual empty response renders empty state; no unselected PT prompt | Real dashboard-to-shell click integration, backend scope/status enforcement, live cancellation and confirmation transitions |
| QTV-W06-US02 | PT/day/slot/branch readonly; member searchable TRIGGER; package always visible DYNAMIC; excludes wrong member/PT, expired, unpaid, empty balance and wrong allowed branch; optional notes; second availability check | Chromium filtered five candidate registrations to one valid entry; created 12:00-14:00 request including workout_notes | Real transaction collision, reservation balance, audit and notifications |
| LT-W06-US02 | Same fields and checks, branch fixed to chosen authorized PT; member_id quick-action prefill; dashboard action=create opens guided PT/date/API-slot picker then US02 | Browser booking test executed as LT fixture; direct dashboard context opens guide, loads five API slots, passes noon selection into locked US02 fields, filters member registrations, cancel creates no booking | Real LT create authorization and database effects |
| QTV-W06-US03 | End-time gate; detail displays two participant timestamps and deduction status; staff POST confirm only; reload authoritative result | Chromium future button disabled; ended pending booking reconciled; request log contains no participant confirmation endpoints | Actual one-party/two-party transitions, idempotent deduction, server end-time enforcement and audit |
| LT-W06-US03 | Same reconciliation, not impersonation; completed/cancelled detail has no mutation controls | Browser reconciliation executed as LT fixture; current status read before display | Actual LT reconcile authorization and dual-confirmation transaction |
| QTV-W06-US04 | Confirmation popup; fresh status check; completed/cancelled records rejected; server cancels then list/calendar refresh; no client refund math | Chromium cancellation popup -> POST -> API-derived cancelled state | Real staff refund, audit, slot release and completed-session rejection |
| LT-W06-US04 | Same cancel confirmation and state checks for scoped booking | Browser cancellation executed as LT fixture | Actual LT authorization and refund accounting |

## Shell entry points

- Preserved `renderTrainers(containerId, context={})`, `renderSchedule(containerId, context={})`, `refresh()`.
- Trainers supports `context.action='create'`.
- Schedule supports `context.pt_id`, `context.date`, `context.booking_id`, `context.member_id`, and `context.action='create'`. A create quick action immediately opens a guided modal with required PT/date/slot fields, searchable scoped PT, date picker, and API-only dynamic available slots; Continue opens the full US02 form with locked context. Legacy string second argument still resolves as PT id.
- `context.status='BOOKED'` opens the API-backed upcoming booking list; `PENDING_COMPLETION` or `AWAITING_CONFIRMATION` opens the pending list (canonical API query PENDING_COMPLETION). Both are cross-PT within current branch scope, expose explicit filters and row detail/calendar actions, and support optional `context.date` and `context.booking_id`. `context.upcoming=false` starts BOOKED without the future-only restriction. Direct create takes precedence over status. Normal menu entry still uses the documented unselected PT state.
- Added `openCreateTrainer()`, `openTrainerSchedule(ptId,context={})`, `openBookingDetail(bookingId)`, `destroy()`.
- Reads real roles via `ParadiseApp.isAdmin()` or roles array; missing role never implies admin.

## Styling hooks

Shared hooks retained: `.view-header`, `.view-header-title`, `.view-actions`, `.card-panel`, `.filter-bar`, `.status-badge` and existing badge variants. No CSS file edited. Primary/font/theme inherited from coordinator.

Optional module hooks: `.pt-module`, `.pt-page-status`, `.pt-state`, `.pt-count`, `.pt-form-content`, `.pt-readonly`, `.pt-schedule-controls`, `.pt-schedule-content`, `.pt-appointment`, `.pt-slot-actions`, `.pt-slot-unavailable`, `.pt-calendar-summary`, `.pt-detail-error`.

Calendar time/data cells have 128px stable height and 24h labels. `#ptSelector` explicitly has `max-width:100%` as well as its preferred 330px width. Appointment actions use accessible DevExtreme icon buttons with tooltips; long names/package labels ellipsize with full-value titles and full detail view. Browser geometry confirmed appointment content fits at desktop and 390px; no page horizontal overflow. The grid uses local horizontal scrolling for narrow displays. Task view uses `#ptBookingTasksGrid` and the same shared hooks; no new CSS class support is required. Task detail/calendar actions are fixed to the right, with their visible bounds asserted at 390px.

## Verification

- `node --check frontend/web/js/modules/ptScheduler.js`: PASS.
- Isolated Chromium test through the real jQuery/DevExtreme components and real apiClient transport with intercepted test responses: PASS; 80 recorded API requests on the final run including dashboard direct-booking and status-task flows, zero page errors. Test data exists ONLY in a temporary test script, never source/application defaults. Task API fixtures intentionally return mixed statuses/branches so assertions exercise both request parameters and defensive filtering, not backend authorization.
- Test script: `C:/Users/Admin/AppData/Local/Temp/playwright-test-pt-rebuild.js`. Run from `C:/Users/Admin/.agents/skills/playwright-skill` using `node run.js <script>`. Defaults to coordinator URL (`http://localhost:3000/web/`), optionally overridden by PT_TEST_URL. Worker's temporary 3095 server was stopped after checks.
- Screenshots inspected: `C:/Users/Admin/AppData/Local/Temp/pt-rebuild-desktop.png` and `pt-rebuild-mobile.png`. Includes booked appointment, not only empty calendar.
- Task screenshots inspected after loading completed: `C:/Users/Admin/AppData/Local/Temp/pt-rebuild-tasks-desktop.png` and `pt-rebuild-tasks-mobile.png`; 1440px/390px layouts have no page overflow, with pinned detail/calendar actions visible.
- Browser checks exposed/fixed localized scheduler view-name handling and clipped appointment actions on narrow screens. Isolated browser animations are disabled for deterministic interaction checks.
- Live read-only probes: `http://localhost:5000/health` returned HTTP 200 with database POSTGRESQL; `http://localhost:3000/web/` returned HTTP 200. This does not prove functional API integration.
- Live authenticated writes, actual PostgreSQL balances/audit records, backend role enforcement and all-route acceptance were not independently verified by this worker. Coordinator owns integration; the results received at final handoff are recorded separately below.

## Coordinator verification and final handoff

Source: coordinator's direct handoff message, 2026-09-17. These are coordinator-reported results, not reruns or raw-log inspection by this worker.

- Live QTV navigation with BOOKED and PENDING_COMPLETION contexts opens `#ptBookingTasksGrid`, not the unselected-PT prompt, with zero JavaScript errors. This closes the reported QTV status-context routing gap. The message does not separately establish a live LT dashboard click test.
- Backend isolated HTTP suite: 109 checks passed, including actual PT reservation, cancellation and dual confirmation. This supplies backend-operation evidence for W06 US02/US03/US04. The exact role matrix, concurrency, audit and balance assertions are not supplied in this handoff, so no broader coverage is inferred.
- Combined handoff evidence: own isolated Chromium suite passed with 80 API requests and zero page errors; coordinator live routing checks passed; coordinator backend HTTP suite passed. These are distinct suites, not a combined end-to-end pass count.
- No further features requested. Implementation is handed back to the coordinator; no source changes were made during this final report-only update. Existing entry points, API contracts and CSS hooks above remain the integration contract.
- Detailed unverified assertions and documentation conflicts remain visible in this report for coordinator acceptance or later targeted fixes; they do not reopen implementation scope automatically.

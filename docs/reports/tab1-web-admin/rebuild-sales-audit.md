# W04/W08 Rebuild Audit

Owner: Tab1 sales module. Scope: `frontend/web/js/modules/sales.js` only. Scoped frontend handoff complete, including the 768px overflow correction. Verification provenance and residual gaps are recorded below; no claim of exhaustive coverage.

## Final Handoff (2026-09-17)

- Latest source change is the scoped responsive correction documented below. No additional features or shared CSS changes. Both entries `renderRegistrations(containerId, context)` and `renderPayments(containerId, context)`, routing context and legacy exports remain intact.
- Worker verified W04/W08 at 1440/768/390px: six combinations, no document overflow, no filter/KPI overflow, zero JavaScript errors. Specifically, W08 at 768px changed from document width 781px to **768px**. The existing screenshots and measurements are final evidence; no new business tests were needed for this handoff.
- Read parent artifact `%TEMP%/paradise-operations-checks.json`: **23 checks**, `errors:[]`, including `Authorized receipt hydrates live member and amount` and `Authorized registration detail hydrates contract and counters`. Parent additionally confirmed the existing completed payment and paid registration detail. These successful QTV checks supersede the earlier LT-scope limitation for those two read paths; they are not worker-executed checks.
- Parent reports backend **109 HTTP checks passed**, covering actual writes, receipts and concurrent confirmation. This is backend-owned evidence, not a suite rerun or independently inspected by this worker. Do not count all 109 as W04/W08-specific tests.
- Remaining qualifications: legacy null `reg_code` data needs backend-owned resolution; external bank-provider integration and exhaustive per-story end-to-end coverage are not claimed. The earlier story matrix records the checks available at that time; the parent confirmations above supplement it.
- Delivered files only: `frontend/web/js/modules/sales.js` and this audit. No mailbox, US, Mobile, backend/shared, ERD, shell or common-CSS edits. No further feature work requested or performed.

## Responsive Follow-Up (2026-09-17)

- Reproduced coordinator's `paradise-QTV-payments-768.png` issue using real LT login and the same shell: viewport 768px, document width **781px**. Filter wrappers were approximately 170px wide while the common `.filter-bar .dx-textbox` rule forced their DevExtreme children to at least 220px. The fourth control extended beyond the viewport.
- Fixed only `sales.js`: constrain module root and filter wrappers to available width; set filter widgets to width/max-width 100% and min-width 0; allow KPI tracks/cells to shrink and wrap within the available width. No shared CSS change or page-level overflow hiding.
- Browser rerun across **six menu/viewport combinations**: W04 and W08 at 1440x1024, 768x1024 and 390x1024. Every combination returned `documentOverflow:false`, filter controls contained within their wrappers, and KPI cells within the viewport. Document/body widths were 1440, 768, and 375 respectively (390px viewport has a vertical scrollbar). The table keeps its own horizontal scroll and fixed actions.
- Zero application JavaScript errors and zero attempted business writes during this layout pass. Used LT only, closed browser without logout, no QTV authentication. `node --check frontend/web/js/modules/sales.js` passed.
- Screenshots: `%TEMP%/sales-live-payments-{1440,768,390}-fixed.png` and `%TEMP%/sales-live-registrations-{1440,768,390}-fixed.png`. W08 768px and 390px screenshots visually inspected after the fix. Parent may rerun the nonempty QTV multi-menu case; no common-CSS patch is needed for this reproduced issue.

## Live Integration Delta (2026-09-17)

- Using LT `0900000002` only, via the real login UI at `http://localhost:3000/web/`. No QTV authentication or logout calls. No waiting for QTV; parent can continue its existing session.
- Browser interception blocks every non-GET business request before network dispatch. Only password login is allowed through. API GET responses are not replaced with fixture records.
- LT is scoped to Quan 1 branch `11111111-1111-1111-1111-111111111111`: live `/registrations` returns `[]`, `/payments?limit=200` returns total 0; catalog/member GETs return real rows (five members, seven packages, one trainer).
- Confirmed source of UUID/`--` discrepancy: member detail for existing `HV002` includes registration `9de594bd-1bff-4adf-b4bd-305cfc36f63a` with `reg_code:null`, sold at branch `22222222-2222-2222-2222-222222222222`. W04 previously substituted the technical UUID when no business code existed, W08 did not. Removed that substitution; missing business codes consistently show `--`. Backend must assign/backfill legitimate codes; this worker does not fabricate them or mutate records.
- Receipt rendering now uses enriched receipt DTO `reg_code`, `package_name_snapshot`, `payment_method`, `transaction_ref` when the caller only supplies payment identity. This correction is based on the actual backend receipt SELECT/contract, not a successful live receipt response. Live successful receipt/detail checks require records authorized for the testing account.

Live evidence: **28 browser assertions passed, zero application JavaScript errors**, using the actual shell, DevExtreme, shared SDK and PostgreSQL-backed GET endpoints on UI3000/API5000. Additional **3 pure DTO assertions** evaluated the captured real null-code registration: business-code lookup, registration normalization and nested-payment normalization all retain a missing code instead of presenting its UUID. No new frontend test fixtures were added.

| Area | Observed live result | Boundary |
| --- | --- | --- |
| LT login and W04 | Real password login succeeded; real scope is RECEPTIONIST/Quan 1. Eight columns, empty result, `context.status=PENDING_PAYMENT` preselected. | No QTV login, OTP request or logout. Nonempty status filtering remains prior isolated-contract evidence. |
| Member quick-create | `navigateTo('registrations',{action:'create',member_id})` hydrated real HV001 identity. Exactly five fields; required package blocks POST; real package GYM-1M gives readonly 1,000 VND and 17/10/2026 from 17/09/2026 plus 30 days. | No new registration persisted. |
| Create failure | A valid submission attempted exactly one `POST /registrations`, aborted by the browser route before dispatch. Error displayed; member/package selection retained; form and submit reenabled; no invoice/confirm followup. | This proves frontend network-failure handling, not server rollback or successful writes. |
| Catalog/list failures | Aborted `GET /packages` prevented form construction; retry restored real options. Aborted `GET /registrations` cleared W04 grid and exposed retry; retry restored the true empty result. | No fake successful responses substituted. |
| Detail/renew/PT assignment | GET of the existing HV002 registration sold at another branch returned genuine HTTP403/FORBIDDEN. Drawer displayed the localized error/retry with no detail sections; renewal and assignment did not construct editable forms. | Successful detail, renewal hydration, counters and PT choices could not be exercised on this LT dataset. Member-detail relation data is visible, but registration-detail access is sold-branch scoped. |
| W08 empty/form | Ten-column grid and three real zero KPIs. Member-context payment modal had no pending orders; readonly amount, CASH default, disabled submit, no QR and no invoice request. | No authorized pending/successful payment exists for this LT branch in the observed dataset. |
| W08 failures | Aborted `GET /payments` cleared the table and set all three KPIs to `--`; retry restored the true empty result. Reversed date range blocked requests. Aborted pending-registration GET prevented payment form construction; retry restored the disabled empty form. | No bank/confirmation/receipt request claimed as exercised. |
| Responsive | Actual form screenshots inspected at 1440x1000 and 390x844; popup stays within viewport, fields and actions do not overlap. | Desktop table deliberately scrolls horizontally; action column remains fixed. |

Final rereads still returned zero registrations and zero payments in LT scope. All non-GET business requests were blocked; the only attempted business write was the create-registration failure test. Browser closed without logout; no session revocation, seed, database reset, account/role change or business mutation occurred.

Local screenshot evidence (real LT/API data, not contract fixtures): `C:/Users/Admin/AppData/Local/Temp/sales-live-lt-create-desktop.png`, `sales-live-lt-create-mobile.png`, `sales-live-lt-payment-empty.png`, `sales-live-lt-payments-desktop.png`. The first, second and fourth were visually inspected.

Follow-up at the end of this LT pass originally included QTV detail/receipt and transactional checks; these have since been supplied by parent/backend as recorded in Final Handoff. Legacy `reg_code` resolution, external bank integration and unenumerated end-to-end cases remain qualified. No worker is waiting for authentication. `node --check` and scoped `git diff --check` passed after the source changes.

## Coordination for Planck and Coordinator

No inter-agent messaging tool is exposed in this worker session. This report is the authorized handoff channel; backend/shared/ERD remain Planck's ownership.

Initial API gap inventory (historical, superseded by Accepted API and Shell Contracts below):

- `GET /registrations`: branch-scoped full list or paginated `{items,total}`. Include `registration_code`, `member_code`, `member_home_branch_name`, `assigned_pt_code`, `assigned_pt_name`, snapshot fields and counters.
- `GET /registrations/:id`: include member, allowed branches, created-by display name, payment method/time, `gym_checkin_count`, PT counters. Existing endpoint lacks receptionist and check-in count.
- `POST /registrations`: existing request `member_id, package_id, sold_branch_id, start_date, previous_registration_id`; response is `data` directly (old frontend incorrectly expected `data.registration`). Respect explicitly supplied renewal date; validate ACTIVE package and branch scope; persist renewal relation and generate registration code.
- `POST /registrations/:id/assign-pt` proposed request `{pt_id, note}`; validate PT ACTIVE at registration branch, no existing assignment (409 on race), write audit and notification atomically.
- `GET /pt-bookings/trainers?branch_id=...&status=ACTIVE`: searchable PT choices including code, name, phone, branch and status.
- `GET /payments` proposed: branch-scoped payment list or `{items,total}`, including receipt/payment code, member name/code/phone, registration code/package name, collector name, branch name, status, amount, timestamps. Query `from_date,to_date,payment_method,status,q`.
- `POST /payments/create-invoice`: existing request plus optional `note`; MUST reuse existing live pending invoice per registration+method and prevent duplicate collections. Method currently `CASH` / `BANK_TRANSFER_VIETQR`; accept BANK_TRANSFER alias if needed. Return `{payment,vietqr}`; QR bank information must originate from backend. Transfer content per US: `{registration_code} {member_code} PARADISE`.
- `POST /payments/:id/confirm`: manual cash/bank collection only, request `{note, manual_confirmation:true}` and optional real `transaction_ref`; audit actor, no generated frontend transaction references. Return `{payment,registration,receipt}`. Completed records immutable; prevent double receipt and duplicate successful payments for one registration.
- `POST /payments/:id/check-bank-status` proposed: genuine bank status query only; never alias to confirmPayment. Return current `{payment,registration?,receipt?}`; unavailable provider must return an explicit error without mutating payment. Existing `/payments/check-bank-status` is an unsafe alias to confirmation and WILL NOT be used.
- Pending QR must expire server-side after 15 minutes. Confirming expired invoices must be rejected.
- Server must enforce role + branch scope for every endpoint; frontend sends current branch but is not an authorization boundary.

## Accepted API and Shell Contracts

Read `docs/reports/tab4-backend-db/web-rebuild-api-contracts.md`; implemented against its published contract. The proposed endpoints above are initial gap notes, superseded as follows:

- Renewal uses `POST /registrations/:id/renew` with `{package_id,start_date}`.
- Re-read latest coordinator-confirmed contract. Bank status uses `POST /payments/:id/check-bank-status`; unconfigured provider returns genuine 503 `BANK_UNAVAILABLE`. No use of old confirm alias or stored-status mobile shortcut. Mismatching payment ID or amount cannot be shown as successful. QR status polling uses `GET /payments/:id`, including server-calculated expiry.
- New invoice method is `BANK_TRANSFER` (display also accepts legacy `BANK_TRANSFER_VIETQR`). Manual transfer confirmation requires an explicit reconciliation checkbox and accepts optional actual `transaction_ref` (max100), per latest contract; frontend never invents transaction references. `note` max255 is sent on invoice/confirmation and preserved into manual reconciliation.
- Canonical types `GYM_TIME`, `GYM_SESSION`, `PT_SESSION`, `COMBO` are supported together with plural aliases. Invoice accepts `vietqr` or `qr_data`.
- List filters use `date_from,date_to`; `data.items,total,page,limit` pagination and legacy array responses are supported.
- W08 uses full paginated payment records to calculate successful totals and counts, plus pending registrations for the outstanding-order KPI. Pending order KPI is current pending scope, the allowed "as of now" variant in W08-US03.
- DTO alignment completed against core commerce source: `reg_code`, `pt_name`, `pt_code`, `created_by_name`, `progress.checkins`, `receipt_code`, `issued_by_name`, collector/branch fields. Member home branch and assignment branch names are resolved from the branch REST catalog when DTO omits their names. Remaining server persistence/provider/authorization checks belong to live integration.

Coordinator integration:

- W04: `SalesModule.renderRegistrations(containerId, context={})`.
- W04 `context.status` preselects a recognized registration status and filters the initial API result. Missing or unrecognized values select all statuses. Dashboard `{status:'PENDING_PAYMENT'}` is covered by the browser contract check.
- W08: `SalesModule.renderPayments(containerId, context={})`.
- Shared context: `member_id`; W04 `action:'create'`, optional `package_id`; `registration_id` opens detail, `action:'renew'` opens renewal, `action:'assign'` opens assignment. W08 `action:'create'` or `registration_id` opens payment; `date` pre-fills both date filters.
- Legacy `render(containerId, registrationId?, memberId?, packageId?)` is retained, with object-context support and shell `getCurrentMenu()` fallback. Member context survives quick-register/payment routes.
- Exposed helpers: `openRegistrationModal(options)`, `openRegistrationDetail(id)`, `openAssignment(id)`, `openPaymentModal(registrationId?, memberId?)`, `openReceipt(payment)`, `openManualConfirmation(payment)`, `refresh()`, `dispose()`.
- Legacy `loadRegistrationForPayment` opens payment; `resetSaleForm` opens new registration. Obsolete `setExactCash`/`addCash` exports are removed after checking there are no remaining callers.
- Shell must call `dispose()` on navigation. It clears refresh/debounce timers and owned popups. Root hooks and `status-badge badge-*` classes match coordinator contract; no global CSS or optional WebUI dependency added.

## Story Traceability

Both actors' full stories were read, including Main/Alternate/Exception flows, Mermaid diagrams and every field table. Related W04/W08 epics, Product Spec sections 2/4.2/4.3/4.4 and project UI/docs-sync rules were also read. Source US files remain unchanged.

| Story | Implemented UI and conditions | Verification status |
| --- | --- | --- |
| QTV-W04-US01 | Searchable member combobox, ACTIVE package, today date picker, readonly always-visible end date/current price. Selling branch hidden. Required validation, cancel, snapshot request; pending record opens payment. | Browser checked five fields, member prefill, today, required package, readonly price/end, POST shape and payment transition. Live persistence pending. |
| LT-W04-US01 | Same fields and flow; branch context via API client/query; no frontend role defaults or fake accounts. | Shared form contract passed. Actual LT authorization/scoping pending. |
| QTV-W04-US02 | Readonly old registration/member/end; old ACTIVE package prefill or blank if discontinued; end+1 or tomorrow defaults; editable start updates end; current price; dedicated renew API. | Browser passed both date branches, discontinued package and explicit date override request. Persistence/renewal relation pending. |
| LT-W04-US02 | Same fields/conditions with branch-scoped choices, no PT input. | Shared form contract passed. LT live endpoint pending. |
| QTV-W04-US03 | Eight columns, search/status/assignment filters, reset, 10/20/50 pagination; fixed right action column; conditional detail/renew/pay/assign. Valid context.status initializes the status filter. | Browser verified eight columns, records, Dashboard pending-status initial filtering, context and list failure/retry. Filter combinations/pagination against live dataset pending. |
| LT-W04-US03 | Same list with member-context preservation and current branch requests; load errors clear stale table. | Same browser path passed; actual branch isolation pending. |
| QTV-W04-US04 | Right drawer, member identity/home branch; package/type/period/branches/creator; 100% payment; conditional Gym/PT progress/counters and assignment. | Browser passed Gym-only, PT-only, Combo, actual checkin display, error/retry. Missing API fields remain --. |
| LT-W04-US04 | Same readonly drawer and conditional sections. | Shared browser path passed; LT real detail/receipt access pending. |
| QTV-W04-US05 | Four prefilled display fields; ACTIVE same-branch PT search; note max255; no PT disables submit; 409 refreshes and blocks resubmission. | Browser passed empty PT, excludes other branch, conflict keeps note. Successful save/notification/audit pending. |
| LT-W04-US05 | Same direct assignment within branch, server notification/audit. | Shared browser contract passed; real staff assignment pending. |
| QTV-W08-US01 | Separate ten-column grid; today/range/search/method/status filters; receipt only after success; pending check/manual reconcile; immutable successful rows. | Browser passed ten columns, receipt code, reconciliation guard and rejected mismatched bank reply. Real bank status/provider unavailable response pending. |
| LT-W08-US01 | Same controls within API scope; error/retry and empty states. | Shared browser path passed; real LT scope pending. |
| QTV-W08-US02 | Pending registration lookup; readonly identity/package/full amount; CASH default; transfer-only provider QR; note max255; backend-confirmed success; status polling/expiry. | Browser passed member context, readonly amount, CASH hides QR, transfer shows provider fields and returning CASH removes QR. Settlement/poll/expiry live pending. |
| LT-W08-US02 | Same counter flow, preserves selection on errors, submit lock and per-dialog invoice promise reuse. | Shared contract passed; idempotency and end-to-end settlement not claimed. |
| QTV-W08-US03 | Three KPIs derived from API records; successful totals/count match payment filters; current pending count/value; mutation/date/30s refresh. | Browser verified pending amount excluded from successful totals and confirmed count. Live filter/refresh integration pending. |
| LT-W08-US03 | Same calculations on scoped records, no receivable/debt KPI; failed API never invents successful zeros. | Shared UI calculation passed; live branch totals pending. |

## Specification Conflicts

- QTV/LT W08-US02 says Payment must never be pending, while W08-US01 and both Epics explicitly require pending QR and 15-minute expiry. Implement pending QR -> confirmed/expired as specified by the list/reconciliation workflow, never claim payment success before backend confirmation.
- Product Spec 4.3 describes member/PT acceptance flow only; W04-US05 explicitly adds direct staff assignment. Implement W04-US05 on the separate assignment modal; creation/renewal never chooses a PT.
- Renewal Activity Diagram simplifies start date to old end + 1; Main Flow and field spec explicitly require tomorrow when expired and allow date override. Follow the detailed rule.
- Coordinator has now created `docs/ui-related-screen-audit.md`, including W04/W08 routes and all 16 role stories. This worker read the mapping and did not edit it. `docs/open-questions.md` was absent at initial inspection.

## Verification

- `node --check frontend/web/js/modules/sales.js`: passed.
- Earlier browser contract suite: **35 assertions passed, zero JavaScript runtime errors**. Executed in isolated Playwright Chromium on the real shell and DevExtreme code with API responses intercepted only inside the test process; test fixtures were never added to frontend or database. That run includes Dashboard pending-registration context filtering on initial load. The later no-mutation live pass and its remaining gaps are recorded at the top of this report, separately from those earlier fixture-based checks.
- Verified contexts, field counts, required validation, purchase request, renewal dates/override, Gym/PT/Combo visibility, detail retry, no-trainer disable, same-branch choices, assignment conflict, distinct grids, KPI computation, payment field immutability, QR show/hide, explicit reconciliation, bank-response ID/amount guard, receipt identity and 390px modal width.
- Screenshots at 1440x1000 and 390x844 inspected. Modal is contained with nonoverlapping text; grid actions fixed to the right for horizontal overflow. Temporary artifacts: `C:/Users/Admin/AppData/Local/Temp/sales-w04-contract-desktop.png`, `sales-create-contract-mobile.png`. Screenshots contain clearly labeled QA fixtures, not production data.
- Initial real login attempt encountered backend downtime. After service restoration, the authorized LT live pass above completed with GET-only business traffic; its intentionally attempted create POST was aborted before network dispatch.
- No database reset, seed execution, real money settlement or synthetic token injection performed.
- No claim of complete end-to-end coverage.

## Handoff and Remaining Checks

- LT login and sold-branch denial were checked by this worker. Parent has now verified successful QTV receipt/detail and supplied backend-owned write/receipt/concurrent-confirmation results, as recorded in Final Handoff. Broader role/branch cases, exhaustive filter combinations and actual print dialog are not claimed by this worker.
- Banking provider is not configured: the dedicated check endpoint must return honest 503. Verify manual acknowledged receipt of funds separately; never treat a pending QR as real payment.
- Confirm `note` persistence, optional-reference manual confirmation, QR transfer content `{Mã ĐK} {Mã HV} PARADISE`, 15-minute expiry, `ACTIVE` versus future `SCHEDULED` and refreshed counters using real PostgreSQL records.
- Source/data conflicts listed above remain documentary gaps; no US, Activity Diagram, Mobile, backend/shared, shell/CSS or mailbox was changed by this worker.

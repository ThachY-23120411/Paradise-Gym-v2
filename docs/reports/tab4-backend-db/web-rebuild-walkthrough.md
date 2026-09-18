# Web Rebuild Walkthrough: Tab4

2026-09-17. Backend/shared handoff ready within the boundaries below. This is not a claim that all external integration US are complete.

## Files Delivered

| Files | Work |
| --- | --- |
| backend/src/server.js | Mounted authenticated PostgreSQL core routes, actual DB health and reminder scheduler. Old demo/memory modules remain in repository but are not mounted. |
| backend/src/db/postgres.js | Pool, PostgreSQL date/numeric parsing, transaction helper, no memory fallback. |
| backend/src/db/migrations/002_web_rebuild.sql; backend/src/db/migrate.js | Additive fields, notification_rules/device_incidents tables, payment snapshot and immutability guards, idempotent migration runner. |
| backend/src/db/seed.js | Exact authorized placeholder-hash repair/audit; correct future central seeding; guarded transactional destructive reset. |
| backend/src/utils/token.js | Access/refresh/temp token distinction, no demo token shortcuts. |
| backend/src/modules/core/auth.js | Real bcrypt, hashed expiring one-use OTP,2FA/resend, session revocation and DB-derived roles/branch scopes. |
| backend/src/modules/core/http.js; messages.js | Validation, authorization, pagination, audit/code generation and primary Vietnamese errors. |
| backend/src/modules/core/catalog.js | Members/packages/trainers/branches/accounts scoped CRUD/status; immutable identifiers and administrator safety. |
| backend/src/modules/core/commerce.js | Registration snapshots/renewal/assignment; full payment/intent/receipt lifecycle; honest bank boundary. |
| backend/src/modules/core/bookings.js | Slots/collisions/entitlement, reservation/refund counters, separate dual confirmations, staff reconciliation, mobile PT assignment. |
| backend/src/modules/core/operations.js | Exact W01/W10 DTOs, branch stats, gate history/presence/minimal cross-branch lookup and audited manual decisions. |
| backend/src/modules/core/notifications.js; jobs.js | Templates/rules/events/history/manual in-app send, transactional dispatch and deduplicated reminders. |
| backend/src/modules/core/devices.js | Device config/incident/audit DTOs, consent evidence and revocation; no fake telemetry/enrollment. |
| backend/tests/web-rebuild.integration.js; backend/package.json | Default npm test isolated PostgreSQL suite; db:migrate and scoped repair scripts. Legacy test retained separately, not used for verification. |
| frontend/shared/apiClient.js | Existing namespaces extended; ALL normalization; optional2FA resend token/activation password; gate cross-branch APIs. |
| docs/database/erd.md | Migration002 columns/FKs/indexes/functions/triggers, added tables and Mermaid relationships. |
| docs/reports/tab4-backend-db/web-rebuild-api-contracts.md; web-rebuild-implementation-plan.md; web-rebuild-walkthrough.md | Shared contracts, execution plan, evidence/coverage/gaps. |
| backend/.env (local ignored file) | Explicit AUTH_OTP_MODE=development for authorized local browser checks; not production SMS delivery. |

## Verification

`npm test`: **PASS213 HTTP checks**, plus direct SQL, scheduler and final notification-policy assertions. Creates `paradise_test_<pid>_<timestamp>`, applies001/002 (002 twice to verify idempotence), inserts test-only fixtures and drops only that generated DB in finally. No current business records are used as fixtures or reset/reseeded.

- Real bcrypt, rejected demo/temp-as-access tokens; explicit development OTP,2FA resend/single-use and missing-provider503.
- Scoped reads/writes, duplicate phone, immutable phone/price snapshots, package enum aliases and role/branch guards.
- Exact100% payment, DB rejection of completed-payment mutation, idempotent and concurrent confirmation with one receipt; no fabricated bank transaction reference.
- Minimal cross-branch gate without broad W02 profile access; duplicate protection, daily deduction, expired OUT, member-filtered history and today-only behavior.
- Precise persisted gate denials: expired, unpaid, wrong branch, no Gym entitlement, exhausted sessions, future start, inactive member/branch, closed hours and duplicate. Response reason equals stored log reason.
- PT reservation/refund counters, competing same-slot booking, date filters, dual confirmation and staff reconciliation leaving missing mobile confirmations NULL; linked renewal.
- Configured-only notification delivery: no rule/OFF/inactive assigned template inserts zero rows even with caller title/body. Positive template/recipient roles/modes/branch isolation/dedup and partial W09 toggles;24h/2h reminder and7-day expiry trigger/deduplication checks; consent evidence/audit, honest device status/incidents and unavailable capture/test.
- Dashboard/report financial RBAC, account stats/self-lock/session revocation, actual audit date/action filters, device/incident/consent DTO joins.
- `node --check` passed all changed core modules, server/token/DB utilities, suite and shared SDK.

### W12 Status Correction

Follow-up limited to backend/src/modules/core/devices.js, operations.js, backend/tests/web-rebuild.integration.js, ERD semantics and Tab4 reports. No frontend/web/shared SDK change needed and no new DDL.

- Validated POST/PUT status now persists in devices.status, returned verbatim as configured_status and recorded in configuration audit. OFFLINE/ERROR/PENDING_SYNC are no longer silently ignored. Omitted update preserves status; invalid/null/numeric status and invalid enabled are400 without write/audit.
- New connection_status is derived only from administrative enablement, trustworthy heartbeat freshness and unresolved last_error. Effective status preserves compatibility and combines connectivity with the configured restriction. Manual ONLINE without heartbeat remains PENDING_SYNC; stale/future heartbeat is OFFLINE, unresolved telemetry error remains ERROR. No admin update modifies heartbeat/sync/error evidence.
- Tests cover manual status persistence, audit round-trip, create/update rejection, disabled-device reenable with enabled:true/status:ONLINE, no/stale/fresh/future heartbeat, observed-error precedence, preserved telemetry and matching dashboard offline counts. Hardware test/READY remains503.
- The isolated suite grew from115 to180 HTTP checks (+65), including explicit ip_address:null clearing verified in write response, detail, PostgreSQL and audit. Fresh/error telemetry was inserted directly ONLY into the disposable test DB to exercise derivation. Live business/device records were not modified. Editor prefill contract is configured_status; show connection_status/effective status separately, and gate readiness prioritizes effective status.
- A concurrent notifications.js edit initially introduced default transactional notifications. The final user decision below supersedes that behavior: default dispatch is removed, while new event types and linked business calls remain. The suite asserts exactly one PAYMENT_CONFIRMED notification for the tested payment ID/configured template.
- Final parent-reported frontend evidence:12 focused checks passed (11 live-form/read-only or aborted-PUT checks, plus1 isolated effective-status OFFLINE / connection-status ONLINE readiness case). Parent confirms gate prioritizes effective status and handles all5 labels without false ONLINE. These are frontend-owner results, separate from the180 PostgreSQL HTTP checks run by Tab4. Narrow W12 handoff complete; no further features added.

### Post-Concurrency Security Correction

Scope: backend/src/modules/core/commerce.js, notifications.js, messages.js, integration test and Tab4 reports only. Current files were reread before editing. No wholesale reversion, DDL, mobile/web edit, mailbox clearing or live business writes.

- Shared settlementAuthority guard now runs at confirmation and before atomic POST /payments creates an invoice. Requires real staff active role plus financial permission; existing paymentAccess enforces branch scope. MEMBER receives403 PAYMENT_CONFIRMATION_FORBIDDEN even for own invoices. User-supplied manual_confirmation, bank reference, provider_verified, status or collected_by cannot constitute trusted settlement evidence. Existing MEMBER bank-intent creation and receipt reads remain supported; MEMBER cash invoice creation stays forbidden.
- Tests use an authenticated MEMBER owning CASH and BANK_TRANSFER registrations/invoices. Both methods reject manual-flag-only, reference-only and forged combined claims; direct POST /payments rejects before invoice creation and when an invoice already exists. SQL snapshots prove unchanged registrations/payment rows, zero new receipts/notifications/audit, and no activation. Staff confirmations subsequently complete normally, issue one receipt, and retain authorized member receipt reads. Repeated MEMBER confirm after staff completion also rejects without effects.
- The initial security correction restricted fallback template selection to event branch OR NULL/global. This historical fallback implementation and its fallback-success tests have now been replaced by the final configured-only policy below; no implicit fallback remains.
- That security-correction run passed206 HTTP checks (+26 from180), plus direct SQL assertions. Settlement guards, concurrent cancel/read-all and mobile changes remain intact in the final213-check run.

### Final User Decision: Configured-Only Notifications

Explicit decision: "Chi gui khi QTV cau hinh bat". Policy is resolved, not an open coordination question. Narrow changes: backend/src/modules/core/notifications.js, backend/tests/web-rebuild.integration.js and these three Tab4 reports. No DDL/ERD structure changes or live business writes.

- emit returns0 without a branch or stored rule, with an OFF rule, or with an inactive assigned template. It never falls back to caller title/body, another template or hardcoded defaults. Removed dead defaultEventTemplates and fallback selection. The assigned active template must match the event and be global or belong to the event branch.
- Enabled configured delivery retains recipient roles, DIRECT/BRANCH modes, active-account filtering, configured template rendering and per-recipient deduplication. All event types and linked business emit calls are retained. Explicit QTV manual send, registration cancel and inbox read-all routes are unchanged. MEMBER settlement security guards remain enforced.
- Tests prove zero persisted notifications from preceding unconfigured business flows and no-rule emission for every catalog event, even with caller text. Foreign/global/local templates alone do not enable dispatch. OFF and inactive-template states remain silent despite other active templates. Positive checks verify assigned template content, correct direct/broadcast recipients, cross-branch template rejection, deduplication and W09 toggle round-trip.
- Full isolated suite: **PASS213 HTTP checks** (+7 from206) plus direct SQL/policy/scheduler assertions. Own-MEMBER CASH/BANK negative tests and staff positive settlement tests still pass. No live seed/data/telemetry mutation or web/mobile source edit.

The suite caught and fixed two actual write-path errors: invoice SQL parameter inference (42P08) and gate SQL date alias (42601). Subsequent full runs passed. Expected SMS/BANK/DEVICE503 console lines are negative assertions, not test failures.

Coordinator independently reported an earlier109-check pass and13QTV/8LT route smoke checks without JS errors. Browser/UI evidence belongs to coordinator, not this backend worker.

## US Coverage and Gaps

| Area | Implemented backend behavior | Residual boundary |
| --- | --- | --- |
| W01 / LT overview | Exact scoped metrics/tasks/bookings/access DTOs; honest device heartbeat count | Web layout/browser checks owned by coordinator. |
| W02 / LT members | Search/create/detail/update/status, consent/history/biometric flag, duplicate and home-branch scope checks | No actual capture provider. |
| W03 packages | Catalog CRUD/status, type-specific validation, branch aliases, snapshot preservation | Existing historical values kept. |
| W04 / LT sales | New registration, list/detail/progress, linked renewal and staff PT assignment | Freeze/transfer/refunds excluded. Concurrent registration-cancel endpoint preserved; paid-cancellation policy remains OPEN-04 and is not certified by the narrow security fix. |
| W05 trainers | Scoped CRUD/check-phone/status and account linkage | No hard delete or invented resolution of future bookings. |
| W06 / LT schedule | Fixed slots/collisions, paid entitlement, hold/refund, cancel, dual completion/reconciliation | Workday wording conflict resolved by stored work_days, default MON_TO_FRI. Full mobile UI regression not performed. |
| W07 / LT gate | Real manual checks/denial audit, history/date/member filters, cross-branch minimal lookup, presence, mandatory policies | **Automatic hardware US01, physical door operation, offline event ingestion and K01 display NOT IMPLEMENTED/verified.** |
| W08 / LT payments | Full collection/intent/expiry/receipt/history/stats and staff manual bank confirmation evidence | **Bank reconciliation adapter NOT IMPLEMENTED.** QR URL is not payment proof. |
| W09 / LT history | Templates/rules/event catalog/history, configured-only in-app dispatch/manual send, reminder worker/deduplication; final QTV opt-in policy enforced | Legacy templates not silently normalized. No missing-rule/default dispatch. Worker must run, no outage catch-up guarantee. |
| W10 reports | Required metrics/revenue/comparison/distribution from persisted completed payments/PT data | Frontend export/browser checks owned by coordinator. |
| W11 branches | Global-QTV create/update/status/detail/stats and scoped operational choices | No destructive deletion. |
| W12 / LT equipment | Scoped config/incidents, audit events, explicit consent evidence/revocation and deletion request | **Telemetry/test/capture/readiness adapters NOT IMPLEMENTED.** DB revocation immediate; hardware acknowledgment/deletion not claimed. Physical deletion remains OPEN-05. |
| W13 accounts | Scoped list/stats/detail/update, role/scope checks, self/last-admin protection, session revocation/audit filters | No separate permission-policy editor introduced. |

## External Boundaries: Exact Meaning

- `/payments/:id/check-bank-status` and hardware test/capture/ready/check-in routes currently return unconditional503. They are explicit missing-adapter boundaries, NOT configurable implementations. Environment variables alone cannot activate these routes; vendor contracts, credentials and adapter implementation are required.
- SMS differs: a generic HTTP provider path exists behind SMS_PROVIDER_URL/TOKEN, with explicit failure without a provider. No real SMS vendor end-to-end verification occurred. Provider acceptance is not handset delivery evidence.
- OAuth/social login adapter is not implemented. No fake identity or seeded administrator fallback.
- Notification delivery is real PostgreSQL in-app delivery only; not email/SMS delivery.

## Live Data and Runtime

- Existing backend watcher remains on port5000; `/health` reports UP/PostgreSQL. Frontend3000 owned by coordinator. No competing backend process introduced.
- Authorized repair affected **13** exact seed placeholders; live audit count rechecked13. Other hashes and all business rows preserved.
- QTV0900000001/LT0900000002 use documented Paradise@123; QTV2FA remains enabled. Local development OTP is explicitly labeled DEVELOPMENT_ONLY.
- Live historical registration has NULL reg_code; legacy PAYMENT_COMPLETED template and null name/creator data are unchanged. Aliases do not fabricate missing facts.
- Primary errors localized; specialized business validation still has some English text.
- Mobile REST names/core fields retained. Real security rejects old demo tokens, member self-settlement, unauthenticated full-profile lookup and passwordless pending activation. Shared SDK supports optional activation password/2FA resend token; legacy mobile screens depending on insecure shortcuts need owner adaptation. No mobile source edited; full mobile regression remains unverified.
- Several list endpoints materialize scoped rows before pagination; production-scale performance profiling remains. Limit1000 enforced; gate history capped1000.

## Handoff State

No test process remains running. No commit/reset, mailbox cleanup or web/mobile source edits. Contract is ready for web workers. External integrations, OPEN-04/05 decisions, full mobile regression and production secrets/provider deployment are not claimed complete.

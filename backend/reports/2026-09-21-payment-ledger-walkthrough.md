# Payment Ledger Backend Handoff

Backend source frozen. Implementation, migration, seed compatibility and ERD are ready for main's final review/deployment. This workstream did not write, migrate, seed or reset the configured database, restart its server, or alter other-role frontend files.

## Delivered

- Migration014 adds payment_intents and removes only payments.status. Completed rows retain all other fields and IDs; receipts and registrations are untouched. Every old attempt retains its ID in payment_intents. A receipt mismatch aborts migration. Duplicate settled registration/reference indexes fail safely instead of merging records.
- Expired/cancelled legacy pending intents release their voucher reservations once. Completed uses are preserved. Reapplying014 and replaying migrate.js preserve the snapshot;014 restores status-free guards after002/006. Base001 report index now replays without status.
- Mounted core payment endpoints keep invoice and receipt routes compatible, reuse intent ID for final payment, return explicit settlement signals, and expose successful-only statusless history. Manual transfer requires a deduplicated transaction reference; test simulation remains permitted. Pending cancellation voids open intents;15-minute QR expiry does not cancel registrations.
- Central is_expiring/display_status preserve ACTIVE permissions. Registration list/detail, dashboard expiry counts, customer-care lists/summary and existing access-gate expiry indicators use4days/3sessions by type, COMBO OR. Reminder cadence7/3/0 is intentionally separate. All-role freeze rejects unpaid/pending/future scheduled registrations and accepts paid effective near-expiry registrations.
- Mounted operations/customerCare/jobs/mobile/bookings payment queries no longer reference payments.status. Only payment-query clauses in bookings were changed by this workstream; unrelated dirty PT changes were preserved.
- Seed applies002 before nullable-duration catalog rows and014 after historical seeds. Removed stale commission seed entries referring to a nonexistent PT and unearned sessions; clean seed has no completed bookings. No replacement fake commissions were inserted.
- docs/database/erd.md now includes the37-table catalog, payment_intents Mermaid entity/relationships, full column definitions, FK/index/trigger details, migration preservation/replay rules and computed registration-state semantics.

## Verification

| Check | Result |
| --- | --- |
| node tests/payment-ledger.integration.js | PASS153 HTTP checks, disposable PostgreSQL, cleaned up |
| node tests/payment-ledger-migration.integration.js | PASS legacy rows/receipts/registration preservation, six retained attempts, reservation release,014/full-runner/base-DDL replay, immutable/duplicate/full-price guards |
| Fresh seed in second disposable database | PASS latest schema, no payment.status, receipts consistent, cleaned up |
| Migration manifest | payment-ledger-migration-verification.json records SHA256 for001 through014 |
| Main independent tests | Main reported153 HTTP PASS;23 helper boundary PASS; seed smoke and replay/populated-seed refusal PASS |
| Main configured-DB dry run | Main reported rollback-preserved22 completed payments,22 receipts,29 registrations and relocated17 pending intents; not deployed by this workstream |
| npm test | BLOCKED at existing GET /pt-bookings/available-slots?registration_id=... returning404; not a full-suite PASS |

The failed early migration harness attempts exposed fixture parameter/type-parser inconsistencies and were fixed in the harness. The initial seed failures exposed actual ordering/dangling-reference problems described above; final verification uses the corrected files. No user-visible E2E PASS is inferred from backend tests. Main/HV/Web owners perform final real-browser source/downstream verification.

## Remaining Scope And Limits

- Main has taken ownership of the remaining projection fields in catalog member-detail arrays and operations access-log/check-in responses. Those aliases were not included in anti4's153-check verification; main will implement them and rerun the payment suite. Anti4 makes no further backend source changes. The request is recorded in brain-anti1/2026-09-21-expiry-contract-consumers.md.
- backend/src/modules/payments/payments.service.js is legacy, unmounted by src/server.js, and still contains obsolete memory-store/status-based SQL. It is NOT compatible with migration014 and must not be mounted/reused. Historical capture scripts likewise are not the current API contract. Only mounted core routes are certified here.
- Payment of an old pending registration does not silently rebase start/end dates. If its end_date passed, the existing settlement calculation returns EXPIRED. Main raised the separate product decision; no new date rule was inferred.
- No bank/IPN provider was added. Simulation audit explicitly says simulated_transfer=true and provider_verified=false. A manual transaction reference records staff reconciliation, not an automatic bank lookup.
- Main owns applying only migration014 transactionally to the shared database and restarting approved backend5000 after final review. See payment-ledger-contract.md for exact UI response shapes.

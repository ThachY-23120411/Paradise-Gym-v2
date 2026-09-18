# Web Rebuild Implementation Plan: Tab4

Owner: Backend & DB Lead. Authorized scope: backend/, frontend/shared/, docs/database/erd.md and this tab's web-rebuild reports. No web/mobile source edits or mailbox cleanup.

## Objective and Inputs

Implement real PostgreSQL REST behavior for QTV W01-W13 and corresponding LT stories, with correct role/branch authorization, transactional integrity and no invented external integration success. Preserve existing resource names and core mobile DTOs.

Reviewed project rules/docs-sync, Product Spec, relevant QTV/LT main/alternate/exception flows, activity diagrams and field specifications; existing backend/schema/seed/shared SDK; coordinator exact W01/W07/W10 contracts and four frontend coordination audit reports.

## Executed Plan

1. Publish endpoint contracts early, align canonical package enums and exact dashboard/reports schemas. Done; final contract consolidated in web-rebuild-api-contracts.md.
2. Add PostgreSQL transaction layer and additive migration002. Apply without live reseeding and synchronize every DDL item to ERD. Done,24 business tables.
3. Replace active demo auth/fallback routing; enforce bcrypt, token types, database roles/scopes and session revocation. Done. Explicitly authorized seed-hash repair affected13 exact matches, audited transactionally.
4. Implement catalog, registration/payment, PT booking/assignment, gate/dashboard/report and system behavior. Done to the boundaries in walkthrough; hardware/bank/OAuth adapters are not implemented.
5. Extend shared SDK and close coordinator field/alias/scope discrepancies; localize primary errors. Done; frontend workers retain ownership of their sources.
6. Verify against a disposable PostgreSQL database with real writes, concurrent payment/booking guards, SQL assertions, precise gate denial codes and notification deduplication. Done:213 HTTP checks plus scheduler/SQL assertions, including W12 status/null-IP behavior, own-member settlement rejection and final configured-only notification policy.
7. Check syntax/live health and publish final files/coverage/gaps. Done; see walkthrough.
8. Close narrow W12 US01 status-save mismatch: persist validated configured status, expose independent connection_status, keep effective status/dashboard truthful, verify disable/reenable and audit. Done without DDL, live data edits or frontend/web changes.
9. After concurrent backend edits completed, re-read current commerce/notifications and narrowly restore settlement trust boundaries plus restrict fallback template selection to current/global branch. Preserve new notifications/cancel/read-all/mobile changes; verify own-member CASH/BANK negative SQL snapshots and staff positive paths. Done,206 HTTP checks; no live business changes.
10. Apply FINAL USER DECISION: automatic notifications only when QTV configures an enabled rule with an active assigned template. Done: no-rule/OFF/inactive returns0 even with caller text; remove default/fallback dispatch, retain new events/business calls/cancel/read-all and settlement guards. Positive recipients/template/dedup and W09 toggles verified. Full isolated suite PASS213 HTTP checks plus SQL assertions; no policy question remains open for default notifications.

## Safeguards

- No live reset, truncate or reseed. Integration suite creates/drops only its generated test DB.
- Existing null registration codes/legacy templates remain unchanged. No fabricated historical values.
- Seed entry point refuses implicit destructive reset of populated databases; reset requires two explicit opt-ins and is transactional.
- Freeze/transfer/refund excluded by Product Spec. Paid-registration cancellation remains OPEN-04; biometric physical deletion process remains OPEN-05.
- Staff PT reconciliation cannot impersonate mobile confirmations. No SMS/door/bank/biometric delivery success without actual provider evidence.

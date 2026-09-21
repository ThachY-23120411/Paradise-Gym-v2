# Payment ledger alignment - verification handoff

Workspace: E:/Desktop/para. User-approved simulated transfers remain intentional; SMS/IPN provider integration is not a blocker for this testing phase.

## Implementation

- Successful-only immutable payments ledger; pending/expired QR requests stored separately in payment_intents. No payment status column, status filter, status grid column or pending-registration KPI in the collection menu.
- Cash confirmation, manual BANK_TRANSFER reconciliation and simulated transfer converge on one transactional settlement and one receipt. Manual transfer requires its reference; duplicate reference and duplicate settlement are rejected/idempotent as appropriate.
- QR expires in 15 minutes. Registration remains pending indefinitely until payment or explicit cancellation; cancellation closes its open intents.
- API computes is_expiring/display_status using four days or three sessions by package type, combo OR. Internal ACTIVE remains eligible for booking/check-in. Web, member and PT indicators consume the shared result.
- Freeze requires paid and currently active for every role; future-effective and pending registrations are rejected.

## Verified Independently By Main

| Check | Result |
| --- | --- |
| Payment-focused isolated integration | PASS: 153 HTTP checks |
| Near-expiry boundary unit tests | PASS: 23 tests |
| Commission snapshot and session regression | PASS: 57 tests |
| Legacy migration integration | PASS: paid/receipt preservation, six retained intents, voucher release, replay, duplicate/full-payment guards |
| Seed on empty isolated database | PASS: 13 accounts, clean operational ledger; latest schema |
| Full migration replay after seed | PASS |
| Seed refuses populated database without explicit reset | PASS |
| Configured database migration dry run | PASS then ROLLBACK: 22 paid rows, 22 receipts, 29 registrations unchanged; 17 unpaid attempts retained separately |

## Residual Regression Outside This Change

The current bookings.js (also in HEAD) excludes PT from POST /pt-bookings and lacks the registration-based dynamic availability path expected by earlier PT tests. Broader npm test stops on GET /pt-bookings/available-slots?registration_id=... returning 404. The combined earlier 117-test focused suite currently reports 83 PASS / 34 FAIL. These failures must not be presented as payment acceptance success or silently hidden by weakening tests. This payment change only removes obsolete payment-status predicates in bookings.js; unrelated booking logic and concurrent staff-confirmation work are preserved.

## Pending Business Clarification

The user has not yet answered whether an indefinitely pending registration whose original end date has passed should rebase its period on payment or require a new start date. No unapproved date rebase is introduced; current settlement preserves dates. This edge case is separate from QR expiration and three-day auto-cancellation (which is explicitly not implemented).

## UI And Deployment

- QTV: 32/32 UI steps PASS; LT: 20/20 UI steps PASS. Final reports and annotated evidence linked in [web handoff](../tab1-web-admin/payment-ledger-walkthrough.md).
- HV: 53/53 UI steps PASS including four authenticated LT downstream steps. Accepted run: [HV03-US03](../../../tests/e2e/hv/HV03-US03/payment-intents/2026-09-21T03-52-18-551Z/HV03-US03-test.md). Earlier drifted or visually incomplete runs are superseded, not acceptance evidence.
- Main completed member-detail and access-log canonical expiry projections, and synchronized post-check-in quota in the response. Full kiosk 4-to-3 UI flow is not certified by these runs.
- Migration 014 COMMITTED to configured database on 2026-09-21: 22 successful payments, 22 receipts and 29 registrations preserved exactly; 17 non-successful attempts relocated to payment_intents. No seed/reset performed. Post-commit replay dry run passed with no additional relocation.
- Approved backend restart: verified port-5000 owner PID 888, stopped only that process, started backend/src/server.js from E:/Desktop/para/backend as hidden PID 22032. Health returned UP / POSTGRESQL at 2026-09-21T03:56:32Z; error log empty.
- Existing frontend remains available at http://localhost:3000/web/ and http://localhost:3000/mobile/member/. UI acceptance ran against isolated databases; deployed shared backend received health and migration-preservation checks, not new business transactions.
- Seed logic, ERD and 42 affected business documents synchronized; see [documentation handoff](2026-09-21-payment-business-docs-walkthrough.md). Real bank/IPN integration intentionally excluded.

# QTV W18 Revenue Handover

Workspace: E:/Desktop/para. User requests a new QTV menu to reconcile cash and transfers per receiving account, confirm complete handover and prohibit editing/deleting handed-over records.

## Implementation

1. Add an API-backed W18 menu using existing WebUI/DevExtreme patterns: pending receipts, source totals, receiving-account registry and assignment, confirm dialog, immutable history/detail.
2. Add migration017 and QTV-only APIs with explicit branch scope, successful-payment/receipt eligibility, immutable snapshots and exact totals, one payment per handover, stale-preview detection, concurrent/idempotent confirmation and audit logs.
3. Preserve the successful-payment ledger's existing immutable rules. Handover state is not payment.status and does not unlock unhanded successful payments.
4. Synchronize ERD, Product Spec, Epic, three US, UI mapping and changelog using activity-diagram/ui-docs-sync skills.
5. Verify in disposable PostgreSQL databases, real authenticated UI and scoped role/branch tests. No shared seed/reset or artificial receiving-account inference.

## Known Integration Context

At task start commerce.js again contained the old payments.status/PENDING creation path even though migration014 and the prior payment-ledger reports remain. Existing concurrent changes are preserved; W18 does not overwrite commerce.js. W18 selects receipts with confirmed_at and matching amount and keeps its own immutable snapshot. The old source/schema mismatch is a separate integration issue and must be reported, not hidden by W18 acceptance.

Receiving-account information is absent from historical payment rows. W18 provides explicit QTV classification verified against bank records; unknown transfers block confirmation. Its registry does not modify the current VietQR config. The optional user question about unknown-account handling remains pending unless subsequently answered.

## Acceptance Scope

Cash9m + bankA5m + bankB7m; customer detail; required confirmation; missing bank/account validation; stale preview; double submit; immutable payment/receipt/batch; history snapshots after customer name changes; late receipts; role denial for LT/member; cross-branch isolation. No real bank provider verification or statutory accounting/tax close is claimed.

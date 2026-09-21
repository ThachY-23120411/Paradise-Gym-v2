# Payment ledger alignment

## Approved scope

- Keep intentional simulated bank-transfer settlement for testing; no IPN integration required now.
- Payments is immutable successful-payment history with no status. QR requests have separate lifecycle storage; expire after 15 minutes.
- Pending registrations persist until user cancellation or settlement; no three-day automatic cancellation. Cancellation remains available while pending.
- Staff manual reconciliation keeps BANK_TRANSFER, with transaction evidence; no CASH workaround.
- Remove payment status filter/column and pending-order KPI in collection menu.
- Shared near-expiry projection: <=4 days for dated benefits, <=3 sessions for session benefits, OR for combo.
- Freeze requires settled payment and currently effective contract for all roles; reject pending, future-effective, cancelled and expired.

## Implementation sequence

1. Backend owner separates intent/payment schema with non-destructive migration, adapts settlement/query/seed paths and ERD.
2. Web and member owners adapt their consumers and controls to explicit intent-versus-payment contract.
3. Documentation owner synchronizes affected epic, stories, fields and diagrams.
4. Run isolated schema/API and real UI source/downstream regression; preserve failures and their reruns.
5. Review migration against configured schema; deploy only reviewed migration without seed/reset, reload verified local service, publish evidence and limits.

## Verification risks

- Repeated settlement/manual/simulated requests must create exactly one ledger row and receipt.
- Invoice expiry must not cancel registration; cancelled registration must not settle through an old intent.
- Preserve completed ledger/receipt IDs and reporting totals through migration.
- Near-expiry display must not accidentally revoke valid booking/check-in eligibility.
- Frontend must not interpret missing payment.status as an unpaid transaction.

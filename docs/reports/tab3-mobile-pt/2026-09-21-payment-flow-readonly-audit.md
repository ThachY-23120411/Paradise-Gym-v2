# Registration/payment flow read-only audit

> Historical audit against the user's earlier flow. Subsequent user decisions supersede these findings: simulated transfer is intentional for testing and is retained; IPN is deferred; pending registrations do NOT auto-cancel after three days; reconciliation remains BANK_TRANSFER with manual confirmation, not CASH. The successful-only ledger, UI cleanup, 4-day/3-session thresholds and freeze guards are being implemented under 2026-09-21-payment-ledger-implementation-plan.md. Do not treat simulation or missing IPN as current acceptance blockers.

Workspace: E:/Desktop/para. Baseline: user's latest purchase, settlement, three-day cancellation, freeze and near-expiry requirements. Method: source inspection only, not live UI/E2E certification. No business source, schema, seed or shared records changed.

## Findings

1. Critical: member's "Toi da chuyen khoan" handler calls POST /payments/:id/simulate-transfer (frontend/mobile/member/js/packages-notifications.js:1032). The mounted core endpoint updates payment to COMPLETED, activates registration and creates receipt without bank confirmation and without an environment guard (backend/src/modules/core/commerce.js:813). It also records provider_verified:true for the simulation. This contradicts both the requested flow and HV03-US03 step 8, which calls for checking status.
2. Payment model differs: invoice() inserts payments before settlement (commerce.js:721), using schema default PENDING (001_create_tables.sql:206); confirm() updates status to COMPLETED. Web includes pending/expired payment filters (sales.js:1185). User requires successful-only payment history with no payment status.
3. No IPN/webhook receiver or bank verification integration found in mounted backend routes. Reading payment status/polling cannot independently confirm a real bank transfer. Registration-to-QR UI exists, but bank settlement is not implemented as requested.
4. Manual fallback differs: web confirms the existing transfer with an optional transaction reference and a reconciliation checkbox (sales.js:1279). Switching to CASH while an unexpired BANK_TRANSFER invoice exists is rejected by invoice() as a different method (commerce.js:704). Thus the requested immediate cash-method recovery is not consistently possible. Bank verification is an operator assertion, not an implemented provider check.
5. No cancellation after three days found in core jobs or migrations. jobs.js activates scheduled registrations and expires date-ended registrations; invoice expiration is 15 minutes, not cancellation of the registration.
6. Near-expiry differs across surfaces: sales.js:194 uses <=7 days OR <=2 sessions; member packages-notifications.js:151 uses <=7 days, no session condition in that indicator; commerce.js:68 EXPIRING filter uses <=14 days. effective() does not return EXPIRING. No shared <=4 days OR <=3 sessions automatic state transition found.
7. Freeze exists and is represented through is_frozen/package_freezes with effective FROZEN status. However commerce.js:180 rejects unpaid registrations only for MEMBER, not staff; SCHEDULED is also not excluded. Consequently paid-and-currently-active precondition is not enforced consistently. Undated packages are rejected from freezing, which also needs explicit alignment if the user's rule includes them.

## Existing aligned portions (source only)

- Member purchase creates registration, then opens VietQR dialog (packages-notifications.js:796 onward).
- Shared registration creation used by staff/member defaults to PENDING_PAYMENT (commerce.js:147, schema:146).
- Staff cash collection exists; successful confirmation updates registration to ACTIVE or SCHEDULED by start date and creates a receipt. It can also return EXPIRED when end date is already past (commerce.js:738).
- Paid status updates and receipt creation run inside a transaction; these are useful existing foundations, not proof of complete compliance.

## Recovery design caution

The requested CASH fallback must retain the original bank transaction reference/reason, prevent duplicate settlement when delayed IPN arrives, and distinguish reconciliation from fresh physical cash collection in reporting. Otherwise one real transfer can be counted twice or misreported as cash. This is an implementation risk, not an unapproved change to the requested flow.

## Result

Not compliant end-to-end for QTV/LT/HV. Prior regression counts concern the old implementation and cannot certify these newly specified semantics. No new live payment or E2E actions were performed; findings are source-level and require scoped fixes plus isolated cross-role UI tests before acceptance.

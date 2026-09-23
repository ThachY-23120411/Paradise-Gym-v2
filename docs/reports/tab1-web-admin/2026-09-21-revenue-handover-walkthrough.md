# W18 Revenue Handover Delivery

Workspace: E:/Desktop/para.

## Delivered

- QTV-only W18 menu beside payments, with pending source review, receiving-account registry, explicit account allocation, confirmation and readonly history/detail. All business data is API-backed.
- Source totals and the corresponding customers for CASH and each verified receiving account. No inference of old bank destinations from current QR configuration. Unknown transfers block confirmation; allocations remain provisional until confirmed.
- Confirmation uses an explicit acknowledgment, a server-generated preview fingerprint, revalidation and an atomic transaction. Duplicate requests return the existing batch. Overlapping periods cannot hand over the same payment twice; late receipts remain eligible for the next batch.
- Immutable batch/items/customer/account snapshots; original successful payments remain immutable even before handover. After handover receipts are also protected. No edit/delete/reopen APIs or UI.
- Backend module revenueHandovers.js, migration017, additive migration/seed integration, ERD, QTV Epic/three US, Product Spec, screen mapping and changelog.

## Verification

- `node backend/tests/revenue-handovers.integration.cjs`: 50 HTTP/database checks PASS in a disposable PostgreSQL database. Includes permissions and branch scope, grouping9m/5m/7m, unknown account rejection, stale data, forged totals, idempotency/concurrency, exact decimal totals, local-day/cross-timezone boundaries, database immutability, snapshot retention after member rename, append-to-closed-batch rejection, missing-receipt rejection, large allocation request parsing and migration replay. Test database/server closed.
- W18 documentation: five diagrams,104 nodes,99 edges passed topology and namespace checks; all five rendered with Mermaid11.4.1 in Chromium. Nonempty SVG geometry verified; not a complete visual-layout certification.
- Final real UI run `2026-09-21T14-26-27-424Z`: [US01:22 PASS](../../../tests/e2e/qtv/QTV-W18-US01/QTV-W18-US01-test.md), [US02:13 PASS](../../../tests/e2e/qtv/QTV-W18-US02/QTV-W18-US02-test.md), [US03:14 PASS](../../../tests/e2e/qtv/QTV-W18-US03/QTV-W18-US03-test.md). Total49 completed steps; no recorded assertion issues/browser errors. Main independently rechecked all five recorded source hashes, including server.js, against current files, no drift. verification.json confirms isolated database removal and test backend shutdown.
- UI evidence includes authenticated LT denial and same-payment history preservation, branchB isolation, ALL history/read-only behavior, member-name snapshot immutability, stale-preview refresh, actual bank registry form/allocations and browser America/Los_Angeles with Asia/Ho_Chi_Minh branch date/times. Date-only values no longer shift with browser timezone; history/detail use batch timezone.
- Main visually inspected final immutable-detail and horizontally/vertically scrolled bank-column images: loading overlays absent; account/customer/amount values visible. Earlier exploratory screenshots with loading overlays are not final visual acceptance. This is not a full all-viewport UI audit.

## Deployment

`node tests/logic/apply-revenue-handover.cjs --apply` committed only migration017. Hash comparison preserved all22 payments,22 receipts,30 registrations. No seed/reset or historical bank assignment. The existing backend watch process reloaded after server/module changes; port5000 health returned UP/POSTGRESQL. Frontend is available at http://localhost:3001/web/#revenue-handovers.

## Limits And Integration Finding

This is internal operational handover, not statutory tax/accounting close and not a bank-provider verification service. QTV verifies actual funds and manually identifies account destinations absent from payment records. The W18 bank registry does not change VietQR configuration. Database administrators who can disable triggers/change schemas remain outside application immutability guarantees.

At task start, commerce.js had reverted to its legacy payments.status and pending-payment creation logic, incompatible with the existing migration014 statusless ledger. This source was not overwritten because it contains concurrent work. W18 was tested against real successful-payment/receipt fixtures and existing ledger data; it does not certify that the separate purchase/collection flow currently works. That pre-existing integration regression still needs reconciliation by its owner.

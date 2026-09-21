# Payment documentation follow-up

Scope: payment changes in E:/Desktop/para. Read activity-diagram, ui-docs-sync and docs-sync rules. No application source, database or runtime changes in this follow-up.

## Existing Synchronization

The previous delivery updated 42 business documents, including 28 stories, plus backend-owned ERD. Product Spec, payment/registration Epics, stories, screen mapping and open questions already document successful-only payments, separate QR intents, explicit cancellation, manual bank reconciliation, shared expiry thresholds and paid/current freeze eligibility. See [original inventory](2026-09-21-payment-business-docs-walkthrough.md).

## Corrections In This Review

- QTV/LT W08-US02: resolved boundary/action ID B collision. Actual Mermaid rendering reproduced the failure before correction.
- Aligned selected form labels with sales.js: pending-registration selector, voucher selector and payment amount.
- Separated manual-reconciliation modal specification: transaction identity, amount, method, required bank reference (100 characters), prefilled editable note (255 characters), required initially unchecked confirmation checkbox. Updated alternate/exception flow and diagram action; submit/close controls remain outside form field tables.
- QTV/LT W08-US01: corrected readonly display columns mislabeled DYNAMIC and documented All time, Today and Refresh page actions.
- HV03-US06: documented receipt CTA and corrected the diagram to include cash as well as transfers.
- W08 Epics: removed obsolete links to nonexistent system-flow-specs and epics-menu-catalog files; existing story links and screen mapping remain.
- Product Spec kiosk warning no longer implies days exist for session-only packages.
- Added payment change summary to docs/menu-and-user-stories-changes.md.

## Validation

| Command | Result |
| --- | --- |
| node tests/docs/payment-diagrams.cjs | PASS: 28 diagrams, 475 nodes, 477 edges, 3 namespace regression checks |
| node tests/docs/payment-render.cjs | PASS: all 28 rendered via Mermaid 11.4.1 in headless Chromium with nonempty SVG geometry |
| node tests/docs/pt-diagrams.cjs | PASS: 16 stories/diagrams, 361 nodes |

Renderer checks parsing/rendering, not complete visual readability or node-overlap certification. Field review addressed the concrete payment controls above; it is not an exhaustive new UI/documentation audit of every menu in the project. Existing UI acceptance evidence remains in the payment deployment report; no new application E2E claim in this documentation-only follow-up.

PAY-OQ-01 remains open. No policy for rebasing expired registration periods was invented or approved through documentation edits.

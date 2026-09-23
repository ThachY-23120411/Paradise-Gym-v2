# W02 Popup Readonly Verification Plan

Verification owns only new tests/reports. Main/Einstein own implementation; Rawls owns canonical specification updates. No shared seed, reset, migration, DB mutation or source fix.

- Canonical mapping: QTV-W02-US04. Read its updated Main Flow, field tables, AF02 and EF02/EF03 alongside Product Spec W02 and HV01-US01/HV03-US01.
- Run Chrome through the existing Puppeteer dependency against frontend 3001/backend 5000. Reuse valid auth cache without printing/writing tokens. Authentication allowed; browser API mutation methods aborted.
- Real row click opens popup; authenticate HV001 and retain its member_profile_id for all source/mobile comparisons. Five tabs, record IDs/statuses, confirmed ledger, no fabricated FaceID, search/status/date filters, date reversal and correction, 900px viewport.
- A/B/ALL branch comparisons against actual scoped API IDs; network failures by request.abort, actual visible errors and retry. No response fulfillment or fabricated business records.
- Mobile 390x844 authenticated business pages, same registration/payment identifiers where data is available. Record existing Mobile/API mismatches as failures, do not repair them or perform purchases.
- Separate preliminary evidence from acceptance. Final run requires UI/API freeze marker with matching source hash. Capture numbered rectangles after every action, inspect screenshots, retain blocked dependencies and report partial coverage explicitly.

Runner: [verify.cjs](../../../tests/e2e/qtv/QTV-W02-US04/popup-refactor-20260922/verify.cjs).
Coordination: [handoff](../../../tests/e2e/qtv/QTV-W02-US04/popup-refactor-20260922/coordination.md).

Final command from repository root:

```powershell
node tests/e2e/qtv/QTV-W02-US04/popup-refactor-20260922/verify.cjs
```

Diagnostics add `--preliminary`; set `E2E_RUN_NAME` to preserve earlier evidence. Final evidence still requires visual review; automatic assertion counts do not establish acceptance.

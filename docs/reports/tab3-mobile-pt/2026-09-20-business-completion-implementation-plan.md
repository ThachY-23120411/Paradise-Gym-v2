# PT business completion - Implementation plan (2026-09-20)

## Main implementation scope
- Main coordinates PT frontend and necessary backend booking, auth/session registry, profile, notifications and commissions changes; no unrelated role UI changes.
- Approved database work: immutable PAID per-session snapshots and immutable whole-ACCEPTED-group booking participant snapshots. Backend agent owns migrations and ERD synchronization.
- Main validates isolated API behavior and real UI E2E, including own/foreign scope, group eligibility, one-session reservation, member representative/read-only participants, PAID/legacy snapshot behavior and authenticated downstream views.

## Documentation workstream scope
- This tab edits documentation only: docs/epic/pt, docs/user-stories/pt and PT portions of product-spec.md, epics.md, ui-related-screen-audit.md, open-questions.md. This is one workstream within the Main implementation phase above.
- Scope extension explicitly approved: minimal snapshot synchronization in QTV-W15-US02 / US03 only; no other-role UI changes. Backend owns approved snapshot migration/ERD.
- Read all PT stories; apply docs-sync and activity-diagram rules. Mesh context read from anti-1, anti-2 and anti-4; mailbox edits excluded by explicit DOCS ONLY ownership.
- Add PT01-US03: own PT books for assigned member, dynamic times, server eligibility and concurrency guards; no PT cancellation permission.
- Retain PT02-US03 at its existing path as read-only legacy assignment history. Remove accept/reject actions and pending-assignment KPI. PT06 has four KPIs and quick booking.
- Synchronize own read-only commissions, direct payout labels, reconciled details and locked PAID history; four footer destinations plus notification bell.
- Audit profile, workdays, no-expiry display, notifications, authentication and existing session registry. Certificates remain removed per migration 005 / user decision. Record provider limitations without claiming deployment completion.

## Execution
1. Read related specs and existing API behavior for evidence only; this tab does not edit code, tests, schema or shared skills. Only the explicitly approved QTV-W15-US02/US03 cross-references are edited outside PT stories.
2. Update PT business flows, individual input/display fields and role-based activity diagrams.
3. Check every PT diagram: initial 0/1, action 1/1, decision 1/N labeled, merge N/1, final 1/0; check reachability and termination.
4. Synchronize indexes, PT screen audit and open decisions; publish a concise documentation handoff here. Runtime/UI implementation remains with Main.

## Verification boundary
This tab reports static documentation and diagram validation only, not application E2E acceptance. Approved database changes are owned by the backend workstream, and provider availability is not inferred.

## Stage status (2026-09-20)
| Stage | Status | Evidence / remaining work |
| --- | --- | --- |
| PT business decisions | DECIDED | Own-PT booking, whole ACCEPTED group including leader, one contract session, immutable participants, immutable PAID details, legacy sessions=[] + sibling details_snapshot_available=false |
| Epic / US / Product documentation | UPDATED | Six PT Epics, fourteen PT stories, minimal two QTV payout/history stories and shared PT portions |
| Static activity topology | PASS | Sixteen diagrams / 361 nodes, labeled decisions, arity, reachability, final paths; not runtime acceptance |
| PT frontend | IMPLEMENTED, SCOPED ACCEPTANCE RECORDED | Account/notification 71/71 PASS; PT05 login 19/19 PASS. Full acceptance not claimed; downstream/shared activation issues await scope approval |
| Backend booking/auth/profile/commissions | IMPLEMENTED, SCOPED TESTS PASS | Own-PT guards, registry, immutable snapshots, group eligibility and idempotent dual confirmation |
| Approved migrations / ERD | APPLIED 2026-09-21 | 011/012/013 applied transactionally without seed/reset/backfill; existing row counts unchanged, ERD synchronized |
| Isolated API tests | PASS | Main rerun: 393 regression HTTP checks, 117 focused unit tests, 16 group scenarios / 91 HTTP checks |
| Real UI E2E / downstream | PARTIAL PASS | Individual booking/completion 31/31; commission 27/27. Group 35/37: nonleader HV controls incorrectly visible despite API rejection. Activation 11/13: shared portal phone lookup and identity preview defects. Targeted approvals requested |
| SMS/push/cloud integration | EXTERNAL LIMITATION | Requires configured providers and delivery/upload evidence; development OTP is not SMS delivery |

Main verification details and per-US evidence links are in the companion walkthrough. Original documentation-only boundaries above describe the earlier workstream, not a claim that implementation is absent.

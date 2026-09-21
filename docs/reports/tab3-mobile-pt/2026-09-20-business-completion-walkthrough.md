# PT business completion - Implementation and verification handoff

Task date: 2026-09-20; final handoff: 2026-09-21 (Asia/Bangkok).
Workspace: E:/Desktop/para. Initial documentation handoff and Main's subsequent implementation/runtime verification are separated below.

## Completed
- Six PT Epics and fourteen PT User Stories synchronized; PT01-US03 added for own-PT booking on behalf of assigned members. Dynamic actual times, full field specification, server guards and no PT cancellation.
- Group decision resolved: whole ACCEPTED group including leader, read-only participants, reject entire booking if any participant fails active/Gym-on-date/freeze/branch/conflict checks. Reserve one group-contract session; immutable booking participants, no auto-add of later members. Leader remains member confirmation/cancellation representative; others read-only schedule.
- PT02-US03 retained at its original path/ID as read-only assignment history; no accept/reject. Own registrations include ACTIVE/SCHEDULED/SCHEDULED_FREEZE/FROZEN/EXPIRED for history. Remaining already excludes booked; display booked beside progress; null expiry is Không giới hạn.
- Four overview KPIs plus quick booking; four footer destinations plus header notification bell. Notifications come only from API, read/read-all success precedes UI update, deep links await authorized data; facility notices open read-only content.
- Profile bio/specialties display, API workdays including ALL_WEEK, email/specialties/bio limits, current/other/all session registry flows, fail-closed authorization and new current-device session after password change. Certificates remain removed.
- Own read-only commission summaries reconcile with details. Approved PAID snapshots are immutable and saved atomically at payout. Legacy PAID returns sibling details_snapshot_available=false and sessions=[]: retain historical summary, explicitly show unavailable details, never infer zero or reconstruct live sessions.
- Minimal QTV-W15-US02/US03 synchronization covers payout atomicity and historical snapshot access. No other-role UI changes; migrations/ERD remain backend-owner work.
- PT portions of Product Spec (including actor permissions), epics index, screen audit and open questions synchronized. Implementation plan now separates Main implementation scope/status from this documentation workstream.

## Static validation
| Check | Result | Boundary |
| --- | --- | --- |
| Activity topology | PASS: 16 diagrams, 361 nodes | 14 PT + 2 QTV payout/history diagrams |
| Initial/action/decision/merge/final arity | PASS | Initial 0/1, action 1/1, decision 1/N, merge N/1, final 1/0; no joins used |
| Decision labels, reachability, final paths | PASS | Every decision edge labeled; every declared node reachable and can reach a final |
| Written flow structure | PASS | Preconditions, Main, Alternate, Exception and Activity Diagram present; no Result section |
| Mermaid fence balance and unique IDs | PASS | Static structure checked; no claim of rendered Mermaid acceptance |
| Conditional required fields | PASS | CONDITIONAL rows use conditional; group/snapshot visibility has both directions |
| PT Epic/US local links | PASS after repair | Replaced missing legacy PT05 flow-index target with existing PT story index |
| Scoped git diff whitespace check | PASS | Windows CRLF treated correctly; normalization warnings are not runtime failures |
| API / real UI E2E | NOT RUN BY THIS WORKSTREAM | Main/backend agent owns actual outputs, screenshots and downstream acceptance |

## Remaining outside this workstream
- Main/backend agent confirms deployment/migrations and isolated API plus real UI E2E, including whole-group participants and PAID/legacy snapshot behavior. Changed source/test files alone are not proof of PASS.
- SMS/push delivery and external image storage need configured providers and actual delivery/upload evidence (PT-OQ-01/02).
- Group policy and PAID snapshot approvals are resolved (PT-OQ-03/04); no remaining user-approval blocker is asserted for them.
- Main may coordinate wider role-specific documentation beyond the two explicitly authorized QTV stories. This tab did not alter code, tests, database or other-role stories beyond those two.

## Main runtime verification - 2026-09-21

Implemented PT own-schedule booking, whole-group participants, API-only notifications, readonly assignment history, profile/session handling and commission reconciliation. Backend protects assignment/branch/date/payment/Gym/freeze/conflicts, reserves one session atomically, supports exact-once dual confirmation, and stores immutable group participants and PAID commission details. No frontend business mock records were added.

| Verification | Result | Evidence / scope |
| --- | --- | --- |
| Backend regression | PASS, 393 HTTP checks | `cd backend; npm test`; isolated PostgreSQL, not shared data |
| Focused booking/commission/profile/session suites | PASS, 117 tests | `node --test tests/pt-booking-commission.test.js tests/commission-snapshot.test.js tests/pt-profile-session.test.js` |
| Group integration | PASS, 16 scenarios / 91 HTTP checks | `node tests/group-booking.integration.js`; includes races, legacy records, migration repeatability and configured-only notifications |
| Individual booking / completion UI | PASS, 31/31 steps | [Booking](../../../tests/e2e/pt/PT01-US03/business-20260920/PT01-US03-test.md), [completion](../../../tests/e2e/pt/PT01-US02/business-20260920/PT01-US02-test.md); rerun after overview-default fix, explicit schedule navigation, real PT/HV/LT and same booking |
| Group booking / completion UI | FAIL, 35/37 steps | [Booking](../../../tests/e2e/pt/PT01-US03/group-business-20260920/PT01-US03-test.md), [completion](../../../tests/e2e/pt/PT01-US02/group-business-20260920/PT01-US02-test.md); two nonleader HV controls remain visible despite correct API 403 |
| Commission UI | PASS, 27/27 steps | [Report](../../../tests/e2e/pt/PT06-US02/commission-business-20260920/PT06-US02-test.md); real QTV payout and PT immutable history, legacy/empty/error/retry, touch refresh and responsive views |
| Account / notification UI | PASS, 71/71 steps | [Rerun handoff](../../../tests/e2e/pt/PT04-US01/account-business-20260920/rerun-2026-09-20T17-25-24-977Z/main-handoff.md); notification timestamp/return fixes, official-assignment link and partial-avatar-save retry verified; original failure evidence retained |
| PT05 activation / login UI | Login PASS 19/19; activation FAIL 11/13 | [Final audit](../../../tests/e2e/pt/PT05-US01/auth-business-20260921/final-audit.md); real forms, invalid credentials, OTP/2FA and PT06 destination. Two shared-portal activation defects await scope approval |
| Activity diagrams | PASS, 16 diagrams / 361 nodes | `node tests/docs/pt-diagrams.cjs`; static topology, not rendered Mermaid certification |

Migration deployment: applied only 011/012/013 transactionally to the configured database after duplicate-slot precheck. Accounts (32), bookings (38) and commissions (31) row counts remained unchanged. No seed/reset, historical snapshot backfill or business record rewrite. ERD and migration runners synchronized.

Scope boundary: this workstream did not edit Web/HV/shared frontend. A concurrent change to `frontend/web/dev-server.cjs` belongs to another workstream and was left untouched. Existing servers on 3000/5000 were inspected, not stopped. `/health` returned UP/POSTGRESQL. PT URL: http://localhost:3000/mobile/pt/.

Remaining acceptance issues: requested approval for the narrowly scoped HV nonleader cancel/confirm control fix and for the shared `/mobile/` PT activation path; no approval assumed. Shared activation currently treats phone identifiers as MEMBER, displays a hardcoded branch fallback, and does not render the returned masked PT code. Keep identity masked before OTP rather than exposing full names just to pass a test; synchronize the affected specification after scope approval. PT-owned post-login navigation was corrected to PT06 overview.

SMS/push delivery and production cloud avatar storage still require provider evidence. Local avatar upload is supported and tested; missing Cloudinary alone is not a blocker. Other exception paths and PT02 full-history UI acceptance are not exhaustively certified. These scoped results do not justify a 100% PT/system completion claim.

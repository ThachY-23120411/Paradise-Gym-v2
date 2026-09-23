# W02 Member Popup - Mobile Mapping Audit and Documentation Handoff

Date: 22/09/2026. Source review only; no runtime/E2E pass claimed. Implementation owned by Main/Einstein, not this docs worker.

## Actual Mobile Mapping

| Menu / route | Actual view and data | W02 mapping direction for Main/UI |
| --- | --- | --- |
| Trang chủ / home | Pending group invitations, next PT booking, links Mua gói/Gói của tôi. `home-schedule.js:58` | Same-member pending invitations and upcoming booking; remove unrelated KPI/QR/Face enrollment duplication from home |
| Lịch tập / schedule | Lịch của tôi, Đặt lịch PT, Lớp cộng đồng; calendar day and booking-status filter. `home-schedule.js:172` | Read same-member bookings/results/dual confirmations; day/status filters. Booking action navigates authorized W06 with member context, not member-confirm impersonation |
| Gói của tôi / packages | Gói của tôi, Mua gói, Lời mời vào Gói; eight registration status filters, entitlement counters, PT assignment, group membership/roadmap. `packages-notifications.js:76` | Same registration/group data and statuses; purchase via W04 context; invitations belong here, not an unrelated transfer-request table |
| Thanh toán / payments | Lịch sử thanh toán and Chờ thanh toán; paid records and receipt detail; pending registrations separately. `packages-notifications.js:1211,1270` | Same-member history/receipt vs pending registrations; date/method filters useful for staff. Remove gate log from payment tab |
| Tài khoản / account | Hồ sơ cá nhân; Cài đặt & bảo mật; name/phone/email/birth/gender/avatar, own notification preferences/2FA/devices. `auth-account.js:474,719` | Show same profile values; staff edits through W02-US02, status through US03. Do not read staff's own preferences/session and present as selected member's settings |
| Thông báo / notifications | Bell route outside five footer menus; All/Unread, title/body/time/read flag. `index.html:48`, `packages-notifications.js:2075` | No automatic sixth tab or fabricated member notifications. Need explicit selected-member endpoint/authorization before exposing data; self-scoped API is not a member admin lookup |

The mapping copies information organization, not all member mutation rights. Branch and member IDs must remain those of the selected subject across downstream links. Shared header/footer contents are not copied into per-screen field tables.

## Source Findings Before Refactor

| ID | Finding and impact | Evidence / proposed handling |
| --- | --- | --- |
| W02-A01 | Rejected child requests become `[]`, so loading failures can appear as no registrations/payments/consents/invitations | `members.js:536-558` Promise.allSettled; show errors/retry per section, never infer zero/false from failure |
| W02-A02 | Payment request reads only one server page, then labels sum/count as lifetime totals; gate log fetch caps 200/500 | `members.js:542,546,570,1024`; load all pages or expose truthful page scope; do not call truncated data cumulative totals |
| W02-A03 | PT rows filtered solely by `b.member_id === id` can omit accepted group participants whose representative owns booking | `members.js:552`; verify server subject scoping/group participants before discarding rows; same booking identity as Mobile |
| W02-A04 | Next booking lacks future-time guard; community comparison uses date midnight against current timestamp, dropping later classes today | `members.js:694-695`; use date+time and server/branch timezone, distinguish future from pending past sessions |
| W02-A05 | FROZEN counted as active/available; unlimited/null Gym balance reduced to 0; price `||` chain can replace a legitimate 0 | `members.js:561-566,908`; show entitlement type/unlimited explicitly and derive availability from API rather than label frozen as usable |
| W02-A06 | Popup QR is icon/text with fabricated fallback `MEM-${member_code}`, not encoded QR evidence | `members.js:1188-1198`; remove misleading scanner control or use actual server QR payload/renderer only; no claim it is scannable |
| W02-A07 | Payment tab includes gate logs; packages includes transfer requests; five menu names alone do not match Mobile views | `members.js:932,1013`; move staff-only gate/consent operations to proper management context; replace package transfer block with supported invitations information |
| W02-A08 | PT/registration grids lack Mobile day/status filtering; history lacks method/date filters and pending registration split | `members.js:793-1012`; final UI owner chooses filters; docs follow exact implemented labels, not speculative controls |
| W02-A09 | Profile gender recognizes only MALE/FEMALE; mobile recognizes NAM/NU/KHAC and MALE/FEMALE/OTHER | `members.js:1102`, `auth-account.js:589-602`; normalize same API enum and preserve unknown state, do not claim known gender absent |
| W02-A10 | Avatar URL upload sets face_enrolled=true; portrait alone is not evidence of consented biometric enrollment | `members.js:1248-1255`; direct valid enrollment flow only, keep portrait/profile separate from recognition/consent |
| W02-A11 | Requests force x-branch-id=ALL, overriding selected branch; authorized global visibility and selected scope can be confused | Initial members.js load for registrations/classes/payments/logs; new projection must honor selected scope and member authorization server-side |
| W02-A12 | Profile/name/URL interpolation into HTML can render unescaped values | Initial members.js sidebar/card and Face preview templates; prefer text/escaped attributes, check before claiming safe rendering |
| W02-A13 | Consents response handling assumes data object with consents; failures/default shape become no consents | Initial members.js allSettled/consentState extraction; verify endpoint envelope, do not infer absent consent or Face ID from a failed read |
| W02-A14 | Payment grid infers pending/expired ledger states and mixes gate logs | Initial members.js payment status cell; pending registrations belong in a separate view, not invented successful-ledger statuses |
| MOB-A01 | Hardcoded branch fallback `Paradise Gym Quận 1` can misidentify member's branch | `mobile/member/js/app.js:246`; read-only mobile finding, not changed here |
| MOB-A02 | Contact receptionist fallback supplies invented phone `02838221111` and street address | `packages-notifications.js:1331-1336`; read-only mobile finding; show missing data rather than invented operational contact |
| MOB-A03 | Mobile group invitation fetch failure becomes empty/no work | `home-schedule.js:61`; do not copy silent failure into staff popup |
| MOB-A04 | Mobile community view only queries today; no arbitrary date/branch/filter choice in this view | `home-schedule.js:964`; useful gap for Main review, not authorization to change Mobile or invent parity |
| MOB-A05 | Mobile package card computes an extra 7-day expiry condition despite API near-expiry/4-day rule | `packages-notifications.js:164`; read-only discrepancy; do not propagate into Web. Mobile helper/badge behavior needs owner verification |
| DOC-A01 | W02 US04 omits detail popup; Epic says no modal and eye action goes directly to W04. Product Spec role says 4 Mobile tabs while actual nav has 5 | QTV-W02-US04, QTV-W02 Epic, Product Spec role row; synchronize only the W02-related mapping and explicitly scoped mobile menu count |

Status of findings: observed in initial source snapshot, not runtime failures and not claims about the final worker version. UI changes may resolve these; re-read final code before handoff.

## Confirmed Direction From Main

- Main confirms the current group-invitations endpoint is MEMBER-only: QTV gets 403, hidden by existing allSettled fallback. Do not describe QTV as having invitation data until scoped read-only support exists.
- Main confirms registrations filtered by member_id currently return owner registrations only, omitting accepted group participation. The popup needs a same-member projection of owned and participating registrations; no assumption that owner-only data is the full Mobile-equivalent list.
- Main is considering read-only API support without schema change. Backend/API design is outside docs ownership; Main settles the support and UI consumes only the authorized selected-member data.
- Account projection excludes personal sessions/devices, passwords and logout. Do not call self-scoped settings/preferences as QTV then display the response as the member's. Same information does not grant QTV the member's self-service actions.
- Popup navigation, filters and read-only projection are in scope; no arbitrary changes to registration, payment, booking, consent or profile-edit business flows. Existing staff actions retain their canonical US/permission rules.
- Decision received: new QTV-only read-only `GET /members/:id/overview-data`, backend owner Dewey (`01a0c556-0887-7770-add8-9f06a9c62214`), supplies scoped registrations including group participation, invitations, bookings and classes. Existing profile/payment sources may remain where valid. No schema change; UI agent coordinates response contract.
- Refactored popup is QTV-only. LT retains its existing popup; this report does not claim LT received the new projection. Existing admin CRUD remains available through existing authorized flows elsewhere.
- Main confirmed these audit risks. No hardcoded business-row array was found in the old popup path inspected; distinguish genuine enum/menu definitions from misleading labels, defaults and calculated assumptions. Payment paging helper defaults to 20 (`backend/src/modules/core/http.js:67-68`), so the first-page total finding is specific, not conjectured full-history evidence.
- Gender verification: `backend/src/db/migrations/001_create_tables.sql:74` defines `member_profiles.gender VARCHAR(10) NULL`; `docs/database/erd.md:768` documents NAM/NU/KHAC. No missing-column/schema change requested. Web recognizes only MALE/FEMALE, while Mobile maps both forms; normalize rendering without inventing gender for null/unknown.

## Projection Contract Review

- Read updated backend contract in `brain-anti4/w02-member-overview/api_contracts.md`: profile comes from an explicit whitelist in overview-data. UI must not call legacy member detail for this popup because it overfetches registrations/prices/biometrics. Price fields are omitted without financial permission.
- Registrations use is_group_member; bookings use is_group_participant and only persisted participant snapshots, never present-day membership to reconstruct historical participation.
- Contract frozen: `brain-anti4/w02-member-overview/frozen-contract.md` supersedes the earlier progress contract. Main accepts authentication session heartbeat; the guarantee is no business-data writes in the projection, not zero writes across middleware. No auth edits or runtime claim by docs worker.
- Frozen keys: profile (explicit whitelist including branch_timezone), registrations, group_invitations.received/sent, bookings, community_registrations, booking_participants_available. No address/credentials/settings/biometrics. Booking/community branch_timezone belongs to the actual event branch; class discipline_name may be null.
- Complete arrays remain within authorized/selected scope; concrete selected branch must match member home branch. Owned + ACCEPTED registrations are deduplicated. Bookings keep booking ID and owner member_id; is_group_participant identifies actual persisted participation. No inference/backfill for legacy missing participant snapshots; false availability explicitly limits response to owner bookings.

## Documentation Sync

Completed against frozen field contract and current source. US04 now specifies each view, filters, tabs, registration expansion, package-level entitlement fields, dual booking confirmations, invitation direction, account whitelist, and receipt detail. Plan: [implementation plan](2026-09-22-member-popup-implementation-plan.md).

Changed business docs: QTV-W02-US04; QTV-W02 Epic; Product Spec scoped section 4.1; ui-related-screen-audit.md scoped W02 section; menu-and-user-stories-changes.md scoped W02 entry. This report and the implementation plan archive the audit and handoff. No frontend/backend/Mobile/ERD edits or shared DB operations by this worker.

Field contract freeze 19:11:05Z (6E797B...) includes the receipt viewer introduced at 19:10:26Z, superseding the earlier no-viewer instruction. Current badge-only freeze: 2026-09-21T19:17:30Z, members SHA256 6457B1B72C45FA6396BCDF61CF38E3A6C265FAF7883C8C443F86B2392DAB2A3C; CSS D7799DAE962E59A83ACC1BD87A310F1F03DE4040A7ED0BA452622D9C02365AF7. Source: tests/e2e/qtv/QTV-W02-US04/popup-refactor-20260922/ui-freeze.json. Status Badge in Grid preserves labels/data/filter logic.

Receipt UI has Xem phiếu thu action, inline detail with 12 readonly fields, payment_id validation, close and retry; no print/export. FROZEN is Đang đóng băng; SCHEDULED is Chưa đến ngày hiệu lực. Home requires ACTIVE and is_paid true. Account has no address or gate history. Null quotas render a dash, not inferred zero/unlimited.

Final source checks incorporated:

- Account: remove check-in block (no Mobile equivalent) and unsupported address field; retain same-member profile only, no personal security/session impersonation.
- Packages: include entitlements/progress, assigned PT and allowed branches; normalize is_group_member and canonical display_status rather than minimal registration-only columns.
- Bookings: expose dual confirmation and persisted group participant context; home shows pending invitations and future bookings.
- Payments: no payment-status filter; explicit method filter. Date/search/status/method filters use visible labels where implemented.
- Backend profile key is `profile`, not `member`; invitation object and participant flags follow final backend contract. Do not publish docs from the preliminary tiny UI projection.

## Validation

Completed documentation checks:

- node tests/docs/payment-diagrams.cjs with the US04 path: PASS, 1 diagram / 33 nodes / 38 edges; strict arity, decision labels and 3 namespace regression checks.
- node tests/docs/payment-render.cjs with the US04 path: PASS, 1 Mermaid diagram / 33 nodes with nonempty SVG geometry. This is not a full visual-layout audit.
- Six-column field-table validation and conditional Required check: PASS, 11 tables / 106 field-control rows; local US04 document links: 4/4 exist.
- Scoped git diff --check across the five business docs: PASS; only LF/CRLF normalization warnings.

No runtime or E2E PASS is claimed by this docs worker. Noether/Main own the final browser rerun and acceptance; their pending results are not inferred from source review.

## Unresolved Mobile Issue

Main relayed Noether's runtime finding: existing Mobile payments still filters status COMPLETED. Eleven confirmed records without payment.status therefore appear empty on Mobile; the new QTV ledger is expected to show the eleven confirmed records. This is an unresolved Mobile source defect, not evidence that the new QTV projection should copy that filter. No Mobile code or business rules changed here; do not claim 100% cross-role parity. Earlier MOB-A01 through MOB-A05 remain read-only findings, not resolved by the QTV refactor.

Backend evidence read: [Dewey handoff](../tab4-backend-db/2026-09-22-member-overview-walkthrough.md) and its referenced test-output. Backend owner reports 30 focused isolated checks PASS, syntax/scoped diff PASS and disposable database cleanup. This is backend evidence, not a UI/E2E claim or a test run by docs worker. Frozen response contract remains unchanged; no schema change, no business-data writes, accepted auth heartbeat.

Main reports server port 5000 restarted from old PID 12468 to PID 9260, health UP, resolving the old-process 404. Docs worker did not independently restart/probe that server; popup/UI verification still belongs to Main/Einstein.

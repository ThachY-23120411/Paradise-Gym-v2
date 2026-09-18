# W02 / W03 / W11 Rebuild Audit

Date: 2026-09-17. Owner: Tab1 member/catalog worker.

Frontend rebuilt in `frontend/web/js/modules/members.js` and `packages.js`. Source review, live PostgreSQL-backed read paths, browser field conditions, and a failed-write preservation check completed. Successful mutation persistence, immutable registration snapshots, audit rows and all role permutations are not claimed verified by this worker; coordinator owns integrated end-to-end verification.

## Read Scope

- Read all four QTV-W02 and all four LT-W02 stories completely: Main/Alternate/Exception flows, Activity Diagrams, every field-level table.
- Read all four QTV-W03 and all four QTV-W11 stories completely, plus corresponding QTV/LT epics.
- Read Product Spec profile identity/status, catalog/snapshots, branch operation, biometrics; QTV-W12-US02/03 for member-detail consent entry points.
- Applied `.agents/rules/ui-design-system.md`, `docs-sync.md`; checked coordinator's newly added `docs/ui-related-screen-audit.md` W02/W03/W11 mappings. No US, Epic, Mobile, shared, backend or ERD edits.
- Visual reference opened: https://phanmemtinhluong.com/phan-mem-quan-ly-phong-gym-paradise-gym/. Followed coordinator's compact forest/white/neutral treatment, shared classes and radius <=8 px. W03 retains the specified three-column card layout on desktop; cards collapse at narrow widths.

## Confirmed Contracts

Backend contract source: `docs/reports/tab4-backend-db/web-rebuild-api-contracts.md`, plus actual `core/catalog.js`, `operations.js`, `devices.js`, `http.js` read during integration.

- W02 uses existing member GET/POST/PUT endpoints; PATCH `/members/:id/status` carries only status/reason. Edit payload carries only full_name/email/date_of_birth; phone/home branch are immutable.
- W03 POST uses canonical GYM_TIME/GYM_SESSION/PT_SESSION/COMBO. Singular/plural session aliases are accepted on reads. PUT excludes immutable type/code; PATCH changes selling status. Branch IDs support `branch_ids` and `allowed_branch_ids`; names support `branches[].branch_name` and `allowed_branch_names`; detail supports `allowed_branches` too.
- Branch option lookups use `x-branch-id: ALL` through apiClient so options cover authorized scope rather than just the currently selected branch. Member table queries override the request header to match its explicit local branch filter. No global branch selection is mutated by the module.
- W11 GET/POST/PUT branches and `/branches/:id/stats`; counts use member_count, pt_count, currently_training, active_packages.{gym,pt,combo}, monthly_checkins, monthly_completed_pt. Missing values render `-`, never a fabricated success or zero.
- Role checks use authenticated active_role/user.role; multi-role accounts do not obtain QTV UI just because QTV occurs somewhere in roles[]. Missing or ambiguous roles fail closed. W11 requires active QTV and is_all_branches.
- Detail tabs use member registrations, `/pt-bookings?member_id=`, `/access-gate/logs?date=&member_id=` and `/members/:id/consents`. Access history has an explicit day picker because the current log API is day-scoped; returned records are filtered again by member_id before display.

## Traceability

| Story | Implemented behavior and field conditions | Actual evidence / remaining checks |
| --- | --- | --- |
| QTV-W02-US01 | Five fields: name required/trimmed; phone required/normalized/realtime unique; email optional format; branch prefilled readonly from working branch; DOB optional date picker with no default date. Auto-code/status left to server. Duplicate link opens accessible existing record. | Browser verified exactly five fields, blank DOB, readonly branch and live duplicate rejection. Successful create/account/audit pending integrated write test. |
| LT-W02-US01 | Same form; branch fixed to active receptionist scope, active branch required for creation. | Same shared form checked; separate receptionist creation and inactive-branch API denial pending. |
| QTV-W02-US02 | Prefill five fields; phone/branch readonly; only name/email/DOB submitted. Unchanged form makes no update. Required/email/date errors retain values. | Browser verified readonly phone on real member. Successful PUT, no-op audit count and concurrency pending. |
| LT-W02-US02 | Same edit restrictions plus current receptionist branch guard. | Shared code audited; dedicated LT success/403 checks pending. |
| QTV-W02-US03 | Separate modal: member/current status readonly, new status required and different, reason optional. PATCH status/reason; no registration changes or delete UI. | Form and request path audited. Persisted state, preserved history and reason audit pending. |
| LT-W02-US03 | Same status flow within receptionist branch. | Active-role guard audited; API 403 and history preservation pending. |
| QTV-W02-US04 | Six documented readonly data columns, code detail link, initials avatar, edit/status/W04 actions. Search debounce, three statuses, scoped branch filter, reset/retry, page sizes 10/20/50. | Live grid loaded five selected-branch members. Search/pagination server contract reviewed; complete cross-branch count tests pending. |
| LT-W02-US04 | Same grid; branch filter readonly at working branch; scoped empty state; unexpected out-of-scope rows rejected. | Code review and shared browser render completed; dedicated LT session test pending. |
| QTV-W03-US01 | Three-column package cards on desktop, code/type/limit, price, benefits, branch names, status; All/Active/Inactive tabs, edit/stop/reopen actions. | Seven real package cards rendered. 390 px screenshot has scrollWidth=clientWidth=390. No module page errors. |
| QTV-W03-US02 | GYM/PT/COMBO trigger; limit options dynamic and always visible. Duration always visible, optional only GYM sessions; Gym sessions only GYM/session; PT sessions only PT/COMBO. Positive integers/price, branch multiselect required, initial ACTIVE; no generated code UI. | Browser checked all four combinations. Aborted POST confirmed GYM_SESSION, duration null allowed, hidden PT null, no package_code, and retained input after network failure. Successful create pending. |
| QTV-W03-US03 | Fresh data prefill, immutable type/limit readonly, branches scoped, mutable catalog fields only; old registrations never written by module. Out-of-scope branch associations block editing rather than silently dropping them. | Browser checked both immutable controls readonly. Successful PUT and DB snapshot immutability pending. |
| QTV-W03-US04 | Stop-selling confirmation states effect on future purchases and preservation of old registrations; cancel does not write; PATCH only status. Reopen action on inactive cards. | Confirmation/request inspected; server race rejection and preserved contracts pending. |
| QTV-W11-US01 | Global-QTV guard; branch cards show name/code/status/address/phone/hours, three real KPI fields, stats/edit actions; empty/error/retry. | Browser rendered real branches on latest backend. Numerical aggregate truth against SQL and role permutations pending. |
| QTV-W11-US02 | Five editable fields, no generated code; name 3-100 unique, address 5-255, VN mobile/landline, strict HH:mm-HH:mm with close after open, ACTIVE default. | Browser verified code absent and reversed hours rejected. Successful generated code/scope/audit pending. |
| QTV-W11-US03 | Branch code readonly; all other fields prefilled, validated and submitted via PUT; status independent and hours editable. Emit paradise:branches-changed after save. | Payload/validation reviewed; successful update and impact on gate/sales pending integrated test. |
| QTV-W11-US04 | Right-side stats popup/drawer, branch identity/status/contact/hours, scale KPIs, active Gym/PT/Combo, current-month check-ins and completed PT. Close/refresh, error with unavailable values. | Endpoint shape checked against current branchStats implementation; browser route mounted; aggregate values and live IN/OUT transitions pending. |

## Cross-Module Integration

- Preserve MembersModule.render/refresh/openDetail/openMemberModal/openNewWithPhone/quickRegisterPackage. Added openStatus, openRecognition, openRevokeConsent, dispose.
- Preserve PackagesModule.render/renderPackages/renderBranches/openPackageModal/openBranchModal. Added openBranchStats, refresh, dispose.
- `render(containerId, context)` supports action=create and member_id; package render supports package_id; branch render supports branch_id. W04 navigation uses `ParadiseApp.navigateTo('registrations', {member_id})`.
- Member consent UI delegates enrollment/revocation to `SystemModule.openRecognition(memberId)` / `openRevokeConsent(memberId)`, now exposed by System worker. Errors are caught. It subscribes to `paradise:consent-updated` and refreshes the active consent tab; subscriptions/owned popups are disposed on navigation.
- W11 emits `paradise:branches-changed`; coordinator confirmed shell handles this.
- Shared hooks retained: view-header, view-header-title, view-actions, filter-bar, card-panel, status-badge, badge-success/warning/info. No business fixture data, random IDs, fake accounts/tokens, default prices/phones/branches, or InBody demo data remain in owned modules.

## Executed Checks

- `node --check` on both owned modules passed after implementation and contract updates. `git diff --check` passed (files were already untracked before work).
- Headless Chromium/Playwright on live `http://localhost:3000/web/`, initially isolated API 5062 backed by current PostgreSQL, then repeated against rebuilt API 5000. Isolated verification API 5062 was stopped; coordinator's 3000/5000 servers were preserved.
- Real seeded account authenticated through password plus development 2FA, not a fabricated bearer. Read evidence: three branches, seven packages, seven members globally, five members at selected branch. No database reseed or business-data mutations were performed.
- Verified five-field member create, no default DOB, readonly branch, live duplicate phone, readonly edit phone; all four package trigger combinations, hidden fields, required duration conditions, immutable edit type/limit; no generated branch code on create and reversed-hour validation.
- Failed-write test intercepted and aborted the outgoing package POST before it reached backend. Checked actual payload and retained form data. This proves UI failure handling and contract shape, not successful persistence.
- Desktop 1440x1000 and narrow 390x844 checked. Browser page errors: zero in tested flows. Narrow document width: 390/390 (no horizontal overflow).
- Screenshots in local temp: `paradise-members-cancel.png`, `paradise-w03-form-desktop.png`, `paradise-w03-mobile.png`, `paradise-w03-title.png`. Popup title dimensions checked after animation; full title fits after onShown layout correction.

## Remaining Integration Risks

- Successful create/edit/status writes, immutable registration snapshots, audit rows and concurrent-duplicate conflicts must still be verified by the coordinator/backend test pass. Do not label the 16 stories fully end-to-end verified based on field tests alone.
- At review time, existing seed COMBO data contains finite Gym sessions while W03 US defines time-based Gym benefit for COMBO. Cards display the actual stored finite value rather than inventing unlimited entitlement; create/edit fields follow US. Existing registrations are not touched.
- Final cross-owner source recheck: SystemModule now unwraps the consent response with latestConsents(consents), and enrollment posts consent_version/identity_verified directly instead of object-valued evidence. The previously reported schema mismatches are resolved in source; consent persistence and provider success remain pending integration verification.
- Real capture/test/READY and data-erasure completion cannot be verified without external device provider/process. No readiness is manufactured in W02.

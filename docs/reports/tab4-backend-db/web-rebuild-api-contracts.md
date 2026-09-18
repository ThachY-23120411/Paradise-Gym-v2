# Web Rebuild API Contracts (Tab4)

Status: core routes stable, **213 isolated PostgreSQL HTTP checks passed** on 2026-09-17, including the settlement trust guard and FINAL USER DECISION: automatic notifications only when QTV configures an enabled rule with an active assigned template. This is the shared coordinator handoff. Evidence and residual coverage: web-rebuild-walkthrough.md.

## Runtime and Authentication

- Base http://localhost:5000/api/v1; health /health -> UP, database POSTGRESQL. Existing watcher retained.
- Real bcrypt and signed access/refresh/temp-2FA token types; no demo/password/social identity bypass in mounted routes. Roles/scopes/session version reloaded from PostgreSQL per request. User includes roles:string[], role, active_role, branch_ids, is_all_branches, profile IDs and permissions.
- Exact authorized seed repair: **13 accounts**, matching original seed ID+phone+invalid hash, repaired transactionally with audit. No other hashes or business data reset/reseeded.
- Existing documented login QTV 0900000001 / Paradise@123 (2FA); LT 0900000002 / Paradise@123. Local backend/.env explicitly sets AUTH_OTP_MODE=development; response delivery:DEVELOPMENT_ONLY with dev_otp is NOT SMS delivery. Production ignores this mode.
- POST /auth/request-otp {login_phone,temp_token?} supports 2FA resend, 60-second expiry/rate limit and single use. Pending activation needs password >=8 characters on login-otp; SDK supports optional third password argument.
- Envelope {success:true,data,message}; non-2xx {success:false,message,code}. Primary auth/scope/validation/duplicate/database/provider errors are Vietnamese; some specialized business validation remains English.
- x-branch-id selects authorized working branch; ALL normalized to omission in SDK/server. List omission means all authorized branches. Global-QTV mutations requiring a branch must select explicitly; single-branch staff may use sole scope.
- Arrays retained for packages/branches/registrations/trainers/bookings/inbox/gate/catalogs. Members/payments/accounts/audit/notification-history use {items,total,page,limit}, limit<=1000.

## W01 and W10: Exact Frontend DTO

GET /dashboard?date=YYYY-MM-DD:
```text
data = {
  metrics:{active_members,cash_received,expiring_packages,pt_bookings,checkins,pending_registrations,pending_requests},
  access_logs:[],bookings:[],
  tasks:{pending_registrations,upcoming_bookings,awaiting_bookings,unassigned_registrations,offline_devices}
}
```
Task fields are counts. cash_received absent for LT/non-financial QTV. Booking count and list exclude CANCELLED. Device offline count uses observed heartbeat, not seeded ONLINE claims.

GET /reports?period=month|quarter|year&year=&month=&quarter= (financial QTV):
```text
data = {
  metrics:{cash_received,package_value,packages_sold,completed_pt},
  revenue:[{period,packages_sold,service_breakdown,service_counts:{gym,pt,combo},cash_received}],
  comparison:[{period,cash_received}],
  distribution:[{package_name,count,percentage}],start_date,end_date
}
```
service_breakdown is display text; service_counts is structured. Cash uses only completed payments.

## W02-W06 Resources

| Resource | Routes and fields |
| --- | --- |
| Members | GET /members, /members/search-phone?phone=, /members/:id; POST {full_name,phone,email?,date_of_birth?,home_branch_id?}; PUT /:id name/email/dob; PUT/PATCH /:id/status {status,reason?} ACTIVE/INACTIVE/ARCHIVED. Phone/home branch immutable. Detail includes registrations, latest consents by type, recent_access_logs, has_biometric_face. W02 stays home-branch scoped. |
| Packages | GET/POST /packages, GET/PUT /:id, PUT/PATCH /:id/status. Fields package_name,package_type,price,duration_days,total_gym_sessions?,total_pt_sessions?,branch_ids,description?,status. branch_ids/allowed_branch_ids aliases. Canonical **GYM_TIME/GYM_SESSION/PT_SESSION/COMBO**; plural session inputs accepted. Type immutable; existing snapshots unchanged on edits. |
| Registrations | GET/POST /registrations, GET /:id, POST /:id/renew, POST /:id/assign-pt {pt_id,note?}. Create member_id/package_id/start_date/sold_branch_id?; renewal package_id/start_date?. registration_code aliases reg_code; detail includes member/allowed_branches/assigned_pt/payments/progress. Filters member_id,pt_id,assigned_pt=assigned/unassigned. |
| Trainers | GET/POST /pt-bookings/trainers, GET/PUT /:id, PUT/PATCH /:id/status; GET /check-phone?phone= -> {exists}. Fields full_name,phone,email?,branch_id,specialties?,bio?. Phone immutable. Writes QTV; LT read. |
| Bookings | GET/POST /pt-bookings; GET /available-slots?pt_id=&date=; POST /:id/cancel, /:id/pt-confirm, /:id/member-confirm, /:id/confirm. Create registration_id/member_id/pt_id/branch_id/booking_date/start_time/end_time/workout_notes?. Filters date/date_from/date_to/member_id/pt_id/status. Five fixed2h slots08-18, stored work_days. Reservation moves remaining to booked; dual confirmation moves booked to used once. Staff /confirm only reconciles, never impersonates either party. |
| Mobile assignment | Existing GET /pt-bookings/assignment-requests, POST /assignment-request, POST /assignment-request/:id/respond retained with ownership/paid-entitlement guards. |

Live legacy registration currently has reg_code=NULL: aliases cannot invent a historical code. Frontend must recognize singular PT_SESSION/GYM_SESSION snapshots.

## W07 Gate and Privacy

- GET /access-gate/today-logs?date=&member_id= defaults today. GET /access-gate/logs?member_id=&date_from=&date_to=&limit=1000 has NO default date, returns up to1000 scoped historical rows.
- Logs include member_name/code/phone, package_name, registration_end_date, device_code/scan_point, source/access_method, event_time/check_in_time, direction/status/reason, actor_name/performed_by_name, branch_name, recorded_at. No invented telemetry.
- Cross-branch lookup: GET /access-gate/members?q= (2+ chars, working branch) -> max30 minimal identities {id,member_id,full_name,member_name,member_code,phone,status}. Only home-branch, registration-entitlement or prior-gate-history relationships at current branch.
- GET /access-gate/member/:id -> minimal identity plus {registrations,allowed_registrations,is_inside}; registration fields exclude price, receipts and personal profile. W02 permissions unchanged.
- GET /access-gate/presence?member_id=&branch_id= -> {is_inside} under same minimal-lookup boundary.
- POST /access-gate/manual-checkin {member_id,branch_id,registration_id?,direction:IN|OUT,reason,event_time?}. Real persisted allowed/denied event+audit, six IN checks,60-second duplicate guard, maxone gym deduction/member/day. OUT works after expiry but scope/duplicate guards remain.
- Response {allowed,reason,denial_code,reason_code,log,member,registration,door_command_sent:false,device_integration:NOT_CONFIGURED}. Vietnamese reason equals stored log.denial_reason; code persisted in audit.new_values.
- Denial codes: DUPLICATE_SCAN, BRANCH_INACTIVE, MEMBER_INACTIVE, OUTSIDE_OPENING_HOURS, REGISTRATION_NOT_OWNED, WRONG_BRANCH, GYM_ENTITLEMENT_REQUIRED, PAYMENT_REQUIRED, REGISTRATION_INACTIVE, REGISTRATION_NOT_STARTED, REGISTRATION_EXPIRED, GYM_SESSIONS_EXHAUSTED, NO_GYM_REGISTRATION.
- GET/PUT /access-gate/config; mandatory60-second/one-deduction policy cannot be weakened.
- **Automatic /check-in is an unconditional503 boundary: trusted hardware adapter NOT IMPLEMENTED.** No physical door action, K01 or hardware US01 completion claim.

## W08 Payments

- GET /payments paginated; GET /payments/stats; POST /payments/create-invoice {registration_id,payment_method,amount?,note?}; POST /:id/confirm {transaction_ref?,note?,manual_confirmation?}; GET /:id/receipt. POST /payments is atomic staff invoice+confirm.
- **Settlement trust boundary:** POST /payments and POST /payments/:id/confirm require authenticated QTV/RECEPTIONIST with financial permission and applicable branch scope. MEMBER receives403 PAYMENT_CONFIRMATION_FORBIDDEN, including for own CASH/BANK_TRANSFER invoices and already-completed invoices. Client manual_confirmation/transaction_ref/provider_verified/status/collected_by claims cannot grant settlement authority. No new acknowledgement workflow or public provider bypass. Bank-provider adapter remains unimplemented.
- MEMBER may still create its own BANK_TRANSFER pending invoice and read its own payment/issued receipt. MEMBER CASH invoice creation remains403. Denied direct-payment/confirmation calls leave registration, payments, receipts, business audit and notifications unchanged; staff normal collection and one-receipt semantics retained.
- CASH/BANK_TRANSFER, BANK_TRANSFER_VIETQR input alias. Exact100% snapshot amount only. Completion+activation+one receipt+audit+configured notification commit atomically; repeated/concurrent confirms return one receipt.
- Invoice {payment,registration,vietqr,qr_data}; QR aliases identical, transfer content "{reg_code} {member_code} PARADISE". URL generation is not bank receipt verification. Transfer intent expires after15min.
- Transfer confirmation requires actual reference OR explicit manual_confirmation:true; no fabricated transaction reference/provider verification. Completed payments immutable. List includes registration_code alias.
- **POST /payments/:id/check-bank-status unconditionally returns503 BANK_UNAVAILABLE: bank adapter NOT IMPLEMENTED.** Setting environment variables alone cannot enable it.
- Legacy POST /payments/check-bank-status reads stored state only with provider_status:NOT_CONFIGURED; never settles funds.

## W09 and W11-W13

- GET /notifications/events permits QTV/LT: event_type/event_code/event_name/channel/variables. Templates GET/POST /notifications/templates, GET/PUT /:id accept event_code/event_type; validate variables against event schema.
- Rules GET/PUT /notifications/rules by working branch: event_type/event_code/template_id/recipient_roles/modes or recipient_modes/is_enabled or is_active. DIRECT/BRANCH_BROADCAST aliases; partial toggle merges existing config. **FINAL USER DECISION: "Chi gui khi QTV cau hinh bat".** Automatic emit returns0 and inserts no notification when the event has no stored branch rule, the rule is OFF, or its assigned template is inactive. Missing branch also returns0. W09 toggles are authoritative for all event types, including newly added transactional events.
- An enabled rule uses only its assigned active template with matching event and same branch or NULL/global scope; a global template must be explicitly selected in the rule. Configured recipient roles/modes and active-account checks remain authoritative, with existing per-recipient event deduplication. Caller title/body cannot bypass configuration or override template content. Default templates, implicit template fallback and default transactional delivery were removed. This policy is final, not pending.
- GET /notifications/history paginated, date_from/date_to (from_date/to_date aliases), event_code/is_read/q. LT limited to member/PT recipients in scope. Own inbox/read retained. POST /notifications/send {template_id,account_ids,variables} persists authorized in-app delivery.
- Enabled rules govern transactional events. Scheduler every60sec handles reminders24h/2h and expiry7d/3d, with deduplication. NOTIFICATION_SCHEDULER_ENABLED=false disables it. No outage catch-up guarantee. Legacy PAYMENT_COMPLETED/name/creator data not silently rewritten.
- Branches GET/POST /branches, GET/PUT /:id, GET /:id/stats. Fields branch_name/phone/address/status/open_time/close_time/timezone, code generated. Writes/stats globalQTV.
- Devices GET/POST /devices, GET/PUT /:id, GET /catalog,/capabilities,/:id/events, POST /:id/test. LT readonly. Fields device_code/name/type/branch_id/direction/ip_address/location_description or location/enabled. Honest heartbeat/status; detail branch_name/updated_by_name from actual joins/audit (nullable). Events source:ADMIN_AUDIT, not telemetry.
- **W12 status contract (final):** POST/PUT `status` is validated against ONLINE/OFFLINE/ERROR/PENDING_SYNC/INACTIVE and persisted in existing `devices.status`; create defaults PENDING_SYNC, omitted update preserves the previous value. `configured_status` returns this saved selection in create/update/list/detail responses; editor must prefill from it, not effective `status`. Invalid/null/numeric statuses and non-boolean enabled are400, no write/audit. `DEVICE_CONFIGURED` audit old_values/status and new_values/status preserve the actual selection.
- `connection_status` is READONLY and derived: disabled or configured INACTIVE -> INACTIVE; no heartbeat -> PENDING_SYNC; heartbeat at least120 seconds old or future/invalid -> OFFLINE; fresh valid heartbeat with nonblank last_error -> ERROR; otherwise ONLINE. `status` remains the effective operational field for compatibility: when connection_status is ONLINE, apply configured_status; otherwise use connection_status. Thus manual ONLINE never overrides missing/stale/error telemetry, while fresh connectivity does not override configured OFFLINE/ERROR/PENDING_SYNC. Filters on status use effective status.
- Setting status INACTIVE disables the device; `enabled:false` also disables without discarding its other configured status. Reenable explicitly with `{enabled:true,status:ONLINE}` (or another non-INACTIVE configured status). Admin writes never change last_heartbeat_at/last_synced_at/last_error and cannot submit those fields. Dashboard offline_devices counts enabled, non-INACTIVE devices whose effective status is not ONLINE, including future heartbeats or unresolved errors. Test/READY remains503 even if a test fixture has healthy telemetry; no adapter was added. No DDL/new column/live telemetry changes.
- Optional `ip_address:null` explicitly clears the stored IP and is reflected in response/detail/audit. Omitted IP preserves the prior value. Gate readiness must prioritize effective `status`, not raw `connection_status`: a reachable device may still be configured OFFLINE/ERROR/PENDING_SYNC. Verified by the180-check run; parent owns frontend prefill/display changes.
- Incidents GET/POST /devices/incidents, PUT /:id; device_id/description/severity/status/timestamps/snapshot branch_name. LT report, QTV update.
- Consent GET /consents/catalog, GET/POST /members/:id/consents, POST /consents/:consent_type/revoke,/revoke-biometric. Explicit grant and verified identity (direct field or evidence.identity_verified); consent_version/policy_version, string/object evidence. Revocation immediately disables recognition; only explicit delete_requested queues deletion. Other consents/history retained. Audit actor_name/version/policy_version.
- **Device test/capture/test/ready and biometric-enrollment are unconditional503 integration boundaries, not configurable adapters.** Real telemetry, enrollment/readiness/hardware acknowledgment/physical deletion are NOT IMPLEMENTED; vendor contract and implementation required. Deletion process remains OPEN-05.
- Accounts GET /accounts,/accounts/stats,/accounts/:id,/accounts/:id/branch-scopes; GET /roles; POST /accounts; PUT /accounts/:id {status,roles,branch_ids,is_all_branches}. Stats roles/role_counts. Self/last-admin/higher-scope guards, session revocation. Audit GET /audit-logs enforces date_from/date_to/action/q with scope.

## Verification and Boundaries

- npm test creates/drop-only a dedicated generated PostgreSQL test DB, applies migrations twice safely, executes213 HTTP checks plus SQL/scheduler/configuration-policy assertions; no live reset/reseed.
- Additive002 migration applied; ERD reflects24 tables, added fields/FKs/indexes/triggers. db:seed refuses populated DB without both explicit destructive flags. Maintenance uses npm run db:migrate.
- Freeze/transfer/automatic refund excluded by Product Spec. Concurrent POST /registrations/:id/cancel, PUT /notifications/read-all, new notification event types and linked business emit calls are preserved. Automatic notification policy is resolved by the final user decision above; no default dispatch remains. Explicit QTV manual send is unchanged. Paid-cancellation policy (OPEN-04) remains separate and is not certified by this narrow correction.
- SMS has a generic configurable HTTP provider path (SMS_PROVIDER_URL/TOKEN), but no real vendor end-to-end verification. Social OAuth adapter is also NOT IMPLEMENTED.
- Mobile resource names/core fields retained; real authorization intentionally rejects old demo/member-self-settlement/unauthenticated-full-profile shortcuts. Pending activation requires a password. Full mobile UI regression/adaptation belongs to mobile owners; no mobile source edited.

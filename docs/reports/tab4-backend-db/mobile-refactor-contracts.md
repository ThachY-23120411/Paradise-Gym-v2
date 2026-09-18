# Mobile Refactor API Contracts (Tab4)

Status: BACKEND HANDOFF READY, 2026-09-17. **353 HTTP checks PASS** on isolated PostgreSQL, plus SQL assertions. USER APPROVED certificates, notification preferences and PT phone visibility only. No Main Flow/Activity Diagram edits performed.

## Integration Contract: Approved Fields (Implemented and Tested)

- Migration `003_mobile_preferences.sql`: accounts `notify_in_app`, `notify_pt_reminders`, `notify_new_bookings`, `notify_result_reminders` BOOLEAN NOT NULL DEFAULT TRUE. PT profile `show_phone_to_members` BOOLEAN NOT NULL DEFAULT FALSE; `certificates` JSONB NOT NULL DEFAULT `[]`, structured validation.
- Certificate DTO: array of `{name,issuer?,issued_on?,expires_on?,credential_id?}`; name required <=200, issuer<=200, credential_id<=100, dates YYYY-MM-DD, expiry>=issue, max50. Empty means no recorded certificates. Do NOT derive certificates from biography or seed fictional data.
- GET `/mobile/profile` returns actual own profile, `avatar_url`, `is_two_factor_enabled`, `preferences`. For PT also `certificates` and `show_phone_to_members`.
- GET/PUT `/mobile/preferences`: MEMBER `{notify_in_app,notify_pt_reminders,is_two_factor_enabled}`; PT `{notify_new_bookings,notify_result_reminders,show_phone_to_members,is_two_factor_enabled}`. Partial updates accepted; booleans only. Response all fields for active role, persisted DB values. No localStorage preference fallback.
- GET `/pt-bookings/trainers` and detail return certificates/avatar; MEMBER phone is NULL unless `show_phone_to_members=true` AND a registration is actually assigned to that member/PT. Registration detail `assigned_pt` obeys same policy. QTV/LT and own PT profile retain authorized phone.
- QTV personnel API may maintain `certificates`; PT profile is readonly and cannot self-edit certificates.
- PT trainer list/detail are restricted to own personnel profile. QTV/LT retain authorized branch lists; MEMBER receives eligible branch/assignment trainer list with phone privacy applied. Detail scopes explicitly retain request headers; no spread of Express request prototype properties.
- MEMBER phone change: POST `/auth/request-phone-change` `{new_phone}` -> `{challenge_token,ttl_seconds,delivery,dev_otp?}`; POST `/auth/confirm-phone-change` `{new_phone,otp_code,challenge_token}` -> fresh tokens/user after atomic account+member phone update and old-session revocation. Signed challenge binds account, target phone and session; no new schema for OTP.
- SDK exposes `mobile.profile()`, `mobile.getPreferences()`, `mobile.updatePreferences(data)`, `mobile.ptStatistics(period)`, `auth.requestPhoneChange(new_phone)`, `auth.confirmPhoneChange(new_phone,otp_code,challenge_token)`.
- POST `/mobile/avatar` and SDK `mobile.uploadAvatar({content_base64,mime_type})`: authenticated MEMBER only; pure base64 content (without data-URL prefix), PNG/JPEG/WebP <=5 MiB, file signature checked. Server-generated UUID filename in `AVATAR_STORAGE_DIR` (default backend/storage/avatars); both existing member/account avatar_url updated atomically. Returns `{avatar_url,mime_type,size_bytes}` after successful persistence. `PUBLIC_API_URL` can configure canonical origin; no base64 in database. PT avatar remains readonly personnel data.
- Cancellation SDK `pt.cancelBooking(id,reason,accept_late_fee=false)`: MEMBER upcoming BOOKED only, required reason<=150, 4-hour cutoff per HV02-US03. Below4h without explicit acknowledgement ->409 `LATE_CANCELLATION_CONFIRMATION_REQUIRED`; retry with `accept_late_fee:true` ->CANCELLED, is_deducted:true, one charged session. Early cancel ->CANCELLED/refunded. PT cannot cancel (403).
- Scheduled `BOOKING_REMINDER` is MEMBER 1-2h before start and PT 15-30min before start; exact server time, scoped to actual booked participants. No fake reminder list. `MEMBER_BIRTHDAY` variables `{member_name,birthday_date,branch_name}` uses actual DOB and branch timezone, one per member/local day, first scheduler tick on that day; requires W09 enabled rule+active template and member prefs. Expiry reminders at 7/3/0 days. No fabricated notification inserts without rules.
- Removed experience and rating/reviewcount are UI-owner work, no DB field added.
- Statistics response: `{period,start_date,end_date,metrics:{active_students,completed_sessions,upcoming_sessions,awaiting_confirmation,pending_requests}}`. Distinct assigned students with paid valid-period contracts overlapping selected period; completed requires both confirmations; bookings and requests counted in selected period. No UI-generated statistical fixtures.
- `auth.changePassword(current_password,new_password)` verifies current password server-side, returns replacement tokens/user; old access and refresh tokens revoked via existing session_version. Five failures lock password/OTP attempts for15min; successful credentials reset counters. OTP hashes, passwords and image base64 never enter audit records.

## Existing Mounted REST API

Base `http://localhost:5000/api/v1`, JSON envelope `{success,data,message}`. Signed real auth only. `x-active-role: MEMBER|PT` selects an assigned role; branch headers are for staff workflows, mobile should clear stale Web branch selection.

| Purpose | Existing endpoint and contract |
| --- | --- |
| Password login | POST `/auth/login-password` `{login_phone,password,active_role?}`. login_phone accepts phone or PT code; identifier is an alias. May return `{requires_2fa,temp_token,ttl_seconds,delivery,dev_otp?}`. |
| SMS login/activation | POST `/auth/request-otp` `{login_phone,temp_token?}`; POST `/auth/login-otp` `{login_phone,otp_code,password?,active_role?}`. Password required for pending activation. Development OTP explicitly labelled; no real SMS claim. |
| 2FA | POST `/auth/verify-2fa` `{temp_token,otp_code}`. GET `/auth/me`; POST `/auth/logout`. Current logout revokes all sessions via existing account session_version, not per-device. |
| Own member profile | GET `/members/:member_profile_id`; PUT same path `{full_name,email,date_of_birth,gender,avatar_url}`. Phone/home branch immutable on this endpoint. |
| Own PT profile | GET `/mobile/profile` returns avatar/branch and persisted security/preferences; `/pt-bookings/trainers/:id` also enriched. PT cannot edit core personnel information. |
| Assigned students | GET `/members?limit=1000&q=` enforces assigned PT, including actual assigned students whose home branch differs. GET detail returns only assigned registrations for PT. |
| Packages/progress | GET `/packages`, `/packages/:id`, `/registrations`, `/registrations/:id`. Own role filtering; PT prices removed. Detail progress uses real booking/check-in counters. |
| Bookings | GET `/pt-bookings?date=&date_from=&date_to=&status=&member_id=`; scoped to self. GET `/pt-bookings/available-slots?pt_id=&date=`; POST `/pt-bookings` `{registration_id,pt_id,booking_date,start_time,end_time,branch_id?}`. |
| Dual confirmation | POST `/pt-bookings/:id/pt-confirm` `{workout_notes?,fitness_assessment?}`; MEMBER `/member-confirm` without notes. SDK ptConfirm(id,data) passes payload. Each side once only; MEMBER cannot overwrite notes; PT may confirm once session has started, MEMBER after end. Staff cannot impersonate a participant. |
| Assignment | GET `/pt-bookings/assignment-requests`; POST `/assignment-request` `{registration_id,pt_id,request_note?}`; POST `/assignment-request/:id/respond` `{status:ACCEPTED|REJECTED,response_note?}`. |
| Inbox | GET `/notifications`; PUT `/notifications/:id/read`; PUT `/notifications/read-all`. Own account only. Automatic delivery ONLY with QTV-enabled branch rule + selected active template. |
| Payments | POST `/registrations`; POST `/payments/create-invoice` `{registration_id,payment_method:BANK_TRANSFER}` -> `{payment,registration,qr_data,vietqr}`. QR fields `bankBin,accountNo,accountName,amount,transferContent,qrImageUrl`; do not construct frontend bank details/random transfer strings. GET `/payments/:id` reads stored status. MEMBER cannot self-settle or create CASH invoice (403). Actual bank verification remains503. |
| History | GET `/payments?limit=1000`; GET `/payments/:id/receipt`; GET `/access-gate/logs`. Own member access only. |

## Existing-Field Implementation

- Auth PT-code resolution, active-role SDK arguments, role-scoped activation lookup with masked identifying data only (no public full profile).
- GET/PUT `/auth/security` for existing `accounts.is_two_factor_enabled`; no notification preference fields silently accepted.
- POST `/auth/change-password`, current password verification, strong password validation and session revocation/renewal.
- GET `/mobile/profile`, GET `/mobile/pt/statistics?period=week|month|last_month`, actual joins/aggregates only; SDK methods to match.
- Avatar stored URL validation using existing avatar fields; PT avatar from accounts. No fabricated profile values.
- Role/ownership filtering, student cross-home-branch visibility when actually assigned, confirmation writes restricted to participant-owned fields.

## Decisions Remaining: Do Not Add Schema Yet

| Item | Actual storage gap / consequence |
| --- | --- |
| Member rank / VIP | No authoritative field/rule in schema; do not infer rank from arbitrary package price. |
| Trusted/new device, logout current-device only | No device/session registry. Existing session_version supports account-wide revocation only. Requires decision; no fabricated trusted-device state. |
| Signup home branch | `member_profiles.home_branch_id` NOT NULL but HV06-US03 form has no branch selector/default rule. Parent must resolve data source, not select first branch silently. |
| Biometric availability | Consent fields and face status already exist; real device enrollment/readiness/deletion adapter unavailable. No extra schema needed just to display stored state; never show READY based solely on consent. |

## Existing Spec/API Mismatches To Resolve Without Rewriting Flows

- Activation now enforces MEMBER minimum6, PT minimum8 with uppercase/lowercase and digit/symbol; maximum72 UTF-8 bytes prevents bcrypt truncation. Signup remains unimplemented awaiting branch decision.
- OTP-only login now completes after one verified SMS even with 2FA enabled, matching written passwordless flow. Password login still requires2FA when enabled.
- Public activation summary contains only masked name/code/phone, never full profile/branch/ID. Authenticated GET profile returns full owned data. Parent approved masking and owns Field-level wording; Main Flow untouched.
- Server enforces maximum4 OTP sends (initial+3 resends) per account/15-minute window across purposes with existing audit records, 60s resend cooldown and single-use60s OTP. Conservative rolling-window cap cannot be reset by frontend reload. No new device-recognition implementation.
- Bank identity now requires explicit server env `BANK_BIN/BANK_ACCOUNT_NO/BANK_ACCOUNT_NAME`; removed hardcoded fallback beneficiary. Invalid/missing config ->503 `BANK_CONFIGURATION_REQUIRED`; no pending invoice is committed on failure. Config presence does NOT verify bank account or funds.

Only approved migration/ERD additions plus backend/shared/report files changed. No seed, mobile source, Web source, Main Flow, or Activity Diagram edited. Migration003 was applied to local DB with `npm run db:migrate` after isolated tests (2026-09-17 08:57 UTC); readback confirmed exactly six approved new columns with correct types/defaults. Backend health UP/PostgreSQL. No live profile, booking, receipt, payment, preference mutation or reseed was invoked; application scheduler remains its normal running service.

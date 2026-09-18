# Mobile Member: Decisions and Backend Gaps

Status: early audit, 2026-09-17. Owner anti-2-HV. All 18 member stories across HV01-HV06 read (including diagrams). No User Story or database edit authorized/performed by this owner.

## Latest Parent Decisions

- Approved persisted HV in-app/PT reminder preferences; consume GET/PUT /mobile/preferences. Parent owns field tables, core owns migration/ERD.
- Approved removal of fabricated PT rating/experience (HV-D02/HV-D03); no schema added for them.
- **HV-D01 remains pending: existing UI does fabricate tier.** Old index.html accountMemberTierText defaults "Hoi vien VIP"; old auth-account.js derives VIP only when local user.tier is VIP and otherwise fabricates "Hoi vien Thuong". No DB column. Keep tier UI with neutral unknown until parent chooses add field or removal. Epic HV04 mentions tier; HV04-US01 table does not.
- Self-service member phone is editable with secure OTP per specific HV04-US01; do not confuse immutable staff editing endpoint with self-service flow. Use new /auth/request-phone-change and /auth/confirm-phone-change.
- Signup branch selector and device trust decisions remain pending; no arbitrary home branch.

## Integration Alert (Current Running Server)

2026-09-17: all six MemberApp modules are now physically present and registered. Browser real login succeeds; 30 route/viewport reads (390/768/1280) have no JS errors/no document overflow. However live :5000 returns404 for GET /mobile/profile, despite endpoint source now existing. Core/parent must mount/restart/deploy additive migration003 before full live profile/preferences verification. Frontend currently displays error+retry honestly. No fallback account or business records.

Avatar upload contract is now available; member owner integrating POST /mobile/avatar with actual selected file only. Late cancellation now submits explicit accept_late_fee after displayed 4h warning.

## Immediate Corrections Using Existing Data

| Existing hardcoded or fabricated value | Source already available | Correction |
| --- | --- | --- |
| Fixed member ID/name/phone, fallback to Tran Thi Binh, auto-login seed password | Authenticated /auth/me.member_profile_id and /members/:id | No fallback identity, no fetch before verified session, own-profile only |
| Fixed branch IDs and all-branches entitlement text | /branches and package/registration allowed_branch_ids | Resolve actual branch names and scope; never invent branch |
| 30/90 default days, 12 PT/30 Gym sessions, guessed progress/type | Package and immutable registration snapshots/counters | Nullable missing value, compute only from actual dates/counters |
| Random registration/booking/payment codes; PAY-to-PT receipt replacement | Server registration code, booking ID/code, /payments/:id/receipt | Display actual codes only, missing code is unknown |
| Random QR transfer content, fixed VietinBank/STK/THACH NHU | create-invoice.vietqr / qr_data from server configuration | Show only server QR; no frontend-generated bank identity or payment settlement |
| Locker/sauna/InBody/free floor coaching benefits on every package | packages.description exists | Render actual description only, not promised extra benefits; existing UI description field retained |
| Fake success on booking/cancel/confirm/profile and mutated session counters | Authenticated mutation API response, followed by reread | Await server commit; errors retain form and old persisted state |
| OTP 123456 / browser-verified OTP / local lockout as authority | Server OTP challenge/verify and account lockout | No fixed code, no client verification; explicitly label server development OTP |
| Default 1995 birthday/male, local avatar/name | member_profiles date_of_birth/gender/avatar_url | Empty/null when unknown; save through API |
| PT specialty default, names, dates and request notes | pt_profiles and assignment request joins | Actual values or explicitly unknown |

## User Choice Required: Existing UI Without Database Field

Do not add schema or remove these controls without parent/user choice. Until resolved, retain neutral unknown/unavailable display (no invented value).

| ID | Field currently fabricated | Existing location | Choice 1 | Choice 2 |
| --- | --- | --- | --- | --- |
| HV-D01 | Member tier VIP/Thuong | auth-account.js account tier badge; no tier in member_profiles/accounts | Add approved membership-tier field and matching ERD/field specification | Remove tier badge from account UI |
| HV-D02 | PT rating always 5.0 | packages-notifications.js availablePts.rating | Add approved rating data model/source | Remove rating from PT selection UI |
| HV-D03 | PT experience "Nhieu nam kinh nghiem" | packages-notifications.js availablePts.experience | Add approved experience field | Remove experience from PT selection UI |
| HV-D04 | In-app notification on/off preference | auth-account.js local notifInApp; absent DB field | Add approved persisted preference | Remove toggle, with user-approved field specification change |
| HV-D05 | PT reminder on/off preference | auth-account.js local remindPt; absent DB field | Add approved persisted preference | Remove toggle, with user-approved field specification change |

Note: gender has an existing DB column but is absent from HV04-US01 field table. Parent decides whether to retain and document field only; do not edit Main Flow/Activity Diagram. The current UI control is retained using actual API data while awaiting documentation decision.

## Backend Needs (Existing Columns Only)

Please coordinate concrete endpoint contracts; this owner will consume SDK request() when a helper is absent.

1. Authenticated self profile phone change with server-generated OTP bound to account/new phone/purpose; final atomic member_profiles.phone + accounts.login_phone update. Existing members.update rejects phone. Need endpoint request/verify/save, not reuse login OTP.
2. Authenticated change-password and toggle 2FA using existing password_hash/is_two_factor_enabled, return persisted state via /auth/me or profile. No local success.
3. HV06 activation lookup and registration OTP/account creation: existing /members/search-phone is staff-only. Need safe activation lookup + signup request-otp/complete; no public full profile leak. US requests name/member code/branch before OTP, privacy mismatch needs parent decision rather than silently changing flow. Signup home_branch_id required in DB but absent US inputs; do not choose arbitrary branch.
4. Image upload: existing avatar_url VARCHAR(500) accepts URL, not base64. Need authenticated upload or storage contract for file input; UI can report unavailable without fake preview saved.
5. /pt-bookings/available-slots response must include occupancy without exposing another member; requesting own bookings separately is sufficient. MEMBER /trainers must list PT eligible across registration allowed branches.
6. Bank invoice existing QR uses server env configuration, but bank check/webhook NOT IMPLEMENTED. Display pending honestly; never call payments.confirm from member app.

## Spec Conflicts Requiring Parent Attention (No Flow Edits)

- HV06 activation/signup minimum password 6 vs mounted API minimum 8. Do not rewrite main flow/diagram; front end follows server validation and reports conflict.
- Product Spec says cancellation 12h, specific HV02-US03 says 4h. Use specific US 4h and server policy; flag divergence.
- HV05 has no Field-level specification table yet. Read existing main/diagram; parent decides field-table addition only.
- HV03 history says all payments VietQR, but valid desk CASH payments may exist. Display actual method, never mislabel cash as VietQR.
- HV03 notification wording assumes automatic send; final user decision requires QTV enabled rule + active assigned template. UI reads persisted inbox only.

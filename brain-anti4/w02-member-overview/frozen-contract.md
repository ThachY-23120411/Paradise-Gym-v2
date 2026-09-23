<!-- READ_BY: anti-3, anti-1 -->
# FROZEN response keys for Main / Einstein / Rawls

GET /api/v1/members/:id/overview-data. Implementation in backend/src/modules/core/memberOverview.js. Keys frozen after main's timezone/profile review; final isolated tests running next. Prior api_contracts.md is historical progress; this is the integration contract.

```js
{ success: true, message: 'Success', data: {
  member_id,
  profile,                     // object; use this instead of legacy getMember
  registrations,               // array
  group_invitations: { received: [], sent: [] },
  bookings,                    // array
  community_registrations,     // array
  booking_participants_available // boolean
} }
```

- profile whitelist: id, member_code, full_name, phone, email, date_of_birth, gender, avatar_url, status, home_branch_id, home_branch_name, branch_timezone, created_at. No address/credentials/account settings/biometrics. New popup must not call legacy /members/:id, which overfetches prices and biometric state.
- registrations: actual owned + ACCEPTED membership, deduplicated. is_group_member is boolean (false owner, true participant), not member_relationship. Canonical status remains ACTIVE when is_expiring=true/display_status=EXPIRING; is_paid means confirmed_at IS NOT NULL. Includes reg_code/registration_code, package snapshots/entitlements, assigned_pt_id/name/code, branch_name/sold_branch_name, allowed_branch_ids and allowed_branches:[{id,branch_name}]. Price snapshot columns only when view_financial === true. See explicit SELECT for full flat fields; no wildcard objects.
- group_invitations is an OBJECT, not array. UI derives direction from received/sent; status from invitation_status. Each row: id,registration_id,member_id,recipient_member_id,inviter_member_id,invitation_status,joined_at,created_at,inviter_name,inviter_code,recipient_name,recipient_code,reg_code,package_id,package_name_snapshot,package_type_snapshot,package_mode,total_pt_sessions_snapshot,start_date,end_date,registration_status,sold_branch_id,branch_name,assigned_pt_name. Names join actual member profiles. registration_status here is persisted registration status.
- bookings: owned or actual persisted pt_booking_participants, never inferred from group membership. id remains booking ID; member_id remains owner; is_group_participant identifies selected member's participation. Includes timing/status, session_number, training notes/assessment/confirmations, trainer/package/branch metadata; branch_timezone comes from the actual booking branch.
- community_registrations: id,class_id,member_id,registration_date,status,title,class_date,start_time,end_time,branch_id,branch_name,instructor_name,class_status,branch_timezone,discipline_name. discipline_name is nullable and joins real class_disciplines. No class price/bonus output.
- All arrays are complete within authorized/selected scope, not paged. Registration/invitation sold branch; booking branch; community class branch. Concrete selected branch must match member home branch. Errors propagate; no successful empty fallback on query failure.
- If migration013 relation is missing: booking_participants_available=false with owner-only bookings. Even when table exists, legacy bookings without snapshot rows are invisible to nonowners. No backfill/mutation.
- No business-data writes: repeatable read/read-only projection transaction. Main explicitly permits existing auth session heartbeat; no auth edits. No new schema or changes to commerce/bookings/mobile behavior.

Recipients: Einstein 01a0c445-9b07-70a1-803b-617d577d783e/main; Rawls 01a0c445-9c2e-75a3-b54e-13a226eb1e4e. Shared mailbox delivery, not direct messaging. Backend tests do not certify UI integration.

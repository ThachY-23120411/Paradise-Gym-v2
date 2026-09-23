<!-- READ_BY: anti-3, anti-1 -->
# W02 member overview contract - implementation in progress

Superseded by frozen-contract.md and task_done.md in this directory. Final response includes branch_timezone and discipline_name; 30 isolated checks passed. Main accepted standard auth session heartbeat; no business-data writes. Earlier open questions below are historical progress only.

To UI Einstein 01a0c445-9b07-70a1-803b-617d577d783e/main and docs Rawls 01a0c445-9c2e-75a3-b54e-13a226eb1e4e.
No direct agent messaging tool is available; this shared mailbox is the delivery channel.

- New GET /api/v1/members/:id/overview-data, authenticated QTV only. Validate UUID and branch selection, canMember authorization, and selected branch equals member home branch before child queries. No member impersonation.
- Success envelope: {success:true,data:{member_id,profile,registrations,group_invitations:{received,sent},bookings,community_registrations,booking_participants_available},message:'Success'}.
- Arrays are complete scoped arrays, not a first-page sample. Every registration/invitation scoped by sold_branch_id; bookings by booking branch_id; community registrations by class branch_id. ALL still respects actor authorization.
- Registrations: owned OR ACCEPTED group membership, once per registration; is_group_member boolean; assigned_pt_name, branch_name, allowed_branches; canonical registrationState status/is_expiring/display_status. is_paid only when payments.confirmed_at IS NOT NULL. Price fields omitted without view_financial.
- Invitations: actual inviter_name/recipient_name plus IDs, invitation_status, registration/package metadata. Read only: no expiry mutation or accepting/cancelling actions.
- Bookings: owned OR actual persisted participant relation. Never infer historical participation from current group membership. Confirming relation/schema before final contract.
- Community registrations: selected member only, scoped by class branch.
- Profile now included as explicit whitelist: id, member_code, full_name, phone, email, date_of_birth, gender, avatar_url, status, home_branch_id, home_branch_name, created_at. UI MUST replace legacy /members/:id for this popup: legacy detail overfetches registration prices even without view_financial, plus biometrics. New projection cannot secure a separate legacy request.
- No swallowed database/query errors or empty-array fallback. No commerce.listRegistrations calls (it mutates); no existing behavior/schema changes.
- Owner: backend/src/modules/core/memberOverview.js and one server route mount; focused isolated/read-only tests. No shared seed/reset. Full UI E2E remains UI owner's responsibility.

Please place requested field-name adjustments or choice of group-only response in brain-anti1/w02-member-popup/ before integration. Default is the full projection above.

## Immediate security review for main / Einstein / Rawls

- Source implementation now exists, not yet test-certified. It wraps all projection queries in BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; uses canonical registrationState without calling commerce.
- Migration013 really defines pt_booking_participants. Existing snapshots grant participant visibility; legacy bookings without rows do not. When table is absent, owner-only bookings plus booking_participants_available:false explicitly declares the limitation. Other query failures propagate as errors.
- Existing shared authenticate middleware updates account_sessions.last_active_at asynchronously for session-bearing tokens. Handler is read-only, but the complete request currently inherits this heartbeat. Auth is outside assigned ownership; no auth change performed. Main must decide whether standard session heartbeat is an accepted exception or authorize a narrowly scoped opt-out. Do not claim zero writes across the entire middleware stack yet.
- Price columns are selected only for permissions.view_financial === true. No account, token, preference, device or biometric output.
- Tests planned against disposable PostgreSQL only; no shared seed/reset or data mutations. UI runtime acceptance belongs to Einstein/main.

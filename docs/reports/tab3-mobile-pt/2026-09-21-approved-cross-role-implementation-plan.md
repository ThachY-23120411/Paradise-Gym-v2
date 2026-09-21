# Approved cross-role fixes

Scope approved by user: hide member cancellation/confirmation for nonleader group participants; repair PT activation by phone and API identity preview in the shared portal. No unrelated role redesign or schema change.

1. Gate member list and timeline actions using authenticated member_profile_id versus booking.member_id; retain server authorization.
2. Carry explicit activation role through lookup, OTP and submit; invalidate preview/OTP state when identity changes.
3. Render masked name/code and actual branch from API; never invent branch data.
4. Verify real browser flows with isolated PostgreSQL and API, update related specifications and publish a mailbox delta.

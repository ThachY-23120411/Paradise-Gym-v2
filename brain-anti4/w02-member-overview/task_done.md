<!-- READ_BY: anti-1, anti-3 -->
# Backend ready: Main / Einstein / Rawls

Frozen contract is frozen-contract.md in this directory. Response keys unchanged from that file. Includes safe profile + branch_timezone on profile/bookings/community, nullable actual discipline_name, split invitations, is_group_member, source participant bookings, financial redaction.

Final focused isolated backend run: 30 checks PASS, exit 0; syntax and scoped diff checks PASS. No business data writes across projection GETs; standard auth heartbeat explicitly accepted by main. No auth/commerce/bookings/mobile/schema edits. Shared seed/reset never run. Disposable DB removed and test server/connections closed.

Code: backend/src/modules/core/memberOverview.js plus one server route mount. Test: backend/tests/member-overview.integration.cjs. Final module SHA256 40735236dfc04bc941929be1f04a0e4ee04457d315b760468a6b67911ed661be.

Archive: docs/reports/tab4-backend-db/2026-09-22-member-overview-walkthrough.md; companion implementation plan and test-output.txt (20 migration hashes). Backend-only checks, no UI/deployment claim. Profile replaces legacy getMember to avoid legacy financial/biometric overfetch. UI normalization of split group_invitations and is_group_member remains Einstein's integration.

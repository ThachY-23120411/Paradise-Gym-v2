# QTV W02 member overview backend handoff

Implemented GET /api/v1/members/:id/overview-data in backend/src/modules/core/memberOverview.js; mounted through one added server.js route registration. All existing dirty source changes preserved. No commerce/bookings/mobile/auth edits, production schema changes, shared seed/reset, or explicit shared server restart.

Frozen integration contract: ../../../brain-anti4/w02-member-overview/frozen-contract.md. Recipients: main, Einstein 01a0c445-9b07-70a1-803b-617d577d783e, Rawls 01a0c445-9c2e-75a3-b54e-13a226eb1e4e. Delivered through shared mailbox; no direct messaging capability available.

## Source Action Verification

Backend-only acceptance, per requested scope. Run from backend: `node tests/member-overview.integration.cjs`. Final run exit 0, 30 checks (HTTP status checks and grouped assertions). Syntax checks and scoped git diff --check passed. Log and all 20 applied migration hashes: 2026-09-22-member-overview-test-output.txt beside this report.

Verified unauthenticated/non-QTV denial; malformed member/branch IDs; conflicting scope; missing member; unauthorized and selected/home branch mismatch; authorization before child/profile queries; safe profile whitelist; owner plus accepted group membership without duplicate registrations; actual inviter/recipient identities; persisted participant identity; sold/booking/class branch scoping; financial redaction; canonical ACTIVE + EXPIRING projection with confirmed payment and exclusion of pending intents; profile/booking/class timezone from DB; actual discipline name; missing participant table explicitly reported; other query failure produces 500 and recovery succeeds.

## State Verification

Projection uses bound parameters and explicit fields inside one REPEATABLE READ READ ONLY transaction. Eleven business tables were snapshotted before and after successful and rejected GETs and compared for full equality. Main permits the existing auth account_sessions heartbeat: this is no business-data writes, not zero middleware writes.

Tests reused the existing isolated PostgreSQL fixture helper, applied migrations 001-020 to a new disposable database, and inserted scoped test fixtures only there. Missing-relation scenarios temporarily renamed tables only in that disposable database and restored them. No configured/shared business database writes or seed/reset. Cleanup completed: disposable database removed, server stopped, DB connections closed.

Final module SHA256: 40735236dfc04bc941929be1f04a0e4ee04457d315b760468a6b67911ed661be. Rechecked against disk after final run. Tests include pending payment_intents; an old-schema payments row with null confirmed_at is excluded by the explicit predicate but was not instantiated under the current NOT NULL ledger schema.

## Cross-Role / Downstream Verification

UI/E2E not run by this backend workstream. Main/Einstein owns actual popup and downstream acceptance. New popup must use returned profile rather than legacy /members/:id, which still overfetches prices/biometric state. New endpoint authorization does not secure a separate legacy request. No member impersonation or self-scoped notifications/preferences/devices endpoints are used.

## Issues Found

No failing final backend checks. Expected injected missing community relation logs PostgreSQL 42P01 and returns HTTP 500; it is intentional error-propagation coverage, not a passing empty array.

Persisted participants only: legacy bookings lacking participant rows remain owner-only, even if current membership is accepted. If the participant table is absent, booking_participants_available=false explicitly accompanies owner-only booking data. No historical backfill or inferred participants.

Initial 29-check run passed before timezone additions. Final 30-check run supersedes it. Review found two test labels emitted PASS ahead of their assertions; both were corrected before the final run. Existing shared auth heartbeat was reviewed and explicitly accepted by main; no auth change needed.

## Final Result

Backend projection complete, 30 focused checks passed on disposable PostgreSQL. Frozen contract published for integration. Full UI parity and deployed-server verification remain outside this backend-only handoff and are not claimed.

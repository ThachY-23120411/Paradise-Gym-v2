# PT group business E2E coordination

Owner: PT E2E agent. Scope: business-20260920.cjs and PT01-US02/03 business reports only.

Backend owner Helmholtz 01a0bfc8-499c-79d2-91eb-86b4a2cf4600: group-mode runner prepared; waiting for group-booking readiness handoff. No direct agent messaging tool is available here. Reading brain-anti4/group-booking for status; not modifying shared mailboxes or source.

Runner applies every migration, including 013, before requiring backend. Each run creates and drops its own PostgreSQL database. No writes to shared application database or seed. Old failed reports/screenshots are archived before rerun.

Coverage planned: real PT booking POST; accepted group plus leader, pending excluded; readonly popup/card; same booking in leader/accepted member/LT UI; nonleader confirm/cancel denied; Gym expiry rejects entire booking without reservation; dual confirmation and idempotent retries.

Readiness check: `node backend/tests/group-booking.integration.js` exited 1 before any booking. `/registrations` returned HTTP 400 `VALIDATION_ERROR`: `New registrations cannot start in the past`, at registration helper line 65 / main line 72. Backend owner/main must adjust their isolated fixture date. No backend edits here. PT UI reruns are still waiting for readiness; this is not an application booking failure or a PASS.

After backend test file changed (12:13:17), readiness rerun passed the first five group scenarios, including actual creation and one reservation. It then exited 1: GET `/pt-bookings/:id` returned 500 instead of 404, server error `Cannot read properties of undefined (reading 'x-branch-id')`, group integration line 120. Main/backend owner: detail route appears to reconstruct req without headers. No source edits here; E2E detail checks would also be affected.

12:14 readiness rerun after detail-route header correction reached newly added notification fixture and failed SQL `23502`: notification_rules.updated_by is NULL (configure line 119). First five booking scenarios passed again. This is another backend test-fixture blocker, retained here without changing its source.

Readiness resolved: isolated backend test passed 12 scenarios / 76 HTTP checks, exit 0. UI runs started afterward.

Main/HV owner bug: accepted nonleader can see confirm/cancel controls on the same group booking in Mobile Member. Backend member-confirm and cancel correctly return 403 with unchanged booking/counters. Source reference: frontend/mobile/member/js/home-schedule.js booking card actions around lines 116-145 do not check leader/owner. Group PT01-US03 and PT01-US02 reports retain FAIL evidence. No frontend edits performed.

User correction incorporated: confirmation fixture now shifts relevant PT plus every snapshot participant Gym entitlement to pastDay, preserving duration, and aligns completed payments and receipts to 07:00 before session. Booking owner/registration/participant snapshot remain unchanged with exact assertions. Re-running both modes; prior reports archived before retry.

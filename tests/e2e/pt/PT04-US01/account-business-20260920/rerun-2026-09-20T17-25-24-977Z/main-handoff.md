# Account E2E Regression Rerun

Final result: **71 PASS, 0 FAIL, exit 0**. Completed 2026-09-21 local time. [Machine-readable result](./run-result.json).

- Both previous generic-notice failures resolved: full timestamp equals the actual API `created_at` formatted in the browser; dismissing the dialog restores the inbox with the unread filter and remaining unread item.
- Official assignment passed using real member, package, registration, cash payment, notification-rule and assign-PT APIs. The emitted `PT_REQUEST_ACCEPTED` / `REGISTRATION` notification opened the matching member/package detail. Read state persisted; assignment and session counters stayed unchanged.
- Partial-avatar-save retry passed: real local PNG upload succeeded, only the following profile PUT was aborted to produce a network failure. UI displayed the partial-save warning, retained email draft and enabled retry. Pending file cleared. Retry saved email without a second upload; stored avatar URL stayed unchanged and rendered after reload and on the same PT's Web detail.
- Existing profile/avatar validation, preferences, password change and current/all logout checks also passed. No additional cases beyond the requested regressions were added.

## Reports

- [PT03-US01: notifications and assignment link, 9 PASS](../../../PT03-US01/account-business-20260920/rerun-2026-09-20T17-25-24-977Z/PT03-US01-test.md)
- [PT04-US02: profile, avatar and retry, 25 PASS](../../../PT04-US02/account-business-20260920/rerun-2026-09-20T17-25-24-977Z/PT04-US02-test.md)
- [PT04-US01: preferences and password, 29 PASS](./PT04-US01-test.md)
- [PT05-US03: logout, 8 PASS](../../../PT05-US03/account-business-20260920/rerun-2026-09-20T17-25-24-977Z/PT05-US03-test.md)

## Evidence And Cleanup

All 71 referenced annotated screenshots exist and have unique hashes; browser page-error arrays are empty. Timestamp, restored filter, official client detail and partial-save/retry screenshots were visually inspected. All 75 original evidence files remain byte-for-byte unchanged (SHA256 comparison). The preceding rerun is also retained; its filter failure was an incorrect test selector for a button group, corrected before this final run.

Real production routes used isolated database `paradise_test_34212_1789925124977` and ephemeral API port 55398. No API responses were mocked, no shared DB writes, no cloud uploads, and no application source edits. Both databases created this turn were independently confirmed absent afterward. Chromium, test API, runner-owned UI server, DB connections and verified temporary avatar storage were cleaned up; no runner process remains.

Coverage remains scoped: PT05 activation/login/2FA UI, cloud deployment/provider delivery, other operational notification types and the logged-out-during-dialog race are not certified. Local avatar storage is a supported tested path.

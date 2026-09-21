# PT Account UI E2E Handoff

Completed 2026-09-21 local time (2026-09-20T17:16:23Z). Overall **FAIL**, with 59 passing checks and 2 failing checks, 61 referenced annotated screenshots, and no blocked flow in the final run. No application source was edited.

Run: `node tests/e2e/pt/account-business-20260920.cjs`. Exit code 1 deliberately reflects the two notification failures. Machine-readable result: [run-result.json](./run-result.json).

## Results

| Report | PASS | FAIL | Scope |
| --- | ---: | ---: | --- |
| [PT04-US02](../../PT04-US02/account-business-20260920/PT04-US02-test.md) | 18 | 0 | Profile validation/save/reload; avatar invalid type and >5MB rejection; real PNG upload, stored-byte match, rendered image and reload; same PT Web profile/avatar |
| [PT04-US01](./PT04-US01-test.md) | 29 | 0 | Preference save/reload/offline rollback; password boundaries/mismatch; successful password change, current session retained and peer revoked |
| [PT05-US03](../../PT05-US03/account-business-20260920/PT05-US03-test.md) | 8 | 0 | Current logout preserves peer; real session registry; logout-all revokes both browser sessions |
| [PT03-US01](../../PT03-US01/account-business-20260920/PT03-US01-test.md) | 4 | 2 | Real facility notices, unread filter, content/read acknowledgement, read state persists after reload |

## Bugs For Main

1. **PT03-US01: facility notice dialog omits sent timestamp.** The content-dialog field specification requires `created_at` to be shown. Actual DOM contains title, body and OK only. Relevant implementation: `frontend/mobile/pt/js/notifications.js`, `navigateByTarget`, facility-content alert. [Annotated evidence](../../PT03-US01/account-business-20260920/step-04-notification-sent-time.png).
2. **PT03-US01: closing notice returns to profile instead of inbox.** The same specification says closing returns to the list. Actual DOM after OK has the notification list hidden and profile visible. `handleItemClick` closes the notification drawer before opening content, and the alert does not reopen it. [Annotated evidence](../../PT03-US01/account-business-20260920/step-05-close-notification-content.png).

These are UI/spec discrepancies. No source fixes were attempted. Earlier failures caused by the test's DevExtreme wrapper selector and a disappearing external UI server were resolved in the runner; they are not counted as application bugs.

## Isolation And Cleanup

- Production Express routes ran against `paradise_test_21800_1789924490086` at ephemeral API port 63421. Browser requests used `route.continue`, with no mocked API responses.
- Shared application database was not written. Only the isolated database received migrations, fixture records and UI mutations.
- Avatar storage was a unique `avatar-temp-*` directory directly inside the owned PT04-US02 report directory. Cloudinary environment keys and PUBLIC_API_URL were removed only in the runner process before requiring the app. No external uploads occurred.
- Actual stored avatar bytes matched the selected PNG. The persisted URL used the ephemeral API origin. Mobile and same-PT Web images were visible, decoded, and had positive `naturalWidth`.
- Cleanup closed Chromium, the ephemeral API and the runner-owned static UI server, ended database clients/pool, dropped the isolated database, and removed only the verified temporary avatar directory.
- Independent post-run catalog check found no remaining databases from any of the four database-creating attempts in this continuation. No listener remained on 63421 and no runner process remained. Other agents' servers were left alone.
- Evidence audit: all 61 referenced screenshots exist and have unique SHA256 hashes; browser page-error arrays are empty. Representative screenshots were visually inspected, including both failures, avatar rendering/validation/downstream, password validation, offline preference rollback and logout/session screens.

## Coverage Limits

This is not full User Story certification or a 100% PT audit. PT05 activation UI, password/OTP login UI, login 2FA, provider delivery/cloud deployment, all operational notification event types, all preference toggles and multi-branch authorization are not covered. Fixture activation/login API calls are setup only. The newly reported avatar-success/profile-failure retry path was not fault-injected; the successful upload path and zero page errors do not certify that exception path. Local avatar storage is supported functionality; missing cloud configuration is not a functional-test blocker.

Reports and screenshot paths referenced above identify the final run. Unreferenced PNGs retained from earlier interrupted attempts are not evidence for its results.

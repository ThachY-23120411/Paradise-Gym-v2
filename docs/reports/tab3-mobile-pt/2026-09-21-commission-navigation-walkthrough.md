# PT Hoa hong navigation - 2026-09-21

Workspace: E:/Desktop/para. Implemented fifth footer destination Hoa hong before Tai khoan, with footer background using the same primary-dark token as header. Active destination has white icon/text, contrasting surface/indicator and aria-current. Existing keyboard controls retained.

Commission statement is now a standalone view inside the main scrolling area, not a modal. Existing overview shortcuts open this view. Period filters, custom month, same-session period retention, refresh/retry, pull refresh, real own-PT API data and immutable PAID/legacy behavior retained. No backend/schema, other-role frontend or shared login edits.

Documentation synchronized: PT Epic/index, PT06-US02 entry/Main Flow/fields/diagram, Product Spec, Epic index and screen mapping. Navigation layout remains documented at application level, not inserted into per-screen field tables.

## Verification

- `node tests/e2e/pt/commission-business-20260920.cjs`: 32/32 recorded UI steps PASS, real API + disposable PostgreSQL. Includes five-item menu, exact header/footer color match, overview shortcut retaining period, QTV cash payout to same PT, immutable history, legacy/empty/error/retry, touch refresh and two-branch own scope.
- Screenshots visually inspected at 320 and 1440 widths; additional 360/768 checks passed. JS syntax and scoped git diff checks passed.
- `node tests/docs/pt-diagrams.cjs`: 16 diagrams / 361 nodes PASS for static topology, not Mermaid rendering.
- Test browser/server/connections closed and disposable database dropped. No shared database seed or business writes.
- [Step-by-step report](../../../tests/e2e/pt/PT06-US02/commission-navigation-20260921/PT06-US02-test.md). Prior test evidence retained under history.

## Existing Group UI

PT Schedule > Book > select assigned group contract displays leader and all ACCEPTED participants read-only. Saved calendar cards show snapshot participants. Eligibility/conflict checks apply to every participant; one booking reserves one group-contract session, not one per member. PT confirms own result; leader is member-side representative. PT does not edit group membership. Historical records without snapshots are explicitly marked, not reconstructed.

Known separate issue unchanged: HV nonleader cancel/confirm buttons remain visible although API rejects those actions. Awaiting approval for targeted HV change. No claim that this navigation work resolves that issue or completes all PT acceptance.

URL: http://localhost:3000/mobile/pt/.

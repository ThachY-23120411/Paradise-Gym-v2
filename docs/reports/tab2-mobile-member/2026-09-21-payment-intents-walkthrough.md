# HV payment intent delivery

**Final accepted run:** 2026-09-21T03-52-18-551Z. Completed 53/53 UI steps; both during-run and post-run source comparisons are unchanged. It includes main's frozen backend projection changes and the latest member HTML cache version (`home-schedule.js?v=20260921-unified-cards`).

Final verification: **53/53 UI steps PASS** (49 source/state steps, 4 LT downstream steps), 53 distinct annotated screenshots. Run completed after main authorized stable-backend verification on 2026-09-21. This is scoped purchase/payment coverage, not full acceptance of every HV story.

## Changes

- `frontend/mobile/member/js/packages-notifications.js`: consume payment intent envelope and statusless settlement; preserve user-approved simulate-transfer; successful-only payment history without status filtering/badge.
- QR countdown uses backend expiry (15 minutes); expired QR/action removed, fresh QR supported. Pending orders remain pending regardless of age until explicit cancellation. Cancel is available in My Packages, pending payments and QR modal.
- Package list/detail use backend `is_expiring` directly. Freeze requires paid current ACTIVE registration and respects backend denial flags; pending/scheduled packages cannot expose freeze actions.
- `frontend/mobile/member/index.html`: scoped package script cache version update. Prior home-schedule/index dirty changes preserved. No backend/web/shared source or business document changes by this owner.

## Verification

Command: `node tests/e2e/hv/HV03-US03/payment-intents.cjs`.

Final run: `tests/e2e/hv/HV03-US03/payment-intents/2026-09-21T03-52-18-551Z/`.

- [Full step report](../../../tests/e2e/hv/HV03-US03/payment-intents/2026-09-21T03-52-18-551Z/HV03-US03-test.md).
- [Provenance, migration manifest, SQL/API assertions, screenshot hashes and cleanup](../../../tests/e2e/hv/HV03-US03/payment-intents/2026-09-21T03-52-18-551Z/results.json).
- Purchase -> real QR -> intentional simulate-transfer -> one payment/receipt -> active package -> statusless history/receipt PASS; repeated simulation creates no second payment.
- Pending order older than three days remains pending; 15-minute browser countdown expiry, server-expired intent reissue, recreate-QR button, explicit cancel and no accidental payment PASS.
- Paid active freeze validation/success and pending/scheduled exclusion in list/detail PASS.
- Ten canonical expiry boundaries checked in both list and detail: Gym time 4/5 days; Gym/PT quota 3/4 with date independence; Combo time OR PT OR actual Gym quota; unlimited Gym does not trigger session expiry. Historical Combo quota fixture is explicitly initialized in isolated PostgreSQL before registration snapshot.
- Same-registration LT ACTIVE, CANCELLED and FROZEN screens plus authenticated Branch B isolation PASS. HV history has no horizontal overflow at 320/1440px.

All 89 watched source/manifest files remained unchanged during final run. Coverage includes all `backend/src` and 14 SQL migrations; all 23 actually loaded backend modules appear in the before/after hash manifest. Browser, temporary backend, DB connections and disposable PostgreSQL database were closed/deleted successfully. No shared DB reset/seed or deployment occurred.

## Evidence Review

Screenshots were opened and visually reviewed for real QR, success, statusless history, modal cancellation, expiry/reissue, Combo quota, narrow layout and LT cancellation/freeze. Annotation now appears inside native dialog top layer. LT status-cell hit-test verifies it is visible and not hidden behind fixed columns.

Earlier exploratory failures are retained. The 03:44 run had no source drift but was marked FAIL after visual review found clipped downstream status at 1440px. The final full rerun uses a 2240px LT viewport and annotated, unobscured status cells. No application edit was required for this evidence correction.

The 03:46 run was superseded by three post-run source changes. Its 03:49 retry was then superseded by a late member index cache-version update. After main confirmed final backend freeze, the 03:52 full rerun passed on current sources. Earlier reports retain explicit failure/superseded notices.

Screenshot examples (same final run directory): `step-04-purchase-qr.png`, `step-05-simulate-transfer-success.png`, `step-07-successful-statusless-history.png`, `step-18-qr-countdown-expired.png`, `step-20-pending-cancel-confirmation.png`, `downstream-22-lt-DK002-Đã hủy.png`, `downstream-28-lt-DK001-Đang đóng băng.png`, `step-47-combo-gym-or.png`.

Main owns deployment/restart and shared testing skill updates. No real bank integration is claimed; simulate-transfer remains intentional and authorized.

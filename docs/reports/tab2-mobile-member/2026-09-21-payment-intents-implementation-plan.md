# HV payment intent implementation

Scope: frontend/mobile/member, HV tests/reports/mailbox. Preserve existing dirty work. Main owns deployment/business documentation.

1. Consume backend payment intent contract; retain explicitly approved simulate-transfer, statusless successful history and receipt lookup.
2. Keep QR expiry at server-provided 15-minute deadline. Allow retry with a fresh intent and explicit pending order cancellation, with no registration age cancellation.
3. Share near-expiry and freeze eligibility between package list/detail, preferring backend flags; enforce current paid activation.
4. Run isolated real PostgreSQL/API/browser purchase, confirmation, history, cancellation, expiry and freeze checks. Record annotated screenshots and same-registration LT downstream.

References: HV03-US01, HV03-US03, HV03-US06 and user instructions dated 2026-09-21; newer user rules override outdated payment status/spec thresholds.

# Mobile Member Refactor Plan

Scope: frontend/mobile/member only, reports under tab2-mobile-member. No Main Flow/Activity Diagram, US, schema, backend, shared SDK or mailbox edits by this owner.

1. Audit all 18 HV User Stories and six epics against existing frontend and actual PostgreSQL API contracts; record fabricated data and approval gaps.
2. Rebuild member shell and auth/profile, schedule/home, package/payment/inbox controllers with existing Vanilla JS + DevExtreme components; server-authoritative mutations, explicit loading/error/retry, no frontend mock or seed identity.
3. Keep missing-field controls neutral pending parent decision; coordinate existing-field API gaps with backend owner through decisions report.
4. Verify syntax and responsive 390/768/desktop screens, real auth/read paths and isolated browser contract tests without live financial writes.
5. Produce 18-US matrix, tested paths and truthful integration/approval limits.

Mobile checkpoint: mobile web/PWA in existing browser stack, five footer destinations + separate auth, touch-first >=44px targets; portrait phone and tablet; no offline business mutation. Avoid fake phone chrome, unsupported cached transactions, or invented account facts. Existing Font Awesome library retained. Calendar/select/popup use DevExtreme where appropriate.

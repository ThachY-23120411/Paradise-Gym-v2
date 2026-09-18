# Mobile Refactor Backend Plan

Date: 2026-09-17. Ownership: backend, frontend/shared, tab4 mobile-refactor reports. Initial inventory started without schema approval. Later explicit user approval limited additions to account notification flags, PT phone visibility and structured certificates; migration003 implements only those additions.

1. Inventory existing migrations, ERD, mounted routes, mobile epics and relevant User Stories.
2. Publish actual API contracts and a decision queue for missing database fields before implementation.
3. Implement existing-field APIs and repair scope/auth/confirmation defects without changing schema or live data.
4. Extend shared SDK backward-compatibly for both mobile owners; preserve Web contracts.
5. Validate on isolated PostgreSQL database only, preserving enabled-rule-only notifications and member settlement prohibition.
6. Publish verification and explicit remaining specification/provider/approval gaps. Do not modify any US Main Flow/Activity Diagram.

## Completion

- Completed existing-field profile/statistics/avatar/OTP phone-change/security APIs and shared SDK integration.
- Approved migration and ERD synchronized, including Mermaid, table definitions and structured JSON validation function/CHECK. No duplicate 2FA field.
- Corrected PT cancellation prohibition, one-time confirmation/note ownership, MEMBER4h cancellation, and role-scoped phone visibility across trainer list/detail, registration detail and availability.
- Added real DOB birthdays, HV1-2h/PT15-30min reminders and expiry7/3/0d through W09+user preferences, with per-recipient event deduplication.
- 353 HTTP checks PASS against disposable PostgreSQL (213 regression checks plus140 additional checks, including an isolated staff re-login); extra SQL/binary assertions. No test writes to configured live DB.
- Applied approved additive migration locally only after tests. Existing backend watcher/port5000 retained; health UP.
- Signup branch, trusted devices/per-device sessions and member tier remain deferred without approval. No Main Flow/Activity Diagram edited.

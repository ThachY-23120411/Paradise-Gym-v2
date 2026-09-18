# Mobile HV/PT Refactor Coordination

Date: 2026-09-17. Status: implementation in progress.

## Scope

- Review all 18 HV and 11 PT user stories and their 12 menu epics.
- Use existing API/database data wherever available. No frontend sample records, automatic demo login, fabricated business values or simulated success.
- Keep Main Flow, Alternate Flows, Exception Flows and Activity Diagrams unchanged. Only approved Field-level specification updates are allowed in user stories.
- Preserve Web QTV/LT contracts, payment settlement authorization and QTV-configured-only notification delivery.

## User Decisions

| Datum | Explicit decision | Implementation owner |
| --- | --- | --- |
| PT experience indicator | Remove from UI; no new column | Tab 3 |
| PT rating and review count | Remove from UI; no new column | Tab 3 |
| PT certificate list | Add persistent structured field and return through API; empty when no real certificates exist | Tab 4 schema/API/ERD; Tab 3 UI |
| HV/PT notification preferences | Add persistent fields and enforce preferences without bypassing QTV notification rules | Tab 4 schema/API/ERD; Tabs 2/3 UI |
| PT phone visibility to assigned members | Add persistent privacy field and enforce at API response boundary | Tab 4 schema/API/ERD; Tabs 2/3 UI |
| Two-factor authentication | Use existing account field; do not duplicate schema | Tab 4 API; Tabs 2/3 UI |

## Ownership and Sequence

1. Tab 2 owns member source and its audit/test reports; Tab 3 owns PT source and its audit/test reports.
2. Tab 4 owns backend/shared contracts, migrations, regression tests and ERD synchronization.
3. Tab 1 coordinates approved decisions, protected-document checks, Field-level source documentation, screen mapping and integrated verification.
4. Each mobile role reports newly discovered missing data immediately for user choice before adding schema or removing the field.
5. Verify authentication, role scope, API error/empty states, account preference persistence, notification history, scheduling, assignment and payment status handling. Use isolated test data; do not reseed or mutate live financial records.
6. Run browser checks at compact/wide mobile and desktop widths; document provider limitations honestly.

## Documentation Discrepancies

- Product Spec section 4.1 describes member phone as immutable; HV04-US01 explicitly specifies authenticated self-service phone change with unique validation and OTP to the new number. Implement the specific US, record the conflict, and do not rewrite either flow without approval.
- Product Spec mobile menu names are older than the current six-epic HV/PT structure. Existing US/epic mappings remain the implementation reference; no broad product-spec rewrite in this task.
- HV04 Epic mentions member rank while HV04-US01 may not. Await the member audit before treating this as a required stored datum.

## Verification Evidence

`mobile-refactor-protected-sections.json` records SHA-256 hashes of all text outside Field-level specification subsections before documentation changes. The final comparison must pass for all 29 stories.

Implementation and test results are recorded separately in each tab's `mobile-refactor-*` reports. This plan does not claim completed or fully tested coverage.

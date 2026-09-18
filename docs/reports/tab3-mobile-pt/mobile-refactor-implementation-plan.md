# Mobile PT Refactor

Date: 2026-09-17. Owner: anti-3-PT. Source boundary: `frontend/mobile/pt/**`; reports only under this directory. Parent owns US Field-level edits, Core owns SDK/API/DB/ERD. No Main Flow/Activity Diagram changes.

## Approved Scope

1. Read all six PT epics, all eleven stories, related Product Spec rules and mounted API contracts.
2. Remove fabricated personnel registry, profile facts, training history and synthetic notifications. Replace existing facts with real API values or explicit loading/error/empty states.
3. Apply user decisions: remove experience/rating/review count; retain structured certificates; persist notification preferences, phone visibility and 2FA through API.
4. Preserve PT-only assignment scope, server-authoritative dual confirmation, readonly personnel fields, conditional rejection reason, OTP activation and real password/logout actions.
5. Verify JS syntax, source inventory, 320/390/768 layouts, isolated browser write/failure contracts, and real API readonly flows without modifying live business records.
6. Publish eleven-story matrix and explicit residual provider/contract gaps. Never claim fixture tests prove live persistence.

## Evidence During Implementation

- Initial source review found fake profile registry, certificate list, experience/ratings, profile defaults, notification synthesis, local-only read/preferences, timeout password success, notes omitted from confirmation request, failed API silently mapped to empty data.
- Initial live login and twelve menu viewport checks passed but new `/mobile/profile` and statistics returned404 on the running backend. This is an integration checkpoint, not completion.
- Isolated browser contracts currently pass40 checks; source fixtures are confined to OS Temp. Further real API rerun remains required after Core deploys mounted routes/migration.

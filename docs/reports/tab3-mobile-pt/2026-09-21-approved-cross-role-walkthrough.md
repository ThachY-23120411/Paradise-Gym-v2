# Approved cross-role fixes - 2026-09-21

## Changes

- Member schedule list and hourly cards hide Cancel/Confirm for nonowner participants. Handlers also reject nonowner invocation. Existing backend owner authorization remains authoritative.
- Shared activation portal accepts phone plus explicit PT role; a PT code auto-selects and locks PT. Lookup, OTP request and activation use the same selected role.
- Changing identity invalidates prior preview and OTP state; stale lookup results cannot restore the old preview.
- Preview renders API masked_name, masked_code and actual branch_name. Missing branch is hidden, not replaced with a fictional branch. Backend exposes the already-joined branch name for PT lookup only.
- Updated PT05 epic/US and HV02 scope specifications. No database schema or seed changes.

## Verification

- PT05-US02: 16/16 browser steps PASS, including phone activation, role selection, masked preview, stale-preview clearing, invalid OTP and authenticated PT destination.
- PT05-US01: 19/19 browser steps PASS for password, OTP and 2FA login.
- PT01-US03 group booking: PASS, including authenticated nonleader and receptionist downstream UI, participant entitlement rejection and responsive PT form/calendar checks.
- PT01-US02 group confirmation: PASS, including nonleader read-only before/after completion and leader confirmation.
- Profile/session unit tests: 48/48 PASS.
- Backend integration suite: 393 HTTP checks PASS against isolated PostgreSQL; configured/shared database untouched.
- Changed login/member JavaScript syntax checks and git diff whitespace check PASS.

Evidence: [Activation](../../../tests/e2e/pt/PT05-US02/auth-business-20260921/PT05-US02-test.md), [Login](../../../tests/e2e/pt/PT05-US01/auth-business-20260921/PT05-US01-test.md), [Group booking](../../../tests/e2e/pt/PT01-US03/group-business-20260920/PT01-US03-test.md), [Group confirmation](../../../tests/e2e/pt/PT01-US02/group-business-20260920/PT01-US02-test.md).

## Limits

These results resolve the two approved blockers, not a blanket 100% production certification. OTP uses DEVELOPMENT_ONLY; actual SMS delivery remains unverified. Tests use disposable databases/private servers; no shared database reset or seed. A long-running backend without auto-reload must reload the updated auth module to expose branch_name. The group downstream checks exercise schedule cards; hourly-card guards were reviewed in source, not independently browser-certified in this run.

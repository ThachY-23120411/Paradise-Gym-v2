# PT Visual Alignment and Read-only Audit

Date: 2026-09-20. Workspace: `E:/Desktop/para`.

## Authorized Scope

- Refactor only `frontend/mobile/pt/` to match the existing QTV/LT/HV Administrative Forest Clean design.
- QTV, LT, HV, shared SDK, backend and database: inspect only. No migrations, seeds or business-data changes.
- Preserve PT API calls, actions, fields, authorization and business flows. Do not change Main Flow or Activity Diagram.
- Record current inconsistencies and completion estimates in a separate read-only audit report.

## Context

Reviewed the three supplied Antigravity conversations (plans, walkthroughs, user decisions and latest handoffs), repository mailboxes, current source/specifications and all three pages of `ghi chú a Cường (1).pdf`.
Later conversation decisions supersede the original PDF, including member self-freeze, direct commission payout, future-month configuration and QTV W10's three analysis tabs.

## Implementation

1. Align light surfaces, forest brand colors, semantic statuses and Be Vietnam Pro typography with the existing roles.
2. Replace the PT phone simulator presentation with a responsive operational layout. Keep the four main PT tabs and notification entry.
3. Normalize component styles in PT modules and dialogs; improve text wrapping, touch targets and keyboard focus.
4. Verify actual authenticated PT views, loading/error states and responsive widths using existing database records. Inspect QTV/LT/HV without submitting business mutations.
5. Document evidence, remaining functional discrepancies and exact edit boundaries.

## Mobile Checkpoint

Platform: mobile web on iOS/Android browsers, with desktop/tablet access. Existing jQuery/DevExtreme, four-tab navigation and REST API are retained.
Principles: 44px touch targets; consistent readable contrast; content widths constrained without hiding overflow or actions.
Avoid: decorative simulated devices, dark inline styles on light dialogs, claiming a functional US passes after only a visual check.

## Known Conflicts to Report

PT01 source/spec still describe five fixed slots while QTV/HV now use dynamic session times. PT02/PT06 still expose assignment-request concepts. These require a separate business/spec alignment decision; a visual refactor does not resolve them.

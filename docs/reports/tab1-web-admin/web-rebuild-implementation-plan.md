# QTV/LT Web Rebuild

Date: 2026-09-17

## Scope And Source Of Truth

Rebuild `frontend/web/` for QTV W01-W13 and corresponding LT stories. Each module is checked against its complete Main Flow, Alternate/Exception Flows, Activity Diagram, and Field-level specification. Existing stories remain the business baseline. Backend work is owned by the Core/DB worker, with additive schema changes documented in `docs/database/erd.md`.

Visual reference: https://phanmemtinhluong.com/phan-mem-quan-ly-phong-gym-paradise-gym/

## Design

- Forest green navigation bar, white sidebar, neutral workspace, compact DevExtreme controls.
- Tokens: forest `#185740`, primary `#237b58`, paper `#ffffff`, canvas `#f4f6f5`, ink `#26332e`, line `#dfe6e2`. Operational accents use blue, amber, and red.
- Be Vietnam Pro for text and controls; Manrope for the brand. Fixed type sizes, 4-8 px radii.
- Distinct role-aware dashboards, stable menu navigation, dedicated registration and payment pages.
- No demo authentication, fabricated entities, device status, or locally fabricated success events.

## Ownership

| Workstream | Files / Menus |
| --- | --- |
| Coordinator | Shell, CSS, UI helpers, W01, W07, W10, browser verification, screen mapping |
| Member/catalog worker | W02, W03, W11 |
| Sales worker | W04, W08 |
| PT worker | W05, W06 |
| System worker | W09, W12, W13 |
| Core/DB worker | Backend, shared API client, migrations, ERD, backend tests |

## Verification

1. Read story-to-screen mappings and record every story in the audit reports.
2. Implement field constraints, conditional visibility, error states, role scope, and persistence.
3. Verify backend contracts and meaningful business-rule regression cases.
4. Exercise QTV and LT workflows in a browser, including failed requests and restricted navigation.
5. Inspect screenshots at desktop, tablet, and narrow widths; check overflow and console errors.
6. Record actual verified coverage and remaining external integration constraints in the walkthrough.

Existing PostgreSQL data must be preserved. No destructive reseed is part of this task.

# W02 Member Popup - Documentation Plan (22/09/2026)

## Scope and ownership

Docs worker: read-only mobile/Web mapping audit and scoped business documentation synchronization. Main coordinates implementation; UI owner Einstein (`01a0c445-9b07-70a1-803b-617d577d783e`). No frontend/backend/ERD or shared DB edits. Preserve all dirty edits.

## Plan

1. Read mesh anti-2/3/4, actual mobile navigation/views, W02 popup and related QTV US/Epic/Product Spec/screen mapping. Apply activity-diagram, ui-docs-sync and docs-sync already read in this conversation.
2. Compare the same member's information and filters, distinguish member self-service from authorized staff navigation, and flag hardcoded values, misleading fallback/empty states and misplaced content.
3. Send source-backed mapping/issues to Main and Einstein through the shared mesh artifact; this session has no callable direct inter-agent message tool. Do not invent delivery acknowledgement.
4. Once Main/UI direction is settled, read final members.js and synchronize only related docs, primarily QTV-W02-US04 and its Epic/Product Spec/mapping; add scoped changelog if needed. No new business permission or API assumed.
5. Validate six-column field tables, related links, Mermaid strict topology and actual rendering for changed diagrams. Report source/static evidence separately from runtime tests owned by Main/E2E.

## Initial state

Completion: all five steps completed; final business docs and validation recorded in the walkthrough. Browser E2E remains independently owned by Main/Noether, not a prerequisite for reporting completed documentation checks.

- Mesh scan: no new unread nonempty files for anti-1 at task start.
- Mobile footer has five routes; notifications is a separate bell route. W02 US04 documents only list, Epic incorrectly says no modal and eye action navigates W04.
- Mapping/issues: [audit and handoff](2026-09-22-member-popup-walkthrough.md).

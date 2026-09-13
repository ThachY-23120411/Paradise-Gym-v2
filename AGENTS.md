# Project Rules

Current phase:

Product Spec
→ Epic
→ User Story
↔ UI / Screen / User Flow

Apply project rules only when relevant to the current task.

## Documentation & Feature Changes

For changes to Product Spec, Epics, User Stories, business rules,
features, workflows, or UI:

- Before creating or updating a Product Spec, Epic, User Story,
  Acceptance Criteria (AC), or UI Flow, always read and apply
  `.agents/rules/docs-sync.md`.
- When documenting any form, modal, or input flow, specify every field's
  input state (`USER-INPUT`, `AUTO-FILL`, `PREFILL`, `READONLY`),
  required/optional status, conditional/dynamic behavior, and data source;
  do not use vague descriptions such as “người dùng nhập thông tin” or
  “hệ thống tự điền”.
- In Field-level specification tables, include ONLY the actual input/display fields present on the UI modal/form interface. Do NOT include action buttons (e.g. Save, Cancel) or backend auto-generated fields that are not displayed on the modal UI.
- When creating or updating an Activity Diagram, always read and apply
  `.agents/skills/activity-diagram/SKILL.md`; keep the written Main Flow,
  Alternate Flows, and Exception Flows and use explicit UML-style nodes,
  control flow, boundary, and role-based swimlanes.
- Keep all affected documentation and UI consistent.
- Inspect only related artifacts.
- Do not scan or rewrite unrelated files.

## UI Changes

For UI design or UI modification:

- Follow `.agents/rules/ui-design-system.md`.
- Identify the related User Story, Epic, and Product Spec when the UI change affects documented behavior.
- Reuse existing UI patterns and components when possible.

## Scope

Do not create Acceptance Criteria, API, database,
technical design, or implementation unless explicitly requested.

Do not apply documentation or UI synchronization workflows
to unrelated conversation, explanation, or brainstorming tasks.

A task is complete only when all affected artifacts are consistent.
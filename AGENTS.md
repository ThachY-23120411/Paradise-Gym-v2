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

- Follow `.agents/rules/docs-sync.md`.
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
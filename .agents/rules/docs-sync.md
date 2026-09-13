# Documentation & UI Sync

Current phase:

Product Spec
→ Epic
→ User Story
↔ UI / Screen / User Flow

Do not create Acceptance Criteria, API, database,
technical design, or implementation unless explicitly requested.

## When modifying UI

When asked to add, modify, or remove a screen, modal, form,
field, button, action, navigation item, or user flow:

1. Identify the affected screen, route, or component.
2. First check `docs/ui-related-screen-audit.md`
   to determine the related User Story.
3. From the User Story, identify its Epic.
4. Check the relevant Product Spec section.
5. Inspect only other User Stories that may actually be affected.
6. Apply the UI change.
7. If the UI change modifies documented business behavior,
   update the affected documentation accordingly.
8. Update `docs/ui-related-screen-audit.md`
   if the screen, mapping, route, or User Story scope changes.
9. Check `docs/open-questions.md` when the change relates
   to an unresolved decision.

## When UI → User Story mapping is missing

Do not immediately scan all documentation.

Find the related User Story using:

- screen name;
- feature;
- actor;
- action;
- fields;
- business flow;
- likely Epic.

Once the mapping is identified, update
`docs/ui-related-screen-audit.md` so future tasks can resolve it directly.

If multiple User Stories may be related,
inspect the candidates before modifying documentation.

## When modifying a User Story

1. Check its related Epic.
2. Check the relevant Product Spec section.
3. Check dependent or related User Stories.
4. Resolve affected UI / screens / flows through
   `docs/ui-related-screen-audit.md`.
5. Synchronize all artifacts that are actually affected.

## Mandatory field-level specification

Whenever a Product Spec, Epic, User Story, Acceptance Criteria (AC),
or UI Flow documents a form, modal, or input flow, specify every
field individually. For each field, state all applicable details:

- field name and purpose;
- interaction state: `USER-INPUT`, `AUTO-FILL`, `PREFILL`, or
  `READONLY`;
- `required` or `optional`;
- whether the field is `CONDITIONAL` or `DYNAMIC`, including the
  condition that controls it;
- source of the value/options, such as the current user/profile,
  selected record, system calculation, configuration, or external
  event.

Do not use vague descriptions such as “người dùng nhập thông tin” or
“hệ thống tự điền”. The field-level specification must identify the exact fields, states, validation/requirement status, conditions, and data sources. If a field behavior or source is not decided, mark it as an explicit open question instead of inferring it.

List ONLY the actual input or display fields present on the UI form/modal interface. Do NOT include action buttons (e.g. Save, Cancel, Hủy) or backend auto-generated fields that are not displayed on the modal UI interface.

## Activity Diagram standard

When creating or updating an Activity Diagram, read and apply
`.agents/skills/activity-diagram/SKILL.md`.

The diagram supplements, and must not replace, the written `Main Flow`,
`Alternate Flows`, and `Exception Flows`. Use role-based swimlanes and a
platform/feature boundary. Use explicit initial, action, decision, merge,
join, control-flow, and final nodes where the flow requires them. Every
reachable branch must have a documented outcome, and every decision edge
must be labeled.

## Rules

Never modify only the UI when the change alters documented behavior.

Never modify only documentation when the existing UI is also affected.

Do not scan or rewrite unrelated documentation.

Do not create Acceptance Criteria, API, database,
technical design, or implementation unless explicitly requested.

Before completing the task, verify consistency:

Product Spec
→ Epic
→ User Story
↔ UI / Screen / User Flow
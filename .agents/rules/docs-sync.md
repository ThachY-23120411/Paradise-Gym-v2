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
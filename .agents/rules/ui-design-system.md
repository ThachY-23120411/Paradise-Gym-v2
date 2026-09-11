# UI Design Rules

Apply only when creating or modifying UI.

## General

- Reuse existing components and patterns before creating new ones.
- Keep colors, spacing, typography, inputs, buttons, modals and tables consistent.
- Do not introduce a new style if an equivalent pattern already exists.

## Buttons

- Filled buttons must always use white text with sufficient contrast, regardless of action type.
- Primary action: filled primary color + white text.
- Secondary action: outline or neutral.
- Destructive action: filled red (`#EF4444`) + white text, only for delete/disable/revoke.
- Disabled filled buttons retain white text with reduced opacity/contrast through the disabled state.
- Normally only one primary button per form/modal.

## Inputs

- Textbox: free-form input such as name, email, phone, address, notes.
- Select/Dropdown: small fixed option list.
- Radio: 2–4 important mutually exclusive options.
- Checkbox: independent yes/no choices.
- Switch: persistent on/off settings.
- Date fields in modals must never be free-form textboxes. Use the appropriate picker by context:
  - Date Picker: one calendar date.
  - Datetime Picker: date and time together.
  - Date Range Picker: start and end dates.
  - Calendar Dropdown / Calendar Picker: compact calendar selection where space is limited.
- Preserve picker constraints such as min/max dates, disabled past dates, disabled unavailable dates, and required validation.

## Searchable Combobox / Searchable Dropdown

Use a Searchable Combobox or Searchable Dropdown when selecting an existing entity from many options or when users need to search before selecting.

Examples:
- Member
- PT
- Package
- Employee

Combine the search input and dropdown results into one control.

Do not use a separate search textbox plus a plain dropdown when one searchable control is enough.

Difference:

Search Box
→ filters a list/page without selecting an entity.

Searchable Combobox / Searchable Dropdown
→ searches and selects one value from an existing set.

## Forms

- Always show labels.
- Clearly mark required fields.
- Show validation messages near the field.
- Preserve entered data when validation fails.

## Modal vs Page

Use Modal for short/simple actions.

Use Page or Drawer for long forms or complex workflows.

## Consistency

Before finishing a UI task, verify:

- correct input type;
- consistent button hierarchy;
- every filled button uses white text;
- consistent colors and spacing;
- reuse of existing patterns;
- loading/empty/error/disabled states when relevant.

If UI changes documented behavior, follow:

`.agents/rules/docs-sync.md`
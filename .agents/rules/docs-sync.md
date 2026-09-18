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

## User Story structure standard

Trong User Story:
- Phần `## Preconditions`: Tuyệt đối **KHÔNG ghi** các dòng metadata: `Role / Platform / Epic`, `Canonical story / operation / actors`, `Traceability`. Chỉ ghi ngắn gọn các **điều kiện tiên quyết nghiệp vụ thực tế** (ví dụ: người dùng đã đăng nhập, có quyền thao tác, phạm vi branch scope, dữ liệu tiền đề đã tồn tại,...).
- Tuyệt đối **KHÔNG đưa mục `## Result`** vào User Story (sau `## Exception Flows` là đến trực tiếp `## Activity Diagram — Swimlane`).

## Mandatory field-level specification

Whenever a Product Spec, Epic, User Story, Acceptance Criteria (AC),
or UI Flow documents a form, modal, or input flow, specify every
field individually. For each field, state all applicable details:

- field name and purpose;
- interaction state: `USER-INPUT`, `AUTO-FILL`, `PREFILL`, or
  `READONLY`;
- `required`, `optional`, hoặc `conditional` (lưu ý: mọi trường có tính chất `CONDITIONAL` ở cột điều kiện thì giá trị tại cột Required **bắt buộc phải ghi là `conditional`**, không được ghi cứng là `required` hay `optional`);
- whether the field is `TRIGGER`, `DYNAMIC`, `CONDITIONAL`, or `Không`, including the condition/driver logic that controls it:
  + `TRIGGER`: Trường gốc độc lập đóng vai trò điều khiển/kích hoạt form động cho các trường khác.
  + `DYNAMIC`: Trường **luôn luôn hiển thị** trên UI (không bị ẩn); chỉ có danh sách giá trị/tùy chọn (options) bên trong thay đổi tùy theo giá trị được chọn ở trường `TRIGGER`.
  + `CONDITIONAL`: Trường có **điều kiện ẩn/hiện** (conditional visibility) hoặc điều kiện bắt buộc; có ít nhất 1 option của `TRIGGER` khiến trường này **bị ẩn đi** (hoặc chỉ xuất hiện khi thỏa mãn điều kiện cụ thể). **Bắt buộc phải ghi rõ ràng hai chiều**: *Hiện khi TRIGGER là gì?* và *Ẩn khi TRIGGER là gì?* (hoặc *Bắt buộc khi nào / Tùy chọn khi nào* nếu trường luôn hiện nhưng thay đổi tính bắt buộc).
    *(Nguyên tắc cốt lõi: `Conditional = Dynamic + (có 1 option của trigger thì nó sẽ bị ẩn đi)`, còn `Dynamic` là với mọi option của trigger thì trường luôn luôn được hiển thị, chỉ là giá trị/options trong vùng được chọn tùy thuộc vào trigger).*
  + `Không`: Trường độc lập, cố định, không phụ thuộc hay ẩn/hiện theo trường khác;
- source of the value/options, such as the current user/profile,
  selected record, system calculation, configuration, or external
  event.

Do not use vague descriptions such as “người dùng nhập thông tin” or
“hệ thống tự điền”. The field-level specification must identify the exact fields, states, validation/requirement status, conditions, and data sources. If a field behavior or source is not decided, mark it as an explicit open question instead of inferring it.

- Quy ước bảng Field-level specification (Đặc tả UI):
  + Đối với **Modal / Form nhập liệu**: Chỉ bao gồm các trường nhập liệu và trường hiển thị dữ liệu thực tế (`input / display fields`) trên modal/form; tuyệt đối **KHÔNG đưa các nút hành động của form** (như Save, Submit, Cancel, Hủy, Đóng) hoặc các trường backend tự sinh không hiển thị trên UI vào bảng.
  + Đối với **Màn hình / Menu / Giao diện chính (Page, Screen, Card, List view)**: Bảng Field-level specification đóng vai trò là bảng **đặc tả UI toàn diện** của màn hình/khối giao diện đó, vì vậy **bắt buộc phải ghi đầy đủ cả các nút thao tác** (Action buttons, CTA, Filter, Nút mở modal/drawer, Nút xem chi tiết,...) cùng với các trường dữ liệu vào bảng.

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

Never modify or extend database schema (adding/altering tables, columns, primary keys, foreign keys, constraints) without immediately updating `docs/database/erd.md`.

Do not scan or rewrite unrelated documentation.

Do not create Acceptance Criteria, API, database,
technical design, or implementation unless explicitly requested.

Before completing the task, verify consistency:

Product Spec
→ Epic
→ User Story
↔ UI / Screen / User Flow
↔ Database Schema (`docs/database/erd.md`)
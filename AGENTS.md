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
- Quy ước cấu trúc User Story:
  + Trong phần `## Preconditions`: Tuyệt đối **KHÔNG ghi** các dòng metadata: `Role / Platform / Epic`, `Canonical story / operation / actors`, `Traceability`. Chỉ ghi các điều kiện tiên quyết nghiệp vụ thực tế (ví dụ: người dùng đã đăng nhập, có quyền thao tác, phạm vi branch scope, dữ liệu tiền đề đã tồn tại,...).
  + Tuyệt đối **KHÔNG đưa mục `## Result`** vào User Story (sau `## Exception Flows` là đến trực tiếp `## Activity Diagram — Swimlane`).
- Tuyệt đối **KHÔNG đưa các thành phần thuộc layout dùng chung** (như Header/Topbar chung, Sidebar điều hướng, Footer, Theme toggle, Bộ chọn chi nhánh toàn cục, Avatar/Tài khoản người dùng) vào phần đặc tả UI của từng màn hình/menu hay User Story. Chỉ đặc tả các thành phần và nội dung nghiệp vụ riêng bên trong phạm vi màn hình đó.
- Quy ước về bảng Field-level specification (Đặc tả UI):
  + Đối với **Modal / Form nhập liệu**: Chỉ bao gồm các trường nhập liệu và trường hiển thị dữ liệu thực tế (`input / display fields`) trên modal/form; tuyệt đối **KHÔNG đưa các nút hành động của form** (như Save, Submit, Cancel, Hủy, Đóng) hoặc các trường backend tự sinh không hiển thị trên UI vào bảng.
  + Đối với **Màn hình / Menu / Giao diện chính (Page, Screen, Card, List view)**: Bảng Field-level specification đóng vai trò là bảng **đặc tả UI toàn diện** của màn hình/khối giao diện đó, vì vậy **bắt buộc phải ghi đầy đủ cả các nút thao tác** (Action buttons, CTA, Filter, Nút mở modal/drawer, Nút xem chi tiết,...) cùng với các trường dữ liệu vào bảng.
- Quy ước phân biệt `TRIGGER`, `DYNAMIC`, `CONDITIONAL` trong bảng Field-level specification:
  + `TRIGGER`: Trường gốc độc lập đóng vai trò kích hoạt/điều khiển form động cho các trường khác.
  + `DYNAMIC`: Trường **luôn luôn hiển thị** trên UI (không bị ẩn); chỉ có danh sách giá trị/tùy chọn (options) bên trong thay đổi tùy theo giá trị được chọn ở trường TRIGGER.
  + `CONDITIONAL`: Trường có **điều kiện ẩn/hiện** (conditional visibility) hoặc điều kiện bắt buộc; có ít nhất 1 option của TRIGGER khiến trường này **bị ẩn đi** (hoặc chỉ xuất hiện khi thỏa mãn điều kiện cụ thể).
  + `Không`: Trường độc lập, cố định, không phụ thuộc hay ẩn/hiện theo trường khác.
- Quy ước cho cột `Required` trong bảng Field-level specification:
  + Nếu một trường có tính chất `CONDITIONAL` (có thể bị ẩn đi hoặc lúc bắt buộc lúc không tùy theo TRIGGER), thì giá trị tại cột `Required` **bắt buộc phải ghi là `conditional`**, tuyệt đối không ghi cứng là `required` hay `optional`.
- Quy ước mô tả trường `CONDITIONAL` trong bảng Field-level specification:
  + Bắt buộc phải ghi rõ điều kiện cụ thể hai chiều: **Hiện khi** TRIGGER nhận giá trị gì, và **Ẩn khi** TRIGGER nhận giá trị gì (hoặc **Bắt buộc khi nào / Tùy chọn khi nào** nếu trường thay đổi tính bắt buộc theo TRIGGER).
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

## Multi-Agent Context Synchronization (Đồng bộ Ngữ cảnh 3 Tab: anti-1, anti-2, anti-3)

Cơ chế hộp thư đa chiều (Multi-Tab Mailbox Mesh) truyền tải Context Delta giữa 3 Tab (`anti-1`, `anti-2`, `anti-3`) trong cùng workspace để tiết kiệm token và đồng bộ ngữ cảnh liên tục:

- **Thư mục Hộp thư (Mailbox Directories):**
  + `brain-anti1/`: Hộp thư đi của Tab `anti-1`.
  + `brain-anti2/`: Hộp thư đi của Tab `anti-2`.
  + `brain-anti3/`: Hộp thư đi của Tab `anti-3`.
  + *Trạng thái ban đầu:* Cả 3 thư mục đều hoàn toàn rỗng (0 file). Chỉ khi phát sinh công việc mới tạo file bên trong `<conversation_id>/`.

- **Quy tắc Tiếp nhận Ngữ cảnh (Thực hiện ở ĐẦU mỗi prompt khi tab thức dậy):**
  + **Đối với Tab `anti-1`:** Quét kiểm tra thư mục hộp thư của các tab khác: `brain-anti2/` và `brain-anti3/` (kể cả subfolder `<conversation_id>/`). Nếu có bất kỳ file nào có nội dung (> 0 bytes):
    1. Đọc nội dung toàn bộ các file đó (`task.md`, `implementation_plan.md`, `walkthrough.md`, `notes.md`,...) để cập nhật ngữ cảnh, quyết định nghiệp vụ và tiến độ.
    2. Bổ sung phần context vừa đọc vào kho ngữ cảnh nội bộ của `anti-1` (local memory / log).
    3. **Xóa sạch 100% nội dung** trong các file đã đọc (hoặc dọn rỗng thư mục về 0 file) để tránh đọc lặp lại và tiết kiệm token tối đa.
  + **Đối với Tab `anti-2`:** Quét kiểm tra thư mục hộp thư của các tab khác: `brain-anti1/` và `brain-anti3/`. Nếu có file có nội dung:
    1. Đọc nội dung toàn bộ các file đó để cập nhật ngữ cảnh.
    2. Bổ sung phần context vừa đọc vào kho ngữ cảnh nội bộ của `anti-2`.
    3. **Xóa sạch 100% nội dung** trong các file đã đọc.
  + **Đối với Tab `anti-3`:** Quét kiểm tra thư mục hộp thư của các tab khác: `brain-anti1/` và `brain-anti2/`. Nếu có file có nội dung:
    1. Đọc nội dung toàn bộ các file đó để cập nhật ngữ cảnh từ các tab khác.
    2. Bổ sung phần context vừa đọc vào kho ngữ cảnh nội bộ của `anti-3`.
    3. **Xóa sạch 100% nội dung** trong các file đã đọc.

- **Quy tắc Phát hành Ngữ cảnh (Thực hiện ở CUỐI mỗi prompt khi hoàn thành tác vụ):**
  + Khi kết thúc một prompt có phát sinh context/quyết định mới, Agent ở tab nào sẽ **ghi y chang các file phát sinh** trong prompt đó (ví dụ: `task.md`, `implementation_plan.md`, `walkthrough.md`, `notes.md`,...) vào thư mục hộp thư đi tương ứng (`brain-anti1/<conversation_id>/` nếu là anti-1, `brain-anti2/<conversation_id>/` nếu là anti-2, hoặc `brain-anti3/<conversation_id>/` nếu là anti-3).
  + **CHỈ ghi các file và nội dung mới phát sinh trong prompt đó**; tuyệt đối không chép lại toàn bộ lịch sử cũ để tối ưu token.
# Project Rules — Paradise Gym

> Bổ sung kiểm thử 2026-09-21: Luồng ghi dữ liệu dùng PostgreSQL cô lập, không seed/reset database dùng chung. Ghi manifest migration; kiểm thử lại UI nguồn/downstream sau thay code. Áp dụng mục "Kinh nghiệm kiểm thử PT" trong skill `us-e2e-test-recorder` cho retry xác nhận kép và lịch sử snapshot.

Current phase:

Product Spec
→ Epic
→ User Story
↔ UI / Screen / User Flow
→ Implementation (Database + Backend + Frontend Web & Mobile)

> [!CAUTION]
> **QUY TẮC THI HÀNH BẮT BUỘC (MANDATORY EXECUTION PRIORITY):**
> **Mục 1 (Multi-Agent Mesh Context Synchronization)** là **BƯỚC 0 TỐI THƯỢNG PHẢI THỰC THI ĐẦU TIÊN TRONG MỌI PROMPT** đối với tất cả 4 Tab (`anti-1`, `anti-2`, `anti-3`, `anti-4`), bất kể nội dung prompt của Người Dùng là gì (sửa UI, fix bug, test, QA hay giải thích). Tuyệt đối không được bỏ qua Bước 0!
> Các mục tiếp theo (2 → 7) được áp dụng đồng thời khi thực thi các tác vụ tương ứng.

---

## 1. Multi-Agent Mesh Context Synchronization (Hệ Thống 4 Tab Mesh: anti-1, anti-2, anti-3, anti-4) — BƯỚC 0 TỐI THƯỢNG

Cơ chế hộp thư đa chiều (4-Tab Mailbox Mesh) truyền tải Context Delta giữa 4 Tab chuyên biệt trong cùng workspace để tối ưu hiệu suất, tránh xung đột mã nguồn và chia sẻ ngữ cảnh liên tục:

### 1.1. Huy Hiệu Xác Nhận Đã Đọc AGENTS.md (Chat Response Watermark Bắt Buộc):

Để Người Dùng luôn nhận biết tức thì Agent đã nạp và tuân thủ `AGENTS.md` ngay trên cửa sổ chat mà không cần kiểm tra log hay gõ lệnh hỏi, **MỌI CÂU TRẢ LỜI CỦA AGENT Ở CẢ 4 TAB BẮT BUỘC PHẢI BẮT ĐẦU BẰNG 1 DÒNG HUY HIỆU DUY NHẤT Ở ĐẦU TIN NHẮN**:

`🛡️ [ĐÃ ĐỌC AGENTS.MD | <Tab-ID> - <Tên Vai Trò> | Mesh Step 0: <Trạng thái hộp thư>]`

**Ví dụ quy chuẩn cho từng Tab:**
- **Tab 1:** `🛡️ [ĐÃ ĐỌC AGENTS.MD | anti-1-QTV-LT (Web Admin Lead) | Mesh Step 0: ✅]`
- **Tab 2:** `🛡️ [ĐÃ ĐỌC AGENTS.MD | anti-2-HV (Mobile Member Lead) | Mesh Step 0: ✅]`
- **Tab 3:** `🛡️ [ĐÃ ĐỌC AGENTS.MD | anti-3-PT (Mobile PT Lead) | Mesh Step 0: ✅]`
- **Tab 4:** `🛡️ [ĐÃ ĐỌC AGENTS.MD | anti-4-Core-BE-DB (Backend & DB Lead) | Mesh Step 0: ✅]`

> [!CAUTION]
> Bất kỳ câu trả lời nào của Agent bị thiếu dòng huy hiệu này ở đầu tin nhắn đều bị coi là **chưa nạp quy tắc / vi phạm quy chuẩn dự án**.

---

### 1.2. Phân Vai & Phạm Vi Code Của 4 Tab:

| Tab (Conversation) | Vai trò định danh | Phạm vi chuyên trách | Thư mục hộp thư | Thư mục Source Code phụ trách |
| :--- | :--- | :--- | :--- | :--- |
| **anti-1-QTV-LT** | **Web Admin Lead** | Quản trị viên (QTV W01-W13) & Lễ tân (LT-W01-W09) | `brain-anti1/` | `frontend/web/` |
| **anti-2-HV** | **Mobile Member Lead** | Toàn bộ ứng dụng Mobile Hội viên (HV01 - HV06) | `brain-anti2/` | `frontend/mobile/member/` |
| **anti-3-PT** | **Mobile PT Lead** | Toàn bộ ứng dụng Mobile Huấn luyện viên (PT01 - PT06) | `brain-anti3/` | `frontend/mobile/pt/` |
| **anti-4-Core-BE-DB** | **Backend & DB Lead** | Database PostgreSQL 22 bảng, Backend REST API, Auth đa phương thức & 2FA SMS/OTP, Business Services | `brain-anti4/` | `backend/` & `frontend/shared/` |

> [!IMPORTANT]
> **Quy tắc cô lập source code:** Mỗi Tab chỉ tạo và chỉnh sửa file trong thư mục code được phân công ở bảng trên. Điều này đảm bảo 4 tab có thể code và commit song song 100% mà **hoàn toàn không bao giờ xảy ra xung đột (git merge conflict)**!

---

### 1.3. Quy Tắc Tiếp Nhận Ngữ Cảnh & Đánh Dấu Đã Đọc 3/3 (BƯỚC 0 - ĐẦU MỖI PROMPT):

Mỗi Tab khi bắt đầu bất kỳ một prompt nào **bắt buộc phải quét kiểm tra thư mục hộp thư của 3 Tab còn lại** (bao gồm cả file gốc `notes.md` và các file trong thư mục con):
- **Đối với Tab `anti-1-QTV-LT`:** Quét `brain-anti2/`, `brain-anti3/`, `brain-anti4/`.
- **Đối với Tab `anti-2-HV`:** Quét `brain-anti1/`, `brain-anti3/`, `brain-anti4/`.
- **Đối với Tab `anti-3-PT`:** Quét `brain-anti1/`, `brain-anti2/`, `brain-anti4/`.
- **Đối với Tab `anti-4-Core-BE-DB`:** Quét `brain-anti1/`, `brain-anti2/`, `brain-anti3/`.

**Cơ chế Đánh Dấu Đã Đọc (Read Receipts) & Điều Kiện Xóa Hộp Thư Đủ 3/3:**
Khi phát hiện file có nội dung (> 0 bytes) trong hộp thư của 3 tab còn lại (`task.md`, `implementation_plan.md`, `api_contracts.md`, `notes.md`, `task_done.md`,...):

1. **Kiểm tra trạng thái đã đọc:**
   - Đọc dòng đầu tiên của file xem có thẻ xác nhận `<!-- READ_BY: ... -->` chưa.
   - Nếu mã Tab của mình (ví dụ `anti-1`, `anti-2`, `anti-3`, hoặc `anti-4`) **đã có** trong danh sách `READ_BY` ➔ Bỏ qua không xử lý lại để tiết kiệm token.
   - Nếu mã Tab của mình **chưa có** trong danh sách ➔ Tiến hành bước 2.

2. **Tiếp nhận ngữ cảnh & Đóng dấu đã đọc:**
   - Đọc toàn bộ nội dung file và nạp context vào bộ nhớ của Tab.
   - Cập nhật bổ sung mã Tab mình vào thẻ `<!-- READ_BY: ... -->` ở đầu file (ví dụ: ban đầu là `<!-- READ_BY: anti-2 -->`, Tab 1 đọc xong cập nhật thành `<!-- READ_BY: anti-2, anti-1 -->`).

3. **Quy tắc Xóa Hộp Thư (Chỉ Tab Cuối Cùng Được Phép Xóa):**
   - **CẤM TUYỆT ĐỐI** Tab đầu tiên hoặc Tab thứ hai tự ý xóa file / làm rỗng file về 0 bytes, vì sẽ làm các Tab còn lại bị mất thông tin (miss context)!
   - Chỉ khi file đã được **ĐỦ TẤT CẢ 3 TAB NGƯỜI NHẬN** cùng đọc (tức `READ_BY` đã chứa đủ 3 mã tab thụ hưởng):
     * Ví dụ với tin nhắn phát hành từ Tab 4 (`brain-anti4/`), 3 tab người nhận là `anti-1`, `anti-2`, `anti-3`. Khi cả 3 tab đã có mặt trong `<!-- READ_BY: anti-1, anti-2, anti-3 -->`.
   - Lúc này, chính **Tab đọc cuối cùng (Tab thứ 3 hoàn tất lượt đọc)** sẽ có trách nhiệm **xóa sạch 100% nội dung** (hoặc dọn rỗng file về 0 bytes / xóa file) để giải phóng hộp thư, hoàn tất vòng đời của tin nhắn!

---

### 1.4. Quy Tắc Phát Hành Ngữ Cảnh (CUỐI mỗi prompt khi hoàn thành tác vụ):

- Khi kết thúc một prompt có phát sinh quyết định kỹ thuật mới, API endpoint mới hoặc hoàn thành một chức năng, Agent ở tab nào sẽ ghi thông tin cô đọng vào thư mục hộp thư đi tương ứng:
  - Tab 1 ghi vào: `brain-anti1/notes.md` (hoặc `brain-anti1/<subfolder>/task_done.md`)
  - Tab 2 ghi vào: `brain-anti2/notes.md` (hoặc `brain-anti2/<subfolder>/task_done.md`)
  - Tab 3 ghi vào: `brain-anti3/notes.md` (hoặc `brain-anti3/<subfolder>/task_done.md`)
  - Tab 4 ghi vào: `brain-anti4/notes.md` (hoặc `brain-anti4/<subfolder>/task_done.md`)
- **Quy chuẩn thẻ khởi tạo khi phát hành:** Ở dòng đầu tiên của mỗi file tin nhắn/ngữ cảnh mới tạo, bắt buộc phải chèn thẻ nhận diện ban đầu:
  ```markdown
  <!-- READ_BY: -->
  ```
- **CHỈ ghi các file và nội dung mới phát sinh trong prompt đó** (ví dụ: `api_contracts.md`, `notes.md`, `task_done.md`); tuyệt đối không chép lại toàn bộ lịch sử cũ để tối ưu token.

---

### 1.5. Quy Tắc Lưu Trữ Kế Hoạch & Báo Cáo Bàn Giao (Implementation Plan & Walkthrough Archive):

Mọi `Implementation Plan` và `Walkthrough` (báo cáo bàn giao) của từng Tab ở mỗi giai đoạn phát triển **bắt buộc phải được ghi thành file `.md` nằm trực tiếp trong mã nguồn dự án (repository)** để phục vụ tra cứu tiến độ và lịch sử phát triển:
- Thư mục lưu trữ chuẩn hóa theo từng Tab: `docs/reports/<tab-name>/`
  - **Tab 1:** `docs/reports/tab1-web-admin/<phase>-implementation-plan.md` & `<phase>-walkthrough.md`
  - **Tab 2:** `docs/reports/tab2-mobile-member/<phase>-implementation-plan.md` & `<phase>-walkthrough.md`
  - **Tab 3:** `docs/reports/tab3-mobile-pt/<phase>-implementation-plan.md` & `<phase>-walkthrough.md`
  - **Tab 4:** `docs/reports/tab4-backend-db/<phase>-implementation-plan.md` & `<phase>-walkthrough.md`
- Đồng thời đồng bộ vào thư mục hộp thư `brain-<tab>/` để các Tab còn lại dễ dàng đọc và tham chiếu.

---

## 2. Documentation & Feature Changes

For changes to Product Spec, Epics, User Stories, business rules, features, workflows, or UI:

- Before creating or updating a Product Spec, Epic, User Story, Acceptance Criteria (AC), or UI Flow, always read and apply `.agents/rules/docs-sync.md`.
- When documenting any form, modal, or input flow, specify every field's input state (`USER-INPUT`, `AUTO-FILL`, `PREFILL`, `READONLY`), required/optional status, conditional/dynamic behavior, and data source; do not use vague descriptions such as “người dùng nhập thông tin” or “hệ thống tự điền”.
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
- When creating or updating an Activity Diagram, always read and apply `.agents/skills/activity-diagram/SKILL.md`; keep the written Main Flow, Alternate Flows, and Exception Flows and use explicit UML-style nodes, control flow, boundary, and role-based swimlanes.
- **When creating or updating a Sequence Diagram, always read and apply `.agents/skills/sequence-diagram/SKILL.md`**; maintain the 5-step thinking process, Left-to-Right topology, autonumber, 4-6 phase milestone structure, concrete API/data message naming, atomic internal transaction self-calls, background polling/timer notes, and companion narrative.
- **Quy tắc Bất Biến về Số Mũi Tên trong Activity Diagram (Node Arity & Topology):**
  + **Action Node `["..."]`:** BẮT BUỘC ĐÚNG `1 IN + 1 OUT` (không hơn không kém). Cấm dùng Action node để rẽ nhánh, cấm nhiều mũi tên vào Action node, và tuyệt đối cấm đứt đoạn / kết thúc tại Action node.
  + **Decision Node `{"..."}`:** `1 IN + N OUT` ($N \ge 2$), bắt buộc có nhãn điều kiện trên 100% các nhánh rẽ.
  + **Merge Node `{"Merge"}` / `(("Merge"))`:** `N IN + 1 OUT` (OR logic - chỉ cần 1 nhánh tới).
  + **Join Node `{{"Join"}}`:** `N IN + 1 OUT` (AND logic - phải chờ tất cả nhánh song song).
  + **Final Node `((("Final — ...")))`:** `1 IN + 0 OUT` (Điểm kết thúc duy nhất hợp lệ của một path).
- Keep all affected documentation and UI consistent.
- Inspect only related artifacts.
- Do not scan or rewrite unrelated files.

---

## 3. UI Changes

> [!CAUTION]
> **QUY TẮC BẮT BUỘC KHI CHỈNH SỬA HOẶC THÊM MỚI GIAO DIỆN (MANDATORY UI WORKFLOW):**
> **Cứ chỉnh sửa gì ở UI hoặc thêm mới bất kỳ thành phần nào trên UI (màn hình, form, modal, datagrid, metric cards, nút bấm, trường nhập liệu...) đều BẮT BUỘC PHẢI ĐỌC LẠI KỸ NĂNG `.agents/skills/qtv-ui-design-system/SKILL.md` TRƯỚC KHI THỰC HIỆN.**
> - Đảm bảo tính đồng nhất 100% về:
>   + **Visual style & Tokens màu sắc:** Administrative Forest Clean (`--primary: #237b58`, `--primary-dark: #185740`, `--primary-light: #eaf4ee`, `--border-color: #dfe6e2`). Tuyệt đối không dùng màu tùy tiện hoặc style inline khác biệt.
>   + **Cấu hình Form chuẩn hóa (`dxForm`):** Luôn có `labelLocation: 'top'`, `showColonAfterLabel: false`. Cấm để dấu hai chấm (`:`) sau nhãn trường. Không gõ cứng dấu sao (`*`) vào chữ của nhãn khi đã có validationRule `required`.
>   + **Nút bấm & Hộp thoại Popup (`dxPopup`):** Nút lưu dữ liệu bắt buộc màu xanh lá (`type: 'default'`, `stylingMode: 'contained'`, icon `save`), nút hủy bỏ dạng viền (`stylingMode: 'outlined'`).
>   + **CẤM TUYỆT ĐỐI GỢI Ý, CHÚ THÍCH, HỘP GIẢI THÍCH (INFO CALLOUTS / HINTS / TIPS / PHỤ ĐỀ MÔ TẢ) TRÊN GIAO DIỆN:** Tuyệt đối không bao giờ được đặt các hộp thông tin gợi ý (`info-card`, callout banner, `💡 Gợi ý:...`, `[i] Tỷ lệ hoa hồng mới sẽ chính thức áp dụng...`) hay các đoạn văn bản chú thích, mô tả phụ đề dài dòng bên trong form/modal hay màn hình. Giao diện Web Admin dành cho nhân sự quản lý chuyên nghiệp, cần sự tinh gọn, sạch sẽ và tối giản 100%, chỉ hiển thị đúng các trường dữ liệu và nút thao tác cần thiết.

For UI design or UI modification:

- **Bắt buộc đọc kỹ năng `.agents/skills/qtv-ui-design-system/SKILL.md`** cho toàn bộ phân hệ Web Admin (QTV/LT) trước khi viết hay sửa bất kỳ dòng code UI nào.
- Follow `.agents/rules/ui-design-system.md`.
- **Bắt buộc áp dụng kỹ năng `.agents/skills/ui-docs-sync/SKILL.md`**: Mỗi khi thực hiện bất kỳ thay đổi nào trên giao diện người dùng (thêm/sửa trường nhập liệu, nút bấm, modal, form, bảng DataGrid, logic dynamic/conditional ẩn hiện, luồng tương tác), Agent **bắt buộc phải đồng bộ hóa ngay lập tức 100%** vào tài liệu đặc tả:
  + Bảng Field-level specification của User Story (chuẩn hóa `TRIGGER`, `DYNAMIC`, `CONDITIONAL`, `Required: conditional`, `USER-INPUT`, `AUTO-FILL`, `PREFILL`, `READONLY`).
  + Main Flow, Alternate Flows, Exception Flows.
  + Sơ đồ Swimlane Activity Diagram chuẩn UML (`.agents/skills/activity-diagram/SKILL.md`).
  + Epic và Product Spec liên đới nếu có quy tắc nghiệp vụ mới.
- Identify the related User Story, Epic, and Product Spec when the UI change affects documented behavior.
- Reuse existing UI patterns and components when possible (DevExtreme jQuery components: `dxDataGrid`, `dxForm`, `dxScheduler`, `dxPopup`, `dxDrawer`, `dxChart`).

---

## 4. Scope & Boundaries

Do not create Acceptance Criteria, API, database, technical design, or implementation unless explicitly requested.
A task is complete only when all affected artifacts are consistent.

---

## 5. Quy Tắc Dữ Liệu & Seed Database (Cấm Tuyệt Đối Mock Data Hardcoded Trên Frontend)

> [!CAUTION]
> **BẮT BUỘC ÁP DỤNG SKILL `.agents/skills/db-seed-integrity/SKILL.md` TRƯỚC VÀ SAU KHI SEED DỮ LIỆU:**
> - Toàn hệ thống Paradise Gym **CHỈ CÓ ĐÚNG 2 HUẤN LUYỆN VIÊN (PT)**: PT001 Nguyễn Văn Thể (Chi nhánh Quận 1) và PT002 Lê Văn Hùng (Chi nhánh Bình Thạnh). CẤM TUYỆT ĐỐI BỊA ĐẶT THÊM HLV HOẶC TẠO TÊN HLV ẢO ("HLV Quỳnh Trâm", "HLV Lyn Lyn", "HLV Raymond", "HLV Joy", "HLV Đặng Minh Tuấn", "HLV Trần Thị Mai",...).
> - HLV thuộc chi nhánh nào thì 100% chỉ dạy lớp tại chi nhánh đó. Lịch dạy PT 1:1 và Lớp cộng đồng không được trùng giờ.
> - Sau khi seed dữ liệu, bắt buộc phải chạy 5 câu lệnh SQL kiểm tra trong mục 3 của skill `db-seed-integrity`.

- **Cấm Tuyệt Đối Hardcode Dữ Liệu Ở Frontend (Web & Mobile):**
  + Tuyệt đối **KHÔNG ĐƯỢC** khai báo các mảng, đối tượng dữ liệu mẫu tĩnh (hardcoded mock data / static arrays / mock accounts / mock packages / mock bookings,...) bên trong bất kỳ file JavaScript/HTML nào của Frontend (`frontend/web/`, `frontend/mobile/member/`, `frontend/mobile/pt/`).
  + Không được dùng `localStorage` lưu trữ data mẫu mặc định để tự ý render khi không có backend/database.
  + Toàn bộ dữ liệu hiển thị trên giao diện người dùng (danh sách gói tập, thông tin hội viên, lịch PT, lịch sử thanh toán, lượt check-in, thông báo,...) **bắt buộc phải là dữ liệu động 100%**, lấy trực tiếp từ PostgreSQL Database thông qua các REST API của Backend (`apiClient`). Nếu chưa bật database hoặc chưa kết nối API, Frontend phải hiển thị trạng thái chờ kết nối / loading / empty state hoặc thông báo lỗi kết nối, không được tự ý tạo dữ liệu giả để hiển thị.

- **Quy Chuẩn Seed Dữ Liệu Tập Trung (`backend/src/db/seed.js`):**
  + Mọi dữ liệu khởi tạo mẫu phục vụ thử nghiệm và vận hành hệ thống **bắt buộc phải được viết tập trung trong file `backend/src/db/seed.js`** (thực thi qua lệnh `npm run db:seed` hoặc `node src/db/seed.js`).
  + Dữ liệu seed phải tuân thủ nghiêm ngặt mô hình quan hệ cơ sở dữ liệu (PostgreSQL 22 bảng), đảm bảo tính toàn vẹn tham chiếu khóa chính (PK), khóa ngoại (FK), UUID, snapshot giá gói, logic thanh toán 100% (phiếu thu tương ứng với thanh toán thành công), và lịch tập xác nhận kép.
  + Toàn bộ dữ liệu này được lưu trữ trực tiếp vào cơ sở dữ liệu PostgreSQL (chạy qua Docker), từ đó Backend cung cấp qua API cho các ứng dụng Web và Mobile.

- **Quy Chuẩn Đồng Bộ & Nhất Quán Dữ Liệu Seed (Tuyệt Đối Không Seed Tùy Tiện):**
  + **Đồng bộ 100% giữa các bảng liên kết (Relational Consistency):** Dữ liệu khi được seed vào database bắt buộc phải liên kết logic chặt chẽ và nhất quán với nhau 100%, tuyệt đối **không được seed tùy tiện**, chắp vá, dữ liệu một đằng hiển thị một nẻo hay tạo các ID ảo không tồn tại ở bảng cha. Mọi khóa ngoại (`member_id`, `pt_id`, `registration_id`, `branch_id`, `package_id`,...) phải trỏ chính xác đến bản ghi thực tế đang tồn tại.
  + **Khớp nối số liệu & logic nghiệp vụ giữa các thực thể:**
    * *Hợp đồng và Buổi tập:* Tổng số buổi tập (`total_pt_sessions`) phải luôn bằng `used_pt_sessions` + `remaining_pt_sessions` (+ `booked_pt_sessions`). Số buổi đã dùng (`used_pt_sessions`) phải bằng chính xác tổng số bản ghi có trạng thái `COMPLETED` trong bảng `pt_bookings` của hợp đồng đó.
    * *Lịch tập PT đa chiều:* Nếu học viên có buổi tập đã hoàn thành (ví dụ: Buổi 17 ngày 04/09/2026 với HLV Nguyễn Văn Thể), thì trong bảng `pt_bookings` phải có bản ghi tương ứng đầy đủ: đúng ngày/giờ, đúng HLV, đúng học viên, đúng số thứ tự buổi (`session_number = 17`), kèm nội dung bài tập, đánh giá thể lực và xác nhận kép (`pt_confirmed_at`, `member_confirmed_at`, `is_deducted = true`). Dữ liệu này phải hiển thị đồng nhất khi xem từ app HLV (Mobile PT), app Hội viên (Mobile Member) lẫn màn hình quản lý (Web Admin).
    * *Huấn luyện viên phụ trách:* Nếu hợp đồng có HLV phụ trách (`assigned_pt_id`), thì HLV đó phải có hồ sơ thực tế trong bảng `pt_profiles` / `accounts`, và phải luôn xuất hiện đầy đủ trong danh sách chọn HLV khi Hội viên hoặc Lễ tân/QTV thao tác trên hệ thống.
    * *Thanh toán và Phiếu thu:* Mỗi giao dịch thanh toán thành công 100% (`payments`) phải có đúng 1 phiếu thu (`receipts`) tương ứng khớp chuẩn xác số tiền, mã giao dịch, ngày giờ và gắn liền với hợp đồng đăng ký (`registration_id`).
  + **Quy chuẩn cập nhật tài liệu khi mở rộng trường/khóa:** Nếu trong quá trình seed phát hiện thiếu trường dữ liệu hoặc thiếu khóa quan hệ (khóa chính / khóa ngoại) để đảm bảo tính logic giữa các bảng, bắt buộc phải bổ sung vào file migration SQL (`backend/src/db/migrations/`), đồng thời **phải cập nhật ngay lập tức vào tài liệu thiết kế cơ sở dữ liệu (`docs/database/erd.md`)** để đảm bảo tài liệu và code luôn đồng bộ 100%.

---

## 6. Quy Tắc Quản Trị Cơ Sở Dữ Liệu (Bắt Buộc Đồng Bộ 100% Vào `docs/database/erd.md`)

- **Bắt buộc đồng bộ tài liệu kiến trúc ERD (`docs/database/erd.md`):**
  + Bất kỳ khi nào phát hiện thiếu bảng, thiếu trường (field/column), hoặc thực hiện bổ sung/thay đổi bất kỳ thành phần nào trong Cơ Sở Dữ Liệu:
    * Thêm bảng mới hoặc xóa/đổi tên bảng.
    * Thêm trường mới, đổi kiểu dữ liệu, thay đổi ràng buộc (`NULL`, `NOT NULL`, `UNIQUE`, `DEFAULT`, `CHECK`).
    * Thêm, xóa hoặc sửa đổi **khóa chính (Primary Key - PK)**, **khóa ngoại (Foreign Key - FK)**, quan hệ 1-1, 1-N, N-N.
    * Thêm chỉ mục (Index) hoặc trigger/function.
  + **Hành động bắt buộc:** Agent **bắt buộc phải cập nhật ngay lập tức vào file tài liệu `docs/database/erd.md`** (bao gồm sơ đồ Mermaid ERD, danh sách bảng, chi tiết kiểu dữ liệu, khóa chính, khóa ngoại và mô tả nghiệp vụ của từng trường/bảng mới).
  + Tuyệt đối **KHÔNG ĐƯỢC** chỉ sửa code SQL migration (`backend/src/db/migrations/`), code DDL hoặc script seed (`seed.js`) mà bỏ quên `docs/database/erd.md`. Mọi thay đổi ở Database phải được phản ánh 100% trong `docs/database/erd.md` để Người Dùng luôn kiểm soát toàn diện kiến trúc dữ liệu của dự án.

---

## 7. Quy Tắc Kiểm Thử E2E Từng User Story (E2E Test, QA, Verify & Validate)

- **Bắt Buộc Đọc & Áp Dụng Skill `us-e2e-test-recorder`:**
  + Bất kỳ khi nào Người Dùng yêu cầu **test**, **QA**, **verify**, **validate** hoặc **kiểm thử User Story (US)**, Agent **LUÔN LUÔN BẮT BUỘC phải đọc và áp dụng kỹ năng `.agents/skills/us-e2e-test-recorder/SKILL.md` trước khi tiến hành chạy test**.
- **Các Quy Chuẩn Bắt Buộc Khi Kiểm Thử:**
  + **Tổ chức thư mục & báo cáo theo Vai trò (Role-Based Directory Structure):** Toàn bộ bài test và bằng chứng screenshot E2E bắt buộc phải đặt đúng vào thư mục của từng vai trò tương ứng:
    * Quản trị viên: `tests/e2e/qtv/<US-ID>/` (ví dụ: `tests/e2e/qtv/QTV-W01-US01/`)
    * Lễ tân: `tests/e2e/lt/<US-ID>/` (ví dụ: `tests/e2e/lt/LT-W01-US01/`)
    * Hội viên Mobile: `tests/e2e/hv/<US-ID>/` (ví dụ: `tests/e2e/hv/HV01-US01/`)
    * Huấn luyện viên Mobile: `tests/e2e/pt/<US-ID>/` (ví dụ: `tests/e2e/pt/PT01-US01/`)
    Mỗi US kiểm thử có một thư mục riêng biệt tại `tests/e2e/<role>/<US-ID>/` và một file báo cáo Markdown chuẩn `tests/e2e/<role>/<US-ID>/<US-ID>-test.md`.
  + **Step-by-Step UI thật:** Mọi thao tác có ý nghĩa trên hệ thống (click nút, nhập field, chọn combobox, submit, đổi trạng thái, mở modal/drawer, chọn slot calendar,...) đều phải ghi Action/Input, Expected Result, Actual Result, đánh dấu PASS/FAIL và chụp screenshot ngay sau thao tác, nhúng ảnh trực tiếp ngay dưới step tương ứng. Tuyệt đối **không được chỉ test kết quả cuối cùng**.
  + **Căn cứ xác định kết quả kỳ vọng:** Expected Result phải trích xuất chính xác từ User Story, UI Field-level spec, Product Spec và Business Rules hiện hành; tuyệt đối **không suy đoán**.
  + **Validation & Dynamic UI:** Bắt buộc phải test các trường hợp validation lỗi/biên và kích hoạt trường TRIGGER để chụp screenshot ngay tại thời điểm giao diện hiển thị thông báo lỗi hoặc thay đổi động (CONDITIONAL/DYNAMIC fields).
  + **Kiểm Chứng Đa Vai Trò & Đồng Bộ UI Thực Tế (Cross-Role Downstream UI Synchronization):** Tuyệt đối **cấm chỉ kiểm tra dữ liệu ngầm trong Database hoặc API** mà bỏ qua giao diện người dùng! Khi thao tác nguồn (ví dụ ở vai trò QTV) tạo mới, cập nhật hoặc đổi trạng thái dữ liệu có tác động đến vai trò khác, **bắt buộc phải mở UI thật của role đó trên trình duyệt (Web Lễ tân `http://localhost:3000/web/`, Mobile Hội viên `http://localhost:3000/mobile/member/`, Mobile PT `http://localhost:3000/mobile/pt/`)**. Điều hướng đến đúng màn hình thụ hưởng (ví dụ: QTV tạo gói tập -> bắt buộc mở màn hình "Mua gói" của app Mobile Hội viên và dropdown Đăng ký của Lễ tân để verify gói mới xuất hiện đúng giá và quyền lợi; QTV thêm/sửa hội viên -> kiểm tra Lễ tân tìm thấy và Hội viên đăng nhập được app; QTV gán PT -> mở app Mobile PT kiểm tra học viên mới được phân công; QTV hủy lịch -> kiểm tra Calendar của cả PT và Hội viên). Bắt buộc chụp screenshot UI của role downstream kèm khoanh vùng (bounding box) và ghi nhận trạng thái PASS/FAIL đầy đủ trong mục "Cross-Role / Downstream Verification" của báo cáo.
  + **Xử lý lỗi & Nguyên tắc không tự sửa code:** Nếu một step bị FAIL thì ghi rõ vấn đề vào `Issues Found`, chụp screenshot lỗi; không giả lập các bước sau. Nếu lỗi làm gián đoạn luồng thì đánh dấu `BLOCKED`. **Tuyệt đối không tự ý sửa code khi đang test**, trừ khi Người Dùng có yêu cầu rõ ràng là "test-and-fix".
  + **Cấu trúc báo cáo chuẩn 5 section cốt lõi:** Bắt buộc có đủ các phần: `Source Action Verification`, `State Verification`, `Cross-Role / Downstream Verification`, `Issues Found`, `Final Result`.
  + **Quy chuẩn đặt tên screenshot:** Đặt tên rõ ràng mang tính mô tả cụ thể (ví dụ: `step-01-open-page.png`, `downstream-01-lt-check.png`), tuyệt đối cấm dùng tên vô nghĩa (`image1.png`, `test.png`).
  + **Xác Thực DOM Thực Tế & Cấm Tuyệt Đối Báo Cáo Giả Mạo (DOM Truthfulness):** Trước khi ghi nhận Actual Result và đánh dấu PASS cho bất kỳ bước nào (mở modal, mở drawer, submit form, hiển thị thông báo), bắt buộc phải kiểm tra phần tử thực sự hiển thị trên DOM (ví dụ: `$('.dx-popup:visible').length > 0`). Tuyệt đối **cấm ghi kết quả định sẵn kiểu "Modal mở đúng thiết kế" khi thực tế trên ảnh là Toast lỗi màu đỏ hoặc không có modal**. Báo cáo bằng văn bản phải khớp 100% với ảnh chụp thực tế!
  + **Quy Trình 3 Bước Xử Lý Ngoại Lệ & Điều Chỉnh Giao Diện (Exception Flow -> Adjustment -> Success):** Khi gặp một thao tác bị hệ thống chặn theo nghiệp vụ (ví dụ: QTV ở phạm vi `ALL` bấm Thêm hội viên bị chặn vì thiếu chi nhánh):
    * *Bước 1 (Exception):* Ghi nhận trung thực thao tác bị chặn, chụp ảnh Toast thông báo lỗi, đánh dấu PASS (vì đúng Exception Flow).
    * *Bước 2 (Adjustment):* Thực hiện hành động điều chỉnh (ví dụ: chọn chi nhánh cụ thể trên Topbar), chụp ảnh sau khi điều chỉnh.
    * *Bước 3 (Success):* Thao tác lại hành động ban đầu -> Modal/Form thực sự mở ra -> Chụp ảnh modal thực tế!
  + **Cơ Chế Tự Hoàn Thiện & Cập Nhật Kỹ Năng Liên Tục (Continuous Skill Improvement):** Sau bất kỳ đợt kiểm thử nào, nếu đúc kết được kinh nghiệm, quy luật, edge case hoặc giải pháp kỹ thuật mới giúp các lần test sau chuẩn xác và rõ ràng hơn, Agent **bắt buộc cập nhật trực tiếp những kinh nghiệm/rule đó vào file `.agents/skills/us-e2e-test-recorder/SKILL.md`** để kỹ năng kiểm thử ngày càng hoàn thiện, giúp toàn bộ hệ sinh thái Agent kế thừa mà không lặp lại sai phạm cũ.
  + **Khoanh Vùng Chú Ý & Đánh Số Thứ Tự Thao Tác (Visual Annotation Snipping Tool Style):** Trên các ảnh screenshot chụp lại màn hình thao tác, bắt buộc khoanh vùng (bounding box hình chữ nhật hoặc elip viền màu đỏ/tím nổi bật) vào đúng phần tử UI đang được tác động (nút bấm, ô nhập liệu, dropdown, thông báo lỗi/toast, dòng dữ liệu trên bảng) và đánh số thứ tự thao tác (badge hình tròn đánh số 1, 2, 3... tương tự công cụ vẽ của Snipping Tool). Điều này giúp người đọc nhìn vào ảnh nhận biết tức thì điểm cần chú ý và trình tự thao tác trên giao diện.
  + **Tính Đồng Nhất Đối Tượng Giữa Thao Tác Nguồn & Downstream (Subject Consistency & Active Account Rule):** Tuyệt đối **cấm thao tác trên đối tượng A mà khi mở vai trò downstream lại kiểm tra đối tượng B**! Mọi thao tác nguồn và downstream verification bắt buộc phải diễn ra trên cùng một thực thể duy nhất (cùng ID, cùng SĐT, cùng Mã). Phân biệt rõ: Đối với US tạo mới (Create), tạo một thực thể mới (ví dụ Hội viên mới) và downstream ở Lễ tân tìm thấy hồ sơ này; tuy nhiên hồ sơ mới tạo chưa qua luồng kích hoạt tài khoản trên Mobile nên chưa thể đăng nhập Mobile app. Đối với các US thao tác dữ liệu sau đó (Sửa thông tin, Đổi trạng thái/Khóa thẻ, Gán gói, Đặt lịch, Điểm danh), **bắt buộc phải thực hiện trên một đối tượng ĐÃ CÓ TÀI KHOẢN HOẠT ĐỘNG (ACTIVE) TRÊN MOBILE** (ví dụ Hội viên Lê Hoàng Nam - HV001 / SĐT 0987654321 trong seed data) để downstream đối chiếu đồng nhất chính đối tượng đó trên Mobile app!
  + **Kiểm Chứng Phạm Vi Chi Nhánh Đa Chi Nhánh (Multi-Branch Scope Verification):** Đối với các User Story có nghiệp vụ liên quan đến phạm vi chi nhánh (`Branch Scope`), bắt buộc phải thử nghiệm với 2 người dùng / 2 tài khoản thuộc 2 chi nhánh khác nhau (hoặc chuyển đổi qua lại giữa 2 chi nhánh khác nhau, ví dụ Chi nhánh Quận 1 và Chi nhánh Quận 7 / Tân Bình): Nhân viên/Lễ tân Chi nhánh A chỉ nhìn thấy và thao tác trên dữ liệu Chi nhánh A; Nhân viên/Lễ tân Chi nhánh B không nhìn thấy dữ liệu riêng của Chi nhánh A; QTV chọn Chi nhánh A thì thấy dữ liệu Chi nhánh A, chọn Chi nhánh B thì dữ liệu chuyển tức thì sang Chi nhánh B, chọn ALL thì thấy tổng hợp nhưng bị chặn tạo mới các thực thể yêu cầu chi nhánh cụ thể.
  + **Tách Bạch Thao Tác Nhập Liệu & Submit Form (Input Capture Before Submit Rule):** Khi test form tạo mới hoặc chỉnh sửa (Edit), tuyệt đối cấm gộp việc điền form và click nút Lưu vào cùng một bước. Bắt buộc phải có một bước chụp màn hình sau khi đã điền thông tin mới vào các input fields (kèm Bounding Box khoanh vùng trường dữ liệu mới) trước khi bấm Submit, rồi mới đến bước bấm Lưu và chụp kết quả thành công.
  + **Xác Thực Giao Diện Nghiệp Vụ Hạ Nguồn Thay Vì Màn Hình Đăng Nhập (Authenticated Downstream Screen Rule):** Tuyệt đối cấm chụp màn hình Đăng nhập (Login screen) rồi báo cáo là đã kiểm chứng Downstream! Phải nạp trước token và thông tin user hợp lệ vào `localStorage` trên origin web trước khi truy cập ứng dụng Mobile, đảm bảo trình duyệt nạp thẳng vào màn hình nghiệp vụ bên trong (như màn hình Tài khoản, Gói của tôi, Lịch tập) với đầy đủ thông tin đã được đồng bộ.
  + **Bắt Buộc Mở Cửa Sổ Google Chrome Thật & Vòng Lặp Zero-Bug Iteration Loop (Mandatory Live Visual E2E & Zero-Bug Rule):** Trước khi kết thúc bất kỳ tác vụ nào liên quan đến UI hoặc chức năng web/mobile, Agent CẤM TUYỆT ĐỐI CHẠY NGẦM (`headless: true`). Agent BẮT BUỘC 100% phải mở cửa sổ Google Chrome thật trực tiếp lên màn hình laptop của Người Dùng (với `headless: false`, `slowMo: 100ms`, `--start-maximized`) để trực tiếp livestream từng thao tác click, điền form cho Người Dùng xem. Nếu phát hiện output không đúng hoặc có bất kỳ lỗi (bug) nào, dù là nhỏ nhất: BẮT BUỘC tắt trình duyệt ➔ quay về mã nguồn fix lỗi ➔ mở lại trình duyệt demo tiếp. Lặp lại chu trình này cho đến khi output và giao diện hiển thị ĐÚNG 100% HOÀN TOÀN mới được phép kết thúc và bàn giao cho Người Dùng.


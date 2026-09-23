# Báo Cáo Bàn Giao: Cấu Hình Bộ Môn & Tính Thù Lao HLV Lớp Tập Cộng Đồng (W16)

**Mã tác vụ:** TAB1-QTV-W16-DISCIPLINE-BONUS  
**Phân hệ:** Web Quản Trị Viên (QTV) / Lễ Tân (LT) & Core Backend  
**Ngày hoàn tất:** 21/09/2026  
**Trạng thái:** ✅ Đã hoàn thành 100% & Kiểm thử E2E đạt chuẩn

---

## 1. Mục Tiêu Tác Vụ Đạt Được

Theo yêu cầu của Người Dùng tại phân hệ **W16: Lớp tập cộng đồng** trên Web Quản Trị Viên:
1. **Dropdown chọn Bộ môn ("Tên lớp học"):** Thay thế trường nhập text tự do bằng `dxSelectBox` nạp danh sách các bộ môn đang hoạt động (`class_disciplines?status=ACTIVE`), tự động nạp giá sàn bộ môn (`base_price`), thời lượng tối đa (`max_duration_minutes`) và mô tả mẫu.
2. **Dropdown chọn Huấn luyện viên ("Huấn luyện viên / Giáo viên"):** Thay thế trường nhập text bằng `dxSelectBox` nạp động danh sách huấn luyện viên (`pt_profiles`) được lọc tự động theo các chi nhánh được chọn ở trường `Chi nhánh tổ chức` (hoặc toàn hệ thống nếu chọn ALL).
3. **Chức năng "Cấu hình bộ môn":** Bổ sung nút **[Cấu hình bộ môn]** trên thanh công cụ của trang W16, mở modal popup quản lý danh mục bộ môn (DataGrid: Tên bộ môn, Mô tả, Giá sàn 1 buổi dạy, Thời lượng tối đa, Trạng thái hoạt động, Thao tác Sửa / Xóa / Tạm dừng) kèm form thêm mới/chỉnh sửa bộ môn.
4. **Trường "Thưởng thêm" & Công thức tính tổng thù lao:**
   - Bổ sung trường nhập số tiền thưởng thêm (`bonus_amount`, dxNumberBox định dạng `#,##0 ₫`, tối thiểu 0 ₫) trong modal thêm lớp học cộng đồng nhằm khích lệ HLV giảng dạy chất lượng cao.
   - Hiển thị trực quan và tính toán tự động trường **Tổng thù lao HLV** (`total_compensation_display`):
     $$\text{Tổng thù lao} = \text{Giá sàn bộ môn (base\_price)} + \text{Thưởng thêm (bonus\_amount)}$$
     Hiển thị định dạng: `300.000 ₫ (250.000 ₫ sàn + 50.000 ₫ thưởng)`.
   - Hiển thị tổng thù lao và khoản thưởng thêm trực tiếp trên cột Huấn luyện viên của bảng danh sách lớp cộng đồng.

---

## 2. Các Thay Đổi Chi Tiết

### 2.1. Cơ sở dữ liệu (PostgreSQL) & ERD Architecture
- **Migration SQL:** `backend/src/db/migrations/016_community_class_disciplines_and_bonus.sql`:
  - Tạo bảng `class_disciplines` (UUID, `name`, `description`, `base_price`, `max_duration_minutes`, `status`, `created_at`, `updated_at`).
  - Thêm các cột vào bảng `community_classes`: `discipline_id` (FK trỏ tới `class_disciplines.id`), `instructor_id` (FK trỏ tới `pt_profiles.id`), `base_price` (NUMERIC), `bonus_amount` (NUMERIC DEFAULT 0).
  - Tự động seed 8 bộ môn tiêu chuẩn: Yoga, Zumba Dance, BodyPump, Pilates Core, Cycling / RPM, Boxing Group, Cardio HIIT, Aerobic.
- **Tài liệu ERD (`docs/database/erd.md`):** Đồng bộ 100% sơ đồ Mermaid ERD, Mục 2.4 (`community_classes`), và Mục 2.11 (`class_disciplines`).

### 2.2. Backend REST API (`backend/src/modules/core/community.js`)
- `GET /class-disciplines`: Lấy danh sách bộ môn, hỗ trợ lọc theo query `status`.
- `POST /class-disciplines`: Thêm mới bộ môn (phân quyền QTV, audit log).
- `PUT /class-disciplines/:id`: Chỉnh sửa bộ môn (phân quyền QTV, audit log).
- `DELETE /class-disciplines/:id`: Xóa bộ môn hoặc chuyển sang `INACTIVE` nếu đã có lớp liên kết.
- `GET /community-classes`: Mở rộng query JOIN `class_disciplines` và `pt_profiles`, trả về `discipline_name`, `instructor_id`, `base_price`, `bonus_amount`, `total_compensation`.
- `POST /community-classes`: Tiếp nhận `discipline_id`, `instructor_id`, `base_price`, `bonus_amount`, snapshot thù lao tại thời điểm tạo lớp.

### 2.3. Frontend Web Admin (`frontend/web/js/modules/community.js`)
- Bổ sung nút **[Cấu hình bộ môn]** (icon `preferences`) cho QTV.
- Modal **Cấu hình danh mục bộ môn** (`openDisciplineManagementModal`): Quản lý danh mục qua DataGrid và popup form `openDisciplineFormModal`.
- Modal **Thêm lịch lớp tập cộng đồng** (`openCreateClassModal`):
  - Tải đồng thời `disciplines`, `trainers`, và `branches`.
  - Bộ chọn chi nhánh (`dxTagBox`) tự động lọc danh sách HLV tương ứng.
  - Tên lớp học (`discipline_id` dxSelectBox): Tự động nạp giá sàn, thời lượng, mô tả và tính giờ kết thúc.
  - HLV (`instructor_id` dxSelectBox): Nạp danh sách PT theo chi nhánh được chọn.
  - Thưởng thêm (`bonus_amount` dxNumberBox): Tự động kích hoạt tính tổng thù lao HLV.
  - Tổng thù lao HLV (`total_compensation_display`): Hiển thị chi tiết giá sàn + thưởng thêm.
- Bảng danh sách lớp (`load`): Cột "Huấn luyện viên" hiển thị thù lao và khoản thưởng thêm cho QTV.

### 2.4. Tài liệu đặc tả User Story
- Cập nhật `docs/user-stories/qtv/QTV-W16-Lớp tập cộng đồng/QTV-W16-US01-Lập lịch và quản lý lớp tập cộng đồng.md`:
  - Đồng bộ bảng Field-level specification (`TRIGGER`, `DYNAMIC`, `CONDITIONAL`).
  - Bổ sung luồng phụ `AF-03 - Quản lý cấu hình danh mục bộ môn`.
  - Sơ đồ Mermaid Swimlane Activity Diagram chuẩn UML tuân thủ node arity.

---

## 3. Bằng Chứng Kiểm Thử Tự Động (E2E Verification)

Kịch bản kiểm thử E2E tự động qua Puppeteer (`tests/e2e/test_community_discipline_and_bonus.js`) thực hiện trên trình duyệt headless và đạt kết quả **PASS 100%**:

| STT | Bước kiểm thử | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :---: |
| 1 | Mở modal [Cấu hình bộ môn] từ thanh công cụ | Modal mở hiển thị DataGrid danh mục gồm 16 bộ môn, giá sàn, thời lượng và trạng thái hoạt động | ✅ PASS |
| 2 | Mở modal [Tạo lớp mới] | Modal mở nạp đầy đủ danh mục bộ môn, HLV và chi nhánh mặc định | ✅ PASS |
| 3 | Chọn bộ môn Yoga & HLV Lê Văn Hùng | Hệ thống tự động nạp giá sàn 250.000 ₫, tính giờ kết thúc 19:00 (60p) | ✅ PASS |
| 4 | Nhập thưởng thêm 50.000 ₫ | Tổng thù lao tự động tính: `300.000 ₫ (250.000 ₫ sàn + 50.000 ₫ thưởng)` | ✅ PASS |
| 5 | Bấm [Tạo lớp học] & xác minh danh sách lớp | Lớp học được lưu vào DB PostgreSQL và hiển thị lên bảng lớp với đầy đủ thông tin bộ môn và thù lao HLV | ✅ PASS |

**Ảnh chụp màn hình bằng chứng:**
1. `verify-discipline-modal.png`: Modal Cấu hình danh mục bộ môn với DataGrid chuẩn phong cách Administrative Forest Clean.
2. `verify-create-community-class-with-bonus.png`: Modal Thêm lịch lớp tập cộng đồng với 2 dropdown động và tính thù lao HLV.
3. `verify-community-class-created.png`: Lớp học tạo mới hiển thị trên bảng tác nghiệp chính kèm thù lao HLV.

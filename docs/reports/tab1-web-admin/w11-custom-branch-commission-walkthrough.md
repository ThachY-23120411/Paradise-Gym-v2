# Báo Cáo Hoàn Thành: Tùy Chọn Tỷ Lệ Hoa Hồng PT Mặc Định Khi Tạo Chi Nhánh Mới (W11 - QTV)

**Dự án:** Paradise Gym  
**Phân hệ:** Quản trị viên (Web Admin W11 & W15)  
**Tab thực hiện:** Tab 1 (`anti-1-QTV-LT`)  
**Ngày hoàn thiện:** 20/09/2026  
**Trạng thái kiểm thử:** PASS 423/423 HTTP checks (Backend Integration Test độc lập trên PostgreSQL).

---

## 1. Mục Tiêu & Yêu Cầu Nghiệp Vụ
- Cho phép Quản trị viên (QTV) chủ động nhập **Tỷ lệ hoa hồng PT mặc định (%)** ngay tại form **Thêm chi nhánh mới** (W11) thay vì áp đặt cố định 20.00%.
- Giá trị này được lưu vào thuộc tính `default_pt_commission_percentage` của bảng `branches`.
- Hệ thống tự động kích hoạt trigger cơ sở dữ liệu `trg_create_branch_default_commission` để sinh bản ghi cấu hình hoa hồng mặc định chi nhánh **phiên bản v1** trong `pt_commission_configs` và `pt_commission_config_history` với đúng con số % do QTV chỉ định.
- Đảm bảo tính toàn vẹn phiên bản: Tại form **Chỉnh sửa chi nhánh**, trường này ở trạng thái chỉ đọc (`READONLY`), việc thay đổi hoa hồng sau khi chi nhánh đã hoạt động được điều hành tập trung tại module **Quản lý hoa hồng PT (W15)**.

---

## 2. Chi Tiết Các Hạng Mục Đã Thực Hiện

### 2.1. Cơ Sở Dữ Liệu & Trigger (Database Migration 008)
- File migration: [`backend/src/db/migrations/008_branch_default_commission_rate.sql`](file:///e:/Desktop/para/backend/src/db/migrations/008_branch_default_commission_rate.sql)
  - `ALTER TABLE branches ADD COLUMN IF NOT EXISTS default_pt_commission_percentage DECIMAL(5,2) DEFAULT 20.00;`
  - Cập nhật trigger function `trg_create_branch_default_commission_fn()`:
    ```sql
    v_init_rate := COALESCE(NEW.default_pt_commission_percentage, 20.00);
    INSERT INTO pt_commission_configs (..., commission_percentage, version, is_active, ...)
    VALUES (..., v_init_rate, 1, true, ...);
    INSERT INTO pt_commission_config_history (..., commission_percentage, version, action, ...)
    VALUES (..., v_init_rate, 1, 'CREATE', ...);
    ```
- Đã đăng ký migration vào `backend/src/db/migrate.js` và `backend/src/db/seed.js`.

### 2.2. Backend REST API
- File: [`backend/src/modules/core/catalog.js`](file:///e:/Desktop/para/backend/src/modules/core/catalog.js)
  - Cập nhật hàm `saveBranch(req)`:
    - Tiếp nhận trường `default_pt_commission_percentage`.
    - Kiểm tra hợp lệ: $0 \le \text{rate} \le 100$ (nếu không hợp lệ trả về HTTP 400).
    - Lưu vào câu lệnh INSERT `branches`.

### 2.3. Frontend Web Admin UI (W11 Chi Nhánh)
- File: [`frontend/web/js/modules/packages.js`](file:///e:/Desktop/para/frontend/web/js/modules/packages.js)
  - Cập nhật hàm `openBranchModal(id)`:
    - Chế độ **Thêm chi nhánh** (`!id`): Bổ sung trường `Tỷ lệ hoa hồng PT mặc định (%)`, widget `dxNumberBox`, `min: 0`, `max: 100`, `step: 0.5`, `format: '#,##0.0'`, `showSpinButtons: true`, prefill mặc định `20.0%`.
    - Chế độ **Chỉnh sửa chi nhánh** (`id`): Bổ sung trường `Tỷ lệ hoa hồng PT mặc định (%)` ở trạng thái `READONLY`.
  - Cập nhật cache-buster trong [`frontend/web/index.html`](file:///e:/Desktop/para/frontend/web/index.html): `packages.js?v=2`.

### 2.4. Đồng Bộ Hóa Tài Liệu & Sơ Đồ UML Swimlane
- **Kiến trúc CSDL ERD:** [`docs/database/erd.md`](file:///e:/Desktop/para/docs/database/erd.md)
  - Cập nhật thực thể `branches` trong sơ đồ Mermaid ERD và Bảng đặc tả 3.1.
- **User Story Thêm chi nhánh:** [`docs/user-stories/qtv/QTV-W11-Chi nhánh/QTV-W11-US02-Thêm chi nhánh.md`](file:///e:/Desktop/para/docs/user-stories/qtv/QTV-W11-Chi%20nh%C3%A1nh/QTV-W11-US02-Th%C3%AAm%20chi%20nh%C3%A1nh.md)
  - Bổ sung Main Flow, Exception Flow, Field-level specification và Sơ đồ Swimlane UML Activity Diagram chuẩn (`Action = 1 IN + 1 OUT`).
- **User Story Chỉnh sửa chi nhánh:** [`docs/user-stories/qtv/QTV-W11-Chi nhánh/QTV-W11-US03-Chỉnh sửa chi nhánh.md`](file:///e:/Desktop/para/docs/user-stories/qtv/QTV-W11-Chi%20nh%C3%A1nh/QTV-W11-US03-Ch%E1%BB%89nh%20s%E1%BB%ADa%20chi%20nh%C3%A1nh.md)
  - Đặc tả trường `READONLY` và nguyên tắc quản lý phiên bản tập trung tại W15.

---

## 3. Kết Quả Kiểm Thử Tự Động
- File test: [`backend/tests/commission-configs.cases.js`](file:///e:/Desktop/para/backend/tests/commission-configs.cases.js) (Step 10):
  - Chặn thành công tạo chi nhánh với % âm hoặc > 100% (HTTP 400).
  - Tạo thành công chi nhánh mới với % hoa hồng tùy chọn (ví dụ: `27.5%`).
  - Kiểm tra trigger tự sinh cấu hình hoa hồng mặc định chi nhánh v1 với đúng con số `27.5%`.
  - Kiểm tra lịch sử `pt_commission_config_history` ghi nhận phiên bản 1 với `action = 'CREATE'`.
  - Kiểm tra helper tra cứu `getPtCommissionRate()` áp dụng chính xác mức `27.5%` cho HLV hoạt động tại chi nhánh mới.
- Kết quả chạy `npm test`: **PASS 423/423 HTTP checks** 100% trên PostgreSQL độc lập.

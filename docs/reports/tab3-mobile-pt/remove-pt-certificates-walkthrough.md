# Báo Cáo Hoàn Thành: Loại Bỏ Hoàn Toàn Khái Niệm Chứng Chỉ (Certificates) Của PT

- **Ngày thực hiện:** 18/09/2026
- **Phạm vi tác động:** Toàn bộ hệ thống Paradise Gym (Docs, Database PostgreSQL, Backend API, Web Admin, Mobile PT, Mobile Hội viên)
- **Quyết định:** Theo chỉ đạo của Người Dùng, Huấn Luyện Viên (PT) không cần chứng chỉ (certificate); xóa chứng chỉ ra khỏi PT và toàn bộ tài liệu đặc tả, không còn khái niệm chứng chỉ PT trong hệ thống.

---

## 1. Đồng Bộ Tài Liệu Đặc Tả (Docs & Specs)
1. **ERD Database (`docs/database/erd.md`):**
   - Đã xóa trường `jsonb certificates` khỏi sơ đồ Mermaid thực thể `pt_profiles`.
   - Đã xóa dòng mô tả thuộc tính `certificates` trong bảng chi tiết `pt_profiles`.
   - Cập nhật mô tả trường `bio` (chỉ còn giới thiệu kinh nghiệm và thế mạnh huấn luyện).
   - Ghi nhận quyết định loại bỏ chứng chỉ ngày 18/09/2026 trong mục Migration Mobile Refactor.

2. **User Stories PT (`docs/user-stories/pt/`):**
   - `PT04-US01-Xem hồ sơ và tùy chọn tài khoản PT.md`: Xóa dòng `Bằng cấp / Chứng chỉ` khỏi bảng Field-level specification.
   - `PT04-US02-Cập nhật hồ sơ cá nhân PT.md`: Xóa dòng `Bằng cấp và Chứng chỉ` khỏi bảng Field-level specification và các điều khoản nghiệp vụ.

3. **User Stories & Epics QTV / Lễ tân (`docs/epic/` & `docs/user-stories/`):**
   - `QTV-W05-Huấn luyện viên.md` & `LT-W05-Huấn luyện viên.md`: Loại bỏ từ khóa chứng chỉ khỏi mô tả chuyên môn HLV.
   - `QTV-W05-US01-Thêm hồ sơ PT.md`, `QTV-W05-US02-Sửa hồ sơ PT.md`, `QTV-W05-US04-Xem danh sách PT.md`, `LT-W05-US01-Xem danh sách PT.md`: Cập nhật bảng Field-level specification, loại bỏ chứng chỉ.
   - `docs/guide/huong-dan-chay-web-mobile-refactor.md`: Loại bỏ danh mục Bằng cấp / Chứng chỉ khỏi hướng dẫn.

---

## 2. Cơ Sở Dữ Liệu PostgreSQL
- **Migration File:** Tạo `backend/src/db/migrations/005_remove_pt_certificates.sql`:
  ```sql
  ALTER TABLE pt_profiles DROP CONSTRAINT IF EXISTS pt_certificates_structure;
  DROP FUNCTION IF EXISTS valid_pt_certificates(jsonb);
  ALTER TABLE pt_profiles DROP COLUMN IF EXISTS certificates;
  ```
- **Thực thi migration:** Đã chạy migration thành công trên cơ sở dữ liệu PostgreSQL thực tế qua `node src/db/migrate.js`.
- **Xác minh schema:** Cột `certificates` và ràng buộc kiểm tra đã được xóa hoàn toàn khỏi bảng `pt_profiles`.

---

## 3. Backend REST API & Test Suite
- **API Catalog (`backend/src/modules/core/catalog.js`):**
  - Xóa `'certificates'` khỏi whitelist các trường được phép cập nhật (`only`).
  - Xóa validation function `valid_pt_certificates`.
  - Xóa câu lệnh UPDATE cột `certificates` trong hàm `saveTrainer`.
- **Test Automation (`backend/tests/mobile-refactor.cases.js` & `web-rebuild.integration.js`):**
  - Đã tích hợp migration `005_remove_pt_certificates.sql` vào chuỗi migration tự động.
  - Cập nhật các test assertion: xác nhận trường `certificates` là `undefined` khi tra cứu profile HLV.
  - **Kết quả kiểm thử:** Toàn bộ **368 HTTP checks** chạy trên database PostgreSQL đều đạt **PASS 100%**.

---

## 4. Giao Diện Người Dùng (Frontend Web & Mobile)
1. **Mobile PT (`frontend/mobile/pt/`):**
   - `index.html`: Đã xóa toàn bộ khối thẻ giao diện Bằng cấp & Chứng chỉ (`#profileCertificationsList`).
   - `js/profile.js`: Đã xóa hàm `renderCertifications(trainer)`, xóa các lời gọi hàm và reset DOM liên quan đến chứng chỉ.
2. **Web Admin W05 (`frontend/web/js/modules/ptScheduler.js`):**
   - Đã xóa hoàn toàn popup modal quản lý chứng chỉ `showCertificateEditor`.
   - Đã xóa trường `certificates` khỏi `profileData`, `profilePayload` và submit form HLV.
   - Đã xóa nhóm Form item "Chứng chỉ chuyên môn" và nút thêm/sửa/xóa chứng chỉ trong form HLV.
   - Đã xóa danh sách chứng chỉ trong popup xem chi tiết hồ sơ HLV.
   - Cập nhật text nút "Sửa hồ sơ PT" và tooltip "Xem chi tiết hồ sơ".
3. **Mobile Hội viên (`frontend/mobile/member/js/packages-notifications.js`):**
   - Đã xóa việc hiển thị danh sách chứng chỉ `t.certificates` trong thẻ huấn luyện viên khi chọn PT.

---

## 5. Kết Luận
Hệ thống Paradise Gym hiện tại đã hoàn toàn sạch bóng khái niệm và dữ liệu về chứng chỉ Huấn Luyện Viên, đảm bảo tính nhất quán 100% từ tài liệu đặc tả, cơ sở dữ liệu đến giao diện người dùng cả 3 nền tảng Web Admin, Mobile PT và Mobile Hội viên.

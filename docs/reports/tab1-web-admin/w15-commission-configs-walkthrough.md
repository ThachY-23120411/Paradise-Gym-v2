# BÁO CÁO HOÀN THÀNH: TÁI CẤU TRÚC MODULE HOA HỒNG PT (W15 - QTV)

**Ngày hoàn thành:** 20/09/2026  
**Phân hệ:** Quản lý hoa hồng PT (`W15`)  
**Tab phụ trách:** Tab 1 (`anti-1-QTV-LT`)  
**Kiểm thử tích hợp backend:** PASS 419/419 HTTP checks (PostgreSQL container độc lập, 0 mock data).

---

## 1. Tóm Tắt Nghiệp Vụ & Kiến Trúc Đã Triển Khai

### 1.1. Cơ Chế Định Danh Duy Nhất (Uniqueness Identity)
- **Cấu hình mặc định chi nhánh (Branch Default):** Mỗi chi nhánh luôn có đúng 1 dòng cấu hình mặc định đang hoạt động (`pt_id IS NULL`, `is_active = true`).
  - Được đảm bảo 100% qua database trigger `trg_create_branch_default_commission` gắn trên bảng `branches`. Bất kể chi nhánh được tạo qua migration, script seed, REST API hay câu lệnh SQL trực tiếp trong test suite, trigger đều tự động sinh ra Branch Default 20.00% với phiên bản v1 trong `pt_commission_configs` và `pt_commission_config_history`.
- **Cấu hình riêng của PT (PT-specific Override):** Mỗi PT cụ thể trong một chi nhánh chỉ có tối đa 1 dòng cấu hình riêng (`pt_id IS NOT NULL`).
  - Hệ thống ngăn chặn việc tạo trùng lặp qua 2 Partial Unique Indexes:
    * `idx_pt_commission_configs_unique_branch_default` ON `(branch_id) WHERE pt_id IS NULL`
    * `idx_pt_commission_configs_unique_pt_override` ON `(branch_id, pt_id) WHERE pt_id IS NOT NULL`

### 1.2. Nguyên Tắc Không Xóa Vật Lý (Zero Hard Delete)
- Tuyệt đối không xóa bản ghi cấu hình trong bảng `pt_commission_configs`.
- Khi QTV chọn **"Bỏ cấu hình riêng"** (`REMOVE_OVERRIDE`):
  * Cập nhật `is_active = false`, tăng `version = version + 1`, `effective_from = NOW()`, `updated_by_account_id = req.user.id`, `updated_at = NOW()`.
  * Đóng khoảng thời gian hiệu lực của bản ghi cũ (`effective_to = NOW()`).
  * Ghi bản ghi snapshot mới vào `pt_commission_config_history` với `action = 'REMOVE_OVERRIDE'`, `is_active = false`.
  * PT này tự động fallback về áp dụng Branch Default của chi nhánh.
- Khi QTV muốn cấu hình lại cho PT đó:
  * Modal tự động nhận diện bản ghi đã tồn tại và chuyển sang chế độ cập nhật / tái kích hoạt (`REACTIVATE`).
  * Cập nhật `is_active = true`, tỷ lệ mới, tăng `version`, `effective_from = NOW()`.

### 1.3. Bảo Toàn Lịch Sử Phiên Bản 100% (Version History Snapshot)
- Bảng `pt_commission_config_history` lưu toàn bộ các phiên bản tỷ lệ hoa hồng theo mô hình khoảng thời gian nửa mở `[effective_from, effective_to)`.
- Khóa ngoại `config_id`, `branch_id`, `pt_id` đều có ràng buộc `ON DELETE RESTRICT` để ngăn ngừa xóa dữ liệu tài chính.
- Khóa duy nhất `UNIQUE(config_id, version)` bảo đảm tính toàn vẹn phiên bản.

### 1.4. Khử Trùng Lặp Trong Migration (Survivor Dedupe Remapping)
- Migration SQL `007_commission_configs_uniqueness_and_history.sql`:
  * Bầu chọn 1 dòng `SURVIVOR` duy nhất cho mỗi đối tượng cấu hình dựa theo: `ORDER BY effective_from DESC, created_at DESC, id DESC`.
  * Toàn bộ lịch sử của các dòng trùng lặp được ánh xạ lại (`REMAP`) trỏ về `survivor_config_id` trước khi xóa các dòng trùng lặp thừa khỏi `pt_commission_configs`.
  * Giải quyết triệt để lỗi xung đột ràng buộc `ON DELETE RESTRICT`.

### 1.5. Thuật Toán Tra Cứu Tỷ Lệ Hoa Hồng (`getPtCommissionRate`)
- Căn cứ tra cứu: theo `booking.branch_id` (chi nhánh tổ chức buổi tập) và thời điểm hoàn thành buổi tập `booking.completed_at`.
- Thứ bậc giải quyết:
  1. Tra cứu PT Override có hiệu lực tại thời điểm `completed_at` trong `pt_commission_config_history`. Nếu tìm thấy và `is_active = true` $\rightarrow$ lấy tỷ lệ PT Override.
  2. Nếu không có PT Override hoặc PT Override đã bị gỡ (`is_active = false`) $\rightarrow$ lấy Branch Default có hiệu lực tại thời điểm `completed_at`.
  3. Nếu không tìm thấy Branch Default $\rightarrow$ ném ngoại lệ tường minh `BRANCH_DEFAULT_COMMISSION_NOT_CONFIGURED` (tuyệt đối không dùng fallback ngầm 20% trong code).

### 1.6. Phân Quyền Nghiêm Ngặt (Strict RBAC)
- Quyền cấu hình: `role === 'QTV' && req.user.permissions?.commission_config === true`.
- Phạm vi chi nhánh (`branch_scope`): Main QTV có quyền toàn hệ thống; QTV chi nhánh chỉ được thao tác trong danh sách chi nhánh được phân công.
- Lễ tân, PT, Hội viên không có quyền truy cập hoặc cấu hình.

### 1.7. Giao Diện Người Dùng (UI Web Admin W15)
- Tab **Cấu hình tỷ lệ hoa hồng**:
  * Hiển thị bảng đã khử trùng lặp: mỗi chi nhánh 1 dòng mặc định, mỗi PT tối đa 1 dòng riêng.
  * Hiển thị Badge trạng thái: `Đang áp dụng` / `Đã gỡ (Dùng mặc định)`.
  * Hiển thị Badge phiên bản: `v1`, `v2`, ...
  * Các nút hành động: `[ Sửa ]`, `[ Lịch sử ]`, `[ Bỏ riêng ]` (chỉ hiện khi PT đang active), `[ Kích hoạt ]` (khi PT đã gỡ).
  * Nút công cụ: `[ + Thêm cấu hình riêng cho PT ]`.
- Modal **Cấu hình tỷ lệ hoa hồng PT**:
  * Trường **Hiệu lực**: hiển thị cố định `"Có hiệu lực ngay khi lưu"` (`READONLY`).
  * Backend tự động gán `effective_from = NOW()` khi lưu giao dịch.
- Modal **Lịch sử biến động tỷ lệ hoa hồng**:
  * DataGrid hiển thị toàn bộ snapshot phiên bản trong quá khứ từ `pt_commission_config_history`.

### 1.8. Nâng Cấp Thẻ KPI & Layout Thao Tác Tab Bảng Kê Hoa Hồng (W15-US02)
- **Thẻ KPI Metric Cards (`W().metrics`):**
  * Chuyển đổi "Tổng số buổi đã dạy" và "Tổng hoa hồng tháng" thành 2 KPI cards tiêu chuẩn.
  * Tương tác **lọc động (dynamic) theo dòng PT**: Click chọn 1 dòng PT trên bảng để xem riêng số liệu cá nhân của PT đó; click lại lần 2 để bỏ chọn và quay về số liệu toàn bộ HLV trong chi nhánh.
- **Bố trí nút thao tác nằm ngang:**
  * Cột "Thao tác" cấu hình có độ rộng `290px` với `flex-wrap: nowrap`, đảm bảo cả 3 nút `[ Sửa ]`, `[ Lịch sử ]`, `[ Bỏ riêng ]` hiển thị thẳng hàng trên một dòng duy nhất mà không bị gãy/rớt dòng.


---

## 2. Danh Mục File Chỉnh Sửa & Bổ Sung

| STT | File | Nội dung |
| :--- | :--- | :--- |
| 1 | `backend/src/db/migrations/007_commission_configs_uniqueness_and_history.sql` | Migration nâng cấp schema: bổ sung cột `is_active`, `version`, `effective_from`, bảng `pt_commission_config_history`, trigger `trg_create_branch_default_commission`, dedupe survivor remapping, partial unique indexes |
| 2 | `backend/src/db/migrate.js` | Đăng ký migration 007 vào trình chạy migration tự động |
| 3 | `backend/src/modules/core/auth.js` | Bổ sung quyền `commission_config` vào JWT và permission profile của QTV |
| 4 | `backend/src/modules/core/commissions.js` | Triển khai RBAC `checkCommissionConfigAccess`, các API `GET /commissions/configs`, `POST /commissions/configs`, `POST /commissions/configs/:id/remove-override`, `GET /commissions/configs/:id/history`, hàm `getPtCommissionRate` |
| 5 | `backend/tests/commission-configs.cases.js` | Bộ integration test 9 kịch bản chuyên sâu kiểm chứng Uniqueness, Zero Hard Delete, Survivor Dedupe, Rate Resolution và RBAC |
| 6 | `backend/tests/web-rebuild.integration.js` | Tích hợp bộ test commissions và migration 007 vào test suite chính |
| 7 | `frontend/web/js/modules/commissions.js` | Tái cấu trúc Tab Cấu hình tỷ lệ hoa hồng, modal cấu hình, modal lịch sử và xử lý soft remove / reactivate |
| 8 | `frontend/web/index.html` | Cập nhật cache buster `commissions.js?v=6` |
| 9 | `docs/database/erd.md` | Đồng bộ 100% ERD Mermaid, mô tả cấu trúc bảng `pt_commission_configs` và `pt_commission_config_history` |
| 10 | `docs/user-stories/qtv/QTV-W15-Quản lý hoa hồng PT/QTV-W15-US01-Cấu hình tỷ lệ hoa hồng PT.md` | Cập nhật User Story chuẩn hóa field spec, alternate flows và UML Activity Diagram (1 IN + 1 OUT) |
| 11 | `docs/user-stories/qtv/QTV-W15-Quản lý hoa hồng PT/QTV-W15-US02-Tính và duyệt bảng kê hoa hồng PT theo tháng.md` | Cập nhật User Story bổ sung 2 thẻ KPI dynamic, field spec và UML Activity Diagram (1 IN + 1 OUT) |
| 12 | `docs/epic/qtv/QTV-W15-Quản lý hoa hồng PT.md` | Đồng bộ Epic QTV-W15 |

---

## 3. Kết Quả Kiểm Thử (Verification)

```bash
$ npm test
> paradise-gym-backend@1.0.0 test
> node tests/web-rebuild.integration.js

PASS real bcrypt, token types, development-only OTP, resend and single use
PASS scoped members/packages/registrations, price snapshots, full payments and one receipt
PASS cross-branch minimal gate lookup, duplicate prevention, daily deduction, expired OUT and history
PASS owned-member CASH/BANK settlement and direct-payment rejection with SQL no-side-effect assertions; staff collection and member receipt read retained
PASS configured-only notifications: no rule/OFF/inactive template suppress even caller text; active template/roles/modes/branch isolation/dedup and W09 toggles authoritative
PASS PT reservation/cancellation, double confirmation, staff reconciliation and renewal
PASS W12 configured status persistence/audit, validation, reenable, telemetry separation and dashboard truthfulness
PASS notification configuration/delivery, consent persistence, honest devices, reports and account revocation
PASS Mobile role-scoped settings/2FA, PT-code auth, phone privacy, cross-home-branch students and actual statistics
PASS Mobile avatar binary upload/persistence, target-bound OTP phone change, uniqueness, stale-token rejection and server password lockout
PASS server OTP initial+3 resend cap, cooldown, expired challenge and no accidental activation
PASS 4h cancellation/explicit late-fee acknowledgement and exact-once participant-owned result confirmation
PASS DOB birthday: no rule/OFF/inactive template/opt-out suppress, daily dedup; HV1-2h vs PT15-30min reminders and user preferences
PASS explicit bank configuration/no invented beneficiary, rollback and idempotent approved migration
PASS Device registry: GET /auth/sessions, DELETE session, logout-current, logout-all
PASS Member self-registration with branch selection, OTP validation and login (HV06-US03)
PASS Group PT (1-N) member management, active gym requirement, and max_group_members constraint enforcement
PASS W15 PT Commission: Branch Default Guarantee, Survivor Dedupe, Zero Hard Delete, Version History, Rate Resolution and RBAC
PASS 419 HTTP checks against isolated PostgreSQL database; configured DB untouched
```

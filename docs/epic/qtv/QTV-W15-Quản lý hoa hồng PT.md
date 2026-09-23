# QTV-W15 — Quản lý hoa hồng PT

- **Role:** QTV / Quản lý
- **Platform:** Web only
- **Menu:** `W15`
- **Goal:** Cung cấp bộ công cụ quản lý cấu hình tỷ lệ hoa hồng cho Huấn luyện viên PT và tự động tính toán bảng kê hoa hồng hàng tháng dựa trên % giá trị phần gói PT và số buổi PT thực dạy trong tháng, phục vụ chi trả thù lao minh bạch và quyết toán thu chi phòng gym.
- **Scope:**
  1. **Thiết lập cấu hình hoa hồng PT:** 
     - Cơ chế định danh duy nhất (Uniqueness Identity): Mỗi chi nhánh luôn có đúng 1 cấu hình mặc định áp dụng cho Toàn bộ PT (`pt_id IS NULL`, khởi tạo tự động 20.00% qua database trigger `trg_create_branch_default_commission`), và mỗi PT chỉ có tối đa 1 cấu hình riêng trong chi nhánh (`pt_id IS NOT NULL`).
     - Thứ bậc ưu tiên: PT-specific override (`is_active = true`) $\rightarrow$ nếu không có thì fallback về Branch Default $\rightarrow$ ném lỗi hệ thống nếu thiếu Branch Default (tuyệt đối không dùng fallback ngầm 20% trong code).
     - Nguyên tắc không xóa vật lý (Zero Hard Delete): Thao tác gỡ bỏ cấu hình riêng (`REMOVE_OVERRIDE`) không xóa bản ghi mà đặt `is_active = false`, tăng `version = version + 1`, cập nhật `effective_from = NOW()` và ghi snapshot lịch sử. HLV đó tự động fallback về Branch Default.
     - Bảo toàn lịch sử phiên bản (Version History 100%): Mọi thay đổi tỷ lệ đều được lưu vào `pt_commission_config_history` với khoảng thời gian nửa mở `[effective_from, effective_to)`, có ràng buộc `ON DELETE RESTRICT` để bảo vệ dữ liệu tài chính.
     - Phân quyền nghiêm ngặt (Strict RBAC): Chỉ tài khoản vai trò `QTV` có cờ `commission_config = true` và trong phạm vi `branch_scope` mới được cấu hình.
  2. **Bảng tính hoa hồng PT hàng tháng:** Hệ thống tự động tổng hợp số buổi tập PT đã hoàn thành (`COMPLETED`) của từng PT trong tháng, tính doanh thu phần PT tương ứng và đối chiếu tỷ lệ % hoa hồng theo thời điểm hoàn thành buổi tập (`completed_at`) để ra số tiền thực nhận.
  3. **Quyết toán và xuất phiếu chi hoa hồng:** Duyệt bảng kê hoa hồng, đánh dấu trạng thái đã chi trả (`PAID`) và xuất phiếu thanh toán hoa hồng.

---

## Thành phần giao diện (UI Components & Layout)

### 1. Tab 1 — Bảng kê thu nhập tháng
- Bộ chọn Tháng/Năm (`Tháng MM/YYYY`), bộ lọc chi nhánh.
- Bộ 4 thẻ KPI tổng quan: Tổng số buổi dạy, Tổng doanh số dạy PT, Tổng tiền hoa hồng tháng, Tiến độ chi trả (hỗ trợ dynamic theo HLV khi click chọn dòng).
- Bảng danh sách HLV: Mã PT, Họ tên & SĐT, Chi nhánh, Dạy kèm PT (số buổi, doanh số quy đổi), Hoa hồng PT (tiền, tỷ lệ %), Lớp cộng đồng (số lớp, số học viên), Thù lao lớp CĐ, Tổng thu nhập tháng, Trạng thái (`Chờ chi trả`, `Chờ PT xác nhận`, `Đã chi trả`).
- Nút thao tác: `[ Chi tiết ]`, `[ Chi trả ]` (mở Modal Xác Nhận Chi Trả Hoa Hồng 2 bên trên App kèm VietQRNapAS247).

### 2. Tab 2 — Doanh thu gói PT/COMBO
- Bộ lọc: Tháng (1-12), Năm (2025-2030), Dropdown chọn Huấn luyện viên (`Tất cả huấn luyện viên` hoặc từng HLV cụ thể).
- Nút thao tác: `[ Tải lại ]`, `[ Xuất CSV ]` (hỗ trợ xuất file chi tiết các buổi dạy theo HLV trong kỳ).
- Bộ 4 thẻ KPI động:
  1. Tổng số buổi dạy: Tổng số ca dạy hoàn thành trong kỳ của HLV được chọn (hoặc tất cả HLV).
  2. Doanh số dịch vụ PT: Tổng giá trị quy đổi từ các gói PT đã phục vụ.
  3. Hoa hồng PT: Tổng tiền hoa hồng HLV nhận được từ các buổi dạy kèm.
  4. Gói tập phục vụ: Số lượng gói tập & học viên khác nhau mà HLV đã huấn luyện trong kỳ.
- Bảng dữ liệu (DataGrid) chi tiết buổi dạy:
  - Cột: Ngày tập, Khung giờ, HLV, Chi nhánh, Học viên, Gói tập, Buổi số, Doanh số buổi quy đổi, Tỷ lệ hoa hồng (%), Hoa hồng buổi, Trạng thái (`Đã hoàn thành`).
  - Dòng tổng kết (Summary footer): Tổng số buổi dạy, Tổng doanh số quy đổi, Tổng tiền hoa hồng.

### 3. Tab 3 — Thù lao lớp cộng đồng
- Bộ lọc Tháng/Năm, Chi nhánh, Huấn luyện viên.
- Bộ 6 thẻ KPI: Tổng số buổi lớp CĐ, Tổng thù lao lớp CĐ, Tổng thù lao cơ bản, Tổng thưởng, Tổng lượt học viên, Thù lao bình quân / buổi.
- DataGrid ca dạy cộng đồng: Ngày & Giờ, Lớp học & Bộ môn, Huấn luyện viên, Chi nhánh, Sĩ số, Thù lao cơ bản, Thưởng sĩ số, Tổng thù lao, nút `[ Học viên ]`.

### 4. Tab 4 — Lịch sử chi trả
- Bảng lịch sử các đợt phát lệnh chi trả thù lao/hoa hồng: Kỳ tháng, Huấn luyện viên, Số buổi, Doanh số, Tỷ lệ %, Tiền hoa hồng, Hình thức chi trả (VietQR / Tiền mặt), Mã giao dịch / Phiếu chi, Thời gian phát lệnh, PT xác nhận, Trạng thái.
- Nút `[ Xuất lịch sử ]`.

### 5. Tab 5 — Cấu hình tỷ lệ hoa hồng
- Bảng danh sách cấu hình hoa hồng theo chi nhánh / PT đã deduplicate:
  - Cột: Mã PT, Tên PT / Phạm vi áp dụng, Chi nhánh, Tỷ lệ hoa hồng (%), Trạng thái (`Đang áp dụng` / `Đã gỡ (Dùng mặc định)`), Phiên bản (`v1`, `v2`,...), Hiệu lực từ, Ghi chú / Quyết định, Thao tác (`[ Sửa ]`, `[ Lịch sử ]`, `[ Bỏ riêng ]`, `[ Kích hoạt ]`).
- Thanh công cụ: Nút `[+ Thêm cấu hình riêng cho PT]`.
- Modal thiết lập cấu hình hoa hồng PT: Chi nhánh áp dụng, Phạm vi áp dụng (`Tất cả PT trong chi nhánh (Mặc định)` hoặc `PT cụ thể`), Huấn luyện viên PT, Tỷ lệ hoa hồng (%), Hiệu lực, Ghi chú / Quyết định ban hành.
- Modal lịch sử biến động tỷ lệ hoa hồng: DataGrid hiển thị toàn bộ snapshot phiên bản trong quá khứ trích xuất từ `pt_commission_config_history`.

---

## User Stories trong Epic

| User Story | Loại giao diện | Khối UI tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [QTV-W15-US01 — Cấu hình tỷ lệ hoa hồng PT](../../user-stories/qtv/QTV-W15-Quản%20lý%20hoa%20hồng%20PT/QTV-W15-US01-Cấu%20hình%20tỷ%20lệ%20hoa%20hồng%20PT.md) | Form / Modal / DataGrid | Cấu hình hoa hồng | Thiết lập tỷ lệ % hoa hồng mặc định chi nhánh và tỷ lệ riêng cho từng PT theo mô hình Uniqueness, Zero Hard Delete và Version History |
| [QTV-W15-US02 — Tính và duyệt bảng kê hoa hồng PT theo tháng](../../user-stories/qtv/QTV-W15-Quản%20lý%20hoa%20hồng%20PT/QTV-W15-US02-Tính%20và%20duyệt%20bảng%20kê%20hoa%20hồng%20PT%20theo%20tháng.md) | Bảng dữ liệu | Bảng kê hoa hồng tháng | Tra cứu, tính toán tự động và duyệt thanh toán hoa hồng theo số buổi thực dạy |

---

## Traceability
- Product Spec: [`docs/product-spec.md`](../../product-spec.md) (Mục 4.3)
- Phản hồi sếp Cường: Trang 1 file `ghi chú a Cường (1).pdf`.

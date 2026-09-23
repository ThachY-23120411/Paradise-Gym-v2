# Báo Cáo Triển Khai & Bàn Giao: Quy Trình Xác Nhận Chi Trả Hoa Hồng PT 2 Chiều Trên App (Chống Chối Nhận Tiền)

**Thời gian thực hiện:** 21/09/2026  
**Chuyên trách phát triển:** `anti-3-PT (Mobile PT Lead)` phối hợp `anti-1-QTV-LT` và `anti-4-Core-BE-DB`  
**User Story liên đới:**  
- `docs/user-stories/qtv/QTV-W15-Quản lý hoa hồng PT/QTV-W15-US02-Tính và duyệt bảng kê hoa hồng PT theo tháng.md`  
- `docs/user-stories/pt/PT06-Tổng quan/PT06-US02-Xem bảng kê hoa hồng tháng.md`  
**Kiến trúc CSDL & ERD:** `docs/database/erd.md` (Migration `018_pt_commission_two_way_confirmation.sql`)

---

## 1. Mục Tiêu & Bối Cảnh Nghiệp Vụ

Nhằm loại bỏ hoàn toàn rủi ro tranh chấp tài chính ("chống chối nhận tiền" sau khi nhận tiền mặt hoặc chuyển khoản) và cắt giảm thủ tục lưu trữ chứng từ giấy phức tạp, hệ thống chuyển đổi sang quy trình xác nhận 2 bên trực tiếp trên ứng dụng:

1. **Bước 1 (Lễ tân / Quản trị viên trên Web Admin):**
   - Mở màn hình quản lý hoa hồng tháng W15, kiểm tra đối soát số liệu buổi dạy và doanh số quy đổi.
   - Bấm nút **[Chi trả]** $\rightarrow$ Modal chi trả hiển thị thông tin thụ hưởng (VietQR hoặc tiền mặt).
   - Bỏ hoàn toàn hai trường chứng từ giấy: **"Số phiếu chi"** (khi chi tiền mặt) và **"Mã giao dịch ngân hàng"** (khi chuyển khoản).
   - Bấm nút **"Xác nhận đã chi trả"** $\rightarrow$ Bản kê hoa hồng đóng băng snapshot lịch sử (`details_snapshot`), chuyển trạng thái sang `PENDING_CONFIRMATION` (*"Chờ PT xác nhận"*), và tự động phát thông báo in-app `COMMISSION_PAYOUT_INITIATED` đến thiết bị của Huấn luyện viên.

2. **Bước 2 (Huấn luyện viên trên Mobile PT App):**
   - HLV mở ứng dụng Mobile PT (hoặc chạm vào thông báo in-app để điều hướng trực tiếp vào tab Hoa hồng).
   - Ứng dụng hiển thị khối thông báo nổi bật `#commConfirmationBox`: nêu rõ số tiền chi trả, hình thức chi trả (Tiền mặt / Chuyển khoản VietQR) kèm hướng dẫn đối soát.
   - HLV kiểm tra tài khoản / tiền mặt và bấm nút **"Xác nhận đã nhận tiền"**.

3. **Bước 3 (Lưu vết pháp lý bất biến trên Database):**
   - Hệ thống chuyển trạng thái sang `PAID` (*"Đã chi trả"*), ghi nhận tức thì mốc thời gian pháp lý `pt_confirmed_at = NOW()`.
   - Trigger bảo vệ database khóa vĩnh viễn không cho phép thay đổi dữ liệu hoa hồng và thời gian xác nhận.
   - Web Admin và Mobile PT hiển thị mốc thời gian xác nhận rõ ràng: *"PT xác nhận nhận tiền: DD/MM/YYYY HH:mm"*.

---

## 2. Chi Tiết Thay Đổi Kỹ Thuật

### 2.1. Cơ Sở Dữ Liệu PostgreSQL & ERD (Rule 6)
- **Migration SQL (`backend/src/db/migrations/018_pt_commission_two_way_confirmation.sql`):**
  * Thêm cột `pt_confirmed_at TIMESTAMPTZ NULL` vào bảng `pt_commissions`.
  * Cập nhật ràng buộc `pt_commissions_status_check`: cho phép trạng thái `('PENDING', 'APPROVED', 'PENDING_CONFIRMATION', 'PAID')`.
  * Cập nhật ràng buộc `ck_pt_commissions_details_snapshot`: cho phép đóng băng `details_snapshot` ngay khi ở trạng thái `PENDING_CONFIRMATION` hoặc `PAID`.
  * Nâng cấp function & trigger `guard_pt_commission_snapshot()`: ngăn chặn sửa đổi `pt_confirmed_at` sau khi đã `PAID`.
- **Tài liệu ERD (`docs/database/erd.md`):**
  * Bổ sung mục `PT Commission Two-Way App Confirmation (Migration 018, 2026-09-21)`.
  * Cập nhật sơ đồ Mermaid ERD và từ điển dữ liệu bảng `pt_commissions`.

### 2.2. Backend Core REST APIs
- **`backend/src/modules/core/commissions.js`:**
  * `calculateCommissions`: bảo vệ các bản ghi có trạng thái `PENDING_CONFIRMATION` hoặc `PAID` không bị ghi đè hoặc tính toán lại.
  * `listMonthlyCommissions` & `GET /commissions/payout-history`: cho phép quyền `QTV` và `RECEPTIONIST` truy cập điều hành.
  * `GET /commissions/:id/details`: cho phép quyền `QTV`, `RECEPTIONIST`, và `PT` (đối với chính PT sở hữu bản ghi). Trả về dữ liệu từ `details_snapshot` khi bản kê ở trạng thái `PENDING_CONFIRMATION` hoặc `PAID`.
  * `PUT /commissions/:id/status`: chấp nhận trạng thái `PENDING_CONFIRMATION`, đóng băng `details_snapshot`, phát thông báo in-app `COMMISSION_PAYOUT_INITIATED` cho HLV, không bắt buộc trường `payout_ref`.
  * `POST /pt/my-commissions/:id/confirm-receipt`: endpoint dành riêng cho HLV (`role: 'PT'`), kiểm tra quyền sở hữu, chuyển trạng thái từ `PENDING_CONFIRMATION` $\rightarrow$ `PAID`, gán `pt_confirmed_at = NOW()`, phát thông báo `COMMISSION_PT_CONFIRMED` đến nhân sự quản lý, ghi log kiểm toán.
  * `GET /pt/my-commissions`: trả về `pt_confirmed_at` và `payout_method` trong summary.
- **`frontend/shared/apiClient.js`:**
  * Bổ sung hàm SDK: `confirmCommissionReceipt(id)`.

### 2.3. Frontend Web Admin & Lễ Tân (`frontend/web/js/modules/commissions.js`)
- **Modal Chi trả (`openPayoutModal`):**
  * Bỏ hoàn toàn trường **"Số phiếu chi"** khi chọn hình thức tiền mặt.
  * Bỏ hoàn toàn trường **"Mã giao dịch ngân hàng"** khi chọn hình thức chuyển khoản ngân hàng VietQR.
  * Đổi tên nút hành động chính thành **"Xác nhận đã chi trả"** (`type: 'default'`, icon `check`).
  * Khi bấm phát lệnh: gửi `status: 'PENDING_CONFIRMATION'`, hiển thị toast thông báo: *"Đã phát lệnh chi trả ... Đang chờ HLV ... xác nhận trên App!"*.
- **Lưới dữ liệu bảng kê (`commissionsGrid`):**
  * Hiển thị trạng thái `PENDING_CONFIRMATION` với badge xanh dương *"Chờ PT xác nhận"*.
  * Cột thao tác hiển thị tag nhãn *"Chờ PT duyệt"*.
- **Popup Chi tiết (`openCommissionDetails`):**
  * Hiển thị thông tin pháp lý: *"Thời gian phát lệnh"*, *"Hình thức"*, và mốc thời gian *"PT xác nhận nhận tiền: DD/MM/YYYY HH:mm"*.

### 2.4. Frontend Mobile PT App (`frontend/mobile/pt/`)
- **Giao diện (`index.html`):**
  * Bổ sung khối xác nhận chi trả `#commConfirmationBox` với nền xanh lam nổi bật `#e0f2fe`, hiển thị số tiền, hình thức thanh toán và nút `#btnPtConfirmCommission` ("Xác nhận đã nhận tiền").
  * Bổ sung khối thời gian xác nhận `#commPaidDateWrap`.
- **Logic tương tác (`overview.js`):**
  * Cập nhật bảng ánh xạ trạng thái: `PENDING_CONFIRMATION: { label: 'Chờ bạn xác nhận' }`.
  * Khi bản kê ở trạng thái `PENDING_CONFIRMATION`: tự động kích hoạt `#commConfirmationBox`.
  * Xử lý sự kiện click `#btnPtConfirmCommission`: gọi `apiClient.pt.confirmCommissionReceipt`, hiển thị toast xác nhận, ẩn box, chuyển badge sang *"Đã chi trả"*, hiển thị mốc thời gian xác nhận pháp lý.
- **Điều hướng thông báo (`notifications.js`):**
  * Ánh xạ thông báo `COMMISSION_PAYOUT_INITIATED` sang tab `PT06_COMMISSIONS`, cho phép chạm vào thông báo để mở trực tiếp màn hình đối soát hoa hồng.

---

## 3. Bằng Chứng Kiểm Thử End-to-End (E2E Test Artifacts)

Toàn bộ luồng xác nhận 2 chiều đã được kiểm chứng tự động qua script E2E `tests/scratch/verify_two_way_commission.cjs` với 100% các bước pass trên cơ sở dữ liệu PostgreSQL thực tế:

| Bước | Mô tả kiểm thử | Trạng thái | File ảnh bằng chứng (Artifact) |
| :---: | :--- | :---: | :--- |
| **1 & 2** | Web Admin mở modal Chi trả: xác nhận **ĐÃ BỎ** trường "Số phiếu chi" và "Mã giao dịch ngân hàng", nút lưu là **"Xác nhận đã chi trả"** | ✅ PASS | `verify_two_way_payout_modal.png` |
| **3** | Web Admin phát lệnh: DB chuyển sang `PENDING_CONFIRMATION`, Web hiển thị badge **"Chờ PT xác nhận"** | ✅ PASS | `verify_web_admin_pending_confirmation.png` |
| **4** | Mobile PT mở tab Hoa hồng: hiển thị hộp thoại chi trả và nút **"Xác nhận đã nhận tiền"** | ✅ PASS | `verify_mobile_pt_waiting_confirmation.png` |
| **5** | PT bấm xác nhận: DB chuyển sang `PAID`, lưu vết `pt_confirmed_at`, App chuyển sang **"Đã chi trả"** | ✅ PASS | `verify_mobile_pt_confirmed_paid.png` |
| **6** | Web Admin đối soát lại: lưới hiển thị **"Đã chi trả"**, popup chi tiết lưu vết pháp lý thời gian PT xác nhận | ✅ PASS | `verify_web_admin_details_legal_audit.png` |

---

## 4. Kết Luận & Bàn Giao

- Tính năng Xác nhận Chi trả Hoa hồng PT 2 chiều trên App đã hoàn tất triển khai đồng bộ giữa Backend, Web Admin và Mobile PT.
- Toàn bộ tài liệu đặc tả User Story (`QTV-W15-US02`, `PT06-US02`), Activity Diagram chuẩn UML Swimlane (tuân thủ nghiêm ngặt arity), và CSDL ERD (`docs/database/erd.md`) đã được đồng bộ 100%.
- Không phát sinh mock data hardcoded trên frontend; dữ liệu vận hành hoàn toàn động dựa trên PostgreSQL database.

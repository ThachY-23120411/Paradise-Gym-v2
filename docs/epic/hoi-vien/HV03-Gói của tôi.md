# HV03 — Gói của tôi

- **Role:** Hội viên
- **Platform:** Mobile only
- **Menu:** `HV03 · Gói của tôi`
- **Goal:** Cung cấp không gian tự phục vụ để Hội viên quản lý toàn diện các gói tập cá nhân (Gym, PT, Combo), theo dõi tiến độ và số buổi tập, chủ động chọn HLV cá nhân (PT), khám phá danh mục gói đang mở bán để mua mới/gia hạn thanh toán qua VietQR, theo dõi trạng thái yêu cầu phân công PT và tra cứu lịch sử thanh toán 100%.
- **Scope:** 
  - Xem danh sách gói tập cá nhân, lọc trạng thái, theo dõi tiến độ số buổi/ngày sử dụng.
  - Khám phá danh mục gói đang mở bán và xem chi tiết quyền lợi gói.
  - Khởi tạo mua gói và thanh toán 100% qua mã VietQR chuyển khoản ngân hàng.
  - Chọn PT phụ trách cho gói PT/Combo đủ điều kiện và gửi yêu cầu phân công PT.
  - Theo dõi danh sách và trạng thái các yêu cầu phân công PT (`PENDING`, `ACCEPTED`, `REJECTED`).
  - Xem lịch sử các giao dịch thanh toán (phiếu thu 100%).

## Thành phần giao diện (UI Components & Layout)

Không gian nghiệp vụ bên trong Menu **`HV03 · Gói của tôi`** (nằm giữa Header và Bottom Navigation Bar chung của ứng dụng) được phân chia thành **3 sub-tab chính** thông qua bộ chuyển tab nội bộ (Segmented Control / Top Tab Bar) cùng các màn hình thao tác luồng liên quan:

1. **Sub-tab `Gói của tôi`:**
   - Vai trò: Màn hình mặc định khi vào menu `HV03`, hiển thị danh sách các gói tập hội viên đang sở hữu kèm tiến độ sử dụng, số buổi còn lại, nút Lịch sử thanh toán và nút chọn PT cho các gói chưa gán HLV.
   - Chi tiết đặc tả UI toàn diện (Chip lọc trạng thái, Card gói tập, Thanh tiến độ progress bar, Nút chọn PT, Nút lịch sử thanh toán): Xem tại [HV03-US01](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US01-Xem gói, quyền lợi và tiến độ sử dụng.md).

2. **Sub-tab `Mua gói`:**
   - Vai trò: Không gian hiển thị danh mục các gói tập Gym, PT và Combo đang mở bán (`Active`) của trung tâm để hội viên tham khảo và mua thêm.
   - Chi tiết đặc tả UI toàn diện (Bộ lọc loại gói, Card gói đang bán, Màn hình chi tiết quyền lợi gói): Xem tại [HV03-US02](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US02-Xem chi tiết và quyền lợi gói đang bán.md).
   - Luồng mua gói và thanh toán VietQR: Xem tại [HV03-US03](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US03-Mua gói và khởi tạo thanh toán Mobile.md).

3. **Sub-tab `Yêu cầu PT`:**
   - Vai trò: Không gian theo dõi tiến trình gửi và phản hồi các yêu cầu phân công HLV cá nhân (`PT_ASSIGNMENT_REQUEST`) cho từng gói tập.
   - Chi tiết đặc tả UI toàn diện (Danh sách yêu cầu, Badge trạng thái `Đang chờ phản hồi`/`Đã chấp nhận`/`Đã từ chối`, Nút chọn lại PT khi bị từ chối): Xem tại [HV03-US05](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US05-Theo dõi yêu cầu phân công PT.md).

---

## Danh sách User Stories và Giao diện tương ứng trong Epic

| User Story | Phân loại giao diện | Thành phần giao diện tương ứng | Phạm vi đặc tả UI |
| :--- | :--- | :--- | :--- |
| [HV03-US01 — Xem gói, quyền lợi và tiến độ sử dụng](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US01-Xem gói, quyền lợi và tiến độ sử dụng.md) | Màn hình Sub-tab | **Sub-tab `Gói của tôi`** | Bảng Field-level spec toàn diện cho tab: Chip lọc trạng thái gói (Trigger), Thẻ gói tập cá nhân (Progress bar, badge, thông tin PT), Nút CTA `[ Chọn PT phụ trách ]`, Nút xem `[ Lịch sử thanh toán ]` |
| [HV03-US02 — Xem chi tiết và quyền lợi gói đang bán](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US02-Xem chi tiết và quyền lợi gói đang bán.md) | Màn hình Sub-tab & Màn hình Chi tiết | **Sub-tab `Mua gói` & Màn hình `Chi tiết gói`** | Bảng Field-level spec toàn diện cho danh mục gói bán & Màn hình chi tiết gói: Chip lọc loại gói, Thẻ gói bán, Thông tin chi tiết giá 100%, thời hạn/số buổi, phạm vi chi nhánh và Nút CTA `[ Mua gói ]` |
| [HV03-US03 — Mua gói và khởi tạo thanh toán Mobile](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US03-Mua gói và khởi tạo thanh toán Mobile.md) | Màn hình Giao dịch | **Màn hình `Thanh toán VietQR`** | Bảng Field-level spec màn hình thanh toán: Tên gói, Số tiền 100%, Phương thức VietQR, Mã QR chuyển khoản, Thông tin tài khoản thụ hưởng, Nội dung chuyển khoản |
| [HV03-US04 — Chọn PT và gửi yêu cầu phân công](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US04-Chọn PT và gửi yêu cầu phân công.md) | Màn hình chọn PT & Popup xác nhận | **Màn hình `Chọn PT phụ trách` & Popup Xác nhận** | Bảng Field-level spec Màn hình chọn PT (Thông tin gói, Thẻ HLV kèm nút [ Gửi yêu cầu ] trực tiếp trên card) và Popup Xác nhận Chọn PT |
| [HV03-US05 — Theo dõi yêu cầu phân công PT](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US05-Theo dõi yêu cầu phân công PT.md) | Màn hình Sub-tab | **Sub-tab `Yêu cầu PT`** | Bảng Field-level spec toàn diện cho tab: Thẻ yêu cầu phân công PT (Tên gói, Tên PT, Thời điểm gửi, Badge trạng thái `PENDING`/`ACCEPTED`/`REJECTED`), Nút CTA `[ Chọn PT khác ]` (khi bị từ chối) |
| [HV03-US06 — Xem lịch sử thanh toán](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US06-Xem lịch sử thanh toán.md) | Màn hình Danh sách | **Màn hình `Lịch sử thanh toán`** | Bảng Field-level spec màn hình lịch sử: Thẻ giao dịch thanh toán (Mã phiếu thu, Tên gói, Ngày giờ, Phương thức VietQR, Số tiền 100%, Badge trạng thái Đã thanh toán) |

---

## Flow specification

Mỗi User Story của `HV03` chứa precondition, trigger, main/alternate/exception flow, field-level specification chuẩn và activity diagram Mermaid swimlane.
Flow index role: [`docs/system-flow-specs/hoi-vien/`](../../system-flow-specs/hoi-vien/README.md).

## Traceability

- Menu catalog: [`docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

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

## Thanh toán, đơn chờ và bảo lưu
- Mua mới tạo đăng ký chờ và yêu cầu QR trong payment_intents; QR hết hạn sau 15 phút, không tự hủy đăng ký sau 3 ngày. HV03-US01/US03 giữ Tiếp tục thanh toán và Hủy đăng ký có xác nhận bất kỳ lúc nào còn chờ.
- Mô phỏng chuyển khoản được duyệt để kiểm thử; không cần IPN hiện tại. Tiền chuyển khoản thực tế được QTV/Lễ tân đối soát BANK_TRANSFER với transaction_ref bắt buộc, không chuyển thành CASH.
- Chỉ khi thu đủ mới có payment không status và đúng một phiếu thu. Lịch sử của hội viên gồm cả thu tiền mặt tại quầy và chuyển khoản; không chứa QR chờ/hết hạn. Kỳ gốc đã hết khi thanh toán: PAY-OQ-01 còn mở, không tự dời ngày.
- Sắp hết hạn: <= 4 ngày hoặc <= 3 buổi, Combo OR, dùng is_expiring/display_status API; status ACTIVE giữ nguyên.
- Đóng băng chỉ khi đã trả đủ, hiện đang hiệu lực ACTIVE/Sắp hết hạn và đủ điều kiện bảo lưu. Không cho gói chưa thanh toán hoặc chưa đến ngày hiệu lực SCHEDULED, áp dụng cả staff/Hội viên.

## Thành phần giao diện (UI Components & Layout)

Không gian nghiệp vụ bên trong Menu **`HV03 · Gói của tôi`** (nằm giữa Header và Bottom Navigation Bar chung của ứng dụng) được phân chia thành **3 sub-tab chính** thông qua bộ chuyển tab nội bộ (Segmented Control / Top Tab Bar) cùng các màn hình thao tác luồng liên quan:

1. **Sub-tab `Gói của tôi`:**
   - Vai trò: Màn hình mặc định khi vào menu `HV03`, hiển thị danh sách các gói tập hội viên đang sở hữu kèm tiến độ sử dụng, số buổi còn lại, số lượng thành viên nhóm (đối với gói PT nhóm), nút Chi tiết gói (mở popup thông tin chi tiết, tiến độ, thành viên nhóm và gia hạn) và nút Lịch sử thanh toán.
   - Chi tiết đặc tả UI toàn diện (Chip lọc trạng thái, Card gói tập, Sĩ số thành viên nhóm, Nút Chi tiết gói, Modal Chi tiết gói & Gia hạn, Thanh tiến độ progress bar, Nút lịch sử thanh toán): Xem tại [HV03-US01](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US01-Xem gói, quyền lợi và tiến độ sử dụng.md).

2. **Sub-tab `Mua gói`:**
   - Vai trò: Không gian hiển thị danh mục các gói tập Gym, PT và Combo đang mở bán (`Active`) của trung tâm để hội viên tham khảo và mua thêm.
   - Chi tiết đặc tả UI toàn diện (Bộ lọc loại gói, Card gói đang bán, Màn hình chi tiết quyền lợi gói): Xem tại [HV03-US02](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US02-Xem chi tiết và quyền lợi gói đang bán.md).
   - Luồng mua gói và thanh toán VietQR: Xem tại [HV03-US03](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US03-Mua gói và khởi tạo thanh toán Mobile.md).

3. **Sub-tab `Lời mời vào Gói`:**
   - Vai trò: Không gian quản lý lời mời tham gia gói PT 1-Nhiều (`GROUP_1_N`), gồm 2 tab chuyển đổi: `Lời mời tôi nhận` (danh sách lời mời do người khác gửi tới hội viên) và `Lời mời tôi gửi` (danh sách lời mời do chính hội viên gửi đi với tư cách Trưởng nhóm). Tích hợp bộ lọc Filter Chips theo từng tab, thao tác Chấp thuận (kiểm tra điều kiện gói Gym) & Từ chối lời mời (phía người nhận), và Thu hồi lời mời đang chờ phản hồi (phía người gửi).
   - Chi tiết đặc tả UI toàn diện: Xem tại [HV03-US05](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US05-Theo dõi yêu cầu phân công PT.md).

---

## Danh sách User Stories và Giao diện tương ứng trong Epic

| User Story | Phân loại giao diện | Thành phần giao diện tương ứng | Phạm vi đặc tả UI |
| :--- | :--- | :--- | :--- |
| [HV03-US01 — Xem gói, quyền lợi và tiến độ sử dụng](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US01-Xem gói, quyền lợi và tiến độ sử dụng.md) | Màn hình Sub-tab & Modal | **Sub-tab `Gói của tôi` & Modal `Chi tiết gói`** | Bảng Field-level spec thẻ gói: Thông tin gói Gym/PT/Combo, số lượng thành viên nhóm (gói PT nhóm), nút Chi tiết gói, modal chi tiết (tiến độ, danh sách thành viên nhóm, nút Gia hạn), tiến độ sử dụng, badge trạng thái |
| [HV03-US02 — Xem chi tiết và quyền lợi gói đang bán](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US02-Xem chi tiết và quyền lợi gói đang bán.md) | Màn hình Sub-tab & Màn hình Chi tiết | **Sub-tab `Mua gói` & Màn hình `Chi tiết gói`** | Bảng Field-level spec danh mục gói bán: Gói Gym, Gói PT (chỉ mua khi đã có gói Gym), Gói Combo tách 3 giá Gym/PT/Combo |
| [HV03-US03 — Mua gói và khởi tạo thanh toán Mobile](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US03-Mua gói và khởi tạo thanh toán Mobile.md) | Màn hình Giao dịch | **Màn hình `Thanh toán VietQR`** | Kiểm tra điều kiện có gói Gym trước khi thanh toán gói PT; tạo VietQR 100% |
| [HV03-US04 — Liên hệ Lễ tân chọn PT phụ trách qua Popup](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US04-Chọn PT và gửi yêu cầu phân công.md) | Modal / Popup | **Popup `Liên hệ Lễ tân Chi nhánh`** | Bảng Field-level spec popup liên hệ: Tên gói, cơ sở tập luyện, SĐT lễ tân chi nhánh, nút gọi điện thoại trực tiếp |
| [HV03-US05 — Quản lý lời mời tham gia gói PT 1-Nhiều (Lời mời tôi nhận & Lời mời tôi gửi)](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US05-Theo dõi yêu cầu phân công PT.md) | Màn hình Sub-tab | **Sub-tab `Lời mời vào Gói`** | Phân tách 2 tab: Lời mời tôi nhận (Filter chips, Thẻ lời mời nhận được, Nút Chấp thuận, Nút Từ chối) & Lời mời tôi gửi (Filter chips, Thẻ lời mời đã gửi, Nút Thu hồi lời mời PENDING) |
| [HV03-US06 — Xem lịch sử thanh toán](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US06-Xem lịch sử thanh toán.md) | Màn hình Danh sách | **Màn hình `Lịch sử thanh toán`** | Thẻ giao dịch thanh toán 100% kèm mã phiếu thu điện tử |
| [HV03-US07 — Mời thành viên tham gia gói PT 1-Nhiều](../../user-stories/hoi-vien/HV03-Gói của tôi/HV03-US07-Mời thành viên tham gia gói PT 1-Nhiều.md) | Màn hình Nhóm & Modal | **Quản lý nhóm gói PT 1-Nhiều** | Người đại diện nhập SĐT mời bạn bè vào gói; thành viên chấp nhận nếu có gói Gym còn hạn |

---

## Flow specification

Mỗi User Story của `HV03` chứa precondition, trigger, main/alternate/exception flow, field-level specification chuẩn và activity diagram Mermaid swimlane.
Flow index role: [`docs/system-flow-specs/hoi-vien/`](../../system-flow-specs/hoi-vien/README.md).

## Traceability

- Menu catalog: [`docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

# PT06 — Tổng quan

- **Role:** Huấn luyện viên cá nhân (PT)
- **Platform:** Mobile only
- **Menu:** `PT06` (Footer tab `Tổng quan`)
- **Goal:** Cung cấp cho Huấn luyện viên bức tranh toàn cảnh về khối lượng công việc và hiệu suất giảng dạy thông qua các chỉ số KPI ngay khi mở ứng dụng.
- **Scope:** Xem 5 thẻ chỉ số KPI hiệu suất (Học viên phụ trách, Buổi hoàn thành, Buổi sắp dạy, Buổi chờ xác nhận, Yêu cầu phân công) theo mốc thời gian linh hoạt (Tuần này, Tháng này, Tháng trước). Mọi thao tác xem lịch và xác nhận hoàn thành buổi học được tập trung điều hành tại menu `PT01 · Lịch`.

---

## Thành phần giao diện (UI Components & Layout)

Giao diện `PT06 · Tổng quan` là màn hình khởi đầu của Huấn luyện viên trên ứng dụng di động, bao gồm các khối thành phần nghiệp vụ sau:

### 1. Bộ lọc mốc thời gian (Time Filter Chips / Segmented)
- **Vị trí:** Nằm ở phần trên của màn hình Tổng quan.
- **Tùy chọn:** 3 mốc thời gian nhanh: `Tuần này`, `Tháng này` (mặc định), `Tháng trước`.
- **Tác vụ:** Chạm chọn để tính toán và tự động nạp lại dữ liệu cho toàn bộ 5 thẻ chỉ số KPI bên dưới.

### 2. Cụm 5 Thẻ chỉ số hiệu suất huấn luyện (Performance Metric Cards)
- **Thẻ 1 — Học viên phụ trách:** Tổng số học viên có hợp đồng PT `ACTIVE` đang được phân công cho PT.
- **Thẻ 2 — Buổi đã hoàn thành:** Tổng số buổi tập đã đạt đủ xác nhận 2 chiều (`DONE`) trong kỳ được chọn (căn cứ thực tế đối soát tính thù lao/lương dạy).
- **Thẻ 3 — Buổi đã đặt (Sắp dạy):** Tổng số ca tập ở trạng thái `Đã đặt` (`UPCOMING`) trong tương lai.
- **Thẻ 4 — Buổi chờ xác nhận:** Tổng số ca tập ở trạng thái `Chờ xác nhận hoàn thành` (`AWAITING_CONFIRMATION` — đã có 1 bên xác nhận).
- **Thẻ 5 — Yêu cầu phân công:** Số lượng yêu cầu phân công PT từ hội viên đang chờ xử lý (`PENDING`).

---

## User Stories trong Epic

| User Story | Loại giao diện | Chức năng chính |
| :--- | :--- | :--- |
| [PT06-US01 — Xem tổng quan và thống kê hiệu suất PT](../../user-stories/pt/PT06-Tổng%20quan/PT06-US01-Xem%20t%E1%BB%95ng%20quan%20v%C3%A0%20th%E1%BB%91ng%20k%C3%AA%20hi%E1%BB%87u%20su%E1%BA%A5t%20PT.md) | Màn hình Dashboard (Mobile Screen) | Bộ lọc mốc thời gian và 5 thẻ chỉ số KPI hiệu suất huấn luyện của PT |

---

## Flow specification

Mỗi User Story của `PT06` chứa precondition, trigger, main/alternate/exception flow, logic nghiệp vụ và activity diagram Mermaid swimlane.
Flow index role: [`docs/system-flow-specs/pt/`](../../system-flow-specs/pt/README.md).

## Traceability

- Role Epic index: [`docs/epic/pt/README.md`](README.md).
- System Flow Specs: [`docs/system-flow-specs/pt/README.md`](../../system-flow-specs/pt/README.md).
- Product Spec: [`docs/product-spec.md`](../../product-spec.md).

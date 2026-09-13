# QTV-W08 — Thu tiền & thanh toán

- **Role:** QTV / Quản lý
- **Platform:** Web only
- **Menu:** `W08`
- **Goal:** Quản lý danh sách các giao dịch Payment thành công 100%, khởi tạo Payment để hoàn tất đăng ký chờ thanh toán, và xem thống kê dòng tiền thu thực tế.
- **Scope:** Xem danh sách Payment 100% (không có Payment ở trạng thái Pending); Tạo Payment (cho các Registration đang `PENDING_PAYMENT` để kích hoạt gói `ACTIVE`/`SCHEDULED`); Xem thống kê KPI dòng tiền thực thu (Tiền mặt, Chuyển khoản, lượt thanh toán).

## User Stories trong Epic

- [QTV-W08-US01 — Xem danh sách payment](../../user-stories/qtv/QTV-W08-Thu tiền & thanh toán/QTV-W08-US01-Xem danh sách payment.md)
- [QTV-W08-US02 — Tạo payment](../../user-stories/qtv/QTV-W08-Thu tiền & thanh toán/QTV-W08-US02-Tạo payment.md)
- [QTV-W08-US03 — Xem thống kê](../../user-stories/qtv/QTV-W08-Thu tiền & thanh toán/QTV-W08-US03-Xem thống kê.md)

## Flow specification

Mỗi User Story của `QTV-W08` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/qtv/`](../../system-flow-specs/qtv/README.md).

## Traceability

- Shared capability catalog: [`W08` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

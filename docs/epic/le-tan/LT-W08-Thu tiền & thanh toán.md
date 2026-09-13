# LT-W08 — Thu tiền & thanh toán

- **Role:** Lễ tân
- **Platform:** Web only
- **Menu:** `W08`
- **Goal:** Quản lý danh sách các giao dịch Payment thành công 100% tại quầy chi nhánh, khởi tạo Payment để hoàn tất đăng ký chờ thanh toán, và xem thống kê dòng tiền thu thực tế của chi nhánh.
- **Scope:** Xem danh sách Payment 100% trong chi nhánh (không có Payment ở trạng thái Pending); Tạo Payment (cho các Registration đang `PENDING_PAYMENT` để kích hoạt gói `ACTIVE`/`SCHEDULED`); Xem thống kê KPI dòng tiền thực thu chi nhánh (Tiền mặt, Chuyển khoản).

## User Stories trong Epic

- [LT-W08-US01 — Xem danh sách payment](../../user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US01-Xem danh sách payment.md)
- [LT-W08-US02 — Tạo payment](../../user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US02-Tạo payment.md)
- [LT-W08-US03 — Xem thống kê](../../user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US03-Xem thống kê.md)

## Flow specification

Mỗi User Story của `LT-W08` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/le-tan/`](../../system-flow-specs/le-tan/README.md).

## Traceability

- Shared capability catalog: [`W08` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

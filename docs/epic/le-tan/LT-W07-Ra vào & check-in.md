# LT-W07 — Ra vào & check-in

- **Role:** Lễ tân
- **Platform:** Web only
- **Menu:** `W07`
- **Goal:** Kiểm soát check-in/check-out của hội viên tại quầy chi nhánh, ghi nhận Vào/Ra thủ công và xem nhật ký ra vào cùng trạng thái kết nối thiết bị.
- **Scope:** 
  1. US01: Xử lý check-in tự động qua Camera / Thiết bị (kiểm tra 6 điều kiện hợp lệ).
  2. US02: Ghi nhận Vào/Ra thủ công (Khu vực bên trái: SĐT hội viên ➔ Bắt buộc nhập lý do ➔ CTA `Ghi nhận Vào` / `Ghi nhận Ra`, kiểm tra 6 điều kiện, lưu audit).
  3. US03: Xem nhật ký Ra/Vào thời gian thực và theo dõi trạng thái thiết bị read-only.

## User Stories trong Epic

- [LT-W07-US01 — Xử lý check-in tự động qua thiết bị](../../user-stories/le-tan/LT-W07-Ra vào & check-in/LT-W07-US01-Xử lý check-in tự động qua thiết bị.md)
- [LT-W07-US02 — Ghi nhận Vào/Ra thủ công](../../user-stories/le-tan/LT-W07-Ra vào & check-in/LT-W07-US02-Ghi nhận Vào Ra thủ công.md)
- [LT-W07-US03 — Xem nhật ký Ra/Vào và theo dõi trạng thái thiết bị](../../user-stories/le-tan/LT-W07-Ra vào & check-in/LT-W07-US03-Xem nhật ký Ra Vào và theo dõi trạng thái thiết bị.md)

## Flow specification

Mỗi User Story của `LT-W07` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/le-tan/`](../../system-flow-specs/le-tan/README.md).

## Traceability

- Shared capability catalog: [`W07` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

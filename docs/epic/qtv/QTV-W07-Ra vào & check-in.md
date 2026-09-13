# QTV-W07 — Ra vào & check-in

- **Role:** QTV / Quản lý
- **Platform:** Web only
- **Menu:** `W07`
- **Goal:** Quản lý kiểm soát check-in/check-out của hội viên tại phòng Gym, ghi nhận Vào/Ra thủ công và xem nhật ký ra vào cùng trạng thái kết nối thiết bị.
- **Scope:** 
  1. US01: Xử lý check-in tự động qua Camera / Thiết bị (kiểm tra 6 điều kiện hợp lệ).
  2. US02: Ghi nhận Vào/Ra thủ công (Khu vực bên trái: SĐT hội viên ➔ Bắt buộc nhập lý do ➔ CTA `Ghi nhận Vào` / `Ghi nhận Ra`, kiểm tra 6 điều kiện, lưu audit).
  3. US03: Xem nhật ký Ra/Vào thời gian thực và theo dõi trạng thái thiết bị read-only.

## User Stories trong Epic

- [QTV-W07-US01 — Xử lý check-in tự động qua thiết bị](../../user-stories/qtv/QTV-W07-Ra vào & check-in/QTV-W07-US01-Xử lý check-in tự động qua thiết bị.md)
- [QTV-W07-US02 — Ghi nhận Vào/Ra thủ công](../../user-stories/qtv/QTV-W07-Ra vào & check-in/QTV-W07-US02-Ghi nhận Vào Ra thủ công.md)
- [QTV-W07-US03 — Xem nhật ký Ra/Vào và theo dõi trạng thái thiết bị](../../user-stories/qtv/QTV-W07-Ra vào & check-in/QTV-W07-US03-Xem nhật ký Ra Vào và theo dõi trạng thái thiết bị.md)

## Flow specification

Mỗi User Story của `QTV-W07` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/qtv/`](../../system-flow-specs/qtv/README.md).

## Traceability

- Shared capability catalog: [`W07` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

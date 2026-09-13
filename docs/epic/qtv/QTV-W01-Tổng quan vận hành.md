# QTV-W01 — Tổng quan vận hành

- **Role:** QTV / Quản lý
- **Platform:** Web only
- **Menu:** `W01`
- **Goal:** Cung cấp trung tâm điều hành quản trị để QTV theo dõi 5 khối thành phần: Bộ lọc (Kỳ / Chi nhánh), Card KPI Vận hành & Tài chính (thanh toán 100%, không nợ), Thẻ Việc cần xử lý (click được), Lịch tập PT hôm nay, Cảnh báo vận hành và Quick Actions.
- **Scope:** 
  1. Bộ lọc Kỳ xem `[Hôm nay] [Tuần này] [Tháng này]` & Combobox `Chi nhánh` (Multi-branch scope).
  2. 4 nhóm Card KPI: Hội viên, Đăng ký/Gói, Thanh toán 100% (không nợ), Booking PT/Check-in.
  3. Thẻ việc cần xử lý click được điều hướng sang W04, W05, W06, W12.
  4. Hoạt động hôm nay: Lịch tập PT hôm nay kèm nút xem toàn bộ.
  5. Cảnh báo vận hành & Quick actions (`+ Thêm HV`, `+ Tạo đăng ký`, `Cấu hình thông báo`, `Xem báo cáo`).

## User Stories trong Epic

- [QTV-W01-US01 — Xem tổng quan vận hành](../../user-stories/qtv/QTV-W01-Tổng quan vận hành/QTV-W01-US01-Xem tổng quan vận hành.md)

## Flow specification

Mỗi User Story của `QTV-W01` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/qtv/`](../../system-flow-specs/qtv/README.md).

## Traceability

- Shared capability catalog: [`W01` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

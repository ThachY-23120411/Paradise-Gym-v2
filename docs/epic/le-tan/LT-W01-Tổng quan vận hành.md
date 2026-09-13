# LT-W01 — Tổng quan vận hành

- **Role:** Lễ tân
- **Platform:** Web only
- **Menu:** `W01`
- **Goal:** Cung cấp màn hình tổng quan vận hành quầy chi nhánh phục vụ Lễ tân nắm bắt 5 khối thành phần: Ngữ cảnh chi nhánh quầy, KPI hôm nay tại quầy, Thẻ Việc cần xử lý quầy (click được), Hoạt động lịch/check-in hôm nay và Quick Actions quầy (`+ Thêm HV`, `+ Tạo đăng ký`, `+ Đặt lịch PT`, `Ghi nhận Ra/Vào`).
- **Scope:** 
  1. Ngữ cảnh chi nhánh phục vụ cố định (không hiển thị doanh thu toàn chuỗi hay so sánh chi nhánh).
  2. 4 Card KPI quầy: Check-in hôm nay, Booking PT hôm nay, Registration chờ thanh toán, Yêu cầu cần xử lý.
  3. Thẻ việc cần xử lý quầy click được điều hướng sang LT-W04, LT-W06, LT-W07, LT-W08.
  4. Hoạt động hôm nay: Lịch PT và nhật ký check-in quầy chi nhánh.
  5. Quick Actions quầy: Shortcuts mở trực tiếp modal Thêm hội viên, Tạo đăng ký, Đặt lịch PT, Ghi nhận Ra/Vào thủ công.

## User Stories trong Epic

- [LT-W01-US01 — Xem tổng quan vận hành chi nhánh](../../user-stories/le-tan/LT-W01-Tổng quan vận hành/LT-W01-US01-Xem tổng quan vận hành.md)

## Flow specification

Mỗi User Story của `LT-W01` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/le-tan/`](../../system-flow-specs/le-tan/README.md).

## Traceability

- Shared capability catalog: [`W01` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

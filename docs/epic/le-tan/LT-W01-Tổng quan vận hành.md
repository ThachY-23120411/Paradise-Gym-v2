# LT-W01 — Tổng quan vận hành

- **Role:** Lễ tân
- **Platform:** Web only
- **Menu:** `W01`
- **Goal:** Cung cấp màn hình tổng quan vận hành quầy chi nhánh phục vụ Lễ tân nắm bắt 5 khối thành phần: Ngữ cảnh chi nhánh quầy, KPI hôm nay tại quầy, Thẻ Việc cần xử lý quầy (click được), Hoạt động lịch/check-in hôm nay và Quick Actions quầy (`+ Thêm HV`, `+ Tạo đăng ký`, `+ Đặt lịch PT`, `Ghi nhận Ra/Vào`).
- **Scope:** 
  1. Ngữ cảnh chi nhánh phục vụ cố định (không hiển thị doanh thu toàn chuỗi hay so sánh chi nhánh).
  2. 4 Card KPI quầy: Check-in hôm nay, Booking PT hôm nay, Đăng ký chờ thanh toán, Việc cần xử lý tại quầy.
  3. Khối Hôm nay cần xử lý (CSKH): 4 Thẻ KPI chuyên trách (Sinh nhật, Gói sắp hết hạn, Chờ gia hạn, Đăng ký mới).
  4. Khối Việc cần xử lý tại quầy: 5 Thẻ KPI tác vụ (Đăng ký chưa thanh toán, Booking sắp tới, Booking chờ xác nhận, Hỗ trợ đặt lịch, Thiết bị check-in).
  5. Hoạt động hôm nay: Lịch PT và nhật ký 8 lượt check-in gần nhất tại chi nhánh.
  6. Quick Actions quầy: Shortcuts mở trực tiếp modal Thêm hội viên, Tạo đăng ký, Đặt lịch PT, Lớp cộng đồng, Ghi nhận Ra/Vào thủ công.

## User Stories trong Epic

- [LT-W01-US01 — Xem tổng quan vận hành chi nhánh](../../user-stories/le-tan/LT-W01-Tổng quan vận hành/LT-W01-US01-Xem tổng quan vận hành.md)

## Flow specification

Mỗi User Story của `LT-W01` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/le-tan/`](../../system-flow-specs/le-tan/README.md).

## Traceability

- Shared capability catalog: [`W01` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

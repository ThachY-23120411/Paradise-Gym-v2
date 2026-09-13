# System Flow Specs — Lễ tân Web

- **Role:** Lễ tân
- **Platform:** Web only

Flow canonical được đặt ngay trong từng User Story để giữ đúng chuỗi:

```text
Epic/Menu → User Story → Preconditions → Main/Alternate/Exception Flow → Activity Diagram swimlane → UI Screen
```

## LT-W01 · Tổng quan vận hành

- [LT-W01-US01 — Xem tổng quan vận hành](../../user-stories/le-tan/LT-W01-Tổng quan vận hành/LT-W01-US01-Xem tổng quan vận hành.md)

## LT-W02 · Hội viên & khách hàng

- [LT-W02-US01 — Thêm hội viên](../../user-stories/le-tan/LT-W02-Hội viên & khách hàng/LT-W02-US01-Thêm hội viên.md)
- [LT-W02-US02 — Sửa hồ sơ hội viên](../../user-stories/le-tan/LT-W02-Hội viên & khách hàng/LT-W02-US02-Sửa hồ sơ hội viên.md)
- [LT-W02-US03 — Đổi trạng thái hội viên](../../user-stories/le-tan/LT-W02-Hội viên & khách hàng/LT-W02-US03-Đổi trạng thái hội viên.md)
- [LT-W02-US04 — Xem danh sách hội viên](../../user-stories/le-tan/LT-W02-Hội viên & khách hàng/LT-W02-US04-Xem danh sách hội viên.md)

## LT-W04 · Đăng ký & gia hạn

- [LT-W04-US01 — Tạo đăng ký gói mới](../../user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US01-Tạo đăng ký gói mới.md)
- [LT-W04-US02 — Gia hạn đăng ký gói](../../user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US02-Gia hạn đăng ký gói.md)
- [LT-W04-US03 — Xem danh sách các đăng ký](../../user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US03-Xem danh sách các đăng ký.md)

## LT-W06 · Lịch tập & buổi PT

- [LT-W06-US01 — Xem lịch PT](../../user-stories/le-tan/LT-W06-Lịch tập & buổi PT/LT-W06-US01-Xem lịch PT.md)
- [LT-W06-US02 — Đặt lịch PT](../../user-stories/le-tan/LT-W06-Lịch tập & buổi PT/LT-W06-US02-Đặt lịch PT.md)
- [LT-W06-US03 — Xác nhận hoàn thành buổi học](../../user-stories/le-tan/LT-W06-Lịch tập & buổi PT/LT-W06-US03-Xác nhận hoàn thành buổi học.md)
- [LT-W06-US04 — Hủy lịch PT](../../user-stories/le-tan/LT-W06-Lịch tập & buổi PT/LT-W06-US04-Hủy lịch PT.md)

## LT-W07 · Ra vào & check-in

- [LT-W07-US01 — Xử lý check-in tự động qua thiết bị](../../user-stories/le-tan/LT-W07-Ra vào & check-in/LT-W07-US01-Xử lý check-in tự động qua thiết bị.md)
- [LT-W07-US02 — Ghi nhận Vào/Ra thủ công](../../user-stories/le-tan/LT-W07-Ra vào & check-in/LT-W07-US02-Ghi nhận Vào Ra thủ công.md)
- [LT-W07-US03 — Xem nhật ký Ra/Vào và theo dõi trạng thái thiết bị](../../user-stories/le-tan/LT-W07-Ra vào & check-in/LT-W07-US03-Xem nhật ký Ra Vào và theo dõi trạng thái thiết bị.md)

## LT-W08 · Thu tiền & thanh toán

- [LT-W08-US01 — Xem danh sách payment](../../user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US01-Xem danh sách payment.md)
- [LT-W08-US02 — Tạo payment](../../user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US02-Tạo payment.md)
- [LT-W08-US03 — Xem thống kê](../../user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US03-Xem thống kê.md)

## LT-W09 · Thông báo

- [LT-W09-US01 — Tra cứu lịch sử gửi thông báo chi nhánh](../../user-stories/le-tan/LT-W09-Thông báo/LT-W09-US01-Tra cứu lịch sử gửi thông báo chi nhánh.md)

## Diagram convention

Mỗi diagram dùng Mermaid `flowchart LR` hoặc `flowchart TB`; mỗi `subgraph` là một swimlane của role, actor liên quan hoặc SYS/thiết bị. Bản ghi nghiệp vụ cần lịch sử không bị xóa vật lý.

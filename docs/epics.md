# Epics theo Role và Platform — Paradise Gym

Tài liệu canonical hiện dùng cấu trúc:

```text
Role → Platform → Epic/Menu → User Story → Activity Diagram → UI Screen
```

## Platform boundary

| Role | Platform được phép | Namespace canonical |
| --- | --- | --- |
| QTV / Quản lý | Web only | [`docs/epic/qtv/`](epic/qtv/), [`docs/user-stories/qtv/`](user-stories/qtv/) |
| Lễ tân | Web only | [`docs/epic/le-tan/`](epic/le-tan/), [`docs/user-stories/le-tan/`](user-stories/le-tan/) |
| Hội viên | Mobile only | [`docs/epic/hoi-vien/`](epic/hoi-vien/), [`docs/user-stories/hoi-vien/`](user-stories/hoi-vien/) |
| PT | Mobile only | [`docs/epic/pt/`](epic/pt/), [`docs/user-stories/pt/`](user-stories/pt/) |

> QTV/Lễ tân không có Mobile canonical. Hội viên/PT không có Web canonical.

## Role navigation

### QTV — Web

QTV có toàn bộ menu Web: W01–W17 (bao gồm 4 menu mới: W14 Chăm sóc & thông báo, W15 Quản lý hoa hồng PT, W16 Lớp tập cộng đồng, W17 Khuyến mãi & giảm giá). Danh sách Epic canonical theo từng menu xem [`docs/epic/qtv/README.md`](epic/qtv/README.md); User Story và activity diagram xem [`docs/user-stories/qtv/README.md`](user-stories/qtv/README.md).

### Lễ tân — Web

Lễ tân chỉ dùng các menu Web vận hành được cấp: W01 (Tổng quan), W02 (Hội viên), W04 (Đăng ký & gia hạn), W05 (Huấn luyện viên), W06 (Lịch PT), W07 (Ra vào/Check-in), W08 (Thu tiền), W09 (Thông báo), W10/W14 (Chăm sóc khách hàng), W16 (Lớp tập cộng đồng). Danh sách Epic canonical theo từng menu xem [`docs/epic/le-tan/README.md`](epic/le-tan/README.md); User Story và activity diagram xem [`docs/user-stories/le-tan/README.md`](user-stories/le-tan/README.md).

### Hội viên — Mobile footer

Thanh điều hướng Mobile của Hội viên gồm đúng bốn Epic:

1. [`HV01 · Trang chủ`](epic/hoi-vien/HV01-Trang chủ.md)
2. [`HV02 · Lịch tập`](epic/hoi-vien/HV02-Lịch tập.md)
3. [`HV03 · Gói của tôi`](epic/hoi-vien/HV03-Gói của tôi.md)
4. [`HV04 · Tài khoản`](epic/hoi-vien/HV04-Tài khoản.md)

### PT — Mobile footer

Mobile PT có đúng 5 tab: Tổng quan (PT06-US01), Lịch (PT01), Học viên (PT02), Hoa hồng (PT06-US02), Tài khoản (PT04); chuông mở PT03 Thông báo, PT05 dành cho xác thực. PT01-US03 cho phép chính PT đặt lịch hộ hội viên đã được phân công, không cấp quyền hủy. PT02-US03 giữ lịch sử phân công chỉ đọc; PT06 có 4 KPI và Đặt lịch nhanh. Entry xem [`docs/epic/pt/README.md`](epic/pt/README.md).

## Traceability

- Product Spec: [`docs/product-spec.md`](product-spec.md)
- Epic canonical theo role: [`docs/epic/`](epic/)
- User Story canonical theo role: [`docs/user-stories/`](user-stories/)
- Flow specs Mobile Hội viên: [`docs/system-flow-specs/hoi-vien/README.md`](system-flow-specs/hoi-vien/README.md)
- Catalog menu dùng chung/legacy: [`docs/epics-menu-catalog.md`](epics-menu-catalog.md)



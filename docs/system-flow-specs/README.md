# Đặc tả luồng hệ thống Paradise Gym

Đây là entry point cho activity diagram theo role và platform:

```text
Role → Platform → Epic/Menu → User Story → Activity Diagram → UI Screen
```

## Canonical flow specs

| Role | Platform | Entry |
| --- | --- | --- |
| QTV / Quản lý | Web only | [`qtv/README.md`](qtv/README.md) và [`docs/user-stories/qtv/`](../user-stories/qtv/) |
| Lễ tân | Web only | [`le-tan/README.md`](le-tan/README.md) và [`docs/user-stories/le-tan/`](../user-stories/le-tan/) |
| Hội viên | Mobile only | [`hoi-vien/README.md`](hoi-vien/README.md) |
| PT | Mobile only | [`pt/README.md`](pt/README.md) và [`docs/epic/pt/`](../epic/pt/) |

## Web QTV và Lễ tân

- QTV: [`qtv/README.md`](qtv/README.md) với 44 User Story thuộc W01–W13.
- Lễ tân: [`le-tan/README.md`](le-tan/README.md) với 24 User Story thuộc W01, W02, W04, W06, W07, W08, W09.
- Mỗi User Story Web canonical có flow chính/thay thế/ngoại lệ và Mermaid activity diagram chia swimlane theo role, actor liên quan và SYS.

## Mobile Hội viên

Bốn footer Epic của Hội viên đã có flow index riêng:

- [`HV01 · Trang chủ`](hoi-vien/README.md)
- [`HV02 · Lịch tập`](hoi-vien/README.md)
- [`HV03 · Gói của tôi`](hoi-vien/README.md)
- [`HV04 · Tài khoản`](hoi-vien/README.md)

Mỗi User Story trong [`docs/user-stories/hoi-vien/`](../user-stories/hoi-vien/) có precondition, main/alternate/exception flow, permission/data scope, related screen, postcondition và Mermaid activity diagram swimlane.


## Quy ước diagram

- `C` = Create; `R` = Read; `U` = Update; `CRUD` = quản lý dữ liệu.
- `Workflow` = luồng chuyển trạng thái, phê duyệt hoặc xác nhận.
- `Export` = xuất dữ liệu.
- Mermaid `flowchart` với mỗi `subgraph` là một swimlane của role hoặc hệ thống có tác động.
- Với activity diagram đầy đủ: `((Initial))` là initial node; `[...]` là action node; `{...}` là decision node; `((Merge))` là merge node; `{{Join}}` là join node; `(((Final)))` là final node; boundary được biểu diễn bằng `subgraph` ngoài cùng bao các swimlane.
- Mũi tên `-->` là control flow; nhãn trên mũi tên biểu diễn điều kiện của decision branch.
- Không xóa vật lý các bản ghi nghiệp vụ cần lịch sử; dùng trạng thái, hủy, archive hoặc adjustment.



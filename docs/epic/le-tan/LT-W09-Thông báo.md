# LT-W09 — Thông báo

- **Role:** Lễ tân
- **Platform:** Web only
- **Menu:** `W09`
- **Goal:** Tra cứu và kiểm tra nhật ký lịch sử các thông báo in-app do hệ thống (SYS) tự động phát tới Hội viên và Huấn luyện viên (PT) thuộc phạm vi chi nhánh phục vụ.
- **Scope:** 
  1. **Tra cứu nhật ký chi nhánh (Branch Scope):** Lễ tân chỉ xem danh sách nhật ký thông báo gửi cho người dùng thuộc chi nhánh của mình.
  2. **Không có quyền cấu hình hệ thống:** Lễ tân không có Tab Cấu hình sự kiện và Tab Mẫu thông báo (các quyền này thuộc thẩm quyền quản trị của QTV).
  3. **Truy vết minh bạch:** Xem chi tiết nội dung thông báo đã phát, trạng thái đã đọc và điều hướng nhanh đến chứng từ nguồn phát sinh (Giao dịch thu tiền, Lịch tập...).

---

## Thành phần giao diện (UI Components & Layout)

Menu `W09 · Thông báo` trên Web Lễ tân hiển thị trực tiếp giao diện tra cứu lịch sử thông báo chi nhánh:

### 1. Thanh công cụ lọc & Tìm kiếm
- **Bộ lọc thời gian:** `Date / Date Range Picker` (Mặc định hôm nay `TODAY`, cho phép chọn 1 ngày hoặc khoảng ngày).
- **Bộ lọc Sự kiện:** Dropdown chọn sự kiện phát sinh (`Tất cả`, `Thanh toán`, `Đặt lịch`, `Gói sắp hết hạn`...).
- **Bộ lọc Trạng thái đọc:** Dropdown chọn `Tất cả`, `Đã đọc`, `Chưa đọc`.
- **Ô tìm kiếm:** Tìm kiếm theo Họ tên, SĐT hội viên/PT hoặc Mã chứng từ nguồn.

---

### 2. Bảng Nhật ký Lịch sử gửi thông báo chi nhánh (Datagridview 6 cột)
1. `Thời gian`: Ngày và giờ phát thông báo (`DD/MM/YYYY HH:mm`).
2. `Sự kiện`: Badge mã sự kiện phát sinh (ví dụ: `PAYMENT_CONFIRMED`).
3. `Người nhận`: Ô 2 dòng: Dòng trên Họ tên (`Nguyễn Văn A`), dòng dưới `Mã định danh · SĐT` (`HV00123 · 0901 234 567`) trong chi nhánh.
4. `Tiêu đề thông báo`: Tiêu đề thông báo thực tế người nhận đã xem (giúp bảng gọn gàng, không bị tràn dòng).
5. `Nguồn chứng từ`: Mã chứng từ tham chiếu dạng link (ví dụ: `PT00123`, `BK00456`), click để điều hướng đến chi tiết giao dịch hoặc lịch tập liên quan.
6. `Trạng thái đọc`: Badge `Đã đọc` (xanh) hoặc `Chưa đọc` (xám).
7. `Thao tác`: Nút `[ 👁 ]` mở xem chi tiết toàn văn nội dung thông báo.

---

## User Stories trong Epic

| User Story | Loại giao diện | Khối UI tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [LT-W09-US01 — Tra cứu lịch sử gửi thông báo chi nhánh](../../user-stories/le-tan/LT-W09-Thông báo/LT-W09-US01-Tra cứu lịch sử gửi thông báo chi nhánh.md) | Màn hình chính | **Bảng Nhật ký Lịch sử thông báo chi nhánh** | Tra cứu nhật ký thông báo in-app gửi cho Hội viên/PT chi nhánh theo thời gian, sự kiện, người nhận và deep-link chứng từ nguồn |

---

## Flow specification

Mỗi User Story của `LT-W09` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/le-tan/`](../../system-flow-specs/le-tan/README.md).

## Traceability

- Shared capability catalog: [`W09` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit: [`docs/ui-related-screen-audit.md`](../../ui-related-screen-audit.md).

# QTV-W11 — Chi nhánh

- **Role:** QTV cấp tối cao (Quản trị viên - Toàn chuỗi / cơ sở mẹ)
- **Platform:** Web only
- **Menu:** `W11`
- **Goal:** Cung cấp trung tâm quản lý danh mục chi nhánh toàn hệ thống, hỗ trợ QTV toàn chuỗi theo dõi trạng thái các cơ sở, mở rộng chi nhánh mới, cập nhật thông tin vận hành và nắm bắt số liệu hoạt động thực tế của từng cơ sở.
- **Scope:** 
  1. **Danh sách Thẻ Chi nhánh (Branch Cards Grid):** Hiển thị danh mục chi nhánh trực quan dưới dạng các thẻ Card, cung cấp thông tin nhận diện (`Mã`, `Tên`), liên hệ (`Địa chỉ`, `SĐT`), giờ mở cửa, trạng thái hoạt động và 3 chỉ số vận hành nhanh (`Hội viên`, `Huấn luyện viên`, `Đang tập`).
  2. **Thêm chi nhánh mới:** Cung cấp modal khởi tạo cơ sở mới với mã tự sinh, kiểm soát tính duy nhất của tên chi nhánh và tự động kết nối vào danh sách phân quyền toàn chuỗi.
  3. **Chỉnh sửa thông tin chi nhánh:** Cho phép điều chỉnh tên cơ sở, địa chỉ, số điện thoại liên hệ, giờ hoạt động và cập nhật trạng thái (`Đang hoạt động` / `Tạm ngừng hoạt động`).
  4. **Xem số liệu chi nhánh:** Drawer/Modal mở nhanh báo cáo tổng quan tình hình vận hành cơ sở (hội viên, HLV, lượt check-in thực tế, gói tập hiệu lực và buổi PT hoàn thành) mà không cần chuyển bộ chọn chi nhánh toàn cục.
  5. **Quyền hạn độc quyền:** Chỉ dành riêng cho tài khoản có vai trò Quản trị viên - Toàn chuỗi; các vai trò quản lý chi nhánh, lễ tân, PT không được phân quyền truy cập menu W11.

---

## Thành phần giao diện (UI Components & Layout)

Menu `W11 · Chi nhánh` được thiết kế theo bố cục quản trị trực quan gồm 2 khu vực chính trên màn hình và 3 modal/drawer thao tác:

### 1. Header & Cụm Action Button (Thanh tiêu đề & Tác vụ)
- **Tiêu đề trang:** `Chi nhánh`.
- **Mô tả chức năng:** `Thông tin chi nhánh, phạm vi hoạt động và liên kết dữ liệu vận hành`.
- **Nút Thêm chi nhánh (`[ + Thêm chi nhánh ]`):** Nút màu xanh lá góc trên bên phải; click kích hoạt mở modal Thêm chi nhánh mới (`QTV-W11-US02`).

### 2. Lưới thẻ Chi nhánh (Branch Cards Grid — QTV-W11-US01)
Danh sách chi nhánh hiển thị dưới dạng các Card độc lập, mỗi Card bao gồm:
- **Thông tin nhận diện & Trạng thái:**
  + Tên chi nhánh (in đậm, ví dụ: `Chi nhánh Quận 1`, `Chi nhánh Bình Thạnh`).
  + Mã chi nhánh (nhãn phụ màu xám, ví dụ: `CN01`, `CN02`).
  + Badge trạng thái hoạt động: `Đang hoạt động` (badge xanh lá) hoặc `Tạm ngừng hoạt động` (badge cam/xám).
- **Thông tin liên hệ & Giờ hoạt động:**
  + Địa chỉ chi tiết cơ sở (số nhà, đường, phường, quận, TP).
  + Số điện thoại liên hệ hotline và khung giờ mở cửa hàng ngày (ví dụ: `028 3911 2026 · Giờ mở: 06:00 - 22:00`).
- **Khối 3 chỉ số thống kê nhanh (Mini Stats):**
  1. `Hội viên`: Số lượng hội viên đăng ký hồ sơ tại cơ sở.
  2. `Huấn luyện viên`: Số lượng HLV cá nhân đang được phân công thuộc chi nhánh.
  3. `Đang tập`: Số lượng hội viên check-in có mặt tập luyện thực tế hôm nay (real-time).
- **Nút thao tác trên Card (Card Actions):**
  + Nút **`[ 👁 Số liệu ]`** (Màu tối): Click mở Drawer hiển thị báo cáo số liệu chi tiết (`QTV-W11-US04`).
  + Nút **`[ 📝 Chỉnh sửa ]`** (Màu tối): Click mở modal cập nhật thông tin và trạng thái chi nhánh (`QTV-W11-US03`).

### 3. Modal & Drawer thao tác
- **Modal Thêm chi nhánh (`QTV-W11-US02`):** Form nhập Tên chi nhánh, Địa chỉ, SĐT, Giờ mở cửa và Trạng thái ban đầu; mã chi nhánh hệ thống tự sinh tăng dần.
- **Modal Chỉnh sửa chi nhánh (`QTV-W11-US03`):** Prefill dữ liệu hiện tại, Mã chi nhánh khóa `READONLY`; cho phép sửa Tên, Địa chỉ, SĐT, Giờ mở cửa và đổi Trạng thái hoạt động.
- **Drawer Số liệu chi nhánh (`QTV-W11-US04`):** Ngăn trượt từ cạnh phải xem nhanh quy mô hội viên, HLV, lượt check-in hôm nay, các gói tập `ACTIVE` và số buổi PT hoàn thành trong tháng.

---

## User Stories trong Epic

| User Story | Loại giao diện | Khối UI tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [QTV-W11-US01 — Xem danh sách chi nhánh](../../user-stories/qtv/QTV-W11-Chi nhánh/QTV-W11-US01-Xem danh sách chi nhánh.md) | Màn hình chính | **Lưới Thẻ Chi nhánh (Cards Grid)** | Xem danh sách các cơ sở chi nhánh, thông tin liên hệ và 3 chỉ số vận hành nhanh |
| [QTV-W11-US02 — Thêm chi nhánh](../../user-stories/qtv/QTV-W11-Chi nhánh/QTV-W11-US02-Thêm chi nhánh.md) | Modal pop-up | **Modal Thêm chi nhánh** | Nhập thông tin khởi tạo cơ sở mới trong chuỗi phòng tập |
| [QTV-W11-US03 — Chỉnh sửa chi nhánh](../../user-stories/qtv/QTV-W11-Chi nhánh/QTV-W11-US03-Chỉnh sửa chi nhánh.md) | Modal pop-up | **Modal Chỉnh sửa chi nhánh** | Cập nhật hồ sơ, liên hệ, giờ mở cửa và trạng thái hoạt động của cơ sở |
| [QTV-W11-US04 — Xem số liệu chi nhánh](../../user-stories/qtv/QTV-W11-Chi nhánh/QTV-W11-US04-Xem số liệu chi nhánh.md) | Drawer / Slide-over | **Drawer Số liệu chi nhánh** | Tra cứu nhanh báo cáo vận hành, hội viên, HLV và lượt tập tại chi nhánh |

---

## Flow specification

Mỗi User Story của `QTV-W11` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/qtv/`](../../system-flow-specs/qtv/README.md).

## Traceability

- Shared capability catalog: [`W11` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit & Screenshot: [`screenshot/qtv/light-web-W11-chi-nhanh.png`](../../screenshot/qtv/light-web-W11-chi-nhanh.png).


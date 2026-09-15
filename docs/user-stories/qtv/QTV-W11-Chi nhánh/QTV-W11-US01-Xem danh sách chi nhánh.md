# QTV-W11-US01 - Xem danh sách chi nhánh

## Preconditions
- Quản trị viên (QTV) đã đăng nhập vào Web QTV bằng tài khoản có thẩm quyền cấp tối cao (Quản trị viên - Toàn chuỗi / cơ sở mẹ).
- Hệ thống đã có danh mục cơ sở chi nhánh và dữ liệu vận hành (hồ sơ hội viên, phân công PT, lịch sử check-in) liên kết tương ứng.

## Trigger
- QTV cấp tối cao chọn menu **W11 · Chi nhánh** trên thanh điều hướng chính.
- Màn hình liên quan: Web QTV — Màn hình `W11 · Chi nhánh`.

## Main Flow

1. QTV cấp tối cao truy cập menu **W11 · Chi nhánh**.
2. SYS xác thực quyền truy cập cấp tối cao (Quản trị viên - Toàn chuỗi).
3. SYS truy vấn cơ sở dữ liệu và hiển thị giao diện danh sách chi nhánh dạng lưới các thẻ Card:
   - **Thanh tiêu đề trang:**
     + Tiêu đề lớn `Chi nhánh` kèm dòng mô tả phụ *Thông tin chi nhánh, phạm vi hoạt động và liên kết dữ liệu vận hành*.
     + Nút hành động **`[ + Thêm chi nhánh ]`** màu xanh lá góc trên bên phải.
   - **Lưới các Thẻ Chi nhánh (Branch Cards Grid):** Mỗi cơ sở được thể hiện bằng 1 thẻ Card gồm:
     + Tên chi nhánh (ví dụ: `Chi nhánh Quận 1`, `Chi nhánh Bình Thạnh`).
     + Mã chi nhánh (ví dụ: `CN01`, `CN02`).
     + Badge trạng thái hoạt động: `Đang hoạt động` (badge xanh lá nhạt) hoặc `Tạm ngừng hoạt động` (badge xám/cam).
     + Địa chỉ chi tiết cơ sở (ví dụ: `123 Lê Lai, P. Bến Thành, Q.1, TP.HCM`).
     + Số điện thoại liên hệ và khung giờ mở cửa (ví dụ: `028 3911 2026 · Giờ mở cửa: 06:00 - 22:00`).
     + Đường phân cách ngang.
     + Khối 3 ô chỉ số thống kê nhanh (Mini KPI Stats Boxes):
       * `Hội viên`: Tổng số hội viên đăng ký tại cơ sở (ví dụ: `12`).
       * `Huấn luyện viên`: Tổng số HLV đang được phân công thuộc cơ sở (ví dụ: `2`).
       * `Đang tập`: Số hội viên đang có mặt tập luyện thực tế trong ngày (ví dụ: `4`).
     + Cụm 2 nút hành động ở chân Card:
       * Nút **`[ 👁 Số liệu ]`**: Bấm để mở Drawer xem số liệu vận hành chi tiết (`QTV-W11-US04`).
       * Nút **`[ 📝 Chỉnh sửa ]`**: Bấm để mở modal chỉnh sửa thông tin chi nhánh (`QTV-W11-US03`).
4. QTV xem danh sách các chi nhánh và có thể bấm nút **`[ + Thêm chi nhánh ]`**, **`[ 👁 Số liệu ]`** hoặc **`[ 📝 Chỉnh sửa ]`** để thực hiện các thao tác quản trị tiếp theo.

### Field-level specification — Màn hình Danh sách chi nhánh (W11)
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Nút Thêm chi nhánh `[ + Thêm chi nhánh ]` | `Button (Primary Green)` | `USER-INPUT` | optional | Không | Nút màu xanh lá góc trên bên phải; click kích hoạt mở modal Thêm chi nhánh mới (US02) |
| Card chi nhánh — Tên chi nhánh | `Card Heading` | `READONLY` | required | `DYNAMIC` | Tên cơ sở chi nhánh (ví dụ: `Chi nhánh Quận 1`, `Chi nhánh Bình Thạnh`) |
| Card chi nhánh — Mã chi nhánh | `Subtext` | `READONLY` | required | `DYNAMIC` | Mã định danh duy nhất của chi nhánh (ví dụ: `CN01`, `CN02`) |
| Card chi nhánh — Badge trạng thái | `Status Badge` | `READONLY` | required | `DYNAMIC` | Trạng thái hoạt động của cơ sở: `Đang hoạt động` (badge xanh lá) hoặc `Tạm ngừng hoạt động` (badge cam/xám) |
| Card chi nhánh — Địa chỉ | `Text` | `READONLY` | required | `DYNAMIC` | Địa chỉ cụ thể của cơ sở (số nhà, đường, phường, quận, tỉnh/thành phố) |
| Card chi nhánh — Số điện thoại & Giờ mở cửa | `Text` | `READONLY` | required | `DYNAMIC` | SĐT liên hệ và khung giờ mở cửa hàng ngày (ví dụ: `028 3911 2026 · Giờ mở cửa: 06:00 - 22:00`) |
| Card chi nhánh — Chỉ số Hội viên | `Mini Stat Box` | `READONLY` | required | `DYNAMIC` | Tổng số lượng hội viên đăng ký hồ sơ tại cơ sở chi nhánh này (ví dụ: `12`) |
| Card chi nhánh — Chỉ số Huấn luyện viên | `Mini Stat Box` | `READONLY` | required | `DYNAMIC` | Tổng số lượng HLV cá nhân đang được phân công thuộc chi nhánh (ví dụ: `2`) |
| Card chi nhánh — Chỉ số Đang tập | `Mini Stat Box` | `READONLY` | required | `DYNAMIC` | Số lượng hội viên đang có mặt tập luyện thực tế theo check-in hôm nay chưa check-out (ví dụ: `4`) |
| Card chi nhánh — Nút Số liệu `[ 👁 Số liệu ]` | `Button (Secondary Dark)` | `USER-INPUT` | optional | Không | Nút xem số liệu chi tiết; click mở Drawer/Modal xem báo cáo số liệu vận hành chi nhánh (US04) |
| Card chi nhánh — Nút Chỉnh sửa `[ 📝 Chỉnh sửa ]` | `Button (Secondary Dark)` | `USER-INPUT` | optional | Không | Nút chỉnh sửa; click mở modal Chỉnh sửa thông tin và trạng thái chi nhánh (US03) |

- **Business rules / logic:**
  - Menu W11 là menu độc quyền bảo mật chỉ dành riêng cho QTV cấp tối cao (Quản trị viên - Toàn chuỗi). QTV chi nhánh, Lễ tân, PT, Hội viên không nhìn thấy menu này trên thanh điều hướng và bị chặn truy cập API (403 Forbidden).
  - Thống kê số lượng `Đang tập` được tính toán theo thời gian thực (real-time) dựa trên các lượt check-in ra/vào hợp lệ trong ngày mà chưa có lượt check-out tương ứng tại chi nhánh đó.
  - Các chỉ số `Hội viên` và `Huấn luyện viên` được tự động tổng hợp từ danh sách hội viên đăng ký tại cơ sở (W02) và phân công nhân sự PT (W05).

## Exception Flows
- Người dùng không có quyền QTV toàn chuỗi truy cập trực tiếp URL W11: SYS ẩn menu, từ chối quyền truy cập và chuyển hướng về màn hình Tổng quan W01 kèm thông báo từ chối quyền.
- Hệ thống chưa có chi nhánh nào: SYS hiển thị giao diện trạng thái trống (Empty State) kèm thông báo "Chưa có dữ liệu chi nhánh" và gợi ý bấm nút `[ + Thêm chi nhánh ]`.

## Activity Diagram — Swimlane
**Trigger:** QTV cấp tối cao chọn menu W11 Chi nhánh trên thanh điều hướng chính.

```mermaid
flowchart TB
  subgraph B["Boundary — Web QTV W11 / Màn hình Danh sách chi nhánh"]
    subgraph L0["Swimlane — Quản trị viên (QTV Toàn chuỗi)"]
      I01(("Initial"))
      A01["Chọn menu W11 · Chi nhánh trên thanh điều hướng"]
      A02["Xem danh sách Card chi nhánh, thông tin liên hệ và 3 chỉ số vận hành"]
      A03{"Chọn thao tác tiếp theo"}
      A04["Bấm nút [ + Thêm chi nhánh ]"]
      A05["Bấm nút [ 👁 Số liệu ] trên Card"]
      A06["Bấm nút [ 📝 Chỉnh sửa ] trên Card"]
      F01((("Final — Mở luồng Thêm chi nhánh (US02)")))
      F02((("Final — Mở luồng Xem số liệu (US04)")))
      F03((("Final — Mở luồng Chỉnh sửa (US03)")))

      I01 --> A01
      A02 --> A03
      A03 -->|Thêm mới| A04 --> F01
      A03 -->|Xem số liệu| A05 --> F02
      A03 -->|Chỉnh sửa| A06 --> F03
    end

    subgraph L1["Swimlane — SYS"]
      S01["Xác thực quyền Quản trị viên - Toàn chuỗi"]
      S02{"Kiểm tra thẩm quyền"}
      S03["Truy vấn CSDL: nạp danh sách chi nhánh, giờ mở cửa & tính toán 3 chỉ số Hội viên, HLV, Đang tập"]
      S04["Từ chối truy cập (403), điều hướng về W01"]
      F04((("Final — Bị từ chối truy cập")))

      A01 --> S01 --> S02
      S02 -->|Hợp lệ| S03 --> A02
      S02 -->|Không có quyền| S04 --> F04
    end
  end
```

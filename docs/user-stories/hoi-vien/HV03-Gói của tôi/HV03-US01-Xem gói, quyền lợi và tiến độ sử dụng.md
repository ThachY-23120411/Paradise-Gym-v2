# HV03-US01 - Xem gói, quyền lợi và tiến độ sử dụng

## Preconditions
- Hội viên đã đăng nhập Mobile bằng tài khoản hợp lệ.
- Hệ thống đã có dữ liệu các đơn đăng ký gói tập của Hội viên.

## Trigger
- Hội viên bấm mở tab `Gói của tôi` (HV03) trên menu footer và chọn sub-tab `Gói của tôi`.
- Màn hình liên quan: Mobile App — Tab `HV03 · Gói của tôi`, sub-tab `Gói của tôi`.

## Main Flow

1. Hội viên mở tab **Gói của tôi** trên menu footer và chọn sub-tab **Gói của tôi**.
2. SYS nạp danh sách toàn bộ các đơn đăng ký gói tập (Registrations) thuộc sở hữu của Hội viên.
3. SYS hiển thị 3 sub-tab chuyển đổi chính: `Gói của tôi` (đang chọn), `Mua gói`, `Yêu cầu PT`.
4. SYS hiển thị các Chip lọc trạng thái gói: `Đang sử dụng (n)`, `Chờ xử lý (n)`, `Đã hết hạn (n)`.
5. Hội viên chọn Chip lọc trạng thái cần xem (mặc định chọn `Đang sử dụng`).
6. SYS nạp và hiển thị danh sách các thẻ Card gói tập tương ứng bao gồm:
   - **Tên gói tập**: Ví dụ `Gói PT 20 buổi`, `Gói Gym 1 tháng`, `Combo Gym 3 tháng + PT 10 buổi`.
   - **Tiến độ sử dụng & Thanh Progress bar**:
     - Gói PT theo số buổi: `Đã dùng 17/20 buổi` kèm thanh tiến độ (Progress bar).
     - Gói Gym theo ngày: `Đã dùng 18/30 ngày` kèm thanh tiến độ (Progress bar).
     - Gói Combo Gym + PT: `Gym: đã dùng 1/3 tháng · PT: còn 8/10 buổi` kèm thanh tiến độ (Progress bar).
   - **Badge trạng thái gói**: `Đang hoạt động` (badge xanh lá), `Sắp hết hạn` (badge vàng), `Chờ xử lý` / `Chờ kích hoạt`, `Đã hết hạn`.
   - **Thông tin PT phụ trách & Nút thao tác**:
     - Nếu gói PT/Combo đã chọn PT phụ trách: Hiển thị `PT: Nguyễn Văn Thể`.
     - Nếu gói PT/Combo chưa chọn PT phụ trách: Hiển thị `PT: Chưa chọn` và nút CTA màu đen **`[ Chọn PT phụ trách ]`**.
7. Khi Hội viên bấm nút **`[ Chọn PT phụ trách ]`**, SYS điều hướng sang màn hình Chọn PT cho gói đó (thuộc `HV03-US04`).

- **Business rules / logic:**
  - Danh sách chỉ hiển thị các gói tập thuộc sở hữu của chính Hội viên đang đăng nhập.
  - Tiến độ sử dụng phản ánh trung thực số buổi đã tập (được trừ sau khi buổi tập PT `DONE`) hoặc số ngày đã trôi qua kể từ ngày kích hoạt gói Gym.
  - Thẻ gói PT/Combo chưa chọn PT phải hiển thị nút CTA `[ Chọn PT phụ trách ]` để nhắc nhở Hội viên gán HLV trước khi đặt lịch ở menu HV02.
  - Mọi giao dịch hiển thị ở khối Lịch sử thanh toán đều là phiếu thu 100% qua chuyển khoản VietQR.

### Field-level specification — Sub-tab Gói của tôi
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tiêu đề khối Gói của tôi** | `Typography / Heading` | `READONLY` | required | `DYNAMIC`: Lấy từ tổng số gói đăng ký của hội viên | Hiển thị nhãn cố định kèm số lượng: `GÓI CỦA TÔI (n)` |
| **Nhóm Chip lọc trạng thái gói** | `Chip group / Segmented control` | `USER-INPUT` | required | `TRIGGER`: Điều khiển danh sách thẻ gói hiển thị bên dưới | 3 chip chuyển đổi trạng thái: `Đang sử dụng (n)`, `Chờ xử lý (n)`, `Đã hết hạn (n)`. Mặc định chọn `Đang sử dụng (n)` |
| **Thẻ gói tập cá nhân (Package Card)** | `Card list item` | `READONLY` | required | `DYNAMIC`: Danh sách thẻ hiển thị theo chip trạng thái đang chọn | Mỗi thẻ bao gồm: Tên gói (chữ đậm), Badge trạng thái (`Đang hoạt động` - xanh lá, `Sắp hết hạn` - vàng, `Chờ xử lý` - xám, `Đã hết hạn`), Dòng thông tin tiến độ (số buổi/số ngày) và Thanh tiến độ (Progress bar) |
| **Thông tin PT phụ trách trên thẻ** | `Badge / Text label` | `READONLY` | conditional | `CONDITIONAL`: Phụ thuộc vào loại gói tập | - **Hiện khi:** Gói tập là gói `PT` hoặc `Combo (Gym + PT)`. Nếu đã có HLV hiển thị `PT: [Tên HLV]` (màu xanh lục); nếu chưa có HLV hiển thị `PT: Chưa chọn` (màu xám).<br>- **Ẩn khi:** Gói tập là gói `Gym` thuần (không sử dụng PT). |
| **Nút CTA [ Chọn PT phụ trách ]** | `Button / CTA` | `USER-INPUT` | conditional | `CONDITIONAL`: Phụ thuộc vào loại gói và trạng thái gán PT | - **Hiện khi:** Gói tập là `PT` hoặc `Combo`, trạng thái đang sử dụng và `PT: Chưa chọn`. Nút màu đen chữ trắng, bấm để chuyển sang màn hình Chọn PT (`HV03-US04`).<br>- **Ẩn khi:** Gói tập đã có PT phụ trách, gói Gym thuần, hoặc gói ở trạng thái Chờ xử lý / Đã hết hạn. |
| **Tiêu đề khối Lịch sử thanh toán** | `Typography / Heading` | `READONLY` | required | Không | Header cố định bên dưới danh sách gói: `Lịch sử thanh toán` kèm phụ đề `Các giao dịch mua và thanh toán gói của bạn.` và icon phiếu thu |
| **Thẻ giao dịch thanh toán (Payment Card)** | `Card list item` | `READONLY` | optional | `DYNAMIC`: Lấy từ lịch sử phiếu thu 100% của hội viên | Hiển thị danh sách phiếu thu: Mã phiếu thu (`PT00125`), Số tiền 100% (`3.200.000 đ`), Tên gói & ngày thanh toán, Phương thức (`Chuyển khoản`), Badge trạng thái (`Đã xác nhận`) |

## Alternate Flows

### AF-01 — Không có gói ở bộ lọc đã chọn
1. Hội viên chọn một Chip lọc trạng thái không có gói nào.
2. SYS hiển thị màn hình rỗng (Empty state) kèm thông báo: `Bạn chưa có gói tập nào ở trạng thái này`.

### AF-02 — Bấm chọn PT phụ trách từ Card gói
1. Hội viên thấy gói Combo/PT có nút `[ Chọn PT phụ trách ]` và bấm chọn.
2. SYS chuyển hướng sang màn hình Chọn PT (`HV03-US04`) với thông tin gói đã được prefill.

## Exception Flows

- Không hiển thị gói tập thuộc tài khoản khác.
- Lỗi kết nối mạng: SYS hiển thị thông báo không thể nạp danh sách gói và cho phép bấm tải lại.

## Activity Diagram — Swimlane
**Trigger:** Hội viên mở tab Gói của tôi (HV03) và chọn sub-tab Gói của tôi.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App Hội viên / HV03 · Gói của tôi"]
    subgraph L0["Swimlane — Hội viên"]
      I01(("Initial"))
      A01["Mở tab HV03 và chọn sub-tab Gói của tôi"]
      A02["Chọn Chip lọc trạng thái (Đang sử dụng, Chờ xử lý, Đã hết hạn)"]
      D01{"Hội viên bấm thao tác nào?"}
      A03["Bấm nút [ Chọn PT phụ trách ] trên Card gói chưa có PT"]
      A04["Xem thông tin và tiến độ gói tập"]
      F01((("Final — Chuyển sang HV03-US04 Chọn PT")))
      F02((("Final — Kết thúc xem gói của tôi")))

      I01 --> A01
      D01 -->|Chọn PT phụ trách| A03 --> F01
      D01 -->|Chỉ xem thông tin| A04 --> F02
    end

    subgraph L1["Swimlane — SYS"]
      S01["Nạp danh sách các đơn đăng ký gói tập (Registrations) của Hội viên"]
      S02["Hiển thị Chip lọc trạng thái và nạp danh sách các Card gói tập"]
      S03["Hiển thị Tên gói, Tiến độ (số buổi/số ngày), Progress bar, Badge status và thông tin PT"]
      S04["Hiển thị nút CTA [ Chọn PT phụ trách ] nếu gói PT/Combo chưa chọn HLV"]

      A01 --> S01 --> S02
      A02 --> S03 --> S04 --> D01
      S02 --> A02
    end
  end
```

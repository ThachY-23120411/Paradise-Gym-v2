# HV01-US01 - Xem tổng quan và thao tác nhanh

## Preconditions
- Hội viên đã đăng nhập ứng dụng Mobile bằng tài khoản hợp lệ.
- Hệ thống xác định đúng hồ sơ hội viên hiện hành và nạp dữ liệu snapshot cá nhân.

## Trigger
- Hội viên mở ứng dụng Mobile hoặc chọn tab footer `HV01 · Trang chủ`.
- Màn hình liên quan: Mobile App — Tab footer `HV01 · Trang chủ`.

## Main Flow

1. Hội viên mở tab **HV01 · Trang chủ**.
2. Hệ thống tải dữ liệu tổng hợp cá nhân của chính Hội viên:
   - Hồ sơ cá nhân (Họ và tên).
   - Yêu cầu chọn PT đang chờ phản hồi (nếu có).
   - Buổi tập sắp diễn ra gần nhất (nếu có).
3. Hệ thống hiển thị giao diện Trang chủ gồm 4 khối thẻ trực quan:
   - **Khối 1 — Lời chào:** Lời chào thân thiện kèm họ tên Hội viên.
   - **Khối 2 — Trạng thái việc cần xử lý:**
     - Nếu có yêu cầu PT đang chờ phản hồi (`PENDING`): Hiển thị thẻ màu vàng cam (amber) kèm tên HLV và nút `[ Xem yêu cầu PT ]`.
     - Nếu không có: Hiển thị thẻ màu xanh lá (green) thông báo không có việc tồn đọng.
   - **Khối 3 — Lịch sắp tới:**
     - Nếu có buổi tập sắp tới: Hiển thị thời gian (ngày, giờ), tên HLV, tên gói tập kèm nút `[ Xem lịch của tôi ]`.
     - Nếu chưa có: Hiển thị dòng chữ *"Chưa có lịch sắp tới"* kèm nút `[ Xem lịch của tôi ]`.
   - **Khối 4 — Thao tác nhanh quản lý gói tập:** Hiển thị 2 nút điều hướng `[ Mua gói ]` và `[ Gói của tôi ]`.
4. Hội viên bấm chọn một trong các nút thao tác nhanh để chuyển sang chức năng chuyên sâu tương ứng:
   - Bấm `[ Xem yêu cầu PT ]`: Điều hướng sang `HV03 · Gói của tôi` (sub-tab Yêu cầu PT).
   - Bấm `[ Xem lịch của tôi ]`: Điều hướng sang `HV02 · Lịch tập` (sub-tab Lịch của tôi).
   - Bấm `[ Mua gói ]`: Điều hướng sang `HV03 · Gói của tôi` (sub-tab Mua gói).
   - Bấm `[ Gói của tôi ]`: Điều hướng sang `HV03 · Gói của tôi` (sub-tab Gói của tôi).

- **Business rules / logic:**
  - Trang chủ chỉ đọc dữ liệu tổng hợp và đóng vai trò điều hướng nhanh; tuyệt đối không hỗ trợ đặt lịch, hủy lịch, thanh toán hoặc chỉnh sửa thông tin trực tiếp trên màn hình này.
  - Toàn bộ dữ liệu hiển thị (yêu cầu PT, lịch tập, gói) bắt buộc phải thuộc quyền sở hữu của Hội viên đang đăng nhập; tuyệt đối không hiển thị nhầm dữ liệu của hội viên khác.

### Field-level specification — Màn hình HV01 · Trang chủ
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Lời chào hội viên** | `Typography / Heading` | `READONLY` | required | Không | Hiển thị: *"Xin chào, [Họ và tên Hội viên]"* (ví dụ: *Xin chào, Trần Thị Bình*) |
| **Tiêu đề câu hỏi tương tác** | `Typography / Heading` | `READONLY` | required | Không | Dòng chữ tiêu đề: *"Hôm nay bạn muốn làm gì?"* (font size 20px, bold) |
| **Mô tả định hướng** | `Typography / Paragraph` | `READONLY` | required | Không | Dòng chữ mô tả: *"Trang tổng quan để bạn biết việc cần làm và đi nhanh đến đúng chức năng."* |
| **Icon trạng thái việc cần làm** | `Icon indicator` | `READONLY` | required | `DYNAMIC`: Đổi màu và icon theo trạng thái | Icon đồng hồ `clock` màu vàng amber (khi có yêu cầu chờ) hoặc icon tích `check` màu xanh green (khi rảnh) |
| **Tiêu đề việc cần xử lý** | `Typography / Subtitle` | `READONLY` | required | `DYNAMIC`: Đổi nội dung theo trạng thái | - Khi có yêu cầu PT chờ: *"Yêu cầu PT đang chờ phản hồi"*<br>- Khi không có việc: *"Không có việc cần xử lý"* |
| **Mô tả chi tiết việc cần xử lý** | `Typography / Text` | `READONLY` | required | `DYNAMIC`: Đổi nội dung theo trạng thái | - Khi có yêu cầu PT chờ: *"[Tên HLV] đang xem yêu cầu chọn PT của bạn."*<br>- Khi không có: *"Bạn có thể mua gói mới hoặc đặt một buổi trong lịch PT."* |
| **Nút [ Xem yêu cầu PT ]** | `Button / CTA` | `USER-INPUT` | conditional | `CONDITIONAL`: Phụ thuộc có yêu cầu chọn PT đang chờ duyệt hay không | - **Hiện khi:** Hội viên có yêu cầu chọn PT ở trạng thái `PENDING`.<br>- **Ẩn khi:** Không có yêu cầu PT nào đang chờ duyệt.<br>- Thao tác: Bấm để điều hướng sang `HV03` (sub-tab Yêu cầu PT). |
| **Nhãn Thẻ Lịch sắp tới** | `Badge / Text label` | `READONLY` | required | Không | Đoạn text nhãn khối: *"Lịch sắp tới"* |
| **Thời gian buổi tập sắp tới** | `Typography / Text` | `READONLY` | required | `DYNAMIC`: Đổi nội dung theo dữ liệu lịch | - Khi có buổi tập sắp diễn ra: Hiển thị *"[Ngày] · [Khung giờ]"* (ví dụ: *18/10/2026 · 08:00 - 10:00*)<br>- Khi không có: Hiển thị *"Chưa có lịch sắp tới"* |
| **Thông tin chi tiết buổi tập** | `Typography / Text` | `READONLY` | conditional | `CONDITIONAL`: Phụ thuộc có buổi tập sắp diễn ra hay không | - **Hiện khi:** Có buổi tập sắp diễn ra (hiển thị *"[Tên HLV] · [Tên gói tập]"*).<br>- **Ẩn khi:** Chưa có lịch sắp tới. |
| **Nút [ Xem lịch của tôi ]** | `Button / Secondary` | `USER-INPUT` | required | Không | Nút secondary bo góc viền; bấm để điều hướng sang `HV02 · Lịch tập` |
| **Tiêu đề Thẻ Quản lý gói tập** | `Typography / Subtitle` | `READONLY` | required | Không | Đoạn text: *"Quản lý gói tập"* |
| **Mô tả Thẻ Quản lý gói tập** | `Typography / Text` | `READONLY` | required | Không | Đoạn text: *"Mua gói, xem tiến độ sử dụng và quản lý PT phụ trách."* |
| **Nút [ Mua gói ]** | `Button / Primary CTA` | `USER-INPUT` | required | Không | Nút primary màu xanh lá; bấm để điều hướng sang `HV03 · Gói của tôi` (sub-tab Mua gói) |
| **Nút [ Gói của tôi ]** | `Button / Secondary` | `USER-INPUT` | required | Không | Nút secondary bo góc; bấm để điều hướng sang `HV03 · Gói của tôi` (sub-tab Gói của tôi) |

## Alternate Flows

### AF-01 — Không có việc cần xử lý
1. Hội viên không có yêu cầu chọn PT nào đang chờ phản hồi.
2. SYS hiển thị thẻ tích xanh trạng thái rảnh rỗi và ẩn nút `[ Xem yêu cầu PT ]`.

### AF-02 — Chưa có lịch tập sắp tới
1. Hội viên chưa có buổi tập nào được đặt trong tương lai.
2. SYS hiển thị dòng chữ *"Chưa có lịch sắp tới"*, ẩn dòng chi tiết HLV/gói tập và giữ nguyên nút `[ Xem lịch của tôi ]`.

## Exception Flows

- **Lỗi không tải được dữ liệu:** Mất kết nối máy chủ $ightarrow$ SYS hiển thị thông báo lỗi mạng và không hiển thị dữ liệu cũ dạng sai lệch.
- **Không tìm thấy hồ sơ hội viên:** Phiên làm việc hết hạn $ightarrow$ SYS tự động chuyển hướng về màn hình Đăng nhập (`HV06-US01`).

## Activity Diagram — Swimlane
**Trigger:** Hội viên mở tab HV01 · Trang chủ.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App Hội viên / HV01 · Trang chủ"]
    subgraph L0["Swimlane — Hội viên"]
      I01(("Initial"))
      A01["Mở tab HV01 · Trang chủ"]
      A02["Xem các khối thông tin tổng quan trên Dashboard"]
      D01{"Hội viên bấm nút điều hướng nào?"}
      
      A03["Bấm nút [ Xem yêu cầu PT ]"]
      A04["Bấm nút [ Xem lịch của tôi ]"]
      A05["Bấm nút [ Mua gói ]"]
      A06["Bấm nút [ Gói của tôi ]"]
      A07["Tiếp tục xem trang chủ, không bấm nút"]

      F01((("Final — Điều hướng sang HV03 · Yêu cầu PT")))
      F02((("Final — Điều hướng sang HV02 · Lịch tập")))
      F03((("Final — Điều hướng sang HV03 · Mua gói")))
      F04((("Final — Điều hướng sang HV03 · Gói của tôi")))
      F05((("Final — Duy trì tại màn hình HV01")))

      I01 --> A01
      A02 --> D01
      D01 -->|Xem yêu cầu PT| A03 --> F01
      D01 -->|Xem lịch của tôi| A04 --> F02
      D01 -->|Mua gói| A05 --> F03
      D01 -->|Gói của tôi| A06 --> F04
      D01 -->|Không thao tác| A07 --> F05
    end

    subgraph L1["Swimlane — SYS"]
      S01["Xác thực phiên làm việc và tra cứu hồ sơ Hội viên"]
      D02{"Tải snapshot dữ liệu thành công?"}
      E01["Báo lỗi kết nối; giữ an toàn dữ liệu"]
      
      S02["Nạp thông tin lời chào hội viên"]
      S03["Kiểm tra trạng thái yêu cầu PT đang chờ"]
      S04["Tra cứu buổi tập sắp diễn ra gần nhất"]
      
      S05["Hiển thị thẻ Việc cần làm (có/không yêu cầu chờ)"]
      S06["Hiển thị thẻ Lịch sắp tới (có/chưa có lịch)"]
      S07["Hiển thị thẻ Thao tác nhanh quản lý gói tập"]

      A01 --> S01 --> D02
      D02 -- "Thất bại" --> E01
      D02 -- "Thành công" --> S02
      S02 --> S03 --> S04 --> S05 --> S06 --> S07 --> A02
    end
  end
```\n
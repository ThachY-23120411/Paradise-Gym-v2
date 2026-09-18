# HV03-US02 - Xem chi tiết và quyền lợi gói đang bán

## Preconditions
- Hội viên đã đăng nhập Mobile bằng tài khoản hợp lệ.
- Hệ thống đã có danh mục các gói tập đang mở bán (`Active`).

## Trigger
- Hội viên chọn sub-tab `Mua gói` trên menu `HV03 · Gói của tôi` và bấm `Xem chi tiết` trên một Package Card.
- Màn hình liên quan: Mobile App — Tab `HV03 · Gói của tôi`, sub-tab `Mua gói`, màn hình Chi tiết gói.

## Main Flow

1. Hội viên chọn sub-tab **Mua gói** trên menu **HV03 · Gói của tôi**.
2. SYS tự động nạp và hiển thị danh sách các gói tập đang mở bán (Active).
3. Hội viên chọn một gói tập và bấm **`Xem chi tiết`** trên Package Card.
4. SYS nạp và hiển thị màn hình Chi tiết gói tập bao gồm:
   - **Tên gói tập**: Ví dụ `Gói Gym 3 tháng`, `Gói PT 20 buổi`, `Combo Gym 6 tháng + PT 20 buổi`.
   - **Giá niêm yết (100%)**: Giá tiền chính xác cần thanh toán.
   - **Thời hạn / Số buổi**: Thời gian hiệu lực (ví dụ 90 ngày) hoặc số buổi tập PT khả dụng.
   - **Phạm vi chi nhánh**: Danh sách chi nhánh được phép tập luyện (Toàn hệ thống hoặc Chi nhánh cụ thể).
   - **Quyền lợi chọn PT**: Nếu là gói PT hoặc Combo, hiển thị rõ quyền chọn HLV cá nhân sau khi mua.
5. Hội viên bấm nút CTA **`[ Mua gói ]`** để chuyển sang màn hình Khởi tạo thanh toán (`HV03-US03`).

- **Business rules / logic:**
  - Tab `Mua gói` mặc định chỉ hiển thị các gói tập đang ở trạng thái mở bán (`Active`), hệ thống không hiển thị các gói đã ngưng bán hoặc bị ẩn.
  - Giá tiền và quyền lợi hiển thị là giá cố định (100%), không có bớt giá hay giảm giá.
  - Bấm nút `[ Xem chi tiết ]` sẽ mở Modal/Bottom sheet hiển thị toàn diện quyền lợi gói.
  - Bấm nút `[ Mua gói ]` sẽ chuyển trực tiếp sang Màn hình Khởi tạo thanh toán VietQR (`HV03-US03`).

### Field-level specification — Sub-tab Mua gói
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tiêu đề khối Mua gói tập** | `Typography / Heading` | `READONLY` | required | Không | Nhãn tiêu đề cố định: `Mua gói tập` kèm phụ đề `Chọn gói phù hợp, sau đó thanh toán trực tuyến.` |
| **Thẻ gói đang bán (Package Sale Card)** | `Card list item` | `READONLY` | required | `DYNAMIC`: Danh sách các gói tập đang mở bán (`Active`) | Mỗi thẻ bao gồm: Tên gói tập (chữ đậm), Giá niêm yết 100% (màu xanh lục, ví dụ `500.000 đ`), Dòng thông tin tóm tắt thời hạn / số lượt (ví dụ `30 ngày · Không giới hạn lượt`) |
| **Nút [ Xem chi tiết ] trên thẻ** | `Button / Secondary` | `USER-INPUT` | required | Không | Nút nền xám đậm bo góc chữ trắng trên từng Card gói; bấm để mở Modal/Bottom Sheet Chi tiết gói |
| **Nút CTA [ Mua gói ] trên thẻ** | `Button / Primary CTA` | `USER-INPUT` | required | Không | Nút nền xanh lá bo góc chữ trắng trên từng Card gói; bấm để chuyển trực tiếp sang Màn hình Thanh toán VietQR (`HV03-US03`) |

### Field-level specification — Modal Chi tiết gói tập
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tên gói tập** | `Typography / Heading` | `PREFILL` + `READONLY` | required | Không | Tên gói tập được chọn (ví dụ: `Gói PT 20 buổi`, `Combo Gym 6 tháng + PT 20 buổi`) |
| **Giá niêm yết (100%)** | `Badge / Price tag` | `PREFILL` + `READONLY` | required | Không | Giá tiền chính xác 100% của gói (ví dụ: `5.000.000 đ`) |
| **Thời hạn / Số buổi tập** | `Typography / Text` | `PREFILL` + `READONLY` | required | `DYNAMIC`: Theo loại gói | Hiển thị thời hạn sử dụng (ví dụ `90 ngày`) hoặc tổng số buổi tập PT khả dụng (ví dụ `20 buổi`) |
| **Phạm vi chi nhánh áp dụng** | `Badge / Text label` | `PREFILL` + `READONLY` | required | Không | Danh sách chi nhánh áp dụng: `Toàn hệ thống` HOẶC chi nhánh cụ thể |
| **Quyền lợi phân công PT** | `Typography / Text` | `PREFILL` + `READONLY` | conditional | `CONDITIONAL`: Phụ thuộc loại gói | - **Hiện khi:** Gói là `PT` hoặc `Combo`, hiển thị: `Được tự chọn HLV cá nhân sau khi thanh toán`.<br>- **Ẩn khi:** Gói là `Gym` thuần. |
| **Mô tả chi tiết quyền lợi** | `Typography / Paragraph` | `PREFILL` + `READONLY` | optional | Không | Đoạn văn bản mô tả các tiện ích đi kèm (tủ locker, phòng tắm, khăn tập, đo InBody miễn phí...) |

## Alternate Flows

### AF-01 — Không mua gói sau khi xem
1. Hội viên xem chi tiết gói nhưng không bấm nút `[ Mua gói ]`.
2. Hội viên bấm nút Quay lại (Back) để quay về sub-tab `Mua gói`.

## Exception Flows

- Lỗi kết nối mạng: SYS hiển thị thông báo không nạp được chi tiết gói và cho phép bấm thử lại.

## Activity Diagram — Swimlane
**Trigger:** Hội viên chọn sub-tab Mua gói và bấm Xem chi tiết trên một Package Card.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App Hội viên / HV03 · Chi tiết gói đang bán"]
    subgraph L0["Swimlane — Hội viên"]
      I01(("Initial"))
      A01["Chọn sub-tab Mua gói"]
      A02["Chọn Xem chi tiết trên Package Card"]
      A03["Xem chi tiết Tên gói, Giá 100%, Thời hạn/Số buổi, Chi nhánh và Quyền chọn PT"]
      D01{"Hội viên bấm nút Mua gói?"}
      A04["Chuyển sang HV03-US03 Mua gói & Thanh toán"]
      F01((("Final — Chuyển sang thanh toán")))
      F02((("Final — Kết thúc xem chi tiết")))

      I01 --> A01
      A03 --> D01
      A02 --> A03
      D01 -->|Có| A04 --> F01
      D01 -->|Không| F02
    end

    subgraph L1["Swimlane — SYS"]
      S01["Nạp danh sách các gói tập đang mở bán (Active)"]
      S02["Hiển thị thông tin chi tiết Tên gói, Giá tiền 100%, Thời hạn/Số buổi, Phạm vi chi nhánh và Quyền chọn PT"]

      A01 --> S01
      S01 --> S02
      S02 --> A02
    end
  end
```
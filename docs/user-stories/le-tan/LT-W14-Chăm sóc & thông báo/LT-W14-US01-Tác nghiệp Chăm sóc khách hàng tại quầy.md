# LT-W14-US01 - Tác nghiệp Chăm sóc khách hàng tại quầy

## Preconditions
- Lễ tân đã đăng nhập vào Web Portal, làm việc tại chi nhánh quầy tiếp đón.
- Hệ thống có danh sách hội viên sinh nhật trong ngày và gói sắp hết hạn tại chi nhánh.

## Trigger
- Lễ tân chọn menu **W14 · Chăm sóc & thông báo** hoặc bấm khối CSKH tại Dashboard W01.
- Màn hình liên quan: Web Lễ tân — Màn hình `W14 · Chăm sóc & thông báo`.

## Main Flow

1. Lễ tân truy cập màn hình **Chăm sóc & thông báo**.
2. SYS hiển thị danh sách tác nghiệp tại chi nhánh qua Hàng 4 Thẻ KPI và 4 Tab tương ứng 1-1:
   - **Sinh nhật hôm nay:** Các hội viên có sinh nhật hôm nay để lễ tân chuẩn bị quà/lời chúc khi khách đến check-in hoặc gọi điện chúc mừng.
   - **Sắp hết hạn (<= 4 ngày):** Danh sách khách hàng cận hạn cần gọi điện tư vấn gia hạn tiếp tục thu tiền.
   - **Chờ nhắc gia hạn (14 ngày qua):** Danh sách khách hàng vừa hết hạn chưa mua tiếp cần liên hệ giữ chân / tái ký gói.
   - **Đăng ký mới hôm nay:** Danh sách hợp đồng tạo mới trong ngày tại chi nhánh.
3. Lễ tân bấm vào Thẻ KPI bất kỳ để chuyển nhanh đến Tab tác nghiệp tương ứng.
4. Lễ tân bấm nút **`Gọi`** để mở modal ghi nhận kết quả tư vấn và cập nhật trạng thái đã liên hệ.

### Field-level specification — Màn hình Chăm sóc & thông báo Lễ tân (W14)
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Thẻ KPI Sinh nhật hôm nay | `Metric Card` | `READONLY` | required | `DYNAMIC` | Số lượng hội viên sinh nhật trong ngày; click chuyển sang Tab Sinh nhật |
| Thẻ KPI Sắp hết hạn (<= 4 ngày) | `Metric Card` | `READONLY` | required | `DYNAMIC` | Số gói cận hạn; click chuyển sang Tab Sắp hết hạn |
| Thẻ KPI Chờ nhắc gia hạn (14 ngày qua) | `Metric Card` | `READONLY` | required | `DYNAMIC` | Số gói hết hạn 1-14 ngày chưa mua tiếp; click chuyển sang Tab Chờ nhắc gia hạn |
| Thẻ KPI Đăng ký mới hôm nay | `Metric Card` | `READONLY` | required | `DYNAMIC` | Số hợp đồng đăng ký mới trong ngày; click chuyển sang Tab Đăng ký mới |
| Thanh điều hướng Tab | `Tab Bar (dxTabs)` | `USER-INPUT` | required | `TRIGGER` | 4 tab tác nghiệp: Sinh nhật, Sắp hết hạn, Chờ nhắc gia hạn, Đăng ký mới |
| Nút Chúc mừng / Nhắc hạn | `Action Button` | `USER-INPUT` | optional | `Không` | Bấm gửi thông báo in-app tự động cho hội viên |
| Nút Gọi / Ghi nhận CSKH | `Action Button` | `USER-INPUT` | optional | `Không` | Mở modal nhập kết quả gọi điện và lưu ghi chú CSKH |
| Nút Gia hạn / Tái ký gói | `Action Button` | `USER-INPUT` | optional | `Không` | Mở điều hướng tạo đơn gia hạn hoặc đăng ký gói mới |

## Alternate Flows
- Hội viên đồng ý gia hạn: Lễ tân bấm `Tạo gia hạn` để lập tức mở modal tạo đơn gia hạn và thu tiền 100% tại quầy.

## Exception Flows
- Không liên lạc được với khách: Lễ tân chọn trạng thái `Không nghe máy` để hệ thống xếp lịch nhắc gọi lại sau.

## Activity Diagram — Swimlane
**Trigger:** Lễ tân mở menu W14 · Chăm sóc & thông báo.

```mermaid
flowchart TB
  subgraph B["Boundary — Web Lễ tân W14 / Chăm sóc & thông báo"]
    subgraph L0["Swimlane — Lễ tân"]
      I01(("Initial"))
      A01["Truy cập menu W14 · Chăm sóc & thông báo"]
      A02["Xem danh sách khách sinh nhật và sắp hết hạn"]
      A03["Bấm nút Gọi điện và Ghi nhận liên hệ"]
      F01((("Final — Lưu kết quả chăm sóc khách hàng")))
    end

    subgraph L1["Swimlane — SYS"]
      S01["Truy vấn hội viên sinh nhật hôm nay và gói sắp hết hạn tại chi nhánh"]
      S02["Hiển thị danh sách tác nghiệp CSKH"]
      S03["Lưu kết quả trao đổi và cập nhật trạng thái đã liên hệ"]

      I01 --> A01 --> S01 --> S02 --> A02 --> A03 --> S03 --> F01
    end
  end
```

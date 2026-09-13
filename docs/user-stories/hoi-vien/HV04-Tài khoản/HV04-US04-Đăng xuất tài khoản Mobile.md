# HV04-US04 - Đăng xuất tài khoản Mobile

## Preconditions
- Hội viên đang đăng nhập và có phiên truy cập (session) Mobile hợp lệ.

## Trigger

- Hội viên bấm `Đăng xuất tài khoản` trong `HV04 · Tài khoản`.

## Main Flow

1. Hội viên chọn đăng xuất.
2. Hệ thống kết thúc session hiện tại.
3. Hệ thống xóa trạng thái đăng nhập trên Mobile.
4. Hệ thống hiển thị lại màn hình đăng nhập.
5. **Quy tắc nghiệp vụ:** Đăng xuất chỉ kết thúc phiên, không vô hiệu hóa account; lần đăng nhập sau phải xác thực lại theo credential/OTP phù hợp.

## Alternate Flows

### AF-01

- Hội viên hủy thao tác trước khi xác nhận nếu UI hiển thị bước xác nhận.

### AF-02

- Nếu session đã hết hạn, hệ thống đưa về màn hình đăng nhập mà không lộ dữ liệu cũ.

## Exception Flows

- Không xóa hồ sơ, gói, payment hoặc booking khi đăng xuất.
- Không giữ dữ liệu riêng tư trên màn hình sau khi session kết thúc.

## Activity Diagram — Swimlane

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App Hội viên / HV04 · Đăng xuất"]
    subgraph L0["Swimlane — Hội viên"]
      I01(("Initial"))
      A01["Bấm Đăng xuất tài khoản"]
      D01{"Hội viên xác nhận đăng xuất?"}
      A02["Hủy thao tác và giữ phiên hiện tại"]
      F01((("Final")))

      I01 --> A01
      A01 --> D01
      D01 -->|Không| A02
      A02 --> F01
    end

    subgraph L1["Swimlane — SYS"]
      S01["Kiểm tra session hiện tại"]
      D02{"Session còn hiệu lực?"}
      S02["Thu hồi/kết thúc session hiện tại"]
      S03["Xóa trạng thái đăng nhập trên Mobile"]
      S04["Đưa về màn hình đăng nhập và không lộ dữ liệu cũ"]
      S05["Hiển thị màn hình đăng nhập"]

      D01 -->|Có| S01
      S01 --> D02
      D02 -->|Còn hiệu lực| S02
      S02 --> S03
      S03 --> S05
      D02 -->|Đã hết hạn| S04
      S04 --> F01
      S05 --> F01
    end
  end
```
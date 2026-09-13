# HV04-US01 - Đăng nhập tài khoản Hội viên

## Preconditions
- Hội viên đã cài đặt ứng dụng Mobile Paradise Gym.
- Hội viên đã có tài khoản với số điện thoại đã xác minh (không bị khóa hay vô hiệu hóa).

## Trigger
- Hội viên mở ứng dụng khi chưa đăng nhập và nhập số điện thoại/mật khẩu.
- Màn hình liên quan: Mobile App — Màn hình Đăng nhập.

## Main Flow

1. Hệ thống hiển thị form Đăng nhập.
2. Hội viên nhập số điện thoại và mật khẩu.
3. Hội viên bấm nút `[ ĐĂNG NHẬP ]`.
4. SYS xác thực thông tin đăng nhập (credential) và trạng thái tài khoản.
5. SYS khởi tạo phiên truy cập (Session Mobile) và mở màn hình `HV01 · Trang chủ`.

### Field-level specification — Form Đăng nhập
| Field / control | State | Required | Conditional / dynamic | Source / validation |
|---|---|---|---|---|
| Số điện thoại | `USER-INPUT` | required | `DYNAMIC`: nhập SĐT đăng ký | SĐT tài khoản Hội viên |
| Mật khẩu | `USER-INPUT` | required | `DYNAMIC`: nhập mật khẩu cá nhân | Mật khẩu tài khoản |
| Nút `[ ĐĂNG NHẬP ]` | `USER-INPUT` | required | `CONDITIONAL`: bấm để gửi xác thực | Thao tác trên Mobile |
| Nút `[ Tạo tài khoản ngay ]` | `USER-INPUT` | optional | `DYNAMIC`: bấm để chuyển sang luồng tạo/kích hoạt tài khoản | Điều hướng sang HV04-US02 |

- **Business rules / logic:**
  - Số điện thoại đăng nhập là duy nhất cho một tài khoản Hội viên.
  - Không lưu trữ mật khẩu hoặc mã OTP trong nhật ký audit hệ thống.

## Alternate Flows

### AF-01 — Nhập sai mật khẩu hoặc SĐT
1. Hội viên nhập sai thông tin tài khoản hoặc mật khẩu.
2. SYS giữ nguyên màn hình đăng nhập và hiển thị thông báo lỗi: `Số điện thoại hoặc mật khẩu không chính xác`.

### AF-02 — Tài khoản chưa tồn tại hoặc chưa kích hoạt
1. SĐT nhập vào thuộc trường hợp chưa có tài khoản hoặc có hồ sơ tại quầy chưa kích hoạt.
2. SYS thông báo và hướng dẫn chọn `[ Tạo tài khoản ngay ]` để sang luồng `HV04-US02`.

## Exception Flows

- Lỗi kết nối mạng: SYS hiển thị thông báo lỗi mạng và không khởi tạo phiên đăng nhập.

## Activity Diagram — Swimlane
**Trigger:** Hội viên mở ứng dụng và thực hiện đăng nhập.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App Hội viên / HV04 · Đăng nhập"]
    subgraph L0["Swimlane — Hội viên"]
      I01(("Initial"))
      A01["Mở ứng dụng khi chưa đăng nhập"]
      A02["Nhập SĐT, mật khẩu và bấm ĐĂNG NHẬP"]
      A03["Chọn Tạo tài khoản ngay hoặc kích hoạt"]
      F01((("Final — Mở ứng dụng thành công")))
      F02((("Final — Chuyển sang Tạo/Kích hoạt tài khoản")))
      F03((("Final — Đăng nhập không thành công")))

      I01 --> A01
      A03 --> F02
    end

    subgraph L1["Swimlane — SYS"]
      S01["Hiển thị form Đăng nhập"]
      S02["Chuẩn hóa SĐT và xác thực credential/trạng thái account"]
      D01{"Credential và trạng thái account hợp lệ?"}
      S03["Tạo session Mobile theo scope Hội viên"]
      S04["Mở HV01 · Trang chủ"]
      D02{"Account chờ kích hoạt hoặc chưa tồn tại?"}
      S05["Giữ màn hình đăng nhập và hiển thị lỗi"]

      A01 --> S01 --> A02 --> S02 --> D01
      D01 -- "Có" --> S03 --> S04 --> F01
      D01 -- "Không" --> D02
      D02 -- "Có" --> A03
      D02 -- "Không" --> S05 --> F03
    end
  end
```
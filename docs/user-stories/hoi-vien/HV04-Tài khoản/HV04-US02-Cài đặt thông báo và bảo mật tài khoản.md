# HV04-US02 - Cài đặt thông báo và bảo mật tài khoản

## Preconditions
- Hội viên đã đăng nhập Mobile bằng tài khoản hợp lệ.
- Hội viên truy cập tab `HV04 · Tài khoản` và chọn mục `Cài đặt & Bảo mật`.

## Trigger
- Hội viên bấm chọn mục `Cài đặt thông báo & Bảo mật` tại màn hình Tài khoản.
- Màn hình liên quan: Mobile App — Tab `HV04 · Tài khoản`, màn hình Cài đặt thông báo và bảo mật.

## Main Flow

1. Hệ thống hiển thị các tùy chọn thông báo và cấu hình bảo mật tài khoản hiện tại.
2. Hội viên điều chỉnh các công tắc bật/tắt (Toggle Switch):
   - Nhận thông báo In-app: Bật/Tắt.
   - Nhắc lịch PT tự động trước giờ tập: Bật/Tắt.
   - Xác thực 2 lớp (2FA khi đăng nhập): Bật/Tắt (Khi bật, mỗi lần đăng nhập bằng mật khẩu sẽ yêu cầu thêm mã OTP gửi về SĐT).
3. Hội viên bấm nút **`[ Lưu cài đặt ]`**.
4. SYS ghi nhận các thay đổi cấu hình bảo mật và tùy chọn thông báo vào tài khoản của Hội viên.

- **Business rules / logic:**
  - Cấu hình Xác thực 2 lớp (2FA) khi được kích hoạt sẽ áp dụng ngay cho tất cả các lần đăng nhập tiếp theo của tài khoản.

### Field-level specification — Màn hình Cài đặt thông báo và bảo mật
| Field / Control | Interaction State | Required | Conditional / Dynamic | Data Source / Validation |
| :--- | :--- | :--- | :--- | :--- |
| **Nhận thông báo in-app** | `USER-INPUT` + `PREFILL` | optional | Không | Toggle Switch (`Bật` / `Tắt`); nhận các thông báo hệ thống, tin tức, lịch tập |
| **Nhắc lịch PT tự động** | `USER-INPUT` + `PREFILL` | optional | Không | Toggle Switch (`Bật` / `Tắt`); nhận thông báo nhắc trước ca tập PT 2 tiếng |
| **Xác thực 2 lớp (2FA khi đăng nhập)** | `USER-INPUT` + `PREFILL` | optional | Không | Toggle Switch (`Bật` / `Tắt`); bắt buộc xác thực mã OTP gửi về SĐT khi đăng nhập mật khẩu |
| **Nút thao tác [ Đổi mật khẩu tài khoản ]** | `USER-INPUT` | optional | Không | Nút điều hướng; bấm để mở Modal Đổi mật khẩu tài khoản |
| **Nút CTA [ Lưu cài đặt ]** | `USER-INPUT` | required | `DYNAMIC`: Enable khi có ít nhất một tùy chọn thay đổi | Nút màu xanh lá bo góc; bấm để lưu cấu hình tùy chọn và bảo mật |

## Alternate Flows

- Không có luồng phụ rẽ nhánh.

## Exception Flows

- Lỗi kết nối mạng: SYS hiển thị thông báo không thể lưu cấu hình và hoàn tác về trạng thái trước khi chỉnh sửa.

## Activity Diagram — Swimlane
**Trigger:** Hội viên chọn Cài đặt thông báo & Bảo mật tại màn hình Tài khoản.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App Hội viên / HV04 · Cài đặt & Bảo mật"]
    subgraph L0["Swimlane — Hội viên"]
      I01(("Initial"))
      A01["Mở màn hình Cài đặt thông báo & Bảo mật"]
      A02["Bật/tắt thông báo In-app hoặc nhắc lịch PT"]
      A03["Bật/tắt Xác thực 2 lớp (2FA)"]
      A04["Bấm nút [ Lưu cài đặt ]"]
      F01((("Final — Cấu hình được lưu thành công")))

      I01 --> A01
      A02 --> A03 --> A04
    end

    subgraph L1["Swimlane — SYS"]
      S01["Nạp trạng thái cài đặt thông báo và bảo mật hiện tại"]
      S02["Cập nhật preference và cấu hình 2FA vào tài khoản"]
      S03["Hiển thị thông báo lưu thành công"]
      S01 --> A02
      A01 --> S01
      A04 --> S02 --> S03 --> F01
    end
  end
```\n
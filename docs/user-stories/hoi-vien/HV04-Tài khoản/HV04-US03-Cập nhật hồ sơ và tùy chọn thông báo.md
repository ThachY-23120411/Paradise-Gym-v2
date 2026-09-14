# HV04-US03 - Cập nhật hồ sơ và tùy chọn thông báo

## Preconditions
- Hội viên đã đăng nhập Mobile bằng tài khoản hợp lệ.
- Hội viên truy cập trang quản lý tài khoản cá nhân.

## Trigger
- Hội viên mở `HV04 · Tài khoản` và chọn `Cập nhật hồ sơ` hoặc thay đổi preference.
- Màn hình liên quan: Mobile App — Tab `HV04 · Tài khoản`, màn hình Hồ sơ & Cài đặt thông báo.

## Main Flow

1. Hệ thống hiển thị thông tin hồ sơ được phép xem/sửa và các tùy chọn thông báo.
2. Hội viên cập nhật các trường cá nhân được phép (Họ tên, Email, Ngày sinh, Ảnh đại diện) hoặc bật/tắt nhận thông báo in-app/nhắc lịch PT.
3. Nếu Hội viên thay đổi SĐT đăng ký, SYS kiểm tra SĐT mới chưa tồn tại và gửi mã OTP xác nhận.
4. Hội viên bấm `[ Xác nhận lưu ]`.
5. SYS validate dữ liệu và ghi nhận cập nhật hồ sơ/preference thành công.

### Field-level specification — Form Cập nhật hồ sơ & tùy chọn thông báo
| Field / control | State | Required | Conditional / dynamic | Source / validation |
|---|---|---|---|---|
| Ảnh đại diện | `USER-INPUT` | optional | `DYNAMIC`: cho phép chọn ảnh mới từ thiết bị | Ảnh đại diện Hội viên |
| Họ và tên | `USER-INPUT` + `PREFILL` | required | `DYNAMIC`: prefill từ hồ sơ hiện tại | Profile Hội viên |
| Số điện thoại | `USER-INPUT` + `PREFILL` | optional | `CONDITIONAL`: chỉ yêu cầu OTP khi nhập SĐT mới | SĐT duy nhất |
| Email | `USER-INPUT` + `PREFILL` | optional | `DYNAMIC`: kiểm tra đúng định dạng email | Email |
| Ngày sinh | `USER-INPUT` + `PREFILL` | optional | `DYNAMIC`: chọn ngày sinh | Ngày sinh |
| Nhận thông báo in-app | `USER-INPUT` + `PREFILL` | optional | `DYNAMIC`: Bật/Tắt | Preference thông báo |
| Nhắc lịch PT tự động | `USER-INPUT` + `PREFILL` | optional | `DYNAMIC`: Bật/Tắt | Preference nhắc lịch |
| Nút `[ Xác nhận lưu ]` | `USER-INPUT` | required | `CONDITIONAL`: bấm để lưu thay đổi | Thao tác trên Mobile |

- **Business rules / logic:**
  - Hội viên chỉ được chỉnh sửa thông tin hồ sơ cá nhân của chính mình.
  - Đổi SĐT bắt buộc phải xác minh qua mã OTP và kiểm tra không trùng lặp SĐT trên hệ thống.

## Alternate Flows

### AF-01 — Chỉ thay đổi tùy chọn thông báo (Preference)
1. Hội viên chỉ bật/tắt nhận thông báo mà không sửa thông tin cá nhân.
2. SYS cập nhật cài đặt preference và báo lưu thành công.

## Exception Flows

- SĐT mới đã tồn tại trên hệ thống: SYS báo lỗi và từ chối cập nhật.
- Lỗi kết nối mạng: SYS giữ nguyên dữ liệu chưa lưu và thông báo lỗi.

## Activity Diagram — Swimlane
**Trigger:** Hội viên chọn cập nhật hồ sơ hoặc preference trong HV04.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App Hội viên / HV04 · Hồ sơ và preference"]
    subgraph L0["Swimlane — Hội viên"]
      I01(("Initial"))
      A01["Mở HV04 và chọn Cập nhật hồ sơ / Preference"]
      A02["Chỉnh sửa họ tên, email, ngày sinh hoặc bật/tắt notification"]
      D01{"Hội viên có đổi SĐT mới?"}
      A03["Nhập SĐT mới và nhập mã OTP xác thực"]
      A04["Bấm nút Xác nhận lưu"]
      F01((("Final — Cập nhật hồ sơ/preference thành công")))
      F02((("Final — Cập nhật thất bại")))
    end

    subgraph L1["Swimlane — SYS"]
      S01["Hiển thị dữ liệu profile và preference cá nhân"]
      S02["Chuẩn hóa SĐT mới, kiểm tra duy nhất và gửi mã OTP"]
      D02{"Mã OTP hợp lệ?"}
      E01["Thông báo OTP không hợp lệ hoặc SĐT đã tồn tại"]
      S03["Validate định dạng dữ liệu và cập nhật hồ sơ/preference"]
      D03{"Dữ liệu cập nhật hợp lệ?"}
      E02["Giữ form và hiển thị lỗi validation"]

      I01 --> A01
      A01 --> S01
      S01 --> A02
      A02 --> D01
      D01 -- "Có" --> S02
      S02 --> A03
      A03 --> D02
      D02 -- "Có" --> A04
      D02 -- "Không" --> E01
      E01 --> F02
      D01 -- "Không" --> A04
      A04 --> S03
      S03 --> D03
      D03 -- "Có" --> F01
      D03 -- "Không" --> E02
      E02 --> F02
    end
  end
```

# HV04-US02 - Tạo hoặc kích hoạt tài khoản bằng OTP

## Preconditions
- Người dùng đang ở màn hình Tạo/Kích hoạt tài khoản trên ứng dụng Mobile.
- Số điện thoại thuộc một trong ba trường hợp: đã có tài khoản, có hồ sơ tại quầy chưa kích hoạt tài khoản, hoặc chưa có hồ sơ.

## Trigger
- Người dùng bấm `Chưa có tài khoản? Tạo tài khoản ngay` và nhập số điện thoại.
- Màn hình liên quan: Mobile App — Màn hình Tạo/Kích hoạt tài khoản bằng OTP.

## Main Flow

1. Người dùng nhập số điện thoại đăng ký.
2. SYS chuẩn hóa và tra cứu số điện thoại trên hệ thống:
   - **Trường hợp 1 (SĐT đã có tài khoản)**: SYS thông báo SĐT đã được đăng ký và yêu cầu quay lại màn hình Đăng nhập.
   - **Trường hợp 2 (Đã có hồ sơ tại quầy nhưng chưa có tài khoản)**: SYS hiển thị thông tin hồ sơ khớp để người dùng xác nhận liên kết và tạo mật khẩu mới.
   - **Trường hợp 3 (Chưa có hồ sơ)**: SYS hiển thị form yêu cầu nhập Họ và tên, Email và tạo mật khẩu mới.
3. Người dùng nhập đầy đủ thông tin theo trường hợp của mình và bấm `[ Gửi mã OTP ]`.
4. SYS tự động gửi mã xác thực OTP 6 chữ số tới SĐT đăng ký.
5. Người dùng nhập mã OTP hợp lệ.
6. SYS xác thực OTP, khởi tạo tài khoản `ROLE_MEMBER`, liên kết hồ sơ tương ứng và mở màn hình `HV01 · Trang chủ`.

### Field-level specification — Form Tạo/Kích hoạt tài khoản
| Field / control | State | Required | Conditional / dynamic | Source / validation |
|---|---|---|---|---|
| Số điện thoại đăng ký | `USER-INPUT` | required | `DYNAMIC`: nhập SĐT để tra cứu phân loại | SĐT người dùng |
| Họ và tên | `USER-INPUT` | required | `CONDITIONAL`: chỉ hiển thị với trường hợp chưa có hồ sơ | Người dùng nhập |
| Email | `USER-INPUT` | optional | `CONDITIONAL`: chỉ hiển thị với trường hợp chưa có hồ sơ | Định dạng Email |
| Thông tin hồ sơ khớp | `READONLY` | required | `CONDITIONAL`: chỉ hiển thị khi SĐT khớp hồ sơ tại quầy | Hồ sơ hội viên tại quầy |
| Mật khẩu & Xác nhận mật khẩu | `USER-INPUT` | required | `DYNAMIC`: tạo mật khẩu mới cho tài khoản | Mật khẩu tài khoản |
| Mã xác thực OTP | `USER-INPUT` | required | `CONDITIONAL`: hiển thị sau khi hệ thống gửi OTP | OTP từ tin nhắn SMS/SMS Gateway |

- **Business rules / logic:**
  - SĐT là khóa đăng nhập duy nhất; trường hợp đã có hồ sơ tại quầy phải thực hiện liên kết đúng hồ sơ, không tạo hồ sơ mới trùng lặp.
  - Không lưu mã OTP hoặc mật khẩu dạng rõ trong nhật ký audit hệ thống.

## Alternate Flows

### AF-01 — OTP hết hạn hoặc nhập sai
1. Người dùng nhập sai mã OTP hoặc mã OTP hết thời gian hiệu lực.
2. SYS hiển thị thông báo lỗi và cho phép bấm `[ Gửi lại mã OTP ]` (giới hạn tối đa 3 lần).

## Exception Flows

- Lỗi kết nối mạng: SYS hiển thị thông báo không thể khởi tạo tài khoản và hoàn tác các thao tác dang dở.

## Activity Diagram — Swimlane
**Trigger:** Người dùng bấm Tạo tài khoản ngay và nhập SĐT.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App Hội viên / HV04 · Tạo hoặc kích hoạt tài khoản"]
    subgraph L0["Swimlane — Hội viên"]
      I01(("Initial"))
      A01["Bấm nút Tạo tài khoản ngay"]
      A02["Nhập số điện thoại đăng ký"]
      A03["Xác nhận liên kết hồ sơ đã khớp & Nhập mật khẩu"]
      A04["Nhập họ tên, email & Nhập mật khẩu mới"]
      A05["Nhập mã OTP xác thực"]
      F01((("Final — Tài khoản được tạo/kích hoạt thành công")))
      F02((("Final — SĐT đã có tài khoản (Quay lại Đăng nhập)")))
      F03((("Final — Xác thực OTP thất bại")))

      I01 --> A01 --> A02
    end

    subgraph L1["Swimlane — SYS"]
      S01["Chuẩn hóa và tra cứu số điện thoại"]
      D01{"Phân loại trường hợp số điện thoại?"}
      E01["Thông báo SĐT đã có tài khoản; yêu cầu quay lại Đăng nhập"]
      S02["Hiển thị thông tin hồ sơ tại quầy để xác nhận liên kết"]
      S03["Hiển thị form tạo hồ sơ mới (Họ tên, Email)"]
      S04["Gửi mã OTP xác thực tới SĐT đăng ký"]
      D02{"Mã OTP hợp lệ và còn thời hạn?"}
      E02["Thông báo OTP không hợp lệ hoặc đã hết hạn"]
      S05["Tạo tài khoản ROLE_MEMBER, kích hoạt/tạo hồ sơ & Mở ứng dụng HV01"]

      A02 --> S01 --> D01
      D01 -- "Đã có tài khoản" --> E01 --> F02
      D01 -- "Có hồ sơ tại quầy chưa kích hoạt" --> S02 --> A03 --> S04
      D01 -- "Chưa có hồ sơ" --> S03 --> A04 --> S04
      S04 --> A05 --> D02
      D02 -- "Có" --> S05 --> F01
      D02 -- "Không" --> E02 --> F03
    end
  end
```
# HV06-US01 - Đăng nhập đa phương thức và xác thực 2 lớp

## Preconditions
- Hội viên đã cài đặt ứng dụng Mobile Paradise Gym.
- Hội viên đã có tài khoản hoạt động hợp lệ trên hệ thống (không bị khóa hay vô hiệu hóa).

## Trigger
- Hội viên mở ứng dụng khi chưa đăng nhập hoặc phiên làm việc đã hết hạn.
- Màn hình liên quan: Mobile App — Màn hình Đăng nhập & Màn hình Xác thực 2FA.

## Main Flow

### Trường hợp 1: Đăng nhập bằng Mật khẩu (có kích hoạt Xác thực 2 lớp - 2FA)
1. Hội viên chọn tab **`Bằng Mật khẩu`** trên màn hình Đăng nhập.
2. Hội viên nhập Số điện thoại và Mật khẩu cá nhân.
3. Hội viên bấm nút **`[ ĐĂNG NHẬP ]`**.
4. SYS xác thực SĐT và Mật khẩu (Lớp xác thực 1 thành công).
5. SYS kiểm tra: Tài khoản có bật 2FA hoặc đăng nhập trên thiết bị mới $\rightarrow$ SYS tự động gửi mã xác thực OTP 6 số qua SMS tới SĐT của Hội viên và chuyển sang màn hình **Xác thực 2 lớp (2FA)**.
6. Hội viên nhập đúng 6 chữ số OTP.
7. SYS xác thực mã OTP (Lớp xác thực 2 thành công) $\rightarrow$ Khởi tạo phiên truy cập (Session Mobile) và điều hướng vào màn hình `HV01 · Trang chủ`.

### Trường hợp 2: Đăng nhập bằng Mã OTP (Không dùng mật khẩu)
1. Hội viên chọn tab **`Bằng mã OTP`** trên màn hình Đăng nhập.
2. Hội viên nhập Số điện thoại và bấm **`[ Nhận mã OTP ]`**.
3. SYS gửi mã OTP 6 số tới SĐT qua tin nhắn SMS (thời hạn 60 giây).
4. Hội viên nhập mã OTP nhận được và bấm **`[ Xác nhận đăng nhập ]`**.
5. SYS xác thực mã OTP thành công $\rightarrow$ Khởi tạo session và mở `HV01 · Trang chủ`.

- **Business rules / logic:**
  - **Bảo mật tốt & Chống dò quét (Account Lockout):** Nếu nhập sai mật khẩu hoặc OTP quá 5 lần liên tiếp, hệ thống tự động khóa tạm thời tính năng đăng nhập của tài khoản trong 15 phút.
  - **Thời hạn mã OTP:** Mã OTP có hiệu lực tối đa trong vòng 60 giây; tối đa 3 lần yêu cầu gửi lại mã trong 1 phiên.
  - **Bảo mật dữ liệu:** Tuyệt đối không lưu mật khẩu hoặc mã OTP dạng rõ (plaintext) trong bộ nhớ tạm hoặc nhật ký audit hệ thống.

### Field-level specification — Màn hình Đăng nhập đa phương thức
| Field / Control | Interaction State | Required | Conditional / Dynamic | Data Source / Validation |
| :--- | :--- | :--- | :--- | :--- |
| **Tab chọn phương thức đăng nhập** | `USER-INPUT` | required | `TRIGGER`: Chuyển đổi giữa 2 form nhập | 2 tab lựa chọn: `Bằng Mật khẩu` (mặc định) và `Bằng mã OTP` |
| **Số điện thoại** | `USER-INPUT` | required | Không | Nhập số điện thoại đăng nhập (10 chữ số, định dạng SĐT Việt Nam) |
| **Mật khẩu** | `USER-INPUT` | conditional | `CONDITIONAL`: Phụ thuộc tab đăng nhập | - **Hiện khi:** Chọn tab `Bằng Mật khẩu`.<br>- **Ẩn khi:** Chọn tab `Bằng mã OTP`. |
| **Nút [ Nhận mã OTP ]** | `USER-INPUT` | conditional | `CONDITIONAL`: Phụ thuộc tab đăng nhập | - **Hiện khi:** Chọn tab `Bằng mã OTP` (nút kích hoạt gửi mã SMS).<br>- **Ẩn khi:** Chọn tab `Bằng Mật khẩu`. |
| **Mã OTP đăng nhập** | `USER-INPUT` | conditional | `CONDITIONAL`: Phụ thuộc tab đăng nhập và trạng thái gửi mã | - **Hiện khi:** Chọn tab `Bằng mã OTP` và hệ thống đã gửi OTP (nhập 6 chữ số).<br>- **Ẩn khi:** Chọn tab `Bằng Mật khẩu` hoặc chưa bấm nhận mã. |
| **Nút CTA [ ĐĂNG NHẬP ]** | `USER-INPUT` | required | `DYNAMIC`: Enable khi đã điền đủ thông tin theo phương thức tương ứng | Nút màu xanh lá bo góc; bấm để gửi thông tin xác thực |
| **Text link [ Kích hoạt tài khoản ]** | `USER-INPUT` | optional | Không | Text link điều hướng bên dưới; bấm để mở Màn hình Kích hoạt tài khoản (`HV06-US02`) cho hội viên đã có hồ sơ tại quầy |
| **Text link [ Tạo tài khoản mới ]** | `USER-INPUT` | optional | Không | Text link điều hướng bên dưới; bấm để mở Màn hình Tạo tài khoản mới (`HV06-US03`) cho khách hàng mới |

### Field-level specification — Bước Xác thực 2 lớp (2FA Verification)
| Field / Control | Interaction State | Required | Conditional / Dynamic | Data Source / Validation |
| :--- | :--- | :--- | :--- | :--- |
| **Tiêu đề màn hình 2FA** | `READONLY` | required | Không | Tiêu đề: `Xác thực 2 bước (2FA)` |
| **Thông báo gửi mã 2FA** | `READONLY` | required | Không | Hiển thị: *"Mã xác thực gồm 6 chữ số đã được gửi tới số điện thoại [0909 *** 456]"* |
| **Ô nhập mã OTP 2FA** | `USER-INPUT` | required | Không | 6 ô nhập chữ số OTP (tự động nhảy sang ô tiếp theo khi nhập) |
| **Đếm ngược thời gian (Countdown)** | `READONLY` | required | Không | Đếm ngược hiệu lực mã: `Gửi lại mã sau (60s)` |
| **Nút [ Gửi lại mã OTP ]** | `USER-INPUT` | optional | `DYNAMIC`: Enable khi bộ đếm về 0s, Disable khi đang đếm ngược | Bấm để gửi lại mã OTP mới (tối đa 3 lần) |
| **Nút CTA [ Xác nhận 2FA ]** | `USER-INPUT` | required | `DYNAMIC`: Enable khi đã nhập đủ 6 chữ số OTP | Nút màu xanh lá bo góc; bấm để hoàn tất xác thực 2 lớp và vào ứng dụng |

## Alternate Flows

### AF-01 — Nhập sai mật khẩu hoặc OTP quá 5 lần
1. Hội viên nhập sai credential hoặc OTP liên tiếp 5 lần.
2. SYS tự động khóa tạm thời tính năng đăng nhập của tài khoản trong 15 phút và hiển thị thông báo cảnh báo bảo mật.

## Exception Flows

- Lỗi kết nối mạng: SYS hiển thị thông báo không thể kết nối tới máy chủ xác thực và hoàn tác phiên.

## Activity Diagram — Swimlane
**Trigger:** Hội viên mở ứng dụng và thực hiện đăng nhập.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App Hội viên / HV06 · Đăng nhập & 2FA"]
    subgraph L0["Swimlane — Hội viên"]
      I01(("Initial"))
      A01["Mở màn hình Đăng nhập"]
      D01{"Chọn phương thức đăng nhập?"}
      
      %% Nhánh 1: Đăng nhập bằng Mật khẩu
      A02["Nhập SĐT + Mật khẩu và bấm ĐĂNG NHẬP"]
      A05["Nhập mã OTP xác thực lớp 2 (2FA)"]
      
      %% Nhánh 2: Đăng nhập 1 bước bằng OTP (Passwordless)
      A03["Nhập SĐT và bấm [ Nhận mã OTP ]"]
      A04["Nhập mã OTP SMS và bấm [ Xác nhận đăng nhập ]"]
      
      F01((("Final — Đăng nhập thành công (Mở HV01 · Trang chủ)")))
      F02((("Final — Khóa tạm thời 15 phút do sai quá 5 lần")))

      I01 --> A01 --> D01
      D01 -->|Bằng Mật khẩu| A02
      D01 -->|Bằng mã OTP| A03
    end

    subgraph L1["Swimlane — SYS"]
      %% Xử lý nhánh OTP (Đăng nhập 1 bước không mật khẩu)
      S11["Tạo và gửi mã OTP qua SMS tới SĐT Hội viên"]
      D11{"Xác thực mã OTP hợp lệ?"}
      
      %% Xử lý nhánh Mật khẩu (+ 2FA)
      S01["Xác thực Mật khẩu (Lớp 1)"]
      D01_CHK{"Mật khẩu chính xác?"}
      D02{"Có yêu cầu Xác thực 2 lớp (2FA)?"}
      S04["Gửi mã OTP 2FA qua SMS tới SĐT của Hội viên"]
      D04{"Mã OTP 2FA hợp lệ?"}
      
      %% Xử lý kết quả chung
      S_LOCK["Ghi nhận số lần sai (sai >= 5 lần: Khóa tạm 15 phút)"]
      S_SUCCESS["Khởi tạo Session Mobile và mở HV01 · Trang chủ"]

      %% Luồng Đăng nhập bằng OTP (1 lần gửi mã duy nhất)
      A03 --> S11 --> A04 --> D11
      D11 -- "Hợp lệ" --> S_SUCCESS --> F01
      D11 -- "Không hợp lệ" --> S_LOCK --> F02

      %% Luồng Đăng nhập bằng Mật khẩu (+ Xác thực 2 lớp)
      A02 --> S01 --> D01_CHK
      D01_CHK -- "Sai mật khẩu" --> S_LOCK
      D01_CHK -- "Đúng mật khẩu" --> D02
      
      D02 -- "Không (Thiết bị tin cậy & Không bật 2FA)" --> S_SUCCESS
      D02 -- "Có (Thiết bị mới hoặc Đã bật 2FA)" --> S04 --> A05 --> D04
      D04 -- "Hợp lệ" --> S_SUCCESS
      D04 -- "Sai OTP 2FA" --> S_LOCK
    end
  end
```\n
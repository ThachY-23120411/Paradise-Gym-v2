# PT05-US01 - Đăng nhập đa phương thức và xác thực 2 lớp PT

## Preconditions
- HLV (PT) đã cài đặt ứng dụng Mobile PT Paradise Gym.
- HLV đã được Lễ tân hoặc Quản trị viên cấp hồ sơ nhân sự hợp lệ trên hệ thống.

## Trigger
- HLV mở ứng dụng Mobile PT khi chưa đăng nhập hoặc phiên làm việc đã hết hạn.
- Màn hình liên quan: Mobile App PT — Màn hình Đăng nhập PT & Màn hình Xác thực 2FA.

## Main Flow

### Trường hợp 1: Đăng nhập bằng Mật khẩu (có Xác thực 2 lớp - 2FA)
1. HLV chọn tab **`Bằng Mật khẩu`** trên màn hình Đăng nhập PT.
2. HLV nhập Số điện thoại (hoặc Mã nhân viên PT) và Mật khẩu.
3. HLV bấm nút **`[ ĐĂNG NHẬP ]`**.
4. SYS xác thực thông tin đăng nhập (Lớp xác thực 1 thành công).
5. SYS kiểm tra: Tài khoản có bật 2FA hoặc phát hiện đăng nhập trên thiết bị mới $\rightarrow$ SYS gửi mã OTP 6 số qua SMS tới SĐT của HLV và chuyển sang màn hình **Xác thực 2 lớp (2FA)**.
6. HLV nhập đúng 6 chữ số OTP.
7. SYS xác thực mã OTP (Lớp xác thực 2 thành công) $\rightarrow$ Khởi tạo phiên truy cập (Session Mobile PT) và điều hướng vào màn hình `PT01 · Lịch`.

### Trường hợp 2: Đăng nhập bằng Mã OTP (Không dùng mật khẩu)
1. HLV chọn tab **`Bằng mã OTP`** trên màn hình Đăng nhập.
2. HLV nhập Số điện thoại và bấm **`[ Nhận mã OTP ]`**.
3. SYS gửi mã OTP 6 số tới SĐT HLV qua tin nhắn SMS (thời hạn 60 giây).
4. HLV nhập mã OTP nhận được và bấm **`[ Xác nhận đăng nhập ]`**.
5. SYS xác thực mã OTP thành công $\rightarrow$ Khởi tạo session và mở `PT01 · Lịch`.

- **Business rules / logic:**
  - **Bảo mật tốt & Chống dò quét (Account Lockout):** Nếu nhập sai mật khẩu hoặc OTP quá 5 lần liên tiếp, hệ thống tự động khóa tạm thời tài khoản PT trong 15 phút.
  - **Thời hạn mã OTP:** Mã OTP có hiệu lực tối đa trong vòng 60 giây; tối đa 3 lần yêu cầu gửi lại mã trong 1 phiên.
  - **Bảo mật dữ liệu:** Tuyệt đối không lưu mật khẩu hoặc mã OTP dạng rõ (plaintext) trong bộ nhớ tạm hoặc nhật ký audit hệ thống.
  - **Quyền hạn tài khoản:** Ứng dụng không hỗ trợ tự đăng ký tài khoản PT. Tài khoản HLV bắt buộc phải do Lễ tân hoặc Quản trị viên khởi tạo hồ sơ nhân sự trên hệ thống Web trước.

### Field-level specification — Màn hình Đăng nhập PT
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tab chọn phương thức đăng nhập** | `Tab Segmented Control` | `USER-INPUT` | required | `TRIGGER`: Chuyển đổi giữa 2 form nhập | 2 tab lựa chọn: `Bằng Mật khẩu` (mặc định) và `Bằng mã OTP` |
| **Số điện thoại / Mã PT** | `Textbox (Phone/Code Input)` | `USER-INPUT` | required | Không | Nhập số điện thoại đăng ký hoặc Mã định danh PT (ví dụ `PT001`) |
| **Mật khẩu** | `Password Input (with Toggle Eye)` | `USER-INPUT` | conditional | `CONDITIONAL`: Phụ thuộc tab đăng nhập | - **Hiện khi:** Chọn tab `Bằng Mật khẩu`.<br>- **Ẩn khi:** Chọn tab `Bằng mã OTP`. |
| **Nút [ Nhận mã OTP ]** | `Action Button` | `USER-INPUT` | conditional | `CONDITIONAL`: Phụ thuộc tab đăng nhập | - **Hiện khi:** Chọn tab `Bằng mã OTP` (nút kích hoạt gửi mã SMS).<br>- **Ẩn khi:** Chọn tab `Bằng Mật khẩu`. |
| **Mã OTP đăng nhập** | `OTP Input (6 Digits)` | `USER-INPUT` | conditional | `CONDITIONAL`: Phụ thuộc tab đăng nhập và trạng thái gửi mã | - **Hiện khi:** Chọn tab `Bằng mã OTP` và hệ thống đã gửi OTP (nhập 6 chữ số).<br>- **Ẩn khi:** Chọn tab `Bằng Mật khẩu` hoặc chưa bấm nhận mã. |
| **Nút CTA [ ĐĂNG NHẬP ]** | `Action Button (CTA)` | `USER-INPUT` | required | `DYNAMIC`: Enable khi đã điền đủ thông tin theo phương thức tương ứng | Nút màu xanh lá bo góc; bấm để gửi thông tin xác thực lên hệ thống |
| **Text link [ Kích hoạt tài khoản PT ]** | `Text Link / Button` | `USER-INPUT` | optional | Không | Text link điều hướng bên dưới; bấm để mở Màn hình Kích hoạt tài khoản PT (`PT05-US02`) dành cho HLV đã được Lễ tân tạo hồ sơ nhân sự |

### Field-level specification — Bước Xác thực 2 lớp (2FA Verification)
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tiêu đề màn hình 2FA** | `Header Title` | `READONLY` | required | Không | Tiêu đề: `Xác thực 2 bước (2FA) - PT` |
| **Thông báo gửi mã 2FA** | `Text Paragraph (Info)` | `READONLY` | required | Không | Hiển thị: *"Mã xác thực gồm 6 chữ số đã được gửi tới số điện thoại HLV [0908 *** 789]"* |
| **Ô nhập mã OTP 2FA** | `Pin Code Input (6 Boxes)` | `USER-INPUT` | required | Không | 6 ô nhập chữ số OTP (tự động nhảy sang ô tiếp theo khi nhập) |
| **Đếm ngược thời gian (Countdown)** | `Countdown Timer Text` | `READONLY` | required | Không | Đếm ngược hiệu lực mã: `Gửi lại mã sau (60s)` |
| **Nút [ Gửi lại mã OTP ]** | `Action Button (Secondary)` | `USER-INPUT` | optional | `DYNAMIC`: Enable khi bộ đếm về 0s, Disable khi đang đếm ngược | Bấm để gửi lại mã OTP mới (tối đa 3 lần) |
| **Nút CTA [ Xác nhận 2FA ]** | `Action Button (CTA)` | `USER-INPUT` | required | `DYNAMIC`: Enable khi đã nhập đủ 6 chữ số OTP | Nút màu xanh lá bo góc; bấm để hoàn tất xác thực 2 lớp và vào ứng dụng PT |

## Alternate Flows

### AF-01 — Nhập sai mật khẩu hoặc OTP quá 5 lần
1. HLV nhập sai credential hoặc OTP liên tiếp 5 lần.
2. SYS tự động khóa tạm thời tính năng đăng nhập của tài khoản trong 15 phút và hiển thị thông báo cảnh báo bảo mật.

## Exception Flows

- Lỗi kết nối mạng: SYS hiển thị thông báo không thể kết nối tới máy chủ xác thực và hoàn tác phiên.

## Activity Diagram — Swimlane
**Trigger:** HLV mở ứng dụng và thực hiện đăng nhập.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App PT / PT05 · Đăng nhập & 2FA"]
    subgraph L0["Swimlane — Huấn luyện viên (PT)"]
      I01(("Initial"))
      A01["Mở màn hình Đăng nhập PT"]
      D01{"Chọn phương thức đăng nhập?"}
      
      %% Nhánh 1: Đăng nhập bằng Mật khẩu
      A02["Nhập SĐT/Mã PT + Mật khẩu và bấm ĐĂNG NHẬP"]
      A05["Nhập mã OTP xác thực lớp 2 (2FA)"]
      
      %% Nhánh 2: Đăng nhập 1 bước bằng OTP (Passwordless)
      A03["Nhập SĐT và bấm [ Nhận mã OTP ]"]
      A04["Nhập mã OTP SMS và bấm [ Xác nhận đăng nhập ]"]
      
      F01((("Final — Đăng nhập thành công (Mở PT01 · Lịch)")))
      F02((("Final — Khóa tạm thời 15 phút do sai quá 5 lần")))

      I01 --> A01 --> D01
      D01 -->|Bằng Mật khẩu| A02
      D01 -->|Bằng mã OTP| A03
    end

    subgraph L1["Swimlane — SYS"]
      %% Xử lý nhánh OTP (Đăng nhập 1 bước không mật khẩu)
      S11["Tạo và gửi mã OTP qua SMS tới SĐT HLV"]
      D11{"Xác thực mã OTP hợp lệ?"}
      
      %% Xử lý nhánh Mật khẩu (+ 2FA)
      S01["Xác thực Mật khẩu (Lớp 1)"]
      D01_CHK{"Mật khẩu chính xác?"}
      D02{"Có yêu cầu Xác thực 2 lớp (2FA)?"}
      S04["Gửi mã OTP 2FA qua SMS tới SĐT của HLV"]
      D04{"Mã OTP 2FA hợp lệ?"}
      
      %% Xử lý kết quả chung
      S_LOCK["Ghi nhận số lần sai (sai >= 5 lần: Khóa tạm 15 phút)"]
      S_SUCCESS["Khởi tạo Session Mobile PT và mở PT01 · Lịch"]

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
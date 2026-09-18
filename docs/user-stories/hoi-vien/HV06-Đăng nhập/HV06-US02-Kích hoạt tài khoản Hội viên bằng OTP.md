# HV06-US02 - Kích hoạt tài khoản Hội viên bằng OTP

## Preconditions
- Hội viên đã được Lễ tân hoặc Quản trị viên đăng ký hồ sơ nhân sự/khách hàng tại quầy lễ tân (đã có thông tin Họ tên, SĐT, Mã hội viên trên hệ thống).
- Hội viên đang ở màn hình Kích hoạt tài khoản trên ứng dụng Mobile.

## Trigger
- Hội viên bấm text link `Kích hoạt tài khoản` từ màn hình Đăng nhập (`HV06-US01`).
- Màn hình liên quan: Mobile App — Màn hình Kích hoạt tài khoản Hội viên.

## Main Flow

1. Hội viên nhập Số điện thoại đã đăng ký tại quầy.
2. SYS chuẩn hóa và tra cứu số điện thoại trên hệ thống:
   - Nếu SĐT tồn tại trong hồ sơ hội viên tại quầy và chưa tạo tài khoản Mobile: SYS hiển thị thông tin tóm tắt hồ sơ (Họ và tên, Mã hội viên, Chi nhánh) để hội viên kiểm tra xác nhận danh tính chính chủ.
3. Hội viên bấm nút **`[ Nhận mã OTP ]`**.
4. SYS tạo mã OTP 6 chữ số ngẫu nhiên và gửi tới số điện thoại của Hội viên qua tin nhắn SMS (thời hạn 60 giây).
5. Hội viên nhập mã OTP nhận được (6 chữ số).
6. Hội viên thiết lập Mật khẩu mới và nhập lại vào ô Xác nhận mật khẩu.
7. Hội viên bấm nút **`[ Kích hoạt & Đăng nhập ]`**.
8. SYS kiểm tra:
   - Mã OTP hợp lệ và còn trong thời hạn hiệu lực.
   - Mật khẩu mới đáp ứng tiêu chuẩn (tối thiểu 6 ký tự) và 2 ô mật khẩu trùng khớp 100%.
9. SYS khởi tạo tài khoản `ROLE_MEMBER`, liên kết hồ sơ hội viên tại quầy, cập nhật trạng thái hoạt động, khởi tạo phiên làm việc (Session Mobile) và điều hướng thẳng vào màn hình `HV01 · Trang chủ`.

- **Business rules / logic:**
  - Tài khoản chỉ được kích hoạt 1 lần duy nhất; nếu tài khoản đã được kích hoạt trước đó (`ACTIVE`), hệ thống thông báo tài khoản đã hoạt động và yêu cầu quay lại màn hình Đăng nhập.
  - Trường hợp SĐT chưa từng có trong danh sách hồ sơ tại quầy: Hệ thống từ chối kích hoạt và hướng dẫn người dùng chuyển sang màn hình Tạo tài khoản mới (`HV06-US03`).
  - Mã OTP có hiệu lực trong 60 giây; tối đa 3 lần yêu cầu cấp lại mã OTP trong một phiên kích hoạt.
  - Không lưu mã OTP hoặc mật khẩu dạng rõ (plaintext) trong nhật ký audit hệ thống.

### Field-level specification — Màn hình Kích hoạt tài khoản Hội viên
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Số điện thoại đã đăng ký tại quầy** | `Text input` | `USER-INPUT` | required | `TRIGGER`: Nhập SĐT để hệ thống kiểm tra hồ sơ quầy | Nhập số điện thoại đã khai báo tại quầy lễ tân (10 chữ số, định dạng Việt Nam) |
| **Thông tin xác nhận hồ sơ hội viên** | `Card / Summary info` | `READONLY` | conditional | `CONDITIONAL`: Phụ thuộc kết quả tra cứu SĐT | - **Hiện khi:** SĐT khớp với hồ sơ hội viên tại quầy chưa kích hoạt tài khoản (hiển thị Họ tên, Mã HV, Chi nhánh).<br>- **Ẩn khi:** Chưa nhập thông tin hoặc SĐT không tồn tại. |
| **Nút [ Nhận mã OTP ]** | `Button / Secondary` | `USER-INPUT` | conditional | `CONDITIONAL`: Phụ thuộc trạng thái tra cứu | - **Hiện khi:** SĐT khớp hồ sơ hợp lệ và sẵn sàng nhận OTP.<br>- **Ẩn khi:** Chưa nhập SĐT hoặc SĐT không tồn tại. |
| **Mã xác thực OTP** | `Text input / OTP input` | `USER-INPUT` | conditional | `CONDITIONAL`: Phụ thuộc trạng thái gửi mã OTP | - **Hiện khi:** Hệ thống đã gửi mã OTP SMS thành công (nhập 6 chữ số).<br>- **Ẩn khi:** Chưa bấm nhận mã OTP. |
| **Mật khẩu mới** | `Password input` | `USER-INPUT` | required | Không | Nhập mật khẩu mới cho tài khoản (tối thiểu 6 ký tự); hỗ trợ icon ẩn/hiện |
| **Xác nhận mật khẩu** | `Password input` | `USER-INPUT` | required | Không | Nhập lại mật khẩu mới; yêu cầu trùng khớp 100% với ô Mật khẩu mới |
| **Nút CTA [ Kích hoạt & Đăng nhập ]** | `Button / Primary CTA` | `USER-INPUT` | required | `DYNAMIC`: Enable khi đã có thông tin hồ sơ, nhập đủ OTP 6 số và 2 ô mật khẩu trùng khớp | Nút màu xanh lá bo góc; bấm để hoàn tất kích hoạt tài khoản và mở giao diện ứng dụng `HV01` |
| **Text link [ Chưa có hồ sơ? Tạo tài khoản mới ]** | `Text link / Action` | `USER-INPUT` | optional | Không | Text link điều hướng bên dưới; bấm để chuyển sang Màn hình Tạo tài khoản mới (`HV06-US03`) |

## Alternate Flows

### AF-01 — Tài khoản đã được kích hoạt trước đó
1. Hội viên nhập SĐT đã kích hoạt tài khoản Mobile thành công trước đó (`ACTIVE`).
2. SYS hiển thị thông báo: *"Tài khoản đã được kích hoạt từ trước. Vui lòng quay lại màn hình Đăng nhập để sử dụng ứng dụng."*
3. Hội viên bấm quay lại màn hình Đăng nhập (`HV06-US01`).

### AF-02 — Mã OTP hết hạn hoặc nhập sai
1. Hội viên nhập sai mã OTP hoặc nhập mã đã quá hạn 60 giây.
2. SYS hiển thị thông báo lỗi và cho phép bấm `[ Nhận mã OTP ]` để nhận lại mã mới (tối đa 3 lần).

## Exception Flows

- **Lỗi không tìm thấy hồ sơ:** SĐT chưa được đăng ký tại quầy $\rightarrow$ SYS báo lỗi: *"Không tìm thấy hồ sơ hội viên tương ứng với số điện thoại này. Nếu bạn là khách hàng mới, vui lòng bấm 'Tạo tài khoản mới'."*
- **Lỗi mất kết nối mạng:** SYS hiển thị thông báo lỗi đường truyền và giữ nguyên dữ liệu form đã nhập.

## Activity Diagram — Swimlane
**Trigger:** Hội viên bấm text link Kích hoạt tài khoản từ màn hình Đăng nhập.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App Hội viên / HV06 · Kích hoạt tài khoản"]
    subgraph L0["Swimlane — Hội viên"]
      I01(("Initial"))
      A01["Bấm text link [ Kích hoạt tài khoản ]"]
      A02["Nhập Số điện thoại đã đăng ký tại quầy"]
      A03["Bấm nút [ Nhận mã OTP ]"]
      A04["Nhập mã OTP 6 số, Mật khẩu mới và Xác nhận mật khẩu"]
      A05["Bấm [ Kích hoạt & Đăng nhập ]"]
      F01((("Final — Kích hoạt thành công & Vào màn hình HV01 · Trang chủ")))
      F02((("Final — Tài khoản đã kích hoạt (Quay về Đăng nhập)")))
      F03((("Final — Kích hoạt thất bại (Không có hồ sơ hoặc OTP sai)")))

      I01 --> A01 --> A02
    end

    subgraph L1["Swimlane — SYS"]
      S01["Tra cứu số điện thoại trên hệ thống"]
      D01{"Trạng thái tài khoản & hồ sơ quầy?"}
      E01["Báo tài khoản đã kích hoạt; điều hướng về Đăng nhập"]
      E02["Báo không tìm thấy hồ sơ quầy; hướng dẫn Tạo tài khoản mới"]
      S02["Hiển thị thông tin hồ sơ hội viên & Mở nút nhận OTP"]
      S03["Gửi mã OTP 6 số qua SMS tới SĐT Hội viên"]
      D02{"Mã OTP hợp lệ và mật khẩu đúng chuẩn?"}
      E03["Báo lỗi OTP sai/hết hạn hoặc mật khẩu không khớp"]
      S04["Tạo tài khoản ROLE_MEMBER, liên kết hồ sơ & Đăng nhập vào HV01"]

      A02 --> S01 --> D01
      D01 -- "Đã kích hoạt" --> E01 --> F02
      D01 -- "Chưa có hồ sơ" --> E02 --> F03
      D01 -- "Khớp hồ sơ quầy chờ kích hoạt" --> S02 --> A03 --> S03 --> A04 --> A05 --> D02
      D02 -- "Không" --> E03 --> F03
      D02 -- "Có" --> S04 --> F01
    end
  end
```\n
# HV06-US03 - Tạo tài khoản và đăng ký hồ sơ mới

## Preconditions
- Khách hàng mới chưa có tài khoản trên ứng dụng Mobile và chưa có hồ sơ tại phòng gym.
- Khách hàng đang ở màn hình Tạo tài khoản mới trên ứng dụng Mobile.

## Trigger
- Khách hàng bấm text link `Tạo tài khoản mới` từ màn hình Đăng nhập (`HV06-US01`) hoặc từ màn hình Kích hoạt (`HV06-US02`).
- Màn hình liên quan: Mobile App — Màn hình Tạo tài khoản mới.

## Main Flow

1. Khách hàng nhập các thông tin đăng ký hồ sơ mới:
   - Số điện thoại đăng ký
   - Họ và tên
   - Chi nhánh cơ sở (Home Branch - Chọn phòng tập sinh hoạt chính)
   - Email (tùy chọn)
   - Mật khẩu mới
   - Xác nhận mật khẩu
2. Khách hàng bấm nút **`[ Nhận mã OTP ]`**.
3. SYS chuẩn hóa và tra cứu số điện thoại trên hệ thống:
   - Nếu SĐT chưa từng tồn tại trên hệ thống: SYS tạo mã OTP 6 số ngẫu nhiên và gửi tới SĐT đăng ký qua tin nhắn SMS (thời hạn 60 giây).
4. Khách hàng nhập mã OTP 6 chữ số nhận được.
5. Khách hàng bấm nút **`[ Hoàn tất tạo tài khoản ]`**.
6. SYS kiểm tra:
   - Mã OTP hợp lệ và còn trong thời hạn hiệu lực.
   - Chi nhánh cơ sở đã được lựa chọn hợp lệ từ danh mục phòng tập của hệ thống.
   - Mật khẩu mới đáp ứng tiêu chuẩn (tối thiểu 6 ký tự) và 2 ô mật khẩu trùng khớp 100%.
7. SYS tạo bản ghi hồ sơ hội viên mới (với `home_branch_id` đã chọn), tạo tài khoản `ROLE_MEMBER`, thiết lập mật khẩu đã mã hóa, khởi tạo phiên làm việc (Session Mobile) và điều hướng thẳng vào màn hình `HV01 · Trang chủ`.

- **Business rules / logic:**
  - SĐT là định danh duy nhất; nếu SĐT đã tồn tại trên hệ thống (đã có tài khoản hoặc đã có hồ sơ tại quầy), hệ thống từ chối tạo mới và hướng dẫn người dùng chuyển sang Đăng nhập hoặc Kích hoạt tài khoản tương ứng.
  - Chi nhánh cơ sở (`home_branch_id`) là trường bắt buộc để định tuyến hội viên vào đúng cơ sở sinh hoạt chính và phân bổ dịch vụ.
  - Không lưu mã OTP hoặc mật khẩu dạng rõ (plaintext) trong nhật ký audit hệ thống.
  - Mã OTP có hiệu lực trong 60 giây; tối đa 3 lần yêu cầu cấp lại mã OTP trong một phiên đăng ký.

### Field-level specification — Màn hình Tạo tài khoản mới
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Số điện thoại đăng ký** | `Text input` | `USER-INPUT` | required | Không | Nhập số điện thoại chính chủ của khách hàng (10 chữ số, chuẩn định dạng Việt Nam) |
| **Họ và tên** | `Text input` | `USER-INPUT` | required | Không | Nhập họ và tên đầy đủ của khách hàng (ví dụ: *Trần Thị Lan*) |
| **Chi nhánh cơ sở** | `Select / Dropdown` | `USER-INPUT` | required | `DYNAMIC`: Lấy danh sách chi nhánh đang hoạt động từ API | Chọn chi nhánh sinh hoạt chính của hội viên trong hệ thống chuỗi Paradise Gym (tương ứng `member_profiles.home_branch_id`) |
| **Email** | `Text input / Email` | `USER-INPUT` | optional | Không | Nhập địa chỉ email hợp lệ để nhận thông báo và hóa đơn điện tử |
| **Mật khẩu mới** | `Password input` | `USER-INPUT` | required | Không | Nhập mật khẩu mới cho tài khoản (tối thiểu 6 ký tự); hỗ trợ icon ẩn/hiện |
| **Xác nhận mật khẩu** | `Password input` | `USER-INPUT` | required | Không | Nhập lại mật khẩu mới; yêu cầu trùng khớp 100% với ô Mật khẩu mới |
| **Nút [ Nhận mã OTP ]** | `Button / Secondary` | `USER-INPUT` | required | `TRIGGER`: Kích hoạt gửi OTP và hiển thị trường nhập OTP | Nút bấm gửi mã xác thực tới SĐT đăng ký; có bộ đếm ngược thời gian gửi lại (60s) |
| **Mã xác thực OTP** | `Text input / OTP input` | `USER-INPUT` | conditional | `CONDITIONAL`: Phụ thuộc vào việc gửi mã OTP | - **Hiện khi:** Đã bấm nhận mã và hệ thống gửi SMS thành công (nhập 6 chữ số).<br>- **Ẩn khi:** Chưa gửi mã OTP. |
| **Nút CTA [ Hoàn tất tạo tài khoản ]** | `Button / Primary CTA` | `USER-INPUT` | required | `DYNAMIC`: Enable khi đã điền đủ thông tin bắt buộc, chọn chi nhánh, mật khẩu khớp và mã OTP đủ 6 chữ số | Nút màu xanh lá bo góc; bấm để tạo hồ sơ, tạo tài khoản và đăng nhập vào ứng dụng `HV01` |
| **Text link [ Đã có hồ sơ tại quầy? Kích hoạt ngay ]** | `Text link / Action` | `USER-INPUT` | optional | Không | Text link điều hướng bên dưới; bấm để chuyển sang Màn hình Kích hoạt tài khoản (`HV06-US02`) |

## Alternate Flows

### AF-01 — Số điện thoại đã tồn tại trên hệ thống
1. Khách hàng nhập SĐT đã có tài khoản hoặc đã có hồ sơ tại quầy.
2. SYS hiển thị thông báo cảnh báo: *"Số điện thoại này đã tồn tại trong hệ thống Paradise Gym. Vui lòng Đăng nhập hoặc Kích hoạt tài khoản để tiếp tục."*
3. Khách hàng lựa chọn chuyển sang màn hình Đăng nhập (`HV06-US01`) hoặc Kích hoạt tài khoản (`HV06-US02`).

### AF-02 — Mã OTP hết hạn hoặc nhập sai
1. Khách hàng nhập sai mã OTP hoặc mã OTP đã quá hạn 60 giây.
2. SYS hiển thị thông báo lỗi và cho phép bấm `[ Nhận mã OTP ]` để nhận lại mã mới (tối đa 3 lần).

## Exception Flows

- Lỗi kết nối mạng: SYS hiển thị thông báo lỗi đường truyền và giữ nguyên dữ liệu form đã nhập.

## Activity Diagram — Swimlane
**Trigger:** Khách hàng bấm Tạo tài khoản mới từ màn hình Đăng nhập.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App Hội viên / HV06 · Tạo tài khoản mới"]
    subgraph L0["Swimlane — Khách hàng"]
      I01(("Initial"))
      A01["Bấm text link [ Tạo tài khoản mới ]"]
      A02["Nhập Họ tên, SĐT, Email, Mật khẩu mới và Xác nhận mật khẩu"]
      A03["Bấm nút [ Nhận mã OTP ]"]
      A04["Nhập mã OTP 6 chữ số"]
      A05["Bấm [ Hoàn tất tạo tài khoản ]"]
      F01((("Final — Tạo tài khoản thành công & Vào màn hình HV01 · Trang chủ")))
      F02((("Final — SĐT đã tồn tại (Chuyển sang Đăng nhập / Kích hoạt)")))
      F03((("Final — Tạo tài khoản thất bại (OTP sai/hết hạn)")))

      I01 --> A01 --> A02 --> A03
    end

    subgraph L1["Swimlane — SYS"]
      S01["Kiểm tra tính duy nhất của số điện thoại"]
      D01{"SĐT đã tồn tại trên hệ thống?"}
      E01["Cảnh báo SĐT đã tồn tại; hướng dẫn Đăng nhập hoặc Kích hoạt"]
      S02["Tạo và gửi mã OTP 6 số qua SMS tới SĐT đăng ký"]
      D02{"Mã OTP hợp lệ và còn thời hạn?"}
      E02["Báo lỗi OTP không hợp lệ hoặc đã hết hạn"]
      S03["Tạo hồ sơ hội viên mới, tạo tài khoản ROLE_MEMBER & Đăng nhập vào HV01"]

      A03 --> S01 --> D01
      D01 -- "Đã tồn tại" --> E01 --> F02
      D01 -- "Chưa tồn tại" --> S02 --> A04 --> A05 --> D02
      D02 -- "Không" --> E02 --> F03
      D02 -- "Có" --> S03 --> F01
    end
  end
```\n
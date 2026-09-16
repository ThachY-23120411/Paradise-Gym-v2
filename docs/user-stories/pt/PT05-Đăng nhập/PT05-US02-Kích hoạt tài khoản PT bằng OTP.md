# PT05-US02 - Kích hoạt tài khoản PT bằng OTP

## Preconditions
- HLV (PT) đã được Lễ tân hoặc Quản trị viên tạo hồ sơ nhân sự HLV trên hệ thống ở trạng thái Chờ kích hoạt (`PENDING_ACTIVATION`).
- HLV đang ở màn hình Kích hoạt tài khoản trên ứng dụng Mobile PT.

## Trigger
- HLV bấm text link `Kích hoạt tài khoản PT` từ màn hình Đăng nhập PT (`PT05-US01`).
- Màn hình liên quan: Mobile App PT — Màn hình Kích hoạt tài khoản PT.

## Main Flow

1. HLV nhập Số điện thoại đã đăng ký nhân sự (hoặc Mã nhân viên PT, ví dụ `PT001`).
2. SYS chuẩn hóa và tra cứu trạng thái hồ sơ nhân sự:
   - Nếu hồ sơ HLV tồn tại và ở trạng thái Chờ kích hoạt: SYS hiển thị thông tin tóm tắt hồ sơ (Họ và tên HLV, Mã PT, Chi nhánh làm việc) để HLV kiểm tra xác nhận đúng danh tính nhân sự của mình.
3. HLV bấm nút **`[ Nhận mã OTP ]`**.
4. SYS tạo mã OTP 6 chữ số ngẫu nhiên và gửi tới số điện thoại của HLV qua tin nhắn SMS (thời hạn 60 giây).
5. HLV nhập mã OTP nhận được (6 chữ số).
6. HLV thiết lập Mật khẩu mới và nhập lại vào ô Xác nhận mật khẩu.
7. HLV bấm nút **`[ Kích hoạt & Đăng nhập ]`**.
8. SYS kiểm tra:
   - Mã OTP hợp lệ và còn trong thời hạn hiệu lực.
   - Mật khẩu mới đáp ứng tiêu chuẩn bảo mật (tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số/ký tự đặc biệt) và 2 ô mật khẩu trùng khớp 100%.
9. SYS cập nhật trạng thái tài khoản sang Đang hoạt động (`ACTIVE`), mã hóa và lưu mật khẩu mới, khởi tạo phiên làm việc (Session Mobile PT) và điều hướng HLV vào màn hình `PT01 · Lịch`.

- **Business rules / logic:**
  - **Quy tắc phân quyền nhân sự:** PT tuyệt đối không có quyền tự tạo hồ sơ nhân sự cho mình trên ứng dụng. Bất kỳ hồ sơ/tài khoản nào tự đăng ký trực tiếp trên ứng dụng đều 100% thuộc role Hội viên (`ROLE_MEMBER`).
  - HLV muốn có tài khoản làm việc bắt buộc phải được Lễ tân hoặc Quản trị viên phòng gym tạo hồ sơ nhân sự trên hệ thống Web trước, sau đó mới vào App để Kích hoạt tài khoản lần đầu.
  - Tài khoản PT chỉ kích hoạt 1 lần duy nhất; nếu tài khoản đã được kích hoạt trước đó (`ACTIVE`), hệ thống thông báo tài khoản đã hoạt động và yêu cầu quay lại màn hình Đăng nhập.
  - Mã OTP có hiệu lực trong 60 giây; tối đa 3 lần yêu cầu cấp lại mã OTP trong một phiên kích hoạt.
  - Sau khi kích hoạt thành công, hệ thống tự động đăng nhập và lưu thiết bị tin cậy đầu tiên.

### Field-level specification — Màn hình Kích hoạt tài khoản PT
| Field / Control | Interaction State | Required | Conditional / Dynamic | Data Source / Validation |
| :--- | :--- | :--- | :--- | :--- |
| **Số điện thoại / Mã PT** | `USER-INPUT` | required | `TRIGGER`: Nhập thông tin để hệ thống kiểm tra hồ sơ nhân sự | Nhập số điện thoại đăng ký nhân sự (10 số) hoặc Mã PT được cấp (ví dụ `PT001`) |
| **Thông tin xác nhận HLV** | `READONLY` | conditional | `CONDITIONAL`: Phụ thuộc kết quả tra cứu hồ sơ nhân sự | - **Hiện khi:** Hệ thống tìm thấy hồ sơ PT hợp lệ ở trạng thái chờ kích hoạt (hiển thị Họ tên PT, Mã PT, Chi nhánh làm việc).<br>- **Ẩn khi:** Chưa nhập thông tin hoặc tài khoản không tồn tại. |
| **Nút [ Nhận mã OTP ]** | `USER-INPUT` | conditional | `CONDITIONAL`: Phụ thuộc trạng thái tra cứu | - **Hiện khi:** Hồ sơ PT hợp lệ và sẵn sàng nhận OTP.<br>- **Ẩn khi:** Chưa nhập SĐT/Mã PT hoặc hồ sơ không hợp lệ. |
| **Mã xác thực OTP** | `USER-INPUT` | conditional | `CONDITIONAL`: Phụ thuộc trạng thái gửi mã OTP | - **Hiện khi:** Hệ thống đã gửi mã OTP thành công (nhập 6 chữ số).<br>- **Ẩn khi:** Chưa bấm nhận mã OTP. |
| **Mật khẩu mới** | `USER-INPUT` | required | Không | Nhập mật khẩu mới (tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số/ký tự đặc biệt); hỗ trợ icon ẩn/hiện |
| **Xác nhận mật khẩu** | `USER-INPUT` | required | Không | Nhập lại mật khẩu mới; yêu cầu trùng khớp 100% với ô Mật khẩu mới |
| **Nút CTA [ Kích hoạt & Đăng nhập ]** | `USER-INPUT` | required | `DYNAMIC`: Enable khi đã nhập đủ SĐT/Mã PT, OTP 6 số và 2 ô mật khẩu trùng khớp | Nút màu xanh lá bo góc; bấm để hoàn tất kích hoạt tài khoản và mở giao diện ứng dụng PT |

## Alternate Flows

### AF-01 — Tài khoản đã được kích hoạt trước đó
1. HLV nhập SĐT/Mã PT đã được kích hoạt thành công trước đó (`ACTIVE`).
2. SYS hiển thị thông báo: *"Tài khoản HLV đã được kích hoạt. Vui lòng quay lại màn hình Đăng nhập để truy cập ứng dụng."*
3. HLV bấm nút quay lại màn hình Đăng nhập (`PT05-US01`).

### AF-02 — Mã OTP hết hạn hoặc nhập sai
1. HLV nhập sai mã OTP hoặc nhập mã đã quá hạn 60 giây.
2. SYS hiển thị thông báo lỗi và cho phép bấm `[ Nhận mã OTP ]` để nhận lại mã mới (tối đa 3 lần).

## Exception Flows

- **Lỗi không tìm thấy hồ sơ nhân sự:** SĐT hoặc Mã PT chưa được Lễ tân tạo trên hệ thống $\rightarrow$ SYS báo lỗi: *"Không tìm thấy thông tin hồ sơ HLV. Vui lòng liên hệ Lễ tân hoặc Quản lý chi nhánh để được tạo hồ sơ nhân sự trước khi kích hoạt."*
- **Lỗi mất kết nối mạng:** SYS hiển thị thông báo lỗi đường truyền và giữ nguyên dữ liệu form đã nhập.

## Activity Diagram — Swimlane
**Trigger:** HLV bấm Kích hoạt tài khoản PT từ màn hình Đăng nhập.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App PT / PT05 · Kích hoạt tài khoản PT"]
    subgraph L0["Swimlane — Huấn luyện viên (PT)"]
      I01(("Initial"))
      A01["Bấm text link [ Kích hoạt tài khoản PT ]"]
      A02["Nhập Số điện thoại / Mã PT"]
      A03["Bấm nút [ Nhận mã OTP ]"]
      A04["Nhập mã OTP 6 số, Mật khẩu mới và Xác nhận mật khẩu"]
      A05["Bấm [ Kích hoạt & Đăng nhập ]"]
      F01((("Final — Kích hoạt thành công & Vào màn hình PT01 · Lịch")))
      F02((("Final — Tài khoản đã kích hoạt (Quay về Đăng nhập)")))
      F03((("Final — Kích hoạt thất bại (Không có hồ sơ nhân sự)")))

      I01 --> A01 --> A02
    end

    subgraph L1["Swimlane — SYS"]
      S01["Tra cứu thông tin hồ sơ nhân sự PT"]
      D01{"Trạng thái hồ sơ HLV?"}
      E01["Báo tài khoản đã kích hoạt; điều hướng về Đăng nhập"]
      E02["Báo không tìm thấy hồ sơ; yêu cầu liên hệ Lễ tân tạo hồ sơ"]
      S02["Hiển thị thông tin HLV & Cho phép nhận OTP"]
      S03["Gửi mã OTP 6 số qua SMS tới SĐT HLV"]
      D02{"Mã OTP hợp lệ và mật khẩu đúng chuẩn?"}
      E03["Báo lỗi OTP sai/hết hạn hoặc mật khẩu không khớp"]
      S04["Chuyển trạng thái tài khoản ACTIVE, lưu mật khẩu & Đăng nhập vào PT01"]

      A02 --> S01 --> D01
      D01 -- "Đã kích hoạt" --> E01 --> F02
      D01 -- "Chưa có hồ sơ" --> E02 --> F03
      D01 -- "Hồ sơ chờ kích hoạt" --> S02 --> A03 --> S03 --> A04 --> A05 --> D02
      D02 -- "Không" --> E03 --> F03
      D02 -- "Có" --> S04 --> F01
    end
  end
```\n
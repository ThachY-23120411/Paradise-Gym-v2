# PT04-US01 - Xem hồ sơ và tùy chọn tài khoản PT

## Preconditions
- HLV (PT) đã đăng nhập ứng dụng Mobile PT bằng tài khoản hợp lệ.

## Trigger
- PT bấm chọn menu footer `PT04 · Tài khoản` trên ứng dụng Mobile PT.
- Màn hình liên quan: Mobile App PT — Tab `PT04 · Tài khoản`.

## Main Flow

1. PT mở menu footer **PT04 · Tài khoản**.
2. Hệ thống hiển thị thông tin hồ sơ nhân sự của PT (Ảnh đại diện, Họ tên, Mã PT, Chi nhánh phụ trách, SĐT, Email) và các tùy chọn cài đặt thông báo, bảo mật.
3. PT thực hiện điều chỉnh các công tắc bật/tắt (Toggle Switch):
   - Nhận thông báo lịch mới: Bật/Tắt.
   - Nhắc ghi kết quả buổi học: Bật/Tắt.
   - Hiển thị SĐT cho học viên: Bật/Tắt.
   - Xác thực 2 lớp (2FA khi đăng nhập): Bật/Tắt (Khi bật, mỗi lần đăng nhập bằng mật khẩu sẽ yêu cầu thêm mã OTP gửi về SĐT).
4. PT bấm nút **`[ Lưu cài đặt ]`** (hoặc hệ thống tự động lưu trạng thái khi PT thay đổi switch).
5. Hệ thống lưu cấu hình preference và bảo mật của PT, đồng thời hiển thị thông báo cập nhật thành công.

- **Business rules / logic:**
  - PT chỉ được xem hồ sơ và chỉnh sửa tùy chọn cài đặt cá nhân của chính mình.
  - PT không có quyền tự thay đổi mã PT, chi nhánh làm việc, phân quyền hoặc thông tin nhân sự cốt lõi trên màn hình này (phải do Admin/Lễ tân cập nhật trên Web).
  - Khi PT bấm `[ Đăng xuất ]`, hệ thống mở Popup xác nhận đăng xuất theo luồng `PT05-US03`.

### Field-level specification — Màn hình PT04 · Tài khoản
| Field / Control | Interaction State | Required | Conditional / Dynamic | Data Source / Validation |
| :--- | :--- | :--- | :--- | :--- |
| **Ảnh đại diện HLV** | `READONLY` | optional | Không | Hiển thị avatar chân dung HLV (hoặc icon mặc định) |
| **Họ và tên HLV** | `READONLY` | required | Không | Tên đầy đủ của HLV lấy từ hồ sơ nhân sự (ví dụ: *Nguyễn Văn Cường*) |
| **Mã nhân sự PT** | `READONLY` | required | Không | Mã định danh HLV do hệ thống cấp (ví dụ: `PT001`) |
| **Chi nhánh làm việc** | `READONLY` | required | Không | Tên chi nhánh HLV đang trực thuộc (ví dụ: *Paradise Gym - Quận 1*) |
| **Số điện thoại liên hệ** | `READONLY` | required | Không | Số điện thoại HLV đã đăng ký với phòng gym |
| **Email liên hệ** | `READONLY` | optional | Không | Email HLV dùng nhận thông báo hệ thống |
| **Nhận thông báo lịch mới** | `USER-INPUT` + `PREFILL` | optional | Không | Toggle Switch (`Bật` / `Tắt`); nhận thông báo khi có lịch tập mới hoặc học viên đổi lịch |
| **Nhắc ghi kết quả buổi học** | `USER-INPUT` + `PREFILL` | optional | Không | Toggle Switch (`Bật` / `Tắt`); nhận nhắc nhở hoàn thành ghi nhận chỉ số sau ca tập |
| **Hiển thị SĐT cho học viên** | `USER-INPUT` + `PREFILL` | optional | Không | Toggle Switch (`Bật` / `Tắt`); cho phép học viên nhìn thấy số liên hệ khi được phân công |
| **Xác thực 2 lớp (2FA khi đăng nhập)** | `USER-INPUT` + `PREFILL` | optional | Không | Toggle Switch (`Bật` / `Tắt`); kích hoạt mã OTP SMS khi đăng nhập bằng mật khẩu |
| **Nút [ Đổi mật khẩu ]** | `USER-INPUT` | optional | Không | Nút điều hướng; bấm để mở Modal Đổi mật khẩu tài khoản HLV |
| **Nút CTA [ Lưu cài đặt ]** | `USER-INPUT` | required | `DYNAMIC`: Enable khi có ít nhất một tùy chọn toggle switch thay đổi | Nút màu xanh lá bo góc; bấm để lưu các cài đặt thông báo và bảo mật |
| **Nút [ Đăng xuất ]** | `USER-INPUT` | required | Không | Nút màu đỏ ở cuối trang; bấm để kích hoạt Popup Xác nhận Đăng xuất (`PT05-US03`) |

## Alternate Flows

### AF-01 — Điều hướng sang Đăng xuất tài khoản
1. PT bấm nút `[ Đăng xuất ]` ở cuối màn hình.
2. SYS kích hoạt luồng Đăng xuất tài khoản PT (`PT05-US03`).

## Exception Flows

- Lỗi kết nối mạng: SYS hiển thị thông báo không thể lưu tùy chọn cài đặt và giữ nguyên trạng thái cũ.

## Activity Diagram — Swimlane
**Trigger:** PT chọn menu footer PT04 · Tài khoản trên ứng dụng Mobile.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App PT / PT04 · Tài khoản"]
    subgraph L0["Swimlane — Huấn luyện viên (PT)"]
      I01(("Initial"))
      A01["Mở footer PT04 · Tài khoản"]
      A02["Thay đổi cài đặt thông báo/nhắc việc hoặc bảo mật"]
      A03["Bấm nút [ Lưu cài đặt ]"]
      D01{"PT chọn Đăng xuất tài khoản?"}
      A04["Bấm nút [ Đăng xuất ]"]
      F01((("Final — Cập nhật cài đặt preference thành công")))
      F02((("Final — Chuyển sang luồng Đăng xuất PT05-US03")))

      I01 --> A01
      A01 --> A02 --> A03
      A01 --> D01
      D01 -- "Có" --> A04
    end

    subgraph L1["Swimlane — SYS"]
      S01["Hiển thị hồ sơ PT và trạng thái preference/bảo mật hiện tại"]
      S02["Lưu cấu hình preference, thông báo và 2FA vào hệ thống"]
      S03["Kích hoạt Popup Xác nhận Đăng xuất (PT05-US03)"]

      A01 --> S01
      A03 --> S02 --> F01
      A04 --> S03 --> F02
    end
  end
```\n
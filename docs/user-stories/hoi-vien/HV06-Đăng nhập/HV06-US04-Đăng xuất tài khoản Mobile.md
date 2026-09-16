# HV06-US04 - Đăng xuất tài khoản Mobile

## Preconditions
- Hội viên đang đăng nhập và có phiên truy cập (session) Mobile hợp lệ.

## Trigger
- Hội viên bấm nút `[ Đăng xuất ]` tại màn hình `HV04 · Tài khoản`.
- Màn hình liên quan: Mobile App — Tab `HV04 · Tài khoản` $\rightarrow$ Popup Xác nhận Đăng xuất.

## Main Flow

1. Tại màn hình Tài khoản, Hội viên cuộn xuống cuối trang và bấm nút **`[ Đăng xuất ]`**.
2. SYS hiển thị **Popup Xác nhận Đăng xuất**.
3. Hội viên bấm **`[ Xác nhận đăng xuất ]`** trên Popup.
4. Hệ thống kết thúc session hiện tại, thu hồi token xác thực và xóa trạng thái đăng nhập trên thiết bị.
5. Hệ thống điều hướng người dùng về màn hình Đăng nhập (`HV06-US01`).

- **Business rules / logic:**
  - Đăng xuất chỉ kết thúc phiên làm việc (Session), không làm thay đổi trạng thái hồ sơ, không xóa tài khoản, gói tập hay lịch sử booking.
  - Lần truy cập tiếp theo bắt buộc phải thực hiện đăng nhập lại bằng một trong các phương thức hợp lệ (SĐT + Mật khẩu hoặc OTP qua SMS).

### Field-level specification — Popup Xác nhận Đăng xuất
| Field / Control | Interaction State | Required | Conditional / Dynamic | Data Source / Validation |
| :--- | :--- | :--- | :--- | :--- |
| **Tiêu đề Popup** | `READONLY` | required | Không | Tiêu đề hộp thoại: `Xác nhận đăng xuất` |
| **Thông báo xác nhận đăng xuất** | `READONLY` | required | Không | Đoạn text: *"Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng Paradise Gym trên thiết bị này không? Phiên đăng nhập hiện tại sẽ kết thúc."* |

## Alternate Flows

### AF-01 — Hủy thao tác đăng xuất
1. Hội viên bấm `[ Hủy ]` hoặc bấm ra ngoài Popup xác nhận.
2. SYS đóng Popup và duy trì phiên đăng nhập hiện tại của Hội viên.

### AF-02 — Session đã hết hạn trước khi bấm đăng xuất
1. Phiên đăng nhập trên server đã hết hạn.
2. SYS tự động điều hướng về màn hình Đăng nhập (`HV06-US01`) mà không để lộ dữ liệu cá nhân cũ.

## Exception Flows

- Lỗi kết nối mạng: SYS xóa token lưu cục bộ trên thiết bị và chuyển về màn hình đăng nhập an toàn.

## Activity Diagram — Swimlane
**Trigger:** Hội viên bấm nút Đăng xuất tại màn hình Tài khoản.

```mermaid
flowchart TB
  subgraph B["Boundary — Mobile App Hội viên / HV06 · Đăng xuất"]
    subgraph L0["Swimlane — Hội viên"]
      I01(("Initial"))
      A01["Bấm nút [ Đăng xuất ] tại màn hình Tài khoản"]
      D01{"Xác nhận trên Popup Đăng xuất?"}
      A02["Bấm [ Xác nhận đăng xuất ]"]
      A03["Bấm [ Hủy ]"]
      F01((("Final — Về màn hình Đăng nhập (HV06-US01)")))
      F02((("Final — Tiếp tục duy trì phiên làm việc")))

      I01 --> A01
      A01 --> D01
      D01 -->|Xác nhận| A02
      D01 -->|Hủy| A03 --> F02
    end

    subgraph L1["Swimlane — SYS"]
      S01["Hiển thị Popup Xác nhận Đăng xuất"]
      S02["Thu hồi token xác thực, kết thúc session và xóa dữ liệu cache phiên"]
      S03["Điều hướng người dùng về màn hình Đăng nhập (HV06-US01)"]

      A01 --> S01 --> D01
      A02 --> S02 --> S03 --> F01
    end
  end
```\n
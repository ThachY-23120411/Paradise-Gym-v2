# QTV-W18-US02 - Xác nhận bàn giao doanh thu

Là QTV có quyền tài chính, tôi muốn xác nhận đầy đủ nguồn thu đã đối chiếu để lưu một đợt bàn giao bất biến.

## Preconditions

- QTV đã đăng nhập, có quyền tài chính và chi nhánh cụ thể trong phạm vi được cấp; không xác nhận ở ALL.
- Preview US01 có ít nhất một payment thành công với phiếu thu, chưa thuộc batch; mọi chuyển khoản đã được QTV chọn tài khoản đã kiểm chứng trong preview.
- Có fingerprint `preview_token` của đúng kỳ và các allocation đang xem.

## Trigger

QTV bấm **Xác nhận bàn giao** tại **Chưa bàn giao**.

## Main Flow

1. QTV hoàn tất kiểm tra kỳ, chi tiết từng payment và phân loại tài khoản ngay tại US01. SYS chỉ bật **Xác nhận bàn giao** khi preview có nguồn thu và `unresolved_count = 0`.
2. SYS mở popup **Xác nhận bàn giao doanh thu** từ preview hiện hành, hiển thị **Tổng tiền**, **Giao dịch**, **Chưa xác định** và bảng **Tổng hợp theo nơi nhận tiền**. Popup hiện tại không có grid payment chi tiết hay trường chi nhánh, kỳ ngày, múi giờ riêng; các thông tin này được giữ trong ngữ cảnh preview từ US01.
3. QTV có thể nhập **Ghi chú**, rồi chủ động tích **Xác nhận đã bàn giao đầy đủ**; mặc định checkbox chưa tích và ghi chú trống.
4. QTV bấm **Xác nhận bàn giao** trong popup. SYS khóa gửi lặp và gửi đúng kỳ, allocation, token, checkbox cùng ghi chú; không lấy tập con theo tìm kiếm/phân trang grid.
5. Server kiểm tra QTV + quyền tài chính, chi nhánh, ngày, token và checkbox. Cùng token đã xác nhận trong đúng kỳ/chi nhánh thì trả batch gốc (idempotent), không tạo đợt khác và không thay ghi chú/chi tiết đã lưu.
6. Với token chưa xác nhận, server tính lại tập và fingerprint. Nếu khớp toàn bộ, không rỗng, không unresolved và chưa payment nào thuộc batch khác, lưu nguyên tử batch và snapshot từng payment. Snapshot giữ khách hàng, gói, hợp đồng, phiếu thu, phương thức, tài khoản nhận, số tiền; batch giữ kỳ, múi giờ, tổng, người tạo và thời điểm xác nhận. Một payment chỉ thuộc một batch.
7. SYS trả **Mã bàn giao** canonical `handover_code`, đóng popup xác nhận, xóa allocation tạm, thông báo **Đã xác nhận bàn giao doanh thu.**, tải lại nguồn thu và mở **Chi tiết bàn giao** (US03). Payment gốc vẫn bất biến, không thêm payment.status.

### Field-level specification - Popup Xác nhận bàn giao doanh thu

| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| --- | --- | --- | --- | --- | --- |
| Tổng tiền | Currency Display | READONLY | required | Không | Tổng toàn bộ preview được xác nhận; VND |
| Giao dịch | Number Display | READONLY | required | Không | Số khoản trong preview, phải lớn hơn 0 |
| Chưa xác định | Number Display | READONLY | required | Không | Phải bằng 0 trước mở/xác nhận popup |
| Tiền mặt / tài khoản / chưa xác định | Grid Column | READONLY | required | Không | Bảng Tổng hợp theo nơi nhận tiền; Tiền mặt hoặc BIN · số tài khoản · tên tài khoản |
| Giao dịch | Grid Column | READONLY | required | Không | Số khoản của từng nhóm trong preview |
| Số tiền | Grid Column | READONLY | required | Không | Tổng tiền nhóm; tổng các nhóm khớp Tổng tiền |
| Ghi chú | Textarea | USER-INPUT | optional | Không | Tối đa 1000 ký tự; bỏ khoảng trắng đầu/cuối; trống vẫn hợp lệ |
| Xác nhận đã bàn giao đầy đủ | Checkbox | USER-INPUT | required | Không | Mặc định false; QTV phải chủ động tích true; server kiểm tra lại |

Hành động popup: **Xác nhận bàn giao** bị vô hiệu khi chưa tích checkbox/đang gửi/preview không còn hợp lệ; **Hủy** hoặc nút đóng kết thúc trước gửi mà không tạo batch. Khi gửi, checkbox, ghi chú và hành động bị khóa. Nếu lỗi không phải stale, popup hiển thị lỗi và nút **Đóng và tải lại**, không cho gửi tiếp token cũ. Nút form không đưa vào bảng field.

## Alternate Flows

- AF01: Hủy trước gửi: không tạo batch; allocation chỉ còn trong ngữ cảnh US01 hiện hành, không được ghi vào payment.
- AF02: Bỏ trống ghi chú: vẫn xác nhận nếu các điều kiện khác hợp lệ.
- AF03: Gửi lại cùng token đã thành công: trả đúng batch gốc và handover_code gốc, không sửa ghi chú theo request lặp; không tạo thêm lượt bàn giao.
- AF04: Khoản ghi nhận muộn sau xác nhận vẫn có thể thuộc đợt kế tiếp với khoảng ngày trùng/chồng; batch cũ không bổ sung khoản đó. Nếu khoản mới xuất hiện trước xác nhận và làm thay tập preview thì xử lý stale, không âm thầm thêm vào batch.

## Exception Flows

- EF01: Quyền bị thu hồi, thiếu QTV/tài chính, scope ALL hoặc chi nhánh ngoài quyền: từ chối, không tạo batch.
- EF02: Kỳ sai, tập rỗng, còn unresolved hoặc tập nguồn thu thay đổi: chặn xác nhận; không bỏ khoản lỗi để xác nhận một phần.
- EF03: Checkbox không true hoặc note quá 1000 ký tự: từ chối cả khi request bỏ qua UI. Ghi chú không thay checkbox.
- EF04: Token thiếu/sai, hoặc token mới không khớp tập/tổng/tài khoản hiện hành: server từ chối. Với stale/xung đột 409, UI đóng popup, xóa allocation tạm và thông báo **Dữ liệu đã thay đổi. Đang tải lại bản xem trước; vui lòng kiểm tra và xác nhận lại.** QTV phải kiểm chứng/chọn lại tài khoản và tích lại checkbox.
- EF05: Các lần xác nhận khác token tranh cùng payment: tối đa một batch chứa payment; lần còn lại bị stale/xung đột, không tạo batch một phần. Không nhầm trường hợp này với replay cùng token đã thành công.
- EF06: Lỗi lưu rollback toàn bộ batch/chi tiết. Nếu mất phản hồi, UI không khẳng định chưa lưu: vô hiệu token, cho **Đóng và tải lại**, tra cứu lịch sử trước thử lại. Replay cùng token hợp lệ trả batch gốc.
- EF07: Các khoản BANK_TRANSFER chưa xác minh, kể cả legacy đang chờ làm rõ, vẫn bị chặn. Danh mục ngân hàng không tự điền từ VietQR/ENV.

## Activity Diagram — Swimlane

```mermaid
flowchart TB
  subgraph W18U2Boundary["Boundary - Web QTV W18 / Xác nhận bàn giao"]
    subgraph W18U2QTV["Swimlane - QTV có quyền tài chính"]
      W18U2I(("Initial"))
      W18U2A1["Bấm Xác nhận bàn giao từ nguồn thu"]
      W18U2A2["Kiểm tra tổng tiền, số giao dịch và tổng hợp nơi nhận"]
      W18U2D2{"Tiếp tục hay hủy?"}
      W18U2A3["Tích Xác nhận đã bàn giao đầy đủ; ghi chú tùy chọn"]
      W18U2A4["Bấm Xác nhận bàn giao trong form"]
      W18U2A5["Làm mới, đối chiếu lại trước lần xác nhận mới"]
    end
    subgraph W18U2SYS["Swimlane - SYS"]
      W18U2D1{"Đủ quyền, chi nhánh cụ thể, kỳ hợp lệ, tập không rỗng và hết unresolved?"}
      W18U2S1["Hiển thị tổng hợp preview hiện hành; checkbox chưa tích"]
      W18U2D3{"Quyền, scope và checkbox còn hợp lệ?"}
      W18U2D4{"Cùng token đã có batch, hay preview mới còn khớp?"}
      W18U2Replay["Trả batch gốc; không tạo hoặc sửa batch"]
      W18U2ReplayFinal((("Final - Idempotent, giữ nguyên batch đã có")))
      W18U2S2["Lưu nguyên tử batch và snapshot; một payment một batch"]
      W18U2D5{"Kết quả lưu?"}
      W18U2S3["Trả mã đợt; tải lại nguồn thu và lịch sử"]
      W18U2S4["Rollback toàn bộ khi lỗi lưu hoặc xung đột"]
      W18U2S5["Yêu cầu tra cứu lịch sử để xác minh phản hồi bị mất"]
      W18U2F1((("Final - Từ chối xem trước; quay lại đối chiếu")))
      W18U2F2((("Final - Hủy không tạo batch")))
      W18U2F3((("Final - Từ chối xác nhận")))
      W18U2F4((("Final - Preview cũ bị loại; bắt đầu lại US01")))
      W18U2F5((("Final - Bàn giao thành công; snapshot bất biến")))
      W18U2F6((("Final - Không lưu batch một phần")))
      W18U2F7((("Final - Chờ xác minh kết quả, không tự gửi lại")))
    end
  end
  W18U2I --> W18U2A1
  W18U2A1 --> W18U2D1
  W18U2D1 -->|Không| W18U2F1
  W18U2D1 -->|Có| W18U2S1
  W18U2S1 --> W18U2A2
  W18U2A2 --> W18U2D2
  W18U2D2 -->|Hủy hoặc đóng| W18U2F2
  W18U2D2 -->|Tiếp tục| W18U2A3
  W18U2A3 --> W18U2A4
  W18U2A4 --> W18U2D3
  W18U2D3 -->|Không| W18U2F3
  W18U2D3 -->|Có| W18U2D4
  W18U2D4 -->|Không khớp hoặc stale| W18U2A5
  W18U2A5 --> W18U2F4
  W18U2D4 -->|Token mới và toàn bộ tập khớp| W18U2S2
  W18U2D4 -->|Token đã xác nhận cùng kỳ và chi nhánh| W18U2Replay
  W18U2Replay --> W18U2ReplayFinal
  W18U2S2 --> W18U2D5
  W18U2D5 -->|Thành công| W18U2S3
  W18U2S3 --> W18U2F5
  W18U2D5 -->|Lỗi lưu hoặc xung đột đồng thời| W18U2S4
  W18U2S4 --> W18U2F6
  W18U2D5 -->|Không nhận được phản hồi| W18U2S5
  W18U2S5 --> W18U2F7
```

## Traceability

- [Epic QTV-W18](<../../../epic/qtv/QTV-W18-Bàn giao & tất toán doanh thu.md>): W18-BR01-BR10.
- [US01 - Nguồn thu](<QTV-W18-US01-Xem và đối chiếu nguồn thu chưa bàn giao.md>), [US03 - Lịch sử](<QTV-W18-US03-Tra cứu lịch sử bàn giao.md>).
- Bàn giao nội bộ; không phải khóa sổ kế toán Nhà nước hoặc quyết toán thuế; không mở khóa payment trước bàn giao.

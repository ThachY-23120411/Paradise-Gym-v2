# QTV-W01 — Tổng quan vận hành

- **Role:** QTV / Quản lý
- **Platform:** Web only
- **Menu:** `W01`
- **Goal:** Cung cấp trung tâm điều hành vận hành và giám sát tác nghiệp thời gian thực cho Quản trị viên tại chi nhánh hoặc toàn chuỗi, hỗ trợ tra cứu linh hoạt theo ngày (mặc định hôm nay hoặc chọn ngày bất kỳ qua Date Picker), tổng hợp tức thời 4 chỉ số KPI trọng yếu, nhật ký kiểm soát quẹt thẻ ra vào và lịch huấn luyện PT trong ngày được chọn.
- **Scope:** 
  1. **Ô chọn ngày tác nghiệp:** Hộp chọn ngày linh hoạt `[ 📅 dd/mm/yyyy ]` (Date Picker) trên thanh tiêu đề trang, mặc định nạp ngày hiện tại và cho phép chọn ngày bất kỳ trong quá khứ hoặc hôm nay.
  2. **Hàng 4 Thẻ KPI thống kê vận hành:** Đo lường tức thời số lượng Hội viên đang hoạt động, Tiền thực thu trong ngày (100% thanh toán, không công nợ), Số gói sắp hết hạn và Tổng số ca PT trong ngày được chọn.
  3. **Khối Ra/vào:** Nhật ký các lượt quẹt thẻ/nhận diện check-in trong ngày được chọn kèm trạng thái hợp lệ/cảnh báo.
  4. **Khối Lịch PT trong ngày:** Bảng timeline trực quan các ca dạy PT trong ngày được chọn theo các khung giờ (click vào thẻ ca tập để điều hướng sang W06 xem chi tiết).

---

## Thành phần giao diện (UI Components & Layout)

Giao diện `W01 · Tổng quan vận hành` được tổ chức khoa học theo bố cục bảng điều khiển (Dashboard) gồm ô chọn ngày và 3 khối nghiệp vụ chuyên biệt:

### 1. Header màn hình & Ô chọn ngày tác nghiệp (Page Header & Date Picker)
- **Bên trái — Tiêu đề trang:** Chữ in đậm nổi bật `Tổng quan`, dòng phụ thể hiện chi nhánh làm việc hiện tại (`dữ liệu theo chi nhánh`).
- **Bên phải — Ô chọn ngày tác nghiệp (Date Picker):** Hộp nhập kèm icon lịch `[ 📅 dd/mm/yyyy ]`, mặc định nạp ngày hiện tại. QTV có thể click mở popup lịch chọn ngày bất kỳ trong quá khứ hoặc hôm nay. Khi chọn ngày mới, toàn bộ dữ liệu các khối bên dưới tự động làm mới đồng bộ theo ngày được chọn.

### 2. Hàng 4 Thẻ KPI Vận hành chung (Interactive Metric Cards)
Được bố trí thành một hàng ngang gồm 4 thẻ chỉ số nạp theo ngày được chọn (có thể bấm để mở màn hình chuyên trách):
- **Thẻ Hội viên đang hoạt động:** Hiển thị icon thành viên (xanh lá), tổng lượng hội viên có hồ sơ `ACTIVE`, dòng phụ chú thích *Hồ sơ đang hoạt động*; click mở màn hình Hội viên (W02).
- **Thẻ Tiền thực thu hôm nay:** Hiển thị icon ví tiền (xanh dương), tổng số tiền đã thanh toán đủ 100% trong ngày (ví dụ: `8.850.000 đ`), dòng phụ chú thích *Dòng tiền đã xác nhận*; click mở màn hình Thu ngân (W08).
- **Thẻ Lượt check-in hôm nay:** Hiển thị icon cửa ra vào (teal), tổng lượt quét thẻ/nhận diện tại chi nhánh trong ngày; click mở Cổng kiểm soát ra vào (W07).
- **Thẻ Buổi PT trong ngày:** Hiển thị icon tạ tay (coral), tổng số ca tập PT được xếp lịch trong ngày được chọn; click mở Lịch tập PT (W06).

### 3. Khối Hôm nay cần xử lý — Chăm sóc khách hàng & Vận hành (Hàng 4 Thẻ KPI Chuyên Trách)
Được thiết kế đồng bộ theo giao diện thẻ KPI (tương tự như thẻ Hội viên đang hoạt động) với biểu tượng màu, số đếm nổi bật, chú thích hành động và hỗ trợ click điều hướng trực tiếp:
- **Sinh nhật hôm nay:** Số hội viên có sinh nhật đúng ngày hôm nay; click chuyển sang tab Sinh nhật của Chăm sóc khách hàng (W14) để gửi lời chúc hoặc tặng quà.
- **Gói sắp hết hạn (<= 4 ngày hoặc <= 3 buổi):** Số lượng gói tập còn <= 4 ngày hoặc <= 3 buổi theo quyền lợi áp dụng (tone đỏ cảnh báo nếu > 0); click chuyển sang tab Nhắc sắp hết hạn của W14.
- **Chờ nhắc gia hạn (14 ngày qua):** Số gói tập đã hết hạn trong 14 ngày gần nhất chưa gia hạn lại; click chuyển sang tab Chờ gia hạn của W14.
- **Đăng ký mới hôm nay:** Số hợp đồng mua gói mới hoặc gia hạn phát sinh trong ngày; click chuyển sang tab Đăng ký trong ngày của W14.

### 4. Khối Đăng ký mới hôm nay (New Registrations)
Hiển thị danh sách các hợp đồng gói tập vừa được tạo và thu tiền trong ngày:
- Thông tin hội viên, tên gói, số tiền thực thu, thời gian thanh toán và nhân viên thu ngân. Giúp chủ phòng tập nắm bắt chính xác dòng tiền thu về từ từng khách hàng.

### 5. Khối Ra/vào gần đây (Recent Check-ins)
Hiển thị danh sách các lượt quét mã/nhận diện ra vào cổng:
- Hỗ trợ 3 phương thức: **Nhận diện khuôn mặt (FaceID)**, **Quét mã QR Mobile**, và **Ghi nhận thủ công**.
- Hiển thị: Họ tên, giờ check-in, tên gói, cửa check-in, badge kết quả (`Hợp lệ`, `Sắp hết hạn <= 4 ngày hoặc <= 3 buổi`, `Không đủ điều kiện`).

### 6. Khối Lịch PT hôm nay (PT Schedule)
Bảng hiển thị các ca huấn luyện viên cá nhân theo timeline linh động trong ngày:
- Giờ bắt đầu, học viên, HLV phụ trách, trạng thái ca tập (`Đã ghi nhận`, `Đang diễn ra`, `Sắp tới`). Click vào ca tập để mở chi tiết buổi dạy hoặc điều hướng sang W06.

---

## User Stories trong Epic

| User Story | Loại giao diện | Khối UI tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [QTV-W01-US01 — Xem tổng quan vận hành](../../user-stories/qtv/QTV-W01-Tổng quan vận hành/QTV-W01-US01-Xem tổng quan vận hành.md) | Màn hình chính | **Dashboard Tổng quan** | Chọn ngày tác nghiệp qua Date Picker, xem 4 thẻ KPI vận hành, nhật ký kiểm soát ra vào và lịch tập PT trong ngày |

---

## Flow specification

Mỗi User Story của `QTV-W01` chứa precondition, trigger, main/alternate/exception flow, bảng đặc tả UI chi tiết và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/qtv/`](../../system-flow-specs/qtv/README.md).

## Traceability

- Shared capability catalog: [`W01` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit & Screenshot: [`screenshot/qtv/light-web-W01-tong-quan.png`](../../screenshot/qtv/light-web-W01-tong-quan.png).

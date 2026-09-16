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

### 2. Hàng 4 Thẻ KPI Vận hành (Metric Cards)
Được bố trí thành một hàng ngang gồm 4 thẻ chỉ số nạp theo ngày được chọn:
- **Thẻ Hội viên đang hoạt động:** Hiển thị icon thành viên (xanh dương), tổng lượng hội viên có hồ sơ `ACTIVE`, dòng phụ chú thích *Không gộp với trạng thái thanh toán*.
- **Thẻ Tiền thực thu trong ngày:** Hiển thị icon thẻ tiền (xanh lá), tổng số tiền thu được trong ngày được chọn khớp đúng 100% giá trị đăng ký (ví dụ: `5.650.000 đ`), dòng phụ chú thích *Giao dịch đã xác nhận* (loại bỏ hoàn toàn công nợ).
- **Thẻ Gói sắp hết hạn:** Hiển thị icon cảnh báo (tam giác vàng), số lượng gói tập sẽ hết hạn trong 14 ngày tới tính từ mốc ngày đang xem.
- **Thẻ Buổi PT trong ngày:** Hiển thị icon lịch hẹn (tím), tổng số ca tập PT được xếp lịch trong ngày được chọn, dòng phụ chú thích số lượng *buổi sắp tới* (nếu là ngày hôm nay) hoặc tổng số buổi đã diễn ra (nếu là ngày quá khứ).

### 3. Khối Ra/vào (Recent Check-ins)
Hiển thị danh sách các lượt quét mã/nhận diện ra vào cổng trong ngày được chọn:
- **Header khối:** Tiêu đề `Ra/vào`, dòng mô tả *Phân biệt nhận diện, điều kiện gói và ghi thủ công*.
- **Danh sách lượt check-in trong ngày:**
  + *Badge chiều:* Huy hiệu `VÀO` màu xanh mint nổi bật.
  + *Thông tin hội viên:* Họ tên in đậm (ví dụ: `Nguyễn Văn An`, `Phạm Thu Dung`).
  + *Dòng phụ:* `<Mã HV> · <Tên gói> · <Điểm check-in Gate>` (ví dụ: `HV001 · Gói 3 tháng · Gate-Q1-01`).
  + *Thời gian & Kết quả:* Mốc thời gian quẹt thẻ (`09:42`) kèm Badge trạng thái kiểm soát: `Hợp lệ` (xanh lá), `Sắp hết hạn` (vàng cam), `Không đủ điều kiện` (đỏ).

### 4. Khối Lịch PT trong ngày (PT Schedule)
Bảng hiển thị các ca huấn luyện viên cá nhân theo dòng thời gian của ngày được chọn:
- **Header khối:** Tiêu đề `Lịch PT · <Thứ, Ngày/Tháng/Năm>` cập nhật theo ngày đang chọn.
- **Dải thẻ ca tập theo giờ (Timeline Cards Grid):** Các thẻ ca tập xếp theo thứ tự mốc giờ trong ngày:
  + *Khung giờ:* Mốc giờ bắt đầu in đậm (ví dụ: `07:00`, `08:00`, `09:00`, `10:00`).
  + *Học viên:* Họ tên hội viên đặt lịch in đậm.
  + *HLV phụ trách:* Họ tên huấn luyện viên cá nhân phụ trách buổi tập.
  + *Badge trạng thái ca:* `Đã ghi nhận` (xanh lá nhạt), `Đang diễn ra` (vàng cam), `Sắp tới` (xanh dương nhạt).
  + Thao tác: Click vào thẻ ca tập để xem chi tiết buổi dạy hoặc điều hướng sang phân hệ Lịch tập (`W06`).

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

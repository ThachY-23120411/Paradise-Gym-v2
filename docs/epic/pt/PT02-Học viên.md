# PT02 — Học viên

- **Role:** Huấn luyện viên cá nhân (PT)
- **Platform:** Mobile only
- **Menu:** `PT02` (Footer tab `Học viên`)
- **Goal:** Cung cấp cho Huấn luyện viên công cụ quản lý toàn diện danh sách học viên đang phụ trách, theo dõi lộ trình và lịch sử tập luyện từng buổi, đồng thời chủ động tiếp nhận hoặc từ chối các yêu cầu phân công học viên mới.
- **Scope:** Tra cứu danh sách học viên phụ trách theo tên và SĐT; xem chi tiết lộ trình tập luyện và lịch sử các buổi đã dạy kèm ghi chú thể lực; duyệt (đồng ý / từ chối) yêu cầu phân công PT từ Hội viên. PT không xem thông tin tài chính, thanh toán hay công nợ của học viên.

---

## Thành phần giao diện (UI Components & Layout)

Giao diện `PT02 · Học viên` là phân hệ quản lý quan hệ học viên của Huấn luyện viên trên nền tảng Mobile App, bao gồm các khối thành phần nghiệp vụ sau:

### 1. Thanh tìm kiếm học viên (Search Bar)
- **Vị trí:** Nằm ở phần trên cùng của màn hình danh sách học viên.
- **Thành phần:** Ô nhập tìm kiếm kèm icon kính lúp, placeholder: `Tìm học viên được phân công...` và nút xóa nhanh `[×]` khi có ký tự.
- **Tác vụ:** Hỗ trợ PT gõ từ khóa (Họ tên hoặc Số điện thoại) để lọc danh sách học viên theo thời gian thực (real-time filtering).

### 2. Bộ chuyển phân loại tab (Tabs / Segmented Control)
- **Vị trí:** Nằm ngay dưới thanh tìm kiếm.
- **2 Tab phân loại:**
  - **Tab `Đang phụ trách`:** Mặc định chọn, hiển thị kèm số lượng học viên hiện tại (ví dụ: `Đang phụ trách (12)`). Nạp danh sách các thẻ học viên đang có hợp đồng PT còn hiệu lực (`PT02-US01`).
  - **Tab `Yêu cầu phân công`:** Hiển thị kèm badge đếm số lượng yêu cầu mới đang chờ duyệt nếu có (ví dụ: `Yêu cầu mới (2)` với badge đỏ). Nạp danh sách các yêu cầu chọn PT từ Hội viên đang ở trạng thái `Chờ tiếp nhận` (`PT02-US03`).

### 3. Danh sách Thẻ học viên phụ trách (Student Cards List — PT02-US01)
Mỗi thẻ học viên trong danh sách thể hiện đầy đủ các thông tin chuyên môn cần thiết:
- **Ảnh đại diện / Chữ viết tắt:** Avatar chữ cái đầu họ tên (ví dụ: `TB`, `VP`) với tông màu thương hiệu.
- **Họ tên & Thông tin định danh:** Họ và tên học viên (in đậm), Mã học viên và Số điện thoại (ví dụ: `HV002 · 0902 345 678`).
- **Gói PT & Hạn sử dụng:** Tên gói tập và Ngày hết hạn gói (ví dụ: `Gói PT 20 buổi · 20/09/2026`).
- **Badge trạng thái gói:**
  - `Đang hoạt động` (badge xanh lá): Gói tập còn hiệu lực và còn nhiều buổi tập.
  - `Sắp hết hạn` (badge vàng/cam): Gói tập còn dưới 7 ngày hoặc số buổi còn lại $\le 3$.
- **Cụm 2 chỉ số theo dõi:**
  - **Ô 1 — `Buổi PT còn lại`:** Hiển thị số buổi còn lại của gói (ví dụ: `3 Buổi PT`).
  - **Ô 2 — `Lần cuối`:** Hiển thị ngày diễn ra buổi tập hoàn thành gần nhất (`DD/MM/YYYY`), hoặc ký hiệu `-` nếu học viên mới chưa tập buổi nào. *(Tuyệt đối không hiển thị thông tin công nợ hay tài chính)*.
- **Thanh tiến độ buổi tập (Progress Bar):** Dải thanh tiến trình trực quan thể hiện tỷ lệ hoàn thành gói dạng `Đã tập X / Y buổi` kèm phần trăm (%) tiến độ, giúp PT nắm bắt ngay lộ trình của học viên trực tiếp trên thẻ danh sách.
- **Tương tác:** Chạm vào bất kỳ thẻ học viên nào để mở Màn hình `Chi tiết lộ trình & Lịch sử tập luyện của học viên` (`PT02-US02`).

### 4. Màn hình Chi tiết lộ trình & Lịch sử tập luyện của học viên (PT02-US02)
Màn hình thứ cấp (mở ra khi chạm vào thẻ học viên), bao gồm:
- **Thanh tiêu đề con:** Nút quay lại `[←]` góc trái và Tiêu đề `Lộ trình tập luyện`.
- **Thẻ tóm tắt hồ sơ:** Họ và tên học viên, Mã HV, Số điện thoại, Chi nhánh tập luyện, Tên gói PT và Thời hạn gói.
- **Thanh tiến độ lộ trình (Progress Bar):** Thể hiện trực quan tiến trình hoàn thành của gói dạng `Đã tập X / Y buổi` kèm thanh phần trăm (%) và số buổi còn lại `Còn lại Z buổi`.
- **Dải thẻ lịch sử từng buổi tập đã hoàn thành (Session History Timeline):**
  - Số thứ tự buổi: `Buổi 1`, `Buổi 2`, `Buổi 3`,...
  - Thời gian tập: Ngày tập (`DD/MM/YYYY`) và Khung giờ (`08:00 - 10:00`,...).
  - Trạng thái: Badge xanh lá `Hoàn thành`.
  - Khối ghi chú kết quả & Đánh giá thể lực: Toàn bộ nội dung bài tập, mức tạ, thể lực và nhắc nhở do PT đã ghi nhận sau buổi tập đó.
- **Trạng thái rỗng:** Nếu học viên mới chưa hoàn thành buổi nào, hiển thị card thông báo rỗng: `Học viên chưa có buổi tập hoàn thành nào trong lộ trình`.

### 5. Khối Thẻ & Modal Tiếp nhận và xử lý yêu cầu phân công PT (PT02-US03)
- **Thẻ yêu cầu phân công:**
  - Hiển thị thông tin học viên yêu cầu: Họ tên, Mã HV, SĐT, Chi nhánh đăng ký, Tên gói PT yêu cầu, Thời gian gửi yêu cầu và Ghi chú mong muốn của học viên (nếu có).
  - Cụm 2 nút hành động trực tiếp trên thẻ:
    - Nút Secondary `[Từ chối]`: Mở Bottom Sheet / Modal `Xác nhận từ chối yêu cầu phân công`.
    - Nút Primary `[Đồng ý tiếp nhận]`: Kích hoạt tiếp nhận học viên vào danh sách phụ trách chính thức của PT.
- **Modal / Bottom Sheet Xác nhận từ chối yêu cầu:**
  - Hiển thị thông tin tóm tắt học viên và gói tập bị từ chối.
  - Dropdown chọn `Lý do từ chối` định sẵn (`Trùng ca làm việc`, `Đã kín ca phụ trách`, `Không phù hợp mục tiêu tập luyện`, `Khác`).
  - Ô nhập văn bản nhiều dòng cho `Chi tiết lý do khác` khi chọn lý do `Khác`.

---

## User Stories và Màn hình tương ứng trong Epic

| User Story | Loại giao diện | Màn hình / Modal tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [PT02-US01 — Xem danh sách học viên được phân công](../../user-stories/pt/PT02-Học%20viên/PT02-US01-Xem%20danh%20s%C3%A1ch%20h%E1%BB%8Dc%20vi%C3%AAn%20%C4%91%C6%B0%E1%BB%A3c%20ph%C3%A2n%20c%C3%B4ng.md) | Màn hình chính (Mobile Screen) | **Danh sách học viên PT** | Bảng Field-level spec toàn diện màn hình: Thanh tìm kiếm, Bộ chuyển tab, Thẻ học viên hoạt động / sắp hết hạn, 2 ô chỉ số (buổi còn lại, lần cuối), Empty state |
| [PT02-US02 — Xem lộ trình và lịch sử tập luyện của học viên](../../user-stories/pt/PT02-Học%20viên/PT02-US02-Xem%20l%E1%BB%99%20tr%C3%ACnh%20v%C3%A0%20l%E1%BB%8Bch%20s%E1%BB%AD%20t%E1%BA%ADp%20luy%E1%BB%87n%20c%E1%BB%A7a%20h%E1%BB%8Dc%20vi%C3%AAn.md) | Màn hình thứ cấp (Sub-screen) | **Chi tiết lộ trình tập luyện** | Bảng Field-level spec màn hình: Nút Back, Hồ sơ học viên, Thông tin gói, Thanh tiến độ lộ trình, Danh sách thẻ buổi tập hoàn thành kèm ghi chú PT |
| [PT02-US03 — Tiếp nhận và xử lý yêu cầu phân công PT](../../user-stories/pt/PT02-Học%20viên/PT02-US03-Ti%E1%BA%BFp%20nh%E1%BA%ADn%20v%C3%A0%20x%E1%BB%AD%20l%C3%BD%20y%C3%AAu%20c%E1%BA%A7u%20ph%C3%A2n%20c%C3%B4ng%20PT.md) | Tab danh sách & Modal | **Yêu cầu phân công & Modal từ chối** | Bảng Field-level spec thẻ yêu cầu, nút Đồng ý/Từ chối và Bảng Field-level spec modal Từ chối tiếp nhận (Lý do định sẵn, Lý do chi tiết) |

---

## Flow specification

Mỗi User Story của `PT02` chứa precondition, trigger, main/alternate/exception flow, logic nghiệp vụ và activity diagram Mermaid swimlane.
Flow index role: [`docs/system-flow-specs/pt/`](../../system-flow-specs/pt/README.md).

## Traceability

- Role Epic index: [`docs/epic/pt/README.md`](README.md).
- System Flow Specs: [`docs/system-flow-specs/pt/README.md`](../../system-flow-specs/pt/README.md).
- Product Spec: [`docs/product-spec.md`](../../product-spec.md).

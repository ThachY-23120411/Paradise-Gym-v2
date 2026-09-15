# QTV-W10 — Báo cáo

- **Role:** QTV / Quản lý
- **Platform:** Web only
- **Menu:** `W10`
- **Goal:** Cung cấp bức tranh quản trị 360 độ toàn diện về doanh thu tài chính, sản lượng bán gói, tiến độ đào tạo PT và đối chiếu dòng tiền thực thu theo từng kỳ (Tháng / Quý / Năm) và phạm vi chi nhánh phân quyền.
- **Scope:** 
  1. **Thanh điều khiển & Chuyển kỳ báo cáo:** Chuyển đổi nhanh giữa các kỳ phân tích (`Tháng`, `Quý`, `Năm`), theo dõi phạm vi chi nhánh áp dụng và xuất dữ liệu báo cáo ra file Excel.
  2. **Hàng 4 Thẻ KPI cốt lõi (Metric Cards):** Đo lường tức thì 4 chỉ số sinh mệnh phòng gym: Tiền thực thu 100%, Tổng giá trị gói đã bán, Tổng số gói bán ra và Tổng số buổi tập PT đã hoàn thành.
  3. **Biểu đồ doanh thu & Phân tích cơ cấu gói (Charts & Distribution):** Biểu đồ cột so sánh trực quan doanh thu 3 kỳ gần nhất và thanh tiến trình tỷ trọng phần trăm từng gói tập bán chạy.
  4. **Bảng tổng hợp doanh thu (Revenue Datagridview):** Bảng gom dòng duy nhất cho mỗi mốc thời gian (theo từng Ngày khi xem Tháng; theo từng Tháng khi xem Quý/Năm), hiển thị Tổng số gói bán, Phân rã theo dịch vụ và Doanh thu thực thu 100%.

---

## Thành phần giao diện (UI Components & Layout)

Màn hình `W10 · Báo cáo` được thiết kế dưới dạng Dashboard quản trị kinh doanh & vận hành tập trung (dựa trên thiết kế chuẩn tại `screenshot/qtv/light-web-W10-bao-cao.png`):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Tháng] [Quý] [Năm]   [Tiền thực thu · Chi nhánh được cấp]           [📥 Xuất báo cáo] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌───────────────────────────┐ │
│ │ Tiền thực thu  │ │ Giá trị gói bán│ │  Gói đã bán    │ │ Buổi PT đã dạy            │ │
│ │ 18.200.000 đ   │ │ 21.300.000 đ   │ │  12            │ │ 64                        │ │
│ └────────────────┘ └────────────────┘ └────────────────┘ └───────────────────────────┘ │
├───────────────────────────────────────────────────────┬────────────────────────────────┤
│ DOANH THU 3 THÁNG GẦN NHẤT                            │ GÓI TẬP ĐÃ BÁN (CƠ CẤU %)      │
│ [Biểu đồ cột so sánh T7, T8, T9]                      │ [Progress Bars: PT 20, 3T, 1T] │
├───────────────────────────────────────────────────────┴────────────────────────────────┤
│ BẢNG TỔNG HỢP DOANH THU                                                                │
│ [Mốc thời gian (Ngày/Tháng) | Tổng số gói bán | Phân rã theo dịch vụ | Thực thu (100%)]│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Cụm thanh điều khiển & Bộ lọc kỳ (Report Control Bar)
- **Bộ nút chọn kỳ báo cáo (Segmented Buttons):** Cụm 3 nút chuyển kỳ: `[ Tháng ]` (mặc định được chọn), `[ Quý ]`, `[ Năm ]`. Khi bấm chuyển, hệ thống tự động làm mới toàn bộ số liệu trên dashboard và tự động chuyển đổi cấp độ gom nhóm của Bảng doanh thu.
- **Badge phạm vi chi nhánh:** Hiển thị chi nhánh đang được áp dụng lọc dữ liệu: `Tiền thực thu · Toàn bộ chi nhánh được cấp` hoặc `Tiền thực thu · {Tên chi nhánh}` theo bộ chọn chi nhánh toàn cục.
- **Nút Xuất báo cáo `[ 📥 Xuất báo cáo ]`:** Nút bấm màu xanh lá nổi bật có icon download; click xuất toàn bộ báo cáo và bảng đối chiếu thành file bảng tính Excel (`.xlsx`).

### 2. Hàng 4 Thẻ KPI chỉ số tổng hợp (Stat Cards)
1. `Tiền thực thu`: Hiển thị tổng số tiền thực thu 100% trong kỳ (ví dụ: `18.200.000 đ`), icon ví tiền, ghi chú mốc thời gian chốt dữ liệu (*Tính đến DD/MM/YYYY*).
2. `Giá trị gói đã bán`: Hiển thị tổng giá trị hợp đồng/gói tập đăng ký bán ra trong kỳ (ví dụ: `21.300.000 đ`), icon gói tập, ghi chú (*Tổng giá trị niêm yết*).
3. `Gói đã bán`: Hiển thị tổng số lượng gói tập đã bán trong kỳ (ví dụ: `12`), icon danh sách, nhãn kỳ báo cáo (*Tháng 9*).
4. `Buổi PT đã dạy`: Hiển thị tổng số buổi học PT hoàn thành hợp lệ (ví dụ: `64`), icon HLV, nhãn trạng thái (*Đã ghi kết quả*).

### 3. Khu vực Biểu đồ Doanh thu & Cơ cấu gói bán (Charts & Distribution)
- **Biểu đồ Doanh thu 3 kỳ gần nhất (Bar Chart):**
  - Hiển thị so sánh doanh thu 3 kỳ liên tiếp (ví dụ 3 tháng gần nhất: T7 `39 Trđ`, T8 `42 Trđ`, T9 `18 Trđ`).
  - Cột kỳ hiện tại được tô màu xanh lá đậm nổi bật; các kỳ trước tô màu xanh nhạt.
  - Phụ đề ghi rõ trạng thái kỳ: *Cột tháng 9 là dữ liệu chưa kết thúc kỳ*.
- **Khối Cơ cấu Gói tập đã bán (Distribution List):**
  - Thống kê tỷ trọng các gói tập bán chạy với số lượng bán, phần trăm và thanh tiến trình Progress bar màu sắc trực quan:
    * `Gói PT 20 buổi`: `3 · 42%` (thanh màu tím)
    * `Gói 3 tháng`: `4 · 33%` (thanh màu xanh dương)
    * `Gói 1 tháng`: `2 · 17%` (thanh màu xanh cyan)
    * `Gói khác`: `1 · 8%` (thanh màu vàng cam)

### 4. Bảng tổng hợp doanh thu (Datagridview)
Bảng minh bạch hóa dòng tiền thực thu 100% và gom dòng thông minh theo mốc thời gian:
1. `Cột Mốc thời gian`: Hiển thị `Ngày` (`DD/MM/YYYY`, ví dụ: `07/09/2026`) khi lọc `Tháng`; hiển thị `Tháng` (`Tháng MM/YYYY`, ví dụ: `Tháng 09/2026`) khi lọc `Quý` hoặc `Năm`.
2. `Cột Tổng số gói bán`: Tổng số gói/dịch vụ hoàn tất thanh toán trong mốc thời gian (ví dụ: `4 gói`).
3. `Cột Phân rã theo dịch vụ`: Tóm tắt cơ cấu dịch vụ (`2 Gói Gym · 1 Buổi PT · 1 Combo`).
4. `Cột Thực thu (100%)`: Tổng số tiền thực tế thu về 100% trong mốc thời gian (ví dụ: `11.250.000 đ`).

**Nguyên tắc xử lý dữ liệu và kỳ báo cáo:**
- **Cơ chế xác định kỳ:**
  + `Tháng`: Từ ngày 01 đến ngày cuối tháng (hoặc ngày hiện tại nếu tháng chưa qua hết, ví dụ `01/09/2026 → 07/09/2026`).
  + `Quý`: Tròn quý hiện tại (ví dụ Q3: `01/07/2026 → 30/09/2026`).
  + `Năm`: Tròn năm dương lịch (`01/01/2026 → 31/12/2026`).
- **Cơ chế gom nhóm dữ liệu:** Lọc Tháng hiển thị chi tiết từng ngày; Lọc Quý/Năm gom dòng theo từng tháng (tránh bảng 365 dòng).
- **Mỗi mốc thời gian 1 dòng duy nhất:** Không xé lẻ nhiều dòng trong 1 ngày, hiển thị tổng số gói và phân rã dịch vụ trên cùng một dòng.

---

## User Stories trong Epic

| User Story | Loại giao diện | Khối UI tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [QTV-W10-US01 — Xem báo cáo tổng hợp](../../user-stories/qtv/QTV-W10-Báo cáo/QTV-W10-US01-Xem báo cáo tổng hợp.md) | Màn hình chính | **Dashboard Báo cáo & Bảng doanh thu theo ngày** | Theo dõi 4 thẻ KPI, Biểu đồ doanh thu so sánh, Phân tích cơ cấu gói bán, Bảng tổng hợp doanh thu thực thu 100% và Xuất file Excel |

---

## Flow specification

Mỗi User Story của `QTV-W10` chứa precondition, main/alternate/exception flow, permission/data scope, postcondition và activity diagram Mermaid swimlane.
Flow index role: [`system-flow-specs/qtv/`](../../system-flow-specs/qtv/README.md).

## Traceability

- Shared capability catalog: [`W10` trong `docs/epics-menu-catalog.md`](../../epics-menu-catalog.md).
- UI audit & Screenshot: [`screenshot/qtv/light-web-W10-bao-cao.png`](../../screenshot/qtv/light-web-W10-bao-cao.png).

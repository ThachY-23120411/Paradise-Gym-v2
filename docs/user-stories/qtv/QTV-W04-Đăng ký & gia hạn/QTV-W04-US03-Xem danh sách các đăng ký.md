# QTV-W04-US03 - Xem danh sách các đăng ký

## Preconditions
- QTV đã đăng nhập, branch scope của QTV đã được xác định.

## Trigger
- QTV mở menu W04 hoặc chọn **Đăng ký & gia hạn**.
- Màn hình liên quan: Web QTV — W04 Đăng ký & gia hạn.

## Main Flow

1. QTV mở danh sách các đăng ký.
2. SYS xác định branch scope của QTV.
3. SYS hiển thị thanh Search & Filter Bar và danh sách các đăng ký gói theo branch scope thỏa mãn các tiêu chí lọc.
4. QTV có thể sử dụng bộ lọc **Tình trạng gán PT** để lọc nhanh các gói PT/COMBO chưa có PT phụ trách.
5. QTV xem các thông tin chi tiết trên từng dòng đăng ký hoặc thực hiện các thao tác nhanh (`[Chi tiết]`, `[Gán PT]`, `[Gia hạn]`, `[Thu tiền]`).

### Field-level specification — Bảng danh sách đăng ký gói (Data Grid View & Filter Bar)
| Field / control | Loại UI Control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Ô tìm kiếm đăng ký | `Textbox (Search Input)` | `USER-INPUT` | optional | Không | QTV gõ từ khóa: mã ĐK, họ tên HV, SĐT, tên gói để lọc nhanh danh sách thời gian thực |
| Bộ lọc trạng thái đăng ký | `Select Dropdown` | `USER-INPUT` | optional | Không | Mặc định `Tất cả`; các tùy chọn: `Tất cả`, `Chờ thanh toán`, `Chưa đến ngày hiệu lực`, `Đang hiệu lực`, `Đang đóng băng`, `Sắp hết hạn`, `Đã hết hạn`, `Đã hủy` |
| Bộ lọc tình trạng gán PT | `Select Dropdown` | `USER-INPUT` | optional | Không | Mặc định `Tất cả`; các tùy chọn: `Tất cả`, `Chưa gán PT` (lọc các đơn gói PT/COMBO chưa có HLV phụ trách), `Đã gán PT` (lọc các đơn đã phân công PT) |
| Mã | `Readonly Text` | `READONLY` | required | Không | SYS tự động sinh duy nhất từ `REGISTRATION.code` (ví dụ: "DK001", "DK002"); hiển thị văn bản mã đăng ký |
| Hội viên | `Readonly Text` | `READONLY` | required | Không | Tên hội viên chữ đậm, dòng phụ bên dưới hiển thị `{Mã HV} · {Chi nhánh}` (ví dụ: "Nguyễn Văn An"<br>"HV001 · Quận 1") |
| Gói đăng ký | `Readonly Text` | `READONLY` | required | Không | Tên gói đăng ký niêm yết từ `PACKAGE.name` (ví dụ: "Gói 3 tháng", "Gói PT 20 buổi") |
| Kỳ hiệu lực | `Readonly Text / Date` | `READONLY` | required | `DYNAMIC` | • Với gói có thời hạn ngày (`GYM_TIME`, `COMBO`): Khoảng ngày hiệu lực `{start_date} - {end_date}` theo định dạng `DD/MM/YYYY`.<br>• Với gói tính theo buổi vô thời hạn (`PT_SESSION`, `GYM_SESSION`): Hiển thị `Từ {start_date}` (không giới hạn số ngày). |
| Số tiền | `Currency Readonly Text (VND)` | `READONLY` | required | Không | Tổng giá trị thanh toán 100% của gói từ `REGISTRATION.price` (ví dụ: "1.350.000 đ", "3.800.000 đ"); hệ thống thanh toán 100% 1 lần duy nhất, không có công nợ |
| PT phụ trách | `Readonly Text` | `READONLY` | required | `DYNAMIC`: theo loại gói và trạng thái phân công | • Nếu là gói GYM: Hiển thị dấu gạch ngang `--`<br>• Nếu là gói có PT (gói PT hoặc COMBO):<br>  + Đã phân công PT: Hiển thị `{Tên PT} ({Mã PT})` (ví dụ: "Nguyễn Văn Thể (PT001)")<br>  + Chưa phân công PT: Hiển thị `Chưa có PT phụ trách` |
| Trạng thái | `Status Badge` | `READONLY` | required | `DYNAMIC`: theo trạng thái record | Hiển thị badge viền màu trực quan: `Đang hiệu lực` (viền xanh lá), `Đang đóng băng` (badge xanh băng tuyết `❄️ Đang đóng băng`), `Chưa đến ngày hiệu lực` (viền xanh dương/info), `Chờ thanh toán` (viền vàng cam), `Đã hết hạn` (viền xám), `Đã hủy` (viền đỏ) |
| Thao tác | `Action Buttons` | `USER-INPUT` | required | `DYNAMIC`: hiển thị nút theo loại gói và trạng thái | • Với gói PT 1 Kèm nhiều (`GROUP_1_N` / `GROUP_PT`) ở trạng thái `Đang hiệu lực` hoặc `Chưa đến ngày hiệu lực`: Bổ sung nút **`[Mời vào nhóm (X/Y)]`** hiển thị số lượng thành viên thực tế trên số lượng tối đa của nhóm để mở modal Quản lý thành viên nhóm PT<br>• Với gói PT/COMBO chưa có HLV phụ trách (ở trạng thái `Đang hiệu lực` hoặc `Chưa đến ngày hiệu lực` sau khi đã thanh toán 100%): Bổ sung nút nổi bật **`[Gán PT]`** (`QTV-W04-US05`) để mở nhanh modal Gán PT phụ trách<br>• Khi `Đang hiệu lực`, `Đang đóng băng` hoặc `Chưa đến ngày hiệu lực`: Nút `Chi tiết` (mở sidebar drawer `QTV-W04-US04`) và Nút viền xanh `Gia hạn` (`QTV-W04-US02`)<br>• Khi `Chờ thanh toán`: Nút nền vàng nổi bật `Thu tiền` (mở nhanh modal thanh toán 100% W08), Nút viền đỏ **`[Hủy đơn]`** (mở modal xác nhận hủy đơn đăng ký chưa thanh toán), và Nút `Chi tiết`<br>• Khi `Đã hết hạn`: Nút `Chi tiết` và Nút `Gia hạn` |

- **Thông tin khi bấm nút [Chi tiết] (Sidebar Drawer chi tiết lượt đăng ký gói):**
  - Mở sidebar drawer xem chi tiết lượt đăng ký gói (`QTV-W04-US04`) gồm 4 khối: Thông tin hội viên, Chi tiết gói tập, Trạng thái thanh toán 100% và **Tiến độ / Số buổi sử dụng** (kèm 2 thanh Progress bar Gym & PT trực quan).
  - Bảng danh sách Data Grid View không hiển thị cột tiến độ số buổi hay các cột công nợ để giữ giao diện bảng luôn thoáng và đồng nhất.

- **Business rules / logic:**
  - Hệ thống áp dụng nguyên tắc **thanh toán 100% 1 lần duy nhất**, không tồn tại khái niệm công nợ hay ghi nhận thanh toán thiếu.
  - Dữ liệu trên bảng danh sách là chỉ đọc (`READONLY`); các thao tác tạo mới hay gia hạn mở modal tương ứng.
  - Bộ lọc "Tình trạng gán PT" giúp QTV và Lễ tân nhanh chóng rà soát các hợp đồng PT/Combo vừa bán để phân công PT kịp thời cho hội viên.
  - Bấm nút **[Gán PT]** mở modal phân công HLV phụ trách trực tiếp (`QTV-W04-US05`).
  - Bấm nút **[Mời vào nhóm]** đối với gói PT hình thức 1 Kèm nhiều (`GROUP_1_N`): Mở modal "Quản lý thành viên nhóm PT" để xem danh sách thành viên hiện tại và mời thêm học viên vào nhóm. Số lượng thành viên nhóm (gồm 1 Trưởng nhóm đại diện đứng tên gói + các thành viên được mời) bắt buộc phải $\le$ số học viên tối đa của gói (`max_group_members`). Khi nhóm đã đủ học viên tối đa, hệ thống vô hiệu hóa chức năng thêm thành viên và hiển thị cảnh báo nhóm đã đầy.
  - Bấm nút **[Chi tiết]** tại từng dòng để xem thông tin chi tiết và tiến độ sử dụng dịch vụ của hội viên.

## Exception Flows
- Lỗi tải dữ liệu: hiển thị thông báo lỗi.

## Activity Diagram — Swimlane
**Trigger:** QTV mở Danh sách các đăng ký trong menu W04.

```mermaid
flowchart TB
  subgraph B["Boundary — QTV Web / W04 Danh sách các đăng ký"]
    subgraph L0["Swimlane — QTV"]
      I01(("Initial"))
      A01["Mở danh sách các đăng ký"]
      F01((("Final — Danh sách được hiển thị")))
      I01 --> A01
    end
    subgraph L1["Swimlane — SYS"]
      S01["Xác định branch scope"]
      S02["Hiển thị danh sách các đăng ký theo branch scope (Mã đăng ký, Tên hội viên, SĐT, Tên gói, Trạng thái)"]
      A01 --> S01 --> S02 --> F01
    end
  end
```

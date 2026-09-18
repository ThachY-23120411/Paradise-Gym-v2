# Báo Cáo Bàn Giao & Đồng Bộ Dữ Liệu Web Admin — Paradise Gym

- **Tab thực hiện:** Tab 1 (`anti-1-QTV-LT`) — Web Admin Portal Lead
- **Thời gian hoàn thành:** 2026-09-17
- **Phạm vi:** `frontend/web/`, `frontend/shared/apiClient.js`, backend endpoints bổ sung.

---

## 1. Kết Quả Đồng Bộ Dữ Liệu 100% (Relational Coherence)

Dữ liệu được seed chuẩn hóa toàn diện theo mô hình quan hệ 3NF giữa 22 bảng, khóa chính và khóa ngoại có liên kết mạch lạc:

1. **3 Chi nhánh hoạt động cố định 05:30 – 22:00:**
   - `CN-Q01` — Paradise Gym Quận 1
   - `CN-BT01` — Paradise Gym Bình Thạnh
   - `CN-Q02` — Paradise Gym Thảo Điền (Q2)

2. **10 Tài khoản & Phân quyền hoàn chỉnh:**
   - 1 Quản trị viên (`0900000001` - QTV) có branch scope toàn hệ thống.
   - 2 Lễ tân (`0900000002` Q1, `0900000004` BT).
   - 2 HLV cá nhân (`0900000003` - Nguyễn Văn Thể, `0900000005` - Trần Minh Tuấn).
   - 5 Hội viên (`HV001` Trần Thị Mai, `HV002` Lê Hoàng Nam, `HV003` Phạm Quốc Bảo, `HV004` Vũ Thu Thảo, `HV005` Đặng Tuấn Kiệt).

3. **5 Gói tập & Quyền hạn chi nhánh (`package_branches`):**
   - `GYM-1M` (1 Tháng) — 500.000 đ
   - `GYM-3M` (3 Tháng) — 1.350.000 đ
   - `VIP-YEAR` (1 Năm đa chi nhánh) — 4.800.000 đ
   - `PT-12S` (Kèm 1-1 12 buổi) — 3.600.000 đ
   - `COMBO-VIP` (Gym 30 ngày + 12 buổi PT) — 4.200.000 đ

4. **Hợp đồng đăng ký (`registrations`), Thanh toán 100% (`payments`) & Phiếu thu (`receipts`):**
   - Hợp đồng 1: Trần Thị Mai — Combo VIP (4.200.000 đ) -> Đã thanh toán 100% chuyển khoản VietQR, phiếu thu `PT-2026-001`, gói `ACTIVE`.
   - Hợp đồng 2: Lê Hoàng Nam — Gói Gym 3 Tháng (1.350.000 đ) -> Đã thanh toán 100% tiền mặt, phiếu thu `PT-2026-002`, gói `ACTIVE`.
   - Hợp đồng 3: Phạm Quốc Bảo — Gói PT 12 Buổi (3.600.000 đ) -> Đã thanh toán 100% VietQR, phiếu thu `PT-2026-003`, gói `ACTIVE`.
   - Hợp đồng 4: Vũ Thu Thảo — Gói VIP 1 Năm (4.800.000 đ) -> Đã thanh toán 100% VietQR, phiếu thu `PT-2026-004`, gói `ACTIVE`.
   - Hợp đồng 5: Đặng Tuấn Kiệt — Gói Gym 1 Tháng -> Trạng thái `PENDING_PAYMENT` (Chờ thu tiền kích hoạt tại quầy lễ tân).

5. **Lịch tập PT 5 ca chuẩn & Xác nhận kép:**
   - Buổi ca 08:00–10:00: HLV Thể & HV Mai -> Trạng thái `COMPLETED` (Xác nhận kép hoàn tất, đã trừ 1 buổi).
   - Buổi ca 14:00–16:00: HLV Tuấn & HV Bảo -> Trạng thái `PENDING_COMPLETION` (PT đã ký nhận, chờ học viên ký).
   - Buổi ngày mai 10:00–12:00: HLV Thể & HV Mai -> Trạng thái `BOOKED`.

6. **Kiểm soát cổng & Nhật ký ra vào thời gian thực:**
   - Hội viên có gói ACTIVE -> Trạng thái `ALLOWED` (Mở cổng).
   - Hội viên Đặng Tuấn Kiệt (gói `PENDING_PAYMENT`) -> Trạng thái `DENIED` kèm lý do cụ thể.

---

## 2. Các Cải Tiến UI & Trải Nghiệm Người Dùng

1. **Bỏ Popup tự động:** Khi người dùng vào trang Web, vào thẳng Bảng điều khiển Tổng quan; không bật modal che chắn.
2. **Loại bỏ toàn bộ mã Wxx:** Đổi toàn bộ tiêu đề menu thành tiếng Việt thân thiện (*Tổng quan, Hội viên, Gói tập, Đăng ký gói, Huấn luyện viên, Lịch tập PT, Cổng ra vào & Check-in, Thu tiền & Thanh toán, Thông báo, Báo cáo doanh thu, Chi nhánh, Thiết bị cổng, Tài khoản & Phân quyền*).
3. **Chuẩn DevExtreme:** Điều hướng mượt mà qua `dxList` và `dxDrawer`, bảng dữ liệu `dxDataGrid`, biểu đồ `dxChart` & `dxPivotGrid`, lịch biểu `dxScheduler`.
4. **Dữ liệu hoàn toàn là dữ liệu động:** Kết nối trực tiếp với backend qua Universal `apiClient.js` và hỗ trợ token linh hoạt cho QTV và Lễ tân.

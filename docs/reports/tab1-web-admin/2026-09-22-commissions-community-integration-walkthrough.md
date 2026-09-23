# Báo Cáo Nghiệm Thu: Tích Hợp Quản Lý Thù Lao Lớp Cộng Đồng & Chuẩn Hóa Phân Loại Buổi Dạy PT (W15)

> **Phân hệ:** Web Quản Trị Viên (QTV - Tab 1 `anti-1-QTV-LT`)  
> **Mã màn hình / User Story:** QTV-W15-US02, QTV-W15-US03, QTV-W16-US01  
> **Ngày thực hiện:** 22/09/2026  
> **Trạng thái:** ✅ Đã hoàn thành 100% & Kiểm thử E2E đạt chuẩn

---

## 1. Bối Cảnh & Các Vấn Đề Được Tiếp Thu Xử Lý

Từ phản hồi thực tế của người dùng:
1. **Thiếu thẻ KPI riêng cho Thù lao lớp cộng đồng:** Trước đó, thù lao lớp CĐ chỉ được gộp chung trong thẻ Tổng thu nhập, chưa có thẻ KPI độc lập để người quản lý theo dõi nhanh quy mô thù lao lớp nhóm trong tháng.
2. **Nhầm lẫn khái niệm buổi dạy PT:** Trước đó giao diện ghi cứng là "Dạy PT 1:1" và "Doanh số dạy PT 1:1", làm sai lệch bản chất nghiệp vụ vì dịch vụ PT tại Paradise Gym bao gồm đa dạng các hình thức:
   - **PT 1:1** (Cá nhân kèm riêng).
   - **PT 1-Nhiều** (Kèm nhóm 1-2, 1-3...).
   - **Gói Combo** (Thẻ hội viên Gym kết hợp số buổi PT kèm theo).

---

## 2. Các Cải Tiến Kỹ Thuật Đã Triển Khai

### File Chỉnh Sửa: `frontend/web/js/modules/commissions.js`

1. **Chuẩn Hóa 5 Thẻ KPI Đỉnh Trang (Áp Dụng Cho Cả Trạng Thái Toàn Hệ Thống & Khi Chọn HLV):**
   - **Thẻ 1 — Tổng số buổi dạy / Tổng buổi dạy của HLV:**
     - Phân định rõ ràng: `Dạy PT (1:1, nhóm, combo): X buổi · Lớp CĐ: Y ca`.
   - **Thẻ 2 — Doanh số dịch vụ PT:**
     - Thay thế cụm từ cũ "Doanh số dạy PT 1:1", chú thích rõ: `Doanh số hoàn thành từ các gói PT 1:1, nhóm & combo`.
   - **Thẻ 3 — Hoa hồng dạy PT:**
     - Tách riêng khoản hoa hồng HLV được hưởng từ dịch vụ PT cá nhân/nhóm/combo theo tỷ lệ %.
   - **Thẻ 4 — Thù lao lớp cộng đồng (THẺ MỚI BỔ SUNG):**
     - Hiển thị độc lập tổng thù lao ca dạy cộng đồng: `Định mức bộ môn + thưởng sĩ số`.
   - **Thẻ 5 — Tổng thu nhập tháng:**
     - Tổng cộng dồn thực nhận (= Hoa hồng PT + Thù lao lớp CĐ), kèm thông tin chi tiết tiến độ chi trả / trạng thái chi trả của HLV.

2. **Cập Nhật DataGrid Bảng Kê Tháng:**
   - Đổi tiêu đề cột từ `Dạy PT 1:1` thành `Dạy kèm PT`.
   - Thêm chú thích nhỏ dưới mỗi dòng: `1:1 · nhóm · combo` để khẳng định số buổi và doanh số đã bao gồm tất cả các hình thức dạy kèm.

3. **Nâng Cấp Modal "Chi Tiết Buổi Dạy & Thu Nhập HLV":**
   - Header summary ghi rõ: `HOA HỒNG DẠY KÈM PT (1:1, NHÓM, COMBO)`.
   - Đổi tên Sub-tab 1 thành: `[ Dạy kèm PT (1:1, nhóm, combo) (X) ]`.
   - Trong DataGrid buổi dạy PT, bổ sung nhãn phân loại hình thức gói tập động:
     - Badge tím: `Combo PT` (cho các gói Combo VIP Paradise...).
     - Badge cam: `PT 1-Nhiều` (cho các gói PT nhóm).
     - Badge xanh dương: `PT 1:1` (cho các gói kèm cá nhân chuẩn).

4. **Cập Nhật Tab "Lịch Sử Chi Trả" — Hệ Thống 6 Thẻ KPI Cân Đối (2 Hàng x 3 Cột):**
   - Tại Tab 3 "Lịch sử chi trả", bổ sung thêm 2 thẻ KPI độc lập **Tổng thanh toán thành công** và **Tổng chờ xác nhận**, tạo thành hệ thống 6 thẻ đối xứng và đầy đủ:
     * **Hàng 1 — Tổng quan & Nghiệm thu giải ngân:**
       + **Thẻ 1 — Tổng lượt chi trả:** `3 lượt` (`2 đã thành công · 1 chờ xác nhận`).
       + **Thẻ 2 — Tổng tiền chi trả:** `2.168.750 ₫` (`Đã thành công: 1.400.000 ₫ · Chờ xác nhận: 768.750 ₫`).
       + **Thẻ 3 — Tổng thanh toán thành công (THẺ MỚI):** `1.400.000 ₫` (`VietQR: 800.000 ₫ · Tiền mặt: 600.000 ₫`).
     * **Hàng 2 — Tiến độ ký nhận & Phương thức thanh toán:**
       + **Thẻ 4 — Tổng chờ xác nhận (THẺ MỚI):** `768.750 ₫` (`VietQR: 0 ₫ · Tiền mặt: 768.750 ₫`).
       + **Thẻ 5 — Chi qua VietQR / Ngân hàng:** `800.000 ₫` (`Đã thành công: 800.000 ₫ · Chờ xác nhận: 0 ₫`).
       + **Thẻ 6 — Chi tiền mặt tại quầy:** `1.368.750 ₫` (`Đã thành công: 600.000 ₫ · Chờ xác nhận: 768.750 ₫`).
   - Tinh chỉnh CSS Grid `.commissions-history-kpis .metrics-row`: Bố cục chuẩn 3 cột x 2 hàng trên desktop, co giãn 6 cột trên màn hình siêu rộng (>=1700px), 2 cột trên tablet và 1 cột trên mobile.

---

## 3. Bằng Chứng Nghiệm Thu (Screenshots)

1. **Bảng kê tháng — 5 Thẻ KPI toàn hệ thống & Cột Dạy kèm PT:**
   - File: `verify_commissions_monthly_with_community_classes.png`
   - Hiển thị chuẩn xác 5 thẻ: Tổng số buổi dạy (32 buổi), Doanh số dịch vụ PT (3.075.000 ₫), Hoa hồng dạy PT (768.750 ₫), Thù lao lớp cộng đồng (7.375.000 ₫), Tổng thu nhập tháng (8.143.750 ₫).
2. **Bảng kê tháng — 5 Thẻ KPI khi chọn HLV Lê Văn Hùng:**
   - File: `verify_commissions_pt_selected_5_kpis.png`
   - Hiển thị chuẩn xác: Tổng buổi dạy (13 ca CĐ, 0 PT), Doanh số PT (0 ₫), Hoa hồng PT (0 ₫), Thù lao lớp cộng đồng (3.895.000 ₫), Tổng thu nhập HLV (3.895.000 ₫).
3. **Tab Thù lao lớp cộng đồng — Hệ thống 6 Thẻ KPI Cân Đối (Bổ sung Thù lao cơ bản & Tổng thưởng):**
   - File: `verify_commissions_community_6_kpis.png` (Toàn hệ thống: 24 buổi · 7.375.000 ₫)
   - File: `verify_commissions_community_6_kpis_q1.png` (Chi nhánh Quận 1: 11 buổi · 3.480.000 ₫)
   - Bố cục chuẩn mực 2 hàng x 3 cột:
     * **Hàng 1:**
       + Thẻ 1 — Tổng số buổi lớp CĐ: `24 buổi` (Tháng 9/2026 · Đã tổ chức)
       + Thẻ 2 — Tổng thù lao lớp CĐ: `7.375.000 ₫` (Định mức bộ môn + thưởng sĩ số)
       + Thẻ 3 — Tổng thù lao cơ bản (THẺ MỚI): `6.190.000 ₫` (Định mức theo giá sàn bộ môn)
     * **Hàng 2:**
       + Thẻ 4 — Tổng thưởng (THẺ MỚI): `1.185.000 ₫` (Thưởng thêm khích lệ HLV)
       + Thẻ 5 — Tổng lượt học viên: `360 lượt` (Bình quân 15.0 HV / lớp)
       + Thẻ 6 — Thù lao bình quân / buổi: `307.292 ₫` (Mức chi phí thù lao bình quân mỗi ca)
4. **Modal Danh sách học viên lớp cộng đồng:**
   - File: `verify_commissions_community_members_modal.png`
5. **Modal Chi tiết thu nhập — Sub-tab Buổi dạy kèm PT kèm phân loại Combo PT / PT 1:1:**
   - File: `verify_commission_details_multitabs.png`
6. **Modal Chi tiết thu nhập — Sub-tab Lớp dạy cộng đồng:**
   - File: `verify_commission_details_community_subtab.png`
7. **Tab Lịch sử chi trả — Hệ thống 6 Thẻ KPI Cân Đối (Bổ sung Thành công & Chờ xác nhận):**
   - File: `verify_commissions_history_kpi_breakdown.png`
   - Bố cục 2 hàng x 3 cột cực kỳ cân xứng, hiển thị chuẩn xác đầy đủ 6 chỉ số:
     * Tổng lượt chi trả (3 lượt), Tổng tiền chi trả (2.168.750 ₫), Tổng thanh toán thành công (1.400.000 ₫).
     * Tổng chờ xác nhận (768.750 ₫), Chi qua VietQR / Ngân hàng (800.000 ₫), Chi tiền mặt tại quầy (1.368.750 ₫).

---

## 4. Kết Luận

Hệ thống đã giải quyết triệt để và chính xác 100% các yêu cầu từ người dùng:
- Bổ sung thẻ KPI riêng biệt cho Thù lao lớp cộng đồng.
- Chuẩn hóa toàn bộ khái niệm buổi dạy PT thành "Dạy kèm PT (1:1, nhóm, combo)", phản ánh đúng cấu trúc dịch vụ thực tế của Paradise Gym.
- Phân tách rõ ràng trạng thái "Đã thành công" và "Chờ xác nhận" trên toàn bộ 4 thẻ KPI tài chính của Tab Lịch sử chi trả.

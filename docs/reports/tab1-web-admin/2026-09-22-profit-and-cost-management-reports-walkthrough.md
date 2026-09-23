# Walkthrough: Báo Cáo Doanh Thu, Phân Rã Chi Phí & Đối Soát Lợi Nhuận Thực Tế (W10 BI Suite)

> **Tab Phụ Trách:** `anti-1-QTV-LT (Web Admin Lead)`  
> **Phạm vi triển khai:** `frontend/web/js/modules/reports.js` & `backend/src/modules/core/operations.js`  
> **Ngày cập nhật:** 22/09/2026  
> **Trạng thái:** ✅ Đã hoàn thành 100% & Kiểm thử E2E đạt chuẩn

---

## 1. Mục Tiêu Nghiệp Vụ & Yêu Cầu Cải Tiến

Theo yêu cầu từ ban quản trị, phân hệ **Báo cáo QTV (W10 BI Suite)** được tinh chỉnh chuyên sâu về hạch toán kế toán và phân rã dòng tiền:

1. **Thêm KPI "Doanh số bán gói" ở vị trí đầu tiên:**
   - Phản ánh tổng giá trị gói tập niêm yết bán ra trước khi trừ chiết khấu/voucher khuyến mại:
     $$\text{Doanh số bán gói} = \text{Tiền thực thu} + \text{Tiền giảm voucher}$$
2. **Chi tiết hóa cơ cấu tại thẻ KPI "Tổng chi phí":**
   - Phụ đề (caption) ghi rõ từng thành phần cấu thành chi phí:
     $$\text{Tổng chi phí} = \text{Thù lao lớp CĐ} + \text{Chi hoa hồng PT} + \text{Tiền giảm voucher}$$
3. **Loại bỏ 2 thẻ KPI vận hành bị thừa:**
   - Đã gỡ bỏ 2 thẻ "Gói đã bán" và "Buổi PT & Lớp CĐ", đưa Tầng 1 Hero Metrics về đúng **4 thẻ chỉ số tài chính cốt lõi**.
4. **Chuẩn hóa Bảng đối soát Doanh thu - Chi phí - Lợi nhuận (Sub-tab 1):**
   - Bảng kê chi tiết theo từng ngày/tháng với đúng 8 cột tài chính theo chuẩn kế toán:
     1. `Ngày` (hoặc `Tháng`)
     2. `Doanh số bán gói` (VND)
     3. `Thực thu (VND)`
     4. `Tiền giảm voucher` (VND)
     5. `Chi hoa hồng PT` (VND)
     6. `Thù lao lớp CĐ` (VND)
     7. `Tổng chi phí` (VND)
     8. `Lợi nhuận thực tế` (VND)
   - Đã loại bỏ cột `Tỷ suất LN` theo yêu cầu.
   - Hàng Footer Summary tính tổng chuẩn xác cho tất cả các cột doanh thu, giảm giá, chi phí và lợi nhuận.

---

## 2. Chi Tiết Triển Khai Kỹ Thuật

### 2.1. Backend API (`backend/src/modules/core/operations.js` - `GET /reports`):
- Truy vấn `payments` tổng hợp thêm:
  * `voucher_discount`: $\sum(\text{discount\_amount})$
  * `gross_package_revenue`: $\sum(\text{amount} + \text{discount\_amount})$
- Trả về trong payload `metrics`:
  ```json
  {
    "gross_package_revenue": 60513000,
    "cash_received": 60511100,
    "voucher_discount": 1900,
    "pt_commission_cost": 768750,
    "community_class_cost": 2795000,
    "total_expense": 3565650,
    "net_profit": 56947350
  }
  ```

### 2.2. Frontend Web Admin (`frontend/web/js/modules/reports.js`):
- **Tầng 1 (Hero Metric Cards):** 4 thẻ tài chính:
  1. `Doanh số bán gói`: 60.513.000 ₫ · `Tổng tiền gói chưa tính voucher` (Tone: blue, Icon: tags)
  2. `Tiền thực thu`: 60.511.100 ₫ · `Tổng thực thu các hợp đồng` (Tone: green, Icon: wallet)
  3. `Tổng chi phí`: 3.565.650 ₫ · `Lớp CĐ: 2.795.000 ₫ · Hoa hồng PT: 768.750 ₫ · Giảm giá: 1.900 ₫` (Tone: amber, Icon: money-bill-transfer)
  4. `Lợi nhuận thực tế`: +56.947.350 ₫ · `Doanh thu thực tế trừ chi phí` (Tone: green, Icon: chart-line)
- **Hàm `fillCompleteTimeline`:**
  - Tự động map `gross_package_revenue` và `voucher_discount` theo từng ngày trong kỳ để bảng đối soát hiển thị đầy đủ và không bị khuyết dữ liệu.
- **DataGrid `renderReconciliationTable`:**
  - Cấu hình 8 cột rõ ràng, định dạng tiền tệ Manrope, căn lề phải cho cột số liệu, hiển thị dấu gạch ngang `-` khi giá trị bằng 0.
  - Hàng tổng kết `summary.totalItems` khớp từng chỉ số dọc theo toàn bảng.
- **Xuất Báo Cáo ExcelJS (`exportReport`):**
  - Cập nhật cả 2 sheet tổng hợp và doanh thu với đủ 8 trường dữ liệu tài chính mới.

---

## 3. Kết Quả Kiểm Thử E2E Tự Động (UI Evidence)

Kịch bản Puppeteer E2E `tests/test_verify_reports_financial_breakdown.cjs` đã thực thi thành công 100%:

### 3.1. 4 Thẻ KPI Tài Chính Tinh Gọn & Biểu Đồ
- Doanh số bán gói: `60.513.000 ₫`.
- Thực thu: `60.511.100 ₫`.
- Tổng chi phí: `3.565.650 ₫` (Lớp CĐ: 2.795.000 ₫ · Hoa hồng PT: 768.750 ₫ · Giảm giá: 1.900 ₫).
- Lợi nhuận thực tế: `+56.947.350 ₫`.
![4 Thẻ KPI Tài Chính](file:///E:/Antigravity%20-%20Copy/Profiles/Profile6/.gemini/antigravity/brain/8f603014-e613-4055-a510-ef40fa67cfcb/verify_reports_4_financial_kpis.png)

### 3.2. Bảng Đối Soát 8 Cột Chuẩn Mực
- Đầy đủ các cột: Ngày, Doanh số bán gói, Thực thu (VND), Tiền giảm voucher, Chi hoa hồng PT, Thù lao lớp CĐ, Tổng chi phí, Lợi nhuận thực tế.
- Hàng tổng cộng dưới chân bảng tính tổng khớp 100% với các thẻ KPI Tầng 1.
![Bảng đối soát doanh thu chi phí](file:///E:/Antigravity%20-%20Copy/Profiles/Profile6/.gemini/antigravity/brain/8f603014-e613-4055-a510-ef40fa67cfcb/verify_reports_reconciliation_table.png)

---

## 4. Nâng Cấp Biểu Đồ 1.1: Trực Quan Hóa Kỳ Bị Lỗ & Chế Độ Xem Cột Phân Kỳ / Cột & Đường

### 4.1. Vấn đề phát sinh:
- Biểu đồ cũ gán cứng màu xanh ngọc (`#0d9488`) cho chuỗi Lợi nhuận ròng, không có vạch chuẩn mốc 0 hòa vốn. Khi cơ sở kinh doanh bị lỗ ($\text{Net Profit} < 0$), biểu đồ không phản ánh được mức độ rủi ro, gây hiểu nhầm là vẫn đang có lãi.

### 4.2. Giải pháp kỹ thuật đã triển khai:
1. **Bộ nút chuyển đổi chế độ xem (`dxButtonGroup`):**
   - Đặt tại góc phải tiêu đề của Card Biểu đồ 1.1: gồm `Cột phân kỳ` (mặc định) và `Cột & Đường` (Combo).
2. **Xử lý số liệu âm & Đổi màu tự động (`customizePoint`):**
   - Khi $\text{net\_profit} \ge 0$ (LÃI): Cột/Điểm mang màu xanh ngọc TEAL (`#0d9488`).
   - Khi $\text{net\_profit} < 0$ (LỖ): Cột cắm ngược xuống dưới trục 0đ và tự động đổi sang màu **ĐỎ rực (`#ef4444`)** để cảnh báo thâm hụt tài chính.
3. **Đường chuẩn hòa vốn (`constantLines`):**
   - Thêm đường kẻ chuẩn ngang tại mức `0` với nhãn `0đ (Hòa vốn)` màu xám đậm (`#64748b`), giúp phân định rõ rệt giữa vùng lãi và vùng lỗ.
4. **Cố định trục hoành (`argumentAxis`):**
   - Ghim `position: 'bottom'` để nhãn thời gian (tháng/kỳ) luôn nằm ngay ngắn dưới đáy biểu đồ, không bị đè lấp hay nhảy lộn xộn khi có cột số âm cắm xuống.
5. **Tooltip & Chú giải tương thích:**
   - Tooltip phân biệt rõ: `Lợi nhuận ròng (LỖ): -X đ` (màu đỏ) vs `Lợi nhuận ròng (LÃI): +X đ` (màu xanh).
   - Legend chú thích: `Lợi nhuận (Lãi xanh / Lỗ đỏ)` hoặc `Lợi nhuận (Đường xu hướng)`.

### 4.3. Minh chứng giao diện thực tế (UI Screenshots):
- **Chế độ 1: Cột phân kỳ khi có tháng Lỗ (Tháng 2026-08 bị lỗ -60 Tr cắm xuống màu đỏ):**
  ![Cột phân kỳ có tháng lỗ](file:///E:/Antigravity%20-%20Copy/Profiles/Profile4/.gemini/antigravity/brain/cf22d6e0-20cc-4a19-9c08-c386ee4a543d/live_reports_chart1_bar_with_loss.png)
- **Chế độ 2: Cột & Đường xu hướng khi có tháng Lỗ (Đường cong lượn xuống âm và điểm chấm đỏ cảnh báo):**
  ![Cột và đường xu hướng có tháng lỗ](file:///E:/Antigravity%20-%20Copy/Profiles/Profile4/.gemini/antigravity/brain/cf22d6e0-20cc-4a19-9c08-c386ee4a543d/live_reports_chart1_combo_with_loss.png)

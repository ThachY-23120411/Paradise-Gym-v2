# Báo Cáo Bàn Giao: Nâng Cấp Phân Hệ Báo Cáo Quản Trị 3 Tab (W10 - Executive Gym BI Dashboard)

**Dự án:** Paradise Gym  
**Phân hệ:** Web Quản Trị Viên (QTV) — Menu `W10 · Báo cáo`  
**Tab thực thi:** Tab 1 (`anti-1-QTV-LT`)  
**Ngày hoàn thiện:** 20/09/2026  
**Trạng thái kiểm thử:** PASS 431/431 HTTP checks trên PostgreSQL độc lập; Giao diện Web nạp động 100% từ Database.

---

## 1. Tóm Tắt Mục Tiêu & Yêu Cầu Người Dùng

Người Dùng yêu cầu tái thiết kế toàn diện màn hình Báo cáo (W10) để đạt tiêu chuẩn đẳng cấp ("WOW") với hệ thống biểu đồ đa dạng và chia thành **3 Tab Phân Tích Chuyên Sâu (Phương án B)**:
- **Tab 1:** Doanh thu & Dòng tiền (Spline Area Chart xu hướng thực thu + Bar Chart so sánh 3 kỳ + Bảng tổng hợp dòng tiền).
- **Tab 2:** Cơ cấu Gói & Dịch vụ (Doughnut Chart vành khăn tâm rỗng + Stacked Bar Chart phân rã Gym/PT/Combo + Bảng chi tiết sản lượng từng gói).
- **Tab 3:** Hiệu suất Đào tạo PT (Bar Chart xếp hạng số buổi dạy HLV + Thẻ chỉ số năng suất + Bảng chi tiết kết quả đào tạo theo HLV).

---

## 2. Các Hạng Mục Kỹ Thuật Đã Triển Khai

### 2.1. Nâng cấp Backend REST API (`backend/src/modules/core/operations.js`)
- Mở rộng query param cho `GET /reports`: Tiếp nhận `period` (`month`, `quarter`, `year`), `year`, `month`, `quarter`.
- Bổ sung trường `package_type` và `revenue` trong mảng `distribution` để phục vụ phân tích cơ cấu doanh thu theo từng gói.
- Bổ sung truy vấn **`pt_performance`**:
  - Tính tổng số buổi dạy hoàn thành (`completed_sessions`) theo từng HLV trong kỳ.
  - Đếm số học viên riêng biệt (`unique_students`) mà HLV đó phục vụ.
  - Trả về danh sách HLV kèm `pt_code`, `full_name`, `phone`, `avatar_url`.

### 2.2. Tái Cấu Trúc Frontend Web Portal (`frontend/web/js/modules/reports.js`)
- **Tầng 1 - Bộ lọc thời gian linh hoạt:**
  - Bộ nút chọn kỳ: `[ Tháng ]` `[ Quý ]` `[ Năm ]`.
  - Bộ chọn Năm (`2025`, `2026`, `2027`) và Tháng (1 - 12) / Quý (1 - 4) tự động cập nhật khi đổi kỳ.
- **Tầng 2 - 4 Thẻ Hero Metric Cards:**
  - Tiền thực thu (`metrics.cash_received`), Giá trị gói đã bán (`metrics.package_value`), Gói đã bán (`metrics.packages_sold`), Buổi PT đã dạy (`metrics.completed_pt`).
- **Tầng 3 - 3 Tab Phân Tích Chuyên Sâu (`dxTabs`):**
  - **Tab 1: Doanh thu & Dòng tiền:**
    - `dxChart` (`splineArea`): Đường cong mềm phủ gradient xanh rừng `#237b58` thể hiện nhịp điệu dòng tiền từng ngày.
    - `dxChart` (`bar`): So sánh 3 kỳ gần nhất với cột kỳ hiện tại highlight nổi bật.
    - `dxDataGrid`: Bảng tổng hợp dòng tiền theo mốc thời gian kèm phân rã dịch vụ và tổng cộng.
  - **Tab 2: Cơ cấu Gói & Dịch vụ:**
    - `dxPieChart` (`doughnut`): Tỷ trọng gói tập bán chạy với Center Template hiển thị tổng số gói ở tâm tròn rỗng.
    - `dxChart` (`stackedBar`): Phân rã 3 nhóm dịch vụ (Gym vs PT vs Combo) theo thời gian.
    - `dxDataGrid`: Bảng chi tiết từng gói kèm thanh tỷ trọng % và doanh thu thu về.
  - **Tab 3: Hiệu suất Đào tạo PT:**
    - `dxChart` (`bar`): Bảng xếp hạng số buổi dạy hoàn thành của từng Huấn luyện viên.
    - Cụm thẻ chỉ số mini: Tổng buổi PT, số HLV tham gia dạy, số học viên phục vụ, năng suất trung bình.
    - `dxDataGrid`: Chi tiết kết quả đào tạo theo từng HLV kèm avatar, số buổi và tỷ trọng đóng góp.
- **Xuất Excel Đa Sheet (ExcelJS):**
  - Xuất 4 sheet chuyên nghiệp: *Tong hop, Doanh thu & Dong tien, Co cau goi tap, Hieu suat PT*.

---

## 3. Đồng Bộ Tài Liệu Quy Chuẩn & Kiểm Thử
- Đã đồng bộ User Story [`QTV-W10-US01`](file:///e:/Desktop/para/docs/user-stories/qtv/QTV-W10-Báo%20cáo/QTV-W10-US01-Xem%20báo%20cáo%20tổng%20hợp.md).
- Đã cập nhật Epic [`QTV-W10`](file:///e:/Desktop/para/docs/epic/qtv/QTV-W10-Báo%20cáo.md).
- Cache buster: `reports.js?v=2` trong `frontend/web/index.html`.
- `npm test`: **PASS 431/431 HTTP checks** trên PostgreSQL.

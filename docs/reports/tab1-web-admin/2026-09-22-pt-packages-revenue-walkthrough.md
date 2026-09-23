# Báo Cáo Bàn Giao: Thêm Tab "Doanh Thu Gói PT/COMBO" & Đổi Tên Tab "Bảng Kê Thu Nhập Tháng" (Menu W15)

- **Ngày thực hiện:** 22/09/2026
- **Phân vai Multi-Agent Mesh:** Tab 1 `anti-1-QTV-LT` (Web Admin Lead)
- **Phạm vi mã nguồn:** `frontend/web/js/modules/commissions.js`, `docs/epic/qtv/QTV-W15-Quản lý hoa hồng PT.md`, `docs/user-stories/qtv/QTV-W15-Quản lý hoa hồng PT/QTV-W15-US02-Tính và duyệt bảng kê hoa hồng PT theo tháng.md`

---

## 1. Mục Tiêu Nghiệp Vụ & Yêu Cầu

1. **Đổi tên Tab 1:** Từ *"Bảng kê hoa hồng tháng"* thành **"Bảng kê thu nhập tháng"** để phản ánh chính xác nội dung tổng hợp thu nhập tháng của HLV (gồm cả Hoa hồng PT/Combo và Thù lao lớp cộng đồng).
2. **Thêm mới Tab 2 — "Doanh thu gói PT/COMBO":**
   - Vị trí: Tab thứ 2, ngay sau Tab "Bảng kê thu nhập tháng".
   - **Bộ lọc:** Lọc theo kỳ tháng (Tháng 1-12, Năm 2025-2030) và lọc theo Huấn luyện viên PT (Dropdown có tùy chọn *"Tất cả huấn luyện viên"* `ALL` và từng HLV thuộc chi nhánh/toàn hệ thống).
   - **Bộ 4 thẻ KPI động:**
     1. *Tổng số buổi dạy:* Tổng số ca dạy PT `COMPLETED` trong kỳ.
     2. *Doanh số dịch vụ PT:* Doanh thu quy đổi từ các gói PT đã phục vụ (`session_pt_value`).
     3. *Hoa hồng PT:* Tổng tiền hoa hồng HLV nhận được từ các buổi dạy kèm (`session_commission`).
     4. *Gói tập phục vụ:* Số lượng gói tập và học viên khác nhau mà HLV đã huấn luyện.
     - Toàn bộ 4 KPI cập nhật động tức thì khi chọn HLV trên dropdown.
   - **Bảng dữ liệu DataGrid chi tiết:**
     - Lưu trữ trong kỳ tháng đó PT đã dạy những ca/gói nào: Ngày tập, Khung giờ, Huấn luyện viên, Chi nhánh, Học viên, Gói tập & hình thức (`PT 1:1`, `Combo PT`, `PT 1-Nhiều`, kèm mã hợp đồng `reg_code`), Buổi số / Tổng số buổi gói, Doanh số buổi quy đổi, Tỷ lệ hoa hồng (%), Hoa hồng buổi, Trạng thái (`Đã hoàn thành`).
     - Tích hợp Search Panel tìm kiếm nhanh và Paging.
     - Dòng chân bảng (Summary footer): Tự động tính Tổng số buổi dạy, Tổng doanh số dịch vụ PT, Tổng hoa hồng PT.
   - **Nút "Xuất CSV":** Hỗ trợ xuất file đối soát chuẩn UTF-8 BOM tên `Doanh_thu_goi_PT_COMBO_T{month}_{year}_{pt_name}.csv`.

---

## 2. Chi Tiết Thực Thi Kỹ Thuật

### 2.1. Frontend Web (`frontend/web/js/modules/commissions.js`)
- Cập nhật cấu trúc 5 tabs phân hệ Quản lý hoa hồng PT:
  1. `monthly`: **Bảng kê thu nhập tháng**
  2. `pt_packages`: **Doanh thu gói PT/COMBO**
  3. `community`: **Thù lao lớp cộng đồng**
  4. `history`: **Lịch sử chi trả**
  5. `configs`: **Cấu hình tỷ lệ hoa hồng**
- Triển khai hàm `renderPtPackagesRevenueTab(container, version)`:
  - Khởi tạo toolbar lọc: Tháng (`dxSelectBox`), Năm (`dxNumberBox`), HLV (`dxSelectBox` hỗ trợ tìm kiếm).
  - Tích hợp nút *"Tải lại"* và nút *"Xuất CSV"*.
  - Nạp dữ liệu đồng thời từ API `/commissions/monthly` và chi tiết `/commissions/:id/details` của từng HLV trong kỳ.
  - Xử lý cache dữ liệu cục bộ trong kỳ để khi người dùng đổi HLV trên dropdown, toàn bộ 4 thẻ KPI và DataGrid được cập nhật **tức thì 0ms latency** mà không cần reload API.
- Triển khai hàm `exportPtSessions(sessions, month, year, ptName)`:
  - Kết xuất CSV chuẩn hóa UTF-8 BOM, tương thích hoàn toàn Excel không bị lỗi font tiếng Việt.
- **Tinh chỉnh giao diện (22/09/2026):** Loại bỏ hoàn toàn các badge nhãn hình thức rườm rà (`Combo PT`, `PT 1:1`, `PT 1-Nhiều`) trong cột *Gói tập* ở cả Tab *Doanh thu gói PT/COMBO* và popup *Chi tiết* của HLV theo đúng yêu cầu Người Dùng, trả lại giao diện tối giản, thanh lịch chuẩn Administrative Forest Clean.

### 2.2. Tài Liệu Đặc Tả (Epic & User Story)
- Đã đồng bộ 100% vào `docs/epic/qtv/QTV-W15-Quản lý hoa hồng PT.md` (cấu trúc 5 tab chuẩn).
- Đã đồng bộ vào `docs/user-stories/qtv/QTV-W15-Quản lý hoa hồng PT/QTV-W15-US02-Tính và duyệt bảng kê hoa hồng PT theo tháng.md`:
  - Cập nhật tên tab "Bảng kê thu nhập tháng" (Tab 1).
  - Bổ sung bảng Field-level specification cho Tab 2 "Doanh thu gói PT/COMBO" chuẩn hóa `TRIGGER`, `DYNAMIC`, `CONDITIONAL`.
  - Bổ sung luồng phụ `AF-03 — Tra Cứu Và Đối Soát Doanh Thu Gói PT/COMBO Theo Huấn Luyện Viên`.
  - Cập nhật luồng thù lao lớp cộng đồng sang `AF-04` (Tab 3).

---

## 3. Kết Quả Kiểm Thử Thực Tế (E2E Test PASS 100%)

Đã chạy kiểm thử tự động E2E bằng UI thật qua Puppeteer (`tests/e2e/test_verify_pt_packages_revenue_tab.cjs`):

1. **Kiểm tra Tab 1 & Tab 2:**
   - Tab 1 đã đổi tên thành *"Bảng kê thu nhập tháng"*.
   - Tab 2 *"Doanh thu gói PT/COMBO"* đã hiển thị đúng vị trí và hoạt động hoàn hảo.
2. **Kiểm tra Chế độ "Tất cả huấn luyện viên" (`ALL`):**
   - KPI Tổng số buổi dạy: `17` buổi.
   - KPI Doanh số dịch vụ PT: `4.125.533 đ`.
   - KPI Hoa hồng PT: `978.857 đ`.
   - KPI Gói tập phục vụ: `3 gói` (2 học viên).
   - DataGrid hiển thị đầy đủ 17 buổi của cả 2 HLV (`PT001 Nguyễn Văn Thể` và `PT002 Lê Văn Hùng`).
3. **Kiểm tra Lọc theo "Nguyễn Văn Thể (PT001)":**
   - KPI Tổng số buổi dạy: `8` buổi.
   - KPI Doanh số dịch vụ PT: `3.075.000 đ`.
   - KPI Hoa hồng PT: `768.750 đ` (Tỷ lệ 25%).
   - KPI Gói tập phục vụ: `1 gói` (1 học viên).
   - DataGrid tự động lọc chính xác 8 buổi dạy của HLV Thể.
4. **Kiểm tra Lọc theo "Lê Văn Hùng (PT002)":**
   - KPI Tổng số buổi dạy: `9` buổi.
   - KPI Doanh số dịch vụ PT: `1.050.533 đ`.
   - KPI Hoa hồng PT: `210.107 đ` (Tỷ lệ 20%).
   - KPI Gói tập phục vụ: `2 gói` (1 học viên).
   - DataGrid tự động lọc chính xác 9 buổi dạy của HLV Hùng.

---

## 4. Hình Ảnh Minh Chứng Giao Diện Thực Tế

### 4.1. Tab "Doanh thu gói PT/COMBO" — Chế độ Tất cả Huấn luyện viên
![Doanh thu gói PT/COMBO - Tất cả HLV](file:///E:/Antigravity%20-%20Copy/Profiles/Profile7/.gemini/antigravity/brain/b7a3ccd6-c991-4f48-b816-dabe12bb72d2/verify-commissions-tab-all-pt.png)

### 4.2. Tab "Doanh thu gói PT/COMBO" — Lọc theo HLV Nguyễn Văn Thể (PT001)
![Doanh thu gói PT/COMBO - HLV Nguyễn Văn Thể](file:///E:/Antigravity%20-%20Copy/Profiles/Profile7/.gemini/antigravity/brain/b7a3ccd6-c991-4f48-b816-dabe12bb72d2/verify-commissions-tab-pt001.png)

### 4.3. Tab "Doanh thu gói PT/COMBO" — Lọc theo HLV Lê Văn Hùng (PT002)
![Doanh thu gói PT/COMBO - HLV Lê Văn Hùng](file:///E:/Antigravity%20-%20Copy/Profiles/Profile7/.gemini/antigravity/brain/b7a3ccd6-c991-4f48-b816-dabe12bb72d2/verify-commissions-tab-pt002.png)

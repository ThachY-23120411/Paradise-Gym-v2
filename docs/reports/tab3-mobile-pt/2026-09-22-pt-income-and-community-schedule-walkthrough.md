# Báo Cáo Bàn Giao: Nâng Cấp Phân Hệ Thu Nhập & Lịch Dạy Lớp Cộng Đồng (Mobile PT)

**Ngày hoàn tất:** 22/09/2026  
**Người thực hiện:** anti-3-PT (Mobile PT Lead)  
**Phạm vi:** `frontend/mobile/pt/`, `backend/src/modules/core/community.js`

---

## 1. Tóm Tắt Yêu Cầu & Nghiệp Vụ Đã Thực Hiện

1. **Menu "Hoa hồng" đổi tên thành "Thu nhập"**:
   - Nhãn Bottom Nav đổi thành "Thu nhập", icon `fa-sack-dollar`.
   - Tiêu đề trang đổi thành "Thu nhập".
2. **Cấu trúc 3 Sub-tabs Chuẩn Hóa Bên Trong Menu Thu Nhập**:
   - **Sub-tab 1: Thu nhập (`income_summary` - Mặc định)**:
     * Tổng thu nhập ước tính trong tháng = Hoa hồng gói PT/COMBO + Thù lao lớp cộng đồng (`4.248.750 VNĐ`).
     * Thống kê tóm tắt 3 chỉ số: Hoa hồng PT/Combo (`+768.750 đ`), Thù lao lớp CĐ (`+3.480.000 đ`), Tổng ca dạy (`19 ca`).
     * **Khối Xác Nhận Chi Trả 2 Chiều Gộp (Chống chối nhận tiền)**: Lễ tân/Quản lý chi trả gộp 1 lần cho cả 2 khoản thu nhập; HLV kiểm tra tổng số tiền gộp (`4.248.750 đ`), hình thức chi trả và bấm nút `[Xác nhận đã nhận tiền]`.
     * Bảng tóm tắt đối soát 2 nguồn thu nhập với click chuyển nhanh sang sub-tab chi tiết tương ứng.
   - **Sub-tab 2: Gói PT / Combo (`pt_combo`)**:
     * Chi tiết hoa hồng các gói PT 1:1, PT Nhóm, Gói Combo kèm tỷ lệ hoa hồng (25%), số buổi dạy (8 buổi), phần PT cơ sở (3.075.000 đ).
     * Bỏ label "đã xác nhận" dư thừa, dời khối xác nhận chi trả sang Sub-tab 1.
     * Danh sách 8 ca tập đã hoàn thành kèm badge nhận diện loại gói (`Combo PT`, `PT Nhóm`, `PT 1:1`), thời gian và hoa hồng từng buổi.
   - **Sub-tab 3: Thù lao lớp CĐ (`community_comp`)**:
     * Thống kê tổng thù lao lớp cộng đồng ước tính (`3.480.000 VNĐ`), thù lao cơ bản (`2.890.000 đ`), thưởng sĩ số (`590.000 đ`), số ca dạy CĐ (`11 ca`), tổng lượt học viên (`165 lượt HV`), bình quân ca (`316.364 đ`).
     * Danh sách 11 lớp học cộng đồng kèm thời gian, địa điểm, sĩ số, tiền thù lao và nút `[Xem học viên]`.
   - **Loại bỏ hoàn toàn Sub-tab "Lịch sử lớp CĐ"**:
     * Đã xóa bỏ sub-tab thứ 3 cũ theo đúng chỉ đạo của người dùng để giao diện tinh gọn, không trùng lặp dữ liệu.
3. **Card Lớp Học Cộng Đồng Trên Màn Hình Lịch (`schedule.js`)**:
   - Tự động nạp danh sách lớp cộng đồng do HLV phụ trách từ backend API.
   - Khi chọn ngày (ví dụ 22/09/2026), hiển thị Card tím gradient cho các lớp CĐ diễn ra trong ngày ở đầu danh sách ca dạy.
   - Cập nhật badge số lượng kết hợp: `2 ca PT · 2 lớp CĐ`.
   - Bấm vào card hoặc nút "Xem danh sách hội viên" mở modal `dxPopup` hiển thị chi tiết lớp học và danh sách 15 học viên đã xác nhận.
4. **Bổ Sung KPI Lớp Học Cộng Đồng Trên Màn Hình Tổng Quan (`overview.js`)**:
   - Bổ sung thẻ KPI thứ 5 `Lớp học cộng đồng` (`card-purple`, `#cardKpiCommunity`) hiển thị số lượng lớp CĐ phụ trách (11 ca).
   - Chạm vào thẻ KPI này sẽ tự động chuyển sang menu Thu nhập và kích hoạt sub-tab `Thù lao lớp CĐ`.
5. **Chi Tiết Hóa Thẻ Hero Thù Lao & Hoa Hồng (`overview.js`)**:
   - Hiển thị Tổng thu nhập ước tính tháng này (`4.248.750 VNĐ`).
   - Phân rã cụ thể 2 dòng tiền con:
     * Hoa hồng gói PT/COMBO: `768.750 đ`
     * Thù lao lớp cộng đồng: `3.480.000 đ`
   - Khớp nối số liệu 100% giữa Database PostgreSQL, Backend REST API và Frontend Mobile PT.

---

## 2. Danh Sách Tệp Thay Đổi

| Tệp | Mô Tả Thay Đổi |
| :--- | :--- |
| `backend/src/modules/core/community.js` | Thêm quyền `'PT'` vào endpoint `GET /community-classes/:id/members` để HLV xem được danh sách học viên lớp mình dạy. |
| `frontend/mobile/pt/index.html` | Cập nhật nhãn bottom nav thành "Thu nhập", tổ chức 3 sub-tabs (`income_summary`, `pt_combo`, `community_comp`), đưa khối xác nhận chi trả 2 chiều gộp vào Sub-tab 1, xóa bỏ `#subtab-community-history`. |
| `frontend/mobile/pt/js/overview.js` | Tính toán gộp tổng thu nhập tháng, xử lý chuyển đổi 3 sub-tabs, gắn sự kiện click nguồn thu nhập, kích hoạt khối xác nhận chi trả gộp 2 chiều, gọi `confirmCommissionReceipt`, xóa bỏ code xử lý history cũ. |
| `frontend/mobile/pt/js/schedule.js` | Tích hợp fetch `community-classes`, hiển thị card tím Lớp CĐ trên Lịch ngày đã chọn, cập nhật badge kết hợp `2 ca PT · 2 lớp CĐ`, liên kết mở modal danh sách học viên. |
| `tests/scratch/verify_pt_income_community_suite.js` | Kịch bản kiểm thử E2E tự động toàn diện verify màn hình Tổng quan, Lịch dạy lớp CĐ và 3 sub-tabs của Menu Thu nhập. |

---

## 3. Kết Quả Kiểm Thử Thực Tế (E2E Test Runner)

Kịch bản kiểm thử tự động toàn diện bằng Puppeteer: `tests/scratch/verify_pt_income_community_suite.js`.

### 3.1. Dữ Liệu Kiểm Chứng:
- **Tài khoản kiểm thử:** HLV PT001 Nguyễn Văn Thể (`0900000003`, Chi nhánh Quận 1).
- **Tổng quan (Overview):**
  - KPI Lớp học cộng đồng: `11 ca`
  - Thẻ Hero Tổng thu nhập: `4.248.750 VNĐ`
  - Hoa hồng gói PT/COMBO: `768.750 đ`
  - Thù lao lớp cộng đồng: `3.480.000 đ`
  - Khớp nối logic: `768.750 + 3.480.000 = 4.248.750 VNĐ`.
- **Lịch dạy ngày 22/09/2026 (Schedule):**
  - Badge ca tập: `2 ca PT · 2 lớp CĐ`
  - Card tím 1: `Cardio HIIT Toàn Thân` (07:30 - 08:30, 15/35 HV, 300.000 đ)
  - Card tím 2: `BodyPump Sức Mạnh` (18:40 - 19:40, 15/40 HV, 360.000 đ)
  - Popup xem danh sách học viên hoạt động chuẩn xác.
- **Menu Thu nhập (3 Sub-tabs):**
  - **Sub-tab 1 (Thu nhập Tổng hợp):**
    * Tổng thu nhập: `4.248.750 VNĐ`
    * Hoa hồng PT/Combo: `+768.750 đ`
    * Thù lao lớp CĐ: `+3.480.000 đ`
    * Tổng ca dạy: `19 ca`
    * Badge trạng thái: `Chờ bạn xác nhận`
    * Khối xác nhận chi trả 2 chiều gộp hiển thị số tiền `4.248.750 đ`, hình thức `Tiền mặt tại quầy` và nút `[Xác nhận đã nhận tiền]`.
    * 2 thẻ nguồn thu nhập cho phép click chuyển nhanh sang sub-tab chi tiết.
  - **Sub-tab 2 (Gói PT / Combo):**
    * Tổng hoa hồng: `768.750 VNĐ`
    * Tỷ lệ áp dụng: `25%`
    * Số buổi dạy: `8 buổi`
    * Danh sách: 8 ca tập đã hoàn thành.
  - **Sub-tab 3 (Thù lao lớp CĐ):**
    * Tổng thù lao ước tính: `3.480.000 VNĐ`
    * Thù lao cơ bản: `2.890.000 đ`, Thưởng sĩ số: `590.000 đ`, Số ca dạy: `11 ca`
    * Danh sách: 11 ca dạy lớp cộng đồng.

---

## 4. Hình Ảnh Xác Minh Giao Diện

- **Subtab 1 - Thu nhập tổng hợp & Xác nhận chi trả 2 chiều:**
  ![Subtab 1 Thu nhập](verify_pt_income_subtab1_summary.png)

- **Subtab 2 - Gói PT / Combo (Hoa hồng ca dạy):**
  ![Subtab 2 Gói PT Combo](verify_pt_income_subtab2_pt_combo.png)

- **Subtab 3 - Thù lao lớp cộng đồng:**
  ![Subtab 3 Thù lao lớp CD](verify_pt_income_subtab3_community_comp.png)

# Walkthrough: Tái Cấu Trúc Popup Chi Tiết Huấn Luyện Viên Đồng Bộ 100% Chuẩn 5 Menu Mobile PT (Web Admin)

**Ngày thực hiện:** 22/09/2026  
**Phân hệ:** Web Admin Quản Trị Viên & Lễ Tân (`frontend/web/`)  
**Tác giả:** anti-1-QTV-LT (Web Admin Lead)  
**Tài liệu liên quan:** `frontend/web/js/modules/ptScheduler.js`, `AGENTS.md`, `.agents/skills/qtv-ui-design-system/SKILL.md`

---

## 1. Mục Tiêu & Yêu Cầu

Theo yêu cầu từ Người dùng:
> *"làm lại cái popup của PT khi click vào 1 dòng trong menu Huấn luyện viên đi. Popup này có các tab là các menu của PT, trong mỗi tab thì cũng sẽ giống với giao diện PT ở mobile thôi, cứ nhìn giao diện PT ở mobile rồi làm cái popup này."*

Yêu cầu cụ thể:
1. **Tái cấu trúc toàn diện Popup chi tiết HLV (`showTrainerDetail`)**: Thay thế các tab cũ bằng đúng **5 Menu chuẩn của ứng dụng Mobile Huấn Luyện Viên (Mobile PT)**:
   - `overview`: **Tổng quan** (`fa-chart-pie`)
   - `schedule`: **Lịch** (`fa-calendar-days` - gộp cả ca PT 1:1 và Lớp học cộng đồng)
   - `members`: **Gói phụ trách** (`fa-boxes-stacked` - gồm 3 Sub-tabs: Học viên phụ trách, Gói đang phụ trách, Lớp tập CĐ phụ trách)
   - `commissions`: **Thu nhập** (`fa-sack-dollar` - gồm 3 Sub-tabs: Thu nhập & xác nhận gộp 2 chiều, Gói PT / Combo, Thù lao lớp CĐ)
   - `profile`: **Tài khoản** (`fa-circle-user` - Thông tin nhân sự, chuyên môn/bio, ngân hàng, cài đặt, Face ID)
2. **Modal toàn cục xem Thông tin lớp học & Danh sách hội viên**:
   - Khi bấm vào 1 lớp cộng đồng ở bất kỳ tab nào (Lịch, Gói phụ trách, hay Thu nhập), hệ thống hiển thị popup chứa card tím thông tin lớp học + DataGrid danh sách học viên đã đăng ký tham gia (gọi API `GET /community-classes/:id/members`).
3. **Tuân thủ Design System & Quy chuẩn Dữ liệu**:
   - Administrative Forest Clean (`--primary: #237b58`, layout tinh gọn, cấm callout/hint thừa).
   - 100% dữ liệu động từ REST API Backend / PostgreSQL Database, tuyệt đối không mock hardcoded.

---

## 2. Chi Tiết Thực Thi Kỹ Thuật

### 2.1. Cấu Trúc 5 Menu Độc Lập Khớp 100% Mobile PT (`frontend/web/js/modules/ptScheduler.js`)

| Menu PT | Biểu tượng | Nội dung & Thành phần giao diện | Trải nghiệm người dùng |
| :--- | :--- | :--- | :--- |
| **1. Tổng quan** | `fa-chart-pie` | - **Hero card Tổng thu nhập ước tính**: Hiển thị tổng thu nhập tháng hiện tại, kèm phân rã nhỏ (Hoa hồng PT/Combo và Thù lao lớp CĐ) + Nút CTA *Xem chi tiết* nhảy ngay sang tab Thu nhập.<br>- **5 Thẻ KPI chuẩn Mobile PT**: `Buổi PT đã dạy`, `Lớp học cộng đồng`, `Học viên phụ trách`, `Gói đang kích hoạt`, `Lịch dạy hôm nay`.<br>- **Card ca dạy tiếp theo**: Nhận diện thông minh ca dạy gần nhất (ca PT hoặc Lớp CĐ), hiển thị học viên/lớp, giờ học, phòng học + Nút CTA *Xem lịch* nhảy sang tab Lịch.<br>- **Bảng nhật ký vào/ra cổng hôm nay**: Thời gian quẹt thẻ Face ID vào/ra phòng tập. | Mang lại cái nhìn tổng thể toàn diện về ca dạy, học viên và thu nhập như màn hình chính của App Mobile PT. |
| **2. Lịch** | `fa-calendar-days` | - **2 Sub-tabs**: `Lịch dạy sắp tới` và `Lịch sử ca dạy đã hoàn thành`.<br>- **Lịch dạy sắp tới**: Kết hợp đồng nhất cả ca PT 1:1 và Lớp CĐ theo thứ tự thời gian. Mỗi ca có badge phân loại (Xanh lá = PT 1:1, Tím = Lớp CĐ), tên học viên/tên lớp, địa điểm chi nhánh và nút *Xem học viên* đối với lớp CĐ.<br>- **Lịch sử hoàn thành**: Chi tiết từng ca dạy đã hoàn thành với xác nhận kép 2 chiều, ghi nhận trừ buổi, nội dung bài tập và đánh giá thể lực. | Giúp QTV/LT xem trọn vẹn tiến độ dạy học và lịch phân ca của HLV. |
| **3. Gói phụ trách** | `fa-boxes-stacked` | - **3 Sub-tabs chuẩn hóa**: `Học viên phụ trách (N)`, `Gói đang phụ trách (N)`, `Lớp tập CĐ phụ trách (N)`.<br>- **Học viên phụ trách**: Bảng danh sách hội viên, gói đăng ký, số buổi còn lại, tiến độ và liên hệ.<br>- **Gói đang phụ trách**: Chi tiết hợp đồng gói PT/Combo, giá trị hợp đồng, trạng thái kích hoạt.<br>- **Lớp tập CĐ phụ trách**: Danh sách các ca lớp cộng đồng HLV được phân công, thanh tiến độ sĩ số (`enrolled_slots / max_slots`), mức thù lao ca dạy và nút bấm xem danh sách thành viên. | Đồng bộ 100% với phân hệ quản lý hội viên và lớp tập của Mobile PT. |
| **4. Thu nhập** | `fa-sack-dollar` | - **3 Sub-tabs chuẩn hóa**: `Thu nhập`, `Gói PT / Combo`, `Thù lao lớp CĐ`.<br>- **Sub-tab Thu nhập**: Khối *Đối soát & Xác nhận chi trả gộp 2 chiều* (Số tiền gộp PT + Lớp CĐ, trạng thái chi trả hai chiều, nút xác nhận chi trả 1 chạm) + 2 Card đối soát chi tiết (Hoa hồng gói PT/Combo & Thù lao lớp cộng đồng).<br>- **Sub-tab Gói PT / Combo**: Bảng kê chi tiết từng buổi tập PT đã hoàn thành kèm tỷ lệ hoa hồng và số tiền hưởng.<br>- **Sub-tab Thù lao lớp CĐ**: Bảng kê chi tiết từng ca dạy lớp cộng đồng kèm thù lao cơ bản và tiền thưởng sĩ số. | QTV và Lễ tân có thể kiểm tra và thực hiện đối soát, chi trả gộp 1 lần cho cả 2 nguồn thu nhập của HLV. |
| **5. Tài khoản** | `fa-circle-user` | - **Thông tin nhân sự HLV**: Mã HLV, Họ tên, SĐT, Email làm việc, Chi nhánh phục vụ, Khung giờ làm việc, Ngày làm việc trong tuần, Trạng thái hoạt động, Trạng thái nhận diện khuôn mặt Face ID Kiosk.<br>- **Chuyên môn & Hồ sơ năng lực**: Chuyên môn, bằng cấp, chứng chỉ, phần tự giới thiệu (Bio).<br>- **Tài khoản ngân hàng nhận thu nhập**: Tên ngân hàng thụ hưởng, Số tài khoản, Tên chủ tài khoản.<br>- **Cài đặt & Tùy chọn ứng dụng**: Tùy chọn nhận thông báo lịch mới, cấu hình ứng dụng. | Xem đầy đủ hồ sơ năng lực và thông tin thanh toán của nhân sự. |

### 2.2. Modal Toàn Cục Xem Danh Sách Thành Viên Lớp Học Cộng Đồng

- Hàm `openCommunityClassMembersModal(classData)`:
  - Mở một `dxPopup` kích thước 720px x 560px.
  - Khối Header tím sang trọng (`#6f42c1`) hiển thị: Tên lớp, Bộ môn, Thời gian ca dạy, Tên chi nhánh, Sĩ số hiện tại (`enrolled_slots / max_slots`), Mức thù lao ca dạy.
  - Gọi API backend `GET /community-classes/${classId}/members` để lấy danh sách hội viên đăng ký.
  - Hiển thị danh sách hội viên qua DataGrid hoặc Empty State nếu chưa có học viên nào đăng ký.

---

## 3. Kết Quả Kiểm Thử E2E UI Thật

Kịch bản E2E Puppeteer tự động đã được thực thi trên môi trường thực tế (`http://localhost:3000/web/?run=1#trainers`):
- Đăng nhập tài khoản QTV và xác thực 2FA OTP tự động thành công.
- Mở danh sách Huấn luyện viên, click chọn HLV `PT001 - Nguyễn Văn Thể`.
- Duyệt qua từng tab trong số 5 tab và kích hoạt modal xem danh sách hội viên lớp CĐ.
- Toàn bộ 6 ảnh chụp màn hình kiểm chứng đã được ghi nhận:

1. **Tab 1 - Tổng quan**: `verify_web_pt_popup_tab1_overview.png` (Hero thu nhập tháng, 5 thẻ KPI, Card ca tiếp theo, Bảng nhật ký vào/ra cổng Face ID).
2. **Tab 2 - Lịch**: `verify_web_pt_popup_tab2_schedule.png` (2 sub-tabs Lịch sắp tới gộp PT & Lớp CĐ, Lịch sử hoàn thành).
3. **Tab 3 - Gói phụ trách**: `verify_web_pt_popup_tab3_members.png` (3 sub-tabs Học viên, Gói, Lớp CĐ phụ trách kèm thanh sĩ số và nút xem danh sách HV).
4. **Tab 4 - Thu nhập**: `verify_web_pt_popup_tab4_income.png` (Khối đối soát chi trả gộp 2 chiều, 2 card đối soát PT & Lớp CĐ, các sub-tabs chi tiết).
5. **Tab 5 - Tài khoản**: `verify_web_pt_popup_tab5_profile.png` (Hồ sơ nhân sự, Chuyên môn & Bio, Ngân hàng nhận thu nhập, Cài đặt ứng dụng).
6. **Popup Danh sách thành viên lớp CĐ**: `verify_web_pt_popup_class_members.png` (Card tím chi tiết lớp học + Danh sách hội viên tham gia).

---

## 4. Kết Luận

Hệ thống Web Admin đã đồng bộ hoàn toàn trải nghiệm 5 Menu của HLV giữa Web và Mobile, đảm bảo tính nhất quán cao nhất cho công tác quản trị nhân sự, giám sát lịch dạy và quyết toán thù lao cho Huấn luyện viên.

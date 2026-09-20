# BÁO CÁO TỔNG HỢP: DANH SÁCH MENU VÀ USER STORIES BỔ SUNG & SỬA ĐỔI
### Hệ thống Quản lý Phòng tập Paradise Gym (Theo Feedback Sếp Cường)

- **Dự án:** Paradise Gym Management System
- **Căn cứ thực hiện:** Tài liệu chỉ đạo `ghi chú a Cường (1).pdf` và Hệ thống phần mềm mẫu [Phần mềm quản lý phòng gym Paradise Gym](https://phanmemtinhluong.com/phan-mem-quan-ly-phong-gym-paradise-gym/)
- **Đơn vị thực thi:** `anti-1-QTV-LT` (Web Admin Lead) phối hợp cùng `anti-2-HV`, `anti-3-PT`, `anti-4-Core-BE-DB`
- **Ngày lập báo cáo:** 19/09/2026

---

## 1. TỔNG QUAN THAY ĐỔI THEO VAI TRÒ

| Vai trò (Role) | Nền tảng (Platform) | Số Menu / Epic ban đầu | Số Menu / Epic sau refactor | Số US ban đầu | Số US sau refactor | Số US mới | Số US sửa đổi |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Quản trị viên (QTV)** | Web | 13 menu (W01–W13) | **17 menu (W01–W17)** | 42 | **51** | **+9 US** | **7 US** |
| **Lễ tân (LT)** | Web | 8 menu | **10 menu** | 21 | **25** | **+4 US** | **5 US** |
| **Hội viên (HV)** | Mobile App | 6 epic (HV01–HV06) | **6 epic (bổ sung tab/flow)** | 15 | **17** | **+2 US** | **3 US** |
| **Huấn luyện viên (PT)**| Mobile App | 5 epic (PT01–PT05) | **6 epic (PT01–PT06)** | 9 | **11** | **+2 US** | **2 US** |
| **TỔNG CỘNG** | **Toàn hệ thống** | **32 Menu/Epic** | **39 Menu/Epic** | **87** | **104** | **+17 US** | **17 US** |

---

## 2. DANH SÁCH CÁC MENU BỔ SUNG MỚI

Dưới đây là các màn hình menu mới được thiết kế, đặc tả tài liệu và xây dựng trên hệ thống:

### 2.1. Web Quản Trị Viên (QTV): Bổ Sung 4 Menu Mới (W14, W15, W16, W17)
1. **W14 · Chăm sóc & thông báo** (`route: customer-care`):
   - *Mục đích:* Tác nghiệp CSKH tập trung theo phản hồi của sếp Cường. Quản lý 4 danh mục công việc cần xử lý trong ngày:
     + Sinh nhật hội viên hôm nay.
     + Hợp đồng gói tập sắp hết hạn (còn &le; 4 ngày).
     + Hội viên chờ nhắc gia hạn (trong vòng 14 ngày qua).
     + Hội viên đăng ký mới hôm nay.
   - *Thao tác:* Gửi tin nhắn chúc mừng, gọi điện thoại, ghi nhận lịch sử chăm sóc.
2. **W15 · Quản lý hoa hồng PT** (`route: commissions`):
   - *Mục đích:* Quản trị chính sách thù lao và tính toán hoa hồng cho Huấn luyện viên cá nhân:
     + Bảng kê hoa hồng theo từng tháng/năm, tính tiền tự động dựa trên số buổi dạy hoàn thành (`COMPLETED`) và % cấu hình.
     + Cấu hình tỷ lệ hoa hồng linh hoạt theo từng chi nhánh hoặc từng PT cụ thể.
     + Phê duyệt và đánh dấu trạng thái chi trả hoa hồng (`PENDING` &rarr; `APPROVED` &rarr; `PAID`).
3. **W16 · Lớp tập cộng đồng** (`route: community-classes`):
   - *Mục đích:* Quản lý lịch và học viên các lớp tập nhóm (Yoga, Zumba, BodyPump, Cycling, Kickfit, Pilates):
     + Lập lịch lớp học theo ngày, phòng tập, khung giờ, chỉ định PT/HLV đứng lớp.
     + Theo dõi tiến độ giữ chỗ trực quan thời gian thực (ví dụ: `25/40 chỗ`).
     + Đăng ký hội viên tham gia lớp tại quầy và hủy đăng ký.
4. **W17 · Khuyến mãi & giảm giá** (`route: discounts`):
   - *Mục đích:* Quản lý các chiến dịch voucher ưu đãi:
     + Tạo mã giảm giá theo tỷ lệ % hoặc số tiền cố định (VNĐ).
     + Thiết lập điều kiện: giá trị đơn tối thiểu, số lượt dùng tối đa, thời hạn hiệu lực, phạm vi chi nhánh.
     + Thẩm tra mã tự động khi áp dụng tại quầy lễ tân hoặc trên app hội viên.

### 2.2. Web Lễ Tân (LT): Bổ Sung 2 Menu Mới Được Cấp Quyền (LT-W14, LT-W16)
1. **LT-W14 · Chăm sóc & thông báo** (`route: customer-care`):
   - *Mục đích:* Cung cấp cho nhân viên lễ tân tại quầy danh sách hội viên cần chăm sóc trong ngày (sinh nhật, sắp hết hạn &le; 4 ngày) để trực tiếp chúc mừng hoặc nhắc gia hạn khi hội viên đến check-in.
2. **LT-W16 · Lớp tập cộng đồng** (`route: community-classes`):
   - *Mục đích:* Lễ tân tra cứu lịch lớp tập trong ngày của chi nhánh, đăng ký giữ chỗ cho hội viên trực tiếp tại quầy khi có yêu cầu.

### 2.3. Mobile Huấn Luyện Viên (PT): Bổ Sung 1 Menu/Epic Mới (PT06)
1. **PT06 · Tổng quan** (`route: overview` - Tab 1 trên Bottom Nav):
   - *Mục đích:* Bổ sung màn hình Dashboard trung tâm dành riêng cho HLV:
     + Thống kê hiệu suất: số buổi dạy trong tuần/tháng, số học viên active, đánh giá sao trung bình.
     + Thẻ nổi bật "Hoa hồng & Thù lao tháng": hiển thị số tiền hoa hồng ước tính tạm tính trong tháng, trạng thái quyết toán (`Chờ duyệt` / `Đã duyệt` / `Đã chi trả`), và tỷ lệ % hoa hồng.
     + Phím tắt mở modal tra cứu bảng kê hoa hồng chi tiết từng buổi dạy.

---

## 3. DANH SÁCH CÁC USER STORY BỔ SUNG MỚI (MỚI 100%)

Tổng cộng **17 User Story mới** đã được tạo mới hoàn chỉnh (bao gồm đặc tả Preconditions, Main Flow, Alternate Flows, Exception Flows, UI Field-Level Spec và Activity Diagram chuẩn UML):

### 3.1. Phân Hệ Web Quản Trị Viên (QTV) — 9 US Mới:
1. **`QTV-W04-US06` — Đóng băng gói tập:**
   - *Đặc tả:* Cho phép tạm ngưng hiệu lực gói tập của hội viên khi có lý do chính đáng (công tác, ốm đau); chọn số ngày đóng băng, ngày bắt đầu đóng băng; hệ thống tự động dời ngày hết hạn (`end_date`) tương ứng và ghi nhật ký vào `package_freeze_logs`.
2. **`QTV-W04-US07` — Chuyển nhượng quyền gói tập:**
   - *Đặc tả:* Xử lý chuyển nhượng hợp đồng gói tập từ hội viên này sang hội viên khác; kiểm tra điều kiện chuyển nhượng, thu phí chuyển nhượng (nếu có), cập nhật `member_id` mới và lưu lịch sử `package_transfers`.
3. **`QTV-W05-US05` — Xử lý PT nghỉ ngang và chuyển giao học viên:**
   - *Đặc tả:* Đáp ứng tình huống PT đột ngột nghỉ việc; QTV thực hiện chuyển giao toàn bộ danh sách học viên phụ trách và các ca tập tương lai chưa hoàn thành từ PT cũ sang PT mới tiếp quản chỉ bằng một thao tác (`handover`).
4. **`QTV-W06-US05` — Quản lý lịch ngày lễ:**
   - *Đặc tả:* Khai báo danh mục các ngày lễ tết phòng tập đóng cửa hoặc nghỉ ca PT (`gym_holidays`); tự động khóa toàn bộ slot booking trên cả Web và Mobile để ngăn ngừa tình trạng hội viên đặt lịch vào ngày nghỉ.
5. **`QTV-W14-US01` — Quản lý tác nghiệp Chăm sóc khách hàng:**
   - *Đặc tả:* Giao diện quản lý 4 khối việc CSKH trong ngày (Sinh nhật, Hết hạn &le; 4 ngày, Chờ gia hạn 14 ngày, Đăng ký mới); cho phép gửi thông báo SMS/In-app và ghi nhật ký cuộc gọi.
6. **`QTV-W15-US01` — Cấu hình tỷ lệ hoa hồng PT:**
   - *Đặc tả:* Thiết lập tỷ lệ hoa hồng mặc định của chi nhánh hoặc tỷ lệ riêng biệt theo cấp bậc của từng PT (ví dụ: PT Senior hưởng 35%, Junior hưởng 25%).
7. **`QTV-W15-US02` — Tính và duyệt bảng kê hoa hồng PT theo tháng:**
   - *Đặc tả:* Kích hoạt tính toán lại hoa hồng tháng tự động dựa trên các buổi dạy có trạng thái `COMPLETED`; QTV xem chi tiết từng buổi học, duyệt bảng kê (`APPROVED`) và xác nhận chi trả (`PAID`).
8. **`QTV-W16-US01` — Lập lịch và quản lý lớp tập cộng đồng:**
   - *Đặc tả:* Tạo mới ca lớp tập cộng đồng (Yoga, Zumba, Aerobic,...), chọn khung giờ, phòng tập, PT hướng dẫn, giới hạn số lượng học viên; xem danh sách học viên đã đăng ký.
9. **`QTV-W17-US01` — Quản lý chương trình khuyến mãi và mã giảm giá:**
   - *Đặc tả:* Tạo và quản lý mã voucher giảm giá (theo % hoặc số tiền), thiết lập thời gian áp dụng, điều kiện giá trị đơn tối thiểu và số lượt dùng tối đa.

### 3.2. Phân Hệ Web Lễ Tân (LT) — 4 US Mới:
10. **`LT-W04-US06` — Đóng băng gói tập tại quầy:**
    - *Đặc tả:* Lễ tân tiếp nhận yêu cầu đóng băng gói của hội viên trực tiếp tại quầy, kiểm tra điều kiện hợp đồng và thực hiện thao tác đóng băng có thời hạn.
11. **`LT-W04-US07` — Chuyển nhượng quyền gói tập tại quầy:**
    - *Đặc tả:* Tiếp nhận thủ tục chuyển nhượng hợp đồng giữa hai hội viên tại quầy lễ tân, xác minh thông tin người chuyển và người nhận, ghi nhận thanh toán phí chuyển nhượng.
12. **`LT-W14-US01` — Tác nghiệp Chăm sóc khách hàng tại quầy:**
    - *Đặc tả:* Lễ tân tra cứu danh sách hội viên có sinh nhật hôm nay hoặc sắp hết hạn gói tập để trực tiếp chúc mừng hoặc tư vấn gia hạn khi hội viên đến phòng tập.
13. **`LT-W16-US01` — Đăng ký lớp tập cộng đồng tại quầy:**
    - *Đặc tả:* Lễ tân kiểm tra sĩ số còn trống của lớp Yoga/Zumba trong ngày và ghi nhận đăng ký giữ chỗ cho hội viên.

### 3.3. Phân Hệ Mobile Hội Viên (HV) — 2 US Mới:
14. **`HV02-US05` — Đăng ký tham gia lớp tập cộng đồng:**
    - *Đặc tả:* Hội viên xem danh sách các lớp tập nhóm trong ngày trên màn hình Lịch tập, theo dõi số chỗ còn trống thời gian thực (`25/40 chỗ`), bấm "Đăng ký tham gia" hoặc "Hủy đăng ký".
15. **`HV03-US07` — Mời thành viên tham gia gói PT 1-Nhiều:**
    - *Đặc tả:* Dành cho gói tập nhóm (PT 1-Nhiều); người đại diện mua gói mở modal mời bạn bè bằng cách nhập số điện thoại để hệ thống gửi lời mời và thêm thành viên vào nhóm cùng tập luyện.

### 3.4. Phân Hệ Mobile Huấn Luyện Viên (PT) — 2 US Mới:
16. **`PT06-US01` — Xem tổng quan và thống kê hiệu suất PT:**
    - *Đặc tả:* HLV theo dõi các chỉ số vận hành quan trọng: tổng số ca dạy hoàn thành, học viên đang phụ trách, đánh giá thể lực và lịch dạy sắp tới.
17. **`PT06-US02` — Xem bảng kê hoa hồng tháng:**
    - *Đặc tả:* HLV xem thẻ thù lao hoa hồng ước tính trong tháng; mở modal tra cứu chi tiết danh sách từng buổi dạy (ngày dạy, tên học viên, gói tập, số tiền hoa hồng của buổi đó); lọc theo Tháng này, Tháng trước hoặc Tháng bất kỳ.

---

## 4. DANH SÁCH CÁC USER STORY SỬA ĐỔI (GHI RÕ NỘI DUNG SỬA ĐỔI)

Tổng cộng **17 User Story hiện hữu** đã được điều chỉnh và nâng cấp sâu để khớp với các nghiệp vụ phản hồi từ Sếp Cường:

### 4.1. Nhóm Màn Hình Tổng Quan & Dashboard:
1. **`QTV-W01-US01` & `LT-W01-US01` — Xem tổng quan vận hành:**
   - *Lý do sửa:* Theo phản hồi của Sếp Cường, màn hình quản lý cần hiển thị ngay các vấn đề vận hành cần xử lý trong ngày giống phần mềm mẫu Paradise Gym.
   - *Nội dung sửa đổi chi tiết:*
     + **Bổ sung khối giao diện "Hôm nay cần xử lý":** Hiển thị 4 nút bấm cảnh báo tương tác gồm: (1) Sinh nhật hôm nay, (2) Gói sắp hết hạn &le; 4 ngày, (3) Chờ nhắc gia hạn 14 ngày qua, (4) Đăng ký mới hôm nay.
     + **Cơ chế tương tác:** Khi click vào từng nút cảnh báo, hệ thống tự động điều hướng sang đúng tab tương ứng của menu W14 Chăm sóc khách hàng.
     + **Bổ sung API backend:** Tích hợp gọi thêm `GET /customer-care/summary` song song với `GET /dashboard`.

### 4.2. Nhóm Quản Lý Hội Viên & Nhận Diện (Face ID / QR):
2. **`QTV-W02-US01` & `LT-W02-US01` — Thêm hội viên:**
   - *Lý do sửa:* Bổ sung thông tin nhận diện số hóa phục vụ cổng kiểm soát ra vào tự động.
   - *Nội dung sửa đổi chi tiết:*
     + Bổ sung trường `avatar_url` cho phép nạp ảnh đại diện hội viên.
     + Hệ thống tự động sinh mã `qr_access_code` cá nhân cho hội viên ngay khi tạo hồ sơ.
3. **`QTV-W02-US02` & `LT-W02-US02` — Sửa hồ sơ hội viên:**
   - *Lý do sửa:* Hỗ trợ quản lý hình ảnh và đăng ký nhận diện khuôn mặt trực tiếp tại quầy.
   - *Nội dung sửa đổi chi tiết:*
     + Bổ sung hiển thị Avatar hình tròn trong bảng danh sách và modal sửa.
     + **Bổ sung nút "Mã QR":** Mở popup hiển thị mã QR định danh cá nhân của hội viên để in thẻ hoặc quét test.
     + **Bổ sung nút "Face ID":** Mở popup chụp ảnh / cập nhật URL ảnh nhận diện khuôn mặt và bật cờ `face_enrolled = true`.

### 4.3. Nhóm Quản Lý Gói Tập (3 Mức Giá & PT 1-Nhiều):
4. **`QTV-W03-US02` — Thêm gói tập & `QTV-W03-US03` — Sửa gói tập:**
   - *Lý do sửa:* Phản hồi của Sếp Cường chỉ ra gói tập thực tế cần tách bạch giá Gym và giá PT, quy định thời lượng buổi tập và hỗ trợ PT nhóm 1-Nhiều.
   - *Nội dung sửa đổi chi tiết:*
     + **Tách 3 mức giá độc lập:**
       * `price`: Tổng giá niêm yết của gói.
       * `gym_price`: Giá trị phần dịch vụ Gym (để ghi nhận doanh thu Gym).
       * `pt_price`: Giá trị phần dịch vụ PT (làm căn cứ tính hoa hồng cho huấn luyện viên).
     + **Thời lượng mỗi buổi tập (`session_duration_minutes`):** Cho phép chọn các mốc cố định: `30 phút`, `45 phút`, `60 phút` (chuẩn), `90 phút`, `120 phút`.
     + **Hình thức huấn luyện PT:** Cho phép chọn giữa `INDIVIDUAL_1_1` (PT kèm 1-1) và `GROUP_1_N` (PT kèm nhóm 1-Nhiều).
     + **Số thành viên tối đa trong nhóm (`max_group_members`):** Hiển thị động khi chọn `GROUP_1_N` để giới hạn số học viên cùng tham gia gói.

### 4.4. Nhóm Đăng Ký Gói & Thu Tiền (Snapshot Giá & Voucher):
5. **`QTV-W04-US01` & `LT-W04-US01` — Tạo đăng ký gói mới:**
   - *Lý do sửa:* Đảm bảo tính toàn vẹn tài chính khi giá gói thay đổi trong tương lai và tích hợp mã voucher.
   - *Nội dung sửa đổi chi tiết:*
     + **Snapshot 3 mức giá:** Tự động lưu snapshot `price_snapshot`, `gym_price_snapshot`, `pt_price_snapshot` vào bản ghi `registrations`.
     + **Áp dụng Voucher:** Bổ sung trường nhập mã giảm giá (`voucher_code`). Hệ thống gọi API thẩm tra, hiển thị số tiền được giảm trừ và tính lại số tiền cần thanh toán.
6. **`QTV-W04-US05` & `LT-W04-US05` — Gán PT phụ trách:**
   - *Lý do sửa:* Sếp Cường chỉ đạo **bỏ luồng Hội viên tự chọn PT trên app**; việc phân công PT do Lễ tân hoặc QTV chỉ định trực tiếp tại quầy.
   - *Nội dung sửa đổi chi tiết:*
     + Chuyển luồng phân công HLV thành thao tác chủ động của Lễ tân/QTV tại quầy.
     + Hỗ trợ phân công lại HLV khi có phát sinh thay đổi hoặc khi HLV cũ nghỉ việc.
7. **`QTV-W08-US02` & `LT-W08-US02` — Tạo payment & Thu tiền:**
   - *Lý do sửa:* Khớp nối phiếu thu với mã voucher giảm giá và sinh mã VietQR thanh toán đúng số tiền sau giảm.
   - *Nội dung sửa đổi chi tiết:*
     + Tự động tính số tiền thực thu sau khi trừ khuyến mãi: `final_amount = package_price - discount_amount`.
     + Sinh mã VietQR động theo đúng `final_amount`. Phiếu thu (`receipts`) ghi nhận chính xác số tiền thực tế khách hàng đã trả.

### 4.5. Nhóm Check-in Cổng Từ & Kiosk Chào K01:
8. **`QTV-W07-US01` & `LT-W07-US01` — Xử lý check-in tự động qua thiết bị:**
   - *Lý do sửa:* Bổ sung trải nghiệm Kiosk K01 tự động chúc mừng sinh nhật hoặc cảnh báo sắp hết hạn gói tập khi quẹt thẻ/mã QR tại cổng.
   - *Nội dung sửa đổi chi tiết:*
     + Khi cổng từ ghi nhận check-in thành công từ mã QR hoặc Face ID, hệ thống kiểm tra thông tin hội viên:
       * Nếu ngày check-in trùng ngày sinh nhật: Hiển thị banner pop-up Kiosk chúc mừng sinh nhật rực rỡ kèm lời chúc từ Paradise Gym.
       * Nếu hợp đồng của hội viên còn hạn &le; 4 ngày: Hiển thị banner cảnh báo nhắc nhở hội viên ghé quầy lễ tân để gia hạn gói tập.

### 4.6. Nhóm Mobile Hội Viên (QR Header, Đóng Băng & Bỏ Tự Chọn PT):
9. **`HV01-US01` — Xem tổng quan và thao tác nhanh:**
   - *Lý do sửa:* Giúp hội viên mở nhanh mã QR cá nhân để quẹt qua cổng turnstile mà không phải vào sâu trong trang cá nhân.
   - *Nội dung sửa đổi chi tiết:* Bổ sung nút bấm biểu tượng "Mã QR" ngay trên Header đầu ứng dụng cạnh Avatar; bấm vào mở modal hiển thị mã QR phóng to toàn màn hình kèm mã hội viên.
10. **`HV03-US01` & `HV03-US02` — Xem gói, quyền lợi và chi tiết gói:**
    - *Lý do sửa:* Thể hiện trạng thái đóng băng gói và loại bỏ luồng tự chọn PT.
    - *Nội dung sửa đổi chi tiết:*
      + Hiển thị nhãn nổi bật `❄️ Đang đóng băng (đến ngày dd/mm/yyyy)` khi hợp đồng đang tạm ngưng.
      + Hiển thị danh sách thành viên cùng nhóm nếu là gói tập PT 1-Nhiều.
      + **Loại bỏ luồng màn hình tự chọn HLV:** Hội viên được thông báo HLV sẽ do bộ phận quản lý/lễ tân sắp xếp phù hợp nhất.

### 4.7. Nhóm Mobile Huấn Luyện Viên (Tích Hợp Hoa Hồng Vào Lịch Dạy):
11. **`PT01-US02` — Xác nhận hoàn thành và ghi kết quả buổi học:**
    - *Lý do sửa:* Đồng bộ kết quả buổi dạy vào cơ chế tính hoa hồng tự động của hệ thống.
    - *Nội dung sửa đổi chi tiết:*
      + Khi PT xác nhận hoàn thành buổi tập và Hội viên ký xác nhận kép, hệ thống tự động tính toán tiền hoa hồng phát sinh cho buổi dạy dựa trên tỷ lệ % cấu hình của PT và giá trị `pt_price_snapshot / total_sessions`.
      + Ghi nhận trực tiếp vào bảng kê thù lao tháng của PT.

---

## 5. BẢNG TRA CỨU FILE MÃ NGUỒN VÀ TÀI LIỆU LIÊN QUAN

| Hạng mục | Đường dẫn tài liệu đặc tả (Docs) | Đường dẫn mã nguồn thực thi (Code) |
| :--- | :--- | :--- |
| **Báo cáo tổng hợp** | [`docs/reports/tab1-web-admin/menu-and-user-stories-changes.md`](file:///e:/Desktop/para/docs/reports/tab1-web-admin/menu-and-user-stories-changes.md) | N/A |
| **Product Spec** | [`docs/product-spec.md`](file:///e:/Desktop/para/docs/product-spec.md) | Toàn hệ thống |
| **Kiến trúc CSDL (ERD 31 bảng)** | [`docs/database/erd.md`](file:///e:/Desktop/para/docs/database/erd.md) | `backend/src/db/migrations/006_boss_feedback_schema_upgrade.sql` |
| **W14 CSKH** | `docs/user-stories/qtv/QTV-W14-Chăm sóc & thông báo/` | `frontend/web/js/modules/customerCare.js`, `backend/src/modules/core/customerCare.controller.js` |
| **W15 Hoa hồng PT** | `docs/user-stories/qtv/QTV-W15-Quản lý hoa hồng PT/` | `frontend/web/js/modules/commissions.js`, `backend/src/modules/core/commissions.controller.js` |
| **W16 Lớp cộng đồng** | `docs/user-stories/qtv/QTV-W16-Lớp tập cộng đồng/` | `frontend/web/js/modules/community.js`, `backend/src/modules/core/community.controller.js` |
| **W17 Khuyến mãi & Voucher** | `docs/user-stories/qtv/QTV-W17-Khuyến mãi & giảm giá/` | `frontend/web/js/modules/discounts.js`, `backend/src/modules/core/discounts.controller.js` |
| **W01 Dashboard** | `docs/user-stories/qtv/QTV-W01-Tổng quan vận hành/` | `frontend/web/js/modules/dashboard.js` |
| **W02 Hội viên & QR/Face** | `docs/user-stories/qtv/QTV-W02-Hội viên & khách hàng/` | `frontend/web/js/modules/members.js` |
| **W03 Gói tập 3 giá** | `docs/user-stories/qtv/QTV-W03-Gói tập/` | `frontend/web/js/modules/packages.js` |
| **W04/W08 Đóng băng & Voucher** | `docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/` | `frontend/web/js/modules/sales.js` |
| **W07 QR & Kiosk Banner** | `docs/user-stories/qtv/QTV-W07-Ra vào & check-in/` | `frontend/web/js/modules/checkin.js` |
| **PT06 Tổng quan & Hoa hồng**| `docs/user-stories/pt/PT06-Tổng quan/` | `frontend/mobile/pt/js/overview.js` |
| **HV Mobile Lớp cộng đồng** | `docs/user-stories/hoi-vien/HV02-Lịch tập/` | `frontend/mobile/member/js/home-schedule.js` |
| **HV Mobile Đóng băng & Nhóm**| `docs/user-stories/hoi-vien/HV03-Gói của tôi/` | `frontend/mobile/member/js/packages-notifications.js` |

---

## 6. KẾT LUẬN

Hệ thống tài liệu (Product Spec, Epics, User Stories, Activity Diagrams, ERD) và toàn bộ mã nguồn thực tế (PostgreSQL, Express REST APIs, Web Admin, Mobile Hội viên, Mobile PT) đã được **đồng bộ 100%**, phản ánh đầy đủ và chuẩn xác các phản hồi nghiệp vụ của Sếp Cường và phần mềm mẫu Paradise Gym.

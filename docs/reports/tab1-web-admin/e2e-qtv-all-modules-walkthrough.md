# Báo Cáo Nghiệm Thu Toàn Diện Kiểm Thử E2E — Web Admin QTV (W01 đến W13)

- **Hệ thống:** Paradise Gym Management System v2.0
- **Phân hệ kiểm thử:** Web Quản trị viên (QTV) — Toàn bộ 13 Menu Chức Năng
- **Cấu trúc thư mục mới:** `tests/e2e/qtv/<US-ID>/` (Phân định theo vai trò Role-based)
- **Quy chuẩn kỹ thuật áp dụng:** 
  - Kỹ năng `.agents/skills/us-e2e-test-recorder/SKILL.md` (đầy đủ 16 nguyên tắc cốt lõi)
  - Quy tắc `AGENTS.md` (Mục 1 Mesh 4-Tab & Mục 7 E2E Test Rules)
  - Quy chuẩn khoanh vùng trực quan Visual Annotations (Bounding Box đỏ/tím + Callout Badges kiểu Snipping Tool)
  - Quy chuẩn Cross-Role Downstream UI Synchronization (Web Lễ tân `http://localhost:3000/web/`, Mobile Hội viên `http://localhost:3000/mobile/member/`, Mobile PT `http://localhost:3000/mobile/pt/`)
  - Quy chuẩn DOM Truthfulness (Không giả lập dữ liệu, không mock data, kết nối PostgreSQL qua REST API)
- **Thời gian hoàn thành:** 2026-09-18
- **Tổng số User Stories:** **43 / 43 User Stories**
- **Kết quả nghiệm thu:** **`100% PASS`**

---

## I. ĐÚC KẾT & CẬP NHẬT KỸ NĂNG THEO GÓP Ý CỦA NGƯỜI DÙNG

### 1. Phân Định Thư Mục Kiểm Thử Theo Vai Trò (Role-Based Directory Structure)
- **Quy chuẩn phân bổ:**
  + Quản trị viên: `tests/e2e/qtv/<US-ID>/`
  + Lễ tân: `tests/e2e/lt/<US-ID>/`
  + Hội viên Mobile: `tests/e2e/hv/<US-ID>/`
  + Huấn luyện viên Mobile: `tests/e2e/pt/<US-ID>/`
- **Thực thi:** Toàn bộ 43 thư mục US của QTV đã được di chuyển vào `tests/e2e/qtv/`, 18 thư mục của Hội viên vào `tests/e2e/hv/`, 12 thư mục của HLV vào `tests/e2e/pt/`, và khởi tạo sẵn `tests/e2e/lt/`. Runner `tests/e2e/runner.js` tự động điều hướng kết quả vào đúng thư mục vai trò.

### 2. Tính Đồng Nhất Thực Thể Giữa Thao Tác Nguồn & Hạ Nguồn (Subject Consistency Rule)
- **Vấn đề nhận diện từ đợt test cũ:** Ở bài test `QTV-W02-US02`, thao tác sửa thông tin hồ sơ được thực hiện trên hội viên mới tạo (HV022/Trần Bảo Long), nhưng downstream lại mở Mobile của hội viên Lê Hoàng Nam (HV001). Ngoài ra, hội viên mới tạo chỉ mới có hồ sơ (`members`), chưa có tài khoản (`accounts`) vì chưa qua luồng kích hoạt trên Mobile.
- **Giải pháp chuẩn hóa:**
  - Đối với các US tạo mới (Create): Tạo đối tượng mới (như `Trần Bảo Long`), downstream kiểm chứng ở Web Lễ tân (tìm thấy hồ sơ tiếp nhận).
  - Đối với các US thao tác dữ liệu (Sửa, Đổi trạng thái, Khóa, Gán gói, Đặt lịch...): **Bắt buộc phải thực hiện trên một đối tượng ĐÃ CÓ TÀI KHOẢN HOẠT ĐỘNG (ACTIVE) TRÊN MOBILE** (hội viên Lê Hoàng Nam - HV001 / SĐT `0987654321`) để downstream đối chiếu trực tiếp trên app Mobile của chính người đó.

### 3. Kiểm Chứng Phạm Vi Chi Nhánh Đa Chi Nhánh (Multi-Branch Scope Verification)
- Khởi tạo và cấp quyền cho **2 tài khoản Lễ tân thuộc 2 chi nhánh khác nhau**:
  + Lễ tân Chi nhánh Quận 1: SĐT `0900000002` (gắn chi nhánh Quận 1)
  + Lễ tân Chi nhánh Bình Thạnh: SĐT `0900000004` (gắn chi nhánh Bình Thạnh)
- Khi QTV tạo hội viên mới tại Chi nhánh Quận 1:
  + Downstream 1 (Lễ tân Q1): Tìm thấy ngay hội viên mới tạo (`PASS`).
  + Downstream 2 (Lễ tân Bình Thạnh): Tìm kiếm hội viên này -> Bảng rỗng / 0 bản ghi (`PASS` - chứng minh dữ liệu bị cô lập hoàn toàn).

### 4. Tách Bạch Thao Tác Nhập Liệu & Submit Form (Input Capture Before Submit Rule - Rule 15)
- Khi test thao tác form (thêm mới, chỉnh sửa), tuyệt đối không gộp bước nhập liệu và click nút Lưu/Submit trong cùng 1 screenshot.
- **Step A:** Nhập giá trị mới vào form -> Chụp screenshot `step-03-input-updated-email.png` hiển thị rõ trường Email chứa `nam.lehoang.updated@gmail.com` kèm khoanh vùng và nhãn.
- **Step B:** Click nút Lưu -> Chụp screenshot `step-04-save-edit-success.png` ghi nhận Toast thông báo thành công và modal đóng lại.

### 5. Xác Thực Màn Hình Nghiệp Vụ Hạ Nguồn Thay Vì Màn Hình Đăng Nhập (Rule 16)
- Tuyệt đối cấm sử dụng screenshot màn hình Đăng nhập (Login Screen) làm bằng chứng kiểm chứng hạ nguồn.
- Nâng cấp test runner (`tests/e2e/runner.js`) với cơ chế Zero-Race Session Isolation: Truy cập static endpoint `http://localhost:3000/favicon.ico` để `localStorage.clear()` và nạp trước token cùng user profile chuẩn xác trước khi điều hướng vào ứng dụng Mobile.

---

## II. TỔNG HỢP KẾT QUẢ THEO 4 BATCH (43 USER STORIES)

| Batch | Phân Hệ / Menu Phụ Trách | Số US | Trạng Thái | Số Ảnh Minh Chứng (Annotated) | Cross-Role UI Verification | Thư mục Lưu Trữ |
| :---: | :--- | :---: | :---: | :--- | :---: | :--- |
| **Batch 1** | **W01** (Dashboard) + **W02** (Hội viên) + **W03** (Gói tập) | **9 US** | **`PASS`** | 35 ảnh | Web Lễ tân Q1 & Bình Thạnh (2 chi nhánh), Mobile Hội viên | `tests/e2e/qtv/QTV-W01-US01` → `QTV-W03-US04` |
| **Batch 2** | **W04** (Đăng ký) + **W05** (Huấn luyện viên) + **W06** (Lịch tập PT) | **13 US** | **`PASS`** | 58 ảnh | Web Lễ tân, Mobile Hội viên (0987654321), Mobile PT (0900000003) | `tests/e2e/qtv/QTV-W04-US01` → `QTV-W06-US04` |
| **Batch 3** | **W07** (Check-in) + **W08** (Thanh toán) + **W09** (Thông báo) | **10 US** | **`PASS`** | 36 ảnh | Web Lễ tân, Mobile Hội viên | `tests/e2e/qtv/QTV-W07-US01` → `QTV-W09-US04` |
| **Batch 4** | **W10** (Báo cáo) + **W11** (Chi nhánh) + **W12** (Thiết bị & Consent) + **W13** (Tài khoản & RBAC) | **11 US** | **`PASS`** | 22 ảnh | Web Lễ tân, Cấu hình Toàn chuỗi & Phân quyền RBAC | `tests/e2e/qtv/QTV-W10-US01` → `QTV-W13-US02` |
| **TỔNG** | **13 Menu Quản trị viên (W01 → W13)** | **43 US** | **`100% PASS`** | **150+ ảnh** | **Đồng bộ 3 ứng dụng hạ nguồn** | `tests/e2e/qtv/` |

---

## III. CHI TIẾT KẾT QUẢ KIỂM THỬ TỪNG MENU (W01 ĐẾN W13)

### 1. Menu W01: Tổng quan vận hành (1 US)
- **`QTV-W01-US01`**: Xem tổng quan vận hành (KPI 4 thẻ chỉ số, Biểu đồ doanh thu 12 tháng, Biểu đồ cơ cấu gói tập, Cảnh báo thiết bị, Bộ chọn mốc ngày xem tác nghiệp).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W01-US01/QTV-W01-US01-test.md`

### 2. Menu W02: Quản lý Hội viên & Khách hàng (4 US)
- **`QTV-W02-US01`**: Thêm mới hội viên (Exception Flow: Branch Scope `ALL` chặn tạo -> chọn chi nhánh Quận 1 -> form mở -> validation lỗi -> tạo thành công Trần Bảo Long).
  - *Downstream 1 (Lễ tân Q1):* Thấy ngay hội viên mới trong danh sách tiếp nhận.
  - *Downstream 2 (Lễ tân Bình Thạnh):* Tìm kiếm hội viên này -> 0 bản ghi (chứng minh cô lập Branch Scope).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W02-US01/QTV-W02-US01-test.md`
- **`QTV-W02-US02`**: Sửa thông tin hội viên (Thực hiện trên chính **Lê Hoàng Nam - HV001 / 0987654321**; kiểm tra khóa SĐT/Mã HV read-only, cập nhật địa chỉ và email).
  - *Step 3:* Chụp rõ ô input Email chứa `nam.lehoang.updated@gmail.com` trước khi bấm Lưu.
  - *Step 4:* Toast thông báo lưu thành công và cập nhật Drawer.
  - *Downstream:* Mở app Mobile của chính Lê Hoàng Nam (`0987654321`) tại `#account` xác nhận email mới đồng bộ 100%.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W02-US02/QTV-W02-US02-test.md`
- **`QTV-W02-US03`**: Đổi trạng thái hội viên (Thực hiện trên **Lê Hoàng Nam**; tạm khóa `INACTIVE` -> Cổng từ chối check-in -> khôi phục `ACTIVE` -> Mobile của Nam hoạt động bình thường).
  - *Downstream:* Cổng kiểm soát ra vào & App Mobile Hội viên (`#home`) của chính Lê Hoàng Nam.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W02-US03/QTV-W02-US03-test.md`
- **`QTV-W02-US04`**: Xem danh sách & bộ lọc hội viên (Kiểm chứng Branch Scope 2 chi nhánh trên Web QTV: Toàn chuỗi ALL, Chi nhánh Quận 1, Chi nhánh Bình Thạnh, Tìm kiếm theo SĐT `0987654321`).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W02-US04/QTV-W02-US04-test.md`

### 3. Menu W03: Thiết lập gói tập (4 US)
- **`QTV-W03-US01`**: Xem danh mục gói tập (Danh mục thẻ dxScrollView, phân loại Gym / PT / Combo, tab lọc trạng thái).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W03-US01/QTV-W03-US01-test.md`
- **`QTV-W03-US02`**: Thêm gói tập mới (Chọn loại COMBO -> dynamic hiện đồng thời ngày tập gym và buổi PT; validation bắt buộc; tạo thành công gói `Gói Combo VIP Paradise`).
  - *Downstream 1 (Lễ tân Q1):* Mở modal Đăng ký -> Dropdown gói tập hiển thị gói mới.
  - *Downstream 2 (Mobile Hội viên):* Mở app Mobile -> tab Mua gói (`#packages/sale`) hiển thị gói mới.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W03-US02/QTV-W03-US02-test.md`
- **`QTV-W03-US03`**: Sửa gói tập (Đổi giá niêm yết lên 6.500.000 đ, giữ nguyên quyền lợi và mã gói).
  - *Downstream (Mobile Hội viên):* Danh mục Mua gói (`#packages/sale`) tự động hiển thị giá niêm yết mới.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W03-US03/QTV-W03-US03-test.md`
- **`QTV-W03-US04`**: Ngừng bán gói tập (Chuyển trạng thái gói sang `INACTIVE`).
  - *Downstream 1 (Lễ tân):* Dropdown bán gói mới tự động loại bỏ gói đã ngừng bán.
  - *Downstream 2 (Mobile Hội viên):* Danh mục Mua gói (`#packages/sale`) tự động ẩn gói đã ngừng bán.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W03-US04/QTV-W03-US04-test.md`

### 4. Menu W04: Đăng ký & Gia hạn gói tập (5 US)
- **`QTV-W04-US01`**: Tạo đăng ký gói mới cho hội viên Lê Hoàng Nam (Hợp đồng DK002, trạng thái Chờ thanh toán).
  - *Downstream 1 (Lễ tân Q1):* DataGrid của Lễ tân thấy hợp đồng mới chờ thanh toán.
  - *Downstream 2 (Mobile Hội viên):* Tab Gói của tôi (`#packages`) hiển thị danh sách gói.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W04-US01/QTV-W04-US01-test.md`
- **`QTV-W04-US02`**: Gia hạn đăng ký gói tập (Tính toán ngày bắt đầu mới liên tục từ ngày kết thúc hợp đồng trước).
  - *Downstream (Lễ tân Q1):* Hiển thị đơn gia hạn mới.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W04-US02/QTV-W04-US02-test.md`
- **`QTV-W04-US03`**: Xem danh sách & bộ lọc hợp đồng đăng ký (Lọc Chờ thanh toán, Chưa gán PT, tìm theo SĐT).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W04-US03/QTV-W04-US03-test.md`
- **`QTV-W04-US04`**: Xem chi tiết lượt đăng ký gói (Tiến độ ngày tập Gym, tiến độ buổi tập PT).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W04-US04/QTV-W04-US04-test.md`
- **`QTV-W04-US05`**: Gán PT phụ trách (Phân công HLV Nguyễn Văn Thể cho gói Combo của Lê Hoàng Nam).
  - *Downstream 1 (Mobile PT):* HLV Nguyễn Văn Thể mở tab Học viên (`#members`) thấy ngay Lê Hoàng Nam.
  - *Downstream 2 (Mobile Hội viên):* Gói của tôi (`#packages`) hiển thị HLV phụ trách Nguyễn Văn Thể.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W04-US05/QTV-W04-US05-test.md`

### 5. Menu W05: Quản lý Huấn luyện viên (4 US)
- **`QTV-W05-US01`**: Thêm mới hồ sơ Huấn luyện viên (Tạo HLV Trần Quốc Bảo PT002).
  - *Downstream (Lễ tân):* Danh sách HLV hiển thị thêm PT mới.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W05-US01/QTV-W05-US01-test.md`
- **`QTV-W05-US02`**: Sửa hồ sơ Huấn luyện viên (Cập nhật chuyên môn, khóa SĐT read-only).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W05-US02/QTV-W05-US02-test.md`
- **`QTV-W05-US03`**: Cập nhật trạng thái hồ sơ Huấn luyện viên (Ngừng hoạt động và ghi rõ lý do).
  - *Downstream (Lễ tân):* Đồng bộ trạng thái HLV.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W05-US03/QTV-W05-US03-test.md`
- **`QTV-W05-US04`**: Xem danh sách & bộ lọc Huấn luyện viên.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W05-US04/QTV-W05-US04-test.md`

### 6. Menu W06: Quản lý Lịch tập PT (4 US)
- **`QTV-W06-US01`**: Xem lịch tập PT (Empty state khi chưa chọn HLV -> chọn Nguyễn Văn Thể -> hiển thị 5 khung giờ chuẩn).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W06-US01/QTV-W06-US01-test.md`
- **`QTV-W06-US02`**: Đặt lịch tập PT mới (Chọn học viên Lê Hoàng Nam, gói Combo, tạo slot BOOKED).
  - *Downstream 1 (Mobile PT):* Tab Lịch dạy (`#schedule`) của HLV Nguyễn Văn Thể hiển thị ca dạy mới.
  - *Downstream 2 (Mobile Hội viên):* Tab Lịch tập (`#schedule`) của Lê Hoàng Nam hiển thị lịch hẹn PT mới.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W06-US02/QTV-W06-US02-test.md`
- **`QTV-W06-US03`**: Xác nhận hoàn thành buổi học PT (Xác nhận kép -> COMPLETED -> tự động khấu trừ 1 buổi PT từ 12 xuống 11).
  - *Downstream 1 (Mobile Hội viên):* Gói của tôi (`#packages`) hiển thị số buổi còn lại bị trừ chính xác 1 buổi.
  - *Downstream 2 (Mobile PT):* Tab Lịch dạy (`#schedule`) hiển thị ca tập đã hoàn thành.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W06-US03/QTV-W06-US03-test.md`
- **`QTV-W06-US04`**: Hủy lịch tập PT (Hủy buổi tập, giải phóng khung giờ trống, không bị trừ buổi dở dang).
  - *Downstream 1 (Mobile PT):* Lịch dạy (`#schedule`) hiển thị trạng thái Đã hủy.
  - *Downstream 2 (Mobile Hội viên):* Lịch tập (`#schedule`) đồng bộ trạng thái Đã hủy.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W06-US04/QTV-W06-US04-test.md`

### 7. Menu W07: Ra vào & Check-in (3 US)
- **`QTV-W07-US01`**: Xử lý check-in tự động qua thiết bị (Downstream Lễ tân thấy sự kiện tức thì).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W07-US01/QTV-W07-US01-test.md`
- **`QTV-W07-US02`**: Ghi nhận Vào Ra thủ công (Validation và ghi nhận sự kiện Ra thủ công).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W07-US02/QTV-W07-US02-test.md`
- **`QTV-W07-US03`**: Xem nhật ký Ra Vào và theo dõi trạng thái thiết bị điểm kiểm soát.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W07-US03/QTV-W07-US03-test.md`

### 8. Menu W08: Thu tiền & Thanh toán (3 US)
- **`QTV-W08-US01`**: Xem danh sách thanh toán & bộ lọc (Tiền mặt, Chuyển khoản, Thành công).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W08-US01/QTV-W08-US01-test.md`
- **`QTV-W08-US02`**: Tạo payment (Ghi nhận thanh toán 100%, sinh phiếu thu tự động).
  - *Downstream 1 (Lễ tân):* Giao dịch mới hiển thị kèm nút in phiếu thu.
  - *Downstream 2 (Mobile Hội viên):* Gói tập được kích hoạt sang trạng thái Đang hiệu lực.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W08-US02/QTV-W08-US02-test.md`
- **`QTV-W08-US03`**: Xem thống kê KPI tài chính doanh thu và lượt thanh toán.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W08-US03/QTV-W08-US03-test.md`

### 9. Menu W09: Cấu hình thông báo tự động (4 US)
- **`QTV-W09-US01`**: Cấu hình thông báo tự động (Bật/tắt tự động gửi cho sự kiện hệ thống).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W09-US01/QTV-W09-US01-test.md`
- **`QTV-W09-US02`**: Quản lý mẫu thông báo in-app (Thêm mẫu mới, chèn biến động).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W09-US02/QTV-W09-US02-test.md`
- **`QTV-W09-US03`**: Tra cứu lịch sử gửi thông báo.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W09-US03/QTV-W09-US03-test.md`
- **`QTV-W09-US04`**: Xem chi tiết mẫu thông báo.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W09-US04/QTV-W09-US04-test.md`

### 10. Menu W10: Báo cáo tổng hợp (1 US)
- **`QTV-W10-US01`**: Xem báo cáo tổng hợp (4 thẻ chỉ số KPI, Biểu đồ doanh thu 3 kỳ, Xuất Excel).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W10-US01/QTV-W10-US01-test.md`

### 11. Menu W11: Quản trị chi nhánh (4 US)
- **`QTV-W11-US01`**: Xem danh sách chi nhánh toàn chuỗi.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W11-US01/QTV-W11-US01-test.md`
- **`QTV-W11-US02`**: Thêm chi nhánh mới (Validation và tạo chi nhánh mới).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W11-US02/QTV-W11-US02-test.md`
- **`QTV-W11-US03`**: Chỉnh sửa thông tin chi nhánh (Khóa Mã chi nhánh read-only).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W11-US03/QTV-W11-US03-test.md`
- **`QTV-W11-US04`**: Xem số liệu chi nhánh.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W11-US04/QTV-W11-US04-test.md`

### 12. Menu W12: Quản lý thiết bị nhận diện - ra vào (4 US)
- **`QTV-W12-US01`**: Quản lý thiết bị nhận diện - ra vào (Thêm thiết bị điểm kiểm soát mới).
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W12-US01/QTV-W12-US01-test.md`
- **`QTV-W12-US02`**: Đăng ký dữ liệu nhận diện có consent.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W12-US02/QTV-W12-US02-test.md`
- **`QTV-W12-US03`**: Rút consent nhận diện sinh trắc học.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W12-US03/QTV-W12-US03-test.md`
- **`QTV-W12-US04`**: Theo dõi trạng thái và sự cố thiết bị.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W12-US04/QTV-W12-US04-test.md`

### 13. Menu W13: Tài khoản & Phân quyền RBAC (2 US)
- **`QTV-W13-US01`**: Xem danh sách tài khoản & thống kê KPI.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W13-US01/QTV-W13-US01-test.md`
- **`QTV-W13-US02`**: Chỉnh sửa tài khoản người dùng & gán quyền.
  - *Kết quả:* **PASS** | *Báo cáo:* `tests/e2e/qtv/QTV-W13-US02/QTV-W13-US02-test.md`

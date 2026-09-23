# Báo Cáo Tổng Hợp Thay Đổi Menu & User Stories (Paradise Gym)

Tài liệu chi tiết xem tại: [`docs/reports/tab1-web-admin/menu-and-user-stories-changes.md`](reports/tab1-web-admin/menu-and-user-stories-changes.md)

---

## Tóm Tắt Nhanh

### Cập nhật 2026-09-22: QTV W02 popup hội viên

- Đồng bộ US04, Epic W02, Product Spec 4.1 và mapping theo năm menu Mobile thực: Trang chủ, Lịch tập, Gói của tôi, Thanh toán, Tài khoản. Đây là projection QTV chỉ đọc, không sao chép quyền tự phục vụ; LT và CRUD quản trị hiện hữu giữ nguyên.
- Nguồn overview-data whitelist, gói sở hữu/tham gia ACCEPTED, booking theo snapshot participant; không suy lịch nhóm từ membership hiện tại. Home chỉ ACTIVE đã thanh toán; status/display_status canonical, badge giữ nguyên nhãn và bộ lọc.
- Ledger tải đủ trang, lọc phương thức/ngày, không trạng thái payment; chờ thanh toán riêng; freeze cuối có xem phiếu thu inline. Account không địa chỉ/lịch sử cổng/sinh trắc/phiên/mật khẩu. Không đổi schema hay business flow ghi dữ liệu.
- [Báo cáo phạm vi, mapping Mobile và validation](reports/tab1-web-admin/2026-09-22-member-popup-walkthrough.md). Lỗi Mobile còn lọc COMPLETED được giữ là vấn đề riêng chưa giải quyết; không khẳng định parity 100% hay nghiệm thu E2E từ audit tài liệu.

### Bổ sung 2026-09-21: QTV-W18 Bàn giao & tất toán doanh thu

- Thêm [Epic QTV-W18](<epic/qtv/QTV-W18-Bàn giao & tất toán doanh thu.md>) và ba US: [US01 đối chiếu nguồn thu](<user-stories/qtv/QTV-W18-Bàn giao & tất toán doanh thu/QTV-W18-US01-Xem và đối chiếu nguồn thu chưa bàn giao.md>), [US02 xác nhận](<user-stories/qtv/QTV-W18-Bàn giao & tất toán doanh thu/QTV-W18-US02-Xác nhận bàn giao doanh thu.md>), [US03 lịch sử](<user-stories/qtv/QTV-W18-Bàn giao & tất toán doanh thu/QTV-W18-US03-Tra cứu lịch sử bàn giao.md>).
- Chỉ QTV + quyền tài chính; tạo mới theo chi nhánh cụ thể, kỳ tùy chọn dựa trên confirmed_at ở múi giờ chi nhánh. Nguồn thu có phiếu thu và chưa thuộc batch; payment luôn bất biến, không thêm trạng thái/mở khóa.
- Registry ngân hàng lưu bền chỉ phục vụ W18; phân loại inline theo từng preview và chỉ lưu trong batch. Unknown/legacy chưa kiểm chứng tiếp tục bị chặn, không suy từ ENV/VietQR.
- Xác nhận checkbox chủ động + ghi chú tối đa 1000, preview fingerprint chống stale/concurrent; replay cùng token trả batch gốc; một payment một batch. Snapshot bất biến, handover_code canonical, không sửa/xóa/mở lại; khoản ghi nhận muộn vào đợt sau dù kỳ chồng.
- Đồng bộ chỉ các mục W18 mới trong Product Spec, QTV indexes, screen mapping và changelog này. [Kế hoạch, files và validation](reports/tab1-web-admin/2026-09-21-revenue-handover-docs.md). Đây là tài liệu bàn giao nội bộ, không phải khóa sổ kế toán/thuế và không thay thế nghiệm thu E2E.

### Cập nhật 2026-09-21: Thanh toán và vòng đời đăng ký

Phần này cập nhật các nội dung tương ứng bên dưới; không tạo menu hoặc US mới.

| Phạm vi | Thay đổi đã đồng bộ |
| --- | --- |
| QTV/LT W08, US01-US03 | `payments` chỉ lưu khoản thu thành công, không có trạng thái; bỏ cột/bộ lọc trạng thái và KPI đơn chờ. Còn hai KPI tổng thực thu và lượt thanh toán thành công. |
| QTV/LT W08-US02, HV03-US03 | QR là yêu cầu riêng `payment_intents`, hết hạn sau 15 phút; chỉ sau ghi nhận thành công mới tạo payment và phiếu thu. Giữ mô phỏng chuyển khoản phục vụ kiểm thử. |
| QTV/LT W08-US02 | Chuyển khoản có đối chiếu thủ công, yêu cầu mã giao dịch ngân hàng; ghi BANK_TRANSFER, không dùng CASH thay thế. |
| QTV/LT W04-US01-US04, HV03-US01/US03 | Đăng ký chờ không tự hủy sau 3 ngày hoặc khi QR hết hạn; có thể hủy chủ động khi còn chờ hoặc tạo QR mới cho cùng đăng ký. |
| QTV/LT W04-US06, HV03-US01 | Chỉ đóng băng gói đã thanh toán và đang hiệu lực; chặn đơn chờ và kỳ chưa bắt đầu cho mọi vai trò. |
| W01/W04/W07/W14, HV03/HV05, PT02 | Cận hạn theo API: còn <=4 ngày hoặc <=3 buổi theo quyền lợi áp dụng, Combo dùng OR; không thay ngưỡng nhóm CSKH đã hết hạn trong 14 ngày. |

- Đồng bộ Product Spec, Epic, Main/Alternate/Exception Flows, Field-level specification, Activity Diagram, bản đồ màn hình và ERD.
- Câu hỏi còn mở: `PAY-OQ-01` về thanh toán sau khi kỳ đăng ký gốc đã hết. Không tự quyết định dời kỳ hiệu lực.
- [Danh sách 42 tài liệu nghiệp vụ đã cập nhật](reports/tab3-mobile-pt/2026-09-21-payment-business-docs-walkthrough.md).
- [Kết quả kiểm thử và triển khai](reports/tab3-mobile-pt/2026-09-21-payment-ledger-walkthrough.md).

### 1. Các Menu Bổ Sung Mới
- **Web Quản trị viên (QTV):**
  - **W14 · Chăm sóc & thông báo** (`route: customer-care`): Quản lý 4 khối việc CSKH (Sinh nhật hôm nay, Sắp hết hạn <= 4 ngày, Chờ nhắc gia hạn, Đăng ký mới).
  - **W15 · Quản lý hoa hồng PT** (`route: commissions`): Bảng kê hoa hồng theo tháng, tính tự động từ buổi dạy hoàn thành và cấu hình tỷ lệ hoa hồng PT.
  - **W16 · Lớp tập cộng đồng** (`route: community-classes`): Lập lịch các lớp nhóm (Yoga, Zumba,...), hiển thị tiến độ giữ chỗ thời gian thực (25/40 chỗ), đăng ký tại quầy.
  - **W17 · Khuyến mãi & giảm giá** (`route: discounts`): Quản lý mã voucher ưu đãi (% hoặc số tiền), thẩm tra khi thanh toán hợp đồng.
- **Web Lễ tân (LT):**
  - **LT-W14 · Chăm sóc & thông báo** (`route: customer-care`): Tác nghiệp chúc mừng sinh nhật và nhắc gia hạn tại quầy.
  - **LT-W16 · Lớp tập cộng đồng** (`route: community-classes`): Đăng ký giữ chỗ lớp tập cộng đồng tại quầy cho hội viên.
- **Mobile Huấn luyện viên (PT):**
  - **PT06 · Tổng quan** (`route: overview`): Dashboard HLV, thống kê hiệu suất dạy, card "Hoa hồng & Thù lao tháng", modal chi tiết từng buổi dạy.

---

### 2. Các User Story Bổ Sung Mới (+17 US)
- **QTV (+9 US):** `QTV-W04-US06` (Đóng băng gói tập), `QTV-W04-US07` (Chuyển nhượng gói tập), `QTV-W05-US05` (Bàn giao học viên khi PT nghỉ ngang), `QTV-W06-US05` (Lịch ngày lễ), `QTV-W14-US01` (Tác nghiệp CSKH), `QTV-W15-US01` (Cấu hình tỷ lệ hoa hồng), `QTV-W15-US02` (Bảng kê hoa hồng tháng), `QTV-W16-US01` (Lập lịch lớp cộng đồng), `QTV-W17-US01` (Mã voucher khuyến mãi).
- **Lễ tân (+4 US):** `LT-W04-US06` (Đóng băng gói tại quầy), `LT-W04-US07` (Chuyển nhượng gói tại quầy), `LT-W14-US01` (CSKH tại quầy), `LT-W16-US01` (Đăng ký lớp cộng đồng tại quầy).
- **Mobile Hội viên (+2 US):** `HV02-US05` (Đăng ký tham gia lớp cộng đồng Yoga/Zumba), `HV03-US07` (Mời thành viên nhóm PT 1-Nhiều).
- **Mobile PT (+2 US):** `PT06-US01` (Tổng quan hiệu suất PT), `PT06-US02` (Xem bảng kê hoa hồng tháng).

---

### 3. Các User Story Sửa Đổi (17 US)
- **QTV-W01-US01 / LT-W01-US01 (Tổng quan):** Bổ sung khối 4 nút cảnh báo "Hôm nay cần xử lý" (Sinh nhật, Hết hạn <= 4 ngày, Chờ gia hạn, Đăng ký mới) bấm chuyển hướng trực tiếp sang W14.
- **QTV-W02-US01, US02 / LT-W02-US01, US02 (Hội viên):** Thêm Avatar ảnh đại diện, nút "Mã QR" xem mã định danh cá nhân, nút "Face ID" đăng ký nhận diện khuôn mặt.
- **QTV-W03-US02, US03 (Gói tập):** Thêm 3 mức giá độc lập (`price`, `gym_price`, `pt_price`), thời lượng buổi tập (30/45/60/90/120 phút), PT 1-1 / nhóm 1-Nhiều, số học viên tối đa.
- **QTV-W04-US01 / LT-W04-US01 (Đăng ký gói):** Lưu snapshot 3 mức giá, tích hợp nhập và thẩm tra mã voucher giảm giá thời gian thực.
- **QTV-W04-US05 / LT-W04-US05 & QTV-W05 (Gán PT):** Bỏ luồng Hội viên tự chọn PT; chuyển việc gán HLV thành tác nghiệp tập trung của QTV/Lễ tân; hỗ trợ bàn giao học viên khi PT nghỉ ngang.
- **QTV-W07-US01 / LT-W07-US01 (Check-in cổng từ):** Tích hợp Kiosk Greeting K01 tự động hiển thị banner chúc mừng sinh nhật hoặc cảnh báo sắp hết hạn gói tập khi quẹt thẻ/mã QR.
- **QTV-W08-US02 / LT-W08-US02 (Thu tiền):** Trừ tiền tự động từ mã voucher, sinh mã VietQR theo đúng số tiền thực thu, xuất phiếu thu khớp số tiền thực tế.
- **HV01-US01 (Mobile Hội viên - Trang chủ):** Nút biểu tượng "Mã QR" trên Header cạnh avatar để mở nhanh mã QR cá nhân quẹt cổng turnstile.
- **HV03-US01, US02 (Mobile Hội viên - Gói của tôi):** Hiển thị badge `❄️ Đang đóng băng`, danh sách học viên nhóm PT 1-Nhiều; loại bỏ màn hình tự chọn PT.
- **PT01-US02 (Mobile PT - Xác nhận buổi học):** Tự động tính toán và ghi nhận hoa hồng buổi dạy vào bảng kê thù lao tháng ngay khi xác nhận kép hoàn tất.

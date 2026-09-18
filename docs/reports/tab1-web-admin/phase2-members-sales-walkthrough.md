# Báo Cáo Bàn Giao: Phân Hệ Web-2 (Hồ Sơ Hội Viên & Bán Gói Thu Tiền 100%)

- **Tab**: Tab 1 (anti-1-QTV-LT)
- **Subagent**: Web-2-Members-Sales
- **Mục tiêu**: Hoàn thiện toàn bộ frontend logic cho W02 (Hồ sơ hội viên), W03 (Danh mục gói tập), W11 (Hệ thống chi nhánh), W04 (Đăng ký gói) và W08 (Thu tiền 100% kích hoạt dịch vụ).

---

## 1. Các Tệp Mã Nguồn Đã Triển Khai

### 1.1. `frontend/web/js/modules/members.js` (Màn hình W02 Hội viên)
- **Tra cứu nhanh SĐT realtime**: Tích hợp `dxTextBox` bắt sự kiện `onValueChanged` / `onEnterKey` gọi `apiClient.members.searchPhone(phone)`. Hiển thị banner kết quả trực quan (tìm thấy/chưa có), hỗ trợ 1-click mở hồ sơ hoặc đăng ký gói ngay.
- **Danh sách hội viên (`dxDataGrid`)**: Tích hợp `DevExtreme CustomStore` hỗ trợ phân trang server-side, tìm kiếm từ khóa, lọc theo chi nhánh và trạng thái (ACTIVE / INACTIVE).
- **Thêm/Sửa hồ sơ hội viên (`dxPopup` + `dxForm`)**: Cấu trúc 2 nhóm thông tin rõ ràng:
  1. *Định danh & Liên hệ*: Họ tên, SĐT (khóa khi sửa), CCCD/Hộ chiếu, Email, Ngày sinh, Giới tính, Chi nhánh gốc, Địa chỉ.
  2. *Sức khỏe & Liên hệ khẩn cấp*: Tiền sử bệnh lý/chấn thương, Người liên hệ khẩn cấp, SĐT khẩn cấp.
- **Xem chi tiết hồ sơ hội viên (`dxPopup` Tab View / Drawer)**:
  - Header tóm tắt: Avatar chữ cái, họ tên, mã HV, SĐT, cảnh báo sức khỏe.
  - *Tab 1 (Lịch sử gói tập)*: Hiển thị danh sách hợp đồng đăng ký, snapshot giá, thời hạn, số buổi Gym/PT còn lại, trạng thái (ACTIVE, PENDING_PAYMENT, EXPIRED). Nút "Thu tiền ngay" nếu ở trạng thái chờ thanh toán.
  - *Tab 2 (Lịch sử ra vào)*: Bảng `dxDataGrid` nhật ký quẹt cổng (thời gian, chiều VÀO/RA, phương thức FaceID/QR/Thủ công, trạng thái Hợp lệ/Từ chối, lý do).
  - *Tab 3 (Chỉ số InBody)*: Bảng `dxDataGrid` theo dõi các chỉ số cân nặng, cơ SMM, mỡ BFM, % mỡ PBF, BMI và điểm InBody.

### 1.2. `frontend/web/js/modules/packages.js` (Màn hình W03 Gói tập & W11 Chi nhánh)
- **W03 Quản lý danh mục gói tập**:
  - `dxDataGrid`: Quản lý danh mục Gym thường (`STANDARD_GYM`), VIP đa chi nhánh (`VIP_ALL_BRANCHES`), PT 1:1 (`PT_1_ON_1`). Hiển thị giá niêm yết format VND, thời hạn ngày, số buổi PT/Gym, chi nhánh áp dụng, trạng thái đang mở bán / ngưng bán.
  - Popup thêm gói mới: Form nhập mã gói, tên gói, loại gói, giá niêm yết, thời hạn ngày, số buổi PT, `dxTagBox` chọn chi nhánh áp dụng và mô tả quyền lợi.
- **W11 Quản lý hệ thống chi nhánh**:
  - `dxDataGrid`: Quản lý danh sách chi nhánh, mã chi nhánh, tên, địa chỉ, hotline, trạng thái hoạt động.
  - Khung giờ hoạt động cố định: Ràng buộc chuẩn hóa cố định từ **05:30 đến 22:00**.
  - Popup thêm chi nhánh: Cấu hình mã, tên chi nhánh, địa chỉ chi tiết, hotline.

### 1.3. `frontend/web/js/modules/sales.js` (Màn hình W04 Đăng ký & W08 Thu tiền 100%)
- **Bố cục kép trực quan 2 cột (Left: Đăng ký W04, Right: Thu tiền W08)**:
  - *Bước 1 (Đăng ký gói W04)*:
    + Tìm kiếm hội viên nhanh bằng SĐT hoặc tạo mới tức thì nếu chưa có hồ sơ.
    + Chọn gói tập từ danh mục active: Tự động hiển thị thẻ **Snapshot Giá Niêm Yết Cố Định** (chốt cứng 6 thuộc tính không thể thay đổi).
    + Nút "Xác nhận đăng ký & chuyển sang thu tiền" gọi `apiClient.registrations.create`, tạo hợp đồng ở trạng thái `PENDING_PAYMENT`.
  - *Bước 2 (Thu tiền 100% kích hoạt gói W08)*:
    + **Quy tắc bắt buộc**: Thu đủ 100% một lần duy nhất, không cho phép công nợ hoặc trả góp lẻ tẻ.
    + Phương thức **Tiền mặt (CASH)**: Tự động tính tiền thừa trả khách, bộ phím gợi ý tiền nhanh (+100k, +200k, +500k, Đủ tiền). Khóa xác nhận nếu tiền khách đưa nhỏ hơn tổng tiền.
    + Phương thức **Chuyển khoản VietQR động NAPAS**: Tự động sinh mã QR động tích hợp sẵn thông tin STK, ngân hàng, số tiền chính xác và mã đơn hàng `PAY-XXX` chuẩn NAPAS.
    + Xác nhận thanh toán thành công gọi `apiClient.payments.confirm`, tự động kích hoạt gói (`ACTIVE`), sinh bản ghi phiếu thu bất biến (`receipts`).
  - *Phiếu thu in ấn chuẩn A5/A4*:
    + Popup hiển thị mẫu phiếu thu chuyên nghiệp với CSS print media query sẵn sàng cho máy in nhiệt hoặc máy in hóa đơn.
  - *Hàng đợi đơn chờ thu tiền (W08 Grid)*:
    + Danh sách các đơn đăng ký đang ở trạng thái `PENDING_PAYMENT` hiển thị ở cuối trang, cho phép lễ tân/thu ngân bấm "Thu tiền" ngay lập tức.

---

## 2. Kiểm Thử & Xác Nhận Cú Pháp (Verification)
- Cả 3 file đã được kiểm tra cú pháp độc lập bằng Node.js compiler (`node -c`):
  + `node -c frontend/web/js/modules/members.js` -> EXIT CODE 0 (OK)
  + `node -c frontend/web/js/modules/packages.js` -> EXIT CODE 0 (OK)
  + `node -c frontend/web/js/modules/sales.js` -> EXIT CODE 0 (OK)
- Tương thích 100% với `ParadiseApiClient` SDK (`frontend/shared/apiClient.js`) và thiết kế hệ thống giao diện `web.css`.

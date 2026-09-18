# HƯỚNG DẪN KHỞI CHẠY VÀ CÀI ĐẶT DỰ ÁN PARADISE GYM

Tài liệu này cung cấp hướng dẫn chi tiết từng bước để cài đặt môi trường, khởi tạo cơ sở dữ liệu PostgreSQL, khởi động Backend REST API và chạy các ứng dụng Web Admin, Mobile Hội viên, Mobile Huấn luyện viên (PT).

---

## 1. TỔNG QUAN KIẾN TRÚC DỰ ÁN

Hệ thống Paradise Gym được tổ chức thành 4 phân hệ tương thích theo cấu trúc đa kênh:

| Phân hệ | Công nghệ | Thư mục mã nguồn | Cổng / URL truy cập mặc định |
| :--- | :--- | :--- | :--- |
| **Backend REST API & DB** | Node.js, Express, PostgreSQL, Better-Auth, JWT | `backend/` | `http://localhost:5000/api/v1` |
| **Web Quản trị & Lễ tân** | DevExtreme jQuery, HTML5/CSS3, AdminLTE theme | `frontend/web/` | `frontend/web/index.html` |
| **Mobile Hội viên** | Smartphone Web View (390x844), Dark Emerald Theme | `frontend/mobile/member/` | `frontend/mobile/member/index.html` |
| **Mobile Huấn luyện viên** | Smartphone Web View (390x844), Sporty PT Theme | `frontend/mobile/pt/` | `frontend/mobile/pt/index.html` |
| **Shared API Client SDK** | Universal REST API SDK tích hợp DevExtreme Store | `frontend/shared/` | Tích hợp tự động trong các frontend |

---

## 2. YÊU CẦU MÔI TRƯỜNG (PREREQUISITES)

Trước khi khởi chạy, máy tính của bạn cần được cài đặt sẵn:
1. **Node.js**: Phiên bản `>= 18.x` hoặc `20.x LTS` ([Tải tại đây](https://nodejs.org/)).
2. **PostgreSQL**: Phiên bản `>= 14.x` hoặc `15.x` ([Tải tại đây](https://www.postgresql.org/download/)).
3. **Trình duyệt Web**: Google Chrome, Microsoft Edge hoặc Brave.
4. **(Tùy chọn)** VS Code với tiện ích mở rộng **Live Server** hoặc công cụ dòng lệnh `serve`.

---

## 3. BƯỚC 1: KHỞI TẠO CƠ SỞ DỮ LIỆU POSTGRESQL

### 3.1. Tạo Cơ Sở Dữ Liệu
Mở công cụ dòng lệnh `psql` hoặc ứng dụng **pgAdmin 4** và thực hiện lệnh tạo database:
```sql
CREATE DATABASE paradise_gym;
```

### 3.2. Cấu Hình Biến Môi Trường Backend
Tạo tập tin `.env` bên trong thư mục `backend/` (nếu chưa có):
```env
NODE_ENV=development
PORT=5000

# Chuỗi kết nối PostgreSQL (Container Docker paradise-postgres cổng 5435)
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/paradise_gym

# Khóa bí mật JWT Auth
JWT_SECRET=paradise-gym-super-secret-jwt-key-2026
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Cấu hình tài khoản nhận thanh toán VietQR
BANK_BIN=970422
BANK_ACCOUNT_NO=888866669999
BANK_ACCOUNT_NAME=CONG TY CP PARADISE GYM
```

### 3.3. Cài Đặt Dependencies & Chạy Migration / Seed Dữ Liệu
Mở terminal tại thư mục gốc của dự án, di chuyển vào `backend/` và thực thi:
```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Cài đặt các thư viện Node.js cần thiết
npm install

# 3. Khởi tạo toàn bộ 22 bảng cơ sở dữ liệu và nạp dữ liệu mẫu (Seeds)
npm run db:init
```
> [!NOTE]
> Lệnh `npm run db:init` sẽ tự động thực thi các file migration schema trong `src/db/migrations/` và nạp dữ liệu mẫu ban đầu (tài khoản mẫu, chi nhánh, phân quyền, gói tập, thiết bị) từ `src/db/seeds/001_seed_data.sql`.

---

## 4. BƯỚC 2: KHỞI ĐỘNG BACKEND REST API SERVER

Tại thư mục `backend/`, chạy một trong hai lệnh sau:
```bash
# Chế độ phát triển (Tự động tải lại khi sửa code)
npm run dev

# Hoặc chế độ chạy thông thường
npm start
```

Khi khởi động thành công, màn hình terminal sẽ hiển thị:
```
==================================================
🏋️‍♂️ PARADISE GYM REST API SERVER RUNNING ON PORT 5000
📡 Base URL: http://localhost:5000/api/v1
✅ Health Check: http://localhost:5000/health
==================================================
```

Bạn có thể kiểm tra trạng thái hoạt động của Backend bằng cách mở trình duyệt và truy cập:
`http://localhost:5000/health` $\rightarrow$ Kết quả trả về `{"status":"UP", "service":"Paradise Gym Core REST API"}`.

---

## 5. BƯỚC 3: KHỞI CHẠY CÁC ỨNG DỤNG FRONTEND

Dự án frontend được xây dựng tối ưu để có thể chạy linh hoạt theo 2 hình thức:

### Cách 1: Khởi Chạy Bằng Local Web Server (Khuyên Dùng)
Tại thư mục gốc của dự án `Paradise Gym-v2/`, bạn có thể dùng công cụ `npx serve` hoặc `live-server`:
```bash
# Sử dụng công cụ serve của npm
npx serve . -p 3000
```
Sau đó truy cập các phân hệ qua đường dẫn tương ứng:
- **Web Quản trị & Lễ tân:** `http://localhost:3000/frontend/web/index.html`
- **App Mobile Hội viên:** `http://localhost:3000/frontend/mobile/member/index.html`
- **App Mobile Huấn luyện viên (PT):** `http://localhost:3000/frontend/mobile/pt/index.html`

> [!TIP]
> Nếu sử dụng **Visual Studio Code**, bạn chỉ cần chuột phải vào file `index.html` bất kỳ và chọn **"Open with Live Server"**.

### Cách 2: Mở Trực Tiếp Tập Tin HTML (Trình Duyệt Cần Kết Nối Backend)
Bạn có thể duyệt vào thư mục trên máy tính và mở file:
- Mở file `frontend/web/index.html` để trải nghiệm Web Admin & Lễ tân.
- Mở file `frontend/mobile/member/index.html` để trải nghiệm App Hội viên.
- Mở file `frontend/mobile/pt/index.html` để trải nghiệm App HLV PT.

> [!IMPORTANT]
> **Quy Chuẩn Dữ Liệu Động 100% Từ Database (Theo Quy Tắc 5 của AGENTS.md):**
> Toàn bộ dữ liệu hiển thị trên giao diện người dùng (danh sách gói tập, thông tin hội viên, lịch PT, lịch sử thanh toán, thông báo...) **bắt buộc là dữ liệu động 100%**, lấy trực tiếp từ PostgreSQL Database thông qua các REST API của Backend (`apiClient`).
> Vui lòng đảm bảo đã khởi động Backend REST API (`npm run dev` tại thư mục `backend/`) trước khi thao tác trên giao diện để hệ thống kết nối và hiển thị đầy đủ dữ liệu từ cơ sở dữ liệu. Khi chưa kết nối API, giao diện sẽ hiển thị trạng thái chờ kết nối / loading hoặc thông báo lỗi kết nối theo đúng quy chuẩn.

---

## 6. HƯỚNG DẪN GIẢ LẬP GIAO DIỆN MOBILE CHUẨN (390 x 844)

Khi chạy ứng dụng **Mobile Hội viên** hoặc **Mobile PT** trên máy tính, để có trải nghiệm chuẩn xác như màn hình điện thoại thông minh:
1. Nhấn phím `F12` (hoặc `Ctrl + Shift + I`) trên trình duyệt để mở Developer Tools.
2. Nhấn tổ hợp phím `Ctrl + Shift + M` (hoặc bấm biểu tượng **Toggle Device Toolbar** hình điện thoại/máy tính bảng).
3. Tại thanh kích thước trên cùng, chọn thiết bị **iPhone 12 / 13 / 14 / 15 Pro** (kích thước chuẩn `390 x 844 px`) với tỉ lệ zoom `100%`.

---

## 7. DANH SÁCH TÀI KHOẢN MẪU & MẬT KHẨU ĐĂNG NHẬP

Tất cả các tài khoản mặc định dưới đây đều dùng chung mật khẩu: **`Paradise@123`**

| Phân quyền (Role) | Số điện thoại đăng nhập | Họ tên mẫu | Chi nhánh | Phân hệ sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| **Quản trị viên (QTV)** | `0900000001` | Admin Hệ Thống | Toàn hệ thống | Web Admin (`frontend/web/`) |
| **Lễ tân (Receptionist)** | `0900000002` | Lễ Tân Chi Nhánh Q1 | Chi nhánh Quận 1 | Web Admin (`frontend/web/`) |
| **Huấn luyện viên (PT)** | `0900000003` | HLV Nguyễn Văn Thể | Chi nhánh Quận 1 | Mobile PT (`frontend/mobile/pt/`) |
| **Hội viên 1 (Member)** | `0987654321` | Trần Thị Mai | Chi nhánh Quận 1 | Mobile Hội viên (`frontend/mobile/member/`) |
| **Hội viên 2 (Member)** | `0912345678` | Lê Hoàng Nam | Chi nhánh Bình Thạnh | Mobile Hội viên (`frontend/mobile/member/`) |

### Quy ước Mã OTP SMS / Xác thực 2 bước (2FA):
- Khi đăng nhập bằng OTP SMS hoặc kích hoạt tài khoản, mã OTP mặc định để test là: **`123456`** (hoặc bạn có thể nhập 6 số bất kỳ trong chế độ mô phỏng).
- Countdown đếm ngược OTP là 60 giây, hỗ trợ bấm gửi lại mã tối đa 3 lần.

---

## 8. KỊCH BẢN KIỂM THỬ LUỒNG NGHIỆP VỤ LIÊN THÔNG (END-TO-END)

Để trải nghiệm toàn bộ sức mạnh liên thông giữa 4 phân hệ, bạn có thể thực hiện theo kịch bản mẫu sau:

### Kịch bản A: Lễ tân tạo hồ sơ $\rightarrow$ Hội viên kích hoạt tài khoản
1. Mở `frontend/web/index.html`, đăng nhập tài khoản Lễ tân (`0900000002` / `Paradise@123`).
2. Vào menu **Hồ sơ hội viên** $\rightarrow$ Bấm **[ + Thêm mới hội viên ]** $\rightarrow$ Nhập họ tên và số điện thoại mới (ví dụ: `0933112233`).
3. Mở `frontend/mobile/member/index.html` $\rightarrow$ Tại màn hình Đăng nhập, chọn liên kết **"Kích hoạt tài khoản tại đây"** (`HV06-US02`).
4. Nhập SĐT `0933112233` $\rightarrow$ Hệ thống tự động truy xuất hồ sơ đã tạo tại quầy $\rightarrow$ Nhận mã OTP `123456` $\rightarrow$ Đặt mật khẩu mới để kích hoạt tài khoản.

### Kịch bản B: Hội viên tự đăng ký $\rightarrow$ Mua gói VietQR $\rightarrow$ Đặt lịch PT $\rightarrow$ Xác nhận hoàn thành kép
1. Mở `frontend/mobile/member/index.html` $\rightarrow$ Chọn **"Đăng ký tài khoản ngay"** (`HV06-US03`) để tạo tài khoản mới.
2. Vào tab **Gói của tôi** $\rightarrow$ Chọn sub-tab **Mua gói** $\rightarrow$ Bấm **[ Mua gói ]** một gói PT bất kỳ.
3. Màn hình thanh toán VietQR hiển thị mã QR cùng thông tin tài khoản ngân hàng $\rightarrow$ Bấm **[ Tôi đã chuyển khoản thành công ]** để mô phỏng tiếp nhận Webhook ngân hàng tự động kích hoạt gói 100%.
4. Tại sub-tab **Gói của tôi**, bấm nút **[ Chọn PT phụ trách ]** $\rightarrow$ Chọn HLV Nguyễn Văn Thể và bấm **[ Gửi yêu cầu ]** (trạng thái `PENDING`).
5. Mở `frontend/mobile/pt/index.html`, đăng nhập tài khoản HLV (`0900000003` / `Paradise@123`) $\rightarrow$ Vào mục Yêu cầu nhận lớp $\rightarrow$ Bấm **[ Chấp nhận ]** (`ACCEPTED`).
6. Quay lại App Hội viên $\rightarrow$ Vào tab **Lịch tập** $\rightarrow$ Bấm **[ + Đặt lịch mới ]** $\rightarrow$ Chọn slot giờ trống 2 tiếng của HLV và xác nhận đặt lịch.
7. Sau buổi tập, HLV vào App PT ghi nhận kết quả buổi tập $\rightarrow$ Hội viên mở App Mobile bấm nút **[ Xác nhận hoàn thành ]** để hoàn tất cơ chế xác nhận kép và trừ 1 buổi tập.

---

## 9. XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

- **Lỗi kết nối CSDL (`ECONNREFUSED 127.0.0.1:5432`):**
  - Kiểm tra xem dịch vụ PostgreSQL đã được khởi động trong Windows Services (`services.msc`) chưa.
  - Kiểm tra lại username, password và port trong file `backend/.env`.
- **Lỗi xung đột cổng 5000 (`EADDRINUSE: address already in use :::5000`):**
  - Thay đổi `PORT=5001` trong file `backend/.env` hoặc tắt tiến trình đang chiếm dụng cổng 5000.
- **Lỗi CORS khi gọi API từ trình duyệt:**
  - Backend đã kích hoạt sẵn `cors({ origin: true, credentials: true })`. Đảm bảo backend đang chạy trước khi thực hiện các thao tác lưu trữ qua API.

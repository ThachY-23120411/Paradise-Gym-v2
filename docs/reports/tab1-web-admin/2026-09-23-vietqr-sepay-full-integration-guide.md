# Hướng Dẫn Toàn Diện Vận Hành & Triển Khai Module Thanh Toán Tự Động VietQR + SePay Webhook

> **Dự án:** Hệ Thống Quản Lý Phòng Gym Cao Cấp — Paradise Gym  
> **Tài liệu bàn giao kỹ thuật & Hướng dẫn vận hành tuần tự từ A đến Z**  
> **Phiên bản:** 2.0 (Hỗ trợ VietinBank, Napas 247, Ngrok Tunnel, SePay Webhook, Zero-Click Auto Popup)  
> **Ngày lập:** 23/09/2026  

---

## Mục Lục
1. [Tổng Quan Kiến Trúc & Nguyên Lý Hoạt Động](#1-tổng-quan-kiến-trúc--nguyên-lý-hoạt-động)
2. [Bước 1: Public Cổng Backend Local Ra Internet Bằng Ngrok](#2-bước-1-public-cổng-backend-local-ra-internet-bằng-ngrok)
3. [Bước 2: Thông Tin Ngân Hàng Thụ Hưởng & Lưu Ý Cài Đặt](#3-bước-2-thông-tin-ngân-hàng-thụ-hưởng--lưu-ý-cài-đặt)
4. [Bước 3: Đăng Ký & Kết Nối Ngân Hàng Trên SePay](#4-bước-3-đăng-ký--kết-nối-ngân-hàng-trên-sepay)
5. [Bước 4: Cấu Hình Webhook Trên Dashboard SePay (Từng Bước Chi Tiết)](#5-bước-4-cấu-hình-webhook-trên-dashboard-sepay-từng-bước-chi-tiết)
6. [Bước 5: Cơ Chế Phân Tách Dữ Liệu Khi Dùng Chung Tài Khoản SePay](#6-bước-5-cơ-chế-phân-tách-dữ-liệu-khi-dùng-chung-tài-khoản-sepay)
7. [Bước 6: Cấu Hình Backend Hệ Thống Paradise Gym](#7-bước-6-cấu-hình-backend-hệ-thống-paradise-gym)
8. [Bước 7: Cơ Chế Zero-Click Frontend (Tự Động Bật Popup Thành Công)](#8-bước-7-cơ-chế-zero-click-frontend-tự-động-bật-popup-thành-công)
9. [Bước 8: Các Kịch Bản Kiểm Thử & Nghiệm Thu](#9-bước-8-các-kịch-bản-kiểm-thử--nghiệm-thu)
10. [Xử Lý Sự Cố Thường Gặp (Troubleshooting)](#10-xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. Tổng Quan Kiến Trúc & Nguyên Lý Hoạt Động

Module thanh toán VietQR kết hợp SePay của Paradise Gym mang lại trải nghiệm **Zero-Click 100% tự động**: Hội viên hoặc Khách hàng chuyển khoản từ bất kỳ App ngân hàng nào, ngay khi tiền vào tài khoản VietinBank, màn hình điện thoại/máy tính đang hiển thị mã QR sẽ **tự động đóng lại và bật ngay Popup thông báo "THANH TOÁN THÀNH CÔNG!"** mà không cần người dùng bấm kiểm tra hay tải lại trang.

```mermaid
sequenceDiagram
  autonumber
  actor HV as Hội viên / Khách hàng
  participant App as App Hội viên / Web Admin
  participant Core as Backend Core (Port 5000)
  participant Bank as App Ngân hàng (VietinBank)
  participant SePay as SePay Gateway (Internet)
  participant Tunnel as Ngrok Tunnel (Public HTTPS)

  %% Giai đoạn 1: Mở hoá đơn & sinh QR
  HV->>App: Chọn Gói tập -> Mở thanh toán chuyển khoản
  App->>Core: POST /api/v1/payments/create-invoice
  Core-->>App: Trả về Payment Intent + VietQR Image URL
  App->>HV: Hiển thị Popup QR kèm cú pháp: "PG <Mã_Đơn> <Tên_HV>"
  Note over App: Frontend bắt đầu Polling nền mỗi 2s gọi /payments/:id/check-bank-status

  %% Giai đoạn 2: Khách quét mã chuyển tiền
  HV->>Bank: Quét QR & Xác nhận chuyển tiền qua Napas 247
  Bank-->>Bank: Biến động số dư: Tài khoản VietinBank nhận tiền (+)

  %% Giai đoạn 3: Bắn Webhook về hệ thống
  Bank->>SePay: Thông báo biến động số dư qua kết nối ngân hàng
  SePay->>Tunnel: POST https://<ngrok-domain>/api/v1/payments/sepay/webhook
  Tunnel->>Core: Chuyển tiếp HTTP Request vào localhost:5000

  %% Giai đoạn 4: Đối soát & Xử lý giao dịch
  Core->>Core: 1. Kiểm tra xác thực API Key<br/>2. Khớp cú pháp mã đơn (DK...)<br/>3. Ghi sổ cái payments (Migration 014)<br/>4. Kích hoạt hợp đồng registrations ACTIVE<br/>5. Sinh phiếu thu receipts PT...<br/>6. Ghi audit_logs & bắn thông báo in-app
  Core-->>Tunnel: HTTP 200 OK (Đã đối soát thành công)
  Tunnel-->>SePay: HTTP 200 OK

  %% Giai đoạn 5: Frontend nhận diện Zero-Click
  App->>Core: GET /api/v1/payments/:id/check-bank-status (chu kỳ 2s)
  Core-->>App: { is_paid: true, receipt_code: "PT...", status: "COMPLETED" }
  App->>HV: 1. Tự động đóng modal VietQR<br/>2. Tự động bật Popup "THANH TOÁN THÀNH CÔNG!"
```

---

## 2. Bước 1: Public Cổng Backend Local Ra Internet Bằng Ngrok

Khi đang chạy Backend ở máy tính nội bộ (`http://localhost:5000`), SePay (ở trên Cloud Internet) không thể gửi gói tin trực tiếp về `localhost` của bạn được. Vì vậy, ta dùng **Ngrok** để tạo một đường hầm bảo mật HTTPS trỏ thẳng vào cổng 5000.

### 2.1. Cài đặt Ngrok & Đăng ký tài khoản:
1. Truy cập [dashboard.ngrok.com](https://dashboard.ngrok.com) đăng ký 1 tài khoản miễn phí.
2. Tải file chạy `ngrok.exe` (hoặc cài qua `winget install ngrok` / `choco install ngrok`).
3. Lấy chuỗi **Authtoken** từ mục **Your Authtoken** trên trang chủ Ngrok.

### 2.2. Gắn Token vào máy tính:
Mở PowerShell và gõ lệnh sau:
```powershell
ngrok config add-authtoken 3FJTi22C9WRTjkajRQ5OF3ITODZ_AaNgAsvwexeAexMVwCp7
```

### 2.3. Khởi chạy Tunnel mở cổng 5000:
Chạy lệnh:
```powershell
ngrok http 5000
```
Màn hình terminal sẽ xuất hiện giao diện như sau:
```text
ngrok                                                           (Ctrl+C to quit)

Session Status                online
Account                       Thach Y (Plan: Free)
Version                       3.x.x
Region                        Asia Pacific (ap)
Latency                       42ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://afterglow-uniformed-bagginess.ngrok-free.dev -> http://localhost:5000
```

> [!IMPORTANT]
> **ĐỊA CHỈ WEBHOOK HOÀN CHỈNH ĐỂ DÙNG:**
> Ghép Domain HTTPS của Ngrok với endpoint Webhook của Backend:
> **`https://afterglow-uniformed-bagginess.ngrok-free.dev/api/v1/payments/sepay/webhook`**

---

## 3. Bước 2: Thông Tin Ngân Hàng Thụ Hưởng & Lưu Ý Cài Đặt

Hệ thống Paradise Gym đã được cấu hình với tài khoản VietinBank:

| Tiêu chí | Giá trị thực tế | Ý nghĩa kỹ thuật |
| :--- | :--- | :--- |
| **Ngân hàng** | **VietinBank** | Ngân hàng TMCP Công Thương Việt Nam |
| **Số tài khoản** | **`108875382652`** | Số tài khoản ngân hàng nhận tiền thanh toán |
| **Tên chủ tài khoản** | **`THACH NHU`** | Viết hoa không dấu chuẩn Napas |
| **Số thẻ Napas** | `9704150124676563` | 6 số đầu `970415` chính là mã BIN Napas của VietinBank |
| **Mã BIN Napas** | **`970415`** | Mã định danh chuyển mạch tài chính quốc gia |
| **Tiền tố nội dung** | **`PG`** | Cú pháp VietQR: `PG <Mã_Hợp_Đồng> <Tên_Hội_Viên>` |

> [!TIP]
> **Đảm bảo nhận biến động số dư tức thì:**
> Hãy đảm bảo tài khoản ngân hàng trên điện thoại đã **bật thông báo số dư qua App OTT** (VietinBank iPay) hoặc qua **SMS Banking** để SePay có thể đọc được giao dịch ngay khi có tiền vào (thường chỉ mất 1 - 3 giây).

---

## 4. Bước 3: Đăng Ký & Kết Nối Ngân Hàng Trên SePay

1. Đăng nhập vào trang quản trị SePay: [my.sepay.vn](https://my.sepay.vn).
2. Vào menu **Ngân hàng** $\rightarrow$ bấm **Thêm ngân hàng**.
3. Chọn ngân hàng **VietinBank**.
4. Tiến hành liên kết tài khoản ngân hàng:
   - Nhập số tài khoản: `108875382652`.
   - Kết nối qua App SePay trên điện thoại (đọc thông báo biến động số dư) hoặc liên kết Internet Banking theo chỉ dẫn trên màn hình SePay.
5. Sau khi kết nối thành công, tài khoản VietinBank sẽ hiển thị trạng thái **Đang hoạt động (Active)** màu xanh lá.

---

## 5. Bước 4: Cấu Hình Webhook Trên Dashboard SePay (Từng Bước Chi Tiết)

Tại thanh điều hướng bên trái của SePay, chọn **Tích hợp Webhook** $\rightarrow$ bấm nút **`+ Thêm Webhook`**. Trình hướng dẫn 4 bước sẽ hiện ra:

### Bước 5.1: Màn hình 1 — Cơ bản
Điền chính xác các ô như sau:
- **Tên Webhook:** `Paradise Gym Webhook` (hoặc tên tùy thích).
- **URL nhận Webhook:** Dán đường dẫn HTTPS Ngrok:
  ```text
  https://afterglow-uniformed-bagginess.ngrok-free.dev/api/v1/payments/sepay/webhook
  ```
- **Loại giao dịch:** Chọn **`Tiền vào`** (Inbound transfer) — *Không chọn Tiền ra để tránh bắn nhầm*.
- **Định dạng dữ liệu:** Chọn **`JSON`**.
- **Tự động gửi lại khi server trả lỗi:** **BẬT CÔNG TẮC XANH** (Nên bật để nếu đường truyền local bị nghẽn 1-2 giây, SePay sẽ tự động thử lại tối đa 7 lần).
- Bấm **`Tiếp theo ->`**.

### Bước 5.2: Màn hình 2 — Tài khoản
- Danh sách các tài khoản ngân hàng đã kết nối sẽ hiện ra.
- **Tích chọn đúng tài khoản VietinBank** (`108875382652 - THACH NHU`).
- Bấm **`Tiếp theo ->`**.

### Bước 5.3: Màn hình 3 — Bảo mật (Authentication)
- Chọn hình thức xác thực: **`API Key`**.
- Tại ô **API Key**, dán chuỗi khóa bảo mật:
  ```text
  paradise_gym_key_2026
  ```
  *(Hoặc chuỗi token mặc định `LWYHLPCCQXSVRELJUSFT6VSR1DXU1YKN5VFIKGOHG3DK7WPJOATZ48MQO9EVZ9BS`)*.
- Bấm **`Tiếp theo ->`**.

### Bước 5.4: Màn hình 4 — Cảnh báo & Lưu (Quan trọng)
- Màn hình này hiển thị thiết lập cảnh báo khi Webhook gặp lỗi liên tiếp (mặc định là `3` lần). Giữ nguyên mặc định.
- **Thao tác lưu:**
  1. Kiểm tra góc dưới cùng bên phải xem có thông báo của Windows Snipping Tool che khuất không. Nếu có, bấm dấu `X` tắt đi.
  2. Bấm nút màu xanh dương: **`[Lưu]`** (hoặc **`[Hoàn tất]`**).
- Webhook sẽ chính thức kích hoạt trên SePay!

---

## 6. Bước 5: Cơ Chế Phân Tách Dữ Liệu Khi Dùng Chung Tài Khoản SePay

Nếu bạn mượn tài khoản SePay của bạn bè hoặc dùng chung 1 tài khoản SePay cho nhiều dự án khác nhau, **hệ thống Paradise Gym vẫn phân tách độc lập 100%, không bao giờ bị lẫn lộn giao dịch** nhờ 3 lớp bảo vệ:

1. **Lớp 1 — Tiền tố nội dung nhận diện (`TRANSFER_PREFIX=PG`):**
   - Mọi mã QR của Paradise Gym dùng tiền tố dự án `PG`. Riêng tài khoản VietinBank cá nhân, nội dung bắt buộc bắt đầu bằng từ khóa ngân hàng `SEVQR`, sau đó mới đến tiền tố dự án và mã đơn (ví dụ: `SEVQR PG DK017 HV001`).
   - Giao dịch của các dự án khác không có chữ `PG` kèm mã đơn `DK...` sẽ bị hệ thống bỏ qua an toàn mà không gây lỗi.
2. **Lớp 2 — Khóa bảo mật API Key riêng của từng Webhook:**
   - Mỗi webhook được tạo trên SePay có ô API Key riêng (`paradise_gym_key_2026`). SePay sẽ đóng gói header `Authorization: Apikey paradise_gym_key_2026` chỉ riêng cho webhook của Paradise Gym.
3. **Lớp 3 — Chống trùng lặp (Idempotency Guard):**
   - Mỗi giao dịch ngân hàng có mã tham chiếu duy nhất (`referenceCode`). Dù SePay gửi lại nhiều lần, hệ thống chỉ ghi nhận đúng 1 lần duy nhất, ngăn chặn cộng tiền hoặc kích hoạt hợp đồng 2 lần.

---

## 7. Bước 6: Cấu Hình Backend Hệ Thống Paradise Gym

### 7.1. Cấu hình biến môi trường (`backend/.env`):
```ini
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/paradise_gym

# Cấu hình tài khoản nhận tiền VietQR VietinBank
BANK_BIN=970415
BANK_ACCOUNT_NO=108875382652
BANK_ACCOUNT_NAME=THACH NHU
TRANSFER_PREFIX=PG

# Khóa xác thực bí mật Webhook SePay
SEPAY_API_KEY=paradise_gym_key_2026
```

### 7.2. Logic xử lý chuẩn Database Migration 014 (`backend/src/modules/core/sepay.js`):
- Tuân thủ quy chuẩn **Sổ cái thanh toán bất biến (Payment Ledger)**:
  * Bảng `payments` không chứa cột `status` tĩnh (trạng thái là virtual: có `confirmed_at` $\rightarrow$ `COMPLETED`).
  * `confirmed_at` bắt buộc `NOT NULL`.
  * Có trigger `completed_payment_immutable` bảo vệ không cho phép `UPDATE` hay `DELETE` giao dịch đã thanh toán.
  * Có trigger `payment_snapshot_guard` kiểm tra số tiền khớp 100% với giá gói đăng ký (`price_snapshot`).
- **Thực thi nguyên tử (Atomic Transaction):**
  1. Parse mã đơn `DK...` hoặc `PAY...` từ nội dung chuyển khoản.
  2. Khóa dòng bản ghi `registrations` với `FOR UPDATE`.
  3. Kiểm tra số tiền chuyển `transferAmount >= payableAmount`.
  4. Thực hiện `INSERT INTO payments (...)` đầy đủ thông tin thanh toán hoàn tất ngay trong 1 câu lệnh.
  5. Cập nhật `payment_intents` sang trạng thái `COMPLETED` (nếu có).
  6. Chuyển trạng thái hợp đồng `registrations` sang `ACTIVE`.
  7. Tự động phát hành phiếu thu vào bảng `receipts` (`PT...`).
  8. Ghi nhật ký kiểm toán `audit_logs` và bắn thông báo in-app đến hội viên.

---

## 8. Bước 7: Cơ Chế Zero-Click Frontend (Tự Động Bật Popup Thành Công)

### 8.1. App Hội Viên (`frontend/mobile/member/js/packages-notifications.js`):
- Khi hội viên chọn gói và mở mã VietQR, hàm `openPayment(reg)` kích hoạt:
  * Sinh mã VietQR QuickLink Napas 247:
    `https://img.vietqr.io/image/970415-108875382652-compact2.png?amount=6000000&addInfo=PG+DK017+THACH+NHU`
  * Bật luồng Polling chạy ngầm mỗi 2 giây:
    ```javascript
    pollingTimer = setInterval(async () => {
      const res = await A.request(`/payments/${pmt.id}/check-bank-status`);
      if (res && (res.is_paid || res.confirmed || res.status === "COMPLETED")) {
        clearInterval(pollingTimer);
        closeDialog(); // Đóng modal VietQR
        openPaymentSuccessModal({ // Bật Popup thành công
          payment_id: pmt.id,
          package_name: res.package_name,
          amount: res.amount,
          receipt_code: res.receipt_code,
          confirmed_at: res.confirmed_at
        });
      }
    }, 2000);
    ```
- **Giao diện Popup Thành công:**
  * Animated icon checkmark tròn xanh lá (`#237b58`).
  * Tiêu đề: **THANH TOÁN THÀNH CÔNG!**
  * Thông tin chi tiết: Tên gói, Số tiền định dạng VNĐ, Mã phiếu thu (`PT...`), Hình thức Chuyển khoản VietQR tự động, Thời gian.
  * Hai nút bấm thao tác nhanh: **`[Xem phiếu thu]`** và **`[Đến Gói của tôi]`**.

### 8.2. Web Admin QTV/Lễ Tân (`frontend/web/js/modules/sales.js`):
- Vòng lặp đối soát tự động chạy mỗi 2 giây. Khi phát hiện giao dịch hoàn tất, tự động đóng cửa sổ chờ và bung thông báo:
  `"Thanh toán VietQR thành công! Đã kích hoạt gói tập."` đồng thời mở ngay phiếu thu PDF/in ấn cho nhân viên.

---

## 9. Bước 8: Các Kịch Bản Kiểm Thử & Nghiệm Thu

Bạn có thể kiểm thử toàn bộ module này qua 3 cấp độ từ giả lập đến chuyển khoản thật:

### Kịch Bản 1: Chạy Test Tự Động Tích Hợp (Automated Integration Test)
Chạy lệnh từ thư mục `backend`:
```powershell
node tests/sepay_webhook.integration.test.cjs
```
- **Kết quả kỳ vọng:** 4/4 bài test PASS 100% (Kiểm tra chặn sai API Key 401, bỏ qua tiền ra, tự động kích hoạt đơn và sinh phiếu thu, chặn trùng lặp).

### Kịch Bản 2: Dùng Công Cụ Giả Lập Local (Không Cần Chuyển Tiền Thật)
1. Mở App Hội viên trên trình duyệt: `http://localhost:3000/mobile/member/`
2. Đăng nhập tài khoản hội viên (`0987654321` / `Paradise@123`).
3. Vào tab **Gói của tôi** $\rightarrow$ **Mua gói** $\rightarrow$ Chọn 1 gói tập $\rightarrow$ Chọn **Thanh toán VietQR**.
4. Màn hình điện thoại hiển thị mã QR kèm mã đơn (Ví dụ: `DK018`). Giữ nguyên màn hình đó.
5. Mở Terminal mới và chạy lệnh giả lập:
   ```powershell
   node backend/scripts/simulate_sepay_webhook.js DK018
   ```
6. **Quan sát màn hình trình duyệt:**
   - Ngay lập tức modal QR tự động biến mất.
   - Popup **"THANH TOÁN THÀNH CÔNG!"** màu xanh lá lập tức bật lên kèm mã phiếu thu.

### Kịch Bản 3: Chuyển Khoản Tiền Thật 1.000đ - 2.000đ Từ App Ngân Hàng
*(Áp dụng khi ngrok đang chạy và SePay đã liên kết VietinBank)*:
1. Tạo 1 gói tập thử nghiệm giá 2.000 VNĐ trên hệ thống.
2. Dùng App Hội viên mở mã VietQR của gói 2.000 VNĐ này.
3. Dùng App ngân hàng bất kỳ trên điện thoại (Vietcombank, MB, Techcombank,...) quét mã QR trên màn hình máy tính.
4. Xác nhận chuyển khoản đúng 2.000 VNĐ (giữ nguyên nội dung chuyển khoản tự sinh `PG DK...`).
5. Trong vòng 1 - 3 giây sau khi ngân hàng báo chuyển tiền thành công:
   - SePay bắt biến động số dư $\rightarrow$ Bắn Webhook qua Ngrok vào Backend.
   - Màn hình App Hội viên tự động chuyển sang Popup **THANH TOÁN THÀNH CÔNG!**.

---

## 10. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

| Hiện tượng | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **Ngrok bị đổi URL sau khi tắt đi bật lại** | Gói Ngrok Free sẽ đổi domain ngẫu nhiên mỗi lần khởi động lại lệnh `ngrok http 5000`. | Copy domain mới từ terminal Ngrok $\rightarrow$ vào SePay $\rightarrow$ Cập nhật lại **URL nhận Webhook** cho đúng. |
| **Chuyển tiền rồi nhưng popup không tự bật** | Nội dung chuyển khoản bị người dùng sửa, mất chữ `PG` hoặc mã đơn `DK...`. | Vào Web Admin $\rightarrow$ Thu ngân/Bán hàng $\rightarrow$ Lễ tân dùng chức năng **Xác nhận thủ công** kèm mã giao dịch ngân hàng để kích hoạt. |
| **SePay báo lỗi HTTP 401 Unauthorized** | Mã API Key cài đặt trên SePay không khớp với `SEPAY_API_KEY` trong file `.env` của Backend. | Đảm bảo nhập đúng `paradise_gym_key_2026` ở cả Bước 3 trên SePay và trong `backend/.env`. |
| **Server trả về lỗi HTTP 400 UNDERPAID** | Khách chuyển thiếu số tiền so với giá trị gói tập yêu cầu. | Hệ thống từ chối kích hoạt để bảo vệ doanh thu. Khách cần chuyển nốt số tiền còn lại. |
| **Giao dịch bị báo trùng lặp (Idempotent)** | SePay gửi webhook nhiều lần cho cùng 1 mã giao dịch. | Đây là tính năng an toàn bình thường của hệ thống, không phải lỗi. |

---

*Tài liệu được biên soạn và chuẩn hóa bởi Anti-1 (Web Admin & Architecture Lead) phục vụ đào tạo, chuyển giao công nghệ và vận hành production.*

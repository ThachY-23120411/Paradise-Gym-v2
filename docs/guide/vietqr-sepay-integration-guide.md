# Hướng Dẫn Vận Hành & Triển Khai Module Thanh Toán Tự Động VietQR + SePay Webhook

Xem tài liệu chi tiết đầy đủ tại:
[Tài liệu chi tiết hướng dẫn A-Z VietQR + SePay](file:///e:/Desktop/para/docs/reports/tab1-web-admin/2026-09-23-vietqr-sepay-full-integration-guide.md)

### Tóm Tắt Các Bước Nhanh:

1. **Khởi chạy Ngrok mở cổng Backend 5000:**
   ```powershell
   ngrok config add-authtoken 3FJTi22C9WRTjkajRQ5OF3ITODZ_AaNgAsvwexeAexMVwCp7
   ngrok http 5000
   ```
   *Lấy Domain HTTPS (Ví dụ: `https://afterglow-uniformed-bagginess.ngrok-free.dev`)*

2. **Cấu hình Webhook trên SePay Dashboard (my.sepay.vn):**
   - **Tên:** `Paradise Gym Webhook`
   - **URL nhận Webhook:** `https://<NGROK_DOMAIN>/api/v1/payments/sepay/webhook`
   - **Loại giao dịch:** `Tiền vào`
   - **Định dạng dữ liệu:** `JSON`
   - **Tự động gửi lại khi server lỗi:** `BẬT`
   - **Tài khoản ngân hàng:** Chọn VietinBank `108875382652`
   - **Bảo mật:** Chọn `API Key`, điền `paradise_gym_key_2026`
   - **Lưu:** Bấm `[Lưu]` (hoặc `[Hoàn tất]`) ở góc dưới bên phải.

3. **Chạy thử giả lập:**
   ```powershell
   node backend/scripts/simulate_sepay_webhook.js [DK_CODE]
   ```

4. **Kiểm thử tự động:**
   ```powershell
   node backend/tests/sepay_webhook.integration.test.cjs
   ```

### Chẩn đoán trường hợp đã nhận tiền nhưng chưa bật popup

Popup chỉ bật khi polling nhận được `is_paid: true` từ endpoint trạng thái. Điều đó chỉ xảy ra khi webhook có đủ cả ba điều kiện:

- Gọi đúng URL công khai `/api/v1/payments/sepay/webhook` và được SePay xác thực bằng API key trong `backend/.env`.
- Payload là giao dịch tiền vào đúng tài khoản nhận tiền đã cấu hình.
- Nội dung chuyển khoản có mã đơn đang chờ, ví dụ `PG DK025`, và số tiền bằng số tiền trên QR.

Với tài khoản VietinBank cá nhân, nội dung chuyển khoản do Paradise Gym sinh bắt buộc bắt đầu bằng `SEVQR`, sau đó mới đến tiền tố dự án và mã đơn, ví dụ `SEVQR PG DK025 HV001`. Backend vẫn đối soát bằng mã `DK...`; các giao dịch không chứa mã đơn hợp lệ được ghi log và không tự động gán vào đơn hàng. Kiểm tra log backend để đối chiếu `id`, `code`, `amount` và `content` trước khi kết luận lỗi polling.

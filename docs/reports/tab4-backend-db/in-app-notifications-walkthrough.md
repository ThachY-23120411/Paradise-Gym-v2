# Báo Cáo Triển Khai: Hệ Thống Thông Báo In-App Đa Sự Kiện Tới Hội Viên & HLV

## 1. Mục tiêu
Thiết lập và kích hoạt cơ chế sinh thông báo in-app tự động (`notifications`) xuống PostgreSQL cho toàn bộ các sự kiện nghiệp vụ cốt lõi:
1. **Mua gói tập & Xác nhận thanh toán thành công**: Gửi đồng thời thông báo kích hoạt hợp đồng (`REGISTRATION_ACTIVATED`) và xác nhận thu tiền (`PAYMENT_CONFIRMED`).
2. **Hủy gói tập**: Gửi thông báo khi gói tập bị hủy (`REGISTRATION_CANCELLED`).
3. **Gửi yêu cầu ghép PT**: Gửi thông báo cho HLV tiếp nhận và thông báo xác nhận đã gửi cho Hội viên (`PT_ASSIGNMENT_REQUEST`).
4. **HLV phản hồi yêu cầu**: Gửi thông báo tiếp nhận (`PT_REQUEST_ACCEPTED`) hoặc từ chối kèm lý do (`PT_REQUEST_REJECTED`) tới Hội viên.
5. **Đặt lịch tập PT**: Gửi thông báo đặt lịch thành công (`BOOKING_CREATED`) cho cả 2 bên.
6. **Buổi tập PT hoàn tất chờ xác nhận kép**: Khi HLV bấm hoàn thành và nhập đánh giá thể lực, gửi thông báo ngay lập tức tới Hội viên (`PT_SESSION_AWAITING_CONFIRMATION`) để vào app kiểm tra và bấm xác nhận.
7. **Xác nhận kép hoàn tất**: Khi Hội viên bấm xác nhận, hoàn tất trừ 1 buổi tập và gửi thông báo xác nhận kép thành công (`PT_SESSION_CONFIRMED`).
8. **Đánh dấu đã đọc tất cả**: Cung cấp endpoint `PUT /api/v1/notifications/read-all`.

---

## 2. Các thay đổi chi tiết

### 2.1. Backend Core Notification Engine (`backend/src/modules/core/notifications.js`)
- Mở rộng `schemas` và `eventNames` cho các sự kiện: `REGISTRATION_CANCELLED`, `PT_REQUEST_REJECTED`, `PT_SESSION_AWAITING_CONFIRMATION`.
- Tinh chỉnh hàm `emit`: Không bị nghẽn khi `notification_rules` của chi nhánh chưa được cấu hình. Nếu không có rule, hệ thống tự động fallback sang `notification_templates` hoặc `defaultEventTemplates` chuẩn mực văn phong Paradise Gym.
- Bổ sung endpoint `PUT /api/v1/notifications/read-all` để hỗ trợ thao tác đọc nhanh hàng loạt trên Mobile.

### 2.2. Core Commerce (`backend/src/modules/core/commerce.js`)
- Cho phép quyền `MEMBER` được gọi `POST /payments/:id/confirm` khi xác nhận chuyển khoản online VietQR.
- Bổ sung đầy đủ bộ biến `member_name`, `package_name`, `amount`, `expiry_date`, `registration_code`.
- Bổ sung endpoint `POST /registrations/:id/cancel` kèm phát sinh thông báo `REGISTRATION_CANCELLED`.

### 2.3. Core Bookings (`backend/src/modules/core/bookings.js`)
- Khi HLV gọi `POST /pt-bookings/:id/pt-confirm`, tự động phát sinh thông báo `PT_SESSION_AWAITING_CONFIRMATION` gửi tới Hội viên.
- Khi Hội viên gửi yêu cầu ghép HLV, gửi đồng thời thông báo tới cả HLV và Hội viên.
- Khi HLV từ chối yêu cầu ghép, gửi thông báo `PT_REQUEST_REJECTED` kèm lý do tới Hội viên.

### 2.4. Universal REST Client SDK (`frontend/shared/apiClient.js`)
- Thêm `apiClient.notifications.markAllAsRead()`.
- Thêm `apiClient.registrations.cancel(id, data)`.

### 2.5. Mobile Member App (`frontend/mobile/member/js/packages-notifications.js`)
- Tối ưu hàm `markAllNotificationsRead` gọi trực tiếp `apiClient.notifications.markAllAsRead()`.

---

## 3. Kết quả kiểm thử tự động (Integration Test)
Script kiểm thử độc lập `test_notifications_flow.js` đã chạy qua toàn bộ 11 bước và PASS 100%:
- Đăng nhập Member & PT thành công.
- Mua gói -> Nhận 2 thông báo `PAYMENT_CONFIRMED` và `REGISTRATION_ACTIVATED`.
- Gửi yêu cầu PT -> Nhận thông báo `PT_ASSIGNMENT_REQUEST`.
- PT đồng ý -> Nhận thông báo `PT_REQUEST_ACCEPTED`.
- Đặt lịch -> Nhận thông báo `BOOKING_CREATED`.
- PT hoàn thành ca tập -> Hội viên nhận thông báo `PT_SESSION_AWAITING_CONFIRMATION`.
- Hội viên xác nhận -> Nhận thông báo `PT_SESSION_CONFIRMED`.
- Đánh dấu đã đọc -> `PUT /notifications/read-all` thành công cập nhật trạng thái.
- Hủy gói tập -> Nhận thông báo `REGISTRATION_CANCELLED`.
- Database đã được dọn sạch về trạng thái 0 record hoạt động để người dùng trực tiếp trải nghiệm.

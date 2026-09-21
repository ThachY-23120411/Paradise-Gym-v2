# PT04 - Tài khoản

- Role: PT; Platform: Mobile.
- Scope: Hồ sơ và tùy chọn của chính PT; ngày làm việc API (ALL_WEEK = Cả tuần, MON_TO_FRI = Thứ 2–Thứ 6), chuyên môn và bio chỉ đọc ở màn hình xem.
- Không có chứng chỉ: đã gỡ theo quyết định người dùng/migration 005 ngày 18/09/2026.
- PT04-US01: Hồ sơ, preference, đổi mật khẩu và popup Thiết bị; field-level spec từng form và luồng xác nhận tại US.
- Registry GET auth/sessions: phiên cùng tài khoản chưa thu hồi/chưa hết hạn; device_name, last_active_at, is_current từ API. DELETE phiên khác có xác nhận và kiểm tra ownership; logout-current cho hiện tại; logout-all có xác nhận bao gồm phiên hiện tại.
- PT04-US02: Sửa email tối đa 150, specialties 500, bio 1.000 ký tự; validate client và server; avatar PNG/JPEG/WebP <= 5MB. Họ tên, mã PT, chi nhánh, SĐT vẫn chỉ đọc.
- Avatar dùng dịch vụ lưu ảnh hiện có: cloud nếu cấu hình, hoặc lưu trữ cục bộ của backend. Chỉ báo lỗi khi API không lưu được; không gọi ảnh lưu cục bộ là đã tải lên cloud. Không bổ sung trường DB cho chức năng này.
- Đăng xuất hiện tại theo PT05-US03; bảo mật/OTP phụ thuộc backend và provider.

## Traceability
- [User Stories PT](../../user-stories/pt/README.md)
- [Open questions](../../open-questions.md)

# BÁO CÁO HOÀN THIỆN: HV03-US01 - XEM GÓI, QUYỀN LỢI VÀ TIẾN ĐỘ SỬ DỤNG

**Phân hệ:** Mobile Hội viên (Tab 2 - anti-2-HV)  
**Subagent chịu trách nhiệm:** HV-3-Packages-Notifications  
**User Story:** HV03-US01 - Xem gói, quyền lợi và tiến độ sử dụng  
**Màn hình liên quan:** Mobile App Hội viên — Tab HV03 · Gói của tôi, sub-tab Gói của tôi  

---

## 1. Phân Tích & Nguyên Nhân Vấn Đề Gặp Phải (Root Cause Analysis)

### 1.1. Vấn đề tài khoản trong ảnh chụp màn hình (Xin chào, Lê Văn Hùng)
- **Nguyên nhân:** Người dùng đăng nhập bằng tài khoản 0900000004 (HLV Lê Văn Hùng - vai trò PT).
- **Hệ quả:** HLV là nhân sự, không có bản ghi trong bảng member_profiles và không sở hữu các hợp đồng tập luyện (registrations). Vì vậy hệ thống hiển thị rỗng GÓI CỦA TÔI (0).
- **Tài khoản Hội viên chuẩn kịch bản US01:**
  - **Trần Thị Bình (0902345678)** sở hữu đầy đủ 3 gói theo đúng tài liệu US01:
    1. Gói PT Cao Cấp 20 buổi: Đã dùng 17/20 buổi, HLV Nguyễn Văn Thể, Đang hoạt động.
    2. Combo VIP Toàn Diện Gym + 12 Buổi PT: Gym đã dùng 1/3 tháng, PT còn 8/12 buổi, HLV Lê Văn Hùng, Đang hoạt động.
    3. Gói PT 10 buổi cơ bản: Chưa chọn HLV, hiển thị nút CTA [ Chọn PT phụ trách ], Đang hoạt động.
  - **Lê Hoàng Nam (0987654321)**: Sở hữu Gói VIP Hoàng Gia 1 Năm (GYM_TIME), ẩn hoàn toàn khối PT.

### 1.2. Mâu thuẫn dữ liệu Seed trong backend/src/config/db.js
- Dữ liệu store.registrations, store.pt_assignment_requests, store.payments và store.receipts trong file backend/src/config/db.js trước đó bị lệch liên kết ID với file 001_seed_data.sql.
- Đã đồng bộ 100% dữ liệu seed trong backend/src/config/db.js khớp chuẩn xác với 001_seed_data.sql tuân thủ nghiêm ngặt Quy tắc 5 & 6 trong AGENTS.md.

### 1.3. Điểm lưu ý về "Quyền lợi" trong tiêu đề HV03-US01
- Tiêu đề User Story là HV03-US01 - Xem gói, quyền lợi và tiến độ sử dụng.
- Tuy nhiên trong phần Main Flow và Field-level specification của tài liệu US01 trước đây chỉ đặc tả: Tên gói, Tiến độ sử dụng (Progress bar), Badge trạng thái, PT phụ trách và nút CTA Chọn PT phụ trách, chưa có trường/nút hiển thị quyền lợi cụ thể của gói đang sở hữu.
- **Giải pháp:** Đã bổ sung thanh tóm tắt quyền lợi (Smart Locker, Sauna/Steambath, InBody, HLV 1:1) kèm nút bấm [ Xem quyền lợi ] mở modal chi tiết quyền lợi gói đang sở hữu (#myPackageBenefitsModal).

---

## 2. Chi Tiết Các Hạng Mục Đã Chuẩn Hóa & Hoàn Thiện

| Hạng mục | Quy chuẩn HV03-US01 | Hiện trạng sau khi cập nhật | Trạng thái |
| :--- | :--- | :--- | :--- |
| **Tiêu đề khối** | GÓI CỦA TÔI (n) kèm số lượng động | Hiển thị GÓI CỦA TÔI (3) đồng bộ theo số lượng gói thực tế | Hoàn thành 100% |
| **Chip lọc trạng thái** | Đang sử dụng (n), Chờ xử lý (n), Đã hết hạn (n) | 3 Chip lọc tương tác động, mặc định chọn Đang sử dụng | Hoàn thành 100% |
| **Tiến độ gói PT** | Đã dùng 17/20 buổi | Format chính xác text: Đã dùng 17/20 buổi kèm Progress bar 85% | Hoàn thành 100% |
| **Tiến độ gói Gym** | Đã dùng 18/30 ngày | Format chính xác text: Đã dùng X/Y ngày kèm Progress bar | Hoàn thành 100% |
| **Tiến độ gói Combo** | Gym: đã dùng 1/3 tháng · PT: còn 8/10 buổi | Format chính xác: Gym: đã dùng 1/3 tháng · PT: còn 8/12 buổi | Hoàn thành 100% |
| **PT đã gán** | PT: [Tên HLV] (màu xanh lục) | Hiển thị PT: Nguyễn Văn Thể, PT: Lê Văn Hùng (xanh lục #34D399) | Hoàn thành 100% |
| **PT chưa gán** | PT: Chưa chọn kèm CTA màu đen | Hiển thị PT: Chưa chọn kèm nút CTA nền đen chữ trắng [ Chọn PT phụ trách ] | Hoàn thành 100% |
| **Gói Gym thuần** | Ẩn hoàn toàn khối PT | Gói GYM_TIME ẩn hoàn toàn dòng PT và nút CTA theo đúng Rule CONDITIONAL | Hoàn thành 100% |
| **Khối Quyền lợi** | Thỏa mãn tiêu đề US01 | Thêm thanh tóm tắt quyền lợi và modal xem chi tiết quyền lợi gói | Hoàn thành 100% |
| **Lịch sử thanh toán** | Danh sách phiếu thu 100% VietQR | Hiển thị danh sách phiếu thu PT-2026-001, PT-2026-002, PT-2026-003 (Trần Thị Bình) | Hoàn thành 100% |
| **Cảnh báo đăng nhập** | Hướng dẫn tài khoản kiểm thử | Bổ sung hướng dẫn SĐT 0902345678 (Trần Thị Bình) và cảnh báo khi đăng nhập bằng tài khoản HLV | Hoàn thành 100% |

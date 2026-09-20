# BÁO CÁO BÀN GIAO: REFACTOR TOÀN DIỆN HỆ THỐNG THEO FEEDBACK SẾP CƯỜNG (PARADISE GYM)

**Dự án:** Paradise Gym Management System  
**Tham chiếu feedback:** `ghi chú a Cường (1).pdf` & Hệ thống mẫu [Phần mềm quản lý phòng gym Paradise Gym](https://phanmemtinhluong.com/phan-mem-quan-ly-phong-gym-paradise-gym/)  
**Tab thực thi:** `anti-1-QTV-LT` (Web Admin Lead) phối hợp cùng `anti-2-HV`, `anti-3-PT`, `anti-4-Core-BE-DB`  
**Ngày bàn giao:** 19/09/2026  

---

## 1. Tổng Quan Kết Quả Refactor

Đã hoàn thành 100% việc rà soát, tái cấu trúc tài liệu đặc tả và mã nguồn toàn hệ thống (Database, Backend API, Frontend Web QTV/Lễ tân, Mobile Hội viên, Mobile PT) theo toàn bộ các phản hồi từ Anh Cường (Sếp) và đối chiếu với luồng nghiệp vụ thực tế của hệ thống quản lý phòng gym Paradise Gym:

1. **Kiến trúc dữ liệu:** Mở rộng từ 22 bảng lên **31 bảng PostgreSQL**, bổ sung 9 bảng nghiệp vụ mới, snapshot 3 mức giá gói, cơ chế đóng băng, chuyển nhượng, hoa hồng, lớp cộng đồng và mã khuyến mãi.
2. **Tài liệu đặc tả (Docs):** Cập nhật `docs/product-spec.md`, `docs/database/erd.md`, hệ thống Epics và User Stories của cả 4 vai trò kèm **Activity Diagrams chuẩn UML** (Boundary, Swimlanes, Action/Decision/Merge/Final).
3. **Backend & Universal API SDK:** Xây dựng và gắn kết 5 module mới (`customerCare`, `commissions`, `community`, `discounts`, `holidays`), tích hợp vào `server.js` và mở rộng `frontend/shared/apiClient.js`.
4. **Web Admin & Lễ tân (`frontend/web/`):** Nâng cấp W01-W08 và bổ sung 4 module mới W14, W15, W16, W17.
5. **Mobile Hội viên (`frontend/mobile/member/`):** Tích hợp mã QR mở cổng, đăng ký lớp cộng đồng Yoga/Zumba, mời thành viên nhóm PT 1-Nhiều, hiển thị trạng thái đóng băng gói.
6. **Mobile PT (`frontend/mobile/pt/`):** Tích hợp PT06-US02 bảng kê hoa hồng tháng, card tổng quan thù lao, modal chi tiết từng buổi dạy, tính hoa hồng động và bộ lọc kỳ thù lao.

---

## 2. Chi Tiết Các Hạng Mục Nâng Cấp

### 2.1. Cơ Sở Dữ Liệu PostgreSQL (31 Bảng) & Database Migration
- **9 bảng mới tạo:**
  - `pt_commissions`: Bảng kê hoa hồng hàng tháng của PT (tổng số buổi, doanh thu PT cơ sở, % hoa hồng, tiền hoa hồng, trạng thái `PENDING`/`APPROVED`/`PAID`, ngày chi trả).
  - `pt_commission_configs`: Cấu hình tỷ lệ hoa hồng linh hoạt theo chi nhánh hoặc theo từng huấn luyện viên.
  - `community_classes`: Lịch các lớp tập cộng đồng (Yoga, Zumba, Aerobic, Kickfit, Spinning) kèm PT đứng lớp, phòng tập, số chỗ tối đa (`max_slots`).
  - `class_enrollments`: Đăng ký tham gia lớp cộng đồng của Hội viên (trạng thái `ENROLLED`/`CANCELLED`/`ATTENDED`).
  - `discount_vouchers`: Mã khuyến mãi/voucher giảm giá (theo % hoặc số tiền cố định, giới hạn lượt dùng, thời hạn hiệu lực).
  - `voucher_redemptions`: Lịch sử áp dụng mã voucher cho từng hợp đồng đăng ký.
  - `gym_holidays`: Lịch nghỉ lễ của hệ thống/chi nhánh để tự động khóa đặt lịch PT.
  - `package_freeze_logs`: Lịch sử đóng băng và rã băng gói tập của Hội viên (số ngày đóng băng, phí đóng băng, ngày gia hạn thêm tương ứng).
  - `package_transfers`: Lịch sử chuyển nhượng hợp đồng gói tập giữa các hội viên.
- **Nâng cấp các bảng hiện hữu:**
  - `packages`: Thêm 3 mức giá độc lập (`price` - tổng, `gym_price` - phần Gym, `pt_price` - phần PT), thời lượng mỗi buổi (`session_duration_minutes`: 30, 45, 60, 90, 120 phút), chế độ PT (`pt_group_mode`: `INDIVIDUAL_1_1` hoặc `GROUP_1_N`), số thành viên tối đa nhóm (`max_group_members`).
  - `registrations`: Lưu snapshot 3 giá (`gym_price_snapshot`, `pt_price_snapshot`), trạng thái đóng băng (`is_frozen`, `frozen_until`), danh sách nhóm hội viên (`group_member_ids`).
  - `member_profiles`: Thêm ảnh đại diện (`avatar_url`), mã định danh QR cá nhân (`qr_access_code`), trạng thái kích hoạt nhận diện khuôn mặt (`face_enrolled`, `face_id_code`).

---

### 2.2. Backend Services & Universal API SDK
- **Gắn kết toàn bộ 5 module mới vào `backend/src/server.js`:**
  - `/api/v1/customer-care`: Danh sách sinh nhật hôm nay, hợp đồng sắp hết hạn (&le; 4 ngày), danh sách chờ nhắc gia hạn (14 ngày), gửi chúc mừng & ghi nhận nhật ký cuộc gọi.
  - `/api/v1/commissions`: Bảng kê hoa hồng theo tháng, tự động tính toán từ các buổi dạy hoàn thành, duyệt bảng kê, cấu hình tỷ lệ hoa hồng, và endpoint dành riêng cho Mobile PT (`GET /api/v1/pt/my-commissions`).
  - `/api/v1/community-classes`: Quản lý lớp cộng đồng, đăng ký tại quầy lễ tân hoặc trên app hội viên, hủy đăng ký và điểm danh lớp.
  - `/api/v1/discounts`: Quản lý mã voucher giảm giá, thẩm tra mã voucher trực tiếp (`POST /discounts/validate`) khi lập phiếu thanh toán.
  - `/api/v1/holidays`: Quản lý ngày nghỉ lễ, tự động chặn đặt lịch trùng ngày lễ.
- **Chức năng PT nghỉ ngang & bàn giao học viên:**
  - `POST /api/v1/pt-bookings/trainers/:id/handover`: Tự động chuyển toàn bộ học viên phụ trách và các ca tập tương lai sang PT mới được chỉ định.
- **Mở rộng `frontend/shared/apiClient.js`:**
  - Bổ sung các phương thức `apiClient.pt.getMyCommissions` cùng các helper cho tất cả các endpoint mới.

---

### 2.3. Frontend Web Admin & Lễ Tân (`frontend/web/`)
- **W01 - Dashboard:** Bổ sung widget cảnh báo vận hành "Hôm nay cần xử lý" (Sinh nhật hôm nay, Sắp hết hạn &le; 4 ngày, Chờ nhắc gia hạn, Đăng ký mới hôm nay) liên kết trực tiếp sang các tab của W14.
- **W02 - Hội viên:** Bổ sung hiển thị Avatar tròn, nút "Mã QR" mở modal hiển thị QR Code cá nhân (dùng quét tại cổng kiểm soát), nút "Face ID" mở modal chụp/đăng ký nhận diện khuôn mặt.
- **W03 - Gói tập:** Nâng cấp modal thêm/sửa gói tập quản lý 3 mức giá tách biệt, thời lượng buổi tập (30/45/60/90/120 phút), loại hình PT 1-1 hoặc nhóm 1-Nhiều.
- **W04 & W08 - Bán gói & Thu tiền:**
  - Áp dụng mã Voucher giảm giá trực tiếp vào popup thanh toán với kiểm tra hợp lệ thời gian thực.
  - Thêm chức năng "Đóng băng gói tập" (`openFreezeModal`) và "Chuyển nhượng gói tập" (`openTransferModal`) trong chi tiết hợp đồng.
- **W05 - Huấn luyện viên:** Thêm chức năng "Bàn giao học viên khi PT nghỉ ngang" (`openTrainerHandoverModal`) chuyển giao hợp đồng và lịch dạy sang HLV tiếp quản.
- **W07 - Check-in & Ra vào:**
  - Thêm modal giả lập quét mã QR tại cổng kiểm soát (`openQrCheckinModal`).
  - Tích hợp Kiosk K01 Greeting banner hiển thị lời chúc sinh nhật hoặc cảnh báo hợp đồng sắp hết hạn khi hội viên quẹt thẻ/QR.
- **W14 - Chăm sóc & Thông báo (MỚI):** Gồm 4 tab (Sinh nhật hôm nay, Sắp hết hạn &le; 4 ngày, Chờ nhắc gia hạn, Đăng ký mới hôm nay) kèm nút gửi tin nhắn chúc mừng và ghi nhận nhật ký cuộc gọi.
- **W15 - Quản lý Hoa hồng PT (MỚI):** Tab Bảng kê hoa hồng tháng (lọc tháng/năm, tính toán lại, xem chi tiết buổi dạy, phê duyệt/chi trả) và Tab Cấu hình tỷ lệ hoa hồng theo PT/chi nhánh.
- **W16 - Lớp tập cộng đồng (MỚI):** Danh sách lớp theo ngày kèm thanh tỷ lệ chỗ (`25/40 chỗ`), modal tạo lớp mới, modal đăng ký học viên tại quầy và danh sách học viên tham gia.
- **W17 - Khuyến mãi & Giảm giá (MỚI):** Danh sách voucher (mã, mức giảm, thời hạn, giới hạn số lượt dùng) và modal tạo mới voucher.

---

### 2.4. Frontend Mobile Hội Viên (`frontend/mobile/member/`)
- **HV01 - Trang chủ:** Bổ sung nút "Mã QR" trên header cạnh avatar mở modal hiển thị QR Code xoay vòng của Hội viên để quẹt qua cổng turnstile.
- **HV02 - Lịch tập:** Thêm phân đoạn "Lớp cộng đồng" hiển thị lịch các lớp Yoga/Zumba trong tuần, thanh hiển thị số chỗ khả dụng thời gian thực (`25/40 chỗ`), nút "Đăng ký tham gia" và "Hủy đăng ký".
- **HV03 - Gói của tôi:** Hiển thị badge `❄️ Đang đóng băng` đối với các gói đang tạm ngưng; bổ sung nút "Mời bạn vào nhóm" (`openGroupInviteModal`) cho phép nhập số điện thoại bạn bè để cùng tham gia gói tập PT 1-Nhiều.

---

### 2.5. Frontend Mobile PT (`frontend/mobile/pt/`)
- **PT06-US02 - Bảng kê hoa hồng tháng:**
  - Hiển thị thẻ nổi bật **"Hoa hồng & Thù lao tháng"** ngay trên giao diện Tổng quan PT06 với số tiền hoa hồng ước tính trong tháng, badge trạng thái (`Chờ duyệt` / `Đã duyệt` / `Đã chi trả`), và tỷ lệ % hoa hồng.
  - Phím tắt nghiệp vụ nhanh "Bảng kê hoa hồng tháng" mở trực tiếp modal chi tiết thù lao.
  - Modal chi tiết bảng kê thù lao:
    * Bộ lọc kỳ thù lao dạng chips: `Tháng này` (mặc định), `Tháng trước`, `Tháng khác` (Month/Year picker).
    * Thẻ tổng quan thù lao: Tổng tiền hoa hồng (VNĐ), trạng thái quyết toán, tỷ lệ áp dụng, số buổi đã dạy, doanh thu phần PT cơ sở, ngày nhận tiền nếu đã chi trả.
    * Danh sách chi tiết các buổi dạy trong tháng: Ngày giờ ca tập, tên học viên, mã học viên, tên gói tập, giá trị buổi học và tiền hoa hồng trích cho buổi đó.
    * Nút làm mới (Refresh) đồng bộ số liệu mới nhất từ máy chủ.
    * Xử lý trọn vẹn Empty state và Exception flows theo tài liệu đặc tả.

---

## 3. Tuân Thủ Quy Chuẩn & Ràng Buộc Kỹ Thuật

- **Quy tắc 5 (Không Hardcode Mock Data):** 100% dữ liệu hiển thị trên giao diện Web Admin, Mobile Hội viên và Mobile PT đều được liên kết động qua backend REST APIs và PostgreSQL database.
- **Quy tắc 6 (Đồng bộ ERD):** `docs/database/erd.md` được cập nhật đầy đủ sơ đồ Mermaid ERD và 31 bảng chi tiết.
- **Quy tắc 2 (Docs Sync & Activity Diagrams):** Tất cả User Stories mới và User Stories điều chỉnh đều có Activity Diagram dạng Swimlane chuẩn UML với đầy đủ Boundary, Swimlanes, Action/Decision/Merge/Final.
- **Kiểm tra cú pháp JavaScript:** Toàn bộ các file `.js` mới và sửa đổi đều vượt qua kiểm tra cú pháp của Node.js (`node -c`).

---

## 4. Danh Sách Tệp Mã Nguồn & Tài Liệu Đã Cập Nhật

```
docs/
├── product-spec.md                                                # Product Spec tổng thể (cập nhật 31 bảng & các tính năng mới)
├── epics.md                                                       # Bảng tổng hợp Epics toàn hệ thống
├── database/erd.md                                                # Tài liệu ERD 31 bảng và sơ đồ quan hệ
├── epic/
│   ├── qtv/ (QTV-W01 -> QTV-W17)                                  # Bổ sung W14, W15, W16, W17
│   ├── le-tan/ (LT-W01 -> LT-W16)                                 # Bổ sung LT-W14, LT-W16
│   ├── hoi-vien/ (HV01 -> HV06)                                   # Cập nhật HV02, HV03
│   └── pt/ (PT01 -> PT06)                                         # Cập nhật PT06
├── user-stories/
│   ├── qtv/                                                       # Các US mới: W04-US06, W04-US07, W05-US05, W06-US05, W14, W15, W16, W17
│   ├── le-tan/                                                    # Các US mới: LT-W04-US06, LT-W04-US07, LT-W14, LT-W16
│   ├── hoi-vien/                                                  # Các US mới: HV02-US05, HV03-US07
│   └── pt/                                                        # US mới: PT06-US02
backend/
├── src/server.js                                                  # Mount 5 module mới
├── src/modules/core/
│   ├── customerCare.js                                            # Module W14
│   ├── commissions.js                                             # Module W15 & PT06-US02
│   ├── community.js                                               # Module W16 & HV02-US05
│   ├── discounts.js                                               # Module W17 & Sales voucher
│   └── holidays.js                                                # Module ngày nghỉ lễ
├── src/db/migrations/006_boss_feedback_schema_upgrade.sql         # SQL migration 9 bảng & các cột mới
└── src/db/seeds/002_boss_feedback_seed.sql                        # SQL seed dữ liệu mẫu
frontend/
├── shared/apiClient.js                                            # Bổ sung API endpoints
├── web/
│   ├── index.html & js/app.js                                     # Bổ sung menu và scripts W14-W17
│   └── js/modules/ (dashboard, members, packages, sales, ptScheduler, checkin, customerCare, commissions, community, discounts)
├── mobile/member/
│   └── js/ (home-schedule.js, packages-notifications.js)          # QR header, lớp cộng đồng, mời bạn nhóm PT, đóng băng
└── mobile/pt/
    ├── index.html                                                 # Modal Bảng kê hoa hồng PT06-US02
    └── js/overview.js                                             # Card thù lao, bộ lọc kỳ, chi tiết buổi dạy, tính hoa hồng
```

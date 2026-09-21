# HV Purchase / Payment Intent E2E

**SUPERSEDED / FAIL current-source audit:** after execution and before handoff, customerCare.js, member.css and home-schedule.js changed. Automated steps below remain historical evidence of the prior hashes only. A fresh final rerun is required; no current-source PASS claim.

2026-09-21T03:47:08.090Z - PASS (scoped scenarios). Sources: HV03-US01, HV03-US03 MF1-8/EF01-02, HV03-US06 MF2-4; explicit 2026-09-21 user override authorizes simulation, successful-only statusless ledger, 15min QR, pending cancel and freeze eligibility. Business docs left to main.

## Source Action Verification

### 1. purchase-catalog

- Action/Input: Open Mua goi
- Expected Result: HV03-US03 MF1: real API package name, price and purchase action
- Actual Result: HV Purchase Gym

500.000 đ

30 ngày · Gym không giới hạn lượt

Xem chi tiết
Mua gói
- Status: **PASS**

![purchase-catalog](./step-01-purchase-catalog.png)

### 2. purchase-buy-dialog

- Action/Input: Click Mua goi
- Expected Result: MF2: selected package and bank transfer purchase form
- Actual Result: Mua gói
HV Purchase Gym

500.000 đ

Hình thức thanh toán: Chuyển khoản Ngân hàng (VietQR)

 Mã giảm giá / Voucher
 Chọn voucher
Áp dụng
 Tiếp tục thanh toán (500.000 đ)
- Status: **PASS**

![purchase-buy-dialog](./step-02-purchase-buy-dialog.png)

### 3. purchase-empty-voucher

- Action/Input: Apply blank voucher
- Expected Result: Empty voucher validation leaves price unchanged
- Actual Result: Vui lòng nhập mã giảm giá
- Status: **PASS**

![purchase-empty-voucher](./step-03-purchase-empty-voucher.png)

### 4. purchase-qr

- Action/Input: Continue payment; create registration and intent
- Expected Result: MF5/6 plus user override: pending registration, 15min QR intent; no final payment
- Actual Result: {"registrationId":"b27c1a9c-e5fd-429a-ac39-503739be2e08","intentId":"192568e1-7b4e-4ed1-8446-7f81c436a01d","expiry":"2026-09-21T04:01:40.150Z"}
- Status: **PASS**

![purchase-qr](./step-04-purchase-qr.png)

### 5. simulate-transfer-success

- Action/Input: Click Toi da chuyen khoan
- Expected Result: User-approved simulate-transfer creates one final payment and receipt; activates same registration
- Actual Result: Thanh toán thành công!
- Status: **PASS**

![simulate-transfer-success](./step-05-simulate-transfer-success.png)

### 6. paid-package-active

- Action/Input: Open Goi cua toi after success
- Expected Result: Same paid registration active, freeze available
- Actual Result: HV Purchase Gym
Đang hoạt động

DK001 · 21/9/2026 - 21/10/2026

Gym: đã dùng 0/30 ngày

Chi tiết gói
Đóng băng
- Status: **PASS**

![paid-package-active](./step-06-paid-package-active.png)

### 7. successful-statusless-history

- Action/Input: Open payment history
- Expected Result: HV03-US06 MF2-4: successful payment renders without status property
- Actual Result: PT001
500.000 đ

HV Purchase Gym

10:46:40 21/9/2026 · Chuyển khoản Ngân hàng (VietQR)

Xem phiếu thu
- Status: **PASS**

![successful-statusless-history](./step-07-successful-statusless-history.png)

### 8. receipt

- Action/Input: Open receipt
- Expected Result: Same member, purchased package and amount
- Actual Result: Phiếu thu
Mã phiếu thu
PT001
Tên hội viên
HV Purchase Member
Gói tập
HV Purchase Gym
Số tiền
500.000 đ
Ngày thanh toán
10:46:40 21/9/2026
- Status: **PASS**

![receipt](./step-08-receipt.png)

### 10. pending-catalog

- Action/Input: Open Mua goi
- Expected Result: HV03-US03 MF1: real API package name, price and purchase action
- Actual Result: HV Purchase Gym

500.000 đ

30 ngày · Gym không giới hạn lượt

Xem chi tiết
Mua gói
- Status: **PASS**

![pending-catalog](./step-10-pending-catalog.png)

### 11. pending-buy-dialog

- Action/Input: Click Mua goi
- Expected Result: MF2: selected package and bank transfer purchase form
- Actual Result: Mua gói
HV Purchase Gym

500.000 đ

Hình thức thanh toán: Chuyển khoản Ngân hàng (VietQR)

 Mã giảm giá / Voucher
 Chọn voucher
Áp dụng
 Tiếp tục thanh toán (500.000 đ)
- Status: **PASS**

![pending-buy-dialog](./step-11-pending-buy-dialog.png)

### 12. pending-empty-voucher

- Action/Input: Apply blank voucher
- Expected Result: Empty voucher validation leaves price unchanged
- Actual Result: Vui lòng nhập mã giảm giá
- Status: **PASS**

![pending-empty-voucher](./step-12-pending-empty-voucher.png)

### 13. pending-qr

- Action/Input: Continue payment; create registration and intent
- Expected Result: MF5/6 plus user override: pending registration, 15min QR intent; no final payment
- Actual Result: {"registrationId":"55c57e9a-6639-44c9-b4a7-b95e83c81651","intentId":"3a699328-5c5e-444c-aa65-54833981351d","expiry":"2026-09-21T04:01:47.153Z"}
- Status: **PASS**

![pending-qr](./step-13-pending-qr.png)

### 14. pending-older-than-three-days

- Action/Input: Reload order after isolated 4-day age and QR expiry fixture
- Expected Result: User override: QR expiry/age never auto-cancels registration; cancel action available
- Actual Result: HV Purchase Gym
500.000 đ

Mã ĐK: DK002 · Ngày tạo: 17/9/2026

Chờ thanh toán 100%

Thanh toán ngay (VietQR)
Hủy đơn
- Status: **PASS**

![pending-older-than-three-days](./step-14-pending-older-than-three-days.png)

### 15. pending-mine-freeze-blocked

- Action/Input: Open pending filter in Goi cua toi
- Expected Result: Unpaid pending package has cancel/pay actions and no freeze
- Actual Result: HV Purchase Gym
Chờ thanh toán

DK002 · 21/9/2026 - 21/10/2026

Gym: đã dùng 0/30 ngày

Chi tiết gói
Tiếp tục thanh toán
Hủy đơn
- Status: **PASS**

![pending-mine-freeze-blocked](./step-15-pending-mine-freeze-blocked.png)

### 16. pending-detail-freeze-blocked

- Action/Input: Open unpaid package detail
- Expected Result: No freeze action in unpaid detail
- Actual Result: Chi tiết gói tập
HV Purchase Gym
Chờ thanh toán

Mã hợp đồng: DK002

Hình thức: Gym Tiêu Chuẩn
Hiệu lực: 21/9/2026 - 21/10/2026
Chi nhánh: HV Payment Branch A
Tiến độ sử dụng

Gym: đã dùng 0/30 ngày

Đóng
 Gia hạn gói
- Status: **PASS**

![pending-detail-freeze-blocked](./step-16-pending-detail-freeze-blocked.png)

### 17. expired-intent-reissued

- Action/Input: Continue payment after QR expiry
- Expected Result: Fresh 15min QR for same pending order; final history still one successful payment
- Actual Result: Mã QR còn hiệu lực 15:00
- Status: **PASS**

![expired-intent-reissued](./step-17-expired-intent-reissued.png)

### 18. qr-countdown-expired

- Action/Input: Advance browser clock 15min without waiting on real bank
- Expected Result: Expired QR hidden, simulation unavailable, recreate action; order still pending
- Actual Result: Mã QR đã hết hạn. Đơn đăng ký vẫn đang chờ thanh toán.
- Status: **PASS**

![qr-countdown-expired](./step-18-qr-countdown-expired.png)

### 19. recreate-qr-action

- Action/Input: Align isolated server expiry and browser clock; click recreate QR
- Expected Result: Same registration gets a usable fresh QR with no payment
- Actual Result: Mã QR còn hiệu lực 15:00
- Status: **PASS**

![recreate-qr-action](./step-19-recreate-qr-action.png)

### 20. pending-cancel-confirmation

- Action/Input: Click Huy don
- Expected Result: Explicit confirmation before cancelling same order
- Actual Result: Hủy đơn chờ thanh toán

Hủy đơn DK002 của gói HV Purchase Gym?

Quay lại
Xác nhận hủy đơn
- Status: **PASS**

![pending-cancel-confirmation](./step-20-pending-cancel-confirmation.png)

### 21. pending-cancel-success

- Action/Input: Confirm cancellation
- Expected Result: Order disappears from pending; no final payment or receipt generated
- Actual Result: Thanh toán
Lịch sử thanh toán
Chờ thanh toán

Bạn không có đơn đăng ký nào đang chờ thanh toán.
- Status: **PASS**

![pending-cancel-success](./step-21-pending-cancel-success.png)

### 23. freeze-form

- Action/Input: Open freeze for paid active package
- Expected Result: Current paid package may freeze
- Actual Result: Đóng băng gói tập

Gói tập: HV Purchase Gym

Mã hợp đồng: DK001 · Hạn cũ: 21/10/2026

Số ngày đóng băng *
7 ngày
14 ngày
30 ngày
60 ngày
Hạn gói tập sẽ được tự động lùi tương ứng với số ngày đóng băng thực tế.
Lý do đóng băng
Hủy
 Xác nhận đóng băng
- Status: **PASS**

![freeze-form](./step-23-freeze-form.png)

### 24. freeze-invalid-input

- Action/Input: Enter zero freeze days before submit
- Expected Result: Input captured separately from validation submit
- Actual Result: 0
- Status: **PASS**

![freeze-invalid-input](./step-24-freeze-invalid-input.png)

### 25. freeze-zero-validation

- Action/Input: Submit zero days
- Expected Result: Invalid days blocked; contract remains ACTIVE
- Actual Result: Vui lòng nhập số ngày đóng băng hợp lệ (lớn hơn 0)
- Status: **PASS**

![freeze-zero-validation](./step-25-freeze-zero-validation.png)

### 26. freeze-valid-input

- Action/Input: Enter two days before submit
- Expected Result: Separate input screenshot
- Actual Result: 2 days
- Status: **PASS**

![freeze-valid-input](./step-26-freeze-valid-input.png)

### 27. freeze-success

- Action/Input: Confirm freeze
- Expected Result: Paid active package becomes frozen
- Actual Result: HV Purchase Gym
❄️ Đang đóng băng

DK001 · 21/9/2026 - 23/10/2026

Gym: đã dùng 0/30 ngày

Chi tiết gói
Mở đóng băng trước hạn
- Status: **PASS**

![freeze-success](./step-27-freeze-success.png)

### 29. scheduled-freeze-blocked

- Action/Input: View paid future package fixture
- Expected Result: User override: SCHEDULED package cannot freeze
- Actual Result: HV Purchase Gym
Chưa đến ngày hiệu lực

DK003 · 28/9/2026 - 28/10/2026

Gym: đã dùng 0/30 ngày

Chi tiết gói
- Status: **PASS**

![scheduled-freeze-blocked](./step-29-scheduled-freeze-blocked.png)

### 30. scheduled-detail-freeze-blocked

- Action/Input: Open scheduled package detail
- Expected Result: No freeze action in detail either
- Actual Result: Chi tiết gói tập
HV Purchase Gym
Chưa đến ngày hiệu lực

Mã hợp đồng: DK003

Hình thức: Gym Tiêu Chuẩn
Hiệu lực: 28/9/2026 - 28/10/2026
Chi nhánh: HV Payment Branch A
Tiến độ sử dụng

Gym: đã dùng 0/30 ngày

Đóng
 Gia hạn gói
- Status: **PASS**

![scheduled-detail-freeze-blocked](./step-30-scheduled-detail-freeze-blocked.png)

### 31. time-four-days

- Action/Input: Load real paid registration boundary fixture
- Expected Result: Backend canonical is_expiring=true; GYM_TIME, days=4, remaining PT=null, remaining Gym=null
- Actual Result: {"is_expiring":true,"display_status":"EXPIRING","text":"Boundary time-four-days\nSắp hết hạn\n\nDK004 · 21/9/2026 - 25/9/2026\n\nGym: đã dùng 0/30 ngày\n\nChi tiết gói\nĐóng băng"}
- Status: **PASS**

![time-four-days](./step-31-time-four-days.png)

### 32. time-four-days-detail

- Action/Input: Open detail for same boundary registration
- Expected Result: Detail uses exactly the same backend flag as list
- Actual Result: Chi tiết gói tập
Boundary time-four-days
Sắp hết hạn

Mã hợp đồng: DK004

Hình thức: Gym Tiêu Chuẩn
Hiệu lực: 21/9/2026 - 25/9/2026
Chi nhánh: HV Payment Branch A
Tiến độ sử dụng

Gym: đã dùng 0/30 ngày

Đóng
 Đóng băng gói
 Gia hạn gói
- Status: **PASS**

![time-four-days-detail](./step-32-time-four-days-detail.png)

### 33. time-five-days

- Action/Input: Load real paid registration boundary fixture
- Expected Result: Backend canonical is_expiring=false; GYM_TIME, days=5, remaining PT=null, remaining Gym=null
- Actual Result: {"is_expiring":false,"display_status":"ACTIVE","text":"Boundary time-five-days\nĐang hoạt động\n\nDK005 · 21/9/2026 - 26/9/2026\n\nGym: đã dùng 0/30 ngày\n\nChi tiết gói\nĐóng băng"}
- Status: **PASS**

![time-five-days](./step-33-time-five-days.png)

### 34. time-five-days-detail

- Action/Input: Open detail for same boundary registration
- Expected Result: Detail uses exactly the same backend flag as list
- Actual Result: Chi tiết gói tập
Boundary time-five-days
Đang hoạt động

Mã hợp đồng: DK005

Hình thức: Gym Tiêu Chuẩn
Hiệu lực: 21/9/2026 - 26/9/2026
Chi nhánh: HV Payment Branch A
Tiến độ sử dụng

Gym: đã dùng 0/30 ngày

Đóng
 Đóng băng gói
 Gia hạn gói
- Status: **PASS**

![time-five-days-detail](./step-34-time-five-days-detail.png)

### 35. gym-three-sessions

- Action/Input: Load real paid registration boundary fixture
- Expected Result: Backend canonical is_expiring=true; GYM_SESSION, days=20, remaining PT=null, remaining Gym=3
- Actual Result: {"is_expiring":true,"display_status":"EXPIRING","text":"Boundary gym-three-sessions\nSắp hết hạn\n\nDK006 · 21/9/2026 - 11/10/2026\n\nGym: đã dùng 0/30 ngày\n\nGym: còn 3/3 lượt\n\nChi tiết gói\nĐóng băng"}
- Status: **PASS**

![gym-three-sessions](./step-35-gym-three-sessions.png)

### 36. gym-three-sessions-detail

- Action/Input: Open detail for same boundary registration
- Expected Result: Detail uses exactly the same backend flag as list
- Actual Result: Chi tiết gói tập
Boundary gym-three-sessions
Sắp hết hạn

Mã hợp đồng: DK006

Hình thức: Gym Tiêu Chuẩn
Hiệu lực: 21/9/2026 - 11/10/2026
Chi nhánh: HV Payment Branch A
Tiến độ sử dụng

Gym: đã dùng 0/30 ngày

Gym: còn 3/3 lượt

Đóng
 Đóng băng gói
 Gia hạn gói
- Status: **PASS**

![gym-three-sessions-detail](./step-36-gym-three-sessions-detail.png)

### 37. gym-four-sessions

- Action/Input: Load real paid registration boundary fixture
- Expected Result: Backend canonical is_expiring=false; GYM_SESSION, days=1, remaining PT=null, remaining Gym=4
- Actual Result: {"is_expiring":false,"display_status":"ACTIVE","text":"Boundary gym-four-sessions\nĐang hoạt động\n\nDK007 · 21/9/2026 - 22/9/2026\n\nGym: đã dùng 0/30 ngày\n\nGym: còn 4/4 lượt\n\nChi tiết gói\nĐóng băng"}
- Status: **PASS**

![gym-four-sessions](./step-37-gym-four-sessions.png)

### 38. gym-four-sessions-detail

- Action/Input: Open detail for same boundary registration
- Expected Result: Detail uses exactly the same backend flag as list
- Actual Result: Chi tiết gói tập
Boundary gym-four-sessions
Đang hoạt động

Mã hợp đồng: DK007

Hình thức: Gym Tiêu Chuẩn
Hiệu lực: 21/9/2026 - 22/9/2026
Chi nhánh: HV Payment Branch A
Tiến độ sử dụng

Gym: đã dùng 0/30 ngày

Gym: còn 4/4 lượt

Đóng
 Đóng băng gói
 Gia hạn gói
- Status: **PASS**

![gym-four-sessions-detail](./step-38-gym-four-sessions-detail.png)

### 39. pt-three-sessions

- Action/Input: Load real paid registration boundary fixture
- Expected Result: Backend canonical is_expiring=true; PT_SESSION, days=20, remaining PT=3, remaining Gym=null
- Actual Result: {"is_expiring":true,"display_status":"EXPIRING","text":"Boundary pt-three-sessions\nSắp hết hạn\n\nDK008 · 21/9/2026 - 11/10/2026\n\nPT: đã dùng 0/3 buổi · Còn 3 buổi\n\nĐang giữ chỗ: 0 buổi\n\nPT: Chưa chọn (Liên hệ Lễ tân)\n\nChi tiết gói\nChọn PT phụ trách\nĐóng băng"}
- Status: **PASS**

![pt-three-sessions](./step-39-pt-three-sessions.png)

### 40. pt-three-sessions-detail

- Action/Input: Open detail for same boundary registration
- Expected Result: Detail uses exactly the same backend flag as list
- Actual Result: Chi tiết gói tập
Boundary pt-three-sessions
Sắp hết hạn

Mã hợp đồng: DK008

Hình thức: PT Kèm 1-1 Cá nhân
Hiệu lực: 21/9/2026 - 11/10/2026
Chi nhánh: HV Payment Branch A
HLV phụ trách: Chưa chỉ định 
Liên hệ Lễ tân
Tiến độ sử dụng

PT: đã dùng 0/3 buổi · Còn 3 buổi

Đang giữ chỗ: 0 buổi
Đóng
 Đóng băng gói
 Gia hạn gói
- Status: **PASS**

![pt-three-sessions-detail](./step-40-pt-three-sessions-detail.png)

### 41. pt-four-sessions

- Action/Input: Load real paid registration boundary fixture
- Expected Result: Backend canonical is_expiring=false; PT_SESSION, days=1, remaining PT=4, remaining Gym=null
- Actual Result: {"is_expiring":false,"display_status":"ACTIVE","text":"Boundary pt-four-sessions\nĐang hoạt động\n\nDK009 · 21/9/2026 - 22/9/2026\n\nPT: đã dùng 0/4 buổi · Còn 4 buổi\n\nĐang giữ chỗ: 0 buổi\n\nPT: Chưa chọn (Liên hệ Lễ tân)\n\nChi tiết gói\nChọn PT phụ trách\nĐóng băng"}
- Status: **PASS**

![pt-four-sessions](./step-41-pt-four-sessions.png)

### 42. pt-four-sessions-detail

- Action/Input: Open detail for same boundary registration
- Expected Result: Detail uses exactly the same backend flag as list
- Actual Result: Chi tiết gói tập
Boundary pt-four-sessions
Đang hoạt động

Mã hợp đồng: DK009

Hình thức: PT Kèm 1-1 Cá nhân
Hiệu lực: 21/9/2026 - 22/9/2026
Chi nhánh: HV Payment Branch A
HLV phụ trách: Chưa chỉ định 
Liên hệ Lễ tân
Tiến độ sử dụng

PT: đã dùng 0/4 buổi · Còn 4 buổi

Đang giữ chỗ: 0 buổi
Đóng
 Đóng băng gói
 Gia hạn gói
- Status: **PASS**

![pt-four-sessions-detail](./step-42-pt-four-sessions-detail.png)

### 43. combo-time-or

- Action/Input: Load real paid registration boundary fixture
- Expected Result: Backend canonical is_expiring=true; COMBO, days=4, remaining PT=4, remaining Gym=null
- Actual Result: {"is_expiring":true,"display_status":"EXPIRING","text":"Boundary combo-time-or\nSắp hết hạn\n\nDK010 · 21/9/2026 - 25/9/2026\n\nGym: đã dùng 0/30 ngày\n\nPT: đã dùng 0/4 buổi · Còn 4 buổi\n\nĐang giữ chỗ: 0 buổi\n\nPT: Chưa chọn (Liên hệ Lễ tân)\n\nChi tiết gói\nChọn PT phụ trách\nĐóng băng"}
- Status: **PASS**

![combo-time-or](./step-43-combo-time-or.png)

### 44. combo-time-or-detail

- Action/Input: Open detail for same boundary registration
- Expected Result: Detail uses exactly the same backend flag as list
- Actual Result: Chi tiết gói tập
Boundary combo-time-or
Sắp hết hạn

Mã hợp đồng: DK010

Hình thức: Combo Gym + PT
Hiệu lực: 21/9/2026 - 25/9/2026
Chi nhánh: HV Payment Branch A
HLV phụ trách: Chưa chỉ định 
Liên hệ Lễ tân
Tiến độ sử dụng

Gym: đã dùng 0/30 ngày

PT: đã dùng 0/4 buổi · Còn 4 buổi

Đang giữ chỗ: 0 buổi
Đóng
 Đóng băng gói
 Gia hạn gói
- Status: **PASS**

![combo-time-or-detail](./step-44-combo-time-or-detail.png)

### 45. combo-pt-or

- Action/Input: Load real paid registration boundary fixture
- Expected Result: Backend canonical is_expiring=true; COMBO, days=20, remaining PT=3, remaining Gym=null
- Actual Result: {"is_expiring":true,"display_status":"EXPIRING","text":"Boundary combo-pt-or\nSắp hết hạn\n\nDK011 · 21/9/2026 - 11/10/2026\n\nGym: đã dùng 0/30 ngày\n\nPT: đã dùng 0/3 buổi · Còn 3 buổi\n\nĐang giữ chỗ: 0 buổi\n\nPT: Chưa chọn (Liên hệ Lễ tân)\n\nChi tiết gói\nChọn PT phụ trách\nĐóng băng"}
- Status: **PASS**

![combo-pt-or](./step-45-combo-pt-or.png)

### 46. combo-pt-or-detail

- Action/Input: Open detail for same boundary registration
- Expected Result: Detail uses exactly the same backend flag as list
- Actual Result: Chi tiết gói tập
Boundary combo-pt-or
Sắp hết hạn

Mã hợp đồng: DK011

Hình thức: Combo Gym + PT
Hiệu lực: 21/9/2026 - 11/10/2026
Chi nhánh: HV Payment Branch A
HLV phụ trách: Chưa chỉ định 
Liên hệ Lễ tân
Tiến độ sử dụng

Gym: đã dùng 0/30 ngày

PT: đã dùng 0/3 buổi · Còn 3 buổi

Đang giữ chỗ: 0 buổi
Đóng
 Đóng băng gói
 Gia hạn gói
- Status: **PASS**

![combo-pt-or-detail](./step-46-combo-pt-or-detail.png)

### 47. combo-gym-or

- Action/Input: Load real paid registration boundary fixture
- Expected Result: Backend canonical is_expiring=true; COMBO, days=20, remaining PT=4, remaining Gym=3
- Actual Result: {"is_expiring":true,"display_status":"EXPIRING","text":"Boundary combo-gym-or\nSắp hết hạn\n\nDK012 · 21/9/2026 - 11/10/2026\n\nGym: đã dùng 0/30 ngày\n\nPT: đã dùng 0/4 buổi · Còn 4 buổi\n\nĐang giữ chỗ: 0 buổi\n\nPT: Chưa chọn (Liên hệ Lễ tân)\n\nChi tiết gói\nChọn PT phụ trách\nĐóng băng"}
- Status: **PASS**

![combo-gym-or](./step-47-combo-gym-or.png)

### 48. combo-gym-or-detail

- Action/Input: Open detail for same boundary registration
- Expected Result: Detail uses exactly the same backend flag as list
- Actual Result: Chi tiết gói tập
Boundary combo-gym-or
Sắp hết hạn

Mã hợp đồng: DK012

Hình thức: Combo Gym + PT
Hiệu lực: 21/9/2026 - 11/10/2026
Chi nhánh: HV Payment Branch A
HLV phụ trách: Chưa chỉ định 
Liên hệ Lễ tân
Tiến độ sử dụng

Gym: đã dùng 0/30 ngày

PT: đã dùng 0/4 buổi · Còn 4 buổi

Đang giữ chỗ: 0 buổi
Đóng
 Đóng băng gói
 Gia hạn gói
- Status: **PASS**

![combo-gym-or-detail](./step-48-combo-gym-or-detail.png)

### 49. combo-unlimited-gym

- Action/Input: Load real paid registration boundary fixture
- Expected Result: Backend canonical is_expiring=false; COMBO, days=20, remaining PT=4, remaining Gym=null
- Actual Result: {"is_expiring":false,"display_status":"ACTIVE","text":"Boundary combo-unlimited-gym\nĐang hoạt động\n\nDK013 · 21/9/2026 - 11/10/2026\n\nGym: đã dùng 0/30 ngày\n\nPT: đã dùng 0/4 buổi · Còn 4 buổi\n\nĐang giữ chỗ: 0 buổi\n\nPT: Chưa chọn (Liên hệ Lễ tân)\n\nChi tiết gói\nChọn PT phụ trách\nĐóng băng"}
- Status: **PASS**

![combo-unlimited-gym](./step-49-combo-unlimited-gym.png)

### 50. combo-unlimited-gym-detail

- Action/Input: Open detail for same boundary registration
- Expected Result: Detail uses exactly the same backend flag as list
- Actual Result: Chi tiết gói tập
Boundary combo-unlimited-gym
Đang hoạt động

Mã hợp đồng: DK013

Hình thức: Combo Gym + PT
Hiệu lực: 21/9/2026 - 11/10/2026
Chi nhánh: HV Payment Branch A
HLV phụ trách: Chưa chỉ định 
Liên hệ Lễ tân
Tiến độ sử dụng

Gym: đã dùng 0/30 ngày

PT: đã dùng 0/4 buổi · Còn 4 buổi

Đang giữ chỗ: 0 buổi
Đóng
 Đóng băng gói
 Gia hạn gói
- Status: **PASS**

![combo-unlimited-gym-detail](./step-50-combo-unlimited-gym-detail.png)

### 52. history-width-320

- Action/Input: View real history at 320px
- Expected Result: Payment content remains visible with no horizontal overflow
- Actual Result: {"width":320,"scroll":320}
- Status: **PASS**

![history-width-320](./step-52-history-width-320.png)

### 53. history-width-1440

- Action/Input: View real history at 1440px
- Expected Result: Payment content remains visible with no horizontal overflow
- Actual Result: {"width":1440,"scroll":1440}
- Status: **PASS**

![history-width-1440](./step-53-history-width-1440.png)

## State Verification

Final provenance audit: 89 source/manifest hashes unchanged, including all backend/src and migration SQL. All 23 loaded local backend modules are included. 14 migrations applied. 53 screenshots have 53 distinct SHA256 values. Final visual review confirmed QR/success/cancel/expiry annotations inside native dialogs and visible LT cancelled/frozen status cells. Previous 03:44 run failed post-run visual review and is superseded by this full rerun.

Disposable PostgreSQL paradise_test_hv_3676_1789962394381; 14 migrations, hashes and API/SQL assertions in results.json. No mocked API responses. Browser-only clock acceleration explicitly identified. Cleanup: {"browser":true,"server":true,"connections":true,"database":true}.

## Cross-Role / Downstream Verification

### 9. lt-DK001-Đang

- Action/Input: Open LT registrations for the SAME registration
- Expected Result: Same member/code and expected registration status visibly unobscured
- Actual Result: DK001	10:46:40 21/9/2026	HV Purchase Member
HV001 · HV Payment Branch A
	HV Purchase Gym	21/09/2026 - 21/10/2026	500.000 ₫	--	Đang hiệu lực	
- Status: **PASS**

![lt-DK001-Đang](./downstream-09-lt-DK001-Đang.png)

### 22. lt-DK002-Đã hủy

- Action/Input: Open LT registrations for the SAME registration
- Expected Result: Same member/code and expected registration status visibly unobscured
- Actual Result: DK002	10:46:47 17/9/2026	HV Purchase Member
HV001 · HV Payment Branch A
	HV Purchase Gym	21/09/2026 - 21/10/2026	500.000 ₫	--	Đã hủy	
- Status: **PASS**

![lt-DK002-Đã hủy](./downstream-22-lt-DK002-Đã hủy.png)

### 28. lt-DK001-Đang đóng băng

- Action/Input: Open LT registrations for the SAME registration
- Expected Result: Same member/code and expected registration status visibly unobscured
- Actual Result: DK001	10:46:40 21/9/2026	HV Purchase Member
HV001 · HV Payment Branch A
	HV Purchase Gym	21/09/2026 - 23/10/2026	500.000 ₫	--	❄️ Đang đóng băng	
- Status: **PASS**

![lt-DK001-Đang đóng băng](./downstream-28-lt-DK001-Đang đóng băng.png)

### 51. lt-branch-b-isolation

- Action/Input: Open authenticated LT Branch B
- Expected Result: Branch B cannot see Branch A purchase member/order
- Actual Result: Branch B has no Branch A registration or member
- Status: **PASS**

![lt-branch-b-isolation](./downstream-51-lt-branch-b-isolation.png)

## Issues Found

None in executed cases.

## Final Result

PASS (scoped scenarios); 53 PASS / 0 FAIL. Not full US acceptance or real bank integration certification.

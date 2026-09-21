# HV Purchase / Payment Intent E2E

2026-09-21T03:36:06.203Z - BLOCKED. Sources: HV03-US01, HV03-US03 MF1-8/EF01-02, HV03-US06 MF2-4; explicit 2026-09-21 user override authorizes simulation, successful-only statusless ledger, 15min QR, pending cancel and freeze eligibility. Business docs left to main.

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
- Actual Result: {"registrationId":"60ee078f-31dd-4af9-9c29-6b5d68c2807b","intentId":"3f702b25-4b26-499e-bb2c-9cc32565b3c4","expiry":"2026-09-21T03:50:53.682Z"}
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

10:35:54 21/9/2026 · Chuyển khoản Ngân hàng (VietQR)

Đã thanh toán
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
10:35:54 21/9/2026
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
- Actual Result: {"registrationId":"e70c6ada-9ea4-4b2a-98a9-44c54de57edb","intentId":"094c4f9f-2585-428a-a065-1191a55dee1c","expiry":"2026-09-21T03:50:59.689Z"}
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

### 15. expired-intent-reissued

- Action/Input: Continue payment after QR expiry
- Expected Result: Fresh 15min QR for same pending order; final history still one successful payment
- Actual Result: Mã QR còn hiệu lực 15:00
- Status: **PASS**

![expired-intent-reissued](./step-15-expired-intent-reissued.png)

### 16. qr-countdown-expired

- Action/Input: Advance browser clock 15min without waiting on real bank
- Expected Result: Expired QR hidden, simulation unavailable, recreate action; order still pending
- Actual Result: Mã QR đã hết hạn. Đơn đăng ký vẫn đang chờ thanh toán.
- Status: **PASS**

![qr-countdown-expired](./step-16-qr-countdown-expired.png)

### 17. pending-cancel-confirmation

- Action/Input: Click Huy don
- Expected Result: Explicit confirmation before cancelling same order
- Actual Result: Hủy đơn chờ thanh toán

Hủy đơn DK002 của gói HV Purchase Gym?

Quay lại
Xác nhận hủy đơn
- Status: **PASS**

![pending-cancel-confirmation](./step-17-pending-cancel-confirmation.png)

### 18. pending-cancel-success

- Action/Input: Confirm cancellation
- Expected Result: Order disappears from pending; no final payment or receipt generated
- Actual Result: Thanh toán
Lịch sử thanh toán
Chờ thanh toán

Bạn không có đơn đăng ký nào đang chờ thanh toán.
- Status: **PASS**

![pending-cancel-success](./step-18-pending-cancel-success.png)

### 20. freeze-form

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

![freeze-form](./step-20-freeze-form.png)

### 21. freeze-invalid-input

- Action/Input: Enter zero freeze days before submit
- Expected Result: Input captured separately from validation submit
- Actual Result: 0
- Status: **PASS**

![freeze-invalid-input](./step-21-freeze-invalid-input.png)

### 22. freeze-zero-validation

- Action/Input: Submit zero days
- Expected Result: Invalid days blocked; contract remains ACTIVE
- Actual Result: Vui lòng nhập số ngày đóng băng hợp lệ (lớn hơn 0)
- Status: **PASS**

![freeze-zero-validation](./step-22-freeze-zero-validation.png)

### 23. freeze-valid-input

- Action/Input: Enter two days before submit
- Expected Result: Separate input screenshot
- Actual Result: 2 days
- Status: **PASS**

![freeze-valid-input](./step-23-freeze-valid-input.png)

### 24. freeze-success

- Action/Input: Confirm freeze
- Expected Result: Paid active package becomes frozen
- Actual Result: HV Purchase Gym
❄️ Đang đóng băng

DK001 · 21/9/2026 - 23/10/2026

Gym: đã dùng 0/30 ngày

Chi tiết gói
Mở đóng băng trước hạn
- Status: **PASS**

![freeze-success](./step-24-freeze-success.png)

### 26. execution-blocker

- Action/Input: Capture blocked actual DOM
- Expected Result: Dependent steps not claimed
- Actual Result: DK001	10:35:53 21/9/2026	HV Purchase Member
HV001 · HV Payment Branch A
	HV Purchase Gym	21/09/2026 - 23/10/2026	500.000 ₫	--	❄️ Đang đóng băng	

'FAIL' !== 'PASS'

- Status: **FAIL**

![execution-blocker](./step-26-execution-blocker.png)

## State Verification

Disposable PostgreSQL paradise_test_hv_13152_1789961745920; 14 migrations, hashes and API/SQL assertions in results.json. No mocked API responses. Browser-only clock acceleration explicitly identified. Cleanup: {"browser":true,"server":true,"connections":true,"database":true}.

## Cross-Role / Downstream Verification

### 9. lt-DK001-Đang

- Action/Input: Open LT registrations for the SAME registration
- Expected Result: Same member/code and expected registration status
- Actual Result: DK001	10:35:53 21/9/2026	HV Purchase Member
HV001 · HV Payment Branch A
	HV Purchase Gym	21/09/2026 - 21/10/2026	500.000 ₫	--	Đang hiệu lực	
- Status: **PASS**

![lt-DK001-Đang](./downstream-09-lt-DK001-Đang.png)

### 19. lt-DK002-Đã hủy

- Action/Input: Open LT registrations for the SAME registration
- Expected Result: Same member/code and expected registration status
- Actual Result: DK002	10:36:00 17/9/2026	HV Purchase Member
HV001 · HV Payment Branch A
	HV Purchase Gym	21/09/2026 - 21/10/2026	500.000 ₫	--	Đã hủy	
- Status: **PASS**

![lt-DK002-Đã hủy](./downstream-19-lt-DK002-Đã hủy.png)

### 25. lt-DK001-Đóng băng

- Action/Input: Open LT registrations for the SAME registration
- Expected Result: Same member/code and expected registration status
- Actual Result: DK001	10:35:53 21/9/2026	HV Purchase Member
HV001 · HV Payment Branch A
	HV Purchase Gym	21/09/2026 - 23/10/2026	500.000 ₫	--	❄️ Đang đóng băng	
- Status: **FAIL**

![lt-DK001-Đóng băng](./downstream-25-lt-DK001-Đóng băng.png)

## Issues Found

- lt-DK001-Đóng băng: DK001	10:35:53 21/9/2026	HV Purchase Member
HV001 · HV Payment Branch A
	HV Purchase Gym	21/09/2026 - 23/10/2026	500.000 ₫	--	❄️ Đang đóng băng	
- execution-blocker: AssertionError [ERR_ASSERTION]: DK001	10:35:53 21/9/2026	HV Purchase Member
HV001 · HV Payment Branch A
	HV Purchase Gym	21/09/2026 - 23/10/2026	500.000 ₫	--	❄️ Đang đóng băng	

'FAIL' !== 'PASS'

    at capture (E:\Desktop\para\tests\e2e\hv\HV03-US03\payment-intents.cjs:107:10)
    at async downstream (E:\Desktop\para\tests\e2e\hv\HV03-US03\payment-intents.cjs:148:3)
    at async run (E:\Desktop\para\tests\e2e\hv\HV03-US03\payment-intents.cjs:222:3)
    at async E:\Desktop\para\tests\e2e\hv\HV03-US03\payment-intents.cjs:246:9
- execution-blocker: DK001	10:35:53 21/9/2026	HV Purchase Member
HV001 · HV Payment Branch A
	HV Purchase Gym	21/09/2026 - 23/10/2026	500.000 ₫	--	❄️ Đang đóng băng	

'FAIL' !== 'PASS'


## Final Result

BLOCKED; 24 PASS / 2 FAIL. Not full US acceptance or real bank integration certification.

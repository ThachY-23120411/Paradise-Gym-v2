# LT-W08-US02 payment ledger E2E

Result: **BLOCKED**. Real isolated PostgreSQL and private static/API servers. No mock responses. Sources: LT-W08-US02 MF1-12/field-level specification; sibling US01/US03 ledger; user corrections 2026-09-21 override stale payment status text. SQL fixtures only in disposable DB, API-created packages/registrations, activated same member. Migration hashes/provenance in results.json. Bank transfer is manual reconciliation with test reference, not a real bank settlement.

## Source Action Verification

### Open payment ledger

Expected: User correction + US01/US03: two KPIs; no payment-status filter/column or pending KPI

Actual: {"labels":["Từ ngày","Đến ngày","Tìm giao dịch","Phương thức"],"columns":[" ","Thao tác","Mã phiếu","Thời gian","Hội viên","Đăng ký","Phương thức","Số tiền","Người thu","Chi nhánh","Thao tác"],"kpis":"Tổng thực thu\n2.500.000 ₫\nLượt thanh toán thành công\n5 lượt"}

Status: **PASS**

![ledger-controls](./step-01-ledger-controls.png)

### Clear date restrictions

Expected: US01 date filters allow complete history

Actual: Thu tiền & thanh toán
Ghi nhận thanh toán
Tổng thực thu
2.500.000 ₫
Lượt thanh toán thành công
5 lượt
Từ ngày
Đến ngày
Toàn thời gian
Hôm nay
Tìm giao dịch
Phương thức
Thao tác
Mã phiếu	
Thời gian	
Hội viên	
Đăng ký	Phương thức	
Số tiền	
Người thu	
Chi nhánh	
PT005	10:44:23 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK002
QTV Bank
	Chuyển khoản	500.000 ₫	0909210100	Payment Branch A	
PT004	10:44:07 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK001
QTV Cash
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT003	10:44:02 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK008
Not Near Five Days
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT002	10:44:02 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK007
Near Four Days
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT001	10:44:02 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK006
Scheduled Paid
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	








102050
Trang 1/1 · 5 bản ghi1
Đang tải...

Status: **PASS**

![all-time-ledger](./step-02-all-time-ledger.png)

### Open LT Cash payment form

Expected: US02 MF2: payment form with same active member and pending registrations

Actual: Hội viên cần thanh toán *
Gói tập đăng ký chờ thanh toán *
Số tiền thanh toán 100%
Mã giảm giá / Voucher (nếu có)
Áp dụng
Phương thức thanh toán *
Tiền mặt
Chuyển khoản
Ghi chú giao dịch
Hủy
Xác nhận đã thu đủ tiền mặt

Status: **PASS**

![open-payment](./step-03-open-payment.png)

### Open Gói tập đăng ký chờ thanh toán

Expected: US02 field-level searchable options shown

Actual: DK004 · LT Bank
Kỳ: 21/09/2026 - 21/10/2026
500.000 ₫
DK003 · LT Cash
Kỳ: 21/09/2026 - 21/10/2026
500.000 ₫

Status: **PASS**

![open-options](./step-04-open-options.png)

### Choose LT Cash

Expected: Selected value shown before submit

Actual: Hội viên cần thanh toán *
Gói tập đăng ký chờ thanh toán *
Số tiền thanh toán 100%
Mã giảm giá / Voucher (nếu có)
Áp dụng
Phương thức thanh toán *
Tiền mặt
Chuyển khoản
Ghi chú giao dịch
Hủy
Xác nhận đã thu đủ tiền mặt

Status: **PASS**

![select-option](./step-05-select-option.png)

### Enter note for LT Cash

Expected: Cash selected; no bank-reference field; entered note captured before settlement

Actual: Hội viên cần thanh toán *
Gói tập đăng ký chờ thanh toán *
Số tiền thanh toán 100%
Mã giảm giá / Voucher (nếu có)
Áp dụng
Phương thức thanh toán *
Tiền mặt
Chuyển khoản
Ghi chú giao dịch
Hủy
Xác nhận đã thu đủ tiền mặt

Status: **PASS**

![cash-filled-before-submit](./step-06-cash-filled-before-submit.png)

### Confirm LT Cash payment

Expected: US02 MF10-12: exactly one final payment and receipt, same member, correct method, registration active

Actual: PARADISE GYM
PHIẾU THU
Số phiếu
PT006
Thời gian
10:44:37 21/9/2026
Người nộp tiền
Payment Same Member
Số điện thoại
0909210110
Đăng ký
DK003
Gói tập
LT Cash
Kỳ hiệu lực
21/09/2026 - 21/10/2026
Phương thức
Tiền mặt
Mã giao dịch
--
Người thu
0909210101
Chi nhánh
Payment Branch A
Thực thu 100%
500.000 ₫
Ghi chú
Cash LT Cash

Status: **PASS**

![settled-receipt](./step-07-settled-receipt.png)

### Close receipt

Expected: New successful row visible in source ledger without status

Actual: Thu tiền & thanh toán
Ghi nhận thanh toán
Tổng thực thu
3.000.000 ₫
Lượt thanh toán thành công
6 lượt
Từ ngày
Đến ngày
Toàn thời gian
Hôm nay
Tìm giao dịch
Phương thức
Thao tác
Mã phiếu	
Thời gian	
Hội viên	
Đăng ký	Phương thức	
Số tiền	
Người thu	
Chi nhánh	
PT006	10:44:37 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK003
LT Cash
	Tiền mặt	500.000 ₫	0909210101	Payment Branch A	
PT005	10:44:23 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK002
QTV Bank
	Chuyển khoản	500.000 ₫	0909210100	Payment Branch A	
PT004	10:44:07 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK001
QTV Cash
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT003	10:44:02 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK008
Not Near Five Days
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT002	10:44:02 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK007
Near Four Days
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT001	10:44:02 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK006
Scheduled Paid
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	










102050
Trang 1/1 · 6 bản ghi1

Status: **PASS**

![ledger-after-settlement](./step-08-ledger-after-settlement.png)

### Open LT Bank payment form

Expected: US02 MF2: payment form with same active member and pending registrations

Actual: Hội viên cần thanh toán *
Gói tập đăng ký chờ thanh toán *
Số tiền thanh toán 100%
Mã giảm giá / Voucher (nếu có)
Áp dụng
Phương thức thanh toán *
Tiền mặt
Chuyển khoản
Ghi chú giao dịch
Hủy
Xác nhận đã thu đủ tiền mặt

Status: **PASS**

![open-payment](./step-10-open-payment.png)

### Open Gói tập đăng ký chờ thanh toán

Expected: US02 field-level searchable options shown

Actual: DK004 · LT Bank
Kỳ: 21/09/2026 - 21/10/2026
500.000 ₫

Status: **PASS**

![open-options](./step-11-open-options.png)

### Choose LT Bank

Expected: Selected value shown before submit

Actual: Hội viên cần thanh toán *
Gói tập đăng ký chờ thanh toán *
Số tiền thanh toán 100%
Mã giảm giá / Voucher (nếu có)
Áp dụng
Phương thức thanh toán *
Tiền mặt
Chuyển khoản
Ghi chú giao dịch
Hủy
Xác nhận đã thu đủ tiền mặt

Status: **PASS**

![select-option](./step-12-select-option.png)

### Select bank transfer

Expected: US02 MF7: QR intent has 15-minute TTL; registration pending and absent from final ledger

Actual: {"registrationId":"cfe61d60-23c3-4c34-920d-2fd547252493","intentId":"7060d17f-4dba-4dee-ac45-6ca8318c209c","state":"PENDING","ttlSeconds":900}

Status: **PASS**

![bank-qr-intent](./step-13-bank-qr-intent.png)

### Open manual reconciliation

Expected: Manual BANK_TRANSFER form requires transaction reference and reconciliation checkbox

Actual: Giao dịch
PAY007
Số tiền
500.000 ₫
Phương thức
Chuyển khoản
Mã giao dịch trên chứng từ ngân hàng *
Ghi chú đối soát
Đối chiếu thực thu
Đã đối chiếu và nhận đủ 500.000 ₫
Hủy
Xác nhận đã nhận đủ tiền

Status: **PASS**

![manual-bank-modal](./step-14-manual-bank-modal.png)

### Submit with empty bank reference

Expected: User requirement: missing transaction reference blocks settlement

Actual: Required-field validation visible; no ledger row

Status: **PASS**

![required-bank-reference](./step-15-required-bank-reference.png)

### Enter actual test reference and confirm reconciliation checkbox

Expected: Input Capture Before Submit: bank reference visible, method remains BANK_TRANSFER

Actual: Giao dịch
PAY007
Số tiền
500.000 ₫
Phương thức
Chuyển khoản
Mã giao dịch trên chứng từ ngân hàng *
Ghi chú đối soát
Đối chiếu thực thu
Đã đối chiếu và nhận đủ 500.000 ₫
Hủy
Xác nhận đã nhận đủ tiền

Status: **PASS**

![manual-bank-filled-before-submit](./step-16-manual-bank-filled-before-submit.png)

### Confirm LT Bank payment

Expected: US02 MF10-12: exactly one final payment and receipt, same member, correct method, registration active

Actual: PARADISE GYM
PHIẾU THU
Số phiếu
PT007
Thời gian
10:44:45 21/9/2026
Người nộp tiền
Payment Same Member
Số điện thoại
0909210110
Đăng ký
DK004
Gói tập
LT Bank
Kỳ hiệu lực
21/09/2026 - 21/10/2026
Phương thức
Chuyển khoản
Mã giao dịch
REF-LT-Bank
Người thu
0909210101
Chi nhánh
Payment Branch A
Thực thu 100%
500.000 ₫

Status: **PASS**

![settled-receipt](./step-17-settled-receipt.png)

### Close receipt

Expected: New successful row visible in source ledger without status

Actual: Thu tiền & thanh toán
Ghi nhận thanh toán
Tổng thực thu
3.500.000 ₫
Lượt thanh toán thành công
7 lượt
Từ ngày
Đến ngày
Toàn thời gian
Hôm nay
Tìm giao dịch
Phương thức
Thao tác
Mã phiếu	
Thời gian	
Hội viên	
Đăng ký	Phương thức	
Số tiền	
Người thu	
Chi nhánh	
PT007	10:44:45 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK004
LT Bank
	Chuyển khoản	500.000 ₫	0909210101	Payment Branch A	
PT006	10:44:37 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK003
LT Cash
	Tiền mặt	500.000 ₫	0909210101	Payment Branch A	
PT005	10:44:23 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK002
QTV Bank
	Chuyển khoản	500.000 ₫	0909210100	Payment Branch A	
PT004	10:44:07 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK001
QTV Cash
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT003	10:44:02 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK008
Not Near Five Days
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT002	10:44:02 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK007
Near Four Days
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT001	10:44:02 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK006
Scheduled Paid
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	












102050
Trang 1/1 · 7 bản ghi1

Status: **PASS**

![ledger-after-settlement](./step-18-ledger-after-settlement.png)

### LT manual bank and member downstream

Expected: Complete scenario

Actual: page.goto: Timeout 30000ms exceeded.
Call log:
[2m  - navigating to "http://127.0.0.1:58897/mobile/member/#payments/history", waiting until "domcontentloaded"[22m


Status: **FAIL**

![blocked](./step-19-blocked.png)

## State Verification

[
  {
    "registrationId": "d79a19df-420f-477a-85c2-17004eb93188",
    "paymentId": "a94326c4-f2be-4cd4-8385-d477e0e2d70e",
    "memberId": "abe613ec-e68c-4d9d-8e36-a17cfe9e4835",
    "method": "CASH",
    "reference": null,
    "amount": 500000
  },
  {
    "registrationId": "cfe61d60-23c3-4c34-920d-2fd547252493",
    "paymentId": "7060d17f-4dba-4dee-ac45-6ca8318c209c",
    "memberId": "abe613ec-e68c-4d9d-8e36-a17cfe9e4835",
    "method": "BANK_TRANSFER",
    "reference": "REF-LT-Bank",
    "amount": 500000
  }
]

## Cross-Role / Downstream Verification

### Open authenticated same-member payment history

Expected: Downstream shows same package, amount and payment method after source settlement

Actual: PT006
500.000 đ

LT Cash

10:44:37 21/9/2026 · Tiền mặt

Xem phiếu thu

Status: **PASS**

![same-member-payment-history](./downstream-09-same-member-payment-history.png)

### Open receptionist of Branch B

Expected: LT US01 scope: cannot see Branch A member payments

Actual: Thu tiền & thanh toán
Ghi nhận thanh toán
Tổng thực thu
0 ₫
Lượt thanh toán thành công
0 lượt
Từ ngày
Đến ngày
Toàn thời gian
Hôm nay
Tìm giao dịch
Phương thức
Thao tác
Mã phiếu	
Thời gian	
Hội viên	
Đăng ký	Phương thức	
Số tiền	
Người thu	
Chi nhánh	
								
102050
Trang 1/1 · 0 bản ghi1
Đang tải...

Status: **PASS**

![other-branch-no-ledger](./downstream-20-other-branch-no-ledger.png)

## Issues Found

LT manual bank and member downstream: page.goto: Timeout 30000ms exceeded.
Call log:
[2m  - navigating to "http://127.0.0.1:58897/mobile/member/#payments/history", waiting until "domcontentloaded"[22m


blocked: page.goto: Timeout 30000ms exceeded.
Call log:
[2m  - navigating to "http://127.0.0.1:58897/mobile/member/#payments/history", waiting until "domcontentloaded"[22m


## Final Result

**BLOCKED**; 19/20 steps passed. Cleanup: {"browserClosed":true,"apiClosed":true,"staticClosed":true,"poolsClosed":true,"databaseDropped":true}.

# QTV-W08-US02 payment ledger E2E

Result: **BLOCKED**. Real isolated PostgreSQL and private static/API servers. No mock responses. Sources: QTV-W08-US02 MF1-12/field-level specification; sibling US01/US03 ledger; user corrections 2026-09-21 override stale payment status text. SQL fixtures only in disposable DB, API-created packages/registrations, activated same member. Migration hashes/provenance in results.json. Bank transfer is manual reconciliation with test reference, not a real bank settlement.

## Source Action Verification

### Open payment ledger

Expected: User correction + US01/US03: two KPIs; no payment-status filter/column or pending KPI

Actual: {"labels":["Từ ngày","Đến ngày","Tìm giao dịch","Phương thức"],"columns":[" ","Thao tác","Mã phiếu","Thời gian","Hội viên","Đăng ký","Phương thức","Số tiền","Người thu","Chi nhánh","Thao tác"],"kpis":"Tổng thực thu\n1.500.000 ₫\nLượt thanh toán thành công\n3 lượt"}

Status: **PASS**

![ledger-controls](./step-01-ledger-controls.png)

### Clear date restrictions

Expected: US01 date filters allow complete history

Actual: Thu tiền & thanh toán
Ghi nhận thanh toán
Tổng thực thu
1.500.000 ₫
Lượt thanh toán thành công
3 lượt
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
PT003	10:38:58 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK008
Not Near Five Days
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT002	10:38:58 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK007
Near Four Days
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT001	10:38:58 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK006
Scheduled Paid
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	




102050
Trang 1/1 · 3 bản ghi1
Đang tải...

Status: **PASS**

![all-time-ledger](./step-02-all-time-ledger.png)

### Open QTV Cash payment form

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
DK002 · QTV Bank
Kỳ: 21/09/2026 - 21/10/2026
500.000 ₫
DK001 · QTV Cash
Kỳ: 21/09/2026 - 21/10/2026
500.000 ₫
DK005 · Pending Cancel
Kỳ: 21/09/2026 - 21/10/2026
500.000 ₫

Status: **PASS**

![open-options](./step-04-open-options.png)

### Choose QTV Cash

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

### Enter note for QTV Cash

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

### Confirm QTV Cash payment

Expected: US02 MF10-12: exactly one final payment and receipt, same member, correct method, registration active

Actual: PARADISE GYM
PHIẾU THU
Số phiếu
PT004
Thời gian
10:39:04 21/9/2026
Người nộp tiền
Payment Same Member
Số điện thoại
0909210110
Đăng ký
DK001
Gói tập
QTV Cash
Kỳ hiệu lực
21/09/2026 - 21/10/2026
Phương thức
Tiền mặt
Mã giao dịch
--
Người thu
0909210100
Chi nhánh
Payment Branch A
Thực thu 100%
500.000 ₫
Ghi chú
Cash QTV Cash

Status: **PASS**

![settled-receipt](./step-07-settled-receipt.png)

### QTV cash and member downstream

Expected: Complete scenario

Actual: locator.click: Error: strict mode violation: getByRole('button', { name: 'Đóng', exact: true }) resolved to 2 elements:
    1) <div tabindex="0" role="button" aria-label="Đóng" class="dx-widget dx-button dx-button-mode-text dx-button-normal dx-button-has-icon dx-closebutton">…</div> aka getByRole('toolbar').getByRole('button', { name: 'Đóng' })
    2) <div tabindex="0" title="Đóng" role="button" aria-label="Đóng" class="dx-widget dx-button dx-button-mode-outlined dx-button-normal dx-button-has-text dx-button-has-icon">…</div> aka getByRole('button', { name: 'Đóng', description: 'Đóng', exact: true })

Call log:
[2m  - waiting for getByRole('button', { name: 'Đóng', exact: true })[22m


Status: **FAIL**

![blocked](./step-08-blocked.png)

### Open QTV Bank payment form

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

![open-payment](./step-09-open-payment.png)

### Open Gói tập đăng ký chờ thanh toán

Expected: US02 field-level searchable options shown

Actual: DK004 · LT Bank
Kỳ: 21/09/2026 - 21/10/2026
500.000 ₫
DK003 · LT Cash
Kỳ: 21/09/2026 - 21/10/2026
500.000 ₫
DK002 · QTV Bank
Kỳ: 21/09/2026 - 21/10/2026
500.000 ₫
DK005 · Pending Cancel
Kỳ: 21/09/2026 - 21/10/2026
500.000 ₫

Status: **PASS**

![open-options](./step-10-open-options.png)

### Choose QTV Bank

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

![select-option](./step-11-select-option.png)

### Select bank transfer

Expected: US02 MF7: QR intent has 15-minute TTL; registration pending and absent from final ledger

Actual: {"registrationId":"c9449e07-6b7f-4bc4-83d7-1bdef55967d3","intentId":"00786dca-cc3d-4c5d-8c71-2376125c74be","state":"PENDING","ttlSeconds":900}

Status: **PASS**

![bank-qr-intent](./step-12-bank-qr-intent.png)

### Open manual reconciliation

Expected: Manual BANK_TRANSFER form requires transaction reference and reconciliation checkbox

Actual: Giao dịch
PAY005
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

![manual-bank-modal](./step-13-manual-bank-modal.png)

### Submit with empty bank reference

Expected: User requirement: missing transaction reference blocks settlement

Actual: Required-field validation visible; no ledger row

Status: **PASS**

![required-bank-reference](./step-14-required-bank-reference.png)

### Enter actual test reference and confirm reconciliation checkbox

Expected: Input Capture Before Submit: bank reference visible, method remains BANK_TRANSFER

Actual: Giao dịch
PAY005
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

![manual-bank-filled-before-submit](./step-15-manual-bank-filled-before-submit.png)

### Confirm QTV Bank payment

Expected: US02 MF10-12: exactly one final payment and receipt, same member, correct method, registration active

Actual: PARADISE GYM
PHIẾU THU
Số phiếu
PT005
Thời gian
10:39:10 21/9/2026
Người nộp tiền
Payment Same Member
Số điện thoại
0909210110
Đăng ký
DK002
Gói tập
QTV Bank
Kỳ hiệu lực
21/09/2026 - 21/10/2026
Phương thức
Chuyển khoản
Mã giao dịch
REF-QTV-Bank
Người thu
0909210100
Chi nhánh
Payment Branch A
Thực thu 100%
500.000 ₫

Status: **PASS**

![settled-receipt](./step-16-settled-receipt.png)

### QTV manual bank and member downstream

Expected: Complete scenario

Actual: locator.click: Error: strict mode violation: getByRole('button', { name: 'Đóng', exact: true }) resolved to 2 elements:
    1) <div tabindex="0" role="button" aria-label="Đóng" class="dx-widget dx-button dx-button-mode-text dx-button-normal dx-button-has-icon dx-closebutton">…</div> aka getByRole('toolbar').getByRole('button', { name: 'Đóng' })
    2) <div tabindex="0" title="Đóng" role="button" aria-label="Đóng" class="dx-widget dx-button dx-button-mode-outlined dx-button-normal dx-button-has-text dx-button-has-icon">…</div> aka getByRole('button', { name: 'Đóng', description: 'Đóng', exact: true })

Call log:
[2m  - waiting for getByRole('button', { name: 'Đóng', exact: true })[22m


Status: **FAIL**

![blocked](./step-17-blocked.png)

### QTV registration guards

Expected: Complete scenario

Actual: locator.click: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for locator('.sales-view .dx-data-row').filter({ hasText: 'Scheduled Paid' }).first().getByRole('button', { name: 'Chi tiết đăng ký', exact: true })[22m


Status: **FAIL**

![blocked](./step-18-blocked.png)

## State Verification

[
  {
    "registrationId": "770793d6-2584-479e-bb80-c2966de33b5a",
    "paymentId": "aa310ceb-41c7-4bad-9d24-b7ed944309ae",
    "memberId": "07ba7a83-2be1-41e9-86b6-8e6675d70349",
    "method": "CASH",
    "reference": null,
    "amount": 500000
  },
  {
    "registrationId": "c9449e07-6b7f-4bc4-83d7-1bdef55967d3",
    "paymentId": "00786dca-cc3d-4c5d-8c71-2376125c74be",
    "memberId": "07ba7a83-2be1-41e9-86b6-8e6675d70349",
    "method": "BANK_TRANSFER",
    "reference": "REF-QTV-Bank",
    "amount": 500000
  }
]

## Cross-Role / Downstream Verification

Not reached; no downstream PASS claimed.

## Issues Found

QTV cash and member downstream: locator.click: Error: strict mode violation: getByRole('button', { name: 'Đóng', exact: true }) resolved to 2 elements:
    1) <div tabindex="0" role="button" aria-label="Đóng" class="dx-widget dx-button dx-button-mode-text dx-button-normal dx-button-has-icon dx-closebutton">…</div> aka getByRole('toolbar').getByRole('button', { name: 'Đóng' })
    2) <div tabindex="0" title="Đóng" role="button" aria-label="Đóng" class="dx-widget dx-button dx-button-mode-outlined dx-button-normal dx-button-has-text dx-button-has-icon">…</div> aka getByRole('button', { name: 'Đóng', description: 'Đóng', exact: true })

Call log:
[2m  - waiting for getByRole('button', { name: 'Đóng', exact: true })[22m


blocked: locator.click: Error: strict mode violation: getByRole('button', { name: 'Đóng', exact: true }) resolved to 2 elements:
    1) <div tabindex="0" role="button" aria-label="Đóng" class="dx-widget dx-button dx-button-mode-text dx-button-normal dx-button-has-icon dx-closebutton">…</div> aka getByRole('toolbar').getByRole('button', { name: 'Đóng' })
    2) <div tabindex="0" title="Đóng" role="button" aria-label="Đóng" class="dx-widget dx-button dx-button-mode-outlined dx-button-normal dx-button-has-text dx-button-has-icon">…</div> aka getByRole('button', { name: 'Đóng', description: 'Đóng', exact: true })

Call log:
[2m  - waiting for getByRole('button', { name: 'Đóng', exact: true })[22m


QTV manual bank and member downstream: locator.click: Error: strict mode violation: getByRole('button', { name: 'Đóng', exact: true }) resolved to 2 elements:
    1) <div tabindex="0" role="button" aria-label="Đóng" class="dx-widget dx-button dx-button-mode-text dx-button-normal dx-button-has-icon dx-closebutton">…</div> aka getByRole('toolbar').getByRole('button', { name: 'Đóng' })
    2) <div tabindex="0" title="Đóng" role="button" aria-label="Đóng" class="dx-widget dx-button dx-button-mode-outlined dx-button-normal dx-button-has-text dx-button-has-icon">…</div> aka getByRole('button', { name: 'Đóng', description: 'Đóng', exact: true })

Call log:
[2m  - waiting for getByRole('button', { name: 'Đóng', exact: true })[22m


blocked: locator.click: Error: strict mode violation: getByRole('button', { name: 'Đóng', exact: true }) resolved to 2 elements:
    1) <div tabindex="0" role="button" aria-label="Đóng" class="dx-widget dx-button dx-button-mode-text dx-button-normal dx-button-has-icon dx-closebutton">…</div> aka getByRole('toolbar').getByRole('button', { name: 'Đóng' })
    2) <div tabindex="0" title="Đóng" role="button" aria-label="Đóng" class="dx-widget dx-button dx-button-mode-outlined dx-button-normal dx-button-has-text dx-button-has-icon">…</div> aka getByRole('button', { name: 'Đóng', description: 'Đóng', exact: true })

Call log:
[2m  - waiting for getByRole('button', { name: 'Đóng', exact: true })[22m


QTV registration guards: locator.click: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for locator('.sales-view .dx-data-row').filter({ hasText: 'Scheduled Paid' }).first().getByRole('button', { name: 'Chi tiết đăng ký', exact: true })[22m


blocked: locator.click: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for locator('.sales-view .dx-data-row').filter({ hasText: 'Scheduled Paid' }).first().getByRole('button', { name: 'Chi tiết đăng ký', exact: true })[22m


## Final Result

**BLOCKED**; 15/18 steps passed. Cleanup: {"browserClosed":true,"apiClosed":true,"staticClosed":true,"poolsClosed":true,"databaseDropped":true}.

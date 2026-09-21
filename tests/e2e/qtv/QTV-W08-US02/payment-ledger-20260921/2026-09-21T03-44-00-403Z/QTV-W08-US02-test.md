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
10:44:07 21/9/2026
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

### Close receipt

Expected: New successful row visible in source ledger without status

Actual: Thu tiền & thanh toán
Ghi nhận thanh toán
Tổng thực thu
2.000.000 ₫
Lượt thanh toán thành công
4 lượt
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
Trang 1/1 · 4 bản ghi1

Status: **PASS**

![ledger-after-settlement](./step-08-ledger-after-settlement.png)

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

![open-payment](./step-10-open-payment.png)

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

![open-options](./step-11-open-options.png)

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

![select-option](./step-12-select-option.png)

### Select bank transfer

Expected: US02 MF7: QR intent has 15-minute TTL; registration pending and absent from final ledger

Actual: {"registrationId":"c500669b-2222-4d5e-a6fa-e0535fc8bed2","intentId":"a7e00062-1c04-40ec-90cd-c2f19ce918b4","state":"PENDING","ttlSeconds":900}

Status: **PASS**

![bank-qr-intent](./step-13-bank-qr-intent.png)

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

![manual-bank-modal](./step-14-manual-bank-modal.png)

### Submit with empty bank reference

Expected: User requirement: missing transaction reference blocks settlement

Actual: Required-field validation visible; no ledger row

Status: **PASS**

![required-bank-reference](./step-15-required-bank-reference.png)

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

![manual-bank-filled-before-submit](./step-16-manual-bank-filled-before-submit.png)

### Confirm QTV Bank payment

Expected: US02 MF10-12: exactly one final payment and receipt, same member, correct method, registration active

Actual: PARADISE GYM
PHIẾU THU
Số phiếu
PT005
Thời gian
10:44:23 21/9/2026
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

![settled-receipt](./step-17-settled-receipt.png)

### Close receipt

Expected: New successful row visible in source ledger without status

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

Status: **PASS**

![ledger-after-settlement](./step-18-ledger-after-settlement.png)

### Filter Scheduled Paid

Expected: Matching registration visible before opening detail

Actual: DK006	10:44:02 21/9/2026	Payment Same Member
HV001 · Payment Branch A
	Scheduled Paid	01/10/2026 - 31/10/2026	500.000 ₫	--	Chưa đến ngày hiệu lực	

Status: **PASS**

![filter-registration](./step-20-filter-registration.png)

### Inspect scheduled paid registration

Expected: User rule: paid scheduled package cannot freeze; receipt stays accessible without payment.status

Actual: Chưa đến ngày hiệu lực
Hội viên
SM
Họ tên
Payment Same Member
Mã HV · SĐT
HV001 · 0909210110
Chi nhánh hội viên
Payment Branch A
Gói tập
Tên gói
Scheduled Paid
Phân loại
GYM
Thời điểm tạo đăng ký
10:44:02 21/9/2026
Kỳ hiệu lực
01/10/2026 - 31/10/2026
Chi nhánh áp dụng
Payment Branch A
Nhân viên tiếp nhận
0909210100
Thanh toán 100%
Giá trị gói
500.000 ₫
Trạng thái thanh toán
Đã thanh toán 100%
Phương thức
Tiền mặt
Thời gian thanh toán
10:44:02 21/9/2026
Xem phiếu thu
Quyền lợi & tiến độ sử dụng
Đã thanh toán 100%: Gói sẽ tự động có hiệu lực từ ngày 01/10/2026.
Quyền tập Gym
Tổng 30 ngày (Bắt đầu từ 01/10/2026)
Lượt check-in thực tế
0
Đóng băng & Chuyển nhượng gói
Chuyển nhượng gói

Status: **PASS**

![scheduled-no-freeze](./step-21-scheduled-no-freeze.png)

### Filter Near Four Days

Expected: Matching registration visible before opening detail

Actual: DK007	10:44:02 21/9/2026	Payment Same Member
HV001 · Payment Branch A
	Near Four Days	21/09/2026 - 25/09/2026	500.000 ₫	--	Sắp hết hạn	

Status: **PASS**

![filter-registration](./step-22-filter-registration.png)

### Inspect paid four-day registration

Expected: Backend is_expiring flag drives badge; active paid package may freeze

Actual: Sắp hết hạn
Hội viên
SM
Họ tên
Payment Same Member
Mã HV · SĐT
HV001 · 0909210110
Chi nhánh hội viên
Payment Branch A
Gói tập
Tên gói
Near Four Days
Phân loại
GYM
Thời điểm tạo đăng ký
10:44:02 21/9/2026
Kỳ hiệu lực
21/09/2026 - 25/09/2026
Chi nhánh áp dụng
Payment Branch A
Nhân viên tiếp nhận
0909210100
Thanh toán 100%
Giá trị gói
500.000 ₫
Trạng thái thanh toán
Đã thanh toán 100%
Phương thức
Tiền mặt
Thời gian thanh toán
10:44:02 21/9/2026
Xem phiếu thu
Quyền lợi & tiến độ sử dụng
Quyền tập Gym
Còn 4 ngày
Đã trôi qua / Tổng hạn (ngày): 0 / 4
Lượt check-in thực tế
0
Đóng băng & Chuyển nhượng gói
Đóng băng gói
Chuyển nhượng gói

Status: **PASS**

![near-expiry-can-freeze](./step-23-near-expiry-can-freeze.png)

### Filter Pending Cancel

Expected: Matching registration visible before opening detail

Actual: DK005	10:44:02 17/9/2026	Payment Same Member
HV001 · Payment Branch A
	Pending Cancel	21/09/2026 - 21/10/2026	500.000 ₫	--	Chờ thanh toán	

Status: **PASS**

![filter-registration](./step-24-filter-registration.png)

### Inspect registration created four days ago

Expected: No automatic cancellation; pending can be explicitly cancelled and cannot freeze

Actual: Chờ thanh toán
Hội viên
SM
Họ tên
Payment Same Member
Mã HV · SĐT
HV001 · 0909210110
Chi nhánh hội viên
Payment Branch A
Gói tập
Tên gói
Pending Cancel
Phân loại
GYM
Thời điểm tạo đăng ký
10:44:02 17/9/2026
Kỳ hiệu lực
21/09/2026 - 21/10/2026
Chi nhánh áp dụng
Payment Branch A
Nhân viên tiếp nhận
0909210100
Thanh toán 100%
Giá trị gói
500.000 ₫
Trạng thái thanh toán
Chờ thanh toán 100%
Thu tiền ngay
Hủy đơn đăng ký
Quyền lợi & tiến độ sử dụng
Chưa kích hoạt: Đăng ký đang ở trạng thái Chờ thanh toán 100%. Quyền lợi và tiến độ sử dụng sẽ bắt đầu được tính sau khi thu tiền thành công.
Quyền tập Gym
Chưa kích hoạt (Chờ thanh toán 100%)
Thời hạn gói đăng ký
30 ngày
Lượt check-in thực tế
0 lượt (Chưa kích hoạt)

Status: **PASS**

![pending-persists-no-freeze](./step-25-pending-persists-no-freeze.png)

### Enter cancellation reason

Expected: Explicit user cancellation form captured before submit

Actual: Bạn có chắc chắn muốn hủy đơn đăng ký DK005 của hội viên Payment Same Member?
Thao tác này sẽ chuyển đơn sang trạng thái Đã hủy và không thể hoàn tác.
Lý do hủy đơn: *
Hủy
Xác nhận hủy đơn

Status: **PASS**

![cancel-filled-before-submit](./step-26-cancel-filled-before-submit.png)

### QTV registration guards

Expected: Complete scenario

Actual: locator.waitFor: Error: strict mode violation: locator('.dx-popup-content:visible') resolved to 2 elements:
    1) <div class="dx-popup-content dx-popup-content-scrollable">…</div> aka locator('div').filter({ hasText: 'Chờ thanh toánHội viênSMHọ tê' }).nth(2)
    2) <div class="dx-popup-content dx-popup-content-scrollable">…</div> aka locator('div').filter({ hasText: 'Bạn có chắc chắn muốn hủy đơn' }).nth(2)

Call log:
[2m  - waiting for locator('.dx-popup-content:visible') to be hidden[22m


Status: **FAIL**

![blocked](./step-27-blocked.png)

## State Verification

[
  {
    "registrationId": "0e1f45a7-d6e9-4b66-bd84-20e2b06770fa",
    "paymentId": "0d83573f-b89f-4c2c-91b4-8fd4e9ebd0d3",
    "memberId": "abe613ec-e68c-4d9d-8e36-a17cfe9e4835",
    "method": "CASH",
    "reference": null,
    "amount": 500000
  },
  {
    "registrationId": "c500669b-2222-4d5e-a6fa-e0535fc8bed2",
    "paymentId": "a7e00062-1c04-40ec-90cd-c2f19ce918b4",
    "memberId": "abe613ec-e68c-4d9d-8e36-a17cfe9e4835",
    "method": "BANK_TRANSFER",
    "reference": "REF-QTV-Bank",
    "amount": 500000
  }
]

## Cross-Role / Downstream Verification

### Open authenticated same-member payment history

Expected: Downstream shows same package, amount and payment method after source settlement

Actual: PT004
500.000 đ

QTV Cash

10:44:07 21/9/2026 · Tiền mặt

Xem phiếu thu

Status: **PASS**

![same-member-payment-history](./downstream-09-same-member-payment-history.png)

### Open authenticated same-member payment history

Expected: Downstream shows same package, amount and payment method after source settlement

Actual: PT005
500.000 đ

QTV Bank

10:44:23 21/9/2026 · Chuyển khoản Ngân hàng (VietQR)

Xem phiếu thu

Status: **PASS**

![same-member-payment-history](./downstream-19-same-member-payment-history.png)

## Issues Found

QTV registration guards: locator.waitFor: Error: strict mode violation: locator('.dx-popup-content:visible') resolved to 2 elements:
    1) <div class="dx-popup-content dx-popup-content-scrollable">…</div> aka locator('div').filter({ hasText: 'Chờ thanh toánHội viênSMHọ tê' }).nth(2)
    2) <div class="dx-popup-content dx-popup-content-scrollable">…</div> aka locator('div').filter({ hasText: 'Bạn có chắc chắn muốn hủy đơn' }).nth(2)

Call log:
[2m  - waiting for locator('.dx-popup-content:visible') to be hidden[22m


blocked: locator.waitFor: Error: strict mode violation: locator('.dx-popup-content:visible') resolved to 2 elements:
    1) <div class="dx-popup-content dx-popup-content-scrollable">…</div> aka locator('div').filter({ hasText: 'Chờ thanh toánHội viênSMHọ tê' }).nth(2)
    2) <div class="dx-popup-content dx-popup-content-scrollable">…</div> aka locator('div').filter({ hasText: 'Bạn có chắc chắn muốn hủy đơn' }).nth(2)

Call log:
[2m  - waiting for locator('.dx-popup-content:visible') to be hidden[22m


## Final Result

**BLOCKED**; 26/27 steps passed. Cleanup: {"browserClosed":true,"apiClosed":true,"staticClosed":true,"poolsClosed":true,"databaseDropped":true}.

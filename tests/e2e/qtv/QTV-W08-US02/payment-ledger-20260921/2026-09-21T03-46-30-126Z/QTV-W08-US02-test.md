# QTV-W08-US02 payment ledger E2E

Result: **PASS**. Real isolated PostgreSQL and private static/API servers. No mock responses. Sources: QTV-W08-US02 MF1-12/field-level specification; sibling US01/US03 ledger; user corrections 2026-09-21 override stale payment status text. SQL fixtures only in disposable DB, API-created packages/registrations, activated same member. Migration hashes/provenance in results.json. Bank transfer is manual reconciliation with test reference, not a real bank settlement.

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
PT005	10:46:32 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK010
Undated PT Three
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT004	10:46:32 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK009
Undated Gym Three
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT003	10:46:32 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK008
Not Near Five Days
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT002	10:46:31 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK007
Near Four Days
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT001	10:46:31 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK006
Scheduled Paid
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	








102050
Trang 1/1 · 5 bản ghi1
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
PT006
Thời gian
10:46:37 21/9/2026
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
PT006	10:46:37 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK001
QTV Cash
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT005	10:46:32 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK010
Undated PT Three
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT004	10:46:32 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK009
Undated Gym Three
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT003	10:46:32 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK008
Not Near Five Days
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT002	10:46:31 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK007
Near Four Days
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT001	10:46:31 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK006
Scheduled Paid
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	










102050
Trang 1/1 · 6 bản ghi1

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

Actual: {"registrationId":"ebbd12d3-3dd1-4620-b205-2e361c9b9f05","intentId":"f157bcb1-6d3f-4d28-98e1-f05f7d1bef60","state":"PENDING","ttlSeconds":900}

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

### Confirm QTV Bank payment

Expected: US02 MF10-12: exactly one final payment and receipt, same member, correct method, registration active

Actual: PARADISE GYM
PHIẾU THU
Số phiếu
PT007
Thời gian
10:46:46 21/9/2026
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
PT007	10:46:46 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK002
QTV Bank
	Chuyển khoản	500.000 ₫	0909210100	Payment Branch A	
PT006	10:46:37 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK001
QTV Cash
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT005	10:46:32 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK010
Undated PT Three
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT004	10:46:32 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK009
Undated Gym Three
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT003	10:46:32 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK008
Not Near Five Days
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT002	10:46:31 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK007
Near Four Days
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	
PT001	10:46:31 21/9/2026	Payment Same Member
HV001 · 0909210110
	DK006
Scheduled Paid
	Tiền mặt	500.000 ₫	0909210100	Payment Branch A	












102050
Trang 1/1 · 7 bản ghi1

Status: **PASS**

![ledger-after-settlement](./step-18-ledger-after-settlement.png)

### Filter Scheduled Paid

Expected: Matching registration visible before opening detail

Actual: DK006	10:46:31 21/9/2026	Payment Same Member
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
10:46:31 21/9/2026
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
10:46:31 21/9/2026
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

Actual: DK007	10:46:31 21/9/2026	Payment Same Member
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
10:46:31 21/9/2026
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
10:46:31 21/9/2026
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

Actual: DK005	10:46:32 17/9/2026	Payment Same Member
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
10:46:32 17/9/2026
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

### Confirm cancellation

Expected: Registration changes to cancelled only after explicit request

Actual: DK005	10:46:32 17/9/2026	Payment Same Member
HV001 · Payment Branch A
	Pending Cancel	21/09/2026 - 21/10/2026	500.000 ₫	--	Đã hủy	

Status: **PASS**

![cancelled-registration](./step-27-cancelled-registration.png)

### Inspect Undated Gym Three in customer care

Expected: Backend expiring list includes undated session package; render real remaining sessions and no fabricated day count

Actual: DK009	
Payment Same Member
HV001 · 0909210110
	Undated Gym Three	--	
Còn 3 lượt Gym
	--	

Status: **PASS**

![undated-session-expiry](./step-28-undated-session-expiry.png)

### Inspect Undated PT Three in customer care

Expected: Backend expiring list includes undated session package; render real remaining sessions and no fabricated day count

Actual: DK010	
Payment Same Member
HV001 · 0909210110
	Undated PT Three	--	
Còn 3 buổi PT
	--	

Status: **PASS**

![undated-session-expiry](./step-29-undated-session-expiry.png)

## State Verification

[
  {
    "registrationId": "ed1dc3e9-6aaf-475f-906a-5bdc925ea12d",
    "paymentId": "e60dd1dd-d9d2-469e-bcc1-b2bd8a87c926",
    "memberId": "76fc956e-7d2b-46f3-b66c-078efb79137f",
    "method": "CASH",
    "reference": null,
    "amount": 500000
  },
  {
    "registrationId": "ebbd12d3-3dd1-4620-b205-2e361c9b9f05",
    "paymentId": "f157bcb1-6d3f-4d28-98e1-f05f7d1bef60",
    "memberId": "76fc956e-7d2b-46f3-b66c-078efb79137f",
    "method": "BANK_TRANSFER",
    "reference": "REF-QTV-Bank",
    "amount": 500000
  }
]

## Cross-Role / Downstream Verification

### Open authenticated same-member payment history

Expected: Downstream shows same package, amount and payment method after source settlement

Actual: PT006
500.000 đ

QTV Cash

10:46:37 21/9/2026 · Tiền mặt

Xem phiếu thu

Status: **PASS**

![same-member-payment-history](./downstream-09-same-member-payment-history.png)

### Open authenticated same-member payment history

Expected: Downstream shows same package, amount and payment method after source settlement

Actual: PT007
500.000 đ

QTV Bank

10:46:46 21/9/2026 · Chuyển khoản Ngân hàng (VietQR)

Xem phiếu thu

Status: **PASS**

![same-member-payment-history](./downstream-19-same-member-payment-history.png)

## Issues Found

None in executed checks.

## Final Result

**PASS**; 29/29 steps passed. Cleanup: {"browserClosed":true,"apiClosed":true,"staticClosed":true,"poolsClosed":true,"databaseDropped":true}.

# QTV-W02-US04 member popup readonly E2E

Mode: final. Started source SHA256: 6e797b3b9e841cc9f05eef1dc8ae12f194eecec930bdfe2984e114b1d0ddf616.

Frontend: http://localhost:3001/web/; API: http://localhost:5000/api/v1.

Subject: HV001 / 40000000-0000-0000-0000-000000000001. No business writes; auth allowed.

Expected sources: QTV-W02-US04 Main Flow/field tables/AF02/EF02/EF03; Product Spec W02; HV01-US01; HV03-US01; current user requirements. Final field tables must be reread after documentation freeze.

## Source Action Verification

### Step 1: open-members-list

- Action/Input: open members list. Visible inputs: [{"label":"Chi nhánh làm việc","value":"Toàn bộ chi nhánh"},{"label":"Mã HV, họ tên, SĐT","value":""},{"label":"Lựa chọn...","value":"Tất cả trạng thái"},{"label":"Lựa chọn...","value":"Tất cả trong phạm vi"}].
- Expected Result: QTV-W02-US04 Main Flow / Field-level specification / Exception Flows: readonly rows in branch scope
- Actual Result: URL /web/#members; popup=false; title=-; visible alerts=[]; visible grid rows=20. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![open-members-list](./step-01-open-members-list.png)

### Step 2: initial-row-opens-popup

- Action/Input: initial row opens popup. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Tìm kiếm","value":""},{"label":"Tìm kiếm","value":""}].
- Expected Result: QTV-W02-US04 Main Flow 2-8, popup navigation field table and Business Rules; Product Spec W02: clicking first visible member row opens that member profile
- Actual Result: URL /web/#members; popup=true; title=HV026 - Trần Bảo Long; visible alerts=[]; visible grid rows=0. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![initial-row-opens-popup](./step-02-initial-row-opens-popup.png)

### Step 3: close-initial-popup

- Action/Input: close initial popup. Visible inputs: [{"label":"Chi nhánh làm việc","value":"Toàn bộ chi nhánh"},{"label":"Mã HV, họ tên, SĐT","value":""},{"label":"Lựa chọn...","value":"Tất cả trạng thái"},{"label":"Lựa chọn...","value":"Tất cả trong phạm vi"}].
- Expected Result: Close returns to member list
- Actual Result: URL /web/#members; popup=false; title=-; visible alerts=[]; visible grid rows=20. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![close-initial-popup](./step-03-close-initial-popup.png)

### Step 4: search-same-active-mobile-member

- Action/Input: search same active mobile member. Visible inputs: [{"label":"Chi nhánh làm việc","value":"Toàn bộ chi nhánh"},{"label":"Mã HV, họ tên, SĐT","value":"0987654321"},{"label":"Lựa chọn...","value":"Tất cả trạng thái"},{"label":"Lựa chọn...","value":"Tất cả trong phạm vi"}].
- Expected Result: QTV-W02-US04 Main Flow / Field-level specification / Exception Flows: search exact phone and show matching row
- Actual Result: URL /web/#members; popup=false; title=-; visible alerts=[]; visible grid rows=1. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![search-same-active-mobile-member](./step-04-search-same-active-mobile-member.png)

### Step 5: open-same-member-popup

- Action/Input: open same member popup. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Trạng thái","value":""},{"label":"Tìm kiếm","value":""},{"label":"Tìm kiếm","value":""},{"label":"Trạng thái","value":""}].
- Expected Result: QTV-W02-US04 Main Flow 2-8, popup navigation field table and Business Rules; Product Spec W02: same member identity; exactly five menu tabs
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=11. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![open-same-member-popup](./step-05-open-same-member-popup.png)

### Step 6: open-packages-for-readonly-filter

- Action/Input: open packages for readonly filter. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Trạng thái","value":""},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: QTV-W02-US04 Main Flow 2-8, popup navigation field table and Business Rules; Product Spec W02
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=10. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![open-packages-for-readonly-filter](./step-06-open-packages-for-readonly-filter.png)

### Step 8: clear-package-search

- Action/Input: clear package search. Visible inputs: [{"label":"Tìm kiếm","value":"DK017"},{"label":"Trạng thái","value":""},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: Clear readonly search and restore package list
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=1. Unknown key: "Control+A"
- Status: FAIL

![clear-package-search](./step-08-clear-package-search.png)

### Step 11: open-schedule-date-filter

- Action/Input: open schedule date filter. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Trạng thái","value":""},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: QTV-W02-US04 Main Flow 2-8, popup navigation field table and Business Rules; Product Spec W02
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=10. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![open-schedule-date-filter](./step-11-open-schedule-date-filter.png)

### Step 12: input-from-date-2099-12-31

- Action/Input: input from date 2099 12 31. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Trạng thái","value":""},{"label":"Từ ngày","value":"31/12/2099"},{"label":"Đến ngày","value":""}].
- Expected Result: QTV-W02-US04 filter field table, AF02 and EF03: Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.: capture from date before changing to date
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=0. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![input-from-date-2099-12-31](./step-12-input-from-date-2099-12-31.png)

### Step 13: input-to-date-2000-01-01-invalid-range

- Action/Input: input to date 2000 01 01 invalid range. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Trạng thái","value":""},{"label":"Từ ngày","value":"31/12/2099"},{"label":"Đến ngày","value":"01/01/2000"}].
- Expected Result: QTV-W02-US04 filter field table, AF02 and EF03: Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.: reversed interval displays validation error and no misleading data
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=["Ngày bắt đầu phải trước hoặc bằng ngày kết thúc."]; visible grid rows=0. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![input-to-date-2000-01-01-invalid-range](./step-13-input-to-date-2000-01-01-invalid-range.png)

### Step 14: correct-from-date-2000-01-01

- Action/Input: correct from date 2000 01 01. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Trạng thái","value":""},{"label":"Từ ngày","value":"01/01/2000"},{"label":"Đến ngày","value":"01/01/2000"}].
- Expected Result: QTV-W02-US04 filter field table, AF02 and EF03: Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.: corrected interval removes validation error
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=0. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![correct-from-date-2000-01-01](./step-14-correct-from-date-2000-01-01.png)

### Step 15: clear-to-date-filter

- Action/Input: clear to date filter. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Trạng thái","value":""},{"label":"Từ ngày","value":"01/01/2000"},{"label":"Đến ngày","value":""}].
- Expected Result: QTV-W02-US04 filter field table, AF02 and EF03: Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.: clear upper bound restores current bookings
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=10. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![clear-to-date-filter](./step-15-clear-to-date-filter.png)

### Step 16: open-payment-tab-for-network-error

- Action/Input: open payment tab for network error. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Phương thức","value":""},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: HV03-US01 payment-card source = confirmed 100% receipts; current user: successful confirmed ledger only
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=10. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![open-payment-tab-for-network-error](./step-16-open-payment-tab-for-network-error.png)

### Step 18: abort-payment-get-visible-error

- Action/Input: abort payment get visible error. Visible inputs: [].
- Expected Result: QTV-W02-US04 Main Flow / Field-level specification / Exception Flows: failed payment request shows error, not empty ledger
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=["Failed to fetch\nThử lại"]; visible grid rows=0. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![abort-payment-get-visible-error](./step-18-abort-payment-get-visible-error.png)

### Step 19: retry-payment-get-real-data

- Action/Input: retry payment get real data. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Phương thức","value":"Chuyển khoản"},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: HV03-US01 payment-card source = confirmed 100% receipts; current user: successful confirmed ledger only: retry after network restoration
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=6. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![retry-payment-get-real-data](./step-19-retry-payment-get-real-data.png)

## State Verification

### Step 7: package-search-input-auto-applies

- Action/Input: package search input auto applies. Visible inputs: [{"label":"Tìm kiếm","value":"DK017"},{"label":"Trạng thái","value":""},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: QTV-W02-US04 Main Flow 2-8, popup navigation field table and Business Rules; Product Spec W02: search actual registration code, capture input (auto-apply; no submit button)
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=1. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![package-search-input-auto-applies](./step-07-package-search-input-auto-applies.png)

### Step 9: expand-same-registration-entitlements

- Action/Input: expand same registration entitlements. Visible inputs: [{"label":"Tìm kiếm","value":"DK017"},{"label":"Trạng thái","value":""},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: QTV-W02-US04 Main Flow 2-8, popup navigation field table and Business Rules; Product Spec W02: expanded row shows package-level rights, assigned PT and allowed branches from same registration
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=1. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![expand-same-registration-entitlements](./step-09-expand-same-registration-entitlements.png)

### Step 10: filter-existing-package-status

- Action/Input: filter existing package status. Visible inputs: [{"label":"Tìm kiếm","value":"DK017"},{"label":"Trạng thái","value":"Chờ thanh toán"},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: QTV-W02-US04 Main Flow 2-8, popup navigation field table and Business Rules; Product Spec W02: filter uses real registration status; no status mutation
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=1. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![filter-existing-package-status](./step-10-filter-existing-package-status.png)

### Step 17: payment-method-filter-confirmed-ledger

- Action/Input: payment method filter confirmed ledger. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Phương thức","value":"Chuyển khoản"},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: HV03-US01 payment-card source = confirmed 100% receipts; current user: successful confirmed ledger only: method filter only matches actual confirmed records; no payment-status dropdown
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=6. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![payment-method-filter-confirmed-ledger](./step-17-payment-method-filter-confirmed-ledger.png)

## Cross-Role / Downstream Verification

## Issues Found

- Step 8: clear-package-search: Unknown key: "Control+A"

API failures: [].

Blocked write attempts: [].

## Final Result

PASS assertions: 18; FAIL assertions: 1.

**Pending visual audit and coverage review. Do not treat raw assertion counts as final acceptance.**

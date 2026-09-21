# LT-W08-US02 payment ledger E2E

Result: **BLOCKED**. Real isolated PostgreSQL and private static/API servers. No mock responses. Sources: LT-W08-US02 MF1-12/field-level specification; sibling US01/US03 ledger; user corrections 2026-09-21 override stale payment status text. SQL fixtures only in disposable DB, API-created packages/registrations, activated same member. Migration hashes/provenance in results.json. Bank transfer is manual reconciliation with test reference, not a real bank settlement.

## Source Action Verification

### Open payment ledger

Expected: User correction + US01/US03: two KPIs; no payment-status filter/column or pending KPI

Actual: page.evaluate: Error: E0009 - Component 'dxDataGrid' has not been initialized for an element.

For additional information on this error message, see: https://js.devexpress.com/error/23_2/E0009
    at d (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2148739)
    at Object.Error (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2148146)
    at HTMLDivElement.<anonymous> (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2404237)
    at ce.each (https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js:2:3129)
    at ce.fn.init.each (https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js:2:1594)
    at i.default.fn.<computed> [as dxDataGrid] (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2404170)
    at eval (eval at evaluate (:311:30), <anonymous>:1:37)
    at UtilityScript.evaluate (<anonymous>:313:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)

Status: **FAIL**

![ledger-controls](./step-01-ledger-controls.png)

### LT ledger controls

Expected: Complete scenario

Actual: page.evaluate: Error: E0009 - Component 'dxDataGrid' has not been initialized for an element.

For additional information on this error message, see: https://js.devexpress.com/error/23_2/E0009
    at d (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2148739)
    at Object.Error (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2148146)
    at HTMLDivElement.<anonymous> (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2404237)
    at ce.each (https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js:2:3129)
    at ce.fn.init.each (https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js:2:1594)
    at i.default.fn.<computed> [as dxDataGrid] (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2404170)
    at eval (eval at evaluate (:311:30), <anonymous>:1:37)
    at UtilityScript.evaluate (<anonymous>:313:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)

Status: **FAIL**

![blocked](./step-02-blocked.png)

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

### Choose LT Cash

Expected: Selected value shown before submit

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

![select-option](./step-05-select-option.png)

### Enter note for LT Cash

Expected: Cash selected; no bank-reference field; entered note captured before settlement

Actual: Missing Tiền mặt: DK004 · LT Bank
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

Status: **FAIL**

![cash-filled-before-submit](./step-06-cash-filled-before-submit.png)

### LT cash and member downstream

Expected: Complete scenario

Actual: Missing Tiền mặt: DK004 · LT Bank
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

Status: **FAIL**

![blocked](./step-07-blocked.png)

### LT manual bank and member downstream

Expected: Complete scenario

Actual: locator.click: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for getByRole('button', { name: 'Ghi nhận thanh toán', exact: true })[22m
[2m    - locator resolved to <div tabindex="0" role="button" title="Ghi nhận thanh toán" aria-label="Ghi nhận thanh toán" class="dx-widget dx-button dx-button-mode-contained dx-button-default dx-button-has-text dx-button-has-icon">…</div>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div data-bind="dxControlsDescendantBindings: true" class="dx-overlay-wrapper dx-popup-wrapper sales-modal dx-overlay-shader">…</div> intercepts pointer events[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div data-bind="dxControlsDescendantBindings: true" class="dx-overlay-wrapper dx-popup-wrapper sales-modal dx-overlay-shader">…</div> intercepts pointer events[22m
[2m    - retrying click action[22m
[2m      - waiting 100ms[22m
[2m    29 × waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div data-bind="dxControlsDescendantBindings: true" class="dx-overlay-wrapper dx-popup-wrapper sales-modal dx-overlay-shader">…</div> intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m


Status: **FAIL**

![blocked](./step-08-blocked.png)

## State Verification

[]

## Cross-Role / Downstream Verification

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
								
Không có dữ liệu phù hợp
102050
Trang 1/1 · 0 bản ghi1

Status: **PASS**

![other-branch-no-ledger](./downstream-09-other-branch-no-ledger.png)

## Issues Found

ledger-controls: page.evaluate: Error: E0009 - Component 'dxDataGrid' has not been initialized for an element.

For additional information on this error message, see: https://js.devexpress.com/error/23_2/E0009
    at d (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2148739)
    at Object.Error (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2148146)
    at HTMLDivElement.<anonymous> (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2404237)
    at ce.each (https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js:2:3129)
    at ce.fn.init.each (https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js:2:1594)
    at i.default.fn.<computed> [as dxDataGrid] (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2404170)
    at eval (eval at evaluate (:311:30), <anonymous>:1:37)
    at UtilityScript.evaluate (<anonymous>:313:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)

LT ledger controls: page.evaluate: Error: E0009 - Component 'dxDataGrid' has not been initialized for an element.

For additional information on this error message, see: https://js.devexpress.com/error/23_2/E0009
    at d (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2148739)
    at Object.Error (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2148146)
    at HTMLDivElement.<anonymous> (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2404237)
    at ce.each (https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js:2:3129)
    at ce.fn.init.each (https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js:2:1594)
    at i.default.fn.<computed> [as dxDataGrid] (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2404170)
    at eval (eval at evaluate (:311:30), <anonymous>:1:37)
    at UtilityScript.evaluate (<anonymous>:313:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)

blocked: page.evaluate: Error: E0009 - Component 'dxDataGrid' has not been initialized for an element.

For additional information on this error message, see: https://js.devexpress.com/error/23_2/E0009
    at d (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2148739)
    at Object.Error (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2148146)
    at HTMLDivElement.<anonymous> (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2404237)
    at ce.each (https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js:2:3129)
    at ce.fn.init.each (https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js:2:1594)
    at i.default.fn.<computed> [as dxDataGrid] (https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js:19:2404170)
    at eval (eval at evaluate (:311:30), <anonymous>:1:37)
    at UtilityScript.evaluate (<anonymous>:313:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)

cash-filled-before-submit: Missing Tiền mặt: DK004 · LT Bank
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

LT cash and member downstream: Missing Tiền mặt: DK004 · LT Bank
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

blocked: Missing Tiền mặt: DK004 · LT Bank
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

LT manual bank and member downstream: locator.click: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for getByRole('button', { name: 'Ghi nhận thanh toán', exact: true })[22m
[2m    - locator resolved to <div tabindex="0" role="button" title="Ghi nhận thanh toán" aria-label="Ghi nhận thanh toán" class="dx-widget dx-button dx-button-mode-contained dx-button-default dx-button-has-text dx-button-has-icon">…</div>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div data-bind="dxControlsDescendantBindings: true" class="dx-overlay-wrapper dx-popup-wrapper sales-modal dx-overlay-shader">…</div> intercepts pointer events[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div data-bind="dxControlsDescendantBindings: true" class="dx-overlay-wrapper dx-popup-wrapper sales-modal dx-overlay-shader">…</div> intercepts pointer events[22m
[2m    - retrying click action[22m
[2m      - waiting 100ms[22m
[2m    29 × waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div data-bind="dxControlsDescendantBindings: true" class="dx-overlay-wrapper dx-popup-wrapper sales-modal dx-overlay-shader">…</div> intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m


blocked: locator.click: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for getByRole('button', { name: 'Ghi nhận thanh toán', exact: true })[22m
[2m    - locator resolved to <div tabindex="0" role="button" title="Ghi nhận thanh toán" aria-label="Ghi nhận thanh toán" class="dx-widget dx-button dx-button-mode-contained dx-button-default dx-button-has-text dx-button-has-icon">…</div>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div data-bind="dxControlsDescendantBindings: true" class="dx-overlay-wrapper dx-popup-wrapper sales-modal dx-overlay-shader">…</div> intercepts pointer events[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div data-bind="dxControlsDescendantBindings: true" class="dx-overlay-wrapper dx-popup-wrapper sales-modal dx-overlay-shader">…</div> intercepts pointer events[22m
[2m    - retrying click action[22m
[2m      - waiting 100ms[22m
[2m    29 × waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div data-bind="dxControlsDescendantBindings: true" class="dx-overlay-wrapper dx-popup-wrapper sales-modal dx-overlay-shader">…</div> intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m


## Final Result

**BLOCKED**; 4/9 steps passed. Cleanup: {"browserClosed":true,"apiClosed":true,"staticClosed":true,"poolsClosed":true,"databaseDropped":true}.

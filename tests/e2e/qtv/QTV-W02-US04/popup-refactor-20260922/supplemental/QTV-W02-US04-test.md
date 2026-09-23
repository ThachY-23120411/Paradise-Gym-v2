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

### Step 6: schedule-before-horizontal-scroll

- Action/Input: schedule before horizontal scroll. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Trạng thái","value":""},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: QTV-W02-US04 Main Flow 2-8, popup navigation field table and Business Rules; Product Spec W02
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=10. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![schedule-before-horizontal-scroll](./step-06-schedule-before-horizontal-scroll.png)

### Step 7: filter-completed-bookings-for-confirmation-evidence

- Action/Input: filter completed bookings for confirmation evidence. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Trạng thái","value":"Hoàn thành"},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: QTV-W02-US04 Main Flow 2-8, popup navigation field table and Business Rules; Product Spec W02: completed status filter matches real projection
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=10. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![filter-completed-bookings-for-confirmation-evidence](./step-07-filter-completed-bookings-for-confirmation-evidence.png)

### Step 10: packages-before-invitations-subtab

- Action/Input: packages before invitations subtab. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Trạng thái","value":""},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: QTV-W02-US04 Main Flow 2-8, popup navigation field table and Business Rules; Product Spec W02
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=10. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![packages-before-invitations-subtab](./step-10-packages-before-invitations-subtab.png)

### Step 12: payment-ledger-before-pagination

- Action/Input: payment ledger before pagination. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Phương thức","value":""},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: HV03-US01 payment-card source = confirmed 100% receipts; current user: successful confirmed ledger only
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=10. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![payment-ledger-before-pagination](./step-12-payment-ledger-before-pagination.png)

## State Verification

### Step 8: schedule-right-columns-confirmations

- Action/Input: schedule right columns confirmations. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Trạng thái","value":"Hoàn thành"},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: QTV-W02-US04 Main Flow 2-8, popup navigation field table and Business Rules; Product Spec W02: scroll to actual confirmation and assessment columns
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=10. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![schedule-right-columns-confirmations](./step-08-schedule-right-columns-confirmations.png)

### Step 9: community-subtab-same-member-projection

- Action/Input: community subtab same member projection. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: QTV-W02-US04 Main Flow 2-8, popup navigation field table and Business Rules; Product Spec W02: registered community classes match overview.community_registrations, including genuine empty state
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=0. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![community-subtab-same-member-projection](./step-09-community-subtab-same-member-projection.png)

### Step 11: group-invitations-subtab-same-member-projection

- Action/Input: group invitations subtab same member projection. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Trạng thái","value":""},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: QTV-W02-US04 Main Flow 2-8, popup navigation field table and Business Rules; Product Spec W02: invitations match sent/received IDs and status from same selected member
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=1. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![group-invitations-subtab-same-member-projection](./step-11-group-invitations-subtab-same-member-projection.png)

### Step 13: payment-ledger-second-page

- Action/Input: payment ledger second page. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Phương thức","value":""},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: HV03-US01 payment-card source = confirmed 100% receipts; current user: successful confirmed ledger only: confirmed ledger contains remaining record on actual page 2
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=1. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![payment-ledger-second-page](./step-13-payment-ledger-second-page.png)

### Step 14: pending-payment-subtab-same-member-projection

- Action/Input: pending payment subtab same member projection. Visible inputs: [{"label":"Tìm kiếm","value":""},{"label":"Trạng thái","value":""},{"label":"Từ ngày","value":""},{"label":"Đến ngày","value":""}].
- Expected Result: QTV-W02-US04 Main Flow 2-8, popup navigation field table and Business Rules; Product Spec W02: pending owned registrations are separate from confirmed ledger
- Actual Result: URL /web/#members; popup=true; title=HV001 - Lê Hoàng Nam; visible alerts=[]; visible grid rows=7. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![pending-payment-subtab-same-member-projection](./step-14-pending-payment-subtab-same-member-projection.png)

## Cross-Role / Downstream Verification

## Issues Found

- No assertion failures recorded yet; this is not an all-PASS conclusion.

API failures: [].

Blocked write attempts: [].

## Final Result

PASS assertions: 14; FAIL assertions: 0.

**Pending visual audit and coverage review. Do not treat raw assertion counts as final acceptance.**

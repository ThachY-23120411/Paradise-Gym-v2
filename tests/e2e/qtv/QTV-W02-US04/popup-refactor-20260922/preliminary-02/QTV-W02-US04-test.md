# QTV-W02-US04 member popup readonly E2E

Mode: preliminary. Started source SHA256: 4044b5b69ae2a42df85b53b0994c052d0c814141145793160ddcc087e9be07d7.

Frontend: http://localhost:3001/web/; API: http://localhost:5000/api/v1.

Subject: HV001 / 40000000-0000-0000-0000-000000000001. No business writes; auth allowed.

Expected sources: QTV-W02-US04; Product Spec W02; HV01-US01; HV03-US01; five-menu implementation walkthrough; current user requirements. Canonical popup date/filter spec remains a documentation gap until main agent synchronizes it.

## Source Action Verification

### Step 1: open-members-list

- Action/Input: open members list. Visible inputs: [{"label":"Chi nhánh làm việc","value":"Toàn bộ chi nhánh"},{"label":"Mã HV, họ tên, SĐT","value":""},{"label":"Lựa chọn...","value":"Tất cả trạng thái"},{"label":"Lựa chọn...","value":"Tất cả trong phạm vi"}].
- Expected Result: QTV-W02-US04 Main Flow / Field-level specification / Exception Flows: readonly rows in branch scope
- Actual Result: URL /web/#members; popup=false; title=-; visible alerts=[]; visible grid rows=20. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![open-members-list](./step-01-open-members-list.png)

### Step 2: initial-row-opens-popup

- Action/Input: initial row opens popup. Visible inputs: [].
- Expected Result: Product Spec W02 profile 360; docs/reports/tab1-web-admin/2026-09-21-mobile-menus-profile-popups-walkthrough.md section I.1; current user popup requirement: clicking first visible member row opens that member profile
- Actual Result: URL /web/#members; popup=true; title=Hồ sơ hội viên; visible alerts=["Route not found\nThử lại"]; visible grid rows=0. Popup subject differs from clicked row
- Status: FAIL

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

- Action/Input: open same member popup. Visible inputs: [].
- Expected Result: Product Spec W02 profile 360; docs/reports/tab1-web-admin/2026-09-21-mobile-menus-profile-popups-walkthrough.md section I.1; current user popup requirement: same member identity; exactly five menu tabs
- Actual Result: URL /web/#members; popup=true; title=Hồ sơ hội viên; visible alerts=["Route not found\nThử lại"]; visible grid rows=0. The expression evaluated to a falsy value:

  assert(d.title.includes(subject.member_code))

- Status: FAIL

![open-same-member-popup](./step-05-open-same-member-popup.png)

### Step 6: close-blocked-profile

- Action/Input: close blocked profile. Visible inputs: [{"label":"Chi nhánh làm việc","value":"Toàn bộ chi nhánh"},{"label":"Mã HV, họ tên, SĐT","value":"0987654321"},{"label":"Lựa chọn...","value":"Tất cả trạng thái"},{"label":"Lựa chọn...","value":"Tất cả trong phạm vi"}].
- Expected Result: Close blocked profile before independent branch checks
- Actual Result: URL /web/#members; popup=false; title=-; visible alerts=[]; visible grid rows=1. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![close-blocked-profile](./step-06-close-blocked-profile.png)

### Step 10: network-abort-member-list

- Action/Input: network abort member list. Visible inputs: [{"label":"Chi nhánh làm việc","value":"Toàn bộ chi nhánh"},{"label":"Mã HV, họ tên, SĐT","value":""},{"label":"Lựa chọn...","value":"Tất cả trạng thái"},{"label":"Lựa chọn...","value":"Tất cả trong phạm vi"}].
- Expected Result: QTV-W02-US04 Main Flow / Field-level specification / Exception Flows: loading error is visible and retry offered
- Actual Result: URL /web/#members; popup=false; title=-; visible alerts=["Failed to fetch\nThử lại"]; visible grid rows=0. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![network-abort-member-list](./step-10-network-abort-member-list.png)

### Step 11: network-retry-member-list

- Action/Input: network retry member list. Visible inputs: [{"label":"Chi nhánh làm việc","value":"Toàn bộ chi nhánh"},{"label":"Mã HV, họ tên, SĐT","value":""},{"label":"Lựa chọn...","value":"Tất cả trạng thái"},{"label":"Lựa chọn...","value":"Tất cả trong phạm vi"}].
- Expected Result: QTV-W02-US04 Main Flow / Field-level specification / Exception Flows: retry loads real rows after network restored
- Actual Result: URL /web/#members; popup=false; title=-; visible alerts=[]; visible grid rows=20. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![network-retry-member-list](./step-11-network-retry-member-list.png)

## State Verification

### Step 7: branch-scope-A

- Action/Input: branch scope A. Visible inputs: [{"label":"Chi nhánh làm việc","value":"Paradise Gym Bình Thạnh"},{"label":"Mã HV, họ tên, SĐT","value":""},{"label":"Lựa chọn...","value":"Tất cả trạng thái"},{"label":"Lựa chọn...","value":"Paradise Gym Bình Thạnh"}].
- Expected Result: QTV-W02-US04 Main Flow / Field-level specification / Exception Flows: selected branch determines actual visible members
- Actual Result: URL /web/#members; popup=false; title=-; visible alerts=[]; visible grid rows=2. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![branch-scope-A](./step-07-branch-scope-A.png)

### Step 8: branch-scope-B

- Action/Input: branch scope B. Visible inputs: [{"label":"Chi nhánh làm việc","value":"Paradise Gym Quận 1"},{"label":"Mã HV, họ tên, SĐT","value":""},{"label":"Lựa chọn...","value":"Tất cả trạng thái"},{"label":"Lựa chọn...","value":"Paradise Gym Quận 1"}].
- Expected Result: QTV-W02-US04 Main Flow / Field-level specification / Exception Flows: selected branch determines actual visible members
- Actual Result: URL /web/#members; popup=false; title=-; visible alerts=[]; visible grid rows=20. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![branch-scope-B](./step-08-branch-scope-B.png)

### Step 9: branch-scope-ALL

- Action/Input: branch scope ALL. Visible inputs: [{"label":"Chi nhánh làm việc","value":"Toàn bộ chi nhánh"},{"label":"Mã HV, họ tên, SĐT","value":""},{"label":"Lựa chọn...","value":"Tất cả trạng thái"},{"label":"Lựa chọn...","value":"Tất cả trong phạm vi"}].
- Expected Result: QTV-W02-US04 Main Flow / Field-level specification / Exception Flows: selected branch determines actual visible members
- Actual Result: URL /web/#members; popup=false; title=-; visible alerts=[]; visible grid rows=20. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![branch-scope-ALL](./step-09-branch-scope-ALL.png)

### Step 17: receptionist-existing-members-list

- Action/Input: receptionist existing members list. Visible inputs: [{"label":"Chi nhánh làm việc","value":"Paradise Gym Quận 1"},{"label":"Mã HV, họ tên, SĐT","value":""},{"label":"Lựa chọn...","value":"Tất cả trạng thái"},{"label":"Lựa chọn...","value":"Paradise Gym Quận 1"}].
- Expected Result: User scope: LT existing member experience retained; QTV refactor must not remove LT list
- Actual Result: URL /web/#members; popup=false; title=-; visible alerts=[]; visible grid rows=20. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![receptionist-existing-members-list](./step-17-receptionist-existing-members-list.png)

### Step 18: receptionist-existing-profile

- Action/Input: receptionist existing profile. Visible inputs: [].
- Expected Result: User scope: LT existing profile opens from visible row
- Actual Result: URL /web/#members; popup=true; title=HV026 - Trần Bảo Long; visible alerts=[]; visible grid rows=0. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![receptionist-existing-profile](./step-18-receptionist-existing-profile.png)

## Cross-Role / Downstream Verification

### Step 12: mobile-authenticated-same-member-home

- Action/Input: mobile authenticated same member home. Visible inputs: [].
- Expected Result: HV01-US01 ownership rule; HV03-US01 package/receipt fields; current user: same member, readonly
- Actual Result: URL /mobile/member/#home; popup=false; title=-; visible alerts=[]; visible grid rows=0. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![mobile-authenticated-same-member-home](./step-12-mobile-authenticated-same-member-home.png)

### Step 13: mobile-same-member-schedule

- Action/Input: mobile same member schedule. Visible inputs: [].
- Expected Result: HV01-US01 ownership rule; HV03-US01 package/receipt fields; current user: same member, readonly: authenticated business screen; API errors retained
- Actual Result: URL /mobile/member/#schedule; popup=false; title=-; visible alerts=[]; visible grid rows=0. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![mobile-same-member-schedule](./step-13-mobile-same-member-schedule.png)

### Step 14: mobile-same-member-packages

- Action/Input: mobile same member packages. Visible inputs: [].
- Expected Result: HV01-US01 ownership rule; HV03-US01 package/receipt fields; current user: same member, readonly: authenticated business screen; API errors retained
- Actual Result: URL /mobile/member/#packages; popup=false; title=-; visible alerts=[]; visible grid rows=0. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![mobile-same-member-packages](./step-14-mobile-same-member-packages.png)

### Step 15: mobile-same-member-payments

- Action/Input: mobile same member payments. Visible inputs: [].
- Expected Result: HV01-US01 ownership rule; HV03-US01 package/receipt fields; current user: same member, readonly: authenticated business screen; API errors retained
- Actual Result: URL /mobile/member/#payments; popup=false; title=-; visible alerts=[]; visible grid rows=0. Mobile has no confirmed shared payment identifier; Web API has 11 confirmed records (legacy statuses: )
- Status: FAIL

![mobile-same-member-payments](./step-15-mobile-same-member-payments.png)

### Step 16: mobile-same-member-account

- Action/Input: mobile same member account. Visible inputs: [{"label":"","value":""},{"label":"","value":"Lê Hoàng Nam"},{"label":"","value":"0987654321"},{"label":"","value":"nam.lehoang.9173@gmail.com"},{"label":"","value":"1992-09-24"}].
- Expected Result: HV01-US01 ownership rule; HV03-US01 package/receipt fields; current user: same member, readonly: authenticated business screen; API errors retained
- Actual Result: URL /mobile/member/#account; popup=false; title=-; visible alerts=[]; visible grid rows=0. DOM assertions passed; screenshot requires visual audit.
- Status: PASS

![mobile-same-member-account](./step-16-mobile-same-member-account.png)

## Issues Found

- Step 0: overview-endpoint: GET /members/40000000-0000-0000-0000-000000000001/overview-data returned 404
- Step 2: initial-row-opens-popup: Popup subject differs from clicked row
- Step 5: open-same-member-popup: The expression evaluated to a falsy value:

  assert(d.title.includes(subject.member_code))

- Step 15: mobile-same-member-payments: Mobile has no confirmed shared payment identifier; Web API has 11 confirmed records (legacy statuses: )
- Step 0: source-changed-during-run: UI source changed; rerun after explicit freeze

API failures: [{"path":"/api/v1/members/07fedd34-b752-4a3a-84e2-3f71a983ae70/overview-data","status":404},{"path":"/api/v1/members/40000000-0000-0000-0000-000000000001/overview-data","status":404},{"path":"/api/v1/group-invitations","status":403}].

Blocked write attempts: [].

## Final Result

PASS assertions: 15; FAIL assertions: 3.

**BLOCKED for final acceptance: awaiting explicit API/UI freeze. Preliminary evidence only.**

# PT01-US03 - Isolated real UI business E2E

Run: 2026-09-21T01:23:15.865Z

Sources: docs/user-stories/pt/PT01-Lịch/PT01-US03 story (Main Flow, Field specification, Alternate/Exception Flows); docs/product-spec.md sections 4.2-4.6.

Database: paradise_test_4400_1789953742772; frontend: http://localhost:3000; real backend: http://127.0.0.1:63185/api/v1. Browser requests redirected with route.continue, no response mocks. Real API auth sessions. Shared configured DB receives no application writes. Scope: test artifacts only; mailbox/skill/source files unchanged by this runner.

All migrations present at startup applied: 001_create_tables.sql, 002_web_rebuild.sql, 003_mobile_preferences.sql, 004_device_sessions.sql, 005_remove_pt_certificates.sql, 006_boss_feedback_schema_upgrade.sql, 007_commission_configs_uniqueness_and_history.sql, 008_branch_default_commission_rate.sql, 009_pt_commission_payout_details.sql, 010_scheduled_package_freezes.sql, 011_pt_bookings_no_overlap_indexes.sql, 012_pt_commission_session_snapshot.sql, 013_pt_booking_participants.sql. Hashes recorded in results.json. Group fixture: leader + ACCEPTED member; PENDING member excluded. SQL fixture setup is confined to the new isolated database. Participant Gym expiry is temporarily changed only for EF-02.

Fixture: {"b1":"76970b78-ac1c-4958-845b-e5566d73a171","b2":"ff3a8fde-eab3-427f-9e74-5243053201e6","member":{"id":"ef84340d-851b-4bd1-8237-e2c01021da85","account_id":"b5c610b7-0b6b-45c6-8ffa-bf69c4cbc609","home_branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","member_code":"HV001","full_name":"Business Member A","phone":"0909000010","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"80abe2d2-463d-4a5a-9619-82ace562ecb8","created_at":"2026-09-21T01:22:24.174Z","updated_at":"2026-09-21T01:22:24.174Z","qr_code":"QR-HV001-0909000010","face_enrolled":false},"pt":{"id":"5d19ac36-6776-4127-ad23-4b140b3c424a","account_id":"95bb7698-726b-4ce0-a1e2-14c5d178c079","branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","pt_code":"PT001","full_name":"Business Trainer A","phone":"0909000020","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-21T01:22:24.211Z","updated_at":"2026-09-21T01:22:24.211Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"pt2":{"id":"8ff49190-1933-476d-a254-9ea21b926930","account_id":"51718108-6207-4020-8976-fbd6ad57ee1b","branch_id":"ff3a8fde-eab3-427f-9e74-5243053201e6","pt_code":"PT002","full_name":"Business Trainer B","phone":"0909000021","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-21T01:22:24.236Z","updated_at":"2026-09-21T01:22:24.236Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"registration":{"id":"8261d77e-a68a-4bd0-b94f-6ac8a36a661d","reg_code":"DK002","member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","package_id":"05f481ed-e2a9-49d2-8eda-2c3bbcde17a7","assigned_pt_id":"5d19ac36-6776-4127-ad23-4b140b3c424a","sold_branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","previous_registration_id":null,"package_name_snapshot":"Business PT 90","package_type_snapshot":"PT_SESSION","price_snapshot":1000000,"duration_days_snapshot":60,"total_gym_sessions_snapshot":null,"total_pt_sessions_snapshot":5,"start_date":"2026-09-21","end_date":"2026-11-20","remaining_gym_sessions":null,"remaining_pt_sessions":5,"booked_pt_sessions":0,"used_pt_sessions":0,"status":"ACTIVE","created_by":"80abe2d2-463d-4a5a-9619-82ace562ecb8","created_at":"2026-09-21T01:22:25.428Z","updated_at":"2026-09-21T01:22:25.485Z","gym_price_snapshot":0,"pt_price_snapshot":1000000,"combo_price_snapshot":0,"package_mode":"GROUP_1_N","max_group_members_snapshot":3,"is_frozen":false,"freeze_days_total":0,"group_leader_member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","has_scheduled_freeze":false,"registration_code":"DK002","member":{"id":"ef84340d-851b-4bd1-8237-e2c01021da85","account_id":"b5c610b7-0b6b-45c6-8ffa-bf69c4cbc609","home_branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","member_code":"HV001","full_name":"Business Member A","phone":"0909000010","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"80abe2d2-463d-4a5a-9619-82ace562ecb8","created_at":"2026-09-21T01:22:24.174Z","updated_at":"2026-09-21T01:22:24.174Z","qr_code":"QR-HV001-0909000010","face_enrolled":false},"member_name":"Business Member A","member_code":"HV001","member_phone":"0909000010","allowed_branches":[{"id":"76970b78-ac1c-4958-845b-e5566d73a171","branch_code":"Business Branch A","branch_name":"Business Branch A","phone":"0909999999","address":"Isolated E2E","status":"ACTIVE","open_time":"00:00:00","close_time":"23:59:00","timezone":"Asia/Ho_Chi_Minh","created_at":"2026-09-21T01:22:23.500Z","updated_at":"2026-09-21T01:22:23.500Z","gate_config":{"duplicate_seconds":60,"daily_gym_deduction_limit":1},"default_pt_commission_percentage":20}],"assigned_pt":{"id":"5d19ac36-6776-4127-ad23-4b140b3c424a","account_id":"95bb7698-726b-4ce0-a1e2-14c5d178c079","branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","pt_code":"PT001","full_name":"Business Trainer A","phone":"0909000020","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-21T01:22:24.211Z","updated_at":"2026-09-21T01:22:24.211Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"pt_name":"Business Trainer A","payments":[{"id":"5cc70303-7ae7-4931-91b4-69a0728fb15b","registration_id":"8261d77e-a68a-4bd0-b94f-6ac8a36a661d","member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","payment_code":"PAY002","payment_method":"CASH","amount":1000000,"status":"COMPLETED","transaction_ref":null,"collected_by":"80abe2d2-463d-4a5a-9619-82ace562ecb8","confirmed_at":"2026-09-21T01:22:25.448Z","created_at":"2026-09-21T01:22:25.448Z","updated_at":"2026-09-21T01:22:25.448Z","note":null,"expires_at":null,"discount_id":null,"discount_amount":0}],"created_by_name":"0909000002","freezes":[],"transfers":[],"progress":{"elapsed_days":0,"remaining_days":60,"total_days":60,"checkins":0,"total_pt_sessions":5,"used_pt_sessions":0,"booked_pt_sessions":0,"remaining_pt_sessions":5}},"date":"2026-09-22","groupMode":true,"accepted":{"id":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","account_id":"ad89fb74-6620-42d7-baa6-af8c497b094d","home_branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","member_code":"HV002","full_name":"Business Accepted Member","phone":"0909000011","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"80abe2d2-463d-4a5a-9619-82ace562ecb8","created_at":"2026-09-21T01:22:25.524Z","updated_at":"2026-09-21T01:22:25.524Z","qr_code":"QR-HV002-0909000011","face_enrolled":false},"pending":{"id":"a5d6e251-c8be-4637-abd7-67db47984dc8","account_id":"8e6beed0-f90e-43b4-9d91-2a5c2f87c25f","home_branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","member_code":"HV003","full_name":"Business Pending Member","phone":"0909000012","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"80abe2d2-463d-4a5a-9619-82ace562ecb8","created_at":"2026-09-21T01:22:25.539Z","updated_at":"2026-09-21T01:22:25.539Z","qr_code":"QR-HV003-0909000012","face_enrolled":false},"acceptedGym":{"id":"a9efebdb-0600-4b06-a5a4-2b59e3ce9fff","reg_code":"DK003","member_id":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","package_id":"7f25232b-7f67-48aa-bd2b-c3240e9002e2","assigned_pt_id":null,"sold_branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","previous_registration_id":null,"package_name_snapshot":"Business Gym","package_type_snapshot":"GYM_SESSION","price_snapshot":500000,"duration_days_snapshot":60,"total_gym_sessions_snapshot":20,"total_pt_sessions_snapshot":null,"start_date":"2026-09-21","end_date":"2026-11-20","remaining_gym_sessions":20,"remaining_pt_sessions":null,"booked_pt_sessions":0,"used_pt_sessions":0,"status":"PENDING_PAYMENT","created_by":"80abe2d2-463d-4a5a-9619-82ace562ecb8","created_at":"2026-09-21T01:22:25.915Z","updated_at":"2026-09-21T01:22:25.915Z","gym_price_snapshot":500000,"pt_price_snapshot":0,"combo_price_snapshot":0,"package_mode":"INDIVIDUAL","max_group_members_snapshot":null,"is_frozen":false,"freeze_days_total":0,"group_leader_member_id":null}}

## Source Action Verification

### Open authenticated PT calendar

- Action / Input: Open authenticated PT calendar
- Expected Result: PT01-US03 Trigger: own PT can open booking from PT01
- Actual Result: Own PT calendar and booking action visible
- Status: **PASS**

![Open authenticated PT calendar](./step-01-pt-calendar.png)

### Open booking modal

- Action / Input: Open booking modal
- Expected Result: Main Flow 1: real PT/branch readonly; form opens without choices
- Actual Result: Visible popup with own trainer and branch from isolated API
- Status: **PASS**

![Open booking modal](./step-02-booking-modal-open.png)

### Attempt empty-form submission

- Action / Input: Attempt empty-form submission
- Expected Result: Field specification: save disabled while required inputs missing
- Actual Result: Save disabled; zero bookings. No forced validation or synthetic click.
- Status: **PASS**

![Attempt empty-form submission](./step-03-empty-form-validation.png)

### Open date picker

- Action / Input: Open date picker
- Expected Result: Main Flow 4: choose future working date from calendar
- Actual Result: 22
- Status: **PASS**

![Open date picker](./step-04-date-picker-options.png)

### Select future working date

- Action / Input: Select future working date
- Expected Result: Main Flow 4: date picker accepts future working date
- Actual Result: 2026-09-22
- Status: **PASS**

![Select future working date](./step-05-date-selected.png)

### Open assigned-member dropdown

- Action / Input: Open assigned-member dropdown
- Expected Result: Main Flow 2: assigned members from API
- Actual Result: Business Member A · HV001 · 0909000010
- Status: **PASS**

![Open assigned-member dropdown](./step-06-member-options.png)

### Select assigned member

- Action / Input: Select assigned member
- Expected Result: Main Flow 3: contract choices enabled for selected member
- Actual Result: Business Member A · HV001 · 0909000010
- Status: **PASS**

![Select assigned member](./step-07-member-selected-contract-enabled.png)

### Open contract dropdown

- Action / Input: Open contract dropdown
- Expected Result: Main Flow 3: paid assigned contract has remaining sessions
- Actual Result: DK002 · Business PT 90 · 5 buổi
- Status: **PASS**

![Open contract dropdown](./step-08-contract-options.png)

### Inspect accepted participants after contract selection

- Action / Input: Inspect accepted participants after contract selection
- Expected Result: PT01-US03 Main Flow 3: leader plus all ACCEPTED; PENDING excluded; no individual selection
- Actual Result: Business Member A · HV001 · Trưởng nhóm
Business Accepted Member · HV002
- Status: **PASS**

![Inspect accepted participants after contract selection](./step-09-group-participants-readonly.png)

### Select paid assigned contract

- Action / Input: Select paid assigned contract
- Expected Result: Main Flow 4: duration comes from API contract and is readonly
- Actual Result: 90 minutes; contract selected
- Status: **PASS**

![Select paid assigned contract](./step-10-contract-duration.png)

### Enter 08:00 start time

- Action / Input: Enter 08:00 start time
- Expected Result: Main Flow 4: 90 minutes produces readonly 09:30 end
- Actual Result: 08:00 - 09:30
- Status: **PASS**

![Enter 08:00 start time](./step-11-time-derived.png)

### Review filled form before submit

- Action / Input: Review filled form before submit
- Expected Result: Main Flow 5: chosen member, contract, date/time and note visible before save
- Actual Result: {"pt_name":"Business Trainer A · PT001","branch_name":"Business Branch A","member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","registration_id":"8261d77e-a68a-4bd0-b94f-6ac8a36a661d","date":"2026-09-22","start_time":"08:00","duration_display":"90 phút","end_time":"09:30","contract_rights":"Từ 21/09/2026 · Đến 20/11/2026 · 5 buổi khả dụng","participants":"Business Member A · HV001 · Trưởng nhóm\nBusiness Accepted Member · HV002","note":"business-20260920 own PT UI booking"}
- Status: **PASS**

![Review filled form before submit](./step-12-presubmit-filled-form.png)

### Submit while accepted participant Gym expires before booking date

- Action / Input: Submit while accepted participant Gym expires before booking date
- Expected Result: PT01-US03 EF-02: reject whole group, retain input, no booking or session deduction
- Actual Result: {"status":409,"payload":{"success":false,"message":"Không thể đặt lịch nhóm ngày 2026-09-22. Business Accepted Member (HV002): DK003: gói Gym đã hết hạn.","code":"GROUP_GYM_REQUIRED"},"counters":{"remaining_pt_sessions":5,"booked_pt_sessions":0,"used_pt_sessions":0,"total_pt_sessions_snapshot":5}}
- Status: **PASS**

![Submit while accepted participant Gym expires before booking date](./step-15-expired-gym-blocks-whole-group.png)

### Restore isolated participant entitlement and review retained form

- Action / Input: Restore isolated participant entitlement and review retained form
- Expected Result: EF-02 adjustment: unchanged form is ready to retry with valid Gym
- Actual Result: Gym expiry restored in isolated fixture; form retains 08:00 start and selected contract
- Status: **PASS**

![Restore isolated participant entitlement and review retained form](./step-16-gym-restored-input-retained.png)

### Submit booking and view own calendar

- Action / Input: Submit booking and view own calendar
- Expected Result: Main Flow 8-9: real POST creates booking, closes modal, selects date and refreshes calendar
- Actual Result: booking_id=562d62cd-0daa-46ec-81c4-148da210c2e6; 08:00 - 09:30
90 PHÚT
Đã đặt
562d62cd-0daa-46ec-81c4-148da210c2e6
Business Member A
 Business PT 90
 Business Branch A
Thành viên tham gia: Business Member A · HV001; Business Accepted Member · HV002
Chưa đến giờ tập
business-20260920 own PT UI booking
- Status: **PASS**

![Submit booking and view own calendar](./step-17-booking-success-own-calendar.png)

## State Verification

- **PASS** Actual browser booking POST: {"status":200,"body":{"registration_id":"8261d77e-a68a-4bd0-b94f-6ac8a36a661d","member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","pt_id":"5d19ac36-6776-4127-ad23-4b140b3c424a","branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","booking_date":"2026-09-22","start_time":"08:00","end_time":"09:30","session_duration_minutes":90,"workout_notes":"business-20260920 own PT UI booking"},"bookingId":"562d62cd-0daa-46ec-81c4-148da210c2e6"}
- **PASS** Immutable participants from actual booking POST/detail: {"bookingId":"562d62cd-0daa-46ec-81c4-148da210c2e6","participants":[{"member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","member_code":"HV001","member_name":"Business Member A","is_leader":true},{"member_id":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","member_code":"HV002","member_name":"Business Accepted Member","is_leader":false}],"post":{"registration_id":"8261d77e-a68a-4bd0-b94f-6ac8a36a661d","member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","pt_id":"5d19ac36-6776-4127-ad23-4b140b3c424a","branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","booking_date":"2026-09-22","start_time":"08:00","end_time":"09:30","session_duration_minutes":90,"workout_notes":"business-20260920 own PT UI booking"}}
- **PASS** Atomic reservation counters: "remaining=4, booked=1, used=0; total=5"
- **PASS** PT2 attempts PT1 contract: {"status":403,"body":{"success":false,"message":"Bạn không có quyền thực hiện thao tác này hoặc dữ liệu nằm ngoài phạm vi chi nhánh.","code":"FORBIDDEN"},"before":1,"after":1}
- **PASS** PT1 forges PT2 id: {"status":403,"body":{"success":false,"message":"Bạn không có quyền thực hiện thao tác này hoặc dữ liệu nằm ngoài phạm vi chi nhánh.","code":"FORBIDDEN"},"before":1,"after":1}
- **PASS** PT1 forges foreign branch: {"status":403,"body":{"success":false,"message":"Bạn không có quyền thực hiện thao tác này hoặc dữ liệu nằm ngoài phạm vi chi nhánh.","code":"FORBIDDEN"},"before":1,"after":1}
- **PASS** Nonleader member-confirm denied: {"bookingId":"562d62cd-0daa-46ec-81c4-148da210c2e6","memberId":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","status":403,"payload":{"success":false,"message":"Bạn không có quyền thực hiện thao tác này hoặc dữ liệu nằm ngoài phạm vi chi nhánh.","code":"FORBIDDEN"}}
- **PASS** Nonleader cancel denied: {"bookingId":"562d62cd-0daa-46ec-81c4-148da210c2e6","memberId":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","status":403,"payload":{"success":false,"message":"Bạn không có quyền thực hiện thao tác này hoặc dữ liệu nằm ngoài phạm vi chi nhánh.","code":"FORBIDDEN"}}

### Inspect filled booking modal at 360px

- Action / Input: Inspect filled booking modal at 360px
- Expected Result: Requested responsive nonoverlap: modal in viewport, content stays above action toolbar
- Actual Result: {"box":{"x":12,"y":72,"width":336,"height":700.59375},"content":{"x":13,"y":134,"width":334,"height":580.59375},"toolbar":{"x":13,"y":714.59375,"width":334,"height":57}}
- Status: **PASS**

![Inspect filled booking modal at 360px](./step-13-booking-modal-responsive-360.png)

### Inspect filled booking modal at 1440px

- Action / Input: Inspect filled booking modal at 1440px
- Expected Result: Requested responsive nonoverlap: modal in viewport, content stays above action toolbar
- Actual Result: {"box":{"x":460,"y":82,"width":520,"height":737},"content":{"x":461,"y":144,"width":518,"height":617},"toolbar":{"x":461,"y":761,"width":518,"height":57}}
- Status: **PASS**

![Inspect filled booking modal at 1440px](./step-14-booking-modal-responsive-1440.png)

### Inspect created group booking card

- Action / Input: Inspect created group booking card
- Expected Result: PT01-US01: readonly snapshot includes leader and accepted member, excludes pending
- Actual Result: 08:00 - 09:30
90 PHÚT
Đã đặt
562d62cd-0daa-46ec-81c4-148da210c2e6
Business Member A
 Business PT 90
 Business Branch A
Thành viên tham gia: Business Member A · HV001; Business Accepted Member · HV002
Chưa đến giờ tập
business-20260920 own PT UI booking
- Status: **PASS**

![Inspect created group booking card](./step-18-group-card-participants.png)

### Inspect PT calendar at 360px

- Action / Input: Inspect PT calendar at 360px
- Expected Result: Requested responsive nonoverlap: card and fixed navigation do not intersect; no page overflow
- Actual Result: {"card":{"x":16,"y":496.390625,"width":328,"height":272.5},"nav":{"x":0,"y":776,"width":360,"height":68},"overflow":false}
- Status: **PASS**

![Inspect PT calendar at 360px](./step-19-responsive-360.png)

### Inspect PT calendar at 390px

- Action / Input: Inspect PT calendar at 390px
- Expected Result: Requested responsive nonoverlap: card and fixed navigation do not intersect; no page overflow
- Actual Result: {"card":{"x":16,"y":496.390625,"width":358,"height":235},"nav":{"x":0,"y":776,"width":390,"height":68},"overflow":false}
- Status: **PASS**

![Inspect PT calendar at 390px](./step-20-responsive-390.png)

### Inspect PT calendar at 768px

- Action / Input: Inspect PT calendar at 768px
- Expected Result: Requested responsive nonoverlap: card and fixed navigation do not intersect; no page overflow
- Actual Result: {"card":{"x":20,"y":502.265625,"width":728,"height":199},"nav":{"x":0,"y":776,"width":768,"height":68},"overflow":false}
- Status: **PASS**

![Inspect PT calendar at 768px](./step-21-responsive-768.png)

### Inspect PT calendar at 1440px

- Action / Input: Inspect PT calendar at 1440px
- Expected Result: Requested responsive nonoverlap: card and fixed navigation do not intersect; no page overflow
- Actual Result: {"card":{"x":280,"y":502.265625,"width":880,"height":199},"nav":{"x":0,"y":832,"width":1440,"height":68},"overflow":false}
- Status: **PASS**

![Inspect PT calendar at 1440px](./step-22-responsive-1440.png)

## Cross-Role / Downstream Verification

### Open authenticated member training schedule

- Action / Input: Open authenticated member training schedule
- Expected Result: Main Flow 9: same created booking visible to its member
- Actual Result: booking_id=562d62cd-0daa-46ec-81c4-148da210c2e6; 22/9/2026 · 08:00 - 09:30
Đã đặt

Business Branch A

PT: Business Trainer A

Business Member A · Business PT 90

Hủy lịch
Xác nhận hoàn thành
- Status: **PASS**

![Open authenticated member training schedule](./downstream-23-hv-same-booking.png)

### Open accepted nonleader schedule for same booking

- Action / Input: Open accepted nonleader schedule for same booking
- Expected Result: PT01-US01/03: snapshot participant can view same booking, only leader may confirm or cancel
- Actual Result: {"bookingId":"562d62cd-0daa-46ec-81c4-148da210c2e6","viewer":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","text":"22/9/2026 · 08:00 - 09:30\nĐã đặt\n\nBusiness Branch A\n\nPT: Business Trainer A\n\nBusiness Member A · Business PT 90\n\nTrưởng nhóm đại diện xác nhận và hủy lịch"}
- Status: **PASS**

![Open accepted nonleader schedule for same booking](./downstream-24-accepted-member-same-booking.png)

### Open same booking in receptionist schedule

- Action / Input: Open same booking in receptionist schedule
- Expected Result: Main Flow 9: same booking appears in authorized branch Web UI
- Actual Result: booking_id=562d62cd-0daa-46ec-81c4-148da210c2e6; Hội viên:
Business Member A (HV001)
Số điện thoại:
0909000010
PT phụ trách:
Business Trainer A
Chi nhánh:
Business Branch A
Gói PT sử dụng:
Business PT 90
Ngày tập:
22/9/2026
Khung giờ:
08:00 - 09:30
Trạng thái:
Đã đặt
PT xác nhận:
Chưa xác nhận
Hội viên xác nhận:
Chưa xác nhận
Khấu trừ buổi:
Chưa khấu trừ
Ghi chú cho buổi:
business-20260920 own PT UI booking
Buổi số:
1
Nội dung bài tập:
business-20260920 own PT UI booking
- Status: **PASS**

![Open same booking in receptionist schedule](./downstream-25-lt-same-booking.png)

### Open Branch B receptionist trainer choices

- Action / Input: Open Branch B receptionist trainer choices
- Expected Result: EF-01 and branch scope: Branch B cannot see Branch A trainer/booking
- Actual Result: Branch B trainer visible; Branch A trainer absent
- Status: **PASS**

![Open Branch B receptionist trainer choices](./downstream-26-branch-b-trainer-scope.png)


## Issues Found

None detected in executed checks.

## Final Result

**PASS**. 26/26 UI steps passed. Last phase: Downstream receptionist UI. Scope is the recorded scenarios, not complete acceptance of every exception flow.

Run: node tests/e2e/pt/business-20260920.cjs

Browser page errors: []

Prior run evidence (retained before rerun):
- [2026-09-20T17-18-18-603Z](./history/2026-09-20T17-18-18-603Z/PT01-US03-test.md)
- [2026-09-20T17-20-05-663Z](./history/2026-09-20T17-20-05-663Z/PT01-US03-test.md)
- [2026-09-21T01-22-22-772Z](./history/2026-09-21T01-22-22-772Z/PT01-US03-test.md)

Group mode: true. Run with PT_E2E_GROUP=1 for group coverage.

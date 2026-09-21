# PT01-US03 - Isolated real UI business E2E

Run: 2026-09-20T17:18:59.616Z

Sources: docs/user-stories/pt/PT01-Lịch/PT01-US03 story (Main Flow, Field specification, Alternate/Exception Flows); docs/product-spec.md sections 4.2-4.6.

Database: paradise_test_6480_1789924698599; frontend: http://localhost:3000; real backend: http://127.0.0.1:49687/api/v1. Browser requests redirected with route.continue, no response mocks. Real API auth sessions. Shared configured DB receives no application writes. Scope: test artifacts only; mailbox/skill/source files unchanged by this runner.

All migrations present at startup applied: 001_create_tables.sql, 002_web_rebuild.sql, 003_mobile_preferences.sql, 004_device_sessions.sql, 005_remove_pt_certificates.sql, 006_boss_feedback_schema_upgrade.sql, 007_commission_configs_uniqueness_and_history.sql, 008_branch_default_commission_rate.sql, 009_pt_commission_payout_details.sql, 010_scheduled_package_freezes.sql, 011_pt_bookings_no_overlap_indexes.sql, 012_pt_commission_session_snapshot.sql, 013_pt_booking_participants.sql. Hashes recorded in results.json. Individual booking fixture.

Fixture: {"b1":"5fff575c-4005-4c6b-b688-82e978dc9a21","b2":"6d1870b8-ea1e-4d12-ae28-67f9d496fa52","member":{"id":"a683408e-4f48-4eae-ba60-625342f58524","account_id":"d9467629-1d08-4440-b46d-e46310c1ac00","home_branch_id":"5fff575c-4005-4c6b-b688-82e978dc9a21","member_code":"HV001","full_name":"Business Member A","phone":"0909000010","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"96a49754-8dfa-4eb1-8219-afe4e50f007c","created_at":"2026-09-20T17:18:19.982Z","updated_at":"2026-09-20T17:18:19.982Z","qr_code":"QR-HV001-0909000010","face_enrolled":false},"pt":{"id":"374981b1-e80b-4627-bc95-0de7a6dba50f","account_id":"58cfb69d-88ed-4ffc-b4b4-417edae56874","branch_id":"5fff575c-4005-4c6b-b688-82e978dc9a21","pt_code":"PT001","full_name":"Business Trainer A","phone":"0909000020","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-20T17:18:20.024Z","updated_at":"2026-09-20T17:18:20.024Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"pt2":{"id":"bc5682ca-7fbf-4274-8f0d-40ff273d9a55","account_id":"5c89828e-a991-49fb-b37b-cfa8187e40f2","branch_id":"6d1870b8-ea1e-4d12-ae28-67f9d496fa52","pt_code":"PT002","full_name":"Business Trainer B","phone":"0909000021","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-20T17:18:20.053Z","updated_at":"2026-09-20T17:18:20.053Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"registration":{"id":"2a490e03-9913-4f54-a63f-d717f69dce61","reg_code":"DK002","member_id":"a683408e-4f48-4eae-ba60-625342f58524","package_id":"b53d3225-440d-4a5a-9f6e-bdd689d3448c","assigned_pt_id":"374981b1-e80b-4627-bc95-0de7a6dba50f","sold_branch_id":"5fff575c-4005-4c6b-b688-82e978dc9a21","previous_registration_id":null,"package_name_snapshot":"Business PT 90","package_type_snapshot":"PT_SESSION","price_snapshot":1000000,"duration_days_snapshot":60,"total_gym_sessions_snapshot":null,"total_pt_sessions_snapshot":5,"start_date":"2026-09-21","end_date":"2026-11-20","remaining_gym_sessions":null,"remaining_pt_sessions":5,"booked_pt_sessions":0,"used_pt_sessions":0,"status":"ACTIVE","created_by":"96a49754-8dfa-4eb1-8219-afe4e50f007c","created_at":"2026-09-20T17:18:21.190Z","updated_at":"2026-09-20T17:18:21.246Z","gym_price_snapshot":0,"pt_price_snapshot":1000000,"combo_price_snapshot":0,"package_mode":"INDIVIDUAL","max_group_members_snapshot":null,"is_frozen":false,"freeze_days_total":0,"group_leader_member_id":null,"has_scheduled_freeze":false,"registration_code":"DK002","member":{"id":"a683408e-4f48-4eae-ba60-625342f58524","account_id":"d9467629-1d08-4440-b46d-e46310c1ac00","home_branch_id":"5fff575c-4005-4c6b-b688-82e978dc9a21","member_code":"HV001","full_name":"Business Member A","phone":"0909000010","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"96a49754-8dfa-4eb1-8219-afe4e50f007c","created_at":"2026-09-20T17:18:19.982Z","updated_at":"2026-09-20T17:18:19.982Z","qr_code":"QR-HV001-0909000010","face_enrolled":false},"member_name":"Business Member A","member_code":"HV001","member_phone":"0909000010","allowed_branches":[{"id":"5fff575c-4005-4c6b-b688-82e978dc9a21","branch_code":"Business Branch A","branch_name":"Business Branch A","phone":"0909999999","address":"Isolated E2E","status":"ACTIVE","open_time":"00:00:00","close_time":"23:59:00","timezone":"Asia/Ho_Chi_Minh","created_at":"2026-09-20T17:18:19.487Z","updated_at":"2026-09-20T17:18:19.487Z","gate_config":{"duplicate_seconds":60,"daily_gym_deduction_limit":1},"default_pt_commission_percentage":20}],"assigned_pt":{"id":"374981b1-e80b-4627-bc95-0de7a6dba50f","account_id":"58cfb69d-88ed-4ffc-b4b4-417edae56874","branch_id":"5fff575c-4005-4c6b-b688-82e978dc9a21","pt_code":"PT001","full_name":"Business Trainer A","phone":"0909000020","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-20T17:18:20.024Z","updated_at":"2026-09-20T17:18:20.024Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"pt_name":"Business Trainer A","payments":[{"id":"a1f084a3-611f-491d-a2b4-74c009910856","registration_id":"2a490e03-9913-4f54-a63f-d717f69dce61","member_id":"a683408e-4f48-4eae-ba60-625342f58524","branch_id":"5fff575c-4005-4c6b-b688-82e978dc9a21","payment_code":"PAY002","payment_method":"CASH","amount":1000000,"status":"COMPLETED","transaction_ref":null,"collected_by":"96a49754-8dfa-4eb1-8219-afe4e50f007c","confirmed_at":"2026-09-20T17:18:21.209Z","created_at":"2026-09-20T17:18:21.209Z","updated_at":"2026-09-20T17:18:21.209Z","note":null,"expires_at":null,"discount_id":null,"discount_amount":0}],"created_by_name":"0909000002","freezes":[],"transfers":[],"progress":{"elapsed_days":0,"remaining_days":60,"total_days":60,"checkins":0,"total_pt_sessions":5,"used_pt_sessions":0,"booked_pt_sessions":0,"remaining_pt_sessions":5}},"date":"2026-09-22","groupMode":false}

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

### Select paid assigned contract

- Action / Input: Select paid assigned contract
- Expected Result: Main Flow 4: duration comes from API contract and is readonly
- Actual Result: 90 minutes; contract selected
- Status: **PASS**

![Select paid assigned contract](./step-09-contract-duration.png)

### Enter 08:00 start time

- Action / Input: Enter 08:00 start time
- Expected Result: Main Flow 4: 90 minutes produces readonly 09:30 end
- Actual Result: 08:00 - 09:30
- Status: **PASS**

![Enter 08:00 start time](./step-10-time-derived.png)

### Review filled form before submit

- Action / Input: Review filled form before submit
- Expected Result: Main Flow 5: chosen member, contract, date/time and note visible before save
- Actual Result: {"pt_name":"Business Trainer A · PT001","branch_name":"Business Branch A","member_id":"a683408e-4f48-4eae-ba60-625342f58524","registration_id":"2a490e03-9913-4f54-a63f-d717f69dce61","date":"2026-09-22","start_time":"08:00","duration_display":"90 phút","end_time":"09:30","contract_rights":"Từ 21/09/2026 · Đến 20/11/2026 · 5 buổi khả dụng","participants":"Business Member A · HV001","note":"business-20260920 own PT UI booking"}
- Status: **PASS**

![Review filled form before submit](./step-11-presubmit-filled-form.png)

### Submit booking and view own calendar

- Action / Input: Submit booking and view own calendar
- Expected Result: Main Flow 8-9: real POST creates booking, closes modal, selects date and refreshes calendar
- Actual Result: booking_id=b68f8a8c-fc57-4859-828b-5745962245c3; 08:00 - 09:30
90 PHÚT
Đã đặt
b68f8a8c-fc57-4859-828b-5745962245c3
Business Member A
 Business PT 90
 Business Branch A
Lịch cũ chưa lưu danh sách người tham gia.
Chưa đến giờ tập
business-20260920 own PT UI booking
- Status: **PASS**

![Submit booking and view own calendar](./step-14-booking-success-own-calendar.png)

## State Verification

- **PASS** Actual browser booking POST: {"status":200,"body":{"registration_id":"2a490e03-9913-4f54-a63f-d717f69dce61","member_id":"a683408e-4f48-4eae-ba60-625342f58524","pt_id":"374981b1-e80b-4627-bc95-0de7a6dba50f","branch_id":"5fff575c-4005-4c6b-b688-82e978dc9a21","booking_date":"2026-09-22","start_time":"08:00","end_time":"09:30","session_duration_minutes":90,"workout_notes":"business-20260920 own PT UI booking"},"bookingId":"b68f8a8c-fc57-4859-828b-5745962245c3"}
- **PASS** Atomic reservation counters: "remaining=4, booked=1, used=0; total=5"
- **PASS** PT2 attempts PT1 contract: {"status":403,"body":{"success":false,"message":"Bạn không có quyền thực hiện thao tác này hoặc dữ liệu nằm ngoài phạm vi chi nhánh.","code":"FORBIDDEN"},"before":1,"after":1}
- **PASS** PT1 forges PT2 id: {"status":403,"body":{"success":false,"message":"Bạn không có quyền thực hiện thao tác này hoặc dữ liệu nằm ngoài phạm vi chi nhánh.","code":"FORBIDDEN"},"before":1,"after":1}
- **PASS** PT1 forges foreign branch: {"status":403,"body":{"success":false,"message":"Bạn không có quyền thực hiện thao tác này hoặc dữ liệu nằm ngoài phạm vi chi nhánh.","code":"FORBIDDEN"},"before":1,"after":1}

### Inspect filled booking modal at 360px

- Action / Input: Inspect filled booking modal at 360px
- Expected Result: Requested responsive nonoverlap: modal in viewport, content stays above action toolbar
- Actual Result: {"box":{"x":12,"y":72,"width":336,"height":700.59375},"content":{"x":13,"y":134,"width":334,"height":580.59375},"toolbar":{"x":13,"y":714.59375,"width":334,"height":57}}
- Status: **PASS**

![Inspect filled booking modal at 360px](./step-12-booking-modal-responsive-360.png)

### Inspect filled booking modal at 1440px

- Action / Input: Inspect filled booking modal at 1440px
- Expected Result: Requested responsive nonoverlap: modal in viewport, content stays above action toolbar
- Actual Result: {"box":{"x":460,"y":82,"width":520,"height":737},"content":{"x":461,"y":144,"width":518,"height":617},"toolbar":{"x":461,"y":761,"width":518,"height":57}}
- Status: **PASS**

![Inspect filled booking modal at 1440px](./step-13-booking-modal-responsive-1440.png)

### Inspect PT calendar at 360px

- Action / Input: Inspect PT calendar at 360px
- Expected Result: Requested responsive nonoverlap: card and fixed navigation do not intersect; no page overflow
- Actual Result: {"card":{"x":16,"y":496.390625,"width":328,"height":254.5},"nav":{"x":0,"y":776,"width":360,"height":68},"overflow":false}
- Status: **PASS**

![Inspect PT calendar at 360px](./step-15-responsive-360.png)

### Inspect PT calendar at 390px

- Action / Input: Inspect PT calendar at 390px
- Expected Result: Requested responsive nonoverlap: card and fixed navigation do not intersect; no page overflow
- Actual Result: {"card":{"x":16,"y":496.390625,"width":358,"height":217},"nav":{"x":0,"y":776,"width":390,"height":68},"overflow":false}
- Status: **PASS**

![Inspect PT calendar at 390px](./step-16-responsive-390.png)

### Inspect PT calendar at 768px

- Action / Input: Inspect PT calendar at 768px
- Expected Result: Requested responsive nonoverlap: card and fixed navigation do not intersect; no page overflow
- Actual Result: {"card":{"x":20,"y":502.265625,"width":728,"height":199},"nav":{"x":0,"y":776,"width":768,"height":68},"overflow":false}
- Status: **PASS**

![Inspect PT calendar at 768px](./step-17-responsive-768.png)

### Inspect PT calendar at 1440px

- Action / Input: Inspect PT calendar at 1440px
- Expected Result: Requested responsive nonoverlap: card and fixed navigation do not intersect; no page overflow
- Actual Result: {"card":{"x":280,"y":502.265625,"width":880,"height":199},"nav":{"x":0,"y":832,"width":1440,"height":68},"overflow":false}
- Status: **PASS**

![Inspect PT calendar at 1440px](./step-18-responsive-1440.png)

## Cross-Role / Downstream Verification

### Open authenticated member training schedule

- Action / Input: Open authenticated member training schedule
- Expected Result: Main Flow 9: same created booking visible to its member
- Actual Result: booking_id=b68f8a8c-fc57-4859-828b-5745962245c3; 22/9/2026 · 08:00 - 09:30
Đã đặt

Business Branch A

PT: Business Trainer A

Business Member A · Business PT 90

Hủy lịch
Xác nhận hoàn thành
- Status: **PASS**

![Open authenticated member training schedule](./downstream-19-hv-same-booking.png)

### Open same booking in receptionist schedule

- Action / Input: Open same booking in receptionist schedule
- Expected Result: Main Flow 9: same booking appears in authorized branch Web UI
- Actual Result: booking_id=b68f8a8c-fc57-4859-828b-5745962245c3; Hội viên:
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

![Open same booking in receptionist schedule](./downstream-20-lt-same-booking.png)

### Open Branch B receptionist trainer choices

- Action / Input: Open Branch B receptionist trainer choices
- Expected Result: EF-01 and branch scope: Branch B cannot see Branch A trainer/booking
- Actual Result: Branch B trainer visible; Branch A trainer absent
- Status: **PASS**

![Open Branch B receptionist trainer choices](./downstream-21-branch-b-trainer-scope.png)


## Issues Found

None detected in executed checks.

## Final Result

**PASS**. 21/21 UI steps passed. Last phase: Downstream receptionist UI. Scope is the recorded scenarios, not complete acceptance of every exception flow.

Run: node tests/e2e/pt/business-20260920.cjs

Browser page errors: []

Prior run evidence (retained before rerun):
- [2026-09-20T17-14-43-339Z](./history/2026-09-20T17-14-43-339Z/PT01-US03-test.md)
- [2026-09-20T17-15-20-193Z](./history/2026-09-20T17-15-20-193Z/PT01-US03-test.md)
- [2026-09-20T17-18-18-600Z](./history/2026-09-20T17-18-18-600Z/PT01-US03-test.md)

Group mode: false. Run with PT_E2E_GROUP=1 for group coverage.

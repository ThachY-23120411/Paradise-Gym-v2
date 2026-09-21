# PT01-US02 - Isolated real UI business E2E

Run: 2026-09-20T17:16:18.223Z

Sources: docs/user-stories/pt/PT01-Lịch/PT01-US02 story (Main Flow, Field specification, Alternate/Exception Flows); docs/product-spec.md sections 4.2-4.6.

Database: paradise_test_10780_1789924520193; frontend: http://localhost:3000; real backend: http://127.0.0.1:54239/api/v1. Browser requests redirected with route.continue, no response mocks. Real API auth sessions. Shared configured DB receives no application writes. Scope: test artifacts only; mailbox/skill/source files unchanged by this runner.

All migrations present at startup applied: 001_create_tables.sql, 002_web_rebuild.sql, 003_mobile_preferences.sql, 004_device_sessions.sql, 005_remove_pt_certificates.sql, 006_boss_feedback_schema_upgrade.sql, 007_commission_configs_uniqueness_and_history.sql, 008_branch_default_commission_rate.sql, 009_pt_commission_payout_details.sql, 010_scheduled_package_freezes.sql, 011_pt_bookings_no_overlap_indexes.sql, 012_pt_commission_session_snapshot.sql, 013_pt_booking_participants.sql. Hashes recorded in results.json. Individual booking fixture.

Fixture: {"b1":"6e047c4f-8b80-41ac-8f36-24df89e77cac","b2":"46934740-f1cc-462a-b133-ac582d66fe35","member":{"id":"99268d26-c2d1-4d6e-bd29-672e7ca9a58e","account_id":"b4619d54-559f-4bb8-909b-72b6eddbbe09","home_branch_id":"6e047c4f-8b80-41ac-8f36-24df89e77cac","member_code":"HV001","full_name":"Business Member A","phone":"0909000010","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"d98d5743-e3dc-4b2d-b8b5-8f46b3ac1dc5","created_at":"2026-09-20T17:15:21.624Z","updated_at":"2026-09-20T17:15:21.624Z","qr_code":"QR-HV001-0909000010","face_enrolled":false},"pt":{"id":"527bc78d-76ab-4ffb-a5af-c05d210004f6","account_id":"f04a0544-e4fb-4ffc-b951-d33b3bcd7964","branch_id":"6e047c4f-8b80-41ac-8f36-24df89e77cac","pt_code":"PT001","full_name":"Business Trainer A","phone":"0909000020","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-20T17:15:21.667Z","updated_at":"2026-09-20T17:15:21.667Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"pt2":{"id":"5680fd73-6e21-4721-ab98-6c265d525037","account_id":"60928dcc-14f6-4667-b3bf-35a68d0395a9","branch_id":"46934740-f1cc-462a-b133-ac582d66fe35","pt_code":"PT002","full_name":"Business Trainer B","phone":"0909000021","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-20T17:15:21.691Z","updated_at":"2026-09-20T17:15:21.691Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"registration":{"id":"be05bf6a-5936-4ebf-bce6-7eec4067bfb6","reg_code":"DK002","member_id":"99268d26-c2d1-4d6e-bd29-672e7ca9a58e","package_id":"3222d886-9aa8-45d6-be22-5f1fe07c4121","assigned_pt_id":"527bc78d-76ab-4ffb-a5af-c05d210004f6","sold_branch_id":"6e047c4f-8b80-41ac-8f36-24df89e77cac","previous_registration_id":null,"package_name_snapshot":"Business PT 90","package_type_snapshot":"PT_SESSION","price_snapshot":1000000,"duration_days_snapshot":60,"total_gym_sessions_snapshot":null,"total_pt_sessions_snapshot":5,"start_date":"2026-09-21","end_date":"2026-11-20","remaining_gym_sessions":null,"remaining_pt_sessions":5,"booked_pt_sessions":0,"used_pt_sessions":0,"status":"ACTIVE","created_by":"d98d5743-e3dc-4b2d-b8b5-8f46b3ac1dc5","created_at":"2026-09-20T17:15:22.950Z","updated_at":"2026-09-20T17:15:23.023Z","gym_price_snapshot":0,"pt_price_snapshot":1000000,"combo_price_snapshot":0,"package_mode":"INDIVIDUAL","max_group_members_snapshot":null,"is_frozen":false,"freeze_days_total":0,"group_leader_member_id":null,"has_scheduled_freeze":false,"registration_code":"DK002","member":{"id":"99268d26-c2d1-4d6e-bd29-672e7ca9a58e","account_id":"b4619d54-559f-4bb8-909b-72b6eddbbe09","home_branch_id":"6e047c4f-8b80-41ac-8f36-24df89e77cac","member_code":"HV001","full_name":"Business Member A","phone":"0909000010","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"d98d5743-e3dc-4b2d-b8b5-8f46b3ac1dc5","created_at":"2026-09-20T17:15:21.624Z","updated_at":"2026-09-20T17:15:21.624Z","qr_code":"QR-HV001-0909000010","face_enrolled":false},"member_name":"Business Member A","member_code":"HV001","member_phone":"0909000010","allowed_branches":[{"id":"6e047c4f-8b80-41ac-8f36-24df89e77cac","branch_code":"Business Branch A","branch_name":"Business Branch A","phone":"0909999999","address":"Isolated E2E","status":"ACTIVE","open_time":"00:00:00","close_time":"23:59:00","timezone":"Asia/Ho_Chi_Minh","created_at":"2026-09-20T17:15:20.927Z","updated_at":"2026-09-20T17:15:20.927Z","gate_config":{"duplicate_seconds":60,"daily_gym_deduction_limit":1},"default_pt_commission_percentage":20}],"assigned_pt":{"id":"527bc78d-76ab-4ffb-a5af-c05d210004f6","account_id":"f04a0544-e4fb-4ffc-b951-d33b3bcd7964","branch_id":"6e047c4f-8b80-41ac-8f36-24df89e77cac","pt_code":"PT001","full_name":"Business Trainer A","phone":"0909000020","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-20T17:15:21.667Z","updated_at":"2026-09-20T17:15:21.667Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"pt_name":"Business Trainer A","payments":[{"id":"399c578b-d745-4255-a50a-6efa2eae488e","registration_id":"be05bf6a-5936-4ebf-bce6-7eec4067bfb6","member_id":"99268d26-c2d1-4d6e-bd29-672e7ca9a58e","branch_id":"6e047c4f-8b80-41ac-8f36-24df89e77cac","payment_code":"PAY002","payment_method":"CASH","amount":1000000,"status":"COMPLETED","transaction_ref":null,"collected_by":"d98d5743-e3dc-4b2d-b8b5-8f46b3ac1dc5","confirmed_at":"2026-09-20T17:15:22.976Z","created_at":"2026-09-20T17:15:22.976Z","updated_at":"2026-09-20T17:15:22.976Z","note":null,"expires_at":null,"discount_id":null,"discount_amount":0}],"created_by_name":"0909000002","freezes":[],"transfers":[],"progress":{"elapsed_days":0,"remaining_days":60,"total_days":60,"checkins":0,"total_pt_sessions":5,"used_pt_sessions":0,"booked_pt_sessions":0,"remaining_pt_sessions":5}},"date":"2026-09-22","groupMode":false,"confirmationFixture":{"bookingId":"c5b907c7-2999-41fe-8613-1ceae80b0d4c","pastDate":"2026-09-18","setup":"Created a second booking through real PT API; isolated SQL moves its date to previous working day and registration starts to that date. No source/UI clock override, no fabricated confirmation or counters. Original PT01-US03 booking stays future."}}

## Source Action Verification

### Select past working-day session

- Action / Input: Select past working-day session
- Expected Result: PT01-US02 Preconditions: assigned session has ended and neither party confirmed
- Actual Result: booking_id=c5b907c7-2999-41fe-8613-1ceae80b0d4c; 10:00 - 11:30
90 PHÚT
Đã đặt
c5b907c7-2999-41fe-8613-1ceae80b0d4c
Business Member A
 Business PT 90
 Business Branch A
Lịch cũ chưa lưu danh sách người tham gia.
Xác nhận hoàn thành
- Status: **PASS**

![Select past working-day session](./step-01-past-session-calendar.png)

### Open PT confirmation modal

- Action / Input: Open PT confirmation modal
- Expected Result: Main Flow 2-3: session/member/package prefill and completion result
- Actual Result: Ghi nhận kết quả buổi PT
Ca tập: Buổi 2 (c5b907c7) · 10:00 - 11:30, 18/09/2026
Học viên: Business Member A (HV001) · Business PT 90
Chi nhánh: Business Branch A
Kết quả buổi tập *
Hoàn thành (Đạt chỉ tiêu buổi tập)
Ghi chú đánh giá thể lực & bài tập
 Trạng thái: Chờ xác nhận của PT và hội viên. Không trừ thêm buổi đã giữ khi đặt lịch.
Hủy bỏ
	
Lưu kết quả
- Status: **PASS**

![Open PT confirmation modal](./step-02-pt-confirmation-modal.png)

### Enter workout assessment before saving

- Action / Input: Enter workout assessment before saving
- Expected Result: Main Flow 4: optional PT notes retained in input before submit
- Actual Result: Squat 3x10; completed with stable form; recovery advised.
- Status: **PASS**

![Enter workout assessment before saving](./step-03-pt-notes-before-submit.png)

### Save PT result and view pending member state

- Action / Input: Save PT result and view pending member state
- Expected Result: Main Flow 6-8: PT-only confirmation waits for member and does not consume another session
- Actual Result: 10:00 - 11:30
90 PHÚT
Chờ xác nhận
c5b907c7-2999-41fe-8613-1ceae80b0d4c
Business Member A
 Business PT 90
 Business Branch A
Lịch cũ chưa lưu danh sách người tham gia.
 Chờ Hội viên xác nhận
Squat 3x10; completed with stable form; recovery advised.
- Status: **PASS**

![Save PT result and view pending member state](./step-04-pt-confirmed-awaiting-member.png)

## State Verification

- **PASS** Documented past fixture baseline: {"remaining_pt_sessions":3,"booked_pt_sessions":2,"used_pt_sessions":0,"total_pt_sessions_snapshot":5}
- **PASS** After PT-only confirmation: {"status":"PENDING_COMPLETION","notes":"Squat 3x10; completed with stable form; recovery advised.","counters":{"remaining_pt_sessions":3,"booked_pt_sessions":2,"used_pt_sessions":0,"total_pt_sessions_snapshot":5}}
- **PASS** After both confirmations: no second remaining deduction: {"remaining_pt_sessions":3,"booked_pt_sessions":1,"used_pt_sessions":1,"total_pt_sessions_snapshot":5}
- **PASS** AF-03 retry pt-confirm: {"status":200,"payload":{"success":true,"data":{"booking":{"id":"c5b907c7-2999-41fe-8613-1ceae80b0d4c","registration_id":"be05bf6a-5936-4ebf-bce6-7eec4067bfb6","member_id":"99268d26-c2d1-4d6e-bd29-672e7ca9a58e","pt_id":"527bc78d-76ab-4ffb-a5af-c05d210004f6","branch_id":"6e047c4f-8b80-41ac-8f36-24df89e77cac","session_number":2,"booking_date":"2026-09-18","start_time":"10:00:00","end_time":"11:30:00","status":"COMPLETED","workout_notes":"Squat 3x10; completed with stable form; recovery advised.","fitness_assessment":null,"cancelled_by":null,"cancel_reason":null,"cancelled_at":null,"pt_confirmed_at":"2026-09-20T17:16:04.802Z","member_confirmed_at":"2026-09-20T17:16:12.039Z","is_deducted":true,"created_by":"f04a0544-e4fb-4ffc-b951-d33b3bcd7964","created_at":"2026-09-20T17:15:58.053Z","updated_at":"2026-09-20T17:16:12.036Z","session_duration_minutes":90,"substitute_pt_id":null},"is_completed":true},"message":"Success"},"counters":{"remaining_pt_sessions":3,"booked_pt_sessions":1,"used_pt_sessions":1,"total_pt_sessions_snapshot":5}}
- **PASS** AF-03 retry member-confirm: {"status":200,"payload":{"success":true,"data":{"booking":{"id":"c5b907c7-2999-41fe-8613-1ceae80b0d4c","registration_id":"be05bf6a-5936-4ebf-bce6-7eec4067bfb6","member_id":"99268d26-c2d1-4d6e-bd29-672e7ca9a58e","pt_id":"527bc78d-76ab-4ffb-a5af-c05d210004f6","branch_id":"6e047c4f-8b80-41ac-8f36-24df89e77cac","session_number":2,"booking_date":"2026-09-18","start_time":"10:00:00","end_time":"11:30:00","status":"COMPLETED","workout_notes":"Squat 3x10; completed with stable form; recovery advised.","fitness_assessment":null,"cancelled_by":null,"cancel_reason":null,"cancelled_at":null,"pt_confirmed_at":"2026-09-20T17:16:04.802Z","member_confirmed_at":"2026-09-20T17:16:12.039Z","is_deducted":true,"created_by":"f04a0544-e4fb-4ffc-b951-d33b3bcd7964","created_at":"2026-09-20T17:15:58.053Z","updated_at":"2026-09-20T17:16:12.036Z","session_duration_minutes":90,"substitute_pt_id":null},"is_completed":true},"message":"Success"},"counters":{"remaining_pt_sessions":3,"booked_pt_sessions":1,"used_pt_sessions":1,"total_pt_sessions_snapshot":5}}
- **PASS** Repeated confirmations do not deduct twice: {"remaining_pt_sessions":3,"booked_pt_sessions":1,"used_pt_sessions":1,"total_pt_sessions_snapshot":5}

### Refresh PT calendar after member confirms

- Action / Input: Refresh PT calendar after member confirms
- Expected Result: Main Flow 8: completed card readonly and persisted PT notes visible
- Actual Result: 10:00 - 11:30
90 PHÚT
Buổi 2 · Đã hoàn thành
c5b907c7-2999-41fe-8613-1ceae80b0d4c
Business Member A
 Business PT 90
 Business Branch A
Lịch cũ chưa lưu danh sách người tham gia.
 Bài tập: Squat 3x10; completed with stable form; recovery advised.
Đã đủ 2 chiều xác nhận • Đã trừ 1 buổi
- Status: **PASS**

![Refresh PT calendar after member confirms](./step-08-pt-dual-confirmation-refresh.png)

## Cross-Role / Downstream Verification

### Open same member session after PT confirms

- Action / Input: Open same member session after PT confirms
- Expected Result: Main Flow 7: same booking awaits member confirmation
- Actual Result: booking_id=c5b907c7-2999-41fe-8613-1ceae80b0d4c; 18/9/2026 · 10:00 - 11:30
Chờ xác nhận

Business Branch A

PT: Business Trainer A

Business Member A · Business PT 90

PT đã xác nhận kết quả
Xác nhận hoàn thành ngay
- Status: **PASS**

![Open same member session after PT confirms](./downstream-05-hv-awaiting-confirmation.png)

### Open member confirmation dialog

- Action / Input: Open member confirmation dialog
- Expected Result: Main Flow 7: same member confirms their completed session
- Actual Result: Xác nhận hoàn thành

Buổi tập với PT Business Trainer A lúc 10:00 - 11:30, 18/9/2026.

 PT đã xác nhận hoàn thành kết quả

Hệ thống sẽ trừ chính xác 1 buổi trong gói tập của bạn sau khi cả bạn và PT cùng hoàn tất xác nhận kép.

Xác nhận hoàn thành
- Status: **PASS**

![Open member confirmation dialog](./downstream-06-hv-confirmation-modal.png)

### Submit member confirmation

- Action / Input: Submit member confirmation
- Expected Result: Main Flow 7: dual confirmation completes exactly the same booking
- Actual Result: 18/9/2026 · 10:00 - 11:30
Đã hoàn thành

Business Branch A

PT: Business Trainer A

Business Member A · Business PT 90

Đã hoàn tất xác nhận kép
- Status: **PASS**

![Submit member confirmation](./downstream-07-hv-dual-confirmed-completed.png)

### Open completed booking in receptionist UI

- Action / Input: Open completed booking in receptionist UI
- Expected Result: Cross-role synchronization: same session completed and notes retained
- Actual Result: booking_id=c5b907c7-2999-41fe-8613-1ceae80b0d4c; Hội viên:
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
18/9/2026
Khung giờ:
10:00 - 11:30
Trạng thái:
Hoàn thành
PT xác nhận:
00:16:04 21/9/2026
Hội viên xác nhận:
00:16:12 21/9/2026
Khấu trừ buổi:
Đã khấu trừ
Ghi chú cho buổi:
Squat 3x10; completed with stable form; recovery advised.
Buổi số:
2
Nội dung bài tập:
Squat 3x10; completed with stable form; recovery advised.
- Status: **PASS**

![Open completed booking in receptionist UI](./downstream-09-lt-completed-same-session.png)


## Issues Found

None detected in executed checks.

## Final Result

**PASS**. 9/9 UI steps passed. Last phase: AF-03 repeated confirmation API checks. Scope is the recorded scenarios, not complete acceptance of every exception flow.

Run: node tests/e2e/pt/business-20260920.cjs

Browser page errors: []

Prior run evidence (retained before rerun):
- [2026-09-20T17-15-58-025Z](./history/2026-09-20T17-15-58-025Z/PT01-US02-test.md)

Group mode: false. Run with PT_E2E_GROUP=1 for group coverage.

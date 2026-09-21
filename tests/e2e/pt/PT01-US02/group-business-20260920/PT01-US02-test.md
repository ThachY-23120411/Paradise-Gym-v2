# PT01-US02 - Isolated real UI business E2E

Run: 2026-09-21T01:23:50.722Z

Sources: docs/user-stories/pt/PT01-Lịch/PT01-US02 story (Main Flow, Field specification, Alternate/Exception Flows); docs/product-spec.md sections 4.2-4.6.

Database: paradise_test_4400_1789953742772; frontend: http://localhost:3000; real backend: http://127.0.0.1:63185/api/v1. Browser requests redirected with route.continue, no response mocks. Real API auth sessions. Shared configured DB receives no application writes. Scope: test artifacts only; mailbox/skill/source files unchanged by this runner.

All migrations present at startup applied: 001_create_tables.sql, 002_web_rebuild.sql, 003_mobile_preferences.sql, 004_device_sessions.sql, 005_remove_pt_certificates.sql, 006_boss_feedback_schema_upgrade.sql, 007_commission_configs_uniqueness_and_history.sql, 008_branch_default_commission_rate.sql, 009_pt_commission_payout_details.sql, 010_scheduled_package_freezes.sql, 011_pt_bookings_no_overlap_indexes.sql, 012_pt_commission_session_snapshot.sql, 013_pt_booking_participants.sql. Hashes recorded in results.json. Group fixture: leader + ACCEPTED member; PENDING member excluded. SQL fixture setup is confined to the new isolated database. Participant Gym expiry is temporarily changed only for EF-02.

Fixture: {"b1":"76970b78-ac1c-4958-845b-e5566d73a171","b2":"ff3a8fde-eab3-427f-9e74-5243053201e6","member":{"id":"ef84340d-851b-4bd1-8237-e2c01021da85","account_id":"b5c610b7-0b6b-45c6-8ffa-bf69c4cbc609","home_branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","member_code":"HV001","full_name":"Business Member A","phone":"0909000010","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"80abe2d2-463d-4a5a-9619-82ace562ecb8","created_at":"2026-09-21T01:22:24.174Z","updated_at":"2026-09-21T01:22:24.174Z","qr_code":"QR-HV001-0909000010","face_enrolled":false},"pt":{"id":"5d19ac36-6776-4127-ad23-4b140b3c424a","account_id":"95bb7698-726b-4ce0-a1e2-14c5d178c079","branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","pt_code":"PT001","full_name":"Business Trainer A","phone":"0909000020","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-21T01:22:24.211Z","updated_at":"2026-09-21T01:22:24.211Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"pt2":{"id":"8ff49190-1933-476d-a254-9ea21b926930","account_id":"51718108-6207-4020-8976-fbd6ad57ee1b","branch_id":"ff3a8fde-eab3-427f-9e74-5243053201e6","pt_code":"PT002","full_name":"Business Trainer B","phone":"0909000021","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-21T01:22:24.236Z","updated_at":"2026-09-21T01:22:24.236Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"registration":{"id":"8261d77e-a68a-4bd0-b94f-6ac8a36a661d","reg_code":"DK002","member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","package_id":"05f481ed-e2a9-49d2-8eda-2c3bbcde17a7","assigned_pt_id":"5d19ac36-6776-4127-ad23-4b140b3c424a","sold_branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","previous_registration_id":null,"package_name_snapshot":"Business PT 90","package_type_snapshot":"PT_SESSION","price_snapshot":1000000,"duration_days_snapshot":60,"total_gym_sessions_snapshot":null,"total_pt_sessions_snapshot":5,"start_date":"2026-09-21","end_date":"2026-11-20","remaining_gym_sessions":null,"remaining_pt_sessions":5,"booked_pt_sessions":0,"used_pt_sessions":0,"status":"ACTIVE","created_by":"80abe2d2-463d-4a5a-9619-82ace562ecb8","created_at":"2026-09-21T01:22:25.428Z","updated_at":"2026-09-21T01:22:25.485Z","gym_price_snapshot":0,"pt_price_snapshot":1000000,"combo_price_snapshot":0,"package_mode":"GROUP_1_N","max_group_members_snapshot":3,"is_frozen":false,"freeze_days_total":0,"group_leader_member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","has_scheduled_freeze":false,"registration_code":"DK002","member":{"id":"ef84340d-851b-4bd1-8237-e2c01021da85","account_id":"b5c610b7-0b6b-45c6-8ffa-bf69c4cbc609","home_branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","member_code":"HV001","full_name":"Business Member A","phone":"0909000010","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"80abe2d2-463d-4a5a-9619-82ace562ecb8","created_at":"2026-09-21T01:22:24.174Z","updated_at":"2026-09-21T01:22:24.174Z","qr_code":"QR-HV001-0909000010","face_enrolled":false},"member_name":"Business Member A","member_code":"HV001","member_phone":"0909000010","allowed_branches":[{"id":"76970b78-ac1c-4958-845b-e5566d73a171","branch_code":"Business Branch A","branch_name":"Business Branch A","phone":"0909999999","address":"Isolated E2E","status":"ACTIVE","open_time":"00:00:00","close_time":"23:59:00","timezone":"Asia/Ho_Chi_Minh","created_at":"2026-09-21T01:22:23.500Z","updated_at":"2026-09-21T01:22:23.500Z","gate_config":{"duplicate_seconds":60,"daily_gym_deduction_limit":1},"default_pt_commission_percentage":20}],"assigned_pt":{"id":"5d19ac36-6776-4127-ad23-4b140b3c424a","account_id":"95bb7698-726b-4ce0-a1e2-14c5d178c079","branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","pt_code":"PT001","full_name":"Business Trainer A","phone":"0909000020","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-21T01:22:24.211Z","updated_at":"2026-09-21T01:22:24.211Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"pt_name":"Business Trainer A","payments":[{"id":"5cc70303-7ae7-4931-91b4-69a0728fb15b","registration_id":"8261d77e-a68a-4bd0-b94f-6ac8a36a661d","member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","payment_code":"PAY002","payment_method":"CASH","amount":1000000,"status":"COMPLETED","transaction_ref":null,"collected_by":"80abe2d2-463d-4a5a-9619-82ace562ecb8","confirmed_at":"2026-09-21T01:22:25.448Z","created_at":"2026-09-21T01:22:25.448Z","updated_at":"2026-09-21T01:22:25.448Z","note":null,"expires_at":null,"discount_id":null,"discount_amount":0}],"created_by_name":"0909000002","freezes":[],"transfers":[],"progress":{"elapsed_days":0,"remaining_days":60,"total_days":60,"checkins":0,"total_pt_sessions":5,"used_pt_sessions":0,"booked_pt_sessions":0,"remaining_pt_sessions":5}},"date":"2026-09-22","groupMode":true,"accepted":{"id":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","account_id":"ad89fb74-6620-42d7-baa6-af8c497b094d","home_branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","member_code":"HV002","full_name":"Business Accepted Member","phone":"0909000011","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"80abe2d2-463d-4a5a-9619-82ace562ecb8","created_at":"2026-09-21T01:22:25.524Z","updated_at":"2026-09-21T01:22:25.524Z","qr_code":"QR-HV002-0909000011","face_enrolled":false},"pending":{"id":"a5d6e251-c8be-4637-abd7-67db47984dc8","account_id":"8e6beed0-f90e-43b4-9d91-2a5c2f87c25f","home_branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","member_code":"HV003","full_name":"Business Pending Member","phone":"0909000012","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"80abe2d2-463d-4a5a-9619-82ace562ecb8","created_at":"2026-09-21T01:22:25.539Z","updated_at":"2026-09-21T01:22:25.539Z","qr_code":"QR-HV003-0909000012","face_enrolled":false},"acceptedGym":{"id":"a9efebdb-0600-4b06-a5a4-2b59e3ce9fff","reg_code":"DK003","member_id":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","package_id":"7f25232b-7f67-48aa-bd2b-c3240e9002e2","assigned_pt_id":null,"sold_branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","previous_registration_id":null,"package_name_snapshot":"Business Gym","package_type_snapshot":"GYM_SESSION","price_snapshot":500000,"duration_days_snapshot":60,"total_gym_sessions_snapshot":20,"total_pt_sessions_snapshot":null,"start_date":"2026-09-21","end_date":"2026-11-20","remaining_gym_sessions":20,"remaining_pt_sessions":null,"booked_pt_sessions":0,"used_pt_sessions":0,"status":"PENDING_PAYMENT","created_by":"80abe2d2-463d-4a5a-9619-82ace562ecb8","created_at":"2026-09-21T01:22:25.915Z","updated_at":"2026-09-21T01:22:25.915Z","gym_price_snapshot":500000,"pt_price_snapshot":0,"combo_price_snapshot":0,"package_mode":"INDIVIDUAL","max_group_members_snapshot":null,"is_frozen":false,"freeze_days_total":0,"group_leader_member_id":null},"confirmationFixture":{"bookingId":"30b18cc0-15dc-4b51-95d2-ae047d7d12c5","pastDate":"2026-09-18","entitlementIds":["4bbb9774-c6cc-4e6f-8d00-5efbeb6b4d7e","a9efebdb-0600-4b06-a5a4-2b59e3ce9fff","8261d77e-a68a-4bd0-b94f-6ac8a36a661d"],"paidAt":"2026-09-18T07:00:00+07:00","setup":"Second booking created through real PT API. Isolated SQL moves booking date to previous working day; shifts linked PT and every snapshot participant Gym validity window together, preserving duration; aligns completed payment created/confirmed timestamps and receipt issued_at to 07:00 before the 10:00 session. Booking owner, registration, transaction marker and all participant snapshot rows remain byte-for-byte equivalent as asserted. No fabricated confirmation/counters or UI clock override; actual UI confirmation remains under test. Original PT01-US03 booking stays future.","paymentGuard":"Only completed_payment_immutable temporarily disabled inside isolated fixture transaction for timestamp adjustment, then re-enabled and asserted before UI confirmation. All other constraints and all participant snapshot guards remain active."}}

## Source Action Verification

### Open PT schedule from overview

- Action / Input: Open PT schedule from overview
- Expected Result: PT01-US02 Trigger: authenticated PT selects schedule before finding a session
- Actual Result: Own PT calendar visible
- Status: **PASS**

![Open PT schedule from overview](./step-01-open-confirmation-calendar.png)

### Select past working-day session

- Action / Input: Select past working-day session
- Expected Result: PT01-US02 Preconditions: assigned session has ended and neither party confirmed
- Actual Result: booking_id=30b18cc0-15dc-4b51-95d2-ae047d7d12c5; 10:00 - 11:30
90 PHÚT
Đã đặt
30b18cc0-15dc-4b51-95d2-ae047d7d12c5
Business Member A
 Business PT 90
 Business Branch A
Thành viên tham gia: Business Member A · HV001; Business Accepted Member · HV002
Xác nhận hoàn thành
- Status: **PASS**

![Select past working-day session](./step-02-past-session-calendar.png)

### Open PT confirmation modal

- Action / Input: Open PT confirmation modal
- Expected Result: Main Flow 2-3: session/member/package prefill and completion result
- Actual Result: Ghi nhận kết quả buổi PT
Ca tập: Buổi 2 (30b18cc0) · 10:00 - 11:30, 18/09/2026
Học viên: Business Member A (HV001) · Business PT 90
Chi nhánh: Business Branch A
Kết quả buổi tập *
Hoàn thành (Đạt chỉ tiêu buổi tập)
Ghi chú đánh giá thể lực & bài tập
 Trạng thái: Chờ xác nhận của PT và hội viên. Không trừ thêm buổi đã giữ khi đặt lịch.
Hủy bỏ
	
Lưu kết quả
- Status: **PASS**

![Open PT confirmation modal](./step-03-pt-confirmation-modal.png)

### Enter workout assessment before saving

- Action / Input: Enter workout assessment before saving
- Expected Result: Main Flow 4: optional PT notes retained in input before submit
- Actual Result: Squat 3x10; completed with stable form; recovery advised.
- Status: **PASS**

![Enter workout assessment before saving](./step-04-pt-notes-before-submit.png)

### Save PT result and view pending member state

- Action / Input: Save PT result and view pending member state
- Expected Result: Main Flow 6-8: PT-only confirmation waits for member and does not consume another session
- Actual Result: 10:00 - 11:30
90 PHÚT
Chờ xác nhận
30b18cc0-15dc-4b51-95d2-ae047d7d12c5
Business Member A
 Business PT 90
 Business Branch A
Thành viên tham gia: Business Member A · HV001; Business Accepted Member · HV002
 Chờ Hội viên xác nhận
Squat 3x10; completed with stable form; recovery advised.
- Status: **PASS**

![Save PT result and view pending member state](./step-05-pt-confirmed-awaiting-member.png)

## State Verification

- **PASS** Historical entitlement/payment consistency and unchanged participant snapshot: {"entitlements":[{"id":"4bbb9774-c6cc-4e6f-8d00-5efbeb6b4d7e","member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","package_type_snapshot":"GYM_SESSION","start_date":"2026-09-18","end_date":"2026-11-17"},{"id":"a9efebdb-0600-4b06-a5a4-2b59e3ce9fff","member_id":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","package_type_snapshot":"GYM_SESSION","start_date":"2026-09-18","end_date":"2026-11-17"},{"id":"8261d77e-a68a-4bd0-b94f-6ac8a36a661d","member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","package_type_snapshot":"PT_SESSION","start_date":"2026-09-18","end_date":"2026-11-17"}],"payments":[{"id":"b74a9f07-aa25-401a-8048-7ecb7b5f4c61","registration_id":"4bbb9774-c6cc-4e6f-8d00-5efbeb6b4d7e","created_at":"2026-09-18T00:00:00.000Z","confirmed_at":"2026-09-18T00:00:00.000Z","issued_at":"2026-09-18T00:00:00.000Z"},{"id":"5cc70303-7ae7-4931-91b4-69a0728fb15b","registration_id":"8261d77e-a68a-4bd0-b94f-6ac8a36a661d","created_at":"2026-09-18T00:00:00.000Z","confirmed_at":"2026-09-18T00:00:00.000Z","issued_at":"2026-09-18T00:00:00.000Z"},{"id":"32d56404-f0b5-4f8f-8cc9-918433d23418","registration_id":"a9efebdb-0600-4b06-a5a4-2b59e3ce9fff","created_at":"2026-09-18T00:00:00.000Z","confirmed_at":"2026-09-18T00:00:00.000Z","issued_at":"2026-09-18T00:00:00.000Z"}],"identity":{"member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","registration_id":"8261d77e-a68a-4bd0-b94f-6ac8a36a661d","participants_snapshot_xid":"152856"},"snapshot":[{"booking_id":"30b18cc0-15dc-4b51-95d2-ae047d7d12c5","member_id":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","is_leader":false,"created_at":"2026-09-21T01:23:15.908Z"},{"booking_id":"30b18cc0-15dc-4b51-95d2-ae047d7d12c5","member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","is_leader":true,"created_at":"2026-09-21T01:23:15.908Z"}]}
- **PASS** Documented past fixture baseline: {"remaining_pt_sessions":3,"booked_pt_sessions":2,"used_pt_sessions":0,"total_pt_sessions_snapshot":5}
- **PASS** After PT-only confirmation: {"status":"PENDING_COMPLETION","notes":"Squat 3x10; completed with stable form; recovery advised.","counters":{"remaining_pt_sessions":3,"booked_pt_sessions":2,"used_pt_sessions":0,"total_pt_sessions_snapshot":5}}
- **PASS** Nonleader member-confirm denied: {"bookingId":"30b18cc0-15dc-4b51-95d2-ae047d7d12c5","memberId":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","status":403,"payload":{"success":false,"message":"Bạn không có quyền thực hiện thao tác này hoặc dữ liệu nằm ngoài phạm vi chi nhánh.","code":"FORBIDDEN"}}
- **PASS** Nonleader cancel denied: {"bookingId":"30b18cc0-15dc-4b51-95d2-ae047d7d12c5","memberId":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","status":403,"payload":{"success":false,"message":"Bạn không có quyền thực hiện thao tác này hoặc dữ liệu nằm ngoài phạm vi chi nhánh.","code":"FORBIDDEN"}}
- **PASS** After both confirmations: no second remaining deduction: {"remaining_pt_sessions":3,"booked_pt_sessions":1,"used_pt_sessions":1,"total_pt_sessions_snapshot":5}
- **PASS** Nonleader member-confirm denied: {"bookingId":"30b18cc0-15dc-4b51-95d2-ae047d7d12c5","memberId":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","status":403,"payload":{"success":false,"message":"Bạn không có quyền thực hiện thao tác này hoặc dữ liệu nằm ngoài phạm vi chi nhánh.","code":"FORBIDDEN"}}
- **PASS** Nonleader cancel denied: {"bookingId":"30b18cc0-15dc-4b51-95d2-ae047d7d12c5","memberId":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","status":403,"payload":{"success":false,"message":"Bạn không có quyền thực hiện thao tác này hoặc dữ liệu nằm ngoài phạm vi chi nhánh.","code":"FORBIDDEN"}}
- **PASS** AF-03 retry pt-confirm: {"status":200,"payload":{"success":true,"data":{"booking":{"id":"30b18cc0-15dc-4b51-95d2-ae047d7d12c5","registration_id":"8261d77e-a68a-4bd0-b94f-6ac8a36a661d","member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","pt_id":"5d19ac36-6776-4127-ad23-4b140b3c424a","branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","session_number":2,"booking_date":"2026-09-18","start_time":"10:00:00","end_time":"11:30:00","status":"COMPLETED","workout_notes":"Squat 3x10; completed with stable form; recovery advised.","fitness_assessment":null,"cancelled_by":null,"cancel_reason":null,"cancelled_at":null,"pt_confirmed_at":"2026-09-21T01:23:24.016Z","member_confirmed_at":"2026-09-21T01:23:38.074Z","is_deducted":true,"created_by":"95bb7698-726b-4ce0-a1e2-14c5d178c079","created_at":"2026-09-21T01:23:15.908Z","updated_at":"2026-09-21T01:23:38.072Z","session_duration_minutes":90,"substitute_pt_id":null},"is_completed":true},"message":"Success"},"counters":{"remaining_pt_sessions":3,"booked_pt_sessions":1,"used_pt_sessions":1,"total_pt_sessions_snapshot":5}}
- **PASS** AF-03 retry member-confirm: {"status":200,"payload":{"success":true,"data":{"booking":{"id":"30b18cc0-15dc-4b51-95d2-ae047d7d12c5","registration_id":"8261d77e-a68a-4bd0-b94f-6ac8a36a661d","member_id":"ef84340d-851b-4bd1-8237-e2c01021da85","pt_id":"5d19ac36-6776-4127-ad23-4b140b3c424a","branch_id":"76970b78-ac1c-4958-845b-e5566d73a171","session_number":2,"booking_date":"2026-09-18","start_time":"10:00:00","end_time":"11:30:00","status":"COMPLETED","workout_notes":"Squat 3x10; completed with stable form; recovery advised.","fitness_assessment":null,"cancelled_by":null,"cancel_reason":null,"cancelled_at":null,"pt_confirmed_at":"2026-09-21T01:23:24.016Z","member_confirmed_at":"2026-09-21T01:23:38.074Z","is_deducted":true,"created_by":"95bb7698-726b-4ce0-a1e2-14c5d178c079","created_at":"2026-09-21T01:23:15.908Z","updated_at":"2026-09-21T01:23:38.072Z","session_duration_minutes":90,"substitute_pt_id":null},"is_completed":true},"message":"Success"},"counters":{"remaining_pt_sessions":3,"booked_pt_sessions":1,"used_pt_sessions":1,"total_pt_sessions_snapshot":5}}
- **PASS** Repeated confirmations do not deduct twice: {"remaining_pt_sessions":3,"booked_pt_sessions":1,"used_pt_sessions":1,"total_pt_sessions_snapshot":5}

### Refresh PT calendar after member confirms

- Action / Input: Refresh PT calendar after member confirms
- Expected Result: Main Flow 8: completed card readonly and persisted PT notes visible
- Actual Result: 10:00 - 11:30
90 PHÚT
Buổi 2 · Đã hoàn thành
30b18cc0-15dc-4b51-95d2-ae047d7d12c5
Business Member A
 Business PT 90
 Business Branch A
Thành viên tham gia: Business Member A · HV001; Business Accepted Member · HV002
 Bài tập: Squat 3x10; completed with stable form; recovery advised.
Đã đủ 2 chiều xác nhận • Đã trừ 1 buổi
- Status: **PASS**

![Refresh PT calendar after member confirms](./step-11-pt-dual-confirmation-refresh.png)

## Cross-Role / Downstream Verification

### Open same member session after PT confirms

- Action / Input: Open same member session after PT confirms
- Expected Result: Main Flow 7: same booking awaits member confirmation
- Actual Result: booking_id=30b18cc0-15dc-4b51-95d2-ae047d7d12c5; 18/9/2026 · 10:00 - 11:30
Chờ xác nhận

Business Branch A

PT: Business Trainer A

Business Member A · Business PT 90

PT đã xác nhận kết quả
Xác nhận hoàn thành ngay
- Status: **PASS**

![Open same member session after PT confirms](./downstream-06-hv-awaiting-confirmation.png)

### Open accepted nonleader schedule for same booking

- Action / Input: Open accepted nonleader schedule for same booking
- Expected Result: PT01-US01/03: snapshot participant can view same booking, only leader may confirm or cancel
- Actual Result: {"bookingId":"30b18cc0-15dc-4b51-95d2-ae047d7d12c5","viewer":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","text":"18/9/2026 · 10:00 - 11:30\nChờ xác nhận\n\nBusiness Branch A\n\nPT: Business Trainer A\n\nBusiness Member A · Business PT 90\n\nTrưởng nhóm đại diện xác nhận và hủy lịch"}
- Status: **PASS**

![Open accepted nonleader schedule for same booking](./downstream-07-accepted-member-same-booking.png)

### Open member confirmation dialog

- Action / Input: Open member confirmation dialog
- Expected Result: Main Flow 7: same member confirms their completed session
- Actual Result: Xác nhận hoàn thành

Buổi tập với PT Business Trainer A lúc 10:00 - 11:30, 18/9/2026.

 PT đã xác nhận hoàn thành kết quả

Hệ thống sẽ trừ chính xác 1 buổi trong gói tập của bạn sau khi cả bạn và PT cùng hoàn tất xác nhận kép.

Xác nhận hoàn thành
- Status: **PASS**

![Open member confirmation dialog](./downstream-08-hv-confirmation-modal.png)

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

![Submit member confirmation](./downstream-09-hv-dual-confirmed-completed.png)

### Open accepted nonleader schedule for same booking

- Action / Input: Open accepted nonleader schedule for same booking
- Expected Result: PT01-US01/03: snapshot participant can view same booking, only leader may confirm or cancel
- Actual Result: {"bookingId":"30b18cc0-15dc-4b51-95d2-ae047d7d12c5","viewer":"e6b85edb-b3ce-4fd0-90ae-cf3f138b75fe","text":"18/9/2026 · 10:00 - 11:30\nĐã hoàn thành\n\nBusiness Branch A\n\nPT: Business Trainer A\n\nBusiness Member A · Business PT 90\n\nĐã hoàn tất xác nhận kép"}
- Status: **PASS**

![Open accepted nonleader schedule for same booking](./downstream-10-accepted-member-same-booking.png)

### Open completed booking in receptionist UI

- Action / Input: Open completed booking in receptionist UI
- Expected Result: Cross-role synchronization: same session completed and notes retained
- Actual Result: booking_id=30b18cc0-15dc-4b51-95d2-ae047d7d12c5; Hội viên:
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
08:23:24 21/9/2026
Hội viên xác nhận:
08:23:38 21/9/2026
Khấu trừ buổi:
Đã khấu trừ
Ghi chú cho buổi:
Squat 3x10; completed with stable form; recovery advised.
Buổi số:
2
Nội dung bài tập:
Squat 3x10; completed with stable form; recovery advised.
- Status: **PASS**

![Open completed booking in receptionist UI](./downstream-12-lt-completed-same-session.png)


## Issues Found

None detected in executed checks.

## Final Result

**PASS**. 12/12 UI steps passed. Last phase: AF-03 repeated confirmation API checks. Scope is the recorded scenarios, not complete acceptance of every exception flow.

Run: node tests/e2e/pt/business-20260920.cjs

Browser page errors: []

Prior run evidence (retained before rerun):
- [2026-09-20T17-19-10-136Z](./history/2026-09-20T17-19-10-136Z/PT01-US02-test.md)
- [2026-09-20T17-20-51-713Z](./history/2026-09-20T17-20-51-713Z/PT01-US02-test.md)
- [2026-09-21T01-23-15-889Z](./history/2026-09-21T01-23-15-889Z/PT01-US02-test.md)

Group mode: true. Run with PT_E2E_GROUP=1 for group coverage.

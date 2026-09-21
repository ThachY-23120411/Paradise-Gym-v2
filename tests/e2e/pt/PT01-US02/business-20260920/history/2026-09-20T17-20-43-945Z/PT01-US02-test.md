# PT01-US02 - Isolated real UI business E2E

Run: 2026-09-20T17:19:01.402Z

Sources: docs/user-stories/pt/PT01-Lịch/PT01-US02 story (Main Flow, Field specification, Alternate/Exception Flows); docs/product-spec.md sections 4.2-4.6.

Database: paradise_test_6480_1789924698599; frontend: http://localhost:3000; real backend: http://127.0.0.1:49687/api/v1. Browser requests redirected with route.continue, no response mocks. Real API auth sessions. Shared configured DB receives no application writes. Scope: test artifacts only; mailbox/skill/source files unchanged by this runner.

All migrations present at startup applied: 001_create_tables.sql, 002_web_rebuild.sql, 003_mobile_preferences.sql, 004_device_sessions.sql, 005_remove_pt_certificates.sql, 006_boss_feedback_schema_upgrade.sql, 007_commission_configs_uniqueness_and_history.sql, 008_branch_default_commission_rate.sql, 009_pt_commission_payout_details.sql, 010_scheduled_package_freezes.sql, 011_pt_bookings_no_overlap_indexes.sql, 012_pt_commission_session_snapshot.sql, 013_pt_booking_participants.sql. Hashes recorded in results.json. Individual booking fixture.

Fixture: {"b1":"5fff575c-4005-4c6b-b688-82e978dc9a21","b2":"6d1870b8-ea1e-4d12-ae28-67f9d496fa52","member":{"id":"a683408e-4f48-4eae-ba60-625342f58524","account_id":"d9467629-1d08-4440-b46d-e46310c1ac00","home_branch_id":"5fff575c-4005-4c6b-b688-82e978dc9a21","member_code":"HV001","full_name":"Business Member A","phone":"0909000010","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"96a49754-8dfa-4eb1-8219-afe4e50f007c","created_at":"2026-09-20T17:18:19.982Z","updated_at":"2026-09-20T17:18:19.982Z","qr_code":"QR-HV001-0909000010","face_enrolled":false},"pt":{"id":"374981b1-e80b-4627-bc95-0de7a6dba50f","account_id":"58cfb69d-88ed-4ffc-b4b4-417edae56874","branch_id":"5fff575c-4005-4c6b-b688-82e978dc9a21","pt_code":"PT001","full_name":"Business Trainer A","phone":"0909000020","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-20T17:18:20.024Z","updated_at":"2026-09-20T17:18:20.024Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"pt2":{"id":"bc5682ca-7fbf-4274-8f0d-40ff273d9a55","account_id":"5c89828e-a991-49fb-b37b-cfa8187e40f2","branch_id":"6d1870b8-ea1e-4d12-ae28-67f9d496fa52","pt_code":"PT002","full_name":"Business Trainer B","phone":"0909000021","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-20T17:18:20.053Z","updated_at":"2026-09-20T17:18:20.053Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"registration":{"id":"2a490e03-9913-4f54-a63f-d717f69dce61","reg_code":"DK002","member_id":"a683408e-4f48-4eae-ba60-625342f58524","package_id":"b53d3225-440d-4a5a-9f6e-bdd689d3448c","assigned_pt_id":"374981b1-e80b-4627-bc95-0de7a6dba50f","sold_branch_id":"5fff575c-4005-4c6b-b688-82e978dc9a21","previous_registration_id":null,"package_name_snapshot":"Business PT 90","package_type_snapshot":"PT_SESSION","price_snapshot":1000000,"duration_days_snapshot":60,"total_gym_sessions_snapshot":null,"total_pt_sessions_snapshot":5,"start_date":"2026-09-21","end_date":"2026-11-20","remaining_gym_sessions":null,"remaining_pt_sessions":5,"booked_pt_sessions":0,"used_pt_sessions":0,"status":"ACTIVE","created_by":"96a49754-8dfa-4eb1-8219-afe4e50f007c","created_at":"2026-09-20T17:18:21.190Z","updated_at":"2026-09-20T17:18:21.246Z","gym_price_snapshot":0,"pt_price_snapshot":1000000,"combo_price_snapshot":0,"package_mode":"INDIVIDUAL","max_group_members_snapshot":null,"is_frozen":false,"freeze_days_total":0,"group_leader_member_id":null,"has_scheduled_freeze":false,"registration_code":"DK002","member":{"id":"a683408e-4f48-4eae-ba60-625342f58524","account_id":"d9467629-1d08-4440-b46d-e46310c1ac00","home_branch_id":"5fff575c-4005-4c6b-b688-82e978dc9a21","member_code":"HV001","full_name":"Business Member A","phone":"0909000010","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"96a49754-8dfa-4eb1-8219-afe4e50f007c","created_at":"2026-09-20T17:18:19.982Z","updated_at":"2026-09-20T17:18:19.982Z","qr_code":"QR-HV001-0909000010","face_enrolled":false},"member_name":"Business Member A","member_code":"HV001","member_phone":"0909000010","allowed_branches":[{"id":"5fff575c-4005-4c6b-b688-82e978dc9a21","branch_code":"Business Branch A","branch_name":"Business Branch A","phone":"0909999999","address":"Isolated E2E","status":"ACTIVE","open_time":"00:00:00","close_time":"23:59:00","timezone":"Asia/Ho_Chi_Minh","created_at":"2026-09-20T17:18:19.487Z","updated_at":"2026-09-20T17:18:19.487Z","gate_config":{"duplicate_seconds":60,"daily_gym_deduction_limit":1},"default_pt_commission_percentage":20}],"assigned_pt":{"id":"374981b1-e80b-4627-bc95-0de7a6dba50f","account_id":"58cfb69d-88ed-4ffc-b4b4-417edae56874","branch_id":"5fff575c-4005-4c6b-b688-82e978dc9a21","pt_code":"PT001","full_name":"Business Trainer A","phone":"0909000020","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-20T17:18:20.024Z","updated_at":"2026-09-20T17:18:20.024Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"pt_name":"Business Trainer A","payments":[{"id":"a1f084a3-611f-491d-a2b4-74c009910856","registration_id":"2a490e03-9913-4f54-a63f-d717f69dce61","member_id":"a683408e-4f48-4eae-ba60-625342f58524","branch_id":"5fff575c-4005-4c6b-b688-82e978dc9a21","payment_code":"PAY002","payment_method":"CASH","amount":1000000,"status":"COMPLETED","transaction_ref":null,"collected_by":"96a49754-8dfa-4eb1-8219-afe4e50f007c","confirmed_at":"2026-09-20T17:18:21.209Z","created_at":"2026-09-20T17:18:21.209Z","updated_at":"2026-09-20T17:18:21.209Z","note":null,"expires_at":null,"discount_id":null,"discount_amount":0}],"created_by_name":"0909000002","freezes":[],"transfers":[],"progress":{"elapsed_days":0,"remaining_days":60,"total_days":60,"checkins":0,"total_pt_sessions":5,"used_pt_sessions":0,"booked_pt_sessions":0,"remaining_pt_sessions":5}},"date":"2026-09-22","groupMode":false}

## Source Action Verification

### Blocked at Confirmation fixture

- Action / Input: Blocked at Confirmation fixture
- Expected Result: Complete the requested real UI flow
- Actual Result: Completed payments are immutable
- Status: **FAIL**

![Blocked at Confirmation fixture](./step-01-blocker.png)

## State Verification




## Cross-Role / Downstream Verification

BLOCKED: source/setup did not reach downstream checks.

## Issues Found

- Confirmation fixture: error: Completed payments are immutable
    at E:\Desktop\para\backend\node_modules\pg\lib\client.js:694:17
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async confirmFlow (E:\Desktop\para\tests\e2e\pt\business-20260920.cjs:343:5)
    at async main (E:\Desktop\para\tests\e2e\pt\business-20260920.cjs:296:3)
- Blocked at Confirmation fixture: Completed payments are immutable

## Final Result

**BLOCKED**. 0/1 UI steps passed. Last phase: Confirmation fixture. Scope is the recorded scenarios, not complete acceptance of every exception flow.

Run: node tests/e2e/pt/business-20260920.cjs

Browser page errors: []

Prior run evidence (retained before rerun):
- [2026-09-20T17-15-58-025Z](./history/2026-09-20T17-15-58-025Z/PT01-US02-test.md)
- [2026-09-20T17-18-59-629Z](./history/2026-09-20T17-18-59-629Z/PT01-US02-test.md)

Group mode: false. Run with PT_E2E_GROUP=1 for group coverage.

# PT01-US03 - Isolated real UI business E2E

Run: 2026-09-20T17:14:49.177Z

Sources: docs/user-stories/pt/PT01-Lịch/PT01-US03 story (Main Flow, Field specification, Alternate/Exception Flows); docs/product-spec.md sections 4.2-4.6.

Database: paradise_test_34152_1789924483339; frontend: http://localhost:3000; real backend: http://127.0.0.1:61133/api/v1. Browser requests redirected with route.continue, no response mocks. Real API auth sessions. Shared configured DB receives no application writes. Scope: test artifacts only; mailbox/skill/source files unchanged by this runner.

All migrations present at startup applied: 001_create_tables.sql, 002_web_rebuild.sql, 003_mobile_preferences.sql, 004_device_sessions.sql, 005_remove_pt_certificates.sql, 006_boss_feedback_schema_upgrade.sql, 007_commission_configs_uniqueness_and_history.sql, 008_branch_default_commission_rate.sql, 009_pt_commission_payout_details.sql, 010_scheduled_package_freezes.sql, 011_pt_bookings_no_overlap_indexes.sql, 012_pt_commission_session_snapshot.sql, 013_pt_booking_participants.sql. Hashes recorded in results.json. Individual booking fixture.

Fixture: {"b1":"f0e875b3-6293-463b-a5fa-9d58cc1f493f","b2":"2a80062d-840c-4464-bd88-3d0e5a9010fd","member":{"id":"02309ff8-e0d6-4216-9d12-665be917c226","account_id":"37abeef0-d181-418d-9c9e-42568015a3f8","home_branch_id":"f0e875b3-6293-463b-a5fa-9d58cc1f493f","member_code":"HV001","full_name":"Business Member A","phone":"0909000010","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"5eed06f7-5ae7-421b-9db8-1d0993c32633","created_at":"2026-09-20T17:14:44.711Z","updated_at":"2026-09-20T17:14:44.711Z","qr_code":"QR-HV001-0909000010","face_enrolled":false},"pt":{"id":"e48e3f82-3476-46af-9f96-f22103128763","account_id":"61e8b404-c6e6-412b-afa6-10359f6e1ea0","branch_id":"f0e875b3-6293-463b-a5fa-9d58cc1f493f","pt_code":"PT001","full_name":"Business Trainer A","phone":"0909000020","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-20T17:14:44.751Z","updated_at":"2026-09-20T17:14:44.751Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"pt2":{"id":"e323e1f3-f374-4b49-ae04-6a22d5a6d3f8","account_id":"52d27988-8101-4f90-a01c-1e525e82a793","branch_id":"2a80062d-840c-4464-bd88-3d0e5a9010fd","pt_code":"PT002","full_name":"Business Trainer B","phone":"0909000021","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-20T17:14:44.777Z","updated_at":"2026-09-20T17:14:44.777Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"registration":{"id":"274666c9-5e21-4248-b8cb-009de255f0fe","reg_code":"DK002","member_id":"02309ff8-e0d6-4216-9d12-665be917c226","package_id":"4cbf4a21-3c99-4767-ab57-9b3ef61d9f24","assigned_pt_id":"e48e3f82-3476-46af-9f96-f22103128763","sold_branch_id":"f0e875b3-6293-463b-a5fa-9d58cc1f493f","previous_registration_id":null,"package_name_snapshot":"Business PT 90","package_type_snapshot":"PT_SESSION","price_snapshot":1000000,"duration_days_snapshot":60,"total_gym_sessions_snapshot":null,"total_pt_sessions_snapshot":5,"start_date":"2026-09-21","end_date":"2026-11-20","remaining_gym_sessions":null,"remaining_pt_sessions":5,"booked_pt_sessions":0,"used_pt_sessions":0,"status":"ACTIVE","created_by":"5eed06f7-5ae7-421b-9db8-1d0993c32633","created_at":"2026-09-20T17:14:46.097Z","updated_at":"2026-09-20T17:14:46.153Z","gym_price_snapshot":0,"pt_price_snapshot":1000000,"combo_price_snapshot":0,"package_mode":"INDIVIDUAL","max_group_members_snapshot":null,"is_frozen":false,"freeze_days_total":0,"group_leader_member_id":null,"has_scheduled_freeze":false,"registration_code":"DK002","member":{"id":"02309ff8-e0d6-4216-9d12-665be917c226","account_id":"37abeef0-d181-418d-9c9e-42568015a3f8","home_branch_id":"f0e875b3-6293-463b-a5fa-9d58cc1f493f","member_code":"HV001","full_name":"Business Member A","phone":"0909000010","email":null,"date_of_birth":null,"gender":null,"avatar_url":null,"status":"ACTIVE","created_by":"5eed06f7-5ae7-421b-9db8-1d0993c32633","created_at":"2026-09-20T17:14:44.711Z","updated_at":"2026-09-20T17:14:44.711Z","qr_code":"QR-HV001-0909000010","face_enrolled":false},"member_name":"Business Member A","member_code":"HV001","member_phone":"0909000010","allowed_branches":[{"id":"f0e875b3-6293-463b-a5fa-9d58cc1f493f","branch_code":"Business Branch A","branch_name":"Business Branch A","phone":"0909999999","address":"Isolated E2E","status":"ACTIVE","open_time":"00:00:00","close_time":"23:59:00","timezone":"Asia/Ho_Chi_Minh","created_at":"2026-09-20T17:14:44.181Z","updated_at":"2026-09-20T17:14:44.181Z","gate_config":{"duplicate_seconds":60,"daily_gym_deduction_limit":1},"default_pt_commission_percentage":20}],"assigned_pt":{"id":"e48e3f82-3476-46af-9f96-f22103128763","account_id":"61e8b404-c6e6-412b-afa6-10359f6e1ea0","branch_id":"f0e875b3-6293-463b-a5fa-9d58cc1f493f","pt_code":"PT001","full_name":"Business Trainer A","phone":"0909000020","email":null,"gender":null,"bio":null,"specialties":"Strength","status":"ACTIVE","work_start_time":"08:00:00","work_end_time":"18:00:00","work_days":"MON_TO_FRI","created_at":"2026-09-20T17:14:44.751Z","updated_at":"2026-09-20T17:14:44.751Z","show_phone_to_members":false,"avatar_url":null,"face_enrolled":false,"bank_name":null,"bank_account_no":null,"bank_account_name":null},"pt_name":"Business Trainer A","payments":[{"id":"f0e6c46c-cc71-4514-922e-d86e710b0904","registration_id":"274666c9-5e21-4248-b8cb-009de255f0fe","member_id":"02309ff8-e0d6-4216-9d12-665be917c226","branch_id":"f0e875b3-6293-463b-a5fa-9d58cc1f493f","payment_code":"PAY002","payment_method":"CASH","amount":1000000,"status":"COMPLETED","transaction_ref":null,"collected_by":"5eed06f7-5ae7-421b-9db8-1d0993c32633","confirmed_at":"2026-09-20T17:14:46.118Z","created_at":"2026-09-20T17:14:46.118Z","updated_at":"2026-09-20T17:14:46.118Z","note":null,"expires_at":null,"discount_id":null,"discount_amount":0}],"created_by_name":"0909000002","freezes":[],"transfers":[],"progress":{"elapsed_days":0,"remaining_days":60,"total_days":60,"checkins":0,"total_pt_sessions":5,"used_pt_sessions":0,"booked_pt_sessions":0,"remaining_pt_sessions":5}},"date":"2026-09-22","groupMode":false}

## Source Action Verification

### Blocked at PT source UI

- Action / Input: Blocked at PT source UI
- Expected Result: Complete the requested real UI flow
- Actual Result: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/mobile/pt/
Call log:
[2m  - navigating to "http://localhost:3000/mobile/pt/", waiting until "networkidle"[22m

- Status: **FAIL**

![Blocked at PT source UI](./step-01-blocker.png)

## State Verification




## Cross-Role / Downstream Verification

BLOCKED: source/setup did not reach downstream checks.

## Issues Found

- PT source UI: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/mobile/pt/
Call log:
[2m  - navigating to "http://localhost:3000/mobile/pt/", waiting until "networkidle"[22m

    at pageFor (E:\Desktop\para\tests\e2e\pt\business-20260920.cjs:103:14)
    at async main (E:\Desktop\para\tests\e2e\pt\business-20260920.cjs:160:16)
- Browser error: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.
- Blocked at PT source UI: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/mobile/pt/
Call log:
[2m  - navigating to "http://localhost:3000/mobile/pt/", waiting until "networkidle"[22m


## Final Result

**BLOCKED**. 0/1 UI steps passed. Last phase: PT source UI. Scope is the recorded scenarios, not complete acceptance of every exception flow.

Run: node tests/e2e/pt/business-20260920.cjs

Browser page errors: [{"url":"chrome-error://chromewebdata/","message":"Failed to read the 'localStorage' property from 'Window': Access is denied for this document."}]

Prior run evidence (retained before rerun):
- [2026-09-20T17-14-43-339Z](./history/2026-09-20T17-14-43-339Z/PT01-US03-test.md)

Group mode: false. Run with PT_E2E_GROUP=1 for group coverage.

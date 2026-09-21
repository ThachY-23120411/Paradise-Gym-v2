# Payment business documentation handoff - 2026-09-21

## Outcome

Completed 42 business documentation files, including 28 User Stories, in E:/Desktop/para. Preserved prior changes and existing story/file IDs. No backend, frontend, ERD, migration, seed or runtime changes by this documentation owner. Historical payment audit unchanged.

Applied [docs-sync](../../../.agents/rules/docs-sync.md) and [activity-diagram skill](../../../.agents/skills/activity-diagram/SKILL.md). Main plan: [payment ledger alignment](2026-09-21-payment-ledger-implementation-plan.md).

## Changes

| Area | Affected artifacts | Final rule |
| --- | --- | --- |
| Canonical rules | Product Spec, screen audit, open questions | Separate successful payments, payment_intents and pending registrations |
| Collection | QTV/LT W08 Epics, US01-US03 | Statusless successful ledger, 9 columns, two readonly KPIs; removed payment status filter/column and pending-order KPI |
| QR and reconciliation | W08-US02, HV03-US03 | QR expires after 15 minutes; manual BANK_TRANSFER requires transaction_ref, no CASH workaround; intentional simulation accepted for testing, no IPN required |
| Pending lifecycle | QTV/LT W04 Epics, US01-US04; HV03-US01/US03 | Preserve pending state/actions; explicit cancellation anytime while pending; no three-day auto-cancel; reissue QR on same registration |
| Freeze | QTV/LT W04-US06, list/detail, HV03-US01 | All roles: paid and currently effective ACTIVE/near-expiry only; reject unpaid/future SCHEDULED; distinguish scheduled freeze on already active contract |
| Near expiry | W01/W04/W14, K01, HV03/HV05, PT02 Epic/US01 | <=4 days OR <=3 sessions; Combo OR; API is_expiring/display_status=EXPIRING; underlying ACTIVE retained |
| Customer care | W01/W14 | Keep expired-last-14-days cohort separate; show applicable remaining days or sessions |
| Member history | HV03-US06 and US01 history field | Successful payments only, including actual CASH at counter and BANK_TRANSFER; no payment.status badge |

Source inspection only: customerCare summary/list and operations dashboard call listExpiring from registrationState.js. The legacy key expiring_soon_4days counts the helper result including session criteria; its name does not imply a day-only filter. No runtime/E2E claim from this inspection.

## Validation

Follow-up review requested by the user applies both activity-diagram and ui-docs-sync skills. The original static checker below did not check collisions between subgraph IDs and action IDs; its PASS is not evidence of Mermaid rendering correctness. See [follow-up review](2026-09-21-payment-docs-recheck.md) for corrections and the latest validation results.

- PASS: 28 touched US diagrams, 475 nodes, 477 edges, reloaded from disk. Checked declarations, balanced boundary/swimlanes, one initial, action arity, labeled decisions, merges/joins, final arity, reachability and final paths.
- The scoped in-session JavaScript checker adapts the existing docs validator for chained edges and quoted edge labels. Static topology only; no Mermaid rendering claim.
- PASS: node tests/docs/pt-diagrams.cjs: 16 stories, 16 diagrams, 361 nodes.
- PASS: scoped git diff --check; no whitespace errors.
- PASS: reloaded written content matched. Searched affected docs for obsolete payment controls/KPIs and near-expiry thresholds.
- Corrected creation/renewal persistence-before-navigation topology and explicit payment/cancellation/freeze paths; added missing Merge nodes in two touched notification diagrams.

| User Story | Nodes | Topology |
| --- | ---: | --- |
| HV03-US03 | 37 | PASS |
| QTV-W14-US01 | 13 | PASS |
| QTV-W08-US03 | 8 | PASS |
| QTV-W04-US03 | 23 | PASS |
| LT-W04-US03 | 23 | PASS |
| QTV-W01-US01 | 16 | PASS |
| QTV-W04-US06 | 19 | PASS |
| QTV-W04-US02 | 11 | PASS |
| LT-W01-US01 | 13 | PASS |
| LT-W14-US01 | 8 | PASS |
| LT-W08-US03 | 8 | PASS |
| LT-W08-US02 | 32 | PASS |
| LT-W08-US01 | 21 | PASS |
| HV03-US01 | 41 | PASS |
| LT-W07-US01 | 10 | PASS |
| PT02-US01 | 15 | PASS |
| QTV-W08-US02 | 32 | PASS |
| QTV-W08-US01 | 21 | PASS |
| QTV-W04-US04 | 8 | PASS |
| HV05-US01 | 11 | PASS |
| LT-W04-US02 | 11 | PASS |
| QTV-W07-US01 | 10 | PASS |
| QTV-W09-US01 | 21 | PASS |
| LT-W04-US04 | 8 | PASS |
| QTV-W04-US01 | 15 | PASS |
| LT-W04-US01 | 15 | PASS |
| HV03-US06 | 6 | PASS |
| LT-W04-US06 | 19 | PASS |

## Open Decision

PAY-OQ-01 remains unanswered: payment after the original registration period already ended. Current behavior preserves dates and returns EXPIRED. No approved rebasing and no unconditional ACTIVE/SCHEDULED guarantee. Staff/member payment diagrams include the expired-period branch; this does not settle the business question.

Main's broader PT runtime regression is separate. It was not reproduced or certified by this documentation owner; Main must retain separate findings/evidence. Documentation PASS does not certify backend regression, deployment or final cross-role UI acceptance. No backend restart performed here.

## Coordination

Read existing role mailboxes and later payment contract/readiness notes. Initially acknowledged receipts here because user restricted edits to business docs. User subsequently authorized the dedicated completion mailbox brain-anti3/2026-09-21-payment-business-docs-handoff.md. Other owners' messages/reports untouched.

## Changed Files

- [docs/epic/qtv/QTV-W08-Thu tiền & thanh toán.md](../../../docs/epic/qtv/QTV-W08-Thu tiền & thanh toán.md)
- [docs/user-stories/hoi-vien/HV03-Gói của tôi/HV03-US03-Mua gói và khởi tạo thanh toán Mobile.md](../../../docs/user-stories/hoi-vien/HV03-Gói của tôi/HV03-US03-Mua gói và khởi tạo thanh toán Mobile.md)
- [docs/user-stories/qtv/QTV-W14-Chăm sóc & thông báo/QTV-W14-US01-Quản lý tác nghiệp Chăm sóc khách hàng.md](../../../docs/user-stories/qtv/QTV-W14-Chăm sóc & thông báo/QTV-W14-US01-Quản lý tác nghiệp Chăm sóc khách hàng.md)
- [docs/epic/qtv/QTV-W04-Đăng ký & gia hạn.md](../../../docs/epic/qtv/QTV-W04-Đăng ký & gia hạn.md)
- [docs/user-stories/qtv/QTV-W08-Thu tiền & thanh toán/QTV-W08-US03-Xem thống kê.md](../../../docs/user-stories/qtv/QTV-W08-Thu tiền & thanh toán/QTV-W08-US03-Xem thống kê.md)
- [docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US03-Xem danh sách các đăng ký.md](../../../docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US03-Xem danh sách các đăng ký.md)
- [docs/epic/le-tan/README.md](../../../docs/epic/le-tan/README.md)
- [docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US03-Xem danh sách các đăng ký.md](../../../docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US03-Xem danh sách các đăng ký.md)
- [docs/epic/le-tan/LT-W14-Chăm sóc & thông báo.md](../../../docs/epic/le-tan/LT-W14-Chăm sóc & thông báo.md)
- [docs/user-stories/qtv/QTV-W01-Tổng quan vận hành/QTV-W01-US01-Xem tổng quan vận hành.md](../../../docs/user-stories/qtv/QTV-W01-Tổng quan vận hành/QTV-W01-US01-Xem tổng quan vận hành.md)
- [docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US06-Đóng băng gói tập.md](../../../docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US06-Đóng băng gói tập.md)
- [docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US02-Gia hạn đăng ký gói.md](../../../docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US02-Gia hạn đăng ký gói.md)
- [docs/user-stories/le-tan/LT-W01-Tổng quan vận hành/LT-W01-US01-Xem tổng quan vận hành.md](../../../docs/user-stories/le-tan/LT-W01-Tổng quan vận hành/LT-W01-US01-Xem tổng quan vận hành.md)
- [docs/epic/le-tan/LT-W04-Đăng ký & gia hạn.md](../../../docs/epic/le-tan/LT-W04-Đăng ký & gia hạn.md)
- [docs/user-stories/le-tan/LT-W14-Chăm sóc & thông báo/LT-W14-US01-Tác nghiệp Chăm sóc khách hàng tại quầy.md](../../../docs/user-stories/le-tan/LT-W14-Chăm sóc & thông báo/LT-W14-US01-Tác nghiệp Chăm sóc khách hàng tại quầy.md)
- [docs/epic/le-tan/LT-W08-Thu tiền & thanh toán.md](../../../docs/epic/le-tan/LT-W08-Thu tiền & thanh toán.md)
- [docs/epic/qtv/README.md](../../../docs/epic/qtv/README.md)
- [docs/user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US03-Xem thống kê.md](../../../docs/user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US03-Xem thống kê.md)
- [docs/user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US02-Tạo payment.md](../../../docs/user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US02-Tạo payment.md)
- [docs/user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US01-Xem danh sách payment.md](../../../docs/user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US01-Xem danh sách payment.md)
- [docs/epic/qtv/QTV-W14-Chăm sóc & thông báo.md](../../../docs/epic/qtv/QTV-W14-Chăm sóc & thông báo.md)
- [docs/user-stories/hoi-vien/HV03-Gói của tôi/HV03-US01-Xem gói, quyền lợi và tiến độ sử dụng.md](../../../docs/user-stories/hoi-vien/HV03-Gói của tôi/HV03-US01-Xem gói, quyền lợi và tiến độ sử dụng.md)
- [docs/user-stories/le-tan/LT-W07-Ra vào & check-in/LT-W07-US01-Xử lý check-in tự động qua thiết bị.md](../../../docs/user-stories/le-tan/LT-W07-Ra vào & check-in/LT-W07-US01-Xử lý check-in tự động qua thiết bị.md)
- [docs/user-stories/pt/PT02-Học viên/PT02-US01-Xem danh sách học viên được phân công.md](../../../docs/user-stories/pt/PT02-Học viên/PT02-US01-Xem danh sách học viên được phân công.md)
- [docs/epic/qtv/QTV-W01-Tổng quan vận hành.md](../../../docs/epic/qtv/QTV-W01-Tổng quan vận hành.md)
- [docs/epic/hoi-vien/HV03-Gói của tôi.md](../../../docs/epic/hoi-vien/HV03-Gói của tôi.md)
- [docs/user-stories/qtv/QTV-W08-Thu tiền & thanh toán/QTV-W08-US02-Tạo payment.md](../../../docs/user-stories/qtv/QTV-W08-Thu tiền & thanh toán/QTV-W08-US02-Tạo payment.md)
- [docs/open-questions.md](../../../docs/open-questions.md)
- [docs/user-stories/qtv/QTV-W08-Thu tiền & thanh toán/QTV-W08-US01-Xem danh sách payment.md](../../../docs/user-stories/qtv/QTV-W08-Thu tiền & thanh toán/QTV-W08-US01-Xem danh sách payment.md)
- [docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US04-Xem chi tiết lượt đăng ký gói.md](../../../docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US04-Xem chi tiết lượt đăng ký gói.md)
- [docs/user-stories/hoi-vien/HV05-Thông báo/HV05-US01-Xem và xử lý thông báo Hội viên.md](../../../docs/user-stories/hoi-vien/HV05-Thông báo/HV05-US01-Xem và xử lý thông báo Hội viên.md)
- [docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US02-Gia hạn đăng ký gói.md](../../../docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US02-Gia hạn đăng ký gói.md)
- [docs/user-stories/qtv/QTV-W07-Ra vào & check-in/QTV-W07-US01-Xử lý check-in tự động qua thiết bị.md](../../../docs/user-stories/qtv/QTV-W07-Ra vào & check-in/QTV-W07-US01-Xử lý check-in tự động qua thiết bị.md)
- [docs/user-stories/qtv/QTV-W09-Thông báo/QTV-W09-US01-Cấu hình thông báo tự động.md](../../../docs/user-stories/qtv/QTV-W09-Thông báo/QTV-W09-US01-Cấu hình thông báo tự động.md)
- [docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US04-Xem chi tiết lượt đăng ký gói.md](../../../docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US04-Xem chi tiết lượt đăng ký gói.md)
- [docs/ui-related-screen-audit.md](../../../docs/ui-related-screen-audit.md)
- [docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US01-Tạo đăng ký gói mới.md](../../../docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US01-Tạo đăng ký gói mới.md)
- [docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US01-Tạo đăng ký gói mới.md](../../../docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US01-Tạo đăng ký gói mới.md)
- [docs/product-spec.md](../../../docs/product-spec.md)
- [docs/user-stories/hoi-vien/HV03-Gói của tôi/HV03-US06-Xem lịch sử thanh toán.md](../../../docs/user-stories/hoi-vien/HV03-Gói của tôi/HV03-US06-Xem lịch sử thanh toán.md)
- [docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US06-Đóng băng gói tập.md](../../../docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US06-Đóng băng gói tập.md)
- [docs/epic/pt/PT02-Học viên.md](../../../docs/epic/pt/PT02-Học viên.md)

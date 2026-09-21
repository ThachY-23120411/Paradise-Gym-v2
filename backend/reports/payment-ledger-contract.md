# Payment ledger contract - 2026-09-21

Owner anti-4. UI and product documentation are owned by main/other agents.

- Registration operational `status` remains ACTIVE for near-expiry eligibility. DTO adds `display_status=EXPIRING` and `is_expiring=true` for currently effective paid registrations: GYM_TIME <=4 days; GYM_SESSION <=3 remaining gym sessions; PT_SESSION <=3 remaining PT sessions; COMBO <=4 days OR <=3 remaining PT sessions (and bounded gym sessions when present). Other display statuses match operational status. `GET /registrations?status=EXPIRING` filters this computed flag.
- Invoice response exposes canonical `payment_intent` and identical compatibility `payment`, containing `resource_type=PAYMENT_INTENT`, `state`, compatibility `status`, `is_settled=false`, and `expires_at`. States PENDING, EXPIRED, CANCELLED, COMPLETED (FAILED preserved for legacy data). Transfer expiry is 15 minutes. Registration remains PENDING_PAYMENT until settlement or manual cancellation. Existing qr_data/vietqr fields remain.
- Intent ID becomes the final payment ID on settlement. Confirm/simulate returns `{payment, registration, receipt, settled:true, is_settled:true}`. Final payment has resource_type=PAYMENT and is_settled=true but no status/state. Manual reconciliation remains BANK_TRANSFER and requires nonempty transaction_ref even with manual_confirmation=true; references are deduplicated. Simulation generates its own reference and remains intentionally available.
- GET /payments returns final immutable ledger entries only, no status/state. GET /payments/:id returns an intent with state/status/is_settled=false before settlement, or a final payment with is_settled=true afterwards. Existing receipt routes retain IDs.
- Freeze requires payment and currently effective ACTIVE registration for all roles. Pending and future scheduled registrations are blocked. Near-expiry remains eligible.
- Pending cancellation cancels open intents. Expired intents remain historical attempts and cannot settle.
- POST /payments/check-bank-status reports stored settlement flags and, only for unsettled attempts, intent state/status; provider_status remains NOT_CONFIGURED. POST /payments/:id/check-bank-status retains its existing 503 BANK_UNAVAILABLE contract. Neither claims live bank verification.
- GET /payments/stats returns cash_received and successful_payments only. Dashboard pending task counters are separate and retained.
- Registration list/detail, customer-care expiring list/summary, dashboard expiry count and existing check-in is_expiring_soon calculation use the central helper. Main now owns additional aliases on member detail/access logs/check-in and will rerun verification after its changes; these were not part of anti4's153-check result.
- Migration preserves completed payment/receipt IDs; no shared DB seed/reset. Backend integration verification uses disposable PostgreSQL.

Implementation: migration 014; shared effective-state helper; mounted core payment routes and all mounted report/payment consumers; seed/migration runners; isolated migration and API tests; ERD.

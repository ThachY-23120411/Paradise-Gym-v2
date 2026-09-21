const express = require('express');
const H = require('./http');
const {listExpiring}=require('./registrationState');
const { pool, route, fail, text, date, today, only, isStaff, role, scope, row, audit } = H;
const router = express.Router();

// GET /customer-care/summary - Tổng hợp các chỉ số CSKH và doanh thu hôm nay (cho W01 Dashboard & W14)
router.get('/customer-care/summary', route(async req => {
  role(req, 'QTV', 'RECEPTIONIST');
  const branchIds = scope(req);

  // 1. Sinh nhật hôm nay
  const birthdaysRes = await pool.query(`
    SELECT COUNT(*) AS count
    FROM member_profiles m
    WHERE ($1::uuid[] IS NULL OR m.home_branch_id = ANY($1))
      AND m.status = 'ACTIVE'
      AND m.date_of_birth IS NOT NULL
      AND EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM m.date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
  `, [branchIds]);

  // 2. Gói sắp hết hạn trong vòng 4 ngày tới (<= 4 ngày)
  const expiring = await listExpiring(pool,branchIds);

  // 3. Đăng ký mới hôm nay
  const newRegsRes = await pool.query(`
    SELECT COUNT(*) AS count
    FROM registrations r
    WHERE ($1::uuid[] IS NULL OR r.sold_branch_id = ANY($1))
      AND DATE(r.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = CURRENT_DATE
  `, [branchIds]);

  // 4. Doanh thu tiền mặt / thực thu hôm nay (TIỀN HÔM NAY)
  const todayCashRes = await pool.query(`
    SELECT COALESCE(SUM(p.amount), 0) AS total_cash
    FROM payments p
    WHERE ($1::uuid[] IS NULL OR p.branch_id = ANY($1))

      AND DATE(p.confirmed_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = CURRENT_DATE
  `, [branchIds]);

  // 5. Gói đã hết hạn trong 14 ngày qua (chờ nhắc gia hạn / tái ký)
  const pendingRenewalRes = await pool.query(`
    SELECT COUNT(*) AS count
    FROM registrations r
    WHERE ($1::uuid[] IS NULL OR r.sold_branch_id = ANY($1))
      AND (r.status = 'EXPIRED' OR r.end_date < CURRENT_DATE)
      AND r.end_date >= (CURRENT_DATE - INTERVAL '14 days')
      AND NOT EXISTS (
        SELECT 1 FROM registrations r2
        WHERE r2.member_id = r.member_id
          AND r2.status IN ('ACTIVE', 'PENDING_PAYMENT')
          AND r2.end_date >= CURRENT_DATE
      )
  `, [branchIds]);

  return {
    birthdays_today: parseInt(birthdaysRes.rows[0].count, 10),
    expiring_soon_4days: expiring.length,
    new_registrations_today: parseInt(newRegsRes.rows[0].count, 10),
    today_revenue: parseFloat(todayCashRes.rows[0].total_cash),
    pending_renewals: parseInt(pendingRenewalRes.rows[0].count, 10)
  };
}));

// GET /customer-care/birthdays - Danh sách hội viên sinh nhật hôm nay
router.get('/customer-care/birthdays', route(async req => {
  role(req, 'QTV', 'RECEPTIONIST');
  const branchIds = scope(req);

  const members = (await pool.query(`
    SELECT m.id, m.member_code, m.full_name, m.phone, m.email, m.date_of_birth, m.avatar_url,
           b.branch_name,
           (
             SELECT r.package_name_snapshot
             FROM registrations r
             WHERE r.member_id = m.id AND r.status = 'ACTIVE'
             ORDER BY r.end_date DESC LIMIT 1
           ) active_package_name
    FROM member_profiles m
    JOIN branches b ON b.id = m.home_branch_id
    WHERE ($1::uuid[] IS NULL OR m.home_branch_id = ANY($1))
      AND m.status = 'ACTIVE'
      AND m.date_of_birth IS NOT NULL
      AND EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM m.date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
    ORDER BY m.full_name ASC
  `, [branchIds])).rows;

  return members;
}));

// GET /customer-care/expiring - Danh sách gói sắp hết hạn (<= 4 ngày)
router.get('/customer-care/expiring', route(async req => {
  role(req, 'QTV', 'RECEPTIONIST');
  const branchIds = scope(req);

  return listExpiring(pool,branchIds);
}));

// GET /customer-care/today-registrations - Danh sách đăng ký mới hôm nay kèm doanh thu
router.get('/customer-care/today-registrations', route(async req => {
  role(req, 'QTV', 'RECEPTIONIST');
  const branchIds = scope(req);

  const list = (await pool.query(`
    SELECT r.id, r.reg_code, r.package_name_snapshot, r.price_snapshot, r.created_at, r.status,
           m.member_code, m.full_name AS member_name, m.phone AS member_phone,
           b.branch_name,
           COALESCE(a.full_name, a.login_phone) AS created_by_name,
           EXISTS(SELECT 1 FROM payments p WHERE p.registration_id = r.id) AS is_paid
    FROM registrations r
    JOIN member_profiles m ON m.id = r.member_id
    JOIN branches b ON b.id = r.sold_branch_id
    LEFT JOIN accounts a ON a.id = r.created_by
    WHERE ($1::uuid[] IS NULL OR r.sold_branch_id = ANY($1))
      AND DATE(r.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = CURRENT_DATE
    ORDER BY r.created_at DESC
  `, [branchIds])).rows;

  return list;
}));

// GET /customer-care/pending-renewals - Danh sách gói đã hết hạn trong 14 ngày qua chưa gia hạn lại
router.get('/customer-care/pending-renewals', route(async req => {
  role(req, 'QTV', 'RECEPTIONIST');
  const branchIds = scope(req);

  const list = (await pool.query(`
    SELECT r.id, r.reg_code, r.package_name_snapshot, r.start_date, r.end_date, r.status,
           (CURRENT_DATE - r.end_date) AS days_expired,
           m.id AS member_id, m.member_code, m.full_name AS member_name, m.phone AS member_phone, m.avatar_url,
           b.branch_name,
           pt.full_name AS pt_name
    FROM registrations r
    JOIN member_profiles m ON m.id = r.member_id
    JOIN branches b ON b.id = r.sold_branch_id
    LEFT JOIN pt_profiles pt ON pt.id = r.assigned_pt_id
    WHERE ($1::uuid[] IS NULL OR r.sold_branch_id = ANY($1))
      AND (r.status = 'EXPIRED' OR r.end_date < CURRENT_DATE)
      AND r.end_date >= (CURRENT_DATE - INTERVAL '14 days')
      AND NOT EXISTS (
        SELECT 1 FROM registrations r2
        WHERE r2.member_id = r.member_id
          AND r2.status IN ('ACTIVE', 'PENDING_PAYMENT')
          AND r2.end_date >= CURRENT_DATE
      )
    ORDER BY r.end_date DESC
  `, [branchIds])).rows;

  return list;
}));

// POST /customer-care/log-action - Ghi nhận nhật ký liên hệ khách hàng (Gọi điện, Ghi chú CSKH)
router.post('/customer-care/log-action', route(async req => {
  role(req, 'QTV', 'RECEPTIONIST');
  only(req.body, ['member_id', 'action_type', 'note']);

  const member = await row(pool, 'member_profiles', req.body.member_id);
  const actionType = text(req.body.action_type || 'CALL_CUSTOMER', 'action_type', 50);
  const note = text(req.body.note, 'note', 500, false);

  await audit(pool, req, 'member_profiles', member.id, actionType, null, { note, timestamp: new Date().toISOString() }, member.home_branch_id);
  return { success: true, message: 'Đã lưu ghi chú tương tác chăm sóc khách hàng' };
}));

module.exports = { router };

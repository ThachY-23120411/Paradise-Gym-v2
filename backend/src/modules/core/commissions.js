const express = require('express');
const { transaction } = require('../../db/postgres');
const H = require('./http');
const { pool, route, fail, text, date, today, choice, only, isStaff, role, scope, row, audit, page, search } = H;
const router = express.Router();

function checkCommissionConfigAccess(req, branchId) {
  role(req, 'QTV');
  if (req.user.permissions?.commission_config !== true) {
    fail(403, 'Tài khoản không được cấp quyền cấu hình hoa hồng (commission_config)', 'FORBIDDEN');
  }
  if (req.user.is_all_branches) {
    return true;
  }
  if (!branchId || !req.user.branch_ids?.includes(branchId)) {
    fail(403, 'Bạn không có quyền cấu hình hoa hồng cho chi nhánh ngoài phạm vi quản lý', 'FORBIDDEN');
  }
  return true;
}

// GET /commissions/configs - Lấy danh sách cấu hình tỷ lệ hoa hồng PT hiện hành
router.get('/commissions/configs', route(async req => {
  role(req, 'QTV');
  if (req.user.permissions?.commission_config !== true) {
    fail(403, 'Tài khoản không được cấp quyền cấu hình hoa hồng (commission_config)', 'FORBIDDEN');
  }
  const branchIds = scope(req);
  const configs = (await pool.query(`
    SELECT c.*, b.branch_name, pt.pt_code, pt.full_name pt_name,
           u.login_phone updated_by_name,
           EXTRACT(MONTH FROM (c.effective_from AT TIME ZONE 'Etc/GMT-7'))::int AS effective_month,
           EXTRACT(YEAR FROM (c.effective_from AT TIME ZONE 'Etc/GMT-7'))::int AS effective_year
    FROM pt_commission_configs c
    JOIN branches b ON b.id = c.branch_id
    LEFT JOIN pt_profiles pt ON pt.id = c.pt_id
    LEFT JOIN accounts u ON u.id = c.updated_by_account_id
    WHERE ($1::uuid[] IS NULL OR c.branch_id = ANY($1))
    ORDER BY b.branch_name ASC, (c.pt_id IS NOT NULL) ASC, c.created_at DESC
  `, [branchIds])).rows;
  return configs;
}));

// POST /commissions/configs - Tạo mới hoặc Cập nhật cấu hình hoa hồng (Branch Default hoặc PT Override)
router.post('/commissions/configs', route(async req => {
  only(req.body, ['branch_id', 'pt_id', 'commission_percentage', 'note', 'effective_month', 'effective_year']);
  const branchId = req.body.branch_id;
  if (!branchId) fail(400, 'Vui lòng chọn chi nhánh');
  checkCommissionConfigAccess(req, branchId);

  const ptId = req.body.pt_id || null;
  const pct = Number(req.body.commission_percentage);
  if (isNaN(pct) || pct < 0 || pct > 100) fail(400, 'Tỷ lệ hoa hồng phải từ 0% đến 100%');
  const note = req.body.note ? text(req.body.note, 500) : null;
  const userId = req.user.account_id;

  // Xác định ngày hiệu lực (effective_from)
  let effectiveFrom;
  if (req.body.effective_month != null || req.body.effective_year != null) {
    const effMonth = parseInt(req.body.effective_month, 10);
    const effYear = parseInt(req.body.effective_year, 10);
    if (!effMonth || effMonth < 1 || effMonth > 12) fail(400, 'Tháng áp dụng không hợp lệ (1-12)');
    if (!effYear || effYear < 2026) fail(400, 'Năm áp dụng không hợp lệ (tối thiểu từ năm 2026)');

    const now = new Date();
    const vnNow = new Date(now.getTime() + (7 * 3600000 + now.getTimezoneOffset() * 60000));
    const curYear = vnNow.getFullYear();
    const curMonth = vnNow.getMonth() + 1;

    if (effYear * 100 + effMonth <= curYear * 100 + curMonth) {
      fail(400, `Kỳ áp dụng hoa hồng phải lớn hơn kỳ tháng hiện tại (chỉ được thiết lập từ kỳ Tháng ${curMonth === 12 ? 1 : curMonth + 1}/${curMonth === 12 ? curYear + 1 : curYear} trở đi)`);
    }

    effectiveFrom = new Date(`${effYear}-${String(effMonth).padStart(2, '0')}-01T00:00:00+07:00`);
  } else {
    // Tương thích ngược với các test case không truyền month/year
    effectiveFrom = new Date();
  }

  return transaction(async db => {
    // 1. Tìm cấu hình hiện tại theo (branch_id, pt_id)
    const existing = (await db.query(`
      SELECT * FROM pt_commission_configs
      WHERE branch_id = $1 AND ((pt_id IS NULL AND $2::uuid IS NULL) OR (pt_id = $2))
      FOR UPDATE
    `, [branchId, ptId])).rows[0];

    let result;
    if (existing) {
      const maxVerRow = (await db.query(`SELECT COALESCE(MAX(version), 0) AS max_v FROM pt_commission_config_history WHERE config_id = $1`, [existing.id])).rows[0];
      const nextVersion = Math.max(Number(existing.version) || 0, parseInt(maxVerRow.max_v, 10)) + 1;
      const wasActive = existing.is_active;
      const action = wasActive ? 'UPDATE' : 'REACTIVATE';

      // Đóng mốc effective_to của version trước đó trong history bằng mốc effectiveFrom của version mới
      await db.query(`
        UPDATE pt_commission_config_history
        SET effective_to = $3
        WHERE config_id = $1 AND version = $2 AND effective_to IS NULL
      `, [existing.id, existing.version, effectiveFrom]);

      // Cập nhật current row với effective_from = effectiveFrom
      result = (await db.query(`
        UPDATE pt_commission_configs
        SET commission_percentage = $1,
            is_active = true,
            version = $2,
            effective_from = $3,
            note = $4,
            updated_by_account_id = $5,
            updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `, [pct, nextVersion, effectiveFrom, note, userId, existing.id])).rows[0];

      // Ghi history version mới
      await db.query(`
        INSERT INTO pt_commission_config_history (
          config_id, version, branch_id, pt_id, commission_percentage, is_active,
          effective_from, effective_to, action, note, changed_by_account_id, changed_at
        ) VALUES ($1, $2, $3, $4, $5, true, $6, NULL, $7, $8, $9, NOW())
      `, [existing.id, nextVersion, branchId, ptId, pct, effectiveFrom, action, note, userId]);

      await audit(db, req, 'pt_commission_configs', existing.id, `COMMISSION_CONFIG_${action}`, existing, result, branchId);
    } else {
      // Chỉ cho phép tạo mới PT Override (Branch Default luôn được sinh sẵn)
      if (!ptId) {
        fail(400, 'Branch Default bắt buộc luôn tồn tại và không được tạo mới thủ công; vui lòng cập nhật cấu hình hiện có');
      }

      result = (await db.query(`
        INSERT INTO pt_commission_configs (
          branch_id, pt_id, commission_percentage, is_active, version, effective_from, note,
          updated_by_account_id, updated_at
        ) VALUES ($1, $2, $3, true, 1, $4, $5, $6, NOW())
        RETURNING *
      `, [branchId, ptId, pct, effectiveFrom, note, userId])).rows[0];

      await db.query(`
        INSERT INTO pt_commission_config_history (
          config_id, version, branch_id, pt_id, commission_percentage, is_active,
          effective_from, effective_to, action, note, changed_by_account_id, changed_at
        ) VALUES ($1, 1, $2, $3, $4, true, $5, NULL, 'CREATE', $6, $7, NOW())
      `, [result.id, branchId, ptId, pct, effectiveFrom, note, userId]);

      await audit(db, req, 'pt_commission_configs', result.id, 'COMMISSION_CONFIG_CREATED', null, result, branchId);
    }

    return result;
  });
}));

// POST /commissions/configs/:id/remove-override - Bỏ cấu hình riêng cho PT (Zero Hard Delete: is_active = false)
router.post('/commissions/configs/:id/remove-override', route(async req => {
  only(req.body, ['note']);
  const id = req.params.id;
  const note = req.body.note ? text(req.body.note, 500) : null;
  const userId = req.user.account_id;

  return transaction(async db => {
    const existing = (await db.query(`
      SELECT * FROM pt_commission_configs WHERE id = $1 FOR UPDATE
    `, [id])).rows[0];

    if (!existing) fail(404, 'Không tìm thấy cấu hình hoa hồng');
    if (!existing.pt_id) {
      fail(400, 'Branch Default bắt buộc luôn tồn tại và không được gỡ/xóa');
    }
    if (!existing.is_active) {
      fail(400, 'Cấu hình riêng của PT này đã được gỡ bỏ trước đó');
    }

    checkCommissionConfigAccess(req, existing.branch_id);

    const maxVerRow = (await db.query(`SELECT COALESCE(MAX(version), 0) AS max_v FROM pt_commission_config_history WHERE config_id = $1`, [existing.id])).rows[0];
    const nextVersion = Math.max(Number(existing.version) || 0, parseInt(maxVerRow.max_v, 10)) + 1;

    // 1. Đóng version cũ trong history
    await db.query(`
      UPDATE pt_commission_config_history
      SET effective_to = NOW()
      WHERE config_id = $1 AND version = $2 AND effective_to IS NULL
    `, [existing.id, existing.version]);

    // 2. Cập nhật current row: is_active = false, effective_from = NOW(), version += 1
    const updated = (await db.query(`
      UPDATE pt_commission_configs
      SET is_active = false,
          version = $1,
          effective_from = NOW(),
          note = $2,
          updated_by_account_id = $3,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [nextVersion, note, userId, existing.id])).rows[0];

    // 3. Ghi snapshot history với REMOVE_OVERRIDE
    await db.query(`
      INSERT INTO pt_commission_config_history (
        config_id, version, branch_id, pt_id, commission_percentage, is_active,
        effective_from, effective_to, action, note, changed_by_account_id, changed_at
      ) VALUES ($1, $2, $3, $4, $5, false, NOW(), NULL, 'REMOVE_OVERRIDE', $6, $7, NOW())
    `, [existing.id, nextVersion, existing.branch_id, existing.pt_id, existing.commission_percentage, note, userId]);

    await audit(db, req, 'pt_commission_configs', existing.id, 'COMMISSION_CONFIG_REMOVE_OVERRIDE', existing, updated, existing.branch_id);

    return updated;
  });
}));

// GET /commissions/configs/:id/history - Lấy lịch sử thay đổi phiên bản của cấu hình
router.get('/commissions/configs/:id/history', route(async req => {
  role(req, 'QTV');
  if (req.user.permissions?.commission_config !== true) {
    fail(403, 'Tài khoản không được cấp quyền cấu hình hoa hồng (commission_config)', 'FORBIDDEN');
  }

  const id = req.params.id;
  const config = (await pool.query(`
    SELECT c.*, b.branch_name, pt.pt_code, pt.full_name pt_name
    FROM pt_commission_configs c
    JOIN branches b ON b.id = c.branch_id
    LEFT JOIN pt_profiles pt ON pt.id = c.pt_id
    WHERE c.id = $1
  `, [id])).rows[0];

  if (!config) fail(404, 'Không tìm thấy cấu hình hoa hồng');
  checkCommissionConfigAccess(req, config.branch_id);

  const history = (await pool.query(`
    SELECT h.*, a.login_phone changed_by_name,
           EXTRACT(MONTH FROM (h.effective_from AT TIME ZONE 'Etc/GMT-7'))::int AS effective_month,
           EXTRACT(YEAR FROM (h.effective_from AT TIME ZONE 'Etc/GMT-7'))::int AS effective_year,
           EXTRACT(MONTH FROM (h.effective_to AT TIME ZONE 'Etc/GMT-7'))::int AS effective_to_month,
           EXTRACT(YEAR FROM (h.effective_to AT TIME ZONE 'Etc/GMT-7'))::int AS effective_to_year
    FROM pt_commission_config_history h
    LEFT JOIN accounts a ON a.id = h.changed_by_account_id
    WHERE h.config_id = $1
    ORDER BY h.version DESC
  `, [id])).rows;

  return { config, history };
}));

// Helper: Tra cứu tỷ lệ hoa hồng hiệu lực theo khoảng nửa mở [effective_from, effective_to)
// Resolve order: PT Override (nếu active) -> Branch Default -> Error (không 20% ngầm)
async function getPtCommissionRate(db, ptId, bookingBranchId, completedAt = new Date()) {
  const atTime = completedAt instanceof Date ? completedAt : new Date(completedAt);

  // 1. Tìm PT Override tại completedAt trong khoảng [effective_from, effective_to)
  if (ptId) {
    const specific = (await db.query(`
      SELECT commission_percentage, is_active 
      FROM pt_commission_config_history
      WHERE branch_id = $1 AND pt_id = $2
        AND effective_from <= $3
        AND (effective_to IS NULL OR $3 < effective_to)
      ORDER BY version DESC LIMIT 1
    `, [bookingBranchId, ptId, atTime])).rows[0];

    if (specific) {
      if (specific.is_active) {
        return Number(specific.commission_percentage);
      }
      // specific.is_active === false: HLV đã bị gỡ override tại mốc này -> Fallback về Branch Default
    }
  }

  // 2. Tìm Branch Default tại completedAt trong khoảng [effective_from, effective_to)
  const branchRate = (await db.query(`
    SELECT commission_percentage, is_active 
    FROM pt_commission_config_history
    WHERE branch_id = $1 AND pt_id IS NULL
      AND effective_from <= $2
      AND (effective_to IS NULL OR $2 < effective_to)
    ORDER BY version DESC LIMIT 1
  `, [bookingBranchId, atTime])).rows[0];

  if (branchRate && branchRate.is_active) {
    return Number(branchRate.commission_percentage);
  }

  // 3. Không có fallback 20% ngầm -> Ném lỗi hệ thống rõ ràng
  throw new Error(`BRANCH_DEFAULT_COMMISSION_NOT_CONFIGURED: Chi nhánh ${bookingBranchId} chưa có cấu hình hoa hồng mặc định tại thời điểm ${atTime.toISOString()}`);
}

// POST /commissions/calculate - Tính toán lại hoa hồng cho tất cả PT trong tháng
router.post('/commissions/calculate', route(async req => {
  role(req, 'QTV');
  const month = parseInt(req.body.month, 10);
  const year = parseInt(req.body.year, 10);
  const branchId = req.body.branch_id;
  if (!month || month < 1 || month > 12) fail(400, 'Tháng không hợp lệ (1-12)');
  if (!year || year < 2026) fail(400, 'Năm không hợp lệ');

  return transaction(async db => {
    // 1. Lấy danh sách PT
    const pts = (await db.query(`
      SELECT p.id, p.full_name, p.pt_code, p.branch_id
      FROM pt_profiles p
      WHERE ($1::uuid IS NULL OR p.branch_id = $1) AND p.status = 'ACTIVE'
    `, [branchId || null])).rows;

    const results = [];

    for (const pt of pts) {
      // 2. Lấy các buổi COMPLETED trong tháng của PT
      const completedSessions = (await db.query(`
        SELECT b.id, b.session_number, b.booking_date,
               r.pt_price_snapshot, r.total_pt_sessions_snapshot, r.package_name_snapshot,
               r.price_snapshot, r.package_type_snapshot,
               pkg.pt_price AS pkg_pt_price
        FROM pt_bookings b
        JOIN registrations r ON r.id = b.registration_id
        LEFT JOIN packages pkg ON pkg.id = r.package_id
        WHERE b.pt_id = $1 AND b.status = 'COMPLETED'
          AND EXTRACT(MONTH FROM b.booking_date) = $2
          AND EXTRACT(YEAR FROM b.booking_date) = $3
      `, [pt.id, month, year])).rows;

      const totalSessionsTaught = completedSessions.length;
      let ptRevenueShare = 0;

      for (const s of completedSessions) {
        const totalPt = Number(s.total_pt_sessions_snapshot) || 1;
        let ptPrice = Number(s.pt_price_snapshot) || 0;
        if (!ptPrice || ptPrice <= 0) {
          if (Number(s.pkg_pt_price) > 0) ptPrice = Number(s.pkg_pt_price);
          else if (s.package_type_snapshot === 'PT_SESSION') ptPrice = Number(s.price_snapshot) || 0;
          else if (s.package_type_snapshot === 'COMBO') ptPrice = Math.round((Number(s.price_snapshot) || 0) * 0.7);
        }
        const sessionPtValue = ptPrice / totalPt;
        ptRevenueShare += sessionPtValue;
      }

      const commissionRate = await getPtCommissionRate(db, pt.id, pt.branch_id, `${year}-${String(month).padStart(2, '0')}-01`);
      const totalCommission = (ptRevenueShare * commissionRate) / 100;

      // 3. Cập nhật hoặc lưu vào pt_commissions (nếu chưa PAID hợp lệ)
      const existing = (await db.query(`
        SELECT * FROM pt_commissions WHERE pt_id = $1 AND month = $2 AND year = $3
      `, [pt.id, month, year])).rows[0];

      if (existing && existing.status === 'PAID' && Number(existing.total_commission_amount) > 0) {
        results.push(existing);
        continue; // Đã thanh toán hợp lệ, không sửa đè
      }

      let commRecord;
      if (existing) {
        commRecord = (await db.query(`
          UPDATE pt_commissions
          SET total_pt_sessions_taught = $2, pt_revenue_share = $3,
              commission_percentage = $4, total_commission_amount = $5
          WHERE id = $1
          RETURNING *
        `, [existing.id, totalSessionsTaught, ptRevenueShare, commissionRate, totalCommission])).rows[0];
      } else {
        commRecord = (await db.query(`
          INSERT INTO pt_commissions (pt_id, month, year, total_pt_sessions_taught, pt_revenue_share, commission_percentage, total_commission_amount, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
          RETURNING *
        `, [pt.id, month, year, totalSessionsTaught, ptRevenueShare, commissionRate, totalCommission])).rows[0];
      }

      results.push({ ...commRecord, pt_name: pt.full_name, pt_code: pt.pt_code });
    }

    return results;
  });
}));

// GET /commissions/monthly & GET /commissions - Xem bảng kê hoa hồng tháng
const listMonthlyCommissions = async req => {
  const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const branchIds = isStaff(req) ? scope(req) : null;

  const list = (await pool.query(`
    SELECT c.*, pt.full_name pt_name, pt.pt_code, pt.phone pt_phone,
           pt.bank_name, pt.bank_account_no, pt.bank_account_name,
           b.branch_name,
           acc.full_name paid_by_name
    FROM pt_commissions c
    JOIN pt_profiles pt ON pt.id = c.pt_id
    JOIN branches b ON b.id = pt.branch_id
    LEFT JOIN accounts acc ON acc.id = c.paid_by_account_id
    WHERE c.month = $1 AND c.year = $2
      AND ($3::uuid[] IS NULL OR pt.branch_id = ANY($3))
    ORDER BY pt.full_name ASC
  `, [month, year, branchIds])).rows;

  return list;
};
router.get('/commissions/monthly', route(listMonthlyCommissions));
router.get('/commissions', route(listMonthlyCommissions));

// GET /commissions/payout-history - Lịch sử chi trả hoa hồng PT
router.get('/commissions/payout-history', route(async req => {
  const branchIds = isStaff(req) ? scope(req) : null;
  const { pt_id, payout_method, from_date, to_date, branch_id, month, year, search } = req.query;

  let query = `
    SELECT c.*, pt.full_name pt_name, pt.pt_code, pt.phone pt_phone,
           pt.bank_name, pt.bank_account_no, pt.bank_account_name,
           b.branch_name,
           acc.full_name paid_by_name
    FROM pt_commissions c
    JOIN pt_profiles pt ON pt.id = c.pt_id
    JOIN branches b ON b.id = pt.branch_id
    LEFT JOIN accounts acc ON acc.id = c.paid_by_account_id
    WHERE c.status = 'PAID'
  `;
  const params = [];

  if (branchIds && branchIds.length) {
    params.push(branchIds);
    query += ` AND pt.branch_id = ANY($${params.length})`;
  }
  if (branch_id && branch_id !== 'ALL') {
    params.push(branch_id);
    query += ` AND pt.branch_id = $${params.length}`;
  }
  if (pt_id) {
    params.push(pt_id);
    query += ` AND c.pt_id = $${params.length}`;
  }
  if (payout_method && payout_method !== 'ALL') {
    params.push(payout_method);
    query += ` AND c.payout_method = $${params.length}`;
  }
  if (month) {
    params.push(parseInt(month, 10));
    query += ` AND c.month = $${params.length}`;
  }
  if (year) {
    params.push(parseInt(year, 10));
    query += ` AND c.year = $${params.length}`;
  }
  if (from_date) {
    params.push(from_date);
    query += ` AND c.paid_at >= $${params.length}::date`;
  }
  if (to_date) {
    params.push(to_date);
    query += ` AND c.paid_at < ($${params.length}::date + INTERVAL '1 day')`;
  }
  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    query += ` AND (
      LOWER(pt.full_name) LIKE $${params.length}
      OR LOWER(pt.pt_code) LIKE $${params.length}
      OR LOWER(COALESCE(c.payout_ref, '')) LIKE $${params.length}
    )`;
  }

  query += ` ORDER BY COALESCE(c.paid_at, c.created_at) DESC, c.created_at DESC`;

  const list = (await pool.query(query, params)).rows;
  return list;
}));

// GET /commissions/:id/details - Xem chi tiết các buổi dạy của một bản kê hoa hồng
router.get('/commissions/:id/details', route(async req => {
  const comm = (await pool.query(`
    SELECT c.*, pt.full_name pt_name, pt.pt_code, pt.phone pt_phone,
           pt.bank_name, pt.bank_account_no, pt.bank_account_name,
           b.branch_name,
           acc.full_name paid_by_name
    FROM pt_commissions c
    JOIN pt_profiles pt ON pt.id = c.pt_id
    JOIN branches b ON b.id = pt.branch_id
    LEFT JOIN accounts acc ON acc.id = c.paid_by_account_id
    WHERE c.id = $1
  `, [req.params.id])).rows[0];
  if (!comm) fail(404, 'Không tìm thấy bản kê hoa hồng');
  const sessions = (await pool.query(`
    SELECT b.id, b.session_number, b.booking_date, b.start_time, b.end_time,
           m.full_name member_name, m.member_code, m.phone member_phone,
           r.package_name_snapshot,
           COALESCE(
             NULLIF(r.pt_price_snapshot, 0),
             NULLIF(pkg.pt_price, 0),
             CASE
               WHEN r.package_type_snapshot = 'PT_SESSION' THEN r.price_snapshot
               WHEN r.package_type_snapshot = 'COMBO' THEN ROUND(r.price_snapshot * 0.7, 2)
               ELSE 0
             END
           ) pt_price_snapshot,
           r.total_pt_sessions_snapshot,
           ROUND(
             COALESCE(
               NULLIF(r.pt_price_snapshot, 0),
               NULLIF(pkg.pt_price, 0),
               CASE
                 WHEN r.package_type_snapshot = 'PT_SESSION' THEN r.price_snapshot
                 WHEN r.package_type_snapshot = 'COMBO' THEN ROUND(r.price_snapshot * 0.7, 2)
                 ELSE 0
               END
             ) / NULLIF(r.total_pt_sessions_snapshot, 0), 2
           ) session_pt_value,
           ROUND(
             (
               COALESCE(
                 NULLIF(r.pt_price_snapshot, 0),
                 NULLIF(pkg.pt_price, 0),
                 CASE
                   WHEN r.package_type_snapshot = 'PT_SESSION' THEN r.price_snapshot
                   WHEN r.package_type_snapshot = 'COMBO' THEN ROUND(r.price_snapshot * 0.7, 2)
                   ELSE 0
                 END
               ) / NULLIF(r.total_pt_sessions_snapshot, 0)
             ) * ($4::numeric / 100.0), 2
           ) session_commission
    FROM pt_bookings b
    JOIN registrations r ON r.id = b.registration_id
    LEFT JOIN packages pkg ON pkg.id = r.package_id
    JOIN member_profiles m ON m.id = b.member_id
    WHERE b.pt_id = $1 AND b.status = 'COMPLETED'
      AND EXTRACT(MONTH FROM b.booking_date) = $2
      AND EXTRACT(YEAR FROM b.booking_date) = $3
    ORDER BY b.booking_date ASC, b.start_time ASC
  `, [comm.pt_id, comm.month, comm.year, comm.commission_percentage])).rows;

  return { commission: comm, sessions };
}));

// PUT /commissions/:id/status - Duyệt hoặc chuyển trạng thái đã chi trả
router.put('/commissions/:id/status', route(async req => {
  role(req, 'QTV');
  const nextStatus = choice(req.body.status, ['PENDING', 'APPROVED', 'PAID'], 'status');
  
  return transaction(async db => {
    const comm = await row(db, 'pt_commissions', req.params.id, true);

    if (nextStatus === 'PAID' && Number(comm.total_commission_amount) <= 0) {
      fail(400, 'Không thể thực hiện chi trả cho khoản hoa hồng bằng 0đ.');
    }

    const payoutMethod = nextStatus === 'PAID' ? (req.body.payout_method || 'BANK_TRANSFER') : comm.payout_method;
    const payoutRef = nextStatus === 'PAID' ? (req.body.payout_ref ? text(req.body.payout_ref, 'payout_ref', 100) : null) : comm.payout_ref;
    const payoutNote = nextStatus === 'PAID' ? (req.body.payout_note ? text(req.body.payout_note, 'payout_note', 500) : null) : comm.payout_note;
    const paidBy = nextStatus === 'PAID' ? req.user.account_id : (nextStatus === 'APPROVED' ? comm.paid_by_account_id : null);

    // Cập nhật thông tin ngân hàng nếu được gửi kèm
    if (nextStatus === 'PAID' && req.body.bank_name && req.body.bank_account_no) {
      await db.query(`
        UPDATE pt_profiles
        SET bank_name = $1, bank_account_no = $2, bank_account_name = COALESCE($3, bank_account_name), updated_at = NOW()
        WHERE id = $4
      `, [req.body.bank_name, req.body.bank_account_no, req.body.bank_account_name || null, comm.pt_id]);
    }

    const updated = (await db.query(`
      UPDATE pt_commissions
      SET status = $2::varchar,
          paid_at = CASE WHEN $2::varchar = 'PAID' THEN NOW() WHEN $2::varchar = 'PENDING' THEN NULL ELSE paid_at END,
          payout_method = $3,
          payout_ref = $4,
          payout_note = $5,
          paid_by_account_id = $6
      WHERE id = $1
      RETURNING *
    `, [comm.id, nextStatus, payoutMethod, payoutRef, payoutNote, paidBy])).rows[0];

    // Gửi thông báo đến tài khoản PT khi chi trả
    if (nextStatus === 'PAID') {
      const pt = (await db.query('SELECT account_id FROM pt_profiles WHERE id = $1', [comm.pt_id])).rows[0];
      if (pt?.account_id) {
        const moneyFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(comm.total_commission_amount);
        await db.query(`
          INSERT INTO notifications (account_id, title, body, reference_type, reference_id, event_type, created_at)
          VALUES ($1, $2, $3, 'pt_commissions', $4, 'COMMISSION_PAID', NOW())
        `, [
          pt.account_id,
          'Hoa hồng tháng đã được chi trả',
          `Phòng gym đã hoàn tất chi trả hoa hồng tháng ${comm.month}/${comm.year} số tiền ${moneyFormatted}.`,
          comm.id
        ]);
      }
    }

    await audit(db, req, 'pt_commissions', comm.id, `COMMISSION_STATUS_${nextStatus}`, comm, updated);
    return updated;
  });
}));

// GET /pt/my-commissions - Mobile PT xem hoa hồng của chính mình (PT06)
router.get('/pt/my-commissions', route(async req => {
  role(req, 'PT');
  const ptId = req.user.pt_profile_id;
  if (!ptId) fail(400, 'Không tìm thấy hồ sơ PT');

  const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  let comm = (await pool.query(`
    SELECT * FROM pt_commissions WHERE pt_id = $1 AND month = $2 AND year = $3
  `, [ptId, month, year])).rows[0];

  // Nếu chưa có bản ghi pt_commissions, tự động tính nhanh tạm tính
  if (!comm) {
    const sessions = (await pool.query(`
      SELECT b.id, b.session_number, b.booking_date,
             r.pt_price_snapshot, r.total_pt_sessions_snapshot, r.price_snapshot, r.package_type_snapshot,
             pkg.pt_price AS pkg_pt_price
      FROM pt_bookings b
      JOIN registrations r ON r.id = b.registration_id
      LEFT JOIN packages pkg ON pkg.id = r.package_id
      WHERE b.pt_id = $1 AND b.status = 'COMPLETED'
        AND EXTRACT(MONTH FROM b.booking_date) = $2
        AND EXTRACT(YEAR FROM b.booking_date) = $3
    `, [ptId, month, year])).rows;

    const ptProfile = await row(pool, 'pt_profiles', ptId);
    const rate = await getPtCommissionRate(pool, ptId, ptProfile.branch_id, `${year}-${String(month).padStart(2, '0')}-01`);

    let rev = 0;
    for (const s of sessions) {
      let ptPrice = Number(s.pt_price_snapshot) || 0;
      if (!ptPrice || ptPrice <= 0) {
        if (Number(s.pkg_pt_price) > 0) ptPrice = Number(s.pkg_pt_price);
        else if (s.package_type_snapshot === 'PT_SESSION') ptPrice = Number(s.price_snapshot) || 0;
        else if (s.package_type_snapshot === 'COMBO') ptPrice = Math.round((Number(s.price_snapshot) || 0) * 0.7);
      }
      rev += ptPrice / (Number(s.total_pt_sessions_snapshot) || 1);
    }
    comm = {
      pt_id: ptId,
      month,
      year,
      total_pt_sessions_taught: sessions.length,
      pt_revenue_share: rev,
      commission_percentage: rate,
      total_commission_amount: (rev * rate) / 100,
      status: 'PENDING'
    };
  }

  // Danh sách chi tiết các buổi dạy
  const sessions = (await pool.query(`
    SELECT b.id, b.session_number, b.booking_date, b.start_time, b.end_time,
           m.full_name member_name, m.member_code,
           r.package_name_snapshot,
           COALESCE(
             NULLIF(r.pt_price_snapshot, 0),
             NULLIF(pkg.pt_price, 0),
             CASE
               WHEN r.package_type_snapshot = 'PT_SESSION' THEN r.price_snapshot
               WHEN r.package_type_snapshot = 'COMBO' THEN ROUND(r.price_snapshot * 0.7, 2)
               ELSE 0
             END
           ) pt_price_snapshot,
           r.total_pt_sessions_snapshot,
           ROUND(
             COALESCE(
               NULLIF(r.pt_price_snapshot, 0),
               NULLIF(pkg.pt_price, 0),
               CASE
                 WHEN r.package_type_snapshot = 'PT_SESSION' THEN r.price_snapshot
                 WHEN r.package_type_snapshot = 'COMBO' THEN ROUND(r.price_snapshot * 0.7, 2)
                 ELSE 0
               END
             ) / NULLIF(r.total_pt_sessions_snapshot, 0), 2
           ) session_pt_value,
           ROUND(
             (
               COALESCE(
                 NULLIF(r.pt_price_snapshot, 0),
                 NULLIF(pkg.pt_price, 0),
                 CASE
                   WHEN r.package_type_snapshot = 'PT_SESSION' THEN r.price_snapshot
                   WHEN r.package_type_snapshot = 'COMBO' THEN ROUND(r.price_snapshot * 0.7, 2)
                   ELSE 0
                 END
               ) / NULLIF(r.total_pt_sessions_snapshot, 0)
             ) * ($4::numeric / 100.0), 2
           ) session_commission
    FROM pt_bookings b
    JOIN registrations r ON r.id = b.registration_id
    LEFT JOIN packages pkg ON pkg.id = r.package_id
    JOIN member_profiles m ON m.id = b.member_id
    WHERE b.pt_id = $1 AND b.status = 'COMPLETED'
      AND EXTRACT(MONTH FROM b.booking_date) = $2
      AND EXTRACT(YEAR FROM b.booking_date) = $3
    ORDER BY b.booking_date DESC
  `, [ptId, month, year, comm.commission_percentage || 20])).rows;

  return { summary: comm, sessions };
}));

module.exports = { router, getPtCommissionRate, checkCommissionConfigAccess };

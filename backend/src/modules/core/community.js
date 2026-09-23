const express = require('express');
const { transaction } = require('../../db/postgres');
const H = require('./http');
const { pool, route, fail, text, date, today, choice, only, isStaff, role, scope, row, activeBranch, audit, search } = H;
const router = express.Router();

// GET /class-disciplines - Danh sách các bộ môn lớp cộng đồng
router.get('/class-disciplines', route(async req => {
  const statusFilter = req.query.status || null;
  const list = (await pool.query(`
    SELECT id, name, description, base_price, max_duration_minutes, status, created_at, updated_at
    FROM class_disciplines
    WHERE ($1::varchar IS NULL OR status = $1)
    ORDER BY name ASC
  `, [statusFilter])).rows;
  return list;
}));

// POST /class-disciplines - Thêm bộ môn mới (QTV)
router.post('/class-disciplines', route(async req => {
  role(req, 'QTV');
  only(req.body, ['name', 'description', 'base_price', 'max_duration_minutes', 'status']);

  return transaction(async db => {
    const nameVal = text(req.body.name, 'name', 150);
    const descVal = text(req.body.description, 'description', 1000, false);
    const basePrice = Math.max(0, parseFloat(req.body.base_price) || 0);
    const maxDur = parseInt(req.body.max_duration_minutes, 10) || 60;
    if (maxDur <= 0) fail(400, 'Thời lượng tối đa của một buổi học phải lớn hơn 0 phút');

    const created = (await db.query(`
      INSERT INTO class_disciplines (name, description, base_price, max_duration_minutes, status)
      VALUES ($1, $2, $3, $4, COALESCE($5, 'ACTIVE'))
      RETURNING *
    `, [nameVal, descVal, basePrice, maxDur, req.body.status || 'ACTIVE'])).rows[0];

    await audit(db, req, 'class_disciplines', created.id, 'CLASS_DISCIPLINE_CREATED', null, created, null);
    return created;
  });
}));

// PUT /class-disciplines/:id - Cập nhật thông tin bộ môn (QTV)
router.put('/class-disciplines/:id', route(async req => {
  role(req, 'QTV');
  only(req.body, ['name', 'description', 'base_price', 'max_duration_minutes', 'status']);

  return transaction(async db => {
    const existing = await row(db, 'class_disciplines', req.params.id, true);
    const nameVal = req.body.name !== undefined ? text(req.body.name, 'name', 150) : existing.name;
    const descVal = req.body.description !== undefined ? text(req.body.description, 'description', 1000, false) : existing.description;
    const basePrice = req.body.base_price !== undefined ? Math.max(0, parseFloat(req.body.base_price) || 0) : existing.base_price;
    const maxDur = req.body.max_duration_minutes !== undefined ? parseInt(req.body.max_duration_minutes, 10) : existing.max_duration_minutes;
    const statusVal = req.body.status !== undefined ? choice(req.body.status, ['ACTIVE', 'INACTIVE'], 'status') : existing.status;

    const updated = (await db.query(`
      UPDATE class_disciplines
      SET name = $1, description = $2, base_price = $3, max_duration_minutes = $4, status = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [nameVal, descVal, basePrice, maxDur, statusVal, existing.id])).rows[0];

    await audit(db, req, 'class_disciplines', updated.id, 'CLASS_DISCIPLINE_UPDATED', existing, updated, null);
    return updated;
  });
}));

// DELETE /class-disciplines/:id - Xóa hoặc ngừng hoạt động bộ môn (QTV)
router.delete('/class-disciplines/:id', route(async req => {
  role(req, 'QTV');
  return transaction(async db => {
    const existing = await row(db, 'class_disciplines', req.params.id, true);
    const countRes = await db.query(`SELECT COUNT(*)::int AS count FROM community_classes WHERE discipline_id = $1`, [existing.id]);
    if (countRes.rows[0].count > 0) {
      const updated = (await db.query(`
        UPDATE class_disciplines SET status = 'INACTIVE', updated_at = NOW() WHERE id = $1 RETURNING *
      `, [existing.id])).rows[0];
      await audit(db, req, 'class_disciplines', updated.id, 'CLASS_DISCIPLINE_DEACTIVATED', existing, updated, null);
      return { success: true, message: 'Bộ môn đã có lớp học liên kết nên được chuyển sang trạng thái Ngừng hoạt động', deactivated: true };
    }

    await db.query(`DELETE FROM class_disciplines WHERE id = $1`, [existing.id]);
    await audit(db, req, 'class_disciplines', existing.id, 'CLASS_DISCIPLINE_DELETED', existing, null, null);
    return { success: true, message: 'Đã xóa bộ môn thành công' };
  });
}));

// GET /community-classes - Xem lịch lớp tập cộng đồng
router.get('/community-classes', route(async req => {
  const branchIds = isStaff(req) ? scope(req) : null;
  const currentMemberId = req.user.active_role === 'MEMBER' ? req.user.member_profile_id : null;
  const instructorId = req.query.instructor_id || null;
  const dateFrom = req.query.date_from ? date(req.query.date_from) : null;
  const dateTo = req.query.date_to ? date(req.query.date_to) : null;
  const singleDate = req.query.date ? date(req.query.date) : (!dateFrom && !dateTo && !instructorId ? today() : null);

  const list = (await pool.query(`
    SELECT c.id, c.branch_id, c.title, c.instructor_name, c.instructor_id, c.discipline_id,
           c.base_price, c.bonus_amount, (COALESCE(c.base_price, 0) + COALESCE(c.bonus_amount, 0)) AS total_compensation,
           d.name AS discipline_name, d.max_duration_minutes,
           c.class_date, c.start_time, c.end_time,
           c.max_slots, c.status, c.description, c.created_at,
           COALESCE((
             SELECT COUNT(*)::int
             FROM community_class_registrations cr
             WHERE cr.class_id = c.id AND cr.status = 'CONFIRMED'
           ), 0) AS enrolled_slots,
           b.branch_name,
           p.pt_code, p.phone AS instructor_phone,
           EXISTS(
             SELECT 1 FROM community_class_registrations cr
             WHERE cr.class_id = c.id AND cr.member_id = $3 AND cr.status = 'CONFIRMED'
           ) is_registered
    FROM community_classes c
    JOIN branches b ON b.id = c.branch_id
    LEFT JOIN class_disciplines d ON d.id = c.discipline_id
    LEFT JOIN pt_profiles p ON p.id = c.instructor_id
    WHERE ($1::uuid[] IS NULL OR c.branch_id = ANY($1))
      AND ($2::date IS NULL OR c.class_date = $2)
      AND ($4::uuid IS NULL OR c.instructor_id = $4)
      AND ($5::date IS NULL OR c.class_date >= $5)
      AND ($6::date IS NULL OR c.class_date <= $6)
    ORDER BY c.class_date ASC, c.start_time ASC
  `, [branchIds, singleDate, currentMemberId, instructorId, dateFrom, dateTo])).rows;

  return list;
}));

// GET /community-classes/available-instructors - Danh sách HLV thuộc chi nhánh rảnh trong khung giờ
router.get('/community-classes/available-instructors', route(async req => {
  const branchId = req.query.branch_id;
  if (!branchId) fail(400, 'Vui lòng cung cấp branch_id');
  const classDate = req.query.class_date ? date(req.query.class_date) : today();
  const startTime = req.query.start_time;
  const endTime = req.query.end_time;
  const excludeClassId = req.query.exclude_class_id || null;

  let conflictClause = '';
  const params = [branchId, classDate];

  if (startTime && endTime) {
    params.push(startTime, endTime);
    let excludeSql = '';
    if (excludeClassId) {
      params.push(excludeClassId);
      excludeSql = `AND cc.id <> $${params.length}`;
    }
    conflictClause = `
      AND NOT EXISTS (
        SELECT 1 FROM pt_bookings bk
        WHERE bk.pt_id = p.id
          AND bk.booking_date = $2
          AND bk.status <> 'CANCELLED'
          AND bk.start_time < $4
          AND bk.end_time > $3
      )
      AND NOT EXISTS (
        SELECT 1 FROM community_classes cc
        WHERE cc.instructor_id = p.id
          AND cc.class_date = $2
          AND cc.status <> 'CANCELLED'
          ${excludeSql}
          AND cc.start_time < $4
          AND cc.end_time > $3
      )
    `;
  }

  const list = (await pool.query(`
    SELECT p.id, p.full_name, p.pt_code, p.phone, p.branch_id, b.branch_name
    FROM pt_profiles p
    JOIN branches b ON b.id = p.branch_id
    WHERE p.branch_id = $1 AND p.status = 'ACTIVE'
      ${conflictClause}
    ORDER BY p.full_name ASC
  `, params)).rows;

  return list;
}));

// POST /community-classes - Lập lịch lớp cộng đồng mới (QTV)
router.post('/community-classes', route(async req => {
  role(req, 'QTV');
  only(req.body, ['branch_id', 'branch_ids', 'discipline_id', 'title', 'instructor_id', 'instructor_name', 'base_price', 'bonus_amount', 'class_date', 'start_time', 'end_time', 'max_slots', 'description']);

  return transaction(async db => {
    let branchIds = [];
    if (Array.isArray(req.body.branch_ids) && req.body.branch_ids.length > 0) {
      branchIds = req.body.branch_ids;
    } else if (req.body.branch_id) {
      branchIds = [req.body.branch_id];
    }
    if (!branchIds.length) fail(400, 'Vui lòng chọn ít nhất một chi nhánh');

    for (const bId of branchIds) {
      await activeBranch(db, bId);
    }

    let disciplineId = req.body.discipline_id || null;
    let basePrice = 0;
    let titleVal = text(req.body.title, 'title', 200);

    if (disciplineId) {
      const disc = (await db.query(`SELECT id, name, base_price, max_duration_minutes FROM class_disciplines WHERE id = $1`, [disciplineId])).rows[0];
      if (disc) {
        basePrice = parseFloat(disc.base_price) || 0;
        if (!titleVal) titleVal = disc.name;
      }
    }

    const bonusAmount = Math.max(0, parseFloat(req.body.bonus_amount) || 0);
    const classDate = date(req.body.class_date || today());
    const startTime = req.body.start_time;
    const endTime = req.body.end_time;
    if (!startTime || !endTime) fail(400, 'Vui lòng chọn khung giờ bắt đầu và kết thúc');

    const maxSlots = parseInt(req.body.max_slots, 10) || 40;
    if (maxSlots <= 0) fail(400, 'Số lượng chỗ tối đa phải lớn hơn 0');

    let instructorId = req.body.instructor_id || null;
    let instructorVal = req.body.instructor_name || '';
    if (instructorId) {
      const pt = (await db.query(`SELECT id, full_name, pt_code, branch_id FROM pt_profiles WHERE id = $1`, [instructorId])).rows[0];
      if (!pt) fail(404, 'Không tìm thấy thông tin Huấn luyện viên');
      instructorVal = pt.full_name;

      for (const bId of branchIds) {
        if (pt.branch_id !== bId) {
          fail(400, `Huấn luyện viên ${pt.full_name} (${pt.pt_code}) thuộc chi nhánh khác, không thuộc chi nhánh tổ chức lớp này`);
        }
      }

      // Kiểm tra trùng lịch dạy 1:1 với học viên
      const conflictPt = (await db.query(`
        SELECT bk.start_time, bk.end_time, m.full_name AS member_name
        FROM pt_bookings bk
        JOIN member_profiles m ON m.id = bk.member_id
        WHERE bk.pt_id = $1 AND bk.booking_date = $2 AND bk.status <> 'CANCELLED'
          AND bk.start_time < $4 AND bk.end_time > $3
        LIMIT 1
      `, [instructorId, classDate, startTime, endTime])).rows[0];

      if (conflictPt) {
        fail(409, `Huấn luyện viên ${pt.full_name} đã có lịch dạy 1:1 với học viên ${conflictPt.member_name} (${conflictPt.start_time.slice(0, 5)} - ${conflictPt.end_time.slice(0, 5)}) trong khung giờ này`);
      }

      // Kiểm tra trùng lịch lớp cộng đồng khác
      const conflictClass = (await db.query(`
        SELECT title, start_time, end_time
        FROM community_classes
        WHERE instructor_id = $1 AND class_date = $2 AND status <> 'CANCELLED'
          AND start_time < $4 AND end_time > $3
        LIMIT 1
      `, [instructorId, classDate, startTime, endTime])).rows[0];

      if (conflictClass) {
        fail(409, `Huấn luyện viên ${pt.full_name} đã có lịch dạy lớp cộng đồng "${conflictClass.title}" (${conflictClass.start_time.slice(0, 5)} - ${conflictClass.end_time.slice(0, 5)}) trong khung giờ này`);
      }
    }
    instructorVal = text(instructorVal, 'instructor_name', 150);

    const createdList = [];
    for (const bId of branchIds) {
      const created = (await db.query(`
        INSERT INTO community_classes(branch_id, discipline_id, instructor_id, title, instructor_name, base_price, bonus_amount, class_date, start_time, end_time, max_slots, enrolled_slots, status, description)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, 'OPEN', $12)
        RETURNING *
      `, [bId, disciplineId, instructorId, titleVal, instructorVal, basePrice, bonusAmount, classDate, startTime, endTime, maxSlots, text(req.body.description, 'description', 500, false)])).rows[0];

      await audit(db, req, 'community_classes', created.id, 'COMMUNITY_CLASS_CREATED', null, created, bId);
      createdList.push(created);
    }
    return createdList.length === 1 ? createdList[0] : createdList;
  });
}));

// PUT /community-classes/:id/instructor - Gán lại PT cho lớp cộng đồng (QTV / Lễ tân)
const reassignInstructorHandler = async req => {
  role(req, 'QTV', 'RECEPTIONIST');
  const instructorId = req.body.instructor_id;
  if (!instructorId || typeof instructorId !== 'string') fail(400, 'Vui lòng chọn Huấn luyện viên phụ trách');
  const note = req.body.note ? text(req.body.note, 'note', 500, false) : null;

  return transaction(async db => {
    const cls = await row(db, 'community_classes', req.params.id, true);

    if (cls.status === 'CANCELLED') {
      fail(400, 'Không thể gán lại PT cho lớp học đã bị hủy');
    }

    // Kiểm tra chưa qua thời gian buổi tập: (class_date + end_time) > NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'
    const isPassed = (await db.query(`
      SELECT 1 FROM community_classes
      WHERE id = $1 AND (class_date + end_time) <= (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
    `, [cls.id])).rowCount > 0;

    if (isPassed) {
      fail(400, 'Không thể gán lại PT cho buổi tập đã qua thời gian');
    }

    // Kiểm tra HLV mới
    const pt = (await db.query(`SELECT id, full_name, pt_code, branch_id, phone FROM pt_profiles WHERE id = $1 AND status = 'ACTIVE'`, [instructorId])).rows[0];
    if (!pt) fail(404, 'Không tìm thấy thông tin Huấn luyện viên hoặc HLV không còn hoạt động');

    if (pt.branch_id !== cls.branch_id) {
      fail(400, `Huấn luyện viên ${pt.full_name} (${pt.pt_code}) thuộc chi nhánh khác, không thuộc chi nhánh tổ chức lớp này`);
    }

    // Kiểm tra trùng lịch dạy 1:1 với học viên
    const conflictPt = (await db.query(`
      SELECT bk.start_time, bk.end_time, m.full_name AS member_name
      FROM pt_bookings bk
      JOIN member_profiles m ON m.id = bk.member_id
      WHERE bk.pt_id = $1 AND bk.booking_date = $2 AND bk.status <> 'CANCELLED'
        AND bk.start_time < $4 AND bk.end_time > $3
      LIMIT 1
    `, [instructorId, cls.class_date, cls.start_time, cls.end_time])).rows[0];

    if (conflictPt) {
      fail(409, `Huấn luyện viên ${pt.full_name} đã có lịch dạy 1:1 với học viên ${conflictPt.member_name} (${conflictPt.start_time.slice(0, 5)} - ${conflictPt.end_time.slice(0, 5)}) trong khung giờ này`);
    }

    // Kiểm tra trùng lịch lớp cộng đồng khác (ngoại trừ chính lớp hiện tại)
    const conflictClass = (await db.query(`
      SELECT title, start_time, end_time
      FROM community_classes
      WHERE instructor_id = $1 AND class_date = $2 AND status <> 'CANCELLED'
        AND id <> $5
        AND start_time < $4 AND end_time > $3
      LIMIT 1
    `, [instructorId, cls.class_date, cls.start_time, cls.end_time, cls.id])).rows[0];

    if (conflictClass) {
      fail(409, `Huấn luyện viên ${pt.full_name} đã có lịch dạy lớp cộng đồng "${conflictClass.title}" (${conflictClass.start_time.slice(0, 5)} - ${conflictClass.end_time.slice(0, 5)}) trong khung giờ này`);
    }

    // Cập nhật lớp cộng đồng
    const updated = (await db.query(`
      UPDATE community_classes
      SET instructor_id = $1,
          instructor_name = $2
      WHERE id = $3
      RETURNING *
    `, [pt.id, pt.full_name, cls.id])).rows[0];

    await audit(db, req, 'community_classes', cls.id, 'COMMUNITY_CLASS_INSTRUCTOR_REASSIGNED',
      { instructor_id: cls.instructor_id, instructor_name: cls.instructor_name },
      { instructor_id: updated.instructor_id, instructor_name: updated.instructor_name, note },
      cls.branch_id
    );

    return {
      success: true,
      message: `Đã gán lại HLV ${pt.full_name} phụ trách lớp "${cls.title}" thành công!`,
      data: {
        ...updated,
        pt_code: pt.pt_code,
        instructor_phone: pt.phone
      }
    };
  });
};

router.put('/community-classes/:id/instructor', route(reassignInstructorHandler));
router.post('/community-classes/:id/reassign-instructor', route(reassignInstructorHandler));

// DELETE /community-classes/:id - Hủy / Xóa buổi tập lớp cộng đồng (QTV)
router.delete('/community-classes/:id', route(async req => {
  role(req, 'QTV');
  return transaction(async db => {
    const cls = await row(db, 'community_classes', req.params.id, true);

    await db.query(`
      UPDATE community_class_registrations
      SET status = 'CANCELLED'
      WHERE class_id = $1 AND status = 'CONFIRMED'
    `, [cls.id]);

    await db.query(`DELETE FROM community_classes WHERE id = $1`, [cls.id]);

    await audit(db, req, 'community_classes', cls.id, 'COMMUNITY_CLASS_DELETED', cls, null, cls.branch_id);
    return { success: true, message: 'Đã xóa lớp tập cộng đồng thành công' };
  });
}));

router.post('/community-classes/:id/delete', route(async req => {
  role(req, 'QTV');
  return transaction(async db => {
    const cls = await row(db, 'community_classes', req.params.id, true);

    await db.query(`
      UPDATE community_class_registrations
      SET status = 'CANCELLED'
      WHERE class_id = $1 AND status = 'CONFIRMED'
    `, [cls.id]);

    await db.query(`DELETE FROM community_classes WHERE id = $1`, [cls.id]);

    await audit(db, req, 'community_classes', cls.id, 'COMMUNITY_CLASS_DELETED', cls, null, cls.branch_id);
    return { success: true, message: 'Đã xóa lớp tập cộng đồng thành công' };
  });
}));

// POST /community-classes/:id/register - Đăng ký tham gia lớp cộng đồng (Hội viên hoặc Lễ tân ghi nhận tại quầy)
router.post('/community-classes/:id/register', route(async req => {
  return transaction(async db => {
    const cls = await row(db, 'community_classes', req.params.id, true);
    if (cls.status !== 'OPEN' && cls.status !== 'SCHEDULED') {
      fail(409, 'Lớp học hiện không mở đăng ký', 'CLASS_NOT_OPEN');
    }

    if (cls.enrolled_slots >= cls.max_slots) {
      fail(409, 'Lớp học đã đủ số lượng học viên tối đa', 'CLASS_FULL');
    }

    let memberId;
    if (req.user.active_role === 'MEMBER') {
      memberId = req.user.member_profile_id;
    } else {
      role(req, 'QTV', 'RECEPTIONIST');
      memberId = req.body.member_id;
      if (!memberId) fail(400, 'Vui lòng chọn hội viên');
    }

    const member = await row(db, 'member_profiles', memberId);
    if (member.status !== 'ACTIVE') fail(409, 'Hồ sơ hội viên không còn hoạt động');

    // Kiểm tra điều kiện có gói Gym còn hạn và không bị đóng băng
    const hasActiveGym = (await db.query(`
      SELECT 1 FROM registrations
      WHERE member_id = $1
        AND package_type_snapshot IN ('GYM_TIME', 'GYM_SESSION', 'COMBO')
        AND status IN ('ACTIVE', 'SCHEDULED')
        AND is_frozen = FALSE
        AND end_date >= $2
      LIMIT 1
    `, [memberId, cls.class_date])).rowCount > 0;

    if (!hasActiveGym) {
      fail(400, 'Hội viên bắt buộc phải có gói Gym còn hiệu lực sử dụng để tham gia lớp cộng đồng', 'ACTIVE_GYM_REQUIRED');
    }

    // Kiểm tra đã đăng ký chưa
    const existing = (await db.query(`
      SELECT * FROM community_class_registrations
      WHERE class_id = $1 AND member_id = $2
    `, [cls.id, memberId])).rows[0];

    if (existing && existing.status === 'CONFIRMED') {
      fail(409, 'Hội viên đã đăng ký tham gia lớp này trước đó', 'ALREADY_REGISTERED');
    }

    let reg;
    if (existing) {
      reg = (await db.query(`
        UPDATE community_class_registrations
        SET status = 'CONFIRMED', registration_date = NOW()
        WHERE id = $1 RETURNING *
      `, [existing.id])).rows[0];
    } else {
      reg = (await db.query(`
        INSERT INTO community_class_registrations(class_id, member_id, status)
        VALUES($1, $2, 'CONFIRMED')
        RETURNING *
      `, [cls.id, memberId])).rows[0];
    }

    // Cập nhật enrolled_slots theo số lượng đăng ký thực tế
    await db.query(`
      UPDATE community_classes
      SET enrolled_slots = (
            SELECT COUNT(*)::int FROM community_class_registrations
            WHERE class_id = $1 AND status = 'CONFIRMED'
          ),
          status = CASE WHEN (
            SELECT COUNT(*)::int FROM community_class_registrations
            WHERE class_id = $1 AND status = 'CONFIRMED'
          ) >= max_slots THEN 'SCHEDULED' ELSE status END
      WHERE id = $1
    `, [cls.id]);

    await audit(db, req, 'community_class_registrations', reg.id, 'COMMUNITY_CLASS_REGISTERED', null, reg, cls.branch_id);
    return reg;
  });
}));

// POST /community-classes/:id/cancel - Hủy đăng ký lớp
router.post('/community-classes/:id/cancel', route(async req => {
  return transaction(async db => {
    const cls = await row(db, 'community_classes', req.params.id, true);
    let memberId = req.user.active_role === 'MEMBER' ? req.user.member_profile_id : req.body.member_id;
    if (!memberId) fail(400, 'Member ID required');

    const reg = (await db.query(`
      SELECT * FROM community_class_registrations
      WHERE class_id = $1 AND member_id = $2 AND status = 'CONFIRMED'
    `, [cls.id, memberId])).rows[0];

    if (!reg) fail(404, 'Không tìm thấy đăng ký tham gia lớp', 'NOT_FOUND');

    await db.query(`
      UPDATE community_class_registrations SET status = 'CANCELLED' WHERE id = $1
    `, [reg.id]);

    await db.query(`
      UPDATE community_classes
      SET enrolled_slots = (
            SELECT COUNT(*)::int FROM community_class_registrations
            WHERE class_id = $1 AND status = 'CONFIRMED'
          ),
          status = 'OPEN'
      WHERE id = $1
    `, [cls.id]);

    await audit(db, req, 'community_class_registrations', reg.id, 'COMMUNITY_CLASS_CANCELLED', reg, null, cls.branch_id);
    return { success: true, message: 'Đã hủy đăng ký lớp thành công' };
  });
}));

// GET /community-classes/registrations - Danh sách các lớp cộng đồng hội viên đã đăng ký
router.get('/community-classes/registrations', route(async req => {
  let memberId = req.query.member_id;
  if (!memberId && req.user && req.user.active_role === 'MEMBER') {
    memberId = req.user.member_profile_id;
  }
  if (!memberId) fail(400, 'member_id required');
  const list = (await pool.query(`
    SELECT cr.*, c.title, c.class_date, c.start_time, c.end_time, c.branch_id, b.branch_name,
           c.instructor_name, d.name AS discipline_name
    FROM community_class_registrations cr
    JOIN community_classes c ON c.id = cr.class_id
    JOIN branches b ON b.id = c.branch_id
    LEFT JOIN class_disciplines d ON d.id = c.discipline_id
    WHERE cr.member_id = $1
    ORDER BY c.class_date DESC, c.start_time DESC
  `, [memberId])).rows;
  return list;
}));

// GET /community-classes/:id/members - Xem danh sách học viên của lớp
router.get('/community-classes/:id/members', route(async req => {
  role(req, 'QTV', 'RECEPTIONIST', 'PT');
  const cls = await row(pool, 'community_classes', req.params.id);
  const members = (await pool.query(`
    SELECT cr.*, m.full_name, m.member_code, m.phone, m.avatar_url
    FROM community_class_registrations cr
    JOIN member_profiles m ON m.id = cr.member_id
    WHERE cr.class_id = $1 AND cr.status = 'CONFIRMED'
    ORDER BY cr.registration_date ASC
  `, [cls.id])).rows;

  return { class: cls, members };
}));

module.exports = { router };

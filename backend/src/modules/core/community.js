const express = require('express');
const { transaction } = require('../../db/postgres');
const H = require('./http');
const { pool, route, fail, text, date, today, choice, only, isStaff, role, scope, row, activeBranch, audit, search } = H;
const router = express.Router();

// GET /community-classes - Xem lịch lớp tập cộng đồng
router.get('/community-classes', route(async req => {
  const branchIds = isStaff(req) ? scope(req) : null;
  const targetDate = req.query.date ? date(req.query.date) : today();
  const currentMemberId = req.user.active_role === 'MEMBER' ? req.user.member_profile_id : null;

  const list = (await pool.query(`
    SELECT c.id, c.branch_id, c.title, c.instructor_name, c.class_date, c.start_time, c.end_time,
           c.max_slots, c.status, c.description, c.created_at,
           COALESCE((
             SELECT COUNT(*)::int
             FROM community_class_registrations cr
             WHERE cr.class_id = c.id AND cr.status = 'CONFIRMED'
           ), 0) AS enrolled_slots,
           b.branch_name,
           EXISTS(
             SELECT 1 FROM community_class_registrations cr
             WHERE cr.class_id = c.id AND cr.member_id = $3 AND cr.status = 'CONFIRMED'
           ) is_registered
    FROM community_classes c
    JOIN branches b ON b.id = c.branch_id
    WHERE ($1::uuid[] IS NULL OR c.branch_id = ANY($1))
      AND ($2::date IS NULL OR c.class_date = $2)
    ORDER BY c.class_date ASC, c.start_time ASC
  `, [branchIds, targetDate, currentMemberId])).rows;

  return list;
}));

// POST /community-classes - Lập lịch lớp cộng đồng mới (QTV)
router.post('/community-classes', route(async req => {
  role(req, 'QTV');
  only(req.body, ['branch_id', 'branch_ids', 'title', 'instructor_name', 'class_date', 'start_time', 'end_time', 'max_slots', 'description']);

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

    const titleVal = text(req.body.title, 'title', 200);
    const instructorVal = text(req.body.instructor_name, 'instructor_name', 150);
    const classDate = date(req.body.class_date || today());
    const startTime = req.body.start_time;
    const endTime = req.body.end_time;
    if (!startTime || !endTime) fail(400, 'Vui lòng chọn khung giờ bắt đầu và kết thúc');

    const maxSlots = parseInt(req.body.max_slots, 10) || 40;
    if (maxSlots <= 0) fail(400, 'Số lượng chỗ tối đa phải lớn hơn 0');

    const createdList = [];
    for (const bId of branchIds) {
      const created = (await db.query(`
        INSERT INTO community_classes(branch_id, title, instructor_name, class_date, start_time, end_time, max_slots, enrolled_slots, status, description)
        VALUES($1, $2, $3, $4, $5, $6, $7, 0, 'OPEN', $8)
        RETURNING *
      `, [bId, titleVal, instructorVal, classDate, startTime, endTime, maxSlots, text(req.body.description, 'description', 500, false)])).rows[0];

      await audit(db, req, 'community_classes', created.id, 'COMMUNITY_CLASS_CREATED', null, created, bId);
      createdList.push(created);
    }
    return createdList.length === 1 ? createdList[0] : createdList;
  });
}));

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

// GET /community-classes/:id/members - Xem danh sách học viên của lớp
router.get('/community-classes/:id/members', route(async req => {
  role(req, 'QTV', 'RECEPTIONIST');
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

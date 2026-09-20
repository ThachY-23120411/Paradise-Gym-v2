const express = require('express');
const { transaction } = require('../../db/postgres');
const H = require('./http');
const { pool, route, fail, text, date, today, only, role, scope, row, audit } = H;
const router = express.Router();

// GET /holidays - Xem danh sách ngày lễ
router.get('/holidays', route(async req => {
  const branchIds = req.user.is_all_branches ? null : scope(req);
  const list = (await pool.query(`
    SELECT h.*, b.branch_name
    FROM holidays h
    LEFT JOIN branches b ON b.id = h.branch_id
    WHERE ($1::uuid[] IS NULL OR h.branch_id IS NULL OR h.branch_id = ANY($1))
    ORDER BY h.holiday_date ASC
  `, [branchIds])).rows;
  return list;
}));

// POST /holidays - Thêm ngày nghỉ lễ (QTV)
router.post('/holidays', route(async req => {
  role(req, 'QTV');
  only(req.body, ['branch_id', 'holiday_date', 'title', 'is_closed']);

  return transaction(async db => {
    const branchId = req.body.branch_id || null;
    const hDate = date(req.body.holiday_date);
    const titleVal = text(req.body.title, 'title', 200);
    const isClosed = req.body.is_closed !== false;

    const existing = (await db.query(`
      SELECT 1 FROM holidays WHERE holiday_date = $1 AND ($2::uuid IS NULL OR branch_id = $2 OR branch_id IS NULL)
    `, [hDate, branchId])).rowCount;

    if (existing) fail(409, 'Ngày lễ này đã được thiết lập trước đó', 'HOLIDAY_EXISTS');

    const created = (await db.query(`
      INSERT INTO holidays (branch_id, holiday_date, title, is_closed)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [branchId, hDate, titleVal, isClosed])).rows[0];

    await audit(db, req, 'holidays', created.id, 'HOLIDAY_CREATED', null, created, branchId);
    return created;
  });
}));

// DELETE /holidays/:id - Xóa ngày lễ
router.delete('/holidays/:id', route(async req => {
  role(req, 'QTV');
  return transaction(async db => {
    const h = await row(db, 'holidays', req.params.id, true);
    await db.query('DELETE FROM holidays WHERE id = $1', [h.id]);
    await audit(db, req, 'holidays', h.id, 'HOLIDAY_DELETED', h, null, h.branch_id);
    return { success: true, message: 'Đã xóa ngày lễ' };
  });
}));

module.exports = { router };

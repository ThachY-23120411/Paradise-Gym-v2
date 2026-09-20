const express = require('express');
const { transaction } = require('../../db/postgres');
const H = require('./http');
const { pool, route, fail, text, date, today, choice, only, isStaff, role, scope, row, audit, page, search } = H;
const router = express.Router();

// GET /discounts - Danh sách mã giảm giá
router.get('/discounts', route(async req => {
  const branchIds = isStaff(req) ? scope(req) : null;
  const list = (await pool.query(`
    SELECT d.*, b.branch_name,
      ARRAY(SELECT br.branch_name FROM branches br WHERE br.id = ANY(d.branch_ids)) as branch_names
    FROM discounts d
    LEFT JOIN branches b ON b.id = d.branch_id
    WHERE ($1::uuid[] IS NULL OR d.branch_id IS NULL OR d.branch_id = ANY($1) OR d.branch_ids IS NULL OR d.branch_ids && $1)
    ORDER BY d.created_at DESC
  `, [branchIds])).rows;

  return search(list, req.query, ['code', 'title']);
}));

// GET /discounts/:id
router.get('/discounts/:id', route(async req => {
  const d = await row(pool, 'discounts', req.params.id);
  return d;
}));

// POST /discounts - Tạo mới mã giảm giá (QTV)
router.post('/discounts', route(async req => {
  role(req, 'QTV');
  only(req.body, ['branch_id', 'branch_ids', 'code', 'title', 'discount_type', 'discount_value', 'min_order_value', 'max_discount_amount', 'start_date', 'end_date', 'usage_limit', 'is_active']);
  
  return transaction(async db => {
    const codeVal = text(req.body.code, 'code', 50).toUpperCase().replace(/\s+/g, '');
    const titleVal = text(req.body.title, 'title', 200);
    const typeVal = choice(req.body.discount_type, ['PERCENT', 'FIXED_AMOUNT'], 'discount_type');
    const val = Number(req.body.discount_value);
    if (isNaN(val) || val <= 0) fail(400, 'Giá trị giảm giá phải lớn hơn 0');
    if (typeVal === 'PERCENT' && val > 100) fail(400, 'Tỷ lệ giảm phần trăm không được vượt quá 100%');

    const startDate = date(req.body.start_date || today());
    const endDate = date(req.body.end_date);
    if (endDate < startDate) fail(400, 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu');

    const minOrder = Number(req.body.min_order_value || 0);
    const maxDiscount = req.body.max_discount_amount ? Number(req.body.max_discount_amount) : null;
    const limitVal = req.body.usage_limit ? parseInt(req.body.usage_limit, 10) : null;
    
    let branchIds = null;
    let branchId = req.body.branch_id || null;
    if (Array.isArray(req.body.branch_ids) && req.body.branch_ids.length > 0) {
      branchIds = req.body.branch_ids;
      if (branchIds.length === 1) branchId = branchIds[0];
    } else if (branchId) {
      branchIds = [branchId];
    }

    const existing = (await db.query('SELECT 1 FROM discounts WHERE code = $1', [codeVal])).rowCount;
    if (existing) fail(409, 'Mã khuyến mãi này đã tồn tại trên hệ thống', 'DUPLICATE_CODE');

    const created = (await db.query(`
      INSERT INTO discounts(branch_id, branch_ids, code, title, discount_type, discount_value, min_order_value, max_discount_amount, start_date, end_date, usage_limit, is_active)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [branchId, branchIds, codeVal, titleVal, typeVal, val, minOrder, maxDiscount, startDate, endDate, limitVal, req.body.is_active !== false])).rows[0];

    await audit(db, req, 'discounts', created.id, 'DISCOUNT_CREATED', null, created, branchId);
    return created;
  });
}));

// PUT /discounts/:id - Cập nhật mã giảm giá
router.put('/discounts/:id', route(async req => {
  role(req, 'QTV');
  return transaction(async db => {
    const d = await row(db, 'discounts', req.params.id, true);
    const titleVal = req.body.title ? text(req.body.title, 'title', 200) : d.title;
    const val = req.body.discount_value != null ? Number(req.body.discount_value) : Number(d.discount_value);
    const startDate = req.body.start_date ? date(req.body.start_date) : d.start_date;
    const endDate = req.body.end_date ? date(req.body.end_date) : d.end_date;
    const minOrder = req.body.min_order_value != null ? Number(req.body.min_order_value) : Number(d.min_order_value);
    const maxDiscount = req.body.max_discount_amount !== undefined ? (req.body.max_discount_amount ? Number(req.body.max_discount_amount) : null) : d.max_discount_amount;
    const limitVal = req.body.usage_limit !== undefined ? (req.body.usage_limit ? parseInt(req.body.usage_limit, 10) : null) : d.usage_limit;
    const isActive = req.body.is_active != null ? Boolean(req.body.is_active) : d.is_active;

    const updated = (await db.query(`
      UPDATE discounts
      SET title = $2, discount_value = $3, start_date = $4, end_date = $5, min_order_value = $6,
          max_discount_amount = $7, usage_limit = $8, is_active = $9
      WHERE id = $1
      RETURNING *
    `, [d.id, titleVal, val, startDate, endDate, minOrder, maxDiscount, limitVal, isActive])).rows[0];

    await audit(db, req, 'discounts', d.id, 'DISCOUNT_UPDATED', d, updated, d.branch_id);
    return updated;
  });
}));

// POST /discounts/validate - Kiểm tra và tính giá trị giảm giá cho đơn hàng
router.post('/discounts/validate', route(async req => {
  const { code: rawCode, order_amount, branch_id } = req.body;
  if (!rawCode) fail(400, 'Vui lòng nhập mã giảm giá');
  const codeVal = String(rawCode).trim().toUpperCase();
  const orderAmount = Number(order_amount || 0);

  const d = (await pool.query(`
    SELECT * FROM discounts WHERE code = $1
  `, [codeVal])).rows[0];

  if (!d) fail(404, 'Mã giảm giá không tồn tại', 'NOT_FOUND');
  if (!d.is_active) fail(400, 'Mã giảm giá hiện đang bị tạm khóa', 'INACTIVE');

  const currentDay = today();
  if (d.start_date > currentDay) fail(400, 'Mã giảm giá chưa đến ngày bắt đầu sử dụng', 'NOT_STARTED');
  if (d.end_date < currentDay) fail(400, 'Mã giảm giá đã hết hạn sử dụng', 'EXPIRED');

  if (d.usage_limit != null && d.used_count >= d.usage_limit) {
    fail(400, 'Mã giảm giá đã hết lượt sử dụng', 'LIMIT_EXCEEDED');
  }

  if (branch_id) {
    if (d.branch_id && d.branch_id !== branch_id) {
      fail(400, 'Mã giảm giá không áp dụng cho chi nhánh này', 'BRANCH_MISMATCH');
    }
    if (Array.isArray(d.branch_ids) && d.branch_ids.length > 0 && !d.branch_ids.includes(branch_id)) {
      fail(400, 'Mã giảm giá không áp dụng cho chi nhánh này', 'BRANCH_MISMATCH');
    }
  }

  if (orderAmount < Number(d.min_order_value)) {
    fail(400, `Đơn hàng tối thiểu phải từ ${Number(d.min_order_value).toLocaleString('vi-VN')} VNĐ để áp mã này`, 'MIN_ORDER_NOT_MET');
  }

  let discountAmount = 0;
  if (d.discount_type === 'PERCENT') {
    discountAmount = (orderAmount * Number(d.discount_value)) / 100;
    if (d.max_discount_amount && discountAmount > Number(d.max_discount_amount)) {
      discountAmount = Number(d.max_discount_amount);
    }
  } else {
    discountAmount = Math.min(orderAmount, Number(d.discount_value));
  }

  const finalAmount = Math.max(0, orderAmount - discountAmount);

  return {
    valid: true,
    discount_id: d.id,
    code: d.code,
    title: d.title,
    discount_type: d.discount_type,
    discount_value: Number(d.discount_value),
    discount_amount: discountAmount,
    original_amount: orderAmount,
    final_amount: finalAmount
  };
}));

module.exports = { router };

const express = require('express');
const { createHash } = require('crypto');
const { transaction } = require('../../db/postgres');
const { pool, route, fail, text, date, role, financial, selected, scope, branch, row, audit, code, page, only } = require('./http');
const router = express.Router();
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const authorize = req => { role(req, 'QTV'); financial(req); };
function period(input) {
  const from = date(input.date_from, 'date_from'), to = date(input.date_to, 'date_to');
  if (from > to) fail(400, 'Ngày kết thúc phải từ ngày bắt đầu trở đi.');
  return { date_from: from, date_to: to };
}
function cents(value) {
  const [whole, fraction = ''] = String(value).split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
}
function money(value) { return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`; }
function summarize(items) {
  const groups = new Map();
  let total = 0n;
  for (const item of items) {
    const key = item.payment_method === 'CASH' ? 'CASH' : item.bank_account_id || 'UNASSIGNED';
    if (!groups.has(key)) groups.set(key, { key, label: key === 'CASH' ? 'Tiền mặt' : key === 'UNASSIGNED' ? 'Chưa xác định tài khoản' : `${item.bank_bin} · ${item.account_no} · ${item.account_name}`, amount: 0n, count: 0 });
    const group = groups.get(key);
    group.amount += cents(item.amount); group.count++; total += cents(item.amount);
  }
  return { groups: [...groups.values()].map(g => ({ ...g, amount: money(g.amount) })), total_amount: money(total), count: items.length,
    unresolved_count: items.filter(i => i.payment_method !== 'CASH' && !i.bank_account_id).length };
}
async function details(db, id) {
  const batch = await row(db, 'revenue_handovers', id);
  const items = (await db.query('SELECT snapshot FROM revenue_handover_items WHERE handover_id=$1 ORDER BY snapshot->>\'confirmed_at\',payment_id', [id])).rows.map(r => r.snapshot);
  return { batch, items, ...summarize(items) };
}
async function preview(req, db, input, lock = false) {
  const branchId = selected(req), dates = period(input);
  const branchRow = await row(db, 'branches', branchId);
  const assignments = input.allocations || [];
  if (!Array.isArray(assignments) || assignments.length > 10000) fail(400, 'Danh sách tài khoản đối chiếu không hợp lệ.');
  const allocationMap = new Map();
  for (const a of assignments) {
    if (!a || !uuid(a.payment_id) || !uuid(a.bank_account_id) || allocationMap.has(a.payment_id)) fail(400, 'Mỗi giao dịch chỉ được chọn một tài khoản nhận tiền.');
    allocationMap.set(a.payment_id, a.bank_account_id);
  }
  const banks = (await db.query('SELECT * FROM revenue_bank_accounts WHERE branch_id=$1 ORDER BY id', [branchId])).rows;
  const bankMap = new Map(banks.map(a => [a.id, a]));
  const invalidReceipt = await db.query(`SELECT p.id FROM payments p LEFT JOIN receipts rc ON rc.payment_id=p.id
    WHERE p.branch_id=$1 AND p.confirmed_at IS NOT NULL
      AND (p.confirmed_at AT TIME ZONE $4)::date BETWEEN $2::date AND $3::date
      AND NOT EXISTS(SELECT 1 FROM revenue_handover_items hi WHERE hi.payment_id=p.id)
      AND (rc.id IS NULL OR rc.amount IS DISTINCT FROM p.amount) LIMIT 1`, [branchId, dates.date_from, dates.date_to, branchRow.timezone]);
  if (invalidReceipt.rowCount) fail(409, 'Có khoản thu thiếu phiếu thu hoặc lệch số tiền; cần kiểm tra chứng từ trước khi bàn giao.', 'RECEIPT_INCONSISTENT');
  // Receipt existence and confirmed_at distinguish successful historical rows without relying on a legacy status column.
  const items = (await db.query(`SELECT p.id payment_id,p.payment_code,p.amount,p.confirmed_at,
      replace(p.payment_method,'BANK_TRANSFER_VIETQR','BANK_TRANSFER') payment_method,p.transaction_ref,
      rc.id receipt_id,rc.receipt_code,m.id member_id,m.full_name member_name,m.member_code,m.phone member_phone,
      r.reg_code registration_code,r.package_name_snapshot package_name,COALESCE(a.full_name,a.login_phone) collected_by_name
    FROM payments p JOIN receipts rc ON rc.payment_id=p.id AND rc.amount=p.amount
    JOIN member_profiles m ON m.id=p.member_id JOIN registrations r ON r.id=p.registration_id
    LEFT JOIN accounts a ON a.id=p.collected_by
    WHERE p.branch_id=$1 AND p.confirmed_at IS NOT NULL
      AND (p.confirmed_at AT TIME ZONE $4)::date BETWEEN $2::date AND $3::date
      AND NOT EXISTS(SELECT 1 FROM revenue_handover_items hi WHERE hi.payment_id=p.id)
    ORDER BY p.confirmed_at,p.id LIMIT 10001 ${lock ? 'FOR UPDATE OF p,rc' : ''}`, [branchId, dates.date_from, dates.date_to, branchRow.timezone])).rows;
  if (items.length > 10000) fail(400, 'Kỳ có quá nhiều giao dịch; vui lòng chọn khoảng ngày ngắn hơn.');
  const itemMap = new Map(items.map(i => [i.payment_id, i]));
  for (const [id, bankId] of allocationMap) {
    if (!itemMap.has(id)) fail(409, 'Danh sách giao dịch đã thay đổi. Vui lòng tải lại đối chiếu.', 'HANDOVER_STALE');
    if (itemMap.get(id).payment_method !== 'BANK_TRANSFER' || !bankMap.has(bankId)) fail(400, 'Tài khoản nhận tiền phải thuộc đúng chi nhánh và giao dịch chuyển khoản.');
  }
  for (const item of items) {
    if (!['CASH', 'BANK_TRANSFER'].includes(item.payment_method)) fail(409, 'Có phương thức thanh toán chưa được hỗ trợ đối chiếu.');
    const bankAccount = bankMap.get(allocationMap.get(item.payment_id));
    Object.assign(item, { bank_account_id: bankAccount?.id || null, bank_bin: bankAccount?.bank_bin || null, account_no: bankAccount?.account_no || null, account_name: bankAccount?.account_name || null });
  }
  const summary = summarize(items);
  const payload = { branch_id: branchId, ...dates, timezone: branchRow.timezone, items };
  return { ...payload, ...summary, preview_token: createHash('sha256').update(JSON.stringify(payload)).digest('hex') };
}

router.get('/revenue-bank-accounts', route(async req => {
  authorize(req);
  return (await pool.query('SELECT * FROM revenue_bank_accounts WHERE ($1::uuid[] IS NULL OR branch_id=ANY($1)) ORDER BY bank_bin,account_no', [scope(req)])).rows;
}));
router.post('/revenue-bank-accounts', route(async req => {
  authorize(req); only(req.body, ['bank_bin', 'account_no', 'account_name']);
  const branchId = selected(req);
  const bin = text(req.body.bank_bin, 'bank_bin', 6), number = text(req.body.account_no, 'account_no', 30), name = text(req.body.account_name, 'account_name', 150);
  if (!/^\d{6}$/.test(bin) || !/^\d{1,30}$/.test(number)) fail(400, 'BIN phải gồm 6 chữ số; số tài khoản gồm 1-30 chữ số.');
  return transaction(async db => {
    const saved = (await db.query('INSERT INTO revenue_bank_accounts(branch_id,bank_bin,account_no,account_name,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *', [branchId, bin, number, name, req.user.account_id])).rows[0];
    await audit(db, req, 'revenue_bank_accounts', saved.id, 'REVENUE_BANK_ACCOUNT_CREATED', null, saved, branchId);
    return saved;
  });
}));
router.get('/revenue-handovers/preview', route(async req => { authorize(req); return preview(req, pool, req.query); }));
router.post('/revenue-handovers/preview', route(async req => {
  authorize(req); only(req.body, ['date_from', 'date_to', 'allocations']);
  return preview(req, pool, req.body);
}));
router.get('/revenue-handovers', route(async req => {
  authorize(req);
  const from = req.query.date_from ? date(req.query.date_from) : null, to = req.query.date_to ? date(req.query.date_to) : null;
  if (from && to && from > to) fail(400, 'Khoảng ngày không hợp lệ.');
  const list = (await pool.query(`SELECT * FROM revenue_handovers WHERE ($1::uuid[] IS NULL OR branch_id=ANY($1))
    AND ($2::date IS NULL OR (confirmed_at AT TIME ZONE timezone)::date >=$2)
    AND ($3::date IS NULL OR (confirmed_at AT TIME ZONE timezone)::date <=$3) ORDER BY confirmed_at DESC,id`, [scope(req), from, to])).rows;
  return page(list, req.query);
}));
router.get('/revenue-handovers/:id', route(async req => {
  authorize(req);
  const batch = await row(pool, 'revenue_handovers', req.params.id);
  branch(req, batch.branch_id);
  if (scope(req) && !scope(req).includes(batch.branch_id)) fail(403, 'Kỳ bàn giao ngoài chi nhánh đang chọn.', 'FORBIDDEN');
  return details(pool, batch.id);
}));
router.post('/revenue-handovers', route(async req => {
  authorize(req); only(req.body, ['date_from', 'date_to', 'allocations', 'preview_token', 'confirmed', 'note']);
  const branchId = selected(req), dates = period(req.body);
  if (req.body.confirmed !== true) fail(400, 'Cần xác nhận đã bàn giao đầy đủ.');
  if (!/^[0-9a-f]{64}$/.test(req.body.preview_token || '')) fail(400, 'Vui lòng tải bảng đối chiếu trước khi xác nhận.');
  const note = text(req.body.note, 'note', 1000, false);
  return transaction(async db => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext('revenue-handover:' || $1))", [branchId]);
    const old = (await db.query('SELECT * FROM revenue_handovers WHERE branch_id=$1 AND preview_token=$2', [branchId, req.body.preview_token])).rows[0];
    if (old) {
      if (old.date_from !== dates.date_from || old.date_to !== dates.date_to) fail(409, 'Mã đối chiếu không khớp kỳ bàn giao.');
      return details(db, old.id);
    }
    const current = await preview(req, db, req.body, true);
    if (current.preview_token !== req.body.preview_token) fail(409, 'Dữ liệu đã thay đổi; vui lòng tải lại và kiểm tra trước khi chốt.', 'HANDOVER_STALE');
    if (!current.count) fail(409, 'Không có khoản thu chưa bàn giao trong kỳ.');
    if (current.unresolved_count) fail(409, 'Cần đối chiếu tài khoản nhận cho mọi khoản chuyển khoản trước khi chốt.', 'BANK_ACCOUNT_REQUIRED');
    const account = await row(db, 'accounts', req.user.account_id), location = await row(db, 'branches', branchId);
    const batch = (await db.query(`INSERT INTO revenue_handovers(handover_code,branch_id,date_from,date_to,timezone,total_amount,payment_count,confirmed_by,confirmed_by_name,branch_name,note,preview_token)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`, [await code(db, 'revenue_handovers', 'handover_code', 'BG'), branchId, dates.date_from, dates.date_to, current.timezone, current.total_amount, current.count, req.user.account_id, account.full_name || account.login_phone, location.branch_name, note, current.preview_token])).rows[0];
    for (const item of current.items) {
      await db.query(`INSERT INTO revenue_handover_items(handover_id,payment_id,receipt_id,bank_account_id,amount,payment_method,snapshot)
        VALUES($1,$2,$3,$4,$5,$6,$7)`, [batch.id, item.payment_id, item.receipt_id, item.bank_account_id, item.amount, item.payment_method, JSON.stringify(item)]);
    }
    await audit(db, req, 'revenue_handovers', batch.id, 'REVENUE_HANDOVER_CONFIRMED', null, batch, branchId, note);
    return details(db, batch.id);
  });
}));
module.exports = { router, summarize };

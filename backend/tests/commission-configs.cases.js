const assert = require('node:assert/strict');
const { getPtCommissionRate } = require('../src/modules/core/commissions');

module.exports = async function commissionConfigsCases({ request, db, A, L, pt, b1, b2 }) {
  // 1. RBAC: Lễ tân không có quyền cấu hình hoa hồng -> 403
  await request('/commissions/configs', { token: L, status: 403 });
  await request('/commissions/configs', {
    token: L, method: 'POST',
    body: { branch_id: b1, commission_percentage: 20 },
    status: 403
  });

  // 2. QTV hợp lệ lấy danh sách cấu hình
  const configs = await request('/commissions/configs', { token: A });
  assert(Array.isArray(configs), 'Danh sách cấu hình phải là mảng');

  // Kiểm tra Branch Default Guarantee: b1 và b2 đều có cấu hình mặc định tự sinh (pt_id IS NULL)
  const defaultB1 = configs.find(c => c.branch_id === b1 && !c.pt_id);
  const defaultB2 = configs.find(c => c.branch_id === b2 && !c.pt_id);
  assert(defaultB1, 'Chi nhánh b1 phải có cấu hình mặc định (Branch Default)');
  assert(defaultB2, 'Chi nhánh b2 phải có cấu hình mặc định (Branch Default)');
  assert.equal(Number(defaultB1.commission_percentage), 20.00);
  assert.equal(defaultB1.is_active, true);
  assert.equal(defaultB1.version, 1);

  // 3. Cập nhật Branch Default b1 (không được tạo mới, chỉ cập nhật)
  const updatedDefault = await request('/commissions/configs', {
    token: A, method: 'POST',
    body: { branch_id: b1, pt_id: null, commission_percentage: 22.5, note: 'Nâng tỷ lệ chi nhánh 2026' }
  });
  assert.equal(updatedDefault.id, defaultB1.id, 'Phải cập nhật đúng identity row của Branch Default');
  assert.equal(Number(updatedDefault.commission_percentage), 22.5);
  assert.equal(updatedDefault.version, 2, 'Version phải tăng lên 2');
  assert.equal(updatedDefault.is_active, true);

  // Kiểm tra lịch sử của Branch Default
  const defaultHistoryRes = await request(`/commissions/configs/${defaultB1.id}/history`, { token: A });
  assert.equal(defaultHistoryRes.history.length, 2);
  const [dh2, dh1] = defaultHistoryRes.history;
  assert.equal(dh2.version, 2);
  assert.equal(dh2.action, 'UPDATE');
  assert.equal(Number(dh2.commission_percentage), 22.5);
  assert.equal(dh2.effective_to, null);
  assert.equal(dh1.version, 1);
  assert.equal(dh1.action, 'CREATE');
  assert.notEqual(dh1.effective_to, null);

  // 4. Chặn không cho gỡ / xóa Branch Default
  await request(`/commissions/configs/${defaultB1.id}/remove-override`, {
    token: A, method: 'POST',
    body: { note: 'Thử gỡ mặc định' },
    status: 400
  });

  // 5. Tạo mới PT Override cho pt tại b1
  const ptOverride = await request('/commissions/configs', {
    token: A, method: 'POST',
    body: { branch_id: b1, pt_id: pt.id, commission_percentage: 28.0, note: 'Tỷ lệ riêng HLV sao' }
  });
  assert.equal(ptOverride.branch_id, b1);
  assert.equal(ptOverride.pt_id, pt.id);
  assert.equal(Number(ptOverride.commission_percentage), 28.0);
  assert.equal(ptOverride.version, 1);
  assert.equal(ptOverride.is_active, true);

  // 6. Cập nhật PT Override lên 30%
  const ptOverrideV2 = await request('/commissions/configs', {
    token: A, method: 'POST',
    body: { branch_id: b1, pt_id: pt.id, commission_percentage: 30.0, note: 'Tăng lên 30%' }
  });
  assert.equal(ptOverrideV2.id, ptOverride.id, 'Identity row phải duy nhất vĩnh viễn');
  assert.equal(ptOverrideV2.version, 2);
  assert.equal(Number(ptOverrideV2.commission_percentage), 30.0);

  // 7. Bỏ cấu hình riêng (Remove Override) -> Zero Hard Delete
  const removedOverride = await request(`/commissions/configs/${ptOverride.id}/remove-override`, {
    token: A, method: 'POST',
    body: { note: 'HLV quay về mức mặc định' }
  });
  assert.equal(removedOverride.is_active, false, 'Cấu hình chuyển sang is_active = false');
  assert.equal(removedOverride.version, 3, 'Version tăng lên 3');

  // Kiểm tra DB: bản ghi vẫn tồn tại nguyên vẹn, không bị DELETE
  const rowInDb = (await db.query('SELECT * FROM pt_commission_configs WHERE id = $1', [ptOverride.id])).rows[0];
  assert(rowInDb, 'Row trong pt_commission_configs không được bị xóa vật lý!');
  assert.equal(rowInDb.is_active, false);

  // Kiểm tra history sau khi REMOVE_OVERRIDE
  const ptHistoryRes = await request(`/commissions/configs/${ptOverride.id}/history`, { token: A });
  assert.equal(ptHistoryRes.history.length, 3);
  assert.equal(ptHistoryRes.history[0].action, 'REMOVE_OVERRIDE');
  assert.equal(ptHistoryRes.history[0].is_active, false);
  assert.equal(ptHistoryRes.history[0].version, 3);

  // 8. Kích hoạt lại (Reactivate) PT Override
  const reactivated = await request('/commissions/configs', {
    token: A, method: 'POST',
    body: { branch_id: b1, pt_id: pt.id, commission_percentage: 32.0, note: 'Kích hoạt lại 32%' }
  });
  assert.equal(reactivated.id, ptOverride.id);
  assert.equal(reactivated.is_active, true);
  assert.equal(reactivated.version, 4);
  assert.equal(Number(reactivated.commission_percentage), 32.0);

  const ptHistoryV4 = await request(`/commissions/configs/${ptOverride.id}/history`, { token: A });
  assert.equal(ptHistoryV4.history.length, 4);
  assert.equal(ptHistoryV4.history[0].action, 'REACTIVATE');
  assert.equal(ptHistoryV4.history[0].is_active, true);

  // 8.1. Kiểm tra validation và áp dụng theo kỳ tháng tương lai (> kỳ hiện tại)
  // Không cho phép cấu hình kỳ tháng quá khứ hoặc hiện tại
  await request('/commissions/configs', {
    token: A, method: 'POST',
    body: { branch_id: b1, pt_id: pt.id, commission_percentage: 33.0, effective_year: 2026, effective_month: 8 },
    status: 400
  });
  await request('/commissions/configs', {
    token: A, method: 'POST',
    body: { branch_id: b1, pt_id: pt.id, commission_percentage: 33.0, effective_year: 2026, effective_month: 9 },
    status: 400
  });

  // Cho phép cấu hình kỳ tháng tương lai (Tháng 10/2026)
  const futureConfig = await request('/commissions/configs', {
    token: A, method: 'POST',
    body: { branch_id: b1, pt_id: pt.id, commission_percentage: 35.0, effective_year: 2026, effective_month: 10, note: 'Áp dụng từ Tháng 10' }
  });
  assert.equal(Number(futureConfig.commission_percentage), 35.0);
  assert.equal(futureConfig.version, 5);

  const configsWithMonth = await request('/commissions/configs', { token: A });
  const cfgItem = configsWithMonth.find(c => c.id === ptOverride.id);
  assert.equal(cfgItem.effective_month, 10);
  assert.equal(cfgItem.effective_year, 2026);

  // 9. Rate Resolver Helper test:
  // 9.1. Đang có PT Override active -> Rate tại thời điểm hiện tại (Tháng 9/2026) vẫn là 32%
  await new Promise(r => setTimeout(r, 50));
  const rateActive = await getPtCommissionRate(db, pt.id, b1, new Date());
  assert.equal(rateActive, 32.0, 'Kỳ hiện tại phải giữ nguyên tỷ lệ cũ 32%');

  // Rate tại kỳ tương lai (Tháng 10/2026) sẽ là 35.0%
  const rateFuture = await getPtCommissionRate(db, pt.id, b1, new Date('2026-10-05T08:00:00+07:00'));
  assert.equal(rateFuture, 35.0, 'Kỳ tương lai Tháng 10 phải áp dụng tỷ lệ mới 35%');

  // 9.2. Gỡ bỏ PT Override -> Rate fallback về Branch Default = 22.5%
  await request(`/commissions/configs/${ptOverride.id}/remove-override`, {
    token: A, method: 'POST',
    body: { note: 'Gỡ lại để test fallback' }
  });
  await new Promise(r => setTimeout(r, 50));
  const rateFallback = await getPtCommissionRate(db, pt.id, b1, new Date());
  assert.equal(rateFallback, 22.5, 'PT phải fallback về Branch Default 22.5%');

  // 9.3. Tra cứu chi nhánh không tồn tại Branch Default -> Ném lỗi hệ thống (không 20% ngầm)
  const fakeBranchId = '99999999-9999-9999-9999-999999999999';
  let thrown = false;
  try {
    await getPtCommissionRate(db, pt.id, fakeBranchId, new Date());
  } catch (err) {
    thrown = true;
    assert(err.message.includes('BRANCH_DEFAULT_COMMISSION_NOT_CONFIGURED'));
  }
  // 10. Tạo chi nhánh mới với tỷ lệ hoa hồng mặc định tùy chỉnh (W13/W15)
  // 10.1. Validation lỗi khi nhập % âm hoặc > 100
  await request('/branches', {
    token: A, method: 'POST',
    body: {
      branch_name: 'Chi Nhánh Test Invalid Pct',
      phone: '0901234567',
      address: '123 Đường Test Validation, Q1, TP.HCM',
      open_time: '06:00', close_time: '22:00',
      default_pt_commission_percentage: 150
    },
    status: 400
  });

  // 10.2. Tạo chi nhánh mới thành công với tỷ lệ tùy chỉnh 27.5%
  const newBranch = await request('/branches', {
    token: A, method: 'POST',
    body: {
      branch_name: 'Chi Nhánh Phú Nhuận Hoa Hồng 27.5%',
      phone: '0909876543',
      address: '456 Phan Xích Long, Phường 2, Phú Nhuận, TP.HCM',
      open_time: '06:00', close_time: '22:00',
      default_pt_commission_percentage: 27.5
    }
  });
  assert(newBranch.id, 'Phải tạo thành công chi nhánh mới');
  assert.equal(Number(newBranch.default_pt_commission_percentage), 27.5);

  // 10.3. Kiểm tra trigger tự sinh cấu hình hoa hồng v1 với đúng 27.5%
  const newBranchConfigs = await request('/commissions/configs', { token: A });
  const newBranchDefault = newBranchConfigs.find(c => c.branch_id === newBranch.id && !c.pt_id);
  assert(newBranchDefault, 'Chi nhánh mới tạo phải tự sinh Branch Default');
  assert.equal(Number(newBranchDefault.commission_percentage), 27.5, 'Tỷ lệ v1 phải đúng 27.5% như QTV đã nhập');
  assert.equal(newBranchDefault.version, 1);
  assert.equal(newBranchDefault.is_active, true);

  // 10.4. Kiểm tra lịch sử v1 tương ứng
  const newBranchHistoryRes = await request(`/commissions/configs/${newBranchDefault.id}/history`, { token: A });
  assert.equal(newBranchHistoryRes.history.length, 1);
  assert.equal(newBranchHistoryRes.history[0].version, 1);
  assert.equal(Number(newBranchHistoryRes.history[0].commission_percentage), 27.5);
  assert.equal(newBranchHistoryRes.history[0].action, 'CREATE');

  // 10.5. Kiểm tra Rate Resolver: PT tại chi nhánh mới nhận đúng 27.5%
  const resolvedRateNewBranch = await getPtCommissionRate(db, pt.id, newBranch.id, new Date());
  assert.equal(resolvedRateNewBranch, 27.5, 'PT tại chi nhánh mới phải nhận đúng 27.5%');

  // 11. Kiểm thử Chi Trả Hoa Hồng Trực Tiếp (1-Touch Direct Payout & Enforcement)
  // 11.1. Chặn chi trả khi hoa hồng = 0đ -> HTTP 400
  const zeroComm = (await db.query(`
    INSERT INTO pt_commissions (pt_id, month, year, total_pt_sessions_taught, pt_revenue_share, commission_percentage, total_commission_amount, status)
    VALUES ($1, 7, 2026, 0, 0, 20, 0, 'PENDING')
    RETURNING *
  `, [pt.id])).rows[0];

  await request(`/commissions/${zeroComm.id}/status`, {
    token: A, method: 'PUT',
    body: { status: 'PAID', payout_method: 'BANK_TRANSFER' },
    status: 400
  });

  // 11.2. Chi trả trực tiếp thành công từ trạng thái PENDING với hoa hồng > 0đ
  const validComm = (await db.query(`
    INSERT INTO pt_commissions (pt_id, month, year, total_pt_sessions_taught, pt_revenue_share, commission_percentage, total_commission_amount, status)
    VALUES ($1, 8, 2026, 10, 10000000, 25, 2500000, 'PENDING')
    RETURNING *
  `, [pt.id])).rows[0];

  const payoutResult = await request(`/commissions/${validComm.id}/status`, {
    token: A, method: 'PUT',
    body: {
      status: 'PAID',
      payout_method: 'BANK_TRANSFER',
      payout_ref: 'FT26092026123',
      payout_note: 'Chi trả hoa hồng tháng 8/2026',
      bank_name: 'MB Bank',
      bank_account_no: '0900000003',
      bank_account_name: 'NGUYEN VAN THE'
    }
  });
  assert.equal(payoutResult.status, 'PAID');
  assert.equal(payoutResult.payout_method, 'BANK_TRANSFER');
  assert.equal(payoutResult.payout_ref, 'FT26092026123');
  assert.equal(payoutResult.payout_note, 'Chi trả hoa hồng tháng 8/2026');
  assert(payoutResult.paid_at, 'paid_at phải được ghi nhận');

  // 11.3. Hồ sơ PT được cập nhật thông tin ngân hàng
  const ptProf = (await db.query('SELECT bank_name, bank_account_no, bank_account_name FROM pt_profiles WHERE id = $1', [pt.id])).rows[0];
  assert.equal(ptProf.bank_name, 'MB Bank');
  assert.equal(ptProf.bank_account_no, '0900000003');

  // 11.4. GET /commissions/:id/details trả về đầy đủ metadata chi trả & người chi trả
  const commDetails = await request(`/commissions/${validComm.id}/details`, { token: A });
  assert.equal(commDetails.commission.status, 'PAID');
  assert.equal(commDetails.commission.payout_method, 'BANK_TRANSFER');
  assert.equal(commDetails.commission.payout_ref, 'FT26092026123');
  assert.equal(commDetails.commission.payout_note, 'Chi trả hoa hồng tháng 8/2026');

  // 11.5. GET /commissions/monthly trả về bản ghi kèm thông tin thanh toán
  const monthlyList = await request('/commissions/monthly?month=8&year=2026', { token: A });
  const paidItem = monthlyList.find(c => c.id === validComm.id);
  assert(paidItem, 'Bản ghi hoa hồng đã chi trả phải xuất hiện trong danh sách tháng');
  assert.equal(paidItem.status, 'PAID');
  assert.equal(paidItem.payout_ref, 'FT26092026123');

  // 11.6. Kiểm tra thông báo in-app gửi tới tài khoản PT
  const notif = (await db.query("SELECT * FROM notifications WHERE account_id = (SELECT account_id FROM pt_profiles WHERE id = $1) AND (reference_type = 'pt_commissions' OR event_type = 'COMMISSION_PAID')", [pt.id])).rows[0];
  assert(notif, 'Phải sinh thông báo COMMISSION_PAID cho HLV');
  assert(notif.body.includes('2.500.000'));

  console.log('PASS W15 PT Commission: Branch Default Guarantee, Survivor Dedupe, Zero Hard Delete, Version History, Rate Resolution, Custom Initial Rate, Payout Validation and In-app Notification');
};

const express = require('express');
const router = express.Router();
const { store } = require('../../config/db');
const { success } = require('../../utils/response');
const { authenticate } = require('../../middlewares/auth');
const { authorize } = require('../../middlewares/rbac');

router.get('/', authenticate, authorize('QTV'), (req, res) => {
  const { table, actor_id, branch_id } = req.query;
  let list = store.audit_logs;
  if (table) list = list.filter(a => a.target_table === table);
  if (actor_id) list = list.filter(a => a.actor_account_id === actor_id);
  if (branch_id) list = list.filter(a => a.branch_id === branch_id);

  return success(res, list.slice(-50).map(a => {
    const actor = store.accounts.find(acc => acc.id === a.actor_account_id);
    return {
      ...a,
      timestamp: a.created_at,
      actor: actor?.login_phone ? `${actor.login_phone} (QTV)` : (a.actor_account_id || 'System'),
      action: a.action_name,
      details: a.reason || (typeof a.new_values === 'object' ? JSON.stringify(a.new_values) : a.new_values) || ''
    };
  }), 'Lấy nhật ký kiểm toán (Audit Logs) thành công');
});

module.exports = router;

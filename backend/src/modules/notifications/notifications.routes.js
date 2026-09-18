const express = require('express');
const router = express.Router();
const { store } = require('../../config/db');
const { success, error } = require('../../utils/response');
const { authenticate } = require('../../middlewares/auth');

router.get('/', authenticate, (req, res) => {
  const accountId = req.user.account_id;
  const list = store.notifications.filter(n => n.account_id === accountId);
  return success(res, list, 'Lấy danh sách thông báo thành công');
});

router.put('/:id/read', authenticate, (req, res) => {
  const notif = store.notifications.find(n => n.id === req.params.id && n.account_id === req.user.account_id);
  if (!notif) return error(res, 'Không tìm thấy thông báo', 404);
  notif.is_read = true;
  notif.read_at = new Date();
  return success(res, notif, 'Đánh dấu đã đọc thành công');
});

module.exports = router;

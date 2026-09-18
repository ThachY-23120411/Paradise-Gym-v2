const express = require('express');
const router = express.Router();
const controller = require('./access-gate.controller');
const { authenticate } = require('../../middlewares/auth');
const { authorize } = require('../../middlewares/rbac');

router.post('/check-in', controller.checkIn);
router.post('/manual-checkin', authenticate, authorize('QTV', 'RECEPTIONIST'), controller.manualCheckIn);
router.get('/today-logs', authenticate, controller.getTodayLogs);

module.exports = router;

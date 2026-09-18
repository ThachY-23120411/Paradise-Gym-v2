const express = require('express');
const router = express.Router();
const controller = require('./pt-bookings.controller');
const { authenticate } = require('../../middlewares/auth');
const { authorize } = require('../../middlewares/rbac');

router.get('/available-slots', authenticate, controller.getSlots);
router.get('/trainers', authenticate, controller.listTrainers);
router.get('/', authenticate, controller.listBookings);
router.post('/', authenticate, controller.createBooking);
router.post('/:id/cancel', authenticate, controller.cancelBooking);
router.post('/:id/pt-confirm', authenticate, authorize('PT', 'QTV'), controller.ptConfirm);
router.post('/:id/member-confirm', authenticate, authorize('MEMBER', 'QTV'), controller.memberConfirm);

router.get('/assignment-requests', authenticate, controller.listAssignmentRequests);
router.post('/assignment-request', authenticate, controller.requestAssignment);
router.post('/assignment-request/:id/respond', authenticate, authorize('PT', 'QTV'), controller.respondAssignment);

module.exports = router;

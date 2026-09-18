const express = require('express');
const router = express.Router();
const controller = require('./registrations.controller');
const { authenticate } = require('../../middlewares/auth');
const { authorize } = require('../../middlewares/rbac');

router.get('/', authenticate, controller.listRegistrations);
router.get('/:id', authenticate, controller.getRegistrationDetail);
router.post('/', authenticate, authorize('QTV', 'RECEPTIONIST', 'MEMBER'), controller.createRegistration);

module.exports = router;

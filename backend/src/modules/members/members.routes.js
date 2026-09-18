const express = require('express');
const router = express.Router();
const membersController = require('./members.controller');
const { authenticate } = require('../../middlewares/auth');
const { authorize } = require('../../middlewares/rbac');

router.get('/search-phone', authenticate, membersController.searchPhone);
router.get('/', authenticate, membersController.listMembers);
router.get('/:id', authenticate, membersController.getMemberDetail);
router.post('/', authenticate, authorize('QTV', 'RECEPTIONIST'), membersController.createMember);
router.put('/:id', authenticate, authorize('QTV', 'RECEPTIONIST'), membersController.updateMember);

module.exports = router;

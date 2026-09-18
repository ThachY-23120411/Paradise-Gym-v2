const express = require('express');
const router = express.Router();
const controller = require('./branches.controller');
const { authenticate } = require('../../middlewares/auth');
const { authorize } = require('../../middlewares/rbac');

router.get('/', controller.listBranches);
router.get('/:id', controller.getBranchById);
router.post('/', authenticate, authorize('QTV'), controller.createBranch);

module.exports = router;

const express = require('express');
const router = express.Router();
const controller = require('./packages.controller');
const { authenticate } = require('../../middlewares/auth');
const { authorize } = require('../../middlewares/rbac');

router.get('/', controller.listPackages);
router.get('/:id', controller.getPackageDetail);
router.post('/', authenticate, authorize('QTV'), controller.createPackage);

module.exports = router;

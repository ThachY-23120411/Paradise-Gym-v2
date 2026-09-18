const express = require('express');
const router = express.Router();
const controller = require('./payments.controller');
const { authenticate } = require('../../middlewares/auth');
const { authorize } = require('../../middlewares/rbac');

router.post('/create-invoice', authenticate, controller.createInvoice);
router.post('/:id/confirm', authenticate, authorize('QTV', 'RECEPTIONIST', 'MEMBER'), controller.confirmPayment);
router.post('/check-bank-status', authenticate, controller.confirmPayment); // Alias for bank verification
router.get('/:id/receipt', authenticate, controller.getReceipt);

module.exports = router;

const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth');

router.post('/login-password', authController.loginPassword);
router.post('/request-otp', authController.requestOtp);
router.post('/login-otp', authController.loginOtp);
router.post('/verify-2fa', authController.verify2fa);
router.post('/social-login', authController.socialLogin);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

module.exports = router;

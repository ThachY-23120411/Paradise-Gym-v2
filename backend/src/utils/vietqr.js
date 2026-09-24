const env = require('../config/env');

function generateVietQR({ amount, paymentCode, description }) {
  const bankBin = env.BANK_BIN;
  const accountNo = env.BANK_ACCOUNT_NO;
  const accountName = env.BANK_ACCOUNT_NAME;
  if(!/^\d{6}$/.test(bankBin)||!/^\d{1,30}$/.test(accountNo)||!accountName.trim())throw Object.assign(new Error('Chưa cấu hình đầy đủ tài khoản ngân hàng nhận tiền.'),{status:503,code:'BANK_CONFIGURATION_REQUIRED'});
  const requestedContent = paymentCode || description || 'PARADISE_GYM';
  // VietinBank personal API only reports transfers whose content starts with SEVQR.
  const content = bankBin === '970415' && !/^SEVQR(?:\s|$)/i.test(requestedContent)
    ? `SEVQR ${requestedContent}`
    : requestedContent;

  // QuickLink URL standard for VietQR (VietQR.io format)
  const qrImageUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(accountName)}`;

  return {
    bankBin,
    accountNo,
    accountName,
    amount,
    paymentCode,
    transferContent: content,
    qrImageUrl
  };
}

module.exports = { generateVietQR };

process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5435/paradise_gym';
const { pool } = require('../../backend/src/modules/core/http');

(async () => {
  const otpRes = await fetch('http://127.0.0.1:5000/api/v1/auth/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_phone: '0987654321' })
  }).then(r => r.json());

  const devOtp = otpRes.data?.dev_otp;

  const loginRes = await fetch('http://127.0.0.1:5000/api/v1/auth/login-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_phone: '0987654321', otp_code: devOtp })
  }).then(r => r.json());

  const token = loginRes.data?.access_token;

  const paymentsApiRes = await fetch('http://127.0.0.1:5000/api/v1/payments?limit=1000&page=1', {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json());

  const items = paymentsApiRes.data?.items || paymentsApiRes.data || [];
  console.log('GET /payments items count:', items.length);
  console.log('First 2 items:', items.slice(0, 2));

  // Test filter as frontend does:
  const filtered = items.filter(p => p.status === 'COMPLETED' || p.confirmed_at);
  console.log('Frontend filter count:', filtered.length);

  process.exit(0);
})();

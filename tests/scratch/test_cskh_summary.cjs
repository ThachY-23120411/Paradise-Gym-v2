

(async () => {
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_phone: '0900000001', password: 'Paradise@123', active_role: 'QTV' })
  }).then(r => r.json());

  let token = loginRes.data?.access_token;
  if (loginRes.data?.requires_2fa) {
    const v = await fetch('http://localhost:5000/api/v1/auth/verify-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token: loginRes.data.temp_token, otp_code: loginRes.data.dev_otp })
    }).then(r => r.json());
    token = v.data?.access_token;
  }

  const summaryRes = await fetch('http://localhost:5000/api/v1/customer-care/summary', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());

  console.log('Customer care summary response:', JSON.stringify(summaryRes, null, 2));
})();

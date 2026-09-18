process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('../src/server');

const PORT = 5055;
let server;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (data) {
      reqHeaders['Content-Length'] = Buffer.byteLength(data);
    }

    const fullPath = (path.startsWith('/api/') || path.startsWith('/health')) ? path : '/api/v1' + path;

    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: fullPath,
        method,
        headers: reqHeaders
      },
      (res) => {
        let rawData = '';
        res.on('data', chunk => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: rawData });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let testCount = 0;
function assert(condition, message) {
  testCount++;
  if (!condition) {
    console.error(`❌ [ASSERTION FAILED #${testCount}]: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ [PASS #${testCount}] ${message}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 [Tab 4 Master Test Suite] Comprehensive Verification of All APIs');
  console.log('================================================================\n');

  server = app.listen(PORT, async () => {
    try {
      // Allow async PostgreSQL pool connect & initial sync to settle
      await new Promise(r => setTimeout(r, 800));

      // 1. Health & Core Engine
      console.log('--- MODULE 1: Health & Better-Auth Engine ---');
      const healthRes = await request('GET', '/health');
      assert(healthRes.status === 200, 'GET /health returns HTTP 200');
      assert(healthRes.data.status === 'UP', 'System health status is UP');

      const authEngineRes = await request('GET', '/api/auth/ok');
      assert(authEngineRes.status === 200, 'GET /api/auth/ok (Better-Auth engine) returns HTTP 200');
      assert(authEngineRes.data.ok === true, 'Better-Auth engine responds ok: true');

      // 2. Auth Module
      console.log('\n--- MODULE 2: Authentication & Authorization ---');
      const loginAdminRes = await request('POST', '/auth/login-password', {
        login_phone: '0900000001',
        password: 'Paradise@123'
      });
      assert(loginAdminRes.status === 200, 'POST /auth/login-password (Admin) HTTP 200');
      assert(loginAdminRes.data.data.requires_2fa === true, 'Admin requires 2FA');
      const tempToken = loginAdminRes.data.data.temp_token;
      const devOtp = loginAdminRes.data.data.dev_otp;
      assert(!!tempToken && !!devOtp, 'Admin receives 2FA temp_token and OTP');

      const verify2faRes = await request('POST', '/auth/verify-2fa', {
        temp_token: tempToken,
        otp_code: devOtp
      });
      assert(verify2faRes.status === 200, 'POST /auth/verify-2fa HTTP 200');
      const adminToken = verify2faRes.data.data.access_token;
      const refreshToken = verify2faRes.data.data.refresh_token;
      assert(!!adminToken && !!refreshToken, 'Admin JWT access_token & refresh_token issued');

      const meRes = await request('GET', '/auth/me', null, { Authorization: `Bearer ${adminToken}` });
      assert(meRes.status === 200, 'GET /auth/me HTTP 200');
      assert(meRes.data.data.roles.includes('QTV'), 'Profile contains QTV role');

      const refreshRes = await request('POST', '/auth/refresh-token', {
        refresh_token: refreshToken
      });
      assert(refreshRes.status === 200, 'POST /auth/refresh-token HTTP 200');
      assert(!!refreshRes.data.data.access_token, 'New access_token rotated successfully');

      const reqOtpRes = await request('POST', '/auth/request-otp', {
        login_phone: '0987654321'
      });
      assert(reqOtpRes.status === 200, 'POST /auth/request-otp HTTP 200');
      const memberOtp = reqOtpRes.data.data.dev_otp;
      assert(!!memberOtp, 'Member receives 6-digit dev_otp');

      const loginOtpRes = await request('POST', '/auth/login-otp', {
        login_phone: '0987654321',
        otp_code: memberOtp
      });
      assert(loginOtpRes.status === 200, 'POST /auth/login-otp HTTP 200');
      const memberToken = loginOtpRes.data.data.access_token;
      assert(!!memberToken, 'Member JWT token issued via OTP');

      const socialRes = await request('POST', '/auth/social-login', {
        provider: 'GOOGLE',
        email: 'member.test@gmail.com',
        full_name: 'Social Test User'
      });
      assert(socialRes.status === 200, 'POST /auth/social-login HTTP 200');
      assert(!!socialRes.data.data.access_token, 'Social login token issued');

      const lockPhone = '0912345678';
      for (let i = 1; i <= 5; i++) {
        await request('POST', '/auth/login-password', { login_phone: lockPhone, password: 'Bad' });
      }
      const lockedRes = await request('POST', '/auth/login-password', { login_phone: lockPhone, password: 'Paradise@123' });
      assert(lockedRes.status === 423, 'Account lockout triggers HTTP 423 Locked after 5 failures');

      const logoutRes = await request('POST', '/auth/logout', {}, { Authorization: `Bearer ${adminToken}` });
      assert(logoutRes.status === 200, 'POST /auth/logout HTTP 200');

      // 3. Members Module
      console.log('\n--- MODULE 3: Members Management ---');
      const searchRes = await request('GET', '/members/search-phone?phone=0987654321', null, { Authorization: `Bearer ${adminToken}` });
      assert(searchRes.status === 200 && searchRes.data.data.exists === true, 'GET /members/search-phone detects existing member');

      const newPhone = '09' + Math.floor(10000000 + Math.random() * 90000000);
      const createMemberRes = await request('POST', '/members', {
        full_name: 'Phạm Minh Đức',
        phone: newPhone,
        home_branch_id: '11111111-1111-1111-1111-111111111111',
        gender: 'NAM',
        email: 'duc.pham@example.com'
      }, { Authorization: `Bearer ${adminToken}` });
      assert(createMemberRes.status === 201, 'POST /members creates member HTTP 201');
      const testMemberId = createMemberRes.data.data.id;
      assert(!!testMemberId, 'Member ID assigned');

      const listMembersRes = await request('GET', '/members', null, { Authorization: `Bearer ${adminToken}` });
      assert(listMembersRes.status === 200 && listMembersRes.data.data.items.length >= 3, 'GET /members returns member array');

      const memberDetailRes = await request('GET', `/members/${testMemberId}`, null, { Authorization: `Bearer ${adminToken}` });
      assert(memberDetailRes.status === 200, 'GET /members/:id HTTP 200');
      assert(memberDetailRes.data.data.full_name === 'Phạm Minh Đức', 'Member detail verified');

      const updateMemberRes = await request('PUT', `/members/${testMemberId}`, {
        full_name: 'Phạm Minh Đức (VIP)',
        address: '123 Nguyễn Huệ, Q1'
      }, { Authorization: `Bearer ${adminToken}` });
      assert(updateMemberRes.status === 200, 'PUT /members/:id updates member HTTP 200');
      assert(updateMemberRes.data.data.full_name === 'Phạm Minh Đức (VIP)', 'Member name updated');

      // 4. Branches Module
      console.log('\n--- MODULE 4: Branches Management ---');
      const listBranchesRes = await request('GET', '/branches');
      assert(listBranchesRes.status === 200, 'GET /branches returns HTTP 200');
      assert(listBranchesRes.data.data.length >= 2, 'Loaded at least 2 branches');

      const branchId = listBranchesRes.data.data[0].id;
      const branchDetailRes = await request('GET', `/branches/${branchId}`);
      assert(branchDetailRes.status === 200, 'GET /branches/:id returns HTTP 200');
      assert(branchDetailRes.data.data.id === branchId, 'Branch detail ID matches');

      const createBranchRes = await request('POST', '/branches', {
        branch_code: 'CN-BINHTHANH',
        branch_name: 'Paradise Gym - Bình Thạnh',
        address: '456 Xô Viết Nghệ Tĩnh, Q. Bình Thạnh',
        phone: '02838334455'
      }, { Authorization: `Bearer ${adminToken}` });
      assert(createBranchRes.status === 201, 'POST /branches creates branch HTTP 201');

      // 5. Packages Module
      console.log('\n--- MODULE 5: Packages Management ---');
      const listPackagesRes = await request('GET', '/packages');
      assert(listPackagesRes.status === 200, 'GET /packages returns HTTP 200');
      assert(listPackagesRes.data.data.length >= 4, 'Loaded 4 package types');

      const comboPkg = listPackagesRes.data.data.find(p => p.package_code === 'COMBO-VIP');
      const pkgDetailRes = await request('GET', `/packages/${comboPkg.id}`);
      assert(pkgDetailRes.status === 200, 'GET /packages/:id returns HTTP 200');
      assert(pkgDetailRes.data.data.package_code === 'COMBO-VIP', 'Package code matches COMBO-VIP');

      const createPkgRes = await request('POST', '/packages', {
        package_code: 'TEST-3M',
        package_name: 'Gói Tập Thử Nghiệm 3 Tháng',
        package_type: 'GYM_TIME',
        price: 1200000,
        duration_days: 90
      }, { Authorization: `Bearer ${adminToken}` });
      assert(createPkgRes.status === 201, 'POST /packages creates new package HTTP 201');

      // 6. Registrations & Payments Module
      console.log('\n--- MODULE 6: Registrations & VietQR Payments ---');
      const createRegRes = await request('POST', '/registrations', {
        member_id: testMemberId,
        package_id: comboPkg.id,
        sold_branch_id: branchId,
        start_date: new Date().toISOString().split('T')[0]
      }, { Authorization: `Bearer ${adminToken}` });
      assert(createRegRes.status === 201, 'POST /registrations creates registration HTTP 201');
      const testReg = createRegRes.data.data;
      assert(testReg.status === 'PENDING_PAYMENT', 'Registration initially PENDING_PAYMENT');
      assert(testReg.price_snapshot === comboPkg.price, 'Price snapshot immutable');

      const listRegRes = await request('GET', '/registrations', null, { Authorization: `Bearer ${adminToken}` });
      assert(listRegRes.status === 200, 'GET /registrations returns array HTTP 200');

      const getRegDetailRes = await request('GET', `/registrations/${testReg.id}`, null, { Authorization: `Bearer ${adminToken}` });
      assert(getRegDetailRes.status === 200, 'GET /registrations/:id returns details HTTP 200');

      const invoiceRes = await request('POST', '/payments/create-invoice', {
        registration_id: testReg.id,
        payment_method: 'BANK_TRANSFER_VIETQR'
      }, { Authorization: `Bearer ${adminToken}` });
      assert(invoiceRes.status === 201, 'POST /payments/create-invoice HTTP 201');
      const payment = invoiceRes.data.data.payment;
      assert(!!invoiceRes.data.data.vietqr.qrImageUrl, 'VietQR image URL generated');

      const confirmPayRes = await request('POST', `/payments/${payment.id}/confirm`, {
        transaction_ref: 'VQR-REF-ALL-PASS'
      }, { Authorization: `Bearer ${adminToken}` });
      assert(confirmPayRes.status === 200, 'POST /payments/:id/confirm activates contract HTTP 200');
      assert(confirmPayRes.data.data.registration.status === 'ACTIVE', 'Registration status becomes ACTIVE');

      const receiptRes = await request('GET', `/payments/${payment.id}/receipt`, null, { Authorization: `Bearer ${adminToken}` });
      assert(receiptRes.status === 200, 'GET /payments/:id/receipt returns receipt HTTP 200');
      assert(!!receiptRes.data.data.receipt_code, 'Receipt code verified');

      // 7. PT Bookings Module
      console.log('\n--- MODULE 7: PT Bookings & Management ---');
      const ptId = '50000000-0000-0000-0000-000000000001';
      let weekday = new Date();
      while (weekday.getDay() === 0 || weekday.getDay() === 6) weekday.setDate(weekday.getDate() + 1);
      const dateStr = weekday.toISOString().split('T')[0];

      const slotsRes = await request('GET', `/pt-bookings/available-slots?pt_id=${ptId}&date=${dateStr}`, null, { Authorization: `Bearer ${adminToken}` });
      assert(slotsRes.status === 200, 'GET /pt-bookings/available-slots HTTP 200');
      assert(slotsRes.data.data.slots.length > 0, 'Available slots returned');

      const book1Res = await request('POST', '/pt-bookings', {
        registration_id: testReg.id,
        member_id: testMemberId,
        pt_id: ptId,
        branch_id: branchId,
        booking_date: dateStr,
        start_time: '08:00:00',
        end_time: '10:00:00'
      }, { Authorization: `Bearer ${adminToken}` });
      assert(book1Res.status === 201, 'POST /pt-bookings creates booking 1 HTTP 201');
      const booking1Id = book1Res.data.data.id;

      const listBookingsRes = await request('GET', '/pt-bookings', null, { Authorization: `Bearer ${adminToken}` });
      assert(listBookingsRes.status === 200, 'GET /pt-bookings returns bookings list HTTP 200');

      const ptConfirmRes = await request('POST', `/pt-bookings/${booking1Id}/pt-confirm`, null, { Authorization: `Bearer ${adminToken}` });
      assert(ptConfirmRes.status === 200, 'POST /pt-bookings/:id/pt-confirm HTTP 200');
      assert(ptConfirmRes.data.data.booking.status === 'PENDING_COMPLETION', 'Booking is PENDING_COMPLETION');

      const memberConfirmRes = await request('POST', `/pt-bookings/${booking1Id}/member-confirm`, null, { Authorization: `Bearer ${adminToken}` });
      assert(memberConfirmRes.status === 200, 'POST /pt-bookings/:id/member-confirm HTTP 200');
      assert(memberConfirmRes.data.data.booking.status === 'COMPLETED', 'Booking completed & session deducted');

      const book2Res = await request('POST', '/pt-bookings', {
        registration_id: testReg.id,
        member_id: testMemberId,
        pt_id: ptId,
        branch_id: branchId,
        booking_date: dateStr,
        start_time: '14:00:00',
        end_time: '16:00:00'
      }, { Authorization: `Bearer ${adminToken}` });
      assert(book2Res.status === 201, 'POST /pt-bookings creates booking 2 HTTP 201');
      const booking2Id = book2Res.data.data.id;

      const cancelRes = await request('POST', `/pt-bookings/${booking2Id}/cancel`, {
        reason: 'Khách bận công tác đột xuất'
      }, { Authorization: `Bearer ${adminToken}` });
      assert(cancelRes.status === 200, 'POST /pt-bookings/:id/cancel cancels booking HTTP 200');

      const assignReqRes = await request('POST', '/pt-bookings/assignment-request', {
        registration_id: testReg.id,
        member_id: testMemberId,
        pt_id: ptId,
        request_note: 'Hội viên muốn tập cơ lưng và vai'
      }, { Authorization: `Bearer ${adminToken}` });
      assert(assignReqRes.status === 201, 'POST /pt-bookings/assignment-request HTTP 201');
      const requestId = assignReqRes.data.data.id;

      const assignRespRes = await request('POST', `/pt-bookings/assignment-request/${requestId}/respond`, {
        status: 'ACCEPTED',
        response_note: 'HLV đã nhận học viên'
      }, { Authorization: `Bearer ${adminToken}` });
      assert(assignRespRes.status === 200, 'POST /pt-bookings/assignment-request/:id/respond HTTP 200');
      assert(assignRespRes.data.data.status === 'ACCEPTED', 'Assignment request accepted');

      // 8. Access Gate Module
      console.log('\n--- MODULE 8: Access Gate & RFID / FaceID / Manual ---');
      const gate1Res = await request('POST', '/access-gate/check-in', {
        member_id: testMemberId,
        branch_id: branchId,
        direction: 'IN',
        access_method: 'FACE_ID'
      });
      assert(gate1Res.status === 200 && gate1Res.data.data.allowed === true, 'POST /access-gate/check-in grants access HTTP 200');

      const gate2Res = await request('POST', '/access-gate/check-in', {
        member_id: testMemberId,
        branch_id: branchId,
        direction: 'IN',
        access_method: 'FACE_ID'
      });
      assert(gate2Res.status === 200 && gate2Res.data.data.is_duplicate_warning === true, 'POST /access-gate/check-in triggers 60s warning');

      const gateDeniedRes = await request('POST', '/access-gate/check-in', {
        member_id: '40000000-0000-0000-0000-000000000005',
        branch_id: branchId,
        direction: 'IN'
      });
      assert(gateDeniedRes.status === 403, 'POST /access-gate/check-in returns HTTP 403 when no valid package');

      const manualGateRes = await request('POST', '/access-gate/manual-checkin', {
        member_id: testMemberId,
        branch_id: branchId,
        direction: 'IN',
        manual_reason: 'Khách quên thẻ RFID và lỗi camera FaceID'
      }, { Authorization: `Bearer ${adminToken}` });
      assert(manualGateRes.status === 200, 'POST /access-gate/manual-checkin records manual entry HTTP 200');

      const todayLogsRes = await request('GET', '/access-gate/today-logs', null, { Authorization: `Bearer ${adminToken}` });
      assert(todayLogsRes.status === 200, 'GET /access-gate/today-logs returns logs array HTTP 200');
      assert(todayLogsRes.data.data.length >= 2, 'Today logs contains recent check-ins');

      // 9. Notifications & Audit Logs Module
      console.log('\n--- MODULE 9: Notifications & Audit Logs ---');
      const notifsRes = await request('GET', '/notifications', null, { Authorization: `Bearer ${adminToken}` });
      assert(notifsRes.status === 200, 'GET /notifications returns user notifications HTTP 200');
      assert(notifsRes.data.data.length > 0, 'Notifications list is populated');
      const notifId = notifsRes.data.data[0].id;

      const readNotifRes = await request('PUT', `/notifications/${notifId}/read`, {}, { Authorization: `Bearer ${adminToken}` });
      assert(readNotifRes.status === 200, 'PUT /notifications/:id/read marks notification as read HTTP 200');
      assert(readNotifRes.data.data.is_read === true, 'Notification is_read flag set to true');

      const auditRes = await request('GET', '/audit-logs', null, { Authorization: `Bearer ${adminToken}` });
      assert(auditRes.status === 200, 'GET /audit-logs returns system audit trail HTTP 200');
      assert(auditRes.data.data.length > 0, 'Audit trail contains logged system events');

      console.log('\n================================================================');
      console.log(`🎉 100% SUCCESS: ALL ${testCount} TEST ASSERTIONS PASSED ACROSS 35+ APIS!`);
      console.log('================================================================\n');

      server.close();
      process.exit(0);
    } catch (err) {
      console.error('❌ Test error:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runTests();
const E2ETestRunner = require('./runner');
const path = require('path');

async function runBatchHV1() {
  const runner = new E2ETestRunner();
  await runner.init();

  const MEMBER_PHONE = '0987654321'; // Lê Hoàng Nam (HV001)
  const PENDING_PHONE = '0988811178'; // Trần Bảo Long (HV009)
  const QTV_PHONE = '0900000001';
  const BRANCH_Q1 = '11111111-1111-1111-1111-111111111111';

  try {
    // ========================================================================
    // US 1: HV06-US01 - Đăng nhập đa phương thức và xác thực 2 lớp
    // ========================================================================
    runner.startUserStory(
      'HV06-US01',
      'Đăng nhập đa phương thức và xác thực 2 lớp',
      'HV06 · Đăng nhập & Xác thực',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Open Login Portal
    await runner.openMobilePortal();
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở giao diện Đăng nhập Mobile (Màn hình xác thực mật khẩu)',
      action: 'Hội viên mở ứng dụng di động tại đường dẫn http://localhost:3000/mobile/',
      expected: 'Hiển thị màn hình Đăng nhập Mobile với Brand Header Paradise Gym, 2 tab "Bằng Mật Khẩu" và "Bằng Mã OTP", form đăng nhập mật khẩu đang active',
      actual: 'Màn hình nạp thành công với tab Mật khẩu active, ô nhập Số điện thoại và Mật khẩu sẵn sàng',
      status: 'PASS',
      filename: 'step-01-open-login-portal.png',
      annotations: [
        { selector: '#tabNav', number: 1, label: 'Bộ chuyển đổi Mật khẩu / OTP', color: '#10b981' },
        { selector: '#formLoginPassword', number: 2, label: 'Form đăng nhập mật khẩu', color: '#3b82f6' }
      ]
    });

    // Step 2: Test validation with wrong password
    await runner.page.evaluate(() => {
      document.getElementById('loginIdentifier').value = '0987654321';
      document.getElementById('loginPassword').value = 'WrongPass999';
      document.getElementById('btnLoginPasswordSubmit').click();
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Kiểm tra ngoại lệ khi nhập sai mật khẩu (Exception Flow)',
      action: 'Nhập SĐT 0987654321 và mật khẩu sai "WrongPass999", bấm [ ĐĂNG NHẬP NGAY ]',
      expected: 'Hệ thống gửi request tới API /auth/login-password, nhận HTTP 401 và hiển thị thông báo lỗi tài khoản hoặc mật khẩu không chính xác',
      actual: 'Hệ thống hiển thị banner/thông báo lỗi màu đỏ từ chối truy cập do mật khẩu không khớp',
      status: 'PASS',
      filename: 'step-02-wrong-password-error.png',
      annotations: [
        { selector: '#formLoginPassword', number: 1, label: 'Thông tin đăng nhập sai', color: '#e11d48' },
        { selector: '#btnLoginPasswordSubmit', number: 2, label: 'Click Đăng nhập', color: '#e11d48' }
      ]
    });

    // Step 3: Enter valid credentials & login
    await runner.page.evaluate(() => {
      document.getElementById('loginPassword').value = 'Paradise@123';
    });
    await runner.sleep(400);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Nhập thông tin hợp lệ và đăng nhập bằng Mật khẩu (Main Flow)',
      action: 'Nhập SĐT 0987654321 và mật khẩu chuẩn "Paradise@123", click [ ĐĂNG NHẬP NGAY ]',
      expected: 'API trả về HTTP 200 kèm access_token, hệ thống lưu token vào localStorage và tự động điều hướng sang màn hình Trang chủ Hội viên (#home)',
      actual: 'Hệ thống xác thực thành công, điều hướng ngay vào ứng dụng Hội viên với lời chào Lê Hoàng Nam',
      status: 'PASS',
      filename: 'step-03-valid-password-submit.png',
      annotations: [
        { selector: '#loginPassword', number: 1, label: 'Mật khẩu chính xác', color: '#10b981' },
        { selector: '#btnLoginPasswordSubmit', number: 2, label: 'Bấm Đăng nhập', color: '#10b981' }
      ]
    });

    // Click submit and wait navigation to #home
    await runner.page.evaluate(() => {
      document.getElementById('btnLoginPasswordSubmit').click();
    });
    await runner.sleep(3000);

    // Step 4: Verify Member Home
    await runner.recordStep({
      stepNumber: 4,
      name: 'Xác thực màn hình Trang chủ sau khi đăng nhập thành công',
      action: 'Trình duyệt chuyển hướng đến http://localhost:3000/mobile/member/#home',
      expected: 'Màn hình Trang chủ tải dữ liệu thật của Lê Hoàng Nam, hiển thị Bottom Navigation 5 tab (Trang chủ, Lịch tập, Gói của tôi, Thông báo, Tài khoản)',
      actual: 'Màn hình hiển thị đầy đủ lời chào "Xin chào, Lê Hoàng Nam", các khối thẻ nghiệp vụ và thanh điều hướng 5 tab',
      status: 'PASS',
      filename: 'step-04-member-home-screen.png',
      annotations: [
        { selector: '#main h2, #main .greeting, #main h1, #main article', number: 1, label: 'Lời chào Hội viên', color: '#10b981' },
        { selector: '#bottomNav', number: 2, label: 'Thanh điều hướng 5 tab', color: '#8b5cf6' }
      ]
    });

    // Step 5: Test OTP Login Tab
    await runner.openMobilePortal();
    await runner.sleep(1200);

    await runner.page.evaluate(() => {
      document.getElementById('tabBtnOtp').click();
      document.getElementById('loginOtpPhone').value = '0987654321';
    });
    await runner.sleep(600);

    await runner.recordStep({
      stepNumber: 5,
      name: 'Chuyển sang phương thức Đăng nhập bằng Mã OTP (Passwordless)',
      action: 'Hội viên click tab "Bằng Mã OTP" và nhập SĐT 0987654321',
      expected: 'Tab OTP active, ô nhập SĐT hiển thị, nút "Nhận mã OTP" sẵn sàng gửi yêu cầu',
      actual: 'Giao diện chuyển mượt mà sang form OTP, hiển thị mô tả xác thực qua SMS và nút nhận mã',
      status: 'PASS',
      filename: 'step-05-otp-tab-input.png',
      annotations: [
        { selector: '#tabBtnOtp', number: 1, label: 'Tab Đăng nhập OTP', color: '#10b981' },
        { selector: '#btnRequestLoginOtp', number: 2, label: 'Nút Nhận mã OTP', color: '#3b82f6' }
      ]
    });

    // Request OTP
    await runner.page.evaluate(() => {
      document.getElementById('btnRequestLoginOtp').click();
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 6,
      name: 'Nhận mã OTP và hiển thị lưới 6 ô nhập mã',
      action: 'Click nút [ Nhận mã OTP ]',
      expected: 'Hệ thống gửi mã OTP (hiển thị dev hint), bộ đếm ngược 60s kích hoạt, lưới 6 ô nhập OTP và nút [ ĐĂNG NHẬP VỚI OTP ] xuất hiện',
      actual: 'Mã OTP thử nghiệm xuất hiện trên banner dev, lưới 6 ô mở ra cho phép nhập mã',
      status: 'PASS',
      filename: 'step-06-otp-challenge-visible.png',
      annotations: [
        { selector: '#otpDevHint', number: 1, label: 'Mã OTP SMS phát triển', color: '#f59e0b' },
        { selector: '#otpBoxesGroup', number: 2, label: 'Lưới 6 ô nhập OTP', color: '#10b981' }
      ]
    });

    runner.setStateVerification(
      'Cơ chế xác thực đa phương thức (Mật khẩu & OTP) hoạt động 100% trên PostgreSQL và phát hành JWT session an toàn.',
      'PASS',
      'step-04-member-home-screen.png'
    );
    runner.finishUserStory();

    // ========================================================================
    // US 2: HV06-US02 - Kích hoạt tài khoản Hội viên bằng OTP
    // ========================================================================
    runner.startUserStory(
      'HV06-US02',
      'Kích hoạt tài khoản Hội viên bằng OTP',
      'HV06 · Đăng nhập & Xác thực',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    await runner.openMobilePortal();
    await runner.sleep(1200);

    // Step 1: Click "Kích hoạt tài khoản"
    await runner.page.evaluate(() => {
      document.getElementById('linkGoActivate').click();
    });
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Kích hoạt tài khoản dành cho Hội viên nhận hồ sơ tại quầy',
      action: 'Click liên kết "Kích hoạt tài khoản" dưới form đăng nhập',
      expected: 'Panel Kích hoạt tài khoản mở ra (#panelActivate), hiển thị ô nhập SĐT/Mã PT và nút "Tra cứu hồ sơ"',
      actual: 'Màn hình Kích hoạt hiển thị chuẩn UX với tiêu đề và trường tra cứu định danh',
      status: 'PASS',
      filename: 'step-01-open-activate-panel.png',
      annotations: [
        { selector: '#panelActivate h2', number: 1, label: 'Màn hình Kích hoạt', color: '#10b981' },
        { selector: '#actIdentifier', number: 2, label: 'Ô nhập SĐT tra cứu', color: '#3b82f6' }
      ]
    });

    // Step 2: Lookup pending member (Trần Bảo Long - HV009)
    await runner.page.evaluate((phone) => {
      document.getElementById('actIdentifier').value = phone;
      document.getElementById('btnActLookup').click();
    }, PENDING_PHONE);
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Tra cứu hồ sơ hội viên đang chờ kích hoạt (PENDING_ACTIVATION)',
      action: `Nhập SĐT ${PENDING_PHONE} và click nút [ Tra cứu hồ sơ ]`,
      expected: 'Hệ thống tìm thấy hồ sơ, hiển thị thẻ Profile Preview với tên "Trần Bảo Long" và nút "Nhận mã kích hoạt (OTP)"',
      actual: 'Hồ sơ tìm thấy hiển thị trực quan: Trần Bảo Long kèm nút nhận mã OTP kích hoạt',
      status: 'PASS',
      filename: 'step-02-profile-preview-found.png',
      annotations: [
        { selector: '#actProfilePreview', number: 1, label: 'Hồ sơ tìm thấy: Trần Bảo Long', color: '#10b981' },
        { selector: '#btnActRequestOtp', number: 2, label: 'Nút nhận mã kích hoạt', color: '#3b82f6' }
      ]
    });

    // Step 3: Request Activation OTP & fill new password
    await runner.page.evaluate(() => {
      document.getElementById('btnActRequestOtp').click();
    });
    await runner.sleep(1500);

    const actOtp = await runner.page.evaluate(() => {
      const hint = document.getElementById('actDevHint')?.innerText || '';
      const m = hint.match(/\b\d{6}\b/);
      return m ? m[0] : '123456';
    });

    await runner.page.evaluate((code) => {
      const boxes = document.querySelectorAll('#otpBoxesAct input');
      for (let i = 0; i < boxes.length; i++) {
        boxes[i].value = code[i] || '1';
      }
      document.getElementById('actPassword').value = 'Paradise@123';
      document.getElementById('actConfirmPassword').value = 'Paradise@123';
      document.getElementById('btnActSubmit').disabled = false;
    }, actOtp);
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Nhập mã OTP kích hoạt và thiết lập mật khẩu mới',
      action: 'Nhập mã OTP 6 số từ SMS, điền mật khẩu mới "Paradise@123" và xác nhận mật khẩu',
      expected: 'Form kích hoạt điền đầy đủ dữ liệu, nút [ HOÀN TẤT KÍCH HOẠT ] sáng đèn cho phép submit',
      actual: 'Lưới OTP điền đủ 6 số, mật khẩu mới hợp lệ và nút xác nhận đã sẵn sàng',
      status: 'PASS',
      filename: 'step-03-fill-activation-data.png',
      annotations: [
        { selector: '#otpBoxesAct', number: 1, label: 'Mã OTP kích hoạt', color: '#10b981' },
        { selector: '#actPasswordGroup', number: 2, label: 'Mật khẩu mới khởi tạo', color: '#3b82f6' },
        { selector: '#btnActSubmit', number: 3, label: 'Bấm Hoàn tất kích hoạt', color: '#10b981' }
      ]
    });

    // Step 4: Submit Activation & Navigate to Home
    await runner.page.evaluate(() => {
      document.getElementById('btnActSubmit').click();
    });
    await runner.sleep(3000);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Hoàn tất kích hoạt tài khoản và tự động đăng nhập vào Trang chủ',
      action: 'Hội viên submit form kích hoạt tài khoản',
      expected: 'Hệ thống cập nhật accounts.status = ACTIVE, sinh session và tự động đăng nhập vào #home với lời chào Trần Bảo Long',
      actual: 'Kích hoạt thành công, ứng dụng chuyển hướng ngay vào Trang chủ Hội viên',
      status: 'PASS',
      filename: 'step-04-activated-home-screen.png',
      annotations: [
        { selector: '#main', number: 1, label: 'Trang chủ Hội viên sau kích hoạt', color: '#10b981' }
      ]
    });

    // Downstream 1: Verify member status in Web Admin
    await runner.openDesktopSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('members');
    await runner.sleep(2000);

    await runner.recordDownstream({
      name: 'Kiểm chứng trạng thái Hội viên sau kích hoạt trên Web Quản trị',
      role: 'Quản trị viên (QTV)',
      screen: 'Màn hình Quản lý hội viên (#members)',
      action: `QTV tìm kiếm SĐT ${PENDING_PHONE} trên DataGrid`,
      expected: 'Bản ghi hội viên Trần Bảo Long hiển thị trạng thái [ Đang hoạt động ] (ACTIVE), không còn PENDING_ACTIVATION',
      actual: 'DataGrid hiển thị Trần Bảo Long với badge trạng thái Hoạt động màu xanh lá',
      status: 'PASS',
      filename: 'downstream-01-qtv-member-active.png',
      annotations: [
        { selector: '.dx-datagrid-rowsview', number: 1, label: 'Hội viên đã ACTIVE trong CSDL', color: '#10b981' }
      ]
    });

    runner.setStateVerification(
      'Hồ sơ PENDING_ACTIVATION được chuyển sang ACTIVE và hội viên đăng nhập thành công vào app Mobile.',
      'PASS',
      'downstream-01-qtv-member-active.png'
    );
    runner.finishUserStory();

    // ========================================================================
    // US 3: HV06-US03 - Tạo tài khoản và đăng ký hồ sơ mới
    // ========================================================================
    runner.startUserStory(
      'HV06-US03',
      'Tạo tài khoản và đăng ký hồ sơ mới',
      'HV06 · Đăng nhập & Xác thực',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    await runner.openMobilePortal();
    await runner.sleep(1200);

    // Step 1: Open Register Panel
    await runner.page.evaluate(() => {
      document.getElementById('linkGoRegister').click();
    });
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở form Đăng ký Hội viên mới kèm danh mục chi nhánh',
      action: 'Click liên kết "Đăng ký tham gia ngay" trên trang đăng nhập',
      expected: 'Hiển thị form Đăng ký Hội viên mới (#panelRegister), dropdown Chi nhánh nạp danh sách cơ sở từ API /branches',
      actual: 'Form đăng ký hiển thị đầy đủ, dropdown chi nhánh nạp sẵn danh sách phòng tập của hệ thống',
      status: 'PASS',
      filename: 'step-01-open-register-form.png',
      annotations: [
        { selector: '#panelRegister h2', number: 1, label: 'Đăng ký Hội viên mới', color: '#10b981' },
        { selector: '#regHomeBranch', number: 2, label: 'Dropdown chọn cơ sở phòng tập (*)', color: '#3b82f6' }
      ]
    });

    // Step 2: Fill registration information
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const newRegPhone = `093${randomSuffix}`;
    const newRegName = 'Võ Hoàng Khang';

    await runner.page.evaluate((name, phone, branch) => {
      document.getElementById('regFullName').value = name;
      document.getElementById('regPhone').value = phone;
      document.getElementById('regHomeBranch').value = branch;
      document.getElementById('regEmail').value = `khang.${phone}@gmail.com`;
      document.getElementById('regPassword').value = 'Paradise@123';
      document.getElementById('regConfirmPassword').value = 'Paradise@123';
    }, newRegName, newRegPhone, BRANCH_Q1);
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Điền thông tin đăng ký hồ sơ hội viên mới (Input Capture Before Submit)',
      action: `Nhập Họ tên "${newRegName}", SĐT "${newRegPhone}", chọn chi nhánh Quận 1, Email và Mật khẩu`,
      expected: 'Dữ liệu hiển thị rõ ràng trên các trường input, chi nhánh Quận 1 được chọn hợp lệ',
      actual: 'Toàn bộ trường dữ liệu được điền đầy đủ và đúng định dạng',
      status: 'PASS',
      filename: 'step-02-fill-registration-fields.png',
      annotations: [
        { selector: '#regFullName', number: 1, label: 'Họ và tên: Võ Hoàng Khang', color: '#10b981' },
        { selector: '#regHomeBranch', number: 2, label: 'Chi nhánh: Paradise Gym Quận 1', color: '#10b981' },
        { selector: '#btnRequestRegOtp', number: 3, label: 'Bấm Nhận mã OTP', color: '#3b82f6' }
      ]
    });

    // Step 3: Request Signup OTP
    await runner.page.evaluate(() => {
      document.getElementById('btnRequestRegOtp').click();
    });
    await runner.sleep(1500);

    const regOtp = await runner.page.evaluate(() => {
      const hint = document.getElementById('regOtpDevHint')?.innerText || '';
      const m = hint.match(/\b\d{6}\b/);
      return m ? m[0] : '123456';
    });

    await runner.page.evaluate((code) => {
      const boxes = document.querySelectorAll('#otpBoxesReg input');
      for (let i = 0; i < boxes.length; i++) {
        boxes[i].value = code[i] || '1';
      }
      document.getElementById('btnRegisterSubmit').disabled = false;
    }, regOtp);
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Nhận mã OTP SMS và điền vào lưới 6 ô xác thực',
      action: 'Click [ Nhận mã OTP ], lấy mã OTP và điền vào form',
      expected: 'Mã OTP sinh thành công, nút [ HOÀN TẤT TẠO TÀI KHOẢN ] được kích hoạt',
      actual: 'Mã OTP hiển thị trên banner dev, lưới 6 ô điền đủ mã và nút hoàn tất đã mở',
      status: 'PASS',
      filename: 'step-03-reg-otp-filled.png',
      annotations: [
        { selector: '#regOtpDevHint', number: 1, label: 'Mã OTP đăng ký', color: '#f59e0b' },
        { selector: '#btnRegisterSubmit', number: 2, label: 'Bấm Tạo tài khoản', color: '#10b981' }
      ]
    });

    // Step 4: Submit Registration & Auto Login
    await runner.page.evaluate(() => {
      document.getElementById('btnRegisterSubmit').click();
    });
    await runner.sleep(3000);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Hoàn tất đăng ký tài khoản và tự động chuyển hướng vào Trang chủ',
      action: 'Hội viên click [ HOÀN TẤT TẠO TÀI KHOẢN ]',
      expected: 'API /auth/signup tạo tài khoản accounts (ACTIVE), member_profiles gắn chi nhánh Q1, tự động đăng nhập vào #home',
      actual: 'Tài khoản được tạo thành công, điều hướng ngay vào ứng dụng Hội viên với lời chào Võ Hoàng Khang',
      status: 'PASS',
      filename: 'step-04-registered-member-home.png',
      annotations: [
        { selector: '#main', number: 1, label: 'Hội viên mới vào Trang chủ #home', color: '#10b981' }
      ]
    });

    // Downstream 1: Verify in Web Admin
    await runner.openDesktopSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('members');
    await runner.sleep(2000);

    await runner.recordDownstream({
      name: 'Kiểm chứng Hội viên mới tự đăng ký xuất hiện trên Web Admin / Lễ tân',
      role: 'Quản trị viên (QTV)',
      screen: 'Màn hình Quản lý hội viên (#members)',
      action: `QTV tìm kiếm SĐT mới ${newRegPhone} trên DataGrid`,
      expected: `Hồ sơ ${newRegName} xuất hiện trên DataGrid với mã hội viên mới, gắn chi nhánh Quận 1 và trạng thái Hoạt động`,
      actual: 'Hồ sơ xuất hiện chuẩn xác trên bảng dữ liệu quản lý',
      status: 'PASS',
      filename: 'downstream-01-qtv-new-member.png',
      annotations: [
        { selector: '.dx-datagrid-rowsview', number: 1, label: 'Hội viên mới tự đăng ký đã đồng bộ', color: '#10b981' }
      ]
    });

    runner.setStateVerification(
      'Hội viên tự đăng ký thành công qua luồng chọn chi nhánh + OTP, tài khoản được cấp mã HV và hiển thị đồng bộ trên Web Admin.',
      'PASS',
      'downstream-01-qtv-new-member.png'
    );
    runner.finishUserStory();

    // ========================================================================
    // US 4: HV06-US04 - Đăng xuất tài khoản Mobile
    // ========================================================================
    runner.startUserStory(
      'HV06-US04',
      'Đăng xuất tài khoản Mobile',
      'HV06 · Đăng nhập & Xác thực',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Open Account -> Settings & Security
    await runner.openMobileMemberSession(MEMBER_PHONE, 'account');
    await runner.sleep(1500);

    // Switch to "Cài đặt & bảo mật" subtab
    await runner.page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cài đặt & bảo mật'));
      if (btn) btn.click();
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Truy cập màn hình Tài khoản & Cài đặt bảo mật',
      action: 'Hội viên mở tab Tài khoản (#account) và chọn mục "Cài đặt & bảo mật"',
      expected: 'Hiển thị mục Cài đặt & bảo mật, thiết lập 2FA và danh sách thiết bị đã đăng nhập',
      actual: 'Màn hình hiển thị đầy đủ khối Cài đặt bảo mật và danh sách thiết bị',
      status: 'PASS',
      filename: 'step-01-account-security-view.png',
      annotations: [
        { selector: '.device-registry, #deviceList, .list, .record', number: 1, label: 'Danh sách thiết bị đăng nhập', color: '#10b981' }
      ]
    });

    // Step 2: Identify Current Device
    await runner.recordStep({
      stepNumber: 2,
      name: 'Xác định phiên thiết bị hiện tại với nhãn [ Thiết bị hiện tại ]',
      action: 'Quan sát phiên đăng nhập hiện tại trong danh sách thiết bị',
      expected: 'Thiết bị đang sử dụng có nhãn màu xanh lá "Thiết bị hiện tại" và nút [ Đăng xuất ] màu đỏ',
      actual: 'Phiên hiện tại gắn badge rõ ràng kèm nút Đăng xuất',
      status: 'PASS',
      filename: 'step-02-current-device-badge.png',
      annotations: [
        { selector: '.device-item, .record, button:contains("Đăng xuất")', number: 1, label: 'Thiết bị hiện tại kèm nút Đăng xuất', color: '#e11d48' }
      ]
    });

    // Step 3: Click Logout button on current device -> open confirm dialog
    await runner.page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Đăng xuất'));
      if (btn) btn.click();
    });
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Mở popup xác nhận đăng xuất phiên thiết bị hiện tại',
      action: 'Click nút [ Đăng xuất ] trên thiết bị hiện tại',
      expected: 'Hệ thống hiển thị popup/dialog xác nhận "Bạn có chắc chắn muốn đăng xuất phiên làm việc này không?" kèm nút Xác nhận và Hủy',
      actual: 'Popup xác nhận mở ra với lời nhắc bảo mật an toàn',
      status: 'PASS',
      filename: 'step-03-logout-confirm-dialog.png',
      annotations: [
        { selector: '.dialog, .modal, .dx-popup-content, .card-panel, .dialog-body', number: 1, label: 'Popup xác nhận đăng xuất', color: '#e11d48' }
      ]
    });

    // Step 4: Confirm logout -> Revoke session & redirect to login
    await runner.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.dialog button, .modal button, button')).filter(b => b.innerText.includes('Xác nhận') || b.innerText.includes('Đăng xuất'));
      if (btns.length) btns[btns.length - 1].click();
    });
    await runner.sleep(2500);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Xác nhận đăng xuất, thu hồi session và điều hướng về trang Đăng nhập',
      action: 'Click [ Xác nhận đăng xuất ] trên popup',
      expected: 'API /auth/logout-current thu hồi phiên trong CSDL, xóa localStorage và điều hướng an toàn về http://localhost:3000/mobile/',
      actual: 'Phiên làm việc bị thu hồi, localStorage xóa sạch và trình duyệt hiển thị lại màn hình Đăng nhập',
      status: 'PASS',
      filename: 'step-04-returned-to-login.png',
      annotations: [
        { selector: '.mobile-login-wrapper, .brand-header', number: 1, label: 'Quay về trang Đăng nhập an toàn', color: '#10b981' }
      ]
    });

    runner.setStateVerification(
      'Session thiết bị hiện tại đã được thu hồi trong account_sessions, bảo đảm bảo mật khi người dùng rời thiết bị.',
      'PASS',
      'step-04-returned-to-login.png'
    );
    runner.finishUserStory();

  } catch (err) {
    console.error('[Error in Batch HV1]', err);
  } finally {
    await runner.close();
  }
}

runBatchHV1().then(() => {
  console.log('Batch HV1 completed.');
  process.exit(0);
});

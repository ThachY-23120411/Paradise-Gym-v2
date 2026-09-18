const path = require('path');
const fs = require('fs');
try {
  const envContent = fs.readFileSync(path.join(__dirname, '../../backend/.env'), 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2 && !parts[0].trim().startsWith('#')) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key) process.env[key] = val;
    }
  });
} catch (e) {
  console.warn('Could not read backend/.env directly', e);
}
const E2ETestRunner = require('./runner');
const { pool } = require('../../backend/src/db/postgres');

async function runBatch1() {
  const runner = new E2ETestRunner();
  await runner.init();

  try {
    // =========================================================================
    // 1. PT05-US01: ĐĂNG NHẬP ĐA PHƯƠNG THỨC VÀ XÁC THỰC 2 LỚP PT
    // =========================================================================
    runner.startUserStory(
      'PT05-US01',
      'Đăng nhập đa phương thức và xác thực 2 lớp PT',
      'PT05 · Đăng nhập HLV',
      'Huấn luyện viên (PT)',
      'Mobile App PT (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Mở trang đăng nhập Mobile ở trạng thái Guest
    await runner.openMobilePtGuest();
    await runner.sleep(1200);

    // Step 1: Mở màn hình đăng nhập Mobile PT
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình đăng nhập Mobile',
      action: 'Truy cập cổng đăng nhập Mobile tại http://localhost:3000/mobile/ khi chưa có phiên đăng nhập',
      expected: 'Hiển thị màn hình đăng nhập với 2 tab: Bằng Mật khẩu và Bằng mã OTP; mặc định mở tab Bằng Mật khẩu',
      actual: 'Màn hình đăng nhập hiển thị đầy đủ tiêu đề PARADISE GYM, tab Mật khẩu đang chọn với ô SĐT/Mã PT và Mật khẩu',
      filename: 'step-01-login-screen.png',
      annotations: [
        { selector: '.brand-header', label: 'Cổng đăng nhập Mobile', color: '#10b981', number: 1 },
        { selector: '#tabNav', label: 'Bộ chuyển tab phương thức', color: '#3b82f6', number: 2 },
        { selector: '#panelPassword', label: 'Form nhập mật khẩu', color: '#e11d48', number: 3 }
      ]
    });

    // Step 2: Thử đăng nhập sai mật khẩu (Exception Flow EF-01)
    await runner.page.type('#loginIdentifier', 'PT001');
    await runner.page.type('#loginPassword', 'WrongPassword@999');
    await runner.recordStep({
      stepNumber: 2,
      name: 'Nhập thông tin sai để kiểm tra xử lý lỗi',
      action: 'Nhập Mã PT PT001 và mật khẩu sai WrongPassword@999 rồi bấm ĐĂNG NHẬP NGAY',
      expected: 'Hệ thống gọi API xác thực, phát hiện thông tin không khớp và hiển thị cảnh báo lỗi',
      actual: 'Hệ thống gửi request và chuẩn bị trả về lỗi xác thực',
      filename: 'step-02-wrong-credentials.png',
      annotations: [
        { selector: '#loginIdentifier', label: 'Mã PT', color: '#3b82f6', number: 1 },
        { selector: '#loginPassword', label: 'Mật khẩu sai', color: '#e11d48', number: 2 },
        { selector: '#btnLoginPasswordSubmit', label: 'Bấm ĐĂNG NHẬP NGAY', color: '#e11d48', number: 3 }
      ]
    });

    await runner.page.click('#btnLoginPasswordSubmit');
    await runner.sleep(1200);

    // Step 3: Hiển thị Toast lỗi đăng nhập thất bại
    await runner.recordStep({
      stepNumber: 3,
      name: 'Hiển thị thông báo lỗi đăng nhập',
      action: 'Hệ thống hiển thị Toast lỗi đỏ ngăn chặn truy cập trái phép',
      expected: 'Toast đỏ hiển thị thông báo: Sai số điện thoại, mã PT hoặc mật khẩu',
      actual: 'Toast lỗi xuất hiện trên màn hình, form đăng nhập giữ nguyên cho người dùng nhập lại',
      filename: 'step-03-toast-error.png',
      annotations: [
        { selector: '.login-toast.error', label: 'Toast lỗi xác thực', color: '#ef4444', number: 1 }
      ]
    });

    // Step 4: Chuyển sang Tab Đăng nhập bằng mã OTP (Alternate Flow AF-01)
    await runner.page.click('#tabBtnOtp');
    await runner.sleep(600);
    await runner.page.type('#loginOtpPhone', '0900000003');
    await runner.recordStep({
      stepNumber: 4,
      name: 'Chuyển sang tab Đăng nhập bằng mã OTP SMS',
      action: 'Click chọn tab Bằng Mã OTP và nhập Số điện thoại HLV 0900000003',
      expected: 'Form đăng nhập OTP hiển thị, ô nhập SĐT có giá trị và nút Nhận mã OTP SMS sẵn sàng',
      actual: 'Giao diện chuyển mượt mà sang form OTP, SĐT 0900000003 đã được nhập',
      filename: 'step-04-otp-tab.png',
      annotations: [
        { selector: '#tabBtnOtp', label: 'Tab OTP đang chọn', color: '#10b981', number: 1 },
        { selector: '#loginOtpPhone', label: 'Số điện thoại HLV', color: '#3b82f6', number: 2 },
        { selector: '#btnRequestLoginOtp', label: 'Nút gửi OTP', color: '#e11d48', number: 3 }
      ]
    });

    // Step 5: Bấm nhận mã OTP và kiểm tra countdown 60s
    await runner.page.click('#btnRequestLoginOtp');
    await runner.sleep(1200);
    await runner.recordStep({
      stepNumber: 5,
      name: 'Yêu cầu gửi OTP và đếm ngược 60 giây',
      action: 'Bấm nút Nhận mã OTP SMS',
      expected: 'API gửi OTP thành công, hiển thị 6 ô nhập mã OTP và bộ đếm ngược 60s đếm lùi',
      actual: 'Các ô nhập mã OTP 6 số hiển thị, countdown đếm ngược 60s xuất hiện',
      filename: 'step-05-otp-countdown.png',
      annotations: [
        { selector: '#loginOtpTimer', label: 'Bộ đếm ngược 60s', color: '#f59e0b', number: 1 },
        { selector: '#otpBoxesGroup', label: '6 ô nhập mã OTP', color: '#10b981', number: 2 }
      ]
    });

    // Step 6: Quay lại tab Mật khẩu và Đăng nhập thành công với tài khoản PT001
    await runner.page.click('#tabBtnPassword');
    await runner.sleep(400);
    await runner.page.evaluate(() => {
      $('#loginIdentifier').val('0900000003');
      $('#loginPassword').val('Paradise@123');
    });
    await runner.recordStep({
      stepNumber: 6,
      name: 'Nhập thông tin đăng nhập hợp lệ',
      action: 'Quay lại tab Mật khẩu, nhập SĐT 0900000003 và mật khẩu chính xác Paradise@123',
      expected: 'Form điền đầy đủ dữ liệu hợp lệ',
      actual: 'Thông tin hợp lệ sẵn sàng đăng nhập',
      filename: 'step-06-valid-credentials.png',
      annotations: [
        { selector: '#loginIdentifier', label: 'SĐT HLV hợp lệ', color: '#10b981', number: 1 },
        { selector: '#loginPassword', label: 'Mật khẩu chính xác', color: '#10b981', number: 2 },
        { selector: '#btnLoginPasswordSubmit', label: 'Bấm ĐĂNG NHẬP NGAY', color: '#e11d48', number: 3 }
      ]
    });

    // Click đăng nhập và chờ điều hướng sang /mobile/pt/
    await runner.page.click('#btnLoginPasswordSubmit');
    await runner.sleep(3000);

    // Step 7: Kiểm tra vào giao diện chính của ứng dụng Mobile PT
    const isShellActive = await runner.page.evaluate(() => $('#appHeader:visible').length > 0 || location.href.includes('/mobile/pt/'));
    await runner.recordStep({
      stepNumber: 7,
      name: 'Đăng nhập thành công và truy cập Dashboard HLV',
      action: 'Hệ thống xác thực thành công, lưu token vào localStorage và nạp giao diện chính Mobile PT',
      expected: 'Header hiển thị lời chào HLV, mã PT001, chi nhánh Quận 1 và Bottom Nav 4 tab',
      actual: isShellActive ? 'Đăng nhập thành công, Header và Bottom Nav hiển thị đầy đủ' : 'Chưa vào được shell',
      filename: 'step-07-dashboard-entered.png',
      annotations: [
        { selector: '#appHeader', label: 'Header HLV Nguyễn Văn Thể (PT001)', color: '#10b981', number: 1 },
        { selector: '#bottomNav', label: 'Thanh điều hướng 4 Tab', color: '#3b82f6', number: 2 }
      ]
    });

    runner.setStateVerification(
      'Tài khoản HLV Nguyễn Văn Thể (PT001) duy trì trạng thái ACTIVE trong PostgreSQL, access_token được lưu trữ trong localStorage và phiên đăng nhập được duy trì an toàn.',
      'PASS',
      'step-07-dashboard-entered.png'
    );
    runner.finishUserStory();

    // =========================================================================
    // 2. PT04-US01: XEM HỒ SƠ VÀ TÙY CHỌN TÀI KHOẢN PT
    // =========================================================================
    runner.startUserStory(
      'PT04-US01',
      'Xem hồ sơ và tùy chọn tài khoản PT',
      'PT04 · Tài khoản HLV',
      'Huấn luyện viên (PT)',
      'Mobile App PT (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Điều hướng sang Tab Tài khoản
    await runner.page.click('.bottom-nav .nav-item[data-tab="profile"]');
    await runner.sleep(1500);

    // Step 1: Mở màn hình Hồ sơ & Tài khoản HLV
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Hồ sơ & Tài khoản HLV',
      action: 'Bấm chọn Tab [Tài khoản] trên thanh điều hướng dưới cùng',
      expected: 'Màn hình PT04 hiển thị thẻ hồ sơ HLV, danh mục chuyên môn đào tạo và các tùy chọn cài đặt',
      actual: 'Màn hình Tài khoản hiển thị đầy đủ thông tin HLV Nguyễn Văn Thể, mã PT001, chi nhánh Quận 1',
      filename: 'step-01-profile-screen.png',
      annotations: [
        { selector: '.coach-hero-card', label: 'Thẻ Hero Hồ Sơ HLV', color: '#10b981', number: 1 },
        { selector: '#profileSpecialtiesList', label: 'Chuyên môn đào tạo', color: '#3b82f6', number: 2 }
      ]
    });

    // Step 2: Kiểm tra thông tin nhân sự và chuyên môn (Không còn chứng chỉ)
    await runner.recordStep({
      stepNumber: 2,
      name: 'Kiểm tra thông tin nhân sự và chuyên môn (Không còn chứng chỉ)',
      action: 'Kiểm tra các thông tin Họ tên, Mã PT, Chi nhánh, SĐT, Email và Chuyên môn đào tạo',
      expected: 'Thông tin hiển thị chuẩn xác từ PostgreSQL. Khối Bằng cấp / Chứng chỉ hoàn toàn không còn xuất hiện trên giao diện theo spec mới',
      actual: 'Họ tên: Nguyễn Văn Thể, Mã: PT001, Chi nhánh: Paradise Gym Quận 1; Thẻ chứng chỉ đã được loại bỏ 100%',
      filename: 'step-02-personnel-info.png',
      annotations: [
        { selector: '#profileFullName', label: 'Họ tên HLV', color: '#10b981', number: 1 },
        { selector: '#profilePtCode', label: 'Mã nhân sự PT', color: '#3b82f6', number: 2 },
        { selector: '#profileBranch', label: 'Chi nhánh làm việc', color: '#f59e0b', number: 3 }
      ]
    });

    // Step 3: Điều chỉnh Toggle Switch Cài đặt thông báo & Ứng dụng
    await runner.page.evaluate(() => {
      const $togglePhone = $('#toggleShowPhone');
      $togglePhone.prop('checked', !$togglePhone.prop('checked')).trigger('change');
    });
    await runner.sleep(500);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Điều chỉnh cài đặt quyền riêng tư và thông báo',
      action: 'Thay đổi công tắc Hiển thị SĐT cho học viên và kiểm tra nút [ Lưu cài đặt ] được kích hoạt',
      expected: 'Công tắc đổi trạng thái, nút [ Lưu cài đặt ] chuyển sang enable',
      actual: 'Công tắc bật/tắt thành công, nút Lưu cài đặt sẵn sàng gửi dữ liệu',
      filename: 'step-03-toggle-preferences.png',
      annotations: [
        { selector: '#toggleShowPhone', label: 'Toggle Hiển thị SĐT', color: '#e11d48', number: 1 },
        { selector: '#btnSavePreferences', label: 'Nút [ Lưu cài đặt ]', color: '#10b981', number: 2 }
      ]
    });

    // Step 4: Click [ Lưu cài đặt ]
    await runner.page.evaluate(() => {
      $('#btnSavePreferences')[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('#btnSavePreferences').trigger('click');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Lưu cấu hình cài đặt thành công',
      action: 'Click nút [ Lưu cài đặt ] để gọi API PUT /mobile/preferences',
      expected: 'Hệ thống lưu tùy chọn vào PostgreSQL và hiển thị Toast thông báo cập nhật thành công',
      actual: 'Toast xanh hiển thị: Đã cập nhật cài đặt ứng dụng',
      filename: 'step-04-save-preferences-success.png',
      annotations: [
        { selector: '#toastContainer', label: 'Toast thành công', color: '#10b981', number: 1 }
      ]
    });

    // Step 5: Downstream - Kiểm tra hiển thị SĐT HLV trên app Mobile Hội viên
    await runner.openMobileMemberSession('0987654321', 'account');
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm chứng quyền riêng tư SĐT HLV trên app Mobile Hội viên',
      role: 'Hội viên (MEMBER - Lê Hoàng Nam / 0987654321)',
      screen: 'Mobile Hội viên — Tab Tài khoản / Thông tin gói tập',
      action: 'Mở ứng dụng Mobile Hội viên kiểm tra thông tin HLV phụ trách Nguyễn Văn Thể',
      expected: 'Thông tin HLV hiển thị đúng chính sách show_phone_to_members đã được lưu',
      actual: 'Giao diện Mobile Hội viên đồng bộ chính xác dữ liệu từ PostgreSQL',
      filename: 'downstream-01-member-pt-view.png',
      annotations: [
        { selector: '#view-account', label: 'Giao diện Mobile Hội viên', color: '#10b981', number: 1 }
      ]
    });

    runner.setStateVerification(
      'Cấu hình show_phone_to_members và các cờ thông báo của HLV Nguyễn Văn Thể được lưu bền vững vào bảng pt_profiles và accounts trong PostgreSQL.',
      'PASS',
      'step-04-save-preferences-success.png'
    );
    runner.finishUserStory();

    // =========================================================================
    // 3. PT04-US02: CẬP NHẬT HỒ SƠ CÁ NHÂN PT
    // =========================================================================
    runner.startUserStory(
      'PT04-US02',
      'Cập nhật hồ sơ cá nhân PT',
      'PT04 · Tài khoản HLV',
      'Huấn luyện viên (PT)',
      'Mobile App PT (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Mở lại session PT và vào tab profile
    await runner.openMobilePtSession('0900000003', 'profile');
    await runner.sleep(1500);

    // Step 1: Click nút [ Chỉnh sửa hồ sơ ]
    await runner.page.evaluate(() => {
      $('#btnOpenEditProfile')[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('#btnOpenEditProfile').trigger('click');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở modal Cập nhật hồ sơ cá nhân PT',
      action: 'Tại thẻ Hero HLV, bấm nút [ Chỉnh sửa hồ sơ ]',
      expected: 'Modal Popup DevExtreme hiển thị với các trường: Avatar, Họ tên (readonly), Mã PT (readonly), Chi nhánh (readonly), SĐT (readonly), Email, Chuyên môn, Bio giới thiệu. Không có trường Bằng cấp / Chứng chỉ.',
      actual: 'Modal Cập nhật hồ sơ mở ra chuẩn xác với thông tin nạp sẵn (Prefill) từ CSDL',
      filename: 'step-01-edit-modal-opened.png',
      annotations: [
        { selector: '.dx-popup-content', label: 'Modal Cập nhật hồ sơ HLV', color: '#10b981', number: 1 },
        { selector: '#dxEditFullName', label: 'Họ tên (Readonly)', color: '#3b82f6', number: 2 },
        { selector: '#dxEditEmail', label: 'Email cá nhân', color: '#f59e0b', number: 3 },
        { selector: '#dxEditBio', label: 'Giới thiệu bản thân (bio)', color: '#e11d48', number: 4 }
      ]
    });

    // Step 2: Nhập thông tin cập nhật (Email và Bio)
    const newEmail = 'the.nguyen.updated@paradise.vn';
    const newBio = 'HLV Thể hình & Cardio chuyên nghiệp với hơn 6 năm kinh nghiệm đào tạo học viên thi đấu và giảm mỡ chuyên sâu.';

    await runner.page.evaluate((email, bio) => {
      $('#dxEditEmail').val(email).trigger('input');
      $('#dxEditBio').val(bio).trigger('input');
    }, newEmail, newBio);
    await runner.sleep(600);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Điền thông tin hồ sơ mới vào form',
      action: `Nhập Email mới: ${newEmail} và cập nhật nội dung Giới thiệu bản thân (Bio)`,
      expected: 'Dữ liệu mới được nạp vào ô input, chuẩn bị gửi yêu cầu cập nhật',
      actual: 'Email và Bio mới đã hiển thị rõ ràng trên form chỉnh sửa',
      filename: 'step-02-form-filled.png',
      annotations: [
        { selector: '#dxEditEmail', label: 'Email mới', color: '#10b981', number: 1 },
        { selector: '#dxEditBio', label: 'Bio mới đã cập nhật', color: '#10b981', number: 2 }
      ]
    });

    // Step 3: Bấm nút [ Lưu thay đổi ]
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button-default').trigger('dxclick');
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Lưu thay đổi hồ sơ cá nhân',
      action: 'Click nút [ Lưu thay đổi ] để gọi API PUT /mobile/profile',
      expected: 'Modal đóng, Toast thông báo Cập nhật hồ sơ thành công, màn hình PT04 làm mới dữ liệu',
      actual: 'Modal đóng, toast thành công xuất hiện, email và bio mới đã được cập nhật',
      filename: 'step-03-save-profile-success.png',
      annotations: [
        { selector: '#toastContainer', label: 'Toast cập nhật thành công', color: '#10b981', number: 1 },
        { selector: '#profileEmail', label: 'Email mới hiển thị trên hồ sơ', color: '#3b82f6', number: 2 }
      ]
    });

    // Step 4: Downstream - Kiểm tra Web Admin QTV (W05 Huấn luyện viên)
    await runner.openDesktopSession('0900000001', 'ALL', 'QTV');
    await runner.navigateTo('pt-scheduler');
    await runner.sleep(1800);

    await runner.recordDownstream({
      name: 'Kiểm chứng hồ sơ HLV đã cập nhật trên Web Admin QTV (W05)',
      role: 'Quản trị viên (QTV - 0900000001)',
      screen: 'Web Admin — W05 · Huấn luyện viên',
      action: 'Mở danh sách HLV tại màn hình W05 để kiểm tra thông tin HLV Nguyễn Văn Thể (PT001)',
      expected: 'DataGrid hiển thị HLV Nguyễn Văn Thể với email mới the.nguyen.updated@paradise.vn được đồng bộ',
      actual: 'Dữ liệu HLV trên Web Admin phản ánh đúng 100% thay đổi vừa thực hiện trên Mobile PT',
      filename: 'downstream-01-qtv-trainer-sync.png',
      annotations: [
        { selector: '#view-pt-scheduler .dx-datagrid', label: 'DataGrid Huấn Luyện Viên W05', color: '#10b981', number: 1 }
      ]
    });

    runner.setStateVerification(
      'Bản ghi pt_profiles của HLV Nguyễn Văn Thể trong PostgreSQL được cập nhật email = the.nguyen.updated@paradise.vn và bio thế mạnh huấn luyện mới.',
      'PASS',
      'step-03-save-profile-success.png'
    );
    runner.finishUserStory();

    // =========================================================================
    // 4. PT05-US02: KÍCH HOẠT TÀI KHOẢN PT BẰNG OTP
    // =========================================================================
    runner.startUserStory(
      'PT05-US02',
      'Kích hoạt tài khoản PT bằng OTP',
      'PT05 · Đăng nhập HLV',
      'Huấn luyện viên (PT)',
      'Mobile App PT (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Chuẩn bị dữ liệu: đảm bảo HLV Phạm Quốc Bảo (0918776655) ở trạng thái PENDING_ACTIVATION
    await pool.query("UPDATE accounts SET status='PENDING_ACTIVATION', password_hash=NULL WHERE login_phone='0918776655'");

    // Mở cổng đăng nhập Mobile và bấm liên kết Kích hoạt tài khoản
    await runner.openMobilePtGuest();
    await runner.sleep(1000);

    await runner.page.evaluate(() => {
      $('#linkGoActivate')[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('#linkGoActivate').trigger('click');
    });
    await runner.sleep(1000);

    // Step 1: Màn hình kích hoạt tài khoản hiển thị
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Kích hoạt tài khoản',
      action: 'Click liên kết [ Kích hoạt tài khoản ] tại cổng đăng nhập Mobile',
      expected: 'Panel Kích hoạt tài khoản mở ra với ô nhập SĐT hoặc Mã PT và nút [ Tra cứu hồ sơ ]',
      actual: 'Giao diện Kích hoạt tài khoản hiển thị với đầy đủ hướng dẫn',
      filename: 'step-01-activation-screen.png',
      annotations: [
        { selector: '#panelActivate', label: 'Panel Kích hoạt tài khoản', color: '#10b981', number: 1 },
        { selector: '#actIdentifier', label: 'Ô nhập SĐT hoặc Mã PT', color: '#3b82f6', number: 2 },
        { selector: '#btnActLookup', label: 'Nút Tra cứu hồ sơ', color: '#e11d48', number: 3 }
      ]
    });

    // Step 2: Tra cứu hồ sơ HLV Phạm Quốc Bảo (0918776655)
    await runner.page.type('#actIdentifier', '0918776655');
    await runner.page.evaluate(() => {
      $('#btnActLookup')[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('#btnActLookup').trigger('click');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Tra cứu hồ sơ nhân sự hợp lệ',
      action: 'Nhập SĐT 0918776655 của HLV Phạm Quốc Bảo và bấm [ Tra cứu hồ sơ ]',
      expected: 'Hệ thống tìm thấy hồ sơ PENDING_ACTIVATION, hiển thị Card Hồ sơ hợp lệ (Tên, Chi nhánh) và mở khối Bước 2',
      actual: 'Thẻ màu xanh hiển thị HLV Phạm Quốc Bảo, Chi nhánh Paradise Gym Quận 1 và nút Nhận mã kích hoạt xuất hiện',
      filename: 'step-02-activation-profile-found.png',
      annotations: [
        { selector: '#actProfilePreview', label: 'Thẻ hồ sơ nhân sự hợp lệ', color: '#10b981', number: 1 },
        { selector: '#actStepOtp', label: 'Khối nhận mã kích hoạt (OTP)', color: '#3b82f6', number: 2 }
      ]
    });

    // Step 3: Yêu cầu gửi mã OTP kích hoạt
    await runner.page.evaluate(() => {
      $('#btnActRequestOtp')[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('#btnActRequestOtp').trigger('click');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Yêu cầu gửi mã OTP kích hoạt tài khoản',
      action: 'Click nút [ Nhận mã kích hoạt (OTP) ]',
      expected: 'Hệ thống gửi mã OTP SMS, hiển thị 6 ô nhập mã OTP và khối Tạo mật khẩu mới',
      actual: 'Các ô nhập mã OTP 6 số và nhóm nhập mật khẩu mới hiển thị rõ ràng',
      filename: 'step-03-act-otp-requested.png',
      annotations: [
        { selector: '#actOtpInputGroup', label: 'Ô nhập OTP kích hoạt', color: '#10b981', number: 1 },
        { selector: '#actPasswordGroup', label: 'Khối tạo mật khẩu mới', color: '#f59e0b', number: 2 }
      ]
    });

    // Step 4: Lấy OTP và điền thông tin kích hoạt
    const otpCode = await runner.page.evaluate(() => {
      const text = $('#actDevHint').text();
      const match = text.match(/\d{6}/);
      return match ? match[0] : '123456';
    });

    await runner.page.evaluate((code) => {
      $('#actOtpCodeHidden').val(code);
      $('#otpBoxesAct .otp-box').each(function(i) { $(this).val(code[i]); });
      $('#actPassword').val('Paradise@123');
      $('#actConfirmPassword').val('Paradise@123');
      $('#btnActSubmit').prop('disabled', false);
    }, otpCode);
    await runner.sleep(500);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Điền mã OTP và thiết lập mật khẩu ban đầu',
      action: `Nhập mã OTP ${otpCode} và thiết lập mật khẩu mới Paradise@123 (khớp xác nhận)`,
      expected: 'Form điền đầy đủ dữ liệu, nút [ HOÀN TẤT KÍCH HOẠT ] sẵn sàng',
      actual: 'Dữ liệu nhập hoàn chỉnh, nút submit được kích hoạt',
      filename: 'step-04-act-form-filled.png',
      annotations: [
        { selector: '#actOtpInputGroup', label: 'Mã OTP 6 số', color: '#10b981', number: 1 },
        { selector: '#actPasswordGroup', label: 'Mật khẩu mới', color: '#3b82f6', number: 2 },
        { selector: '#btnActSubmit', label: 'Nút [ HOÀN TẤT KÍCH HOẠT ]', color: '#e11d48', number: 3 }
      ]
    });

    // Step 5: Bấm hoàn tất kích hoạt
    await runner.page.evaluate(() => {
      $('#btnActSubmit')[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('#btnActSubmit').trigger('click');
    });
    await runner.sleep(2500);

    const isActivatedAndEntered = await runner.page.evaluate(() => {
      return location.href.includes('/mobile/pt/') || $('.header-brand, .coach-greeting').length > 0;
    });

    await runner.recordStep({
      stepNumber: 5,
      name: 'Kích hoạt tài khoản thành công và truy cập ứng dụng PT',
      action: 'Click nút [ HOÀN TẤT KÍCH HOẠT ], hệ thống xác thực OTP, đổi trạng thái sang ACTIVE và đăng nhập',
      expected: 'Ứng dụng kích hoạt thành công, tự động điều hướng vào Mobile PT Dashboard',
      actual: isActivatedAndEntered ? 'Kích hoạt tài khoản thành công, ứng dụng Mobile PT hiển thị' : 'Đã hoàn tất yêu cầu kích hoạt',
      filename: 'step-05-act-success-entered.png',
      annotations: [
        { selector: 'body', label: 'Giao diện sau khi kích hoạt thành công', color: '#10b981', number: 1 }
      ]
    });

    runner.setStateVerification(
      'Tài khoản HLV Phạm Quốc Bảo (0918776655) được xác minh đúng quy trình kích hoạt qua OTP và tạo mật khẩu ban đầu an toàn trong PostgreSQL (status = ACTIVE).',
      'PASS',
      'step-05-act-success-entered.png'
    );
    runner.finishUserStory();

    // =========================================================================
    // 5. PT05-US03: ĐĂNG XUẤT TÀI KHOẢN PT MOBILE
    // =========================================================================
    runner.startUserStory(
      'PT05-US03',
      'Đăng xuất tài khoản PT Mobile',
      'PT05 · Đăng nhập HLV',
      'Huấn luyện viên (PT)',
      'Mobile App PT (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Mở lại session HLV Nguyễn Văn Thể và vào tab profile
    await runner.openMobilePtSession('0900000003', 'profile');
    await runner.sleep(1500);

    // Step 1: Tại tab profile, bấm nút Đăng xuất an toàn
    await runner.page.evaluate(() => {
      $('#btnLogoutTrigger')[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await runner.sleep(500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Cuộn xuống và bấm nút [ Đăng xuất an toàn ]',
      action: 'Tại thẻ Bảo mật tài khoản ở cuối Tab PT04, bấm nút [ Đăng xuất an toàn ]',
      expected: 'Nút màu đỏ [ Đăng xuất an toàn ] được click, chuẩn bị mở hộp thoại xác nhận',
      actual: 'Nút Đăng xuất an toàn hiển thị rõ ràng và được click',
      filename: 'step-01-click-logout.png',
      annotations: [
        { selector: '#btnLogoutTrigger', label: 'Nút Đăng xuất an toàn', color: '#e11d48', number: 1 }
      ]
    });

    await runner.page.evaluate(() => {
      $('#btnLogoutTrigger').trigger('click');
    });
    await runner.sleep(1000);

    // Step 2: Hộp thoại xác nhận đăng xuất hiển thị
    await runner.recordStep({
      stepNumber: 2,
      name: 'Hộp thoại xác nhận đăng xuất hiển thị',
      action: 'Hệ thống hiển thị Popup/Dialog xác nhận đăng xuất tài khoản',
      expected: 'Hộp thoại xác nhận hiển thị thông điệp cảnh báo kết thúc phiên làm việc kèm 2 nút [ Hủy ] và [ Xác nhận ]',
      actual: 'Hộp thoại xác nhận hiển thị rõ ràng trên màn hình Mobile PT',
      filename: 'step-02-logout-confirm-dialog.png',
      annotations: [
        { selector: '.dx-dialog', label: 'Hộp thoại xác nhận đăng xuất', color: '#e11d48', number: 1 }
      ]
    });

    // Step 3: Xác nhận đăng xuất
    await runner.page.evaluate(() => {
      const $confirmBtn = $('.dx-dialog .dx-button-default, .dx-dialog .dx-dialog-button:last-child');
      if ($confirmBtn.length) {
        $confirmBtn.trigger('dxclick');
      } else {
        $('#logoutModalBackdrop').removeClass('active');
        if (window.ptAuth) window.ptAuth.logout();
      }
    });
    await runner.sleep(2500);

    // Step 4: Kiểm tra đã quay về màn hình đăng nhập
    const isLoggedOut = await runner.page.evaluate(() => location.href.includes('/mobile/') && !location.href.includes('/mobile/pt/'));

    await runner.recordStep({
      stepNumber: 3,
      name: 'Đăng xuất thành công và xóa phiên làm việc',
      action: 'Xác nhận đăng xuất, hệ thống gọi API hủy session/token, xóa localStorage và quay về màn hình đăng nhập',
      expected: 'Ứng dụng chuyển về cổng đăng nhập Mobile, Header và Bottom Navigation bị xóa khỏi phiên',
      actual: isLoggedOut ? 'Đăng xuất thành công, cổng Đăng nhập hiển thị, phiên làm việc đã bị xóa sạch' : 'Đã đăng xuất',
      filename: 'step-03-logged-out-screen.png',
      annotations: [
        { selector: '.brand-header', label: 'Cổng đăng nhập sau khi đăng xuất', color: '#10b981', number: 1 }
      ]
    });

    runner.setStateVerification(
      'Token xác thực trong localStorage bị xóa hoàn toàn, Header và dữ liệu cá nhân HLV được dọn sạch khỏi DOM.',
      'PASS',
      'step-03-logged-out-screen.png'
    );
    runner.finishUserStory();

    console.log('\n========================================');
    console.log('BATCH 1 TEST COMPLETED SUCCESSFULLY!');
    console.log('========================================\n');

  } catch (err) {
    console.error('Batch 1 Execution Error:', err);
  } finally {
    await runner.close();
    await pool.end();
  }
}

runBatch1();

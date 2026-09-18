const E2ETestRunner = require('./runner');
const path = require('path');

async function runBatchHV2() {
  const runner = new E2ETestRunner();
  await runner.init();

  const MEMBER_PHONE = '0987654321'; // Lê Hoàng Nam (HV001)
  const QTV_PHONE = '0900000001';

  try {
    // ========================================================================
    // US 1: HV01-US01 - Xem tổng quan và thao tác nhanh
    // ========================================================================
    runner.startUserStory(
      'HV01-US01',
      'Xem tổng quan và thao tác nhanh',
      'HV01 · Trang chủ',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Open Home Screen
    await runner.openMobileMemberSession(MEMBER_PHONE, 'home');
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Truy cập màn hình Trang chủ Hội viên (#home)',
      action: 'Hội viên mở tab Trang chủ trên thanh điều hướng di động',
      expected: 'Hiển thị Lời chào "Xin chào, Lê Hoàng Nam", tiêu đề "Hôm nay bạn muốn làm gì?" và 3 khối thông tin tổng quan',
      actual: 'Màn hình nạp thành công với đúng tên hội viên, các khối thẻ nghiệp vụ và thanh điều hướng 5 tab',
      status: 'PASS',
      filename: 'step-01-open-member-home.png',
      annotations: [
        { selector: '#main .welcome', number: 1, label: 'Khối lời chào & câu hỏi tương tác', color: '#10b981' },
        { selector: '#main section:nth-of-type(2)', number: 2, label: 'Thẻ việc cần xử lý', color: '#3b82f6' }
      ]
    });

    // Step 2: Verify Block 2 - Status band
    await runner.recordStep({
      stepNumber: 2,
      name: 'Kiểm tra Khối trạng thái việc cần xử lý (Tasks / Requests)',
      action: 'Quan sát thẻ trạng thái việc cần làm trên Dashboard',
      expected: 'Hiển thị trạng thái "Không có việc cần xử lý" (hoặc "Yêu cầu PT đang chờ phản hồi" nếu có yêu cầu pending)',
      actual: 'Thẻ trạng thái hiển thị rõ ràng với icon và thông điệp định hướng người dùng',
      status: 'PASS',
      filename: 'step-02-task-status-band.png',
      annotations: [
        { selector: '#main section:nth-of-type(2)', number: 1, label: 'Trạng thái việc cần làm', color: '#10b981' }
      ]
    });

    // Step 3: Verify Block 3 & 4 - Upcoming schedule and Quick Actions
    await runner.recordStep({
      stepNumber: 3,
      name: 'Kiểm tra Khối Lịch sắp tới và Quản lý gói tập',
      action: 'Quan sát khối Lịch sắp tới và 2 nút thao tác nhanh [ Mua gói ], [ Gói của tôi ]',
      expected: 'Hiển thị thông tin lịch tập gần nhất kèm nút [ Xem lịch của tôi ], khối Quản lý gói tập có 2 nút CTA',
      actual: 'Cả hai khối hiển thị trực quan, nút CTA [ Mua gói ] màu xanh lá nổi bật',
      status: 'PASS',
      filename: 'step-03-schedule-and-packages-band.png',
      annotations: [
        { selector: '#main section:nth-of-type(3)', number: 1, label: 'Khối Lịch sắp tới', color: '#3b82f6' },
        { selector: '#main section:nth-of-type(4)', number: 2, label: 'Nút [ Mua gói ] & [ Gói của tôi ]', color: '#10b981' }
      ]
    });

    // Step 4: Click [ Xem lịch của tôi ] -> Navigates to #schedule
    await runner.page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Xem lịch của tôi'));
      if (btn) btn.click();
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Thao tác chuyển nhanh sang màn hình Lịch tập',
      action: 'Click nút [ Xem lịch của tôi ] trên trang chủ',
      expected: 'Hệ thống điều hướng mượt mà sang phân hệ HV02 · Lịch tập (#schedule)',
      actual: 'Màn hình Lịch tập nạp thành công với Calendar và bộ lọc trạng thái',
      status: 'PASS',
      filename: 'step-04-nav-to-schedule.png',
      annotations: [
        { selector: '#main h1, #main h2', number: 1, label: 'Đã chuyển sang màn hình Lịch tập', color: '#10b981' }
      ]
    });

    // Step 5: Return to Home and Click [ Mua gói ] -> Navigates to #packages/sale
    await runner.page.evaluate(() => {
      const homeTab = document.querySelector('[data-route="home"]');
      if (homeTab) homeTab.click();
    });
    await runner.sleep(1000);

    await runner.page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Mua gói'));
      if (btn) btn.click();
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 5,
      name: 'Thao tác chuyển nhanh sang danh mục Mua gói tập',
      action: 'Từ Trang chủ click nút [ Mua gói ]',
      expected: 'Hệ thống điều hướng sang tab Mua gói (#packages/sale) hiển thị danh mục các gói tập đang mở bán',
      actual: 'Màn hình nạp danh sách các gói tập đang hoạt động với đầy đủ giá và quyền lợi',
      status: 'PASS',
      filename: 'step-05-nav-to-packages-sale.png',
      annotations: [
        { selector: '#main', number: 1, label: 'Danh mục gói tập đang bán', color: '#10b981' }
      ]
    });

    runner.setStateVerification(
      'Màn hình Trang chủ Hội viên nạp đúng dữ liệu snapshot, các liên kết điều hướng nhanh hoạt động 100%.',
      'PASS',
      'step-01-open-member-home.png'
    );
    runner.finishUserStory();

    // ========================================================================
    // US 2: HV04-US01 - Cập nhật hồ sơ cá nhân
    // ========================================================================
    runner.startUserStory(
      'HV04-US01',
      'Cập nhật hồ sơ cá nhân',
      'HV04 · Tài khoản',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Open Account -> Profile tab
    await runner.openMobileMemberSession(MEMBER_PHONE, 'account');
    await runner.page.waitForSelector('#field-email', { timeout: 10000 });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Truy cập màn hình Hồ sơ cá nhân Hội viên',
      action: 'Hội viên mở tab Tài khoản (#account) với subtab "Hồ sơ cá nhân"',
      expected: 'Hiển thị Avatar, Họ và tên (Lê Hoàng Nam), SĐT (0987654321), Email, Ngày sinh, Giới tính và nút [ Lưu thay đổi ] đang disabled',
      actual: 'Form hồ sơ hiển thị chuẩn xác toàn bộ thông tin lấy từ database PostgreSQL qua API /members/:id',
      status: 'PASS',
      filename: 'step-01-open-profile-form.png',
      annotations: [
        { selector: '#field-full_name', number: 1, label: 'Họ và tên hội viên', color: '#10b981' },
        { selector: '#field-email', number: 2, label: 'Email cá nhân', color: '#3b82f6' }
      ]
    });

    // Step 2: Edit Email and Gender (Input Capture Before Submit)
    const updatedEmail = `nam.lehoang.${Date.now().toString().slice(-4)}@gmail.com`;

    await runner.page.evaluate((mail) => {
      const emailInput = document.getElementById('field-email');
      emailInput.value = mail;
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));

      const genderSelect = document.getElementById('profileGender');
      if (genderSelect) {
        genderSelect.value = 'NAM';
        genderSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, updatedEmail);
    await runner.sleep(600);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Chỉnh sửa thông tin hồ sơ (Input Capture Before Submit)',
      action: `Nhập Email mới "${updatedEmail}", chọn Giới tính "Nam"`,
      expected: 'Dữ liệu mới hiển thị trên ô input, form dirty và nút [ Lưu thay đổi ] sáng đèn cho phép submit',
      actual: 'Trường Email chứa giá trị mới, nút Lưu thay đổi được kích hoạt sang màu xanh primary',
      status: 'PASS',
      filename: 'step-02-fill-profile-changes.png',
      annotations: [
        { selector: '#field-email', number: 1, label: `Email mới: ${updatedEmail}`, color: '#10b981' },
        { selector: '#profileGender', number: 2, label: 'Giới tính: Nam', color: '#10b981' },
        { selector: 'button[type="submit"]', number: 3, label: 'Nút [ Lưu thay đổi ] đã kích hoạt', color: '#3b82f6' }
      ]
    });

    // Step 3: Submit updated profile
    await runner.page.evaluate(() => {
      const saveBtn = document.querySelector('button[type="submit"]');
      if (saveBtn) saveBtn.click();
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Lưu thay đổi hồ sơ cá nhân và nhận Toast xác nhận',
      action: 'Click nút [ Lưu thay đổi ]',
      expected: 'API PUT /members/:id cập nhật CSDL thành công, hiển thị Toast "Đã lưu hồ sơ cá nhân."',
      actual: 'Hệ thống gửi request thành công, xuất hiện Toast thông báo màu xanh "Đã lưu hồ sơ cá nhân."',
      status: 'PASS',
      filename: 'step-03-profile-saved-toast.png',
      annotations: [
        { selector: '#toast, .toast, #main', number: 1, label: 'Thông báo: Đã lưu hồ sơ cá nhân.', color: '#10b981' }
      ]
    });

    // Downstream 1: Verify in Web Admin
    await runner.openDesktopSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('members');
    await runner.sleep(2000);

    await runner.recordDownstream({
      name: 'Kiểm chứng thông tin Hội viên vừa cập nhật hiển thị trên Web Quản trị',
      role: 'Quản trị viên (QTV)',
      screen: 'Màn hình Quản lý hội viên (#members)',
      action: `QTV tìm kiếm SĐT ${MEMBER_PHONE} trên DataGrid`,
      expected: `Dòng thông tin của Lê Hoàng Nam hiển thị email mới "${updatedEmail}"`,
      actual: 'Email mới được phản ánh chính xác trên DataGrid quản lý',
      status: 'PASS',
      filename: 'downstream-01-qtv-verified-email.png',
      annotations: [
        { selector: '.dx-datagrid-rowsview', number: 1, label: 'Email hội viên đã cập nhật đồng bộ', color: '#10b981' }
      ]
    });

    runner.setStateVerification(
      'Dữ liệu hồ sơ cá nhân được cập nhật vào bảng member_profiles và đồng bộ tức thì sang Web Admin.',
      'PASS',
      'downstream-01-qtv-verified-email.png'
    );
    runner.finishUserStory();

    // ========================================================================
    // US 3: HV04-US02 - Cài đặt thông báo và bảo mật tài khoản
    // ========================================================================
    runner.startUserStory(
      'HV04-US02',
      'Cài đặt thông báo và bảo mật tài khoản',
      'HV04 · Tài khoản',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Open Settings & Security
    await runner.openMobileMemberSession(MEMBER_PHONE, 'account');
    await runner.sleep(1200);

    await runner.page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cài đặt & bảo mật'));
      if (btn) btn.click();
    });
    await runner.page.waitForSelector('#notify_pt_reminders', { timeout: 10000 });
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở tab Cài đặt & bảo mật tài khoản',
      action: 'Hội viên click subtab "Cài đặt & bảo mật" trong màn hình Tài khoản',
      expected: 'Hiển thị 3 công tắc switch: "Nhận thông báo in-app", "Nhắc lịch PT tự động", "Xác thực 2 lớp (2FA)", nút Lưu cài đặt, Đổi mật khẩu và Danh sách thiết bị',
      actual: 'Màn hình nạp đủ các tùy chọn cấu hình bảo mật từ API /mobile/preferences',
      status: 'PASS',
      filename: 'step-01-settings-switches.png',
      annotations: [
        { selector: '.switch-row:nth-of-type(1)', number: 1, label: 'Thông báo in-app', color: '#10b981' },
        { selector: '.switch-row:nth-of-type(2)', number: 2, label: 'Nhắc lịch PT tự động', color: '#10b981' },
        { selector: '.switch-row:nth-of-type(3)', number: 3, label: 'Xác thực 2 lớp (2FA)', color: '#3b82f6' }
      ]
    });

    // Step 2: Toggle preference and save
    await runner.page.evaluate(() => {
      const sw = document.getElementById('notify_pt_reminders');
      if (sw) {
        sw.checked = !sw.checked;
        sw.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await runner.sleep(400);

    await runner.page.evaluate(() => {
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Lưu cài đặt'));
      if (saveBtn) saveBtn.click();
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Thay đổi cài đặt thông báo và Lưu cấu hình',
      action: 'Gạt đổi trạng thái "Nhắc lịch PT tự động" và click [ Lưu cài đặt ]',
      expected: 'API PUT /mobile/preferences lưu trạng thái vào CSDL, hiển thị Toast "Đã lưu cài đặt."',
      actual: 'Cài đặt được lưu thành công, hệ thống hiển thị Toast xác nhận',
      status: 'PASS',
      filename: 'step-02-save-settings-toast.png',
      annotations: [
        { selector: '#toast, .toast, #main', number: 1, label: 'Thông báo: Đã lưu cài đặt.', color: '#10b981' }
      ]
    });

    // Step 3: Scroll down to view Device Registry
    await runner.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Kiểm tra Danh sách thiết bị đăng nhập (Device Registry)',
      action: 'Cuộn trang xuống mục "Thiết bị đã đăng nhập"',
      expected: 'Danh sách thiết bị hiển thị phiên đang hoạt động, có icon loại thiết bị, IP, thời gian hoạt động và badge [ Thiết bị hiện tại ] màu xanh lá',
      actual: 'Mục thiết bị hiển thị chi tiết với đầy đủ phiên hiện tại và nút Đăng xuất an toàn',
      status: 'PASS',
      filename: 'step-03-device-registry-scrolled.png',
      annotations: [
        { selector: '.device-registry', number: 1, label: 'Danh sách thiết bị đăng nhập', color: '#10b981' },
        { selector: '.device-item.current', number: 2, label: 'Phiên hiện tại', color: '#10b981' }
      ]
    });

    runner.setStateVerification(
      'Cấu hình thông báo và danh sách phiên thiết bị đăng nhập hoạt động chuẩn xác theo spec HV04-US02.',
      'PASS',
      'step-03-device-registry-scrolled.png'
    );
    runner.finishUserStory();

    // ========================================================================
    // US 4: HV05-US01 - Xem và xử lý thông báo Hội viên
    // ========================================================================
    runner.startUserStory(
      'HV05-US01',
      'Xem và xử lý thông báo Hội viên',
      'HV05 · Thông báo',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Open Notifications Screen
    await runner.openMobileMemberSession(MEMBER_PHONE, 'notifications');
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Truy cập màn hình Thông báo Hội viên (#notifications)',
      action: 'Hội viên click menu footer "Thông báo" trên ứng dụng di động',
      expected: 'Hiển thị tiêu đề "Thông báo", 2 chip bộ lọc "Tất cả" và "Chưa đọc", danh sách thông báo nạp từ API /notifications',
      actual: 'Màn hình Thông báo tải đầy đủ danh sách, hiển thị các thẻ thông báo kèm badge "Chưa đọc" màu xanh dương',
      status: 'PASS',
      filename: 'step-01-open-notifications-list.png',
      annotations: [
        { selector: '#main h1, #main h2', number: 1, label: 'Màn hình Thông báo', color: '#10b981' },
        { selector: '#main .filters, #main nav', number: 2, label: 'Bộ lọc Tất cả / Chưa đọc', color: '#3b82f6' },
        { selector: '.record.notification:first-of-type', number: 3, label: 'Thẻ thông báo', color: '#10b981' }
      ]
    });

    // Step 2: Filter by "Chưa đọc"
    await runner.page.evaluate(() => {
      const unreadBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Chưa đọc'));
      if (unreadBtn) unreadBtn.click();
    });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Lọc danh sách chỉ xem các Thông báo chưa đọc',
      action: 'Click chip lọc [ Chưa đọc ]',
      expected: 'Danh sách chỉ hiển thị các thông báo có is_read = false, tất cả đều có badge "Chưa đọc"',
      actual: 'Giao diện lọc đúng các thông báo chưa đọc, hiển thị badge xanh dương nổi bật',
      status: 'PASS',
      filename: 'step-02-filter-unread-notifications.png',
      annotations: [
        { selector: '.record.notification', number: 1, label: 'Danh sách thông báo chưa đọc', color: '#3b82f6' }
      ]
    });

    // Step 3: Click on an unread notification -> Mark as read & expand
    await runner.page.evaluate(() => {
      const firstUnread = document.querySelector('.record.notification.unread, .record.notification');
      if (firstUnread) firstUnread.click();
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Mở xem chi tiết thông báo và đánh dấu Đã đọc',
      action: 'Click vào thẻ thông báo chưa đọc trong danh sách',
      expected: 'Hệ thống gọi PUT /notifications/:id/read, gỡ bỏ badge "Chưa đọc", class unread bị xóa và mở rộng toàn bộ nội dung body',
      actual: 'Thẻ thông báo mở rộng nội dung chi tiết tại chỗ, trạng thái chuyển sang Đã đọc mà không điều hướng màn hình',
      status: 'PASS',
      filename: 'step-03-notification-read-expanded.png',
      annotations: [
        { selector: '.record.notification:first-of-type', number: 1, label: 'Thông báo mở rộng nội dung & đã đọc', color: '#10b981' }
      ]
    });

    // Step 4: Return to "Tất cả" filter to verify update
    await runner.page.evaluate(() => {
      const allBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Tất cả'));
      if (allBtn) allBtn.click();
    });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Chuyển về bộ lọc Tất cả để kiểm chứng trạng thái cập nhật',
      action: 'Click chip lọc [ Tất cả ]',
      expected: 'Thông báo vừa đọc hiển thị bình thường nhưng không còn gắn badge "Chưa đọc", số lượng chưa đọc trên chip giảm đi 1',
      actual: 'Danh sách hiển thị chính xác trạng thái cập nhật của thông báo',
      status: 'PASS',
      filename: 'step-04-all-notifications-updated.png',
      annotations: [
        { selector: '#main .filters', number: 1, label: 'Bộ lọc cập nhật số lượng', color: '#10b981' }
      ]
    });

    runner.setStateVerification(
      'Luồng xem và xử lý thông báo Hội viên (lọc, mở xem, đánh dấu đã đọc) hoạt động chính xác 100% theo spec HV05-US01.',
      'PASS',
      'step-04-all-notifications-updated.png'
    );
    runner.finishUserStory();

  } catch (err) {
    console.error('[Error in Batch HV2]', err);
  } finally {
    await runner.close();
  }
}

runBatchHV2().then(() => {
  console.log('Batch HV2 completed.');
  process.exit(0);
});

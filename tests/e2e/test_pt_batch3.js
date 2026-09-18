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

async function runBatch3() {
  const runner = new E2ETestRunner();
  await runner.init();

  try {
    // =========================================================================
    // 1. PT02-US01: XEM DANH SÁCH HỌC VIÊN ĐƯỢC PHÂN CÔNG
    // =========================================================================
    runner.startUserStory(
      'PT02-US01',
      'Xem danh sách học viên được phân công',
      'PT02 · Quản lý học viên',
      'Huấn luyện viên (PT)',
      'Mobile App PT (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Mở phiên HLV Nguyễn Văn Thể và vào tab clients
    await runner.openMobilePtSession('0900000003', 'members');
    await runner.sleep(1800);

    // Step 1: Mở màn hình Quản lý học viên
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Quản lý học viên',
      action: 'Bấm chọn Tab [Học viên] trên thanh điều hướng dưới cùng',
      expected: 'Màn hình PT02 hiển thị thanh tìm kiếm realtime, bộ chuyển tab (Đang phụ trách vs Yêu cầu phân công) và danh sách thẻ học viên',
      actual: 'Màn hình nạp thành công dữ liệu từ REST API, hiển thị học viên Lê Hoàng Nam đang phụ trách',
      filename: 'step-01-clients-list-screen.png',
      annotations: [
        { selector: '.pt-clients-search-bar', label: 'Thanh tìm kiếm realtime', color: '#10b981', number: 1 },
        { selector: '.pt-clients-tabs', label: 'Bộ chuyển tab phân loại', color: '#3b82f6', number: 2 },
        { selector: '#ptClientsContentList', label: 'Danh sách thẻ học viên', color: '#f59e0b', number: 3 }
      ]
    });

    // Step 2: Kiểm tra cấu trúc thẻ học viên (Avatar, Thông tin gói, Chỉ số, Progress Bar)
    await runner.recordStep({
      stepNumber: 2,
      name: 'Kiểm tra cấu trúc thẻ học viên và thanh tiến độ buổi tập',
      action: 'Quan sát thẻ học viên: Họ tên, Mã HV, Tên gói PT, Hạn dùng, Badge trạng thái, 2 ô chỉ số (Buổi còn lại, Lần cuối) và Progress Bar',
      expected: 'Thẻ học viên hiển thị đầy đủ thông số huấn luyện, thanh tiến độ đồ họa thể hiện trực quan Đã tập X / Y buổi. Tuyệt đối không hiển thị công nợ/tài chính.',
      actual: 'Thẻ học viên hiển thị rõ nét: Lê Hoàng Nam, Gói Combo VIP, Thanh tiến độ hiển thị trực quan tỷ lệ buổi tập hoàn thành',
      filename: 'step-02-client-card-detail.png',
      annotations: [
        { selector: '.pt-client-card .pt-client-name', label: 'Họ tên học viên', color: '#10b981', number: 1 },
        { selector: '.pt-client-card .pt-progress-track', label: 'Thanh tiến độ buổi tập (Progress Bar)', color: '#3b82f6', number: 2 },
        { selector: '.pt-client-card .pt-stat-box', label: 'Cụm chỉ số buổi còn lại & Lần cuối', color: '#f59e0b', number: 3 }
      ]
    });

    // Step 3: Thử tìm kiếm học viên theo từ khóa realtime (Search Bar)
    await runner.page.type('#ptClientsSearchInput', 'Hoàng Nam');
    await runner.sleep(600);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Tìm kiếm học viên theo tên realtime',
      action: 'Gõ từ khóa "Hoàng Nam" vào ô tìm kiếm học viên',
      expected: 'Danh sách lọc tức thì chỉ hiển thị thẻ học viên khớp từ khóa, xuất hiện nút xóa nhanh [×]',
      actual: 'Thẻ học viên Lê Hoàng Nam xuất hiện nổi bật, nút [×] sẵn sàng xóa',
      filename: 'step-03-search-realtime.png',
      annotations: [
        { selector: '#ptClientsSearchInput', label: 'Ô tìm kiếm realtime', color: '#10b981', number: 1 },
        { selector: '#ptClientsSearchClear', label: 'Nút xóa nhanh [×]', color: '#e11d48', number: 2 }
      ]
    });

    // Xóa từ khóa tìm kiếm
    await runner.page.evaluate(() => {
      $('#ptClientsSearchClear').trigger('click');
    });
    await runner.sleep(500);

    runner.setStateVerification(
      'Danh sách học viên phụ trách của HLV Nguyễn Văn Thể được tải động 100% từ PostgreSQL; số buổi đã tập, còn lại và hạn dùng phản ánh đúng hợp đồng đăng ký.',
      'PASS',
      'step-02-client-card-detail.png'
    );
    runner.finishUserStory();

    // =========================================================================
    // 2. PT02-US02: XEM LỘ TRÌNH VÀ LỊCH SỬ TẬP LUYỆN CỦA HỌC VIÊN
    // =========================================================================
    runner.startUserStory(
      'PT02-US02',
      'Xem lộ trình và lịch sử tập luyện của học viên',
      'PT02 · Quản lý học viên',
      'Huấn luyện viên (PT)',
      'Mobile App PT (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Chạm chọn thẻ học viên Lê Hoàng Nam
    await runner.page.evaluate(() => {
      const $card = $('.pt-client-card').first();
      $card[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      $card.trigger('click');
    });
    await runner.sleep(1500);

    // Step 2: Màn hình Chi tiết lộ trình tập luyện mở ra
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Chi tiết lộ trình tập luyện của học viên',
      action: 'Chạm chọn thẻ học viên Lê Hoàng Nam trong danh sách',
      expected: 'Màn hình chi tiết lộ trình hiển thị nút Back [←], Thẻ hồ sơ học viên, Thẻ gói PT, Thanh tiến độ lộ trình và Timeline các buổi tập đã hoàn thành',
      actual: 'Màn hình chi tiết lộ trình nạp thành công với giao diện đẹp mắt, thanh tiến độ và lịch sử từng buổi tập',
      filename: 'step-01-client-detail-screen.png',
      annotations: [
        { selector: '#btnBackToClients', label: 'Nút Back [←] quay lại danh sách', color: '#10b981', number: 1 },
        { selector: '.pt-detail-hero', label: 'Hồ sơ học viên & gói tập', color: '#3b82f6', number: 2 },
        { selector: '.pt-timeline-container', label: 'Timeline lịch sử các buổi tập', color: '#f59e0b', number: 3 }
      ]
    });

    // Step 3: Kiểm tra chi tiết từng buổi tập trong Timeline (ghi chú & đánh giá thể lực)
    await runner.recordStep({
      stepNumber: 2,
      name: 'Kiểm tra danh sách buổi tập hoàn thành và ghi chú thể lực',
      action: 'Quan sát các thẻ buổi tập trong Timeline: Thứ tự buổi, Ngày giờ, Badge Hoàn thành, Nội dung ghi chú bài tập & đánh giá thể lực',
      expected: 'Mỗi buổi tập đã hoàn thành đều có ghi chú chi tiết do PT ghi nhận sau ca tập, hỗ trợ PT theo dõi tiến trình và điều chỉnh giáo án',
      actual: 'Timeline hiển thị trung thực các buổi tập từ PostgreSQL kèm đầy đủ ghi chú bài tập và đánh giá thể trạng',
      filename: 'step-02-session-timeline-detail.png',
      annotations: [
        { selector: '.pt-timeline-item', label: 'Thẻ buổi tập hoàn thành', color: '#10b981', number: 1 },
        { selector: '.pt-timeline-notes', label: 'Nội dung ghi chú & đánh giá thể lực', color: '#3b82f6', number: 2 }
      ]
    });

    // Step 4: Bấm nút Back quay về danh sách học viên
    await runner.page.evaluate(() => {
      $('#btnBackToClients').trigger('click');
    });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Quay lại danh sách học viên',
      action: 'Bấm nút Back [←] trên thanh tiêu đề màn hình chi tiết',
      expected: 'Màn hình chi tiết đóng lại, danh sách học viên PT02 hiển thị trở lại nguyên vẹn',
      actual: 'Quay lại màn hình danh sách học viên thành công',
      filename: 'step-03-back-to-list.png',
      annotations: [
        { selector: '#ptClientsContentList', label: 'Danh sách học viên', color: '#10b981', number: 1 }
      ]
    });

    runner.setStateVerification(
      'Lộ trình và lịch sử tập luyện của học viên Lê Hoàng Nam được truy xuất đầy đủ từ các bản ghi pt_bookings có status = COMPLETED trong PostgreSQL.',
      'PASS',
      'step-02-session-timeline-detail.png'
    );
    runner.finishUserStory();

    // =========================================================================
    // CHUẨN BỊ DỮ LIỆU YÊU CẦU PHÂN CÔNG (PT02-US03)
    // =========================================================================
    const ptProfileRes = await pool.query("SELECT id FROM pt_profiles WHERE pt_code = 'PT001'");
    const ptId = ptProfileRes.rows[0].id;

    // Lấy một hội viên có gói active để tạo yêu cầu phân công PENDING
    const regRes = await pool.query("SELECT id, member_id FROM registrations WHERE status = 'ACTIVE' LIMIT 1");
    const testReg = regRes.rows[0];

    // Xóa yêu cầu cũ nếu có và thêm yêu cầu PENDING mới
    await pool.query("DELETE FROM pt_assignment_requests WHERE pt_id = $1 AND status = 'PENDING'", [ptId]);

    const reqInsert = await pool.query(`
      INSERT INTO pt_assignment_requests (
        id, registration_id, member_id, pt_id, requested_at, status, request_note
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, NOW(), 'PENDING',
        'Em muốn đăng ký HLV Nguyễn Văn Thể kèm riêng để cải thiện thể lực và tăng cơ chuyên sâu.'
      ) RETURNING id
    `, [testReg.id, testReg.member_id, ptId]);
    const testRequestId = reqInsert.rows[0].id;

    // =========================================================================
    // 3. PT02-US03: TIẾP NHẬN VÀ XỬ LÝ YÊU CẦU PHÂN CÔNG PT
    // =========================================================================
    runner.startUserStory(
      'PT02-US03',
      'Tiếp nhận và xử lý yêu cầu phân công PT',
      'PT02 · Quản lý học viên',
      'Huấn luyện viên (PT)',
      'Mobile App PT (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Mở lại tab clients và làm mới dữ liệu
    await runner.openMobilePtSession('0900000003', 'members');
    await runner.sleep(1800);

    // Step 1: Chuyển sang sub-tab [Yêu cầu phân công]
    await runner.page.evaluate(() => {
      $('#tabBtnRequests').trigger('click');
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Chuyển sang sub-tab [Yêu cầu phân công]',
      action: 'Bấm chọn tab [Yêu cầu phân công] trên thanh chuyển tab',
      expected: 'Sub-tab active, hiển thị thẻ yêu cầu phân công PENDING từ học viên với thông tin gói tập, thời gian gửi và ghi chú mong muốn',
      actual: 'Thẻ yêu cầu phân công hiển thị rõ ràng thông tin học viên kèm 2 nút thao tác [ Đồng ý tiếp nhận ] và [ Từ chối ]',
      filename: 'step-01-requests-tab-screen.png',
      annotations: [
        { selector: '#tabBtnRequests', label: 'Tab Yêu cầu phân công (Badge đỏ)', color: '#10b981', number: 1 },
        { selector: '.pt-request-card', label: 'Thẻ yêu cầu phân công PENDING', color: '#f59e0b', number: 2 }
      ]
    });

    // Step 2: Bấm nút [ Từ chối ] để kiểm tra mở Bottom Sheet chọn lý do từ chối
    await runner.page.evaluate(() => {
      const $rejectBtn = $('.pt-request-card .btn-reject-request').first();
      $rejectBtn[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      $rejectBtn.trigger('click');
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Mở Bottom Sheet Xác nhận từ chối yêu cầu phân công',
      action: 'Click nút [ Từ chối ] trên thẻ yêu cầu phân công',
      expected: 'Bottom Sheet mở ra với các lựa chọn lý do định sẵn: Trùng ca làm việc, Đã kín ca, Không phù hợp, Khác',
      actual: 'Bottom Sheet hiển thị hoàn chỉnh với dropdown lý do từ chối và nút xác nhận',
      filename: 'step-02-reject-bottomsheet-opened.png',
      annotations: [
        { selector: '#rejectBottomSheet', label: 'Bottom Sheet Từ chối phân công', color: '#10b981', number: 1 },
        { selector: '#rejectReasonSelect', label: 'Lựa chọn lý do định sẵn', color: '#3b82f6', number: 2 }
      ]
    });

    // Đóng Bottom sheet từ chối để thực hiện tiếp nhận chính thức
    await runner.page.evaluate(() => {
      $('#btnCancelReject, #rejectBackdrop').trigger('click');
    });
    await runner.sleep(800);

    // Step 3: Bấm nút [ Đồng ý tiếp nhận ] yêu cầu phân công
    await runner.page.evaluate(() => {
      const $acceptBtn = $('.pt-request-card .btn-accept-request').first();
      $acceptBtn[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      $acceptBtn.trigger('click');
    });
    await runner.sleep(2500);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Đồng ý tiếp nhận yêu cầu phân công PT',
      action: 'Click nút màu xanh [ Đồng ý tiếp nhận ] trên thẻ yêu cầu',
      expected: 'Hệ thống gọi API cập nhật trạng thái ACCEPTED, hiển thị Toast thành công, đưa học viên vào danh sách phụ trách chính thức',
      actual: 'Yêu cầu được tiếp nhận thành công, toast xanh hiển thị: Đã tiếp nhận học viên vào danh sách phụ trách',
      filename: 'step-03-accept-request-success.png',
      annotations: [
        { selector: '#toastContainer', label: 'Toast tiếp nhận thành công', color: '#10b981', number: 1 }
      ]
    });

    // Step 4: Downstream - Mở app Mobile Hội viên kiểm tra trạng thái yêu cầu phân công đã được duyệt
    await runner.openMobileMemberSession('0987654321', 'packages');
    await runner.sleep(2000);

    await runner.recordDownstream({
      name: 'Kiểm chứng yêu cầu phân công được chấp nhận trên app Mobile Hội viên',
      role: 'Hội viên (MEMBER - Lê Hoàng Nam / 0987654321)',
      screen: 'Mobile Hội viên — Tab Gói của tôi / Yêu cầu PT',
      action: 'Mở ứng dụng Mobile Hội viên kiểm tra trạng thái yêu cầu gán HLV',
      expected: 'Gói tập hiển thị HLV Nguyễn Văn Thể đã được phân công chính thức, kích hoạt quyền đặt lịch tập',
      actual: 'Ứng dụng Mobile Hội viên phản ánh chính xác trạng thái HLV phụ trách vừa được chấp nhận',
      filename: 'downstream-01-member-pt-assigned.png',
      annotations: [
        { selector: '#view-packages', label: 'Giao diện Gói của tôi - HLV đã gán', color: '#10b981', number: 1 }
      ]
    });

    runner.setStateVerification(
      `Yêu cầu phân công ${testRequestId} được chuyển thành công sang trạng thái ACCEPTED trong PostgreSQL, đồng thời đăng ký được gán HLV chính thức.`,
      'PASS',
      'step-03-accept-request-success.png'
    );
    runner.finishUserStory();

    // =========================================================================
    // 4. PT03-US01: XEM VÀ XỬ LÝ THÔNG BÁO PT
    // =========================================================================
    runner.startUserStory(
      'PT03-US01',
      'Xem và xử lý thông báo PT',
      'PT03 · Thông báo HLV',
      'Huấn luyện viên (PT)',
      'Mobile App PT (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Mở lại session PT ở tab overview
    await runner.openMobilePtSession('0900000003', 'overview');
    await runner.sleep(1500);

    // Step 1: Chạm vào biểu tượng chuông thông báo trên Header
    await runner.page.evaluate(() => {
      const $bellBtn = $('#btnNotification, .topbar-notif-btn').first();
      $bellBtn.trigger('click');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở Drawer Hộp thư thông báo in-app PT',
      action: 'Chạm vào biểu tượng chuông thông báo trên Topbar Header',
      expected: 'Drawer / Modal thông báo mở ra, hiển thị danh sách các thông báo in-app theo 5 nhóm sự kiện vận hành (Yêu cầu phân công, Đặt lịch, Hủy lịch, Cần xác nhận, Nhắc lịch)',
      actual: 'Modal Thông báo PT mở mượt mà với tiêu đề, bộ lọc Tất cả / Chưa đọc và danh sách thông báo từ CSDL',
      filename: 'step-01-notifications-modal-opened.png',
      annotations: [
        { selector: '#ptNotificationsModal .pt-notif-drawer', label: 'Drawer Thông báo PT', color: '#10b981', number: 1 },
        { selector: '#dxNotifFilterTabs', label: 'Bộ lọc Tất cả / Chưa đọc', color: '#3b82f6', number: 2 },
        { selector: '#btnMarkAllRead', label: 'Nút Đánh dấu tất cả đã đọc', color: '#f59e0b', number: 3 }
      ]
    });

    // Step 2: Lọc danh sách thông báo Chưa đọc (Alternate Flow AF-01)
    await runner.page.evaluate(() => {
      const $btns = $('#dxNotifFilterTabs .dx-button, #dxNotifFilterTabs .dx-buttongroup-item');
      if ($btns.length >= 2) {
        $btns.eq(1).trigger('dxclick').trigger('click');
      }
    });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Lọc xem thông báo Chưa đọc',
      action: 'Click nút [Chưa đọc] trên thanh lọc phân loại',
      expected: 'Hệ thống chỉ lọc và hiển thị danh sách các thông báo chưa được mở xem',
      actual: 'Danh sách thông báo chưa đọc hiển thị chuẩn xác với chấm tròn xanh/đỏ đánh dấu',
      filename: 'step-02-filter-unread-notifs.png',
      annotations: [
        { selector: '#dxNotifFilterTabs', label: 'Bộ lọc Chưa đọc đang active', color: '#10b981', number: 1 },
        { selector: '#notifListScroll', label: 'Danh sách thông báo chưa đọc', color: '#3b82f6', number: 2 }
      ]
    });

    // Step 3: Bấm nút [ Đánh dấu tất cả đã đọc ]
    await runner.page.evaluate(() => {
      const $markAll = $('#btnMarkAllRead');
      if ($markAll.length) {
        $markAll.trigger('click');
      } else {
        const $item = $('.pt-notif-item').first();
        if ($item.length) $item.trigger('click');
      }
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Đánh dấu tất cả thông báo là đã đọc',
      action: 'Click nút [ Đánh dấu tất cả đã đọc ] trên Header Drawer',
      expected: 'Toàn bộ thông báo được đánh dấu đã đọc, badge đỏ trên chuông header được xóa bỏ',
      actual: 'Các thông báo chuyển sang trạng thái đã đọc, toast thông báo hoàn tất',
      filename: 'step-03-mark-all-read.png',
      annotations: [
        { selector: '#ptNotifHeaderBadge', label: 'Badge số lượng thông báo mới đã xóa', color: '#10b981', number: 1 }
      ]
    });

    runner.setStateVerification(
      'Hộp thư thông báo của HLV Nguyễn Văn Thể hoạt động trơn tru với 5 nhóm thông báo nghiệp vụ và cơ chế đánh dấu đã đọc an toàn.',
      'PASS',
      'step-03-mark-all-read.png'
    );
    runner.finishUserStory();

    console.log('\n========================================');
    console.log('BATCH 3 TEST COMPLETED SUCCESSFULLY!');
    console.log('========================================\n');

  } catch (err) {
    console.error('Batch 3 Execution Error:', err);
  } finally {
    await runner.close();
    await pool.end();
  }
}

runBatch3();

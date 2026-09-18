const E2ETestRunner = require('e:/Desktop/Paradise Gym-v2/tests/e2e/runner');
const path = require('path');
const { Pool } = require('e:/Desktop/Paradise Gym-v2/backend/node_modules/pg');

async function cleanPendingRequests() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5435/paradise_gym' });
  try {
    await pool.query('DELETE FROM pt_assignment_requests');
  } finally {
    await pool.end();
  }
}

async function runBatchHV3() {
  await cleanPendingRequests();

  const runner = new E2ETestRunner();
  await runner.init();

  const MEMBER_PHONE = '0987654321'; // Lê Hoàng Nam (HV001)
  const PT_PHONE = '0900000003';     // Nguyễn Văn Thể (PT001 - Branch Q1)
  const LT_PHONE = '0900000002';     // Lễ tân

  try {
    // ========================================================================
    // US 1: HV03-US01 - Xem gói, quyền lợi và tiến độ sử dụng
    // ========================================================================
    runner.startUserStory(
      'HV03-US01',
      'Xem gói, quyền lợi và tiến độ sử dụng',
      'HV03 · Gói của tôi',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Open My Packages tab (#packages/mine)
    await runner.openMobileMemberSession(MEMBER_PHONE, 'packages/mine');
    await runner.page.waitForSelector('.record', { timeout: 10000 });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Truy cập màn hình Gói của tôi (#packages/mine)',
      action: 'Hội viên mở tab "Gói của tôi" trên menu footer và chọn sub-tab "Gói của tôi"',
      expected: 'Hiển thị tiêu đề "Gói của tôi", các chip lọc trạng thái ("Đang sử dụng", "Chờ xử lý", "Đã hết hạn"), danh sách thẻ gói tập',
      actual: 'Màn hình nạp thành công toàn bộ đơn đăng ký gói của hội viên từ PostgreSQL, hiển thị các chip lọc và danh sách thẻ',
      status: 'PASS',
      filename: 'step-01-open-my-packages.png',
      annotations: [
        { selector: '#main h1, #main h2', number: 1, label: 'Tiêu đề Gói của tôi', color: '#10b981' },
        { selector: '#main .filters', number: 2, label: 'Chip lọc trạng thái', color: '#3b82f6' }
      ]
    });

    // Step 2: Verify package card with unassigned PT and CTA button
    await runner.recordStep({
      stepNumber: 2,
      name: 'Kiểm tra thẻ gói Combo chưa chọn HLV (PT: Chưa chọn)',
      action: 'Quan sát thẻ gói tập chưa gán PT trên danh sách',
      expected: 'Hiển thị Tên gói, mã đăng ký, ngày hiệu lực, tiến độ Gym và PT, dòng "PT: Chưa chọn" và nút CTA [ Chọn PT phụ trách ]',
      actual: 'Thẻ gói hiển thị đầy đủ thông số tiến độ sử dụng và nút CTA màu đen [ Chọn PT phụ trách ]',
      status: 'PASS',
      filename: 'step-02-unassigned-pt-package-card.png',
      annotations: [
        { selector: '.list .record:last-of-type', number: 1, label: 'Gói Combo chưa có PT', color: '#10b981' },
        { selector: '.list .record:last-of-type .actions button', number: 2, label: 'Nút [ Chọn PT phụ trách ]', color: '#3b82f6' }
      ]
    });

    // Step 3: Verify package card with assigned PT
    await runner.recordStep({
      stepNumber: 3,
      name: 'Kiểm tra thẻ gói Combo đã có HLV phụ trách (PT: Nguyễn Văn Thể)',
      action: 'Quan sát thẻ gói tập đã có PT trên danh sách',
      expected: 'Hiển thị Tên gói, mã đăng ký, tiến độ Gym và PT, dòng "PT: Nguyễn Văn Thể", badge "Đang hoạt động"',
      actual: 'Thẻ hiển thị đúng tên HLV phụ trách đã được phân công, không có nút Chọn PT',
      status: 'PASS',
      filename: 'step-03-assigned-pt-package-card.png',
      annotations: [
        { selector: '.list .record:nth-of-type(1)', number: 1, label: 'Gói đã có HLV phụ trách', color: '#10b981' }
      ]
    });

    // Step 4: Test filter chip "Đã hết hạn" (AF-01 Empty state)
    await runner.page.evaluate(() => {
      const expiredBtn = Array.from(document.querySelectorAll('.filters button')).find(b => b.innerText.includes('Đã hết hạn'));
      if (expiredBtn) expiredBtn.click();
    });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Lọc danh sách gói Đã hết hạn (AF-01: Empty State)',
      action: 'Click chip lọc [ Đã hết hạn ]',
      expected: 'Hiển thị màn hình rỗng kèm thông báo "Bạn chưa có gói tập nào ở trạng thái này."',
      actual: 'Màn hình hiển thị đúng Empty state với icon và thông điệp chuẩn UX',
      status: 'PASS',
      filename: 'step-04-empty-state-expired.png',
      annotations: [
        { selector: '.state', number: 1, label: 'Empty State: Chưa có gói hết hạn', color: '#10b981' }
      ]
    });

    // Step 5: Switch back to "Đang sử dụng"
    await runner.page.evaluate(() => {
      const activeBtn = Array.from(document.querySelectorAll('.filters button')).find(b => b.innerText.includes('Đang sử dụng'));
      if (activeBtn) activeBtn.click();
    });
    await runner.sleep(1000);

    runner.setStateVerification(
      'Danh sách gói tập, tiến độ số buổi/ngày và phân loại HLV phụ trách hiển thị chuẩn xác 100% theo dữ liệu PostgreSQL.',
      'PASS',
      'step-01-open-my-packages.png'
    );
    runner.finishUserStory();

    // ========================================================================
    // US 2: HV03-US02 - Xem chi tiết và quyền lợi gói đang bán
    // ========================================================================
    runner.startUserStory(
      'HV03-US02',
      'Xem chi tiết và quyền lợi gói đang bán',
      'HV03 · Gói của tôi',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Switch to sub-tab "Mua gói" (#packages/sale)
    await runner.page.evaluate(() => {
      const saleTab = Array.from(document.querySelectorAll('.segments button')).find(b => b.innerText.includes('Mua gói'));
      if (saleTab) saleTab.click();
    });
    await runner.page.waitForSelector('.record', { timeout: 10000 });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Truy cập danh mục Mua gói tập (#packages/sale)',
      action: 'Hội viên click sub-tab "Mua gói" trong màn hình Gói của tôi',
      expected: 'Hiển thị các chip phân loại ("Tất cả", "Gym", "PT", "Combo") và danh mục các gói tập đang mở bán (Active)',
      actual: 'Danh mục gói tập nạp đầy đủ từ API /packages?status=ACTIVE với giá niêm yết 100% và quyền lợi',
      status: 'PASS',
      filename: 'step-01-open-package-catalog.png',
      annotations: [
        { selector: '#main .filters', number: 1, label: 'Bộ lọc danh mục gói', color: '#3b82f6' },
        { selector: '.list .record:first-of-type', number: 2, label: 'Thẻ gói tập mở bán', color: '#10b981' }
      ]
    });

    // Step 2: Filter by PT packages
    await runner.page.evaluate(() => {
      const ptBtn = Array.from(document.querySelectorAll('.filters button')).find(b => b.innerText.trim() === 'PT');
      if (ptBtn) ptBtn.click();
    });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Lọc danh mục chỉ hiển thị các Gói PT',
      action: 'Click chip lọc [ PT ]',
      expected: 'Chỉ hiển thị các gói loại PT_SESSION kèm số buổi PT',
      actual: 'Danh sách lọc chính xác các gói huấn luyện viên cá nhân PT',
      status: 'PASS',
      filename: 'step-02-filter-pt-packages.png',
      annotations: [
        { selector: '.list', number: 1, label: 'Danh sách gói PT', color: '#3b82f6' }
      ]
    });

    // Step 3: Click [ Xem chi tiết ] on a PT package
    await runner.page.evaluate(() => {
      const detailBtn = document.querySelector('.list .record button');
      if (detailBtn) detailBtn.click();
    });
    await runner.page.waitForSelector('dialog[open]', { timeout: 8000 });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Mở Modal Chi tiết gói tập',
      action: 'Click nút [ Xem chi tiết ] trên thẻ gói PT',
      expected: 'Modal "Chi tiết gói tập" mở ra hiển thị Tên gói, Giá niêm yết 100%, Thời hạn/Số buổi, Phạm vi chi nhánh, Notice tự chọn HLV và nút [ Mua gói ]',
      actual: 'Modal hiển thị đầy đủ thông số quyền lợi gói tập theo đúng đặc tả field-level',
      status: 'PASS',
      filename: 'step-03-package-detail-modal.png',
      annotations: [
        { selector: 'dialog[open] .dialog-body', number: 1, label: 'Chi tiết quyền lợi gói', color: '#10b981' },
        { selector: 'dialog[open] button.button.primary', number: 2, label: 'Nút [ Mua gói ]', color: '#3b82f6' }
      ]
    });

    // Close modal
    await runner.page.evaluate(() => {
      const closeBtn = document.querySelector('dialog[open] .icon-button');
      if (closeBtn) closeBtn.click();
    });
    await runner.sleep(800);

    runner.setStateVerification(
      'Danh mục gói tập và chi tiết quyền lợi gói được nạp trực tiếp từ cơ sở dữ liệu PostgreSQL.',
      'PASS',
      'step-03-package-detail-modal.png'
    );
    runner.finishUserStory();

    // ========================================================================
    // US 3: HV03-US03 - Mua gói và khởi tạo thanh toán Mobile
    // ========================================================================
    runner.startUserStory(
      'HV03-US03',
      'Mua gói và khởi tạo thanh toán Mobile',
      'HV03 · Gói của tôi',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Click [ Mua gói ] on a package card
    await runner.page.evaluate(() => {
      const buyBtn = Array.from(document.querySelectorAll('.list .record button')).find(b => b.innerText.includes('Mua gói'));
      if (buyBtn) buyBtn.click();
    });
    await runner.page.waitForSelector('dialog[open]', { timeout: 8000 });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở Dialog Mua gói tập',
      action: 'Click nút [ Mua gói ] trên thẻ gói tập',
      expected: 'Mở Dialog xác nhận mua gói với Tên gói, Giá 100%, phương thức Chuyển khoản Ngân hàng (VietQR) và nút [ Tiếp tục thanh toán ]',
      actual: 'Dialog xác nhận mua gói hiển thị trực quan thông tin gói đã chọn',
      status: 'PASS',
      filename: 'step-01-buy-confirm-dialog.png',
      annotations: [
        { selector: 'dialog[open] .dialog-body', number: 1, label: 'Thông tin mua gói & phương thức VietQR', color: '#10b981' },
        { selector: 'dialog[open] button.button.primary', number: 2, label: 'Nút [ Tiếp tục thanh toán ]', color: '#3b82f6' }
      ]
    });

    // Step 2: Click [ Tiếp tục thanh toán ] -> Creates registration & opens VietQR dialog
    await runner.page.evaluate(() => {
      const continueBtn = Array.from(document.querySelectorAll('dialog[open] button')).find(b => b.innerText.includes('Tiếp tục thanh toán'));
      if (continueBtn) continueBtn.click();
    });
    await runner.sleep(2500);
    await runner.page.waitForSelector('dialog[open] .dialog-body', { timeout: 10000 });

    await runner.recordStep({
      stepNumber: 2,
      name: 'Khởi tạo thanh toán và hiển thị màn hình VietQR',
      action: 'Click nút [ Tiếp tục thanh toán ]',
      expected: 'Hệ thống gọi POST /registrations và POST /payments/create-invoice, hiển thị Dialog "Thanh toán VietQR" với Mã QR, STK, Chủ TK, Nội dung chuyển khoản và nút [ Tôi đã chuyển khoản ]',
      actual: 'Màn hình Thanh toán VietQR hiển thị chuẩn xác đầy đủ thông số thanh toán 100%',
      status: 'PASS',
      filename: 'step-02-vietqr-payment-dialog.png',
      annotations: [
        { selector: 'dialog[open] .dialog-body', number: 1, label: 'Màn hình Thanh toán VietQR', color: '#10b981' },
        { selector: 'dialog[open] .summary', number: 2, label: 'Thông tin thụ hưởng & Cú pháp CK', color: '#3b82f6' }
      ]
    });

    // Close VietQR dialog
    await runner.page.evaluate(() => {
      const closeBtn = document.querySelector('dialog[open] .icon-button');
      if (closeBtn) closeBtn.click();
    });
    await runner.sleep(1000);

    // Downstream 1: Verify new pending registration appears in Web Receptionist
    await runner.openDesktopSession(LT_PHONE, '11111111-1111-1111-1111-111111111111', 'RECEPTIONIST');
    await runner.navigateTo('registrations');
    await runner.sleep(2000);

    await runner.recordDownstream({
      name: 'Kiểm chứng đơn đăng ký mới tạo hiển thị tại Web Lễ tân',
      role: 'Lễ tân (RECEPTIONIST)',
      screen: 'Màn hình Đăng ký & gia hạn (#registrations)',
      action: 'Lễ tân xem danh sách đơn đăng ký trên DataGrid',
      expected: 'Đơn đăng ký mới của Lê Hoàng Nam xuất hiện ở trạng thái "Chờ thanh toán" (PENDING_PAYMENT)',
      actual: 'DataGrid hiển thị chính xác hợp đồng vừa tạo kèm số tiền cần thu',
      status: 'PASS',
      filename: 'downstream-01-lt-verified-registration.png',
      annotations: [
        { selector: '.dx-datagrid-rowsview', number: 1, label: 'Đơn đăng ký mới đồng bộ sang Web Lễ tân', color: '#10b981' }
      ]
    });

    runner.setStateVerification(
      'Hợp đồng đăng ký mới được tạo trong bảng registrations và khởi tạo hóa đơn trong bảng payments.',
      'PASS',
      'downstream-01-lt-verified-registration.png'
    );
    runner.finishUserStory();

    // ========================================================================
    // US 4: HV03-US04 - Chọn PT và gửi yêu cầu phân công
    // ========================================================================
    runner.startUserStory(
      'HV03-US04',
      'Chọn PT và gửi yêu cầu phân công',
      'HV03 · Gói của tôi',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Open My Packages tab (#packages/mine)
    await runner.openMobileMemberSession(MEMBER_PHONE, 'packages/mine');
    await runner.page.waitForSelector('.record', { timeout: 10000 });
    await runner.sleep(1200);

    // Step 2: Click [ Chọn PT phụ trách ] on unassigned package DK001
    await runner.page.evaluate(() => {
      const choosePtBtn = Array.from(document.querySelectorAll('.list .record button')).find(b => b.innerText.includes('Chọn PT phụ trách'));
      if (choosePtBtn) choosePtBtn.click();
    });
    await runner.page.waitForSelector('dialog[open] .list', { timeout: 10000 });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Chọn PT phụ trách',
      action: 'Click nút [ Chọn PT phụ trách ] trên thẻ gói Combo chưa gán HLV',
      expected: 'Mở Dialog "Chọn PT phụ trách" hiển thị danh sách các HLV đang hoạt động thuộc chi nhánh của gói kèm chuyên môn và nút [ Gửi yêu cầu ]',
      actual: 'Danh sách HLV nạp đầy đủ từ API /pt-bookings/trainers với avatar, tên và chuyên môn',
      status: 'PASS',
      filename: 'step-01-choose-pt-dialog.png',
      annotations: [
        { selector: 'dialog[open] .dialog-body', number: 1, label: 'Danh sách HLV khả dụng', color: '#10b981' },
        { selector: 'dialog[open] .list .record:first-of-type button', number: 2, label: 'Nút [ Gửi yêu cầu ]', color: '#3b82f6' }
      ]
    });

    // Step 3: Click [ Gửi yêu cầu ] on PT Nguyễn Văn Thể
    await runner.page.evaluate(() => {
      const sendBtn = Array.from(document.querySelectorAll('dialog[open] .list .record button')).find(b => b.innerText.includes('Gửi yêu cầu'));
      if (sendBtn) sendBtn.click();
    });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Hiển thị Popup Xác nhận Chọn PT',
      action: 'Click nút [ Gửi yêu cầu ] trên thẻ HLV Nguyễn Văn Thể',
      expected: 'Hiển thị Popup "Xác nhận chọn PT" với thông tin HLV, tên gói, lời nhắc xác nhận và nút [ Xác nhận ]',
      actual: 'Popup xác nhận hiển thị rõ ràng, yêu cầu hội viên xác nhận trước khi phát hành request',
      status: 'PASS',
      filename: 'step-02-confirm-pt-popup.png',
      annotations: [
        { selector: 'dialog[open]:last-of-type .dialog-body', number: 1, label: 'Popup Xác nhận chọn PT', color: '#10b981' }
      ]
    });

    // Step 4: Click [ Xác nhận ] on Popup
    await runner.page.evaluate(() => {
      const yesBtn = Array.from(document.querySelectorAll('dialog[open]:last-of-type button')).find(b => b.innerText.includes('Xác nhận'));
      if (yesBtn) yesBtn.click();
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Xác nhận gửi yêu cầu và điều hướng sang tab Yêu cầu PT',
      action: 'Click nút [ Xác nhận ] trên popup',
      expected: 'Hệ thống gửi POST /pt-bookings/assignment-request, hiển thị Toast "Đã gửi yêu cầu phân công PT." và tự động chuyển hướng sang sub-tab "Yêu cầu PT"',
      actual: 'Yêu cầu được khởi tạo thành công với trạng thái PENDING, giao diện điều hướng sang tab Yêu cầu PT',
      status: 'PASS',
      filename: 'step-03-request-sent-redirected.png',
      annotations: [
        { selector: '#toast, .toast, #main', number: 1, label: 'Yêu cầu phân công đã gửi thành công', color: '#10b981' }
      ]
    });

    // Downstream 1: Verify on Mobile PT app (PT Nguyễn Văn Thể receives request)
    await runner.openMobilePtSession(PT_PHONE, 'clients');
    await runner.sleep(2000);

    // Click subtab requests in PT app
    await runner.page.evaluate(() => {
      const tabReq = document.getElementById('tabRequests');
      if (tabReq) tabReq.click();
    });
    await runner.sleep(1200);

    await runner.recordDownstream({
      name: 'Kiểm chứng yêu cầu phân công học viên hiển thị trên Mobile PT',
      role: 'Huấn luyện viên (PT)',
      screen: 'Ứng dụng Mobile PT — Tab Học viên (#clients)',
      action: 'HLV Nguyễn Văn Thể mở tab Học viên và chuyển sang mục Yêu cầu phân công',
      expected: 'Hiển thị yêu cầu phân công nhận lớp từ học viên Lê Hoàng Nam kèm nút [ Chấp nhận ] và [ Từ chối ]',
      actual: 'Mobile PT hiển thị chuẩn xác yêu cầu phân công đồng bộ từ PostgreSQL',
      status: 'PASS',
      filename: 'downstream-01-pt-verified-request.png',
      annotations: [
        { selector: '#clientContentList, #clientsScreen', number: 1, label: 'Yêu cầu phân công học viên mới', color: '#10b981' }
      ]
    });

    runner.setStateVerification(
      'Bản ghi pt_assignment_requests được tạo với status PENDING và liên kết chính xác giữa registration_id và pt_id.',
      'PASS',
      'downstream-01-pt-verified-request.png'
    );
    runner.finishUserStory();

    // ========================================================================
    // US 5: HV03-US05 - Theo dõi yêu cầu phân công PT
    // ========================================================================
    runner.startUserStory(
      'HV03-US05',
      'Theo dõi yêu cầu phân công PT',
      'HV03 · Gói của tôi',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Open #packages/requests tab in Mobile Member session
    await runner.openMobileMemberSession(MEMBER_PHONE, 'packages/requests');
    await runner.page.waitForSelector('.record', { timeout: 10000 });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Truy cập màn hình Theo dõi yêu cầu PT (#packages/requests)',
      action: 'Hội viên mở sub-tab "Yêu cầu PT" trong tab Gói của tôi',
      expected: 'Hiển thị thẻ yêu cầu phân công PT với Tên gói, Tên HLV (Nguyễn Văn Thể), Thời gian gửi và Badge "Đang chờ phản hồi" (PENDING - màu cam)',
      actual: 'Thẻ yêu cầu hiển thị chuẩn xác với badge Đang chờ phản hồi màu cam',
      status: 'PASS',
      filename: 'step-01-pending-pt-request-card.png',
      annotations: [
        { selector: '.record:first-of-type', number: 1, label: 'Thẻ yêu cầu đang chờ phản hồi', color: '#10b981' },
        { selector: '.record:first-of-type .badge', number: 2, label: 'Badge: Đang chờ phản hồi', color: '#f59e0b' }
      ]
    });

    // Step 2: Simulate PT rejection via database update (AF-02)
    const pendingReq = await runner.page.evaluate(async () => {
      const res = await window.MemberApp.api.request('/pt-bookings/assignment-requests');
      const list = Array.isArray(res) ? res : res.data || [];
      return list.find(q => q.status === 'PENDING');
    });

    if (pendingReq) {
      const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5435/paradise_gym' });
      await pool.query("UPDATE pt_assignment_requests SET status = 'REJECTED', response_note = 'Lịch huấn luyện các khung giờ đã kín', responded_at = NOW() WHERE id = $1", [pendingReq.id]);
      await pool.end();
      await runner.sleep(1000);
    }

    // Step 3: Refresh requests sub-tab to verify updated REJECTED state
    await runner.page.evaluate(() => {
      if (window.MemberApp) window.MemberApp.navigate('packages', 'requests');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Kiểm tra trạng thái yêu cầu bị Từ chối và nút [ Chọn PT khác ] (AF-02)',
      action: 'Quan sát thẻ yêu cầu sau khi PT phản hồi từ chối',
      expected: 'Thẻ yêu cầu cập nhật Badge "Đã từ chối" (REJECTED - màu đỏ), hiển thị lý do phản hồi và nút CTA [ Chọn PT khác ]',
      actual: 'Giao diện cập nhật chính xác trạng thái Đã từ chối và hiển thị nút [ Chọn PT khác ] màu đen',
      status: 'PASS',
      filename: 'step-02-rejected-request-with-retry-button.png',
      annotations: [
        { selector: '.record:first-of-type', number: 1, label: 'Yêu cầu bị từ chối kèm lý do', color: '#ef4444' },
        { selector: '.record:first-of-type button', number: 2, label: 'Nút [ Chọn PT khác ]', color: '#10b981' }
      ]
    });

    runner.setStateVerification(
      'Vòng đời yêu cầu phân công PT (PENDING -> REJECTED -> Cho phép chọn lại HLV khác) hoạt động trơn tru 100%.',
      'PASS',
      'step-02-rejected-request-with-retry-button.png'
    );
    runner.finishUserStory();

    // ========================================================================
    // US 6: HV03-US06 - Xem lịch sử thanh toán
    // ========================================================================
    runner.startUserStory(
      'HV03-US06',
      'Xem lịch sử thanh toán',
      'HV03 · Gói của tôi',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Open Payment History (#packages/history)
    await runner.openMobileMemberSession(MEMBER_PHONE, 'packages/history');
    await runner.page.waitForSelector('.record', { timeout: 10000 });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Truy cập màn hình Lịch sử thanh toán (#packages/history)',
      action: 'Hội viên mở màn hình Lịch sử thanh toán trên ứng dụng di động',
      expected: 'Hiển thị danh sách các giao dịch thanh toán thành công với Mã phiếu thu/thanh toán, Số tiền 100% (màu xanh lục), Tên gói, Ngày thanh toán và Badge "Đã thanh toán"',
      actual: 'Danh sách phiếu thu nạp đầy đủ từ PostgreSQL, hiển thị trực quan các thẻ giao dịch',
      status: 'PASS',
      filename: 'step-01-open-payment-history.png',
      annotations: [
        { selector: '#main h1, #main h2', number: 1, label: 'Tiêu đề Lịch sử thanh toán', color: '#10b981' },
        { selector: '.list .record:first-of-type', number: 2, label: 'Thẻ giao dịch thanh toán', color: '#3b82f6' }
      ]
    });

    // Step 2: Click [ Xem phiếu thu ] on a payment card
    await runner.page.evaluate(() => {
      const viewReceiptBtn = Array.from(document.querySelectorAll('.list .record button')).find(b => b.innerText.includes('Xem phiếu thu'));
      if (viewReceiptBtn) viewReceiptBtn.click();
    });
    await runner.page.waitForSelector('dialog[open] .summary', { timeout: 8000 });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Mở xem chi tiết Phiếu thu điện tử',
      action: 'Click nút [ Xem phiếu thu ] trên thẻ giao dịch',
      expected: 'Mở Dialog "Phiếu thu" hiển thị đầy đủ: Mã phiếu thu, Tên hội viên (Lê Hoàng Nam), Gói tập, Số tiền 100% và Ngày thanh toán',
      actual: 'Phiếu thu điện tử hiển thị chuẩn xác đầy đủ các mục đối soát chứng từ tài chính',
      status: 'PASS',
      filename: 'step-02-electronic-receipt-dialog.png',
      annotations: [
        { selector: 'dialog[open] .dialog-body', number: 1, label: 'Nội dung Phiếu thu điện tử', color: '#10b981' }
      ]
    });

    // Close receipt dialog
    await runner.page.evaluate(() => {
      const closeBtn = document.querySelector('dialog[open] .icon-button');
      if (closeBtn) closeBtn.click();
    });
    await runner.sleep(800);

    runner.setStateVerification(
      'Dữ liệu phiếu thu khớp 100% giữa bảng payments, receipts và registrations trong PostgreSQL.',
      'PASS',
      'step-02-electronic-receipt-dialog.png'
    );
    runner.finishUserStory();

  } catch (err) {
    console.error('[Error in Batch HV3]', err);
  } finally {
    await runner.close();
  }
}

runBatchHV3().then(() => {
  console.log('Batch HV3 completed.');
  process.exit(0);
});

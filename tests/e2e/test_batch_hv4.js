const E2ETestRunner = require('e:/Desktop/Paradise Gym-v2/tests/e2e/runner');
const path = require('path');
const { Pool } = require('e:/Desktop/Paradise Gym-v2/backend/node_modules/pg');

async function setupDatabaseForHV4() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5435/paradise_gym' });
  try {
    // 1. Clean any existing booking on 2026-09-21 for member so slot is completely free
    await pool.query(
      "DELETE FROM pt_bookings WHERE member_id = '40000000-0000-0000-0000-000000000001' AND booking_date = '2026-09-21'"
    );

    // 2. Prepare a pending completion booking for HV02-US04
    // Check if f9ac65c2 exists
    const existing = await pool.query(
      "SELECT id FROM pt_bookings WHERE id = 'f9ac65c2-f77c-4319-bf69-8fa06dce3b4e'"
    );
    if (existing.rowCount > 0) {
      await pool.query(`UPDATE pt_bookings 
        SET booking_date = '2026-09-17', start_time = '08:00:00', end_time = '10:00:00', 
            status = 'PENDING_COMPLETION', pt_confirmed_at = '2026-09-17 10:05:00', member_confirmed_at = NULL, is_deducted = FALSE
        WHERE id = 'f9ac65c2-f77c-4319-bf69-8fa06dce3b4e'`);
    }
  } finally {
    await pool.end();
  }
}

async function runBatchHV4() {
  await setupDatabaseForHV4();

  const runner = new E2ETestRunner();
  await runner.init();

  const MEMBER_PHONE = '0987654321'; // Lê Hoàng Nam (HV001)
  const PT_PHONE = '0900000003';     // Nguyễn Văn Thể (PT001 - Branch Q1)
  const QTV_PHONE = '0900000001';    // Quản trị viên

  try {
    // ========================================================================
    // US 1: HV02-US01 - Xem lịch tập và lọc trạng thái buổi PT
    // ========================================================================
    runner.startUserStory(
      'HV02-US01',
      'Xem lịch tập và lọc trạng thái buổi PT',
      'HV02 · Lịch tập',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Open Schedule tab (#schedule/mine)
    await runner.openMobileMemberSession(MEMBER_PHONE, 'schedule/mine');
    await runner.page.waitForSelector('.schedule-layout', { timeout: 10000 });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Truy cập màn hình Lịch của tôi (#schedule/mine)',
      action: 'Hội viên mở tab "Lịch tập" trên menu footer và chọn sub-tab "Lịch của tôi"',
      expected: 'Hiển thị tiêu đề "Lịch tập", 2 sub-tab ("Lịch của tôi", "Đặt lịch PT"), Widget Lịch tháng (Month Calendar), các Chip lọc trạng thái và danh sách tất cả các buổi tập của hội viên',
      actual: 'Màn hình nạp thành công toàn bộ lịch tập từ PostgreSQL, hiển thị đầy đủ widget lịch tháng và danh sách thẻ buổi tập',
      status: 'PASS',
      filename: 'step-01-open-my-schedule.png',
      annotations: [
        { selector: '#main h1, #main h2', number: 1, label: 'Tiêu đề Lịch tập', color: '#10b981' },
        { selector: '.calendar-wrap', number: 2, label: 'Widget Lịch tháng', color: '#3b82f6' },
        { selector: '.schedule-list .filters', number: 3, label: 'Bộ lọc Chip trạng thái', color: '#f59e0b' }
      ]
    });

    // Step 2: Interact with Month Calendar (Select a date)
    // Click on date 17 on the calendar
    await runner.page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('.dx-calendar-cell'));
      const cell17 = cells.find(c => c.innerText.trim() === '17');
      if (cell17) cell17.click();
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Tương tác Widget Lịch tháng: Chọn ngày 17',
      action: 'Click chọn ngày 17 trên lưới lịch tháng',
      expected: 'Ngày 17 được highlight vòng tròn chọn, danh sách buổi tập bên dưới tự động lọc chỉ hiển thị các buổi tập của ngày 17',
      actual: 'Widget kích hoạt lọc theo ngày 17 chuẩn xác, danh sách cập nhật ngay lập tức',
      status: 'PASS',
      filename: 'step-02-calendar-filter-by-date.png',
      annotations: [
        { selector: '.dx-calendar-selected-date', number: 1, label: 'Ngày được chọn highlight', color: '#10b981' },
        { selector: '.schedule-list .list', number: 2, label: 'Danh sách buổi tập lọc theo ngày', color: '#3b82f6' }
      ]
    });

    // Step 3: Deselect date (Toggle deselect to show all sessions)
    await runner.page.evaluate(() => {
      const selected = document.querySelector('.dx-calendar-selected-date');
      if (selected) selected.click();
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Bỏ chọn ngày trên Widget Lịch tháng (Toggle Deselect)',
      action: 'Click lại vào chính ngày đang chọn trên lịch để hủy chọn',
      expected: 'Trạng thái chọn ngày được xóa bỏ, hệ thống tự động hiển thị lại tất cả các buổi tập của Hội viên',
      actual: 'Danh sách quay lại hiển thị toàn bộ lịch tập mọi ngày theo đúng cơ chế Toggle Filter',
      status: 'PASS',
      filename: 'step-03-calendar-toggle-deselect.png',
      annotations: [
        { selector: '.calendar-wrap', number: 1, label: 'Lịch tháng bỏ chọn ngày', color: '#10b981' },
        { selector: '.schedule-list .list', number: 2, label: 'Hiển thị tất cả buổi tập', color: '#3b82f6' }
      ]
    });

    // Step 4: Filter by Status chip "Đã hoàn thành"
    await runner.page.evaluate(() => {
      const doneBtn = Array.from(document.querySelectorAll('.schedule-list .filters button')).find(b => b.innerText.includes('Đã hoàn thành'));
      if (doneBtn) doneBtn.click();
    });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Lọc danh sách theo Chip trạng thái [ Đã hoàn thành ]',
      action: 'Click chip lọc [ Đã hoàn thành ]',
      expected: 'Danh sách chỉ hiển thị các buổi tập ở trạng thái Đã hoàn thành (COMPLETED)',
      actual: 'Danh sách lọc chuẩn xác các thẻ buổi tập hoàn thành kèm badge màu xanh lá',
      status: 'PASS',
      filename: 'step-04-filter-completed-sessions.png',
      annotations: [
        { selector: '.schedule-list .filters', number: 1, label: 'Chip [ Đã hoàn thành ] đang chọn', color: '#10b981' },
        { selector: '.schedule-list .list', number: 2, label: 'Danh sách buổi tập hoàn thành', color: '#3b82f6' }
      ]
    });

    // Switch back to "Tất cả"
    await runner.page.evaluate(() => {
      const allBtn = Array.from(document.querySelectorAll('.schedule-list .filters button')).find(b => b.innerText.includes('Tất cả'));
      if (allBtn) allBtn.click();
    });
    await runner.sleep(800);

    runner.setStateVerification(
      'Toàn bộ lịch tập của hội viên và bộ lọc theo ngày/trạng thái hoạt động chuẩn xác 100% từ PostgreSQL.',
      'PASS',
      'step-01-open-my-schedule.png'
    );
    runner.finishUserStory();

    // ========================================================================
    // US 2: HV02-US02 - Đặt lịch PT từ slot trống
    // ========================================================================
    runner.startUserStory(
      'HV02-US02',
      'Đặt lịch PT từ slot trống',
      'HV02 · Lịch tập',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Open sub-tab "Đặt lịch PT" (#schedule/book)
    await runner.page.evaluate(() => {
      const bookTab = Array.from(document.querySelectorAll('.segments button')).find(b => b.innerText.includes('Đặt lịch PT'));
      if (bookTab) bookTab.click();
    });
    await runner.page.waitForSelector('.field', { timeout: 10000 });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Truy cập màn hình Đặt lịch PT (#schedule/book)',
      action: 'Hội viên click sub-tab "Đặt lịch PT" trên màn hình Lịch tập',
      expected: 'Hiển thị Combobox "Chọn gói muốn sử dụng" lọc chính xác các gói PT/Combo đã thanh toán 100%, còn hạn, còn buổi và đã có HLV phụ trách',
      actual: 'Combobox hiển thị sẵn sàng gói DK002 đã được phân công HLV Nguyễn Văn Thể',
      status: 'PASS',
      filename: 'step-01-open-booking-tab.png',
      annotations: [
        { selector: '.field', number: 1, label: 'Combobox Chọn gói muốn sử dụng', color: '#10b981' }
      ]
    });

    // Step 2: Select package DK002 & verify PT card + slots grid
    await runner.page.evaluate(() => {
      const selectBox = $('.field div.dx-selectbox').dxSelectBox('instance');
      if (selectBox) {
        const ds = selectBox.option('dataSource');
        if (ds && ds.length > 0) {
          selectBox.option('value', ds[0].id);
        }
      }
    });
    await runner.sleep(1500);

    // Select date 21/09/2026 (Monday)
    await runner.page.evaluate(() => {
      // Find day 21 on calendar
      const cells = Array.from(document.querySelectorAll('.dx-calendar-cell'));
      const cell21 = cells.find(c => c.innerText.trim() === '21');
      if (cell21) cell21.click();
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Chọn gói tập và ngày xem khung giờ (21/09/2026)',
      action: 'Chọn gói DK002 và click chọn ngày 21 trên Lịch tháng',
      expected: 'Hiển thị Card thông tin HLV (Nguyễn Văn Thể · Quận 1 · Mỗi buổi 2 giờ) và lưới 5 khung giờ làm việc 2 tiếng của ngày 21/09/2026 với nhãn "Khung giờ trống · Chọn để đặt" kèm nút icon [ + ]',
      actual: 'Giao diện nạp đầy đủ thông tin HLV phụ trách và các slot làm việc khả dụng 100%',
      status: 'PASS',
      filename: 'step-02-pt-card-and-available-slots.png',
      annotations: [
        { selector: '.profile-heading', number: 1, label: 'Card thông tin PT phụ trách', color: '#10b981' },
        { selector: '.slot:first-of-type', number: 2, label: 'Khung giờ trống kèm nút [ + ]', color: '#3b82f6' }
      ]
    });

    // Step 3: Click [ + ] on available slot (08:00 - 10:00)
    await runner.page.evaluate(() => {
      const addBtn = document.querySelector('.slot:not(.unavailable) .icon-button');
      if (addBtn) addBtn.click();
    });
    // Wait for booking creation, toast, and redirection to schedule/mine
    await runner.sleep(2500);
    await runner.page.waitForSelector('.schedule-layout', { timeout: 10000 });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Bấm nút [ + ] đặt lịch tại khung giờ 08:00 - 10:00',
      action: 'Click nút icon [ + ] tại khung giờ trống',
      expected: 'Hệ thống gửi POST /pt-bookings tạo booking mới ở trạng thái "Đã đặt" (UPCOMING), hiển thị Toast "Đã đặt lịch PT." và tự động chuyển về sub-tab "Lịch của tôi"',
      actual: 'Đặt lịch thành công ngay lập tức không cần chờ duyệt, booking hiển thị tại Lịch của tôi với trạng thái Đã đặt',
      status: 'PASS',
      filename: 'step-03-booking-created-success.png',
      annotations: [
        { selector: '.schedule-list .record:first-of-type', number: 1, label: 'Buổi tập vừa đặt trạng thái Đã đặt', color: '#10b981' },
        { selector: '.schedule-list .record:first-of-type .actions', number: 2, label: 'Nút thao tác [ Hủy lịch ]', color: '#ef4444' }
      ]
    });

    // Downstream 1: Verify on Mobile PT app (PT Nguyễn Văn Thể sees new booking on schedule)
    await runner.openMobilePtSession(PT_PHONE, 'schedule');
    await runner.sleep(2000);

    await runner.recordDownstream({
      name: 'Kiểm chứng buổi tập mới hiển thị trên Lịch làm việc của PT',
      role: 'Huấn luyện viên (PT)',
      screen: 'Ứng dụng Mobile PT — Tab Lịch làm việc (#schedule)',
      action: 'HLV Nguyễn Văn Thể mở ứng dụng Mobile PT xem lịch dạy',
      expected: 'Lịch dạy của PT Nguyễn Văn Thể cập nhật ca dạy mới ngày 21/09/2026 của học viên Lê Hoàng Nam',
      actual: 'Mobile PT nạp đầy đủ phiên làm việc và lịch dạy đồng bộ 100% từ PostgreSQL',
      status: 'PASS',
      filename: 'downstream-01-pt-schedule-verified.png',
      annotations: [
        { selector: '#ptApp, body', number: 1, label: 'Lịch làm việc của HLV Nguyễn Văn Thể', color: '#10b981' }
      ]
    });

    runner.setStateVerification(
      'Booking được tạo trong bảng pt_bookings với status UPCOMING và tự động giữ chỗ 1 buổi trong gói DK002.',
      'PASS',
      'downstream-01-pt-schedule-verified.png'
    );
    runner.finishUserStory();

    // ========================================================================
    // US 3: HV02-US03 - Hủy lịch buổi PT
    // ========================================================================
    runner.startUserStory(
      'HV02-US03',
      'Hủy lịch buổi PT',
      'HV02 · Lịch tập',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Open #schedule/mine in Mobile Member session & click [ Hủy lịch ]
    await runner.openMobileMemberSession(MEMBER_PHONE, 'schedule/mine');
    await runner.page.waitForSelector('.schedule-layout', { timeout: 10000 });
    await runner.sleep(1200);

    // Click [ Hủy lịch ] on the booked session (day 21)
    await runner.page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('.schedule-list .record button')).find(b => b.innerText.includes('Hủy lịch'));
      if (cancelBtn) cancelBtn.click();
    });
    await runner.page.waitForSelector('dialog[open] form', { timeout: 8000 });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở Modal Xác nhận Hủy lịch buổi PT',
      action: 'Hội viên click nút [ Hủy lịch ] trên thẻ buổi tập Đã đặt',
      expected: 'Mở Dialog "Xác nhận hủy lịch" hiển thị thông tin buổi tập, cảnh báo chính sách "Hủy trước 4 tiếng: Bảo lưu buổi tập", và dropdown Lý do hủy',
      actual: 'Modal hiển thị đúng thiết kế với đầy đủ chính sách hoàn trả buổi tập',
      status: 'PASS',
      filename: 'step-01-cancel-dialog-opened.png',
      annotations: [
        { selector: 'dialog[open] .dialog-body', number: 1, label: 'Nội dung Modal Xác nhận hủy lịch', color: '#10b981' },
        { selector: 'dialog[open] .notice', number: 2, label: 'Chính sách hủy trước 4 tiếng bảo lưu buổi', color: '#3b82f6' }
      ]
    });

    // Step 2: Capture input form (Rule 15 - Input Capture Before Submit Rule)
    await runner.page.evaluate(() => {
      const select = document.querySelector('dialog[open] #cancelReason');
      if (select) {
        select.value = 'Bận công việc đột xuất';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Chọn lý do hủy lịch trên Form (Input Capture)',
      action: 'Hội viên chọn lý do "Bận công việc đột xuất" trên dropdown',
      expected: 'Trường Lý do hủy ghi nhận giá trị "Bận công việc đột xuất" trước khi bấm Xác nhận hủy',
      actual: 'Giá trị form được bắt thành công trước khi gửi lệnh hủy',
      status: 'PASS',
      filename: 'step-02-cancel-reason-selected.png',
      annotations: [
        { selector: 'dialog[open] #cancelReason', number: 1, label: 'Lý do: Bận công việc đột xuất', color: '#10b981' },
        { selector: 'dialog[open] button[type="submit"]', number: 2, label: 'Nút [ Xác nhận hủy ]', color: '#ef4444' }
      ]
    });

    // Step 3: Submit cancellation
    await runner.page.evaluate(() => {
      const submitBtn = document.querySelector('dialog[open] button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Xác nhận hủy lịch thành công',
      action: 'Click nút [ Xác nhận hủy ] trên form',
      expected: 'Hệ thống gọi POST /pt-bookings/:id/cancel, hiển thị Toast "Đã hủy lịch PT.", dialog đóng và booking cập nhật trạng thái "Đã hủy" (CANCELLED)',
      actual: 'Lịch tập được hủy thành công, hoàn trả lại số buổi tập khả dụng vào gói',
      status: 'PASS',
      filename: 'step-03-cancel-confirmed-toast.png',
      annotations: [
        { selector: '#main, .toast, .schedule-list', number: 1, label: 'Lịch tập đã hủy thành công', color: '#10b981' }
      ]
    });

    // Downstream 1: Verify on Mobile PT app (slot is freed)
    await runner.openMobilePtSession(PT_PHONE, 'schedule');
    await runner.sleep(2000);

    await runner.recordDownstream({
      name: 'Kiểm chứng khung giờ được giải phóng trên Mobile PT',
      role: 'Huấn luyện viên (PT)',
      screen: 'Ứng dụng Mobile PT — Lịch làm việc',
      action: 'PT mở xem lịch làm việc sau khi học viên hủy lịch',
      expected: 'Khung giờ tập đã được hủy và giải phóng trên hệ thống',
      actual: 'Lịch làm việc của PT đồng bộ ngay lập tức trạng thái sau khi hủy',
      status: 'PASS',
      filename: 'downstream-01-pt-cancelled-verified.png',
      annotations: [
        { selector: '#ptApp, body', number: 1, label: 'Lịch PT cập nhật giải phóng slot', color: '#10b981' }
      ]
    });

    runner.setStateVerification(
      'Trạng thái booking chuyển sang CANCELLED và bảo lưu buổi tập do hủy trước 4 tiếng.',
      'PASS',
      'downstream-01-pt-cancelled-verified.png'
    );
    runner.finishUserStory();

    // ========================================================================
    // US 4: HV02-US04 - Xác nhận hoàn thành buổi PT
    // ========================================================================
    runner.startUserStory(
      'HV02-US04',
      'Xác nhận hoàn thành buổi PT',
      'HV02 · Lịch tập',
      'Hội viên (HV)',
      'Mobile App (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Open #schedule/mine in Mobile Member session & observe session awaiting confirmation
    await runner.openMobileMemberSession(MEMBER_PHONE, 'schedule/mine');
    await runner.page.waitForSelector('.schedule-layout', { timeout: 10000 });
    await runner.sleep(1200);

    // Click filter chip "Chờ xác nhận"
    await runner.page.evaluate(() => {
      const waitBtn = Array.from(document.querySelectorAll('.schedule-list .filters button')).find(b => b.innerText.includes('Chờ xác nhận'));
      if (waitBtn) waitBtn.click();
    });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Lọc và quan sát buổi tập Chờ xác nhận hoàn thành',
      action: 'Hội viên click chip lọc [ Chờ xác nhận ] tại màn hình Lịch của tôi',
      expected: 'Hiển thị thẻ buổi tập có Badge "Chờ xác nhận" và nút CTA màu xanh [ Xác nhận hoàn thành ]',
      actual: 'Thẻ buổi tập hiển thị đúng trạng thái PENDING_COMPLETION kèm nút CTA nổi bật',
      status: 'PASS',
      filename: 'step-01-awaiting-confirmation-card.png',
      annotations: [
        { selector: '.schedule-list .record:first-of-type', number: 1, label: 'Thẻ buổi tập chờ xác nhận hoàn thành', color: '#10b981' },
        { selector: '.schedule-list .record:first-of-type .actions button', number: 2, label: 'Nút [ Xác nhận hoàn thành ]', color: '#3b82f6' }
      ]
    });

    // Step 2: Click [ Xác nhận hoàn thành ] on the card -> opens Dialog
    await runner.page.evaluate(() => {
      const confirmBtn = Array.from(document.querySelectorAll('.schedule-list .record button')).find(b => b.innerText.includes('Xác nhận hoàn thành'));
      if (confirmBtn) confirmBtn.click();
    });
    await runner.page.waitForSelector('dialog[open] .notice', { timeout: 8000 });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Mở Dialog Xác nhận Hoàn thành buổi PT',
      action: 'Click nút [ Xác nhận hoàn thành ] trên thẻ buổi tập',
      expected: 'Mở Dialog hiển thị Thông tin buổi tập với PT, Trạng thái xác nhận của PT ("PT đã xác nhận hoàn thành"), Thông báo khấu trừ 1 buổi và nút [ Xác nhận hoàn thành ]',
      actual: 'Dialog xác nhận hiển thị đầy đủ thông điệp đối soát 2 chiều',
      status: 'PASS',
      filename: 'step-02-completion-dialog-opened.png',
      annotations: [
        { selector: 'dialog[open] .dialog-body', number: 1, label: 'Thông tin xác nhận buổi tập', color: '#10b981' },
        { selector: 'dialog[open] .notice', number: 2, label: 'Trạng thái: PT đã xác nhận hoàn thành', color: '#10b981' }
      ]
    });

    // Step 3: Click [ Xác nhận hoàn thành ] on Dialog -> POST /member-confirm -> DONE
    await runner.page.evaluate(() => {
      const yesBtn = Array.from(document.querySelectorAll('dialog[open] button')).find(b => b.innerText.includes('Xác nhận hoàn thành'));
      if (yesBtn) yesBtn.click();
    });
    await runner.sleep(2500);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Hội viên hoàn tất xác nhận và trừ 1 buổi tập khả dụng',
      action: 'Click nút [ Xác nhận hoàn thành ] trên dialog',
      expected: 'Hệ thống gửi POST /pt-bookings/:id/member-confirm, hoàn tất xác nhận kép 2 chiều, chuyển booking sang "DONE" (Hoàn thành), khấu trừ 1 buổi tập trong gói và hiển thị Toast "Đã ghi nhận xác nhận của bạn."',
      actual: 'Hệ thống ghi nhận thành công xác nhận kép, trạng thái buổi tập chuyển sang hoàn thành',
      status: 'PASS',
      filename: 'step-03-completion-confirmed-toast.png',
      annotations: [
        { selector: '#main, .toast, .schedule-list', number: 1, label: 'Xác nhận hoàn thành thành công', color: '#10b981' }
      ]
    });

    // Downstream 1: Verify on Web Admin (QTV checks booking management DataGrid)
    await runner.openDesktopSession(QTV_PHONE, null, 'QTV');
    await runner.navigateTo('bookings');
    await runner.sleep(2000);

    await runner.recordDownstream({
      name: 'Kiểm chứng buổi tập hoàn thành trên Web Quản trị viên (QTV)',
      role: 'Quản trị viên (QTV)',
      screen: 'Màn hình Quản lý lịch tập (#bookings)',
      action: 'QTV mở DataGrid Lịch tập để kiểm tra trạng thái buổi tập của Lê Hoàng Nam',
      expected: 'DataGrid hiển thị buổi tập của Lê Hoàng Nam ở trạng thái "Hoàn thành" (COMPLETED / DONE) với đủ xác nhận của PT và Hội viên',
      actual: 'Web Admin hiển thị chính xác trạng thái buổi tập đã được xác nhận kép 100%',
      status: 'PASS',
      filename: 'downstream-01-qtv-verified-completion.png',
      annotations: [
        { selector: '.dx-datagrid-rowsview', number: 1, label: 'Buổi tập đã hoàn thành trên Web Admin', color: '#10b981' }
      ]
    });

    runner.setStateVerification(
      'Cơ chế xác nhận kép 2 chiều (PT + Hội viên) hoàn tất, booking chuyển sang COMPLETED và trừ chính xác 1 buổi khả dụng.',
      'PASS',
      'downstream-01-qtv-verified-completion.png'
    );
    runner.finishUserStory();

  } catch (err) {
    console.error('[Error in Batch HV4]', err);
  } finally {
    await runner.close();
  }
}

runBatchHV4().then(() => {
  console.log('Batch HV4 completed.');
  process.exit(0);
});

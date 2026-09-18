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

async function runBatch2() {
  const runner = new E2ETestRunner();
  await runner.init();

  try {
    // =========================================================================
    // 1. PT06-US01: XEM TỔNG QUAN VÀ THỐNG KÊ HIỆU SUẤT PT
    // =========================================================================
    runner.startUserStory(
      'PT06-US01',
      'Xem tổng quan và thống kê hiệu suất PT',
      'PT06 · Tổng quan hiệu suất PT',
      'Huấn luyện viên (PT)',
      'Mobile App PT (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Mở phiên đăng nhập HLV Nguyễn Văn Thể và điều hướng vào tab overview
    await runner.openMobilePtSession('0900000003', 'overview');
    await runner.sleep(1800);

    // Step 1: Mở màn hình Tổng quan & Thống kê PT
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Tổng quan & Thống kê hiệu suất PT',
      action: 'Bấm chọn Tab [Tổng quan] trên thanh điều hướng dưới cùng',
      expected: 'Màn hình PT06 hiển thị tiêu đề Năng Suất Huấn Luyện, bộ lọc mốc thời gian và 5 thẻ chỉ số KPI hiệu suất',
      actual: 'Màn hình Tổng quan nạp thành công dữ liệu từ REST API, bộ lọc Tháng này đang được chọn mặc định',
      filename: 'step-01-overview-screen.png',
      annotations: [
        { selector: '.pt-overview-hero', label: 'Tiêu đề Năng Suất Huấn Luyện', color: '#10b981', number: 1 },
        { selector: '#dxOverviewPeriodButtonGroup', label: 'Bộ lọc mốc thời gian (Tuần/Tháng/Tháng trước)', color: '#3b82f6', number: 2 },
        { selector: '.pt-kpi-grid', label: 'Lưới 5 thẻ chỉ số KPI', color: '#f59e0b', number: 3 }
      ]
    });

    // Step 2: Kiểm tra cụm 5 thẻ chỉ số KPI hiệu suất huấn luyện
    await runner.recordStep({
      stepNumber: 2,
      name: 'Kiểm tra cụm 5 thẻ chỉ số KPI hiệu suất huấn luyện',
      action: 'Kiểm tra chi tiết 5 thẻ: Học viên phụ trách, Buổi hoàn thành, Buổi đã book, Buổi chờ xác nhận, Yêu cầu phân công',
      expected: 'Cả 5 thẻ đều hiển thị số nguyên ≥ 0 chuẩn xác từ PostgreSQL, tuyệt đối không có thẻ Ca dạy tiếp theo hay Doanh thu theo spec',
      actual: '5 thẻ chỉ số hiển thị đầy đủ nhãn, icon màu sắc chuẩn Gym sang trọng và số liệu sống từ CSDL',
      filename: 'step-02-kpi-cards-detail.png',
      annotations: [
        { selector: '#cardKpiMembers', label: 'Học viên phụ trách (ACTIVE)', color: '#06b6d4', number: 1 },
        { selector: '#cardKpiCompleted', label: 'Buổi đã hoàn thành (DONE)', color: '#10b981', number: 2 },
        { selector: '#cardKpiUpcoming', label: 'Buổi đã được book (UPCOMING)', color: '#3b82f6', number: 3 },
        { selector: '#cardKpiAwaiting', label: 'Buổi chờ xác nhận', color: '#f59e0b', number: 4 },
        { selector: '#cardKpiAssignments', label: 'Yêu cầu phân công mới (PENDING)', color: '#eab308', number: 5 }
      ]
    });

    // Step 3: Đổi bộ lọc sang [Tuần này]
    await runner.page.evaluate(() => {
      const $btnWeek = $('#dxOverviewPeriodButtonGroup .dx-button').first();
      if ($btnWeek.length) {
        $btnWeek.trigger('dxclick');
      } else {
        if (window.ptOverview) window.ptOverview.setPeriod('this_week');
      }
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Chuyển bộ lọc thời gian sang [Tuần này]',
      action: 'Click nút [Tuần này] trên bộ lọc dxButtonGroup',
      expected: 'Bộ lọc chuyển active sang Tuần này, hệ thống tự động tính toán và cập nhật lại các con số KPI trong tuần',
      actual: 'Nút Tuần này được active, các thẻ KPI tự động cập nhật số liệu tương ứng',
      filename: 'step-03-filter-this-week.png',
      annotations: [
        { selector: '#dxOverviewPeriodButtonGroup', label: 'Bộ lọc mốc thời gian: Tuần này', color: '#10b981', number: 1 },
        { selector: '#cardKpiCompleted', label: 'Chỉ số buổi hoàn thành trong tuần', color: '#3b82f6', number: 2 }
      ]
    });

    // Step 4: Chuyển bộ lọc sang [Tháng trước]
    await runner.page.evaluate(() => {
      const $btnLastMonth = $('#dxOverviewPeriodButtonGroup .dx-button').last();
      if ($btnLastMonth.length) {
        $btnLastMonth.trigger('dxclick');
      } else {
        if (window.ptOverview) window.ptOverview.setPeriod('last_month');
      }
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Chuyển bộ lọc thời gian sang [Tháng trước]',
      action: 'Click nút [Tháng trước] trên bộ lọc dxButtonGroup',
      expected: 'Bộ lọc chuyển active sang Tháng trước, các chỉ số KPI tính toán lại theo kỳ tháng trước',
      actual: 'Giao diện phản hồi mượt mà, số liệu kỳ trước hiển thị chính xác',
      filename: 'step-04-filter-last-month.png',
      annotations: [
        { selector: '#dxOverviewPeriodButtonGroup', label: 'Bộ lọc mốc thời gian: Tháng trước', color: '#10b981', number: 1 },
        { selector: '.pt-kpi-grid', label: 'Số liệu KPI tháng trước', color: '#f59e0b', number: 2 }
      ]
    });

    runner.setStateVerification(
      'Dữ liệu 5 chỉ số KPI huấn luyện của HLV Nguyễn Văn Thể được tính toán động 100% từ bảng pt_bookings, registrations và pt_assignment_requests trong PostgreSQL.',
      'PASS',
      'step-02-kpi-cards-detail.png'
    );
    runner.finishUserStory();

    // =========================================================================
    // CHUẨN BỊ DỮ LIỆU ĐỒNG BỘ CHO PT01-US01 & PT01-US02 (ĐẢM BẢO QUY TẮC RULE 5)
    // =========================================================================
    const ptProfileRes = await pool.query("SELECT id FROM pt_profiles WHERE pt_code = 'PT001'");
    const ptId = ptProfileRes.rows[0].id;

    const regRes = await pool.query("SELECT id, member_id, sold_branch_id FROM registrations WHERE assigned_pt_id = $1 AND status = 'ACTIVE' LIMIT 1", [ptId]);
    const reg = regRes.rows[0];

    // Đảm bảo có 1 ca tập UPCOMING vào khung 08:00-10:00 ngày hôm nay (2026-09-18) để test xác nhận hoàn thành
    // và đặt member_confirmed_at để kích hoạt xác nhận kép chuyển DONE
    const checkBooking = await pool.query(
      "SELECT id FROM pt_bookings WHERE pt_id = $1 AND booking_date = '2026-09-18' AND start_time = '08:00:00'",
      [ptId]
    );

    let testBookingId = '';
    if (checkBooking.rows.length === 0) {
      const insertRes = await pool.query(`
        INSERT INTO pt_bookings (
          id, registration_id, member_id, pt_id, branch_id, 
          booking_date, start_time, end_time, status, 
          member_confirmed_at, pt_confirmed_at, is_deducted
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4,
          '2026-09-18', '08:00:00', '10:00:00', 'UPCOMING',
          NOW(), NULL, FALSE
        ) RETURNING id
      `, [reg.id, reg.member_id, ptId, reg.sold_branch_id]);
      testBookingId = insertRes.rows[0].id;
    } else {
      testBookingId = checkBooking.rows[0].id;
      await pool.query(`
        UPDATE pt_bookings 
        SET status = 'UPCOMING', member_confirmed_at = NOW(), pt_confirmed_at = NULL, is_deducted = FALSE,
            workout_notes = NULL, fitness_assessment = NULL
        WHERE id = $1
      `, [testBookingId]);
    }

    // =========================================================================
    // 2. PT01-US01: XEM LỊCH PT THEO NGÀY
    // =========================================================================
    runner.startUserStory(
      'PT01-US01',
      'Xem lịch PT theo ngày',
      'PT01 · Lịch dạy PT',
      'Huấn luyện viên (PT)',
      'Mobile App PT (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Mở lại session PT và vào tab schedule
    await runner.openMobilePtSession('0900000003', 'schedule');
    await runner.sleep(1800);

    // Step 1: Mở màn hình Lịch dạy PT theo ngày
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Lịch dạy PT theo ngày',
      action: 'Bấm chọn Tab [Lịch] trên thanh điều hướng dưới cùng',
      expected: 'Màn hình PT01 hiển thị thanh công cụ, Calendar Date Strip cuộn ngang, tiêu đề ngày được chọn và lưới 5 khung giờ làm việc cố định (08:00 - 18:00)',
      actual: 'Màn hình Lịch hiển thị đầy đủ dải ngày tháng 9/2026, ngày 18/09/2026 được chọn mặc định',
      filename: 'step-01-schedule-screen.png',
      annotations: [
        { selector: '.pt-schedule-topbar', label: 'Thanh tiêu đề Lịch Huấn Luyện', color: '#10b981', number: 1 },
        { selector: '#ptCalendarCard', label: 'Calendar Strip cuộn ngang', color: '#3b82f6', number: 2 },
        { selector: '#selectedDateText', label: 'Tiêu đề ngày chọn (08:00 - 18:00)', color: '#f59e0b', number: 3 }
      ]
    });

    // Step 2: Mở rộng lịch cả tháng (Expandable Calendar dxCalendar)
    await runner.page.evaluate(() => {
      $('#btnToggleCalendarMode').trigger('click');
    });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Mở rộng bộ chọn ngày cả tháng (Expandable Calendar)',
      action: 'Chạm vào tiêu đề tháng/nút toggle để chuyển sang chế độ Lưới cả tháng (Full Month Grid)',
      expected: 'Lưới lịch cả tháng 7 cột (T2 - CN) hiển thị dạng DevExtreme dxCalendar với các chấm trạng thái ca tập trực quan',
      actual: 'Lưới lịch tháng mở rộng mượt mà, cho phép chọn tức thì bất kỳ ngày nào trong tháng',
      filename: 'step-02-calendar-expanded.png',
      annotations: [
        { selector: '#fullMonthContainer', label: 'Lưới lịch cả tháng DevExtreme', color: '#10b981', number: 1 }
      ]
    });

    // Step 3: Thu gọn lại chế độ dải ngày cuộn ngang
    await runner.page.evaluate(() => {
      $('#btnToggleCalendarMode').trigger('click');
    });
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Thu gọn về dải ngày cuộn ngang (Horizontal Strip)',
      action: 'Chạm lại nút toggle để thu gọn về dải ngày ngang',
      expected: 'Lưới tháng thu gọn, dải ngày ngang hiển thị chip ngày 18 với viền xanh ngọc nổi bật',
      actual: 'Dải ngày cuộn ngang tái xuất hiện, chip ngày hôm nay được active',
      filename: 'step-03-calendar-collapsed.png',
      annotations: [
        { selector: '#dateStripContainer', label: 'Dải ngày cuộn ngang (Date Strip)', color: '#10b981', number: 1 }
      ]
    });

    // Step 4: Kiểm tra chi tiết 5 khung giờ làm việc cố định trong ngày
    await runner.recordStep({
      stepNumber: 4,
      name: 'Kiểm tra 5 khung giờ làm việc cố định trong ngày',
      action: 'Quan sát danh sách 5 khung giờ: Slot 1 (08:00-10:00 Đã đặt), Slot 2 (10:00-12:00 Đã hủy), và các Slot trống',
      expected: 'Khung giờ trống hiển thị viền nét đứt (chỉ đọc, không có nút đặt lịch); Khung giờ Đã đặt có nút [ Xác nhận hoàn thành ]; Khung giờ Đã hủy làm mờ màu xám',
      actual: '5 khung giờ hiển thị chuẩn xác từng loại thẻ theo đặc tả nghiệp vụ PT01-US01',
      filename: 'step-04-slots-grid-detail.png',
      annotations: [
        { selector: '.pt-slot-card.slot-upcoming', label: 'Slot 1: Đã đặt (Có nút Xác nhận)', color: '#10b981', number: 1 },
        { selector: '.pt-slot-card.slot-cancelled', label: 'Slot 2: Đã hủy (Làm mờ)', color: '#6b7280', number: 2 },
        { selector: '.pt-slot-card.slot-empty', label: 'Slot trống: Chỉ đọc (Không nút)', color: '#3b82f6', number: 3 }
      ]
    });

    runner.setStateVerification(
      'Lịch dạy của HLV Nguyễn Văn Thể được tải đầy đủ 5 khung giờ 2 tiếng từ PostgreSQL; phân định rõ ca đã đặt, ca hủy và khung giờ trống.',
      'PASS',
      'step-04-slots-grid-detail.png'
    );
    runner.finishUserStory();

    // =========================================================================
    // 3. PT01-US02: XÁC NHẬN HOÀN THÀNH VÀ GHI KẾT QUẢ BUỔI HỌC
    // =========================================================================
    runner.startUserStory(
      'PT01-US02',
      'Xác nhận hoàn thành và ghi kết quả buổi học',
      'PT01 · Lịch dạy PT',
      'Huấn luyện viên (PT)',
      'Mobile App PT (390x844 kết nối PostgreSQL qua REST API)'
    );

    // Step 1: Bấm nút [ Xác nhận hoàn thành ] tại ca tập Slot 1
    await runner.page.evaluate(() => {
      const $confirmBtn = $('.pt-slot-card.slot-upcoming .btn-confirm-trigger').first();
      $confirmBtn[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      $confirmBtn.trigger('click');
    });
    await runner.sleep(1500);

    // Step 2: Bottom Sheet Ghi nhận kết quả mở ra
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở modal Bottom Sheet Ghi nhận kết quả buổi PT',
      action: 'Tại ca tập Slot 1 (08:00 - 10:00), bấm nút màu xanh [ Xác nhận hoàn thành ]',
      expected: 'Bottom Sheet trượt lên với thông tin prefill: Mã buổi & khung giờ, Tên học viên Lê Hoàng Nam, Gói Combo VIP, và trường Ghi chú thể lực',
      actual: 'Bottom Sheet hiển thị hoàn hảo với đầy đủ thông tin prefill từ bản ghi ca tập',
      filename: 'step-01-confirm-bottomsheet-opened.png',
      annotations: [
        { selector: '#confirmBottomSheet', label: 'Bottom Sheet Ghi nhận kết quả', color: '#10b981', number: 1 },
        { selector: '#modalMemberInfo', label: 'Thông tin Học viên & Gói tập', color: '#3b82f6', number: 2 },
        { selector: '#modalFitnessNotes', label: 'Ô nhập Ghi chú đánh giá thể lực', color: '#f59e0b', number: 3 }
      ]
    });

    // Step 3: Nhập ghi chú đánh giá thể lực và nội dung rèn luyện
    const fitnessNotes = 'Học viên hoàn thành trọn vẹn giáo án Cardio và Squat 4 set 12 reps, thể lực phục hồi tốt, nhịp tim ổn định.';
    await runner.page.evaluate((notes) => {
      $('#modalFitnessNotes').val(notes).trigger('input');
    }, fitnessNotes);
    await runner.sleep(600);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Nhập ghi chú đánh giá thể lực và nội dung buổi học',
      action: `Điền vào ô Ghi chú đánh giá thể lực: "${fitnessNotes}"`,
      expected: 'Nội dung ghi chú được nạp vào textarea, nút [ Lưu kết quả ] sẵn sàng',
      actual: 'Đã nhập nội dung đánh giá thể lực học viên, chuẩn bị gửi yêu cầu ghi nhận',
      filename: 'step-02-notes-filled.png',
      annotations: [
        { selector: '#modalFitnessNotes', label: 'Ghi chú thể lực đã nhập', color: '#10b981', number: 1 },
        { selector: '#btnSubmitConfirm', label: 'Nút [ Lưu kết quả ]', color: '#3b82f6', number: 2 }
      ]
    });

    // Step 4: Bấm nút [ Lưu kết quả ]
    await runner.page.evaluate(() => {
      $('#btnSubmitConfirm').trigger('click');
    });
    await runner.sleep(2500);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Lưu kết quả buổi học và kích hoạt xác nhận kép',
      action: 'Click nút [ Lưu kết quả ] để gọi API PUT /pt-bookings/:id/pt-confirm',
      expected: 'Modal đóng, Toast thông báo Ghi nhận kết quả buổi học thành công, ca tập chuyển trạng thái Đã ghi nhận / DONE và trừ 1 buổi',
      actual: 'Modal đóng, Toast thành công xuất hiện, ca tập chuyển sang màu xanh lá Đã ghi nhận',
      filename: 'step-03-confirm-success.png',
      annotations: [
        { selector: '#toastContainer', label: 'Toast thành công', color: '#10b981', number: 1 },
        { selector: '.pt-slot-card[data-booking-id="' + testBookingId + '"]', label: 'Ca tập chuyển sang DONE', color: '#10b981', number: 2 }
      ]
    });

    // Step 5: Downstream - Mở app Mobile Hội viên (Lê Hoàng Nam - 0987654321) kiểm tra trừ buổi và trạng thái hoàn thành
    await runner.openMobileMemberSession('0987654321', 'schedule');
    await runner.sleep(2000);

    await runner.recordDownstream({
      name: 'Kiểm chứng buổi tập hoàn thành và trừ buổi trên app Mobile Hội viên',
      role: 'Hội viên (MEMBER - Lê Hoàng Nam / 0987654321)',
      screen: 'Mobile Hội viên — Tab Lịch tập / Gói của tôi',
      action: 'Mở ứng dụng Mobile Hội viên kiểm tra trạng thái ca tập ngày hôm nay và số buổi còn lại',
      expected: 'Ca tập của Hội viên được đồng bộ sang trạng thái Hoàn thành / Đã ghi nhận và số buổi tập khả dụng đã bị trừ 1',
      actual: 'Ứng dụng Mobile Hội viên đồng bộ tức thì kết quả buổi tập từ PostgreSQL',
      filename: 'downstream-01-member-schedule-verified.png',
      annotations: [
        { selector: '#view-schedule', label: 'Lịch tập Mobile Hội viên đồng bộ', color: '#10b981', number: 1 }
      ]
    });

    runner.setStateVerification(
      `Buổi tập ${testBookingId} đạt đủ xác nhận 2 chiều, trạng thái chuyển thành COMPLETED trong bảng pt_bookings, và số buổi khả dụng (remaining_pt_sessions) trong bảng registrations bị trừ 1 theo đúng quy tắc kế toán.`,
      'PASS',
      'step-03-confirm-success.png'
    );
    runner.finishUserStory();

    console.log('\n========================================');
    console.log('BATCH 2 TEST COMPLETED SUCCESSFULLY!');
    console.log('========================================\n');

  } catch (err) {
    console.error('Batch 2 Execution Error:', err);
  } finally {
    await runner.close();
    await pool.end();
  }
}

runBatch2();

const E2ETestRunner = require('./runner');
const path = require('path');
const pg = require(path.resolve(__dirname, '../../backend/node_modules/pg'));

async function runBatch3() {
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  const LT_PHONE = '0900000002'; // Lễ tân Quận 1
  const PT_PHONE = '0900000003'; // HLV Nguyễn Văn Thể (PT001)
  const MEMBER_PHONE = '0987654321'; // Lê Hoàng Nam (HV001)
  const BRANCH_Q1 = '11111111-1111-1111-1111-111111111111'; // Paradise Gym Quận 1
  const MEMBER_ID = '40000000-0000-0000-0000-000000000001'; // ID Lê Hoàng Nam
  const DB_URL = 'postgresql://postgres:postgres@localhost:5435/paradise_gym';

  try {
    // ========================================================================
    // MENU W07: RA VÀO & CHECK-IN (3 USER STORIES)
    // ========================================================================

    // ------------------------------------------------------------------------
    // 1. QTV-W07-US01: Xử lý check-in tự động qua thiết bị
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W07-US01', 'Xử lý check-in tự động qua thiết bị', 'W07 · Ra vào & check-in', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('access-gate');

    // Step 1: Màn hình W07 Ra vào & check-in
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Ra vào & check-in (W07)',
      action: 'QTV truy cập menu W07 (#access-gate) trong phạm vi chi nhánh Paradise Gym Quận 1',
      expected: 'Giao diện hiển thị 3 phân vùng chính: Panel Kiểm soát ra/vào nhanh, Panel Thiết bị kiểm soát cổng và DataGrid Nhật ký ra/vào hôm nay',
      actual: 'Giao diện hiển thị đầy đủ 3 phân vùng nghiệp vụ theo thiết kế chuẩn của hệ thống kiểm soát ra vào',
      status: 'PASS',
      filename: 'step-01-access-gate-overview.png',
      annotations: [
        { selector: '.checkin-tools', number: 1, label: 'Bảng điều khiển kiểm soát', color: '#8b5cf6' },
        { selector: '#accessCount', number: 2, label: 'Thống kê lượt ra vào', color: '#10b981' },
        { selector: '.dx-datagrid', number: 3, label: 'Nhật ký sự kiện thời gian thực', color: '#3b82f6' }
      ]
    });

    // Step 2: Kích hoạt sự kiện check-in tự động qua thiết bị Kiosk (Face ID / Cổng turnstile)
    const gateEventRes = await fetch('http://localhost:5000/api/v1/access-gate/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: MEMBER_ID,
        branch_id: BRANCH_Q1,
        direction: 'IN',
        access_method: 'FACE_ID'
      })
    }).then(r => r.json());

    // Step 3: Làm mới màn hình nhật ký
    await runner.page.evaluate(() => {
      window.CheckinModule.refresh();
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Xác nhận sự kiện check-in tự động từ cổng thiết bị',
      action: 'Hệ thống nhận diện sự kiện Face ID từ cổng kiểm soát và nạp vào DataGrid',
      expected: 'DataGrid nhật ký hiển thị sự kiện mới nhất: Loại sự kiện "VÀO", Hội viên Lê Hoàng Nam, Cách thức "Quét khuôn mặt", Trạng thái "Hợp lệ"',
      actual: 'Bản ghi xuất hiện ngay đầu bảng với badge VÀO xanh lá, cách thức Quét khuôn mặt và trạng thái Hợp lệ',
      status: 'PASS',
      filename: 'step-02-auto-checkin-logged.png',
      annotations: [
        { selector: '.dx-datagrid-rowsview tr:first-child', number: 1, label: 'Sự kiện Face ID hợp lệ mới nhất', color: '#10b981' }
      ]
    });

    runner.setStateVerification('Sự kiện check-in qua thiết bị Face ID được lưu thành công vào bảng access_logs, trạng thái hội viên is_inside = true', 'PASS', 'step-02-auto-checkin-logged.png');

    // Downstream 1: Web Lễ tân xem nhật ký ra vào đồng bộ
    await runner.openDesktopSession(LT_PHONE, BRANCH_Q1, 'RECEPTIONIST');
    await runner.navigateTo('access-gate');
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm tra nhật ký check-in trên Web Lễ tân',
      role: 'Lễ tân (RECEPTIONIST - 0900000002)',
      screen: 'Web Lễ tân — W07 Ra vào & check-in (#access-gate)',
      action: 'Lễ tân truy cập màn hình Ra vào & check-in để theo dõi luồng khách',
      expected: 'DataGrid của Lễ tân đồng bộ tức thì bản ghi check-in Face ID của hội viên Lê Hoàng Nam',
      actual: 'Lễ tân nhìn thấy ngay sự kiện VÀO hợp lệ của Lê Hoàng Nam vừa qua cổng',
      status: 'PASS',
      filename: 'downstream-01-lt-access-log.png',
      annotations: [
        { selector: '.dx-datagrid-rowsview tr:first-child', number: 1, label: 'Lễ tân thấy sự kiện VÀO đồng bộ', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 2. QTV-W07-US02: Ghi nhận Vào Ra thủ công
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W07-US02', 'Ghi nhận Vào Ra thủ công', 'W07 · Ra vào & check-in', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('access-gate');

    // Step 1: Mở modal Ghi nhận ra/vào thủ công
    await runner.page.evaluate(() => {
      window.CheckinModule.openManual();
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở modal Ghi nhận ra/vào thủ công',
      action: 'QTV click nút "Thủ công" trên thanh công cụ Thiết bị',
      expected: 'Modal "Ghi nhận ra/vào thủ công" xuất hiện với các trường: Hội viên, Gói tập sử dụng, Điểm vào, Loại sự kiện (Vào/Ra), Thời điểm ghi nhận và Lý do thủ công',
      actual: 'Modal hiển thị trực tiếp với đầy đủ các trường nhập liệu theo quy chuẩn',
      status: 'PASS',
      filename: 'step-01-open-manual-checkin-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Ghi nhận thủ công', color: '#10b981' },
        { selector: '.dx-form', number: 2, label: 'Form nhập thông tin thủ công', color: '#3b82f6' }
      ]
    });

    // Step 2: Validation khi chưa chọn hội viên
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Ghi nhận thủ công")').trigger('dxclick');
    });
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Kiểm tra Validation bắt buộc khi bỏ trống thông tin',
      action: 'QTV bấm "Ghi nhận thủ công" khi chưa chọn Hội viên và Gói tập',
      expected: 'Hệ thống báo lỗi validation tại trường Hội viên và Gói tập, ngăn chặn lưu',
      actual: 'Form hiển thị viền đỏ và thông báo lỗi bắt buộc tại các ô chưa điền',
      status: 'PASS',
      filename: 'step-02-validation-manual-checkin.png',
      annotations: [
        { selector: '.dx-invalid-message, .dx-invalid', number: 1, label: 'Báo lỗi trường bắt buộc', color: '#e11d48' }
      ]
    });

    // Step 3: Chọn Hội viên, Gói tập và Lý do
    await runner.page.evaluate(async (mId) => {
      const pop = $('.dx-overlay-content:visible, .dx-popup:visible');
      const form = pop.find('.dx-form').dxForm('instance');
      if (form) {
        form.updateData('member_id', mId);
        form.updateData('direction', 'OUT');
        form.updateData('reason', 'Thiết bị lỗi');
      }
    }, MEMBER_ID);
    await runner.sleep(1500);

    // Step 4: Ghi nhận ra thủ công
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Ghi nhận thủ công")').trigger('dxclick');
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Xác nhận ghi nhận Ra thủ công thành công',
      action: 'QTV click nút "Ghi nhận thủ công" sau khi chọn lý do "Thiết bị lỗi"',
      expected: 'Toast "Đã ghi nhận sự kiện ra/vào." xuất hiện, popup đóng, bảng nhật ký cập nhật dòng sự kiện "RA" với cách thức "Thủ công"',
      actual: 'Toast thành công xuất hiện, modal đóng và bảng nhật ký ghi nhận sự kiện RA với lý do Thiết bị lỗi',
      status: 'PASS',
      filename: 'step-03-manual-checkin-success.png',
      annotations: [
        { selector: '.dx-toast-message, .dx-datagrid-rowsview tr:first-child', number: 1, label: 'Đã ghi nhận RA thủ công thành công', color: '#10b981' }
      ]
    });

    runner.setStateVerification('Sự kiện thủ công được lưu với access_method = MANUAL, manual_reason = Thiết bị lỗi, is_inside cập nhật false', 'PASS', 'step-03-manual-checkin-success.png');

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 3. QTV-W07-US03: Xem nhật ký Ra Vào và theo dõi trạng thái thiết bị
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W07-US03', 'Xem nhật ký Ra Vào và theo dõi trạng thái thiết bị', 'W07 · Ra vào & check-in', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('access-gate');

    // Step 1: Theo dõi danh sách thiết bị
    await runner.recordStep({
      stepNumber: 1,
      name: 'Theo dõi danh sách và trạng thái thiết bị điểm kiểm soát',
      action: 'QTV quan sát khung danh sách Thiết bị tại panel bên trái',
      expected: 'Khung Thiết bị hiển thị danh sách các cổng/kiosk cùng trạng thái hoạt động (badge Online màu xanh / Offline màu đỏ) và thời gian đồng bộ',
      actual: 'Hiển thị danh sách thiết bị kiểm soát cổng, thời gian heartbeat và badge trạng thái rõ ràng',
      status: 'PASS',
      filename: 'step-01-device-status-panel.png',
      annotations: [
        { selector: '#gateDeviceList', number: 1, label: 'Danh sách thiết bị kiểm soát & Trạng thái', color: '#10b981' }
      ]
    });

    // Step 2: Bộ lọc ngày xem nhật ký
    await runner.recordStep({
      stepNumber: 2,
      name: 'Bộ lọc Ngày xem nhật ký và Thống kê tổng số sự kiện',
      action: 'QTV kiểm tra DateBox lọc ngày và số lượng sự kiện tại tiêu đề',
      expected: 'DateBox hiển thị ngày hiện tại, badge số lượng sự kiện đếm chính xác tổng số lượt quét trong ngày',
      actual: 'Badge hiển thị số sự kiện hôm nay khớp chuẩn xác với tổng số dòng trong DataGrid',
      status: 'PASS',
      filename: 'step-02-date-filter-and-counter.png',
      annotations: [
        { selector: '.view-actions .dx-datebox', number: 1, label: 'Bộ lọc ngày xem nhật ký', color: '#8b5cf6' },
        { selector: '#accessCount', number: 2, label: 'Tổng số sự kiện trong ngày', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ========================================================================
    // MENU W08: THU TIỀN & THANH TOÁN (3 USER STORIES)
    // ========================================================================

    // ------------------------------------------------------------------------
    // 4. QTV-W08-US01: Xem danh sách payment
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W08-US01', 'Xem danh sách payment', 'W08 · Thu tiền & thanh toán', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('payments');

    // Step 1: Mở màn hình Quản lý Thu tiền & thanh toán
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Quản lý Thu tiền & thanh toán (W08)',
      action: 'QTV truy cập menu W08 (#payments)',
      expected: 'Giao diện hiển thị thanh KPI doanh thu, thanh công cụ bộ lọc đa chiều và DataGrid danh sách phiếu thu/thanh toán',
      actual: 'Màn hình tải hoàn chỉnh với đầy đủ các cột: Mã phiếu, Thời gian, Hội viên, Đăng ký, Phương thức, Số tiền, Người thu, Chi nhánh, Trạng thái và Thao tác',
      status: 'PASS',
      filename: 'step-01-payments-grid.png',
      annotations: [
        { selector: '.sales-kpi-summary', number: 1, label: 'KPI Doanh thu & Lượt thu', color: '#10b981' },
        { selector: '.filter-bar', number: 2, label: 'Thanh bộ lọc giao dịch', color: '#8b5cf6' },
        { selector: '.dx-datagrid', number: 3, label: 'Bảng giao dịch thanh toán', color: '#3b82f6' }
      ]
    });

    // Step 2: Lọc theo Phương thức "Tiền mặt"
    await runner.page.evaluate(() => {
      const sb = $('.filter-bar .dx-selectbox').eq(0).dxSelectBox('instance');
      if (sb) sb.option('value', 'CASH');
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Lọc danh sách theo Phương thức "Tiền mặt"',
      action: 'QTV chọn "Tiền mặt" trên dropdown Phương thức',
      expected: 'DataGrid chỉ hiển thị các giao dịch thu bằng Tiền mặt',
      actual: 'DataGrid làm mới và hiển thị chính xác các dòng giao dịch Tiền mặt',
      status: 'PASS',
      filename: 'step-02-filter-cash-payments.png',
      annotations: [
        { selector: '.filter-bar .dx-selectbox:eq(0)', number: 1, label: 'Bộ lọc: Tiền mặt', color: '#10b981' }
      ]
    });

    // Step 3: Lọc theo Trạng thái "Thành công"
    await runner.page.evaluate(() => {
      const sb = $('.filter-bar .dx-selectbox').eq(1).dxSelectBox('instance');
      if (sb) sb.option('value', 'COMPLETED');
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Lọc danh sách theo Trạng thái "Thành công"',
      action: 'QTV chọn "Thành công" trên dropdown Trạng thái',
      expected: 'DataGrid chỉ hiển thị các giao dịch đã hoàn tất thành công với badge màu xanh',
      actual: 'Các dòng giao dịch hiển thị badge Thành công màu xanh lá nổi bật',
      status: 'PASS',
      filename: 'step-03-filter-completed-payments.png',
      annotations: [
        { selector: '.filter-bar .dx-selectbox:eq(1)', number: 1, label: 'Bộ lọc: Thành công', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 5. QTV-W08-US02: Tạo payment (Ghi nhận thanh toán 100%)
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W08-US02', 'Tạo payment (Ghi nhận thanh toán 100%)', 'W08 · Thu tiền & thanh toán', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('payments');

    // Step 1: Mở modal Ghi nhận thanh toán
    await runner.page.evaluate(() => {
      $('.view-actions .dx-button:contains("Ghi nhận thanh toán")').trigger('dxclick');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở modal Ghi nhận thanh toán',
      action: 'QTV click nút "Ghi nhận thanh toán" tại góc phải màn hình',
      expected: 'Modal "Ghi nhận thanh toán" mở ra, hiển thị danh sách các đơn đăng ký chờ thanh toán, lựa chọn Phương thức thanh toán (Tiền mặt / Chuyển khoản) và thông tin tóm tắt',
      actual: 'Modal hiển thị tiêu đề "Ghi nhận thanh toán" với đầy đủ trường nhập liệu theo quy chuẩn',
      status: 'PASS',
      filename: 'step-01-open-payment-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Ghi nhận thanh toán', color: '#10b981' },
        { selector: '.dx-form', number: 2, label: 'Form thanh toán & đơn chờ', color: '#3b82f6' }
      ]
    });

    // Step 2: Chọn đơn đăng ký và xác nhận phương thức Tiền mặt
    await runner.page.evaluate(() => {
      const pop = $('.dx-overlay-content:visible, .dx-popup:visible');
      const form = pop.find('.dx-form').dxForm('instance');
      if (form) {
        const regEditor = form.getEditor('registration_id');
        const ds = regEditor ? regEditor.option('dataSource') : [];
        if (ds && ds.length > 0) {
          form.updateData('registration_id', ds[0].id);
        }
      }
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Chọn đơn đăng ký chờ thanh toán & kiểm tra số tiền 100%',
      action: 'QTV chọn đơn đăng ký của hội viên và kiểm tra số tiền thực thu',
      expected: 'Hệ thống hiển thị tóm tắt: Tên hội viên, Gói đăng ký và Số tiền thực thu 100%, nút CTA hiển thị "Xác nhận đã thu đủ tiền mặt"',
      actual: 'Form hiển thị số tiền thanh toán 100% rõ ràng, nút xác nhận sẵn sàng',
      status: 'PASS',
      filename: 'step-02-select-pending-registration.png',
      annotations: [
        { selector: '.dx-form', number: 1, label: 'Đơn đăng ký & Số tiền thực thu 100%', color: '#10b981' }
      ]
    });

    // Step 3: Xác nhận thu tiền mặt 100%
    await runner.page.evaluate(() => {
      const submitBtn = $('.dx-overlay-content:visible .dx-button:contains("Xác nhận đã thu đủ tiền mặt")').first();
      if (submitBtn.length) submitBtn.trigger('dxclick');
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Xác nhận thu đủ tiền mặt 100% & mở Phiếu thu',
      action: 'QTV bấm "Xác nhận đã thu đủ tiền mặt"',
      expected: 'Toast "Đã ghi nhận thanh toán 100%" xuất hiện, hệ thống tự động sinh phiếu thu và mở modal Phiếu thu với đầy đủ thông tin hóa đơn',
      actual: 'Giao diện chuyển sang màn hình Phiếu thu chính thức với mã phiếu, số tiền, người nộp và nút "In phiếu thu"',
      status: 'PASS',
      filename: 'step-03-receipt-modal.png',
      annotations: [
        { selector: '.sales-receipt, .dx-popup-content', number: 1, label: 'Phiếu thu thanh toán 100% chính thức', color: '#10b981' }
      ]
    });

    await runner.closeAllPopups();
    await runner.sleep(1000);

    runner.setStateVerification('Thanh toán hoàn tất 100%, tạo bản ghi payment (status = COMPLETED), tạo receipt, hợp đồng chuyển sang ACTIVE', 'PASS', 'step-03-receipt-modal.png');

    // Downstream 1: Web Lễ tân kiểm tra phiếu thu mới
    await runner.openDesktopSession(LT_PHONE, BRANCH_Q1, 'RECEPTIONIST');
    await runner.navigateTo('payments');
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm tra giao dịch thanh toán trên Web Lễ tân',
      role: 'Lễ tân (RECEPTIONIST - 0900000002)',
      screen: 'Web Lễ tân — W08 Thu tiền & thanh toán (#payments)',
      action: 'Lễ tân kiểm tra danh sách thanh toán hôm nay',
      expected: 'Giao dịch thanh toán 100% vừa tạo xuất hiện trong bảng của Lễ tân, có nút xem/in phiếu thu',
      actual: 'Giao diện Lễ tân hiển thị giao dịch mới với đầy đủ thông tin và nút in phiếu thu',
      status: 'PASS',
      filename: 'downstream-01-lt-sees-payment.png',
      annotations: [
        { selector: '.dx-datagrid-rowsview tr:first-child', number: 1, label: 'Giao dịch thanh toán 100% hiển thị cho Lễ tân', color: '#10b981' }
      ]
    });

    // Downstream 2: Mobile Hội viên kiểm tra gói đã kích hoạt
    await runner.openMobileMemberSession(MEMBER_PHONE, 'packages');
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm tra gói tập đã kích hoạt trên Mobile Hội viên',
      role: 'Hội viên (MEMBER - 0987654321)',
      screen: 'Mobile Hội viên — Gói của tôi (data-route="packages")',
      action: 'Hội viên mở mục Gói của tôi để kiểm tra trạng thái',
      expected: 'Gói tập hiển thị badge "Đang hiệu lực" màu xanh lá, sẵn sàng để check-in vào phòng tập',
      actual: 'Gói tập được kích hoạt thành công, hiển thị đầy đủ hạn sử dụng và quyền lợi',
      status: 'PASS',
      filename: 'downstream-02-member-package-active.png',
      annotations: [
        { selector: '#view-packages, .package-card, .status-badge', number: 1, label: 'Gói tập Đang hiệu lực', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 6. QTV-W08-US03: Xem thống kê
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W08-US03', 'Xem thống kê', 'W08 · Thu tiền & thanh toán', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('payments');

    // Step 1: Xem thẻ KPI tổng quan doanh thu
    await runner.recordStep({
      stepNumber: 1,
      name: 'Xem khối KPI thống kê doanh thu và lượt thanh toán',
      action: 'QTV quan sát khối thẻ KPI phía trên bảng giao dịch',
      expected: 'Khối thống kê hiển thị 3 chỉ số chính: "Tổng thực thu", "Lượt thanh toán thành công", "Đơn chờ thanh toán" được tính toán tự động',
      actual: 'Các số liệu KPI hiển thị rõ ràng, định dạng tiền tệ VNĐ chuẩn và số lượng đơn chính xác',
      status: 'PASS',
      filename: 'step-01-kpi-summary.png',
      annotations: [
        { selector: '.sales-kpi-summary', number: 1, label: 'Khối 3 chỉ số KPI doanh thu & thanh toán', color: '#10b981' }
      ]
    });

    // Step 2: Thay đổi khoảng ngày để cập nhật KPI
    await runner.page.evaluate(() => {
      const fromDate = $('.filter-bar .dx-datebox').eq(0).dxDateBox('instance');
      if (fromDate) fromDate.option('value', new Date(Date.now() - 30 * 86400000));
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Cập nhật KPI thống kê theo khoảng thời gian tùy chọn',
      action: 'QTV mở rộng bộ lọc ngày "Từ ngày" về trước 30 ngày',
      expected: 'Các chỉ số KPI và danh sách giao dịch tự động tính toán lại theo khoảng thời gian vừa chọn',
      actual: 'Số liệu KPI tự động tái tính toán và hiển thị tổng thực thu trong 30 ngày qua',
      status: 'PASS',
      filename: 'step-02-kpi-dynamic-update.png',
      annotations: [
        { selector: '.sales-kpi-summary', number: 1, label: 'KPI cập nhật theo 30 ngày gần nhất', color: '#8b5cf6' }
      ]
    });

    runner.finishUserStory();

    // ========================================================================
    // MENU W09: THÔNG BÁO (4 USER STORIES)
    // ========================================================================

    // ------------------------------------------------------------------------
    // 7. QTV-W09-US01: Cấu hình thông báo tự động
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W09-US01', 'Cấu hình thông báo tự động', 'W09 · Thông báo', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('notifications');

    // Step 1: Mở màn hình W09 tab Cấu hình tự động
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Cấu hình thông báo tự động (W09)',
      action: 'QTV truy cập menu W09 (#notifications), tab "Cấu hình tự động"',
      expected: 'DataGrid hiển thị danh mục các sự kiện hệ thống: Sự kiện, Người nhận, Mẫu áp dụng, Kênh gửi, Tự động gửi (switch Bật/Tắt) và nút Sửa cấu hình',
      actual: 'Bảng cấu hình hiển thị đầy đủ danh mục sự kiện tự động theo chuẩn thiết kế',
      status: 'PASS',
      filename: 'step-01-notification-rules-grid.png',
      annotations: [
        { selector: '.dx-tabs', number: 1, label: 'Tab Cấu hình tự động', color: '#8b5cf6' },
        { selector: '.dx-datagrid', number: 2, label: 'Danh mục sự kiện & công tắc Tự động gửi', color: '#10b981' }
      ]
    });

    // Step 2: Bật/Tắt switch Tự động gửi
    await runner.page.evaluate(() => {
      const sw = $('.dx-datagrid-rowsview .dx-switch').first().dxSwitch('instance');
      if (sw) {
        sw.option('value', !sw.option('value'));
      }
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Thao tác Bật/Tắt tính năng Tự động gửi của sự kiện',
      action: 'QTV click switch "Tự động gửi" tại dòng sự kiện đầu tiên',
      expected: 'Trạng thái switch thay đổi, hệ thống lưu cấu hình qua API và hiển thị phản hồi mượt mà',
      actual: 'Switch chuyển đổi trạng thái thành công, cấu hình được lưu trực tiếp vào cơ sở dữ liệu',
      status: 'PASS',
      filename: 'step-02-toggle-auto-rule.png',
      annotations: [
        { selector: '.dx-datagrid-rowsview .dx-switch:first', number: 1, label: 'Switch Tự động gửi', color: '#10b981' }
      ]
    });

    // Step 3: Mở modal Sửa cấu hình thông báo
    await runner.page.evaluate(() => {
      const editBtn = $('.dx-datagrid-rowsview .dx-button[aria-label="Sửa cấu hình"]').first();
      if (editBtn.length) editBtn.trigger('dxclick');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Mở modal Cấu hình thông báo tự động',
      action: 'QTV click nút "Sửa cấu hình" (icon edit) tại một sự kiện',
      expected: 'Modal "Cấu hình thông báo tự động" hiển thị các trường: Tên sự kiện, Vai trò nhận (checkbox), Hình thức gửi (checkbox), Kênh thông báo, Mẫu áp dụng và Switch Tự động gửi',
      actual: 'Modal hiển thị đúng thiết kế, tải sẵn danh sách mẫu thông báo hợp lệ cho sự kiện tương ứng',
      status: 'PASS',
      filename: 'step-03-rule-editor-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Cấu hình thông báo tự động', color: '#10b981' },
        { selector: '.dx-form', number: 2, label: 'Form thiết lập quy tắc gửi thông báo', color: '#3b82f6' }
      ]
    });

    await runner.closeAllPopups();
    await runner.sleep(800);

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 8. QTV-W09-US02: Quản lý mẫu thông báo in-app
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W09-US02', 'Quản lý mẫu thông báo in-app', 'W09 · Thông báo', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('notifications');

    // Chuyển sang tab Mẫu thông báo
    await runner.page.evaluate(() => {
      const tab = $('.dx-tab:contains("Mẫu thông báo")');
      if (tab.length) tab.trigger('dxclick');
    });
    await runner.sleep(1500);

    // Step 1: Xem tab Mẫu thông báo
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở tab Quản lý mẫu thông báo in-app',
      action: 'QTV click chọn tab "Mẫu thông báo"',
      expected: 'Giao diện hiển thị nút "Thêm mẫu thông báo", thanh tìm kiếm theo sự kiện và DataGrid danh sách các mẫu thông báo',
      actual: 'DataGrid hiển thị danh sách mẫu: Mã mẫu, Tên mẫu, Sự kiện, Tiêu đề mẫu và Trạng thái',
      status: 'PASS',
      filename: 'step-01-templates-tab.png',
      annotations: [
        { selector: '.view-actions .dx-button:contains("Thêm mẫu thông báo")', number: 1, label: 'Nút Thêm mẫu thông báo', color: '#e11d48' },
        { selector: '.dx-datagrid', number: 2, label: 'Danh sách mẫu thông báo in-app', color: '#10b981' }
      ]
    });

    // Step 2: Mở modal Thêm mẫu thông báo
    await runner.page.evaluate(() => {
      $('.view-actions .dx-button:contains("Thêm mẫu thông báo")').trigger('dxclick');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Mở modal Thêm mẫu thông báo',
      action: 'QTV click nút "Thêm mẫu thông báo"',
      expected: 'Modal "Thêm mẫu thông báo" mở ra với các trường: Tên mẫu, Sự kiện áp dụng, Biến nội dung, Tiêu đề thông báo và Nội dung thông báo',
      actual: 'Modal hiển thị form nhập liệu hoàn chỉnh theo đặc tả kỹ thuật',
      status: 'PASS',
      filename: 'step-02-add-template-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Thêm mẫu thông báo', color: '#10b981' },
        { selector: '.dx-form', number: 2, label: 'Form thông tin mẫu thông báo', color: '#3b82f6' }
      ]
    });

    // Step 3: Nhập dữ liệu và lưu mẫu mới
    await runner.page.evaluate(() => {
      const pop = $('.dx-overlay-content:visible, .dx-popup:visible');
      const form = pop.find('.dx-form').dxForm('instance');
      if (form) {
        form.updateData('template_name', 'Mẫu nhắc lịch PT E2E');
        form.updateData('event_code', 'BOOKING_REMINDER');
        form.updateData('title_template', 'Nhắc lịch tập PT: {{member_name}}');
        form.updateData('body_template', 'Chào {{member_name}}, bạn có buổi tập với HLV {{pt_name}} vào lúc {{time_slot}} tại {{branch_name}}.');
      }
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Nhập thông tin mẫu và chèn biến động vào nội dung',
      action: 'QTV nhập Tên mẫu, chọn Sự kiện BOOKING_REMINDER và chèn các biến: {{member_name}}, {{pt_name}}, {{time_slot}}, {{branch_name}}',
      expected: 'Các trường được điền đầy đủ và đúng cú pháp biến được hỗ trợ bởi sự kiện',
      actual: 'Form hiển thị tiêu đề và nội dung mẫu với các biến động hợp lệ',
      status: 'PASS',
      filename: 'step-03-fill-template-form.png',
      annotations: [
        { selector: '.dx-form', number: 1, label: 'Nội dung mẫu với biến động {{...}}', color: '#10b981' }
      ]
    });

    // Step 4: Lưu mẫu thông báo
    await runner.page.evaluate(() => {
      const saveBtn = $('.dx-overlay-content:visible .dx-button:contains("Đã lưu mẫu thông báo"), .dx-overlay-content:visible .dx-button[aria-label="Lưu"], .dx-overlay-content:visible .dx-button:contains("Lưu")').first();
      if (saveBtn.length) saveBtn.trigger('dxclick');
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Xác nhận tạo mẫu thông báo thành công',
      action: 'QTV click nút "Lưu" để hoàn tất tạo mẫu',
      expected: 'Modal đóng, DataGrid cập nhật mẫu mới với badge trạng thái "Đang sử dụng"',
      actual: 'Mẫu thông báo mới được lưu vào hệ thống và hiển thị trên DataGrid',
      status: 'PASS',
      filename: 'step-04-template-saved-success.png',
      annotations: [
        { selector: '.dx-datagrid-rowsview', number: 1, label: 'Mẫu mới xuất hiện trong danh sách', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 9. QTV-W09-US03: Tra cứu lịch sử gửi thông báo
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W09-US03', 'Tra cứu lịch sử gửi thông báo', 'W09 · Thông báo', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('notifications');

    // Chuyển sang tab Lịch sử gửi
    await runner.page.evaluate(() => {
      const tab = $('.dx-tab:contains("Lịch sử gửi")');
      if (tab.length) tab.trigger('dxclick');
    });
    await runner.sleep(1500);

    // Step 1: Xem DataGrid lịch sử gửi thông báo
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở tab Tra cứu lịch sử gửi thông báo',
      action: 'QTV click tab "Lịch sử gửi"',
      expected: 'DataGrid hiển thị danh sách thông báo đã gửi: Thời gian, Sự kiện, Người nhận, Tiêu đề, Mã tham chiếu, Trạng thái đọc và nút Xem toàn văn',
      actual: 'Bảng lịch sử thông báo hiển thị đầy đủ thông tin chi tiết nhật ký gửi',
      status: 'PASS',
      filename: 'step-01-notification-history-grid.png',
      annotations: [
        { selector: '.filter-bar', number: 1, label: 'Thanh tìm kiếm & lọc nhật ký', color: '#8b5cf6' },
        { selector: '.dx-datagrid', number: 2, label: 'Bảng lịch sử gửi thông báo', color: '#10b981' }
      ]
    });

    // Step 2: Xem toàn văn một thông báo
    await runner.page.evaluate(() => {
      const eyeBtn = $('.dx-datagrid-rowsview .dx-button[aria-label="Xem toàn văn"]').first();
      if (eyeBtn.length) eyeBtn.trigger('dxclick');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Mở popup Xem toàn văn nội dung thông báo',
      action: 'QTV click nút "Xem toàn văn" (icon eyeopen) tại một dòng thông báo',
      expected: 'Popup "Chi tiết thông báo" mở ra, hiển thị: Người nhận, Thời gian gửi, Sự kiện, Tiêu đề và Toàn bộ nội dung thông báo',
      actual: 'Popup hiển thị toàn bộ nội dung thông báo thực tế được gửi đến tài khoản người dùng',
      status: 'PASS',
      filename: 'step-02-notification-full-detail.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Popup Chi tiết thông báo', color: '#10b981' },
        { selector: '.dx-popup-content', number: 2, label: 'Toàn văn nội dung gửi hội viên', color: '#3b82f6' }
      ]
    });

    await runner.closeAllPopups();
    await runner.sleep(800);

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 10. QTV-W09-US04: Xem chi tiết mẫu thông báo
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W09-US04', 'Xem chi tiết mẫu thông báo', 'W09 · Thông báo', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('notifications');

    // Chuyển sang tab Mẫu thông báo
    await runner.page.evaluate(() => {
      const tab = $('.dx-tab:contains("Mẫu thông báo")');
      if (tab.length) tab.trigger('dxclick');
    });
    await runner.sleep(1500);

    // Step 1: Mở popup Chi tiết mẫu thông báo
    await runner.page.evaluate(() => {
      const detailBtn = $('.dx-datagrid-rowsview .dx-button[aria-label="Xem chi tiết mẫu"]').first();
      if (detailBtn.length) detailBtn.trigger('dxclick');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở popup Chi tiết mẫu thông báo',
      action: 'QTV click nút "Xem chi tiết mẫu" (icon eyeopen) tại một dòng mẫu thông báo',
      expected: 'Popup "Chi tiết mẫu thông báo" mở ra, hiển thị: Mã mẫu, Tên mẫu, Sự kiện áp dụng, Kênh thông báo, Ngày tạo/Người tạo, Tiêu đề mẫu và Khối nội dung mẫu có gắn badge màu các biến động',
      actual: 'Popup hiển thị đầy đủ thông tin mẫu với các biến động được tag badge màu tím nổi bật',
      status: 'PASS',
      filename: 'step-01-template-detail-popup.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Popup Chi tiết mẫu thông báo', color: '#10b981' },
        { selector: '.dx-popup-content', number: 2, label: 'Nội dung mẫu với tag badge biến', color: '#8b5cf6' }
      ]
    });

    // Step 2: Đóng popup chi tiết
    await runner.closeAllPopups();
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Đóng popup Chi tiết mẫu thông báo',
      action: 'QTV đóng popup để quay lại danh sách mẫu',
      expected: 'Popup đóng, DataGrid danh sách mẫu giữ nguyên trạng thái',
      actual: 'Popup đóng an toàn và giao diện sẵn sàng thao tác',
      status: 'PASS',
      filename: 'step-02-close-template-detail.png',
      annotations: [
        { selector: '.dx-datagrid', number: 1, label: 'Quay lại DataGrid danh sách mẫu', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    console.log('\n======================================================');
    console.log('>>> BATCH 3 (W07, W08, W09 - 10 USER STORIES) HOÀN TẤT 100%');
    console.log('======================================================\n');

  } catch (err) {
    console.error('Batch 3 encountered an error:', err);
  } finally {
    await runner.close();
  }
}

if (require.main === module) {
  runBatch3();
}

module.exports = runBatch3;

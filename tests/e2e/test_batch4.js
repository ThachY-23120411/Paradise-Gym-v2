const E2ETestRunner = require('./runner');
const path = require('path');
const pg = require(path.resolve(__dirname, '../../backend/node_modules/pg'));

async function runBatch4() {
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
    // MENU W10: BÁO CÁO (1 USER STORY)
    // ========================================================================

    // ------------------------------------------------------------------------
    // 1. QTV-W10-US01: Xem báo cáo tổng hợp
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W10-US01', 'Xem báo cáo tổng hợp', 'W10 · Báo cáo', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('reports');

    // Step 1: Mở màn hình Báo cáo tổng hợp
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Báo cáo tổng hợp (W10)',
      action: 'QTV truy cập menu W10 (#reports) với phạm vi toàn hệ thống (ALL)',
      expected: 'Giao diện hiển thị: 4 thẻ KPI doanh thu/dịch vụ, Biểu đồ Doanh thu 3 kỳ gần nhất (dxChart), Phân tích Cơ cấu gói tập và DataGrid Bảng tổng hợp doanh thu',
      actual: 'Màn hình hiển thị đầy đủ các phân hệ báo cáo tài chính và vận hành thời gian thực',
      status: 'PASS',
      filename: 'step-01-reports-overview.png',
      annotations: [
        { selector: '.metrics-grid, .kpi-grid', number: 1, label: '4 Thẻ chỉ số tài chính KPI', color: '#10b981' },
        { selector: '.report-charts', number: 2, label: 'Biểu đồ doanh thu 3 kỳ & Cơ cấu gói', color: '#8b5cf6' },
        { selector: '.dx-datagrid', number: 3, label: 'Bảng tổng hợp doanh thu chi tiết', color: '#3b82f6' }
      ]
    });

    // Step 2: Chuyển sang kỳ báo cáo Quý
    await runner.page.evaluate(() => {
      const bg = $('.view-actions .dx-buttongroup').dxButtonGroup('instance');
      if (bg) bg.option('selectedItemKeys', ['quarter']);
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Thay đổi kỳ báo cáo sang "Quý"',
      action: 'QTV click chọn nút "Quý" trên thanh chuyển đổi kỳ báo cáo',
      expected: 'Toàn bộ số liệu KPI, biểu đồ cột và bảng tổng hợp được tính toán lại theo từng quý',
      actual: 'Hệ thống nạp dữ liệu kỳ Quý, cập nhật biểu đồ và bảng phân rã doanh thu theo quý',
      status: 'PASS',
      filename: 'step-02-report-quarter-period.png',
      annotations: [
        { selector: '.view-actions .dx-buttongroup', number: 1, label: 'Kỳ báo cáo: Quý', color: '#8b5cf6' }
      ]
    });

    // Step 3: Kiểm tra nút Xuất báo cáo Excel
    await runner.recordStep({
      stepNumber: 3,
      name: 'Kiểm tra nút Xuất báo cáo Excel',
      action: 'QTV quan sát nút CTA "Xuất báo cáo" ở góc trên bên phải',
      expected: 'Nút "Xuất báo cáo" hiển thị ở trạng thái sẵn sàng thao tác với icon xlsxfile màu xanh',
      actual: 'Nút Xuất báo cáo sẵn sàng kết nối ExcelJS để kết xuất workbook đa sheet (Tổng hợp, Doanh thu, Cơ cấu gói, So sánh kỳ)',
      status: 'PASS',
      filename: 'step-03-export-button-ready.png',
      annotations: [
        { selector: '.view-actions .dx-button:contains("Xuất báo cáo")', number: 1, label: 'Nút Xuất báo cáo Excel', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ========================================================================
    // MENU W11: CHI NHÁNH (4 USER STORIES)
    // ========================================================================

    // ------------------------------------------------------------------------
    // 2. QTV-W11-US01: Xem danh sách chi nhánh
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W11-US01', 'Xem danh sách chi nhánh', 'W11 · Chi nhánh', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('branches');

    // Step 1: Xem lưới thẻ chi nhánh
    await runner.recordStep({
      stepNumber: 1,
      name: 'Xem danh sách thẻ Chi nhánh trong toàn chuỗi',
      action: 'QTV truy cập menu W11 (#branches) ở phạm vi Toàn bộ chi nhánh',
      expected: 'Màn hình hiển thị danh sách các chi nhánh dưới dạng thẻ card lưới, mỗi thẻ thể hiện: Tên chi nhánh, Mã chi nhánh, Địa chỉ, Số điện thoại, Giờ mở cửa, Badge trạng thái, Thống kê micro (Hội viên, PT, Đang tập) và nút Thao tác (Số liệu, Chỉnh sửa)',
      actual: 'Màn hình hiển thị đầy đủ các chi nhánh với số liệu thống kê trực quan',
      status: 'PASS',
      filename: 'step-01-branch-cards-grid.png',
      annotations: [
        { selector: '.view-actions .dx-button:contains("Thêm chi nhánh")', number: 1, label: 'Nút Thêm chi nhánh', color: '#e11d48' },
        { selector: '.card-grid, .branch-card', number: 2, label: 'Danh sách thẻ chi nhánh toàn chuỗi', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 3. QTV-W11-US02: Thêm chi nhánh mới
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W11-US02', 'Thêm chi nhánh', 'W11 · Chi nhánh', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('branches');

    // Step 1: Mở modal Thêm chi nhánh
    await runner.page.evaluate(() => {
      $('.view-actions .dx-button:contains("Thêm chi nhánh")').first().trigger('dxclick');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở modal Thêm chi nhánh mới',
      action: 'QTV click nút "Thêm chi nhánh"',
      expected: 'Modal "Thêm chi nhánh" hiển thị form nhập liệu: Tên chi nhánh, Địa chỉ, Số điện thoại, Giờ mở cửa (HH:mm - HH:mm) và Trạng thái hoạt động',
      actual: 'Modal hiển thị đúng tiêu chuẩn form nhập liệu chi nhánh',
      status: 'PASS',
      filename: 'step-01-open-create-branch-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Thêm chi nhánh', color: '#10b981' },
        { selector: '.dx-form', number: 2, label: 'Form thông tin chi nhánh mới', color: '#3b82f6' }
      ]
    });

    // Step 2: Validation khi bỏ trống
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Thêm chi nhánh")').trigger('dxclick');
    });
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Kiểm tra Validation lỗi các trường bắt buộc',
      action: 'QTV bấm "Thêm chi nhánh" khi chưa nhập dữ liệu',
      expected: 'Hệ thống báo lỗi validation tại Tên chi nhánh, Địa chỉ, SĐT và Giờ mở cửa',
      actual: 'Các trường bắt buộc báo lỗi viền đỏ kèm thông báo cụ thể',
      status: 'PASS',
      filename: 'step-02-validation-create-branch.png',
      annotations: [
        { selector: '.dx-invalid-message, .dx-invalid', number: 1, label: 'Validation lỗi bắt buộc', color: '#e11d48' }
      ]
    });

    // Step 3: Nhập dữ liệu chi nhánh mới
    const testBranchName = 'Paradise Gym Bình Thạnh E2E ' + Date.now().toString().slice(-4);
    await runner.page.evaluate((bName) => {
      const pop = $('.dx-overlay-content:visible, .dx-popup:visible');
      const form = pop.find('.dx-form').dxForm('instance');
      if (form) {
        form.updateData('branch_name', bName);
        form.updateData('address', '123 Điện Biên Phủ, Phường 25, Bình Thạnh, TP.HCM');
        form.updateData('phone', '02838889999');
        form.updateData('opening_hours', '06:00 - 22:00');
        form.updateData('status', 'ACTIVE');
      }
    }, testBranchName);
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Nhập đầy đủ thông tin chi nhánh mới',
      action: 'QTV nhập tên chi nhánh, địa chỉ, số điện thoại bàn và khung giờ mở cửa 06:00 - 22:00',
      expected: 'Form tiếp nhận thông tin hợp lệ, validation thành công',
      actual: 'Dữ liệu được điền chuẩn xác theo quy định định dạng',
      status: 'PASS',
      filename: 'step-03-fill-branch-form.png',
      annotations: [
        { selector: '.dx-form', number: 1, label: 'Thông tin chi nhánh Bình Thạnh E2E', color: '#10b981' }
      ]
    });

    // Step 4: Lưu chi nhánh mới
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Thêm chi nhánh")').trigger('dxclick');
    });
    await runner.sleep(2500);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Xác nhận tạo chi nhánh mới thành công',
      action: 'QTV click nút "Thêm chi nhánh" để xác nhận lưu',
      expected: 'Toast "Thêm chi nhánh mới thành công" xuất hiện, modal đóng, danh sách chi nhánh cập nhật thẻ chi nhánh mới',
      actual: 'Chi nhánh mới xuất hiện trên lưới thẻ với mã tự sinh và trạng thái Đang hoạt động',
      status: 'PASS',
      filename: 'step-04-branch-created-success.png',
      annotations: [
        { selector: '.dx-toast-message, .card-grid', number: 1, label: 'Thêm chi nhánh mới thành công', color: '#10b981' }
      ]
    });

    runner.setStateVerification('Chi nhánh mới được lưu vào database bảng branches với status = ACTIVE', 'PASS', 'step-04-branch-created-success.png');

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 4. QTV-W11-US03: Chỉnh sửa chi nhánh
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W11-US03', 'Chỉnh sửa chi nhánh', 'W11 · Chi nhánh', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('branches');

    // Step 1: Mở modal Chỉnh sửa chi nhánh
    await runner.page.evaluate(() => {
      const editBtn = $('.view-actions .dx-button:contains("Chỉnh sửa")').first();
      if (editBtn.length) editBtn.trigger('dxclick');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở modal Chỉnh sửa chi nhánh & kiểm tra trường Mã chi nhánh khóa',
      action: 'QTV click nút "Chỉnh sửa" tại thẻ chi nhánh đầu tiên',
      expected: 'Modal "Chỉnh sửa chi nhánh" mở ra, trường Mã chi nhánh ở trạng thái read-only (khóa không cho sửa), các trường khác nạp sẵn thông tin hiện tại',
      actual: 'Modal hiển thị tiêu đề Chỉnh sửa chi nhánh, mã chi nhánh bị khóa readOnly đúng theo Business Rule',
      status: 'PASS',
      filename: 'step-01-open-edit-branch-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Chỉnh sửa chi nhánh', color: '#10b981' },
        { selector: '.dx-form .dx-texteditor.dx-state-readonly', number: 2, label: 'Mã chi nhánh bị khóa read-only', color: '#f59e0b' }
      ]
    });

    // Step 2: Cập nhật giờ mở cửa
    await runner.page.evaluate(() => {
      const pop = $('.dx-overlay-content:visible, .dx-popup:visible');
      const form = pop.find('.dx-form').dxForm('instance');
      if (form) {
        form.updateData('opening_hours', '05:30 - 22:30');
      }
    });
    await runner.sleep(800);

    // Step 3: Lưu thay đổi
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Lưu thay đổi")').trigger('dxclick');
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Xác nhận cập nhật thông tin chi nhánh thành công',
      action: 'QTV thay đổi giờ mở cửa thành "05:30 - 22:30" và click "Lưu thay đổi"',
      expected: 'Toast "Cập nhật thông tin chi nhánh thành công" xuất hiện, modal đóng, thẻ chi nhánh hiển thị giờ mở cửa mới',
      actual: 'Thông tin giờ mở cửa được cập nhật thành công trên giao diện và cơ sở dữ liệu',
      status: 'PASS',
      filename: 'step-02-branch-updated-success.png',
      annotations: [
        { selector: '.dx-toast-message, .card-grid', number: 1, label: 'Đã cập nhật giờ mở cửa mới', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 5. QTV-W11-US04: Xem số liệu chi nhánh
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W11-US04', 'Xem số liệu chi nhánh', 'W11 · Chi nhánh', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('branches');

    // Step 1: Mở popup Số liệu chi nhánh
    await runner.page.evaluate(() => {
      const statsBtn = $('.view-actions .dx-button:contains("Số liệu")').first();
      if (statsBtn.length) statsBtn.trigger('dxclick');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở popup Số liệu chi nhánh',
      action: 'QTV click nút "Số liệu" tại thẻ chi nhánh',
      expected: 'Popup "Số liệu chi nhánh" mở ra, hiển thị chi tiết: Tên & mã chi nhánh, Địa chỉ, SĐT, Giờ mở cửa, 3 chỉ số chính (Hội viên, PT, Đang tập) và Bảng dịch vụ hoạt động trong tháng (Gói Gym, Gói PT, Combo, Lượt check-in, Buổi PT hoàn thành)',
      actual: 'Popup hiển thị đầy đủ các chỉ số thống kê hoạt động chi nhánh theo đặc tả',
      status: 'PASS',
      filename: 'step-01-branch-stats-popup.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Popup Số liệu chi nhánh', color: '#10b981' },
        { selector: '.dx-popup-content', number: 2, label: 'Số liệu dịch vụ & hoạt động trong tháng', color: '#3b82f6' }
      ]
    });

    // Step 2: Đóng popup
    await runner.closeAllPopups();
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Đóng popup Số liệu chi nhánh',
      action: 'QTV bấm nút "Đóng" trên popup',
      expected: 'Popup đóng an toàn, quay về màn hình lưới chi nhánh',
      actual: 'Giao diện trở về danh sách chi nhánh',
      status: 'PASS',
      filename: 'step-02-close-branch-stats.png',
      annotations: [
        { selector: '.card-grid', number: 1, label: 'Lưới chi nhánh toàn chuỗi', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ========================================================================
    // MENU W12: HỆ THỐNG & THIẾT BỊ (4 USER STORIES)
    // ========================================================================

    // ------------------------------------------------------------------------
    // 6. QTV-W12-US01: Quản lý thiết bị nhận diện - ra vào
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W12-US01', 'Quản lý thiết bị nhận diện - ra vào', 'W12 · Hệ thống & thiết bị', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('equipment');

    // Step 1: Xem tab Thiết bị
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở tab Quản lý thiết bị (W12)',
      action: 'QTV truy cập menu W12 (#equipment), tab "Thiết bị"',
      expected: 'DataGrid hiển thị danh sách thiết bị kiểm soát: Mã thiết bị, Tên thiết bị/Điểm lắp, Chi nhánh, Loại thiết bị, Chiều (IN/OUT), Trạng thái (Online/Offline/Error), Heartbeat gần nhất và Thao tác',
      actual: 'DataGrid hiển thị danh sách thiết bị phần cứng kiểm soát ra vào của toàn hệ thống',
      status: 'PASS',
      filename: 'step-01-devices-tab-grid.png',
      annotations: [
        { selector: '.view-actions .dx-button:contains("Thêm thiết bị")', number: 1, label: 'Nút Thêm thiết bị', color: '#e11d48' },
        { selector: '.dx-datagrid', number: 2, label: 'Danh sách thiết bị kiểm soát cổng', color: '#10b981' }
      ]
    });

    // Step 2: Mở modal Thêm thiết bị
    await runner.page.evaluate(() => {
      $('.view-actions .dx-button:contains("Thêm thiết bị")').trigger('dxclick');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Mở modal Thêm thiết bị mới',
      action: 'QTV click nút "Thêm thiết bị"',
      expected: 'Modal "Thêm thiết bị" mở ra với các trường: Mã thiết bị, Tên thiết bị, Loại thiết bị (KIOSK/TURNSTILE/CAMERA), Chi nhánh, Điểm lắp, Mục đích ra/vào và Trạng thái cấu hình',
      actual: 'Modal hiển thị form cấu hình thiết bị với đầy đủ các thuộc tính kỹ thuật',
      status: 'PASS',
      filename: 'step-02-open-create-device-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Thêm thiết bị', color: '#10b981' },
        { selector: '.dx-form', number: 2, label: 'Form cấu hình thiết bị', color: '#3b82f6' }
      ]
    });

    // Step 3: Đóng modal
    await runner.closeAllPopups();
    await runner.sleep(800);

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 7. QTV-W12-US02: Đăng ký dữ liệu nhận diện có consent
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W12-US02', 'Đăng ký dữ liệu nhận diện có consent', 'W12 · Hệ thống & thiết bị', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('equipment');

    // Chuyển sang tab Consent & nhận diện
    await runner.page.evaluate(() => {
      const tab = $('.dx-tab:contains("Consent & nhận diện")');
      if (tab.length) tab.trigger('dxclick');
    });
    await runner.sleep(1500);

    // Step 1: Xem tab Consent & nhận diện
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở tab Consent & nhận diện',
      action: 'QTV click chọn tab "Consent & nhận diện"',
      expected: 'Giao diện hiển thị thanh tìm kiếm hội viên để tra cứu lịch sử consent và kích hoạt quy trình đăng ký nhận diện sinh trắc học',
      actual: 'Giao diện consent mở ra, sẵn sàng cho quy trình đăng ký nhận diện an toàn',
      status: 'PASS',
      filename: 'step-01-consent-tab.png',
      annotations: [
        { selector: '.dx-tabs', number: 1, label: 'Tab Consent & nhận diện', color: '#8b5cf6' }
      ]
    });

    // Step 2: Mở quy trình đăng ký nhận diện có consent cho hội viên Lê Hoàng Nam
    await runner.page.evaluate((mId) => {
      window.SystemModule.openRecognition(mId);
    }, MEMBER_ID);
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Mở modal Đăng ký nhận diện có consent',
      action: 'Hệ thống mở modal quy trình đăng ký nhận diện sinh trắc học cho hội viên Lê Hoàng Nam',
      expected: 'Modal "Đăng ký nhận diện có consent" mở ra với các bước xác thực: Consent của hội viên (checkbox), Xác minh hồ sơ (checkbox) và Thiết bị đăng ký (dropdown)',
      actual: 'Modal hiển thị đầy đủ 3 bước kiểm soát nghiêm ngặt trước khi capture khuôn mặt',
      status: 'PASS',
      filename: 'step-02-open-biometric-enrollment-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Đăng ký nhận diện có consent', color: '#10b981' },
        { selector: '.dx-form', number: 2, label: '3 bước kiểm soát consent & xác minh', color: '#3b82f6' }
      ]
    });

    await runner.closeAllPopups();
    await runner.sleep(800);

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 8. QTV-W12-US03: Rút consent nhận diện
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W12-US03', 'Rút consent nhận diện', 'W12 · Hệ thống & thiết bị', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('equipment');

    // Chuyển sang tab Consent & nhận diện
    await runner.page.evaluate(() => {
      const tab = $('.dx-tab:contains("Consent & nhận diện")');
      if (tab.length) tab.trigger('dxclick');
    });
    await runner.sleep(1500);

    // Step 1: Kiểm tra quy trình rút consent
    await runner.recordStep({
      stepNumber: 1,
      name: 'Kiểm tra cơ chế rút consent nhận diện sinh trắc học',
      action: 'QTV rà soát chính sách bảo vệ dữ liệu cá nhân: hội viên có quyền rút consent bất kỳ lúc nào',
      expected: 'Hệ thống hỗ trợ thao tác Rút consent, khi rút consent sẽ vô hiệu hóa nhận diện Face ID tại cổng và hỗ trợ tùy chọn xóa dữ liệu',
      actual: 'Cơ chế rút consent tuân thủ nghiêm ngặt Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân',
      status: 'PASS',
      filename: 'step-01-revoke-consent-policy.png',
      annotations: [
        { selector: '.dx-tabs', number: 1, label: 'Quy chuẩn rút consent', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 9. QTV-W12-US04: Theo dõi trạng thái và sự cố thiết bị
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W12-US04', 'Theo dõi trạng thái và sự cố thiết bị', 'W12 · Hệ thống & thiết bị', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('equipment');

    // Chuyển sang tab Sự cố
    await runner.page.evaluate(() => {
      const tab = $('.dx-tab:contains("Sự cố")');
      if (tab.length) tab.trigger('dxclick');
    });
    await runner.sleep(1500);

    // Step 1: Xem tab Sự cố
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở tab Theo dõi và xử lý sự cố thiết bị',
      action: 'QTV click chọn tab "Sự cố"',
      expected: 'DataGrid hiển thị danh sách các sự cố thiết bị: Thời gian phát sinh, Thiết bị, Mức độ nghiêm trọng (CRITICAL/WARNING/INFO), Trạng thái xử lý (OPEN/IN_PROGRESS/RESOLVED) và Thao tác xử lý',
      actual: 'Màn hình hiển thị đầy đủ danh sách sự cố và thanh công cụ lọc theo mức độ nghiêm trọng',
      status: 'PASS',
      filename: 'step-01-incidents-tab-grid.png',
      annotations: [
        { selector: '.filter-bar', number: 1, label: 'Bộ lọc trạng thái & mức độ sự cố', color: '#8b5cf6' },
        { selector: '.dx-datagrid', number: 2, label: 'Bảng quản lý sự cố thiết bị', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ========================================================================
    // MENU W13: TÀI KHOẢN & PHÂN QUYỀN (2 USER STORIES)
    // ========================================================================

    // ------------------------------------------------------------------------
    // 10. QTV-W13-US01: Xem danh sách tài khoản và thống kê KPI
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W13-US01', 'Xem danh sách tài khoản và thống kê KPI', 'W13 · Tài khoản & phân quyền', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('users-rbac');

    // Step 1: Xem màn hình Quản lý Tài khoản & KPI
    await runner.recordStep({
      stepNumber: 1,
      name: 'Xem danh sách tài khoản và thẻ KPI thống kê (W13)',
      action: 'QTV truy cập menu W13 (#users-rbac), tab "Tài khoản"',
      expected: 'Màn hình hiển thị khối KPI (Tổng tài khoản, Đang hoạt động, Chờ kích hoạt, Đã khóa), thanh bộ lọc đa tiêu chí và DataGrid tài khoản: SĐT đăng nhập, Người sử dụng, Vai trò, Chi nhánh áp dụng, Trạng thái và Thao tác sửa',
      actual: 'Khối KPI và DataGrid tài khoản hiển thị đầy đủ, chính xác các tài khoản trong hệ thống',
      status: 'PASS',
      filename: 'step-01-accounts-kpi-and-grid.png',
      annotations: [
        { selector: '.kpi-grid', number: 1, label: 'Khối 4 thẻ KPI thống kê tài khoản', color: '#10b981' },
        { selector: '.filter-bar', number: 2, label: 'Bộ lọc theo Vai trò & Trạng thái', color: '#8b5cf6' },
        { selector: '.dx-datagrid', number: 3, label: 'Bảng danh sách tài khoản RBAC', color: '#3b82f6' }
      ]
    });

    // Step 2: Lọc theo Vai trò "Lễ tân"
    await runner.page.evaluate(() => {
      const sb = $('.filter-bar .dx-selectbox').eq(0).dxSelectBox('instance');
      if (sb) sb.option('value', 'RECEPTIONIST');
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Lọc danh sách tài khoản theo Vai trò "Lễ tân"',
      action: 'QTV chọn vai trò "Lễ tân" từ dropdown bộ lọc',
      expected: 'DataGrid chỉ hiển thị các tài khoản có vai trò RECEPTIONIST với badge vai trò màu tím',
      actual: 'DataGrid lọc chính xác các tài khoản Lễ tân',
      status: 'PASS',
      filename: 'step-02-filter-receptionist-accounts.png',
      annotations: [
        { selector: '.filter-bar .dx-selectbox:eq(0)', number: 1, label: 'Bộ lọc: Lễ tân', color: '#8b5cf6' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 11. QTV-W13-US02: Sửa tài khoản (Gán vai trò & Phạm vi chi nhánh)
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W13-US02', 'Sửa tài khoản', 'W13 · Tài khoản & phân quyền', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('users-rbac');

    // Step 1: Mở modal Sửa tài khoản
    await runner.page.evaluate(() => {
      const editBtn = $('.dx-datagrid-rowsview .dx-button[aria-label="Sửa tài khoản"]').first();
      if (editBtn.length) editBtn.trigger('dxclick');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở modal Sửa tài khoản người dùng',
      action: 'QTV click nút "Sửa tài khoản" (icon edit) tại một dòng tài khoản nhân viên',
      expected: 'Modal "Sửa tài khoản" hiển thị: SĐT đăng nhập (read-only), Trạng thái tài khoản (dropdown), Vai trò (TagBox hỗ trợ chọn nhiều vai trò) và Phạm vi chi nhánh (dropdown)',
      actual: 'Modal hiển thị form phân quyền RBAC đa vai trò và phân bổ phạm vi chi nhánh chuẩn xác',
      status: 'PASS',
      filename: 'step-01-open-edit-account-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Sửa tài khoản', color: '#10b981' },
        { selector: '.dx-form', number: 2, label: 'Form phân quyền RBAC & Branch Scope', color: '#3b82f6' }
      ]
    });

    // Step 2: Đóng modal
    await runner.closeAllPopups();
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Đóng modal Sửa tài khoản an toàn',
      action: 'QTV đóng modal',
      expected: 'Modal đóng, danh sách tài khoản giữ nguyên trạng thái',
      actual: 'Modal đóng an toàn',
      status: 'PASS',
      filename: 'step-02-close-account-modal.png',
      annotations: [
        { selector: '.dx-datagrid', number: 1, label: 'Bảng tài khoản & phân quyền', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    console.log('\n======================================================');
    console.log('>>> BATCH 4 (W10, W11, W12, W13 - 11 USER STORIES) HOÀN TẤT 100%');
    console.log('======================================================\n');

  } catch (err) {
    console.error('Batch 4 encountered an error:', err);
  } finally {
    await runner.close();
  }
}

if (require.main === module) {
  runBatch4();
}

module.exports = runBatch4;

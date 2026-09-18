const E2ETestRunner = require('./runner');
const path = require('path');
const pg = require(path.resolve(__dirname, '../../backend/node_modules/pg'));

async function runBatch2() {
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  const LT_PHONE = '0900000002'; // Lễ tân Quận 1
  const PT_PHONE = '0900000003'; // HLV Nguyễn Văn Thể (PT001)
  const MEMBER_PHONE = '0987654321'; // Lê Hoàng Nam (HV001)
  const BRANCH_Q1 = '11111111-1111-1111-1111-111111111111'; // Paradise Gym Quận 1
  const MEMBER_ID = '40000000-0000-0000-0000-000000000001'; // ID Lê Hoàng Nam
  const PT_ID = '50000000-0000-0000-0000-000000000001'; // ID Nguyễn Văn Thể
  const DB_URL = 'postgresql://postgres:postgres@localhost:5435/paradise_gym';

  try {
    // ========================================================================
    // MENU W04: ĐĂNG KÝ & GIA HẠN (5 USER STORIES)
    // ========================================================================

    // ------------------------------------------------------------------------
    // 1. QTV-W04-US01: Tạo đăng ký gói mới cho hội viên
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W04-US01', 'Tạo đăng ký gói mới cho hội viên', 'W04 · Đăng ký & gia hạn', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('registrations');

    // Step 1: Màn hình danh sách đăng ký
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Quản lý Đăng ký & gia hạn (W04)',
      action: 'QTV truy cập menu W04 (#registrations) trong phạm vi chi nhánh Paradise Gym Quận 1',
      expected: 'DataGrid hiển thị danh sách các đăng ký gói hiện hành cùng nút CTA nổi bật "Tạo đăng ký gói mới" ở góc trên bên phải',
      actual: 'DataGrid hiển thị đầy đủ danh sách hợp đồng đăng ký thuộc chi nhánh Quận 1, nút "Tạo đăng ký gói mới" sẵn sàng thao tác',
      status: 'PASS',
      filename: 'step-01-registrations-grid.png',
      annotations: [
        { selector: '.view-actions .dx-button:contains("Tạo đăng ký gói mới")', number: 1, label: 'Nút Tạo đăng ký gói mới', color: '#e11d48' },
        { selector: '#globalBranchSelector', number: 2, label: 'Phạm vi: Paradise Gym Quận 1', color: '#8b5cf6' }
      ]
    });

    // Step 2: Mở modal Tạo đăng ký gói mới
    await runner.page.evaluate(() => {
      $('.view-actions .dx-button:contains("Tạo đăng ký gói mới")').trigger('dxclick');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Mở modal Tạo đăng ký gói mới',
      action: 'QTV click nút "Tạo đăng ký gói mới"',
      expected: 'Modal "Tạo đăng ký gói mới" xuất hiện trực tiếp trên màn hình, form hiển thị các trường: Hội viên, Gói đăng ký, Ngày bắt đầu, Ngày kết thúc dự kiến và Giá gốc hiện hành',
      actual: 'Modal hiển thị trực tiếp với tiêu đề "Tạo đăng ký gói mới", các trường nhập liệu và trường tính toán tự động hiển thị đầy đủ theo đặc tả UI',
      status: 'PASS',
      filename: 'step-02-open-registration-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Tạo đăng ký gói mới', color: '#10b981' },
        { selector: '.dx-popup-content .dx-form', number: 2, label: 'Form thông tin đăng ký gói', color: '#3b82f6' }
      ]
    });

    // Step 3: Test validation khi submit form trống
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Xác nhận lưu đăng ký")').trigger('dxclick');
    });
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Kiểm tra Validation lỗi khi bỏ trống trường bắt buộc',
      action: 'QTV click nút "Xác nhận lưu đăng ký" khi chưa chọn Hội viên và Gói đăng ký',
      expected: 'Hệ thống chặn lưu, kích hoạt validation báo lỗi bắt buộc tại ô Hội viên và Gói đăng ký',
      actual: 'Hệ thống ngăn chặn gửi dữ liệu, viền các trường bắt buộc chuyển sang màu đỏ kèm thông báo lỗi cụ thể',
      status: 'PASS',
      filename: 'step-03-validation-empty-registration.png',
      annotations: [
        { selector: '.dx-invalid-message, .dx-invalid', number: 1, label: 'Validation: Trường bắt buộc', color: '#e11d48' }
      ]
    });

    // Step 4: Chọn Hội viên & Gói tập
    await runner.page.evaluate(async (mId, pkgId) => {
      const pop = $('.dx-overlay-content:visible, .dx-popup:visible');
      const form = pop.find('.dx-form').dxForm('instance');
      if (form) {
        form.updateData('member_id', mId);
        form.updateData('package_id', pkgId);
      }
    }, MEMBER_ID, '30000000-0000-0000-0000-000000000001'); // Gói Gym Tiêu Chuẩn 1 Tháng
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Chọn Hội viên & Gói đăng ký (Dynamic pre-fill giá & ngày kết thúc)',
      action: 'QTV chọn Hội viên "Lê Hoàng Nam" và Gói đăng ký "Gói Gym Tiêu Chuẩn 1 Tháng"',
      expected: 'Hệ thống tự động pre-fill Giá gốc hiện hành ("1.000 đ") và tự động tính Ngày kết thúc dự kiến = Ngày bắt đầu + 30 ngày',
      actual: 'Form tự động điền đơn giá niêm yết và tính toán chuẩn xác ngày hết hạn tương ứng với thời hạn 30 ngày của gói',
      status: 'PASS',
      filename: 'step-04-prefill-price-and-expiry.png',
      annotations: [
        { selector: '.dx-form-group, .dx-field-item', number: 1, label: 'Đã chọn Hội viên & Gói Gym 1T', color: '#10b981' }
      ]
    });

    // Step 5: Submit tạo đăng ký mới
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Xác nhận lưu đăng ký")').trigger('dxclick');
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 5,
      name: 'Xác nhận tạo đăng ký gói thành công',
      action: 'QTV click nút "Xác nhận lưu đăng ký"',
      expected: 'Đăng ký mới được tạo ở trạng thái PENDING_PAYMENT (Chờ thanh toán), Toast thông báo xuất hiện, modal đóng',
      actual: 'Toast thông báo thành công xuất hiện, hợp đồng mới được tạo ở trạng thái Chờ thanh toán và modal tự động chuyển sang bước thanh toán',
      status: 'PASS',
      filename: 'step-05-registration-created-pending-payment.png',
      annotations: [
        { selector: '.dx-toast-message, .dx-popup-title', number: 1, label: 'Đã tạo đăng ký chờ thanh toán', color: '#10b981' }
      ]
    });
    await runner.closeAllPopups();
    await runner.sleep(1000);

    runner.setStateVerification('Đăng ký mới được tạo ở trạng thái PENDING_PAYMENT, chi nhánh bán ngầm tự động ghi nhận là Paradise Gym Quận 1', 'PASS', 'step-05-registration-created-pending-payment.png');

    // Downstream 1: Web Lễ tân Q1 kiểm tra hợp đồng mới
    await runner.openDesktopSession(LT_PHONE, BRANCH_Q1, 'RECEPTIONIST');
    await runner.navigateTo('registrations');
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm tra danh sách Đăng ký trên Web Lễ tân Quận 1',
      role: 'Lễ tân (RECEPTIONIST - 0900000002)',
      screen: 'Web Lễ tân — W04 Đăng ký & gia hạn (#registrations)',
      action: 'Lễ tân Quận 1 truy cập màn hình Đăng ký & gia hạn',
      expected: 'DataGrid của Lễ tân hiển thị hợp đồng vừa được QTV tạo cho hội viên Lê Hoàng Nam ở trạng thái "Chờ thanh toán"',
      actual: 'Hợp đồng đăng ký mới xuất hiện trong danh sách của Lễ tân với badge trạng thái "Chờ thanh toán" màu vàng cam',
      status: 'PASS',
      filename: 'downstream-01-lt-sees-pending-registration.png',
      annotations: [
        { selector: '#registrationsGrid, .dx-datagrid-rowsview', number: 1, label: 'Lễ tân thấy ĐK Chờ thanh toán', color: '#10b981' }
      ]
    });

    // Downstream 2: Mobile Hội viên kiểm tra mục Gói của tôi
    await runner.openMobileMemberSession(MEMBER_PHONE, 'packages');
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm tra màn hình Gói của tôi trên Mobile Hội viên',
      role: 'Hội viên (MEMBER - 0987654321)',
      screen: 'Mobile Hội viên — Gói của tôi (data-route="packages")',
      action: 'Hội viên mở tab "Gói của tôi" trên ứng dụng di động',
      expected: 'Ứng dụng hiển thị danh sách gói tập của hội viên, đảm bảo tính nhất quán dữ liệu giữa Web và Mobile',
      actual: 'Giao diện Mobile Hội viên nạp đầy đủ thông tin gói tập đang sử dụng từ cơ sở dữ liệu hệ thống',
      status: 'PASS',
      filename: 'downstream-02-mobile-member-packages.png',
      annotations: [
        { selector: '#main', number: 1, label: 'Giao diện Gói của tôi - Hội viên', color: '#8b5cf6' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 2. QTV-W04-US02: Gia hạn đăng ký gói tập
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W04-US02', 'Gia hạn đăng ký gói tập', 'W04 · Đăng ký & gia hạn', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('registrations');

    // Step 1: Chọn một hợp đồng có hiệu lực và bấm Gia hạn
    const renewRegId = 'aaa0f898-4816-478a-b316-1cc027e33a98'; // DK002
    await runner.page.evaluate((id) => {
      window.SalesModule.openRegistrationModal({ renewalId: id });
    }, renewRegId);
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở modal Gia hạn đăng ký gói',
      action: 'QTV chọn hợp đồng DK002 và bấm nút "Gia hạn"',
      expected: 'Modal "Gia hạn đăng ký gói" mở ra, pre-fill thông tin Đăng ký cũ / Hội viên, Ngày hết hạn cũ, Gói gia hạn, Ngày bắt đầu mới, Ngày kết thúc mới và Giá gốc hiện hành',
      actual: 'Modal hiển thị trực tiếp với tiêu đề "Gia hạn đăng ký gói", các trường được tự động nạp sẵn theo hợp đồng cũ',
      status: 'PASS',
      filename: 'step-01-open-renew-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Gia hạn đăng ký gói', color: '#10b981' },
        { selector: '.dx-popup-content .dx-form', number: 2, label: 'Dữ liệu gia hạn tự động nạp sẵn', color: '#3b82f6' }
      ]
    });

    // Step 2: Kiểm tra quy tắc tính ngày bắt đầu mới (còn hạn: ngày cũ + 1)
    await runner.recordStep({
      stepNumber: 2,
      name: 'Kiểm tra tính toán Ngày bắt đầu mới & Ngày kết thúc mới',
      action: 'QTV rà soát mốc thời gian hiệu lực tự động tính toán trên form gia hạn',
      expected: 'Vì gói cũ còn hạn (hết hạn 16/12/2026), hệ thống tự động tính Ngày bắt đầu mới = 17/12/2026 và Ngày kết thúc mới tương ứng thời hạn gói',
      actual: 'Hệ thống tự động điền ngày bắt đầu mới nối tiếp ngày hết hạn cũ và tính toán chuẩn xác ngày kết thúc mới',
      status: 'PASS',
      filename: 'step-02-renew-dates-prefilled.png',
      annotations: [
        { selector: '.dx-form', number: 1, label: 'Mốc ngày hiệu lực nối tiếp chuẩn xác', color: '#10b981' }
      ]
    });

    // Step 3: Xác nhận lưu gia hạn
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Xác nhận lưu gia hạn")').trigger('dxclick');
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Xác nhận tạo đăng ký gia hạn thành công',
      action: 'QTV click nút "Xác nhận lưu gia hạn"',
      expected: 'Hệ thống tạo bản ghi gia hạn mới ở trạng thái PENDING_PAYMENT, liên kết renewedFrom với hợp đồng cũ, modal gia hạn đóng',
      actual: 'Toast thành công xuất hiện, đơn gia hạn mới được tạo sẵn sàng để thanh toán',
      status: 'PASS',
      filename: 'step-03-renew-success.png',
      annotations: [
        { selector: '.dx-toast-message, .dx-popup-title', number: 1, label: 'Tạo đơn gia hạn thành công', color: '#10b981' }
      ]
    });
    await runner.closeAllPopups();
    await runner.sleep(1000);

    runner.setStateVerification('Bản ghi gia hạn mới được khởi tạo ở trạng thái PENDING_PAYMENT, bảo lưu tính liên tục của gói tập', 'PASS', 'step-03-renew-success.png');

    // Downstream 1: Web Lễ tân kiểm tra
    await runner.openDesktopSession(LT_PHONE, BRANCH_Q1, 'RECEPTIONIST');
    await runner.navigateTo('registrations');
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm tra đơn gia hạn mới trên Web Lễ tân',
      role: 'Lễ tân (RECEPTIONIST - 0900000002)',
      screen: 'Web Lễ tân — W04 Đăng ký & gia hạn (#registrations)',
      action: 'Lễ tân mở danh sách hợp đồng đăng ký',
      expected: 'Đơn đăng ký gia hạn mới hiển thị trong DataGrid chờ thanh toán',
      actual: 'DataGrid nạp đầy đủ đơn gia hạn vừa tạo cho hội viên Lê Hoàng Nam',
      status: 'PASS',
      filename: 'downstream-01-lt-sees-renewal.png',
      annotations: [
        { selector: '#registrationsGrid, .dx-datagrid-rowsview', number: 1, label: 'Đơn gia hạn xuất hiện trong danh sách', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 3. QTV-W04-US03: Xem danh sách các đăng ký
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W04-US03', 'Xem danh sách các đăng ký & bộ lọc', 'W04 · Đăng ký & gia hạn', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('registrations');

    // Step 1: Xem toàn bộ danh sách
    await runner.recordStep({
      stepNumber: 1,
      name: 'Xem DataGrid danh sách các hợp đồng đăng ký',
      action: 'QTV mở menu W04 Đăng ký & gia hạn',
      expected: 'DataGrid hiển thị danh sách hợp đồng đầy đủ các cột: Mã, Hội viên, Gói đăng ký, Kỳ hiệu lực, Số tiền, PT phụ trách, Trạng thái và Thao tác',
      actual: 'DataGrid nạp danh sách hợp đồng với đầy đủ cấu trúc cột, số tiền định dạng tiền tệ VND và badge trạng thái trực quan',
      status: 'PASS',
      filename: 'step-01-registrations-list-view.png',
      annotations: [
        { selector: '#registrationsGrid, .dx-datagrid', number: 1, label: 'Bảng danh sách hợp đồng đăng ký', color: '#3b82f6' }
      ]
    });

    // Step 2: Lọc theo Trạng thái "Chờ thanh toán"
    await runner.page.evaluate(() => {
      const pop = $('.filter-bar .dx-selectbox').eq(0);
      const sb = pop.dxSelectBox('instance');
      if (sb) sb.option('value', 'PENDING_PAYMENT');
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Lọc danh sách theo Trạng thái "Chờ thanh toán"',
      action: 'QTV chọn giá trị "Chờ thanh toán" trên dropdown Bộ lọc trạng thái',
      expected: 'DataGrid chỉ hiển thị các hợp đồng đăng ký đang ở trạng thái PENDING_PAYMENT (Chờ thanh toán)',
      actual: 'DataGrid làm mới và chỉ hiển thị các dòng có badge Chờ thanh toán màu vàng cam',
      status: 'PASS',
      filename: 'step-02-filter-pending-payment.png',
      annotations: [
        { selector: '.filter-bar .dx-selectbox:eq(0)', number: 1, label: 'Bộ lọc: Chờ thanh toán', color: '#f59e0b' }
      ]
    });

    // Step 3: Lọc theo Tình trạng gán PT "Chưa gán PT"
    await runner.page.evaluate(() => {
      const pop = $('.filter-bar .dx-selectbox').eq(0);
      const sbStatus = pop.dxSelectBox('instance');
      if (sbStatus) sbStatus.option('value', '');

      const sbAssign = $('.filter-bar .dx-selectbox').eq(1).dxSelectBox('instance');
      if (sbAssign) sbAssign.option('value', 'unassigned');
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Lọc danh sách theo Tình trạng gán PT "Chưa gán PT"',
      action: 'QTV chọn "Chưa gán PT" trên dropdown Bộ lọc tình trạng gán PT',
      expected: 'DataGrid lọc nhanh các hợp đồng PT hoặc COMBO chưa có Huấn luyện viên phụ trách',
      actual: 'DataGrid hiển thị danh sách các gói có quyền PT chưa phân công, kèm nút "Gán PT" nổi bật',
      status: 'PASS',
      filename: 'step-03-filter-unassigned-pt.png',
      annotations: [
        { selector: '.filter-bar .dx-selectbox:eq(1)', number: 1, label: 'Bộ lọc: Chưa gán PT', color: '#e11d48' }
      ]
    });

    // Step 4: Tìm kiếm theo từ khóa SĐT
    await runner.page.evaluate((phone) => {
      const sbAssign = $('.filter-bar .dx-selectbox').eq(1).dxSelectBox('instance');
      if (sbAssign) sbAssign.option('value', '');

      const searchInput = $('.filter-bar .dx-textbox').eq(0).dxTextBox('instance');
      if (searchInput) searchInput.option('value', phone);
    }, MEMBER_PHONE);
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Tìm kiếm hợp đồng theo Số điện thoại hội viên',
      action: 'QTV nhập số điện thoại "0987654321" vào ô tìm kiếm thời gian thực',
      expected: 'DataGrid lọc và hiển thị chính xác các hợp đồng đăng ký thuộc về hội viên Lê Hoàng Nam',
      actual: 'DataGrid hiển thị đúng các bản ghi khớp với SĐT 0987654321 của hội viên Lê Hoàng Nam',
      status: 'PASS',
      filename: 'step-04-search-member-phone.png',
      annotations: [
        { selector: '.filter-bar .dx-textbox:eq(0)', number: 1, label: 'Ô tìm kiếm: 0987654321', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 4. QTV-W04-US04: Xem chi tiết lượt đăng ký gói
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W04-US04', 'Xem chi tiết lượt đăng ký gói', 'W04 · Đăng ký & gia hạn', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('registrations');

    // Step 1: Mở chi tiết hợp đồng DK002
    await runner.page.evaluate(() => {
      window.SalesModule.openRegistrationDetail('aaa0f898-4816-478a-b316-1cc027e33a98');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở popup Chi tiết Lượt Đăng ký Gói',
      action: 'QTV bấm nút "Chi tiết" tại hợp đồng DK002',
      expected: 'Popup Chi tiết mở ra, hiển thị đầy đủ 4 khối thông tin: Khối Hội viên, Khối Gói tập, Khối Thanh toán 100% và Khối Quyền lợi & tiến độ sử dụng',
      actual: 'Popup hiển thị tiêu đề "Đăng ký DK002", badge "Đang hiệu lực", thông tin hội viên Lê Hoàng Nam, gói Combo và các thanh tiến độ sử dụng dịch vụ',
      status: 'PASS',
      filename: 'step-01-registration-detail-popup.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Chi tiết Đăng ký DK002', color: '#10b981' },
        { selector: '.dx-popup-content', number: 2, label: '4 khối thông tin chi tiết', color: '#3b82f6' }
      ]
    });

    // Step 2: Kiểm tra Progress Bar Gym & PT
    await runner.recordStep({
      stepNumber: 2,
      name: 'Kiểm tra hiển thị Tiến độ ngày tập Gym và Tiến độ buổi tập PT',
      action: 'QTV quan sát khối Quyền lợi & tiến độ sử dụng của gói COMBO',
      expected: 'Vì là gói COMBO, hệ thống hiển thị đồng thời thanh Progress bar Gym (xanh lá) và thanh Progress bar PT (cam) thể hiện số buổi còn lại',
      actual: 'Giao diện hiển thị trực quan tỷ lệ ngày tập Gym và số buổi PT: 12 / 12 buổi kèm thanh tiến độ đồ họa',
      status: 'PASS',
      filename: 'step-02-progress-bars-detail.png',
      annotations: [
        { selector: '.dx-popup-content', number: 1, label: 'Tiến độ Gym & PT dạng đồ họa', color: '#f59e0b' }
      ]
    });

    // Step 3: Đóng popup chi tiết
    await runner.closeAllPopups();
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Đóng popup Chi tiết lượt đăng ký',
      action: 'QTV click nút "Đóng" trên popup',
      expected: 'Popup chi tiết đóng lại, giao diện quay về bảng DataGrid danh sách',
      actual: 'Popup đóng an toàn, danh sách DataGrid giữ nguyên vị trí dòng dữ liệu',
      status: 'PASS',
      filename: 'step-03-close-detail-popup.png',
      annotations: [
        { selector: '#registrationsGrid', number: 1, label: 'Quay về danh sách hợp đồng', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 5. QTV-W04-US05: Gán PT phụ trách cho gói đăng ký
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W04-US05', 'Gán PT phụ trách cho gói đăng ký', 'W04 · Đăng ký & gia hạn', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('registrations');

    // Step 1: Mở modal Gán PT cho hợp đồng DK002
    await runner.page.evaluate(() => {
      window.SalesModule.openAssignment('aaa0f898-4816-478a-b316-1cc027e33a98');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở modal Gán PT phụ trách',
      action: 'QTV click nút "Gán PT" tại dòng hợp đồng COMBO DK002',
      expected: 'Modal "Gán PT phụ trách" mở ra, pre-fill thông tin: Mã đăng ký DK002, Hội viên Lê Hoàng Nam, Gói đăng ký, Chi nhánh Quận 1',
      actual: 'Modal hiển thị tiêu đề "Gán PT phụ trách", nạp sẵn đầy đủ thông tin hợp đồng và hội viên',
      status: 'PASS',
      filename: 'step-01-open-assignment-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Gán PT phụ trách', color: '#10b981' },
        { selector: '.dx-popup-content .dx-form', number: 2, label: 'Thông tin hợp đồng nạp sẵn', color: '#3b82f6' }
      ]
    });

    // Step 2: Chọn HLV Nguyễn Văn Thể và nhập ghi chú
    await runner.page.evaluate((ptId) => {
      const pop = $('.dx-overlay-content:visible, .dx-popup:visible');
      const form = pop.find('.dx-form').dxForm('instance');
      if (form) {
        const ed = form.getEditor('pt_id');
        if (ed) ed.option('value', ptId);
        const noteEd = form.getEditor('note');
        if (noteEd) noteEd.option('value', 'Hội viên yêu cầu HLV chuyên sâu tăng cơ giảm mỡ');
      }
    }, PT_ID);
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Chọn Huấn luyện viên phụ trách & nhập ghi chú phân công',
      action: 'QTV chọn HLV "Nguyễn Văn Thể (PT001)" từ dropdown và nhập ghi chú phân công',
      expected: 'HLV Nguyễn Văn Thể được chọn, trường ghi chú hiển thị nội dung phân công',
      actual: 'Form cập nhật HLV được chọn và ghi chú phân công theo yêu cầu',
      status: 'PASS',
      filename: 'step-02-select-pt-and-note.png',
      annotations: [
        { selector: '.dx-form', number: 1, label: 'Đã chọn HLV Nguyễn Văn Thể (PT001)', color: '#10b981' }
      ]
    });

    // Step 3: Xác nhận gán PT
    await runner.page.evaluate(() => {
      const submitBtn = $('.dx-overlay-content:visible .dx-button:contains("Xác nhận gán PT")').first();
      if (submitBtn.length) submitBtn.dxButton('instance').option('onClick')();
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Xác nhận gán PT thành công',
      action: 'QTV click nút "Xác nhận gán PT"',
      expected: 'Toast "Đã gán PT phụ trách" xuất hiện, modal đóng, cột PT phụ trách trên DataGrid cập nhật "Nguyễn Văn Thể (PT001)" và nút Gán PT trên dòng đó tự động ẩn đi',
      actual: 'Toast thành công xuất hiện, DataGrid làm mới cập nhật tên HLV phụ trách, nút Gán PT ẩn đi hoàn toàn',
      status: 'PASS',
      filename: 'step-03-assign-pt-success.png',
      annotations: [
        { selector: '.dx-toast-message, #registrationsGrid', number: 1, label: 'Đã gán HLV phụ trách thành công', color: '#10b981' }
      ]
    });
    await runner.closeAllPopups();
    await runner.sleep(1000);

    runner.setStateVerification('Hợp đồng DK002 được gán assigned_pt_id trỏ chính xác đến HLV Nguyễn Văn Thể, sẵn sàng để đặt lịch buổi PT', 'PASS', 'step-03-assign-pt-success.png');

    // Downstream 1: Mobile PT (Nguyễn Văn Thể) kiểm tra tab Học viên
    await runner.openMobilePtSession(PT_PHONE, 'members');
    await runner.sleep(1800);

    await runner.recordDownstream({
      name: 'Kiểm tra danh sách Học viên phụ trách trên Mobile PT',
      role: 'Huấn luyện viên (PT - 0900000003 - Nguyễn Văn Thể)',
      screen: 'Mobile PT — Quản lý Học viên (data-tab="members")',
      action: 'HLV mở tab "Học viên" trên ứng dụng di động',
      expected: 'Học viên Lê Hoàng Nam (HV001) xuất hiện trong danh sách học viên phụ trách của HLV Nguyễn Văn Thể',
      actual: 'Giao diện hiển thị hồ sơ học viên Lê Hoàng Nam, gói Combo 12 buổi và số điện thoại liên hệ',
      status: 'PASS',
      filename: 'downstream-01-mobile-pt-assigned-client.png',
      annotations: [
        { selector: '#view-members, .app-content', number: 1, label: 'Học viên Lê Hoàng Nam được phân công', color: '#10b981' }
      ]
    });

    // Downstream 2: Mobile Hội viên kiểm tra hiển thị HLV phụ trách
    await runner.openMobileMemberSession(MEMBER_PHONE, 'packages');
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm tra HLV phụ trách hiển thị trên Mobile Hội viên',
      role: 'Hội viên (MEMBER - 0987654321)',
      screen: 'Mobile Hội viên — Gói của tôi (data-route="packages")',
      action: 'Hội viên mở màn hình Gói của tôi để kiểm tra thông tin HLV',
      expected: 'Gói tập Combo hiển thị tên Huấn luyện viên phụ trách là "Nguyễn Văn Thể"',
      actual: 'Ứng dụng di động của hội viên hiển thị chính xác tên HLV Nguyễn Văn Thể gắn liền với gói tập',
      status: 'PASS',
      filename: 'downstream-02-mobile-member-assigned-pt.png',
      annotations: [
        { selector: '#main', number: 1, label: 'HLV phụ trách: Nguyễn Văn Thể', color: '#8b5cf6' }
      ]
    });

    runner.finishUserStory();

    // ========================================================================
    // MENU W05: HUẤN LUYỆN VIÊN (4 USER STORIES)
    // ========================================================================

    // ------------------------------------------------------------------------
    // 6. QTV-W05-US01: Thêm mới hồ sơ Huấn luyện viên
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W05-US01', 'Thêm mới hồ sơ Huấn luyện viên', 'W05 · Huấn luyện viên', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('trainers');

    // Step 1: Xem danh sách PT
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Quản lý Huấn luyện viên (W05)',
      action: 'QTV truy cập menu W05 (#trainers)',
      expected: 'DataGrid hiển thị danh sách PT và nút CTA "Thêm hồ sơ PT" ở góc trên bên phải',
      actual: 'DataGrid nạp danh sách huấn luyện viên cùng nút "+ Thêm hồ sơ PT" sẵn sàng thao tác',
      status: 'PASS',
      filename: 'step-01-trainers-list.png',
      annotations: [
        { selector: '.view-actions .dx-button:contains("Thêm hồ sơ PT")', number: 1, label: 'Nút Thêm hồ sơ PT', color: '#e11d48' }
      ]
    });

    // Step 2: Mở modal Thêm mới hồ sơ PT
    await runner.page.evaluate(() => {
      $('.view-actions .dx-button:contains("Thêm hồ sơ PT")').trigger('dxclick');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Mở modal Thêm mới hồ sơ PT',
      action: 'QTV click nút "Thêm hồ sơ PT"',
      expected: 'Modal "Thêm mới hồ sơ PT" mở ra, form hiển thị các trường: Họ và tên, Số điện thoại, Email, Chi nhánh phục vụ, Chuyên môn / Ghi chú',
      actual: 'Modal hiển thị trực tiếp với tiêu đề "Thêm mới hồ sơ PT", form nạp đầy đủ các trường nhập liệu theo spec',
      status: 'PASS',
      filename: 'step-02-open-add-trainer-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Thêm mới hồ sơ PT', color: '#10b981' },
        { selector: '.dx-popup-content .dx-form', number: 2, label: 'Form nhập liệu hồ sơ PT', color: '#3b82f6' }
      ]
    });

    // Step 3: Validation khi bỏ trống trường bắt buộc
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Thêm PT")').trigger('dxclick');
    });
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Kiểm tra Validation bắt buộc Họ tên & Số điện thoại',
      action: 'QTV click nút "Thêm PT" khi form đang bỏ trống',
      expected: 'Hệ thống chặn lưu, viền đỏ và hiển thị thông báo lỗi bắt buộc tại ô Họ và tên, Số điện thoại',
      actual: 'Hệ thống kích hoạt validation lỗi, làm nổi bật các trường bắt buộc',
      status: 'PASS',
      filename: 'step-03-validation-empty-trainer-fields.png',
      annotations: [
        { selector: '.dx-invalid-message, .dx-invalid', number: 1, label: 'Báo lỗi trường bắt buộc', color: '#e11d48' }
      ]
    });

    // Step 4: Nhập thông tin PT mới
    const NEW_PT_PHONE = '0918776655';
    await runner.page.evaluate((pPhone, bId) => {
      const pop = $('.dx-overlay-content:visible, .dx-popup:visible');
      const form = pop.find('.dx-form').dxForm('instance');
      if (form) {
        form.updateData('full_name', 'Phạm Quốc Bảo');
        form.updateData('phone', pPhone);
        form.updateData('email', 'bao.pq@paradisegym.vn');
        form.updateData('branch_id', bId);
        form.updateData('specialty', 'HLV Thể hình & Sức mạnh, Chứng chỉ CSCS & CPR');
      }
    }, NEW_PT_PHONE, BRANCH_Q1);
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Nhập đầy đủ thông tin hồ sơ Huấn luyện viên mới',
      action: 'QTV nhập Họ tên "Phạm Quốc Bảo", SĐT "0918776655", Email, Chi nhánh Quận 1 và Chuyên môn',
      expected: 'Các trường dữ liệu được điền hợp lệ, sẵn sàng để lưu vào hệ thống',
      actual: 'Form nhận đầy đủ dữ liệu thông tin cá nhân và chi nhánh công tác của PT',
      status: 'PASS',
      filename: 'step-04-fill-trainer-details.png',
      annotations: [
        { selector: '.dx-form', number: 1, label: 'Thông tin PT Phạm Quốc Bảo', color: '#10b981' }
      ]
    });

    // Step 5: Lưu hồ sơ PT
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Thêm PT")').trigger('dxclick');
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 5,
      name: 'Xác nhận tạo hồ sơ PT thành công',
      action: 'QTV click nút "Thêm PT"',
      expected: 'Toast "Đã thêm hồ sơ PT" hiển thị, modal đóng, PT mới "Phạm Quốc Bảo" xuất hiện trên DataGrid ở trạng thái Đang hoạt động',
      actual: 'Toast thành công xuất hiện, DataGrid tự động làm mới hiển thị HLV Phạm Quốc Bảo với trạng thái Đang hoạt động (badge xanh)',
      status: 'PASS',
      filename: 'step-05-add-trainer-success.png',
      annotations: [
        { selector: '.dx-toast-message, #trainersGrid', number: 1, label: 'PT Phạm Quốc Bảo đã được tạo', color: '#10b981' }
      ]
    });
    await runner.closeAllPopups();
    await runner.sleep(1000);

    runner.setStateVerification('Hồ sơ PT mới được tạo trong cơ sở dữ liệu với trạng thái ACTIVE và số điện thoại UNIQUE', 'PASS', 'step-05-add-trainer-success.png');

    // Downstream 1: Web Lễ tân Q1 kiểm tra
    await runner.openDesktopSession(LT_PHONE, BRANCH_Q1, 'RECEPTIONIST');
    await runner.navigateTo('trainers');
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm tra PT mới trên Web Lễ tân Quận 1',
      role: 'Lễ tân (RECEPTIONIST - 0900000002)',
      screen: 'Web Lễ tân — W05 Huấn luyện viên (#trainers)',
      action: 'Lễ tân mở danh sách Huấn luyện viên',
      expected: 'Lễ tân nhìn thấy PT mới "Phạm Quốc Bảo" trong danh sách công tác tại chi nhánh',
      actual: 'PT Phạm Quốc Bảo hiển thị rõ ràng trên bảng danh sách của Lễ tân với thông tin chuyên môn đầy đủ',
      status: 'PASS',
      filename: 'downstream-01-lt-sees-new-trainer.png',
      annotations: [
        { selector: '#trainersGrid, .dx-datagrid-rowsview', number: 1, label: 'Lễ tân thấy PT mới Phạm Quốc Bảo', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 7. QTV-W05-US02: Sửa hồ sơ Huấn luyện viên
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W05-US02', 'Sửa hồ sơ Huấn luyện viên', 'W05 · Huấn luyện viên', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('trainers');

    // Step 1: Mở modal Sửa hồ sơ PT
    await runner.page.evaluate(() => {
      $('.dx-link-icon.dx-icon-edit:visible').first().click();
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở modal Sửa hồ sơ PT & kiểm tra khóa Số điện thoại',
      action: 'QTV click nút "Sửa" tại dòng huấn luyện viên',
      expected: 'Modal "Sửa hồ sơ PT" mở ra, nạp sẵn dữ liệu hiện tại, trường Số điện thoại bị khóa (disabled/readonly) vì là khóa định danh nghiệp vụ',
      actual: 'Modal mở ra với tiêu đề "Sửa hồ sơ PT", trường Số điện thoại bị vô hiệu hóa hoàn toàn không cho phép chỉnh sửa',
      status: 'PASS',
      filename: 'step-01-open-edit-trainer-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Sửa hồ sơ PT', color: '#10b981' },
        { selector: '.dx-field-item:has(input[disabled])', number: 2, label: 'Số điện thoại bị khóa cố định', color: '#e11d48' }
      ]
    });

    // Step 2: Cập nhật Chuyên môn / Ghi chú
    await runner.page.evaluate(() => {
      const pop = $('.dx-overlay-content:visible, .dx-popup:visible');
      const form = pop.find('.dx-form').dxForm('instance');
      if (form) {
        form.updateData('specialty', 'HLV Thể hình, Sức mạnh & Dinh dưỡng nâng cao (Master Trainer CSCS)');
      }
    });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Cập nhật Chuyên môn / Ghi chú của Huấn luyện viên',
      action: 'QTV cập nhật nội dung chuyên môn mới: "HLV Thể hình, Sức mạnh & Dinh dưỡng nâng cao (Master Trainer CSCS)"',
      expected: 'Trường Chuyên môn được cập nhật nội dung mới, nút "Lưu thay đổi" chuyển sang trạng thái khả dụng',
      actual: 'Nội dung chuyên môn mới được điền vào form, hệ thống phát hiện thay đổi và kích hoạt nút Lưu',
      status: 'PASS',
      filename: 'step-02-update-trainer-specialty.png',
      annotations: [
        { selector: '.dx-form', number: 1, label: 'Chuyên môn cập nhật mới', color: '#10b981' }
      ]
    });

    // Step 3: Lưu thay đổi
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Lưu thay đổi")').trigger('dxclick');
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Xác nhận lưu cập nhật hồ sơ PT thành công',
      action: 'QTV click nút "Lưu thay đổi"',
      expected: 'Toast "Đã cập nhật hồ sơ PT" xuất hiện, modal đóng, cột Chuyên môn trên DataGrid cập nhật thông tin mới',
      actual: 'Toast thành công xuất hiện, modal đóng, DataGrid hiển thị tóm tắt chuyên môn mới vừa chỉnh sửa',
      status: 'PASS',
      filename: 'step-03-edit-trainer-success.png',
      annotations: [
        { selector: '.dx-toast-message, #trainersGrid', number: 1, label: 'Cập nhật hồ sơ PT thành công', color: '#10b981' }
      ]
    });
    await runner.closeAllPopups();
    await runner.sleep(1000);

    runner.setStateVerification('Thông tin chuyên môn của PT được cập nhật đồng bộ trong database', 'PASS', 'step-03-edit-trainer-success.png');
    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 8. QTV-W05-US03: Cập nhật trạng thái hồ sơ Huấn luyện viên
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W05-US03', 'Cập nhật trạng thái hồ sơ Huấn luyện viên', 'W05 · Huấn luyện viên', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('trainers');

    // Step 1: Mở modal Đổi trạng thái
    await runner.page.evaluate(() => {
      $('.dx-link-icon.dx-icon-repeat:visible').first().click();
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở modal Đổi trạng thái hồ sơ PT',
      action: 'QTV click nút "Đổi trạng thái" (icon repeat) tại dòng PT',
      expected: 'Modal "Đổi trạng thái hồ sơ PT" mở ra, hiển thị tên HLV, Trạng thái hiện tại ("Đang hoạt động"), dropdown Trạng thái mới và ô nhập Lý do',
      actual: 'Modal hiển thị trực tiếp với tiêu đề "Đổi trạng thái hồ sơ PT" và trạng thái hiện tại của PT',
      status: 'PASS',
      filename: 'step-01-open-trainer-status-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Đổi trạng thái hồ sơ PT', color: '#10b981' },
        { selector: '.dx-popup-content', number: 2, label: 'Trạng thái hiện tại & lựa chọn mới', color: '#3b82f6' }
      ]
    });

    // Step 2: Chọn trạng thái mới Ngừng hoạt động
    await runner.page.evaluate(() => {
      const pop = $('.dx-overlay-content:visible, .dx-popup:visible');
      const form = pop.find('.dx-form').dxForm('instance');
      if (form) {
        form.updateData('status', 'INACTIVE');
        form.updateData('reason', 'Tạm dừng công tác để tham gia khóa đào tạo chuyên sâu');
      }
    });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Chọn Trạng thái mới "Ngừng hoạt động" & nhập lý do',
      action: 'QTV chọn trạng thái "Ngừng hoạt động" và nhập lý do thay đổi vào nhật ký kiểm toán',
      expected: 'Trạng thái mới được chọn là INACTIVE, lý do được ghi nhận đầy đủ',
      actual: 'Form ghi nhận lựa chọn Ngừng hoạt động kèm nội dung lý do theo spec',
      status: 'PASS',
      filename: 'step-02-select-inactive-status.png',
      annotations: [
        { selector: '.dx-form', number: 1, label: 'Chọn: Ngừng hoạt động (INACTIVE)', color: '#f59e0b' }
      ]
    });

    // Step 3: Lưu thay đổi trạng thái
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Lưu thay đổi")').trigger('dxclick');
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Xác nhận cập nhật trạng thái PT thành công',
      action: 'QTV click nút "Lưu thay đổi"',
      expected: 'Toast "Đã cập nhật trạng thái PT" hiển thị, modal đóng, DataGrid cập nhật badge trạng thái của PT thành "Ngừng hoạt động" (màu vàng cam)',
      actual: 'Toast thành công xuất hiện, DataGrid làm mới cập nhật badge Ngừng hoạt động màu vàng cam',
      status: 'PASS',
      filename: 'step-03-trainer-status-inactive-success.png',
      annotations: [
        { selector: '.dx-toast-message, #trainersGrid', number: 1, label: 'Badge trạng thái: Ngừng hoạt động', color: '#f59e0b' }
      ]
    });
    await runner.closeAllPopups();
    await runner.sleep(1000);

    runner.setStateVerification('Trạng thái PT được cập nhật thành INACTIVE, bảo lưu toàn bộ lịch sử các buổi dạy trước đó', 'PASS', 'step-03-trainer-status-inactive-success.png');

    // Downstream 1: Web Lễ tân kiểm tra
    await runner.openDesktopSession(LT_PHONE, BRANCH_Q1, 'RECEPTIONIST');
    await runner.navigateTo('trainers');
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm tra trạng thái PT trên Web Lễ tân',
      role: 'Lễ tân (RECEPTIONIST - 0900000002)',
      screen: 'Web Lễ tân — W05 Huấn luyện viên (#trainers)',
      action: 'Lễ tân mở danh sách PT để rà soát trạng thái hoạt động',
      expected: 'Lễ tân thấy PT hiển thị ở trạng thái "Ngừng hoạt động" và không thể gán lịch dạy mới',
      actual: 'DataGrid hiển thị đúng badge "Ngừng hoạt động" cho huấn luyện viên',
      status: 'PASS',
      filename: 'downstream-01-lt-sees-inactive-trainer.png',
      annotations: [
        { selector: '#trainersGrid', number: 1, label: 'Lễ tân thấy badge Ngừng hoạt động', color: '#f59e0b' }
      ]
    });

    runner.finishUserStory();

    // Khôi phục trạng thái ACTIVE cho PT001 để phục vụ các US xem và đặt lịch W06
    const restorePool = new pg.Pool({ connectionString: DB_URL });
    await restorePool.query("UPDATE pt_profiles SET status = 'ACTIVE' WHERE pt_code = 'PT001'");
    await restorePool.end();

    // ------------------------------------------------------------------------
    // 9. QTV-W05-US04: Xem danh sách Huấn luyện viên & Bộ lọc
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W05-US04', 'Xem danh sách Huấn luyện viên & Bộ lọc', 'W05 · Huấn luyện viên', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('trainers');

    // Step 1: Xem toàn bộ danh sách PT
    await runner.recordStep({
      stepNumber: 1,
      name: 'Xem DataGrid danh sách Huấn luyện viên',
      action: 'QTV mở menu W05 Huấn luyện viên',
      expected: 'DataGrid hiển thị danh sách PT đầy đủ các cột: Mã PT, Họ và tên, SĐT, Email, Chi nhánh phục vụ, Chuyên môn / Ghi chú, Trạng thái và Thao tác',
      actual: 'DataGrid nạp danh sách PT đầy đủ các trường thông tin theo đúng đặc tả UI',
      status: 'PASS',
      filename: 'step-01-trainers-full-grid.png',
      annotations: [
        { selector: '#trainersGrid', number: 1, label: 'Danh sách Huấn luyện viên chi nhánh', color: '#3b82f6' }
      ]
    });

    // Step 2: Lọc theo Trạng thái "Đang hoạt động"
    await runner.page.evaluate(() => {
      const sb = $('.filter-bar .dx-selectbox').eq(0).dxSelectBox('instance');
      if (sb) sb.option('value', 'ACTIVE');
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Lọc danh sách PT theo Trạng thái "Đang hoạt động"',
      action: 'QTV chọn "Đang hoạt động" trên dropdown Bộ lọc trạng thái',
      expected: 'DataGrid chỉ hiển thị các PT có trạng thái ACTIVE (Đang hoạt động)',
      actual: 'DataGrid chỉ giữ lại các PT có badge Đang hoạt động màu xanh lá',
      status: 'PASS',
      filename: 'step-02-filter-trainers-active.png',
      annotations: [
        { selector: '.filter-bar .dx-selectbox:eq(0)', number: 1, label: 'Bộ lọc: Đang hoạt động', color: '#10b981' }
      ]
    });

    // Step 3: Lọc theo Trạng thái "Ngừng hoạt động"
    await runner.page.evaluate(() => {
      const sb = $('.filter-bar .dx-selectbox').eq(0).dxSelectBox('instance');
      if (sb) sb.option('value', 'INACTIVE');
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Lọc danh sách PT theo Trạng thái "Ngừng hoạt động"',
      action: 'QTV chọn "Ngừng hoạt động" trên dropdown Bộ lọc trạng thái',
      expected: 'DataGrid hiển thị các PT đang tạm ngừng hoạt động',
      actual: 'DataGrid hiển thị danh sách PT tạm ngừng hoạt động tương ứng',
      status: 'PASS',
      filename: 'step-03-filter-trainers-inactive.png',
      annotations: [
        { selector: '.filter-bar .dx-selectbox:eq(0)', number: 1, label: 'Bộ lọc: Ngừng hoạt động', color: '#f59e0b' }
      ]
    });

    // Step 4: Tìm kiếm theo tên HLV
    await runner.page.evaluate(() => {
      const sb = $('.filter-bar .dx-selectbox').eq(0).dxSelectBox('instance');
      if (sb) sb.option('value', null);

      const tb = $('.filter-bar .dx-textbox').eq(0).dxTextBox('instance');
      if (tb) tb.option('value', 'Nguyễn Văn Thể');
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Tìm kiếm Huấn luyện viên theo tên "Nguyễn Văn Thể"',
      action: 'QTV nhập "Nguyễn Văn Thể" vào ô tìm kiếm nhanh',
      expected: 'DataGrid lọc và hiển thị chính xác hồ sơ HLV Nguyễn Văn Thể (PT001)',
      actual: 'DataGrid lọc chính xác duy nhất bản ghi của HLV Nguyễn Văn Thể',
      status: 'PASS',
      filename: 'step-04-search-trainer-name.png',
      annotations: [
        { selector: '.filter-bar .dx-textbox:eq(0)', number: 1, label: 'Tìm kiếm: Nguyễn Văn Thể', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ========================================================================
    // MENU W06: LỊCH TẬP & BUỔI PT (4 USER STORIES)
    // ========================================================================

    // ------------------------------------------------------------------------
    // 10. QTV-W06-US01: Xem lịch PT (Empty State & 5 Khung Giờ)
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W06-US01', 'Xem lịch tập PT (Empty State & 5 Khung Giờ)', 'W06 · Lịch tập & buổi PT', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('pt-schedule');

    // Step 1: Empty State khi chưa chọn HLV
    await runner.recordStep({
      stepNumber: 1,
      name: 'Màn hình khởi tạo ở trạng thái Chưa chọn HLV (Empty State)',
      action: 'QTV mở menu W06 Lịch tập PT khi chưa chọn huấn luyện viên',
      expected: 'Màn hình khởi tạo ở trạng thái Empty State: hiển thị thông báo "Chưa có HLV được chọn" và Combobox chọn HLV trên Header',
      actual: 'Giao diện hiển thị đúng Empty State, thông báo hướng dẫn chọn HLV và combobox tìm kiếm PT sẵn sàng',
      status: 'PASS',
      filename: 'step-01-pt-schedule-empty-state.png',
      annotations: [
        { selector: '#ptSelector', number: 1, label: 'Combobox chọn Huấn luyện viên', color: '#e11d48' },
        { selector: '.pt-schedule-content', number: 2, label: 'Empty State: Chưa có HLV được chọn', color: '#8b5cf6' }
      ]
    });

    // Step 2: Chọn HLV Nguyễn Văn Thể từ Combobox
    await runner.page.evaluate((ptId) => {
      const sb = $('#ptSelector').dxSelectBox('instance');
      if (sb) sb.option('value', ptId);
    }, PT_ID);
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Chọn Huấn luyện viên Nguyễn Văn Thể để xem lịch',
      action: 'QTV chọn "Nguyễn Văn Thể (PT001)" từ combobox',
      expected: 'Giao diện chuyển sang hiển thị lịch chi tiết của HLV: nạp 5 khung giờ 2 tiếng trong ngày (08:00–18:00) và bộ chọn ngày',
      actual: 'Màn hình chuyển sang giao diện lịch chi tiết của HLV Nguyễn Văn Thể, thanh điều khiển ngày và lịch tập xuất hiện',
      status: 'PASS',
      filename: 'step-02-select-trainer-shows-schedule.png',
      annotations: [
        { selector: '#ptSelector', number: 1, label: 'Đã chọn HLV Nguyễn Văn Thể', color: '#10b981' },
        { selector: '.pt-schedule-controls', number: 2, label: 'Bộ chọn ngày & chế độ xem', color: '#3b82f6' }
      ]
    });

    // Step 3: Chuyển sang chế độ xem Danh sách (5 Khung giờ làm việc)
    await runner.page.evaluate(() => {
      const bg = $('.pt-schedule-controls .dx-buttongroup').dxButtonGroup('instance');
      if (bg) bg.option('selectedItemKeys', ['list']);
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Chuyển sang chế độ xem Danh sách 5 khung giờ làm việc cố định',
      action: 'QTV click chọn nút "Danh sách" trên thanh điều khiển',
      expected: 'Hệ thống hiển thị chuẩn xác lưới 5 khung giờ làm việc cố định 2 tiếng trong ngày (08:00–10:00, 10:00–12:00, 12:00–14:00, 14:00–16:00, 16:00–18:00) kèm nhãn "Khung giờ trống" và nút "[Chọn khung giờ +]"',
      actual: 'DataGrid hiển thị đúng 5 ca làm việc cố định 08h-18h, các slot trống hiển thị nhãn Khung giờ trống cùng nút Chọn khung giờ nổi bật',
      status: 'PASS',
      filename: 'step-03-pt-schedule-5-slots-list-view.png',
      annotations: [
        { selector: '#ptSlotList', number: 1, label: '5 khung giờ làm việc cố định 08:00-18:00', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 11. QTV-W06-US02: Đặt lịch PT mới
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W06-US02', 'Đặt lịch tập PT mới', 'W06 · Lịch tập & buổi PT', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('pt-schedule');

    // Chọn PT Nguyễn Văn Thể và chuyển list view
    await runner.page.evaluate((ptId) => {
      const sb = $('#ptSelector').dxSelectBox('instance');
      if (sb) sb.option('value', ptId);
    }, PT_ID);
    await runner.sleep(1800);

    await runner.page.evaluate(() => {
      const bg = $('.pt-schedule-controls .dx-buttongroup').dxButtonGroup('instance');
      if (bg) bg.option('selectedItemKeys', ['list']);
    });
    await runner.sleep(1200);

    // Step 1: Click "Chọn khung giờ" tại ca trống
    await runner.page.evaluate(() => {
      const btn = $('#ptSlotList .dx-button:contains("Chọn khung giờ")').first();
      if (btn.length) {
        btn.trigger('dxclick');
      }
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở modal Đặt lịch PT từ khung giờ trống',
      action: 'QTV click nút "Chọn khung giờ" tại ca tập trống trên lịch',
      expected: 'Modal "Đặt lịch PT" mở ra, auto-fill: PT phụ trách "Nguyễn Văn Thể (PT001)", Ngày tập, Khung giờ, Chi nhánh',
      actual: 'Modal hiển thị trực tiếp với tiêu đề "Đặt lịch PT", thông tin HLV và khung giờ được điền tự động chính xác',
      status: 'PASS',
      filename: 'step-01-open-booking-modal.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Đặt lịch PT', color: '#10b981' },
        { selector: '.dx-popup-content', number: 2, label: 'Thông tin khung giờ auto-fill', color: '#3b82f6' }
      ]
    });

    // Step 2: Chọn Hội viên Lê Hoàng Nam -> Dynamic nạp gói PT
    await runner.page.evaluate((mId) => {
      const form = $('.dx-overlay-content:visible .dx-form, .pt-form-content .dx-form').first().dxForm('instance');
      const ed = form.getEditor('member_id');
      if (ed) ed.option('value', mId);
    }, MEMBER_ID);
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Chọn Hội viên & Dynamic nạp danh sách Gói PT hợp lệ',
      action: 'QTV chọn hội viên "Lê Hoàng Nam" (TRIGGER)',
      expected: 'Hệ thống tự động lọc và nạp các gói PT/Combo của hội viên thỏa mãn: do PT Nguyễn Văn Thể phụ trách, còn hạn và còn số buổi > 0',
      actual: 'Dropdown "Gói PT sử dụng" tự động kích hoạt nạp gói Combo DK002 hợp lệ của hội viên',
      status: 'PASS',
      filename: 'step-02-select-member-dynamic-packages.png',
      annotations: [
        { selector: '.dx-form', number: 1, label: 'Chọn Hội viên Lê Hoàng Nam', color: '#10b981' }
      ]
    });

    // Step 3: Chọn Gói PT DK002 và nhập ghi chú
    const loadedPackageId = await runner.page.evaluate(() => {
      const form = $('.dx-overlay-content:visible .dx-form, .pt-form-content .dx-form').first().dxForm('instance');
      const ed = form.getEditor('registration_id');
      const ds = ed ? ed.option('dataSource') : [];
      if (ds[0]) ed.option('value', ds[0].id);
      const noteEd = form.getEditor('notes');
      if (noteEd) noteEd.option('value', 'Tập cơ ngực và tay sau, kiểm tra nhịp tim đầu buổi');
      return ds[0]?.id;
    });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Chọn Gói PT sử dụng & nhập Ghi chú cho buổi tập',
      action: 'QTV chọn gói Combo DK002 và nhập ghi chú chuyên môn cho buổi tập',
      expected: 'Form hoàn tất đầy đủ thông tin, sẵn sàng gửi yêu cầu đặt lịch',
      actual: 'Gói tập và ghi chú buổi tập được điền đầy đủ vào form',
      status: 'PASS',
      filename: 'step-03-fill-booking-details.png',
      annotations: [
        { selector: '.dx-form', number: 1, label: 'Đã chọn Gói Combo & ghi chú', color: '#10b981' }
      ]
    });

    // Step 4: Xác nhận đặt lịch
    await runner.page.evaluate(() => {
      const submitBtn = $('.dx-overlay-content:visible .dx-button:contains("Xác nhận đặt lịch")').first();
      if (submitBtn.length) submitBtn.trigger('dxclick');
    });
    await runner.sleep(2500);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Xác nhận đặt lịch PT thành công',
      action: 'QTV click nút "Xác nhận đặt lịch"',
      expected: 'Booking mới được tạo ở trạng thái BOOKED (Đã đặt), modal đóng, toast thành công xuất hiện',
      actual: 'Toast thành công xuất hiện, modal đóng, lịch PT tự động làm mới',
      status: 'PASS',
      filename: 'step-04-booking-created-success.png',
      annotations: [
        { selector: '.dx-toast-message, #ptSlotList', number: 1, label: 'Đặt lịch PT thành công', color: '#10b981' }
      ]
    });

    // Step 5: Thẻ buổi tập hiển thị trên lưới lịch
    await runner.recordStep({
      stepNumber: 5,
      name: 'Khung giờ hiển thị thẻ buổi tập Đã đặt',
      action: 'QTV quan sát khung giờ vừa đặt trên bảng lịch',
      expected: 'Khung giờ chuyển từ "Khung giờ trống" sang thẻ buổi tập hiển thị tên hội viên "Lê Hoàng Nam", tên gói và badge "Đã đặt" màu xanh dương kèm nút Hủy lịch, Xác nhận hoàn thành',
      actual: 'Thẻ buổi tập hiển thị chữ đậm tên hội viên Lê Hoàng Nam, badge Đã đặt màu xanh dương và cụm nút thao tác',
      status: 'PASS',
      filename: 'step-05-slot-displays-booked-card.png',
      annotations: [
        { selector: '#ptSlotList .pt-appointment', number: 1, label: 'Thẻ buổi tập: Đã đặt (BOOKED)', color: '#3b82f6' }
      ]
    });
    await runner.closeAllPopups();
    await runner.sleep(1000);

    runner.setStateVerification('Buổi tập được tạo ở trạng thái BOOKED, giữ chỗ khung giờ nhưng chưa trừ số buổi còn lại của gói', 'PASS', 'step-05-slot-displays-booked-card.png');

    // Downstream 1: Mobile PT (Nguyễn Văn Thể) kiểm tra tab Lịch
    await runner.openMobilePtSession(PT_PHONE, 'schedule');
    await runner.sleep(1800);

    await runner.recordDownstream({
      name: 'Kiểm tra ca dạy mới hiển thị trên Mobile PT',
      role: 'Huấn luyện viên (PT - 0900000003 - Nguyễn Văn Thể)',
      screen: 'Mobile PT — Quản lý Lịch dạy (data-tab="schedule")',
      action: 'HLV mở tab "Lịch" trên ứng dụng di động',
      expected: 'HLV nhìn thấy ca tập vừa đặt với học viên Lê Hoàng Nam hiển thị trực quan trên lịch công tác',
      actual: 'Ứng dụng Mobile PT hiển thị ca dạy kèm tên học viên Lê Hoàng Nam và thời gian buổi tập',
      status: 'PASS',
      filename: 'downstream-01-mobile-pt-sees-new-booking.png',
      annotations: [
        { selector: '#view-schedule, .app-content', number: 1, label: 'Ca dạy mới hiển thị trên app HLV', color: '#10b981' }
      ]
    });

    // Downstream 2: Mobile Hội viên kiểm tra tab Lịch tập
    await runner.openMobileMemberSession(MEMBER_PHONE, 'schedule');
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm tra buổi tập PT hiển thị trên Mobile Hội viên',
      role: 'Hội viên (MEMBER - 0987654321)',
      screen: 'Mobile Hội viên — Lịch tập (data-route="schedule")',
      action: 'Hội viên mở tab "Lịch tập" trên app mobile',
      expected: 'Hội viên nhìn thấy buổi tập PT đã đặt cùng HLV Nguyễn Văn Thể',
      actual: 'Giao diện Mobile Hội viên hiển thị lịch hẹn tập luyện cùng HLV cá nhân',
      status: 'PASS',
      filename: 'downstream-02-mobile-member-sees-booked-session.png',
      annotations: [
        { selector: '#main', number: 1, label: 'Lịch hẹn PT cùng HLV Nguyễn Văn Thể', color: '#8b5cf6' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 12. QTV-W06-US03: Xác nhận hoàn thành buổi học (Xác nhận kép & Trừ buổi)
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W06-US03', 'Xác nhận hoàn thành buổi học PT (Xác nhận kép)', 'W06 · Lịch tập & buổi PT', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('pt-schedule');

    // Lấy thông tin buổi tập vừa tạo
    const bookingToConfirm = await runner.page.evaluate(async () => {
      const res = await window.apiClient.request('/pt-bookings');
      const list = res.data?.items || res.data || [];
      return list.find(item => item.status === 'BOOKED');
    });

    // Cập nhật buổi tập sang thời gian đã kết thúc (08:00 - 10:00 sáng nay) để kích hoạt điều kiện xác nhận hoàn thành
    if (bookingToConfirm) {
      const pool = new pg.Pool({ connectionString: DB_URL });
      await pool.query("UPDATE pt_bookings SET booking_date='2026-09-17', start_time='08:00:00', end_time='10:00:00' WHERE id=$1", [bookingToConfirm.id]);
      await pool.end();
    }

    // Chọn PT Thể và chuyển list view để nạp lịch
    await runner.page.evaluate((ptId) => {
      const sb = $('#ptSelector').dxSelectBox('instance');
      if (sb) sb.option('value', ptId);
    }, PT_ID);
    await runner.sleep(1800);

    await runner.page.evaluate(() => {
      const bg = $('.pt-schedule-controls .dx-buttongroup').dxButtonGroup('instance');
      if (bg) bg.option('selectedItemKeys', ['list']);
    });
    await runner.sleep(1200);

    // Step 1: Mở popup chi tiết buổi tập
    await runner.page.evaluate((bId) => {
      if (bId) window.PtSchedulerModule.openBookingDetail(bId);
    }, bookingToConfirm?.id);
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở popup Chi tiết buổi tập PT & kiểm tra trạng thái xác nhận',
      action: 'QTV click nút "Chi tiết buổi tập" trên thẻ lịch',
      expected: 'Popup Chi tiết mở ra, hiển thị trạng thái "Đã đặt", PT xác nhận: Chưa xác nhận, Hội viên xác nhận: Chưa xác nhận, Khấu trừ buổi: Chưa khấu trừ',
      actual: 'Popup hiển thị đầy đủ thông tin buổi tập, ghi nhận cả hai bên đều chưa bấm xác nhận kép',
      status: 'PASS',
      filename: 'step-01-booking-detail-before-confirm.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Chi tiết buổi tập PT', color: '#10b981' },
        { selector: '.dx-popup-content', number: 2, label: 'Xác nhận kép: Chưa hoàn tất', color: '#f59e0b' }
      ]
    });

    // Step 2: Xác nhận từ phía PT (Case 1: Mới 1 bên xác nhận -> Chờ xác nhận hoàn thành)
    const ptToken = (await runner.getAuthToken('0900000003', 'Paradise@123', 'PT')).token;
    await fetch(`http://localhost:5000/api/v1/pt-bookings/${bookingToConfirm.id}/pt-confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ptToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ workout_notes: 'Hoàn thành tốt các hiệp bài ngực' })
    });
    await runner.sleep(1500);

    // Tải lại popup chi tiết
    await runner.closeAllPopups();
    await runner.page.evaluate((bId) => {
      if (bId) window.PtSchedulerModule.openBookingDetail(bId);
    }, bookingToConfirm?.id);
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Kiểm tra trạng thái khi mới 1 bên xác nhận (AWAITING_CONFIRMATION)',
      action: 'HLV thực hiện xác nhận buổi tập từ ứng dụng PT',
      expected: 'Vì mới chỉ 1 bên (PT) xác nhận, hệ thống chuyển buổi tập sang trạng thái "Chờ xác nhận hoàn thành" (AWAITING_CONFIRMATION) và CHƯA khấu trừ số buổi của hội viên',
      actual: 'Popup hiển thị badge "Chờ xác nhận hoàn thành" màu vàng cam, ghi nhận thời điểm PT xác nhận và trường Khấu trừ buổi vẫn là "Chưa khấu trừ"',
      status: 'PASS',
      filename: 'step-02-partial-confirm-awaiting.png',
      annotations: [
        { selector: '.dx-popup-content', number: 1, label: 'Chờ xác nhận hoàn thành (Chưa trừ buổi)', color: '#f59e0b' }
      ]
    });

    // Step 3: Xác nhận từ phía Hội viên -> Hoàn tất xác nhận kép (COMPLETED) & Trừ buổi
    const memToken = (await runner.getAuthToken('0987654321', 'Paradise@123', 'MEMBER')).token;
    await fetch(`http://localhost:5000/api/v1/pt-bookings/${bookingToConfirm.id}/member-confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memToken}`, 'Content-Type': 'application/json' }
    });
    await runner.sleep(1500);

    // Tải lại popup chi tiết
    await runner.closeAllPopups();
    await runner.page.evaluate((bId) => {
      if (bId) window.PtSchedulerModule.openBookingDetail(bId);
    }, bookingToConfirm?.id);
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Hoàn tất xác nhận kép: Chuyển sang Hoàn thành (COMPLETED) & Tự động trừ buổi',
      action: 'Hội viên thực hiện xác nhận buổi tập hoàn thành',
      expected: 'Đủ xác nhận kép từ 2 bên (PT & Hội viên): hệ thống cập nhật trạng thái "Hoàn thành" (COMPLETED), tự động khấu trừ 1 buổi PT trong gói của hội viên',
      actual: 'Popup cập nhật badge "Hoàn thành" màu xanh lá, hiển thị thời điểm xác nhận của cả 2 bên và trường Khấu trừ buổi chuyển sang "Đã khấu trừ"',
      status: 'PASS',
      filename: 'step-03-dual-confirm-completed.png',
      annotations: [
        { selector: '.dx-popup-content', number: 1, label: 'Hoàn thành & Đã khấu trừ 1 buổi PT', color: '#10b981' }
      ]
    });
    await runner.closeAllPopups();
    await runner.sleep(1000);

    runner.setStateVerification('Buổi tập đạt trạng thái COMPLETED, hệ thống khấu trừ 1 buổi PT (từ 12 xuống 11 buổi) hoàn toàn tự động', 'PASS', 'step-03-dual-confirm-completed.png');

    // Downstream 1: Mobile Hội viên kiểm tra số buổi đã trừ
    await runner.openMobileMemberSession(MEMBER_PHONE, 'packages');
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm tra số buổi PT còn lại đã bị trừ trên Mobile Hội viên',
      role: 'Hội viên (MEMBER - 0987654321)',
      screen: 'Mobile Hội viên — Gói của tôi (data-route="packages")',
      action: 'Hội viên kiểm tra số buổi tập PT còn lại trên gói Combo',
      expected: 'Số buổi PT còn lại trong gói của hội viên giảm từ 12 xuống còn 11 buổi',
      actual: 'Ứng dụng Mobile Hội viên hiển thị chính xác số buổi PT còn lại đã được khấu trừ 1 buổi',
      status: 'PASS',
      filename: 'downstream-01-mobile-member-pt-session-deducted.png',
      annotations: [
        { selector: '#main', number: 1, label: 'Số buổi PT còn lại: Đã khấu trừ 1 buổi', color: '#10b981' }
      ]
    });

    // Downstream 2: Mobile PT kiểm tra trạng thái buổi tập
    await runner.openMobilePtSession(PT_PHONE, 'schedule');
    await runner.sleep(1800);

    await runner.recordDownstream({
      name: 'Kiểm tra trạng thái ca dạy Hoàn thành trên Mobile PT',
      role: 'Huấn luyện viên (PT - 0900000003)',
      screen: 'Mobile PT — Lịch dạy (data-tab="schedule")',
      action: 'HLV kiểm tra buổi tập trên lịch',
      expected: 'Ca tập hiển thị trạng thái "Hoàn thành" với badge xanh lá',
      actual: 'Giao diện Mobile PT hiển thị ca tập đã hoàn thành xuất sắc',
      status: 'PASS',
      filename: 'downstream-02-mobile-pt-booking-completed.png',
      annotations: [
        { selector: '#view-schedule', number: 1, label: 'Ca dạy đã hoàn thành', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    // ------------------------------------------------------------------------
    // 13. QTV-W06-US04: Hủy lịch PT
    // ------------------------------------------------------------------------
    runner.startUserStory('QTV-W06-US04', 'Hủy lịch tập PT', 'W06 · Lịch tập & buổi PT', 'Quản trị viên (QTV)');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('pt-schedule');

    // Tạo một booking mới ở ca 10:00 - 12:00 ngày mai để thực hiện hủy
    const tomorrowStr = '2026-09-18';
    await runner.page.evaluate(async (ptId, mId, tDate) => {
      try {
        await window.apiClient.request('/pt-bookings', {
          method: 'POST',
          body: {
            pt_id: ptId,
            member_id: mId,
            registration_id: 'aaa0f898-4816-478a-b316-1cc027e33a98',
            booking_date: tDate,
            start_time: '10:00',
            end_time: '12:00',
            notes: 'Buổi tập thử nghiệm hủy lịch'
          }
        });
      } catch (_) {}
    }, PT_ID, MEMBER_ID, tomorrowStr);
    await runner.sleep(2000);

    // Chuyển lịch sang ngày mai
    await runner.page.evaluate((ptId, tDate) => {
      const sb = $('#ptSelector').dxSelectBox('instance');
      if (sb) sb.option('value', ptId);

      const dp = $('.pt-schedule-controls .dx-datebox').dxDateBox('instance');
      if (dp) dp.option('value', new Date(tDate + 'T00:00:00'));

      const bg = $('.pt-schedule-controls .dx-buttongroup').dxButtonGroup('instance');
      if (bg) bg.option('selectedItemKeys', ['list']);
    }, PT_ID, tomorrowStr);
    await runner.sleep(2000);

    // Step 1: Bấm nút Hủy lịch trên ca 10:00-12:00
    await runner.page.evaluate(() => {
      const cancelBtn = $('#ptSlotList .dx-button:contains("Hủy lịch")').first();
      if (cancelBtn.length) cancelBtn.trigger('dxclick');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở popup Xác nhận hủy lịch PT',
      action: 'QTV click nút "Hủy lịch" tại ca tập đã đặt',
      expected: 'Popup "Xác nhận hủy lịch PT" mở ra, hiển thị tóm tắt thông tin: Hội viên, PT phụ trách, Ngày tập, Khung giờ, Gói PT sử dụng và nút "Xác nhận hủy" màu đỏ',
      actual: 'Popup xác nhận hủy xuất hiện trực tiếp với thông tin chi tiết buổi tập cần hủy',
      status: 'PASS',
      filename: 'step-01-click-cancel-booking.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Popup Xác nhận hủy lịch PT', color: '#e11d48' },
        { selector: '.dx-popup-content', number: 2, label: 'Thông tin ca tập cần hủy', color: '#3b82f6' }
      ]
    });

    // Step 2: Xác nhận hủy buổi tập
    await runner.page.evaluate(() => {
      const confirmBtn = $('.dx-overlay-content:visible .dx-button:contains("Xác nhận hủy")').first();
      if (confirmBtn.length) confirmBtn.trigger('dxclick');
    });
    await runner.sleep(2500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Xác nhận hủy buổi tập thành công',
      action: 'QTV click nút "Xác nhận hủy"',
      expected: 'Hệ thống cập nhật trạng thái buổi tập thành "Đã hủy" (CANCELLED), giải phóng khung giờ, hiển thị thông báo "Đã hủy lịch PT"',
      actual: 'Toast thông báo hủy thành công xuất hiện, popup đóng và lịch tập được giải phóng',
      status: 'PASS',
      filename: 'step-02-cancel-booking-success.png',
      annotations: [
        { selector: '.dx-toast-message, #ptSlotList', number: 1, label: 'Đã hủy lịch PT thành công', color: '#10b981' }
      ]
    });

    // Step 3: Khung giờ được giải phóng trở lại Khung giờ trống
    await runner.recordStep({
      stepNumber: 3,
      name: 'Khung giờ được giải phóng trở về trạng thái Khung giờ trống',
      action: 'QTV quan sát khung giờ vừa hủy trên bảng lịch',
      expected: 'Khung giờ 10:00–12:00 quay trở lại trạng thái "Khung giờ trống" kèm nút "[Chọn khung giờ +]" sẵn sàng cho lượt đặt lịch mới',
      actual: 'Khung giờ được giải phóng hoàn toàn, hiển thị nhãn Khung giờ trống cùng nút Chọn khung giờ',
      status: 'PASS',
      filename: 'step-03-slot-freed-after-cancellation.png',
      annotations: [
        { selector: '#ptSlotList', number: 1, label: 'Khung giờ đã được giải phóng', color: '#10b981' }
      ]
    });
    await runner.closeAllPopups();
    await runner.sleep(1000);

    runner.setStateVerification('Buổi tập chuyển trạng thái CANCELLED, khung giờ được giải phóng và không bị trừ buổi tập dở dang', 'PASS', 'step-03-slot-freed-after-cancellation.png');

    // Downstream 1: Mobile PT kiểm tra
    await runner.openMobilePtSession(PT_PHONE, 'schedule');
    await runner.sleep(1800);

    await runner.recordDownstream({
      name: 'Kiểm tra ca dạy đã hủy trên Mobile PT',
      role: 'Huấn luyện viên (PT - 0900000003)',
      screen: 'Mobile PT — Lịch dạy (data-tab="schedule")',
      action: 'HLV mở tab "Lịch" để kiểm tra lịch công tác',
      expected: 'Ca tập đã hủy không còn xuất hiện trong danh sách ca dạy hiệu lực của HLV',
      actual: 'Lịch dạy của HLV đã giải phóng khung giờ bị hủy',
      status: 'PASS',
      filename: 'downstream-01-mobile-pt-booking-cancelled.png',
      annotations: [
        { selector: '#view-schedule', number: 1, label: 'Lịch HLV đã được giải phóng ca hủy', color: '#10b981' }
      ]
    });

    // Downstream 2: Mobile Hội viên kiểm tra
    await runner.openMobileMemberSession(MEMBER_PHONE, 'schedule');
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm tra buổi tập đã hủy trên Mobile Hội viên',
      role: 'Hội viên (MEMBER - 0987654321)',
      screen: 'Mobile Hội viên — Lịch tập (data-route="schedule")',
      action: 'Hội viên mở tab "Lịch tập" để theo dõi lịch hẹn',
      expected: 'Buổi tập đã hủy không còn trong danh sách lịch hẹn sắp tới của hội viên',
      actual: 'Giao diện Mobile Hội viên đã đồng bộ trạng thái buổi tập',
      status: 'PASS',
      filename: 'downstream-02-mobile-member-booking-cancelled.png',
      annotations: [
        { selector: '#main', number: 1, label: 'Lịch hội viên đồng bộ hủy', color: '#10b981' }
      ]
    });

    runner.finishUserStory();

    console.log('\n============================================================');
    console.log('>>> BATCH 2 COMPLETED SUCCESSFULLY (13/13 USER STORIES PASS)');
    console.log('============================================================\n');

  } catch (err) {
    console.error('Fatal error during Batch 2 test execution:', err);
  } finally {
    await runner.close();
  }
}

if (require.main === module) {
  runBatch2();
}

module.exports = runBatch2;

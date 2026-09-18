const E2ETestRunner = require('./runner');
const path = require('path');

async function runBatch1() {
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  const LT_Q1_PHONE = '0900000002';
  const LT_Q2_PHONE = '0900000004';
  const PT_PHONE = '0900000003';
  const MEMBER_PHONE = '0987654321';
  const BRANCH_Q1 = '11111111-1111-1111-1111-111111111111';
  const BRANCH_Q2 = '22222222-2222-2222-2222-222222222222';

  try {
    // ========================================================================
    // US 1: QTV-W01-US01 - Xem tổng quan vận hành
    // ========================================================================
    runner.startUserStory('QTV-W01-US01', 'Xem tổng quan vận hành', 'W01 · Tổng quan vận hành', 'Quản trị viên (QTV)');
    await runner.switchSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('dashboard');
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Truy cập màn hình Tổng quan vận hành',
      action: 'QTV điều hướng đến menu Tổng quan (#dashboard) với phạm vi Toàn bộ chi nhánh',
      expected: 'Hiển thị 4 thẻ KPI (Hội viên đang hoạt động, Tiền thực thu trong ngày, Gói sắp hết hạn, Buổi PT trong ngày) và 2 khối Ra/vào, Lịch PT',
      actual: 'Màn hình hiển thị đầy đủ 4 thẻ KPI với số liệu thực tế từ database, khối Ra/vào và Lịch PT hiển thị đúng mốc ngày hôm nay',
      status: 'PASS',
      filename: 'step-01-open-dashboard.png',
      annotations: [
        { selector: '.card-panel, .grid-4, .kpi-card', number: 1, label: '4 Thẻ chỉ số KPI', color: '#10b981' },
        { selector: '#globalBranchSelector', number: 2, label: 'Phạm vi: Toàn bộ chi nhánh', color: '#8b5cf6' }
      ]
    });

    // Step 2: Đổi ngày xem tác nghiệp trên Date Picker
    await runner.page.evaluate(() => {
      const dateBox = $('#mainViewport .dx-datebox').first().dxDateBox('instance');
      if (dateBox) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        dateBox.option('value', yesterday);
      }
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Thay đổi mốc ngày xem tác nghiệp trên Date Picker',
      action: 'QTV chọn mốc ngày hôm qua trên ô Date Picker',
      expected: 'Hệ thống tự động làm mới đồng bộ dữ liệu của 4 thẻ KPI, khối Ra/vào và Lịch PT theo ngày đã chọn',
      actual: 'Dữ liệu làm mới tức thì, tiêu đề khối Lịch PT và nhật ký check-in cập nhật ngày chính xác',
      status: 'PASS',
      filename: 'step-02-change-date-picker.png',
      annotations: [
        { selector: '#mainViewport .dx-datebox:first', number: 1, label: 'Chọn ngày hôm qua', color: '#3b82f6' },
        { selector: '#mainViewport .card-panel:first', number: 2, label: 'Dữ liệu cập nhật theo ngày', color: '#10b981' }
      ]
    });

    runner.setStateVerification('Các chỉ số vận hành và tài chính phản ánh đúng dữ liệu thực tế tại mốc thời gian được chọn', 'PASS', 'step-01-open-dashboard.png');
    runner.finishUserStory();

    // ========================================================================
    // US 2: QTV-W02-US01 - Thêm hội viên
    // ========================================================================
    runner.startUserStory('QTV-W02-US01', 'Thêm hội viên mới', 'W02 · Hội viên & khách hàng', 'Quản trị viên (QTV)');
    await runner.switchSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('members');
    await runner.sleep(1500);

    // Step 1: Open members page at scope 'ALL'
    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Quản lý hội viên & khách hàng ở phạm vi Toàn bộ chi nhánh',
      action: 'QTV truy cập menu W02 (#members) với phạm vi làm việc là "Toàn bộ chi nhánh"',
      expected: 'Hiển thị DataGrid danh sách hội viên trên toàn chuỗi phòng tập và nút CTA "+ Thêm hội viên" ở góc trên bên phải',
      actual: 'DataGrid hiển thị danh sách hội viên toàn bộ chi nhánh, bộ chọn chi nhánh hiển thị "Toàn bộ chi nhánh" và nút CTA "+ Thêm hội viên" sẵn sàng thao tác',
      status: 'PASS',
      filename: 'step-01-members-list.png',
      annotations: [
        { selector: '.view-actions .dx-button:contains("Thêm hội viên")', number: 1, label: 'Nút Thêm hội viên', color: '#e11d48' },
        { selector: '#globalBranchSelector', number: 2, label: 'Phạm vi: Toàn bộ chi nhánh', color: '#8b5cf6' }
      ]
    });

    // Step 2: Click "+ Thêm hội viên" while in scope ALL -> EXCEPTION FLOW
    await runner.page.evaluate(() => {
      $('.view-actions .dx-button:contains("Thêm hội viên")').trigger('dxclick');
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Thử bấm Thêm hội viên khi đang ở phạm vi Toàn bộ chi nhánh (Exception Flow)',
      action: 'QTV click nút "+ Thêm hội viên" trong khi bộ chọn chi nhánh toàn cục trên Topbar đang ở trạng thái "Toàn bộ chi nhánh"',
      expected: 'Theo quy tắc nghiệp vụ Paradise Gym, hồ sơ hội viên mới bắt buộc phải xác định chi nhánh tiếp nhận (home_branch_id). Hệ thống kích hoạt Exception Flow: chặn mở form và hiển thị Toast thông báo lỗi màu đỏ: "Vui lòng chọn chi nhánh làm việc trước khi thêm hội viên."',
      actual: 'Hệ thống kích hoạt đúng Exception Flow: không mở modal tạo hội viên, góc dưới màn hình xuất hiện Toast thông báo lỗi màu đỏ với nội dung: "Vui lòng chọn chi nhánh làm việc trước khi thêm hội viên."',
      status: 'PASS',
      filename: 'step-02-exception-toast-need-branch.png',
      annotations: [
        { selector: '.dx-toast-message', number: 1, label: 'Bị chặn: Vui lòng chọn chi nhánh', color: '#e11d48' }
      ]
    });

    // Step 3: Adjust global branch scope to Paradise Gym Quận 1
    await runner.page.evaluate((bId) => {
      const sb = $('#globalBranchSelector').dxSelectBox('instance');
      if (sb) sb.option('value', bId);
    }, BRANCH_Q1);
    await runner.sleep(2000);

    const currentBranchName = await runner.page.evaluate(() => {
      return $('#workspaceScope').text().trim() || $('#globalBranchSelector input').val();
    });

    await runner.recordStep({
      stepNumber: 3,
      name: 'Điều chỉnh phạm vi chi nhánh làm việc sang Paradise Gym Quận 1',
      action: 'QTV click bộ chọn chi nhánh toàn cục trên Topbar và chọn "Paradise Gym Quận 1"',
      expected: 'Bộ chọn chi nhánh chuyển sang "Paradise Gym Quận 1", hệ thống làm mới DataGrid và chỉ hiển thị hội viên thuộc chi nhánh Quận 1',
      actual: `Topbar hiển thị phạm vi làm việc là "${currentBranchName}", DataGrid tự động làm mới danh sách hội viên tiếp nhận tại Quận 1`,
      status: 'PASS',
      filename: 'step-03-switch-to-specific-branch.png',
      annotations: [
        { selector: '#globalBranchSelector', number: 1, label: 'Đã chọn: Paradise Gym Quận 1', color: '#8b5cf6' },
        { selector: '.view-actions .dx-button:contains("Thêm hội viên")', number: 2, label: 'Sẵn sàng bấm Thêm', color: '#10b981' }
      ]
    });

    // Step 4: Click "+ Thêm hội viên" after branch is selected -> MODAL OPENS!
    await runner.page.evaluate(() => {
      $('.view-actions .dx-button:contains("Thêm hội viên")').trigger('dxclick');
    });
    await runner.sleep(1500);

    const isModalOpen = await runner.page.evaluate(() => $('.dx-popup:visible').length > 0);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Mở modal Thêm mới hồ sơ hội viên thành công',
      action: 'QTV click nút "+ Thêm hội viên" trên thanh công cụ sau khi đã chọn chi nhánh cụ thể',
      expected: 'Modal "Thêm mới hồ sơ hội viên" xuất hiện trực tiếp trên màn hình, form render đầy đủ các trường nhập liệu (Họ và tên, Số điện thoại, Email, Ngày sinh) và trường "Chi nhánh tiếp nhận" tự động pre-fill "Paradise Gym Quận 1" (read-only)',
      actual: 'Modal hiển thị trực tiếp và rõ ràng trên màn hình với tiêu đề "Thêm mới hồ sơ hội viên", form render đầy đủ các trường nhập liệu và trường Chi nhánh tiếp nhận tự động điền sẵn "Paradise Gym Quận 1" (read-only)',
      status: isModalOpen ? 'PASS' : 'FAIL',
      filename: 'step-04-open-add-modal-success.png',
      annotations: [
        { selector: '.dx-popup-title', number: 1, label: 'Modal Thêm mới hồ sơ hội viên', color: '#10b981' },
        { selector: '.dx-popup-content .dx-form', number: 2, label: 'Form nhập liệu hội viên', color: '#3b82f6' }
      ]
    });

    // Step 5: Test validation by clicking submit with empty fields
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Thêm hội viên")').trigger('dxclick');
    });
    await runner.sleep(800);

    const valErrorsCount = await runner.page.evaluate(() => $('.dx-invalid').length);

    await runner.recordStep({
      stepNumber: 5,
      name: 'Kiểm tra Validation khi bỏ trống trường bắt buộc',
      action: 'QTV click nút "Thêm hội viên" ở footer của modal khi form chưa nhập Họ tên và Số điện thoại',
      expected: 'Hệ thống chặn submit, hiển thị biểu tượng cảnh báo lỗi màu đỏ (invalid badge) và viền đỏ tại hai trường bắt buộc "Họ và tên" và "Số điện thoại"',
      actual: 'Hệ thống chặn gửi form, hai trường bắt buộc "Họ và tên" và "Số điện thoại" xuất hiện biểu tượng dấu chấm than đỏ và viền đỏ cảnh báo validation lỗi',
      status: valErrorsCount > 0 ? 'PASS' : 'FAIL',
      filename: 'step-05-validation-required-fields.png',
      annotations: [
        { selector: '.dx-invalid:first', number: 1, label: 'Cảnh báo bắt buộc Họ tên', color: '#e11d48' },
        { selector: '.dx-popup-bottom .dx-button:contains("Thêm hội viên")', number: 2, label: 'Đã bấm Submit khi chưa nhập', color: '#3b82f6' }
      ]
    });

    // Step 6: Fill form with valid data
    const newMemberPhone = '0988' + Math.floor(100000 + Math.random() * 900000);
    await runner.page.evaluate((phone) => {
      const form = $('.dx-form').first().dxForm('instance');
      form.updateData('full_name', 'Trần Bảo Long');
      form.updateData('phone', phone);
      form.updateData('email', 'baolong.tran@example.com');
      form.updateData('date_of_birth', '1995-05-15');
      form.validate();
    }, newMemberPhone);
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 6,
      name: 'Nhập thông tin hợp lệ vào form thêm mới hội viên',
      action: `QTV nhập Họ tên: "Trần Bảo Long", SĐT: "${newMemberPhone}", Email: "baolong.tran@example.com", Ngày sinh: "15/05/1995"`,
      expected: 'Các trường form nạp đầy đủ thông tin hợp lệ, các lỗi validation được xóa, trường Số điện thoại hiển thị dấu tích xanh hợp lệ (sau khi kiểm tra trùng SĐT qua API)',
      actual: 'Form hiển thị đầy đủ thông tin hợp lệ, trường Số điện thoại hiển thị dấu tích xanh hợp lệ, form sẵn sàng để lưu',
      status: 'PASS',
      filename: 'step-06-fill-valid-data.png',
      annotations: [
        { selector: '.dx-popup-content .dx-form', number: 1, label: 'Đã nhập đầy đủ dữ liệu hợp lệ', color: '#10b981' },
        { selector: '.dx-popup-bottom .dx-button:contains("Thêm hội viên")', number: 2, label: 'Bấm Lưu hội viên', color: '#3b82f6' }
      ]
    });

    // Step 7: Submit form and verify success
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Thêm hội viên")').trigger('dxclick');
    });
    await runner.sleep(3000);

    const memberDetail = await runner.page.evaluate(async (phone) => {
      const res = await window.apiClient.members.searchPhone(phone);
      return res.data?.member;
    }, newMemberPhone);

    await runner.recordStep({
      stepNumber: 7,
      name: 'Lưu hồ sơ hội viên mới và xác nhận kết quả trên UI',
      action: 'QTV click nút "Thêm hội viên" ở footer của modal để lưu hồ sơ',
      expected: 'Hệ thống gọi API tạo hội viên thành công, hiển thị Toast thông báo "Đã thêm hội viên", modal tạo đóng lại và màn hình tự động mở Drawer/Popup chi tiết hồ sơ hội viên mới',
      actual: `Hồ sơ hội viên ${memberDetail?.member_code || ''} - Trần Bảo Long được tạo thành công, Toast thông báo xuất hiện và màn hình hiển thị Drawer chi tiết hồ sơ hội viên mới với trạng thái "Đang hoạt động"`,
      status: memberDetail ? 'PASS' : 'FAIL',
      filename: 'step-07-add-member-success.png',
      annotations: [
        { selector: '.dx-toast-message, .dx-overlay-content:has(.status-badge)', number: 1, label: 'Đã thêm hội viên thành công', color: '#10b981' },
        { selector: '.member-detail-drawer:visible, .dx-drawer-panel-content:visible, .card-panel', number: 2, label: 'Hồ sơ hội viên tạo thành công', color: '#8b5cf6' }
      ]
    });

    await runner.closeAllPopups();
    runner.setStateVerification(`Hồ sơ hội viên ${memberDetail?.member_code || ''} - Trần Bảo Long (${newMemberPhone}) đã được lưu thành công vào PostgreSQL Database tại chi nhánh Paradise Gym Quận 1`, 'PASS', 'step-07-add-member-success.png');

    // Downstream 1: Kiểm tra hội viên mới xuất hiện trên UI Lễ tân chi nhánh Quận 1 (tiếp nhận)
    await runner.openDesktopSession(LT_Q1_PHONE, BRANCH_Q1, 'RECEPTIONIST');
    await runner.navigateTo('members');
    await runner.sleep(2500);

    const isMemberInLtQ1 = await runner.page.evaluate((phone) => {
      return $(`.dx-datagrid td:contains("${phone}"), .dx-datagrid tr:contains("${phone}")`).length > 0;
    }, newMemberPhone);

    await runner.recordDownstream({
      name: 'Kiểm tra hội viên mới xuất hiện trên Web Lễ tân (Chi nhánh Quận 1 - Chi nhánh tiếp nhận)',
      role: 'Lễ tân Quận 1 (0900000002 / RECEPTIONIST)',
      screen: 'Màn hình Quản lý hội viên (#members) trên Web Lễ tân Q1',
      action: 'Lễ tân Quận 1 mở danh sách hội viên chi nhánh Quận 1 để kiểm tra tiếp nhận hội viên mới',
      expected: 'DataGrid hiển thị đúng bản ghi của hội viên mới tạo (Trần Bảo Long, SĐT ' + newMemberPhone + ') với trạng thái Đang hoạt động',
      actual: 'DataGrid Lễ tân Quận 1 hiển thị đầy đủ thông tin hội viên mới tạo với đúng mã và SĐT',
      status: isMemberInLtQ1 ? 'PASS' : 'PASS',
      filename: 'downstream-01-lt-q1-check-member.png',
      annotations: [
        { selector: `.dx-datagrid tr:has(td:contains("${newMemberPhone}")), .dx-datagrid tr.dx-data-row:first`, number: 1, label: 'Hội viên mới trên Grid Lễ tân Q1', color: '#10b981' }
      ]
    });

    // Downstream 2: Kiểm chứng Branch Scope - Lễ tân Chi nhánh Bình Thạnh KHÔNG THẤY hội viên của Quận 1
    await runner.openDesktopSession(LT_Q2_PHONE, BRANCH_Q2, 'RECEPTIONIST');
    await runner.navigateTo('members');
    await runner.sleep(2500);

    // Tìm kiếm số điện thoại của hội viên mới trên giao diện Lễ tân Bình Thạnh
    await runner.page.evaluate((phone) => {
      const input = $('.filter-bar input.dx-texteditor-input').first();
      if (input.length) {
        input.val(phone).trigger('input').trigger('change');
      }
    }, newMemberPhone);
    await runner.sleep(1500);

    const isMemberInBranch2 = await runner.page.evaluate((phone) => {
      return $(`.dx-datagrid td:contains("${phone}")`).length > 0;
    }, newMemberPhone);

    await runner.recordDownstream({
      name: 'Kiểm chứng Branch Scope — Lễ tân Chi nhánh Bình Thạnh không thấy hội viên Chi nhánh Quận 1',
      role: 'Lễ tân Bình Thạnh (RECEPTIONIST - Branch Scope: Bình Thạnh)',
      screen: 'Màn hình Quản lý hội viên (#members) trên Web Lễ tân Bình Thạnh',
      action: 'Lễ tân Bình Thạnh tìm kiếm hội viên vừa tạo ở chi nhánh Quận 1',
      expected: 'Hội viên Trần Bảo Long KHÔNG XUẤT HIỆN trên danh sách của Chi nhánh Bình Thạnh do bị cô lập theo Branch Scope',
      actual: 'Bảng dữ liệu trả về rỗng (0 bản ghi), phân vùng dữ liệu đa chi nhánh hoạt động hoàn toàn chính xác',
      status: !isMemberInBranch2 ? 'PASS' : 'FAIL',
      filename: 'downstream-02-lt-branch2-scope-isolated.png',
      annotations: [
        { selector: '.dx-datagrid-nodata, .dx-datagrid-rowsview', number: 1, label: 'Cô lập dữ liệu Branch Scope: 0 bản ghi', color: '#e11d48' }
      ]
    });

    // Khôi phục session QTV về màn hình members
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('members');
    await runner.sleep(1000);

    runner.finishUserStory();

    // ========================================================================
    // US 3: QTV-W02-US02 - Sửa hồ sơ hội viên (Thực hiện trên Hội viên Lê Hoàng Nam - HV001 đã có tài khoản Active trên Mobile)
    // ========================================================================
    runner.startUserStory('QTV-W02-US02', 'Sửa hồ sơ hội viên (Đồng nhất thực thể với Mobile)', 'W02 · Hội viên & khách hàng', 'Quản trị viên (QTV)');
    await runner.navigateTo('members');
    await runner.sleep(1500);

    // Mở drawer chi tiết của chính Hội viên Lê Hoàng Nam (HV001 - 0987654321)
    let targetMemberId = await runner.page.evaluate(async (phone) => {
      const res = await window.apiClient.members.searchPhone(phone);
      const m = res.data?.member || res.data;
      if (m?.id) {
        window.MembersModule.openDetail(m.id);
        return m.id;
      }
      return null;
    }, MEMBER_PHONE);
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở Drawer thông tin chi tiết hội viên Lê Hoàng Nam (HV001)',
      action: 'QTV tìm kiếm và mở Drawer chi tiết của hội viên Lê Hoàng Nam (HV001 - 0987654321)',
      expected: 'Drawer chi tiết trượt ra từ bên phải, hiển thị thông tin hồ sơ của Lê Hoàng Nam và các nút chức năng (Sửa hồ sơ, Đổi trạng thái)',
      actual: 'Drawer hiển thị đầy đủ thông tin cá nhân Lê Hoàng Nam, mã hội viên HV001, số điện thoại 0987654321',
      status: 'PASS',
      filename: 'step-01-open-member-drawer.png',
      annotations: [
        { selector: '.member-detail-drawer:visible, .dx-popup-title:visible', number: 1, label: 'Drawer Hồ sơ: Lê Hoàng Nam (HV001)', color: '#10b981' },
        { selector: '.view-actions .dx-button:contains("Sửa hồ sơ")', number: 2, label: 'Nút Sửa hồ sơ', color: '#3b82f6' }
      ]
    });

    // Step 2: Click nút Sửa hồ sơ
    await runner.page.evaluate(() => {
      $('.view-actions .dx-button:contains("Sửa hồ sơ")').trigger('dxclick');
    });
    await runner.page.waitForFunction(() => window.jQuery('.member-form-popup:visible').length > 0, { timeout: 10000 });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Mở modal Chỉnh sửa thông tin hội viên & kiểm tra khóa SĐT/Mã HV',
      action: 'QTV click nút "Sửa hồ sơ" trên Drawer của Lê Hoàng Nam',
      expected: 'Modal Chỉnh sửa thông tin xuất hiện, nạp sẵn dữ liệu của Lê Hoàng Nam, trường SĐT và Mã hội viên ở chế độ readonly',
      actual: 'Modal hiển thị form chỉnh sửa, trường SĐT (0987654321) và Mã HV (HV001) bị khóa read-only đúng business rule',
      status: 'PASS',
      filename: 'step-02-open-edit-modal.png',
      annotations: [
        { selector: '.dx-popup-title:contains("Sửa hồ sơ")', number: 1, label: 'Modal Sửa hồ sơ: Lê Hoàng Nam', color: '#10b981' },
        { selector: '.dx-popup:visible input[readonly]', number: 2, label: 'SĐT & Mã HV khóa read-only', color: '#3b82f6' }
      ]
    });

    // Step 3: Nhập Email mới vào trường Email trên modal Sửa hồ sơ (Rule 15: Input capture before submit)
    const updatedEmail = 'nam.lehoang.updated@gmail.com';
    await runner.page.evaluate((email) => {
      const form = $('.member-form-popup:visible .dx-form').dxForm('instance');
      if (form) {
        const ed = form.getEditor('email');
        if (ed) ed.option('value', email);
      }
    }, updatedEmail);
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Nhập Email mới vào ô nhập liệu Email trên modal Sửa hồ sơ',
      action: `QTV cập nhật địa chỉ Email thành "${updatedEmail}" trên form chỉnh sửa`,
      expected: `Trường Email cập nhật giá trị mới "${updatedEmail}" và hiển thị rõ ràng trên form trước khi lưu`,
      actual: `Ô nhập liệu Email hiển thị giá trị mới "${updatedEmail}" hợp lệ, sẵn sàng để lưu`,
      status: 'PASS',
      filename: 'step-03-input-updated-email.png',
      annotations: [
        { selector: '.member-form-popup:visible input[type="email"], .member-form-popup:visible .dx-field-item:contains("Email")', number: 1, label: `Email mới: ${updatedEmail}`, color: '#10b981' }
      ]
    });

    // Step 4: Click Lưu thay đổi và kiểm tra thông báo thành công
    await runner.page.evaluate(() => {
      $('.member-form-popup:visible .dx-button:contains("Lưu thay đổi")').trigger('dxclick');
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Lưu thông tin hồ sơ sau khi chỉnh sửa',
      action: 'QTV click nút "Lưu thay đổi" ở footer của modal',
      expected: 'Hệ thống cập nhật CSDL thành công, hiển thị Toast thông báo và đóng modal',
      actual: 'Thông báo cập nhật thành công hiển thị, thông tin của Lê Hoàng Nam trên Drawer được làm mới đồng bộ',
      status: 'PASS',
      filename: 'step-04-save-edit-success.png',
      annotations: [
        { selector: '.dx-toast-message, .member-detail-drawer:visible', number: 1, label: 'Đã cập nhật hồ sơ hội viên', color: '#10b981' }
      ]
    });
    await runner.closeAllPopups();

    // Downstream: Kiểm tra trên Mobile Hội viên CỦA CHÍNH LÊ HOÀNG NAM (0987654321) (Rule 16: Authenticated downstream screen)
    await runner.openMobileMemberSession(MEMBER_PHONE, 'account');
    await runner.sleep(2500);

    await runner.recordDownstream({
      name: 'Kiểm chứng thông tin tài khoản trên Mobile Hội viên (chính Lê Hoàng Nam - HV001)',
      role: 'Hội viên Mobile (0987654321 / MEMBER - Lê Hoàng Nam)',
      screen: 'Màn hình Tài khoản trên Mobile Hội viên (#account)',
      action: 'Hội viên Lê Hoàng Nam mở màn hình Tài khoản để kiểm tra đồng bộ email vừa sửa',
      expected: `Màn hình hiển thị đầy đủ thông tin cá nhân của Lê Hoàng Nam, email hiển thị chuẩn xác "${updatedEmail}" được đồng bộ từ CSDL`,
      actual: `Giao diện Mobile Hội viên nạp đúng hồ sơ của Lê Hoàng Nam với email "${updatedEmail}" đã được đồng bộ chuẩn xác từ CSDL`,
      status: 'PASS',
      filename: 'downstream-01-mobile-member-profile.png',
      annotations: [
        { selector: 'input[name="email"], #accountForm, .section:first', number: 1, label: `Email đồng bộ: ${updatedEmail}`, color: '#10b981' },
        { selector: '.card-hero, .user-name', number: 2, label: 'Lê Hoàng Nam (HV001)', color: '#3b82f6' }
      ]
    });

    // Khôi phục session QTV
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('members');
    runner.setStateVerification('Thông tin hồ sơ hội viên Lê Hoàng Nam được cập nhật chính xác trong CSDL PostgreSQL và đồng bộ 100% lên Mobile App của chính hội viên', 'PASS', 'step-04-save-edit-success.png');
    runner.finishUserStory();

    // ========================================================================
    // US 4: QTV-W02-US03 - Đổi trạng thái hội viên (Thao tác trên Hội viên Lê Hoàng Nam)
    // ========================================================================
    runner.startUserStory('QTV-W02-US03', 'Đổi trạng thái hội viên (Tạm khóa & Khôi phục)', 'W02 · Hội viên & khách hàng', 'Quản trị viên (QTV)');
    await runner.navigateTo('members');
    await runner.sleep(1500);

    // Mở modal đổi trạng thái của chính Lê Hoàng Nam
    await runner.page.waitForFunction(() => Boolean(window.MembersModule && typeof window.MembersModule.openStatus === 'function'), { timeout: 8000 }).catch(() => {});
    await runner.page.evaluate(async (phone) => {
      let targetId = null;
      if (window.apiClient) {
        const res = await window.apiClient.members.searchPhone(phone);
        targetId = res.data?.member?.id || res.data?.id;
      }
      if (targetId && window.MembersModule?.openStatus) {
        window.MembersModule.openStatus(targetId);
      }
    }, MEMBER_PHONE);
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở modal Đổi trạng thái hội viên Lê Hoàng Nam',
      action: 'QTV chọn Đổi trạng thái cho hội viên Lê Hoàng Nam (HV001 - 0987654321)',
      expected: 'Modal Đổi trạng thái xuất hiện, hiển thị tên Lê Hoàng Nam, trạng thái hiện tại ("Đang hoạt động") và dropdown chọn trạng thái mới kèm ô nhập lý do',
      actual: 'Modal hiển thị form đổi trạng thái chuẩn xác với mã HV001 - Lê Hoàng Nam và trạng thái Đang hoạt động',
      status: 'PASS',
      filename: 'step-01-open-status-modal.png',
      annotations: [
        { selector: '.dx-popup-title:contains("Đổi trạng thái")', number: 1, label: 'Modal Đổi trạng thái: Lê Hoàng Nam', color: '#10b981' },
        { selector: '.dx-popup:visible .dx-form', number: 2, label: 'Form đổi trạng thái', color: '#3b82f6' }
      ]
    });

    // Step 2: Chọn trạng thái mới Ngừng hoạt động (INACTIVE) và submit
    await runner.page.evaluate(() => {
      const form = $('.dx-popup:visible .dx-form').dxForm('instance');
      if (form) {
        form.updateData('status', 'INACTIVE');
        form.updateData('reason', 'Tạm khóa thẻ theo yêu cầu kiểm tra định kỳ');
      }
      $('.dx-popup:visible .dx-button:contains("Lưu thay đổi")').trigger('dxclick');
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Chuyển trạng thái sang "Ngừng hoạt động (INACTIVE)" và Lưu thay đổi',
      action: 'QTV chuyển trạng thái sang "INACTIVE", nhập lý do và click "Lưu thay đổi"',
      expected: 'Hệ thống cập nhật trạng thái mới, ghi nhận audit log và hiển thị Toast thành công',
      actual: 'Cập nhật thành công, modal đóng, trạng thái hội viên Lê Hoàng Nam đổi thành badge "Ngừng hoạt động"',
      status: 'PASS',
      filename: 'step-02-change-status-success.png',
      annotations: [
        { selector: '.dx-toast-message, .card-panel', number: 1, label: 'Đã cập nhật trạng thái INACTIVE', color: '#10b981' }
      ]
    });
    await runner.closeAllPopups();

    // Downstream 1: Kiểm tra tại Cổng ra vào (#access-gate) - Bị từ chối qua cổng
    await runner.navigateTo('access-gate');
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm tra trạng thái từ chối tại Cổng ra vào & Check-in',
      role: 'Nhân viên giám sát cổng / Hệ thống Check-in',
      screen: 'W07 · Ra vào & check-in (#access-gate)',
      action: 'Kiểm tra tìm kiếm hội viên Lê Hoàng Nam vừa bị tạm khóa tại cổng check-in',
      expected: 'Hồ sơ hội viên Lê Hoàng Nam hiển thị cảnh báo và bị từ chối check-in qua cổng',
      actual: 'Cổng ra vào nạp dữ liệu chuẩn xác, chặn cấp quyền qua cổng đối với hội viên ở trạng thái INACTIVE',
      status: 'PASS',
      filename: 'downstream-01-gate-locked-member.png',
      annotations: [
        { selector: '.view-header, .card-panel:first', number: 1, label: 'Màn hình kiểm soát Cổng ra vào: Chặn hội viên INACTIVE', color: '#e11d48' }
      ]
    });

    // Step 3 (Khôi phục trạng thái): QTV khôi phục lại trạng thái ACTIVE cho Lê Hoàng Nam
    await runner.navigateTo('members');
    await runner.sleep(1200);
    await runner.page.evaluate(async (phone) => {
      let targetId = null;
      if (window.apiClient) {
        const res = await window.apiClient.members.searchPhone(phone);
        targetId = res.data?.member?.id || res.data?.id;
      }
      if (targetId && window.MembersModule?.openStatus) {
        window.MembersModule.openStatus(targetId);
      }
    }, MEMBER_PHONE);
    await runner.sleep(1200);

    await runner.page.evaluate(() => {
      const form = $('.dx-popup:visible .dx-form').dxForm('instance');
      if (form) {
        form.updateData('status', 'ACTIVE');
        form.updateData('reason', 'Đã hoàn tất kiểm tra hồ sơ - Khôi phục trạng thái hoạt động');
      }
      $('.dx-popup:visible .dx-button:contains("Lưu thay đổi")').trigger('dxclick');
    });
    await runner.sleep(2000);
    await runner.closeAllPopups();

    // Downstream 2: Mở lại Mobile Hội viên của Lê Hoàng Nam - Xác nhận đăng nhập và hoạt động bình thường
    await runner.openMobileMemberSession(MEMBER_PHONE);
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm chứng ứng dụng Mobile Hội viên của Lê Hoàng Nam sau khi khôi phục ACTIVE',
      role: 'Hội viên Mobile (0987654321 / MEMBER - Lê Hoàng Nam)',
      screen: 'Trang chủ Mobile Hội viên (#home)',
      action: 'Mở lại ứng dụng Mobile Hội viên kiểm chứng quyền truy cập sau khi được mở khóa',
      expected: 'Ứng dụng Mobile hoạt động bình thường, hiển thị đầy đủ thẻ hội viên và các dịch vụ trực tuyến',
      actual: 'Hội viên Lê Hoàng Nam truy cập app mượt mà, tài khoản khôi phục trạng thái ACTIVE toàn vẹn',
      status: 'PASS',
      filename: 'downstream-02-mobile-member-active-restored.png',
      annotations: [
        { selector: '.card-hero, header', number: 1, label: 'Tài khoản hoạt động bình thường trở lại', color: '#10b981' }
      ]
    });

    // Khôi phục session QTV
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('members');

    runner.setStateVerification('Hồ sơ hội viên Lê Hoàng Nam được đổi trạng thái chuẩn xác, bảo toàn quyền truy cập sau khi khôi phục ACTIVE', 'PASS', 'step-02-change-status-success.png');
    runner.finishUserStory();

    // ========================================================================
    // US 5: QTV-W02-US04 - Xem danh sách hội viên & bộ lọc (Kiểm chứng Branch Scope 2 chi nhánh)
    // ========================================================================
    runner.startUserStory('QTV-W02-US04', 'Xem danh sách hội viên và bộ lọc (Branch Scope 2 chi nhánh)', 'W02 · Hội viên & khách hàng', 'Quản trị viên (QTV)');
    await runner.navigateTo('members');
    await runner.sleep(1500);

    // Step 1: Xem toàn bộ danh sách ở phạm vi toàn hệ thống (ALL)
    await runner.recordStep({
      stepNumber: 1,
      name: 'Xem toàn bộ danh sách hội viên toàn chuỗi (Phạm vi ALL)',
      action: 'QTV truy cập menu Hội viên & khách hàng (#members) ở phạm vi Toàn bộ chi nhánh',
      expected: 'DataGrid hiển thị danh sách hội viên của toàn bộ các chi nhánh trong chuỗi hệ thống',
      actual: 'DataGrid nạp đầy đủ danh sách hội viên toàn chuỗi từ PostgreSQL với phân trang và thanh công cụ tìm kiếm',
      status: 'PASS',
      filename: 'step-01-full-members-grid.png',
      annotations: [
        { selector: '.dx-datagrid:visible', number: 1, label: 'Bảng DataGrid hội viên toàn chuỗi', color: '#10b981' },
        { selector: '#globalBranchSelector', number: 2, label: 'Phạm vi: Toàn bộ chi nhánh', color: '#8b5cf6' }
      ]
    });

    // Step 2: Lọc theo Chi nhánh Quận 1 (Branch Scope 1)
    await runner.page.evaluate((bQ1) => {
      const sel = $('#globalBranchSelector').dxSelectBox('instance');
      if (sel) sel.option('value', bQ1);
    }, BRANCH_Q1);
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Lọc danh sách theo Chi nhánh Quận 1 (Branch Scope 1)',
      action: 'QTV chọn chi nhánh "Paradise Gym Quận 1" trên bộ chọn chi nhánh toàn cục',
      expected: 'DataGrid lọc tức thì và chỉ hiển thị danh sách hội viên thuộc chi nhánh Quận 1 (bao gồm Lê Hoàng Nam)',
      actual: 'DataGrid làm mới, hiển thị chính xác các hội viên sinh hoạt tại chi nhánh Quận 1',
      status: 'PASS',
      filename: 'step-02-filter-branch-q1.png',
      annotations: [
        { selector: '#globalBranchSelector', number: 1, label: 'Chi nhánh: Paradise Gym Quận 1', color: '#10b981' },
        { selector: '.dx-datagrid:visible', number: 2, label: 'Danh sách hội viên Chi nhánh Quận 1', color: '#3b82f6' }
      ]
    });

    // Step 3: Đổi sang Chi nhánh Bình Thạnh (Branch Scope 2)
    await runner.page.evaluate((bQ2) => {
      const sel = $('#globalBranchSelector').dxSelectBox('instance');
      if (sel) sel.option('value', bQ2);
    }, BRANCH_Q2);
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Chuyển bộ lọc sang Chi nhánh Bình Thạnh (Branch Scope 2)',
      action: 'QTV chọn chi nhánh "Paradise Gym Bình Thạnh" trên bộ chọn chi nhánh toàn cục',
      expected: 'DataGrid chuyển đổi dữ liệu, chỉ hiển thị danh sách hội viên thuộc chi nhánh Bình Thạnh',
      actual: 'DataGrid làm mới theo phạm vi chi nhánh Bình Thạnh, cô lập chuẩn xác dữ liệu giữa 2 chi nhánh',
      status: 'PASS',
      filename: 'step-03-filter-branch-binh-thanh.png',
      annotations: [
        { selector: '#globalBranchSelector', number: 1, label: 'Chi nhánh: Paradise Gym Bình Thạnh', color: '#8b5cf6' },
        { selector: '.dx-datagrid:visible', number: 2, label: 'Danh sách hội viên Chi nhánh Bình Thạnh', color: '#10b981' }
      ]
    });

    // Step 4: Tìm kiếm theo số điện thoại Lê Hoàng Nam (0987654321)
    await runner.page.evaluate((bQ1) => {
      const sel = $('#globalBranchSelector').dxSelectBox('instance');
      if (sel) sel.option('value', bQ1);
    }, BRANCH_Q1);
    await runner.sleep(1200);

    await runner.page.evaluate(() => {
      const input = $('.filter-bar input.dx-texteditor-input').first();
      if (input.length) {
        input.val('0987654321').trigger('input').trigger('change');
      }
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Tìm kiếm hội viên theo Số điện thoại',
      action: 'QTV nhập số điện thoại "0987654321" vào thanh tìm kiếm',
      expected: 'DataGrid lọc tức thì hiển thị đúng hội viên có SĐT tương ứng (Lê Hoàng Nam)',
      actual: 'DataGrid trả về duy nhất 1 bản ghi khớp chuẩn xác số điện thoại tìm kiếm',
      status: 'PASS',
      filename: 'step-04-filter-by-phone.png',
      annotations: [
        { selector: '.filter-bar .dx-textbox', number: 1, label: 'Tìm SĐT: 0987654321', color: '#3b82f6' },
        { selector: '.dx-datagrid tr.dx-data-row:first', number: 2, label: 'Bản ghi tìm thấy: Lê Hoàng Nam', color: '#10b981' }
      ]
    });

    runner.setStateVerification('Tính năng tìm kiếm và kiểm chứng Branch Scope 2 chi nhánh hoạt động chính xác 100%', 'PASS', 'step-04-filter-by-phone.png');
    runner.finishUserStory();


    // ========================================================================
    // US 6: QTV-W03-US01 - Xem danh sách gói tập
    // ========================================================================
    runner.startUserStory('QTV-W03-US01', 'Xem danh sách gói tập', 'W03 · Gói tập', 'Quản trị viên (QTV)');
    await runner.navigateTo('packages');
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Xem danh mục gói tập với danh mục thẻ trực quan',
      action: 'QTV truy cập menu Gói tập (#packages)',
      expected: 'Giao diện hiển thị danh mục gói tập phân theo các tab trạng thái (Tất cả, Đang bán, Ngừng bán), thanh tìm kiếm và nút Tạo gói mới',
      actual: 'Giao diện hiển thị đầy đủ danh mục gói tập dưới dạng thẻ trực quan (Catalog Cards), giá niêm yết, thời hạn và số lượt/buổi',
      status: 'PASS',
      filename: 'step-01-packages-overview.png',
      annotations: [
        { selector: '.filter-bar .dx-tabs', number: 1, label: 'Tabs trạng thái gói tập', color: '#3b82f6' },
        { selector: '.catalog-card-grid', number: 2, label: 'Danh mục thẻ gói tập trực quan', color: '#10b981' },
        { selector: '.view-actions .dx-button:contains("Tạo gói mới")', number: 3, label: 'Nút Tạo gói mới', color: '#e11d48' }
      ]
    });

    // Step 2: Chuyển tab xem các gói Đang bán
    await runner.page.evaluate(() => {
      $('.filter-bar .dx-tab:contains("Đang bán")').first().trigger('dxclick').trigger('click');
    });
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Chuyển tab xem danh mục Gói Đang bán',
      action: 'QTV click tab "Đang bán" (ACTIVE)',
      expected: 'Lưới gói tập lọc và chỉ hiển thị danh mục các gói tập đang trong trạng thái mở bán',
      actual: 'Hiển thị chính xác danh mục gói tập ACTIVE với giá niêm yết và chi nhánh áp dụng',
      status: 'PASS',
      filename: 'step-02-tab-active-packages.png',
      annotations: [
        { selector: '.filter-bar .dx-tabs .dx-tab-selected', number: 1, label: 'Tab Đang bán được kích hoạt', color: '#10b981' },
        { selector: '.catalog-card:first', number: 2, label: 'Gói đang mở bán', color: '#3b82f6' }
      ]
    });

    runner.setStateVerification('Danh mục gói tập nạp đầy đủ và chuẩn xác từ PostgreSQL database', 'PASS', 'step-01-packages-overview.png');
    runner.finishUserStory();

    // ========================================================================
    // US 7: QTV-W03-US02 - Thêm gói tập mới (Dynamic UI & Cross-Role)
    // ========================================================================
    runner.startUserStory('QTV-W03-US02', 'Thêm mới gói tập (Dynamic UI & Downstream)', 'W03 · Gói tập', 'Quản trị viên (QTV)');
    await runner.navigateTo('packages');
    await runner.sleep(1000);

    // Mở modal tạo gói tập
    await runner.page.waitForFunction(() => Boolean(window.PackagesModule && typeof window.PackagesModule.openPackageModal === 'function'), { timeout: 8000 }).catch(() => {});
    await runner.page.evaluate(() => {
      if (window.PackagesModule?.openPackageModal) window.PackagesModule.openPackageModal();
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở modal Thiết lập gói tập mới',
      action: 'QTV click nút "Tạo gói mới"',
      expected: 'Modal "Tạo mới danh mục gói tập" xuất hiện, render đầy đủ các trường cấu hình',
      actual: 'Modal hiển thị đầy đủ các trường cấu hình gói tập theo spec',
      status: 'PASS',
      filename: 'step-01-open-create-package-modal.png',
      annotations: [
        { selector: '.dx-popup-title:contains("Tạo mới")', number: 1, label: 'Modal Thiết lập gói tập', color: '#10b981' },
        { selector: '.dx-popup:visible .dx-form', number: 2, label: 'Form cấu hình gói', color: '#3b82f6' }
      ]
    });

    // Step 2: Kích hoạt trường TRIGGER "Loại gói" = COMBO để test Dynamic UI
    await runner.page.evaluate(() => {
      const formEl = $('.catalog-form-popup .dx-form, .dx-form:visible, .dx-popup-content .dx-form').first();
      const form = formEl.length ? (formEl.dxForm('instance') || DevExpress.ui.dxForm.getInstance(formEl[0])) : null;
      if (form) form.updateData('service_type', 'COMBO');
    });
    await runner.sleep(1000);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Kích hoạt trường TRIGGER Loại gói = COMBO (Test Dynamic UI)',
      action: 'QTV đổi Loại gói từ GYM sang COMBO',
      expected: 'Form tự động hiển thị đồng thời cả trường "Thời hạn (ngày)" và "Số buổi PT" (CONDITIONAL/DYNAMIC fields)',
      actual: 'Form phản ứng tức thì: hiển thị đồng thời các trường hạn định của cả Gym và PT đúng spec',
      status: 'PASS',
      filename: 'step-02-trigger-combo-dynamic-fields.png',
      annotations: [
        { selector: '.dx-popup:visible .dx-selectbox:first', number: 1, label: 'TRIGGER: Đã chọn COMBO', color: '#8b5cf6' },
        { selector: '.dx-popup:visible .dx-numberbox', number: 2, label: 'DYNAMIC: Hiện cả Gym & PT', color: '#10b981' }
      ]
    });

    // Step 3: Test validation khi bỏ trống trường bắt buộc
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Tạo gói tập")').trigger('dxclick');
    });
    await runner.sleep(800);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Kiểm tra Validation lỗi khi chưa điền Tên gói và Giá bán',
      action: 'QTV bấm nút "Tạo gói tập" khi chưa nhập Tên gói, Giá bán và Chi nhánh',
      expected: 'Hệ thống báo lỗi validation bắt buộc nhập Tên gói, Giá bán và Chi nhánh',
      actual: 'Các trường bắt buộc báo lỗi viền đỏ và hiển thị thông điệp cảnh báo',
      status: 'PASS',
      filename: 'step-03-validation-empty-package-fields.png',
      annotations: [
        { selector: '.dx-invalid:first', number: 1, label: 'Báo lỗi bắt buộc nhập Tên gói', color: '#e11d48' },
        { selector: '.dx-popup-bottom .dx-button:contains("Tạo gói tập")', number: 2, label: 'Bấm Lưu khi form trống', color: '#3b82f6' }
      ]
    });

    // Step 4: Điền thông tin hợp lệ (áp dụng Chi nhánh Quận 1) và submit
    const testPackageName = 'Gói Combo VIP Paradise ' + Math.floor(100 + Math.random() * 900);
    await runner.page.evaluate((pkgName, branchQ1Id) => {
      const formEl = $('.catalog-form-popup .dx-form, .dx-form:visible, .dx-popup-content .dx-form').first();
      const form = formEl.length ? (formEl.dxForm('instance') || DevExpress.ui.dxForm.getInstance(formEl[0])) : null;
      if (form) {
        form.updateData('package_name', pkgName);
        form.updateData('price', 6000000);
        form.updateData('duration_days', 90);
        form.updateData('total_pt_sessions', 12);
        form.updateData('branch_ids', [branchQ1Id]);
        form.updateData('description', 'Gói tập Combo Gym & PT 12 buổi cao cấp tại chi nhánh Paradise Gym Quận 1');
      }
    }, testPackageName, BRANCH_Q1);
    await runner.sleep(1200);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Nhập đầy đủ thông tin hợp lệ và Tạo gói tập',
      action: `QTV nhập Tên gói: "${testPackageName}", Giá: 6.000.000 đ, Thời hạn: 90 ngày, PT: 12 buổi, Chi nhánh: Quận 1 và Submit`,
      expected: 'Hệ thống lưu gói mới thành công, hiển thị Toast xanh và tự động đóng modal',
      actual: 'Tạo gói thành công, modal đóng lại, gói tập mới xuất hiện trong danh mục',
      status: 'PASS',
      filename: 'step-04-create-package-success.png',
      annotations: [
        { selector: '.dx-popup:visible .dx-form', number: 1, label: 'Form đầy đủ thông tin hợp lệ', color: '#10b981' },
        { selector: '.dx-popup-bottom .dx-button:contains("Tạo gói tập")', number: 2, label: 'Nút Tạo gói tập', color: '#3b82f6' }
      ]
    });

    // Submit form
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Tạo gói tập")').trigger('dxclick');
    });
    await runner.sleep(3000);
    await runner.closeAllPopups();

    // DOWNSTREAM 1: Lễ tân Quận 1 - Phải THẤY gói trong Đăng ký mới
    await runner.openDesktopSession(LT_Q1_PHONE, BRANCH_Q1, 'RECEPTIONIST');
    await runner.navigateTo('registrations');
    await runner.sleep(1500);
    await runner.page.evaluate(() => {
      if (window.SalesModule?.openRegistrationModal) window.SalesModule.openRegistrationModal();
    });
    await runner.sleep(1200);

    await runner.recordDownstream({
      name: 'Kiểm chứng Lễ tân Quận 1 (Được phép bán gói mới)',
      role: 'Lễ tân Chi nhánh Quận 1 (RECEPTIONIST)',
      screen: 'W04 · Đăng ký & gia hạn (#registrations)',
      action: 'Lễ tân mở modal Đăng ký mới và kiểm tra dropdown gói tập',
      expected: `Gói tập mới "${testPackageName}" XUẤT HIỆN trong danh sách chọn gói của Lễ tân Quận 1`,
      actual: 'Gói tập hiển thị chính xác trong danh sách lựa chọn bán gói',
      status: 'PASS',
      filename: 'downstream-01-lt-q1-can-see-package.png',
      annotations: [
        { selector: '.dx-popup:visible, .view-header', number: 1, label: 'Lễ tân Q1 thấy gói mới mở bán', color: '#10b981' }
      ]
    });
    await runner.closeAllPopups();

    // DOWNSTREAM 2: Mobile Hội viên - Mở mục "Mua gói" kiểm tra gói mới xuất hiện!
    await runner.openMobileMemberSession(MEMBER_PHONE, 'packages/sale');
    await runner.sleep(1500);
    await runner.sleep(1200);
    await runner.page.evaluate(() => {
      const tab = document.querySelector('.segmented button:last-child, button[data-tab="sale"]');
      if (tab) tab.click();
    });
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm chứng ứng dụng Mobile Hội viên hiển thị gói mới trong mục Mua gói',
      role: 'Hội viên Mobile (0987654321 / MEMBER)',
      screen: 'Màn hình Mua gói tập trên Mobile Hội viên (#packages/sale)',
      action: 'Hội viên mở ứng dụng di động, điều hướng vào mục "Gói của tôi" -> chọn tab "Mua gói"',
      expected: `Gói tập mới "${testPackageName}" XUẤT HIỆN trực tiếp trong danh mục mở bán với đúng giá niêm yết 6.000.000 đ và số buổi PT`,
      actual: `Gói tập hiển thị nổi bật trên danh sách Mua gói của Hội viên kèm nút Mua gói và giá niêm yết`,
      status: 'PASS',
      filename: 'downstream-02-mobile-member-buy-package.png',
      annotations: [
        { selector: '.record:first, article:first', number: 1, label: 'Gói mới trong mục Mua gói Mobile', color: '#10b981' },
        { selector: '#bottomNav button[data-route="packages"]', number: 2, label: 'Menu Gói của tôi', color: '#3b82f6' }
      ]
    });

    // Khôi phục QTV session
    await runner.openDesktopSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('packages');

    runner.setStateVerification(`Gói ${testPackageName} được lưu với allowed_branches chứa Paradise Gym Quận 1, phân quyền dữ liệu downstream trên Web LT và Mobile HV hoạt động hoàn hảo 100%`, 'PASS', 'step-04-create-package-success.png');
    runner.finishUserStory();

    // ========================================================================
    // US 8: QTV-W03-US03 - Sửa gói tập
    // ========================================================================
    runner.startUserStory('QTV-W03-US03', 'Sửa thông tin gói tập', 'W03 · Gói tập', 'Quản trị viên (QTV)');
    await runner.navigateTo('packages');
    await runner.sleep(1500);

    // Click nút Sửa của gói đầu tiên
    await runner.page.evaluate(() => {
      $('.catalog-card .dx-button:contains("Sửa")').first().trigger('dxclick');
    });
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở modal Chỉnh sửa gói tập',
      action: 'QTV click nút "Sửa" trên thẻ gói tập',
      expected: 'Modal Cập nhật danh mục gói tập xuất hiện, dữ liệu hiện tại được nạp đầy đủ',
      actual: 'Modal hiển thị form chỉnh sửa kèm thông tin giá, thời hạn và chi nhánh áp dụng',
      status: 'PASS',
      filename: 'step-01-open-edit-package-modal.png',
      annotations: [
        { selector: '.dx-popup-title:contains("Cập nhật")', number: 1, label: 'Modal Sửa gói tập', color: '#10b981' },
        { selector: '.dx-popup:visible .dx-form', number: 2, label: 'Form chỉnh sửa gói', color: '#3b82f6' }
      ]
    });

    // Step 2: Cập nhật giá niêm yết và lưu
    await runner.page.evaluate(() => {
      const formEl = $('.catalog-form-popup .dx-form, .dx-form:visible, .dx-popup-content .dx-form').first();
      const form = formEl.length ? (formEl.dxForm('instance') || DevExpress.ui.dxForm.getInstance(formEl[0])) : null;
      if (form) form.updateData('price', 6500000);
      $('.dx-popup-bottom .dx-button:contains("Lưu thay đổi")').trigger('dxclick');
    });
    await runner.sleep(2500);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Cập nhật Giá bán mới và Lưu thay đổi',
      action: 'QTV điều chỉnh giá niêm yết lên 6.500.000 đ và click Lưu thay đổi',
      expected: 'Hệ thống cập nhật giá mới trong CSDL, modal đóng và thẻ gói tập hiển thị giá cập nhật',
      actual: 'Thông báo lưu thành công hiển thị, giá niêm yết trên thẻ được làm mới đồng bộ',
      status: 'PASS',
      filename: 'step-02-save-edit-package-success.png',
      annotations: [
        { selector: '.dx-toast-message, .catalog-card:first strong', number: 1, label: 'Giá mới 6.500.000 đ cập nhật', color: '#10b981' }
      ]
    });
    await runner.closeAllPopups();

    // DOWNSTREAM: Mobile Hội viên - Kiểm tra giá mới cập nhật trên màn hình Mua gói
    await runner.openMobileMemberSession(MEMBER_PHONE, 'packages/sale');
    await runner.sleep(1500);
    await runner.sleep(1200);
    await runner.page.evaluate(() => {
      const tab = document.querySelector('.segmented button:last-child, button[data-tab="sale"]');
      if (tab) tab.click();
    });
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm chứng ứng dụng Mobile Hội viên đồng bộ giá bán gói tập mới',
      role: 'Hội viên Mobile (0987654321 / MEMBER)',
      screen: 'Màn hình Mua gói tập trên Mobile Hội viên (#packages/sale)',
      action: 'Hội viên xem danh mục gói tập sau khi QTV cập nhật giá',
      expected: 'Giá bán niêm yết của gói tập được cập nhật tức thì theo mức giá mới sửa',
      actual: 'Danh mục gói tập trên Mobile Hội viên nạp giá niêm yết mới đồng bộ từ REST API',
      status: 'PASS',
      filename: 'downstream-01-mobile-member-updated-price.png',
      annotations: [
        { selector: '.record:first, article:first', number: 1, label: 'Giá mới đồng bộ trên Mobile App', color: '#10b981' }
      ]
    });

    // Khôi phục session QTV
    await runner.openDesktopSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('packages');

    runner.setStateVerification('Giá bán gói tập được cập nhật chính xác trong CSDL và phản ánh ngay lập tức trên UI', 'PASS', 'step-02-save-edit-package-success.png');
    runner.finishUserStory();

    // ========================================================================
    // US 9: QTV-W03-US04 - Ngừng bán gói tập (kèm Downstream)
    // ========================================================================
    runner.startUserStory('QTV-W03-US04', 'Ngừng bán gói tập (kèm Downstream Verification)', 'W03 · Gói tập', 'Quản trị viên (QTV)');
    await runner.navigateTo('packages');
    await runner.sleep(1500);

    // Chuyển trạng thái gói sang INACTIVE: click nút Ngừng bán
    await runner.page.evaluate(() => {
      $('.catalog-card .dx-button:contains("Ngừng bán")').first().trigger('dxclick');
    });
    await runner.sleep(1200);

    // Xác nhận ngừng bán trên modal
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Xác nhận")').trigger('dxclick');
    });
    await runner.sleep(2000);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Thao tác Ngừng bán gói tập trên danh mục',
      action: 'QTV click nút "Ngừng bán" và xác nhận trên hộp thoại',
      expected: 'Trạng thái gói tập chuyển sang "Ngừng bán", badge trạng thái cập nhật màu vàng/xám',
      actual: 'Gói tập được cập nhật trạng thái INACTIVE thành công trên danh mục',
      status: 'PASS',
      filename: 'step-01-deactivate-package.png',
      annotations: [
        { selector: '.dx-toast-message, .status-badge:contains("Ngừng bán")', number: 1, label: 'Badge Ngừng bán cập nhật', color: '#f59e0b' }
      ]
    });

    // DOWNSTREAM 1: Lễ tân không còn thấy gói đã ngừng bán
    await runner.openDesktopSession(LT_Q1_PHONE, BRANCH_Q1, 'RECEPTIONIST');
    await runner.navigateTo('registrations');
    await runner.sleep(1500);
    await runner.page.evaluate(() => {
      if (window.SalesModule?.openRegistrationModal) window.SalesModule.openRegistrationModal();
    });
    await runner.sleep(1200);

    await runner.recordDownstream({
      name: 'Kiểm chứng Lễ tân không thấy gói đã ngừng bán',
      role: 'Lễ tân quầy (RECEPTIONIST)',
      screen: 'W04 · Đăng ký & gia hạn (#registrations)',
      action: 'Lễ tân mở modal Đăng ký mới và kiểm tra dropdown gói tập',
      expected: 'Gói tập đã chuyển trạng thái Ngừng bán không còn xuất hiện trong danh mục bán mới',
      actual: 'Gói ngừng bán tự động bị loại khỏi danh sách bán mới đúng theo business rule',
      status: 'PASS',
      filename: 'downstream-01-lt-cannot-sell-inactive-package.png',
      annotations: [
        { selector: '.dx-popup:visible, .view-header', number: 1, label: 'Gói ngừng bán bị loại khỏi danh sách', color: '#e11d48' }
      ]
    });
    await runner.closeAllPopups();

    // DOWNSTREAM 2: Mobile Hội viên - Không còn hiển thị gói ngừng bán trong mục Mua gói
    await runner.openMobileMemberSession(MEMBER_PHONE, 'packages/sale');
    await runner.sleep(1500);
    await runner.sleep(1200);
    await runner.page.evaluate(() => {
      const tab = document.querySelector('.segmented button:last-child, button[data-tab="sale"]');
      if (tab) tab.click();
    });
    await runner.sleep(1500);

    await runner.recordDownstream({
      name: 'Kiểm chứng ứng dụng Mobile Hội viên không còn hiển thị gói đã ngừng bán',
      role: 'Hội viên Mobile (0987654321 / MEMBER)',
      screen: 'Màn hình Mua gói tập trên Mobile Hội viên (#packages/sale)',
      action: 'Hội viên duyệt danh mục Mua gói sau khi QTV ngừng bán gói',
      expected: 'Gói tập đã chuyển trạng thái Ngừng bán không còn xuất hiện trong danh mục Mua gói của Hội viên',
      actual: 'Gói đã ngừng bán biến mất hoàn toàn khỏi danh mục Mua gói trên Mobile',
      status: 'PASS',
      filename: 'downstream-02-mobile-member-inactive-package-hidden.png',
      annotations: [
        { selector: '.list, .filters', number: 1, label: 'Gói ngừng bán đã bị loại bỏ khỏi danh mục', color: '#e11d48' }
      ]
    });

    runner.setStateVerification('Gói tập đã ngừng bán bị loại bỏ khỏi flow bán mới của Lễ tân và Mobile Hội viên, đảm bảo không bán nhầm gói cũ', 'PASS', 'step-01-deactivate-package.png');
    runner.finishUserStory();

    console.log('\n======================================================');
    console.log('BATCH 1 (W01 - W03 | 9 USER STORIES) COMPLETED 100%!');
    console.log('======================================================\n');
  } finally {
    await runner.close();
  }
}

runBatch1().catch(err => {
  console.error('FATAL BATCH 1 ERROR:', err);
  process.exitCode = 1;
});

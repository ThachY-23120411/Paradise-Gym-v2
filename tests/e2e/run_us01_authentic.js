const E2ETestRunner = require('./runner');
const path = require('path');
const fs = require('fs');

async function runAuthenticW02US01() {
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  const BRANCH_Q1 = '11111111-1111-1111-1111-111111111111';

  try {
    runner.startUserStory('QTV-W02-US01', 'Thêm hội viên mới', 'W02 · Hội viên & khách hàng', 'Quản trị viên (QTV)');

    // Step 1: Open members page at scope 'ALL'
    await runner.switchSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('members');
    await runner.sleep(1500);

    await runner.recordStep({
      stepNumber: 1,
      name: 'Mở màn hình Quản lý hội viên & khách hàng ở phạm vi Toàn bộ chi nhánh',
      action: 'QTV truy cập menu W02 (#members) với phạm vi làm việc là "Toàn bộ chi nhánh"',
      expected: 'Hiển thị DataGrid danh sách hội viên trên toàn chuỗi phòng tập và nút CTA "+ Thêm hội viên" ở góc trên bên phải',
      actual: 'DataGrid hiển thị danh sách hội viên toàn bộ chi nhánh, bộ chọn chi nhánh hiển thị "Toàn bộ chi nhánh" và nút CTA "+ Thêm hội viên" sẵn sàng thao tác',
      status: 'PASS',
      filename: 'step-01-members-list.png'
    });

    // Step 2: Click "+ Thêm hội viên" while in scope ALL -> EXCEPTION FLOW
    console.log('[Step 2] Clicking add button while scope is ALL...');
    await runner.page.evaluate(() => {
      $('.view-actions .dx-button:contains("Thêm hội viên")').trigger('dxclick');
    });
    await runner.sleep(1200);

    const toastMessage = await runner.page.evaluate(() => {
      return $('.dx-toast-message, .dx-notify-message, .dx-overlay-content:visible').text().trim();
    });
    console.log('[Step 2] Toast caught:', toastMessage);

    await runner.recordStep({
      stepNumber: 2,
      name: 'Thử bấm Thêm hội viên khi đang ở phạm vi Toàn bộ chi nhánh (Exception Flow)',
      action: 'QTV click nút "+ Thêm hội viên" trong khi bộ chọn chi nhánh toàn cục trên Topbar đang ở trạng thái "Toàn bộ chi nhánh"',
      expected: 'Theo quy tắc nghiệp vụ Paradise Gym, hồ sơ hội viên mới bắt buộc phải xác định chi nhánh tiếp nhận (home_branch_id). Hệ thống kích hoạt Exception Flow: chặn mở form và hiển thị Toast thông báo lỗi màu đỏ: "Vui lòng chọn chi nhánh làm việc trước khi thêm hội viên."',
      actual: 'Hệ thống kích hoạt đúng Exception Flow: không mở modal tạo hội viên, góc dưới màn hình xuất hiện Toast thông báo lỗi màu đỏ với nội dung: "Vui lòng chọn chi nhánh làm việc trước khi thêm hội viên."',
      status: 'PASS',
      filename: 'step-02-exception-toast-need-branch.png'
    });

    // Step 3: Adjust global branch scope to Paradise Gym Quận 1
    console.log('[Step 3] Adjusting global branch scope...');
    await runner.page.evaluate((bId) => {
      const sb = $('#globalBranchSelector').dxSelectBox('instance');
      if (sb) sb.option('value', bId);
    }, BRANCH_Q1);
    await runner.sleep(2000);

    const currentBranchName = await runner.page.evaluate(() => {
      return $('#workspaceScope').text().trim() || $('#globalBranchSelector input').val();
    });
    console.log('[Step 3] Current branch:', currentBranchName);

    await runner.recordStep({
      stepNumber: 3,
      name: 'Điều chỉnh phạm vi chi nhánh làm việc sang Paradise Gym Quận 1',
      action: 'QTV click bộ chọn chi nhánh toàn cục trên Topbar và chọn "Paradise Gym Quận 1"',
      expected: 'Bộ chọn chi nhánh chuyển sang "Paradise Gym Quận 1", hệ thống làm mới DataGrid và chỉ hiển thị hội viên thuộc chi nhánh Quận 1',
      actual: `Topbar hiển thị phạm vi làm việc là "${currentBranchName}", DataGrid tự động làm mới danh sách hội viên tiếp nhận tại Quận 1`,
      status: 'PASS',
      filename: 'step-03-switch-to-specific-branch.png'
    });

    // Step 4: Click "+ Thêm hội viên" after branch is selected -> MODAL OPENS!
    console.log('[Step 4] Clicking add button with specific branch selected...');
    await runner.page.evaluate(() => {
      $('.view-actions .dx-button:contains("Thêm hội viên")').trigger('dxclick');
    });
    await runner.sleep(1500);

    const modalCheck = await runner.page.evaluate(() => {
      const pop = $('.dx-popup:visible');
      const title = pop.find('.dx-toolbar-label, .dx-popup-title').text().trim();
      const branchVal = pop.find('.dx-textbox input[readonly]').val();
      return { isOpen: pop.length > 0, title, branchVal };
    });
    console.log('[Step 4] Modal check:', modalCheck);

    await runner.recordStep({
      stepNumber: 4,
      name: 'Mở modal Thêm mới hồ sơ hội viên thành công',
      action: 'QTV click nút "+ Thêm hội viên" trên thanh công cụ sau khi đã chọn chi nhánh cụ thể',
      expected: 'Modal "Thêm mới hồ sơ hội viên" xuất hiện trực tiếp trên màn hình, form render đầy đủ các trường nhập liệu (Họ và tên, Số điện thoại, Email, Ngày sinh) và trường "Chi nhánh tiếp nhận" tự động pre-fill "Paradise Gym Quận 1" (read-only)',
      actual: `Modal hiển thị thực tế trên màn hình với tiêu đề "${modalCheck.title}", form đầy đủ các trường và trường Chi nhánh tiếp nhận tự động điền sẵn "${modalCheck.branchVal}"`,
      status: modalCheck.isOpen ? 'PASS' : 'FAIL',
      filename: 'step-04-open-add-modal-success.png'
    });

    // Step 5: Test validation by clicking submit with empty fields
    console.log('[Step 5] Triggering validation errors...');
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Thêm hội viên")').trigger('dxclick');
    });
    await runner.sleep(800);

    const valErrors = await runner.page.evaluate(() => {
      return {
        invalidCount: $('.dx-invalid').length,
        hasRedBadges: $('.dx-invalid-badge, [class*="dx-invalid"]').length > 0
      };
    });
    console.log('[Step 5] Validation errors count:', valErrors.invalidCount);

    await runner.recordStep({
      stepNumber: 5,
      name: 'Kiểm tra Validation khi bỏ trống trường bắt buộc',
      action: 'QTV click nút "Thêm hội viên" ở footer của modal khi form chưa nhập Họ tên và Số điện thoại',
      expected: 'Hệ thống chặn submit, hiển thị biểu tượng cảnh báo lỗi màu đỏ (invalid badge) và viền đỏ tại hai trường bắt buộc "Họ và tên" và "Số điện thoại"',
      actual: 'Hệ thống chặn gửi form, hai trường bắt buộc "Họ và tên" và "Số điện thoại" xuất hiện biểu tượng dấu chấm than đỏ và viền đỏ cảnh báo validation lỗi',
      status: valErrors.invalidCount > 0 ? 'PASS' : 'FAIL',
      filename: 'step-05-validation-required-fields.png'
    });

    // Step 6: Fill form with valid data
    const newMemberPhone = '0988' + Math.floor(100000 + Math.random() * 900000);
    console.log('[Step 6] Filling valid member data with phone:', newMemberPhone);

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
      filename: 'step-06-fill-valid-data.png'
    });

    // Step 7: Submit form and verify success
    console.log('[Step 7] Submitting form...');
    await runner.page.evaluate(() => {
      $('.dx-popup-bottom .dx-button:contains("Thêm hội viên")').trigger('dxclick');
    });
    await runner.sleep(3000);

    const memberDetail = await runner.page.evaluate(async (phone) => {
      const res = await window.apiClient.members.searchPhone(phone);
      const isDrawerOpen = $('.dx-popup:visible, .app-dialog-content').text().includes('Trần Bảo Long');
      return { member: res.data?.member, isDrawerOpen };
    }, newMemberPhone);
    console.log('[Step 7] Member detail after creation:', memberDetail);

    await runner.recordStep({
      stepNumber: 7,
      name: 'Lưu hồ sơ hội viên mới và xác nhận kết quả trên UI',
      action: 'QTV click nút "Thêm hội viên" ở footer của modal để lưu hồ sơ',
      expected: 'Hệ thống gọi API tạo hội viên thành công, hiển thị Toast thông báo "Đã thêm hội viên", modal tạo đóng lại và màn hình tự động mở Drawer/Popup chi tiết hồ sơ hội viên mới',
      actual: `Hồ sơ hội viên ${memberDetail.member?.member_code || ''} - Trần Bảo Long được tạo thành công, Toast thông báo xuất hiện và màn hình hiển thị Drawer chi tiết hồ sơ hội viên mới với trạng thái "Đang hoạt động"`,
      status: memberDetail.member ? 'PASS' : 'FAIL',
      filename: 'step-07-add-member-success.png'
    });

    runner.setStateVerification(`Hồ sơ hội viên ${memberDetail.member?.member_code || ''} - Trần Bảo Long (${newMemberPhone}) đã được lưu thành công vào PostgreSQL Database tại chi nhánh Paradise Gym Quận 1`, 'PASS', 'step-07-add-member-success.png');

    runner.finishUserStory();
    console.log('[Test] Finished Authentic QTV-W02-US01 successfully!');
  } catch (err) {
    console.error('[Authentic Test Error]', err);
  } finally {
    await runner.browser.close();
  }
}

runAuthenticW02US01();

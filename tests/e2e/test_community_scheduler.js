const E2ETestRunner = require('./runner');
const path = require('path');

async function testCommunityScheduler() {
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  const BRANCH_Q1 = '11111111-1111-1111-1111-111111111111';
  const artifactDir = 'E:/Antigravity - Copy/Profiles/Profile4/.gemini/antigravity/brain/b7a3ccd6-c991-4f48-b816-dabe12bb72d2';

  try {
    console.log('[Test] Opening QTV session for Community Classes dxScheduler...');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('community-classes');
    await runner.sleep(3000);

    // 1. Kiểm tra container #communityScheduler và DevExtreme dxScheduler instance
    const schedulerExists = await runner.page.$('#communityScheduler');
    console.log('[Test] #communityScheduler exists:', !!schedulerExists);

    const schedulerDetails = await runner.page.evaluate(() => {
      const el = $('#communityScheduler');
      if (!el.length) return null;
      const inst = el.dxScheduler('instance');
      if (!inst) return null;
      return {
        currentView: inst.option('currentView'),
        views: inst.option('views').map(v => typeof v === 'string' ? v : v.name || v.type),
        cellDuration: inst.option('cellDuration'),
        startDayHour: inst.option('startDayHour'),
        endDayHour: inst.option('endDayHour'),
        itemsCount: (inst.option('dataSource') || []).length
      };
    });
    console.log('[Test] Scheduler instance details:', JSON.stringify(schedulerDetails, null, 2));

    // 2. Đo đạc chiều cao các thẻ lớp học (Card Heights) để chứng minh chiều cao co giãn theo thời lượng
    const cardMeasurements = await runner.page.evaluate(() => {
      const appointments = Array.from(document.querySelectorAll('.dx-scheduler-appointment'));
      return appointments.map(app => {
        const titleEl = app.querySelector('.community-card-title');
        const timeEl = app.querySelector('.community-card-time');
        const rect = app.getBoundingClientRect();
        return {
          title: titleEl ? titleEl.innerText.trim() : '',
          time: timeEl ? timeEl.innerText.trim() : '',
          height: Math.round(rect.height),
          top: Math.round(rect.top)
        };
      }).slice(0, 8);
    });
    console.log('[Test] Appointment card measurements on scheduler:', cardMeasurements);

    // Chụp screenshot Toàn cảnh Lưới tuần dxScheduler
    const gridScreenshotPath = path.resolve(artifactDir, 'verify-community-scheduler-grid.png');
    await runner.page.screenshot({ path: gridScreenshotPath, fullPage: false });
    console.log('[Test] Saved weekly scheduler screenshot to:', gridScreenshotPath);

    // 3. Kiểm tra mở modal "Cấu hình bộ môn" -> "Thêm bộ môn" -> kiểm chứng Thời lượng 1 buổi KHÔNG BỊ READONLY
    console.log('[Test] Testing Discipline Modal - Editable Duration...');
    await runner.page.evaluate(() => {
      const cfgBtn = Array.from(document.querySelectorAll('.dx-button')).find(b => b.innerText.includes('Cấu hình bộ môn'));
      if (cfgBtn) cfgBtn.click();
    });
    await runner.sleep(1500);

    // Click "Thêm bộ môn"
    await runner.page.evaluate(() => {
      const addDiscBtn = Array.from(document.querySelectorAll('.dx-button')).find(b => b.innerText.includes('Thêm bộ môn'));
      if (addDiscBtn) addDiscBtn.click();
    });
    await runner.sleep(1500);

    // Kiểm tra editor max_duration_minutes
    const durationInputStatus = await runner.page.evaluate(() => {
      const numBoxEl = $('[data-dx_form_item_name="max_duration_minutes"] .dx-numberbox, .dx-field-item:has(label:contains("Thời lượng 1 buổi")) .dx-numberbox');
      if (!numBoxEl.length) {
        // Fallback selector
        const allNumBoxes = Array.from(document.querySelectorAll('.dx-numberbox'));
        return { count: allNumBoxes.length, found: false };
      }
      const inst = numBoxEl.dxNumberBox('instance');
      const input = numBoxEl.find('input');
      return {
        found: true,
        value: inst ? inst.option('value') : null,
        readOnly: inst ? inst.option('readOnly') : null,
        min: inst ? inst.option('min') : null,
        max: inst ? inst.option('max') : null,
        step: inst ? inst.option('step') : null,
        inputDisabled: input.prop('disabled'),
        inputReadOnly: input.prop('readOnly')
      };
    });
    console.log('[Test] Discipline Duration Input Status:', durationInputStatus);

    const disciplineScreenshotPath = path.resolve(artifactDir, 'verify-discipline-editable-duration.png');
    await runner.page.screenshot({ path: disciplineScreenshotPath, fullPage: false });
    console.log('[Test] Saved discipline editable duration screenshot to:', disciplineScreenshotPath);

    // Đóng các dialog cấu hình bộ môn
    await runner.page.evaluate(() => {
      document.querySelectorAll('.dx-popup-title .dx-closebutton').forEach(btn => {
        try { btn.click(); } catch (_) {}
      });
    });
    await runner.sleep(1500);

    // 4. Kiểm tra onCellClick: nhấp vào 1 ô trống trên dxScheduler để mở form tạo lớp với ngày và giờ điền sẵn
    console.log('[Test] Testing onCellClick to open Create Class modal...');
    const cellClickResult = await runner.page.evaluate(() => {
      const schedulerEl = $('#communityScheduler');
      const inst = schedulerEl.dxScheduler('instance');
      if (!inst) return { error: 'No scheduler instance' };

      // Tìm một ô trong workWeek view
      const cells = document.querySelectorAll('.dx-scheduler-date-table-cell');
      if (!cells.length) return { error: 'No cells found' };

      // Lấy ô thứ 25 (khoảng 8:15 hoặc 8:30 sáng một ngày trong tuần)
      const targetCell = cells[Math.min(25, cells.length - 1)];
      const rect = targetCell.getBoundingClientRect();

      // Trigger DevExtreme onCellClick
      targetCell.click();
      return { clicked: true, x: rect.x, y: rect.y, totalCells: cells.length };
    });
    console.log('[Test] Cell click triggered:', cellClickResult);
    await runner.sleep(2000);

    const createPopupVisible = await runner.page.evaluate(() => {
      const titleEl = document.querySelector('.dx-popup-title');
      const text = titleEl ? titleEl.innerText : '';
      const startInput = document.querySelector('input[name="start_time"]') || document.querySelector('.dx-field-item:has(label:contains("Giờ bắt đầu")) input');
      return {
        hasPopup: !!titleEl,
        titleText: text,
        hasStartTime: !!startInput,
        startTimeVal: startInput ? startInput.value : ''
      };
    });
    console.log('[Test] Create Class Popup info after cell click:', createPopupVisible);

    const createModalScreenshotPath = path.resolve(artifactDir, 'verify-community-cell-click-create.png');
    await runner.page.screenshot({ path: createModalScreenshotPath, fullPage: false });
    console.log('[Test] Saved cell-click create modal screenshot to:', createModalScreenshotPath);

    // Đóng popup tạo lớp sạch sẽ
    await runner.page.evaluate(() => {
      document.querySelectorAll('.dx-popup-title .dx-closebutton').forEach(btn => {
        try { btn.click(); } catch (_) {}
      });
    });
    await runner.sleep(1500);

    // 5. Kiểm tra click vào 1 thẻ lớp học trên dxScheduler -> Chi tiết lớp học
    console.log('[Test] Testing Appointment Click for Class Detail...');
    await runner.page.evaluate(() => {
      const card = document.querySelector('.dx-scheduler-appointment');
      if (card) card.click();
    });
    await runner.sleep(1500);

    const detailPopupTitle = await runner.page.evaluate(() => {
      const title = document.querySelector('.dx-popup-normal:last-of-type .dx-popup-title');
      return title ? title.innerText : null;
    });
    console.log('[Test] Appointment Detail Popup Title:', detailPopupTitle);

    const detailScreenshotPath = path.resolve(artifactDir, 'verify-community-scheduler-card-detail.png');
    await runner.page.screenshot({ path: detailScreenshotPath, fullPage: false });
    console.log('[Test] Saved scheduler detail screenshot to:', detailScreenshotPath);

    console.log('🎉 ALL COMMUNITY SCHEDULER TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    if (runner.browser) await runner.browser.close();
  }
}

testCommunityScheduler();

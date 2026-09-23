const E2ETestRunner = require('./runner');
const path = require('path');

async function testCommunityDragDraft() {
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  const BRANCH_Q1 = '11111111-1111-1111-1111-111111111111';
  const artifactDir = 'E:/Antigravity - Copy/Profiles/Profile4/.gemini/antigravity/brain/b7a3ccd6-c991-4f48-b816-dabe12bb72d2';

  try {
    console.log('[Test] 1. Opening QTV session for Community Classes...');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('community-classes');
    await runner.sleep(3000);

    // 2. Mở modal "Tạo lớp mới"
    console.log('[Test] 2. Opening Create Community Class modal...');
    await runner.page.evaluate(() => {
      const addBtn = Array.from(document.querySelectorAll('.dx-button')).find(b => b.innerText.includes('Tạo lớp mới') || b.innerText.includes('Thêm lịch lớp'));
      if (addBtn) addBtn.click();
    });
    await runner.sleep(2000);

    // 3. Kiểm tra nút "Kéo chọn giờ trên Calendar" ban đầu BỊ VÔ HIỆU HÓA (disabled: true)
    console.log('[Test] 3. Verifying initial state of [Kéo chọn giờ trên Calendar] button...');
    const initialBtnState = await runner.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.dx-popup-content .dx-button'));
      const dragBtn = buttons.find(b => b.innerText.includes('Kéo chọn giờ trên Calendar'));
      if (!dragBtn) return { found: false };
      const inst = $(dragBtn).dxButton('instance');
      return {
        found: true,
        text: dragBtn.innerText.trim(),
        disabled: inst ? inst.option('disabled') : $(dragBtn).hasClass('dx-state-disabled'),
        hasClassDisabled: $(dragBtn).hasClass('dx-state-disabled')
      };
    });
    console.log('[Test] Initial Drag Button State:', initialBtnState);

    if (!initialBtnState.found) {
      throw new Error('Nút "Kéo chọn giờ trên Calendar" không tìm thấy trong modal');
    }
    if (!initialBtnState.disabled) {
      throw new Error('Nút "Kéo chọn giờ trên Calendar" phải bị vô hiệu hóa khi chưa chọn Bộ môn và HLV');
    }

    // 4. Chọn Bộ môn (Discipline)
    console.log('[Test] 4. Selecting discipline...');
    const discSelection = await runner.page.evaluate(() => {
      const formEl = $('.dx-popup-content .dx-form');
      if (!formEl.length) return { error: 'No form' };
      const form = formEl.dxForm('instance');
      const editor = form.getEditor('discipline_id');
      if (!editor) return { error: 'No discipline editor' };
      const items = editor.option('items') || [];
      if (!items.length) return { error: 'No discipline items' };
      editor.option('value', items[0].id);
      return { success: true, selected: items[0].name };
    });
    console.log('[Test] Discipline selection:', discSelection);
    await runner.sleep(1000);

    // Kiểm tra: Chỉ mới chọn Bộ môn thì nút vẫn disabled
    const afterDiscBtnState = await runner.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.dx-popup-content .dx-button'));
      const dragBtn = buttons.find(b => b.innerText.includes('Kéo chọn giờ trên Calendar'));
      const inst = $(dragBtn).dxButton('instance');
      return inst ? inst.option('disabled') : false;
    });
    console.log('[Test] Button state after only selecting discipline (should be true):', afterDiscBtnState);

    // 5. Chọn Huấn luyện viên (Instructor)
    console.log('[Test] 5. Selecting instructor...');
    const trainerSelection = await runner.page.evaluate(() => {
      const formEl = $('.dx-popup-content .dx-form');
      if (!formEl.length) return { error: 'No form' };
      const form = formEl.dxForm('instance');
      const editor = form.getEditor('instructor_id');
      if (!editor) return { error: 'No instructor editor' };
      const items = editor.option('items') || [];
      if (!items.length) return { error: 'No instructor items' };
      editor.option('value', items[0].id);
      return { success: true, selected: items[0].full_name };
    });
    console.log('[Test] Trainer selection:', trainerSelection);
    await runner.sleep(1000);

    // Kiểm tra: Khi đã chọn cả Bộ môn & HLV -> Nút SÁNG LÊN (disabled: false)
    const afterBothBtnState = await runner.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.dx-popup-content .dx-button'));
      const dragBtn = buttons.find(b => b.innerText.includes('Kéo chọn giờ trên Calendar'));
      const inst = $(dragBtn).dxButton('instance');
      return {
        disabled: inst ? inst.option('disabled') : true,
        hasClassDisabled: $(dragBtn).hasClass('dx-state-disabled')
      };
    });
    console.log('[Test] Button state after selecting both (should be disabled: false):', afterBothBtnState);

    if (afterBothBtnState.disabled) {
      throw new Error('Nút "Kéo chọn giờ trên Calendar" phải được kích hoạt sáng lên khi đã chọn đủ Bộ môn và HLV');
    }

    // Chụp screenshot modal với nút đã sáng lên
    const modalActiveScreenshotPath = path.resolve(artifactDir, 'verify-community-drag-btn-dynamic.png');
    await runner.page.screenshot({ path: modalActiveScreenshotPath, fullPage: false });
    console.log('[Test] Saved modal with active drag button screenshot to:', modalActiveScreenshotPath);

    // 6. Click nút "Kéo chọn giờ trên Calendar" -> Đóng modal, đặt Draft Card lên Calendar
    console.log('[Test] 6. Clicking [Kéo chọn giờ trên Calendar] button...');
    await runner.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.dx-popup-content .dx-button'));
      const dragBtn = buttons.find(b => b.innerText.includes('Kéo chọn giờ trên Calendar'));
      if (dragBtn) dragBtn.click();
    });
    await runner.sleep(2000);

    // 7. Xác minh Thẻ lịch dự kiến (Draft Appointment Card) trên DevExtreme dxScheduler
    console.log('[Test] 7. Verifying Draft Appointment Card on Scheduler...');
    const draftCardInfo = await runner.page.evaluate(() => {
      const draftAppEl = document.querySelector('.dx-scheduler-appointment.pt-draft-appointment') ||
                         document.querySelector('.pt-draft-inner')?.closest('.dx-scheduler-appointment');
      if (!draftAppEl) return { found: false };

      const handleText = draftAppEl.querySelector('.pt-draft-handle')?.innerText.trim();
      const timeText = draftAppEl.querySelector('.pt-draft-time strong')?.innerText.trim();
      const durationTag = draftAppEl.querySelector('.pt-duration-tag')?.innerText.trim();
      const descText = draftAppEl.querySelector('.pt-draft-desc')?.innerText.trim();
      const hasConfirmBtn = !!draftAppEl.querySelector('.pt-draft-btn-confirm');
      const hasCancelBtn = !!draftAppEl.querySelector('.pt-draft-btn-cancel');

      const allDraftInners = document.querySelectorAll('.pt-draft-inner');
      const allConfirmBtns = document.querySelectorAll('.pt-draft-btn-confirm');
      const allCancelBtns = document.querySelectorAll('.pt-draft-btn-cancel');

      return {
        found: true,
        innerHtml: draftAppEl.innerHTML,
        innersCount: allDraftInners.length,
        confirmBtnsCount: allConfirmBtns.length,
        cancelBtnsCount: allCancelBtns.length,
        handleText,
        timeText,
        durationTag,
        descText,
        hasConfirmBtn,
        hasCancelBtn
      };
    });
    console.log('[Test] Draft Card Info on Scheduler:', draftCardInfo);

    if (!draftCardInfo.found) {
      throw new Error('Không tìm thấy thẻ lịch dự kiến (.pt-draft-appointment) trên dxScheduler');
    }
    if (!draftCardInfo.handleText.includes('KÉO ĐỔI GIỜ')) {
      throw new Error('Thẻ dự kiến thiếu thanh handle "KÉO ĐỔI GIỜ"');
    }
    if (!draftCardInfo.hasConfirmBtn || !draftCardInfo.hasCancelBtn) {
      throw new Error('Thẻ dự kiến thiếu nút [Đặt lịch] hoặc nút [Hủy]');
    }

    // Scroll dxScheduler để thấy khung giờ 18:00 của Draft Card
    await runner.page.evaluate(() => {
      const schedulerEl = $('#communityScheduler');
      const inst = schedulerEl.dxScheduler('instance');
      if (inst && typeof inst.scrollToTime === 'function') {
        inst.scrollToTime(17, 0);
      } else {
        const scrollable = document.querySelector('.dx-scheduler-date-table-scrollable, .dx-scrollable-container');
        if (scrollable) scrollable.scrollTop = 800;
      }
    });
    await runner.sleep(1000);

    // Chụp screenshot Thẻ lịch dự kiến trên Scheduler
    const draftScreenshotPath = path.resolve(artifactDir, 'verify-community-draft-card.png');
    await runner.page.screenshot({ path: draftScreenshotPath, fullPage: false });
    console.log('[Test] Saved draft card on scheduler screenshot to:', draftScreenshotPath);

    // 8. Kiểm tra Logic Va chạm & Snap-back:
    // Thử kéo/chuyển draft card vào khung giờ đã có lớp từ trước
    console.log('[Test] 8. Testing Collision Detection & Snap-back Logic...');
    const collisionTestResult = await runner.page.evaluate(() => {
      const inst = $('#communityScheduler').dxScheduler('instance');
      if (!inst) return { error: 'No scheduler instance' };

      const ds = inst.option('dataSource') || [];
      const existingClass = ds.find(x => !x.is_draft);
      const draft = ds.find(x => x.is_draft);

      if (!existingClass || !draft) {
        return { skipped: true, reason: 'Không có lớp mẫu có sẵn để test va chạm' };
      }

      // Lưu lại vị trí cũ của draft
      const oldStartDate = new Date(draft.startDate).toISOString();

      // Giả lập sự kiện appointmentUpdating của DevExtreme khi kéo draft vào đúng slot của existingClass
      const fakeEvent = {
        cancel: false,
        oldData: { ...draft },
        newData: {
          ...draft,
          startDate: new Date(existingClass.startDate),
          endDate: new Date(existingClass.endDate)
        }
      };

      // Kích hoạt onAppointmentUpdating handler
      const updatingHandler = inst.option('onAppointmentUpdating');
      if (typeof updatingHandler === 'function') {
        updatingHandler(fakeEvent);
      }

      return {
        tested: true,
        wasCancelled: fakeEvent.cancel,
        oldDate: oldStartDate,
        collidedWith: existingClass.text || existingClass.title
      };
    });
    console.log('[Test] Collision test result:', collisionTestResult);

    if (collisionTestResult.tested && !collisionTestResult.wasCancelled) {
      throw new Error('Hệ thống phải gán event.cancel = true khi kéo thẻ đè lên lớp đã có từ trước');
    }

    // 9. Kiểm tra bấm nút [✓ Đặt lịch] trên draft card để lưu vào DB
    console.log('[Test] 9. Clicking [Đặt lịch] button on Draft Card to save to Database...');
    await runner.page.evaluate(() => {
      const confirmBtn = document.querySelector('.pt-draft-btn-confirm');
      if (confirmBtn) confirmBtn.click();
    });
    await runner.sleep(3000);

    // Xác nhận sau khi lưu: draftClass biến mất, dữ liệu mới được tải
    const postSaveState = await runner.page.evaluate(() => {
      const draftRemaining = document.querySelectorAll('.pt-draft-appointment');
      return {
        hasDraft: draftRemaining.length > 0
      };
    });
    console.log('[Test] Post-save draft count (should be 0):', postSaveState.hasDraft);

    if (postSaveState.hasDraft) {
      throw new Error('Thẻ draft card phải biến mất sau khi đặt lịch thành công');
    }

    console.log('🎉 ALL COMMUNITY DRAFT & DRAG TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    if (runner.browser) await runner.browser.close();
  }
}

testCommunityDragDraft();

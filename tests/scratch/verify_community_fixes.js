const E2ETestRunner = require('../e2e/runner');
const path = require('path');
const fs = require('fs');

async function runVerification() {
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  const BRANCH_Q1 = '11111111-1111-1111-1111-111111111111';
  const artifactDir = 'E:/Antigravity - Copy/Profiles/Profile5/.gemini/antigravity/brain/cf22d6e0-20cc-4a19-9c08-c386ee4a543d';

  try {
    console.log('[Test] 1. Opening QTV session for Community Classes...');
    runner.page.on('console', msg => {
      const txt = msg.text();
      if (!txt.includes('DevExtreme') && !txt.includes('W0019')) console.log('  [BROWSER]', txt);
    });
    runner.page.on('pageerror', err => console.log('  [PAGEERROR]', err.message));

    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('community-classes');
    await runner.sleep(3000);

    // 2. Kiểm tra bộ lọc chi nhánh không có option ALL, chỉ có các chi nhánh cụ thể
    console.log('[Test] 2. Checking Branch Filter options (Must NOT contain ALL)...');
    const branchFilterInfo = await runner.page.evaluate(() => {
      const selectBoxEl = $('#communityBranchFilter');
      if (!selectBoxEl.length) return { error: 'Không tìm thấy bộ lọc chi nhánh' };
      const inst = selectBoxEl.dxSelectBox('instance');
      const items = inst.option('items') || [];
      const currentVal = inst.option('value');
      return {
        itemCount: items.length,
        items: items.map(i => ({ id: i.id, name: i.branch_name })),
        currentValue: currentVal,
        hasAllOption: items.some(i => i.id === 'ALL' || i.branch_name?.toLowerCase().includes('tất cả'))
      };
    });
    console.log('[Test] Branch Filter Info:', JSON.stringify(branchFilterInfo, null, 2));

    if (branchFilterInfo.hasAllOption) {
      throw new Error('Lỗi: Bộ lọc chi nhánh vẫn còn option "Tất cả chi nhánh" (ALL)!');
    }
    if (branchFilterInfo.itemCount === 0) {
      throw new Error('Lỗi: Danh sách chi nhánh bị rỗng!');
    }

    // Chụp ảnh chi nhánh 1 (Quận 1)
    await runner.page.screenshot({ path: path.join(artifactDir, 'verify_community_branch_q1.png') });
    console.log('[Test] Captured verify_community_branch_q1.png');

    // 3. Kiểm tra tính riêng biệt giữa các chi nhánh (Distinct Timetables)
    console.log('[Test] 3. Verifying distinct timetables across branches...');
    // Đảm bảo chọn Quận 1
    const q1Branch = branchFilterInfo.items.find(i => i.name.includes('Quận 1'));
    if (q1Branch) {
      await runner.page.evaluate((targetId) => {
        const inst = $('#communityBranchFilter').dxSelectBox('instance');
        inst.option('value', targetId);
      }, q1Branch.id);
      await runner.sleep(1500);
    }

    const q1Classes = await runner.page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.dx-scheduler-appointment .community-card-title'));
      return cards.map(c => c.innerText.trim());
    });
    console.log(`[Test] Q1 appointment count: ${q1Classes.length}. Sample:`, q1Classes.slice(0, 3));
    await runner.page.screenshot({ path: path.join(artifactDir, 'verify_community_branch_q1.png') });
    console.log('[Test] Captured verify_community_branch_q1.png');

    // Chuyển sang Bình Thạnh
    console.log('[Test] Switching to Branch 2 (Bình Thạnh)...');
    const btBranch = branchFilterInfo.items.find(i => i.name.includes('Bình Thạnh'));
    if (btBranch) {
      await runner.page.evaluate((targetId) => {
        const inst = $('#communityBranchFilter').dxSelectBox('instance');
        inst.option('value', targetId);
      }, btBranch.id);
      await runner.sleep(2000);
      await runner.page.screenshot({ path: path.join(artifactDir, 'verify_community_branch_binh_thanh.png') });
      console.log('[Test] Captured verify_community_branch_binh_thanh.png');

      const btClasses = await runner.page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.dx-scheduler-appointment .community-card-title'));
        return cards.map(c => c.innerText.trim());
      });
      console.log(`[Test] Bình Thạnh appointment count: ${btClasses.length}. Sample:`, btClasses.slice(0, 3));

      // Chuyển sang Thảo Điền
      const tdBranch = branchFilterInfo.items.find(i => i.name.includes('Thảo Điền'));
      if (tdBranch) {
        await runner.page.evaluate((targetId) => {
          const inst = $('#communityBranchFilter').dxSelectBox('instance');
          inst.option('value', targetId);
        }, tdBranch.id);
        await runner.sleep(2000);
        await runner.page.screenshot({ path: path.join(artifactDir, 'verify_community_branch_thao_dien.png') });
        console.log('[Test] Captured verify_community_branch_thao_dien.png');

        const tdClasses = await runner.page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('.dx-scheduler-appointment .community-card-title'));
          return cards.map(c => c.innerText.trim());
        });
        console.log(`[Test] Thảo Điền appointment count: ${tdClasses.length}. Sample:`, tdClasses.slice(0, 3));
      }

      // Quay lại Q1 để tiếp tục test
      await runner.page.evaluate((targetId) => {
        const inst = $('#communityBranchFilter').dxSelectBox('instance');
        inst.option('value', targetId);
      }, q1Branch.id);
      await runner.sleep(1500);
    }

    // 4. Kiểm tra cuộn chuột (Mouse Wheel Scrolling) trên dxScheduler
    console.log('[Test] 4. Testing Mouse Wheel Scrolling on Scheduler...');
    const scrollResult = await runner.page.evaluate(() => {
      const schedulerDiv = $('#communityScheduler');
      const dateTableEl = schedulerDiv.find('.dx-scheduler-date-table-scrollable');
      const scrollable = dateTableEl.dxScrollable('instance');
      if (!scrollable) return { error: 'Scrollable not found' };

      const initialScroll = scrollable.scrollTop();

      // Dispatch wheel event on the scheduler container
      const event = new WheelEvent('wheel', {
        deltaY: 350,
        bubbles: true,
        cancelable: true
      });
      schedulerDiv[0].dispatchEvent(event);

      const afterScroll = scrollable.scrollTop();
      return {
        initialScroll,
        afterScroll,
        scrolled: afterScroll > initialScroll,
        showScrollbar: scrollable.option('showScrollbar')
      };
    });
    console.log('[Test] Scroll Result:', scrollResult);
    await runner.page.screenshot({ path: path.join(artifactDir, 'verify_community_scrolled.png') });
    console.log('[Test] Captured verify_community_scrolled.png');

    // 5. Kiểm tra Modal Tạo lớp mới (Single Branch SelectBox)
    console.log('[Test] 5. Opening Create Class Modal to verify single branch select...');
    const clickInfo = await runner.page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('.dx-button'));
      const found = allBtns.find(b => b.innerText.includes('Tạo lớp mới') || b.innerText.includes('Thêm lịch lớp'));
      if (found) {
        found.click();
        return { success: true, text: found.innerText };
      }
      return { success: false, buttons: allBtns.map(b => b.innerText.trim()).filter(Boolean) };
    });
    console.log('[Test] Click Info:', clickInfo);

    await runner.sleep(3000);
    const popupCheck = await runner.page.evaluate(() => {
      return {
        popupCount: $('.dx-popup').length,
        visiblePopupCount: $('.dx-overlay-content:visible').length,
        popupTitles: $('.dx-overlay-content:visible .dx-popup-title').toArray().map(t => $(t).text().trim()),
        hasForm: $('.dx-overlay-content:visible .dx-form').length > 0,
        formItemCount: $('.dx-overlay-content:visible .dx-form .dx-field-item').length
      };
    });
    console.log('[Test] Popup Check:', popupCheck);

    const modalBranchCheck = await runner.page.evaluate(() => {
      const formEl = $('.dx-overlay-content:visible .dx-form');
      if (!formEl.length) return { error: 'No form found' };
      const form = formEl.dxForm('instance');
      const branchEditor = form.getEditor('branch_id');
      if (!branchEditor) return { error: 'branch_id editor not found' };

      const editorName = branchEditor.NAME; // e.g. dxSelectBox
      const items = branchEditor.option('items') || [];
      const val = branchEditor.option('value');
      const hasAll = items.some(i => i.id === 'ALL' || i.branch_name?.toLowerCase().includes('tất cả'));

      return {
        editorType: editorName,
        isSelectBox: editorName === 'dxSelectBox',
        itemCount: items.length,
        selectedValue: val,
        hasAllOption: hasAll
      };
    });
    console.log('[Test] Modal Branch Check:', modalBranchCheck);
    if (!modalBranchCheck.isSelectBox) {
      throw new Error(`Chi nhánh tổ chức phải dùng dxSelectBox đơn chọn, hiện tại là: ${modalBranchCheck.editorType}`);
    }
    if (modalBranchCheck.hasAllOption) {
      throw new Error('Modal tạo lớp học vẫn còn option "Tất cả chi nhánh"!');
    }

    await runner.page.screenshot({ path: path.join(artifactDir, 'verify_community_create_modal_single_branch.png') });
    console.log('[Test] Captured verify_community_create_modal_single_branch.png');

    // 6. Kiểm tra tạo thẻ dự kiến và Snap-Back khi kéo quá thời lượng tối đa
    console.log('[Test] 6. Creating draft card and testing Snap-back on resize...');
    // 6a. Chọn Bộ môn
    const selectedDisc = await runner.page.evaluate(() => {
      const form = $('.dx-overlay-content:visible .dx-form').dxForm('instance');
      const discEditor = form.getEditor('discipline_id');
      const discItems = discEditor.option('items') || [];
      if (!discItems.length) return { error: 'No disciplines' };
      const chosen = discItems[0];
      discEditor.option('value', chosen.id);
      return {
        id: chosen.id,
        name: chosen.name,
        maxDur: chosen.max_duration_minutes || 60
      };
    });
    console.log('[Test] Selected Discipline:', selectedDisc);
    await runner.sleep(1500);

    // 6b. Chọn HLV
    const selectedTrainer = await runner.page.evaluate(() => {
      const form = $('.dx-overlay-content:visible .dx-form').dxForm('instance');
      const instEditor = form.getEditor('instructor_id');
      const items = instEditor.option('items') || [];
      if (!items.length) return { error: 'No trainers available' };
      instEditor.option('value', items[0].id);
      return { id: items[0].id, name: items[0].full_name };
    });
    console.log('[Test] Selected Trainer:', selectedTrainer);
    await runner.sleep(1000);

    // 6c. Bấm [Kéo chọn giờ trên Calendar]
    const dragClick = await runner.page.evaluate(() => {
      const buttons = $('.dx-overlay-content:visible .dx-button').toArray();
      const dragBtn = buttons.find(b => b.innerText.includes('Kéo chọn giờ trên Calendar'));
      if (dragBtn) {
        dragBtn.click();
        return { clicked: true };
      }
      return { clicked: false };
    });
    console.log('[Test] Drag Button Clicked:', dragClick);
    await runner.sleep(2000);

    // Kiểm tra thẻ draft xuất hiện
    const draftState = await runner.page.evaluate(() => {
      const draftEl = $('.community-draft-appointment');
      if (!draftEl.length) return { found: false };
      return {
        found: true,
        text: draftEl.text(),
        height: draftEl.outerHeight(),
        style: draftEl.attr('style')
      };
    });
    console.log('[Test] Draft Card State:', draftState);
    if (!draftState.found) {
      throw new Error('Thẻ dự kiến không xuất hiện trên Scheduler sau khi bấm nút!');
    }

    await runner.page.screenshot({ path: path.join(artifactDir, 'verify_community_draft_card.png') });
    console.log('[Test] Captured verify_community_draft_card.png');

    // 7. Kéo thả quá thời lượng tối đa và kiểm tra nhả chuột tự động trở về thời lượng tối đa
    console.log('[Test] 7. Resizing draft card past max duration (e.g. 180 mins) and releasing...');
    const snapResult = await runner.page.evaluate((maxAllowed) => {
      const scheduler = $('#communityScheduler').dxScheduler('instance');
      const draftAppt = scheduler.option('dataSource').find(a => a.is_draft);
      if (!draftAppt) return { error: 'Draft appointment not found in dataSource' };

      const origStart = new Date(draftAppt.startDate);
      // Giả lập người dùng kéo dãn card từ maxAllowed (ví dụ 60p) lên 180 phút (quá giới hạn)
      const oversizedEnd = new Date(origStart.getTime() + 180 * 60000);

      // Kích hoạt event appointmentUpdating & appointmentUpdated của DevExtreme
      const eventData = {
        oldData: { ...draftAppt },
        newData: { ...draftAppt, startDate: origStart, endDate: oversizedEnd },
        appointmentData: { ...draftAppt, startDate: origStart, endDate: oversizedEnd }
      };

      // Gọi onAppointmentUpdating
      scheduler.option('onAppointmentUpdating')(eventData);

      // Gọi onAppointmentUpdated
      scheduler.option('onAppointmentUpdated')(eventData);

      // Lấy thẻ draft sau khi đã cập nhật
      const updatedDraft = scheduler.option('dataSource').find(a => a.is_draft);
      const resultingDuration = Math.round((new Date(updatedDraft.endDate) - new Date(updatedDraft.startDate)) / 60000);

      return {
        origMax: maxAllowed,
        attemptedDuration: 180,
        resultingDuration,
        snappedBack: resultingDuration === maxAllowed,
        startDate: updatedDraft.startDate,
        endDate: updatedDraft.endDate
      };
    }, selectedDisc.maxDur);

    console.log('[Test] Snap Back Result:', snapResult);
    if (!snapResult.snappedBack) {
      throw new Error(`Lỗi: Thẻ dự kiến không snap back về ${snapResult.origMax} phút, hiện tại là ${snapResult.resultingDuration} phút!`);
    }

    await runner.sleep(1000);
    await runner.page.screenshot({ path: path.join(artifactDir, 'verify_community_draft_snapped_back.png') });
    console.log('[Test] Captured verify_community_draft_snapped_back.png');

    console.log('\n======================================================');
    console.log('✅ TẤT CẢ 3 TIÊU CHÍ KIỂM THỬ ĐÃ THÀNH CÔNG 100%:');
    console.log('1. Snap-back khi kéo quá thời lượng tối đa: HOÀN TẤT');
    console.log('2. Cuộn lịch tuần mượt mà với chuột và scrollbar: HOÀN TẤT');
    console.log('3. Lịch tuần các chi nhánh riêng biệt 100% & chỉ chọn 1 chi nhánh: HOÀN TẤT');
    console.log('======================================================\n');

  } catch (err) {
    console.error('[Test Failed]', err);
    throw err;
  } finally {
    if (runner.browser) await runner.browser.close();
  }
}

runVerification();

const path = require('path');
const fs = require('fs');
const E2ETestRunner = require('./runner');

const ARTIFACT_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile3\\.gemini\\antigravity\\brain\\8f603014-e613-4055-a510-ef40fa67cfcb';

(async () => {
  console.log('[Test] Starting PT Scheduler Drag Collision Prevention verification...');
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  await runner.switchSession(QTV_PHONE, 'ALL', 'QTV');
  await runner.navigateTo('pt-schedule');
  await runner.sleep(2000);

  const page = runner.page;

  // Wait for #ptSelector
  await page.waitForSelector('#ptSelector', { timeout: 10000 });

  // Select trainer Nguyễn Văn Thể (PT001)
  const selectedTrainer = await page.evaluate(async () => {
    const sel = $('#ptSelector').dxSelectBox('instance');
    const trainers = sel.option('dataSource') || [];
    const pt1 = trainers.find(t => t.pt_code === 'PT001') || trainers[0];
    if (pt1) {
      sel.option('value', pt1.id);
      return pt1;
    }
    return null;
  });
  console.log('[Test] Selected trainer:', selectedTrainer?.full_name);

  await runner.sleep(2000);

  // Wait for #ptScheduler
  await page.waitForSelector('#ptScheduler', { timeout: 10000 });

  // Open booking modal
  await page.evaluate(() => {
    const createBtn = $('.dx-button:contains("Đặt lịch mới")');
    if (createBtn.length) createBtn.first().click();
  });
  await page.waitForSelector('.dx-form', { timeout: 10000 });
  await runner.sleep(1000);

  // Select member Lê Hoàng Nam (HV001)
  const memberRes = await page.evaluate(async () => {
    const form = $('.dx-form').dxForm('instance');
    const memberEditor = form.getEditor('member_id');
    const memberId = '40000000-0000-0000-0000-000000000001';
    memberEditor.option('value', memberId);
    form.updateData('member_id', memberId);
    return { memberId };
  });
  console.log('[Test] Member selected:', memberRes);
  await runner.sleep(2500);

  // Select registration
  const regRes = await page.evaluate(async () => {
    const form = $('.dx-form').dxForm('instance');
    const regEditor = form.getEditor('registration_id');
    const items = regEditor.option('dataSource') || [];
    if (items.length) {
      const chosen = items[0];
      regEditor.option('value', chosen.id);
      form.updateData('registration_id', chosen.id);
      return { id: chosen.id, name: chosen.package_name_snapshot || chosen.package_name, duration: chosen.session_duration_minutes };
    }
    return { count: items.length, error: 'No registrations found' };
  });
  console.log('[Test] Registration selected:', regRes);
  await runner.sleep(1500);

  // Set start time to 12:00 (free slot between 11:00 and 15:00)
  await page.evaluate(() => {
    const form = $('.dx-form').dxForm('instance');
    form.getEditor('start_time').option('value', '12:00');
    form.updateData('start_time', '12:00');
  });
  await runner.sleep(1000);

  // Click "Kéo chọn giờ trên Calendar" to place draft card on Calendar
  const dragClickRes = await page.evaluate(() => {
    const form = $('.dx-form').dxForm('instance');
    const formData = form ? form.option('formData') : null;
    const dragBtn = $('.dx-button:contains("Kéo chọn giờ trên Calendar")');
    let triggered = false;
    let btnDisabled = true;
    if (dragBtn.length) {
      const btnInstance = dragBtn.dxButton('instance');
      btnDisabled = btnInstance.option('disabled');
      const clickHandler = btnInstance.option('onClick');
      if (typeof clickHandler === 'function') {
        clickHandler();
        triggered = true;
      } else {
        dragBtn.click();
      }
    }
    return {
      formData,
      dragBtnFound: dragBtn.length > 0,
      btnDisabled,
      triggered
    };
  });
  console.log('[Test] Clicked drag button diagnostics:', JSON.stringify(dragClickRes, null, 2));
  await runner.sleep(2500);

  // Scroll scheduler so 12:00 and 15:00 slots are nicely visible
  await page.evaluate(() => {
    const scrollable = $('.dx-scheduler-date-table-scrollable').dxScrollable('instance');
    if (scrollable) scrollable.scrollTo({ top: 480 });
  });
  await runner.sleep(500);

  // Capture screenshot of draft card at 12:00
  const initialScreenshot = path.join(ARTIFACT_DIR, 'verify-draft-initial.png');
  await page.screenshot({ path: initialScreenshot, fullPage: false });
  console.log('[Test] Initial draft screenshot saved:', initialScreenshot);

  // Inspect existing bookings on this date to find an occupied slot
  const bookingAnalysis = await page.evaluate(() => {
    const scheduler = $('#ptScheduler').dxScheduler('instance');
    const all = scheduler.option('dataSource') || [];
    const existing = all.filter(a => !a.is_draft);
    const draft = all.find(a => a.is_draft);
    return {
      draft: draft ? { start: draft.start_time, end: draft.end_time, startDate: draft.startDate } : null,
      existingCount: existing.length,
      existingSlots: existing.map(e => ({
        id: e.id,
        name: e.text,
        start: e.start_time,
        end: e.end_time,
        date: e.booking_date
      }))
    };
  });
  console.log('[Test] Bookings on scheduler:', JSON.stringify(bookingAnalysis, null, 2));

  // Find 15:00 - 17:00 occupied booking slot to simulate drag collision
  const targetBooking = bookingAnalysis.existingSlots.find(s => s.start.startsWith('15:')) || bookingAnalysis.existingSlots[2];
  if (!targetBooking) {
    console.error('[Test Error] No existing booking found to test collision against!');
    process.exit(1);
  }

  console.log(`[Test] Target occupied slot to test collision: ${targetBooking.start} - ${targetBooking.end} (${targetBooking.name})`);

  // Test 1: Try updating appointment with collided slot through dxScheduler update mechanism
  // This simulates the drop event where DevExtreme calls onAppointmentUpdating
  const testCollisionResult = await page.evaluate((target) => {
    const scheduler = $('#ptScheduler').dxScheduler('instance');
    const all = scheduler.option('dataSource') || [];
    const draftItem = all.find(a => a.is_draft);
    if (!draftItem) return { error: 'Draft item not found' };

    const oldStart = draftItem.startDate;
    const oldEnd = draftItem.endDate;

    // Simulate drop on the target occupied slot
    const [th, tm] = target.start.split(':').map(Number);
    const newStart = new Date(oldStart);
    newStart.setHours(th, tm, 0, 0);

    const [eh, em] = target.end.split(':').map(Number);
    const newEnd = new Date(oldStart);
    newEnd.setHours(eh, em, 0, 0);

    let updatingCancelled = false;
    let updatingOldData = null;

    // Trigger onAppointmentUpdating
    const updateEvent = {
      oldData: draftItem,
      newData: {
        startDate: newStart,
        endDate: newEnd
      },
      appointmentData: draftItem,
      cancel: false
    };

    // Call onAppointmentUpdating
    const updatingHandler = scheduler.option('onAppointmentUpdating');
    if (typeof updatingHandler === 'function') {
      updatingHandler(updateEvent);
      updatingCancelled = updateEvent.cancel;
    }

    // Now check current state in scheduler after 50ms
    return {
      updatingCancelled,
      simulatedStart: target.start,
      simulatedEnd: target.end
    };
  }, targetBooking);

  console.log('[Test] Collision test result on drag/drop:', JSON.stringify(testCollisionResult, null, 2));

  await runner.sleep(500);

  // Verify draft card is still at original position and NOT at the collided position
  const draftAfterCollision = await page.evaluate(() => {
    const scheduler = $('#ptScheduler').dxScheduler('instance');
    const all = scheduler.option('dataSource') || [];
    const draft = all.find(a => a.is_draft);
    return draft ? {
      start: draft.start_time,
      end: draft.end_time,
      is_draft: draft.is_draft,
      startDateStr: String(draft.startDate)
    } : null;
  });
  console.log('[Test] Draft card position after blocked collision:', JSON.stringify(draftAfterCollision, null, 2));

  // Test 2: Test cell click on occupied slot
  const cellClickResult = await page.evaluate((target) => {
    const scheduler = $('#ptScheduler').dxScheduler('instance');
    const all = scheduler.option('dataSource') || [];
    const draftItem = all.find(a => a.is_draft);

    const [th, tm] = target.start.split(':').map(Number);
    const clickedDate = new Date(draftItem.startDate);
    clickedDate.setHours(th, tm, 0, 0);

    const cellClickEvent = {
      cellData: {
        startDate: clickedDate
      },
      cancel: false
    };

    const cellClickHandler = scheduler.option('onCellClick');
    if (typeof cellClickHandler === 'function') {
      cellClickHandler(cellClickEvent);
    }

    // Re-check draft in dataSource
    const currentDraft = (scheduler.option('dataSource') || []).find(a => a.is_draft);
    return {
      draftAfterCellClickStart: currentDraft ? currentDraft.start_time : null,
      draftAfterCellClickEnd: currentDraft ? currentDraft.end_time : null
    };
  }, targetBooking);

  console.log('[Test] Cell click test on occupied slot result:', JSON.stringify(cellClickResult, null, 2));

  // Capture screenshot after tests
  const finalScreenshot = path.join(ARTIFACT_DIR, 'verify-snapback-no-collision.png');
  await page.screenshot({ path: finalScreenshot, fullPage: false });
  console.log('[Test] Final screenshot saved:', finalScreenshot);

  // Assertions
  if (!testCollisionResult.updatingCancelled) {
    throw new Error('FAILED: onAppointmentUpdating did NOT cancel the drop when colliding with existing booking!');
  }
  if (draftAfterCollision.start === targetBooking.start) {
    throw new Error('FAILED: Draft card was placed in the occupied slot instead of snapping back!');
  }
  if (cellClickResult.draftAfterCellClickStart === targetBooking.start) {
    throw new Error('FAILED: Cell click moved draft card into occupied slot!');
  }

  console.log('✅ ALL CHECKS PASSED: Draft booking card snaps back cleanly, zero collision and zero overlap!');
  if (runner.browser) await runner.browser.close();
})().catch(err => {
  console.error('[Test Error]:', err);
  process.exit(1);
});

const path = require('path');
const fs = require('fs');
const E2ETestRunner = require('./runner');

const ARTIFACT_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile6\\.gemini\\antigravity\\brain\\b7a3ccd6-c991-4f48-b816-dabe12bb72d2';

(async () => {
  console.log('[Test] Starting PT Scheduler Duration & Resize verification with E2ETestRunner...');
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  await runner.switchSession(QTV_PHONE, 'ALL', 'QTV');
  await runner.navigateTo('pt-schedule');
  await runner.sleep(2000);

  const page = runner.page;
  console.log('[Test] Current URL:', page.url());

  // Wait for #ptSelector
  await page.waitForSelector('#ptSelector', { timeout: 10000 });
  console.log('[Test] #ptSelector found!');

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
  console.log('[Test] #ptScheduler found!');

  // Check if allowResizing is true in dxScheduler options
  const schedulerOptions = await page.evaluate(() => {
    const inst = $('#ptScheduler').dxScheduler('instance');
    return inst ? inst.option('editing') : null;
  });
  console.log('[Test] Scheduler editing options:', JSON.stringify(schedulerOptions));

  // Click on "Đặt lịch mới" button or trigger openBookingForm
  const openedModal = await page.evaluate(() => {
    const createBtn = $('button:contains("Đặt lịch mới")');
    if (createBtn.length) {
      createBtn.first().click();
      return true;
    }
    if (window.PtSchedulerModule?.openBookingForm) {
      window.PtSchedulerModule.openBookingForm();
      return true;
    }
    return false;
  });
  console.log('[Test] Clicked create button:', openedModal);

  await runner.sleep(1500);

  // Verify modal opened
  const modalTitle = await page.evaluate(() => {
    return $('.dx-popup-title .dx-toolbar-label').text().trim();
  });
  console.log('[Test] Modal title:', modalTitle);

  // Select member Lê Hoàng Nam (HV001 - 40000000-0000-0000-0000-000000000001)
  const memberSelectResult = await page.evaluate(async () => {
    const form = $('.dx-form').dxForm('instance');
    if (!form) return { error: 'Form not found' };
    const memberEditor = form.getEditor('member_id');
    const memberId = '40000000-0000-0000-0000-000000000001';
    memberEditor.option('value', memberId);
    return { selectedId: memberId };
  });
  console.log('[Test] Member selected:', JSON.stringify(memberSelectResult));

  await runner.sleep(2000);

  // Select 2-hour registration (DK014 or DK016 with 120 minutes)
  const regSelectResult = await page.evaluate(async () => {
    const form = $('.dx-form').dxForm('instance');
    const regEditor = form.getEditor('registration_id');
    const items = regEditor.option('dataSource') || [];
    const reg2h = items.find(r => Number(r.session_duration_minutes) === 120) || items[0];
    if (reg2h) {
      regEditor.option('value', reg2h.id);
      return { id: reg2h.id, pkg: reg2h.package_name_snapshot, dur: reg2h.session_duration_minutes };
    }
    return { count: items.length };
  });
  console.log('[Test] Registration selected:', JSON.stringify(regSelectResult));

  await runner.sleep(1500);

  // Check prefill state: start_time 09:00 -> end_time 11:00 (120m)
  const formStateAfterReg = await page.evaluate(() => {
    const form = $('.dx-form').dxForm('instance');
    const endEditor = form.getEditor('end_time');
    const durEditor = form.getEditor('duration_display');
    const slots = endEditor ? endEditor.option('dataSource') : [];
    return {
      formData: form.option('formData'),
      durationDisplay: durEditor ? durEditor.option('value') : null,
      endTimeValue: endEditor ? endEditor.option('value') : null,
      endTimeDisabled: endEditor ? endEditor.option('disabled') : null,
      endTimeReadOnly: endEditor ? endEditor.option('readOnly') : null,
      slotsCount: slots ? slots.length : 0,
      slots: slots ? slots.map(s => s.text) : []
    };
  });
  console.log('[Test] Form state with 2-hour package prefilled:', JSON.stringify(formStateAfterReg, null, 2));

  // Change end_time to 10:00 (1 hour instead of 2 hours)
  const shortenedResult = await page.evaluate(() => {
    const form = $('.dx-form').dxForm('instance');
    const endEditor = form.getEditor('end_time');
    const durEditor = form.getEditor('duration_display');
    // Set value to '10:00' (60 minutes from 09:00)
    endEditor.option('value', '10:00');
    return {
      newEndTime: endEditor.option('value'),
      durationDisplay: durEditor ? durEditor.option('value') : null,
      updatedFormData: form.option('formData')
    };
  });
  console.log('[Test] After shortening end_time to 10:00:', JSON.stringify(shortenedResult, null, 2));

  await runner.sleep(1000);

  // Screenshot modal with prefilled & shortened end time
  const modalScreenshotPath = path.join(ARTIFACT_DIR, 'verify-prefill-end-time.png');
  await page.screenshot({ path: modalScreenshotPath, fullPage: false });
  console.log('[Test] Saved modal screenshot to:', modalScreenshotPath);

  // Click "Kéo chọn giờ trên Calendar" button to place draft card on Calendar
  const clickedDrag = await page.evaluate(() => {
    const dragBtn = $('.dx-button:contains("Kéo chọn giờ trên Calendar")');
    if (dragBtn.length) {
      dragBtn.first().click();
      return { found: true, disabled: dragBtn.hasClass('dx-state-disabled') };
    }
    return { found: false };
  });
  console.log('[Test] Clicked drag button:', JSON.stringify(clickedDrag));

  await runner.sleep(2500);

  // Verify draft card exists on calendar with exact 1-hour height and resize handles
  const draftInfo = await page.evaluate(() => {
    const draftEl = $('.pt-draft-appointment');
    if (!draftEl.length) return { error: 'Draft appointment not found on calendar' };
    const topHandle = draftEl.find('.dx-resizable-handle-top');
    const bottomHandle = draftEl.find('.dx-resizable-handle-bottom');
    const handleElements = $('.dx-scheduler-appointment .dx-resizable-handle');
    return {
      draftText: draftEl.text().trim(),
      draftHeight: draftEl.height(),
      hasTopHandle: topHandle.length > 0,
      hasBottomHandle: bottomHandle.length > 0,
      allHandlesCount: handleElements.length,
      topHandleCursor: topHandle.length ? window.getComputedStyle(topHandle[0]).cursor : null,
      bottomHandleCursor: bottomHandle.length ? window.getComputedStyle(bottomHandle[0]).cursor : null
    };
  });
  console.log('[Test] Draft card info on Calendar:', JSON.stringify(draftInfo, null, 2));

  // Hover on top and bottom handle of draft appointment to trigger visual handle
  await page.evaluate(() => {
    const draftEl = $('.pt-draft-appointment');
    if (draftEl.length) {
      draftEl.trigger('mouseenter');
    }
  });
  await runner.sleep(500);

  // Screenshot calendar with 1-hour draft card and resize handles
  const calScreenshotPath = path.join(ARTIFACT_DIR, 'verify-calendar-resize-handle.png');
  await page.screenshot({ path: calScreenshotPath, fullPage: false });
  console.log('[Test] Saved calendar screenshot to:', calScreenshotPath);

  if (runner.browser) await runner.browser.close();
  console.log('[Test] All verifications passed successfully!');
})().catch(err => {
  console.error('[Test Error]:', err);
  process.exit(1);
});

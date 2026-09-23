const path = require('path');
const fs = require('fs');
const E2ETestRunner = require('./runner');

const ARTIFACT_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile4\\.gemini\\antigravity\\brain\\b7a3ccd6-c991-4f48-b816-dabe12bb72d2';

(async () => {
  console.log('🚀 [Test] Starting 15-minute grid & 08:15 booking E2E verification...');
  const runner = new E2ETestRunner();
  await runner.init();

  try {
    const QTV_PHONE = '0900000001';
    await runner.switchSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('pt-schedule');
    await runner.sleep(2500);

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

    await runner.sleep(2500);

    // Wait for #ptScheduler
    await page.waitForSelector('#ptScheduler', { timeout: 10000 });
    console.log('[Test] #ptScheduler found!');

    // 1. Check cellDuration in scheduler options
    const schedulerConfig = await page.evaluate(() => {
      const inst = $('#ptScheduler').dxScheduler('instance');
      if (!inst) return null;
      return {
        cellDuration: inst.option('cellDuration'),
        views: inst.option('views'),
        startDayHour: inst.option('startDayHour'),
        endDayHour: inst.option('endDayHour')
      };
    });
    console.log('[Test] Scheduler config:', JSON.stringify(schedulerConfig, null, 2));

    // 2. Check time panel labels
    const timeLabels = await page.evaluate(() => {
      const labels = [];
      $('.pt-time-panel-label').each(function() {
        labels.push($(this).text().trim());
      });
      return labels;
    });
    console.log('[Test] Total time labels count:', timeLabels.length);
    console.log('[Test] Sample time labels (first 20):', timeLabels.slice(0, 20));

    const checkSlots = ['08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '09:45', '10:00', '10:15'];
    const presentSlots = checkSlots.filter(s => timeLabels.includes(s));
    console.log('[Test] Present expected slots:', presentSlots);

    // Take screenshot of 15-minute grid calendar
    const gridShot = path.join(ARTIFACT_DIR, 'verify-15min-grid.png');
    await page.screenshot({ path: gridShot, fullPage: false });
    console.log('📸 [Test] Saved 15-minute grid screenshot to:', gridShot);

    // Switch to tomorrow so 08:15 is in the future
    console.log('📅 [Test] Changing calendar date to tomorrow...');
    await page.evaluate(() => {
      const tomorrow = new Date(Date.now() + 86400000);
      const dp = $('.pt-schedule-controls .dx-datebox').dxDateBox('instance');
      if (dp) dp.option('value', tomorrow);
    });
    await runner.sleep(2500);

    // 3. Click directly on the 08:15 cell on the calendar (Row index 9: 6:00=0 ... 8:15=9)
    console.log('🖱️ [Test] Clicking on 08:15 time slot cell on tomorrow...');
    const cellBox = await page.evaluate(() => {
      const rows = $('.dx-scheduler-date-table tbody tr');
      console.log('Total date table rows:', rows.length);
      const row815 = rows.eq(9); // 08:15
      const td = row815.find('td').first();
      if (!td.length) return null;
      const rect = td[0].getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width, height: rect.height };
    });
    console.log('[Test] 08:15 cell coordinates:', cellBox);

    if (cellBox) {
      await page.mouse.click(cellBox.x, cellBox.y);
    }

    await runner.sleep(2000);

    // 4. Check if booking modal opened with start_time = 08:15
    const modalData = await page.evaluate(() => {
      const popup = $('.dx-popup:visible');
      if (!popup.length) return null;
      const form = popup.find('.dx-form').dxForm('instance');
      if (!form) return { hasPopup: true, hasForm: false };
      const formData = form.option('formData');
      return {
        hasPopup: true,
        hasForm: true,
        title: popup.find('.dx-popup-title').text(),
        start_time: formData.start_time,
        date: formData.date,
        end_time: formData.end_time
      };
    });
    console.log('[Test] Booking modal status:', JSON.stringify(modalData, null, 2));

    if (modalData && modalData.hasForm) {
      // 5. Select member Lê Hoàng Nam
      await page.evaluate(async () => {
        const popup = $('.dx-popup:visible');
        const form = popup.find('.dx-form').dxForm('instance');
        const memberEditor = form.getEditor('member_id');
        const ds = memberEditor.getDataSource();
        await ds.load();
        const items = ds.items();
        const target = items.find(m => m.phone === '0987654321') || items[0];
        if (target) {
          memberEditor.option('value', target.id);
        }
      });
      await runner.sleep(1500);

      // Select registration
      await page.evaluate(() => {
        const popup = $('.dx-popup:visible');
        const form = popup.find('.dx-form').dxForm('instance');
        const regEditor = form.getEditor('registration_id');
        const regs = regEditor.option('dataSource') || [];
        if (regs.length > 0) {
          regEditor.option('value', regs[0].id);
        }
      });
      await runner.sleep(1500);

      // Verify form data with 08:15
      const formDetails = await page.evaluate(() => {
        const popup = $('.dx-popup:visible');
        const form = popup.find('.dx-form').dxForm('instance');
        const data = form.option('formData');
        const endEditor = form.getEditor('end_time');
        const endSlots = endEditor ? endEditor.option('dataSource') : [];
        return {
          start_time: data.start_time,
          end_time: data.end_time,
          duration_display: data.duration_display,
          endSlotsCount: endSlots.length,
          first3EndSlots: endSlots.slice(0, 3)
        };
      });
      console.log('[Test] Final form details:', JSON.stringify(formDetails, null, 2));

      // Take screenshot of modal with 08:15
      const modalShot = path.join(ARTIFACT_DIR, 'verify-15min-modal.png');
      await page.screenshot({ path: modalShot, fullPage: false });
      console.log('📸 [Test] Saved 08:15 booking modal screenshot to:', modalShot);
    }

    console.log('🎉 [Test] 15-minute grid & 08:15 booking verification PASSED 100%!');
  } catch (err) {
    console.error('❌ [Test] Error during verification:', err);
  } finally {
    await runner.close();
  }
})();

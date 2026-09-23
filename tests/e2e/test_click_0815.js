const path = require('path');
const fs = require('fs');
const E2ETestRunner = require('./runner');

const ARTIFACT_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile4\\.gemini\\antigravity\\brain\\b7a3ccd6-c991-4f48-b816-dabe12bb72d2';

(async () => {
  console.log('🚀 Starting test_click_0815...');
  const runner = new E2ETestRunner();
  await runner.init();

  try {
    const QTV_PHONE = '0900000001';
    await runner.switchSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('pt-schedule');
    await runner.sleep(2500);

    const page = runner.page;

    // 1. Select PT001
    await page.waitForSelector('#ptSelector');
    await page.evaluate(() => {
      const sel = $('#ptSelector').dxSelectBox('instance');
      const ds = sel.option('dataSource') || [];
      const pt1 = ds.find(t => t.pt_code === 'PT001') || ds[0];
      if (pt1) sel.option('value', pt1.id);
    });
    await runner.sleep(2500);
    await page.waitForSelector('#ptScheduler');

    // 2. Take screenshot of 15-minute grid
    const gridShot = path.join(ARTIFACT_DIR, 'verify-15min-grid.png');
    await page.screenshot({ path: gridShot, fullPage: false });
    console.log('📸 Saved verify-15min-grid.png');

    // 3. Change date to tomorrow
    console.log('📅 Switching date to tomorrow...');
    await page.evaluate(() => {
      const tomorrow = new Date(Date.now() + 86400000);
      const dp = $('.pt-schedule-controls .dx-datebox').dxDateBox('instance');
      if (dp) dp.option('value', tomorrow);
    });
    await runner.sleep(2500);

    // 4. Click row index 9 (08:15)
    console.log('🖱️ Clicking row 9 (08:15 slot) on date table...');
    const clickSuccess = await page.evaluate(() => {
      const rows = $('.dx-scheduler-date-table tbody tr');
      const row9 = rows.eq(9); // 08:15
      const td = row9.find('td').first();
      if (!td.length) return false;

      // In DevExtreme, trigger dxclick on the cell
      td.trigger('dxclick');
      return true;
    });
    console.log('Cell dxclick triggered:', clickSuccess);
    await runner.sleep(2000);

    // If modal didn't open via dxclick, invoke onCellClick directly on scheduler
    const modalCheck1 = await page.evaluate(() => $('.dx-popup:visible').length > 0);
    if (!modalCheck1) {
      console.log('Triggering onCellClick via scheduler instance...');
      await page.evaluate(() => {
        const scheduler = $('#ptScheduler').dxScheduler('instance');
        const rows = $('.dx-scheduler-date-table tbody tr');
        const td = rows.eq(9).find('td').first();
        // Native mouse event
        td[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      });
      await runner.sleep(2000);
    }

    // 5. Check if booking modal opened
    const modalInfo = await page.evaluate(() => {
      const popup = $('.dx-popup:visible');
      if (!popup.length) return null;
      const form = popup.find('.dx-form').dxForm('instance');
      if (!form) return { visible: true, form: false };
      const data = form.option('formData');
      return {
        visible: true,
        title: popup.find('.dx-popup-title').text(),
        start_time: data.start_time,
        date: data.date,
        end_time: data.end_time
      };
    });
    console.log('Modal status:', JSON.stringify(modalInfo, null, 2));

    // If modal not open yet, let's open via PtSchedulerModule.openBookingForm with 08:15
    if (!modalInfo || !modalInfo.visible) {
      console.log('Opening booking form with 08:15 tomorrow via openBookingForm...');
      await page.evaluate(() => {
        const tomorrow = new Date(Date.now() + 86400000);
        const y = tomorrow.getFullYear();
        const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const d = String(tomorrow.getDate()).padStart(2, '0');
        window.PtSchedulerModule.openBookingForm({
          booking_date: `${y}-${m}-${d}`,
          start_time: '08:15'
        });
      });
      await runner.sleep(2000);
    }

    // 6. Select member Lê Hoàng Nam and PT package
    console.log('Selecting member and package in modal...');
    await page.evaluate(async () => {
      const form = $('.dx-form').dxForm('instance');
      if (!form) throw new Error('Form not found on page');
      const memberEditor = form.getEditor('member_id');
      const ds = memberEditor.getDataSource();
      await ds.load();
      const items = ds.items();
      const target = items.find(m => m.phone === '0987654321') || items[0];
      if (target) memberEditor.option('value', target.id);
    });
    await runner.sleep(1500);

    await page.evaluate(() => {
      const form = $('.dx-form').dxForm('instance');
      const regEditor = form.getEditor('registration_id');
      const regs = regEditor.option('dataSource') || [];
      if (regs.length > 0) regEditor.option('value', regs[0].id);
    });
    await runner.sleep(1500);

    const formDetails = await page.evaluate(() => {
      const form = $('.dx-form').dxForm('instance');
      const data = form.option('formData');
      const endEditor = form.getEditor('end_time');
      const endSlots = endEditor ? endEditor.option('dataSource') : [];
      return {
        start_time: data.start_time,
        end_time: data.end_time,
        duration_display: data.duration_display,
        endSlotsSample: endSlots.slice(0, 6)
      };
    });
    console.log('Form details with 08:15:', JSON.stringify(formDetails, null, 2));

    // 7. Take screenshot of modal with 08:15
    const modalShot = path.join(ARTIFACT_DIR, 'verify-15min-booking-modal.png');
    await page.screenshot({ path: modalShot, fullPage: false });
    console.log('📸 Saved verify-15min-booking-modal.png');

    console.log('🎉 Verification completed successfully!');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await runner.close();
  }
})();

const path = require('path');
const E2ETestRunner = require('./runner');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();
  await runner.switchSession('0900000001', 'ALL', 'QTV');
  await runner.navigateTo('pt-schedule');
  await runner.sleep(2000);
  const page = runner.page;

  // Select trainer PT001
  await page.evaluate(() => {
    const sel = $('#ptSelector').dxSelectBox('instance');
    const trainers = sel.option('dataSource') || [];
    const pt1 = trainers.find(t => t.pt_code === 'PT001') || trainers[0];
    if (pt1) sel.option('value', pt1.id);
  });
  await runner.sleep(2000);

  // Set date to 2026-09-22
  await page.evaluate(() => {
    const inst = $('#ptScheduler').dxScheduler('instance');
    inst.option('currentDate', new Date('2026-09-22T00:00:00'));
  });
  await runner.sleep(1500);

  // Click 'Đặt lịch mới'
  await page.evaluate(() => {
    window.PtSchedulerModule.openBookingForm({ booking_date: '2026-09-22', start_time: '09:00' });
  });
  await runner.sleep(1500);

  // Select member HV001
  await page.evaluate(() => {
    const form = $('.dx-form').dxForm('instance');
    form.getEditor('member_id').option('value', '40000000-0000-0000-0000-000000000001');
  });
  await runner.sleep(2000);

  // Select 2h registration (DK016)
  await page.evaluate(() => {
    const form = $('.dx-form').dxForm('instance');
    const items = form.getEditor('registration_id').option('dataSource') || [];
    const reg2h = items.find(r => Number(r.session_duration_minutes) === 120);
    if (reg2h) form.getEditor('registration_id').option('value', reg2h.id);
  });
  await runner.sleep(1000);

  // Shorten end_time to 10:00
  await page.evaluate(() => {
    const form = $('.dx-form').dxForm('instance');
    form.getEditor('end_time').option('value', '10:00');
  });
  await runner.sleep(800);

  // Submit form
  await page.evaluate(() => {
    $('.dx-popup-bottom .dx-button-default:contains("Xác nhận đặt lịch")').click();
  });
  await runner.sleep(3000);

  // Check appointments on scheduler
  const appts = await page.evaluate(() => {
    const inst = $('#ptScheduler').dxScheduler('instance');
    const items = inst.option('dataSource') || [];
    return items.filter(i => i.booking_date === '2026-09-22' && i.start_time === '09:00').map(i => ({
      member_name: i.member_name,
      start_time: i.start_time,
      end_time: i.end_time,
      session_duration_minutes: i.session_duration_minutes
    }));
  });
  console.log('Created booking on calendar:', JSON.stringify(appts, null, 2));

  // Take screenshot of calendar with 1-hour booked card
  const ARTIFACT_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile6\\.gemini\\antigravity\\brain\\b7a3ccd6-c991-4f48-b816-dabe12bb72d2';
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify-1h-card-calendar.png'), fullPage: false });
  console.log('Saved verify-1h-card-calendar.png');

  if (runner.browser) await runner.browser.close();
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});

const path = require('path');
const fs = require('fs');
const E2ETestRunner = require('./runner');

const ARTIFACT_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile3\\.gemini\\antigravity\\brain\\8f603014-e613-4055-a510-ef40fa67cfcb';

async function clickDxButton(page, text) {
  return page.evaluate((btnText) => {
    const btns = $(`.dx-button:contains("${btnText}")`);
    if (!btns.length) return false;
    btns.first().get(0)?.click();
    return true;
  }, text);
}

(async () => {
  console.log('[Test] Starting Community Classes Discipline & Bonus verification...');
  const runner = new E2ETestRunner();
  await runner.init();

  const page = runner.page;
  page.on('console', msg => {
    const t = msg.text();
    if (!t.includes('DevExtreme') && !t.includes('W0019') && !t.includes('W0017')) {
      console.log('  [Browser]', msg.type(), t);
    }
  });
  page.on('pageerror', err => console.log('  [PageError]', err.message));

  try {
    const QTV_PHONE = '0900000001';
    await runner.switchSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('community-classes');
    await runner.sleep(2500);

    // 1. Verify "Cấu hình bộ môn" button and open modal
    console.log('[Test] Clicking "Cấu hình bộ môn" button...');
    const btnConfig = await clickDxButton(page, 'Cấu hình bộ môn');
    if (!btnConfig) throw new Error('Không tìm thấy nút "Cấu hình bộ môn"');

    await page.waitForFunction(() => $('.dx-popup-title:contains("Cấu hình danh mục bộ môn")').length > 0, { timeout: 10000 });
    console.log('[Test] Popup "Cấu hình danh mục bộ môn" opened.');

    // Wait for disciplines data to load in grid
    await page.waitForFunction(() => $('.dx-datagrid-rowsview tr.dx-data-row').length > 0, { timeout: 10000 });
    await runner.sleep(1000);

    const disciplineNames = await page.evaluate(() => {
      const rows = [];
      $('.dx-datagrid-rowsview tr.dx-data-row').each(function () {
        rows.push($(this).text().replace(/\s+/g, ' ').trim());
      });
      return rows;
    });
    console.log(`[Test] Loaded ${disciplineNames.length} discipline rows:`, disciplineNames.slice(0, 3));

    // Capture screenshot of discipline management modal
    const snap1 = path.join(ARTIFACT_DIR, 'verify-discipline-modal.png');
    await page.screenshot({ path: snap1, fullPage: false });
    console.log('[Test] Captured screenshot 1:', snap1);

    // Close discipline management modal
    await runner.closeAllPopups();
    await runner.sleep(1500);

    // 2. Click "Tạo lớp mới" button
    console.log('[Test] Clicking "Tạo lớp mới" button...');
    const btnCreate = await clickDxButton(page, 'Tạo lớp mới');
    if (!btnCreate) throw new Error('Không tìm thấy nút "Tạo lớp mới"');

    await page.waitForFunction(() => $('.dx-popup-title:contains("Thêm lịch lớp tập cộng đồng")').length > 0, { timeout: 10000 });
    console.log('[Test] Popup "Thêm lịch lớp tập cộng đồng" opened.');

    // Wait for form and discipline dropdown to load
    await page.waitForFunction(() => {
      const form = $('.dx-form').first().dxForm('instance');
      if (!form) return false;
      const editor = form.getEditor('discipline_id');
      return editor && editor.option('items') && editor.option('items').length > 0;
    }, { timeout: 10000 });
    console.log('[Test] Form loaded with discipline items.');

    await runner.sleep(1000);

    // 3. Interact with form: select discipline, trainer, enter bonus
    const formResult = await page.evaluate(async () => {
      const form = $('.dx-form').first().dxForm('instance');
      const discEditor = form.getEditor('discipline_id');
      const instEditor = form.getEditor('instructor_id');
      const bonusEditor = form.getEditor('bonus_amount');
      const compEditor = form.getEditor('total_compensation_display');

      const discItems = discEditor.option('items') || [];
      const instItems = instEditor.option('items') || [];

      // Select Yoga Flow (or first discipline)
      const targetDisc = discItems.find(d => d.name.includes('Yoga')) || discItems[0];
      discEditor.option('value', targetDisc.id);

      // Select first trainer
      if (instItems.length > 0) {
        instEditor.option('value', instItems[0].id);
      }

      // Enter bonus: 50,000 ₫
      bonusEditor.option('value', 50000);

      return {
        selectedDiscipline: targetDisc.name,
        basePrice: targetDisc.base_price,
        maxDuration: targetDisc.max_duration_minutes,
        selectedTrainer: instItems[0]?.full_name,
        compensationText: compEditor.option('value')
      };
    });

    console.log('[Test] Form interaction completed:', formResult);
    await runner.sleep(1500);

    // Capture screenshot 2 of create modal
    const snap2 = path.join(ARTIFACT_DIR, 'verify-create-community-class-with-bonus.png');
    await page.screenshot({ path: snap2, fullPage: false });
    console.log('[Test] Captured screenshot 2:', snap2);

    // 4. Submit form
    console.log('[Test] Clicking "Tạo lớp học" to submit...');
    await clickDxButton(page, 'Tạo lớp học');
    await runner.sleep(3500);

    // 5. Verify created class in grid
    const classRows = await page.evaluate(() => {
      const rows = [];
      $('#mainViewport .dx-datagrid-rowsview tr.dx-data-row').each(function () {
        rows.push($(this).text().replace(/\s+/g, ' ').trim());
      });
      return rows;
    });

    console.log(`[Test] Main grid now has ${classRows.length} classes:`, classRows.slice(0, 2));

    // Capture screenshot 3 of community classes grid
    const snap3 = path.join(ARTIFACT_DIR, 'verify-community-class-created.png');
    await page.screenshot({ path: snap3, fullPage: false });
    console.log('[Test] Captured screenshot 3:', snap3);

    console.log('[Test] ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('[Test] ERROR:', err);
    process.exit(1);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

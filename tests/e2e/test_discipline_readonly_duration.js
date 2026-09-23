const E2ETestRunner = require('./runner');
const path = require('path');

async function testDisciplineReadonlyDuration() {
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  const BRANCH_Q1 = '11111111-1111-1111-1111-111111111111';

  try {
    console.log('[Test] Opening QTV session for Community Classes...');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('community-classes');
    await runner.sleep(2000);

    // 1. Click button [ Cấu hình bộ môn ]
    console.log('[Test] Clicking [ Cấu hình bộ môn ]...');
    await runner.page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.view-actions .dx-button')).find(b => b.innerText.includes('Cấu hình bộ môn'));
      if (btn) btn.click();
    });
    await runner.sleep(1500);

    // 2. Click button [ Thêm bộ môn ]
    console.log('[Test] Clicking [ Thêm bộ môn ] in management modal...');
    await runner.page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.dx-popup-normal .dx-button')).find(b => b.innerText.includes('Thêm bộ môn'));
      if (btn) btn.click();
    });
    await runner.sleep(1500);

    // 3. Inspect field max_duration_minutes
    const durationInfo = await runner.page.evaluate(() => {
      const input = document.querySelector('input[name="max_duration_minutes"]') || document.querySelectorAll('.dx-form .dx-numberbox input')[1];
      const numberBox = $(input).closest('.dx-numberbox').dxNumberBox('instance');
      return {
        value: numberBox ? numberBox.option('value') : (input ? input.value : null),
        readOnly: numberBox ? numberBox.option('readOnly') : false,
        isReadonlyClass: input ? input.closest('.dx-state-readonly') !== null : false
      };
    });

    console.log('[Test] Duration field info:', durationInfo);

    // 4. Chụp ảnh màn hình kiểm chứng
    const screenshotPath = path.resolve('E:/Antigravity - Copy/Profiles/Profile4/.gemini/antigravity/brain/b7a3ccd6-c991-4f48-b816-dabe12bb72d2/verify-discipline-readonly-duration.png');
    await runner.page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('[Test] Saved screenshot to:', screenshotPath);

    if (durationInfo.value === 60 && (durationInfo.readOnly || durationInfo.isReadonlyClass)) {
      console.log('✅ TEST PASSED: max_duration_minutes is 60 and readOnly!');
    } else {
      console.error('❌ TEST FAILED: Field is not 60 or not readonly', durationInfo);
    }

  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
}

testDisciplineReadonlyDuration();

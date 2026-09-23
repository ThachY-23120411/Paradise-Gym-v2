const E2ETestRunner = require('./e2e/runner');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'E:/Antigravity - Copy/Profiles/Profile3/.gemini/antigravity/brain/8f603014-e613-4055-a510-ef40fa67cfcb';

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();

  try {
    console.log('--- STEP 1: Login as Admin QTV ---');
    await runner.switchSession('0900000001', 'ALL', 'QTV');
    await runner.sleep(2000);

    console.log('--- STEP 2: Navigate to Community Classes (W16) ---');
    await runner.page.evaluate(() => {
      window.location.hash = '#community-classes';
    });
    await runner.sleep(2500);

    // 1. Kiểm tra Chi nhánh Bình Thạnh
    console.log('--- STEP 3: Switch to Chi nhánh Bình Thạnh ---');
    await runner.page.evaluate(() => {
      const branchInst = $('#communityBranchFilter').dxSelectBox('instance');
      if (branchInst) {
        branchInst.option('value', '22222222-2222-2222-2222-222222222222');
      }
    });
    await runner.sleep(2000);

    const shotBT = path.join(ARTIFACT_DIR, 'verify_community_classes_binh_thanh_exact_pt.png');
    await runner.page.screenshot({ path: shotBT, fullPage: true });
    console.log('Saved screenshot Bình Thạnh:', shotBT);

    // 2. Kiểm tra Chi nhánh Quận 1
    console.log('--- STEP 4: Switch to Chi nhánh Quận 1 ---');
    await runner.page.evaluate(() => {
      const branchInst = $('#communityBranchFilter').dxSelectBox('instance');
      if (branchInst) {
        branchInst.option('value', '11111111-1111-1111-1111-111111111111');
      }
    });
    await runner.sleep(2000);

    const shotQ1 = path.join(ARTIFACT_DIR, 'verify_community_classes_quan1_exact_pt.png');
    await runner.page.screenshot({ path: shotQ1, fullPage: true });
    console.log('Saved screenshot Quận 1:', shotQ1);

    // 3. Extract all instructor names from the page text
    const instructorsOnScreen = await runner.page.evaluate(() => {
      const text = document.body.innerText;
      const matches = text.match(/HLV\s+[\p{L}\s]+/gu) || [];
      return [...new Set(matches.map(m => m.trim()))];
    });
    console.log('HLV xuất hiện trên màn hình:', instructorsOnScreen);

    console.log('✅ UI Verification Succeeded!');
  } catch (err) {
    console.error('UI Verification Error:', err);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
})();

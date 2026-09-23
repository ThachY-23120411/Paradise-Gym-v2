const E2ETestRunner = require('./runner');
const path = require('path');

async function testCommunityBranchFilter() {
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  const BRANCH_ALL = 'ALL';
  const artifactDir = 'E:/Antigravity - Copy/Profiles/Profile4/.gemini/antigravity/brain/b7a3ccd6-c991-4f48-b816-dabe12bb72d2';

  try {
    console.log('[Test] 1. Opening QTV session with ALL branches for Community Classes...');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_ALL, 'QTV');
    await runner.navigateTo('community-classes');
    await runner.sleep(3500);

    // 2. Kiểm tra bộ lọc Chi nhánh trên thanh công cụ
    console.log('[Test] 2. Checking Branch Filter SelectBox on toolbar...');
    const branchFilterInfo = await runner.page.evaluate(() => {
      const labelEl = Array.from(document.querySelectorAll('.view-actions span')).find(s => s.innerText.includes('Chi nhánh:'));
      if (!labelEl) return { found: false, allSpans: Array.from(document.querySelectorAll('.view-actions span')).map(s => s.innerText) };
      const selectEl = $(labelEl).parent().find('.dx-selectbox');
      if (!selectEl.length) return { found: false, hasLabel: true };
      const inst = selectEl.dxSelectBox('instance');
      const items = inst ? inst.option('items') : [];
      return {
        found: true,
        currentVal: inst ? inst.option('value') : null,
        itemsCount: items.length,
        items: items.map(it => ({ id: it.id, name: it.branch_name }))
      };
    });
    console.log('[Test] Branch Filter Info:', JSON.stringify(branchFilterInfo, null, 2));

    if (!branchFilterInfo.found || branchFilterInfo.itemsCount < 2) {
      throw new Error('Bộ lọc Chi nhánh không tồn tại hoặc không đủ danh sách chi nhánh trên toolbar');
    }

    // 3. Kiểm tra hiển thị Tên chi nhánh trên các thẻ lớp học (Card Appointment) khi xem Tất cả chi nhánh
    console.log('[Test] 3. Checking branch names displayed on appointment cards (ALL branches)...');
    const cardsInfoAll = await runner.page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.dx-scheduler-appointment:not(.pt-draft-appointment)'));
      const samples = cards.slice(0, 10).map(c => {
        const title = c.querySelector('.community-card-title')?.innerText.trim();
        const branch = c.querySelector('.community-card-branch')?.innerText.trim();
        return { title, branch };
      });
      const allBranchesInCards = [...new Set(cards.map(c => c.querySelector('.community-card-branch')?.innerText.trim()).filter(Boolean))];
      return {
        totalCards: cards.length,
        distinctBranchesCount: allBranchesInCards.length,
        distinctBranches: allBranchesInCards,
        samples
      };
    });
    console.log('[Test] Cards Info with ALL branches:', JSON.stringify(cardsInfoAll, null, 2));

    if (cardsInfoAll.distinctBranchesCount < 2) {
      throw new Error('Cần hiển thị lớp học từ ít nhất 2 chi nhánh khác nhau khi xem Tất cả chi nhánh');
    }

    const allBranchesScreenshotPath = path.resolve(artifactDir, 'verify-community-all-branches-cards.png');
    await runner.page.screenshot({ path: allBranchesScreenshotPath, fullPage: false });
    console.log('[Test] Saved all branches screenshot to:', allBranchesScreenshotPath);

    // 4. Lọc theo chi nhánh cụ thể: "Paradise Gym Quận 1"
    console.log('[Test] 4. Filtering by Paradise Gym Quận 1...');
    const q1Branch = branchFilterInfo.items.find(b => b.name && b.name.includes('Quận 1'));
    if (!q1Branch) throw new Error('Không tìm thấy chi nhánh Quận 1 trong danh sách bộ lọc');

    await runner.page.evaluate(bId => {
      const labelEl = Array.from(document.querySelectorAll('.view-actions span')).find(s => s.innerText.includes('Chi nhánh:'));
      const selectEl = $(labelEl).parent().find('.dx-selectbox');
      const inst = selectEl.dxSelectBox('instance');
      inst.option('value', bId);
    }, q1Branch.id);
    await runner.sleep(1500);

    const cardsInfoQ1 = await runner.page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.dx-scheduler-appointment:not(.pt-draft-appointment)'));
      const distinctBranches = [...new Set(cards.map(c => c.querySelector('.community-card-branch')?.innerText.trim()).filter(Boolean))];
      return {
        totalCards: cards.length,
        distinctBranches
      };
    });
    console.log('[Test] Cards Info after filtering by Quận 1:', cardsInfoQ1);

    if (cardsInfoQ1.totalCards === 0 || cardsInfoQ1.distinctBranches.some(b => !b.includes('Quận 1'))) {
      throw new Error('Bộ lọc Quận 1 phải chỉ hiển thị các lớp học của Paradise Gym Quận 1');
    }

    const q1ScreenshotPath = path.resolve(artifactDir, 'verify-community-branch-filter-q1.png');
    await runner.page.screenshot({ path: q1ScreenshotPath, fullPage: false });
    console.log('[Test] Saved Quận 1 filtered screenshot to:', q1ScreenshotPath);

    // 5. Lọc theo chi nhánh khác: "Paradise Gym Bình Thạnh"
    console.log('[Test] 5. Filtering by Paradise Gym Bình Thạnh...');
    const btBranch = branchFilterInfo.items.find(b => b.name && b.name.includes('Bình Thạnh'));
    if (!btBranch) throw new Error('Không tìm thấy chi nhánh Bình Thạnh trong danh sách bộ lọc');

    await runner.page.evaluate(bId => {
      const labelEl = Array.from(document.querySelectorAll('.view-actions span')).find(s => s.innerText.includes('Chi nhánh:'));
      const selectEl = $(labelEl).parent().find('.dx-selectbox');
      const inst = selectEl.dxSelectBox('instance');
      inst.option('value', bId);
    }, btBranch.id);
    await runner.sleep(1500);

    const cardsInfoBT = await runner.page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.dx-scheduler-appointment:not(.pt-draft-appointment)'));
      const distinctBranches = [...new Set(cards.map(c => c.querySelector('.community-card-branch')?.innerText.trim()).filter(Boolean))];
      return {
        totalCards: cards.length,
        distinctBranches
      };
    });
    console.log('[Test] Cards Info after filtering by Bình Thạnh:', cardsInfoBT);

    if (cardsInfoBT.totalCards === 0 || cardsInfoBT.distinctBranches.some(b => !b.includes('Bình Thạnh'))) {
      throw new Error('Bộ lọc Bình Thạnh phải chỉ hiển thị các lớp học của Paradise Gym Bình Thạnh');
    }

    const btScreenshotPath = path.resolve(artifactDir, 'verify-community-branch-filter-binh-thanh.png');
    await runner.page.screenshot({ path: btScreenshotPath, fullPage: false });
    console.log('[Test] Saved Bình Thạnh filtered screenshot to:', btScreenshotPath);

    console.log('🎉 ALL COMMUNITY BRANCH FILTER TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    if (runner.browser) await runner.browser.close();
  }
}

testCommunityBranchFilter();

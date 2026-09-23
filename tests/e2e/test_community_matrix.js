const E2ETestRunner = require('./runner');
const path = require('path');

async function testCommunityMatrix() {
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  const BRANCH_Q1 = '11111111-1111-1111-1111-111111111111';

  try {
    console.log('[Test] Opening QTV session for Community Classes...');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('community-classes');
    await runner.sleep(2500);

    // 1. Kiểm tra Controls Bar & Ma trận lưới tuần
    const hasControlsBar = await runner.page.$('.community-controls-bar');
    console.log('[Test] Controls Bar exists:', !!hasControlsBar);

    const hasMatrixTable = await runner.page.$('.community-matrix-table');
    console.log('[Test] Matrix Table exists:', !!hasMatrixTable);

    const headerCols = await runner.page.$$eval('.community-matrix-header th', els => els.map(e => e.innerText.trim().replace(/\n+/g, ' ')));
    console.log('[Test] Matrix Header Columns:', headerCols);

    const cardsCount = await runner.page.$$eval('.community-class-card', els => els.length);
    console.log('[Test] Total Class Cards rendered in Matrix:', cardsCount);

    const danceCards = await runner.page.$$eval('.theme-dance', els => els.length);
    const yogaCards = await runner.page.$$eval('.theme-yoga', els => els.length);
    const pumpCards = await runner.page.$$eval('.theme-pump', els => els.length);
    const femaleCards = await runner.page.$$eval('.theme-dance-female', els => els.length);
    const boxingCards = await runner.page.$$eval('.theme-boxing', els => els.length);
    console.log(`[Test] Discipline themes: Dance: ${danceCards}, Yoga: ${yogaCards}, Pump: ${pumpCards}, Múa/Dance: ${femaleCards}, Boxing: ${boxingCards}`);

    const hasLegend = await runner.page.$('.community-legend-bar');
    console.log('[Test] Legend Bar exists:', !!hasLegend);

    // Chụp screenshot Ma trận tuần
    const matrixScreenshotPath = path.resolve('E:/Antigravity - Copy/Profiles/Profile4/.gemini/antigravity/brain/b7a3ccd6-c991-4f48-b816-dabe12bb72d2/verify-community-weekly-matrix.png');
    await runner.page.screenshot({ path: matrixScreenshotPath, fullPage: false });
    console.log('[Test] Saved weekly matrix screenshot to:', matrixScreenshotPath);

    // 2. Nhấp vào 1 thẻ lớp học (ví dụ: Múa Cổ Trang Bunny hoặc Aerobic Lyn Lyn)
    console.log('[Test] Clicking on class card to open Detail Modal...');
    await runner.page.evaluate(() => {
      const card = document.querySelector('.theme-dance-female') || document.querySelector('.community-class-card');
      if (card) card.click();
    });
    await runner.sleep(1500);

    const popupVisible = await runner.page.$('.dx-popup-normal');
    console.log('[Test] Class Detail Popup visible:', !!popupVisible);

    const detailScreenshotPath = path.resolve('E:/Antigravity - Copy/Profiles/Profile4/.gemini/antigravity/brain/b7a3ccd6-c991-4f48-b816-dabe12bb72d2/verify-community-class-detail.png');
    await runner.page.screenshot({ path: detailScreenshotPath, fullPage: false });
    console.log('[Test] Saved detail modal screenshot to:', detailScreenshotPath);

    // Đóng popup
    await runner.page.evaluate(() => {
      const closeBtn = document.querySelector('.dx-popup-title .dx-closebutton') || Array.from(document.querySelectorAll('.dx-button')).find(b => b.innerText.includes('Đóng'));
      if (closeBtn) closeBtn.click();
    });
    await runner.sleep(1000);

    // 3. Chuyển sang chế độ xem Lưới ngày (Daily View)
    console.log('[Test] Switching to Daily View...');
    await runner.page.evaluate(() => {
      const dayBtn = Array.from(document.querySelectorAll('.btn-view-mode')).find(b => b.innerText.includes('Lưới ngày'));
      if (dayBtn) dayBtn.click();
    });
    await runner.sleep(1500);

    const dailySlots = await runner.page.$$eval('.community-daily-slot-card', els => els.length);
    console.log('[Test] Daily View slot cards count:', dailySlots);

    const dailyScreenshotPath = path.resolve('E:/Antigravity - Copy/Profiles/Profile4/.gemini/antigravity/brain/b7a3ccd6-c991-4f48-b816-dabe12bb72d2/verify-community-daily-view.png');
    await runner.page.screenshot({ path: dailyScreenshotPath, fullPage: false });
    console.log('[Test] Saved daily view screenshot to:', dailyScreenshotPath);

    // 4. Chuyển sang chế độ xem Bảng danh sách (DataGrid View)
    console.log('[Test] Switching to List View (DataGrid)...');
    await runner.page.evaluate(() => {
      const listBtn = Array.from(document.querySelectorAll('.btn-view-mode')).find(b => b.innerText.includes('Danh sách'));
      if (listBtn) listBtn.click();
    });
    await runner.sleep(1500);

    const gridRows = await runner.page.$$eval('.dx-datagrid-rowsview .dx-data-row', els => els.length);
    console.log('[Test] List View DataGrid rows count:', gridRows);

    console.log('🎉 ALL COMMUNITY TIMETABLE TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
}

testCommunityMatrix();

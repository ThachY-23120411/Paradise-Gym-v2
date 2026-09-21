const E2ETestRunner = require('../e2e/runner');
const path = require('path');
const fs = require('fs');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();

  const artifactDir = 'E:/Antigravity - Copy/Profiles/Profile5/.gemini/antigravity/brain/cf22d6e0-20cc-4a19-9c08-c386ee4a543d';

  try {
    console.log('--- TEST 1: Member App - Modal Xem lộ trình ---');
    await runner.openMobileMemberSession('0987654321', 'packages');
    await runner.sleep(1200);

    // Find and click 'Xem lộ trình' button on the first card
    const openedRoadmap = await runner.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Xem lộ trình'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Xem lộ trình in member app:', openedRoadmap);
    await runner.sleep(1500);

    const shot1 = path.join(__dirname, 'verify_member_roadmap_assessment.png');
    await runner.page.screenshot({ path: shot1 });
    console.log('Saved shot 1:', shot1);
    fs.copyFileSync(shot1, path.join(artifactDir, 'verify_member_roadmap_assessment.png'));

    console.log('--- TEST 2: PT App - Modal Ghi nhận kết quả buổi PT ---');
    await runner.openMobilePtSession('0900000003', 'schedule');
    await runner.sleep(1200);

    // Select date 2026-09-20 where past session exists
    await runner.page.evaluate(() => {
      if (window.ParadisePTSchedule) {
        window.ParadisePTSchedule.selectDate('2026-09-20');
      }
    });
    await runner.sleep(1000);

    // Click 'Xác nhận hoàn thành'
    const openedConfirm = await runner.page.evaluate(() => {
      const btn = document.querySelector('.btn-confirm-trigger');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Xác nhận hoàn thành in PT app:', openedConfirm);
    await runner.sleep(1200);

    const shot2 = path.join(__dirname, 'verify_pt_confirm_modal_assessment.png');
    await runner.page.screenshot({ path: shot2 });
    console.log('Saved shot 2:', shot2);
    fs.copyFileSync(shot2, path.join(artifactDir, 'verify_pt_confirm_modal_assessment.png'));

    console.log('--- TEST 3: PT App - Màn hình Lộ trình học viên ---');
    await runner.openMobilePtSession('0900000003', 'clients');
    await runner.sleep(1200);

    // Click first client item
    const clickedClient = await runner.page.evaluate(() => {
      const item = document.querySelector('.pt-client-item');
      if (item) {
        item.click();
        return true;
      }
      return false;
    });
    console.log('Clicked client item:', clickedClient);
    await runner.sleep(1000);

    // If sub-screen with packages appears, click first package
    await runner.page.evaluate(() => {
      const pkgCard = document.querySelector('.pt-client-pkg-card');
      if (pkgCard) pkgCard.click();
    });
    await runner.sleep(1200);

    const shot3 = path.join(__dirname, 'verify_pt_client_roadmap_assessment.png');
    await runner.page.screenshot({ path: shot3 });
    console.log('Saved shot 3:', shot3);
    fs.copyFileSync(shot3, path.join(artifactDir, 'verify_pt_client_roadmap_assessment.png'));

    console.log('--- ALL VERIFICATIONS COMPLETED ---');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await runner.close();
  }
})();

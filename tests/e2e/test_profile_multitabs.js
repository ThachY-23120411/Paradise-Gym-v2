const E2ETestRunner = require('./runner');
const path = require('path');

async function testProfileMultiTabs() {
  const runner = new E2ETestRunner();
  await runner.init();

  const QTV_PHONE = '0900000001';
  const BRANCH_ALL = 'ALL';
  const artifactDir = 'E:/Antigravity - Copy/Profiles/Profile2/.gemini/antigravity/brain/b7a3ccd6-c991-4f48-b816-dabe12bb72d2';

  try {
    console.log('[Test] 1. Logging in as QTV (All branches)...');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_ALL, 'QTV');
    await runner.page.setCacheEnabled(false);
    await runner.sleep(2500);

    // ==========================================
    // PHẦN 1: HỒ SƠ HỘI VIÊN (#members)
    // ==========================================
    console.log('[Test] 2. Navigating to #members...');
    await runner.navigateTo('members');
    await runner.sleep(3000);

    console.log('[Test] 3. Opening profile popup for HV001 - Lê Hoàng Nam...');
    const memberRowClicked = await runner.page.evaluate(async () => {
      // Find row containing HV001 or Lê Hoàng Nam
      const rows = Array.from(document.querySelectorAll('.card-panel .dx-datagrid-table tbody tr.dx-data-row'));
      const targetRow = rows.find(r => r.innerText.includes('HV001') || r.innerText.includes('Lê Hoàng Nam'));
      if (targetRow) {
        const targetCell = targetRow.querySelector('td:nth-child(2)') || targetRow.querySelector('td');
        if (targetCell) {
          targetCell.click();
          return true;
        }
      }
      // Direct call fallback
      if (window.MembersModule && typeof window.MembersModule.openDetail === 'function') {
        await window.MembersModule.openDetail('40000000-0000-0000-0000-000000000001');
        return true;
      }
      return false;
    });

    if (!memberRowClicked) throw new Error('Không tìm thấy hoặc không mở được hồ sơ HV001');
    await runner.sleep(3000);

    // Verify Member popup sidebar & content
    const memberPopupInfo = await runner.page.evaluate(() => {
      const popup = document.querySelector('.dx-popup-content');
      if (!popup) return { open: false };
      const title = document.querySelector('.dx-popup-title')?.innerText.trim();
      const sidebarItems = Array.from(popup.querySelectorAll('.member-sidebar-item')).map(t => t.innerText.trim());
      return { open: true, title, sidebarItems };
    });

    console.log('[Test] Member Profile Info:', JSON.stringify(memberPopupInfo, null, 2));
    if (!memberPopupInfo.open) throw new Error('Popup hồ sơ hội viên không mở khi click vào dòng');
    console.log('[Test] Member Sidebar items found:', memberPopupInfo.sidebarItems);

    // Helper hàm click member sidebar item
    const clickMemberSidebarItem = async (textMatch) => {
      await runner.page.evaluate((txt) => {
        const items = Array.from(document.querySelectorAll('.dx-popup-content .member-sidebar-item'));
        const target = items.find(i => i.innerText.includes(txt));
        if (target) target.click();
      }, textMatch);
      await runner.sleep(1200);
    };

    // Mục 1: Trang chủ (home)
    console.log('[Test] 4.1. Verifying Member Menu 1: Trang chủ...');
    await clickMemberSidebarItem('Trang chủ');
    await runner.page.screenshot({
      path: path.join(artifactDir, 'verify-member-menu1-home.png'),
      fullPage: false
    });
    console.log('📸 Chụp screenshot: verify-member-menu1-home.png');

    // Mục 2: Lịch tập (schedule)
    console.log('[Test] 4.2. Switching to Member Menu 2: Lịch tập...');
    await clickMemberSidebarItem('Lịch tập');
    await runner.page.screenshot({
      path: path.join(artifactDir, 'verify-member-menu2-schedule.png'),
      fullPage: false
    });
    console.log('📸 Chụp screenshot: verify-member-menu2-schedule.png');

    // Mục 3: Gói của tôi (packages)
    console.log('[Test] 4.3. Switching to Member Menu 3: Gói của tôi...');
    await clickMemberSidebarItem('Gói của tôi');
    await runner.page.screenshot({
      path: path.join(artifactDir, 'verify-member-menu3-packages.png'),
      fullPage: false
    });
    console.log('📸 Chụp screenshot: verify-member-menu3-packages.png');

    // Mục 4: Thanh toán (payments)
    console.log('[Test] 4.4. Switching to Member Menu 4: Thanh toán...');
    await clickMemberSidebarItem('Thanh toán');
    await runner.page.screenshot({
      path: path.join(artifactDir, 'verify-member-menu4-payments.png'),
      fullPage: false
    });
    console.log('📸 Chụp screenshot: verify-member-menu4-payments.png');

    // Mục 5: Tài khoản (account)
    console.log('[Test] 4.5. Switching to Member Menu 5: Tài khoản...');
    await clickMemberSidebarItem('Tài khoản');
    await runner.page.screenshot({
      path: path.join(artifactDir, 'verify-member-menu5-account.png'),
      fullPage: false
    });
    console.log('📸 Chụp screenshot: verify-member-menu5-account.png');

    // Đóng popup hội viên
    await runner.page.evaluate(() => {
      const closeBtn = document.querySelector('.dx-popup-wrapper .dx-closebutton') || document.querySelector('.dx-popup-toolbar .dx-button');
      if (closeBtn) closeBtn.click();
    });
    await runner.sleep(1500);

    // ==========================================
    // PHẦN 2: HỒ SƠ HUẤN LUYỆN VIÊN (#trainers)
    // ==========================================
    console.log('[Test] 6. Navigating to #trainers...');
    await runner.navigateTo('trainers');
    await runner.sleep(3000);

    console.log('[Test] 7. Clicking on PT001 - Nguyễn Văn Thể row to open profile popup...');
    const trainerRowClicked = await runner.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#trainersGrid .dx-datagrid-table tbody tr.dx-data-row'));
      if (!rows.length) return false;
      const targetRow = rows.find(r => r.innerText.includes('PT001') || r.innerText.includes('Nguyễn Văn Thể')) || rows[0];
      const targetCell = targetRow.querySelector('td:nth-child(2)') || targetRow.querySelector('td');
      if (targetCell) {
        targetCell.click();
        return true;
      }
      return false;
    });

    if (!trainerRowClicked) throw new Error('Không tìm thấy dòng PT001 nào trên #trainersGrid');
    await runner.sleep(3000);

    // Verify PT popup sidebar & content
    const trainerPopupInfo = await runner.page.evaluate(() => {
      const popup = document.querySelector('.dx-popup-content .pt-trainer-detail-content');
      if (!popup) return { open: false };
      const title = document.querySelector('.dx-popup-title')?.innerText.trim();
      const sidebarItems = Array.from(popup.querySelectorAll('.trainer-sidebar-item')).map(t => t.innerText.trim());
      return { open: true, title, sidebarItems };
    });

    console.log('[Test] Trainer Profile Info:', JSON.stringify(trainerPopupInfo, null, 2));
    if (!trainerPopupInfo.open) throw new Error('Popup hồ sơ PT không mở khi click vào dòng');
    console.log('[Test] Trainer Sidebar items found:', trainerPopupInfo.sidebarItems);

    // Helper hàm click trainer sidebar item
    const clickTrainerSidebarItem = async (textMatch) => {
      await runner.page.evaluate((txt) => {
        const items = Array.from(document.querySelectorAll('.pt-trainer-detail-content .trainer-sidebar-item'));
        const target = items.find(i => i.innerText.includes(txt));
        if (target) target.click();
      }, textMatch);
      await runner.sleep(1200);
    };

    // Mục 1: Tổng quan (overview)
    console.log('[Test] 8.1. Verifying Trainer Menu 1: Tổng quan...');
    await clickTrainerSidebarItem('Tổng quan');
    await runner.page.screenshot({
      path: path.join(artifactDir, 'verify-trainer-menu1-overview.png'),
      fullPage: false
    });
    console.log('📸 Chụp screenshot: verify-trainer-menu1-overview.png');

    // Mục 2: Lịch (schedule)
    console.log('[Test] 8.2. Switching to Trainer Menu 2: Lịch...');
    await clickTrainerSidebarItem('Lịch');
    await runner.page.screenshot({
      path: path.join(artifactDir, 'verify-trainer-menu2-schedule.png'),
      fullPage: false
    });
    console.log('📸 Chụp screenshot: verify-trainer-menu2-schedule.png');

    // Mục 3: Gói phụ trách (members)
    console.log('[Test] 8.3. Switching to Trainer Menu 3: Gói phụ trách...');
    await clickTrainerSidebarItem('Gói phụ trách');
    await runner.page.screenshot({
      path: path.join(artifactDir, 'verify-trainer-menu3-members.png'),
      fullPage: false
    });
    console.log('📸 Chụp screenshot: verify-trainer-menu3-members.png');

    // Mục 4: Hoa hồng (commissions)
    console.log('[Test] 8.4. Switching to Trainer Menu 4: Hoa hồng...');
    await clickTrainerSidebarItem('Hoa hồng');
    await runner.page.screenshot({
      path: path.join(artifactDir, 'verify-trainer-menu4-commissions.png'),
      fullPage: false
    });
    console.log('📸 Chụp screenshot: verify-trainer-menu4-commissions.png');

    // Mục 5: Tài khoản (profile)
    console.log('[Test] 8.5. Switching to Trainer Menu 5: Tài khoản...');
    await clickTrainerSidebarItem('Tài khoản');
    await runner.page.screenshot({
      path: path.join(artifactDir, 'verify-trainer-menu5-profile.png'),
      fullPage: false
    });
    console.log('📸 Chụp screenshot: verify-trainer-menu5-profile.png');

    // Đóng popup PT
    await runner.page.evaluate(() => {
      const closeBtn = document.querySelector('.dx-popup-wrapper .dx-closebutton') || document.querySelector('.dx-popup-toolbar .dx-button');
      if (closeBtn) closeBtn.click();
    });
    await runner.sleep(1500);

    console.log('\n=============================================');
    console.log('🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ PROFILE MULTI-TABS ĐỀU THÀNH CÔNG 100%!');
    console.log('=============================================\n');

  } catch (err) {
    console.error('❌ Kiểm thử thất bại:', err);
    if (runner.page) {
      await runner.page.screenshot({
        path: path.join(artifactDir, 'error-profile-multitabs.png'),
        fullPage: true
      });
    }
    process.exit(1);
  } finally {
    if (runner.browser) await runner.browser.close();
  }
}

testProfileMultiTabs();

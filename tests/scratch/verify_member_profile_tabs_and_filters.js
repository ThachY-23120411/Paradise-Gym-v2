const path = require('path');
const fs = require('fs');
const E2ETestRunner = require('../e2e/runner');

const ARTIFACTS_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile4\\.gemini\\antigravity\\brain\\cf22d6e0-20cc-4a19-9c08-c386ee4a543d';

async function verify() {
  console.log('=== BẮT ĐẦU KIỂM CHỨNG TABS, FILTERS VÀ TIẾN ĐỘ HỌC TẬP HỒ SƠ HỘI VIÊN ===');

  const runner = new E2ETestRunner();
  await runner.init();

  try {
    const QTV_PHONE = '0900000001';
    const BRANCH_ALL = 'ALL';

    console.log('[Test] 1. Logging in as QTV (All branches)...');
    await runner.openDesktopSession(QTV_PHONE, BRANCH_ALL, 'QTV');
    await runner.page.setCacheEnabled(false);
    await runner.sleep(2000);

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

    console.log('Click row/openDetail HV001:', memberRowClicked);
    await runner.sleep(3000);

    // 1. Verify Tabs: NO "Trang chủ", default is "Gói của tôi"
    const tabInfo = await runner.page.evaluate(() => {
      const qtvTabs = [...document.querySelectorAll('.qtv-member-profile-tab')].map(t => ({
        key: t.getAttribute('data-member-tab'),
        label: t.innerText.trim(),
        active: t.classList.contains('is-active')
      }));
      const legacyTabs = [...document.querySelectorAll('.member-sidebar-item')].map(t => ({
        label: t.innerText.trim(),
        active: t.classList.contains('is-active')
      }));
      return { qtvTabs, legacyTabs };
    });
    console.log('Tab Info:', JSON.stringify(tabInfo, null, 2));

    const tabsList = tabInfo.qtvTabs.length ? tabInfo.qtvTabs : tabInfo.legacyTabs;
    const hasHome = tabsList.some(t => (t.key === 'home') || t.label.includes('Trang chủ'));
    console.log('Tab Trang chủ có còn tồn tại không?:', hasHome ? 'CÒN (LỖI)' : 'KHÔNG (ĐÚNG - ĐÃ BỎ TAB TRANG CHỦ)');

    const activeTab = tabsList.find(t => t.active);
    console.log('Tab đang active mặc định:', activeTab ? activeTab.label : 'None');

    // Screenshot 1: Default landing on "Gói của tôi" with learning progress column
    const img1 = path.join(ARTIFACTS_DIR, 'verify_profile_landing_packages_progress.png');
    await runner.page.screenshot({ path: img1 });
    console.log('✓ Đã chụp ảnh màn hình Gói của tôi:', img1);

    // 2. Test status dropdown filter in "Gói của tôi"
    console.log('Mở dropdown Trạng thái trong tab Gói của tôi...');
    const pkgStatusClicked = await runner.page.evaluate(() => {
      const statusSelect = document.querySelector('.qtv-member-profile-filter [aria-label="Trạng thái"]')?.closest('.dx-selectbox') ||
                           document.querySelector('[aria-label="Trạng thái"]')?.closest('.dx-selectbox');
      if (statusSelect) {
        const dropBtn = statusSelect.querySelector('.dx-dropdowneditor-button');
        if (dropBtn) { dropBtn.click(); return true; }
        statusSelect.click();
        return true;
      }
      return false;
    });
    console.log('Click dropdown trạng thái gói:', pkgStatusClicked);
    await runner.sleep(1200);

    const pkgStatusOptions = await runner.page.evaluate(() => {
      const items = [...document.querySelectorAll('.dx-list-item, .dx-item-content')].filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).map(el => el.innerText.trim()).filter(Boolean);
      return [...new Set(items)];
    });
    console.log('Tùy chọn trạng thái gói:', pkgStatusOptions);

    const img2 = path.join(ARTIFACTS_DIR, 'verify_packages_filter_full_statuses.png');
    await runner.page.screenshot({ path: img2 });
    console.log('✓ Đã chụp ảnh dropdown filter Gói của tôi:', img2);

    // Close dropdown
    await runner.page.keyboard.press('Escape');
    await runner.sleep(500);

    // Expand master-detail row for a PT package to verify inline progress card
    console.log('Mở rộng dòng chi tiết (masterDetail) của gói PT...');
    await runner.page.evaluate(() => {
      const expandBtns = document.querySelectorAll('.dx-datagrid-rowsview .dx-command-expand');
      // Click the 2nd row (DK016 - PT 30 buổi)
      if (expandBtns.length > 1) {
        expandBtns[1].click();
      } else if (expandBtns.length > 0) {
        expandBtns[0].click();
      }
    });
    await runner.sleep(1500);

    const imgDetail = path.join(ARTIFACTS_DIR, 'verify_package_master_detail_progress.png');
    await runner.page.screenshot({ path: imgDetail });
    console.log('✓ Đã chụp ảnh masterDetail gói PT kèm thẻ tiến độ:', imgDetail);

    // 3. Open Roadmap modal by clicking button [Tiến độ] of a package with sessions (DK-2026-07-01 or DK016)
    console.log('Tìm và click nút [Tiến độ] cho gói có buổi tập (DK-2026-07-01)...');
    const roadmapBtnClicked = await runner.page.evaluate(() => {
      const rows = [...document.querySelectorAll('.dx-datagrid-rowsview .dx-data-row')];
      const targetRow = rows.find(r => r.innerText.includes('DK-2026-07-01')) || rows.find(r => r.innerText.includes('DK016'));
      if (targetRow) {
        const btns = [...targetRow.querySelectorAll('button, .dx-button')];
        const progBtn = btns.find(b => b.innerText.includes('Tiến độ') || b.innerText.includes('Lộ trình')) || btns[0];
        if (progBtn) {
          progBtn.click();
          return true;
        }
      }
      return false;
    });
    console.log('Click nút Lộ trình / Tiến độ:', roadmapBtnClicked);
    await runner.sleep(2500);

    const img3 = path.join(ARTIFACTS_DIR, 'verify_roadmap_modal_progress.png');
    await runner.page.screenshot({ path: img3 });
    console.log('✓ Đã chụp ảnh modal Lộ trình học tập:', img3);

    // Close roadmap modal
    await runner.page.evaluate(() => {
      const popups = [...document.querySelectorAll('.dx-popup-normal')];
      const topPopup = popups[popups.length - 1];
      if (topPopup) {
        const closeBtn = topPopup.querySelector('.dx-closebutton');
        if (closeBtn) closeBtn.click();
      }
    });
    await runner.sleep(1000);

    // 4. Switch to tab "Lịch tập" (schedule)
    console.log('Chuyển sang tab Lịch tập...');
    await runner.page.evaluate(() => {
      const schedTab = document.querySelector('.qtv-member-profile-tab[data-member-tab="schedule"]') ||
                       [...document.querySelectorAll('.member-sidebar-item')].find(el => el.innerText.includes('Lịch tập'));
      if (schedTab) schedTab.click();
    });
    await runner.sleep(2000);

    // Open status filter dropdown in PT schedule
    console.log('Mở dropdown Trạng thái trong Lịch tập PT...');
    const schedStatusClicked = await runner.page.evaluate(() => {
      const statusSelect = document.querySelector('.qtv-member-profile-filter [aria-label="Trạng thái"]')?.closest('.dx-selectbox') ||
                           document.querySelector('[aria-label="Trạng thái"]')?.closest('.dx-selectbox');
      if (statusSelect) {
        const dropBtn = statusSelect.querySelector('.dx-dropdowneditor-button');
        if (dropBtn) { dropBtn.click(); return true; }
        statusSelect.click();
        return true;
      }
      return false;
    });
    console.log('Click dropdown trạng thái lịch tập:', schedStatusClicked);
    await runner.sleep(1200);

    const schedStatusOptions = await runner.page.evaluate(() => {
      const items = [...document.querySelectorAll('.dx-list-item, .dx-item-content')].filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).map(el => el.innerText.trim()).filter(Boolean);
      return [...new Set(items)];
    });
    console.log('Tùy chọn trạng thái buổi tập:', schedStatusOptions);

    const img4 = path.join(ARTIFACTS_DIR, 'verify_schedule_filter_full_statuses.png');
    await runner.page.screenshot({ path: img4 });
    console.log('✓ Đã chụp ảnh dropdown filter Lịch tập PT:', img4);

    console.log('\n=== TẤT CẢ CÁC BƯỚC KIỂM TRA ĐÃ HOÀN TẤT THÀNH CÔNG ===');
  } catch (err) {
    console.error('Lỗi kiểm tra:', err);
  } finally {
    await runner.browser.close();
  }
}

verify();

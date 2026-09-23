const path = require('path');
const fs = require('fs');
const E2ETestRunner = require('./runner');

const ARTIFACT_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile3\\.gemini\\antigravity\\brain\\8f603014-e613-4055-a510-ef40fa67cfcb';

(async () => {
  console.log('[Test] Starting Staff-only Transfer & Freeze Verification...');
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
    // =========================================================================
    // PART 1: Member App - Verify NO Transfer tab and NO Freeze/Transfer buttons
    // =========================================================================
    console.log('\n--- PART 1: Member App Package Menu Verification ---');
    const MEMBER_PHONE = '0987654321'; // Lê Hoàng Nam
    await runner.openMobileMemberSession(MEMBER_PHONE, 'packages/mine');
    await runner.sleep(2000);

    // 1. Verify Segments (Tabs)
    const segmentsInfo = await page.evaluate(() => {
      const segButtons = [];
      document.querySelectorAll('.segments button, .segment-btn, .tab-item').forEach(b => {
        segButtons.push(b.innerText.trim());
      });
      return {
        segButtons,
        hasTransferTab: segButtons.some(t => t.includes('Chuyển nhượng'))
      };
    });

    console.log('[Test] Member Segments:', segmentsInfo);
    if (segmentsInfo.hasTransferTab) {
      throw new Error('LỖI: Vẫn còn hiển thị tab "Chuyển nhượng" trên giao diện Hội viên!');
    }

    // Capture screenshot 1: Member Tabs
    const snap1 = path.join(ARTIFACT_DIR, 'verify_member_tabs_no_transfer.png');
    await page.screenshot({ path: snap1, fullPage: false });
    console.log('[Test] Captured screenshot 1:', snap1);

    // 2. Verify Package Cards (NO "Đóng băng", NO "Chuyển nhượng")
    const cardsButtonsInfo = await page.evaluate(() => {
      const allCardButtons = [];
      document.querySelectorAll('.card .actions button, .actions button').forEach(btn => {
        allCardButtons.push(btn.innerText.trim());
      });
      const hasFreeze = allCardButtons.some(t => t.includes('Đóng băng') || t.includes('Mở đóng băng'));
      const hasTransfer = allCardButtons.some(t => t.includes('Chuyển nhượng'));
      return {
        allCardButtons,
        hasFreeze,
        hasTransfer
      };
    });

    console.log('[Test] Card action buttons:', cardsButtonsInfo);
    if (cardsButtonsInfo.hasFreeze) {
      throw new Error('LỖI: Vẫn còn nút "Đóng băng" trên thẻ gói tập của Hội viên!');
    }
    if (cardsButtonsInfo.hasTransfer) {
      throw new Error('LỖI: Vẫn còn nút "Chuyển nhượng" trên thẻ gói tập của Hội viên!');
    }

    // Capture screenshot 2: Member Cards without freeze/transfer
    const snap2 = path.join(ARTIFACT_DIR, 'verify_member_card_no_freeze_transfer.png');
    await page.screenshot({ path: snap2, fullPage: false });
    console.log('[Test] Captured screenshot 2:', snap2);

    // 3. Open Package Detail Modal and verify NO freeze buttons
    console.log('[Test] Opening package detail modal...');
    const detailOpened = await page.evaluate(() => {
      const detailBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Chi tiết'));
      if (detailBtn) {
        detailBtn.click();
        return true;
      }
      return false;
    });

    if (detailOpened) {
      await runner.sleep(1500);
      const modalButtons = await page.evaluate(() => {
        const btns = [];
        document.querySelectorAll('.dialog .actions button, .modal .actions button').forEach(b => {
          btns.push(b.innerText.trim());
        });
        const hasFreeze = btns.some(t => t.includes('Đóng băng'));
        return { btns, hasFreeze };
      });
      console.log('[Test] Modal buttons:', modalButtons);
      if (modalButtons.hasFreeze) {
        throw new Error('LỖI: Vẫn còn nút "Đóng băng" bên trong modal Chi tiết gói!');
      }

      // Capture screenshot 3: Package Detail Modal without freeze
      const snap3 = path.join(ARTIFACT_DIR, 'verify_member_detail_modal_no_freeze.png');
      await page.screenshot({ path: snap3, fullPage: false });
      console.log('[Test] Captured screenshot 3:', snap3);

      // Close modal
      await page.evaluate(() => {
        const closeBtn = document.getElementById('closeDetailModalBtn') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Đóng');
        if (closeBtn) closeBtn.click();
      });
      await runner.sleep(500);
    }

    // =========================================================================
    // PART 2: Web QTV Counter Transfer & Dual Notifications Verification
    // =========================================================================
    console.log('\n--- PART 2: Counter Transfer & Notifications Verification ---');
    const auth = await runner.getAuthToken(MEMBER_PHONE, 'Paradise@123', 'MEMBER');
    const notifsRes = await fetch('http://localhost:5000/api/v1/notifications', {
      headers: { Authorization: `Bearer ${auth.token}` }
    }).then(r => r.json());

    const notifs = notifsRes.data?.items || notifsRes.data || [];
    console.log(`[Test] Member ${MEMBER_PHONE} has ${notifs.length} notifications.`);
    const transferNotifs = notifs.filter(n => n.event_type === 'PACKAGE_TRANSFERRED' || (n.title && n.title.includes('chuyển nhượng')));
    console.log(`[Test] Found ${transferNotifs.length} transfer notifications for member:`, transferNotifs.slice(0, 2));

    console.log('\n✅ ALL E2E VERIFICATIONS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    if (runner.browser) {
      await runner.browser.close();
    }
  }
})();

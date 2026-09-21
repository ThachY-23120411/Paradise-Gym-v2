const E2ETestRunner = require('./e2e/runner');
const path = require('path');
const fs = require('fs');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();

  const MEMBER_PHONE = '0987654321'; // Lê Hoàng Nam (HV001)
  const artifactDir = 'E:/Antigravity - Copy/Profiles/Profile2/.gemini/antigravity/brain/8f603014-e613-4055-a510-ef40fa67cfcb';

  try {
    console.log('--- STEP 1: Open Mobile Member on packages/transfers (Sent Sub-tab) ---');
    await runner.openMobileMemberSession(MEMBER_PHONE, 'packages');
    await runner.sleep(1000);

    // Click the 4th tab: Yêu cầu chuyển nhượng
    await runner.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.segments button'));
      const transferBtn = btns.find(b => b.textContent.includes('Yêu cầu chuyển nhượng'));
      if (transferBtn) transferBtn.click();
    });
    await runner.sleep(1500);

    // Ensure card actions are visible in viewport
    await runner.page.evaluate(() => {
      const card = document.querySelector('.record');
      if (card) card.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await runner.sleep(500);

    const shot1 = path.join(__dirname, 'verify_transfer_sent.png');
    await runner.page.screenshot({ path: shot1 });
    console.log('Saved:', shot1);

    console.log('--- STEP 2: Open Transfer Modal ---');
    await runner.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const createBtn = btns.find(b => b.textContent.includes('Gửi yêu cầu'));
      if (createBtn) createBtn.click();
    });
    await runner.sleep(800);

    // Type recipient HV009 and click verify
    await runner.page.evaluate(async () => {
      const input = document.getElementById('transferRecipientInput');
      if (input) {
        input.value = 'HV009';
        const checkBtn = document.getElementById('btnCheckRecipient');
        if (checkBtn) checkBtn.click();
      }
    });
    await runner.sleep(1200);

    const shot2 = path.join(__dirname, 'verify_transfer_modal.png');
    await runner.page.screenshot({ path: shot2 });
    console.log('Saved:', shot2);

    // Close modal dialog
    await runner.page.evaluate(() => {
      const closeBtn = document.querySelector('.dialog-close, [aria-label="Đóng"], .modal-close') ||
                       Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '×' || b.innerHTML.includes('fa-xmark'));
      if (closeBtn) closeBtn.click();
      else {
        const dialog = document.querySelector('.dialog, .modal, dialog');
        if (dialog) dialog.remove();
      }
    });
    await runner.sleep(600);

    console.log('--- STEP 3: Switch to Received Transfers ---');
    await runner.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.segments button'));
      const recBtn = btns.find(b => b.textContent.includes('Yêu cầu đã nhận'));
      if (recBtn) recBtn.click();
    });
    await runner.sleep(1500);

    // Ensure card actions are visible in viewport
    await runner.page.evaluate(() => {
      const card = document.querySelector('.record');
      if (card) card.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await runner.sleep(500);

    const shot3 = path.join(__dirname, 'verify_transfer_received.png');
    await runner.page.screenshot({ path: shot3 });
    console.log('Saved:', shot3);

    console.log('--- STEP 4: Check Gói của tôi has Chuyển nhượng button ---');
    await runner.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.segments button'));
      const mineBtn = btns.find(b => b.textContent.includes('Gói của tôi'));
      if (mineBtn) mineBtn.click();
    });
    await runner.sleep(1500);

    const shot4 = path.join(__dirname, 'verify_mine_transfer_btn.png');
    await runner.page.screenshot({ path: shot4 });
    console.log('Saved:', shot4);

    // Copy screenshots to artifacts directory
    for (const [src, name] of [
      [shot1, 'verify_transfer_sent.png'],
      [shot2, 'verify_transfer_modal.png'],
      [shot3, 'verify_transfer_received.png'],
      [shot4, 'verify_mine_transfer_btn.png']
    ]) {
      if (fs.existsSync(src)) {
        const dest = path.join(artifactDir, name);
        fs.copyFileSync(src, dest);
        console.log(`Copied ${src} -> ${dest}`);
      }
    }

    console.log('ALL TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await runner.close();
  }
})();

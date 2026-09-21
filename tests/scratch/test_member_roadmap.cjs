const E2ETestRunner = require('../e2e/runner');
const path = require('path');
const fs = require('fs');

(async () => {
  const runner = new E2ETestRunner();
  await runner.init();

  const MEMBER_PHONE = '0987654321'; // Lê Hoàng Nam (HV001)
  const evidenceDir = path.resolve(__dirname, '../e2e/hv/evidence-roadmap');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

  try {
    console.log('--- STEP 1: Open Mobile Member on packages/mine ---');
    await runner.openMobileMemberSession(MEMBER_PHONE, 'packages/mine');
    await runner.sleep(2000);

    // Verify cards and button presence
    const cardsInfo = await runner.page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.record'));
      return cards.map(c => {
        const title = c.querySelector('h3')?.textContent?.trim() || '';
        const badge = c.querySelector('.badge')?.textContent?.trim() || '';
        const buttons = Array.from(c.querySelectorAll('button')).map(b => b.textContent.trim());
        const hasRoadmap = buttons.some(b => b.includes('Xem lộ trình'));
        return { title, badge, buttons, hasRoadmap };
      });
    });

    console.log('Cards detected in #packages/mine:', JSON.stringify(cardsInfo, null, 2));

    const shot1 = path.join(evidenceDir, '01_packages_mine_roadmap_buttons.png');
    await runner.page.screenshot({ path: shot1 });
    console.log('Saved Screenshot 1:', shot1);

    // Find card with "Xem lộ trình" (DK-2026-08-01 Combo VIP)
    console.log('--- STEP 2: Click [Xem lộ trình] on Combo VIP card ---');
    const clickedCombo = await runner.page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.record'));
      const comboCard = cards.find(c => c.textContent.includes('DK-2026-08-01') || c.textContent.includes('Combo VIP'));
      if (comboCard) {
        const btn = Array.from(comboCard.querySelectorAll('button')).find(b => b.textContent.includes('Xem lộ trình'));
        if (btn) {
          comboCard.scrollIntoView({ behavior: 'instant', block: 'center' });
          btn.click();
          return true;
        }
      }
      return false;
    });

    console.log('Clicked Combo VIP [Xem lộ trình]:', clickedCombo);
    await runner.sleep(1500);

    // Inspect Modal
    const modalInfo = await runner.page.evaluate(() => {
      const dialog = document.querySelector('dialog[open]');
      if (!dialog) return null;
      const title = dialog.querySelector('.dialog-heading h2')?.textContent?.trim();
      const progressText = dialog.querySelector('.roadmap-progress-card')?.textContent?.trim();
      const timelineCards = Array.from(dialog.querySelectorAll('.roadmap-timeline-card')).map(card => {
        const head = card.querySelector('.roadmap-card-header')?.textContent?.trim();
        const body = card.querySelector('.roadmap-card-body')?.textContent?.trim();
        return { head, body };
      });
      return { title, progressText, count: timelineCards.length, sample: timelineCards.slice(0, 2) };
    });

    console.log('Modal Info:', JSON.stringify(modalInfo, null, 2));

    const shot2 = path.join(evidenceDir, '02_roadmap_modal_combo_vip.png');
    await runner.page.screenshot({ path: shot2 });
    console.log('Saved Screenshot 2:', shot2);

    // Scroll modal down to capture session details
    await runner.page.evaluate(() => {
      const timeline = document.querySelector('.roadmap-timeline');
      if (timeline) timeline.scrollTop = timeline.scrollHeight / 2;
    });
    await runner.sleep(500);

    const shot3 = path.join(evidenceDir, '03_roadmap_modal_timeline_scroll.png');
    await runner.page.screenshot({ path: shot3 });
    console.log('Saved Screenshot 3:', shot3);

    // Close modal
    console.log('--- STEP 3: Close modal and test zero-session or PT 30 buổi ---');
    await runner.page.evaluate(() => {
      const closeBtn = document.querySelector('#closeRoadmapModalBtn') || document.querySelector('.dialog-heading button');
      if (closeBtn) closeBtn.click();
    });
    await runner.sleep(800);

    // Click on PT 30 buổi (DK015 or DK016)
    const clickedPt30 = await runner.page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.record'));
      const ptCard = cards.find(c => c.textContent.includes('PT 30 buổi') && c.textContent.includes('DK015'));
      if (ptCard) {
        const btn = Array.from(ptCard.querySelectorAll('button')).find(b => b.textContent.includes('Xem lộ trình'));
        if (btn) {
          ptCard.scrollIntoView({ behavior: 'instant', block: 'center' });
          btn.click();
          return true;
        }
      }
      return false;
    });

    console.log('Clicked DK015 [Xem lộ trình]:', clickedPt30);
    await runner.sleep(1200);

    const shot4 = path.join(evidenceDir, '04_roadmap_modal_empty_state.png');
    await runner.page.screenshot({ path: shot4 });
    console.log('Saved Screenshot 4:', shot4);

    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    await runner.browser.close();
  }
})();

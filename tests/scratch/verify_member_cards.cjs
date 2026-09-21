const E2ETestRunner = require('../e2e/runner');
const path = require('path');
const fs = require('fs');

async function verifyMemberCards() {
  const runner = new E2ETestRunner();
  await runner.init();

  const MEMBER_PHONE = '0987654321'; // Lê Hoàng Nam
  const outDir = path.resolve(__dirname, 'output');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  try {
    runner.page.on('console', msg => console.log('  [Browser]', msg.type(), msg.text()));
    runner.page.on('pageerror', err => console.log('  [PageError]', err.message));
    runner.page.on('requestfailed', req => console.log('  [ReqFailed]', req.url(), req.failure()?.errorText));
    runner.page.on('response', res => {
      if (res.status() >= 400) console.log('  [HTTP Error]', res.status(), res.url());
    });

    console.log('1. Opening Member #schedule/mine...');
    await runner.openMobileMemberSession(MEMBER_PHONE, 'schedule/mine');
    console.log('Current URL:', runner.page.url());
    await runner.sleep(2000);
    const mainHtml = await runner.page.evaluate(() => document.querySelector('#main')?.innerHTML);
    console.log('#main innerHTML:', mainHtml);
    const hasCard = await runner.page.evaluate(() => document.querySelectorAll('.pt-appointment-card').length);
    console.log('pt-appointment-card count:', hasCard);
    await runner.page.waitForSelector('.pt-appointment-card', { timeout: 10000 });
    await runner.sleep(1500);

    // Screenshot all cards in My Schedule
    const mineScreenshot = path.join(outDir, '01-member-schedule-mine.png');
    await runner.page.screenshot({ path: mineScreenshot, fullPage: true });
    console.log('Saved:', mineScreenshot);

    // Check individual cards on page
    const cardInfo = await runner.page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.pt-appointment-card'));
      return cards.map(c => ({
        classes: c.className,
        time: c.querySelector('.pt-card-time')?.innerText,
        duration: c.querySelector('.pt-card-dur-tag')?.innerText,
        statusPill: c.querySelector('.pt-card-status-pill')?.innerText,
        buttons: Array.from(c.querySelectorAll('button')).map(b => ({
          text: b.innerText,
          classes: b.className,
          disabled: b.disabled
        })),
        details: c.querySelector('.pt-card-bottom-row')?.innerText
      }));
    });
    console.log('Cards detected in #schedule/mine:', JSON.stringify(cardInfo, null, 2));

    // 2. Filter to "Đã hủy"
    console.log('2. Filtering to "Đã hủy"...');
    await runner.page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('.schedule-list .filters button')).find(b => b.innerText.includes('Đã hủy'));
      if (cancelBtn) cancelBtn.click();
    });
    await runner.sleep(1000);
    const cancelScreenshot = path.join(outDir, '02-member-filter-cancelled.png');
    await runner.page.screenshot({ path: cancelScreenshot, fullPage: true });
    console.log('Saved:', cancelScreenshot);

    // 3. Filter to "Đã hoàn thành"
    console.log('3. Filtering to "Đã hoàn thành"...');
    await runner.page.evaluate(() => {
      const doneBtn = Array.from(document.querySelectorAll('.schedule-list .filters button')).find(b => b.innerText.includes('Đã hoàn thành'));
      if (doneBtn) doneBtn.click();
    });
    await runner.sleep(1000);
    const completedScreenshot = path.join(outDir, '03-member-filter-completed.png');
    await runner.page.screenshot({ path: completedScreenshot, fullPage: true });
    console.log('Saved:', completedScreenshot);

    // 4. Open Book PT Tab (#schedule/book)
    console.log('4. Navigating to #schedule/book...');
    await runner.page.evaluate(() => {
      const bookTab = Array.from(document.querySelectorAll('.segments button')).find(b => b.innerText.includes('Đặt lịch PT'));
      if (bookTab) bookTab.click();
    });
    await runner.page.waitForSelector('.field', { timeout: 10000 });
    await runner.sleep(1500);

    // Select package DK002
    await runner.page.evaluate(() => {
      const selectBox = window.$ && window.$('.field div.dx-selectbox').dxSelectBox('instance');
      if (selectBox) {
        const ds = selectBox.option('dataSource');
        if (ds && ds.length > 0) {
          selectBox.option('value', ds[0].id);
        }
      }
    });
    await runner.sleep(1500);

    // Click date 21 on calendar
    await runner.page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('.dx-calendar-cell'));
      const cell21 = cells.find(c => c.innerText.trim() === '21');
      if (cell21) cell21.click();
    });
    await runner.sleep(2000);

    const bookTimelineScreenshot = path.join(outDir, '04-member-book-timeline-cards.png');
    await runner.page.screenshot({ path: bookTimelineScreenshot, fullPage: true });
    console.log('Saved:', bookTimelineScreenshot);

    // Check own cards in timeline
    const timelineCards = await runner.page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.timeline-own-card.pt-appointment-card'));
      return cards.map(c => ({
        classes: c.className,
        style: c.getAttribute('style'),
        time: c.querySelector('.pt-card-time')?.innerText,
        duration: c.querySelector('.pt-card-dur-tag')?.innerText,
        statusPill: c.querySelector('.pt-card-status-pill')?.innerText,
        buttons: Array.from(c.querySelectorAll('button')).map(b => ({
          text: b.innerText,
          classes: b.className,
          disabled: b.disabled
        })),
        details: c.querySelector('.pt-card-bottom-row')?.innerText
      }));
    });
    console.log('Timeline own cards detected:', JSON.stringify(timelineCards, null, 2));

  } catch (err) {
    console.error('Error during visual verification:', err);
  } finally {
    if (runner.browser) {
      await runner.browser.close();
    }
  }
}

verifyMemberCards();

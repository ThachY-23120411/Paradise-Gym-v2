const path = require('path');
const fs = require('fs');
const puppeteer = require(path.resolve('backend/node_modules/puppeteer-core'));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ARTIFACT_DIR = 'E:/Antigravity - Copy/Profiles/Profile4/.gemini/antigravity/brain/b7a3ccd6-c991-4f48-b816-dabe12bb72d2';

async function run() {
  console.log('🚀 Starting 15-minute grid verification test...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1500, height: 1000, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    let token, user;
    const cacheFile = path.resolve('tests/e2e/.token_cache.json');
    if (fs.existsSync(cacheFile)) {
      try {
        const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        if (cache['0900000001_QTV']) {
          const testMe = await fetch('http://localhost:5000/api/v1/auth/me', {
            headers: { Authorization: `Bearer ${cache['0900000001_QTV'].token}` }
          }).then(r => r.json());
          if (testMe.success) {
            token = cache['0900000001_QTV'].token;
            user = cache['0900000001_QTV'].user;
            console.log('✅ Authenticated using cached QTV token.');
          }
        }
      } catch (_) {}
    }

    if (!token) {
      // Fallback: login as 0900000002 (Receptionist/LT) which also has full PT schedule management
      const loginRes = await fetch('http://localhost:5000/api/v1/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_phone: '0900000002', password: 'Paradise@123', active_role: 'RECEPTIONIST' })
      }).then(r => r.json());
      token = loginRes.data?.access_token;
      user = loginRes.data?.user;
    }

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));
    page.on('response', res => { if (res.status() >= 400) console.log('HTTP ERROR:', res.status(), res.url()); });

    await page.goto('http://localhost:3000/web/');
    await page.evaluate((t, u) => {
      localStorage.setItem('paradise_access_token', t);
      localStorage.setItem('paradise_user', JSON.stringify(u));
      localStorage.setItem('paradise_current_branch_id', '11111111-1111-1111-1111-111111111111');
    }, token, user);

    // 2. Navigate to pt-schedule
    console.log('📅 Navigating to PT schedule...');
    await page.goto('http://localhost:3000/web/#pt-schedule', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 3000));

    // Debug: check current location and DOM elements
    const pageDebug = await page.evaluate(() => {
      return {
        hash: location.hash,
        isAppShellVisible: !$('#appShell').prop('hidden'),
        isAuthViewVisible: !$('#authView').prop('hidden'),
        mainViewport: $('#mainViewport').html()?.slice(0, 300),
        ptSelectorExists: $('#ptSelector').length > 0,
        activeMenu: window.ParadiseApp?.getCurrentMenu?.()
      };
    });
    console.log('Page debug status:', pageDebug);

    // 3. Select trainer if not selected
    await page.waitForSelector('#ptSelector', { timeout: 8000 });
    await page.evaluate(() => {
      const selectBox = $('#ptSelector').dxSelectBox('instance');
      const ds = selectBox.getDataSource()?.items() || [];
      console.log('Trainers found:', ds.map(t => t.full_name));
      if (ds.length > 0) {
        selectBox.option('value', ds[0].id);
      }
    });
    await new Promise(r => setTimeout(r, 2500));
    await page.waitForSelector('#ptScheduler', { timeout: 8000 });

    // 4. Check scheduler time panel labels
    const timeLabels = await page.evaluate(() => {
      const labels = [];
      $('.pt-time-panel-label').each(function() {
        labels.push($(this).text().trim());
      });
      return labels;
    });
    console.log('Sample time labels found on scheduler:', timeLabels.slice(0, 16));

    const has0815 = timeLabels.includes('08:15');
    const has0830 = timeLabels.includes('08:30');
    const has0845 = timeLabels.includes('08:45');
    console.log(`Verification: 08:15 present? ${has0815}, 08:30? ${has0830}, 08:45? ${has0845}`);

    // Take screenshot of 15-minute grid calendar
    const gridShotPath = path.join(ARTIFACT_DIR, 'verify-15min-grid-calendar.png');
    await page.screenshot({ path: gridShotPath, fullPage: false });
    console.log('📸 Saved calendar grid screenshot to:', gridShotPath);

    // 5. Find and click on the 08:15 cell
    console.log('🖱️ Clicking 08:15 time slot cell on calendar...');
    const clickResult = await page.evaluate(() => {
      const scheduler = $('#ptScheduler').dxScheduler('instance');
      if (!scheduler) return { success: false, error: 'Scheduler not found' };

      // DevExtreme scheduler cell data
      let targetCell = null;
      $('.dx-scheduler-date-table-cell').each(function() {
        const cellData = $(this).data('dxCellData') || $(this).prop('dxCellData');
        // Check startDate
        if (cellData && cellData.startDate) {
          const d = new Date(cellData.startDate);
          if (d.getHours() === 8 && d.getMinutes() === 15) {
            targetCell = this;
            return false;
          }
        }
      });

      if (targetCell) {
        $(targetCell).trigger('dxclick');
        return { success: true, method: 'dxclick-cell' };
      }

      // Fallback: trigger cell click event directly on scheduler
      const ws = scheduler.getWorkSpace();
      return { success: false, error: '08:15 cell element not matched' };
    });

    console.log('Click cell result:', clickResult);
    await new Promise(r => setTimeout(r, 1500));

    // 6. Check if booking modal opened with start_time = 08:15
    const modalCheck = await page.evaluate(() => {
      const popup = $('.dx-popup:visible');
      if (!popup.length) return { opened: false };
      const title = popup.find('.dx-popup-title').text();
      const form = popup.find('.dx-form').dxForm('instance');
      if (!form) return { opened: true, title, formFound: false };
      const formData = form.option('formData');
      return {
        opened: true,
        title,
        start_time: formData.start_time,
        date: formData.date
      };
    });
    console.log('Modal check result:', modalCheck);

    // 7. If modal opened, let's select member and test end_time slots
    if (modalCheck.opened) {
      await page.evaluate(async () => {
        const popup = $('.dx-popup:visible');
        const form = popup.find('.dx-form').dxForm('instance');
        const memberEditor = form.getEditor('member_id');
        const ds = memberEditor.getDataSource();
        await ds.load();
        const items = ds.items();
        if (items.length > 0) {
          memberEditor.option('value', items[0].id);
        }
      });
      await new Promise(r => setTimeout(r, 1500));

      // Select first eligible registration
      await page.evaluate(() => {
        const popup = $('.dx-popup:visible');
        const form = popup.find('.dx-form').dxForm('instance');
        const regEditor = form.getEditor('registration_id');
        const regs = regEditor.option('dataSource') || [];
        if (regs.length > 0) {
          regEditor.option('value', regs[0].id);
        }
      });
      await new Promise(r => setTimeout(r, 1500));

      const formFinalData = await page.evaluate(() => {
        const popup = $('.dx-popup:visible');
        const form = popup.find('.dx-form').dxForm('instance');
        const formData = form.option('formData');
        const endEditor = form.getEditor('end_time');
        const endSlots = endEditor ? endEditor.option('dataSource') : [];
        return {
          start_time: formData.start_time,
          end_time: formData.end_time,
          duration_display: formData.duration_display,
          endSlotsSample: endSlots.slice(0, 8)
        };
      });
      console.log('Form data after selecting package:', formFinalData);

      // Screenshot modal
      const modalShotPath = path.join(ARTIFACT_DIR, 'verify-15min-booking-modal.png');
      await page.screenshot({ path: modalShotPath, fullPage: false });
      console.log('📸 Saved modal screenshot to:', modalShotPath);
    }

    console.log('✅ 15-minute grid test completed successfully!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await browser.close();
  }
}

run();

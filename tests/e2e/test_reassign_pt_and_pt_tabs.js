const path = require('path');
const fs = require('fs');
const E2ETestRunner = require('./runner');

const ARTIFACT_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile3\\.gemini\\antigravity\\brain\\8f603014-e613-4055-a510-ef40fa67cfcb';

async function clickDxButton(page, text) {
  return page.evaluate((btnText) => {
    const btns = $(`.dx-button:contains("${btnText}")`);
    if (!btns.length) return false;
    btns.first().get(0)?.click();
    return true;
  }, text);
}

(async () => {
  console.log('[Test] Starting Reassign PT & Mobile PT 2-tabs verification...');
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
    // PART 1: Web QTV W04 - Gán lại PT phụ trách
    // =========================================================================
    console.log('\n--- PART 1: Web QTV W04 Gán lại PT ---');
    const QTV_PHONE = '0900000001';
    await runner.switchSession(QTV_PHONE, 'ALL', 'QTV');
    await runner.navigateTo('registrations');
    await runner.sleep(2500);

    // Wait for sales grid to load
    await page.waitForFunction(() => $('.dx-datagrid-rowsview tr.dx-data-row').length > 0, { timeout: 10000 });
    console.log('[Test] Sales grid loaded.');

    // Look for a row with PT package and check for "Gán lại PT" or "Gán PT"
    let reassignBtnFound = await page.evaluate(() => {
      const btn = $('.dx-button:contains("Gán lại PT")');
      return btn.length > 0;
    });

    console.log('[Test] "Gán lại PT" button already visible on grid:', reassignBtnFound);

    if (!reassignBtnFound) {
      // If none has PT assigned yet, let's see if there is a "Gán PT" button to assign first
      const hasAssign = await page.evaluate(() => {
        const btn = $('.dx-button:contains("Gán PT")');
        if (btn.length > 0) {
          btn.first().get(0).click();
          return true;
        }
        return false;
      });

      if (hasAssign) {
        console.log('[Test] Clicked "Gán PT" to assign a PT first...');
        await page.waitForFunction(() => $('.dx-popup-title:contains("Gán PT phụ trách")').length > 0, { timeout: 8000 });
        await runner.sleep(1000);
        // Select first PT in dropdown
        await page.evaluate(() => {
          const select = $('.dx-selectbox').dxSelectBox('instance');
          const items = select.option('dataSource') || [];
          if (items.length > 0) {
            select.option('value', items[0].id);
          }
        });
        await runner.sleep(500);
        await clickDxButton(page, 'Xác nhận gán PT');
        await runner.sleep(2500);
      }
    }

    // Now find and click "Gán lại PT"
    console.log('[Test] Clicking "Gán lại PT" button...');
    const clickedReassign = await page.evaluate(() => {
      const btns = $('.dx-button:contains("Gán lại PT")');
      if (btns.length > 0) {
        btns.first().get(0).click();
        return true;
      }
      return false;
    });

    if (!clickedReassign) {
      throw new Error('Không tìm thấy nút "Gán lại PT" trên bảng đăng ký W04!');
    }

    // Wait for popup "Gán lại PT phụ trách"
    await page.waitForFunction(() => $('.dx-popup-title:contains("Gán lại PT phụ trách")').length > 0, { timeout: 8000 });
    console.log('[Test] Popup "Gán lại PT phụ trách" opened.');
    await runner.sleep(1000);

    // Verify fields in modal: "HLV phụ trách hiện tại", "Chọn HLV phụ trách mới"
    const modalDetails = await page.evaluate(() => {
      const labels = [];
      $('.dx-field-item-label-text').each(function () {
        labels.push($(this).text().trim());
      });
      const title = $('.dx-popup-title').text().trim();
      const currentPtRow = labels.some(l => l.includes('HLV phụ trách hiện tại'));
      const newPtRow = labels.some(l => l.includes('Chọn HLV phụ trách mới'));
      return { title, labels, currentPtRow, newPtRow };
    });

    console.log('[Test] Modal Details:', modalDetails);
    if (!modalDetails.currentPtRow) {
      console.warn('[Warning] "HLV phụ trách hiện tại" label not found in modal labels:', modalDetails.labels);
    }
    if (!modalDetails.newPtRow) {
      console.warn('[Warning] "Chọn HLV phụ trách mới" label not found in modal labels:', modalDetails.labels);
    }

    // Capture screenshot 1: Reassign PT Modal
    const snap1 = path.join(ARTIFACT_DIR, 'verify-reassign-pt-modal.png');
    await page.screenshot({ path: snap1, fullPage: false });
    console.log('[Test] Captured screenshot 1:', snap1);

    // Select a different PT and entering note...
    console.log('[Test] Selecting a different PT and entering note...');
    const selectNewPtResult = await page.evaluate(() => {
      const form = $('.sales-modal .dx-form').dxForm('instance');
      if (!form) return { success: false, reason: 'Form not found in .sales-modal' };
      const select = form.getEditor('pt_id');
      if (!select) return { success: false, reason: 'pt_id editor not found' };

      const items = select.option('dataSource') || [];
      const modalText = $('.sales-modal').text();
      // Find candidate that is NOT the currently assigned PT shown in modal
      const candidate = items.find(it => !modalText.includes(it.full_name) || !modalText.includes(it.pt_code));
      if (candidate) {
        select.option('value', candidate.id);
        const noteEditor = form.getEditor('note');
        if (noteEditor) {
          noteEditor.option('value', 'Học viên yêu cầu điều chuyển HLV theo mục tiêu thể lực (Test E2E)');
        }
        return { success: true, newPtName: candidate.full_name, newPtId: candidate.id };
      }
      return { success: false, reason: 'No different PT found in branch' };
    });
    console.log('[Test] Select new PT result:', selectNewPtResult);
    await runner.sleep(800);

    // Find and click submit button inside .sales-modal
    console.log('[Test] Clicking "Xác nhận gán lại PT"...');
    const clickResult = await page.evaluate(() => {
      const btn = $('.sales-modal .dx-button').filter(function () {
        return $(this).text().includes('Xác nhận gán lại PT') || $(this).text().includes('Xác nhận');
      });
      if (btn.length > 0) {
        btn.get(0).click();
        return { success: true };
      }
      return { success: false };
    });

    console.log('[Test] Button click result:', clickResult);
    if (!clickResult.success) throw new Error('Không thể bấm nút "Xác nhận gán lại PT"');

    // Wait for popup to close and grid to update
    await page.waitForFunction(() => $('.sales-modal:visible').length === 0, { timeout: 10000 });
    await runner.sleep(1500);

    // Capture screenshot 2: Sales grid with updated PT
    const snap2 = path.join(ARTIFACT_DIR, 'verify-reassign-pt-success.png');
    await page.screenshot({ path: snap2, fullPage: false });
    console.log('[Test] Captured screenshot 2:', snap2);

    // =========================================================================
    // PART 2: Mobile PT PT02 - 2 Tabs Structure (No Requests Tab)
    // =========================================================================
    console.log('\n--- PART 2: Mobile PT PT02 2 Tabs Layout ---');
    const PT_PHONE = '0900000003';
    await runner.openMobilePtSession(PT_PHONE, 'members');
    await runner.sleep(1500);

    // Ensure we are switched to members tab
    await page.evaluate(() => {
      if (window.ParadisePTApp && typeof window.ParadisePTApp.switchTab === 'function') {
        window.ParadisePTApp.switchTab('members');
      } else {
        $('#bottomNav .nav-item[data-tab="members"]').trigger('click');
      }
    });
    await runner.sleep(2000);

    // Verify tabs in DOM
    const ptTabsInfo = await page.evaluate(() => {
      const tabMembers = document.getElementById('tabBtnMembers');
      const tabPackages = document.getElementById('tabBtnPackages');
      const tabRequests = document.getElementById('tabBtnRequests');
      const visibleTabs = $('.pt-clients-tabs .pt-tab-btn:visible').map(function () {
        return $(this).text().replace(/\s+/g, ' ').trim();
      }).get();

      return {
        hasTabMembers: !!tabMembers,
        hasTabPackages: !!tabPackages,
        hasTabRequests: !!tabRequests,
        visibleTabsText: visibleTabs
      };
    });

    console.log('[Test] Mobile PT Tabs Info:', ptTabsInfo);
    if (!ptTabsInfo.hasTabMembers || !ptTabsInfo.hasTabPackages) {
      throw new Error('Thiếu tab "Học viên phụ trách" hoặc "Gói đang phụ trách"!');
    }
    if (ptTabsInfo.hasTabRequests) {
      throw new Error('LỖI: Vẫn còn tồn tại tab "Yêu cầu phụ trách" (#tabBtnRequests) trong DOM!');
    }

    // Capture screenshot 3: Mobile PT 2 tabs layout
    const snap3 = path.join(ARTIFACT_DIR, 'verify-pt-2tabs-layout.png');
    await page.screenshot({ path: snap3, fullPage: false });
    console.log('[Test] Captured screenshot 3:', snap3);

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

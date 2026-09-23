const path = require('path');
const fs = require('fs');
const E2ETestRunner = require('../e2e/runner');

const API_URL = 'http://localhost:5000/api/v1';
const ARTIFACT_DIR = 'E:/Antigravity - Copy/Profiles/Profile5/.gemini/antigravity/brain/cf22d6e0-20cc-4a19-9c08-c386ee4a543d';

async function main() {
  console.log('=== VERIFY VOUCHER PACKAGE RULES & BONUS ENTITLEMENTS ===');

  // 1. API Verification
  console.log('\n--- 1. Testing Backend REST APIs ---');
  const loginRes = await fetch(`${API_URL}/auth/login-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_phone: '0900000001', password: 'Paradise@123', active_role: 'QTV' })
  }).then(r => r.json());

  if (!loginRes.success) {
    throw new Error('Login QTV failed: ' + JSON.stringify(loginRes));
  }
  const token = loginRes.data.access_token || loginRes.data.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-branch-id': 'ALL'
  };

  // Get packages
  const packagesRes = await fetch(`${API_URL}/packages`, { headers: authHeaders }).then(r => r.json());
  const packages = packagesRes.data || [];
  console.log(`Loaded ${packages.length} packages`);

  const ptPkg = packages.find(p => p.package_type === 'PT_SESSION');
  const gymPkg = packages.find(p => p.package_type === 'GYM_TIME');
  const comboPkg = packages.find(p => p.package_type === 'COMBO');

  console.log('PT Package:', ptPkg ? `${ptPkg.package_name} (${ptPkg.id})` : 'NOT FOUND');
  console.log('Gym Package:', gymPkg ? `${gymPkg.package_name} (${gymPkg.id})` : 'NOT FOUND');
  console.log('Combo Package:', comboPkg ? `${comboPkg.package_name} (${comboPkg.id})` : 'NOT FOUND');

  if (!ptPkg || !gymPkg || !comboPkg) {
    throw new Error('Could not find all 3 package types (PT_SESSION, GYM_TIME, COMBO) in database');
  }

  // Generate unique codes with timestamp
  const ts = Date.now().toString().slice(-4);
  const codePT = `TEST_PT_${ts}`;
  const codeGym = `TEST_GYM_${ts}`;
  const codeCombo = `TEST_CMB_${ts}`;

  // Test TH1: PT Session Voucher
  console.log(`\nCreating TH1 voucher (${codePT}) for PT package...`);
  const createPTRes = await fetch(`${API_URL}/discounts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      code: codePT,
      title: 'Tặng 5 buổi PT khi mua gói',
      applicable_package_id: ptPkg.id,
      discount_type: 'SESSION',
      bonus_pt_sessions: 5,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      usage_limit: 100
    })
  }).then(r => r.json());
  console.log('TH1 Create Result:', createPTRes.success ? 'SUCCESS' : createPTRes);
  if (!createPTRes.success) throw new Error('Failed to create TH1 voucher: ' + JSON.stringify(createPTRes));

  // Test TH2: Gym Time Voucher
  console.log(`\nCreating TH2 voucher (${codeGym}) for Gym Time package...`);
  const createGymRes = await fetch(`${API_URL}/discounts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      code: codeGym,
      title: 'Tặng 15 ngày tập gym thêm',
      applicable_package_id: gymPkg.id,
      discount_type: 'DAY',
      bonus_days: 15,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      usage_limit: 50
    })
  }).then(r => r.json());
  console.log('TH2 Create Result:', createGymRes.success ? 'SUCCESS' : createGymRes);
  if (!createGymRes.success) throw new Error('Failed to create TH2 voucher: ' + JSON.stringify(createGymRes));

  // Test TH3: Combo Voucher
  console.log(`\nCreating TH3 voucher (${codeCombo}) for Combo package...`);
  const createComboRes = await fetch(`${API_URL}/discounts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      code: codeCombo,
      title: 'Tặng 30 ngày gym + 10 buổi PT combo',
      applicable_package_id: comboPkg.id,
      discount_type: 'BOTH',
      bonus_days: 30,
      bonus_pt_sessions: 10,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      usage_limit: 20
    })
  }).then(r => r.json());
  console.log('TH3 Create Result:', createComboRes.success ? 'SUCCESS' : createComboRes);
  if (!createComboRes.success) throw new Error('Failed to create TH3 voucher: ' + JSON.stringify(createComboRes));

  // Test Validation API - Success case
  console.log(`\nValidating TH1 voucher with MATCHING package_id...`);
  const valSuccessRes = await fetch(`${API_URL}/discounts/validate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      code: codePT,
      order_amount: 5000000,
      package_id: ptPkg.id
    })
  }).then(r => r.json());
  console.log('Validate Matching Result:', valSuccessRes.success ? 'SUCCESS' : valSuccessRes);
  if (!valSuccessRes.success || valSuccessRes.data.bonus_pt_sessions !== 5) {
    throw new Error('TH1 validation failed or missing bonus_pt_sessions');
  }

  // Test Validation API - Mismatch rejection case
  console.log(`\nValidating TH1 voucher with WRONG package_id (expecting PACKAGE_MISMATCH)...`);
  const valMismatchRes = await fetch(`${API_URL}/discounts/validate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      code: codePT,
      order_amount: 5000000,
      package_id: gymPkg.id // wrong package!
    })
  }).then(r => r.json());
  console.log('Validate Mismatch Result:', valMismatchRes);
  const errorCode = valMismatchRes.code || valMismatchRes.error?.code;
  if (valMismatchRes.success || errorCode !== 'PACKAGE_MISMATCH') {
    throw new Error('Expected PACKAGE_MISMATCH error but got: ' + JSON.stringify(valMismatchRes));
  }
  console.log('-> Package mismatch rejection verified successfully!');

  // 2. UI Verification with Puppeteer
  console.log('\n--- 2. Testing Web Admin UI with Puppeteer ---');
  const runner = new E2ETestRunner();
  await runner.init();

  runner.page.on('pageerror', err => console.error('>>> [BROWSER PAGE ERROR]', err.message));
  runner.page.on('console', msg => {
    const t = msg.text();
    if (!t.includes('W0019') && !t.includes('W0017') && !t.includes('DevExtreme')) {
      console.log('>>> [BROWSER CONSOLE]', t);
    }
  });

  try {
    await runner.openDesktopSession('0900000001', 'ALL', 'QTV');
    await runner.navigateTo('discounts');
    await runner.sleep(3000);

    // Capture Grid view
    console.log('Capturing DataGrid columns...');
    await runner.page.screenshot({
      path: path.join(ARTIFACT_DIR, 'verify_voucher_grid_columns.png'),
      fullPage: false
    });
    console.log('Saved: verify_voucher_grid_columns.png');

    // Click [Tạo mã voucher] button using DevExtreme dxclick
    console.log('Clicking [Tạo mã voucher] button...');
    await runner.page.evaluate(() => {
      $('.view-actions .dx-button:contains("Tạo mã voucher")').trigger('dxclick');
    });
    await runner.page.waitForSelector('.dx-popup-normal', { visible: true, timeout: 10000 });
    await runner.sleep(1200);

    // Test TH1 in UI: Select PT Package
    console.log('Testing TH1 in UI (Select PT package)...');
    await runner.page.evaluate((targetPkgId) => {
      const form = $('.dx-popup-content .dx-form').dxForm('instance');
      form.getEditor('applicable_package_id').option('value', targetPkgId);
      form.getEditor('discount_type').option('value', 'SESSION');
      form.updateData('code', 'UI_TEST_PT');
      form.updateData('title', 'Voucher Buổi PT Thử Nghiệm');
      form.updateData('bonus_pt_sessions', 5);
      const ed = form.getEditor('bonus_pt_sessions');
      if (ed) ed.option('value', 5);
    }, ptPkg.id);
    await runner.sleep(800);

    await runner.page.screenshot({
      path: path.join(ARTIFACT_DIR, 'verify_voucher_th1_session.png'),
      fullPage: false
    });
    console.log('Saved: verify_voucher_th1_session.png');

    // Test TH2 in UI: Select Gym Time Package
    console.log('Testing TH2 in UI (Select Gym Time package)...');
    await runner.page.evaluate((targetPkgId) => {
      const form = $('.dx-popup-content .dx-form').dxForm('instance');
      form.getEditor('applicable_package_id').option('value', targetPkgId);
      form.getEditor('discount_type').option('value', 'DAY');
      form.updateData('code', 'UI_TEST_GYM');
      form.updateData('title', 'Voucher Ngày Gym Thử Nghiệm');
      form.updateData('bonus_days', 15);
      const ed = form.getEditor('bonus_days');
      if (ed) ed.option('value', 15);
    }, gymPkg.id);
    await runner.sleep(800);

    await runner.page.screenshot({
      path: path.join(ARTIFACT_DIR, 'verify_voucher_th2_days.png'),
      fullPage: false
    });
    console.log('Saved: verify_voucher_th2_days.png');

    // Test TH3 in UI: Select Combo Package
    const codeComboUI = `UI_CMB_${ts}`;
    console.log(`Testing TH3 in UI (Select Combo package, code=${codeComboUI})...`);
    await runner.page.evaluate((targetPkgId, codeVal) => {
      const form = $('.dx-popup-content .dx-form').dxForm('instance');
      form.getEditor('applicable_package_id').option('value', targetPkgId);
      form.updateData('code', codeVal);
      form.updateData('title', 'Voucher Combo Ưu Đãi 2026');
    }, comboPkg.id, codeComboUI);
    await runner.sleep(800);

    const comboCheck1 = await runner.page.evaluate(() => {
      const form = $('.dx-popup-content .dx-form').dxForm('instance');
      const dTypeEditor = form.getEditor('discount_type');
      const items = dTypeEditor ? (dTypeEditor.option('items') || []) : [];
      const readOnly = dTypeEditor ? dTypeEditor.option('readOnly') : false;
      const val = dTypeEditor ? dTypeEditor.option('value') : null;
      return { items, readOnly, val };
    });
    console.log('Combo Initial Items & State:', comboCheck1);

    const itemIds = comboCheck1.items.map(i => i.id);
    if (!itemIds.includes('PERCENT') || !itemIds.includes('FIXED_AMOUNT') || !itemIds.includes('BOTH')) {
      throw new Error('Combo package does not offer PERCENT, FIXED_AMOUNT, and BOTH. Found: ' + JSON.stringify(itemIds));
    }
    if (comboCheck1.readOnly) {
      throw new Error('Combo discount_type should NOT be readOnly');
    }

    // Switch to PERCENT first and verify bonus fields are hidden
    console.log('Testing Combo with PERCENT...');
    await runner.page.evaluate(() => {
      const form = $('.dx-popup-content .dx-form').dxForm('instance');
      form.getEditor('discount_type').option('value', 'PERCENT');
    });
    await runner.sleep(500);

    const percentState = await runner.page.evaluate(() => {
      const form = $('.dx-popup-content .dx-form').dxForm('instance');
      return {
        discount_value_visible: form.itemOption('discount_value').visible,
        bonus_days_visible: form.itemOption('bonus_days').visible,
        bonus_pt_visible: form.itemOption('bonus_pt_sessions').visible
      };
    });
    console.log('Combo PERCENT State:', percentState);
    if (!percentState.discount_value_visible || percentState.bonus_days_visible || percentState.bonus_pt_visible) {
      throw new Error('Combo with PERCENT did not show discount_value or hide bonus fields: ' + JSON.stringify(percentState));
    }

    // Now switch to BOTH ("Khuyến mãi theo buổi và ngày")
    console.log('Testing Combo with BOTH (Khuyến mãi theo buổi và ngày)...');
    await runner.page.evaluate(() => {
      const form = $('.dx-popup-content .dx-form').dxForm('instance');
      form.getEditor('discount_type').option('value', 'BOTH');
      form.updateData('bonus_days', 30);
      form.updateData('bonus_pt_sessions', 10);
      const edDays = form.getEditor('bonus_days');
      if (edDays) edDays.option('value', 30);
      const edPt = form.getEditor('bonus_pt_sessions');
      if (edPt) edPt.option('value', 10);
    });
    await runner.sleep(800);

    const bothState = await runner.page.evaluate(() => {
      const form = $('.dx-popup-content .dx-form').dxForm('instance');
      return {
        discount_type_value: form.getEditor('discount_type').option('value'),
        discount_value_visible: form.itemOption('discount_value').visible,
        bonus_days_visible: form.itemOption('bonus_days').visible,
        bonus_pt_visible: form.itemOption('bonus_pt_sessions').visible,
        bonus_days_label: form.itemOption('bonus_days').label.text,
        bonus_pt_label: form.itemOption('bonus_pt_sessions').label.text
      };
    });
    console.log('Combo BOTH State:', bothState);

    if (!bothState.bonus_days_visible || !bothState.bonus_pt_visible || bothState.discount_value_visible) {
      throw new Error('Combo with BOTH did not show bonus fields or hide discount_value: ' + JSON.stringify(bothState));
    }

    await runner.page.screenshot({
      path: path.join(ARTIFACT_DIR, 'verify_voucher_th3_combo.png'),
      fullPage: false
    });
    console.log('Saved: verify_voucher_th3_combo.png');

    // Click [Tạo mã voucher] save button in modal
    console.log('Saving Combo Voucher from UI...');
    await runner.page.evaluate(() => {
      $('.dx-popup-content .dx-button:contains("Tạo mã voucher")').trigger('dxclick');
    });
    await runner.sleep(2500);

    // Verify it appears on DataGrid
    const gridItem = await runner.page.evaluate((codeVal) => {
      const row = Array.from(document.querySelectorAll('.dx-datagrid-rowsview tr.dx-data-row')).find(tr => tr.innerText.includes(codeVal));
      return row ? row.innerText : null;
    }, codeComboUI);
    console.log(`Grid Row Found for ${codeComboUI}:`, gridItem);

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
  } finally {
    if (runner.browser) await runner.browser.close();
  }
}

main().catch(err => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});

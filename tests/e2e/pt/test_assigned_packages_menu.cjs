const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/Admin/.agents/skills/playwright-skill/node_modules/playwright');

process.chdir('E:/Desktop/para/backend');
const { pool } = require('E:/Desktop/para/backend/src/db/postgres');
const { context: getAuthContext } = require('E:/Desktop/para/backend/src/modules/core/auth');
const { signAccessToken } = require('E:/Desktop/para/backend/src/utils/token');

const ROOT = 'E:/Desktop/para';
const TARGET_URL = 'http://localhost:3000';

async function run() {
  console.log('=== STARTING TEST FOR PT ASSIGNED PACKAGES MENU (PT02) ===');
  const row = (await pool.query("SELECT p.account_id FROM pt_profiles p JOIN accounts a ON a.id=p.account_id WHERE a.status='ACTIVE' ORDER BY p.pt_code LIMIT 1")).rows[0];
  const user = await getAuthContext(row.account_id, 'PT');
  const token = signAccessToken(user);
  await pool.end();

  const outDir = path.join(ROOT, 'tests/e2e/pt/evidence-assigned-packages');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ 
    headless: true,
    executablePath: 'C:/Users/Admin/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

  await ctx.addInitScript(({ token, user }) => {
    localStorage.setItem('paradise_access_token', token);
    localStorage.setItem('paradise_user', JSON.stringify(user));
  }, { token, user });

  const page = await ctx.newPage();

  try {
    await page.goto(TARGET_URL + '/mobile/pt/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 1. Kiểm tra nhãn menu footer
    console.log('1. Checking bottom navigation item label...');
    const bottomNavText = await page.locator('#bottomNav .nav-item[data-tab="members"] > span:first-of-type').textContent();
    console.log('   Bottom nav label for data-tab="members":', JSON.stringify(bottomNavText.trim()));
    if (!bottomNavText.includes('Gói phụ trách')) {
      throw new Error(`Expected 'Gói phụ trách' in bottom nav, but got: '${bottomNavText}'`);
    }

    // 2. Click mở menu Gói phụ trách
    console.log('2. Clicking "Gói phụ trách" nav item...');
    await page.locator('#bottomNav .nav-item[data-tab="members"]').click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(outDir, '01-tab1-assigned-members.png') });
    console.log('   Saved 01-tab1-assigned-members.png');

    // Kiểm tra Tab 1 active
    const tab1Active = await page.locator('#tabBtnMembers').evaluate(el => el.classList.contains('active'));
    console.log('   Tab 1 "Học viên phụ trách" is active:', tab1Active);
    if (!tab1Active) throw new Error('Expected #tabBtnMembers to be active by default');

    // Đếm số thẻ học viên duy nhất
    const uniqueMemberCards = await page.locator('.pt-member-summary-card').count();
    console.log(`   Unique member cards displayed: ${uniqueMemberCards}`);
    if (uniqueMemberCards === 0) throw new Error('No member cards found in Tab 1');

    // Lấy thông tin học viên đầu tiên
    const firstMemberName = await page.locator('.pt-member-summary-card .pt-client-name').first().textContent();
    const pkgPillText = await page.locator('.pt-member-summary-card .pt-pkg-pill-badge').first().textContent();
    console.log(`   First member: ${firstMemberName.trim()} | Pill: ${pkgPillText.trim()}`);

    // 3. Click vào học viên đầu tiên -> Mở màn hình danh sách gói của học viên
    console.log('3. Clicking member card to open Member Packages subscreen...');
    await page.locator('.pt-member-summary-card').first().click();
    await page.waitForTimeout(600);

    const subscreenVisible = await page.locator('#memberPackagesSubscreen').isVisible();
    console.log('   #memberPackagesSubscreen visible:', subscreenVisible);
    if (!subscreenVisible) throw new Error('#memberPackagesSubscreen did not open!');

    await page.screenshot({ path: path.join(outDir, '02-member-packages-subscreen.png') });
    console.log('   Saved 02-member-packages-subscreen.png');

    const memberPkgsCount = await page.locator('#memberPackagesSubscreen .pt-client-card').count();
    console.log(`   Packages listed for this member: ${memberPkgsCount}`);
    if (memberPkgsCount === 0) throw new Error('No package cards found inside memberPackagesSubscreen');

    // 4. Click vào 1 gói của học viên -> Mở màn hình Chi tiết tiến độ (PT02-US02)
    console.log('4. Clicking a package to open Roadmap & Progress Detail...');
    const firstPkgName = await page.locator('#memberPackagesSubscreen .pt-pkg-name').first().textContent();
    console.log('   Selected package:', firstPkgName.trim());

    await page.locator('#memberPackagesSubscreen .pt-client-card').first().click();
    await page.waitForTimeout(600);

    const detailVisible = await page.locator('#clientDetailSubscreen').isVisible();
    console.log('   #clientDetailSubscreen visible:', detailVisible);
    if (!detailVisible) throw new Error('#clientDetailSubscreen did not open!');

    await page.screenshot({ path: path.join(outDir, '03-client-detail-from-member.png') });
    console.log('   Saved 03-client-detail-from-member.png');

    // 5. Kiểm tra nút Back từ Detail -> Quay lại Member Packages
    console.log('5. Clicking Back from Detail...');
    await page.locator('#clientDetailSubscreen .pt-back-btn').click();
    await page.waitForTimeout(500);

    const detailHidden = !(await page.locator('#clientDetailSubscreen').isVisible());
    const subscreenBackVisible = await page.locator('#memberPackagesSubscreen').isVisible();
    console.log('   Back to Member Packages success:', detailHidden && subscreenBackVisible);
    if (!subscreenBackVisible) throw new Error('Failed to return to memberPackagesSubscreen');

    // 6. Kiểm tra nút Back từ Member Packages -> Quay lại Tab 1 chính
    console.log('6. Clicking Back from Member Packages...');
    await page.locator('#memberPackagesSubscreen .pt-back-btn').click();
    await page.waitForTimeout(500);

    const subscreenHidden = !(await page.locator('#memberPackagesSubscreen').isVisible());
    const mainListVisible = await page.locator('#ptClientsContentList').isVisible();
    console.log('   Back to Tab 1 main list success:', subscreenHidden && mainListVisible);
    if (!subscreenHidden) throw new Error('Failed to return to Tab 1');

    // 7. Chuyển sang Tab 2: "Gói đang phụ trách"
    console.log('7. Switching to Tab 2: "Gói đang phụ trách"...');
    await page.locator('#tabBtnPackages').click();
    await page.waitForTimeout(600);

    const tab2Active = await page.locator('#tabBtnPackages').evaluate(el => el.classList.contains('active'));
    console.log('   Tab 2 is active:', tab2Active);
    if (!tab2Active) throw new Error('Expected #tabBtnPackages to be active');

    const totalPackages = await page.locator('#ptClientsContentList .pt-client-card').count();
    console.log(`   Total package cards in Tab 2: ${totalPackages}`);
    if (totalPackages === 0) throw new Error('No package cards found in Tab 2');

    await page.screenshot({ path: path.join(outDir, '04-tab2-packages-list.png') });
    console.log('   Saved 04-tab2-packages-list.png');

    // 8. Bấm vào 1 gói trong Tab 2 -> Mở trực tiếp màn hình tiến độ
    console.log('8. Clicking package card in Tab 2...');
    await page.locator('#ptClientsContentList .pt-client-card').first().click();
    await page.waitForTimeout(600);

    const detailFromTab2 = await page.locator('#clientDetailSubscreen').isVisible();
    console.log('   #clientDetailSubscreen opened directly from Tab 2:', detailFromTab2);
    if (!detailFromTab2) throw new Error('Failed to open detail directly from Tab 2');

    await page.screenshot({ path: path.join(outDir, '05-client-detail-from-tab2.png') });
    console.log('   Saved 05-client-detail-from-tab2.png');

    // 9. Bấm Back từ Detail -> Quay lại Tab 2
    console.log('9. Clicking Back from Detail to Tab 2...');
    await page.locator('#clientDetailSubscreen .pt-back-btn').click();
    await page.waitForTimeout(500);

    const tab2StillActive = await page.locator('#tabBtnPackages').evaluate(el => el.classList.contains('active'));
    console.log('   Returned to Tab 2 successfully:', tab2StillActive);
    if (!tab2StillActive) throw new Error('Expected to return to Tab 2');

    // 10. Test tìm kiếm realtime trong Tab 2
    console.log('10. Testing realtime search in Tab 2...');
    await page.locator('#ptClientsSearchInput').fill('zzz-no-such-package');
    await page.waitForTimeout(400);

    const emptyCount = await page.locator('.pt-empty-state').count();
    console.log('   Empty state shown on no match:', emptyCount > 0);
    if (emptyCount === 0) throw new Error('Expected empty state for non-matching query');

    await page.screenshot({ path: path.join(outDir, '06-search-empty-state.png') });
    console.log('   Saved 06-search-empty-state.png');

    // Clear search
    await page.locator('#ptClientsSearchClear').click();
    await page.waitForTimeout(400);

    const restoredCount = await page.locator('#ptClientsContentList .pt-client-card').count();
    console.log('   Restored package count after clear:', restoredCount === totalPackages);
    if (restoredCount !== totalPackages) throw new Error('Package count not restored after clear');

    console.log('=== TEST COMPLETED 100% PASS! ALL USER STORIES VALIDATED! ===');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/Admin/.agents/skills/playwright-skill/node_modules/playwright');
process.chdir('E:/Desktop/para/backend');
const { pool } = require('E:/Desktop/para/backend/src/db/postgres');
const { context } = require('E:/Desktop/para/backend/src/modules/core/auth');
const { signAccessToken } = require('E:/Desktop/para/backend/src/utils/token');
const ROOT = 'E:/Desktop/para';
const TARGET_URL = 'http://localhost:3000';
async function run() {
  const row = (await pool.query("SELECT p.account_id FROM pt_profiles p JOIN accounts a ON a.id=p.account_id WHERE a.status='ACTIVE' ORDER BY p.pt_code LIMIT 1")).rows[0];
  const user = await context(row.account_id, 'PT');
  const token = signAccessToken(user);
  await pool.end();
  const browser = await chromium.launch({headless:false});
  const errors = [], requests = [], results = [], blockedWrites = [];
  try {
    const ctx = await browser.newContext({viewport:{width:390,height:844}});
    await ctx.route('**/api/v1/**', route => {
      if (!['GET','HEAD','OPTIONS'].includes(route.request().method())) {
        blockedWrites.push({method:route.request().method(),url:route.request().url()});
        return route.abort();
      }
      return route.continue();
    });
    await ctx.addInitScript(({token,user}) => {
      localStorage.setItem('paradise_access_token',token);
      localStorage.setItem('paradise_user',JSON.stringify(user));
    }, {token,user});
    const page = await ctx.newPage();
    page.on('pageerror', e=>errors.push(e.message));
    page.on('response',r=>{ if(r.url().includes('/api/v1/')) requests.push({url:r.url().split('/api/v1/')[1],status:r.status()}); });
    await page.goto(TARGET_URL+'/mobile/pt/',{waitUntil:'networkidle'});
    await page.locator('#view-schedule.active').waitFor();
    async function snap(us,name,selector) {
      const dir=path.join(ROOT,'tests/e2e/pt',us,'visual-20260920');fs.mkdirSync(dir,{recursive:true});
      const el=page.locator(selector).first(); await el.waitFor({state:'visible'});
      if (!selector.includes('toastContainer')) {
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
      } else {
        await page.waitForTimeout(300);
      }
      const box=await el.boundingBox();
      await page.evaluate(({box,n})=>{const mark=document.createElement('div');mark.id='visual-check-mark';mark.style.cssText=`position:fixed;pointer-events:none;z-index:100000;border:2px solid #e11d48;left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px;`;const badge=document.createElement('span');badge.textContent=n;badge.style.cssText='position:absolute;top:0;right:0;background:#e11d48;color:white;border:2px solid white;border-radius:50%;width:24px;height:24px;text-align:center;font:600 14px/20px Arial;';mark.append(badge);document.body.append(mark);},{box,n:results.length+1});
      await page.screenshot({path:path.join(dir,name+'.png'),fullPage:true});
      await page.evaluate(()=>document.getElementById('visual-check-mark')?.remove());
      results.push({us,name,viewport:page.viewportSize(),visible:await el.isVisible(),text:(await el.innerText()).slice(0,500),layout:await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyBg:getComputedStyle(document.body).backgroundColor,bodyColor:getComputedStyle(document.body).color,navItems:document.querySelectorAll('#bottomNav .nav-item').length}))});
    }
    await snap('PT01-US01','step-01-schedule-mobile','#ptCalendarCard');
    await page.locator('#btnToggleCalendarMode').click();
    await snap('PT01-US01','step-02-expanded-calendar','#fullMonthContainer');
    await page.locator('[data-tab="overview"]').click();
    await page.waitForLoadState('networkidle');
    await snap('PT06-US01','step-01-overview-mobile','.pt-kpi-grid');
    await page.locator('#cardPtCommissions').click();
    await page.waitForLoadState('networkidle');
    await snap('PT06-US02','step-01-commission-dialog','#commissionModalBackdrop .center-modal-box');
    await page.locator('.pt-comm-chip[data-filter="custom"]').click();
    await snap('PT06-US02','step-02-custom-month','#commCustomMonthWrap');
    await page.locator('#btnCloseCommissionModal').click();
    await page.locator('[data-tab="members"]').click();
    await page.waitForLoadState('networkidle');
    await snap('PT02-US01','step-01-clients-mobile','#clientsViewContainer');
    if (await page.locator('.pt-client-card').count()) {
      await page.locator('.pt-client-card').first().focus();
      await page.keyboard.press('Enter');
      await snap('PT02-US02','step-01-client-detail','#clientDetailSubscreen');
      await page.locator('#clientDetailSubscreen .pt-back-btn').click();
    }
    await page.locator('#ptClientsSearchInput').fill('zzzz-no-match');
    await page.waitForTimeout(400);
    await snap('PT02-US01','step-02-empty-search','#ptClientsContentList');
    await page.locator('#ptClientsSearchClear').click();
    await page.locator('#tabBtnRequests').click();
    await snap('PT02-US03','step-01-assignment-requests','#ptClientsContentList');
    await page.locator('#tabBtnAssigned').click();
    await page.locator('[data-tab="profile"]').click();
    await page.waitForLoadState('networkidle');
    await snap('PT04-US01','step-01-profile-mobile','.coach-profile-row');
    await page.locator('#btnOpenEditProfile').click();
    await snap('PT04-US02','step-01-edit-profile-dialog','.pt-dx-editprofile-content');
    await page.locator('#dxEditEmail').fill('invalid-email');
    await snap('PT04-US02','step-02-invalid-email-input','#dxEditEmail');
    await page.locator('.dx-popup-wrapper .dx-button').filter({hasText:'Lưu thay đổi'}).click();
    await snap('PT04-US02','step-03-email-validation','#toastContainer .gym-toast');
    await page.locator('.dx-popup-wrapper .dx-closebutton').click();
    await page.locator('.pt-dx-editprofile-content').waitFor({state:'hidden'});
    await page.locator('#btnOpenChangePassword').click();
    await snap('PT04-US01','step-02-password-dialog','.pt-dx-changepass-content');
    await page.locator('.dx-popup-wrapper .dx-closebutton').click();
    await page.locator('.pt-dx-changepass-content').waitFor({state:'hidden'});
    await page.locator('#btnLogoutTrigger').click();
    await snap('PT05-US03','step-01-logout-confirmation','.dx-dialog .dx-popup-content');
    await page.locator('.dx-dialog .dx-dialog-buttons .dx-button').last().click();
    await page.locator('#btnNotification').click();
    await page.waitForLoadState('networkidle');
    await snap('PT03-US01','step-01-notifications','.pt-notif-drawer');
    await page.locator('#btnCloseNotif').click();
    for(const viewport of [{width:375,height:667},{width:412,height:915},{width:768,height:1024},{width:1440,height:1000}]) {
      await page.setViewportSize(viewport);
      for(const tab of ['schedule','overview','members','profile']) {
        await page.locator(`[data-tab="${tab}"]`).click();
        await page.waitForLoadState('networkidle');
        const us={schedule:'PT01-US01',overview:'PT06-US01',members:'PT02-US01',profile:'PT04-US01'}[tab];
        await snap(us,`responsive-${viewport.width}-${tab}`,`#view-${tab}`);
      }
    }
    await page.setViewportSize({width:375,height:667});
    await page.locator('#btnOpenEditProfile').click();
    await snap('PT04-US02','responsive-375-edit-profile','.pt-dx-editprofile-content');
    await page.locator('.dx-popup-wrapper .dx-closebutton').click();
    await page.route('**/api/v1/mobile/pt/statistics?*', route=>route.abort('failed'));
    await page.locator('[data-tab="overview"]').click();
    await snap('PT06-US01','step-02-api-error','#overviewErrorBanner');
    await page.unroute('**/api/v1/mobile/pt/statistics?*');
    await page.locator('#btnRetryStats').click();
    await page.locator('#overviewErrorBanner').waitFor({state:'hidden'});
    await page.waitForLoadState('networkidle');
    await snap('PT06-US01','step-03-api-retry','.pt-kpi-grid');
    fs.writeFileSync(path.join(ROOT,'tests/e2e/pt/visual-20260920-results.json'),JSON.stringify({results,errors,requests,blockedWrites},null,2));
    console.log(JSON.stringify({screenshots:results.length,errors,blockedWrites,failedRequests:requests.filter(x=>x.status>=400),overflow:results.filter(x=>x.layout.scrollWidth>x.layout.width)},null,2));
  } finally {await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});

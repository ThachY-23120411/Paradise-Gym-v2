const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/Admin/.agents/skills/playwright-skill/node_modules/playwright');
process.chdir('E:/Desktop/para/backend');
const { pool } = require('E:/Desktop/para/backend/src/db/postgres');
const { context } = require('E:/Desktop/para/backend/src/modules/core/auth');
const { signAccessToken } = require('E:/Desktop/para/backend/src/utils/token');
const root = 'E:/Desktop/para/tests/e2e';
const us = {dashboard:'W01-US01',members:'W02-US04',packages:'W03-US01',registrations:'W04-US03',trainers:'W05-US01','pt-schedule':'W06-US01','community-classes':'W16-US01','access-gate':'W07-US03','customer-care':'W14-US01',payments:'W08-US03',commissions:'W15-US01',discounts:'W17-US01',notifications:'W09-US01',reports:'W10-US01',branches:'W11-US01',equipment:'W12-US01','users-rbac':'W13-US01'};
async function run() {
  const identities=[];
  for (const role of ['QTV','RECEPTIONIST','MEMBER']) {
    const rows=(await pool.query(`SELECT a.id FROM accounts a JOIN account_roles ar ON ar.account_id=a.id JOIN roles r ON r.id=ar.role_id WHERE a.status='ACTIVE' AND r.role_code=$1 ORDER BY a.login_phone`,[role])).rows;
    let user;
    for (const row of rows) { user=await context(row.id,role); if(role!=='QTV'||user.is_all_branches)break; }
    if(user)identities.push({role,user,token:signAccessToken(user)});
  }
  await pool.end();
  const browser=await chromium.launch({headless:false});
  const results=[];
  try {
    for(const {role,user,token} of identities){
      const mobile=role==='MEMBER', reportRole=mobile?'hv':role==='QTV'?'qtv':'lt';
      const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});
      await ctx.addInitScript(({token,user})=>{localStorage.setItem('paradise_access_token',token);localStorage.setItem('paradise_user',JSON.stringify(user));},{token,user});
      const writes=[],errors=[],failed=[];
      await ctx.route('**/api/v1/**',route=>{const req=route.request();if(!['GET','HEAD','OPTIONS'].includes(req.method())){writes.push({method:req.method(),url:req.url()});return route.abort();}return route.continue();});
      const page=await ctx.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.url().includes('/api/v1/')&&r.status()>=400)failed.push({url:r.url().split('/api/v1/')[1],status:r.status()});});
      await page.goto('http://localhost:3000/'+(mobile?'mobile/member/':'web/'),{waitUntil:'networkidle'});
      await page.locator(mobile?'#main':'#appShell').waitFor({state:'visible'});
      const menus=mobile?['home','schedule','packages','payments','account','notifications']:await page.locator('#sidebarList [data-menu]').evaluateAll(els=>els.map(e=>e.dataset.menu));
      async function snap(menu,suffix='') {
        await page.waitForLoadState('networkidle');await page.waitForTimeout(menu==='reports'?1600:300);
        const content=page.locator(mobile?'#main':'#mainViewport');
        const menuUs=mobile?{home:'HV01-US01',schedule:'HV02-US01',packages:'HV03-US01',payments:'HV03-US06',account:'HV04-US01',notifications:'HV05-US01'}[menu]:(role==='QTV'?'QTV-':'LT-')+us[menu];
        const dir=path.join(root,reportRole,menuUs,'readonly-20260920');fs.mkdirSync(dir,{recursive:true});
        const box=await content.boundingBox();
        await page.evaluate(({box,n})=>{const e=document.createElement('div');e.id='audit-mark';e.style.cssText=`position:fixed;pointer-events:none;z-index:99999;border:2px solid #d83b5c;left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${Math.min(box.height,innerHeight-box.y-2)}px`;e.innerHTML=`<span style="position:absolute;right:0;top:0;background:#d83b5c;color:white;border-radius:50%;padding:4px 8px;font:600 13px Arial">${n}</span>`;document.body.append(e);},{box,n:results.length+1});
        const file=path.join(dir,`open-${menu}${suffix}.png`);
        await page.screenshot({path:file,fullPage:true});
        await page.evaluate(()=>document.getElementById('audit-mark')?.remove());
        results.push({role,menu,suffix,us:menuUs,file,visible:await content.isVisible(),text:(await content.innerText()).slice(0,2400),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),errors:[...errors],failed:[...failed],blockedWrites:[...writes]});
        console.log(role+' '+menu+suffix+': captured');
      }
      for(const menu of menus){
        if(mobile) await page.evaluate(m=>window.MemberApp.navigate(m),menu);
        else await page.locator(`#sidebarList [data-menu="${menu}"]`).click();
        await snap(menu);
        if(menu==='reports')for(let i=1;i<3;i++){await page.locator('.report-tabs .dx-tab').nth(i).click();await snap(menu,'-tab-'+i);}
      }
      await ctx.close();
    }
    fs.writeFileSync(path.join(root,'readonly-20260920-results.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify({screenshots:results.length,roles:[...new Set(results.map(x=>x.role))],errors:results.filter(x=>x.errors.length||x.failed.length||x.overflow||x.blockedWrites.length).map(x=>({role:x.role,menu:x.menu,errors:x.errors,failed:x.failed,overflow:x.overflow,blockedWrites:x.blockedWrites}))},null,2));
  }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});

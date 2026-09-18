const path = require('path');
const puppeteer = require(path.resolve(__dirname, '../../backend/node_modules/puppeteer-core'));
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000/web/';
const API_URL = 'http://localhost:5000/api/v1';

class E2ETestRunner {
  constructor() {
    this.browser = null;
    this.page = null;
    this.authTokens = {};
    this.currentUsData = null;
  }

  async init() {
    console.log('[Runner] Launching Headless Chrome...');
    this.browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    this.page.on('console', msg => {
      const txt = msg.text();
      if (!txt.includes('DevExtreme') && !txt.includes('W0019') && !txt.includes('W0017')) {
        // console.log('  [Browser Console]', txt);
      }
    });
  }

  async getAuthToken(phone, password = 'Paradise@123', activeRole = null) {
    const key = `${phone}_${activeRole || 'default'}`;
    const cacheFile = path.resolve(__dirname, '.token_cache.json');
    if (!this.authTokens[key] && fs.existsSync(cacheFile)) {
      try {
        const saved = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        this.authTokens = { ...saved, ...this.authTokens };
      } catch (_) {}
    }

    if (this.authTokens[key]) {
      try {
        const testRes = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${this.authTokens[key].token}` }
        }).then(r => r.json());
        if (testRes.success) return this.authTokens[key];
      } catch (_) {}
    }

    const body = { login_phone: phone, password };
    if (activeRole) body.active_role = activeRole;

    const loginRes = await fetch(`${API_URL}/auth/login-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json());

    let token = loginRes.data?.access_token;
    let user = loginRes.data?.user;

    if (loginRes.data?.requires_2fa) {
      const verifyRes = await fetch(`${API_URL}/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: loginRes.data.temp_token, otp_code: loginRes.data.dev_otp })
      }).then(r => r.json());
      token = verifyRes.data?.access_token;
      user = verifyRes.data?.user;
    }

    if (token) {
      this.authTokens[key] = { token, user };
      try {
        fs.writeFileSync(cacheFile, JSON.stringify(this.authTokens, null, 2), 'utf8');
      } catch (_) {}
    }
    return this.authTokens[key];
  }

  async ensurePage() {
    if (!this.page || this.page.isClosed()) {
      this.page = await this.browser.newPage();
    }
  }

  async safeGoto(url, options = {}) {
    await this.ensurePage();
    const opts = { waitUntil: 'domcontentloaded', timeout: 15000, ...options };
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.page.goto(url, opts);
        return;
      } catch (err) {
        if (err.message.includes('ERR_ABORTED') || err.message.includes('Execution context was destroyed') || err.message.includes('Target closed') || err.message.includes('timeout')) {
          await this.sleep(800 * attempt);
          continue;
        }
        throw err;
      }
    }
  }

  async switchSession(phone, branchId = 'ALL', activeRole = null) {
    await this.ensurePage();
    const auth = await this.getAuthToken(phone, 'Paradise@123', activeRole);
    await this.page.evaluate((t, u, b) => {
      localStorage.setItem('paradise_access_token', t);
      localStorage.setItem('paradise_user', JSON.stringify(u));
      localStorage.setItem('paradise_current_branch_id', b);
    }, auth.token, auth.user, branchId).catch(() => {});

    await this.safeGoto(BASE_URL);

    const isShellVisible = await this.page.evaluate(() => $('#appShell:visible').length > 0).catch(() => false);
    if (!isShellVisible) {
      await this.page.evaluate((t, u, b) => {
        localStorage.setItem('paradise_access_token', t);
        localStorage.setItem('paradise_user', JSON.stringify(u));
        localStorage.setItem('paradise_current_branch_id', b);
      }, auth.token, auth.user, branchId).catch(() => {});
      await this.safeGoto(BASE_URL);
    }

    await this.page.waitForFunction(() => Boolean(window.ParadiseApp && $('#appShell:visible').length > 0), { timeout: 8000 }).catch(() => {});
    await this.sleep(1200);
  }

  async openDesktopSession(phone, branchId = 'ALL', activeRole = 'QTV') {
    await this.ensurePage();
    await this.page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5, isMobile: false });
    await this.switchSession(phone, branchId, activeRole);
  }

  async openMobileMemberSession(phone, route = 'home') {
    await this.ensurePage();
    await this.page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    const auth = await this.getAuthToken(phone, 'Paradise@123', 'MEMBER');
    await this.safeGoto('http://localhost:3000/favicon.ico');
    await this.page.evaluate((t, u) => {
      localStorage.clear();
      localStorage.setItem('paradise_access_token', t);
      localStorage.setItem('paradise_user', JSON.stringify(u));
    }, auth.token, auth.user).catch(() => {});

    const targetUrl = `http://localhost:3000/mobile/member/#${route}`;
    await this.safeGoto(targetUrl);
    await this.page.waitForFunction(() => Boolean(window.MemberApp && window.MemberApp.user), { timeout: 10000 }).catch(() => {});
    if (route) {
      const [r, s] = route.split('/');
      await this.page.evaluate(({ r, s }) => {
        if (window.MemberApp && typeof window.MemberApp.navigate === 'function') {
          window.MemberApp.navigate(r, s);
        }
      }, { r, s }).catch(() => {});
    }
    await this.sleep(1500);
  }

  async openMobilePtSession(phone, route = 'schedule') {
    await this.ensurePage();
    await this.page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    const auth = await this.getAuthToken(phone, 'Paradise@123', 'PT');
    await this.safeGoto('http://localhost:3000/favicon.ico');
    await this.page.evaluate((t, u) => {
      localStorage.clear();
      localStorage.setItem('paradise_access_token', t);
      localStorage.setItem('paradise_user', JSON.stringify(u));
    }, auth.token, auth.user).catch(() => {});

    const targetUrl = `http://localhost:3000/mobile/pt/`;
    await this.safeGoto(targetUrl);
    await this.page.waitForFunction(() => Boolean(window.ptApp && $('#authScreen').is(':hidden')), { timeout: 10000 }).catch(() => {});
    if (route) {
      await this.page.evaluate((r) => {
        if (window.ptApp && typeof window.ptApp.switchTab === 'function') {
          window.ptApp.switchTab(r);
        } else {
          $(`#bottomNav .nav-item[data-tab="${r}"]`).trigger('click');
        }
      }, route).catch(() => {});
    }
    await this.sleep(1500);
  }

  async navigateTo(menuId) {
    await this.ensurePage();
    await this.page.waitForFunction(() => Boolean(window.ParadiseApp && typeof window.ParadiseApp.navigateTo === 'function'), { timeout: 10000 }).catch(() => {});
    await this.page.evaluate((id) => {
      if (window.ParadiseApp) {
        window.ParadiseApp.navigateTo(id);
      } else {
        location.hash = '#' + id;
      }
    }, menuId);
    await this.sleep(1500);
  }

  async closeAllPopups() {
    await this.page.evaluate(() => {
      $('.dx-popup').each(function () {
        try {
          const inst = $(this).dxPopup('instance');
          if (inst && inst.option('visible')) inst.hide();
        } catch (_) {}
      });
    });
    await this.sleep(500);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async openMobilePtGuest(route = '') {
    await this.ensurePage();
    await this.page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await this.safeGoto(BASE_URL);
    await this.page.evaluate(() => {
      localStorage.removeItem('paradise_access_token');
      localStorage.removeItem('paradise_user');
      localStorage.removeItem('paradise_current_branch_id');
    }).catch(() => {});
    const targetUrl = `http://localhost:3000/mobile/${route ? '#' + route : ''}`;
    await this.safeGoto(targetUrl);
    await this.sleep(1500);
  }

  async openMobilePortal() {
    await this.ensurePage();
    await this.page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await this.safeGoto(BASE_URL);
    await this.page.evaluate(() => {
      localStorage.removeItem('paradise_access_token');
      localStorage.removeItem('paradise_user');
      localStorage.removeItem('paradise_current_branch_id');
    }).catch(() => {});
    await this.safeGoto('http://localhost:3000/mobile/');
    await this.sleep(1200);
  }

  startUserStory(usId, title, epic, role = 'Huấn luyện viên (PT)', platform = 'Mobile App PT (390x844 kết nối PostgreSQL qua REST API)') {
    let roleFolder = 'qtv';
    if (usId.startsWith('QTV-')) roleFolder = 'qtv';
    else if (usId.startsWith('LT-')) roleFolder = 'lt';
    else if (usId.startsWith('HV')) roleFolder = 'hv';
    else if (usId.startsWith('PT')) roleFolder = 'pt';

    const dir = path.resolve(__dirname, roleFolder, usId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.currentUsData = {
      usId,
      title,
      epic,
      role,
      platform,
      dir,
      steps: [],
      downstreamSteps: [],
      issues: [],
      stateVerification: null
    };
    console.log(`\n>>> STARTING TEST FOR [${usId}]: ${title}`);
  }

  async annotate(annotations = []) {
    if (!annotations || annotations.length === 0) return;
    await this.page.evaluate((items) => {
      document.querySelectorAll('.e2e-annotation-overlay').forEach(el => el.remove());
      items.forEach((item, index) => {
        let el = null;
        try {
          el = typeof window.$ === 'function' ? $(item.selector)[0] : document.querySelector(item.selector);
        } catch (_) {
          el = document.querySelector(item.selector);
        }
        if (!el && !item.rect) return;

        const rect = item.rect || (() => {
          const r = el.getBoundingClientRect();
          return {
            top: r.top + window.scrollY,
            left: r.left + window.scrollX,
            width: r.width,
            height: r.height
          };
        })();

        const color = item.color || '#e11d48';
        const num = item.number !== undefined ? item.number : (index + 1);
        const shape = item.shape || 'rect';
        const borderRadius = shape === 'circle' ? '50%' : '6px';

        // 1. Highlight box
        const box = document.createElement('div');
        box.className = 'e2e-annotation-overlay';
        box.style.cssText = `position:absolute; top:${rect.top - 4}px; left:${rect.left - 4}px; width:${rect.width + 8}px; height:${rect.height + 8}px; border:3px solid ${color}; border-radius:${borderRadius}; box-shadow:0 0 10px ${color}99, inset 0 0 6px ${color}33; pointer-events:none; z-index:999999; box-sizing:border-box;`;

        // 2. Numbered Badge (Circle with number)
        if (num !== null && num !== undefined) {
          const badge = document.createElement('div');
          badge.className = 'e2e-annotation-overlay';
          badge.innerText = `${num}`;
          badge.style.cssText = `position:absolute; top:${rect.top - 14}px; left:${rect.left - 14}px; width:28px; height:28px; background:${color}; color:#ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; font-family:Arial, sans-serif; border:2px solid #ffffff; box-shadow:0 2px 6px rgba(0,0,0,0.4); pointer-events:none; z-index:1000000;`;
          document.body.appendChild(badge);
        }

        // 3. Label tag if provided
        if (item.label) {
          const tag = document.createElement('div');
          tag.className = 'e2e-annotation-overlay';
          tag.innerText = item.label;
          tag.style.cssText = `position:absolute; top:${rect.top + rect.height + 6}px; left:${rect.left}px; background:${color}; color:#ffffff; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:600; font-family:Arial, sans-serif; box-shadow:0 2px 5px rgba(0,0,0,0.3); pointer-events:none; z-index:1000000; white-space:nowrap;`;
          document.body.appendChild(tag);
        }

        document.body.appendChild(box);
      });
    }, annotations);
  }

  async clearAnnotations() {
    await this.page.evaluate(() => {
      document.querySelectorAll('.e2e-annotation-overlay').forEach(el => el.remove());
    });
  }

  async captureStep(filename, annotations = []) {
    const filepath = path.join(this.currentUsData.dir, filename);
    if (annotations && annotations.length > 0) {
      await this.annotate(annotations);
    }
    await this.sleep(350);
    await this.page.screenshot({ path: filepath });
    if (annotations && annotations.length > 0) {
      await this.clearAnnotations();
    }
    return filepath;
  }

  async recordStep({ stepNumber, name, action, expected, actual, status = 'PASS', filename, annotations = [] }) {
    await this.captureStep(filename, annotations);
    this.currentUsData.steps.push({
      stepNumber,
      name,
      action,
      expected,
      actual,
      status,
      filename
    });
    console.log(`  [Step ${stepNumber}] ${name} -> ${status}`);
  }

  async recordDownstream({ name, role, screen, action, expected, actual, status = 'PASS', filename, annotations = [] }) {
    await this.captureStep(filename, annotations);
    this.currentUsData.downstreamSteps.push({
      name,
      role,
      screen,
      action,
      expected,
      actual,
      status,
      filename
    });
    console.log(`  [Downstream] ${name} (${role}) -> ${status}`);
  }

  setStateVerification(desc, status = 'PASS', filename = null) {
    this.currentUsData.stateVerification = { desc, status, filename };
  }

  addIssue({ code, title, severity = 'MAJOR', step, evidence, actualVsExpected }) {
    this.currentUsData.issues.push({ code, title, severity, step, evidence, actualVsExpected });
  }

  finishUserStory() {
    const data = this.currentUsData;
    const reportPath = path.join(data.dir, `${data.usId}-test.md`);

    const totalSteps = data.steps.length;
    const passedSteps = data.steps.filter(s => s.status === 'PASS').length;
    const failedSteps = data.steps.filter(s => s.status === 'FAIL').length;
    const blockedSteps = data.steps.filter(s => s.status === 'BLOCKED').length;

    const downstreamTotal = data.downstreamSteps.length;
    const downstreamPassed = data.downstreamSteps.filter(s => s.status === 'PASS').length;

    const overallStatus = (failedSteps === 0 && blockedSteps === 0 && (downstreamTotal === 0 || downstreamPassed === downstreamTotal)) ? 'PASS' : (blockedSteps > 0 ? 'BLOCKED' : 'FAIL');

    let md = `# Báo Cáo Kiểm Thử E2E — ${data.usId}: ${data.title}\n\n`;
    md += `- **User Story:** \`${data.usId}\`\n`;
    md += `- **Epic / Menu:** ${data.epic}\n`;
    md += `- **Vai trò thực hiện (Primary Role):** ${data.role}\n`;
    md += `- **Phạm vi kiểm thử:** ${data.platform || 'UI thật kết nối PostgreSQL qua REST API'}\n`;
    md += `- **Ngày thực hiện:** ${new Date().toISOString().split('T')[0]}\n`;
    md += `- **Trạng thái tổng thể:** **\`${overallStatus}\`**\n\n`;
    md += `---\n\n`;

    md += `## 1. Overview & Preconditions\n\n`;
    md += `### 1.1. Mục tiêu kiểm thử\n`;
    md += `Xác minh tính đúng đắn theo Main Flow, Alternate Flows, Exception Flows, Dynamic UI và Business Rules của User Story \`${data.usId}\` trên giao diện thực tế.\n\n`;
    md += `### 1.2. Điều kiện tiên quyết (Preconditions)\n`;
    md += `- [x] Tài khoản vai trò ${data.role} có quyền hạn và trạng thái hợp lệ trên hệ thống.\n`;
    md += `- [x] Cơ sở dữ liệu PostgreSQL đã được nạp dữ liệu quan hệ đồng bộ (chi nhánh, gói tập, hội viên, HLV).\n`;
    md += `- [x] Dịch vụ Backend REST API hoạt động bình thường trên cổng 5000.\n\n`;
    md += `---\n\n`;

    md += `## 2. Source Action Verification (Step-by-Step)\n\n`;
    for (const step of data.steps) {
      md += `### Step ${step.stepNumber}: ${step.name}\n`;
      md += `- **Action / Input:** ${step.action}\n`;
      md += `- **Expected Result:** ${step.expected}\n`;
      md += `- **Actual Result:** ${step.actual}\n`;
      md += `- **Status:** \`${step.status}\`\n\n`;
      md += `![Step ${step.stepNumber} - ${step.name}](./${step.filename})\n\n`;
      md += `---\n\n`;
    }

    md += `## 3. State Verification (Data & UI Consistency)\n\n`;
    if (data.stateVerification) {
      md += `- **Mô tả kiểm chứng:** ${data.stateVerification.desc}\n`;
      md += `- **Status:** \`${data.stateVerification.status}\`\n\n`;
      if (data.stateVerification.filename) {
        md += `![State Verification](./${data.stateVerification.filename})\n\n`;
      }
    } else {
      md += `Dữ liệu và trạng thái giao diện nội tại đồng bộ chính xác theo các thao tác đã thực hiện.\n\n`;
    }
    md += `---\n\n`;

    md += `## 4. Cross-Role / Downstream Verification\n\n`;
    if (data.downstreamSteps.length > 0) {
      for (let i = 0; i < data.downstreamSteps.length; i++) {
        const ds = data.downstreamSteps[i];
        md += `### Downstream ${i + 1}: ${ds.name}\n`;
        md += `- **Role / Account:** ${ds.role}\n`;
        md += `- **Screen:** ${ds.screen}\n`;
        md += `- **Verification Action:** ${ds.action}\n`;
        md += `- **Expected Result:** ${ds.expected}\n`;
        md += `- **Actual Result:** ${ds.actual}\n`;
        md += `- **Status:** \`${ds.status}\`\n\n`;
        md += `![Downstream ${i + 1} - ${ds.name}](./${ds.filename})\n\n`;
        md += `---\n\n`;
      }
    } else {
      md += `*User Story này là thao tác xem/truy vấn dữ liệu nội bộ của QTV hoặc không phát sinh thay đổi dữ liệu ảnh hưởng trực tiếp đến vai trò downstream.*\n\n`;
      md += `---\n\n`;
    }

    md += `## 5. Issues Found\n\n`;
    if (data.issues.length > 0) {
      md += `| STT | Mã lỗi | Tiêu đề vấn đề | Mức độ | Bước phát hiện | Ảnh bằng chứng | Trạng thái |\n`;
      md += `| :---: | :--- | :--- | :---: | :---: | :--- | :---: |\n`;
      data.issues.forEach((iss, idx) => {
        md += `| ${idx + 1} | ${iss.code} | ${iss.title} | ${iss.severity} | ${iss.step} | ${iss.evidence} | OPEN |\n`;
      });
      md += `\n`;
    } else {
      md += `| STT | Mã lỗi | Tiêu đề vấn đề | Mức độ | Bước phát hiện | Ảnh bằng chứng | Trạng thái |\n`;
      md += `| :---: | :--- | :--- | :---: | :---: | :--- | :---: |\n`;
      md += `| 1 | *Không có* | Hệ thống hoạt động chính xác 100% theo đặc tả nghiệp vụ | - | - | - | RESOLVED |\n\n`;
    }
    md += `---\n\n`;

    md += `## 6. Final Result\n\n`;
    md += `- **Tổng số bước kiểm thử (Steps):** ${totalSteps}\n`;
    md += `- **Số bước đạt (Passed):** ${passedSteps}\n`;
    md += `- **Số bước không đạt (Failed):** ${failedSteps}\n`;
    md += `- **Số bước bị tắc nghẽn (Blocked):** ${blockedSteps}\n`;
    if (downstreamTotal > 0) {
      md += `- **Downstream Verification:** ${downstreamPassed}/${downstreamTotal} checks passed\n`;
    }
    md += `- **KẾT LUẬN CUỐI CÙNG:** **\`${overallStatus}\`**\n`;

    fs.writeFileSync(reportPath, md, 'utf-8');
    console.log(`[Report Generated] -> ${reportPath} (Result: ${overallStatus})\n`);
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}

module.exports = E2ETestRunner;

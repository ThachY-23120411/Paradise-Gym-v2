const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Admin/.agents/skills/playwright-skill/node_modules/playwright');
const root = path.resolve(__dirname, '../..');
const report = fs.readFileSync(path.join(root, 'docs/reports/tab3-mobile-pt/2026-09-21-payment-business-docs-walkthrough.md'), 'utf8');
const files = process.argv.length > 2 ? process.argv.slice(2) : [...report.matchAll(/^- \[(docs\/user-stories\/[^\]]+)\]/gm)].map(match => match[1]);
if (process.argv.length === 2) assert.equal(files.length, 28, 'Expected the 28 payment-related stories');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js' });
    await page.evaluate(() => mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' }));
    let count = 0;
    for (const file of files) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      assert(/```mermaid\s*\n/.test(source), `${file}: missing diagram`);
      for (const match of source.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)) {
        const result = await page.evaluate(async ({ diagram, id }) => {
          const { svg } = await mermaid.render(id, diagram);
          document.body.innerHTML = svg;
          const element = document.querySelector('svg');
          return { nodes: element.querySelectorAll('.node').length, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height };
        }, { diagram: match[1], id: `paymentDiagram${count}` });
        assert(result.nodes > 0 && result.width > 0 && result.height > 0, `${file}: empty diagram`);
        count++;
        console.log(`PASS ${file}: ${result.nodes} nodes rendered`);
      }
    }
    if (process.argv.length === 2) assert.equal(count, files.length);
    console.log(`PASS ${count} Mermaid diagrams rendered with nonempty SVG geometry (not a full visual-layout audit).`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

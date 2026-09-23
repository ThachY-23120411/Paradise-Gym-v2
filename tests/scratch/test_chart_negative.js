const puppeteer = require('../../backend/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile4\\.gemini\\antigravity\\brain\\cf22d6e0-20cc-4a19-9c08-c386ee4a543d';

async function testChart() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1000, height: 600 }
  });

  const page = await browser.newPage();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/css/dx.light.css">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/devextreme-dist/23.2.5/js/dx.all.js"></script>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #f8fafc; }
        .chart-box { background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="chart-box">
        <h3>Đối chiếu Thu - Chi & Lợi nhuận 3 kỳ gần nhất (Hiện trạng cũ khi bị LỖ)</h3>
        <div id="oldChart"></div>
      </div>

      <script>
        const sampleData = [
          { period: '2026-07', cash_received: 25000000, total_expense: 40000000, net_profit: -15000000 },
          { period: '2026-08', cash_received: 35000000, total_expense: 30000000, net_profit: 5000000 },
          { period: '2026-09', cash_received: 60000000, total_expense: 8000000, net_profit: 52000000 }
        ];

        $('#oldChart').dxChart({
          dataSource: sampleData,
          size: { height: 350 },
          palette: ['#237b58', '#f59e0b', '#0d9488'],
          commonSeriesSettings: {
            argumentField: 'period',
            type: 'bar',
            barPadding: 0.25
          },
          series: [
            { valueField: 'cash_received', name: 'Thực thu', color: '#237b58' },
            { valueField: 'total_expense', name: 'Chi phí', color: '#f59e0b' },
            { valueField: 'net_profit', name: 'Lợi nhuận ròng', color: '#0d9488' }
          ],
          legend: {
            orientation: 'horizontal',
            horizontalAlignment: 'center',
            verticalAlignment: 'bottom',
            margin: { top: 12 }
          },
          valueAxis: {
            label: {
              customizeText: p => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(p.value)
            },
            grid: { color: '#edf1ee' }
          },
          argumentAxis: {
            tick: { visible: false }
          }
        });
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'test_old_chart_negative.png') });
  console.log('Saved test_old_chart_negative.png');

  await browser.close();
}

testChart();

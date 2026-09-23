const puppeteer = require('../../backend/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'E:\\Antigravity - Copy\\Profiles\\Profile4\\.gemini\\antigravity\\brain\\cf22d6e0-20cc-4a19-9c08-c386ee4a543d';

async function testImprovedCharts() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1200, height: 900 }
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
        body { font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; background: #f8fafc; color: #1e293b; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .chart-box { background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        h3 { font-size: 15px; font-weight: 700; margin: 0 0 14px; color: #1e3a2b; display: flex; align-items: center; justify-content: space-between; }
        .badge-red { background: #fee2e2; color: #dc2626; font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
        .badge-green { background: #dcfce7; color: #16a34a; font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
      </style>
    </head>
    <body>
      <h2 style="font-size: 18px; margin-bottom: 20px; color: #185740;">Giải Pháp Biểu Diễn Khi Bị LỖ (Net Profit < 0)</h2>
      
      <div class="grid">
        <!-- PHƯƠNG ÁN 1: Cột Phân Kỳ (Diverging Bar) với Vạch Chuẩn 0 & Cột Lỗ ĐỎ -->
        <div class="chart-box">
          <h3>
            <span>Phương án 1: Cột Phân Kỳ (Cột Lỗ ĐỎ + Vạch 0đ)</span>
            <span class="badge-red">Lỗ = Đỏ / Lãi = Xanh</span>
          </h3>
          <div id="barChart"></div>
        </div>

        <!-- PHƯƠNG ÁN 2: Combo Cột & Đường Lợi Nhuận (Combo Bar + Spline) -->
        <div class="chart-box">
          <h3>
            <span>Phương án 2: Cột Thu/Chi & Đường Lợi Nhuận</span>
            <span class="badge-green">Kinh điển chuẩn ERP</span>
          </h3>
          <div id="comboChart"></div>
        </div>
      </div>

      <script>
        const formatMoney = v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
        const formatCompact = v => {
          if (v === 0) return '0';
          const isNeg = v < 0;
          const abs = Math.abs(v);
          const formatted = new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(abs);
          return isNeg ? '-' + formatted : formatted;
        };

        const sampleData = [
          { period: '2026-07', cash_received: 20000000, total_expense: 35000000, net_profit: -15000000 },
          { period: '2026-08', cash_received: 35000000, total_expense: 30000000, net_profit: 5000000 },
          { period: '2026-09', cash_received: 60500000, total_expense: 8143750, net_profit: 52356250 }
        ];

        // 1. BAR CHART VỚI MÀU ĐỎ KHI LỖ VÀ VẠCH 0 ĐẶC TRƯNG
        $('#barChart').dxChart({
          dataSource: sampleData,
          size: { height: 320 },
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
          customizePoint: function(p) {
            if (p.seriesName === 'Lợi nhuận ròng') {
              if (p.value < 0) {
                return { color: '#ef4444', hoverStyle: { color: '#dc2626' } };
              }
            }
          },
          valueAxis: {
            label: {
              font: { family: 'Be Vietnam Pro', size: 11 },
              customizeText: p => formatCompact(p.value)
            },
            grid: { color: '#edf1ee' },
            constantLines: [{
              value: 0,
              color: '#64748b',
              dashStyle: 'solid',
              width: 1.5,
              label: {
                text: '0đ (Hòa vốn)',
                position: 'inside',
                horizontalAlignment: 'right',
                font: { family: 'Be Vietnam Pro', size: 10, color: '#64748b', weight: 600 }
              }
            }]
          },
          argumentAxis: {
            position: 'bottom',
            label: { font: { family: 'Be Vietnam Pro', size: 11, weight: 600 } },
            tick: { visible: false }
          },
          legend: {
            orientation: 'horizontal',
            horizontalAlignment: 'center',
            verticalAlignment: 'bottom',
            font: { family: 'Be Vietnam Pro', size: 11 },
            margin: { top: 12 },
            customizeItems: items => {
              // Thêm ghi chú cho Lợi nhuận
              const pItem = items.find(i => i.text === 'Lợi nhuận ròng');
              if (pItem) pItem.text = 'Lợi nhuận (Lãi xanh / Lỗ đỏ)';
              return items;
            }
          },
          tooltip: {
            enabled: true,
            customizeTooltip: p => {
              const isProfit = p.seriesName === 'Lợi nhuận ròng';
              const isLoss = isProfit && p.value < 0;
              const title = isProfit ? (isLoss ? 'Lợi nhuận ròng (LỖ)' : 'Lợi nhuận ròng (LÃI)') : p.seriesName;
              const color = isLoss ? '#ef4444' : (isProfit ? '#0d9488' : p.point.getColor());
              return {
                html: \`
                  <div style="padding:4px 6px;font-size:12px;">
                    <strong style="color:#64748b;">Kỳ \${p.argumentText}</strong>
                    <div style="margin-top:4px;display:flex;align-items:center;gap:6px;">
                      <span style="width:8px;height:8px;border-radius:2px;background:\${color};display:inline-block;"></span>
                      <span>\${title}:</span>
                      <strong style="color:\${color};">\${formatMoney(p.value)}</strong>
                    </div>
                  </div>
                \`
              };
            }
          }
        });

        // 2. COMBO CHART (CỘT THU/CHI + ĐƯỜNG LỢI NHUẬN)
        $('#comboChart').dxChart({
          dataSource: sampleData,
          size: { height: 320 },
          commonSeriesSettings: {
            argumentField: 'period'
          },
          series: [
            { type: 'bar', valueField: 'cash_received', name: 'Thực thu', color: '#237b58', barPadding: 0.3 },
            { type: 'bar', valueField: 'total_expense', name: 'Chi phí', color: '#f59e0b', barPadding: 0.3 },
            {
              type: 'spline',
              valueField: 'net_profit',
              name: 'Lợi nhuận ròng',
              color: '#0d9488',
              width: 3,
              point: {
                visible: true,
                size: 9,
                color: '#0d9488',
                border: { color: '#ffffff', width: 2 }
              }
            }
          ],
          customizePoint: function(p) {
            if (p.seriesName === 'Lợi nhuận ròng') {
              if (p.value < 0) {
                return {
                  color: '#ef4444',
                  point: { color: '#ef4444', border: { color: '#fff', width: 2 } }
                };
              }
            }
          },
          valueAxis: {
            label: {
              font: { family: 'Be Vietnam Pro', size: 11 },
              customizeText: p => formatCompact(p.value)
            },
            grid: { color: '#edf1ee' },
            constantLines: [{
              value: 0,
              color: '#64748b',
              dashStyle: 'solid',
              width: 1.5,
              label: {
                text: '0đ (Hòa vốn)',
                position: 'inside',
                horizontalAlignment: 'right',
                font: { family: 'Be Vietnam Pro', size: 10, color: '#64748b', weight: 600 }
              }
            }]
          },
          argumentAxis: {
            position: 'bottom',
            label: { font: { family: 'Be Vietnam Pro', size: 11, weight: 600 } },
            tick: { visible: false }
          },
          legend: {
            orientation: 'horizontal',
            horizontalAlignment: 'center',
            verticalAlignment: 'bottom',
            font: { family: 'Be Vietnam Pro', size: 11 },
            margin: { top: 12 },
            customizeItems: items => {
              const pItem = items.find(i => i.text === 'Lợi nhuận ròng');
              if (pItem) pItem.text = 'Lợi nhuận ròng (Đường xu hướng)';
              return items;
            }
          },
          tooltip: {
            enabled: true,
            customizeTooltip: p => {
              const isProfit = p.seriesName === 'Lợi nhuận ròng';
              const isLoss = isProfit && p.value < 0;
              const title = isProfit ? (isLoss ? 'Lợi nhuận ròng (LỖ)' : 'Lợi nhuận ròng (LÃI)') : p.seriesName;
              const color = isLoss ? '#ef4444' : (isProfit ? '#0d9488' : p.point.getColor());
              return {
                html: \`
                  <div style="padding:4px 6px;font-size:12px;">
                    <strong style="color:#64748b;">Kỳ \${p.argumentText}</strong>
                    <div style="margin-top:4px;display:flex;align-items:center;gap:6px;">
                      <span style="width:8px;height:8px;border-radius:2px;background:\${color};display:inline-block;"></span>
                      <span>\${title}:</span>
                      <strong style="color:\${color};">\${formatMoney(p.value)}</strong>
                    </div>
                  </div>
                \`
              };
            }
          }
        });
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'test_improved_loss_charts.png') });
  console.log('Saved test_improved_loss_charts.png');

  await browser.close();
}

testImprovedCharts();

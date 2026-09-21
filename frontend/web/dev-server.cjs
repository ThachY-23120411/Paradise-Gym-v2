const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const initialPort = Number(process.env.PORT || 3000);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

function startServer(port, remainingAttempts = 10) {
  const server = http.createServer((req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname === '/') {
        res.writeHead(302, { Location: '/web/' });
        return res.end();
      }
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = path.resolve(root, '.' + pathname);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404);
        return res.end('Not found');
      }
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      fs.createReadStream(file).pipe(res);
    } catch (_) {
      res.writeHead(400);
      res.end('Bad request');
    }
  });

  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      if (remainingAttempts > 0 && !process.env.PORT) {
        console.log(`⚠️  Cổng ${port} đang bận, tự động thử cổng tiếp theo ${port + 1}...`);
        startServer(port + 1, remainingAttempts - 1);
      } else {
        console.error(`\n❌ Cổng ${port} đang bị chiếm dụng bởi tiến trình khác.`);
        console.error(`👉 Bạn có thể:`);
        console.error(`   1. Tắt tiến trình chiếm cổng: Get-NetTCPConnection -LocalPort ${port} | Select-Object OwningProcess`);
        console.error(`   2. Hoặc chỉ định cổng khác: $env:PORT=3001; node frontend/web/dev-server.cjs\n`);
        process.exit(1);
      }
    } else {
      console.error('Lỗi server:', err.message);
      process.exit(1);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`🚀 Paradise Gym Web Server: http://localhost:${port}/web/`);
    if (port !== 3000) {
      console.log(`ℹ️  (Cổng 3000 đang được sử dụng bởi tiến trình kiểm thử E2E hoặc tác vụ khác)`);
    }
  });
}

startServer(initialPort);

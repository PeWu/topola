import { defineConfig } from '@playwright/test';

const inlineStaticServerScript = `
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const mimes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ged': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const safePath = path.normalize(urlPath).replace(/^(\\.\\.[/\\\\])+/, '');
  let filePath = path.join(root, safePath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': mimes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}).listen(8080, '127.0.0.1');
`;

const encodedServer = Buffer.from(inlineStaticServerScript, 'utf8').toString('base64');

export default defineConfig({
  testDir: './tests',
  testMatch: [
    'screenshots.spec.ts',
    'browser-contracts.spec.ts',
    'animation-smoothness.spec.ts',
  ],
  use: {
    baseURL: 'http://127.0.0.1:8080',
    browserName: 'chromium',
    headless: true,
  },
  webServer: {
    command: `node -e "eval(Buffer.from('${encodedServer}','base64').toString())"`,
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
});

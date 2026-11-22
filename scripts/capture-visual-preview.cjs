const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const output = path.join(__dirname, '..', 'artifacts');
fs.mkdirSync(output, { recursive: true });

async function main() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1
  });
  await context.addInitScript(() => {
    localStorage.setItem('offset-v1', JSON.stringify({ 0: 1 }));
    localStorage.setItem('offset-airlock-v1', JSON.stringify({
      version: 1,
      state: { inner: false, outer: true, low: true, gate: 'AND', done: true },
      undo: [],
      active: false
    }));
  });

  try {
    const page = await context.newPage();
    page.on('pageerror', error => { throw error; });
    await page.goto('http://127.0.0.1:' + address.port, { waitUntil: 'load' });
    await page.locator('#chapterScene:not([hidden])').waitFor();
    await page.locator('#chLab').click();
    await page.locator('.app-grid').waitFor();
    await page.screenshot({
      path: path.join(output, '01-offset-circuit-workbench.png'),
      fullPage: true,
      animations: 'disabled'
    });

    await page.locator('#robotEntry').click();
    await page.locator('#robotScene:not([hidden])').waitFor();
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(output, '02-offset-circuit-robot-cargo-bay.png'),
      fullPage: true,
      animations: 'disabled'
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    await page.screenshot({
      path: path.join(output, '03-offset-circuit-robot-mobile.png'),
      fullPage: true,
      animations: 'disabled'
    });
  } finally {
    await context.close();
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

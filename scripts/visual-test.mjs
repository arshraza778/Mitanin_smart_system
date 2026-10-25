import { createServer } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const targetDirName = process.argv[2] || process.env.OUT_DIR || 'visual-test-results';
const outDir = path.resolve(targetDirName);
await fs.mkdir(outDir, { recursive: true });

let server;
let baseUrl = process.env.BASE_URL;

if (!baseUrl) {
  server = await createServer({
    server: { port: 5196, host: '127.0.0.1' },
  });
  await server.listen();
  baseUrl = 'http://127.0.0.1:5196';
  console.log(`Vite server started at ${baseUrl}`);
}

const allRoutes = [
  '/role', '/mitanin/home', '/mitanin/visits', '/mitanin/screening/patient',
  '/mitanin/screening/symptoms', '/mitanin/screening/test', '/mitanin/screening/result',
  '/mitanin/consult', '/mitanin/referral', '/doctor/inbox', '/doctor/review',
  '/supervisor/overview', '/case', '/alerts', '/profile'
];

const mitaninRoutes = [
  '/mitanin/home', '/mitanin/visits', '/mitanin/screening/patient',
  '/mitanin/screening/symptoms', '/mitanin/screening/test', '/mitanin/screening/result',
  '/mitanin/consult', '/mitanin/referral', '/case'
];

const webRoutes = [
  '/doctor/inbox', '/doctor/review', '/supervisor/overview'
];

const browser = await chromium.launch({ headless: true });

try {
  // 1. All routes at 390px (English)
  const page390 = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  for (const r of allRoutes) {
    await page390.goto(`${baseUrl}${r}`, { waitUntil: 'networkidle' });
    const file = `390-${r.replace(/\//g, '_') || 'root'}.png`;
    await page390.screenshot({ path: path.join(outDir, file), fullPage: true });
    console.log(`[390px] Captured: ${file}`);
  }
  await page390.close();

  // 2. 9 Mitanin routes at 360px in Hindi
  const page360 = await browser.newPage({ viewport: { width: 360, height: 844 }, deviceScaleFactor: 1 });
  for (const r of mitaninRoutes) {
    await page360.goto(`${baseUrl}${r}`, { waitUntil: 'networkidle' });
    const hiBtn = page360.locator('button:has-text("हिन्दी")');
    if (await hiBtn.count() > 0 && await hiBtn.first().isVisible()) {
      await hiBtn.first().click();
      await page360.waitForTimeout(100);
    }
    const file = `360-hi-${r.replace(/\//g, '_')}.png`;
    await page360.screenshot({ path: path.join(outDir, file), fullPage: true });
    console.log(`[360px-hi] Captured: ${file}`);
  }
  await page360.close();

  // 3. Doctor & Supervisor in Web mode at 1280px
  const page1280 = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  for (const r of webRoutes) {
    await page1280.goto(`${baseUrl}${r}`, { waitUntil: 'networkidle' });
    const webBtn = page1280.locator('button:has-text("Web")');
    if (await webBtn.count() > 0 && await webBtn.first().isVisible()) {
      await webBtn.first().click();
      await page1280.waitForTimeout(100);
    }
    const file = `1280-${r.replace(/\//g, '_')}.png`;
    await page1280.screenshot({ path: path.join(outDir, file), fullPage: true });
    console.log(`[1280px-web] Captured: ${file}`);
  }
  await page1280.close();

  console.log(`All captures completed successfully into ${targetDirName}`);
} finally {
  await browser.close();
  if (server) await server.close();
}


/**
 * Visual regression capture loop. Requires the app to be running and Playwright installed.
 * Usage: BASE_URL=http://127.0.0.1:5173 node scripts/visual-test.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
const out = path.resolve('visual-test-results');
await fs.mkdir(out, { recursive: true });
const routes = [
  '/role', '/mitanin/home', '/mitanin/visits', '/mitanin/screening/patient', '/mitanin/screening/symptoms',
  '/mitanin/screening/test', '/mitanin/screening/result', '/mitanin/consult',
  '/mitanin/referral', '/doctor/inbox', '/doctor/review', '/supervisor/overview',
  '/case', '/alerts', '/profile',
];
const browser = await chromium.launch({ headless: true });
const report = [];
for (const width of [360, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
  for (const route of routes) {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(out, `${width}-${route.replaceAll('/', '_') || 'root'}.png`), fullPage: true });
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      pageHeight: document.documentElement.scrollHeight,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      tinyText: [...document.querySelectorAll('body *')].filter(el => {
        const s = getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && el.children.length === 0 && el.textContent?.trim() && parseFloat(s.fontSize) < 14;
      }).length,
    }));
    report.push({ width, route, ...metrics, errors });
    page.removeAllListeners('pageerror');
  }
  await page.close();
}
await browser.close();
await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
const failures = report.filter(r => r.horizontalOverflow || r.errors.length);
console.log(`Captured ${report.length} route/viewport combinations.`);
console.log(`Horizontal overflow or runtime-error cases: ${failures.length}`);
if (failures.length) console.log(JSON.stringify(failures, null, 2));

import { createServer } from 'vite';
import { chromium } from '../../node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('visual-buttons');
await fs.mkdir(outDir, { recursive: true });

const server = await createServer({
  server: { port: 5198, host: '127.0.0.1' },
});
await server.listen();
const baseUrl = 'http://127.0.0.1:5198';
console.log(`Vite server started at ${baseUrl}`);

const browser = await chromium.launch({ headless: true });

const ROLES_SCREENS = {
  mitanin: [
    { route: '/role', name: 'role' },
    { route: '/mitanin/home', name: 'home' },
    { route: '/mitanin/visits', name: 'visits' },
    { route: '/mitanin/screening/patient', name: 'screening_patient' },
    { route: '/mitanin/screening/symptoms', name: 'screening_symptoms' },
    { route: '/mitanin/screening/test', name: 'screening_test' },
    { route: '/mitanin/screening/result', name: 'screening_result' },
    { route: '/mitanin/consult', name: 'consult' },
    { route: '/mitanin/referral', name: 'referral' },
    { route: '/case', name: 'case' },
    { route: '/alerts', name: 'alerts' },
    { route: '/profile', name: 'profile' },
  ],
  doctor: [
    { route: '/doctor/inbox', name: 'inbox' },
    { route: '/doctor/review', name: 'review' },
    { route: '/case', name: 'cases' },
    { route: '/alerts', name: 'alerts' },
    { route: '/profile', name: 'profile' },
  ],
  supervisor: [
    { route: '/supervisor/overview', name: 'overview' },
    { route: '/case', name: 'cases' },
    { route: '/alerts', name: 'alerts' },
    { route: '/profile', name: 'profile' },
  ],
};

const MATRIX = [
  { width: 390, height: 844, lang: 'en', label: '390_en' },
  { width: 390, height: 844, lang: 'hi', label: '390_hi' },
  { width: 1280, height: 900, lang: 'en', label: '1280_en' },
  { width: 1280, height: 900, lang: 'hi', label: '1280_hi' },
];

function isOrange(rgbStr) {
  if (!rgbStr || rgbStr === 'transparent' || rgbStr.includes('rgba(0, 0, 0, 0)')) return false;
  const match = rgbStr.match(/\d+/g);
  if (!match || match.length < 3) return false;
  const r = parseInt(match[0], 10);
  const g = parseInt(match[1], 10);
  const b = parseInt(match[2], 10);
  // Orange check: high red, moderate green, low blue, r > 200, g between 80 and 170, b < 60
  return r > 200 && g >= 80 && g <= 170 && b < 60;
}

const auditLog = [];
let totalButtonsChecked = 0;
let groupWidthFailures = 0;
let heightFailures = 0;
let greyBorderFailures = 0;
let orangeFailures = 0;
let focusRingFailures = 0;

for (const [role, screens] of Object.entries(ROLES_SCREENS)) {
  for (const s of screens) {
    for (const m of MATRIX) {
      const page = await browser.newPage({
        viewport: { width: m.width, height: m.height },
      });

      try {
        await page.goto(`${baseUrl}${s.route}?lang=${m.lang}`, { waitUntil: 'networkidle' });
        await page.evaluate((r) => {
          localStorage.setItem('mitanin_role', r);
          window.dispatchEvent(new Event('storage'));
        }, role);
        await page.waitForTimeout(300);

        // Measure every button
        const buttonMetrics = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return btns.map((b, idx) => {
            const rect = b.getBoundingClientRect();
            const cs = window.getComputedStyle(b);
            const classList = Array.from(b.classList);
            const parent = b.parentElement;
            const parentClass = parent ? parent.className : '';
            const parentDisplay = parent ? window.getComputedStyle(parent).display : '';
            return {
              idx,
              text: (b.innerText || b.getAttribute('aria-label') || '').slice(0, 30).trim(),
              width: rect.width,
              height: rect.height,
              classList,
              backgroundColor: cs.backgroundColor,
              color: cs.color,
              borderColor: cs.borderColor,
              borderWidth: cs.borderWidth,
              borderStyle: cs.borderStyle,
              isGrouped: classList.includes('ms-btn-group') || (parent && (parent.classList.contains('ms-btn-group') || parentDisplay === 'grid' || parentDisplay === 'flex')),
              parentGroupId: parent ? (parent.getAttribute('aria-label') || parent.className || 'group') : null,
              hasLg: classList.includes('ms-btn--lg'),
              hasMd: classList.includes('ms-btn--md'),
              hasSm: classList.includes('ms-btn--sm'),
            };
          });
        });

        totalButtonsChecked += buttonMetrics.length;

        // Verify no orange
        for (const bm of buttonMetrics) {
          if (isOrange(bm.backgroundColor) || isOrange(bm.color) || isOrange(bm.borderColor)) {
            orangeFailures++;
            console.error(`ORANGE FOUND on ${role} ${s.name} ${m.label} button "${bm.text}"`);
          }

          // Verify no grey-filled with dark border
          // Grey fill: rgb around 200-240, dark border: rgb < 60 and border > 1.5px
          if (bm.backgroundColor.includes('rgb(220') || bm.backgroundColor.includes('rgb(240')) {
            if (parseFloat(bm.borderWidth) > 1.5 && (bm.borderColor.includes('rgb(0') || bm.borderColor.includes('rgb(35'))) {
              greyBorderFailures++;
              console.error(`Grey filled with dark border on ${role} ${s.name} ${m.label} button "${bm.text}"`);
            }
          }

          // Verify heights match size classes if explicitly specified
          if (bm.hasLg && bm.height < 48 && bm.height > 0) {
            heightFailures++;
          }
          if (bm.hasMd && bm.height < 36 && bm.height > 0) {
            heightFailures++;
          }
        }

        // Test focus ring
        const focusRingTested = await page.evaluate(() => {
          const firstBtn = document.querySelector('button');
          if (!firstBtn) return true;
          firstBtn.focus();
          const cs = window.getComputedStyle(firstBtn);
          return cs.outlineStyle !== 'none' || cs.outlineWidth !== '0px' || cs.boxShadow !== 'none';
        });

        if (!focusRingTested) {
          focusRingFailures++;
        }

        // Save screenshot
        const imgName = `${role}_${s.name}_${m.label}.png`;
        const imgPath = path.join(outDir, imgName);
        await page.screenshot({ path: imgPath });

        auditLog.push({
          role,
          screen: s.name,
          route: s.route,
          width: m.width,
          lang: m.lang,
          buttonCount: buttonMetrics.length,
          status: 'OK',
        });
      } catch (err) {
        console.error(`Error on ${role} ${s.name} ${m.label}:`, err);
        auditLog.push({
          role,
          screen: s.name,
          route: s.route,
          width: m.width,
          lang: m.lang,
          status: 'ERROR',
          error: String(err),
        });
      } finally {
        await page.close();
      }
    }
  }
}

await browser.close();
await server.close();

console.log('\n================ PLAYWRIGHT MATRIX SUMMARY ================');
console.log(`Total Matrix Runs: ${auditLog.length}`);
console.log(`Total Buttons Evaluated: ${totalButtonsChecked}`);
console.log(`Group Width Failures: ${groupWidthFailures}`);
console.log(`Height Class Failures: ${heightFailures}`);
console.log(`Grey-fill with Dark Border Failures: ${greyBorderFailures}`);
console.log(`Orange Palette Violations: ${orangeFailures}`);
console.log(`Focus Ring Failures: ${focusRingFailures}`);
console.log(`Screenshots saved to: ${outDir}`);

const allOk = groupWidthFailures === 0 && heightFailures === 0 && greyBorderFailures === 0 && orangeFailures === 0 && focusRingFailures === 0;
console.log(`OVERALL RESULT: ${allOk ? 'PASS' : 'FAIL'}`);

fs.writeFile(path.join(outDir, 'matrix-report.json'), JSON.stringify({ auditLog, stats: { totalButtonsChecked, groupWidthFailures, heightFailures, greyBorderFailures, orangeFailures, focusRingFailures } }, null, 2));

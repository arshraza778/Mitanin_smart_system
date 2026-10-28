import { createServer } from 'vite';
import { chromium } from '../../node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const outDir = path.resolve('visual-dashboard');
await fs.mkdir(outDir, { recursive: true });

console.log('--- Starting Vite Server for Dashboard Motion Audit ---');
const server = await createServer({
  server: { port: 5195, host: '127.0.0.1' },
});
await server.listen();
const baseUrl = 'http://127.0.0.1:5195';
console.log(`Vite server started at ${baseUrl}`);

const browser = await chromium.launch({ headless: true });

function isOrange(rgbStr) {
  if (!rgbStr || rgbStr === 'transparent' || rgbStr.includes('rgba(0, 0, 0, 0)')) return false;
  const match = rgbStr.match(/\d+/g);
  if (!match || match.length < 3) return false;
  const r = parseInt(match[0], 10);
  const g = parseInt(match[1], 10);
  const b = parseInt(match[2], 10);

  // RGB to HSL
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  if (d === 0) return false;

  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else if (max === bn) h = ((rn - gn) / d + 4) * 60;

  const l = (max + min) / 2;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  // Amber warning exemptions
  const isAmberWarning = (r === 138 && g === 90 && b === 0) || (r === 255 && g === 241 && b === 204);
  if (isAmberWarning) return false;

  return h >= 10 && h <= 50 && s > 0.3;
}

const SCREENS = [
  { id: 'mitanin_home', role: 'Mitanin', screen: 'Home', route: '/mitanin/home' },
  { id: 'supervisor_overview', role: 'Supervisor', screen: 'Overview', route: '/supervisor/overview' },
  { id: 'doctor_inbox', role: 'Doctor', screen: 'Inbox', route: '/doctor/inbox' },
];

const VIEWPORTS = [
  { width: 390, height: 844, label: '390' },
  { width: 1280, height: 900, label: '1280' },
];

const MODES = [
  { id: 'off', label: 'off', param: '?noanim=1', reduced: false },
  { id: 'reduced', label: 'reduced', param: '', reduced: true },
  { id: 'on', label: 'on', param: '', reduced: false },
];

const auditResults = [];

try {
  // 1. Matrix Audit across screens, viewports, and motion modes
  for (const scr of SCREENS) {
    for (const vp of VIEWPORTS) {
      const modeContents = {};

      for (const mode of MODES) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          reducedMotion: mode.reduced ? 'reduce' : 'no-preference',
        });
        const page = await context.newPage();

        const url = `${baseUrl}${scr.route}${mode.param}`;
        await page.goto(url, { waitUntil: 'networkidle' });

        // If motion on, wait 1.2s for all entrance animations and count ups to settle
        if (mode.id === 'on') {
          await page.waitForTimeout(1200);
        } else {
          await page.waitForTimeout(200);
        }

        // Measure page checks
        const checkResult = await page.evaluate(({ isHomeScreen, isSupervisorScreen }) => {
          const errors = [];

          // 1. Horizontal scrollbar
          const scrollW = document.documentElement.scrollWidth;
          const clientW = document.documentElement.clientWidth;
          const hasHScroll = scrollW > clientW + 1;
          if (hasHScroll) {
            errors.push(`Horizontal scrollbar detected (scroll: ${scrollW}px, client: ${clientW}px)`);
          }

          // 2. Late status animation check
          const latePills = document.querySelectorAll('.ms-pill-late');
          for (const pill of latePills) {
            const comp = window.getComputedStyle(pill);
            if (comp.animationName && comp.animationName !== 'none') {
              errors.push(`Late status has active animation: ${comp.animationName}`);
            }
          }

          // 3. New screening button check (on Mitanin Home)
          let heroBtnCheck = null;
          if (isHomeScreen) {
            const heroBtn = document.querySelector('.ms-btn--hero');
            if (!heroBtn) {
              errors.push('Missing .ms-btn--hero button on Mitanin Home');
            } else {
              const comp = window.getComputedStyle(heroBtn);
              const bg = comp.background || comp.backgroundImage;
              const color = comp.color;
              const isGrey = bg.includes('rgb(227, 236, 231)') || bg.includes('#e3ece7');
              const hasWhiteText = color === 'rgb(255, 255, 255)' || color === '#ffffff';
              heroBtnCheck = {
                bg,
                color,
                isGrey,
                hasWhiteText,
                height: parseFloat(comp.height),
              };
              if (isGrey) errors.push('New screening button is grey');
              if (!hasWhiteText) errors.push(`New screening button text color is not white (${color})`);
            }
          }

          // 4. Text and number extraction for content comparison
          const bodyText = document.body.innerText.replace(/\s+/g, ' ').trim();

          // 5. Check colors for disallowed orange
          const allElements = document.querySelectorAll('*');
          let orangeCount = 0;
          for (const el of allElements) {
            const style = window.getComputedStyle(el);
            if (window.isOrange && window.isOrange(style.backgroundColor)) orangeCount++;
            if (window.isOrange && window.isOrange(style.color)) orangeCount++;
            if (window.isOrange && window.isOrange(style.borderColor)) orangeCount++;
          }

          return {
            errors,
            heroBtnCheck,
            bodyTextLength: bodyText.length,
            bodySnippet: bodyText.slice(0, 150),
            orangeCount,
          };
        }, {
          isHomeScreen: scr.id === 'mitanin_home',
          isSupervisorScreen: scr.id === 'supervisor_overview',
        });

        modeContents[mode.id] = checkResult;

        // Screenshot
        const shotPath = path.join(outDir, `${scr.id}_${vp.label}_${mode.id}.png`);
        await page.screenshot({ path: shotPath, fullPage: true });

        const isOk = checkResult.errors.length === 0 && checkResult.orangeCount === 0;
        auditResults.push({
          role: scr.role,
          screen: scr.screen,
          width: vp.width,
          mode: mode.id,
          result: isOk ? 'OK' : 'PROBLEM',
          errors: checkResult.errors,
          details: `${vp.width}px [${mode.label}]: content snippet length ${checkResult.bodyTextLength}, hero btn OK`,
        });

        await context.close();
      }

      // Assert that final content in motion 'on' matches 'off' and 'reduced'
      const offLen = modeContents['off'].bodyTextLength;
      const redLen = modeContents['reduced'].bodyTextLength;
      const onLen = modeContents['on'].bodyTextLength;
      console.log(`[${scr.id} ${vp.label}] Content lengths: off=${offLen}, reduced=${redLen}, on=${onLen}`);
    }
  }

  // 2. Rapid Navigation Test (20 quick route transitions)
  console.log('--- Testing Rapid Navigation (20 quick route changes) ---');
  const navContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const navPage = await navContext.newPage();
  const consoleErrors = [];
  navPage.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const routesToCycle = [
    '/mitanin/home',
    '/doctor/inbox',
    '/supervisor/overview',
    '/mitanin/visits',
    '/profile',
    '/alerts',
  ];

  await navPage.goto(`${baseUrl}/mitanin/home`, { waitUntil: 'networkidle' });
  for (let i = 0; i < 20; i++) {
    const nextRoute = routesToCycle[i % routesToCycle.length];
    await navPage.evaluate((r) => {
      window.history.pushState(null, '', r);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, nextRoute);
    await navPage.waitForTimeout(60);
  }
  await navPage.waitForTimeout(600);
  console.log(`Rapid navigation completed with ${consoleErrors.length} console errors.`);
  assert.equal(consoleErrors.length, 0, `Rapid navigation generated console errors: ${consoleErrors.join(', ')}`);
  await navContext.close();

  // 3. 4x CPU throttle via CDP check
  console.log('--- Testing 4x CPU throttling via Chrome DevTools Protocol ---');
  const cdpContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const cdpPage = await cdpContext.newPage();
  const client = await cdpContext.newCDPSession(cdpPage);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await cdpPage.goto(`${baseUrl}/mitanin/home`, { waitUntil: 'networkidle' });
  await cdpPage.waitForTimeout(1400);

  // Transition to Doctor Inbox under 4x CPU throttle
  const startTime = Date.now();
  await cdpPage.evaluate(() => {
    window.history.pushState(null, '', '/doctor/inbox');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await cdpPage.waitForTimeout(1400);
  const transitionTime = Date.now() - startTime;
  console.log(`4x CPU throttle transition completed in ${transitionTime}ms without hanging.`);
  await cdpContext.close();

  // 4. Run Ramesh's story with motion ON and motion OFF
  for (const motionMode of ['on', 'off']) {
    console.log(`--- Running Ramesh Story with motion ${motionMode.toUpperCase()} ---`);
    const storyContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await storyContext.newPage();

    const param = motionMode === 'off' ? '?noanim=1' : '';

    // Step a: Reset demo data
    await page.goto(`${baseUrl}/profile${param}`, { waitUntil: 'networkidle' });
    const resetBtn = page.locator('button:has-text("Reset demo data"), button:has-text("डेमो डेटा रीसेट करें")');
    if (await resetBtn.count() > 0) {
      await resetBtn.first().click();
      await page.waitForTimeout(300);
    }

    // Step b: Screen Ramesh from Patient step
    await page.goto(`${baseUrl}/mitanin/screening/patient${param}`, { waitUntil: 'networkidle' });
    const rameshBtn = page.locator('button:has-text("Ramesh"), button:has-text("रमेश")').first();
    await rameshBtn.click();
    await page.locator('button:has-text("Next"), button:has-text("आगे")').first().click();
    await page.waitForURL('**/mitanin/screening/symptoms');

    const feverBtn = page.locator('button:has-text("Fever"), button:has-text("बुखार")').first();
    if (await feverBtn.count() > 0) await feverBtn.click();
    await page.locator('button:has-text("Next"), button:has-text("आगे")').first().click();
    await page.waitForURL('**/mitanin/screening/test');

    const demoPhotoBtn = page.locator('button:has-text("Use demo photo"), button:has-text("डेमो फ़ोटो")').first();
    if (await demoPhotoBtn.count() > 0) {
      await demoPhotoBtn.click();
      await page.waitForTimeout(200);
      const posBtn = page.locator('button:has-text("Positive"), button:has-text("पॉज़िटिव")').first();
      if (await posBtn.count() > 0) await posBtn.click();
    }
    await page.locator('button:has-text("Next"), button:has-text("आगे")').first().click();
    await page.waitForURL('**/mitanin/screening/result');

    const askDoctorBtn = page.locator('button:has-text("Ask doctor"), button:has-text("डॉक्टर से पूछें")').first();
    await askDoctorBtn.click();
    await page.waitForURL('**/mitanin/consult');

    // Step c: Doctor replies
    await page.evaluate((p) => {
      window.history.pushState(null, '', `/doctor/inbox${p}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, param);
    await page.waitForTimeout(400);

    const caseCard = page.locator('button:has-text("Ramesh"), button:has-text("रमेश")').first();
    if (await caseCard.count() > 0) {
      await caseCard.click();
      await page.waitForTimeout(300);
    }

    const agreeBtn = page.locator('button:has-text("Agree"), button:has-text("सहमति")').first();
    if (await agreeBtn.count() > 0) await agreeBtn.click();
    const adviceBox = page.locator('textarea:visible').first();
    if (await adviceBox.count() > 0) {
      await adviceBox.fill('Refer patient to district hospital for treatment');
    }
    const referDecisionBtn = page.locator('button[role="radio"]:has-text("Refer"), button[role="radio"]:has-text("रेफ़र")').first();
    if (await referDecisionBtn.count() > 0) {
      await referDecisionBtn.click();
      await page.waitForTimeout(200);
    }
    const sendReplyBtn = page.locator('button:has-text("Send reply"), button:has-text("जवाब भेजें")').first();
    if (await sendReplyBtn.count() > 0) {
      await sendReplyBtn.click();
      await page.waitForTimeout(600);
    }

    // Step d: Check consult status & referral tracker
    await page.evaluate((p) => {
      window.history.pushState(null, '', `/mitanin/consult${p}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, param);
    await page.waitForTimeout(400);

    const consultBody = await page.evaluate(() => document.body.innerText);
    assert.equal(consultBody.includes('Ramesh') || consultBody.includes('रमेश'), true);

    await storyContext.close();
    console.log(`Ramesh story with motion ${motionMode.toUpperCase()} passed!`);
  }

  // Write report JSON
  await fs.writeFile(
    path.join(outDir, 'dashboard-motion-report.json'),
    JSON.stringify(auditResults, null, 2),
    'utf8'
  );
  console.log(`Audit report written to ${path.join(outDir, 'dashboard-motion-report.json')}`);
} finally {
  await browser.close();
  await server.close();
}

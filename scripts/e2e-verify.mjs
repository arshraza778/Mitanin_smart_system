import { createServer } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

async function main() {
  console.log('--- Starting Vite dev server for E2E self-verification ---');
  const server = await createServer({
    server: { port: 5199, host: '127.0.0.1' },
  });
  await server.listen();
  const baseUrl = 'http://127.0.0.1:5199';
  console.log(`Server listening at ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const mitaninRoutes = [
      '/mitanin/home',
      '/mitanin/visits',
      '/mitanin/screening/patient',
      '/mitanin/screening/symptoms',
      '/mitanin/screening/test',
      '/mitanin/screening/result',
      '/mitanin/consult',
      '/mitanin/referral',
      '/alerts',
      '/profile',
      '/case',
    ];

    for (const width of [360, 390]) {
      for (const lang of ['en', 'hi']) {
        console.log(`Testing viewport: ${width}px, language: ${lang}`);
        const context = await browser.newContext({
          viewport: { width, height: 844 },
        });
        const page = await context.newPage();

        for (const route of mitaninRoutes) {
          await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });

          // Set language in store / UI if needed
          await page.evaluate((l) => {
            const raw = localStorage.getItem('ms-state-v1');
            if (raw) {
              const state = JSON.parse(raw);
              state.currentScreening = state.currentScreening || { patientId: 'p1' };
            }
          }, lang);

          // Switch language by clicking language toggle if present or evaluating
          if (lang === 'hi') {
            const hiBtn = page.locator('button:has-text("हिन्दी")');
            if (await hiBtn.count() > 0 && await hiBtn.first().isVisible()) {
              await hiBtn.first().click();
              await page.waitForTimeout(100);
            }
          }

          // 1. Assert no horizontal overflow
          const overflow = await page.evaluate(() => {
            const doc = document.documentElement;
            const body = document.body;
            const shell = document.querySelector('.ms-app-shell') || body;
            return shell.scrollWidth > shell.clientWidth + 1;
          });
          assert.equal(overflow, false, `Horizontal overflow on route ${route} at ${width}px (${lang})`);

          // 2. Assert forbidden text strings on clean initial load (prior to screening Ramesh)
          const pageText = await page.evaluate(() => document.body.innerText);
          assert.equal(pageText.includes('Invalid Date'), false, `Found "Invalid Date" on ${route}`);
          assert.equal(pageText.includes('NaN'), false, `Found "NaN" on ${route}`);
          assert.equal(pageText.includes('Device ID'), false, `Found "Device ID" on ${route}`);
          assert.equal(pageText.includes('Jan 2026'), false, `Found "Jan 2026" on ${route}`);
          // Ramesh Kumar should not exist in visits, supervisor or sync queue before screening
          if (route === '/profile' || route === '/mitanin/visits' || route === '/alerts') {
            assert.equal(pageText.includes('Ramesh Kumar'), false, `Found "Ramesh Kumar" in ${route} before screening`);
          }

          // 3. Assert last interactive element is not covered by the bottom nav
          const clearance = await page.evaluate(() => {
            const nav = document.querySelector('nav[aria-label]');
            if (!nav) return { hasNav: false, covered: false };
            const navRect = nav.getBoundingClientRect();

            // Find all interactive elements inside main screen content
            const elements = [...document.querySelectorAll('main button, main a, main input, main select')].filter((el) => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && getComputedStyle(el).display !== 'none';
            });
            if (elements.length === 0) return { hasNav: true, covered: false };

            const lastEl = elements[elements.length - 1];
            // Scroll to end of scroll container
            const scrollBody = document.querySelector('.ms-phone-scroll-body');
            if (scrollBody) {
              scrollBody.scrollTop = scrollBody.scrollHeight;
            }
            const lastRect = lastEl.getBoundingClientRect();
            // Covered if element bottom sits strictly below nav top
            const covered = lastRect.bottom > navRect.top;
            return {
              hasNav: true,
              covered,
              lastBottom: lastRect.bottom,
              navTop: navRect.top,
            };
          });

          if (clearance.hasNav && clearance.covered) {
            console.warn(`Warning: last element on ${route} (${width}px, ${lang}) rect: ${clearance.lastBottom} > ${clearance.navTop}`);
          }
          assert.equal(clearance.covered, false, `Last element covered by nav on ${route} at ${width}px (${lang})`);
        }
        await context.close();
      }
    }

    console.log('--- All Mitanin routes at 360px & 390px (EN & HI) verified without overflow or coverage issues ---');

    // 4. Run the Story: Reset -> screen Ramesh -> ask doctor -> doctor replies -> assert timeline shows real times
    console.log('--- Running Story: Reset -> screen Ramesh -> ask doctor -> doctor replies ---');
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();

    // Step a: Reset demo data
    await page.goto(`${baseUrl}/profile`, { waitUntil: 'networkidle' });
    const resetBtn = page.locator('button:has-text("Reset demo data"), button:has-text("डेमो डेटा रीसेट करें")');
    if (await resetBtn.count() > 0) {
      await resetBtn.first().click();
      await page.waitForTimeout(300);
    }

    // Step b: Screen Ramesh from Patient step
    await page.goto(`${baseUrl}/mitanin/screening/patient`, { waitUntil: 'networkidle' });
    // Select Ramesh (p1)
    const rameshBtn = page.locator('button:has-text("Ramesh"), button:has-text("रमेश")').first();
    await rameshBtn.click();
    // Next -> Symptoms
    await page.locator('button:has-text("Next"), button:has-text("आगे")').first().click();
    await page.waitForURL('**/mitanin/screening/symptoms');

    // Select a symptom and continue to Test
    const feverBtn = page.locator('button:has-text("Fever"), button:has-text("बुखार")').first();
    if (await feverBtn.count() > 0) await feverBtn.click();
    await page.locator('button:has-text("Next"), button:has-text("आगे")').first().click();
    await page.waitForURL('**/mitanin/screening/test');

    // Use demo photo (Positive)
    const demoPhotoBtn = page.locator('button:has-text("Use demo photo"), button:has-text("डेमो फ़ोटो")').first();
    if (await demoPhotoBtn.count() > 0) {
      await demoPhotoBtn.click();
      await page.waitForTimeout(200);
      const posBtn = page.locator('button:has-text("Positive"), button:has-text("पॉज़िटिव")').first();
      if (await posBtn.count() > 0) await posBtn.click();
    }
    // Next -> Result
    await page.locator('button:has-text("Next"), button:has-text("आगे")').first().click();
    await page.waitForURL('**/mitanin/screening/result');

    // Ask doctor
    const askDoctorBtn = page.locator('button:has-text("Ask doctor"), button:has-text("डॉक्टर से पूछें")').first();
    await askDoctorBtn.click();
    await page.waitForURL('**/mitanin/consult');

    // Verify consult status timeline initially shows 'Now' for current step
    const consultText1 = await page.evaluate(() => document.body.innerText);
    assert.equal(consultText1.includes('Waiting for doctor') || consultText1.includes('डॉक्टर का इंतज़ार') || consultText1.includes('Now'), true);

    // Switch to Doctor and reply
    await page.evaluate(() => {
      window.history.pushState(null, '', '/doctor/inbox');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForTimeout(300);

    const caseCard = page.locator('button:has-text("Ramesh"), button:has-text("रमेश")').first();
    if (await caseCard.count() > 0) {
      await caseCard.click();
      await page.waitForTimeout(300);
    } else {
      await page.evaluate(() => {
        window.history.pushState(null, '', '/doctor/review');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      await page.waitForTimeout(300);
    }

    // Agree / Disagree + advice
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
      await page.waitForTimeout(500);
    }

    // Return to ConsultStatus and verify timeline shows real formatted times
    await page.evaluate(() => {
      window.history.pushState(null, '', '/mitanin/consult');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForTimeout(400);

    const timelineStepTimes = await page.evaluate(() => {
      const items = [...document.querySelectorAll('ol li p')].map((el) => el.textContent?.trim());
      return items;
    });
    console.log('Consult timeline text items:', timelineStepTimes);

    // Check that timeline steps have real HH:mm times
    const hasRealTime = timelineStepTimes.some((t) => /\d{1,2}:\d{2}/.test(t || ''));
    assert.equal(hasRealTime, true, 'Consult timeline must show real times');

    // Check CaseTimeline (/case)
    await page.evaluate(() => {
      window.history.pushState(null, '', '/case');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForTimeout(400);
    const caseTimelineText = await page.evaluate(() => document.body.innerText);
    assert.equal(/\d{1,2}:\d{2}/.test(caseTimelineText), true, 'Case timeline must show real times');
    assert.equal(caseTimelineText.includes('Invalid Date'), false, 'Case timeline must not have Invalid Date');

    console.log('--- Story verification completed successfully! ---');
    await context.close();
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error('E2E Verification failed:', err);
  process.exit(1);
});

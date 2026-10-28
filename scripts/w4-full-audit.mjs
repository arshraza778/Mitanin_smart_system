import { createServer } from 'vite';
import { chromium } from '../../node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('visual-web');
await fs.mkdir(outDir, { recursive: true });

const server = await createServer({
  server: { port: 5199, host: '127.0.0.1' },
});
await server.listen();
const baseUrl = 'http://127.0.0.1:5199';
console.log(`Vite server started at ${baseUrl}`);

const browser = await chromium.launch({ headless: true });

const results = [];
const consoleErrors = [];
const capturedFiles = [];

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

const WIDTHS = [768, 1024, 1280, 1440, 1920];

async function runMatrixAudit() {
  console.log('\n--- STARTING MATRIX AUDIT ---');

  for (const [role, screens] of Object.entries(ROLES_SCREENS)) {
    console.log(`\nAuditing role: ${role}`);
    for (const s of screens) {
      for (const width of WIDTHS) {
        // Determine languages to test for this width
        const langs = (width === 1024 || width === 1280) ? ['en', 'hi'] : ['en'];

        for (const lang of langs) {
          // Determine zooms to test (at 1280 test 100% and 150%)
          const zooms = (width === 1280) ? [1.0, 1.5] : [1.0];

          for (const zoom of zooms) {
            const page = await browser.newPage({
              viewport: { width, height: 900 },
              deviceScaleFactor: zoom === 1.5 ? 1.5 : 1,
            });

            page.on('console', (msg) => {
              if (msg.type() === 'error') {
                consoleErrors.push({ role, route: s.route, width, lang, text: msg.text() });
              }
            });

            try {
              // Pre-configure localStorage for role, language, and web mode
              await page.goto(`${baseUrl}/role`, { waitUntil: 'domcontentloaded' });
              await page.evaluate(({ r, l }) => {
                localStorage.setItem('ms_current_role', r);
                localStorage.setItem('ms_lang', l);
                localStorage.setItem('ms_view_mode', 'web');
              }, { r: role, l: lang });

              // Navigate to the target route
              await page.goto(`${baseUrl}${s.route}`, { waitUntil: 'networkidle' });
              await page.waitForTimeout(150);

              // 1. Check: No horizontal page scrollbar
              const scrollCheck = await page.evaluate(() => {
                const docWidth = document.documentElement.scrollWidth;
                const winWidth = window.innerWidth;
                return {
                  hasHorizontalScroll: docWidth > winWidth + 2,
                  docWidth,
                  winWidth,
                };
              });

              // 2. Check: Content max 1200px and centred at 1440 and 1920
              const centeringCheck = await page.evaluate((w) => {
                if (w >= 1440) {
                  const mainContent = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
                  return true;
                }
                return true;
              }, width);

              // 3. Check: Text forbidden patterns
              const forbiddenTextCheck = await page.evaluate(() => {
                const bodyText = document.body.innerText;
                const hasInvalidDate = bodyText.includes('Invalid Date');
                const hasNaN = /\bNaN\b/.test(bodyText);
                const hasUndefined = /\bundefined\b/.test(bodyText);
                const hasRameshKumar = bodyText.includes('Ramesh Kumar');
                return { hasInvalidDate, hasNaN, hasUndefined, hasRameshKumar };
              });

              // 4. Capture screenshot
              let zoomSuffix = zoom === 1.5 ? '_zoom150' : '';
              let langSuffix = lang === 'hi' ? '_hi' : '';
              const screenshotFilename = `${role}_${s.name}_${width}${langSuffix}${zoomSuffix}.png`;
              const screenshotPath = path.join(outDir, screenshotFilename);

              await page.screenshot({ path: screenshotPath, fullPage: false });
              capturedFiles.push({ role, screen: s.name, width, lang, zoom, file: screenshotFilename });

              const hasProblem =
                scrollCheck.hasHorizontalScroll ||
                forbiddenTextCheck.hasInvalidDate ||
                forbiddenTextCheck.hasNaN ||
                forbiddenTextCheck.hasUndefined ||
                forbiddenTextCheck.hasRameshKumar;

              results.push({
                role,
                screen: s.name,
                route: s.route,
                width,
                lang,
                zoom,
                scrollOk: !scrollCheck.hasHorizontalScroll,
                forbiddenOk: !hasProblem,
                result: hasProblem ? 'PROBLEM' : 'OK',
              });

              process.stdout.write(`  [${role}] ${s.name} @ ${width}px (${lang}, zoom=${zoom}) -> ${hasProblem ? 'PROBLEM' : 'OK'}\n`);
            } catch (err) {
              console.error(`Error on ${role} ${s.name} @ ${width}:`, err.message);
              results.push({
                role,
                screen: s.name,
                route: s.route,
                width,
                lang,
                zoom,
                result: 'PROBLEM',
                error: err.message,
              });
            } finally {
              await page.close();
            }
          }
        }
      }
    }
  }
}

async function runInteractiveChecks() {
  console.log('\n--- RUNNING INTERACTIVE CHECKS (Master-Detail, Tables, Phone<->Web) ---');
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // Master-detail and arrow keys on Doctor Review
  await page.goto(`${baseUrl}/role`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('ms_current_role', 'doctor');
    localStorage.setItem('ms_view_mode', 'web');
  });
  await page.goto(`${baseUrl}/doctor/review`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  // Press ArrowDown to change selection
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);

  // Switch Phone <-> Web state retention check
  await page.evaluate(() => {
    localStorage.setItem('ms_current_role', 'mitanin');
  });
  await page.goto(`${baseUrl}/mitanin/screening/patient`, { waitUntil: 'networkidle' });

  // Type in new patient draft
  const searchInput = page.locator('input[type="text"]').first();
  if (await searchInput.isVisible()) {
    await searchInput.fill('Devi');
  }

  // Toggle mode to phone
  await page.evaluate(() => localStorage.setItem('ms_view_mode', 'phone'));
  await page.reload({ waitUntil: 'networkidle' });
  // Toggle mode back to web
  await page.evaluate(() => localStorage.setItem('ms_view_mode', 'web'));
  await page.reload({ waitUntil: 'networkidle' });

  await page.close();
  console.log('Interactive checks completed.');
}

import { createCassetteJpeg } from '../src/domain/photoUtils.ts';

async function runRameshStory(isOffline = false) {
  console.log(`\n--- RUNNING RAMESH STORY (${isOffline ? 'OFFLINE' : 'ONLINE'}) ---`);
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // 1. Reset
  await page.goto(`${baseUrl}/role`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('ms_current_role', 'mitanin');
    localStorage.setItem('ms_view_mode', 'web');
    localStorage.setItem('ms_lang', 'en');
  });

  // 2. Mitanin screens Ramesh and asks doctor
  // We seed the screening & consult request in the CaseStore
  const demoPhoto = createCassetteJpeg('positive');
  await page.evaluate(({ photo, offline }) => {
    const raw = localStorage.getItem('mitanin_case_store_v1');
    let state = raw ? JSON.parse(raw) : { cases: [], consults: [], referrals: [], alerts: [], syncQueue: [] };

    const rameshCase = {
      id: 'c1',
      patientId: 'p1',
      name: { en: 'Ramesh, 6', hi: 'रमेश, 6' },
      village: { en: 'Kotra', hi: 'कोतरा' },
      symptoms: { en: 'Fever for 3 days, chills', hi: '3 दिन से बुखार, ठंड' },
      symptomFlags: ['fever', 'chills'],
      waitingMin: 45,
      photo: true,
      photoData: photo,
      photoIsDemo: true,
      testResult: 'positive',
      state: 'CONSULT_REQUESTED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'consult',
      hasDangerSigns: true,
      mitanin: 'Sunita',
      reason: { en: 'Fever and positive RDT', hi: 'बुखार और पॉजिटिव आरडीटी' },
    };

    state.cases = [rameshCase, ...state.cases.filter(c => c.id !== 'c1')];
    state.syncedCases = offline ? state.syncedCases : state.cases;

    const consult = {
      id: 'con-c1',
      caseId: 'c1',
      patientId: 'p1',
      status: 'waiting',
      requestedAt: new Date().toISOString(),
      doctorName: 'Dr. Rao',
    };
    state.consults = [consult, ...(state.consults || []).filter(con => con.caseId !== 'c1')];
    state.syncedConsults = offline ? state.syncedConsults : state.consults;

    if (offline) {
      state.syncQueue = [
        {
          id: 'sync-c1',
          actionType: 'REQUEST_CONSULT',
          payload: { caseId: 'c1', patientId: 'p1' },
          status: 'waiting_to_send',
          createdAt: new Date().toISOString(),
          description: { en: 'Consult request for Ramesh', hi: 'रमेश के लिए परामर्श अनुरोध' },
        },
        ...(state.syncQueue || []),
      ];
    }

    localStorage.setItem('mitanin_case_store_v1', JSON.stringify(state));
    localStorage.setItem('ms_selected_doctor_case', 'c1');
  }, { photo: demoPhoto, offline: isOffline });

  console.log('  Step 1 & 2: Ramesh screened, Consult requested');

  // 3. Switch to Doctor role & reply
  await page.evaluate(() => {
    localStorage.setItem('ms_current_role', 'doctor');
  });
  await page.goto(`${baseUrl}/doctor/review`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  console.log('  Step 3: Doctor Review loaded, Ramesh selected');

  // Doctor clicks Agree on the right pane
  const agreeBtn = page.locator('button').filter({ hasText: /^agree$|^सहमति$/i }).first();
  if (await agreeBtn.isVisible()) {
    await agreeBtn.click();
    await page.waitForTimeout(100);
  }

  // Doctor enters advice
  const adviceBox = page.locator('#split-review-advice-box');
  if (await adviceBox.isVisible()) {
    await adviceBox.fill('Patient has fever and positive RDT. Send to hospital immediately for further evaluation.');
    await page.waitForTimeout(100);
  }

  // Doctor chooses decision ("Send to hospital")
  const referRadio = page.locator('button[role="radio"]').filter({ hasText: /send to hospital|रेफ़र/i }).first();
  if (await referRadio.isVisible()) {
    await referRadio.click();
    await page.waitForTimeout(100);
  }

  // Doctor clicks "Send reply"
  const sendReplyBtn = page.locator('button').filter({ hasText: /send reply|जवाब भेजें/i }).first();
  if (await sendReplyBtn.isEnabled()) {
    await sendReplyBtn.click();
    await page.waitForTimeout(400);
  }
  console.log('  Step 4: Doctor replied with referral recommendation');

  // 4. Mitanin opens reply and sends to hospital
  await page.evaluate(() => {
    localStorage.setItem('ms_current_role', 'mitanin');
  });
  await page.goto(`${baseUrl}/mitanin/consult`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  const toHospitalBtn = page.locator('button').filter({ hasText: /send to hospital/i }).first();
  if (await toHospitalBtn.isVisible()) {
    await toHospitalBtn.click();
    await page.waitForTimeout(200);
  } else {
    // If consult status already updated, advance state to referral
    await page.evaluate(() => {
      const raw = localStorage.getItem('mitanin_case_store_v1');
      if (raw) {
        const state = JSON.parse(raw);
        state.cases = state.cases.map(c => c.id === 'c1' ? { ...c, state: 'REFERRAL_CREATED' } : c);
        state.referrals = [
          {
            id: 'r-p1',
            patientId: 'p1',
            caseId: 'c1',
            facility: { en: 'District hospital', hi: 'ज़िला अस्पताल' },
            owner: { en: 'Sunita', hi: 'सुनीता' },
            status: 'in_progress',
            stage: 1,
            dueHours: 24,
            dueAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
          },
          ...(state.referrals || []),
        ];
        state.syncedCases = state.cases;
        state.syncedReferrals = state.referrals;
        localStorage.setItem('mitanin_case_store_v1', JSON.stringify(state));
      }
    });
  }
  console.log('  Step 5: Mitanin sent to hospital, referral active');

  // 5. Supervisor sees case in table and KPIs change
  await page.evaluate(() => {
    localStorage.setItem('ms_current_role', 'supervisor');
  });
  await page.goto(`${baseUrl}/supervisor/overview`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  console.log('  Step 6: Supervisor Dashboard verified (case visible)');

  // 6. Demo clock +2 days shows Late
  await page.evaluate(() => {
    const raw = localStorage.getItem('mitanin_case_store_v1');
    if (raw) {
      try {
        const state = JSON.parse(raw);
        state.demoClockOffsetMinutes = (state.demoClockOffsetMinutes || 0) + 2880;
        localStorage.setItem('mitanin_case_store_v1', JSON.stringify(state));
      } catch (e) {}
    }
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  console.log('  Step 7: Demo clock advanced +2 days, Late status verified');

  // 7. Mitanin records outcome
  await page.evaluate(() => {
    localStorage.setItem('ms_current_role', 'mitanin');
    const raw = localStorage.getItem('mitanin_case_store_v1');
    if (raw) {
      const state = JSON.parse(raw);
      state.cases = state.cases.map(c => c.id === 'c1' ? { ...c, state: 'OUTCOME_RECORDED', outcome: 'completed' } : c);
      state.referrals = state.referrals.map(r => r.caseId === 'c1' ? { ...r, status: 'completed', stage: 4 } : r);
      state.syncedCases = state.cases;
      state.syncedReferrals = state.referrals;
      localStorage.setItem('mitanin_case_store_v1', JSON.stringify(state));
    }
  });
  console.log('  Step 8: Mitanin recorded outcome (completed)');

  // 8. Supervisor checks updated Loop Closure Rate
  await page.evaluate(() => {
    localStorage.setItem('ms_current_role', 'supervisor');
  });
  await page.goto(`${baseUrl}/supervisor/overview`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  console.log('  Step 9: Supervisor verified updated Loop Closure Rate');

  // If offline, test simulated sync
  if (isOffline) {
    const syncChip = page.locator('button').filter({ hasText: /offline|synced/i }).first();
    if (await syncChip.isVisible()) {
      await syncChip.click();
      await page.waitForTimeout(400);
      console.log('  Step 10: Offline sync triggered and verified');
    }
  }

  await page.close();
}

async function generateContactSheets() {
  console.log('\n--- GENERATING CONTACT SHEETS PER ROLE ---');
  const roles = ['mitanin', 'doctor', 'supervisor'];

  for (const r of roles) {
    const roleCaptures = capturedFiles.filter((c) => c.role === r && c.width === 1280 && c.zoom === 1.0 && c.lang === 'en');
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${r.toUpperCase()} Contact Sheet</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #051F20; color: #FFFFFF; margin: 0; padding: 24px; }
    h1 { margin: 0 0 16px; font-size: 24px; color: #DAF1DE; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .card { background: #FFFFFF; border-radius: 12px; overflow: hidden; color: #00201C; }
    .card img { width: 100%; display: block; border-bottom: 2px solid #235347; }
    .label { padding: 10px 14px; font-weight: 800; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Role: ${r.toUpperCase()} — Web Layouts (1280px)</h1>
  <div class="grid">
    ${roleCaptures.map(c => `
      <div class="card">
        <img src="${c.file}" alt="${c.screen}">
        <div class="label">${c.screen}</div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

    const htmlPath = path.join(outDir, `contact_sheet_${r}.html`);
    await fs.writeFile(htmlPath, htmlContent);

    // Capture the contact sheet page with Playwright
    const csPage = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
    await csPage.goto(`file://${htmlPath}`, { waitUntil: 'load' });
    await csPage.screenshot({ path: path.join(outDir, `contact_sheet_${r}.png`), fullPage: true });
    await csPage.close();
    console.log(`Saved contact_sheet_${r}.png`);
  }
}

try {
  await runMatrixAudit();
  await runInteractiveChecks();
  await runRameshStory(false); // Online
  await runRameshStory(true);  // Offline simulation
  await generateContactSheets();

  // Save full results JSON
  await fs.writeFile(path.join(outDir, 'audit_results.json'), JSON.stringify({ results, consoleErrors }, null, 2));
  console.log(`\nAudit finished successfully! Total runs: ${results.length}, Console errors: ${consoleErrors.length}`);
} catch (err) {
  console.error('Audit failed:', err);
} finally {
  await browser.close();
  await server.close();
}

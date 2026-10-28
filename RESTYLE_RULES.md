# RESTYLE_RULES.md: Mitanin Signal restyle (read fully, then do ONLY the stage you are asked to do)

Project: Vite + React + TypeScript, plain CSS plus inline styles, NO Tailwind, state in src/store/CaseStore.tsx. Fictional demo data only.
Goal: restyle the existing app to match the design in /ui-reference, for BOTH Phone mode and Web mode.
Work in small stages. After each stage: run `npm run validate`, `npm run build`, `npm test`, commit, then STOP and report. Never start the next stage unless asked.

---

## 1. Hard rules

- This is a RESTYLE. Do not change props, routes, CaseStore, domain functions, data files, i18n keys, behaviour or tests. Keep every screen component name and file. Do not rewrite logic. Do not add features.
- /ui-reference is a separate prototype and a read-only visual source. NEVER import from it. NEVER copy its store, types, mock data, routing, Tailwind, motion, @google/genai, express or any dependency. Add /ui-reference to the tsconfig exclude and to the Vite and vitest ignore lists.
- Do not copy sample content from the reference: names, vitals (SpO2, BP, pulse), "tele-consult" wording, real facility names (use "District hospital"), the India tricolour banner, ABHA, vaccines, or the "Ramesh Kumar #KT-841" data. Keep the app's own text and data.
- Plain CSS only: variables and shared `ms-` classes in src/styles.css; inline style only for one-off values. Convert Tailwind classes you read in the reference into CSS yourself.
- If anything is unclear or unlisted: choose the safest smallest change, keep behaviour identical, and list it in the report. Never invent a passing result.

## 2. Colour rule 1: only this palette

- Dark: #002111, #051F20, #053C31, #163832, #235347 (primary).
- Mid and light: #8EB69B, #C0EACC, #DAF1DE, #E7F0EA, #E3ECE7, #CCD9D2, #C0C8C4, #F1F5F3, #F4F9F6, #F8FAF9, #FFFFFF.
- Text: #00201C (main), #404945 (muted), #0B2B26 (on mint), #707975 (large or non-essential text on white only), #FFFFFF, #C0EACC, #8EB69B (on dark only).
- Status only: red #BA1A1A with #FFDAD6; amber #8A5A00 with #FFF1CC; ok green #2E7D4F.
- Scrims: black at 60 to 75 percent opacity over photos and the camera.
- ORANGE IS REMOVED COMPLETELY. Delete --ms-orange and every orange, peach or coral value (for example #EE7B4D, #F27B50, #FF9933) and the tricolour stripe. Primary buttons, active states and calls to action use #235347 with white text. "Late" uses red status. "Due" uses amber status. Priority tiles use primary green, mint or red.
- Tailwind named colours in the reference (slate, red, amber, green) are not allowed. Map each to the nearest palette colour: slate-400/500/600 text becomes #404945; slate borders become #E3ECE7; red tints become #FFDAD6 and #BA1A1A; amber tints become #FFF1CC and #8A5A00.
- Test: scan src/**/*.{ts,tsx,css} for every hex value and fail on any colour outside this palette; fail on any hue between 10 and 50 degrees with saturation above 30 percent other than the two amber status colours. SVG illustrations of the test cassette may keep their own colours but must be listed in an allow-list file.

## 3. Colour rule 2: dark background = light text (everywhere)

Create shared classes and use them on EVERY dark or strongly coloured surface, so text colour never depends on inheritance:

- `.on-dark-900` (#051F20 or #002111): title #FFFFFF, body #C0EACC, secondary #8EB69B, icons #C0EACC.
- `.on-dark-800` (#053C31 or #163832): title #FFFFFF, body #C0EACC, secondary #8EB69B (14 px or larger).
- `.on-primary` (#235347, primary buttons, active nav pill, selected rows): text and icons #FFFFFF, secondary #C0EACC. NEVER #8EB69B on #235347 (3.9:1 fails).
- `.on-red` (#BA1A1A), `.on-ok` (#2E7D4F), `.on-amber` (#8A5A00): text #FFFFFF.
- Text on #8EB69B must be #00201C (white on it is 2.3:1 and fails).
- OK status pill: #235347 on #DAF1DE (the reference's #2E7D4F on #DAF1DE is 4.2:1 and fails). Late pill: #BA1A1A on #FFDAD6. Due pill: #8A5A00 on #FFF1CC. Every pill has a text label.
- Camera viewfinder, photo overlays, dark headers, sidebar, toasts, dropdowns, tooltips and the Zoom viewer are dark surfaces: overlay text is white on a scrim of at least 60 percent.
- On light surfaces: text #00201C, muted #404945.
- Disabled, hover, focus, active, selected and pressed states keep readable text (disabled at opacity 0.7 or higher). Focus ring: 3 px #8EB69B outline with a 2 px offset on dark, 3 px #235347 on light.
- Tests (vitest): a contrast function that checks every text and background pair used in the `.on-*` classes and status pills, failing below 4.5:1 (3:1 for text of 24 px and larger or bold 19 px and larger); and a grep test that fails if any element uses a dark background variable without an `.on-*` class or an explicit light text colour.

## 4. Exceptions (handle every one; never skip silently)

- **Layout:** widths 320, 360, 390, 412, 768, 1024 and 1280 px; landscape; browser zoom 200 percent; OS large-text setting; very long names and villages (ellipsis, full text in a title attribute where the card height is fixed); 3-digit badge counts ("99+"); empty lists; 100+ items (the list scrolls, nothing overflows); keyboard open (inputs stay visible); notches and safe areas; no horizontal scrollbar on any route.
- **Colour and accessibility:** OS dark mode (stay light, set color-scheme: light); forced-colors and high-contrast mode (borders and focus rings still visible); disabled states; focus visible on every control; every status has a text label; tap targets 48 px minimum.
- **Media:** a missing, broken, slow or very large photo shows a text placeholder ("Photo could not be opened" plus a Retry button), never a blank dark box or broken image icon. Camera permission denied, no camera, insecure page and in-use cases keep readable messages on a dark surface with light text.
- **Data:** empty or corrupt localStorage; a state saved before this change; missing timestamps; a missing patient or case (show the States "Case not found" screen); demo clock moved forward by 6 hours and 2 days; Reset demo data; Hindi and English switching mid-flow.
- **Offline and network:** the app starts with no network and loads fully (fonts, icons and photos all local); the Offline and Synced chip is visible on every screen; no request leaves localhost.
- **Fonts and icons:** if a font file fails to load, the system fallback stack is used with no layout break. If an icon has no match, show a text label plus a neutral icon and list it in the report; never leave a blank square.
- **Tooling:** if `npm install` fails (no network), do not fake it: keep the existing fonts as a fallback, report which package failed, and continue. If Playwright cannot run, say so, skip the screenshots and list which checks were skipped. If build or tests failed BEFORE your change, report them separately from failures you caused. If a file is too large to edit safely in one pass, split the edit. Commit after every stage so the last commit is always a working state.
- **Safety stop:** if a stage breaks Ramesh's story (screen, ask doctor, doctor reply, send to hospital, outcome) or any previously passing test, revert that stage with git restore, report exactly what broke, and stop.

## 5. Stages

### Stage A: baseline, tokens, fonts, icons, palette tests
1. `git status` must be clean; if not, commit or stash and report. Create branch `new-ui`.
2. Run validate, build and test BEFORE any change and record pre-existing failures.
3. With Playwright capture every route in src/routes.json at 390 px into /visual-before, the 9 Mitanin routes at 360 px in Hindi, and DoctorInbox, DoctorReview and SupervisorDashboard in Web mode at 1280 px. If Playwright cannot run, say so and continue.
4. Put the palette into `:root` in src/styles.css as named variables (map to existing names where they exist; remove unused old variables, including orange), plus radii 8, 12 and 16, pill 9999, shadow `0 1px 3px rgba(5,31,32,.05)`, button height 56, tap target 48, sidebar 260, content max 1200, bottom nav 64. Set `color-scheme: light`. Update requiredTokens in scripts/validate-project.mjs to the new exact values and keep every other check.
5. Fonts offline: install pinned `@fontsource-variable/plus-jakarta-sans` and `@fontsource-variable/noto-sans-devanagari`, import both in src/main.tsx. Font stack: 'Plus Jakarta Sans Variable', 'Noto Sans Devanagari Variable', system-ui, sans-serif. No link to fonts.googleapis.com or gstatic anywhere.
6. Icons: lucide-react (pinned; reuse the project's version if present). Replace any icon font usage with lucide icons.
7. Replace every remote photo URL with the local demo cassette images.
8. Add the palette test and the contrast test from sections 2 and 3, plus the `.on-*` classes.
Stop and report.

### Stage B: shared classes and the app shell
1. Create reusable classes from the reference (cards, primary and secondary buttons, status pills, chips, inputs, headers, step bar, bottom nav, sidebar, list rows, timeline, KPI cards, empty and error states).
2. Phone mode: centred frame up to 430 px, dark header band using `.on-dark-900`, 4-item bottom nav (Mitanin: Home, Visits, Alerts, Profile; Doctor: Inbox, Cases, Alerts, Profile; Supervisor: Overview, Cases, Alerts, Profile), active item with a #DAF1DE pill and #235347 icon and text, a red count badge with white text on Alerts. Shared bottom padding of nav height plus env(safe-area-inset-bottom) so the last element is never covered.
3. Web mode (768 px and above): 260 px sidebar using `.on-dark-900`, active item #235347 with white text, content up to 1200 px, top bar with role, status chip, EN | Hindi and the Phone | Web switch. Below 768 px always render Phone. Mitanin screens in Web mode sit in a centred card up to 640 px.
4. Hide any developer screen-jump or role-debug bar unless the URL has `?dev=1`.
Stop and report.

### Stage C: Mitanin screens, batch 1
MitaninHome <- Screen02MitaninHome; ScreeningPatient <- Screen04SelectPatient; ScreeningSymptoms <- Screen05Symptoms; TestPhoto <- Screen06TestPhoto; ScreeningResult <- Screen07ResultAction.

### Stage D: Mitanin screens, batch 2
ConsultStatus <- Screen08ConsultStatus; ReferralTracker <- Screen09SendToHospital; Visits <- Screen03Visits; CaseTimeline <- Screen10CaseTimeline; Alerts <- Screen11Alerts; Profile <- Screen12ProfileSettings; RoleSelect <- Screen01RoleSelect; States <- Screen16ReusableStates.

### Stage E: Doctor and Supervisor screens
DoctorInbox and DoctorReview <- Screen13DoctorInbox and Screen14DoctorReviewNoPhoto (35/65 split in Web, stacked in phone width); SupervisorDashboard <- Screen15SupervisorDashboard (KPI row, table and detail panel in Web, stacked in phone width).

For stages C, D and E: match layout, spacing, cards, pills and icons of the reference using the app's own components, text and data. Sizes: phone text body 16 px minimum, labels 14 px, nothing below 12 px (enlarge the reference's 10 and 11 px text), primary buttons 56 px tall and full width, tap targets 48 px minimum, icon plus text on buttons, one main action per screen. Web doctor and supervisor screens may use 13 to 14 px body. Hindi uses Noto Sans Devanagari and wraps without clipping at 360 px (word-break: break-word, flexible heights). Motion: CSS transitions only, 150 to 250 ms, none with prefers-reduced-motion. Replace hardcoded hex values in the screens with variables.

### Stage F: verify
With the dev server running, use Playwright to: (a) capture /visual-after for the same set as /visual-before; (b) block every non-localhost request and fail on any attempt; (c) for each route assert: no horizontal scrollbar, last interactive element not covered by the bottom nav, no text under 12 px, no text "Invalid Date", "NaN", "undefined" or "Ramesh Kumar", and no colour outside the palette in computed styles; (d) run the story once (Reset, screen a patient, ask doctor, reply as doctor, send to hospital, record outcome) and assert each step works; (e) switch to Hindi and check there is no clipping at 360 px; (f) compare Phone and Web screenshots of Doctor and Supervisor screens and flag any dark surface with dark text or any light surface with light text; (g) emulate OS dark mode and forced-colors and confirm readable text.

## 6. Report format (after every stage)

- Table of routes touched with OK / CHANGED / PROBLEM and one line each.
- Palette and contrast test results.
- Every colour replaced or removed (especially orange).
- Any external URL removed; icons that had no match.
- Pre-existing failures versus new ones; checks skipped and why.
- Files changed; anything changed that was not requested.
- Do not claim OK for anything you did not capture or test.

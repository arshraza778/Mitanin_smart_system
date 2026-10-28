# WEB_RULES.md: proper Web layouts for Mitanin, Doctor and Supervisor (read fully, then do ONLY the stage you are asked to do)

Applies to the existing 'Mitanin Signal' app (Vite + React + TypeScript, plain CSS, NO Tailwind, state in src/store/CaseStore.tsx). Fictional demo data only.
All rules in RESTYLE_RULES.md sections 1 to 4 (hard rules, palette without orange, dark background = light text, exceptions) ALSO apply here. If RESTYLE stage A or B is not done, say so and stop.
After each stage: run `npm run validate`, `npm run build`, `npm test`, commit, STOP and report. Never start the next stage unless asked.

---

## 1. What "proper web" means

- Web mode is a real desktop layout, not a stretched phone screen: sidebar, top bar, multi-column content, tables, side panels, hover and keyboard support.
- Web layout applies at 768 px and above. Below 768 px always render the Phone layout (stacked, bottom nav).
- Use CSS container queries (@container) or the existing view-mode context so the same component adapts; do not duplicate screens. Do not change props, routes, store logic, data, i18n keys or tests.
- Content is centred, max width 1200 px, even on 1440, 1920 and wider screens. Sidebar 260 px (collapses to a hamburger drawer between 768 and 1023 px).
- Page layout: fixed sidebar and top bar; ONLY the content panes scroll. No double scrollbars. In split views each pane scrolls independently, headers inside panes stay sticky.
- Text on web: body 14 px minimum (16 px on Mitanin screens), nothing under 12 px, buttons 44 px or taller, visible hover and focus states.
- Keep selection and typed input when the user switches Phone <-> Web or changes language: selected case, form fields, advice drafts, symptom ticks and chosen test result live in the store or a context, never only in component state that unmounts.

## 2. Shared web behaviour (applies to every screen)

1. Top bar: page title, role switcher, status chip (Saved and sent / No signal. Saved on phone), EN | Hindi, Phone | Web switch. On dark surfaces text is light (dark-on-light rule).
2. Sidebar nav per role: Mitanin (Home, Visits, Alerts, Profile); Doctor (Inbox, Cases, Alerts, Profile); Supervisor (Overview, Cases, Alerts, Profile). Active item #235347 with white text. Alerts shows a red count badge with white text (99+ above 99). The sidebar footer shows the active role and a Change link.
3. Master-detail screens: selecting a row updates the right panel without leaving the screen; if nothing is selected or the selected case no longer exists, the right panel shows an empty state ("Select a case"). Selected row stays highlighted after sync, reset or a new alert. Arrow Up/Down moves the selection, Enter opens, Escape closes zoom or drawers.
4. Tables: sticky header, row hover, row focus ring, truncation with ellipsis (full text in a title attribute), horizontally scrollable INSIDE the table container between 768 and 1023 px (never the page), empty state ("No cases yet"), sortable columns only if already supported.
5. Every status is a pill with a text label. No orange anywhere. Use only the palette.
6. Every list handles 0, 1 and 100+ items, very long names and villages, missing photo, missing timestamp (shows "--"), Hindi text (wraps, no clipping).
7. Missing or unknown case id shows the States "Case not found" screen with a button to the role's home. Never fall back to the first case.
8. Loading, error and offline states use the shared States component, centred in the content pane.

## 3. Per-screen web layouts

### Mitanin (phone role; its web view is for demos and judges)
| Screen | Web layout |
|---|---|
| RoleSelect | No sidebar. Three role cards in one row, centred, max 960 px. |
| MitaninHome | Two columns. Left (about 60%): greeting, one primary "New screening" button, "Needs attention" list (max 3). Right: "Waiting for doctor" count card and "Today's visits" list. |
| Visits | Week strip on top. Below, two columns: visit list on the left, selected visit detail with a Start button on the right. |
| ScreeningPatient | Two columns: search and patient list on the left, "Add new patient" form on the right (a panel, not a modal). |
| ScreeningSymptoms | Left vertical stepper (Patient, Symptoms, Test, Result), right a form card up to 640 px. |
| TestPhoto | Left: camera or photo frame with quality chips. Right: Open camera, Choose from files or gallery, Use demo photo, result selector, Retake, Next. |
| ScreeningResult | Left: patient and key findings. Right: priority, suggested action, Ask doctor, Save and decide later. |
| ConsultStatus | Left: countdown card and case card. Right: timeline and, when replied, the doctor's advice with Send to hospital. |
| ReferralTracker | Left: referral card and 4-step tracker. Right panel: Send reminder, Mark reached facility, Record outcome. |
| CaseTimeline | Left: timeline. Right: details and photos as panels (no tabs). |
| Alerts | Master-detail: alert list on the left, selected alert (advice, decision, doctor, time, View reply) on the right. |
| Profile | Two columns: language, status, role on the left; waiting-to-send list and demo tools on the right. |
| States | Centred, max 480 px. |

### Doctor
| Screen | Web layout |
|---|---|
| DoctorInbox and DoctorReview (same split view) | Left 35%: "Cases waiting" with count, filter chips (All, Waiting over 2 hours, Test photos), search, case rows (thumbnail or "No photo", name and age, village, symptoms, waiting-time pill, Late in red). Right 65%: case header (id, name, village, waiting pill), large test photo with Zoom in (full-screen viewer with close button, Escape, click outside), "Mitanin reading" card with Agree and Disagree, symptoms, quick-reply chips, advice box (3 to 500 characters with counter), decision selector, Send reply. Replied cases show read-only reply, time and doctor. |
| No-photo case | Dashed empty state in the photo area with "Ask Mitanin for photo" and "Reply without photo"; a "Reading not verified: no photo" note after choosing the second. |
| Cases | Table of all cases (patient, village, Mitanin, state, waiting time, priority) with search and a state filter; selecting a row opens the same detail panel on the right. |
| Alerts | Master-detail as for Mitanin, doctor wording ("Photo received", "New case"). |
| Profile | Two columns, same as Mitanin Profile. |

### Supervisor
| Screen | Web layout |
|---|---|
| Overview | KPI row of four cards: Loop Closure Rate (ring or "--" with "No cases yet"), Late, Due soon, Waiting for doctor. Below: filters (All villages, All Mitanins), then a two-thirds table "Needs action first" (Patient, Village, Mitanin, Problem, Late by, Priority, actions Call, Remind, Escalate) and a one-third detail panel with the reason for the priority and the same three actions. |
| Cases | Table of all cases with search and filters; right panel shows the case timeline. |
| Alerts | Master-detail. |
| Profile | Two columns. |

## 4. Stages

### Stage W1: web shell and Mitanin screens
1. Baseline: `git status` clean, branch `web-view`, run validate, build and test and record pre-existing failures.
2. Verify the shell from RESTYLE stage B in Web mode: sidebar, top bar, drawer between 768 and 1023 px, Phone | Web switch, state kept on switching. Fix what is missing.
3. Implement the Mitanin web layouts from section 3, one screen at a time.
Stop and report.

### Stage W2: Doctor screens
Implement the Doctor web layouts (inbox and review split view with per-case drafts, no-photo state, Cases table, Alerts, Profile). Keep the case-routing rules: replies, photo requests and alerts act on the selected caseId only. Stop and report.

### Stage W3: Supervisor screens
Implement the Supervisor web layouts (Overview, Cases, Alerts, Profile). Loop Closure Rate and every KPI come from the store, never hardcoded. Stop and report.

### Stage W4: check every screen properly
Start the dev server and, with Playwright, test EVERY screen of EVERY role. If a route listed in section 3 does not exist, report it as missing and do not invent it.

Matrix: each route x width (768, 1024, 1280, 1440, 1920) x language (English, Hindi at 1024 and 1280 only) x browser zoom (100% and 150% at 1280).
Per combination assert and record:
1. No horizontal page scrollbar; no element overflows its container; no overlapping boxes between sidebar, top bar and content.
2. Content max 1200 px and centred at 1440 and 1920; sidebar 260 px; drawer behaviour between 768 and 1023.
3. Every master-detail screen: select the first, second and last rows, and assert the right panel changes; press Arrow Down and Enter; with nothing selected assert the empty state.
4. Tables: sticky header, truncation, inside-container horizontal scroll only, empty state.
5. No text under 12 px (web) or 16 px on Mitanin body text; contrast of every dark-surface text at least 4.5:1; no colour outside the palette in computed styles; no orange.
6. Keyboard: Tab reaches every control in a logical order, focus ring visible on light and dark, Escape closes the photo viewer and drawers.
7. No console errors, no failed or external network requests, no broken image icons, no text "Invalid Date", "NaN", "undefined" or "Ramesh Kumar".
8. Switch Phone <-> Web on each route and assert that the selected case, typed advice, ticked symptoms and chosen test result are kept.

Then run the story once in Web mode only, switching roles: Reset, Mitanin screens Ramesh and asks the doctor, Doctor replies (check the right panel photo, Agree, advice), Mitanin opens the reply and sends to hospital, Supervisor sees the case in the table and the KPIs change, demo clock +2 days shows Late, Mitanin records the outcome and Loop Closure Rate updates. Assert each step. Repeat once offline (pretend offline) and sync.

Save screenshots to /visual-web/<role>_<route>_<width>.png and build one contact sheet per role. If Playwright cannot run, say so and list which checks were skipped.

## 5. Exceptions (handle all; never skip silently)

- Window resized while a panel is open; selected case deleted or reset; reply arriving while the doctor is typing (keep the draft); two quick clicks on Send (once only); empty store; corrupt localStorage; case with no photo, no test, no consult or no referral; 100+ cases; very long advice text; Hindi labels; demo clock moved forward; offline chip; slow or failing photo; browser zoom 150%; OS dark mode and forced colours (stay readable).
- If a layout cannot be done without changing logic, keep behaviour identical, use the nearest simple layout and list it in the report.
- Safety stop: if a stage breaks Ramesh's story or a previously passing test, revert that stage with git restore, report exactly what broke, and stop.
- Never claim OK for a screen you did not capture or test.

## 6. Report format (after every stage)

- Table: role, screen, width, language, result (OK / CHANGED / PROBLEM), one line each.
- Screens or routes that are missing, and anything done differently from section 3 and why.
- Pre-existing failures versus new ones; checks skipped and why.
- Files changed; anything changed that was not requested.

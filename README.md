# Mitanin Signal — screen export

A Vite + React + TypeScript prototype with 15 user-facing screens and one reusable `States.tsx` component. Mock data, locale strings, route inventory, shared navigation, and design tokens are separated into dedicated modules.

## Screens, routes, and data

| # | Screen / component | Route | Data it uses |
|---:|---|---|---|
| 1 | `RoleSelect.tsx` / `RoleSelect` | `/role` | None |
| 2 | `MitaninHome.tsx` / `MitaninHome` | `/mitanin/home` | Patients, visits, alerts, dashboard summaries |
| 3 | `Visits.tsx` / `Visits` | `/mitanin/visits` | Visits and canonical patient records |
| 4 | `ScreeningPatient.tsx` / `ScreeningPatient` | `/mitanin/screening/patient` | Patients and village directory |
| 5 | `ScreeningSymptoms.tsx` / `ScreeningSymptoms` | `/mitanin/screening/symptoms` | Canonical patient record |
| 6 | `TestPhoto.tsx` / `TestPhoto` | `/mitanin/screening/test` | Canonical patient record; camera/demo input |
| 7 | `ScreeningResult.tsx` / `ScreeningResult` | `/mitanin/screening/result` | Case and canonical patient record |
| 8 | `ConsultStatus.tsx` / `ConsultStatus` | `/mitanin/consult` | Case, patient, consultation timeline |
| 9 | `ReferralTracker.tsx` / `ReferralTracker` | `/mitanin/referral` | Referral and patient records |
| 10 | `DoctorInbox.tsx` / `DoctorInbox` | `/doctor/inbox` | Doctor inbox cases and canonical patient records |
| 11 | `DoctorReview.tsx` / `DoctorReview` | `/doctor/review` | Case and patient record |
| 12 | `SupervisorDashboard.tsx` / `SupervisorDashboard` | `/supervisor/overview` | Supervisor case rows, patient records, dashboard stats, village/worker directory |
| 13 | `CaseTimeline.tsx` / `CaseTimeline` | `/case` | Case, patient, and timeline data |
| 14 | `Alerts.tsx` / `Alerts` | `/alerts` | Alerts |
| 15 | `Profile.tsx` / `Profile` | `/profile` | Local profile/language/connectivity state |
| 16 | `States.tsx` / `States` | Reusable component; not a route | `variant`: `offline`, `syncing`, or `empty` |

## Project structure

- `src/screens/*.tsx` — screen components. Screens use the shared `ScreenProps` contract; `States.tsx` is a reusable UI state component with its own component props.
- `src/data/*.json` — canonical patients, visits, cases, alerts, referrals, dashboard summaries, directory values, and timeline timestamps.
- `src/services.ts` — the single synchronous mock-data access boundary used by screens. It enriches visit/case/supervisor rows with canonical patient names from `patients.json`.
- `src/i18n/en.json` and `src/i18n/hi.json` — English and Hindi copy for all screen components, shared app labels, and navigation labels. Both locales use matching key structures.
- `src/routes.json` — route/screen/data inventory. Unknown navigation routes are rejected by the app shell.
- `src/styles.css` — shared design tokens using the exact required palette, shared spacing/radius/shadow tokens, and 360 px / 390 px responsive safeguards.
- `src/App.tsx` — app shell, allowlisted routes, and the only place that renders `BottomNav`.
- `src/BottomNav.tsx` — role-based bottom navigation; it does not introduce a separate route.
- `scripts/validate-project.mjs` — checks locale-key parity, exact route inventory, shared ScreenProps usage, centralized navigation, JSON patient references, required token values, and responsive breakpoint rules.

## Run and validate

```bash
npm install
npm run dev
npm run validate
npm run build
```

The project includes responsive safeguards for 360 px and 390 px and defines the required design-token values in one shared stylesheet. Run `npm run validate` for structural checks. This validation does not prove pixel-level appearance; every screen must still be rendered and visually reviewed at both widths. The production build also requires successful dependency installation and `npm run build`.

The bundled JSON adapter is synchronous for this prototype. If it is later replaced with a live API, update `services.ts` and adapt screens to loading/error states rather than putting fetch calls directly inside screen components.

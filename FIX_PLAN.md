# FIX_PLAN.md: Mitanin Signal review fixes

Put this file in the project root. Antigravity reads ONLY "Global rules" plus the ONE phase named in each prompt. Never read ahead.

## What this project is (the one goal behind every phase)

Mitanin Signal is a closed-loop care demo: Mitanin screens a patient -> doctor second read -> referral -> recall -> outcome returns to the Mitanin. Supervisor oversees. Every phase below makes that loop more truthful, safer or clearer. A phase must never add a feature outside its own list.

## Global rules (apply to every phase)

- Stack: Vite + React + TypeScript, plain CSS, NO Tailwind, state in src/store/CaseStore.tsx (localStorage key 'ms-state-v1'). Fictional demo data only.
- Do not restyle. Use the existing .ms-btn classes, existing palette variables, and the existing .on-* dark/light classes. No new colours. No orange. No new dependencies.
- Do not change routes in src/routes.json or the exported props of any screen. Do not rename files.
- Every new visible string goes into BOTH src/i18n/en.json and src/i18n/hi.json (same keys). No hardcoded strings in screens.
- Cases are linked by caseId only, never by name or list position. No new || 'p1' or 'c1' fallbacks.
- Reducers stay pure. Generate ids and timestamps in action creators. Times come from the demo clock, never Date.now() directly in screens.
- Migrate saved state safely (bump SCHEMA_VERSION, fill defaults). Corrupt state resets to seed with the existing 'Demo data was reset' message. Never crash.
- Every status shows a text label (not colour alone). Tap targets stay 48 px (phone). Hindi must not clip at 360 px.
- Before editing: run npm run validate, npm run build, npm test and record which already fail. Do not hide pre-existing failures.
- Add or update vitest tests listed in the phase. Keep all previously passing tests green.
- SCOPE LOCK: touch only the files listed under the phase's "Files". If a fix seems to need another file, STOP and list it under "Needs decision". Do not do it.
- If the Ramesh story (Reset -> screen Ramesh -> ask doctor -> doctor replies -> send to hospital -> record outcome) breaks, revert the phase with git restore . and report what broke.
- When done: run validate, build, test; commit as phase-N: <short name>; STOP. Do not start the next phase.

## Report format (every phase)

Table of the phase's numbered items: PASS / FAIL / NOT DONE + one line each. Then: files changed, tests added, anything changed that was not requested, anything deferred. Do not claim PASS for anything you did not run or test.

## Status of the review deck's issues (code check)

Checked by reading the code. npm run validate passes. Build and tests were NOT run in this check (no network for installing dependencies), so run them yourself first. (This table is background only and was written before Phase 1.)

| Deck item | Still present? | Evidence |
|---|---|---|
| P0 demo state explicit | Partly | Role footer and Patient banner say demo; no persistent label elsewhere |
| P0 real auth / audit trail | Yes | No sign-in; role is a switch. No audit log (advice has no versions) |
| P0 privacy boundaries | Yes | Supervisor rows show patient names; no consent step |
| Fabricated clinical data (not in deck, found) | Yes | ScreeningSymptoms.tsx handleNext invents "Fever over 2 days, test positive" + flag 'fever' when nothing ticked |
| Result shows real case (deck 07) | Yes | ScreeningResult.tsx prints t.priority / t.why / t.facts from locale: always "PRIORITY: HIGH, fever over 2 days, test positive" |
| Case identity (deck 04, 13) | Yes | (evidence text was lost when this file was recreated; see Phase 2) |
| 01 Role | Partly | Role descriptions exist; no Continue, privacy note, or "demo, not a real sign-in" wording |
| 02 Home | Yes | No last-sync time or pending count; no "as of"; no age of delay |
| 03 Visits | Yes | No complete action, outcome, worker or timestamp; no village grouping |
| 04 Patient | Yes | Only name/age checks; no duplicate warning, DOB, household, consent |
| 05 Symptoms | Yes | No onset/duration, severity or review step |
| 06 Test/photo | Partly | Quality chips are computed from the image; no test type, capture time, operator or manual-result fallback |
| 07 Result | Yes | See above; no deadline or destination shown |
| 08 Consult | Partly | 4 h countdown and Late exist; no escalate action, no facility, no "next owner" |
| 09 Referral | Yes | No appointment, transport or follow-up date; UI outcomes (escalated/unresolved) differ from store outcomes (completed/rescheduled/refused) |
| 10 Doctor inbox | Partly | Sorted by waiting minutes only; no visible rule or reason; no urgency filter |
| 11 Doctor review | Partly | Reply is one-shot and read-only; no addendum or audit; doctorName falls back to hard-coded 'Dr. Rao'; doctorRead only agree/disagree (no 'not verified', no photo request) |
| 12 Supervisor | Yes | Call/Remind/Escalate only show a toast and record nothing; no village/worker coverage; names shown in rows |
| 13 Timeline | Yes | Actor list comes from locale (t.by[i]); no source, synced or edited flag |
| 14 Alerts | Yes | Only readAt; no trigger, owner, expiry, acknowledge or resolve; types: doctor_replied / overdue / followup |
| 15 Profile | Yes | No last-sync time, assigned block or logout; names hard-coded in Profile.tsx |
| P1 sync idempotency | Yes | No processedActionIds in the store |

## Phase 1: Remove invented and hard-coded clinical content [MUST]

Goal: the Symptoms and Result screens show only what the Mitanin actually entered and what the rules compute.
Files: src/screens/ScreeningSymptoms.tsx, src/screens/ScreeningResult.tsx, src/domain/priority.ts (read, reuse), src/i18n/en.json, hi.json, tests.

Symptoms: remove the default text and the default 'fever' flag. Next stays disabled until the Mitanin ticks at least one sign OR taps a new option "None of these signs". Store exactly what was chosen (an empty selection is allowed only through "None of these signs").

Result: read the current case from the store by caseId. Compute priority with the existing priority() / hasDangerSigns(). Show:
- "What was measured": ticked signs and test result (or "No test done").
- "Why this priority": a sentence built from the real reason (danger signs, positive test, no test).
- "Suggested action": from the rule. Keep the existing "Guideline rule, not a diagnosis" line.

Delete t.priority, t.why, t.facts, t.action usage that is static. Remove those locale keys only if nothing else uses them; keep key parity.
If the case is missing, show the States component 'Case not found' with a button to Home.

Tests: (a) no ticks without "None of these signs" blocks Next; (b) Result for a patient with danger signs shows HIGH and names the real signs; (c) Result for a patient with no danger signs and negative test does not say HIGH; (d) no static Ramesh text appears for another patient.

## Phase 2: Case identity (remove p1 / c1 fallbacks) [MUST]

Goal: a reply, photo, referral or alert can only ever act on the case named by its caseId.
Files: src/store/CaseStore.tsx, src/screens/* that contain || 'p1', 'c1' or c-${patientId}, tests.

- Search src for 'p1', 'c1', c-${. No code may reference them directly (seed data and tests excepted).
- Case id is generated per screening in the action creator (for example c- + short unique id). One patient can have several cases. Existing seed ids stay.
- currentScreening holds { patientId, caseId }. Every screen reads caseId from the store. Missing or unknown caseId -> States 'Case not found' + button to Home. Never fall back to another case. Never create a case silently.
- Capture caseId when an action starts (reply, ask doctor, referral event, photo) and send it with the action.
- Alerts open the case in alert.caseId.
- Add processedActionIds (persisted, capped at 500) so a queued action applies once; syncing twice changes nothing.
- Migrate old saved state; on failure reset to seed with the one-time message.

Tests: reply to Anita Markam creates one alert and none for Anita Netam (add both patients to the seed if missing); screening the same patient twice makes two cases; unknown caseId creates nothing; double sync applies once; a grep test that no non-test file contains 'p1' or 'c1'.

## Phase 3: Honest demo, role and profile [MUST]

Goal: nobody can mistake the demo for a real clinical system.
Files: RoleSelect.tsx, Profile.tsx, App.tsx (shell chip only), en.json, hi.json.

- RoleSelect: add a Continue button after a role is chosen (roles become selectable cards; Continue is the one primary action). Add one line: "Demo only. Choosing a role is not a sign-in." Add a short privacy line: "Fictional data. No real patient information."
- A small persistent "Demo data" tag in the app shell on every screen (reuse the existing tag style if one exists).
- Profile: take the person's name and role from the current role profile in the store, not hard-coded strings. Add rows "Assigned area (demo)" and "Last sent to server: <time from demo clock, or 'Never'>". Replace any "Log out" idea with the existing "Change role". Label connectivity "Simulated".
- Dashboard counts (Home and Supervisor) get a small caption: "Demo data, as of <time from the demo clock>".

Tests: Continue disabled until a role is chosen; demo tag visible on every route; no hard-coded person names in Profile.tsx (grep).

## Phase 4: Patient selection safety [SHOULD]

Goal: a screening cannot start on an ambiguous or duplicate patient.
Files: ScreeningPatient.tsx, src/domain/patientValidation.ts, store (add patient action fields only), en/hi, tests.

- New-patient form adds: year of birth or exact age (keep age), household / head of household (optional text), and a required consent checkbox "The patient or family agrees to this screening".
- Before saving, check existing patients for same name (case-insensitive, trimmed) in the same village with age within 1 year. If found, show "Possible duplicate" with those patients (name, age, village) and two buttons: "Use this patient" (primary) and "Add as new anyway".
- Every list row shows name, age and village.
- A patient code shown on the row (for example MS-P-0007, generated in the action creator).

Tests: duplicate detected; "Use this patient" selects the existing one; consent required; two same-first-name patients in different villages are not flagged.

## Phase 5: Symptom detail [SHOULD]

Goal: capture how long and how bad, and separate danger signs.
Files: ScreeningSymptoms.tsx, CaseStore.tsx (CaseRecord fields), ScreeningResult.tsx (display only), en/hi, tests.

- Add "How many days?" (Today, 1, 2, 3 or more) and "How bad?" (Mild, Moderate, Severe), both required when any sign is ticked.
- Group the signs visually: "Danger signs" (unable to drink or feed, convulsions, very weak or sleepy, pale palms) and "Other signs".
- Store onsetDays and severity on the case. Result shows them under "What was measured".
- Add a one-line "Check your answers" summary above Next (no new route).

Tests: required fields block Next; stored values appear on Result.

## Phase 6: Test photo detail and manual fallback [SHOULD]

Goal: every test result says how it was captured.
Files: TestPhoto.tsx, CaseStore.tsx (case fields), DoctorReview.tsx (display only), en/hi, tests.

- Add "Test kit" select (Malaria RDT, Other) and record capturedAt (demo clock) and operator (current Mitanin name from the store).
- If quality chips fail (not sharp or poor light), show "Photo may be unclear. Retake?" with Retake as the primary button; allow "Use anyway".
- Add "Enter result without photo" (manual): the Mitanin picks Positive/Negative/Invalid, the case is marked "No photo", and the doctor sees "Mitanin read (no photo)".
- Add the line "The photo is not a diagnosis. A doctor will check it." under the result choice.

Tests: manual result saves with no photo; capture time and operator saved; unclear photo shows the retake prompt.

## Phase 7: Consult loop [SHOULD]

Goal: "requested" is never mistaken for "reviewed".
Files: ConsultStatus.tsx, CaseStore.tsx, Alerts.tsx (new alert type only), en/hi, tests.

- Steps show: Sent, Doctor received, Doctor replied, each with a time or "Waiting". Show doctor name and facility ("District hospital", from the consult record) once known; before that show "Not yet assigned".
- Show "Waiting <time>", "Last update <time>" and "Next: Dr. waits for reply / You act on reply".
- When late (past 4 h), show a primary button "Escalate to supervisor". It records escalatedAt on the consult and creates ONE alert for the supervisor (deterministic id). A second tap does nothing and shows "Already escalated".

Tests: escalate only when late; exactly one alert; second tap ignored; offline escalate goes to the sync queue and applies once.

## Phase 8: Referral loop [SHOULD]

Goal: a referral is not "done" until attendance and outcome are recorded.
Files: ReferralTracker.tsx, CaseStore.tsx (ReferralRecord fields and outcome type), en/hi, tests.

- Align outcome values: one shared type used by UI and store (completed, rescheduled, not_reached, refused). Migrate old values.
- Add fields: appointment date, transport needed (yes/no) and a transport barrier note, follow-up owner and follow-up date.
- "Mark reached facility" and "Record outcome" stay separate steps; closing without an outcome is blocked.
- Facility comes from the referral record, not a fixed string.

Tests: outcome type matches in UI and store; cannot close without outcome; old saved outcomes migrate.

## Phase 9: Doctor inbox [SHOULD]

Goal: the queue order has a visible rule and reason.
Files: DoctorInbox.tsx, DoctorCasesTable.tsx, DoctorSplitLayout.tsx (inbox part only), en/hi, tests.

- Sort by priority() rank first (danger signs), then waiting time. Show the rule in one line: "Order: danger signs first, then longest wait."
- Each row shows the reason chip ("Danger sign: unable to drink" / "Positive test" / "Waiting over 4 hours") and waiting time.
- Filters: All, Danger signs, Waiting over 2 hours, Has photo, No photo.

Tests: danger-sign case ranks above a longer-waiting routine case; reason chip matches the data.

## Phase 10: Doctor review, attribution and no-photo path [SHOULD]

Goal: advice is attributed and never silently overwritten; no-photo cases have a way forward.
Files: DoctorReview.tsx, DoctorSplitLayout.tsx (review part only), CaseStore.tsx, en/hi, tests.

- Show "Reviewed by <doctor name> at <time>". Doctor name comes from the current profile; remove the 'Dr. Rao' fallback.
- After a reply, show it read-only. Add "Add a follow-up note" that creates an addendum (new entry with its own time). The first advice is never edited.
- doctorRead can be agree, disagree or not_verified. not_verified is allowed only when the case has no photo. No-photo cases get two enabled buttons: "Ask Mitanin for photo" (once; one alert to the Mitanin) and "Reply without photo".
- Add an optional free-text field "Allergies or medicines to avoid" shown to the Mitanin with the advice.

Tests: addendum keeps the original; not_verified rejected when a photo exists; photo request creates one alert; second tap creates none.

## Phase 11: Supervisor dashboard [SHOULD]

Goal: the supervisor acts on real data and sees less personal detail by default.
Files: SupervisorDashboard.tsx, SupervisorCasesTable.tsx, CaseStore.tsx, en/hi, tests.

- Call / Remind / Escalate record an action (who, when, caseId) in the store and show it on the row; no action is only a toast.
- Escalate asks for an owner (Mitanin / doctor / block officer) and a due date; both saved.
- Overdue rows show "Late by <days>" and the reason.
- Add "Coverage": a small table by village and by Mitanin: cases, late, closed. Counts only.
- Rows show patient initials and village by default; a "Show names" toggle (demo) reveals full names.

Tests: each action saves one record; escalation needs owner and due date; names hidden by default.

## Phase 12: Case timeline provenance [SHOULD]

Goal: every timeline entry shows who, when and where it came from.
Files: CaseTimeline.tsx, CaseStore.tsx (event records), en/hi, tests.

- Build events from the store (screening, consult, reply, referral events, outcome); remove the static t.by[i] actor list and any static detail rows.
- Each entry: actor and role, event time, recorded time (if different), source ("This phone", "Doctor device", "Demo data") and a "Waiting to send" or "Sent" tag.
- Show "Next step" and who owns it at the top.

Tests: events carry actor and source; offline entry shows "Waiting to send" until synced.

## Phase 13: Alerts that can be acted on [SHOULD]

Goal: each alert says why, who owns it and when it ends.
Files: Alerts.tsx, CaseStore.tsx (AlertRecord fields), en/hi, tests.

- Add fields: trigger text, owner, deadline, expiresAt, status (open, acknowledged, resolved).
- Group by what to do: "Act now", "Waiting on others", "Done". Patient-level alerts only (no environmental alerts exist yet; do not invent them).
- Buttons: Acknowledge, Resolve (resolved alerts move to Done and stop counting in the badge).
- Expired alerts leave the badge count and show "Expired".

Tests: acknowledge and resolve change status once; badge excludes resolved and expired; ids stay deterministic.

## Phase 14: Home and Visits [SHOULD]

Goal: the Mitanin's day is actionable and auditable.
Files: MitaninHome.tsx, Visits.tsx, CaseStore.tsx (visit records), en/hi, tests.

- Home: one primary button (New screening); below it, three shortcuts: "Start visit", "Follow-ups due", "Late referrals", each with a real count. Add "Last sent <time> · <n> waiting to send".
- Late items show age: "Late 2 days".
- Visits: group by village; each visit has "Complete visit". It records outcome (Done, Not home, Refused), completedAt (demo clock), worker and next follow-up date. Completed visits show these.

Tests: completing a visit saves outcome, time and worker; counts equal store data.

## Phase 15: Offline queue and sync status [LATER]

Goal: the Mitanin always knows what has and has not been sent.
Files: Profile.tsx, App.tsx (status chip), CaseStore.tsx, States.tsx, en/hi, tests.

- Status chip shows last-sent time and waiting count.
- A failed or interrupted sync keeps items queued and shows "Could not send. Tap to try again."
- Profile lists queued actions with readable labels.

Tests: failed sync keeps the queue; retry applies once.

## Phase 16: Device check [LATER]

Goal: confirm nothing visual or functional broke.

- npm install, npm run validate, npm run build, npm test.
- With Playwright: every route at 360 and 390 px (English; Hindi for Mitanin routes), and Doctor and Supervisor at 1280 px. Check: no horizontal scroll, last button not under the bottom nav, no text 'NaN', 'Invalid Date', 'undefined'.
- Run the Ramesh story and the two-patient story (Anita Markam vs Anita Netam) end to end.
- Save screenshots to /visual-final and report. Fix only layout problems; report logic problems instead.

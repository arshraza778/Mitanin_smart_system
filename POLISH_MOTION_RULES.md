# POLISH_MOTION_RULES.md: professional polish and entrance animations (read fully, then do ONLY the stage you are asked to do)

Applies to the existing 'Mitanin Signal' app (Vite + React + TypeScript, plain CSS, NO Tailwind, state in src/store/CaseStore.tsx). Fictional demo data only.
All rules in RESTYLE_RULES.md sections 1 to 4 (hard rules, palette with NO orange, dark background = light text, exceptions) and the layout rules in WEB_RULES.md ALSO apply.
Run this AFTER the restyle and web stages, because it touches every screen. If those are not finished, say so and stop.
After each stage: run `npm run validate`, `npm run build`, `npm test`, commit, STOP and report. Never start the next stage unless asked.

---

## 1. Hard rules

- Visual polish and motion only. Do not change props, routes, CaseStore, domain functions, data, i18n keys, wording or tests. If text looks inconsistent (capitalisation, punctuation), list it in the report; do not change it.
- No new dependencies. No animation library (no motion, framer-motion, GSAP, lottie, AOS, anime). Use CSS plus small React hooks written in the project.
- Palette only (RESTYLE_RULES section 2). No orange. No new colours for animation.
- If something cannot be done without a logic change, keep behaviour identical, use the nearest simple option and list it.

## 2. Stage P1: professional polish (no animation yet)

1. **Spacing scale**: 4, 8, 12, 16, 24, 32, 48 px as CSS variables. Replace one-off paddings and gaps with these. Card padding 16 (phone) and 20 to 24 (web). Consistent gaps between sections.
2. **Type scale**: page title 24/32 bold; section title 18/24 semibold; body 16/24 (web doctor and supervisor 14/20); label 14/20 medium; caption 12/16. Use `font-variant-numeric: tabular-nums` on every number (KPIs, counts, times, ages) so digits do not jump. Max 2 font weights per screen region.
3. **Icons**: one size per context (20 px inline, 24 px in buttons and nav), one stroke width (1.75), aligned to the text baseline, same icon family only.
4. **Elevation**: two levels only (card: the existing 1px border plus 0 1px 3px rgba(5,31,32,.05); overlay: 0 8px 24px rgba(5,31,32,.12)). Remove decorative leaves, blobs, large gradients and heavy shadows. A subtle gradient is allowed only on the main dark header.
5. **Hierarchy**: one primary action per view; secondary actions outlined; tertiary as text links. Consistent button heights (56 px phone, 44 px web), consistent radii (8 buttons and inputs, 12 to 16 cards, pill for status).
6. **States**: every interactive element has hover (only under `@media (hover: hover)`), focus-visible, pressed, disabled and loading states, with readable text on dark and light surfaces.
7. **Empty, loading and error states** use the shared States component with plain text and one action; where a screen shows loading, use a skeleton block (no spinner on top of content).
8. **Structure and accessibility**: semantic landmarks (header, nav, main, aside), one h1 per screen, h2 for sections, `aria-label` on icon-only buttons, `aria-current` on the active nav item, `document.title` set per screen ("Home - Mitanin Signal"), `lang` attribute switching between en and hi.
9. **Finish**: thin subtle scrollbars on web (scrollbar-width: thin, track transparent, thumb #CCD9D2), `cursor: pointer` on clickable items, `object-fit` on images, reserved image and card heights so nothing shifts when content loads (no layout shift), text truncation with ellipsis plus title attribute where height is fixed, consistent date and time formats, no `console.log` left in src.
10. Keep the "Demo data" tag visible but quiet (small pill, muted colours from the palette).
Stop and report with before and after screenshots of Mitanin Home, Doctor review, Supervisor overview.

## 3. Stage P2: entrance animations and motion

### 3.1 Motion system (create once, reuse everywhere)
- Files: `src/motion/motion.css`, `src/motion/useReveal.ts`, `src/motion/useCountUp.ts`, `src/motion/CountUp.tsx`, `src/motion/Reveal.tsx`.
- Tokens: `--ms-ease-out: cubic-bezier(0.2, 0, 0, 1)`, `--ms-ease-in: cubic-bezier(0.4, 0, 1, 1)`, durations 120 ms (micro), 220 ms (enter), 320 ms (large panels), 800 ms (numbers and rings).
- ONLY animate `transform`, `opacity` and SVG `stroke-dashoffset`. Never animate width, height, top, left, margin, box-shadow, filter or blur. No `will-change` except on elements while they are animating.
- Disable everything when ANY of these is true: `prefers-reduced-motion: reduce`; URL contains `?noanim=1`; `navigator.webdriver` is true (so Playwright screenshots and tests are stable). Implement this once as `data-motion="off"` on `<html>` and make motion.css respect it. In that mode every element renders in its final state immediately.

### 3.2 What animates (and how)
| Element | Animation |
|---|---|
| Route and screen change | New screen fades in and rises 8 px: 220 ms, ease-out. No exit animation (avoid double rendering). |
| Page titles and section headings | Fade plus 8 px rise, 220 ms. Body paragraphs and long text do NOT animate. |
| Cards and list rows (Needs attention, visits, case list, alerts, table rows up to 8) | Fade plus 12 px rise, stagger 40 ms per item, maximum 8 items staggered; later items appear instantly. Total entrance under 600 ms. |
| Numbers (KPI counts, Loop Closure Rate, badges, counts like "Cases waiting 11") | Count up from 0 to the real value in 800 ms with ease-out on first appearance; when a value later changes, animate from the old to the new value in 400 ms; equal values never animate. Use `<CountUp value format />`. |
| Progress ring (Loop Closure Rate, countdown ring) | Stroke draws from 0 to the value, 800 ms. The countdown's remaining time text is NOT animated. |
| Step bar and timelines (screening steps, consult and case timelines, referral tracker) | Steps reveal in order, stagger 60 ms; the line fills with `transform: scaleX/scaleY`, 300 ms. |
| Master-detail panel (doctor review, supervisor detail, alerts) | When the selected row changes, the right panel cross-fades 150 ms. No movement. |
| Alerts badge | Pops (scale 0.8, 1.1, 1) 200 ms only when the count increases. |
| Status chip | While syncing, a small icon rotates; it stops when done. No other infinite animation anywhere. |
| Toasts and banners | Slide up 12 px plus fade, 240 ms in, 160 ms out. |
| Photo zoom viewer | Fade plus scale 0.96 to 1, 200 ms; scrim fades 160 ms. |
| Buttons and tappable cards | Pressed: scale 0.98 for 80 ms. Hover lift only under `@media (hover: hover)`, 1 px translateY, 120 ms. |
| Skeletons | A gentle shimmer (transform on a pseudo-element), 1.4 s loop, only while loading. |

### 3.3 Never do
- No bounce, elastic, spring overshoot beyond the badge pop, no parallax, no auto-playing carousel, no flashing or pulsing, and NO animation on the Late status or any safety message (it must be steady and instantly visible).
- No infinite animations except the sync icon and skeleton shimmer.
- No re-animating on every store update or re-render: entrance animations run once per mount of a screen or list item; adding one item to a list animates only that item.

### 3.4 Number components (exceptions that matter)
- `CountUp` renders the final value in the DOM at once inside a visually hidden span (for screen readers and tests) and shows the animated value in an `aria-hidden` span. Never leave a wrong number on screen: the animation always ends on the exact value, including after a quick unmount or a value change mid-animation.
- Handle: value 0, null or undefined (show "--"), NaN, negative, very large numbers, percentages (never above 100), decimals, tabular-nums so digits do not jump, a value that changes while animating (continue from the current displayed value), React StrictMode double mount (one animation only), unmount while running (cancel requestAnimationFrame, no state update after unmount), tab hidden (jump to the final value), many counters at once (share one requestAnimationFrame loop).
- Hindi mode keeps the same digits as the rest of the app; do not change number formatting.

### 3.5 Performance on low-end phones
- Run with Chrome DevTools CPU throttling 4x via Playwright (CDP): no long task above 50 ms during an entrance; if there is one, reduce the stagger count or the animated items.
- Animate at most 12 elements at the same time; use `IntersectionObserver` (threshold 0.1, once) for items below the fold so they animate when they scroll into view, and unobserve afterwards.
- Offline: motion must work offline with no external file.

## 4. Stage P3: verify
With Playwright (with `?noanim=1` for stable screenshots and without it for motion checks):
1. Every route and role in Phone and Web at 390 px and 1280 px renders correctly with motion off, with reduced motion emulated, and with motion on after waiting 1.2 s; the three states must show the same final content.
2. Numbers: every KPI and count ends at the exact store value; text content of the hidden span equals the value at t=0; no "NaN" or "undefined".
3. No layout shift: capture the layout before and after the entrance and assert main elements do not move more than 1 px.
4. No horizontal scrollbar, nothing under the bottom nav, no text under 12 px, palette and contrast tests still pass.
5. Only transform, opacity and stroke-dashoffset animate (grep test on src/motion and all CSS for animated properties; fail on anything else); the only `infinite` animations are the sync icon and the skeleton.
6. The Late status has no animation.
7. 4x CPU throttle: report long tasks during route changes and entrance.
8. Switch route 20 times quickly and change the selected case 20 times: no stuck half-visible elements, no console errors, no memory growth warnings.
9. Run Ramesh's full story (Reset, screen, ask doctor, reply as doctor, send to hospital, outcome) with motion on, then with motion off, and assert every step works in both.
10. Unit tests (vitest): CountUp ends on exact value, handles null, 0, 100 percent cap, mid-animation change, unmount cancel, StrictMode; reduced-motion and noanim paths show the final value immediately.
Save screenshots to /visual-polish and a short screen recording or frame strip of Home, Supervisor overview and Doctor review entering, if Playwright video works.

## 5. Exceptions (handle all; never skip silently)
- Slow phones, hidden tab, rapid navigation, window resize during an animation, language switch mid-animation, Reset demo data mid-animation, offline mode, empty lists (no stagger errors), 100+ items (only the first 8 stagger, no jank), photos that fail to load (placeholder, no flash), prefers-reduced-motion, forced-colors and OS dark mode (stay readable), Playwright and test runs (motion off).
- Safety stop: if a stage breaks Ramesh's story or a previously passing test, revert that stage with git restore, report exactly what broke, and stop. Never claim OK for anything you did not capture or test.

## 6. Report format (after every stage)
- Table: role, screen, width, motion mode (off / reduced / on), result (OK / CHANGED / PROBLEM), one line each.
- Pre-existing failures versus new ones; checks skipped and why.
- Files created and changed; anything changed that was not requested; text inconsistencies found but not changed.

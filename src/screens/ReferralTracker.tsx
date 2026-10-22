import { useEffect, useRef, useState } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';

type Outcome = 'completed' | 'rescheduled' | 'escalated' | 'unresolved';

const COPY = { en: enLocale.screens.ReferralTracker, hi: hiLocale.screens.ReferralTracker } as const;

const OUTCOME_STYLE: Record<Outcome, { bg: string; glyph: string }> = {
  completed: { bg: 'var(--ms-green-500)', glyph: '✓' },
  rescheduled: { bg: 'var(--ms-violet)', glyph: '↻' },
  escalated: { bg: 'var(--ms-orange)', glyph: '↑' },
  unresolved: { bg: 'var(--ms-muted)', glyph: '?' },
};

const DEMO_MS_LEFT = (19 * 60 + 20) * 60_000;

const icon = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const ACTION_ICONS = [
  // voice message
  <svg key="v" {...icon}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
  </svg>,
  // reached
  <svg key="r" {...icon}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <path d="m9.3 10 2 2 3.4-3.8" />
  </svg>,
  // outcome
  <svg key="o" {...icon}>
    <rect x="5" y="4" width="14" height="17" rx="2.5" />
    <path d="M9 3v3M15 3v3M8.5 12l2.5 2.5 4.5-5" />
  </svg>,
];

export default function ReferralTracker({ lang }: ScreenProps) {
  const t = COPY[lang];
  const referral = dataService.getReferrals()[0];
  const referralValues = [dataService.getPatientSummary(referral.patientId, lang), referral.facility[lang], referral.owner[lang], t.dueWithin];
  const [stage, setStage] = useState(1); // steps completed, 1..4
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [sheet, setSheet] = useState(false);
  const [pick, setPick] = useState<Outcome | null>(null);
  const [note, setNote] = useState('');
  const deadline = useRef(Date.now() + DEMO_MS_LEFT);
  const [now, setNow] = useState(() => Date.now());
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!sheet) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  const msLeft = Math.max(0, deadline.current - now);
  const h = Math.floor(msLeft / 3_600_000);
  const m = Math.floor((msLeft % 3_600_000) / 60_000);

  const advance = (to: number) => setStage((s) => Math.max(s, to));
  const saveOutcome = () => {
    if (!pick) return;
    setOutcome(pick);
    setStage(4);
    setSheet(false);
  };

  // Action state: reminder, reached, outcome.
  const doneFlags = [stage >= 2, stage >= 3, stage >= 4];
  const nextIdx = doneFlags.findIndex((d) => !d);
  const handlers = [() => advance(2), () => advance(3), () => { setPick(outcome); setSheet(true); }];

  const pill = (() => {
    if (stage === 4 && outcome) {
      const s = outcome === 'completed' ? ['var(--ms-green-100)', 'var(--ms-green-700)'] : outcome === 'rescheduled' ? ['var(--ms-violet-100)', 'var(--ms-violet-700)'] : ['var(--ms-orange-100)', 'var(--ms-orange-700)'];
      return { text: t.outcomes[outcome], bg: s[0], fg: s[1] };
    }
    const colors = [
      ['var(--ms-orange-100)', 'var(--ms-orange-700)'],
      ['var(--ms-violet-100)', 'var(--ms-violet-700)'],
      ['var(--ms-green-100)', 'var(--ms-green-700)'],
    ][Math.min(stage, 3) - 1];
    return { text: t.steps[stage - 1], bg: colors[0], fg: colors[1] };
  })();

  return (
    <div>
      <header
        style={{
          background: 'var(--ms-green-700)',
          color: '#fff',
          borderRadius: '0 0 32px 32px',
          padding: 'calc(22px + env(safe-area-inset-top, 0px)) 20px 26px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>{t.title}</h1>
      </header>

      <section style={{ padding: '18px 20px 0', display: 'grid', gap: 16 }}>
        <div
          style={{
            padding: 18,
            borderRadius: 24,
            background: 'var(--ms-surface)',
            boxShadow: '0 4px 16px rgba(31, 77, 56, 0.07)',
          }}
        >
          <dl style={{ margin: 0, display: 'grid', gap: 12 }}>
            {t.rows.map((label, i) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                <dt style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ms-muted)' }}>{label}</dt>
                <dd style={{ margin: 0, textAlign: 'right', fontSize: 16, fontWeight: 800 }}>
                  {referralValues[i]}
                  {i === 3 && (
                    <span style={{ display: 'block', marginTop: 2, fontSize: 13.5, fontWeight: 700, color: stage >= 3 ? 'var(--ms-green-700)' : 'var(--ms-orange)' }}>
                      {stage >= 3 ? t.done : lang === 'hi' ? `${h} ${t.hourUnit} ${m} ${t.minuteUnit} ${t.leftSuffix}` : `${h} ${t.hourUnit} ${m} ${t.minuteUnit} ${t.leftSuffix}`}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <span
            style={{
              display: 'inline-block',
              marginTop: 16,
              padding: '5px 14px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
              background: pill.bg,
              color: pill.fg,
            }}
          >
            {pill.text}
          </span>
        </div>

        <ol
          aria-label={t.trackerLabel}
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '16px 8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderRadius: 24,
            background: 'var(--ms-surface)',
            boxShadow: '0 4px 16px rgba(31, 77, 56, 0.07)',
          }}
        >
          {t.steps.map((label, i) => {
            const done = i < stage;
            return (
              <li
                key={label}
                aria-current={i === stage - 1 ? 'step' : undefined}
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
              >
                {i > 0 && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: '50%',
                      width: '100%',
                      height: 3,
                      borderRadius: 2,
                      background: done ? 'var(--ms-green-500)' : '#d6ddd8',
                    }}
                  />
                )}
                <span
                  aria-hidden
                  style={{
                    position: 'relative',
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: done ? 'var(--ms-green-500)' : 'var(--ms-surface)',
                    border: done ? 0 : '2.5px dashed #b9c4bd',
                    color: '#fff',
                  }}
                >
                  {done && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </span>
                <span style={{ marginTop: 8, padding: '0 2px', fontSize: 12, lineHeight: 1.25, fontWeight: i === stage - 1 ? 800 : 600, color: done ? 'var(--ms-ink)' : 'var(--ms-muted)' }}>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        <div style={{ display: 'grid', gap: 10 }}>
          {t.actions.map((label, i) => {
            const done = doneFlags[i];
            const primary = i === nextIdx;
            return (
              <button
                key={label}
                type="button"
                disabled={done}
                onClick={handlers[i]}
                style={{
                  minHeight: 60,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '0 18px',
                  textAlign: 'left',
                  borderRadius: 20,
                  cursor: done ? 'default' : 'pointer',
                  fontSize: 17,
                  fontWeight: 800,
                  border: primary ? 0 : `2px solid ${done ? '#e3e9e5' : 'var(--ms-green-500)'}`,
                  background: primary ? 'var(--ms-orange)' : 'var(--ms-surface)',
                  color: primary ? '#fff' : done ? '#9aa7a0' : 'var(--ms-green-700)',
                  boxShadow: primary ? '0 10px 22px rgba(240, 121, 75, 0.35)' : 'none',
                }}
              >
                {ACTION_ICONS[i]}
                <span style={{ flex: 1 }}>{label}</span>
                {done && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {sheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }}>
          <div
            onClick={() => setSheet(false)}
            aria-hidden
            style={{ position: 'absolute', inset: 0, background: 'rgba(10, 30, 20, 0.5)' }}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t.sheetTitle}
            tabIndex={-1}
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 0,
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: 430,
              maxHeight: '92dvh',
              overflowY: 'auto',
              padding: '12px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
              borderRadius: '32px 32px 0 0',
              background: 'var(--ms-surface)',
              outline: 'none',
            }}
          >
            <span aria-hidden style={{ display: 'block', width: 44, height: 5, margin: '0 auto 14px', borderRadius: 3, background: '#d6ddd8' }} />
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{t.sheetTitle}</h2>

            <div role="radiogroup" aria-label={t.sheetTitle} style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(Object.keys(OUTCOME_STYLE) as Outcome[]).map((key) => {
                const on = pick === key;
                const st = OUTCOME_STYLE[key];
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPick(key)}
                    style={{
                      minHeight: 84,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '10px 6px',
                      borderRadius: 20,
                      cursor: 'pointer',
                      fontSize: 16,
                      fontWeight: 800,
                      border: `2px solid ${on ? st.bg : '#e3e9e5'}`,
                      background: on ? st.bg : 'var(--ms-bg)',
                      color: on ? '#fff' : 'var(--ms-ink)',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 18,
                        lineHeight: 1,
                        background: on ? 'rgba(255,255,255,0.28)' : st.bg,
                        color: '#fff',
                      }}
                    >
                      {st.glyph}
                    </span>
                    {t.outcomes[key]}
                  </button>
                );
              })}
            </div>

            <label style={{ display: 'block', marginTop: 16 }}>
              <span style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 700 }}>{t.note}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.notePlaceholder}
                rows={3}
                style={{
                  width: '100%',
                  resize: 'none',
                  padding: '12px 14px',
                  borderRadius: 16,
                  border: '2px solid #e3e9e5',
                  font: 'inherit',
                  fontSize: 16,
                  color: 'var(--ms-ink)',
                  background: 'var(--ms-surface)',
                }}
              />
            </label>

            <button
              type="button"
              disabled={!pick}
              onClick={saveOutcome}
              style={{
                marginTop: 16,
                width: '100%',
                height: 60,
                border: 0,
                borderRadius: 20,
                cursor: pick ? 'pointer' : 'default',
                fontSize: 18,
                fontWeight: 800,
                background: pick ? 'var(--ms-orange)' : '#e3e9e5',
                color: pick ? '#fff' : '#9aa7a0',
              }}
            >
              {t.save}
            </button>
            <button
              type="button"
              onClick={() => setSheet(false)}
              style={{
                display: 'block',
                margin: '6px auto 0',
                padding: '12px 16px',
                border: 0,
                background: 'none',
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 800,
                color: 'var(--ms-green-700)',
              }}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

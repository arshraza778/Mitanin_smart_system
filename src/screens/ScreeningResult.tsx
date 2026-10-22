import { useEffect, useRef, useState } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';

const STEP = 4;

const COPY = { en: enLocale.screens.ScreeningResult, hi: hiLocale.screens.ScreeningResult } as const;

export default function ScreeningResult({ lang, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const save = () => {
    if (saved) return;
    setSaved(true);
    // Leave the toast up long enough to read, then return to the home screen.
    timer.current = window.setTimeout(() => onNavigate('/mitanin/home'), 3200);
  };

  return (
    <div>
      <header
        style={{
          background: 'var(--ms-surface)',
          borderRadius: '0 0 32px 32px',
          padding: 'calc(20px + env(safe-area-inset-top, 0px)) 20px 20px',
        }}
      >
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={STEP}
          aria-valuetext={`${t.stepOf}: ${t.steps[STEP - 1]}`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {t.steps.map((_, i) => (
              <span
                key={i}
                style={{ height: 8, borderRadius: 4, background: i < STEP ? 'var(--ms-orange)' : 'var(--ms-green-100)' }}
              />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
            {t.steps.map((label, i) => (
              <span
                key={label}
                style={{
                  fontSize: 12.5,
                  fontWeight: i === STEP - 1 ? 800 : 600,
                  color: i === STEP - 1 ? 'var(--ms-ink)' : 'var(--ms-muted)',
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18, padding: '14px', borderRadius: 20, background: 'var(--ms-green-100)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              aria-hidden
              style={{
                flex: '0 0 44px',
                height: 44,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--ms-green-500)',
                color: '#fff',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
                <circle cx="12" cy="8" r="3.6" />
                <path d="M5 20a7 7 0 0 1 14 0" />
              </svg>
            </span>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{dataService.getPatientSummary('p1', lang)}</p>
          </div>
          <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {t.facts.map((f) => (
              <li
                key={f}
                style={{
                  padding: '5px 12px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  background: 'var(--ms-surface)',
                  color: 'var(--ms-green-900)',
                }}
              >
                {f}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <section style={{ padding: '20px 20px 0', display: 'grid', gap: 14 }}>
        <div
          style={{
            padding: 18,
            borderRadius: 24,
            background: 'var(--ms-surface)',
            boxShadow: '0 4px 16px rgba(31, 77, 56, 0.07)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: '0.02em',
              background: 'var(--ms-orange)',
              color: '#fff',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3.5 2.8 19.5h18.4z" />
              <path d="M12 10v4.5M12 17.2v.1" />
            </svg>
            {t.priority}
          </span>
          <p style={{ margin: '12px 2px 0', fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>{t.why}</p>
        </div>

        <div style={{ padding: 18, borderRadius: 24, background: 'var(--ms-green-500)', color: '#fff' }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, opacity: 0.92 }}>{t.actionLabel}</p>
          <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, lineHeight: 1.25 }}>{t.action}</p>
          <span
            style={{
              marginTop: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              background: 'rgba(255,255,255,0.25)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5.5M12 7.6v.1" />
            </svg>
            {t.rule}
          </span>
        </div>
      </section>

      <div
        style={{
          position: 'sticky',
          bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
          marginTop: 18,
          padding: '14px 20px 6px',
          display: 'grid',
          gap: 8,
          background: 'linear-gradient(to top, var(--ms-bg) 70%, rgba(246,248,245,0))',
        }}
      >
        <button
          type="button"
          disabled={saved}
          onClick={() => onNavigate('/mitanin/consult')}
          style={{
            height: 62,
            border: 0,
            borderRadius: 22,
            cursor: saved ? 'default' : 'pointer',
            fontSize: 19,
            fontWeight: 800,
            background: saved ? '#e3e9e5' : 'var(--ms-orange)',
            color: saved ? '#9aa7a0' : '#fff',
            boxShadow: saved ? 'none' : '0 10px 22px rgba(240, 121, 75, 0.35)',
          }}
        >
          {t.ask}
        </button>
        <button
          type="button"
          disabled={saved}
          onClick={save}
          style={{
            height: 50,
            border: `2px solid ${saved ? '#e3e9e5' : 'var(--ms-green-500)'}`,
            borderRadius: 18,
            cursor: saved ? 'default' : 'pointer',
            fontSize: 16.5,
            fontWeight: 800,
            background: 'var(--ms-surface)',
            color: saved ? '#9aa7a0' : 'var(--ms-green-700)',
          }}
        >
          {t.save}
        </button>
      </div>

      {saved && (
        <div
          role="status"
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'calc(110px + env(safe-area-inset-bottom, 0px))',
            width: 'min(calc(100% - 40px), 390px)',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            borderRadius: 18,
            fontSize: 14.5,
            fontWeight: 700,
            lineHeight: 1.35,
            background: 'var(--ms-green-900)',
            color: '#fff',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25)',
          }}
        >
          <span
            aria-hidden
            style={{
              flex: '0 0 26px',
              height: 26,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'var(--ms-green-500)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </span>
          {t.toast}
        </div>
      )}
    </div>
  );
}

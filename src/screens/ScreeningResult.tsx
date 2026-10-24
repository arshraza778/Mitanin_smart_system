import { useEffect, useRef, useState } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';
import { useCaseStore } from '../store/CaseStore';

const STEP = 4;

const COPY = { en: enLocale.screens.ScreeningResult, hi: hiLocale.screens.ScreeningResult } as const;

export default function ScreeningResult({ lang, online = true, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const { updateScreening, requestConsult, currentScreening, getPatientSummary } = useCaseStore();
  const patientId = currentScreening?.patientId || 'p1';
  const caseId = patientId === 'p1' ? 'c1' : `c-${patientId}`;
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleAskDoctor = () => {
    updateScreening(
      {
        patientId,
        state: 'SCREENED',
      },
      online
    );
    requestConsult(caseId, patientId, online);
    onNavigate('/mitanin/consult');
  };

  const save = () => {
    if (saved) return;
    setSaved(true);
    updateScreening(
      {
        patientId,
        state: 'SCREENED',
      },
      online
    );
    timer.current = window.setTimeout(() => onNavigate('/mitanin/home'), 3200);
  };

  const renderResultContent = () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          padding: 20,
          borderRadius: 24,
          background: 'var(--ms-surface)',
          border: '1px solid var(--ms-border)',
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
        <p style={{ margin: '14px 2px 0', fontSize: 16, fontWeight: 600, lineHeight: 1.45, color: 'var(--ms-ink)' }}>{t.why}</p>
      </div>

      <div style={{ padding: 20, borderRadius: 24, background: 'var(--ms-green-500)', color: '#fff', boxShadow: '0 4px 16px rgba(43, 107, 82, 0.15)' }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, opacity: 0.92 }}>{t.actionLabel}</p>
        <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 800, lineHeight: 1.25 }}>{t.action}</p>
        <span
          style={{
            marginTop: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 999,
            fontSize: 12.5,
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

      <div style={{ marginTop: 8 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: 'var(--ms-muted)', textTransform: 'uppercase' }}>
          {lang === 'hi' ? 'जाँच तथ्य' : 'Key Findings'}
        </h3>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {t.facts.map((f) => (
            <li
              key={f}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                background: 'var(--ms-green-100)',
                color: 'var(--ms-green-900)',
              }}
            >
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div>
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
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
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{getPatientSummary(patientId, lang)}</p>
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
          {renderResultContent()}
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
            onClick={handleAskDoctor}
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
      </div>

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '32px 24px 48px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', gap: 32, alignItems: 'flex-start', justifyContent: 'center' }}>
          {/* Side Progress & Patient Card */}
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                background: 'var(--ms-surface)',
                borderRadius: 24,
                border: '1px solid var(--ms-border)',
                padding: '22px',
                boxShadow: 'var(--ms-shadow-card)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ms-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t.stepOf}
              </span>
              <h3 style={{ margin: '6px 0 16px', fontSize: 18, fontWeight: 800, color: 'var(--ms-ink)' }}>
                {t.steps[STEP - 1]}
              </h3>

              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 14 }}>
                {t.steps.map((label, i) => {
                  const isCurrent = i === STEP - 1;
                  const isDone = i < STEP - 1;
                  return (
                    <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 13,
                          fontWeight: 800,
                          background: isCurrent ? 'var(--ms-orange)' : isDone ? 'var(--ms-green-500)' : 'var(--ms-green-100)',
                          color: isCurrent || isDone ? '#fff' : 'var(--ms-green-700)',
                        }}
                      >
                        {isDone ? '✓' : i + 1}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: isCurrent ? 800 : 600, color: isCurrent ? 'var(--ms-ink)' : 'var(--ms-muted)' }}>
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Patient Info Card */}
            <div
              style={{
                background: 'var(--ms-green-100)',
                borderRadius: 24,
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--ms-green-500)',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <circle cx="12" cy="8" r="3.6" />
                  <path d="M5 20a7 7 0 0 1 14 0" />
                </svg>
              </span>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ms-green-900)' }}>
                {getPatientSummary(patientId, lang)}
              </p>
            </div>
          </div>

          {/* Centred Form Card up to about 640px */}
          <div
            style={{
              width: '100%',
              maxWidth: 640,
              background: 'var(--ms-surface)',
              borderRadius: 28,
              border: '1px solid var(--ms-border)',
              boxShadow: 'var(--ms-shadow-card)',
              padding: '32px 36px',
            }}
          >
            {renderResultContent()}

            <div style={{ marginTop: 28, display: 'grid', gap: 12, borderTop: '1px solid var(--ms-border)', paddingTop: 20 }}>
              <button
                type="button"
                disabled={saved}
                onClick={handleAskDoctor}
                style={{
                  height: 56,
                  border: 0,
                  borderRadius: 20,
                  cursor: saved ? 'default' : 'pointer',
                  fontSize: 17,
                  fontWeight: 800,
                  background: saved ? '#e3e9e5' : 'var(--ms-orange)',
                  color: saved ? '#9aa7a0' : '#fff',
                  boxShadow: saved ? 'none' : '0 8px 20px rgba(240, 121, 75, 0.35)',
                }}
              >
                {t.ask} →
              </button>
              <button
                type="button"
                disabled={saved}
                onClick={save}
                style={{
                  height: 48,
                  border: `2px solid ${saved ? '#e3e9e5' : 'var(--ms-green-500)'}`,
                  borderRadius: 18,
                  cursor: saved ? 'default' : 'pointer',
                  fontSize: 15.5,
                  fontWeight: 800,
                  background: 'var(--ms-surface)',
                  color: saved ? '#9aa7a0' : 'var(--ms-green-700)',
                }}
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
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

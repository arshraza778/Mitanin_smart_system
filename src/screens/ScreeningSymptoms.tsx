import { useEffect, useState, type ReactElement } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';
import { useCaseStore } from '../store/CaseStore';

const STEP = 2;

const COPY = { en: enLocale.screens.ScreeningSymptoms, hi: hiLocale.screens.ScreeningSymptoms } as const;

const s = {
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const ICONS: ReactElement[] = [
  <svg key="fever" {...s}>
    <path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z" />
    <path d="M12 9v7" />
  </svg>,
  <svg key="drink" {...s}>
    <path d="M6 4h12l-1.2 14a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8z" />
    <path d="M7 9h10" />
  </svg>,
  <svg key="fits" {...s}>
    <path d="M13 3 6 13h5l-1 8 8-11h-5z" />
  </svg>,
  <svg key="sleepy" {...s}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>,
  <svg key="palm" {...s}>
    <path d="M8 13V6a1.2 1.2 0 0 1 2.4 0v5M10.4 11V4.5a1.2 1.2 0 0 1 2.4 0V11M12.8 11V5.5a1.2 1.2 0 0 1 2.4 0V12M15.2 10a1.2 1.2 0 0 1 2.4 0v4.5A6 6 0 0 1 11.6 20h-.6a5 5 0 0 1-4-2l-2-3a1.3 1.3 0 0 1 2-1.6L8 14" />
  </svg>,
];

export default function ScreeningSymptoms({ lang, online = true, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const { updateScreening, getCaseByPatientId, currentScreening, getPatientSummary } = useCaseStore();
  const patientId = currentScreening?.patientId || 'p1';
  const existingCase = getCaseByPatientId(patientId);
  const [checked, setChecked] = useState<boolean[]>(() => {
    if (existingCase?.symptomFlags?.length) {
      const flags = ['fever', 'drink', 'fits', 'sleepy', 'palm'];
      return flags.map((f) => existingCase.symptomFlags?.includes(f) ?? false);
    }
    return t.items.map((_, i) => i === 0);
  });
  const [speaking, setSpeaking] = useState<number | null>(null);

  const handleNext = () => {
    const selectedEn = enLocale.screens.ScreeningSymptoms.items.filter((_, i) => checked[i]);
    const selectedHi = hiLocale.screens.ScreeningSymptoms.items.filter((_, i) => checked[i]);
    const flagNames = ['fever', 'drink', 'fits', 'sleepy', 'palm'];
    const selectedFlags = checked.map((c, i) => (c ? flagNames[i] : null)).filter(Boolean) as string[];
    const hasDanger = Boolean(checked[1] || checked[2] || checked[3] || checked[4]);

    updateScreening(
      {
        patientId,
        symptoms: {
          en: selectedEn.length ? selectedEn.join(', ') : 'Fever over 2 days, test positive',
          hi: selectedHi.length ? selectedHi.join(', ') : '2 दिन से ज़्यादा बुखार, जाँच पॉज़िटिव',
        },
        symptomFlags: selectedFlags.length ? selectedFlags : ['fever'],
        hasDangerSigns: hasDanger,
        state: 'SCREENED',
      },
      online
    );
    onNavigate('/mitanin/screening/test');
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);
  useEffect(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(null);
  }, [lang]);

  const toggle = (i: number) => setChecked((c) => c.map((v, j) => (j === i ? !v : v)));

  const speak = (i: number) => {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    if (speaking === i) {
      synth.cancel();
      setSpeaking(null);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(t.items[i]);
    u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    u.rate = 0.9;
    u.onend = () => setSpeaking((cur) => (cur === i ? null : cur));
    u.onerror = u.onend;
    setSpeaking(i);
    synth.speak(u);
  };

  const renderSymptomsList = () => (
    <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'grid', gap: 12 }}>
      {t.items.map((label, i) => {
        const on = checked[i];
        return (
          <li
            key={label}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              borderRadius: 22,
              background: on ? '#fff3ec' : 'var(--ms-surface)',
              border: `2px solid ${on ? 'var(--ms-orange)' : 'transparent'}`,
              boxShadow: '0 4px 16px rgba(31, 77, 56, 0.07)',
            }}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(i)}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 76,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 6px 10px 14px',
                textAlign: 'left',
                border: 0,
                background: 'none',
                cursor: 'pointer',
                color: 'var(--ms-ink)',
              }}
            >
              <span
                aria-hidden
                style={{
                  flex: '0 0 34px',
                  height: 34,
                  borderRadius: 10,
                  display: 'grid',
                  placeItems: 'center',
                  border: `2.5px solid ${on ? 'var(--ms-orange)' : 'var(--ms-border)'}`,
                  background: on ? 'var(--ms-orange)' : '#fff',
                  color: '#fff',
                }}
              >
                {on && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                )}
              </span>
              <span style={{ flex: '0 0 auto', color: 'var(--ms-green-700)', display: 'grid' }}>{ICONS[i]}</span>
              <span style={{ fontSize: 16.5, fontWeight: 700, lineHeight: 1.3 }}>{label}</span>
            </button>
            <button
              type="button"
              onClick={() => speak(i)}
              aria-label={`${t.listen}: ${label}`}
              aria-pressed={speaking === i}
              style={{
                flex: '0 0 60px',
                display: 'grid',
                placeItems: 'center',
                border: 0,
                background: 'none',
                cursor: 'pointer',
                color: speaking === i ? 'var(--ms-orange)' : 'var(--ms-green-700)',
              }}
            >
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: speaking === i ? 'var(--ms-orange-100)' : 'var(--ms-green-100)',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
                  <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
                </svg>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
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
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: i < STEP ? 'var(--ms-orange)' : 'var(--ms-green-100)',
                  }}
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

          <div
            style={{
              marginTop: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 20,
              background: 'var(--ms-green-100)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
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
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {getPatientSummary(patientId, lang)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/mitanin/screening/patient')}
              style={{
                border: 0,
                background: 'none',
                color: 'var(--ms-green-900)',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: '4px 6px',
                flexShrink: 0,
              }}
            >
              {lang === 'hi' ? hiLocale.common.changePatient : enLocale.common.changePatient}
            </button>
          </div>
        </header>

        <section style={{ padding: '22px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{t.title}</h1>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background: '#fff1c9',
                color: '#8a6200',
              }}
            >
              {t.tag}
            </span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 13.5, color: 'var(--ms-muted)' }}>{t.sub}</p>

          {renderSymptomsList()}
        </section>

        <div
          style={{
            position: 'sticky',
            bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
            marginTop: 18,
            padding: '14px 20px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'linear-gradient(to top, var(--ms-bg) 70%, rgba(246,248,245,0))',
          }}
        >
          <button
            type="button"
            onClick={() => onNavigate('/mitanin/screening/patient')}
            style={{
              flex: '0 0 auto',
              padding: '16px 14px',
              border: 0,
              background: 'none',
              cursor: 'pointer',
              fontSize: 17,
              fontWeight: 800,
              color: 'var(--ms-green-700)',
            }}
          >
            {t.back}
          </button>
          <button
            type="button"
            onClick={handleNext}
            style={{
              flex: 1,
              height: 62,
              border: 0,
              borderRadius: 22,
              cursor: 'pointer',
              fontSize: 19,
              fontWeight: 800,
              background: 'var(--ms-orange)',
              color: '#fff',
              boxShadow: '0 10px 22px rgba(240, 121, 75, 0.35)',
            }}
          >
            {t.next}
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
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
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
              <button
                type="button"
                onClick={() => onNavigate('/mitanin/screening/patient')}
                style={{
                  border: 0,
                  background: 'none',
                  color: 'var(--ms-green-900)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  flexShrink: 0,
                }}
              >
                {lang === 'hi' ? hiLocale.common.changePatient : enLocale.common.changePatient}
              </button>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--ms-ink)' }}>{t.title}</h1>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: '#fff1c9',
                  color: '#8a6200',
                }}
              >
                {t.tag}
              </span>
            </div>
            <p style={{ margin: '4px 0 20px', fontSize: 14, color: 'var(--ms-muted)' }}>{t.sub}</p>

            {renderSymptomsList()}

            <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderTop: '1px solid var(--ms-border)', paddingTop: 20 }}>
              <button
                type="button"
                onClick={() => onNavigate('/mitanin/screening/patient')}
                style={{
                  padding: '12px 20px',
                  border: '1.5px solid var(--ms-border)',
                  borderRadius: 16,
                  background: 'var(--ms-bg)',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 800,
                  color: 'var(--ms-green-700)',
                }}
              >
                {t.back}
              </button>
              <button
                type="button"
                onClick={handleNext}
                style={{
                  padding: '14px 32px',
                  border: 0,
                  borderRadius: 18,
                  cursor: 'pointer',
                  fontSize: 17,
                  fontWeight: 800,
                  background: 'var(--ms-orange)',
                  color: '#fff',
                  boxShadow: '0 8px 20px rgba(240, 121, 75, 0.35)',
                }}
              >
                {t.next} →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

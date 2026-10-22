import { useEffect, useRef, useState } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';

type Read = 'agree' | 'disagree';
type Decision = 'local' | 'refer';

const COPY = { en: enLocale.screens.DoctorReview, hi: hiLocale.screens.DoctorReview } as const;

const dist = (a: React.Touch, b: React.Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

export default function DoctorReview({ lang, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const [scale, setScale] = useState(1);
  const [read, setRead] = useState<Read | null>(null);
  const [advice, setAdvice] = useState('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [sent, setSent] = useState(false);
  const pinch = useRef<{ d: number; s: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) pinch.current = { d: dist(e.touches[0], e.touches[1]), s: scale };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (pinch.current && e.touches.length === 2) {
      const next = (pinch.current.s * dist(e.touches[0], e.touches[1])) / pinch.current.d;
      setScale(Math.min(4, Math.max(1, next)));
    }
  };
  const onTouchEnd = () => (pinch.current = null);

  const addChip = (text: string) => setAdvice((a) => (a.trim() ? `${a.trim()} ${text}` : text));

  const ready = read !== null && decision !== null && !sent;
  const send = () => {
    if (!ready) return;
    setSent(true);
    timer.current = window.setTimeout(() => onNavigate('/doctor/inbox'), 1800);
  };

  return (
    <div>
      <header
        style={{
          background: 'var(--ms-green-700)',
          color: '#fff',
          borderRadius: '0 0 32px 32px',
          padding: 'calc(22px + env(safe-area-inset-top, 0px)) 20px 24px',
        }}
      >
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, opacity: 0.85 }}>{t.caseNo}</p>
        <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 800, lineHeight: 1.15 }}>{dataService.getPatientSummary('p1', lang)}</h1>
      </header>

      <section style={{ padding: '18px 20px 0', display: 'grid', gap: 16 }}>
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            position: 'relative',
            overflow: 'hidden',
            aspectRatio: '4 / 3.4',
            borderRadius: 26,
            background: '#12241b',
            touchAction: 'pan-y',
          }}
        >
          <svg
            viewBox="0 0 300 255"
            role="img"
            aria-label={t.photoAlt}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              transform: `scale(${scale})`,
              transformOrigin: 'center',
            }}
          >
            <rect width="300" height="255" fill="#1c3a2b" />
            <rect x="40" y="88" width="220" height="80" rx="14" fill="#f1f5f2" />
            <rect x="58" y="106" width="42" height="44" rx="8" fill="#d9e2dc" />
            <rect x="114" y="104" width="130" height="48" rx="8" fill="#fff" stroke="var(--ms-border)" />
            <rect x="152" y="104" width="4" height="48" fill="#d9534f" />
            <rect x="190" y="104" width="4" height="48" fill="#d9534f" />
            <text x="152" y="98" fontSize="9" textAnchor="middle" fill="#6b7770">C</text>
            <text x="192" y="98" fontSize="9" textAnchor="middle" fill="#6b7770">T</text>
          </svg>

          {scale === 1 ? (
            <span
              style={{
                position: 'absolute',
                left: 12,
                bottom: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 700,
                background: 'rgba(10, 30, 20, 0.65)',
                color: '#fff',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10 14 4 20M4 15v5h5M14 10l6-6M15 4h5v5" />
              </svg>
              {t.pinch}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setScale(1)}
              style={{
                position: 'absolute',
                left: 12,
                bottom: 12,
                padding: '8px 14px',
                border: 0,
                borderRadius: 999,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 800,
                background: '#fff',
                color: 'var(--ms-green-900)',
              }}
            >
              {t.reset}
            </button>
          )}
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 24,
            background: 'var(--ms-surface)',
            boxShadow: '0 4px 16px rgba(31, 77, 56, 0.07)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 14.5,
              fontWeight: 800,
              background: 'var(--ms-orange-100)',
              color: 'var(--ms-orange-700)',
            }}
          >
            {t.mitaninRead}
          </span>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span id="my-read" style={{ fontSize: 15.5, fontWeight: 800 }}>{t.myRead}</span>
            <div
              role="radiogroup"
              aria-labelledby="my-read"
              style={{ display: 'flex', padding: 3, borderRadius: 999, background: 'var(--ms-green-100)' }}
            >
              {(['agree', 'disagree'] as const).map((key) => {
                const on = read === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setRead(key)}
                    style={{
                      border: 0,
                      cursor: 'pointer',
                      padding: '10px 18px',
                      borderRadius: 999,
                      fontSize: 15,
                      fontWeight: 800,
                      background: on ? (key === 'agree' ? 'var(--ms-green-500)' : 'var(--ms-orange)') : 'transparent',
                      color: on ? '#fff' : 'var(--ms-green-700)',
                    }}
                  >
                    {t.reads[key]}
                  </button>
                );
              })}
            </div>
          </div>
          <p style={{ margin: '12px 2px 0', fontSize: 12.5, color: 'var(--ms-muted)' }}>{t.recorded}</p>
        </div>

        <div>
          <h2 style={{ margin: '2px 0 8px', fontSize: 18, fontWeight: 800 }}>{t.symptomsTitle}</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {t.symptoms.map((s) => (
              <li
                key={s}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 16,
                  fontSize: 15.5,
                  fontWeight: 600,
                  background: 'var(--ms-surface)',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    flex: '0 0 24px',
                    height: 24,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--ms-green-500)',
                    color: '#fff',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label htmlFor="advice" style={{ display: 'block', marginBottom: 8, fontSize: 18, fontWeight: 800 }}>
            {t.advice}
          </label>
          <ul
            aria-label={t.chipsLabel}
            style={{ listStyle: 'none', margin: '0 0 10px', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}
          >
            {t.chips.map((chip) => (
              <li key={chip}>
                <button
                  type="button"
                  onClick={() => addChip(chip)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    fontSize: 13.5,
                    fontWeight: 700,
                    textAlign: 'left',
                    border: '2px solid var(--ms-green-100)',
                    background: 'var(--ms-surface)',
                    color: 'var(--ms-green-700)',
                  }}
                >
                  {chip}
                </button>
              </li>
            ))}
          </ul>
          <textarea
            id="advice"
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
            placeholder={t.advicePlaceholder}
            rows={4}
            style={{
              width: '100%',
              resize: 'none',
              padding: '12px 14px',
              borderRadius: 18,
              border: '2px solid #e3e9e5',
              font: 'inherit',
              fontSize: 16,
              color: 'var(--ms-ink)',
              background: 'var(--ms-surface)',
            }}
          />
        </div>

        <div>
          <h2 id="decision" style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>{t.decisionTitle}</h2>
          <div role="radiogroup" aria-labelledby="decision" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(['local', 'refer'] as const).map((key) => {
              const on = decision === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setDecision(key)}
                  style={{
                    minHeight: 64,
                    borderRadius: 20,
                    cursor: 'pointer',
                    fontSize: 17,
                    fontWeight: 800,
                    border: `2px solid ${on ? 'var(--ms-green-700)' : '#e3e9e5'}`,
                    background: on ? 'var(--ms-green-700)' : 'var(--ms-surface)',
                    color: on ? '#fff' : 'var(--ms-ink)',
                  }}
                >
                  {t.decisions[key]}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div
        style={{
          position: 'sticky',
          bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
          marginTop: 18,
          padding: '14px 20px 6px',
          background: 'linear-gradient(to top, var(--ms-bg) 70%, rgba(246,248,245,0))',
        }}
      >
        <button
          type="button"
          disabled={!ready}
          onClick={send}
          style={{
            width: '100%',
            height: 62,
            border: 0,
            borderRadius: 22,
            cursor: ready ? 'pointer' : 'default',
            fontSize: 19,
            fontWeight: 800,
            background: sent ? 'var(--ms-green-500)' : ready ? 'var(--ms-orange)' : '#e3e9e5',
            color: sent || ready ? '#fff' : '#9aa7a0',
            boxShadow: ready ? '0 10px 22px rgba(240, 121, 75, 0.35)' : 'none',
          }}
        >
          {sent ? t.sent : t.send}
        </button>
      </div>
    </div>
  );
}

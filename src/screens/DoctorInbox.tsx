import { useMemo, useState } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';

type Filter = 'all' | 'over2h' | 'photos';

interface Case {
  id: string;
  name: Record<'en' | 'hi', string>;
  village: Record<'en' | 'hi', string>;
  symptoms: Record<'en' | 'hi', string>;
  waitingMin: number;
  photo: boolean;
}

const CASES = dataService.getCases() as Case[];

const COPY = { en: enLocale.screens.DoctorInbox, hi: hiLocale.screens.DoctorInbox } as const;

function waitStyle(min: number) {
  if (min > 120) return { background: 'var(--ms-orange-100)', color: 'var(--ms-orange-700)' };
  if (min >= 60) return { background: 'var(--ms-violet-100)', color: 'var(--ms-violet-700)' };
  return { background: 'var(--ms-green-100)', color: 'var(--ms-green-700)' };
}

function Thumb({ has, alt, empty }: { has: boolean; alt: string; empty: string }) {
  return has ? (
    <svg viewBox="0 0 60 60" width="60" height="60" role="img" aria-label={alt} style={{ flex: '0 0 60px', borderRadius: 14 }}>
      <rect width="60" height="60" rx="14" fill="#1c3a2b" />
      <rect x="8" y="22" width="44" height="16" rx="4" fill="#f1f5f2" />
      <rect x="13" y="26" width="9" height="8" rx="2" fill="#d9e2dc" />
      <rect x="26" y="25" width="22" height="10" rx="2" fill="#fff" />
      <rect x="33" y="25" width="1.6" height="10" fill="#d9534f" />
      <rect x="40" y="25" width="1.6" height="10" fill="#d9534f" />
    </svg>
  ) : (
    <span
      style={{
        flex: '0 0 60px',
        height: 60,
        borderRadius: 14,
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        padding: 4,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.2,
        border: '2px dashed var(--ms-border)',
        color: 'var(--ms-muted)',
      }}
    >
      {empty}
    </span>
  );
}

export default function DoctorInbox({ lang, online, onNavigate, onToggleOnline }: ScreenProps) {
  const t = COPY[lang];
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => {
    const base = [...CASES].sort((a, b) => b.waitingMin - a.waitingMin);
    if (filter === 'over2h') return base.filter((c) => c.waitingMin > 120);
    if (filter === 'photos') return base.filter((c) => c.photo);
    return base;
  }, [filter]);

  return (
    <div>
      <header style={{ position: 'relative', height: 210, color: '#fff' }}>
        <svg viewBox="0 0 430 210" preserveAspectRatio="xMaxYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
          <rect width="430" height="210" fill="var(--ms-green-700)" />
          <circle cx="335" cy="90" r="70" fill="#3f8a63" opacity="0.7" />
          <g transform="translate(335 100) rotate(14) scale(1.3)">
            <path d="M0 84C-42 44-34-22 0-66C34-22 42 44 0 84Z" fill="var(--ms-green-500)" />
            <path d="M0 84L0-52M0 40L-16 18M0 16L16-6M0-8L-12-26" stroke="#d3ecd9" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
          <g transform="translate(275 128) rotate(-38) scale(0.75)">
            <path d="M0 84C-42 44-34-22 0-66C34-22 42 44 0 84Z" fill="#8cc79d" />
          </g>
        </svg>
        <div style={{ position: 'absolute', left: 20, bottom: 56 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, lineHeight: 1.15 }}>{t.greeting}</h1>
          <button
            type="button"
            onClick={onToggleOnline}
            aria-pressed={online}
            style={{
              marginTop: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 12px',
              border: 0,
              borderRadius: 999,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              background: online ? 'var(--ms-green-100)' : 'var(--ms-orange-100)',
              color: online ? 'var(--ms-green-900)' : 'var(--ms-orange-700)',
            }}
          >
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: online ? 'var(--ms-green-500)' : 'var(--ms-orange)' }} />
            {online ? t.synced : t.offline}
          </button>
        </div>
      </header>

      <section
        style={{
          marginTop: -36,
          position: 'relative',
          background: 'var(--ms-surface)',
          borderRadius: '36px 36px 0 0',
          padding: '26px 0 28px',
          minHeight: 420,
        }}
      >
        <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{t.title}</h2>
          <span
            aria-live="polite"
            style={{
              minWidth: 30,
              padding: '3px 10px',
              borderRadius: 999,
              textAlign: 'center',
              fontSize: 15,
              fontWeight: 800,
              background: 'var(--ms-orange)',
              color: '#fff',
            }}
          >
            {list.length}
          </span>
        </div>

        <div
          role="group"
          aria-label={t.filterLabel}
          style={{ padding: '14px 20px 4px', display: 'flex', gap: 8, overflowX: 'auto' }}
        >
          {(['all', 'over2h', 'photos'] as const).map((key) => {
            const on = filter === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(key)}
                style={{
                  flex: '0 0 auto',
                  padding: '9px 16px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 800,
                  border: `2px solid ${on ? 'var(--ms-green-700)' : 'var(--ms-green-100)'}`,
                  background: on ? 'var(--ms-green-700)' : 'var(--ms-surface)',
                  color: on ? '#fff' : 'var(--ms-green-700)',
                }}
              >
                {t.filters[key]}
              </button>
            );
          })}
        </div>

        {list.length === 0 ? (
          <p style={{ margin: '40px 20px', textAlign: 'center', color: 'var(--ms-muted)', fontSize: 14.5 }}>{t.empty}</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: '12px 20px 0', display: 'grid', gap: 12 }}>
            {list.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onNavigate('/doctor/review')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    textAlign: 'left',
                    borderRadius: 22,
                    cursor: 'pointer',
                    border: '1px solid var(--ms-green-100)',
                    background: 'var(--ms-bg)',
                    color: 'var(--ms-ink)',
                  }}
                >
                  <Thumb has={c.photo} alt={t.photoAlt} empty={t.noPhoto} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 17, fontWeight: 800 }}>{c.name[lang]}</span>
                    <span style={{ display: 'block', marginTop: 1, fontSize: 13, color: 'var(--ms-muted)' }}>{c.village[lang]}</span>
                    <span style={{ display: 'block', marginTop: 6, fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{c.symptoms[lang]}</span>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: 8,
                        padding: '3px 12px',
                        borderRadius: 999,
                        fontSize: 12.5,
                        fontWeight: 800,
                        ...waitStyle(c.waitingMin),
                      }}
                    >
                      {c.waitingMin >= 60 ? `${Math.floor(c.waitingMin / 60)} ${t.hourUnit} ${c.waitingMin % 60} ${t.minuteUnit}` : `${c.waitingMin} ${t.minuteUnit}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import type { ReactElement } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';

const COPY = { en: enLocale.screens.RoleSelect, hi: hiLocale.screens.RoleSelect } as const;

const ic = {
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const HealthWorkerIcon = (
  <svg {...ic}>
    <circle cx="12" cy="6.5" r="3.2" />
    <path d="M5 21a7 7 0 0 1 14 0" />
    <path d="M12 14.5v4M10 16.5h4" />
  </svg>
);
const StethoscopeIcon = (
  <svg {...ic}>
    <path d="M6 3v6a4 4 0 0 0 8 0V3" />
    <path d="M10 13v2a5 5 0 0 0 10 0v-1.5" />
    <circle cx="20" cy="12" r="2" />
  </svg>
);
const DashboardIcon = (
  <svg {...ic}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
    <path d="M8 16v-4M12 16V8M16 16v-6" />
  </svg>
);

const CARDS: {
  key: 'mitanin' | 'doctor' | 'supervisor';
  route: string;
  tile: string;
  icon: ReactElement;
}[] = [
  { key: 'mitanin', route: '/mitanin/home', tile: 'var(--ms-orange)', icon: HealthWorkerIcon },
  { key: 'doctor', route: '/doctor/inbox', tile: 'var(--ms-violet)', icon: StethoscopeIcon },
  { key: 'supervisor', route: '/supervisor/overview', tile: 'var(--ms-green-500)', icon: DashboardIcon },
];

function Hero() {
  return (
    <svg
      viewBox="0 0 430 300"
      preserveAspectRatio="xMidYMax slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      aria-hidden
    >
      <rect width="430" height="300" fill="var(--ms-green-700)" />
      <circle cx="96" cy="96" r="44" fill="#a9d8b4" opacity="0.35" />
      <circle cx="96" cy="96" r="26" fill="#d3ecd9" opacity="0.7" />

      {/* big leaf */}
      <g transform="translate(350 132) rotate(24) scale(1.55)">
        <path d="M0 84C-42 44-34-22 0-66C34-22 42 44 0 84Z" fill="var(--ms-green-500)" />
        <path d="M0 84L0-52M0 40L-16 18M0 16L16-6M0-8L-12-26" stroke="#d3ecd9" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
      <g transform="translate(290 96) rotate(-32) scale(0.8)">
        <path d="M0 84C-42 44-34-22 0-66C34-22 42 44 0 84Z" fill="#8cc79d" />
        <path d="M0 84L0-52" stroke="var(--ms-green-100)" strokeWidth="2.4" strokeLinecap="round" />
      </g>

      {/* hills */}
      <ellipse cx="110" cy="318" rx="250" ry="92" fill="#3f8a63" />
      <ellipse cx="360" cy="326" rx="240" ry="80" fill="var(--ms-green-900)" />

      {/* village */}
      <g>
        <rect x="64" y="236" width="38" height="26" fill="var(--ms-green-100)" />
        <polygon points="58,238 83,214 108,238" fill="var(--ms-orange)" />
        <rect x="78" y="246" width="10" height="16" rx="2" fill="var(--ms-green-700)" />

        <rect x="130" y="246" width="30" height="20" fill="#cfe6d5" />
        <polygon points="125,248 145,230 165,248" fill="#f5b58f" />
        <rect x="140" y="253" width="9" height="13" rx="2" fill="var(--ms-green-700)" />

        <rect x="20" y="248" width="26" height="18" fill="#cfe6d5" />
        <polygon points="16,250 33,234 50,250" fill="var(--ms-orange)" />

        <rect x="196" y="252" width="6" height="16" fill="var(--ms-green-900)" />
        <circle cx="199" cy="244" r="13" fill="var(--ms-green-500)" />
        <rect x="42" y="258" width="5" height="12" fill="var(--ms-green-900)" />
        <circle cx="44" cy="252" r="9" fill="#8cc79d" />
      </g>
    </svg>
  );
}

export default function RoleSelect({ lang, onNavigate, onSetLang }: ScreenProps) {
  const t = COPY[lang];

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ position: 'relative', height: 300, color: '#fff' }}>
        <Hero />
        <div
          role="group"
          aria-label={lang === 'hi' ? 'भाषा' : 'Language'}
          style={{
            position: 'absolute',
            top: 'calc(16px + env(safe-area-inset-top, 0px))',
            right: 16,
            display: 'flex',
            padding: 3,
            borderRadius: 999,
            background: 'rgba(31, 77, 56, 0.55)',
            backdropFilter: 'blur(6px)',
          }}
        >
          {(['en', 'hi'] as const).map((code) => {
            const on = lang === code;
            return (
              <button
                key={code}
                type="button"
                aria-pressed={on}
                onClick={() => onSetLang(code)}
                style={{
                  border: 0,
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  background: on ? '#fff' : 'transparent',
                  color: on ? 'var(--ms-green-900)' : 'var(--ms-green-100)',
                }}
              >
                {code === 'en' ? 'English' : 'हिन्दी'}
              </button>
            );
          })}
        </div>
        <h1
          style={{
            position: 'absolute',
            left: 24,
            top: 'calc(72px + env(safe-area-inset-top, 0px))',
            margin: 0,
            fontSize: 34,
            lineHeight: 1.1,
            fontWeight: 800,
            letterSpacing: '-0.01em',
          }}
        >
          {t.brandLine1}
          <br />
          {t.brandLine2}
        </h1>
      </header>

      <section
        style={{
          flex: 1,
          marginTop: -36,
          position: 'relative',
          background: 'var(--ms-surface)',
          borderRadius: '36px 36px 0 0',
          padding: '28px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h2 style={{ margin: '0 4px 18px', fontSize: 24, fontWeight: 800 }}>{t.title}</h2>

        <div style={{ display: 'grid', gap: 14 }}>
          {CARDS.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => onNavigate(card.route)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                width: '100%',
                padding: 16,
                textAlign: 'left',
                cursor: 'pointer',
                border: '1px solid var(--ms-green-100)',
                borderRadius: 24,
                background: 'var(--ms-bg)',
                color: 'var(--ms-ink)',
              }}
            >
              <span
                style={{
                  flex: '0 0 60px',
                  height: 60,
                  borderRadius: 20,
                  display: 'grid',
                  placeItems: 'center',
                  background: card.tile,
                  color: '#fff',
                }}
              >
                {card.icon}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 18, fontWeight: 800 }}>
                  {t.roles[card.key].name}
                </span>
                <span style={{ display: 'block', marginTop: 2, fontSize: 13.5, color: 'var(--ms-muted)' }}>
                  {t.roles[card.key].desc}
                </span>
              </span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ms-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          ))}
        </div>

        <p style={{ margin: 'auto 0 0', paddingTop: 24, textAlign: 'center', fontSize: 12.5, color: 'var(--ms-muted)' }}>
          {t.footer}
        </p>
      </section>
    </div>
  );
}

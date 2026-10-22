import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';

const COPY = { en: enLocale.screens.MitaninHome, hi: hiLocale.screens.MitaninHome } as const;

const PRIORITY_CARDS = dataService.getDashboardData().priorityCards;

function HeroLeaves() {
  return (
    <svg
      viewBox="0 0 430 260"
      preserveAspectRatio="xMaxYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      aria-hidden
    >
      <rect width="430" height="260" fill="var(--ms-green-700)" />
      <circle cx="330" cy="110" r="78" fill="#3f8a63" opacity="0.7" />
      <g transform="translate(330 120) rotate(14) scale(1.5)">
        <path d="M0 84C-42 44-34-22 0-66C34-22 42 44 0 84Z" fill="var(--ms-green-500)" />
        <path d="M0 84L0-52M0 40L-16 18M0 16L16-6M0-8L-12-26" stroke="#d3ecd9" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
      <g transform="translate(262 150) rotate(-38) scale(0.85)">
        <path d="M0 84C-42 44-34-22 0-66C34-22 42 44 0 84Z" fill="#8cc79d" />
        <path d="M0 84L0-52" stroke="var(--ms-green-100)" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <g transform="translate(398 168) rotate(40) scale(0.7)">
        <path d="M0 84C-42 44-34-22 0-66C34-22 42 44 0 84Z" fill="#a9d8b4" />
      </g>
      <rect x="236" y="208" width="170" height="10" rx="5" fill="var(--ms-green-900)" />
    </svg>
  );
}

export default function MitaninHome({ lang, online, onNavigate, onToggleOnline }: ScreenProps) {
  const t = COPY[lang];

  return (
    <div>
      <header style={{ position: 'relative', height: 260, color: '#fff' }}>
        <HeroLeaves />
        <button
          type="button"
          aria-label={t.search}
          onClick={() => onNavigate('/mitanin/visits')}
          style={{
            position: 'absolute',
            top: 'calc(18px + env(safe-area-inset-top, 0px))',
            left: 20,
            width: 46,
            height: 46,
            display: 'grid',
            placeItems: 'center',
            border: 0,
            borderRadius: 14,
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.18)',
            color: '#fff',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
        </button>

        <div style={{ position: 'absolute', left: 20, bottom: 56 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, lineHeight: 1.15 }}>{t.greeting}</h1>
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
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: online ? 'var(--ms-green-500)' : 'var(--ms-orange)',
              }}
            />
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
        }}
      >
        <div style={{ padding: '0 20px' }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{t.prioTitle}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13.5, color: 'var(--ms-muted)' }}>{t.prioSub}</p>
        </div>

        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '16px 20px 6px',
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            scrollSnapType: 'x proximity',
            scrollPaddingLeft: 20,
          }}
        >
          {PRIORITY_CARDS.map((card, i) => (
            <li key={i} style={{ flex: '0 0 148px', scrollSnapAlign: 'start' }}>
              <button
                type="button"
                onClick={() => onNavigate(card.route)}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  width: '100%',
                  height: 122,
                  padding: 14,
                  textAlign: 'left',
                  border: 0,
                  borderRadius: 22,
                  cursor: 'pointer',
                  background: card.bg,
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: -26,
                    right: -22,
                    width: 82,
                    height: 82,
                    borderRadius: '50%',
                    background: card.blob,
                    opacity: 0.55,
                  }}
                />
                <span style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{card.count}</span>
                <span style={{ marginTop: 4, fontSize: 14, fontWeight: 700, lineHeight: 1.25 }}>
                  {t.priorities[i]}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div style={{ padding: '22px 20px 0' }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{t.visitsTitle}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13.5, color: 'var(--ms-muted)' }}>{t.visitsSub}</p>

          <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'grid', gap: 12 }}>
            {t.visits.map((v) => (
              <li key={v.name}>
                <button
                  type="button"
                  onClick={() => onNavigate('/mitanin/visits')}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    width: '100%',
                    padding: '16px 18px',
                    textAlign: 'left',
                    border: 0,
                    borderRadius: 24,
                    cursor: 'pointer',
                    background: 'var(--ms-green-500)',
                    color: '#fff',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: -34,
                      right: -26,
                      width: 110,
                      height: 100,
                      borderRadius: '50%',
                      background: 'var(--ms-green-700)',
                    }}
                  />
                  <span style={{ position: 'relative', display: 'block', fontSize: 18, fontWeight: 800 }}>
                    {v.name}
                  </span>
                  <span style={{ position: 'relative', display: 'block', marginTop: 2, fontSize: 13, opacity: 0.92 }}>
                    {v.village}
                  </span>
                  <span style={{ position: 'relative', display: 'block', marginTop: 10, fontSize: 14, fontWeight: 600 }}>
                    {v.task}
                  </span>
                  <span
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      marginTop: 12,
                      padding: '4px 12px',
                      borderRadius: 999,
                      fontSize: 12.5,
                      fontWeight: 800,
                      background: v.late ? '#fff' : 'rgba(255,255,255,0.25)',
                      color: v.late ? '#c2511f' : '#fff',
                    }}
                  >
                    {v.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => onNavigate('/mitanin/screening/symptoms')}
            style={{
              marginTop: 22,
              width: '100%',
              height: 62,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              border: 0,
              borderRadius: 22,
              cursor: 'pointer',
              fontSize: 18,
              fontWeight: 800,
              background: 'var(--ms-orange)',
              color: '#fff',
              boxShadow: '0 10px 22px rgba(240, 121, 75, 0.35)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t.newScreening}
          </button>
        </div>
      </section>
    </div>
  );
}

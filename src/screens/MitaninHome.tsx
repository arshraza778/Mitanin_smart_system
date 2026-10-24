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
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
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
                padding: '6px 14px',
                minHeight: 48,
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

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '24px 28px 40px' }}>
        {/* Wide Header */}
        <header style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--ms-ink)', lineHeight: 1.2 }}>{t.greeting}</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ms-muted)', fontWeight: 600 }}>
              {lang === 'hi' ? 'सामुदायिक स्वास्थ्य कार्यकर्ता (मितानिन / ASHA) डैशबोर्ड' : 'Community Health Worker (Mitanin / ASHA) Dashboard'}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleOnline}
            aria-pressed={online}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              border: 0,
              borderRadius: 999,
              cursor: 'pointer',
              fontSize: 13.5,
              fontWeight: 700,
              background: online ? 'var(--ms-green-100)' : 'var(--ms-orange-100)',
              color: online ? 'var(--ms-green-900)' : 'var(--ms-orange-700)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
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
        </header>

        {/* Wide Layout: Priority cards and visits list in two columns on the left, New screening and quick actions beside them */}
        <div className="grid grid-cols-12 @md:grid-cols-12 @2xl:grid-cols-12 @4xl:grid-cols-12 gap-6" style={{ alignItems: 'start' }}>
          {/* Main Area: Priority cards & Visits in two columns (~65-70%) */}
          <div className="col-span-12 @2xl:col-span-8 @4xl:col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="grid grid-cols-1 @md:grid-cols-2 @2xl:grid-cols-2 gap-6">
              {/* Column 1: Priority Cards */}
              <div
                style={{
                  background: 'var(--ms-surface)',
                  borderRadius: 24,
                  border: '1px solid var(--ms-border)',
                  boxShadow: 'var(--ms-shadow-card)',
                  padding: 22,
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--ms-ink)' }}>{t.prioTitle}</h2>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ms-muted)', fontWeight: 600 }}>{t.prioSub}</p>
                </div>

                <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'grid', gap: 12 }}>
                  {PRIORITY_CARDS.map((card, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => onNavigate(card.route)}
                        style={{
                          position: 'relative',
                          overflow: 'hidden',
                          width: '100%',
                          minHeight: 88,
                          padding: '14px 18px',
                          textAlign: 'left',
                          border: 0,
                          borderRadius: 20,
                          cursor: 'pointer',
                          background: card.bg,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            position: 'absolute',
                            top: -24,
                            right: -20,
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: card.blob,
                            opacity: 0.55,
                          }}
                        />
                        <span style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.25, maxWidth: 170 }}>
                          {t.priorities[i]}
                        </span>
                        <span style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{card.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 2: Visits List */}
              <div
                style={{
                  background: 'var(--ms-surface)',
                  borderRadius: 24,
                  border: '1px solid var(--ms-border)',
                  boxShadow: 'var(--ms-shadow-card)',
                  padding: 22,
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--ms-ink)' }}>{t.visitsTitle}</h2>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ms-muted)', fontWeight: 600 }}>{t.visitsSub}</p>
                </div>

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
                          padding: '14px 16px',
                          textAlign: 'left',
                          border: 0,
                          borderRadius: 20,
                          cursor: 'pointer',
                          background: 'var(--ms-green-500)',
                          color: '#fff',
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            position: 'absolute',
                            top: -28,
                            right: -22,
                            width: 90,
                            height: 90,
                            borderRadius: '50%',
                            background: 'var(--ms-green-700)',
                          }}
                        />
                        <span style={{ position: 'relative', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 16, fontWeight: 800 }}>{v.name}</span>
                          <span
                            style={{
                              padding: '2px 10px',
                              borderRadius: 999,
                              fontSize: 11.5,
                              fontWeight: 800,
                              background: v.late ? '#fff' : 'rgba(255,255,255,0.25)',
                              color: v.late ? '#c2511f' : '#fff',
                            }}
                          >
                            {v.status}
                          </span>
                        </span>
                        <span style={{ position: 'relative', display: 'block', marginTop: 2, fontSize: 12.5, opacity: 0.9 }}>
                          {v.village}
                        </span>
                        <span style={{ position: 'relative', display: 'block', marginTop: 6, fontSize: 13, fontWeight: 600 }}>
                          {v.task}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Beside them: New Screening & Quick Actions (~30-35%) */}
          <div
            className="col-span-12 @2xl:col-span-4 @4xl:col-span-4"
            style={{
              background: 'var(--ms-surface)',
              borderRadius: 24,
              border: '1px solid var(--ms-border)',
              boxShadow: 'var(--ms-shadow-card)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            {/* New Screening CTA */}
            <button
              type="button"
              onClick={() => onNavigate('/mitanin/screening/symptoms')}
              style={{
                width: '100%',
                minHeight: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                border: 0,
                borderRadius: 20,
                cursor: 'pointer',
                fontSize: 17,
                fontWeight: 800,
                background: 'var(--ms-orange)',
                color: '#fff',
                boxShadow: '0 8px 20px rgba(240, 121, 75, 0.35)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>{t.newScreening}</span>
            </button>

            {/* Quick Actions List */}
            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: 'var(--ms-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {lang === 'hi' ? 'त्वरित नेविगेशन' : 'Quick Actions'}
              </h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  { label: lang === 'hi' ? 'दौरे देखें' : 'View Planned Visits', route: '/mitanin/visits', icon: '📅' },
                  { label: lang === 'hi' ? 'परामर्श स्थिति' : 'Consultation Status', route: '/mitanin/consult', icon: '💬' },
                  { label: lang === 'hi' ? 'रेफ़रल ट्रैकर' : 'Referral Tracker', route: '/mitanin/referral', icon: '🏥' },
                  { label: lang === 'hi' ? 'सूचनाएं' : 'Alerts', route: '/alerts', icon: '🔔' },
                ].map((action) => (
                  <button
                    key={action.route}
                    type="button"
                    onClick={() => onNavigate(action.route)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 16,
                      border: '1px solid var(--ms-border)',
                      background: 'var(--ms-bg)',
                      color: 'var(--ms-ink)',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span aria-hidden>{action.icon}</span>
                      <span>{action.label}</span>
                    </span>
                    <span style={{ color: 'var(--ms-forest)' }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, type ReactElement } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { HeartPulse, Stethoscope, LayoutDashboard, ChevronRight, ArrowRight } from 'lucide-react';

const COPY = { en: enLocale.screens.RoleSelect, hi: hiLocale.screens.RoleSelect } as const;

const CARDS: {
  key: 'mitanin' | 'doctor' | 'supervisor';
  route: string;
  tile: string;
  icon: ReactElement;
}[] = [
  { key: 'mitanin', route: '/mitanin/home', tile: '#235347', icon: <HeartPulse size={28} /> },
  { key: 'doctor', route: '/doctor/inbox', tile: '#053C31', icon: <Stethoscope size={28} /> },
  { key: 'supervisor', route: '/supervisor/overview', tile: '#2E7D4F', icon: <LayoutDashboard size={28} /> },
];

function Hero() {
  return (
    <svg
      viewBox="0 0 430 300"
      preserveAspectRatio="xMidYMax slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      aria-hidden
    >
      <rect width="430" height="300" fill="#002111" />
      <circle cx="96" cy="96" r="44" fill="#C0EACC" opacity="0.35" />
      <circle cx="96" cy="96" r="26" fill="#DAF1DE" opacity="0.7" />

      {/* hills */}
      <ellipse cx="110" cy="318" rx="250" ry="92" fill="#235347" />
      <ellipse cx="360" cy="326" rx="240" ry="80" fill="#051F20" />

      {/* village */}
      <g>
        <rect x="64" y="236" width="38" height="26" fill="#DAF1DE" />
        <polygon points="58,238 83,214 108,238" fill="#235347" />
        <rect x="78" y="246" width="10" height="16" rx="2" fill="#053C31" />

        <rect x="130" y="246" width="30" height="20" fill="#E7F0EA" />
        <polygon points="125,248 145,230 165,248" fill="#8EB69B" />
        <rect x="140" y="253" width="9" height="13" rx="2" fill="#053C31" />

        <rect x="20" y="248" width="26" height="18" fill="#E7F0EA" />
        <polygon points="16,250 33,234 50,250" fill="#235347" />

        <rect x="196" y="252" width="6" height="16" fill="#002111" />
        <circle cx="199" cy="244" r="13" fill="#235347" />
        <rect x="42" y="258" width="5" height="12" fill="#002111" />
        <circle cx="44" cy="252" r="9" fill="#8EB69B" />
      </g>
    </svg>
  );
}

export default function RoleSelect({ lang, onNavigate, onSetLang }: ScreenProps) {
  const t = COPY[lang];
  const [selectedRole, setSelectedRole] = useState<'mitanin' | 'doctor' | 'supervisor' | null>(null);

  return (
    <div className="@container w-full min-h-screen flex flex-col" style={{ background: '#F4F9F6' }}>
      {/* ─── Narrow Phone Layout ─── */}
      <div className="block @2xl:hidden flex-1 flex flex-col" style={{ minHeight: '100dvh' }}>
        <header style={{ position: 'relative', height: 300, color: '#FFFFFF' }}>
          <Hero />
          <div
            role="group"
            aria-label={t.language}
            style={{
              position: 'absolute',
              top: 'calc(16px + env(safe-area-inset-top, 0px))',
              right: 16,
              display: 'flex',
              padding: 3,
              borderRadius: 999,
              background: 'rgba(5, 31, 32, 0.75)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
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
                  className={`ms-btn ms-btn--chip ${on ? 'ms-btn--on-dark' : 'ms-btn--secondary-on-dark'}`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 700,
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
              top: 'calc(76px + env(safe-area-inset-top, 0px))',
              margin: 0,
              fontSize: 34,
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
            }}
          >
            {t.brandLine1}
            <br />
            <span style={{ color: '#C0EACC' }}>{t.brandLine2}</span>
          </h1>
        </header>

        <section
          style={{
            flex: 1,
            marginTop: -36,
            position: 'relative',
            background: '#F4F9F6',
            borderRadius: '32px 32px 0 0',
            padding: '28px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h2 style={{ margin: '0 4px 18px', fontSize: 22, fontWeight: 800, color: '#00201C' }}>{t.title}</h2>

          <div style={{ display: 'grid', gap: 14 }}>
            {CARDS.map((card) => {
              const isSelected = selectedRole === card.key;
              return (
                <button
                  key={card.key}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedRole(card.key)}
                  className={`ms-btn ms-btn--card ${isSelected ? 'ms-btn--card-primary' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    width: '100%',
                    padding: 16,
                    textAlign: 'left',
                    borderRadius: 20,
                    boxShadow: '0 2px 6px rgba(0, 32, 28, 0.04)',
                  }}
                >
                  <span
                    style={{
                      flex: '0 0 56px',
                      height: 56,
                      borderRadius: 16,
                      display: 'grid',
                      placeItems: 'center',
                      background: card.tile,
                      color: '#FFFFFF',
                    }}
                  >
                    {card.icon}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 17, fontWeight: 800, color: '#00201C' }}>
                      {t.roles[card.key].name}
                    </span>
                    <span style={{ display: 'block', marginTop: 3, fontSize: 13, color: '#404945', lineHeight: 1.35 }}>
                      {t.roles[card.key].desc}
                    </span>
                  </span>
                  <ChevronRight size={20} color={isSelected ? '#235347' : '#404945'} style={{ flexShrink: 0 }} />
                </button>
              );
            })}
          </div>

          {/* Two role disclaimer lines */}
          <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#00201C' }}>
              {t.disclaimerLine1}
            </p>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: '#404945' }}>
              {t.disclaimerLine2}
            </p>
          </div>

          {/* Continue button */}
          <div style={{ marginTop: 18 }}>
            <button
              type="button"
              disabled={!selectedRole}
              aria-disabled={!selectedRole}
              onClick={() => {
                if (!selectedRole) return;
                const card = CARDS.find((c) => c.key === selectedRole);
                if (card) onNavigate(card.route);
              }}
              className="ms-btn ms-btn--primary ms-btn--lg"
              style={{
                width: '100%',
                height: 52,
                borderRadius: 16,
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              <span>{t.continue}</span>
              <ArrowRight size={18} />
            </button>
          </div>

          <p style={{ margin: 'auto 0 0', paddingTop: 28, textAlign: 'center', fontSize: 12.5, color: '#404945' }}>
            {t.footer}
          </p>
        </section>
      </div>

      {/* ─── Wide Layout: Three role cards side by side in a centred container ─── */}
      <div className="hidden @2xl:flex flex-col flex-1">
        {/* Top Hero Banner */}
        <header className="relative h-64 overflow-hidden text-white flex items-center justify-between px-8 @4xl:px-12 bg-[#051F20]">
          <Hero />
          <div className="relative z-10 max-w-5xl w-full mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-4xl @3xl:text-5xl font-black tracking-tight m-0 text-white leading-tight">
                {t.brandLine1} <span className="text-[#C0EACC]">{t.brandLine2}</span>
              </h1>
              <p className="text-[#DAF1DE] font-medium text-sm mt-2 m-0 max-w-md">
                {t.heroSubtitle}
              </p>
            </div>

            <div
              role="group"
              aria-label={t.language}
              className="flex p-1 rounded-full bg-[#051F20]/70 backdrop-blur-md border border-white/20"
            >
              {(['en', 'hi'] as const).map((code) => {
                const on = lang === code;
                return (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onSetLang(code)}
                    className={`ms-btn ms-btn--chip ${on ? 'ms-btn--on-dark' : 'ms-btn--secondary-on-dark'}`}
                    style={{
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {code === 'en' ? 'English' : 'हिन्दी'}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* Centered Role Cards Container */}
        <main className="flex-1 -mt-8 relative z-20 bg-[#F4F9F6] rounded-t-[36px] px-8 py-10 @4xl:px-12 flex flex-col items-center">
          <div className="w-full max-w-5xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl @3xl:text-3xl font-black text-[#00201C] m-0">
                {t.title}
              </h2>
              <p className="text-sm text-[#404945] mt-1.5 m-0 font-medium">
                {t.heroDesc}
              </p>
            </div>

            {/* Three cards side-by-side */}
            <div className="grid grid-cols-1 @2xl:grid-cols-3 gap-6">
              {CARDS.map((card) => {
                const isSelected = selectedRole === card.key;
                return (
                  <button
                    key={card.key}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedRole(card.key)}
                    className={`ms-btn ms-btn--card ${isSelected ? 'ms-btn--card-primary' : ''} flex flex-col items-center text-center p-7 rounded-3xl transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer group`}
                  >
                    <span
                      className="rounded-2xl flex items-center justify-center text-white mb-5 transition-transform group-hover:scale-105"
                      style={{ background: card.tile, width: 68, height: 68 }}
                    >
                      {card.icon}
                    </span>

                    <h3 className="text-xl font-extrabold text-[#00201C] m-0 group-hover:text-[#235347] transition-colors">
                      {t.roles[card.key].name}
                    </h3>

                    <p className="text-xs text-[#404945] mt-2 mb-6 font-medium leading-relaxed flex-1">
                      {t.roles[card.key].desc}
                    </p>

                    <span className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${isSelected ? 'bg-[#235347] text-white border-[#235347]' : 'bg-[#DAF1DE] border-[#C0EACC] text-[#0B2B26] group-hover:bg-[#235347] group-hover:text-white'}`}>
                      <span>{isSelected ? t.selected : t.select}</span>
                      <ArrowRight size={14} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Two role disclaimer lines */}
            <div className="mt-8 text-center flex flex-col gap-1">
              <p className="m-0 text-sm font-bold text-[#00201C]">{t.disclaimerLine1}</p>
              <p className="m-0 text-xs font-medium text-[#404945]">{t.disclaimerLine2}</p>
            </div>

            {/* Central Continue button */}
            <div className="mt-6 flex justify-center w-full">
              <button
                type="button"
                disabled={!selectedRole}
                aria-disabled={!selectedRole}
                onClick={() => {
                  if (!selectedRole) return;
                  const card = CARDS.find((c) => c.key === selectedRole);
                  if (card) onNavigate(card.route);
                }}
                className="ms-btn ms-btn--primary ms-btn--lg"
                style={{
                  minWidth: 260,
                  height: 52,
                  borderRadius: 16,
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                <span>{t.continue}</span>
                <ArrowRight size={18} />
              </button>
            </div>

            <p className="mt-12 text-center text-xs text-[#404945] font-medium">
              {t.footer}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

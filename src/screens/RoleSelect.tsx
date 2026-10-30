import { useState, useContext, type ReactElement } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { ViewModeContext } from '../ViewModeContext';
import { HeartPulse, Stethoscope, LayoutDashboard, Check, ArrowRight, ShieldCheck, Activity } from 'lucide-react';

const COPY = { en: enLocale.screens.RoleSelect, hi: hiLocale.screens.RoleSelect } as const;

interface RoleCardMeta {
  key: 'mitanin' | 'doctor' | 'supervisor';
  route: string;
  tile: string;
  badgeEn: string;
  badgeHi: string;
  badgeBg: string;
  badgeColor: string;
  personaEn: string;
  personaHi: string;
  icon: ReactElement;
}

const CARDS: RoleCardMeta[] = [
  {
    key: 'mitanin',
    route: '/mitanin/home',
    tile: '#235347',
    badgeEn: 'Field Mobile',
    badgeHi: 'फ़ील्ड मोबाइल',
    badgeBg: '#DAF1DE',
    badgeColor: '#0B2B26',
    personaEn: 'Frontline Worker • Sub-Center 04',
    personaHi: 'स्वास्थ्य कार्यकर्ता • उप-केंद्र 04',
    icon: <HeartPulse size={24} />,
  },
  {
    key: 'doctor',
    route: '/doctor/inbox',
    tile: '#053C31',
    badgeEn: 'Clinical Workstation',
    badgeHi: 'क्लिनिकल वर्कस्टेशन',
    badgeBg: '#C0EACC',
    badgeColor: '#002111',
    personaEn: 'Medical Officer • CHC / DH',
    personaHi: 'चिकित्सा अधिकारी • सीएचसी / डीएच',
    icon: <Stethoscope size={24} />,
  },
  {
    key: 'supervisor',
    route: '/supervisor/overview',
    tile: '#2E7D4F',
    badgeEn: 'Desk Dashboard',
    badgeHi: 'डेस्क डैशबोर्ड',
    badgeBg: '#FFF1CC',
    badgeColor: '#8A5A00',
    personaEn: 'Block Health Lead • Sector 4',
    personaHi: 'ब्लॉक स्वास्थ्य प्रभारी • सेक्टर 4',
    icon: <LayoutDashboard size={24} />,
  },
];

/* Medical & Clinical Tele-Triage Vector Illustration (Vivid, High-Contrast, Palette-Compliant) */
function ClinicalIllustration({ compact = false }: { compact?: boolean }) {
  const width = compact ? 200 : 280;
  const height = compact ? 115 : 180;

  return (
    <svg
      viewBox="0 0 320 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: '100%',
        maxWidth: width,
        height: 'auto',
        maxHeight: height,
        display: 'block',
        margin: '0 auto',
      }}
      aria-hidden="true"
    >
      {/* Ambient background glow ring */}
      <circle cx="160" cy="110" r="92" fill="#163832" opacity="0.6" />
      <circle cx="160" cy="110" r="76" stroke="#8EB69B" strokeWidth="1.2" strokeDasharray="4 6" opacity="0.45" />

      {/* Central Clinical Shield */}
      <path
        d="M160 38 C196 38 222 48 222 48 C222 110 192 148 160 166 C128 148 98 110 98 48 C98 48 124 38 160 38 Z"
        fill="#235347"
        stroke="#8EB69B"
        strokeWidth="2.5"
      />

      {/* Inner Shield Accent */}
      <path
        d="M160 48 C188 48 208 56 208 56 C208 106 184 136 160 152 C136 136 112 106 112 56 C112 56 132 48 160 48 Z"
        fill="#053C31"
      />

      {/* Medical Cross inside shield */}
      <rect x="153" y="66" width="14" height="40" rx="4" fill="#C0EACC" />
      <rect x="140" y="79" width="40" height="14" rx="4" fill="#C0EACC" />

      {/* Dynamic Vitals Waveform passing through */}
      <path
        d="M44 126 L116 126 L126 110 L134 142 L146 94 L156 136 L166 120 L174 128 L200 128 L276 128"
        stroke="#DAF1DE"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Glowing pulse beacon */}
      <circle cx="146" cy="94" r="4" fill="#FFFFFF" />
      <circle cx="146" cy="94" r="8" stroke="#C0EACC" strokeWidth="2" opacity="0.8" />

      {/* Floating diagnostic test cassette (left) */}
      <g transform="translate(38, 54)">
        <rect width="52" height="74" rx="10" fill="#FFFFFF" stroke="#8EB69B" strokeWidth="1.5" />
        <rect x="12" y="10" width="28" height="34" rx="5" fill="#F4F9F6" stroke="#CCD9D2" strokeWidth="1" />
        {/* Test lines C and T */}
        <line x1="16" y1="20" x2="36" y2="20" stroke="#235347" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="16" y1="28" x2="36" y2="28" stroke="#8EB69B" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="26" cy="56" r="6" fill="#DAF1DE" stroke="#235347" strokeWidth="1.5" />
      </g>

      {/* Floating Stethoscope & Tele-Consult node (right) */}
      <g transform="translate(228, 56)">
        <circle cx="26" cy="26" r="24" fill="#053C31" stroke="#8EB69B" strokeWidth="1.5" />
        <circle cx="26" cy="26" r="14" fill="#235347" />
        <circle cx="26" cy="26" r="7" fill="#C0EACC" />
        <path d="M26 40 C26 56 12 64 -2 64" stroke="#DAF1DE" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </g>

      {/* Signal constellation dots */}
      <circle cx="68" cy="40" r="2.5" fill="#DAF1DE" />
      <circle cx="254" cy="36" r="3" fill="#C0EACC" />
      <circle cx="80" cy="180" r="2.5" fill="#8EB69B" />
      <circle cx="240" cy="172" r="2.5" fill="#DAF1DE" />
    </svg>
  );
}

export default function RoleSelect({ lang, onNavigate, onSetLang }: ScreenProps) {
  const t = COPY[lang];
  const [selectedRole, setSelectedRole] = useState<'mitanin' | 'doctor' | 'supervisor' | null>(null);

  const viewModeCtx = useContext(ViewModeContext);
  // Default to phone if not in an active Web view mode
  const isWebMode = viewModeCtx ? viewModeCtx.isWeb : false;

  return (
    <div style={{ width: '100%', background: '#F4F9F6' }}>
      {/* ─── Phone Mode Layout: RENDERED ONLY WHEN isWebMode IS FALSE ─── */}
      {!isWebMode ? (
        <div className="ms-roleselect-layout-phone">
          {/* Top Hero Card with Clinical Illustration */}
          <header
            style={{
              position: 'relative',
              margin: '12px 14px 0',
              borderRadius: 22,
              background: 'linear-gradient(150deg, #051F20 0%, #163832 55%, #053C31 100%)',
              color: '#FFFFFF',
              overflow: 'hidden',
              padding: '16px 16px 18px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 16px rgba(5, 31, 32, 0.12)',
            }}
          >
            {/* Top Bar: Eyebrow + Language Switcher */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 9999,
                  background: 'rgba(218, 241, 222, 0.16)',
                  border: '1px solid rgba(192, 234, 204, 0.3)',
                  color: '#C0EACC',
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  flexShrink: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 190,
                }}
              >
                <ShieldCheck size={13} color="#C0EACC" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lang === 'hi' ? 'राष्ट्रीय स्वास्थ्य मिशन' : 'National Health Mission'}
                </span>
              </div>

              <div
                role="group"
                aria-label={t.language}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: 2,
                  borderRadius: 9999,
                  background: 'rgba(5, 31, 32, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
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
                        padding: '4px 10px',
                        borderRadius: 9999,
                        fontSize: 11.5,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        cursor: 'pointer',
                      }}
                    >
                      {code === 'en' ? 'EN' : 'हि'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Artwork in center of black card */}
            <div style={{ margin: '10px 0 8px' }}>
              <ClinicalIllustration compact={true} />
            </div>

            {/* Brand Title & Subtitle */}
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 22,
                  lineHeight: 1.15,
                  fontWeight: 800,
                  letterSpacing: '-0.025em',
                  color: '#FFFFFF',
                }}
              >
                {t.brandLine1} <span style={{ color: '#C0EACC' }}>{t.brandLine2}</span>
              </h1>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 12,
                  lineHeight: 1.35,
                  fontWeight: 500,
                  color: '#DAF1DE',
                }}
              >
                {t.heroSubtitle}
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 9999,
                  background: 'rgba(218, 241, 222, 0.12)',
                  border: '1px solid rgba(192, 234, 204, 0.25)',
                  color: '#C0EACC',
                  fontSize: 10.5,
                  fontWeight: 700,
                  marginTop: 8,
                }}
              >
                <Activity size={12} color="#C0EACC" />
                <span>100% Offline-Capable • Tele-Triage</span>
              </div>
            </div>
          </header>

          {/* Role Cards List for Phone Mode */}
          <main
            style={{
              flex: 1,
              padding: '18px 14px calc(24px + max(env(safe-area-inset-bottom, 0px), 16px))',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#00201C', letterSpacing: '-0.015em' }}>
                {t.title}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#404945', fontWeight: 500 }}>
                {t.heroDesc}
              </p>
            </div>

            {/* Vertical Cards */}
            <div style={{ display: 'grid', gap: 11 }}>
              {CARDS.map((card) => {
                const isSelected = selectedRole === card.key;
                return (
                  <button
                    key={card.key}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedRole(card.key)}
                    className={`ms-btn ms-btn--role-card-horizontal ${isSelected ? 'is-selected' : ''}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '12px 14px',
                      textAlign: 'left',
                      borderRadius: 18,
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span
                      style={{
                        flex: '0 0 44px',
                        height: 44,
                        borderRadius: 12,
                        display: 'grid',
                        placeItems: 'center',
                        background: card.tile,
                        color: '#FFFFFF',
                        boxShadow: '0 2px 8px rgba(5, 31, 32, 0.15)',
                      }}
                    >
                      {card.icon}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 15.5, fontWeight: 800, color: '#00201C' }}>
                          {t.roles[card.key].name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 9999,
                            background: card.badgeBg,
                            color: card.badgeColor,
                            border: '1px solid rgba(142, 182, 155, 0.35)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {lang === 'hi' ? card.badgeHi : card.badgeEn}
                        </span>
                      </div>
                      <span style={{ display: 'block', marginTop: 1, fontSize: 11, fontWeight: 600, color: '#235347' }}>
                        {lang === 'hi' ? card.personaHi : card.personaEn}
                      </span>
                      <span style={{ display: 'block', marginTop: 3, fontSize: 12, color: '#404945', lineHeight: 1.35 }}>
                        {t.roles[card.key].desc}
                      </span>
                    </span>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        border: isSelected ? '2px solid #235347' : '1.5px solid #CCD9D2',
                        background: isSelected ? '#235347' : '#FFFFFF',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Disclaimer */}
            <div
              style={{
                marginTop: 16,
                padding: '12px 14px',
                borderRadius: 14,
                background: '#E7F0EA',
                border: '1px solid #CCD9D2',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#00201C' }}>
                {t.disclaimerLine1}
              </p>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: '#404945' }}>
                {t.disclaimerLine2}
              </p>
            </div>

            {/* Continue Button */}
            <div style={{ marginTop: 16 }}>
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: selectedRole ? 'pointer' : 'not-allowed',
                }}
              >
                <span>{t.continue}</span>
                <ArrowRight size={18} />
              </button>
            </div>

            <p style={{ margin: 'auto 0 0', paddingTop: 18, textAlign: 'center', fontSize: 11.5, color: '#707975', fontWeight: 500 }}>
              {t.footer}
            </p>
          </main>
        </div>
      ) : (
        /* ─── Web Desktop Layout: RENDERED ONLY WHEN isWebMode IS TRUE ─── */
        <div className="ms-roleselect-layout-web" style={{ padding: '16px 0' }}>
          {/* Left Column: Dark Showcase Card with Image */}
          <header
            style={{
              width: 360,
              minWidth: 330,
              flexShrink: 0,
              minHeight: 560,
              borderRadius: 28,
              background: 'linear-gradient(150deg, #051F20 0%, #163832 55%, #053C31 100%)',
              color: '#FFFFFF',
              overflow: 'hidden',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              boxShadow: '0 12px 32px rgba(5, 31, 32, 0.16)',
              position: 'relative',
            }}
          >
            {/* Top Bar: Eyebrow Badge + Language Switcher */}
            <div
              style={{
                position: 'relative',
                zIndex: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 9999,
                  background: 'rgba(218, 241, 222, 0.16)',
                  border: '1px solid rgba(192, 234, 204, 0.35)',
                  color: '#C0EACC',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  flexShrink: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 200,
                }}
              >
                <ShieldCheck size={14} color="#C0EACC" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lang === 'hi' ? 'राष्ट्रीय स्वास्थ्य मिशन' : 'National Health Mission'}
                </span>
              </div>

              <div
                role="group"
                aria-label={t.language}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: 2,
                  borderRadius: 9999,
                  background: 'rgba(5, 31, 32, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
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
                        padding: '4px 12px',
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {code === 'en' ? 'EN' : 'हिन्दी'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Center Area: Clinical Illustration in the Black Card */}
            <div
              style={{
                position: 'relative',
                zIndex: 3,
                flex: 1,
                display: 'grid',
                placeItems: 'center',
                padding: '24px 0',
              }}
            >
              <ClinicalIllustration compact={false} />
            </div>

            {/* Bottom: Brand Title, Subtitle, Capability Pill */}
            <div style={{ position: 'relative', zIndex: 3 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  lineHeight: 1.15,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: '#FFFFFF',
                }}
              >
                {t.brandLine1} <span style={{ color: '#C0EACC' }}>{t.brandLine2}</span>
              </h1>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  fontWeight: 500,
                  color: '#DAF1DE',
                }}
              >
                {t.heroSubtitle}
              </p>

              {/* Capability Tag */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 9999,
                  background: 'rgba(218, 241, 222, 0.12)',
                  border: '1px solid rgba(192, 234, 204, 0.25)',
                  color: '#C0EACC',
                  fontSize: 11,
                  fontWeight: 700,
                  marginTop: 14,
                }}
              >
                <Activity size={13} color="#C0EACC" />
                <span>100% Offline-Capable • Tele-Triage & Referrals</span>
              </div>
            </div>
          </header>

          {/* Right Column: Role Selection Cards & Action Flow */}
          <main
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {/* Section Header */}
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 25,
                  fontWeight: 800,
                  color: '#00201C',
                  letterSpacing: '-0.02em',
                }}
              >
                {t.title}
              </h2>
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#404945',
                }}
              >
                {t.heroDesc}
              </p>
            </div>

            {/* Three Role Cards in a Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 16,
              }}
            >
              {CARDS.map((card) => {
                const isSelected = selectedRole === card.key;
                return (
                  <button
                    key={card.key}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedRole(card.key)}
                    className={`ms-btn ms-btn--role-card ${isSelected ? 'is-selected' : ''}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '20px 18px',
                      borderRadius: 20,
                      textAlign: 'left',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 150ms ease',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Top Row: Icon + Badge */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          display: 'grid',
                          placeItems: 'center',
                          background: card.tile,
                          color: '#FFFFFF',
                          boxShadow: '0 4px 12px rgba(5, 31, 32, 0.12)',
                          flexShrink: 0,
                        }}
                      >
                        {card.icon}
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 9999,
                          background: card.badgeBg,
                          color: card.badgeColor,
                          border: '1px solid rgba(142, 182, 155, 0.35)',
                          letterSpacing: '0.01em',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.3,
                        }}
                      >
                        {lang === 'hi' ? card.badgeHi : card.badgeEn}
                      </span>
                    </div>

                    {/* Title & Persona */}
                    <div style={{ marginTop: 14 }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 18,
                          fontWeight: 800,
                          color: '#00201C',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {t.roles[card.key].name}
                      </h3>
                      <div
                        style={{
                          margin: '2px 0 0',
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: '#235347',
                          lineHeight: 1.3,
                        }}
                      >
                        {lang === 'hi' ? card.personaHi : card.personaEn}
                      </div>
                    </div>

                    {/* Description */}
                    <p
                      style={{
                        margin: '8px 0 16px',
                        fontSize: 12.5,
                        lineHeight: 1.4,
                        color: '#404945',
                        flex: 1,
                      }}
                    >
                      {t.roles[card.key].desc}
                    </p>

                    {/* Bottom Action Pill */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '8px 12px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 700,
                        background: isSelected ? '#235347' : '#E7F0EA',
                        color: isSelected ? '#FFFFFF' : '#0B2B26',
                        border: isSelected ? '1px solid #235347' : '1px solid #CCD9D2',
                        transition: 'background 120ms ease, color 120ms ease',
                      }}
                    >
                      {isSelected ? (
                        <>
                          <Check size={14} strokeWidth={2.8} />
                          <span>{t.selected}</span>
                        </>
                      ) : (
                        <>
                          <span>{t.select}</span>
                          <ArrowRight size={13} />
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Honest Demo Disclaimer Box */}
            <div
              style={{
                marginTop: 22,
                padding: '12px 18px',
                borderRadius: 14,
                background: '#E7F0EA',
                border: '1px solid #CCD9D2',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                maxWidth: 580,
                width: '100%',
                marginInline: 'auto',
                boxSizing: 'border-box',
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#00201C' }}>
                {t.disclaimerLine1}
              </p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: '#404945' }}>
                {t.disclaimerLine2}
              </p>
            </div>

            {/* Continue Button */}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
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
                  maxWidth: 320,
                  height: 52,
                  borderRadius: 16,
                  fontSize: 16,
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: selectedRole ? 'pointer' : 'not-allowed',
                }}
              >
                <span>{t.continue}</span>
                <ArrowRight size={18} />
              </button>
            </div>

            {/* Footer */}
            <p style={{ margin: '18px 0 0', textAlign: 'center', fontSize: 12, color: '#707975', fontWeight: 500 }}>
              {t.footer}
            </p>
          </main>
        </div>
      )}
    </div>
  );
}

/// <reference types="vite/client" />
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import BottomNav, { TABS, isActive, type Lang, type Role, type Tab } from './BottomNav';
import enLocale from './i18n/en.json';
import hiLocale from './i18n/hi.json';
import { ViewModeProvider, useViewMode, type ViewMode } from './ViewModeContext';
import { CaseProvider, useCaseStore } from './store/CaseStore';

export { ViewModeProvider, useViewMode, type ViewMode };

export interface ScreenProps {
  lang: Lang;
  online: boolean;
  onNavigate: (route: string) => void;
  onSetLang: (lang: Lang) => void;
  onToggleOnline: () => void;
}

/* ---------- Routes ---------- */
// Route -> screen file in ./screens/. Edit here if the Shared Header list differs.
export const ROUTES: Record<string, string> = {
  '/role': 'RoleSelect',
  '/mitanin/home': 'MitaninHome',
  '/mitanin/visits': 'Visits',
  '/mitanin/screening/patient': 'ScreeningPatient',
  '/mitanin/screening/symptoms': 'ScreeningSymptoms',
  '/mitanin/screening/test': 'TestPhoto',
  '/mitanin/screening/result': 'ScreeningResult',
  '/mitanin/consult': 'ConsultStatus',
  '/mitanin/referral': 'ReferralTracker',
  '/doctor/inbox': 'DoctorInbox',
  '/doctor/review': 'DoctorReview',
  '/supervisor/overview': 'SupervisorDashboard',
  '/case': 'CaseTimeline',
  '/alerts': 'Alerts',
  '/profile': 'Profile',
};

// Landing on a role's home sets that role (RoleSelect only needs onNavigate).
const ROLE_HOME: Record<string, Role> = {
  '/mitanin/home': 'mitanin',
  '/doctor/inbox': 'doctor',
  '/supervisor/overview': 'supervisor',
};

export const inferRoleFromRoute = (r: string): Role | null => {
  if (ROLE_HOME[r]) return ROLE_HOME[r];
  if (r.startsWith('/mitanin')) return 'mitanin';
  if (r.startsWith('/doctor')) return 'doctor';
  if (r.startsWith('/supervisor')) return 'supervisor';
  return null;
};

// Missing screen files fall back to the placeholder instead of breaking the build.
const modules = import.meta.glob('./screens/*.tsx', { eager: true }) as Record<
  string,
  { default?: ComponentType<ScreenProps> }
>;
const loadScreen = (name: string) => modules[`./screens/${name}.tsx`]?.default;

function Placeholder({ route, lang }: { route: string; lang: Lang }) {
  const t = (lang === 'hi' ? hiLocale : enLocale).app;
  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          background: 'var(--ms-surface)',
          borderRadius: 24,
          padding: 24,
          boxShadow: '0 6px 20px rgba(31, 77, 56, 0.08)',
        }}
      >
        <p style={{ margin: 0, color: 'var(--ms-muted)', fontSize: 13 }}>{t.screenNotBuilt}</p>
        <h1 style={{ margin: '4px 0 0', fontSize: 22 }}>{route}</h1>
      </div>
    </div>
  );
}

const roleLabels: Record<Role, { en: string; hi: string }> = {
  mitanin: { en: 'Mitanin (ASHA)', hi: 'मितानिन' },
  doctor: { en: 'Doctor', hi: 'चिकित्सक' },
  supervisor: { en: 'Supervisor', hi: 'पर्यवेक्षक' },
};

function WebSidebar({
  role,
  currentRoute,
  lang,
  onNavigate,
  onSwitchRole,
}: {
  role: Role | null;
  currentRoute: string;
  lang: Lang;
  onNavigate: (route: string) => void;
  onSwitchRole: (newRole: Role | 'role') => void;
}) {
  const t = lang === 'hi' ? hiLocale : enLocale;
  const tabs: Tab[] = role ? TABS[role] : [];

  return (
    <aside className="ms-web-sidebar">
      {/* Brand Header */}
      <div
        style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid var(--ms-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--ms-forest)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(43, 107, 82, 0.25)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
          </svg>
        </div>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--ms-ink)',
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
            }}
          >
            Mitanin Signal
          </h2>
          <span style={{ fontSize: 12, color: 'var(--ms-muted)', fontWeight: 600 }}>
            {lang === 'hi' ? 'सामुदायिक स्वास्थ्य' : 'Community Health'}
          </span>
        </div>
      </div>

      {/* Role Navigation Items */}
      <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        {role ? (
          <>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--ms-muted)',
                padding: '4px 12px 10px',
              }}
            >
              {lang === 'hi' ? 'नेविगेशन' : 'Menu'}
            </div>
            <nav aria-label="Web main navigation" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {tabs.map((tab) => {
                const active = isActive(tab, currentRoute);
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onNavigate(tab.route)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: 0,
                      background: active ? 'var(--ms-mint)' : 'transparent',
                      color: active ? 'var(--ms-forest)' : 'var(--ms-ink)',
                      fontWeight: active ? 700 : 500,
                      fontSize: 14,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease, color 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: active ? 'var(--ms-orange)' : 'var(--ms-muted)',
                      }}
                    >
                      {tab.icon}
                    </span>
                    <span style={{ flex: 1 }}>{t.navigation[tab.labelKey]}</span>
                    {active && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--ms-orange)',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </>
        ) : (
          <div style={{ padding: '8px 12px' }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--ms-muted)',
                marginBottom: 12,
              }}
            >
              {lang === 'hi' ? 'भूमिका चुनें:' : 'Select a role to start:'}
            </div>
            {(['mitanin', 'doctor', 'supervisor'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onSwitchRole(r)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: 6,
                  borderRadius: 10,
                  border: '1px solid var(--ms-border)',
                  background: 'var(--ms-surface)',
                  color: 'var(--ms-forest)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {roleLabels[r][lang]} →
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Role Footer Card */}
      <div
        style={{
          padding: 16,
          borderTop: '1px solid var(--ms-border)',
          background: 'var(--ms-bg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ms-muted)', textTransform: 'uppercase' }}>
            {lang === 'hi' ? 'वर्तमान भूमिका' : 'Active Role'}
          </span>
          <button
            type="button"
            onClick={() => onNavigate('/role')}
            style={{
              background: 'none',
              border: 0,
              padding: 0,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--ms-forest)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {lang === 'hi' ? 'बदलें' : 'Change'}
          </button>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ms-ink)' }}>
          {role ? roleLabels[role][lang] : (lang === 'hi' ? 'कोई भूमिका नहीं' : 'No role selected')}
        </div>
      </div>
    </aside>
  );
}

function WebTopbar({
  role,
  lang,
  online,
  onNavigate,
  onSetLang,
  onToggleOnline,
  onSwitchRole,
}: {
  role: Role | null;
  lang: Lang;
  online: boolean;
  onNavigate: (route: string) => void;
  onSetLang: (lang: Lang) => void;
  onToggleOnline: () => void;
  onSwitchRole: (newRole: Role | 'role') => void;
}) {
  const { mode, setMode } = useViewMode();
  const { syncNow, waitingSyncCount } = useCaseStore();

  return (
    <header className="ms-web-topbar">
      {/* Left: Role Quick Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label
          htmlFor="ms-role-switcher"
          style={{ fontSize: 13, fontWeight: 700, color: 'var(--ms-muted)' }}
        >
          {lang === 'hi' ? 'भूमिका:' : 'Role:'}
        </label>
        <select
          id="ms-role-switcher"
          value={role ?? 'role'}
          onChange={(e) => onSwitchRole(e.target.value as Role | 'role')}
          style={{
            padding: '6px 12px',
            borderRadius: 10,
            border: '1px solid var(--ms-border)',
            background: 'var(--ms-surface)',
            color: 'var(--ms-ink)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <option value="role">{lang === 'hi' ? 'भूमिका चयन (सभी)' : 'Role Select (None)'}</option>
          <option value="mitanin">{roleLabels.mitanin[lang]}</option>
          <option value="doctor">{roleLabels.doctor[lang]}</option>
          <option value="supervisor">{roleLabels.supervisor[lang]}</option>
        </select>
      </div>

      {/* Right Controls: EN/HI Toggle, Offline/Synced Chip, View Switch Segmented Control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Offline / Synced Chip */}
        <button
          type="button"
          onClick={onToggleOnline}
          title={online ? (lang === 'hi' ? 'ऑनलाइन स्थिति' : 'Synced - Click to test offline') : (lang === 'hi' ? 'ऑफ़लाइन स्थिति' : 'Offline - Click to test online')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 999,
            border: `1px solid ${online ? '#C1E2CA' : '#FFE0B2'}`,
            background: online ? 'var(--ms-mint)' : '#FFF3E0',
            color: online ? 'var(--ms-forest)' : 'var(--ms-orange-700)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: online ? 'var(--ms-ok)' : 'var(--ms-warn)',
            }}
          />
          <span>
            {online
              ? (lang === 'hi' ? 'सिंक किया गया (सिम्युलेटेड)' : 'Synced (Simulated)')
              : (lang === 'hi'
                  ? `ऑफ़लाइन (${waitingSyncCount ? `${waitingSyncCount} लंबित` : 'सिम्युलेटेड'})`
                  : `Offline (${waitingSyncCount ? `${waitingSyncCount} waiting` : 'Simulated'})`)}
          </span>
        </button>

        {online && waitingSyncCount > 0 && (
          <button
            type="button"
            onClick={syncNow}
            title={lang === 'hi' ? 'सिम्युलेटेड सिंक' : 'Simulated sync'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid var(--ms-green)',
              background: 'var(--ms-green)',
              color: '#FFFFFF',
              fontSize: 11.5,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {lang === 'hi' ? 'अभी सिंक करें (सिम्युलेटेड)' : 'Sync now (Simulated)'}
          </button>
        )}

        {/* EN / HI Toggle */}
        <div
          role="group"
          aria-label={lang === 'hi' ? 'भाषा' : 'Language'}
          style={{
            display: 'inline-flex',
            background: 'var(--ms-bg)',
            border: '1px solid var(--ms-border)',
            borderRadius: 20,
            padding: 2,
          }}
        >
          <button
            type="button"
            aria-pressed={lang === 'en'}
            onClick={() => onSetLang('en')}
            style={{
              padding: '4px 10px',
              borderRadius: 16,
              border: 0,
              background: lang === 'en' ? 'var(--ms-forest)' : 'transparent',
              color: lang === 'en' ? '#FFFFFF' : 'var(--ms-muted)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            EN
          </button>
          <button
            type="button"
            aria-pressed={lang === 'hi'}
            onClick={() => onSetLang('hi')}
            style={{
              padding: '4px 10px',
              borderRadius: 16,
              border: 0,
              background: lang === 'hi' ? 'var(--ms-forest)' : 'transparent',
              color: lang === 'hi' ? '#FFFFFF' : 'var(--ms-muted)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            HI
          </button>
        </div>

        {/* View Switch: Segmented control 'Phone | Web' */}
        <div
          role="radiogroup"
          aria-label="View Mode Switch"
          style={{
            display: 'inline-flex',
            background: 'var(--ms-bg)',
            border: '1.5px solid var(--ms-border)',
            borderRadius: 20,
            padding: 3,
            gap: 2,
          }}
        >
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'phone'}
            onClick={() => setMode('phone')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              borderRadius: 16,
              border: 0,
              background: mode === 'phone' ? 'var(--ms-forest)' : 'transparent',
              color: mode === 'phone' ? '#FFFFFF' : 'var(--ms-muted)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="3" />
              <line x1="12" y1="18" x2="12" y2="18" />
            </svg>
            <span>Phone</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'web' || mode === 'auto'}
            onClick={() => setMode('web')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              borderRadius: 16,
              border: 0,
              background: mode !== 'phone' ? 'var(--ms-forest)' : 'transparent',
              color: mode !== 'phone' ? '#FFFFFF' : 'var(--ms-muted)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>Web</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function AppContent() {
  const [route, setRoute] = useState<string>(() => {
    if (typeof window !== 'undefined' && ROUTES[window.location.pathname]) {
      return window.location.pathname;
    }
    return '/role';
  });

  const [role, setRole] = useState<Role | null>(() => {
    if (typeof window !== 'undefined' && ROUTES[window.location.pathname]) {
      return inferRoleFromRoute(window.location.pathname);
    }
    return null;
  });

  const [lang, setLang] = useState<Lang>('en');
  const [online, setOnline] = useState<boolean>(true);

  const { isWeb, setMode } = useViewMode();
  const { syncNow } = useCaseStore();
  const prevOnline = useRef(online);

  useEffect(() => {
    if (!prevOnline.current && online) {
      syncNow();
    }
    prevOnline.current = online;
  }, [online, syncNow]);

  const onNavigate = useCallback((next: string) => {
    // Reject unknown route strings instead of silently rendering an arbitrary screen.
    if (!Object.prototype.hasOwnProperty.call(ROUTES, next)) return;
    if (typeof window !== 'undefined' && window.location.pathname !== next) {
      window.history.pushState(null, '', next);
    }
    if (next === '/role') {
      setRole(null);
    } else {
      const targetRole = inferRoleFromRoute(next);
      if (targetRole) setRole(targetRole);
    }
    setRoute(next);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const p = window.location.pathname;
      if (ROUTES[p]) {
        setRoute(p);
        setRole(inferRoleFromRoute(p));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const onToggleOnline = useCallback(() => setOnline((v) => !v), []);

  const onSwitchRole = useCallback(
    (newRole: Role | 'role') => {
      if (newRole === 'role') {
        onNavigate('/role');
      } else {
        const homeRoute =
          newRole === 'mitanin'
            ? '/mitanin/home'
            : newRole === 'doctor'
            ? '/doctor/inbox'
            : '/supervisor/overview';
        onNavigate(homeRoute);
      }
    },
    [onNavigate]
  );

  const current = route;
  const showNav = role !== null && current !== '/role';
  const Screen = loadScreen(ROUTES[current] ?? '');

  const props: ScreenProps = { lang, online, onNavigate, onSetLang: setLang, onToggleOnline };

  if (isWeb) {
    return (
      <div className="ms-web-layout">
        {/* Left Sidebar (approx 256px) */}
        <WebSidebar
          role={role}
          currentRoute={current}
          lang={lang}
          onNavigate={onNavigate}
          onSwitchRole={onSwitchRole}
        />

        {/* Main Section */}
        <div className="ms-web-main">
          {/* Top Bar */}
          <WebTopbar
            role={role}
            lang={lang}
            online={online}
            onNavigate={onNavigate}
            onSetLang={setLang}
            onToggleOnline={onToggleOnline}
            onSwitchRole={onSwitchRole}
          />

          {/* Content Area up to 1200px wide wrapped in @container */}
          <div className="ms-web-content-wrap">
            <div className="@container ms-container-wrap ms-web-container" style={{ width: '100%', maxWidth: 1200, margin: '0 auto' }}>
              <main className="ms-screen-content">
                {Screen ? <Screen {...props} /> : <Placeholder route={current} lang={lang} />}
              </main>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Phone Mode: Centred frame, max width 430 px, with the existing bottom nav.
  // On large screens drawn like a phone device (rounded corners, soft shadow) on a mid-green background.
  return (
    <div className="ms-phone-mode-backdrop">
      <div className="ms-phone-device">
        <div className="ms-phone-device-island">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0F172A' }} />
          <span style={{ width: 36, height: 4, borderRadius: 2, background: '#334155' }} />
        </div>

        <div className="ms-phone-scroll-body">
          <div className="@container ms-container-wrap ms-app-shell" style={{ width: '100%', maxWidth: 430, margin: '0 auto', paddingBottom: showNav ? 104 : 24 }}>
            <main className="ms-screen-content">
              {Screen ? <Screen {...props} /> : <Placeholder route={current} lang={lang} />}
            </main>
          </div>
        </div>

        {showNav && role && (
          <BottomNav role={role} route={current} lang={lang} onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ViewModeProvider>
      <CaseProvider>
        <AppContent />
      </CaseProvider>
    </ViewModeProvider>
  );
}

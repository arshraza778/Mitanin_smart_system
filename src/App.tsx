/// <reference types="vite/client" />
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { Menu, X } from 'lucide-react';
import BottomNav, { TABS, isActive, type Lang, type Role, type Tab } from './BottomNav';
import enLocale from './i18n/en.json';
import hiLocale from './i18n/hi.json';
import { ViewModeProvider, useViewMode, type ViewMode } from './ViewModeContext';
import { CaseProvider, useCaseStore } from './store/CaseStore';
import { ScreenDraftProvider, useScreenDraft } from './ScreenDraftContext';
import { AlertBadge } from './motion/AlertBadge';

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

const screenTitles: Record<string, { en: string; hi: string }> = {
  '/role': { en: 'Select Role', hi: 'भूमिका चयन' },
  '/mitanin/home': { en: 'Mitanin Home', hi: 'मितानिन होम' },
  '/mitanin/visits': { en: 'Visits', hi: 'दौरे' },
  '/mitanin/screening/patient': { en: 'Patient Screening', hi: 'मरीज स्क्रीनिंग' },
  '/mitanin/screening/symptoms': { en: 'Symptoms', hi: 'लक्षण' },
  '/mitanin/screening/test': { en: 'Rapid Test Photo', hi: 'रैपिड टेस्ट' },
  '/mitanin/screening/result': { en: 'Screening Result', hi: 'परिणाम' },
  '/mitanin/consult': { en: 'Doctor Consult', hi: 'डॉक्टर परामर्श' },
  '/mitanin/referral': { en: 'Referral Tracker', hi: 'रेफरल ट्रैकर' },
  '/doctor/inbox': { en: 'Doctor Inbox', hi: 'इनबॉक्स' },
  '/doctor/review': { en: 'Case Review', hi: 'केस समीक्षा' },
  '/supervisor/overview': { en: 'Overview', hi: 'अवलोकन' },
  '/case': { en: 'Case Timeline', hi: 'केस टाइमलाइन' },
  '/alerts': { en: 'Alerts', hi: 'अलर्ट' },
  '/profile': { en: 'Profile', hi: 'प्रोफ़ाइल' },
};

function WebSidebar({
  role,
  currentRoute,
  lang,
  onNavigate,
  onSwitchRole,
  onClose,
}: {
  role: Role | null;
  currentRoute: string;
  lang: Lang;
  onNavigate: (route: string) => void;
  onSwitchRole: (newRole: Role | 'role') => void;
  onClose?: () => void;
}) {
  const t = lang === 'hi' ? hiLocale : enLocale;
  const tabs: Tab[] = role ? TABS[role] : [];
  const { unreadAlertsCount } = useCaseStore();

  const handleNav = (targetRoute: string) => {
    onNavigate(targetRoute);
    onClose?.();
  };

  return (
    <aside
      className="ms-web-sidebar on-dark-900"
      style={{
        width: 'var(--ms-sidebar-width)',
        minWidth: 'var(--ms-sidebar-width)',
        maxWidth: 'var(--ms-sidebar-width)',
        height: '100dvh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        zIndex: 30,
        borderRight: '1px solid var(--ms-dark-800)',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid var(--ms-dark-800)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--ms-radius-sm)',
              background: 'var(--ms-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ms-text-white)',
              boxShadow: 'var(--ms-shadow)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v8" />
              <path d="M8 12h8" />
            </svg>
          </div>
          <div>
            <h2
              className="ms-title"
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '-0.3px',
                lineHeight: 1.2,
              }}
            >
              Mitanin Signal
            </h2>
            <span className="ms-meta" style={{ fontSize: 12, fontWeight: 600 }}>
              {lang === 'hi' ? 'सामुदायिक स्वास्थ्य' : 'Community Health'}
            </span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="ms-btn ms-btn--ghost ms-btn--icon"
            style={{
              color: 'var(--ms-text-light)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Role Navigation Items */}
      <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        {role ? (
          <>
            <div
              className="ms-meta"
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '4px 12px 10px',
              }}
            >
              {lang === 'hi' ? 'नेविगेशन' : 'Menu'}
            </div>
            <nav aria-label="Web main navigation" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tabs.map((tab) => {
                const active = isActive(tab, currentRoute);
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleNav(tab.route)}
                    aria-current={active ? 'page' : undefined}
                    className={`ms-btn ms-btn--sidebar ${active ? 'is-active' : ''}`}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 'var(--ms-radius-sm)',
                    }}
                  >
                    <span
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: active ? 'var(--ms-text-white)' : 'var(--ms-sage)',
                      }}
                    >
                      {tab.icon}
                      {tab.id === 'alerts' && unreadAlertsCount > 0 && (
                        <AlertBadge
                          count={unreadAlertsCount}
                          maxDisplay={99}
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: -10,
                            minWidth: 16,
                            height: 16,
                            padding: '0 4px',
                          }}
                        />
                      )}
                    </span>
                    <span style={{ flex: 1 }}>{t.navigation[tab.labelKey]}</span>
                  </button>
                );
              })}
            </nav>
          </>
        ) : (
          <div style={{ padding: '8px 12px' }}>
            <div
              className="ms-meta"
              style={{
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              {lang === 'hi' ? 'भूमिका चुनें:' : 'Select a role to start:'}
            </div>
            {(['mitanin', 'doctor', 'supervisor'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  onSwitchRole(r);
                  onClose?.();
                }}
                className="ms-btn ms-btn--secondary-on-dark ms-btn--md ms-btn--block"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 14px',
                  marginBottom: 8,
                  borderRadius: 'var(--ms-radius-sm)',
                  fontWeight: 700,
                  fontSize: 13,
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
        className="on-dark-800"
        style={{
          padding: 16,
          borderTop: '1px solid var(--ms-dark-850)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="ms-meta" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
            {lang === 'hi' ? 'वर्तमान भूमिका' : 'Active Role'}
          </span>
          <button
            type="button"
            onClick={() => {
              onNavigate('/role');
              onClose?.();
            }}
            className="ms-btn ms-btn--ghost ms-btn--sm"
            style={{
              padding: 0,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--ms-text-light)',
              textDecoration: 'underline',
            }}
          >
            {lang === 'hi' ? 'बदलें' : 'Change'}
          </button>
        </div>
        <div className="ms-title" style={{ fontSize: 14, fontWeight: 700 }}>
          {role ? roleLabels[role][lang] : (lang === 'hi' ? 'कोई भूमिका नहीं' : 'No role selected')}
        </div>
      </div>
    </aside>
  );
}

function WebTopbar({
  role,
  currentRoute,
  lang,
  online,
  isDrawerRange,
  onNavigate,
  onSetLang,
  onToggleOnline,
  onSwitchRole,
  onToggleDrawer,
}: {
  role: Role | null;
  currentRoute: string;
  lang: Lang;
  online: boolean;
  isDrawerRange: boolean;
  onNavigate: (route: string) => void;
  onSetLang: (lang: Lang) => void;
  onToggleOnline: () => void;
  onSwitchRole: (newRole: Role | 'role') => void;
  onToggleDrawer: () => void;
}) {
  const { mode, setMode } = useViewMode();
  const { syncNow, waitingSyncCount } = useCaseStore();

  return (
    <header className="ms-web-topbar">
      {/* Left: Hamburger (if drawer range and not role), Page Title, Role Quick Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        {isDrawerRange && currentRoute !== '/role' && (
          <button
            type="button"
            onClick={onToggleDrawer}
            aria-label={lang === 'hi' ? 'नेविगेशन खोलें' : 'Toggle navigation'}
            className="ms-btn ms-btn--secondary ms-btn--icon"
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--ms-radius-sm)',
            }}
          >
            <Menu size={20} />
          </button>
        )}

        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 800,
              color: 'var(--ms-text)',
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {screenTitles[currentRoute]?.[lang] || 'Mitanin Signal'}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label
            htmlFor="ms-role-switcher"
            style={{ fontSize: 13, fontWeight: 700, color: 'var(--ms-muted)', whiteSpace: 'nowrap' }}
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
      </div>

      {/* Right Controls: Offline/Synced Chip, EN/HI Toggle, View Switch Segmented Control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {/* Offline / Synced Chip */}
        <button
          type="button"
          onClick={onToggleOnline}
          title={online ? (lang === 'hi' ? 'सुरक्षित और भेजा गया' : 'Saved and sent') : (lang === 'hi' ? 'सिग्नल नहीं। फ़ोन पर सहेजा गया' : 'No signal. Saved on phone')}
          className={`ms-btn ms-btn--chip ${online ? 'ms-btn--secondary' : 'ms-btn--ghost'}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 'var(--ms-radius-pill)',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: online ? 'var(--ms-ok)' : 'var(--ms-warn)',
            }}
          />
          <span>
            {online
              ? (lang === 'hi' ? 'सुरक्षित और भेजा गया' : 'Saved and sent')
              : (lang === 'hi' ? 'सिग्नल नहीं। फ़ोन पर सहेजा गया' : 'No signal. Saved on phone')}
          </span>
        </button>

        {online && waitingSyncCount > 0 && (
          <button
            type="button"
            onClick={syncNow}
            title={lang === 'hi' ? 'सिम्युलेटेड सिंक' : 'Simulated sync'}
            className="ms-btn ms-btn--primary ms-btn--sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 'var(--ms-radius-pill)',
              fontSize: 12,
              fontWeight: 800,
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
            background: 'var(--ms-surface-alt)',
            border: '1px solid var(--ms-border)',
            borderRadius: 'var(--ms-radius-pill)',
            padding: 2,
          }}
        >
          <button
            type="button"
            aria-pressed={lang === 'en'}
            onClick={() => onSetLang('en')}
            className={`ms-btn ms-btn--chip ${lang === 'en' ? 'ms-btn--primary' : 'ms-btn--ghost'}`}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--ms-radius-pill)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            EN
          </button>
          <button
            type="button"
            aria-pressed={lang === 'hi'}
            onClick={() => onSetLang('hi')}
            className={`ms-btn ms-btn--chip ${lang === 'hi' ? 'ms-btn--primary' : 'ms-btn--ghost'}`}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--ms-radius-pill)',
              fontSize: 12,
              fontWeight: 700,
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
            background: 'var(--ms-surface-alt)',
            border: '1.5px solid var(--ms-border)',
            borderRadius: 'var(--ms-radius-pill)',
            padding: 2,
            gap: 2,
          }}
        >
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'phone'}
            onClick={() => setMode('phone')}
            className={`ms-btn ms-btn--chip ${mode === 'phone' ? 'ms-btn--primary' : 'ms-btn--ghost'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              borderRadius: 'var(--ms-radius-pill)',
              fontSize: 12,
              fontWeight: 700,
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
            className={`ms-btn ms-btn--chip ${mode !== 'phone' ? 'ms-btn--primary' : 'ms-btn--ghost'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              borderRadius: 'var(--ms-radius-pill)',
              fontSize: 12,
              fontWeight: 700,
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
  const { currentRole, setCurrentRole } = useScreenDraft();

  const [route, setRoute] = useState<string>(() => {
    if (typeof window !== 'undefined' && ROUTES[window.location.pathname]) {
      return window.location.pathname;
    }
    return '/role';
  });

  const [role, setRole] = useState<Role | null>(() => {
    if (typeof window !== 'undefined' && ROUTES[window.location.pathname]) {
      const inferred = inferRoleFromRoute(window.location.pathname);
      if (inferred) return inferred;
      const stored = localStorage.getItem('ms_current_role') as Role | null;
      if (stored) return stored;
    }
    return null;
  });

  const [lang, setLang] = useState<Lang>('en');
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    setCurrentRole(role);
  }, [role, setCurrentRole]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const titleKey = screenTitles[route]?.[lang] || 'Mitanin Signal';
    document.title = `${titleKey} - Mitanin Signal`;
    document.documentElement.lang = lang;
  }, [route, lang]);

  const { isWeb, isDrawerRange } = useViewMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { syncNow, demoDataResetNotice, dismissResetNotice } = useCaseStore();
  const prevOnline = useRef(online);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!prevOnline.current && online) {
      syncNow();
    }
    prevOnline.current = online;
  }, [online, syncNow]);

  const onNavigate = useCallback((next: string) => {
    // Reject unknown route strings instead of silently rendering an arbitrary screen.
    if (!Object.prototype.hasOwnProperty.call(ROUTES, next)) return;
    setDrawerOpen(false);
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
      setDrawerOpen(false);
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
    const isRoleScreen = current === '/role';

    return (
      <div className="ms-web-layout">
        {/* Left Sidebar (fixed on wide desktop >= 1024; hidden on /role) */}
        {!isRoleScreen && !isDrawerRange && (
          <WebSidebar
            role={role}
            currentRoute={current}
            lang={lang}
            onNavigate={onNavigate}
            onSwitchRole={onSwitchRole}
          />
        )}

        {/* Drawer for 768px-1023px tablet range */}
        {!isRoleScreen && isDrawerRange && drawerOpen && (
          <>
            <div
              className="ms-drawer-backdrop"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="ms-web-drawer">
              <WebSidebar
                role={role}
                currentRoute={current}
                lang={lang}
                onNavigate={onNavigate}
                onSwitchRole={onSwitchRole}
                onClose={() => setDrawerOpen(false)}
              />
            </div>
          </>
        )}

        {/* Main Section */}
        <div className="ms-web-main">
          {/* Top Bar */}
          <WebTopbar
            role={role}
            currentRoute={current}
            lang={lang}
            online={online}
            isDrawerRange={isDrawerRange}
            onNavigate={onNavigate}
            onSetLang={setLang}
            onToggleOnline={onToggleOnline}
            onSwitchRole={onSwitchRole}
            onToggleDrawer={() => setDrawerOpen((v) => !v)}
          />

          {demoDataResetNotice && (
            <div
              role="alert"
              style={{
                background: 'var(--ms-warn-bg)',
                color: 'var(--ms-warn)',
                borderBottom: '1px solid var(--ms-border)',
                padding: '8px 24px',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{lang === 'hi' ? 'डेमो डेटा रीसेट किया गया था' : 'Demo data was reset'}</span>
              <button
                type="button"
                onClick={dismissResetNotice}
                className="ms-btn ms-btn--ghost ms-btn--close"
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Content Area: RoleSelect centered up to 960px; all other screens centered up to 1200px */}
          <div className="ms-web-content-wrap">
            <div
              className="@container ms-container-wrap ms-web-container"
              style={{
                width: '100%',
                maxWidth: isRoleScreen ? 960 : 1200,
                margin: '0 auto',
              }}
            >
              <main className="ms-screen-content">
                {Screen ? <Screen {...props} /> : <Placeholder route={current} lang={lang} />}
              </main>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Phone Mode: Centred frame, max width 430 px, with dark header band using .on-dark-900 and bottom nav
  return (
    <div className="ms-phone-mode-backdrop">
      <div className="ms-phone-device">
        <div className="ms-phone-device-island">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#051F20' }} />
          <span style={{ width: 36, height: 4, borderRadius: 2, background: '#163832' }} />
        </div>

        {/* Dark Header Band using .on-dark-900 */}
        <header
          className="on-dark-900"
          style={{
            height: 48,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--ms-dark-800)',
            flexShrink: 0,
            zIndex: 25,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 'var(--ms-radius-sm)',
                background: 'var(--ms-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ms-text-white)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ms-text-white)', letterSpacing: '-0.2px' }}>
              Mitanin Signal
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={onToggleOnline}
              className={`ms-btn ms-btn--sm ${online ? 'ms-pill-ok' : 'ms-pill-due'}`}
              style={{ padding: '2px 8px', fontSize: 11 }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: online ? 'var(--ms-primary)' : 'var(--ms-warn)' }} />
              <span>{online ? (lang === 'hi' ? 'सिंक' : 'Synced') : (lang === 'hi' ? 'ऑफ़लाइन' : 'Offline')}</span>
            </button>
          </div>
        </header>

        <div className="ms-phone-scroll-body">
          {demoDataResetNotice && (
            <div
              role="alert"
              style={{
                background: 'var(--ms-warn-bg)',
                color: 'var(--ms-warn)',
                borderBottom: '1px solid var(--ms-border)',
                padding: '8px 16px',
                fontSize: 12.5,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{lang === 'hi' ? 'डेमो डेटा रीसेट किया गया था' : 'Demo data was reset'}</span>
              <button
                type="button"
                onClick={dismissResetNotice}
                className="ms-btn ms-btn--ghost ms-btn--close"
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                }}
              >
                ×
              </button>
            </div>
          )}
          <div className="@container ms-container-wrap ms-app-shell" style={{ width: '100%', maxWidth: 430, margin: '0 auto', paddingBottom: showNav ? "var(--ms-screen-padding-bottom)" : 24 }}>
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
        <ScreenDraftProvider>
          <AppContent />
        </ScreenDraftProvider>
      </CaseProvider>
    </ViewModeProvider>
  );
}

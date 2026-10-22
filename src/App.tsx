/// <reference types="vite/client" />
import { useCallback, useState, type ComponentType } from 'react';
import BottomNav, { type Lang, type Role } from './BottomNav';
import enLocale from './i18n/en.json';
import hiLocale from './i18n/hi.json';

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

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [route, setRoute] = useState<string>('/role');
  const [lang, setLang] = useState<Lang>('en');
  const [online, setOnline] = useState<boolean>(true);

  const onNavigate = useCallback((next: string) => {
    // Reject unknown route strings instead of silently rendering an arbitrary screen.
    if (!Object.prototype.hasOwnProperty.call(ROUTES, next)) return;
    if (next === '/role') setRole(null);
    else if (ROLE_HOME[next]) setRole(ROLE_HOME[next]);
    setRoute(next);
  }, []);
  const onToggleOnline = useCallback(() => setOnline((v) => !v), []);

  // Without a role the only valid screen is role select.
  const current = role ? route : '/role';
  const showNav = role !== null && current !== '/role';
  const Screen = loadScreen(ROUTES[current] ?? '');

  const props: ScreenProps = { lang, online, onNavigate, onSetLang: setLang, onToggleOnline };

  return (
    <>
      <div className="ms-app-shell" style={{ paddingBottom: showNav ? 104 : 0 }}>
        <main className="ms-screen-content">{Screen ? <Screen {...props} /> : <Placeholder route={current} lang={lang} />}</main>
        {showNav && role && (
          <BottomNav role={role} route={current} lang={lang} onNavigate={onNavigate} />
        )}
      </div>
    </>
  );
}

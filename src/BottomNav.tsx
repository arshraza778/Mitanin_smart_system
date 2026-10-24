import type { ReactElement } from 'react';
import enLocale from './i18n/en.json';
import hiLocale from './i18n/hi.json';
import { useCaseStore } from './store/CaseStore';

export type Role = 'mitanin' | 'doctor' | 'supervisor';
export type Lang = 'en' | 'hi';

export interface Tab {
  id: string;
  route: string;
  /** Routes that keep this tab highlighted (exact or as a path prefix). */
  match: string[];
  labelKey: keyof typeof enLocale.navigation;
  icon: ReactElement;
}

const svgProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const icons = {
  home: (
    <svg {...svgProps}>
      <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
    </svg>
  ),
  visits: (
    <svg {...svgProps}>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 3v3M15 3v3M8.5 11h7M8.5 15h7" />
    </svg>
  ),
  alerts: (
    <svg {...svgProps}>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 21h4" />
    </svg>
  ),
  profile: (
    <svg {...svgProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  ),
  inbox: (
    <svg {...svgProps}>
      <path d="M4 13 6.5 5h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M4 13h4.5l1 2.5h5l1-2.5H20" />
    </svg>
  ),
  replied: (
    <svg {...svgProps}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4A1.5 1.5 0 0 1 4 14.5z" />
      <path d="m8.5 10 2.5 2.5 4.5-5" />
    </svg>
  ),
  cases: (
    <svg {...svgProps}>
      <path d="M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" />
    </svg>
  ),
  people: (
    <svg {...svgProps}>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M15.5 5.3a3.4 3.4 0 0 1 0 6.4M17.5 14.2a6.5 6.5 0 0 1 4 5.8" />
    </svg>
  ),
  overview: (
    <svg {...svgProps}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  ),
};

const alertsTab: Tab = {
  id: 'alerts',
  route: '/alerts',
  match: ['/alerts'],
  labelKey: 'alerts',
  icon: icons.alerts,
};

const profileTab: Tab = {
  id: 'profile',
  route: '/profile',
  match: ['/profile'],
  labelKey: 'profile',
  icon: icons.profile,
};

const casesTab: Tab = {
  id: 'cases',
  route: '/case',
  match: ['/case'],
  labelKey: 'cases',
  icon: icons.cases,
};

export const TABS: Record<Role, Tab[]> = {
  mitanin: [
    {
      id: 'home',
      route: '/mitanin/home',
      match: ['/mitanin/home', '/mitanin/screening/symptoms', '/mitanin/screening/test', '/mitanin/screening/result', '/mitanin/consult', '/mitanin/referral'],
      labelKey: 'home',
      icon: icons.home,
    },
    {
      id: 'visits',
      route: '/mitanin/visits',
      match: ['/mitanin/visits'],
      labelKey: 'visits',
      icon: icons.visits,
    },
    alertsTab,
    profileTab,
  ],
  doctor: [
    {
      id: 'inbox',
      route: '/doctor/inbox',
      match: ['/doctor/inbox', '/doctor/review'],
      labelKey: 'inbox',
      icon: icons.inbox,
    },
    {
      id: 'cases',
      route: '/case',
      match: ['/case'],
      labelKey: 'cases',
      icon: icons.cases,
    },
    alertsTab,
    profileTab,
  ],
  supervisor: [
    {
      id: 'overview',
      route: '/supervisor/overview',
      match: ['/supervisor/overview'],
      labelKey: 'overview',
      icon: icons.overview,
    },
    casesTab,
    alertsTab,
    profileTab,
  ],
};

export const isActive = (tab: Tab, route: string) =>
  tab.match.some((m) => route === m || route.startsWith(m + '/'));

interface BottomNavProps {
  role: Role;
  route: string;
  lang: Lang;
  onNavigate: (route: string) => void;
}

export default function BottomNav({ role, route, lang, onNavigate }: BottomNavProps) {
  const { unreadAlertsCount } = useCaseStore();

  return (
    <nav
      aria-label={(lang === 'hi' ? hiLocale : enLocale).navigation.main}
      className="pb-[env(safe-area-inset-bottom)]"
      style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        padding: '0 12px calc(12px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
        zIndex: 20,
        pointerEvents: 'none',
      }}
    >
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: '8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          alignItems: 'center',
          background: 'var(--ms-surface)',
          borderRadius: 28,
          boxShadow: '0 10px 30px rgba(31, 77, 56, 0.18)',
          pointerEvents: 'auto',
        }}
      >
        {TABS[role].map((tab) => {
          const active = isActive(tab, route);
          return (
            <li key={tab.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => onNavigate(tab.route)}
                aria-current={active ? 'page' : undefined}
                className="ms-navbtn"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  padding: '4px 2px',
                  minHeight: 48,
                  minWidth: 48,
                  width: '100%',
                  background: 'none',
                  border: 0,
                  borderRadius: 16,
                  cursor: 'pointer',
                  font: 'inherit',
                  fontSize: lang === 'hi' ? 10.5 : 11,
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--ms-orange)' : 'var(--ms-muted)',
                }}
              >
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {tab.icon}
                  {tab.id === 'alerts' && unreadAlertsCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -8,
                        minWidth: 16,
                        height: 16,
                        padding: '0 4px',
                        borderRadius: 999,
                        background: 'var(--ms-danger)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 800,
                        display: 'grid',
                        placeItems: 'center',
                        lineHeight: 1,
                      }}
                    >
                      {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                    </span>
                  )}
                </span>
                <span style={{ maxWidth: '100%', overflowWrap: 'break-word', textAlign: 'center', lineHeight: 1.15 }}>
                  {(lang === 'hi' ? hiLocale : enLocale).navigation[tab.labelKey]}
                </span>
                <span
                  aria-hidden
                  style={{
                    display: 'block',
                    flexShrink: 0,
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: active ? 'var(--ms-orange)' : 'transparent',
                  }}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

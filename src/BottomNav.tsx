import type { ReactElement } from 'react';
import { Home, Calendar, Bell, User, Inbox, FolderKanban, LayoutDashboard } from 'lucide-react';
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

const iconSize = 22;

const alertsTab: Tab = {
  id: 'alerts',
  route: '/alerts',
  match: ['/alerts'],
  labelKey: 'alerts',
  icon: <Bell size={iconSize} aria-hidden />,
};

const profileTab: Tab = {
  id: 'profile',
  route: '/profile',
  match: ['/profile'],
  labelKey: 'profile',
  icon: <User size={iconSize} aria-hidden />,
};

const casesTab: Tab = {
  id: 'cases',
  route: '/case',
  match: ['/case'],
  labelKey: 'cases',
  icon: <FolderKanban size={iconSize} aria-hidden />,
};

export const TABS: Record<Role, Tab[]> = {
  mitanin: [
    {
      id: 'home',
      route: '/mitanin/home',
      match: ['/mitanin/home', '/mitanin/screening/symptoms', '/mitanin/screening/test', '/mitanin/screening/result', '/mitanin/consult', '/mitanin/referral'],
      labelKey: 'home',
      icon: <Home size={iconSize} aria-hidden />,
    },
    {
      id: 'visits',
      route: '/mitanin/visits',
      match: ['/mitanin/visits'],
      labelKey: 'visits',
      icon: <Calendar size={iconSize} aria-hidden />,
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
      icon: <Inbox size={iconSize} aria-hidden />,
    },
    {
      id: 'cases',
      route: '/case',
      match: ['/case'],
      labelKey: 'cases',
      icon: <FolderKanban size={iconSize} aria-hidden />,
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
      icon: <LayoutDashboard size={iconSize} aria-hidden />,
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
      style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        padding: '0 12px calc(10px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: '6px 8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          alignItems: 'center',
          background: 'var(--ms-card)',
          border: '1px solid var(--ms-border)',
          borderRadius: 'var(--ms-radius-lg)',
          boxShadow: 'var(--ms-shadow)',
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
                className={`ms-btn ms-navbtn ${active ? 'is-active' : ''}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  padding: '6px 4px',
                  minHeight: 'var(--ms-tap-target)',
                  minWidth: 'var(--ms-tap-target)',
                  width: '100%',
                                                      borderRadius: 'var(--ms-radius-sm)',
                  cursor: 'pointer',
                  font: 'inherit',
                  fontSize: lang === 'hi' ? 12 : 12,
                  fontWeight: active ? 700 : 500,
                                    transition: 'background-color 0.15s ease, color 0.15s ease',
                }}
              >
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {tab.icon}
                  {tab.id === 'alerts' && unreadAlertsCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -5,
                        right: -9,
                        minWidth: 18,
                        height: 18,
                        padding: '0 4px',
                        borderRadius: 'var(--ms-radius-pill)',
                        background: 'var(--ms-danger)',
                        color: 'var(--ms-text-white)',
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
                <span
                  style={{
                    maxWidth: '100%',
                    overflowWrap: 'break-word',
                    textAlign: 'center',
                    lineHeight: 1.15,
                                      }}
                >
                  {(lang === 'hi' ? hiLocale : enLocale).navigation[tab.labelKey]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}


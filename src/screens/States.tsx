import type { ReactNode } from 'react';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';

export type StateVariant = 'offline' | 'syncing' | 'empty';

const COPY = { en: enLocale.screens.States, hi: hiLocale.screens.States } as const;

export default function States({ variant, lang = 'en', children }: { variant: StateVariant; lang?: 'en' | 'hi'; children?: ReactNode }) {
  const t = COPY[lang];
  const content = variant === 'offline'
    ? [t.offlineTitle, t.offlineBody]
    : variant === 'syncing'
      ? [t.syncingTitle, t.syncingBody]
      : [t.emptyTitle, t.emptyBody];
  return <section role="status" style={{ padding: 20, borderRadius: 20, background: 'var(--ms-surface)', color: 'var(--ms-ink)' }}>
    <h2 style={{ marginTop: 0 }}>{content[0]}</h2><p>{content[1]}</p>{children}
  </section>;
}

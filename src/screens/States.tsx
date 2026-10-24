import type { ReactNode } from 'react';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';

export type StateVariant = 'offline' | 'syncing' | 'empty';

const COPY = { en: enLocale.screens.States, hi: hiLocale.screens.States } as const;

export default function States({
  variant,
  lang = 'en',
  children,
}: {
  variant: StateVariant;
  lang?: 'en' | 'hi';
  children?: ReactNode;
}) {
  const t = COPY[lang];
  const content =
    variant === 'offline'
      ? [t.offlineTitle, t.offlineBody]
      : variant === 'syncing'
        ? [t.syncingTitle, t.syncingBody]
        : [t.emptyTitle, t.emptyBody];

  return (
    <div className="@container w-full p-4 @2xl:p-8 flex items-center justify-center">
      <section
        role="status"
        className="w-full @2xl:max-w-[640px] @2xl:mx-auto rounded-3xl border border-[var(--ms-green-100)] p-6 @2xl:p-8 text-center bg-[var(--ms-surface)] text-[var(--ms-ink)] shadow-sm"
      >
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[var(--ms-bg)] border border-[var(--ms-green-100)] text-[var(--ms-forest)]">
          {variant === 'offline' && (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          )}
          {variant === 'syncing' && (
            <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          )}
          {variant === 'empty' && (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          )}
        </div>
        <h2 className="text-xl @2xl:text-2xl font-black text-[var(--ms-ink)] m-0 mb-2">{content[0]}</h2>
        <p className="text-sm text-[var(--ms-muted)] font-medium max-w-md mx-auto m-0 leading-relaxed mb-4">{content[1]}</p>
        {children && <div className="mt-4">{children}</div>}
      </section>
    </div>
  );
}

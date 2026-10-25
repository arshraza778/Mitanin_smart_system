import type { ReactNode } from 'react';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { WifiOff, RefreshCw, Inbox } from 'lucide-react';

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
        className="w-full @2xl:max-w-[640px] @2xl:mx-auto rounded-3xl border border-[#E3ECE7] p-6 @2xl:p-8 text-center bg-white text-[#00201C] shadow-sm"
      >
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[#DAF1DE] border border-[#C0EACC] text-[#235347]">
          {variant === 'offline' && <WifiOff size={28} />}
          {variant === 'syncing' && <RefreshCw className="animate-spin" size={28} />}
          {variant === 'empty' && <Inbox size={28} />}
        </div>
        <h2 className="text-xl @2xl:text-2xl font-black text-[#00201C] m-0 mb-2">{content[0]}</h2>
        <p className="text-sm text-[#404945] font-medium max-w-md mx-auto m-0 leading-relaxed mb-4">{content[1]}</p>
        {children && <div className="mt-4">{children}</div>}
      </section>
    </div>
  );
}

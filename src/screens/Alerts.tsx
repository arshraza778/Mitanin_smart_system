import { useState, type ReactElement } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';

type Kind = 'overdue' | 'replied' | 'followup';
type View = 'alerts' | 'empty';

interface Alert {
  id: string;
  kind: Kind;
  group: 'today' | 'earlier';
  text: Record<'en' | 'hi', string>;
  time: Record<'en' | 'hi', string>;
}

const ALERTS = dataService.getAlerts() as Alert[];
const COPY = { en: enLocale.screens.Alerts, hi: hiLocale.screens.Alerts } as const;

const COLORS = {
  page: '#F5F6F3',
  card: '#FFFFFF',
  green: '#286749',
  greenTint: '#E5F1E8',
  orange: '#E97848',
  ink: '#263238',
  muted: '#66736D',
  border: '#E3E8E2',
};

const KIND_STYLE: Record<Kind, { stripe: string; tint: string; fg: string }> = {
  overdue: { stripe: COLORS.orange, tint: '#FCE9E1', fg: '#B84C27' },
  replied: { stripe: COLORS.green, tint: COLORS.greenTint, fg: COLORS.green },
  followup: { stripe: '#6875D9', tint: '#EEF0FF', fg: '#4A56C7' },
};

const ic = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const KIND_ICON: Record<Kind, ReactElement> = {
  overdue: (
    <svg {...ic}>
      <path d="M12 3.5 2.8 19.5h18.4z" />
      <path d="M12 10v4.5M12 17.2v.1" />
    </svg>
  ),
  replied: (
    <svg {...ic}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4A1.5 1.5 0 0 1 4 14.5z" />
      <path d="m8.5 10 2.5 2.5 4.5-5" />
    </svg>
  ),
  followup: (
    <svg {...ic}>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 3v3M15 3v3M8.5 11h7M8.5 15h4" />
    </svg>
  ),
};

function EmptyIllustration() {
  return (
    <svg viewBox="0 0 220 180" width="220" height="180" aria-hidden>
      <circle cx="110" cy="92" r="70" fill={COLORS.greenTint} />
      <circle cx="162" cy="40" r="14" fill="#FFF1C9" />
      <g transform="translate(110 96) rotate(-12) scale(0.95)">
        <path d="M0 62C-32 32-26-16 0-50C26-16 32 32 0 62Z" fill="#6BAF7D" />
        <path
          d="M0 62L0-38M0 30L-12 14M0 12L12-4"
          stroke="#E5F1E8"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </g>
      <g transform="translate(66 118) rotate(28) scale(0.5)">
        <path d="M0 62C-32 32-26-16 0-50C26-16 32 32 0 62Z" fill="#8CC79D" />
      </g>
      <circle cx="150" cy="128" r="22" fill={COLORS.orange} />
      <path
        d="m140 128 7 7 14-15"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="30" y="152" width="160" height="8" rx="4" fill={COLORS.green} opacity="0.25" />
    </svg>
  );
}

export default function Alerts({ lang, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const [view, setView] = useState<View>('alerts');
  const items = view === 'alerts' ? ALERTS : [];

  return (
    <div
      style={{
        minHeight: '100%',
        background: COLORS.page,
        color: COLORS.ink,
        paddingBottom: 24,
      }}
    >
      <header
        style={{
          background: COLORS.green,
          color: '#FFFFFF',
          borderRadius: '0 0 28px 28px',
          padding: 'calc(22px + env(safe-area-inset-top, 0px)) 20px 26px',
          boxShadow: '0 5px 18px rgba(38, 50, 56, 0.08)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 750,
            lineHeight: 1.25,
            letterSpacing: '-0.4px',
          }}
        >
          {t.title}
        </h1>
      </header>

      <section style={{ padding: '20px 18px 24px' }}>
        <div
          role="group"
          aria-label={t.demo}
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: COLORS.muted,
            }}
          >
            {t.demo}
          </span>

          <div
            style={{
              display: 'flex',
              padding: 4,
              borderRadius: 999,
              background: '#E9EDE7',
              gap: 2,
            }}
          >
            {(['alerts', 'empty'] as const).map((key) => {
              const on = view === key;

              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setView(key)}
                  style={{
                    border: on ? `1px solid ${COLORS.border}` : '1px solid transparent',
                    cursor: 'pointer',
                    padding: '7px 13px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 750,
                    background: on ? COLORS.card : 'transparent',
                    color: on ? COLORS.green : COLORS.muted,
                    boxShadow: on ? '0 2px 5px rgba(38, 50, 56, 0.06)' : 'none',
                    minHeight: 36,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.views[key]}
                </button>
              );
            })}
          </div>
        </div>

        {items.length === 0 ? (
          <div
            style={{
              marginTop: 32,
              padding: '26px 18px 30px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 24,
              boxShadow: '0 5px 18px rgba(38, 50, 56, 0.04)',
            }}
          >
            <EmptyIllustration />
            <p
              style={{
                margin: '12px 0 0',
                fontSize: 18,
                fontWeight: 750,
                lineHeight: 1.4,
                color: COLORS.ink,
              }}
            >
              {t.empty}
            </p>
          </div>
        ) : (
          (['today', 'earlier'] as const).map((group) => {
            const list = items.filter((a) => a.group === group);
            if (list.length === 0) return null;

            return (
              <div key={group} style={{ marginTop: 24 }}>
                <h2
                  style={{
                    margin: '0 0 12px 2px',
                    fontSize: 16,
                    fontWeight: 750,
                    lineHeight: 1.4,
                    color: COLORS.ink,
                  }}
                >
                  {t.groups[group]}
                </h2>

                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'grid',
                    gap: 12,
                  }}
                >
                  {list.map((a) => {
                    const st = KIND_STYLE[a.kind];

                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => onNavigate('/case')}
                          style={{
                            position: 'relative',
                            overflow: 'hidden',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '15px 13px 15px 17px',
                            textAlign: 'left',
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: 18,
                            cursor: 'pointer',
                            background: COLORS.card,
                            color: COLORS.ink,
                            boxShadow: '0 4px 14px rgba(38, 50, 56, 0.045)',
                            minHeight: 78,
                          }}
                        >
                          <span
                            aria-hidden
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: 5,
                              background: st.stripe,
                            }}
                          />

                          <span
                            aria-hidden
                            style={{
                              flex: '0 0 42px',
                              height: 42,
                              borderRadius: 13,
                              display: 'grid',
                              placeItems: 'center',
                              background: st.tint,
                              color: st.fg,
                            }}
                          >
                            {KIND_ICON[a.kind]}
                          </span>

                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span
                              style={{
                                display: 'block',
                                fontSize: 14,
                                fontWeight: 750,
                                lineHeight: 1.45,
                                overflowWrap: 'anywhere',
                              }}
                            >
                              {a.text[lang]}
                            </span>
                            <span
                              style={{
                                display: 'block',
                                marginTop: 5,
                                fontSize: 12,
                                fontWeight: 500,
                                color: COLORS.muted,
                              }}
                            >
                              {a.time[lang]}
                            </span>
                          </span>

                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={COLORS.muted}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                            style={{ flex: '0 0 auto' }}
                          >
                            <path d="m9 6 6 6-6 6" />
                          </svg>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

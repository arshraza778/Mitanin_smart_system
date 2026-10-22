import { useMemo, useState } from 'react';
import type { ScreenProps } from '../App';

type VisitType = 'screening' | 'followup' | 'referral';
type Status = 'overdue' | 'due' | 'scheduled' | 'done';
type Sort = 'time' | 'priority';

interface Visit {
  id: string;
  start: string;
  end: string;
  name: Record<'en' | 'hi', string>;
  village: Record<'en' | 'hi', string>;
  type: VisitType;
  status: Status;
}

const TODAY = 24;
const WEEK = [21, 22, 23, 24, 25, 26, 27];

const VISITS: Record<number, Visit[]> = {
  24: [
    { id: 'v1', start: '09:30', end: '10:15', name: { en: 'Meena Bai', hi: 'मीना बाई' }, village: { en: 'Amora', hi: 'अमोरा' }, type: 'referral', status: 'overdue' },
    { id: 'v2', start: '11:00', end: '11:40', name: { en: 'Radha Yadav', hi: 'राधा यादव' }, village: { en: 'Kodar', hi: 'कोड़ार' }, type: 'followup', status: 'due' },
    { id: 'v3', start: '14:15', end: '15:00', name: { en: 'Kamla Sahu', hi: 'कमला साहू' }, village: { en: 'Pachri', hi: 'पचरी' }, type: 'screening', status: 'scheduled' },
  ],
  22: [
    { id: 'v4', start: '10:00', end: '10:45', name: { en: 'Lata Verma', hi: 'लता वर्मा' }, village: { en: 'Kodar', hi: 'कोड़ार' }, type: 'screening', status: 'done' },
    { id: 'v5', start: '12:30', end: '13:10', name: { en: 'Geeta Netam', hi: 'गीता नेताम' }, village: { en: 'Amora', hi: 'अमोरा' }, type: 'followup', status: 'done' },
  ],
  25: [
    { id: 'v6', start: '09:00', end: '09:45', name: { en: 'Sarita Dhruw', hi: 'सरिता ध्रुव' }, village: { en: 'Pachri', hi: 'पचरी' }, type: 'followup', status: 'scheduled' },
    { id: 'v7', start: '11:30', end: '12:15', name: { en: 'Ramkali Sahu', hi: 'रामकली साहू' }, village: { en: 'Kodar', hi: 'कोड़ार' }, type: 'screening', status: 'scheduled' },
  ],
};

const PRIORITY: Record<Status, number> = {
  overdue: 0,
  due: 1,
  scheduled: 2,
  done: 3,
};

const ROUTE_FOR: Record<VisitType, string> = {
  screening: '/screening/symptoms',
  followup: '/consult',
  referral: '/referral',
};

const COPY = {
  en: {
    weekday: 'Wed',
    month: 'Jan 2026',
    today: 'Today',
    letters: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    byTime: 'By time',
    byPriority: 'By priority',
    sortLabel: 'Sort visits',
    visitCount: (n: number) => `${n} ${n === 1 ? 'visit' : 'visits'}`,
    empty: 'No visits planned for this day.',
    types: { screening: 'Screening', followup: 'Follow-up', referral: 'Referral check' },
    status: { overdue: 'Overdue', due: 'Due today', scheduled: 'Scheduled', done: 'Done' },
  },
  hi: {
    weekday: 'बुध',
    month: 'जनवरी 2026',
    today: 'आज',
    letters: ['र', 'सो', 'मं', 'बु', 'गु', 'शु', 'श'],
    byTime: 'समय से',
    byPriority: 'प्राथमिकता से',
    sortLabel: 'दौरे क्रमबद्ध करें',
    visitCount: (n: number) => `${n} दौरे`,
    empty: 'इस दिन कोई दौरा तय नहीं है।',
    types: { screening: 'जाँच', followup: 'फ़ॉलो-अप', referral: 'रेफ़रल की जाँच' },
    status: { overdue: 'अतिदेय', due: 'आज देय', scheduled: 'तय', done: 'पूरा' },
  },
} as const;

function pillStyle(status: Status) {
  const styles: Record<Status, { background: string; color: string }> = {
    overdue: { background: '#FCE8E8', color: '#B42318' },
    due: { background: '#FFF0E6', color: '#B85C24' },
    scheduled: { background: '#EAF4EC', color: '#2B6B52' },
    done: { background: '#EEF0EE', color: '#6B7785' },
  };

  return styles[status];
}

export default function Visits({ lang, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const [day, setDay] = useState<number>(TODAY);
  const [sort, setSort] = useState<Sort>('time');

  const list = useMemo(() => {
    const items = [...(VISITS[day] ?? [])];

    items.sort((a, b) =>
      sort === 'time'
        ? a.start.localeCompare(b.start)
        : PRIORITY[a.status] - PRIORITY[b.status] ||
          a.start.localeCompare(b.start),
    );

    return items;
  }, [day, sort]);

  const buttonBase: React.CSSProperties = {
    border: 0,
    cursor: 'pointer',
    fontFamily: 'inherit',
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div
      style={{
        minHeight: '100%',
        paddingBottom: 96,
        background: '#EAF4EC',
        color: '#1F2933',
      }}
    >
      <header
        style={{
          background: '#FFFFFF',
          borderRadius: '0 0 32px 32px',
          padding: 'calc(20px + env(safe-area-inset-top, 0px)) 20px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 52,
              fontWeight: 800,
              lineHeight: 1,
              color: '#1F2933',
            }}
          >
            {day}
          </h1>

          <div
            style={{
              lineHeight: 1.3,
              color: '#6B7785',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            <div>{day === TODAY ? t.weekday : `${day}`}</div>
            <div>{t.month}</div>
          </div>

          <button
            type="button"
            aria-label={t.today}
            onClick={() => setDay(TODAY)}
            style={{
              ...buttonBase,
              marginLeft: 'auto',
              minHeight: 48,
              padding: '10px 20px',
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 800,
              background: '#EAF4EC',
              color: '#2B6B52',
            }}
          >
            {t.today}
          </button>
        </div>

        <ul
          style={{
            listStyle: 'none',
            margin: '18px 0 0',
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: 3,
          }}
        >
          {WEEK.map((d, i) => {
            const selected = d === day;

            return (
              <li key={d}>
                <button
                  type="button"
                  aria-label={`${t.month} ${d}`}
                  aria-pressed={selected}
                  onClick={() => setDay(d)}
                  style={{
                    ...buttonBase,
                    width: '100%',
                    minHeight: 64,
                    padding: '9px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    borderRadius: 18,
                    background: selected ? '#EE7B4D' : 'transparent',
                    color: selected ? '#FFFFFF' : '#1F2933',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      opacity: selected ? 1 : 0.55,
                    }}
                  >
                    {t.letters[i]}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>{d}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </header>

      <section style={{ padding: '22px 20px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              color: '#6B7785',
            }}
          >
            {t.visitCount(list.length)}
          </p>

          <div
            role="group"
            aria-label={t.sortLabel}
            style={{
              display: 'flex',
              gap: 3,
              padding: 4,
              borderRadius: 999,
              background: '#FFFFFF',
            }}
          >
            {(['time', 'priority'] as const).map((key) => {
              const selected = sort === key;

              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSort(key)}
                  style={{
                    ...buttonBase,
                    minHeight: 44,
                    padding: '8px 14px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 800,
                    background: selected ? '#EAF4EC' : 'transparent',
                    color: '#2B6B52',
                  }}
                >
                  {key === 'time' ? t.byTime : t.byPriority}
                </button>
              );
            })}
          </div>
        </div>

        {list.length === 0 ? (
          <p
            style={{
              margin: '40px 0',
              textAlign: 'center',
              color: '#6B7785',
              fontSize: 14,
            }}
          >
            {t.empty}
          </p>
        ) : (
          <ol
            style={{
              listStyle: 'none',
              margin: '20px 0 0',
              padding: 0,
              display: 'grid',
              gap: 16,
            }}
          >
            {list.map((visit) => (
              <li
                key={visit.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '76px minmax(0, 1fr)',
                  alignItems: 'start',
                  gap: 10,
                }}
              >
                <div style={{ paddingTop: 12, fontSize: 14 }}>
                  <div style={{ fontWeight: 800, color: '#1F2933' }}>
                    {visit.start}
                  </div>
                  <div
                    style={{
                      color: '#6B7785',
                      marginTop: 4,
                    }}
                  >
                    {visit.end}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={`${visit.name[lang]}, ${t.types[visit.type]}, ${t.status[visit.status]}`}
                  onClick={() => onNavigate(ROUTE_FOR[visit.type])}
                  style={{
                    ...buttonBase,
                    width: '100%',
                    minWidth: 0,
                    minHeight: 180,
                    padding: '20px',
                    textAlign: 'left',
                    borderRadius: 24,
                    background: '#FFFFFF',
                    color: '#1F2933',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    transition: 'box-shadow 150ms ease',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: 18,
                      lineHeight: 1.3,
                      fontWeight: 800,
                      color: '#2B6B52',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {visit.name[lang]}
                  </span>

                  <span
                    style={{
                      display: 'block',
                      marginTop: 5,
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#1F2933',
                    }}
                  >
                    {t.types[visit.type]}
                  </span>

                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 14,
                      fontSize: 14,
                      color: '#6B7785',
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
                      <circle cx="12" cy="10" r="2.2" />
                    </svg>
                    {visit.village[lang]}
                  </span>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 16,
                      minHeight: 36,
                      padding: '6px 15px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 800,
                      ...pillStyle(visit.status),
                    }}
                  >
                    {t.status[visit.status]}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

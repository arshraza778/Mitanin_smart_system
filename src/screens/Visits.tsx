import { useMemo, useState } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { useCaseStore } from '../store/CaseStore';
import { dataService } from '../services';
import { getDemoDate, getCenteredWeekDays } from '../domain';

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
  patientId: string;
}



const PRIORITY: Record<Status, number> = {
  overdue: 0,
  due: 1,
  scheduled: 2,
  done: 3,
};

const ROUTE_FOR: Record<VisitType, string> = {
  screening: '/mitanin/screening/symptoms',
  followup: '/mitanin/consult',
  referral: '/mitanin/referral',
};

const COPY = {
  en: enLocale.screens.Visits,
  hi: hiLocale.screens.Visits,
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
  const { state, selectScreeningPatient } = useCaseStore();
  const demoNow = useMemo(() => getDemoDate(state.demoClockOffsetMinutes || 0), [state.demoClockOffsetMinutes]);
  const weekDays = useMemo(() => getCenteredWeekDays(demoNow, lang), [demoNow, lang]);

  const [selectedOffset, setSelectedOffset] = useState<number>(0);
  const [sort, setSort] = useState<Sort>('time');
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

  const selectedDayItem = weekDays.find((w) => w.offset === selectedOffset) || weekDays[3] || weekDays[0];
  const selectedDate = selectedDayItem.date;
  const monthText = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { month: 'short', year: 'numeric' }).format(selectedDate);
    } catch {
      return '--';
    }
  }, [lang, selectedDate]);

  const rawVisitsByDay = useMemo(() => dataService.getVisitsByDay() as Record<string, Visit[]>, []);

  const handleVisitClick = (visit: Visit) => {
    if (visit.patientId) {
      selectScreeningPatient(visit.patientId);
    }
    onNavigate(ROUTE_FOR[visit.type]);
  };

  const list = useMemo(() => {
    const items = [...(rawVisitsByDay[String(selectedOffset)] ?? [])];

    items.sort((a, b) =>
      sort === 'time'
        ? a.start.localeCompare(b.start)
        : PRIORITY[a.status] - PRIORITY[b.status] ||
          a.start.localeCompare(b.start),
    );

    return items;
  }, [rawVisitsByDay, selectedOffset, sort]);

  const selectedVisit = list.find((v) => v.id === selectedVisitId) || list[0] || null;

  const visitCountText = (n: number) =>
    lang === 'hi' ? `${n} ${t.visitPlural}` : `${n} ${n === 1 ? t.visitSingular : t.visitPlural}`;

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
        paddingBottom: "var(--ms-screen-padding-bottom)",
        background: '#EAF4EC',
        color: '#1F2933',
      }}
    >
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
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
              {selectedDayItem.dayNumber}
            </h1>

            <div
              style={{
                lineHeight: 1.3,
                color: '#6B7785',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              <div>{selectedDayItem.isToday ? t.today : selectedDayItem.weekdayLong}</div>
              <div>{monthText}</div>
            </div>

            <button
              type="button"
              aria-label={t.today}
              onClick={() => setSelectedOffset(0)}
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
            {weekDays.map((item) => {
              const selected = item.offset === selectedOffset;

              return (
                <li key={item.offset}>
                  <button
                    type="button"
                    aria-label={`${item.dayNumber} ${item.weekdayLong}`}
                    aria-pressed={selected}
                    onClick={() => setSelectedOffset(item.offset)}
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
                      background: selected ? 'var(--ms-orange)' : 'transparent',
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
                      {item.weekdayNarrow}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>{item.dayNumber}</span>
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
              {visitCountText(list.length)}
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
                      minHeight: 48,
                      display: 'inline-flex',
                      alignItems: 'center',
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
                    onClick={() => handleVisitClick(visit)}
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

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '24px 28px 40px' }}>
        {/* Week strip above two-column timeline */}
        <header
          style={{
            background: '#FFFFFF',
            borderRadius: 28,
            border: '1px solid var(--ms-border)',
            boxShadow: 'var(--ms-shadow-card)',
            padding: '24px 28px',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: '#1F2933',
                }}
              >
                {selectedDayItem.dayNumber}
              </span>

              <div style={{ lineHeight: 1.3, color: '#6B7785', fontSize: 16, fontWeight: 700 }}>
                <div>{selectedDayItem.isToday ? t.today : selectedDayItem.weekdayLong}</div>
                <div>{monthText}</div>
              </div>

              <button
                type="button"
                aria-label={t.today}
                onClick={() => setSelectedOffset(0)}
                style={{
                  ...buttonBase,
                  minHeight: 40,
                  padding: '6px 16px',
                  borderRadius: 999,
                  fontSize: 13.5,
                  fontWeight: 800,
                  background: '#EAF4EC',
                  color: '#2B6B52',
                }}
              >
                {t.today}
              </button>
            </div>

            {/* Sort & Count Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#6B7785' }}>
                {visitCountText(list.length)}
              </span>

              <div
                role="group"
                aria-label={t.sortLabel}
                style={{
                  display: 'flex',
                  gap: 3,
                  padding: 4,
                  borderRadius: 999,
                  background: '#F5F6F3',
                  border: '1px solid var(--ms-border)',
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
                        minHeight: 38,
                        padding: '6px 14px',
                        borderRadius: 999,
                        fontSize: 12.5,
                        fontWeight: 800,
                        background: selected ? '#2B6B52' : 'transparent',
                        color: selected ? '#FFFFFF' : '#2B6B52',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {key === 'time' ? t.byTime : t.byPriority}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 7-day strip */}
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            {weekDays.map((item) => {
              const selected = item.offset === selectedOffset;

              return (
                <li key={item.offset}>
                  <button
                    type="button"
                    aria-label={`${item.dayNumber} ${item.weekdayLong}`}
                    aria-pressed={selected}
                    onClick={() => setSelectedOffset(item.offset)}
                    style={{
                      ...buttonBase,
                      width: '100%',
                      minHeight: 64,
                      padding: '10px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      borderRadius: 18,
                      background: selected ? 'var(--ms-orange)' : '#F5F6F3',
                      color: selected ? '#FFFFFF' : '#1F2933',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        opacity: selected ? 1 : 0.6,
                      }}
                    >
                      {item.weekdayNarrow}
                    </span>
                    <span style={{ fontSize: 17, fontWeight: 800 }}>{item.dayNumber}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </header>

        {/* Two-column timeline: time and visit cards on left, selected visit details on right */}
        {list.length === 0 ? (
          <div
            style={{
              padding: '64px 20px',
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: 24,
              border: '1px solid var(--ms-border)',
            }}
          >
            <p style={{ margin: 0, color: '#6B7785', fontSize: 16, fontWeight: 600 }}>{t.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 @md:grid-cols-12 @2xl:grid-cols-12 @4xl:grid-cols-12 gap-6" style={{ alignItems: 'start' }}>
            {/* Left: Time and visit cards */}
            <div className="col-span-12 @2xl:col-span-7 @4xl:col-span-7">
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 14 }}>
                {list.map((visit) => {
                  const isSelected = selectedVisit?.id === visit.id;
                  return (
                    <li
                      key={visit.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '84px minmax(0, 1fr)',
                        alignItems: 'start',
                        gap: 12,
                      }}
                    >
                      {/* Time Column */}
                      <div style={{ paddingTop: 16, fontSize: 14 }}>
                        <div style={{ fontWeight: 800, color: '#1F2933' }}>{visit.start}</div>
                        <div style={{ color: '#6B7785', marginTop: 4, fontWeight: 600 }}>{visit.end}</div>
                      </div>

                      {/* Visit Card */}
                      <button
                        type="button"
                        aria-label={`${visit.name[lang]}, ${t.types[visit.type]}, ${t.status[visit.status]}`}
                        onClick={() => setSelectedVisitId(visit.id)}
                        style={{
                          ...buttonBase,
                          width: '100%',
                          minWidth: 0,
                          padding: '18px 20px',
                          textAlign: 'left',
                          borderRadius: 20,
                          background: isSelected ? '#FFFFFF' : '#FFFFFF',
                          border: isSelected ? '2.5px solid #2B6B52' : '1px solid var(--ms-border)',
                          boxShadow: isSelected ? '0 8px 24px rgba(43, 107, 82, 0.14)' : '0 4px 16px rgba(0,0,0,0.04)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                          <div>
                            <span style={{ display: 'block', fontSize: 18, lineHeight: 1.25, fontWeight: 800, color: '#2B6B52' }}>
                              {visit.name[lang]}
                            </span>
                            <span style={{ display: 'block', marginTop: 4, fontSize: 13.5, fontWeight: 700, color: '#1F2933' }}>
                              {t.types[visit.type]}
                            </span>
                          </div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 12px',
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 800,
                              ...pillStyle(visit.status),
                            }}
                          >
                            {t.status[visit.status]}
                          </span>
                        </div>

                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13.5, color: '#6B7785', fontWeight: 600 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
                            <circle cx="12" cy="10" r="2.2" />
                          </svg>
                          {visit.village[lang]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Right: Selected Visit Details */}
            <div className="col-span-12 @2xl:col-span-5 @4xl:col-span-5">
              {selectedVisit ? (
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 24,
                    border: '1px solid var(--ms-border)',
                    boxShadow: 'var(--ms-shadow-card)',
                    padding: '24px 22px',
                    position: 'sticky',
                    top: 88,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingBottom: 16, borderBottom: '1px solid var(--ms-border)' }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ms-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {lang === 'hi' ? 'दौरे का विवरण' : 'Visit Details'}
                      </span>
                      <h2 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: '#2B6B52' }}>
                        {selectedVisit.name[lang]}
                      </h2>
                      <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7785', fontWeight: 600 }}>
                        {selectedVisit.village[lang]} • {selectedVisit.start} - {selectedVisit.end}
                      </p>
                    </div>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 999,
                        fontSize: 12.5,
                        fontWeight: 800,
                        ...pillStyle(selectedVisit.status),
                      }}
                    >
                      {t.status[selectedVisit.status]}
                    </span>
                  </div>

                  <dl style={{ margin: '18px 0', display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <dt style={{ fontSize: 13.5, color: '#6B7785', fontWeight: 600 }}>
                        {lang === 'hi' ? 'दौरे का प्रकार' : 'Visit Type'}
                      </dt>
                      <dd style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1F2933' }}>
                        {t.types[selectedVisit.type]}
                      </dd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <dt style={{ fontSize: 13.5, color: '#6B7785', fontWeight: 600 }}>
                        {lang === 'hi' ? 'समय' : 'Schedule'}
                      </dt>
                      <dd style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1F2933' }}>
                        {selectedVisit.start} - {selectedVisit.end}
                      </dd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <dt style={{ fontSize: 13.5, color: '#6B7785', fontWeight: 600 }}>
                        {lang === 'hi' ? 'गाँव' : 'Village'}
                      </dt>
                      <dd style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1F2933' }}>
                        {selectedVisit.village[lang]}
                      </dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    onClick={() => handleVisitClick(selectedVisit)}
                    style={{
                      marginTop: 8,
                      width: '100%',
                      minHeight: 52,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      borderRadius: 16,
                      border: 0,
                      background: 'var(--ms-orange)',
                      color: '#FFFFFF',
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 6px 18px rgba(240, 121, 75, 0.3)',
                    }}
                  >
                    <span>
                      {selectedVisit.type === 'screening'
                        ? (lang === 'hi' ? 'जाँच शुरू करें' : 'Start Screening')
                        : selectedVisit.type === 'followup'
                        ? (lang === 'hi' ? 'परामर्श देखें' : 'View Consultation')
                        : (lang === 'hi' ? 'रेफ़रल देखें' : 'Track Referral')}
                    </span>
                    <span>→</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

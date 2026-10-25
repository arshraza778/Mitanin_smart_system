import { useMemo, useState } from 'react';
import { MapPin, Calendar, Clock, ArrowRight } from 'lucide-react';
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
    overdue: { background: '#FFDAD6', color: '#BA1A1A' },
    due: { background: '#FFF1CC', color: '#8A5A00' },
    scheduled: { background: '#DAF1DE', color: '#235347' },
    done: { background: '#E3ECE7', color: '#404945' },
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
        background: '#F4F9F6',
        color: '#00201C',
      }}
    >
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
        <header
          style={{
            background: '#FFFFFF',
            borderRadius: '0 0 24px 24px',
            borderBottom: '1px solid #E3ECE7',
            padding: 'calc(20px + env(safe-area-inset-top, 0px)) 20px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 44,
                fontWeight: 800,
                lineHeight: 1,
                color: '#00201C',
              }}
            >
              {selectedDayItem.dayNumber}
            </h1>

            <div
              style={{
                lineHeight: 1.3,
                color: '#404945',
                fontSize: 14,
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
                minHeight: 40,
                padding: '8px 16px',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 700,
                background: '#DAF1DE',
                color: '#235347',
              }}
            >
              {t.today}
            </button>
          </div>

          <ul
            style={{
              listStyle: 'none',
              margin: '16px 0 0',
              padding: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 4,
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
                      minHeight: 60,
                      padding: '8px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      borderRadius: 14,
                      background: selected ? '#235347' : '#F8FAF9',
                      color: selected ? '#FFFFFF' : '#00201C',
                      border: selected ? '0' : '1px solid #E3ECE7',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: selected ? '#DAF1DE' : '#404945',
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

        <section style={{ padding: '18px 16px 24px' }}>
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
                fontSize: 13,
                fontWeight: 700,
                color: '#404945',
              }}
            >
              {visitCountText(list.length)}
            </p>

            <div
              role="group"
              aria-label={t.sortLabel}
              style={{
                display: 'flex',
                gap: 2,
                padding: 3,
                borderRadius: 999,
                background: '#F1F5F3',
                border: '1px solid #E3ECE7',
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
                      minHeight: 36,
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '6px 14px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      background: selected ? '#235347' : 'transparent',
                      color: selected ? '#FFFFFF' : '#404945',
                      transition: 'all 0.15s ease',
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
                color: '#404945',
                fontSize: 14,
              }}
            >
              {t.empty}
            </p>
          ) : (
            <ol
              style={{
                listStyle: 'none',
                margin: '16px 0 0',
                padding: 0,
                display: 'grid',
                gap: 12,
              }}
            >
              {list.map((visit) => (
                <li
                  key={visit.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '70px minmax(0, 1fr)',
                    alignItems: 'start',
                    gap: 10,
                  }}
                >
                  <div style={{ paddingTop: 10, fontSize: 13 }}>
                    <div style={{ fontWeight: 800, color: '#00201C' }}>
                      {visit.start}
                    </div>
                    <div
                      style={{
                        color: '#404945',
                        marginTop: 2,
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
                      minHeight: 140,
                      padding: '16px',
                      textAlign: 'left',
                      borderRadius: 16,
                      background: '#FFFFFF',
                      color: '#00201C',
                      border: '1px solid #E3ECE7',
                      boxShadow: '0 2px 8px rgba(0, 33, 17, 0.04)',
                      transition: 'box-shadow 150ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 16,
                          lineHeight: 1.3,
                          fontWeight: 800,
                          color: '#00201C',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {visit.name[lang]}
                      </span>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          ...pillStyle(visit.status),
                        }}
                      >
                        {t.status[visit.status]}
                      </span>
                    </div>

                    <span
                      style={{
                        display: 'block',
                        marginTop: 4,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#404945',
                      }}
                    >
                      {t.types[visit.type]}
                    </span>

                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 10,
                        fontSize: 13,
                        color: '#404945',
                      }}
                    >
                      <MapPin size={15} aria-hidden="true" />
                      {visit.village[lang]}
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
            borderRadius: 24,
            border: '1px solid #E3ECE7',
            boxShadow: '0 2px 8px rgba(0, 33, 17, 0.04)',
            padding: '24px 28px',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span
                style={{
                  fontSize: 44,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: '#00201C',
                }}
              >
                {selectedDayItem.dayNumber}
              </span>

              <div style={{ lineHeight: 1.3, color: '#404945', fontSize: 15, fontWeight: 600 }}>
                <div>{selectedDayItem.isToday ? t.today : selectedDayItem.weekdayLong}</div>
                <div>{monthText}</div>
              </div>

              <button
                type="button"
                aria-label={t.today}
                onClick={() => setSelectedOffset(0)}
                style={{
                  ...buttonBase,
                  minHeight: 38,
                  padding: '6px 16px',
                  borderRadius: 999,
                  fontSize: 13.5,
                  fontWeight: 700,
                  background: '#DAF1DE',
                  color: '#235347',
                }}
              >
                {t.today}
              </button>
            </div>

            {/* Sort & Count Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#404945' }}>
                {visitCountText(list.length)}
              </span>

              <div
                role="group"
                aria-label={t.sortLabel}
                style={{
                  display: 'flex',
                  gap: 2,
                  padding: 3,
                  borderRadius: 999,
                  background: '#F1F5F3',
                  border: '1px solid #E3ECE7',
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
                        minHeight: 34,
                        padding: '6px 14px',
                        borderRadius: 999,
                        fontSize: 12.5,
                        fontWeight: 700,
                        background: selected ? '#235347' : 'transparent',
                        color: selected ? '#FFFFFF' : '#404945',
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
                      minHeight: 62,
                      padding: '10px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      borderRadius: 14,
                      background: selected ? '#235347' : '#F8FAF9',
                      color: selected ? '#FFFFFF' : '#00201C',
                      border: selected ? 0 : '1px solid #E3ECE7',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: selected ? '#DAF1DE' : '#404945',
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

        {/* Two-column timeline: time and visit cards on left, selected visit details on right */}
        {list.length === 0 ? (
          <div
            style={{
              padding: '64px 20px',
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E3ECE7',
            }}
          >
            <p style={{ margin: 0, color: '#404945', fontSize: 15, fontWeight: 600 }}>{t.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 @md:grid-cols-12 @2xl:grid-cols-12 @4xl:grid-cols-12 gap-6" style={{ alignItems: 'start' }}>
            {/* Left: Time and visit cards */}
            <div className="col-span-12 @2xl:col-span-7 @4xl:col-span-7">
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
                {list.map((visit) => {
                  const isSelected = selectedVisit?.id === visit.id;
                  return (
                    <li
                      key={visit.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '76px minmax(0, 1fr)',
                        alignItems: 'start',
                        gap: 12,
                      }}
                    >
                      {/* Time Column */}
                      <div style={{ paddingTop: 14, fontSize: 13 }}>
                        <div style={{ fontWeight: 800, color: '#00201C' }}>{visit.start}</div>
                        <div style={{ color: '#404945', marginTop: 3, fontWeight: 600 }}>{visit.end}</div>
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
                          padding: '16px 18px',
                          textAlign: 'left',
                          borderRadius: 16,
                          background: '#FFFFFF',
                          border: isSelected ? '2px solid #235347' : '1px solid #E3ECE7',
                          boxShadow: isSelected ? '0 4px 14px rgba(35, 83, 71, 0.12)' : '0 2px 8px rgba(0, 33, 17, 0.04)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                          <div>
                            <span style={{ display: 'block', fontSize: 16, lineHeight: 1.25, fontWeight: 800, color: '#00201C' }}>
                              {visit.name[lang]}
                            </span>
                            <span style={{ display: 'block', marginTop: 4, fontSize: 13, fontWeight: 600, color: '#404945' }}>
                              {t.types[visit.type]}
                            </span>
                          </div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 10px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              ...pillStyle(visit.status),
                            }}
                          >
                            {t.status[visit.status]}
                          </span>
                        </div>

                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 13, color: '#404945', fontWeight: 600 }}>
                          <MapPin size={15} aria-hidden="true" />
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
                    borderRadius: 20,
                    border: '1px solid #E3ECE7',
                    boxShadow: '0 2px 8px rgba(0, 33, 17, 0.04)',
                    padding: '22px 20px',
                    position: 'sticky',
                    top: 88,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingBottom: 16, borderBottom: '1px solid #E3ECE7' }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#404945', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {lang === 'hi' ? 'दौरे का विवरण' : 'Visit Details'}
                      </span>
                      <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#00201C' }}>
                        {selectedVisit.name[lang]}
                      </h2>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#404945', fontWeight: 600 }}>
                        {selectedVisit.village[lang]} • {selectedVisit.start} - {selectedVisit.end}
                      </p>
                    </div>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        ...pillStyle(selectedVisit.status),
                      }}
                    >
                      {t.status[selectedVisit.status]}
                    </span>
                  </div>

                  <dl style={{ margin: '16px 0', display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <dt style={{ fontSize: 13, color: '#404945', fontWeight: 600 }}>
                        {lang === 'hi' ? 'दौरे का प्रकार' : 'Visit Type'}
                      </dt>
                      <dd style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#00201C' }}>
                        {t.types[selectedVisit.type]}
                      </dd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <dt style={{ fontSize: 13, color: '#404945', fontWeight: 600 }}>
                        {lang === 'hi' ? 'समय' : 'Schedule'}
                      </dt>
                      <dd style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#00201C' }}>
                        {selectedVisit.start} - {selectedVisit.end}
                      </dd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <dt style={{ fontSize: 13, color: '#404945', fontWeight: 600 }}>
                        {lang === 'hi' ? 'गाँव' : 'Village'}
                      </dt>
                      <dd style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#00201C' }}>
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
                      borderRadius: 14,
                      border: 0,
                      background: '#235347',
                      color: '#FFFFFF',
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(35, 83, 71, 0.25)',
                    }}
                  >
                    <span>
                      {selectedVisit.type === 'screening'
                        ? (lang === 'hi' ? 'जाँच शुरू करें' : 'Start Screening')
                        : selectedVisit.type === 'followup'
                        ? (lang === 'hi' ? 'परामर्श देखें' : 'View Consultation')
                        : (lang === 'hi' ? 'रेफ़रल देखें' : 'Track Referral')}
                    </span>
                    <ArrowRight size={18} />
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

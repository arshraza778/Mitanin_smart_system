import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';
import { useCaseStore } from '../store/CaseStore';
import States from './States';
import { formatDateTime } from '../domain';

type Tab = 'timeline' | 'details' | 'photos';

const CURRENT = 5;

const COPY = {
  en: enLocale.screens.CaseTimeline,
  hi: hiLocale.screens.CaseTimeline,
} as const;

const C = {
  page: '#EAF4EC',
  surface: '#FFFFFF',
  green: '#286749',
  greenDark: '#204F39',
  greenSoft: '#E3F0E6',
  greenLine: '#8AB594',
  orange: '#E97848',
  orangeSoft: '#FFF0E8',
  ink: '#263238',
  muted: '#68766E',
  border: '#DCE8DE',
  pending: '#A3AEA6',
};

const base: Record<string, CSSProperties> = {
  header: {
    background: C.green,
    color: '#FFFFFF',
    borderRadius: '0 0 28px 28px',
    padding: 'calc(24px + env(safe-area-inset-top, 0px)) 22px 25px',
  },
  caseNumber: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.4px',
    opacity: 0.85,
  },
  patientName: {
    margin: '8px 0 0',
    fontSize: 'clamp(23px, 5.5vw, 31px)',
    lineHeight: 1.25,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    overflowWrap: 'anywhere',
  },
  status: {
    display: 'inline-flex',
    alignItems: 'center',
    marginTop: 15,
    padding: '8px 13px',
    borderRadius: 999,
    background: C.orange,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.35,
  },
  tabWrap: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 4,
    padding: 4,
    borderRadius: 16,
    background: C.greenSoft,
  },
  tab: {
    minWidth: 0,
    minHeight: 48,
    padding: '10px 4px',
    border: '1px solid transparent',
    borderRadius: 12,
    background: 'transparent',
    color: C.green,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  content: {
    padding: '22px 22px 32px',
  },
  timelineRow: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 13,
  },
  markerColumn: {
    width: 28,
    flex: '0 0 28px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  stepContent: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
    paddingBottom: 23,
  },
  stepTitle: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.45,
    fontWeight: 650,
    letterSpacing: '-0.15px',
  },
  stepBy: {
    margin: '4px 0 0',
    color: C.muted,
    fontSize: 13.5,
    lineHeight: 1.5,
    fontWeight: 400,
  },
  stepTime: {
    margin: '5px 0 0',
    fontSize: 13,
    lineHeight: 1.5,
    fontWeight: 650,
  },
  panel: {
    margin: 0,
    padding: '8px 18px',
    border: `1px solid ${C.border}`,
    borderRadius: 18,
    background: C.surface,
    boxShadow: '0 3px 12px rgba(31, 77, 56, 0.045)',
  },
};

export default function CaseTimeline({ lang, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const { state, getCaseByPatientId, currentScreening, getPatient, getPatientSummary, getConsultByCaseId } = useCaseStore();
  const patientId = currentScreening?.patientId || 'p1';
  const caseRecord = getCaseByPatientId(patientId);

  if (!caseRecord) {
    return (
      <div style={{ padding: '24px 16px', paddingBottom: 'var(--ms-screen-padding-bottom)' }}>
        <States variant="empty" lang={lang}>
          <div style={{ marginTop: 8 }}>
            <p style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ms-ink)' }}>
              {lang === 'hi' ? 'अभी कोई केस नहीं है। जाँच शुरू करें।' : 'No case yet. Start a screening.'}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/mitanin/screening/patient')}
              style={{
                height: 52,
                padding: '0 24px',
                border: 0,
                borderRadius: 18,
                background: 'var(--ms-orange)',
                color: '#fff',
                fontSize: 16,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(238, 123, 77, 0.35)',
              }}
            >
              {lang === 'hi' ? 'जाँच शुरू करें' : 'Start a screening'}
            </button>
          </div>
        </States>
      </div>
    );
  }

  const patient = getPatient(patientId) || dataService.getPatient(patientId);
  const patientSummary = getPatientSummary(patientId, lang);
  const consult = getConsultByCaseId(caseRecord.id) || state.consults.find((c) => c.caseId === caseRecord.id || c.patientId === patientId);
  const referral = state.referrals.find((r) => r.caseId === caseRecord.id || r.patientId === patientId);

  const stepTimestamps: (string | undefined)[] = [
    caseRecord.createdAt,
    consult?.requestedAt || caseRecord.createdAt,
    consult?.repliedAt,
    referral?.createdAt,
    referral?.createdAt,
    referral?.createdAt,
    caseRecord.updatedAt,
  ];

  const stepMap: Record<string, number> = {
    SCREENED: 1,
    CONSULT_REQUESTED: 2,
    CONSULT_REPLIED: 3,
    REFERRAL_CREATED: 4,
    REMINDER_SENT: 5,
    REACHED_FACILITY: 6,
    OUTCOME_RECORDED: 7,
  };
  const currentStep = caseRecord?.state ? (stepMap[caseRecord.state] ?? CURRENT) : CURRENT;

  const villageStr = typeof patient?.village === 'string'
    ? patient.village
    : patient?.village?.[lang];

  const detailRows = t.detailRows.map(
    ([label, value], index) =>
      [
        label,
        index === 0
          ? patientSummary
          : index === 1
            ? (villageStr ?? value)
            : value,
      ] as [string, string],
  );

  const [tab, setTab] = useState<Tab>('timeline');
  const tabs: Tab[] = ['timeline', 'details', 'photos'];

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;

    e.preventDefault();

    const nextIndex =
      (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;

    const next = tabs[nextIndex];
    setTab(next);
    document.getElementById(`case-tab-${next}`)?.focus();
  };

  // Shared Timeline list element
  const renderTimeline = () => (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {t.steps.map((label, i) => {
        const done = i < currentStep;
        const current = i === currentStep - 1;
        const last = i === t.steps.length - 1;

        return (
          <li
            key={`${i}-${label}`}
            aria-current={current ? 'step' : undefined}
            style={base.timelineRow}
          >
            <div style={base.markerColumn}>
              <span
                aria-hidden="true"
                style={{
                  width: 28,
                  height: 28,
                  flex: '0 0 28px',
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  background: done
                    ? C.greenLine
                    : current
                      ? C.orange
                      : C.surface,
                  border:
                    done || current
                      ? 'none'
                      : `1.5px solid ${C.border}`,
                  boxShadow: current
                    ? `0 0 0 4px ${C.orangeSoft}`
                    : 'none',
                  color: '#FFFFFF',
                }}
              >
                {done ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                ) : current ? (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#FFFFFF',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: C.pending,
                    }}
                  />
                )}
              </span>

              {!last && (
                <span
                  aria-hidden="true"
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 34,
                    margin: '5px 0 3px',
                    borderRadius: 2,
                    background: done ? C.greenLine : C.border,
                  }}
                />
              )}
            </div>

            <div style={{ ...base.stepContent, paddingBottom: last ? 0 : 23 }}>
              <p
                style={{
                  ...base.stepTitle,
                  color: current
                    ? C.orange
                    : done
                      ? C.ink
                      : C.muted,
                }}
              >
                {label}
              </p>

              <p style={base.stepBy}>{t.by[i]}</p>

              <p
                style={{
                  ...base.stepTime,
                  color: done
                    ? C.green
                    : current
                      ? C.orange
                      : C.muted,
                }}
              >
                {done ? (stepTimestamps[i] ? formatDateTime(stepTimestamps[i], lang) : '--') : current ? t.inProgress : t.notYet}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );

  // Shared Details list element
  const renderDetails = () => (
    <dl style={base.panel}>
      {detailRows.map(([label, value], index) => (
        <div
          key={label}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1.15fr)',
            gap: 12,
            padding: '15px 0',
            borderBottom:
              index === detailRows.length - 1
                ? 'none'
                : `1px solid ${C.border}`,
          }}
        >
          <dt
            style={{
              color: C.muted,
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {label}
          </dt>

          <dd
            style={{
              margin: 0,
              textAlign: 'right',
              overflowWrap: 'anywhere',
              color: C.ink,
              fontSize: 14,
              lineHeight: 1.5,
              fontWeight: 600,
            }}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );

  // Shared Photos figure element
  const renderPhotos = () => (
    <figure
      style={{
        margin: 0,
        padding: 12,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        boxShadow: '0 3px 12px rgba(31, 77, 56, 0.045)',
      }}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          aspectRatio: '4 / 3',
          borderRadius: 14,
          background: '#244A36',
        }}
      >
        <svg
          viewBox="0 0 300 225"
          role="img"
          aria-label={t.photoAlt}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        >
          <rect width="300" height="225" fill="#244A36" />
          <rect
            x="40"
            y="75"
            width="220"
            height="80"
            rx="14"
            fill="#F1F5F2"
          />
          <rect
            x="58"
            y="93"
            width="42"
            height="44"
            rx="8"
            fill="#D9E2DC"
          />
          <rect
            x="114"
            y="91"
            width="130"
            height="48"
            rx="8"
            fill="#FFFFFF"
            stroke={C.border}
          />
          <rect x="152" y="91" width="4" height="48" fill="#D9534F" />
          <rect x="190" y="91" width="4" height="48" fill="#D9534F" />
        </svg>
      </div>

      <figcaption style={{ padding: '12px 4px 4px' }}>
        <p
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 650,
            lineHeight: 1.45,
            color: C.ink,
          }}
        >
          {t.photoTitle}
        </p>

        <p
          style={{
            margin: '5px 0 0',
            fontSize: 13,
            lineHeight: 1.5,
            color: C.muted,
          }}
        >
          {t.photoMeta}
        </p>

        <ul
          style={{
            listStyle: 'none',
            margin: '13px 0 0',
            padding: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {t.reads.map((read, i) => (
            <li
              key={read}
              style={{
                padding: '6px 11px',
                borderRadius: 999,
                background: i === 0 ? C.orangeSoft : C.greenSoft,
                color: i === 0 ? '#A94D28' : C.greenDark,
                fontSize: 12,
                lineHeight: 1.4,
                fontWeight: 650,
              }}
            >
              {read}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );

  return (
    <div style={{ background: C.page, minHeight: '100%', color: C.ink }}>
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
        <header style={base.header}>
          <p style={base.caseNumber}>{t.caseNo}</p>
          <h1 style={base.patientName}>{patientSummary}</h1>
          <span style={base.status}>{t.status}</span>
        </header>

        <div style={{ padding: '20px 20px 0' }}>
          <div role="tablist" aria-label={lang === 'hi' ? 'केस अनुभाग' : 'Case sections'} style={base.tabWrap}>
            {tabs.map((key, i) => {
              const selected = tab === key;

              return (
                <button
                  key={key}
                  id={`case-tab-${key}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`case-panel-${key}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setTab(key)}
                  onKeyDown={(e) => onKey(e, i)}
                  style={{
                    ...base.tab,
                    background: selected ? C.surface : 'transparent',
                    color: selected ? C.greenDark : C.muted,
                    borderColor: selected ? C.border : 'transparent',
                    boxShadow: selected
                      ? '0 2px 5px rgba(31, 77, 56, 0.05)'
                      : 'none',
                  }}
                >
                  {t.tabs[key]}
                </button>
              );
            })}
          </div>
        </div>

        <section
          role="tabpanel"
          id={`case-panel-${tab}`}
          aria-labelledby={`case-tab-${tab}`}
          style={base.content}
        >
          {tab === 'timeline' && renderTimeline()}
          {tab === 'details' && renderDetails()}
          {tab === 'photos' && renderPhotos()}
        </section>
      </div>

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block">
        <header
          style={{
            ...base.header,
            borderRadius: '0 0 32px 32px',
            padding: '32px 36px 36px',
            boxShadow: 'var(--ms-shadow-card)',
          }}
        >
          <p style={{ ...base.caseNumber, fontSize: 14 }}>{t.caseNo}</p>
          <h1 style={{ ...base.patientName, fontSize: 32 }}>{patientSummary}</h1>
          <span style={base.status}>{t.status}</span>
        </header>

        {/* Wide layout: timeline on the left, details and photos on the right */}
        <div className="grid grid-cols-12 @md:grid-cols-12 @2xl:grid-cols-12 @4xl:grid-cols-12 gap-6 p-6" style={{ padding: '28px 36px 48px' }}>
          {/* Left: Timeline */}
          <section
            aria-label={t.tabs.timeline}
            className="col-span-6 @2xl:col-span-6 @4xl:col-span-5"
          >
            <div
              style={{
                background: C.surface,
                borderRadius: 24,
                padding: '24px 22px',
                border: `1px solid ${C.border}`,
                boxShadow: '0 3px 14px rgba(31, 77, 56, 0.05)',
              }}
            >
              <h2
                style={{
                  margin: '0 0 20px',
                  fontSize: 19,
                  fontWeight: 800,
                  color: C.greenDark,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>{t.tabs.timeline}</span>
              </h2>
              {renderTimeline()}
            </div>
          </section>

          {/* Right: Details and Photos */}
          <section
            aria-label={`${t.tabs.details} & ${t.tabs.photos}`}
            className="col-span-6 @2xl:col-span-6 @4xl:col-span-7"
            style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
          >
            {/* Details Panel */}
            <div>
              <h2
                style={{
                  margin: '0 0 12px',
                  fontSize: 19,
                  fontWeight: 800,
                  color: C.greenDark,
                }}
              >
                {t.tabs.details}
              </h2>
              {renderDetails()}
            </div>

            {/* Photos Panel */}
            <div>
              <h2
                style={{
                  margin: '0 0 12px',
                  fontSize: 19,
                  fontWeight: 800,
                  color: C.greenDark,
                }}
              >
                {t.tabs.photos}
              </h2>
              {renderPhotos()}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

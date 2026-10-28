import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Clock, Check, FileText, Image as ImageIcon, History, RefreshCw } from 'lucide-react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';
import { useCaseStore } from '../store/CaseStore';
import { useViewMode } from '../ViewModeContext';
import { useScreenDraft } from '../ScreenDraftContext';
import { DoctorCasesTable } from '../DoctorCasesTable';
import { SupervisorCasesTable } from '../SupervisorCasesTable';
import States from './States';
import { formatDateTime } from '../domain';

type Tab = 'timeline' | 'details' | 'photos';

const CURRENT = 5;

const COPY = {
  en: enLocale.screens.CaseTimeline,
  hi: hiLocale.screens.CaseTimeline,
} as const;

const C = {
  page: '#F4F9F6',
  surface: '#FFFFFF',
  green: '#235347',
  greenDark: '#053C31',
  greenSoft: '#DAF1DE',
  greenLine: '#2E7D4F',
  accent: '#235347',
  accentSoft: '#DAF1DE',
  ink: '#00201C',
  muted: '#404945',
  border: '#E3ECE7',
  pending: '#CCD9D2',
};

const base: Record<string, CSSProperties> = {
  header: {
    background: '#051F20',
    color: '#FFFFFF',
    borderRadius: '0 0 24px 24px',
    padding: 'calc(20px + env(safe-area-inset-top, 0px)) 20px 22px',
  },
  caseNumber: {
    margin: 0,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.4px',
    color: '#8EB69B',
  },
  patientName: {
    margin: '6px 0 0',
    fontSize: 'clamp(22px, 5vw, 28px)',
    lineHeight: 1.25,
    fontWeight: 800,
    color: '#FFFFFF',
    overflowWrap: 'anywhere',
  },
  status: {
    display: 'inline-flex',
    alignItems: 'center',
    marginTop: 12,
    padding: '4px 12px',
    borderRadius: 999,
    background: '#FFDAD6',
    color: '#BA1A1A',
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.35,
  },
  tabWrap: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 4,
    padding: 4,
    borderRadius: 14,
    background: '#E7F0EA',
    border: '1px solid #CCD9D2',
  },
  tab: {
    minWidth: 0,
    minHeight: 44,
    padding: '8px 4px',
    borderRadius: 10,
    color: '#404945',
    fontSize: 13.5,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  content: {
    padding: '18px 16px 28px',
  },
  timelineRow: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 12,
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
    paddingBottom: 22,
  },
  stepTitle: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.4,
    fontWeight: 700,
  },
  stepBy: {
    margin: '3px 0 0',
    color: '#404945',
    fontSize: 13,
    lineHeight: 1.45,
    fontWeight: 500,
  },
  stepTime: {
    margin: '4px 0 0',
    fontSize: 12.5,
    lineHeight: 1.4,
    fontWeight: 700,
  },
  panel: {
    margin: 0,
    padding: '6px 18px',
    border: '1px solid #E3ECE7',
    borderRadius: 16,
    background: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(0, 33, 17, 0.04)',
  },
};

export default function CaseTimeline({ lang, online, onNavigate, onToggleOnline }: ScreenProps) {
  const { isWeb } = useViewMode();
  const { currentRole } = useScreenDraft();

  if (isWeb && currentRole === 'doctor') {
    return (
      <DoctorCasesTable
        lang={lang}
        online={online}
        onNavigate={onNavigate}
        onToggleOnline={onToggleOnline}
      />
    );
  }

  if (isWeb && currentRole === 'supervisor') {
    return (
      <SupervisorCasesTable
        lang={lang}
        online={online}
        onNavigate={onNavigate}
        onToggleOnline={onToggleOnline}
      />
    );
  }

  const t = COPY[lang];
  const { state, getCase, currentCaseId, currentScreening, getPatient, getPatientSummary, getConsultByCaseId } = useCaseStore();
  const caseId = currentCaseId || currentScreening?.caseId;
  const caseRecord = caseId ? getCase(caseId) : undefined;
  const patientId = caseRecord?.patientId || currentScreening?.patientId || '';

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
              className="ms-btn ms-btn--primary ms-btn--lg"
              onClick={() => onNavigate('/mitanin/screening/patient')}
              style={{
                height: 52,
                padding: '0 24px',
                borderRadius: 16,
                fontSize: 16,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(35, 83, 71, 0.25)',
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
                      ? C.accent
                      : '#F1F5F3',
                  border:
                    done || current
                      ? 'none'
                      : `1.5px solid ${C.border}`,
                  boxShadow: current
                    ? `0 0 0 4px ${C.accentSoft}`
                    : 'none',
                  color: '#FFFFFF',
                }}
              >
                {done ? (
                  <Check size={16} strokeWidth={2.5} />
                ) : current ? (
                  <span
                    style={{
                      width: 8,
                      height: 8,
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

            <div style={{ ...base.stepContent, paddingBottom: last ? 0 : 22 }}>
              <p
                style={{
                  ...base.stepTitle,
                  color: current
                    ? C.accent
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
                    ? C.greenLine
                    : current
                      ? C.accent
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
          <rect x="152" y="91" width="4" height="48" fill="#BA1A1A" />
          <rect x="190" y="91" width="4" height="48" fill="#BA1A1A" />
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
                padding: '4px 12px',
                borderRadius: 999,
                background: i === 0 ? '#FFDAD6' : '#DAF1DE',
                color: i === 0 ? '#BA1A1A' : '#235347',
                fontSize: 12,
                lineHeight: 1.4,
                fontWeight: 700,
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
        <header className="on-dark-900" style={base.header}>
          <p style={base.caseNumber}>{t.caseNo}</p>
          <h1 style={base.patientName}>{patientSummary}</h1>
          <span style={base.status}>{t.status}</span>
        </header>

        <div style={{ padding: '16px 16px 0' }}>
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
                  className={`ms-btn ms-btn--tab ${selected ? 'is-active' : ''}`}
                  style={{
                    ...base.tab,
                    boxShadow: selected
                      ? '0 2px 6px rgba(35, 83, 71, 0.2)'
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
      <div className="hidden @2xl:block" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header
          className="on-dark-900"
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
                borderRadius: 20,
                padding: '24px 22px',
                border: `1px solid ${C.border}`,
                boxShadow: '0 2px 8px rgba(0, 33, 17, 0.04)',
              }}
            >
              <h2
                style={{
                  margin: '0 0 20px',
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#00201C',
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
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#00201C',
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
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#00201C',
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

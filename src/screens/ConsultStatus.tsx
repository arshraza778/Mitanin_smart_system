import { useState, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Send,
  Stethoscope,
  User,
  WifiOff,
} from 'lucide-react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { useCaseStore } from '../store/CaseStore';
import { formatTime } from '../domain';

type Variant = 'waiting' | 'replied';

const COPY = { en: enLocale.screens.ConsultStatus, hi: hiLocale.screens.ConsultStatus } as const;

const R = 42;
const C = 2 * Math.PI * R;

function Ring({
  done,
  isLate,
  fraction,
  label,
  countdownText,
}: {
  done: boolean;
  isLate: boolean;
  fraction: number;
  label: string;
  countdownText: string;
}) {
  const strokeColor = done ? '#2E7D4F' : isLate ? '#BA1A1A' : '#235347';

  return (
    <div style={{ position: 'relative', width: 112, height: 112, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="112" height="112" viewBox="0 0 100 100" role="img" aria-label={label} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={R} fill="transparent" stroke="#E7F0EA" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - fraction)}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 4,
        }}
      >
        {done ? (
          <Check size={28} color="#2E7D4F" strokeWidth={3} />
        ) : isLate ? (
          <AlertTriangle size={24} color="#BA1A1A" />
        ) : (
          <Clock size={24} color="#235347" />
        )}
        <span style={{ fontSize: 10, fontWeight: 700, color: '#404945', marginTop: 2, textTransform: 'uppercase' }}>
          {done ? (countdownText.includes('h') ? 'Done' : 'पूर्ण') : 'SLA'}
        </span>
      </div>
    </div>
  );
}

export default function ConsultStatus({ lang, online = true, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const {
    state,
    currentCaseId,
    currentScreening,
    getCaseByPatientId,
    getCase,
    getConsultByCaseId,
    requestConsult,
    doctorReply,
    createReferral,
    recordOutcome,
    getPatientSummary,
  } = useCaseStore();

  const isDev = typeof window !== 'undefined' && window.location.search.includes('dev=1');
  const patientId = currentScreening?.patientId || 'p1';
  const caseId = currentCaseId || (patientId === 'p1' ? 'c1' : `c-${patientId}`);
  const caseRecord = getCase(caseId) || getCaseByPatientId(patientId);
  const consult = getConsultByCaseId(caseId) || state.consults.find((c) => c.caseId === caseId || c.patientId === patientId);

  const replied =
    consult?.status === 'replied' ||
    caseRecord?.state === 'CONSULT_REPLIED' ||
    caseRecord?.state === 'REFERRAL_CREATED' ||
    caseRecord?.state === 'REMINDER_SENT' ||
    caseRecord?.state === 'REACHED_FACILITY' ||
    caseRecord?.state === 'OUTCOME_RECORDED';

  const hasReceived = Boolean(consult?.receivedAt);
  const doneCount = replied ? 3 : hasReceived ? 2 : 1;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVariantChange = (key: Variant) => {
    if (key === 'replied') {
      doctorReply(caseId, t.advice, 'treat_locally', 'positive', online);
    } else {
      requestConsult(caseId, patientId, online);
    }
  };

  const handleCreateReferral = useCallback(() => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 500);

    createReferral(caseId, patientId, { en: 'District hospital', hi: 'ज़िला अस्पताल' }, 24, online);
    onNavigate('/mitanin/referral');
  }, [isSubmitting, createReferral, caseId, patientId, online, onNavigate]);

  const handleMarkDone = useCallback(() => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 500);

    recordOutcome(caseId, 'completed');
  }, [isSubmitting, recordOutcome, caseId]);

  // Times from demo clock
  const demoClockNow = Date.now() + (state.demoClockOffsetMinutes || 0) * 60 * 1000;
  const requestedTimestamp = consult?.requestedAt ? new Date(consult.requestedAt).getTime() : Date.now() - 3600 * 1000;
  const dueTimestamp = requestedTimestamp + 4 * 3600 * 1000;
  const diffMs = dueTimestamp - demoClockNow;
  const isLate = !replied && diffMs <= 0;

  const stepTimestamps: (string | undefined)[] = [
    consult?.requestedAt,
    consult?.receivedAt,
    consult?.repliedAt,
  ];

  let currentStepIdx = 0;
  if (!consult?.requestedAt) {
    currentStepIdx = 0;
  } else if (!consult?.receivedAt) {
    currentStepIdx = 1;
  } else if (!consult?.repliedAt && consult?.status !== 'replied') {
    currentStepIdx = 2;
  } else {
    currentStepIdx = -1;
  }

  const getStepTimeLabel = (i: number, isDone: boolean): string => {
    const raw = stepTimestamps[i];
    if (raw) {
      const formatted = formatTime(raw, lang);
      if (formatted !== '--') return formatted;
    }
    if (isDone) {
      return '--';
    }
    if (i === currentStepIdx) {
      return lang === 'hi' ? 'अभी' : 'Now';
    }
    if (currentStepIdx !== -1 && i > currentStepIdx) {
      return lang === 'hi' ? 'प्रतीक्षारत' : 'Waiting';
    }
    return '--';
  };

  let countdownText = '';
  if (replied) {
    const replyTimestamp = consult?.repliedAt ? new Date(consult.repliedAt).getTime() : requestedTimestamp + 3600 * 1000;
    const takenMin = Math.max(1, Math.floor((replyTimestamp - requestedTimestamp) / 60000));
    countdownText = lang === 'hi'
      ? `${Math.floor(takenMin / 60)} घंटे ${takenMin % 60} मिनट में जवाब दिया`
      : `Replied in ${Math.floor(takenMin / 60)} h ${takenMin % 60} min`;
  } else if (isLate) {
    countdownText = lang === 'hi' ? 'देर (4 घंटे से अधिक)' : 'Late (over 4 hours)';
  } else {
    const leftMin = Math.floor(diffMs / 60000);
    countdownText = lang === 'hi'
      ? `${Math.floor(leftMin / 60)} घंटे ${leftMin % 60} मिनट शेष`
      : `${Math.floor(leftMin / 60)} h ${leftMin % 60} min left`;
  }

  const isSendToHospital =
    consult?.decision === 'send_to_hospital' ||
    caseRecord?.doctorDecision === 'send_to_hospital' ||
    (caseRecord?.doctorDecision && caseRecord.doctorDecision.toLowerCase().includes('refer'));

  const existingReferral = state.referrals.find((r) => r.caseId === caseId || r.patientId === patientId);
  const hasReferral = Boolean(existingReferral);
  const isOutcomeRecorded = caseRecord?.state === 'OUTCOME_RECORDED';

  const renderStepsList = () => (
    <div style={{ marginTop: 14, background: '#F8FAF9', borderRadius: 16, padding: '16px', border: '1px solid #E3ECE7' }}>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {t.steps.map((label, i) => {
          const done = i < doneCount;
          const isCurrent = i === currentStepIdx;
          const last = i === t.steps.length - 1;

          return (
            <li key={label} style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span
                  aria-hidden
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: done ? '#2E7D4F' : isCurrent ? '#DAF1DE' : '#FFFFFF',
                    border: done ? 0 : `2px solid ${isCurrent ? '#235347' : '#CCD9D2'}`,
                    color: done ? '#FFFFFF' : '#235347',
                    flexShrink: 0,
                  }}
                >
                  {done ? (
                    <Check size={14} strokeWidth={3} />
                  ) : isCurrent ? (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#235347' }} />
                  ) : null}
                </span>
                {!last && (
                  <span
                    aria-hidden
                    style={{
                      flex: 1,
                      width: 2,
                      minHeight: 28,
                      margin: '4px 0',
                      background: i + 1 < doneCount ? '#2E7D4F' : '#E3ECE7',
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1, paddingBottom: last ? 0 : 16, paddingTop: 2, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <p style={{ margin: 0, fontSize: 14.5, fontWeight: done || isCurrent ? 700 : 500, color: done || isCurrent ? '#00201C' : '#707975' }}>
                  {label}
                </p>
                <p style={{ margin: 0, fontSize: 12.5, color: '#707975', fontFamily: 'monospace', fontWeight: 600 }}>
                  {getStepTimeLabel(i, done)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );

  return (
    <div>
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
        {/* Header bar */}
        <header
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E3ECE7',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            padding: 'calc(12px + env(safe-area-inset-top, 0px)) 16px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => onNavigate('/mitanin/screening/result')}
              aria-label={lang === 'hi' ? 'पीछे' : 'Back'}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#F8FAF9',
                border: '1px solid #E3ECE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#051F20',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#051F20', lineHeight: 1.2 }}>
                {lang === 'hi' ? 'परामर्श स्थिति' : 'Consult Status'}
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707975', fontWeight: 500 }}>
                {t.caseNo} • {caseId.toUpperCase()}
              </p>
            </div>
          </div>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 700,
              background: replied ? '#DAF1DE' : isLate ? '#FFDAD6' : '#FFF1CC',
              color: replied ? '#235347' : isLate ? '#BA1A1A' : '#8A5A00',
            }}
          >
            {replied ? (lang === 'hi' ? 'उत्तर प्राप्त' : 'Replied') : isLate ? (lang === 'hi' ? 'देर' : 'Late') : (lang === 'hi' ? 'प्रतीक्षारत' : 'In Progress')}
          </span>
        </header>

        <section style={{ padding: '16px 16px 100px' }}>
          {/* Patient Card Band */}
          <div
            style={{
              background: '#051F20',
              color: '#FFFFFF',
              borderRadius: 16,
              padding: '14px 16px',
              border: '1px solid #163832',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#163832',
                  color: '#DAF1DE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#DAF1DE' }}>
                  {getPatientSummary(patientId, lang) || caseRecord?.name[lang]}
                </h2>
                <span style={{ fontSize: 11.5, color: '#8EB69B' }}>
                  {caseRecord?.village ? (typeof caseRecord.village === 'string' ? caseRecord.village : caseRecord.village[lang]) : 'Kotra'}
                </span>
              </div>
            </div>
            <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#DAF1DE' }}>
              {caseId.toUpperCase()}
            </span>
          </div>

          {/* Dev Mode Variant Selector */}
          {isDev && (
            <div role="group" aria-label={t.demo} style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#707975' }}>{t.demo}</span>
              <div style={{ display: 'flex', padding: 2, borderRadius: 999, background: '#DAF1DE' }}>
                {(['waiting', 'replied'] as const).map((key) => {
                  const on = (replied ? 'replied' : 'waiting') === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => handleVariantChange(key)}
                      style={{
                        border: 0,
                        cursor: 'pointer',
                        padding: '4px 12px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        background: on ? '#FFFFFF' : 'transparent',
                        color: on ? '#053C31' : '#235347',
                      }}
                    >
                      {t.variants[key]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Offline Warning Banner */}
          {!online && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: 12,
                background: '#FFF1CC',
                color: '#8A5A00',
                fontSize: 12.5,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <WifiOff size={16} />
              <span>{lang === 'hi' ? 'फ़ोन पर सुरक्षित, भेजे जाने की प्रतीक्षा में' : 'Saved on phone, waiting to send'}</span>
            </div>
          )}

          {/* SLA Countdown Card */}
          <div
            style={{
              marginTop: 14,
              padding: 18,
              borderRadius: 18,
              background: '#FFFFFF',
              border: '1px solid #E3ECE7',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* Status Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background: replied ? '#DAF1DE' : isLate ? '#FFDAD6' : '#FFF1CC',
                color: replied ? '#235347' : isLate ? '#BA1A1A' : '#8A5A00',
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: replied ? '#2E7D4F' : isLate ? '#BA1A1A' : '#8A5A00',
                }}
              />
              <span>{replied ? (lang === 'hi' ? 'डॉक्टर का जवाब मिला' : 'Doctor replied') : isLate ? (lang === 'hi' ? 'देर' : 'Late') : t.waitingPill}</span>
            </div>

            <Ring
              done={replied}
              isLate={isLate}
              fraction={replied ? 1 : isLate ? 1 : Math.max(0.1, 1 - Math.max(0, diffMs) / (4 * 3600 * 1000))}
              label={t.ringLabel}
              countdownText={countdownText}
            />

            <h3 style={{ margin: '12px 0 0', fontSize: 16, fontWeight: 700, color: '#00201C' }}>
              {t.expected}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: replied ? '#2E7D4F' : isLate ? '#BA1A1A' : '#707975' }}>
              {countdownText}
            </p>

            <div style={{ width: '100%' }}>
              {renderStepsList()}
            </div>
          </div>

          {/* Doctor Advice Card when replied */}
          {replied && (
            <article
              style={{
                marginTop: 14,
                padding: 16,
                borderRadius: 16,
                background: '#FFFFFF',
                border: '1px solid #8EB69B',
                boxShadow: '0 2px 10px rgba(35, 83, 71, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: '#DAF1DE',
                      color: '#235347',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Stethoscope size={18} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#00201C' }}>
                      {consult?.doctorName || t.from}
                    </h2>
                    <span style={{ fontSize: 11.5, color: '#707975' }}>
                      {consult?.repliedAt ? formatTime(consult.repliedAt, lang) : '10:45 AM'}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: isSendToHospital ? '#FFDAD6' : '#DAF1DE',
                    color: isSendToHospital ? '#BA1A1A' : '#235347',
                  }}
                >
                  {isSendToHospital
                    ? (lang === 'hi' ? 'अस्पताल भेजें' : 'Send to hospital')
                    : (lang === 'hi' ? 'स्थानीय स्तर पर इलाज करें' : 'Treat locally')}
                </span>
              </div>

              <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.45, fontWeight: 500, color: '#00201C', whiteSpace: 'pre-wrap' }}>
                {consult?.advice || caseRecord?.doctorAdvice || t.advice}
              </p>
            </article>
          )}
        </section>

        {/* Sticky Bottom Actions */}
        {replied && (
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              padding: '12px 16px calc(14px + env(safe-area-inset-bottom, 0px))',
              background: '#FFFFFF',
              borderTop: '1px solid #E3ECE7',
              boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
              zIndex: 25,
            }}
          >
            {isSendToHospital ? (
              <button
                type="button"
                disabled={hasReferral || isSubmitting}
                onClick={handleCreateReferral}
                className="ms-btn-primary"
                style={{
                  width: '100%',
                  height: 56,
                  border: 0,
                  borderRadius: 14,
                  cursor: hasReferral ? 'default' : 'pointer',
                  fontSize: 16,
                  fontWeight: 700,
                  background: hasReferral ? '#CCD9D2' : '#235347',
                  color: hasReferral ? '#707975' : '#FFFFFF',
                  boxShadow: hasReferral ? 'none' : '0 4px 14px rgba(35, 83, 71, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>
                  {hasReferral
                    ? (lang === 'hi' ? 'रेफ़रल पहले से मौजूद' : 'Referral exists')
                    : (lang === 'hi' ? 'अस्पताल भेजें' : 'Send to hospital')}
                </span>
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                disabled={isOutcomeRecorded || isSubmitting}
                onClick={handleMarkDone}
                className="ms-btn-primary"
                style={{
                  width: '100%',
                  height: 56,
                  border: 0,
                  borderRadius: 14,
                  cursor: isOutcomeRecorded ? 'default' : 'pointer',
                  fontSize: 16,
                  fontWeight: 700,
                  background: isOutcomeRecorded ? '#CCD9D2' : '#235347',
                  color: isOutcomeRecorded ? '#707975' : '#FFFFFF',
                  boxShadow: isOutcomeRecorded ? 'none' : '0 4px 14px rgba(35, 83, 71, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <CheckCircle2 size={18} />
                <span>
                  {isOutcomeRecorded
                    ? (lang === 'hi' ? 'पूर्ण' : 'Completed')
                    : (lang === 'hi' ? 'पूर्ण चिह्नित करें' : 'Mark done')}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '32px 24px 48px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <header
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E3ECE7',
              padding: '24px 28px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#00201C' }}>
                {lang === 'hi' ? 'डॉक्टर से पूछें: प्रगति एवं समयरेखा' : 'Consult Status & SLA Tracker'}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: '#707975', fontWeight: 500 }}>
                {t.caseNo} • {caseId.toUpperCase()} • {getPatientSummary(patientId, lang) || caseRecord?.name[lang]}
              </p>
            </div>
            <span
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 700,
                background: replied ? '#DAF1DE' : isLate ? '#FFDAD6' : '#FFF1CC',
                color: replied ? '#235347' : isLate ? '#BA1A1A' : '#8A5A00',
              }}
            >
              {replied ? (lang === 'hi' ? 'उत्तर प्राप्त' : 'Replied') : isLate ? (lang === 'hi' ? 'देर' : 'Late') : (lang === 'hi' ? 'प्रतीक्षारत' : 'In Progress')}
            </span>
          </header>

          <main
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E3ECE7',
              padding: '28px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 28, alignItems: 'start' }}>
              {/* Left SLA Radial Panel */}
              <div
                style={{
                  background: '#F8FAF9',
                  borderRadius: 16,
                  padding: '20px',
                  border: '1px solid #E3ECE7',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <Ring
                  done={replied}
                  isLate={isLate}
                  fraction={replied ? 1 : isLate ? 1 : Math.max(0.1, 1 - Math.max(0, diffMs) / (4 * 3600 * 1000))}
                  label={t.ringLabel}
                  countdownText={countdownText}
                />
                <h3 style={{ margin: '14px 0 0', fontSize: 15, fontWeight: 700, color: '#00201C' }}>
                  {t.expected}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: replied ? '#2E7D4F' : isLate ? '#BA1A1A' : '#707975' }}>
                  {countdownText}
                </p>

                {isDev && (
                  <div role="group" aria-label={t.demo} style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#707975' }}>{t.demo}:</span>
                    <div style={{ display: 'flex', padding: 2, borderRadius: 999, background: '#DAF1DE' }}>
                      {(['waiting', 'replied'] as const).map((key) => {
                        const on = (replied ? 'replied' : 'waiting') === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={on}
                            onClick={() => handleVariantChange(key)}
                            style={{
                              border: 0,
                              cursor: 'pointer',
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              background: on ? '#FFFFFF' : 'transparent',
                              color: on ? '#053C31' : '#235347',
                            }}
                          >
                            {t.variants[key]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Steps & Advice */}
              <div>
                <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#00201C' }}>
                  {lang === 'hi' ? 'परामर्श प्रगति' : 'Consult Timeline'}
                </h2>
                {renderStepsList()}

                {replied && (
                  <article
                    style={{
                      marginTop: 20,
                      padding: 18,
                      borderRadius: 16,
                      background: '#F8FAF9',
                      border: '1px solid #8EB69B',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: '#DAF1DE',
                            color: '#235347',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Stethoscope size={18} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#00201C' }}>
                            {consult?.doctorName || t.from}
                          </h3>
                          <span style={{ fontSize: 12, color: '#707975' }}>{countdownText}</span>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 11.5,
                          fontWeight: 700,
                          background: isSendToHospital ? '#FFDAD6' : '#DAF1DE',
                          color: isSendToHospital ? '#BA1A1A' : '#235347',
                        }}
                      >
                        {isSendToHospital
                          ? (lang === 'hi' ? 'अस्पताल भेजें' : 'Send to hospital')
                          : (lang === 'hi' ? 'स्थानीय स्तर पर इलाज करें' : 'Treat locally')}
                      </span>
                    </div>

                    <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.45, fontWeight: 500, color: '#00201C', whiteSpace: 'pre-wrap' }}>
                      {consult?.advice || caseRecord?.doctorAdvice || t.advice}
                    </p>
                  </article>
                )}

                {replied && (
                  <div style={{ marginTop: 20 }}>
                    {isSendToHospital ? (
                      <button
                        type="button"
                        disabled={hasReferral || isSubmitting}
                        onClick={handleCreateReferral}
                        className="ms-btn-primary"
                        style={{
                          padding: '0 28px',
                          height: 52,
                          border: 0,
                          borderRadius: 14,
                          cursor: hasReferral ? 'default' : 'pointer',
                          fontSize: 15.5,
                          fontWeight: 700,
                          background: hasReferral ? '#CCD9D2' : '#235347',
                          color: hasReferral ? '#707975' : '#FFFFFF',
                          boxShadow: hasReferral ? 'none' : '0 4px 14px rgba(35, 83, 71, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span>
                          {hasReferral
                            ? (lang === 'hi' ? 'रेफ़रल पहले से मौजूद' : 'Referral exists')
                            : (lang === 'hi' ? 'अस्पताल भेजें' : 'Send to hospital')}
                        </span>
                        <ArrowRight size={18} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isOutcomeRecorded || isSubmitting}
                        onClick={handleMarkDone}
                        className="ms-btn-primary"
                        style={{
                          padding: '0 28px',
                          height: 52,
                          border: 0,
                          borderRadius: 14,
                          cursor: isOutcomeRecorded ? 'default' : 'pointer',
                          fontSize: 15.5,
                          fontWeight: 700,
                          background: isOutcomeRecorded ? '#CCD9D2' : '#235347',
                          color: isOutcomeRecorded ? '#707975' : '#FFFFFF',
                          boxShadow: isOutcomeRecorded ? 'none' : '0 4px 14px rgba(35, 83, 71, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <CheckCircle2 size={18} />
                        <span>
                          {isOutcomeRecorded
                            ? (lang === 'hi' ? 'पूर्ण' : 'Completed')
                            : (lang === 'hi' ? 'पूर्ण चिह्नित करें' : 'Mark done')}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}


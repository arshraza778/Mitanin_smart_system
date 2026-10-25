import { useState, useCallback } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { useCaseStore } from '../store/CaseStore';
import { formatTime } from '../domain';

type Variant = 'waiting' | 'replied';

const COPY = { en: enLocale.screens.ConsultStatus, hi: hiLocale.screens.ConsultStatus } as const;

const R = 40;
const C = 2 * Math.PI * R;

function Ring({ done, fraction, label }: { done: boolean; fraction: number; label: string }) {
  return (
    <svg width="104" height="104" viewBox="0 0 104 104" role="img" aria-label={label}>
      <circle cx="52" cy="52" r={R} fill="none" stroke="var(--ms-green-100)" strokeWidth="10" />
      <circle
        cx="52"
        cy="52"
        r={R}
        fill="none"
        stroke={done ? 'var(--ms-green-500)' : 'var(--ms-orange)'}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - fraction)}
        transform="rotate(-90 52 52)"
      />
      {done ? (
        <path d="m38 53 10 10 19-21" fill="none" stroke="var(--ms-green-500)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <g fill="none" stroke="var(--ms-ink)" strokeWidth="4" strokeLinecap="round">
          <circle cx="52" cy="52" r="15" />
          <path d="M52 43v9l6 4" />
        </g>
      )}
    </svg>
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

  // Item 18: status comes ONLY from consult.status in the store (no local state)
  const replied =
    consult?.status === 'replied' ||
    caseRecord?.state === 'CONSULT_REPLIED' ||
    caseRecord?.state === 'REFERRAL_CREATED' ||
    caseRecord?.state === 'REMINDER_SENT' ||
    caseRecord?.state === 'REACHED_FACILITY' ||
    caseRecord?.state === 'OUTCOME_RECORDED';

  const hasReceived = Boolean(consult?.receivedAt);
  const doneCount = replied ? 3 : hasReceived ? 2 : 1;

  // Item 8: Disable Send reply, Ask doctor, Send to hospital, Mark done for 500 ms after a tap
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

  // Times from demo clock (Item 18)
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

  // Determine current step index (-1 if all done)
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
    // No timestamp
    if (isDone) {
      // Completed step must never show 'Waiting'
      return '--';
    }
    if (i === currentStepIdx) {
      // Current step shows 'Now'
      return lang === 'hi' ? 'अभी' : 'Now';
    }
    if (currentStepIdx !== -1 && i > currentStepIdx) {
      // Steps after current step show 'Waiting'
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
    <ol style={{ listStyle: 'none', margin: '16px 4px 0', padding: 0 }}>
      {t.steps.map((label, i) => {
        const done = i < doneCount;
        const last = i === t.steps.length - 1;
        return (
          <li key={label} style={{ display: 'flex', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span
                aria-hidden
                style={{
                  flex: '0 0 32px',
                  height: 32,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: done ? 'var(--ms-green-500)' : 'var(--ms-surface)',
                  border: done ? 0 : '2.5px dashed #b9c4bd',
                  color: '#fff',
                }}
              >
                {done && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                )}
              </span>
              {!last && (
                <span
                  aria-hidden
                  style={{
                    flex: 1,
                    width: 3,
                    minHeight: 26,
                    margin: '4px 0',
                    borderRadius: 2,
                    background: i + 1 < doneCount ? 'var(--ms-green-500)' : '#d6ddd8',
                  }}
                />
              )}
            </div>
            <div style={{ paddingBottom: last ? 0 : 14, paddingTop: 4 }}>
              <p style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: done ? 'var(--ms-ink)' : 'var(--ms-muted)' }}>
                {label}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 13.5, color: 'var(--ms-muted)' }}>
                {getStepTimeLabel(i, done)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div>
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
        <header
          style={{
            background: 'var(--ms-green-700)',
            color: '#fff',
            borderRadius: '0 0 32px 32px',
            padding: 'calc(22px + env(safe-area-inset-top, 0px)) 20px 26px',
          }}
        >
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, opacity: 0.85 }}>{t.caseNo} • {caseId.toUpperCase()}</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 800, lineHeight: 1.15 }}>
            {getPatientSummary(patientId, lang) || caseRecord?.name[lang]}
          </h1>
        </header>

        <section style={{ padding: '18px 20px 0' }}>
          {/* Hide toggle unless ?dev=1 (Item 18) */}
          {isDev && (
            <div role="group" aria-label={t.demo} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ms-muted)' }}>{t.demo}</span>
              <div style={{ display: 'flex', padding: 3, borderRadius: 999, background: 'var(--ms-green-100)' }}>
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
                        padding: '6px 14px',
                        borderRadius: 999,
                        fontSize: 12.5,
                        fontWeight: 800,
                        background: on ? 'var(--ms-surface)' : 'transparent',
                        color: on ? 'var(--ms-green-900)' : 'var(--ms-green-700)',
                      }}
                    >
                      {t.variants[key]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Offline simulated status (Item 20) */}
          {!online && (
            <div
              style={{
                marginTop: 10,
                padding: '8px 14px',
                borderRadius: 14,
                background: '#FFF3E0',
                color: 'var(--ms-orange-700)',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ms-orange)' }} />
              <span>{lang === 'hi' ? 'फ़ोन पर सुरक्षित, भेजे जाने की प्रतीक्षा में' : 'Saved on phone, waiting to send'}</span>
            </div>
          )}

          <div
            style={{
              marginTop: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: 16,
              borderRadius: 24,
              background: 'var(--ms-surface)',
              boxShadow: '0 4px 16px rgba(31, 77, 56, 0.07)',
            }}
          >
            <Ring done={replied} fraction={replied ? 1 : isLate ? 1 : 1.25 / 4} label={t.ringLabel} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 16.5, fontWeight: 800, lineHeight: 1.3 }}>{t.expected}</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: replied ? 'var(--ms-green-700)' : isLate ? 'var(--ms-orange-700)' : 'var(--ms-muted)' }}>
                {countdownText}
              </p>
              {!replied && (
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 10,
                    padding: '4px 12px',
                    borderRadius: 999,
                    fontSize: 12.5,
                    fontWeight: 800,
                    background: isLate ? 'var(--ms-orange-100)' : '#eceeed',
                    color: isLate ? 'var(--ms-orange-700)' : '#6b7770',
                  }}
                >
                  {isLate ? (lang === 'hi' ? 'देर' : 'Late') : t.waitingPill}
                </span>
              )}
            </div>
          </div>

          {renderStepsList()}

          {replied && (
            <article
              style={{
                marginTop: 20,
                padding: 18,
                borderRadius: 24,
                background: 'var(--ms-green-500)',
                color: '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  aria-hidden
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--ms-green-700)',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3v6a4 4 0 0 0 8 0V3" />
                    <path d="M10 13v2a5 5 0 0 0 10 0v-1.5" />
                    <circle cx="20" cy="12" r="2" />
                  </svg>
                </span>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{consult?.doctorName || t.from}</h2>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 15.5, lineHeight: 1.45, fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                {consult?.advice || caseRecord?.doctorAdvice || t.advice}
              </p>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 14,
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 800,
                  background: '#fff',
                  color: 'var(--ms-green-900)',
                }}
              >
                {isSendToHospital
                  ? (lang === 'hi' ? 'अस्पताल भेजें' : 'Send to hospital')
                  : (lang === 'hi' ? 'स्थानीय स्तर पर इलाज करें' : 'Treat locally')}
              </span>
            </article>
          )}
        </section>

        {replied && (
          <div
            style={{
              position: 'sticky',
              bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
              marginTop: 18,
              padding: '14px 20px 6px',
              background: 'linear-gradient(to top, var(--ms-bg) 70%, rgba(246,248,245,0))',
            }}
          >
            {isSendToHospital ? (
              <button
                type="button"
                disabled={hasReferral || isSubmitting}
                onClick={handleCreateReferral}
                style={{
                  width: '100%',
                  height: 62,
                  border: 0,
                  borderRadius: 22,
                  cursor: hasReferral ? 'default' : 'pointer',
                  fontSize: 19,
                  fontWeight: 800,
                  background: hasReferral ? '#b9c4bd' : 'var(--ms-orange)',
                  color: '#fff',
                  boxShadow: hasReferral ? 'none' : '0 10px 22px rgba(240, 121, 75, 0.35)',
                }}
              >
                {hasReferral
                  ? (lang === 'hi' ? 'रेफ़रल पहले से मौजूद' : 'Referral exists')
                  : (lang === 'hi' ? 'अस्पताल भेजें' : 'Send to hospital')}
              </button>
            ) : (
              <button
                type="button"
                disabled={isOutcomeRecorded || isSubmitting}
                onClick={handleMarkDone}
                style={{
                  width: '100%',
                  height: 62,
                  border: 0,
                  borderRadius: 22,
                  cursor: isOutcomeRecorded ? 'default' : 'pointer',
                  fontSize: 19,
                  fontWeight: 800,
                  background: isOutcomeRecorded ? '#b9c4bd' : 'var(--ms-green-700)',
                  color: '#fff',
                  boxShadow: isOutcomeRecorded ? 'none' : '0 10px 22px rgba(43, 107, 82, 0.35)',
                }}
              >
                {isOutcomeRecorded
                  ? (lang === 'hi' ? 'पूर्ण' : 'Completed')
                  : (lang === 'hi' ? 'पूर्ण चिह्नित करें' : 'Mark done')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '32px 24px 48px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', gap: 32, alignItems: 'flex-start', justifyContent: 'center' }}>
          {/* Side Progress & Ring Card */}
          <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Status Ring Card */}
            <div
              style={{
                background: 'var(--ms-surface)',
                borderRadius: 24,
                border: '1px solid var(--ms-border)',
                padding: '24px 20px',
                boxShadow: 'var(--ms-shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <Ring done={replied} fraction={replied ? 1 : isLate ? 1 : 1.25 / 4} label={t.ringLabel} />
              <p style={{ margin: '14px 0 0', fontSize: 17, fontWeight: 800, lineHeight: 1.3 }}>{t.expected}</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: replied ? 'var(--ms-green-700)' : isLate ? 'var(--ms-orange-700)' : 'var(--ms-muted)' }}>
                {countdownText}
              </p>
              {!replied && (
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 10,
                    padding: '4px 14px',
                    borderRadius: 999,
                    fontSize: 12.5,
                    fontWeight: 800,
                    background: isLate ? 'var(--ms-orange-100)' : '#eceeed',
                    color: isLate ? 'var(--ms-orange-700)' : '#6b7770',
                  }}
                >
                  {isLate ? (lang === 'hi' ? 'देर' : 'Late') : t.waitingPill}
                </span>
              )}

              {/* Demo switch (Item 18: only if ?dev=1) */}
              {isDev && (
                <div role="group" aria-label={t.demo} style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ms-muted)' }}>{t.demo}:</span>
                  <div style={{ display: 'flex', padding: 2, borderRadius: 999, background: 'var(--ms-green-100)' }}>
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
                            fontWeight: 800,
                            background: on ? 'var(--ms-surface)' : 'transparent',
                            color: on ? 'var(--ms-green-900)' : 'var(--ms-green-700)',
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

            {/* Offline notification card */}
            {!online && (
              <div
                style={{
                  background: '#FFF3E0',
                  borderRadius: 18,
                  padding: '14px 16px',
                  border: '1px solid #FFE0B2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--ms-orange-700)',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ms-orange)', flexShrink: 0 }} />
                <span>{lang === 'hi' ? 'फ़ोन पर सुरक्षित, भेजे जाने की प्रतीक्षा में' : 'Saved on phone, waiting to send'}</span>
              </div>
            )}

            {/* Patient card (Item 18: reads patient and case id from store) */}
            <div
              style={{
                background: 'var(--ms-green-100)',
                borderRadius: 24,
                padding: '18px 20px',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ms-green-700)', letterSpacing: '0.04em' }}>
                {t.caseNo} • {caseId.toUpperCase()}
              </span>
              <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 800, color: 'var(--ms-green-900)' }}>
                {getPatientSummary(patientId, lang) || caseRecord?.name[lang]}
              </p>
            </div>
          </div>

          {/* Centred Form Card up to about 640px */}
          <div
            style={{
              width: '100%',
              maxWidth: 640,
              background: 'var(--ms-surface)',
              borderRadius: 28,
              border: '1px solid var(--ms-border)',
              boxShadow: 'var(--ms-shadow-card)',
              padding: '32px 36px',
            }}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 800, color: 'var(--ms-ink)' }}>
              {lang === 'hi' ? 'डॉक्टर से पूछें: प्रगति एवं समयरेखा' : 'Ask doctor: Progress & Timeline'}
            </h2>

            {renderStepsList()}

            {replied && (
              <article
                style={{
                  marginTop: 24,
                  padding: 22,
                  borderRadius: 24,
                  background: 'var(--ms-green-500)',
                  color: '#fff',
                  boxShadow: '0 6px 20px rgba(43, 107, 82, 0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'var(--ms-green-700)',
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 3v6a4 4 0 0 0 8 0V3" />
                      <path d="M10 13v2a5 5 0 0 0 10 0v-1.5" />
                      <circle cx="20" cy="12" r="2" />
                    </svg>
                  </span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{consult?.doctorName || t.from}</h3>
                    <span style={{ fontSize: 12.5, opacity: 0.9 }}>{countdownText}</span>
                  </div>
                </div>
                <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.45, fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                  {consult?.advice || caseRecord?.doctorAdvice || t.advice}
                </p>
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 16,
                    padding: '6px 16px',
                    borderRadius: 999,
                    fontSize: 14,
                    fontWeight: 800,
                    background: '#fff',
                    color: 'var(--ms-green-900)',
                  }}
                >
                  {isSendToHospital
                    ? (lang === 'hi' ? 'अस्पताल भेजें' : 'Send to hospital')
                    : (lang === 'hi' ? 'स्थानीय स्तर पर इलाज करें' : 'Treat locally')}
                </span>
              </article>
            )}

            {replied && (
              <div style={{ marginTop: 24, borderTop: '1px solid var(--ms-border)', paddingTop: 20 }}>
                {isSendToHospital ? (
                  <button
                    type="button"
                    disabled={hasReferral || isSubmitting}
                    onClick={handleCreateReferral}
                    style={{
                      width: '100%',
                      height: 56,
                      border: 0,
                      borderRadius: 20,
                      cursor: hasReferral ? 'default' : 'pointer',
                      fontSize: 17,
                      fontWeight: 800,
                      background: hasReferral ? '#b9c4bd' : 'var(--ms-orange)',
                      color: '#fff',
                      boxShadow: hasReferral ? 'none' : '0 8px 20px rgba(240, 121, 75, 0.35)',
                    }}
                  >
                    {hasReferral
                      ? (lang === 'hi' ? 'रेफ़रल पहले से मौजूद' : 'Referral exists')
                      : (lang === 'hi' ? 'अस्पताल भेजें →' : 'Send to hospital →')}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isOutcomeRecorded || isSubmitting}
                    onClick={handleMarkDone}
                    style={{
                      width: '100%',
                      height: 56,
                      border: 0,
                      borderRadius: 20,
                      cursor: isOutcomeRecorded ? 'default' : 'pointer',
                      fontSize: 17,
                      fontWeight: 800,
                      background: isOutcomeRecorded ? '#b9c4bd' : 'var(--ms-green-700)',
                      color: '#fff',
                      boxShadow: isOutcomeRecorded ? 'none' : '0 8px 20px rgba(43, 107, 82, 0.35)',
                    }}
                  >
                    {isOutcomeRecorded
                      ? (lang === 'hi' ? 'पूर्ण' : 'Completed')
                      : (lang === 'hi' ? 'पूर्ण चिह्नित करें →' : 'Mark done →')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

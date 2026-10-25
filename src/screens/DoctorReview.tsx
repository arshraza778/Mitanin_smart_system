import { useMemo, useState, useRef, useEffect } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';
import { useCaseStore } from '../store/CaseStore';

type Filter = 'all' | 'over2h' | 'photos';
type Read = 'agree' | 'disagree';
type Decision = 'local' | 'refer';

interface Case {
  id: string;
  name: Record<'en' | 'hi', string>;
  village: Record<'en' | 'hi', string>;
  symptoms: Record<'en' | 'hi', string>;
  waitingMin: number;
  photo: boolean;
  photoData?: string;
  photoIsDemo?: boolean;
  testResult?: 'positive' | 'negative' | 'invalid';
  patientId: string;
}

const CASES = dataService.getCases() as Case[];

const COPY = {
  inbox: { en: enLocale.screens.DoctorInbox, hi: hiLocale.screens.DoctorInbox },
  review: { en: enLocale.screens.DoctorReview, hi: hiLocale.screens.DoctorReview },
} as const;

function waitStyle(min: number) {
  if (min > 120) return { background: '#FFDAD6', color: '#BA1A1A' };
  if (min > 60) return { background: '#FFF1CC', color: '#8A5A00' };
  return { background: '#DAF1DE', color: '#235347' };
}

function Thumb({ has, src, alt, empty }: { has: boolean; src?: string; alt: string; empty: string }) {
  if (!has) {
    return (
      <span
        style={{
          flex: '0 0 60px',
          height: 60,
          borderRadius: 14,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          padding: 4,
          fontSize: 10.5,
          fontWeight: 700,
          lineHeight: 1.2,
          border: '1.5px dashed #CCD9D2',
          background: '#F4F9F6',
          color: '#404945',
        }}
      >
        {empty}
      </span>
    );
  }
  if (src && typeof src === 'string' && src.startsWith('data:image')) {
    return (
      <img
        src={src}
        alt={alt}
        style={{ flex: '0 0 60px', width: 60, height: 60, borderRadius: 14, objectFit: 'cover' }}
      />
    );
  }
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" role="img" aria-label={alt} style={{ flex: '0 0 60px', borderRadius: 14 }}>
      <rect width="60" height="60" rx="14" fill="#051F20" />
      <rect x="8" y="22" width="44" height="16" rx="4" fill="#F4F9F6" />
      <rect x="13" y="25" width="8" height="10" rx="2" fill="#DAF1DE" />
      <rect x="25" y="25" width="22" height="10" rx="2" fill="#FFFFFF" stroke="#CCD9D2" />
      <rect x="33" y="25" width="1.6" height="10" fill="#BA1A1A" />
      <rect x="40" y="25" width="1.6" height="10" fill="#BA1A1A" />
    </svg>
  );
}

const dist = (a: React.Touch, b: React.Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

export default function DoctorReview({ lang, online, onNavigate, onToggleOnline }: ScreenProps) {
  const t = COPY.review[lang];
  const tInbox = COPY.inbox[lang];
  const {
    doctorReply,
    syncedCases,
    getPatientSummary,
    getConsultByCaseId,
    getCase,
    markConsultReceived,
    demoClockOffsetMinutes,
    readingAgreement,
  } = useCaseStore();
  const consultSeed = getConsultByCaseId('c2') || getConsultByCaseId('c3');
  const doctorName = consultSeed?.doctorName || 'Dr. Rao';

  const cases = useMemo(() => {
    return syncedCases.map((c) => ({
      id: c.id,
      patientId: c.patientId,
      name: c.name,
      village: typeof c.village === 'string' ? { en: c.village, hi: c.village } : c.village,
      symptoms: typeof c.symptoms === 'string' ? { en: c.symptoms, hi: c.symptoms } : c.symptoms,
      symptomFlags: c.symptomFlags || [],
      testResult: c.testResult,
      waitingMin: c.waitingMin ?? 0,
      photo: Boolean(c.photoData || (typeof c.photo === 'string' && c.photo) || c.photo === true),
      photoData: c.photoData || (typeof c.photo === 'string' && c.photo.startsWith('data:image') ? c.photo : undefined),
      photoIsDemo: Boolean(
        c.photoIsDemo ||
          (typeof c.photoData === 'string' && c.photoData.includes('demo-')) ||
          (typeof c.photo === 'string' && c.photo.includes('demo-'))
      ),
    }));
  }, [syncedCases]);

  // Wide mode split view state
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(() => CASES[0]?.id ?? 'c1');

  // Review form state
  const [scale, setScale] = useState(1);
  const [read, setRead] = useState<Read | null>(null);
  const [advice, setAdvice] = useState('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [sent, setSent] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftAdviceMap, setDraftAdviceMap] = useState<Record<string, string>>({});
  const [imageError, setImageError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const pinch = useRef<{ d: number; s: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!isZoomed) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomed]);

  useEffect(() => {
    if (!isZoomed) return;
    window.history.pushState({ zoomed: true }, '');
    const handlePopState = () => setIsZoomed(false);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isZoomed]);

  const list = useMemo(() => {
    const base = [...cases].sort((a, b) => b.waitingMin - a.waitingMin);
    if (filter === 'over2h') return base.filter((c) => c.waitingMin > 120);
    if (filter === 'photos') return base.filter((c) => c.photo);
    return base;
  }, [cases, filter]);

  const selectedCase = cases.find((c) => c.id === selectedCaseId) || list[0] || cases[0];
  const consult = getConsultByCaseId(selectedCase?.id);
  const caseRecord = getCase(selectedCase?.id);
  const isReplied = consult?.status === 'replied' || sent;
  const isLockedOrPastOutcome = caseRecord?.state === 'OUTCOME_RECORDED' || !consult;

  const hasPhoto = Boolean(selectedCase?.photoData || (typeof selectedCase?.photo === 'string' && selectedCase?.photo));
  const photoUrl = selectedCase?.photoData || (typeof selectedCase?.photo === 'string' ? selectedCase?.photo : '');
  const isDemo = Boolean(selectedCase?.photoIsDemo || (photoUrl && photoUrl.includes('demo-')));
  const hasValidPhoto = hasPhoto && !imageError;
  const isDoctorReadRequired = hasValidPhoto;

  const waitingTime = useMemo(() => {
    const reqTime = consult?.requestedAt || caseRecord?.createdAt;
    if (!reqTime) return { text: `0 ${t.minUnit}`, isLate: false, totalMin: 0 };
    const reqMs = new Date(reqTime).getTime();
    const demoClockNow = Date.now() + (demoClockOffsetMinutes || 0) * 60 * 1000;
    const diffMs = Math.max(0, demoClockNow - reqMs);
    const totalMin = Math.floor(diffMs / 60000);
    const isLate = totalMin >= 240;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const text = h > 0 ? `${h} ${t.hourUnit} ${m} ${t.minUnit}` : `${m} ${t.minUnit}`;
    return { text, isLate, totalMin };
  }, [consult?.requestedAt, caseRecord?.createdAt, demoClockOffsetMinutes, t.minUnit, t.hourUnit]);

  // Item 9: Opening a case in DoctorReview sets consult.receivedAt once (never overwritten)
  useEffect(() => {
    if (selectedCase?.id) {
      markConsultReceived(selectedCase.id);
    }
  }, [selectedCase?.id, markConsultReceived]);

  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id);
    setScale(1);
    setRead(null);
    setAdvice(draftAdviceMap[id] || '');
    setDecision(null);
    setSent(false);
    setValidationError(null);
    setImageError(false);
    setIsZoomed(false);
  };

  const handleAdviceChange = (val: string) => {
    setAdvice(val);
    if (selectedCase?.id) {
      setDraftAdviceMap((prev) => ({ ...prev, [selectedCase.id]: val }));
    }
    if (validationError) setValidationError(null);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) pinch.current = { d: dist(e.touches[0], e.touches[1]), s: scale };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (pinch.current && e.touches.length === 2) {
      const next = (pinch.current.s * dist(e.touches[0], e.touches[1])) / pinch.current.d;
      setScale(Math.min(4, Math.max(1, next)));
    }
  };
  const onTouchEnd = () => (pinch.current = null);

  const addChip = (text: string) => {
    const nextAdvice = advice.trim() ? `${advice.trim()} ${text}` : text;
    handleAdviceChange(nextAdvice);
  };

  const ready =
    !isReplied &&
    !isLockedOrPastOutcome &&
    !isSubmitting &&
    advice.trim().length >= 3 &&
    decision !== null &&
    (!isDoctorReadRequired || read !== null);

  const send = () => {
    if (isSubmitting || isReplied || isLockedOrPastOutcome) return;
    if (isDoctorReadRequired && !read) {
      setValidationError(t.doctorReadRequired);
      return;
    }
    const trimmed = advice.trim();
    if (!decision) {
      setValidationError(lang === 'hi' ? 'कृपया एक निर्णय चुनें।' : 'Please select a decision.');
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 500) {
      setValidationError(
        lang === 'hi'
          ? 'सलाह 3 से 500 अक्षरों के बीच होनी चाहिए।'
          : 'Advice must be between 3 and 500 characters.'
      );
      return;
    }
    setValidationError(null);
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 500); // 500ms debounce (Item 8)

    const normalizedDecision: 'treat_locally' | 'send_to_hospital' =
      decision === 'refer' ? 'send_to_hospital' : 'treat_locally';

    const res = doctorReply(
      selectedCase.id || 'c1',
      trimmed,
      normalizedDecision,
      read || undefined,
      online
    );

    if (res && !res.ok) {
      setValidationError(lang === 'hi' ? 'जवाब पहले ही भेजा जा चुका है।' : 'Reply already sent.');
      return;
    }

    setSent(true);
    timer.current = window.setTimeout(() => onNavigate('/doctor/inbox'), 1800);
  };

  return (
    <div>
      {/* Fullscreen Zoom In Viewer */}
      {isZoomed && hasValidPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsZoomed(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            cursor: 'zoom-out',
          }}
        >
          <button
            type="button"
            onClick={() => setIsZoomed(false)}
            aria-label={t.close}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              border: 0,
              fontSize: 22,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              zIndex: 100000,
            }}
          >
            ✕
          </button>
          <img
            src={photoUrl}
            alt={t.photoAlt}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '96vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      )}

      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
        <header
          style={{
            background: '#051F20',
            color: '#FFFFFF',
            borderRadius: '0 0 32px 32px',
            padding: 'calc(22px + env(safe-area-inset-top, 0px)) 20px 24px',
          }}
        >
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#C0EACC' }}>
            {t.caseLabel} {selectedCase?.id?.toUpperCase()}
          </p>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 800, lineHeight: 1.15, color: '#FFFFFF' }}>
            {getPatientSummary(selectedCase?.patientId, lang) || selectedCase?.name[lang]}
          </h1>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 800,
                ...waitStyle(waitingTime.totalMin),
              }}
            >
              {waitingTime.text}
            </span>
            {waitingTime.isLate && (
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                  background: '#FFDAD6',
                  color: '#BA1A1A',
                }}
              >
                {t.late}
              </span>
            )}
          </div>
        </header>

        <section style={{ padding: '18px 20px 0', display: 'grid', gap: 16, background: '#F4F9F6' }}>
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              position: 'relative',
              overflow: 'hidden',
              aspectRatio: '4 / 3.4',
              borderRadius: 24,
              background: '#051F20',
              touchAction: 'pan-y',
            }}
          >
            {!hasPhoto ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 20px',
                  textAlign: 'center',
                  background: '#F4F9F6',
                  color: '#404945',
                  border: '1.5px dashed #CCD9D2',
                  borderRadius: 24,
                }}
              >
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>
                  {t.noPhotoSent}
                </p>
              </div>
            ) : imageError ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 20px',
                  textAlign: 'center',
                  background: '#F4F9F6',
                  color: '#404945',
                  border: '1.5px dashed #CCD9D2',
                  borderRadius: 24,
                  gap: 12,
                }}
              >
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#BA1A1A' }}>
                  {t.photoCouldNotOpen}
                </p>
                <button
                  type="button"
                  onClick={() => setImageError(false)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 999,
                    border: '1px solid #E3ECE7',
                    background: '#FFFFFF',
                    color: '#00201C',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                    minHeight: 40,
                  }}
                >
                  {t.retry}
                </button>
              </div>
            ) : (
              <>
                <img
                  src={photoUrl}
                  alt={t.photoAlt}
                  onError={() => setImageError(true)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                    transition: 'transform 0.15s ease',
                  }}
                />
                {isDemo && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      background: 'rgba(5, 31, 32, 0.85)',
                      color: '#FFFFFF',
                      zIndex: 2,
                    }}
                  >
                    {t.demoPhotoTag}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsZoomed(true)}
                  style={{
                    position: 'absolute',
                    left: 12,
                    bottom: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: 0,
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 700,
                    background: 'rgba(5, 31, 32, 0.85)',
                    color: '#FFFFFF',
                    zIndex: 2,
                  }}
                >
                  🔍 {t.zoomIn}
                </button>
              </>
            )}
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 24,
              background: '#FFFFFF',
              border: '1px solid #E3ECE7',
              boxShadow: '0 2px 8px rgba(0, 32, 28, 0.04)',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 14.5,
                fontWeight: 800,
                background:
                  selectedCase.testResult === 'positive'
                    ? '#FFDAD6'
                    : selectedCase.testResult === 'negative'
                    ? '#DAF1DE'
                    : '#FFF1CC',
                color:
                  selectedCase.testResult === 'positive'
                    ? '#BA1A1A'
                    : selectedCase.testResult === 'negative'
                    ? '#2E7D4F'
                    : '#8A5A00',
              }}
            >
              {t.mitaninReadPrefix} {t.results[selectedCase.testResult || 'positive'] || selectedCase.testResult || 'Positive'}
            </span>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span id="my-read" style={{ fontSize: 15.5, fontWeight: 800, color: '#00201C' }}>{t.myRead}</span>
              <div
                role="radiogroup"
                aria-labelledby="my-read"
                style={{ display: 'flex', padding: 3, borderRadius: 999, background: '#DAF1DE' }}
              >
                {(['agree', 'disagree'] as const).map((key) => {
                  const on = read === key;
                  const disabled = !hasValidPhoto;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={disabled}
                      onClick={() => {
                        if (!disabled) {
                          setRead(key);
                          if (validationError) setValidationError(null);
                        }
                      }}
                      style={{
                        border: 0,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.45 : 1,
                        padding: '10px 18px',
                        minHeight: 48,
                        display: 'inline-flex',
                        alignItems: 'center',
                        borderRadius: 999,
                        fontSize: 15,
                        fontWeight: 800,
                        background: on ? (key === 'agree' ? '#2E7D4F' : '#BA1A1A') : 'transparent',
                        color: on ? '#FFFFFF' : '#235347',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {t.reads[key]}
                    </button>
                  );
                })}
              </div>
            </div>
            <p style={{ margin: '12px 2px 0', fontSize: 12.5, color: '#404945' }}>
              {t.recorded} {readingAgreement?.total > 0 ? `(${readingAgreement.agreed}/${readingAgreement.total})` : ''}
            </p>
          </div>

          <div>
            <h2 style={{ margin: '2px 0 8px', fontSize: 18, fontWeight: 800, color: '#00201C' }}>{t.symptomsTitle}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 16,
                  fontSize: 15.5,
                  fontWeight: 600,
                  background: '#FFFFFF',
                  border: '1px solid #E3ECE7',
                  color: '#00201C',
                  width: '100%',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    flex: '0 0 24px',
                    height: 24,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: '#2E7D4F',
                    color: '#FFFFFF',
                  }}
                >
                  ✓
                </span>
                {selectedCase.symptoms[lang]}
              </span>
            </div>
          </div>

          {isLockedOrPastOutcome ? (
            <div
              style={{
                padding: '24px 16px',
                borderRadius: 20,
                background: '#FFFFFF',
                border: '1.5px dashed #CCD9D2',
                textAlign: 'center',
                color: '#404945',
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {caseRecord?.state === 'OUTCOME_RECORDED'
                ? (lang === 'hi' ? 'केस पूर्ण हो चुका है' : 'Case is completed')
                : (lang === 'hi' ? 'कोई सक्रिय परामर्श नहीं' : 'No active consult')}
            </div>
          ) : isReplied ? (
            <div
              style={{
                padding: 18,
                borderRadius: 20,
                background: '#DAF1DE',
                border: '1px solid #C0EACC',
                color: '#0B2B26',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>
                  {consult?.doctorName || doctorName} ({lang === 'hi' ? 'जवाब भेजा गया' : 'Reply sent'})
                </span>
                <span style={{ fontSize: 12, opacity: 0.8 }}>
                  {consult?.repliedAt
                    ? new Date(consult.repliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : (lang === 'hi' ? 'अभी' : 'Just now')}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                {consult?.advice || advice}
              </p>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 10,
                  padding: '4px 12px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 800,
                  background: '#235347',
                  color: '#FFFFFF',
                }}
              >
                {consult?.decision === 'send_to_hospital' || decision === 'refer'
                  ? (lang === 'hi' ? 'अस्पताल भेजें' : 'Send to hospital')
                  : (lang === 'hi' ? 'स्थानीय स्तर पर इलाज करें' : 'Treat locally')}
              </span>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="advice" style={{ display: 'block', marginBottom: 8, fontSize: 18, fontWeight: 800, color: '#00201C' }}>
                  {t.advice}
                </label>
                <ul
                  aria-label={t.chipsLabel}
                  style={{ listStyle: 'none', margin: '0 0 10px', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}
                >
                  {t.chips.map((chip) => (
                    <li key={chip}>
                      <button
                        type="button"
                        onClick={() => addChip(chip)}
                        style={{
                          padding: '8px 14px',
                          minHeight: 48,
                          display: 'inline-flex',
                          alignItems: 'center',
                          borderRadius: 999,
                          cursor: 'pointer',
                          fontSize: 13.5,
                          fontWeight: 700,
                          textAlign: 'left',
                          border: '1.5px solid #CCD9D2',
                          background: '#FFFFFF',
                          color: '#235347',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {chip}
                      </button>
                    </li>
                  ))}
                </ul>
                <textarea
                  id="advice"
                  value={advice}
                  onChange={(e) => handleAdviceChange(e.target.value)}
                  placeholder={t.advicePlaceholder}
                  rows={4}
                  style={{
                    width: '100%',
                    resize: 'none',
                    padding: '12px 16px',
                    borderRadius: 20,
                    border: '2px solid #E3ECE7',
                    font: 'inherit',
                    fontSize: 16,
                    color: '#00201C',
                    background: '#FFFFFF',
                  }}
                />
              </div>

              <div>
                <h2 id="decision" style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#00201C' }}>
                  {t.decisionTitle}
                </h2>
                <div role="radiogroup" aria-labelledby="decision" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {(['local', 'refer'] as const).map((key) => {
                    const on = decision === key;
                    const isRefer = key === 'refer';
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => {
                          setDecision(key);
                          if (validationError) setValidationError(null);
                        }}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 20,
                          cursor: 'pointer',
                          fontSize: 16,
                          fontWeight: 800,
                          minHeight: 48,
                          border: `2px solid ${on ? (isRefer ? '#BA1A1A' : '#235347') : '#E3ECE7'}`,
                          background: on ? (isRefer ? '#BA1A1A' : '#235347') : '#FFFFFF',
                          color: on ? '#FFFFFF' : '#00201C',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {t.decisions[key]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {validationError && (
                <div role="alert" style={{ color: '#BA1A1A', fontSize: 14, fontWeight: 700 }}>
                  {validationError}
                </div>
              )}

              <button
                type="button"
                disabled={!ready}
                onClick={send}
                style={{
                  height: 56,
                  border: 0,
                  borderRadius: 20,
                  cursor: ready ? 'pointer' : 'default',
                  fontSize: 17,
                  fontWeight: 800,
                  background: sent ? '#2E7D4F' : ready ? '#235347' : '#E3ECE7',
                  color: sent || ready ? '#FFFFFF' : '#707975',
                  boxShadow: ready ? '0 4px 14px rgba(35, 83, 71, 0.3)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {sent ? t.sent : t.send}
              </button>
            </>
          )}
        </section>
      </div>

      {/* ===================== WIDE SPLIT VIEW (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '24px 28px 40px', maxWidth: 1400, margin: '0 auto', background: '#F4F9F6', minHeight: '100vh' }}>
        <div className="grid grid-cols-12 gap-6" style={{ alignItems: 'start' }}>
          {/* Left Panel: Cases List (about 35%) */}
          <div className="col-span-12 @2xl:col-span-4 @4xl:col-span-4" style={{ background: '#FFFFFF', borderRadius: 24, border: '1px solid #E3ECE7', boxShadow: '0 2px 10px rgba(0, 32, 28, 0.04)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#00201C' }}>{tInbox.title}</h1>
              <span style={{ fontSize: 13, fontWeight: 800, background: '#DAF1DE', color: '#235347', padding: '4px 10px', borderRadius: 999 }}>
                {list.length}
              </span>
            </div>

            {/* Filter pills */}
            <div role="tablist" aria-label={tInbox.filterLabel} style={{ display: 'flex', gap: 8 }}>
              {(['all', 'over2h', 'photos'] as const).map((key) => {
                const on = filter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setFilter(key)}
                    style={{
                      border: on ? '2px solid #235347' : '1.5px solid #DAF1DE',
                      cursor: 'pointer',
                      padding: '8px 14px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 800,
                      background: on ? '#235347' : '#FFFFFF',
                      color: on ? '#FFFFFF' : '#235347',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tInbox.filters[key]}
                  </button>
                );
              })}
            </div>

            {/* List */}
            {list.length === 0 ? (
              <p style={{ margin: '20px 0', textAlign: 'center', color: '#404945', fontSize: 14 }}>
                {tInbox.empty}
              </p>
            ) : (
              <div style={{ maxHeight: 'calc(100vh - 230px)', overflowY: 'auto' }}>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {list.map((c) => {
                    const isSelected = c.id === selectedCase.id;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectCase(c.id)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 14px',
                            borderRadius: 18,
                            textAlign: 'left',
                            cursor: 'pointer',
                            border: `2px solid ${isSelected ? '#235347' : 'transparent'}`,
                            background: isSelected ? '#DAF1DE' : '#FFFFFF',
                            boxShadow: isSelected ? 'none' : '0 1px 4px rgba(0, 32, 28, 0.04)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Thumb
                            has={c.photo}
                            src={c.photoData}
                            alt={tInbox.photoAlt}
                            empty={tInbox.noPhoto}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: isSelected ? '#235347' : '#00201C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {getPatientSummary(c.patientId, lang) || c.name[lang]}
                              </p>
                              <span
                                style={{
                                  flexShrink: 0,
                                  fontSize: 11.5,
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  ...waitStyle(c.waitingMin),
                                }}
                              >
                                {c.waitingMin >= 60 ? `${Math.floor(c.waitingMin / 60)} ${tInbox.hourUnit} ${c.waitingMin % 60} ${tInbox.minuteUnit}` : `${c.waitingMin} ${tInbox.minuteUnit}`}
                              </span>
                            </div>
                            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#404945', fontWeight: 600 }}>
                              {c.village[lang]}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#00201C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.symptoms[lang]}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Right Panel: Review Panel (about 65%) */}
          <div className="col-span-12 @2xl:col-span-8 @4xl:col-span-8" style={{ background: '#FFFFFF', borderRadius: 24, border: '1px solid #E3ECE7', boxShadow: '0 2px 10px rgba(0, 32, 28, 0.04)', padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {selectedCase ? (
              <>
                {/* Review Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #E3ECE7', paddingBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#235347', letterSpacing: '0.04em' }}>
                      {t.caseLabel} {selectedCase.id.toUpperCase()}
                    </span>
                    <h2 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 800, color: '#00201C' }}>
                      {getPatientSummary(selectedCase.patientId, lang) || selectedCase.name[lang]}
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#404945', fontWeight: 600 }}>
                      {selectedCase.village[lang]} • {selectedCase.symptoms[lang]}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 999,
                        fontSize: 12.5,
                        fontWeight: 800,
                        ...waitStyle(waitingTime.totalMin),
                      }}
                    >
                      {waitingTime.text}
                    </span>
                    {waitingTime.isLate && (
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 800,
                          background: '#FFDAD6',
                          color: '#BA1A1A',
                        }}
                      >
                        {t.late}
                      </span>
                    )}
                  </div>
                </div>

                {/* Large Test Photo and Reads */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
                  {!hasPhoto ? (
                    <div
                      style={{
                        position: 'relative',
                        aspectRatio: '4 / 3.2',
                        borderRadius: 22,
                        background: '#F4F9F6',
                        border: '1.5px dashed #CCD9D2',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px 20px',
                        textAlign: 'center',
                        color: '#404945',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>
                        {t.noPhotoSent}
                      </p>
                    </div>
                  ) : imageError ? (
                    <div
                      style={{
                        position: 'relative',
                        aspectRatio: '4 / 3.2',
                        borderRadius: 22,
                        background: '#F4F9F6',
                        border: '1.5px dashed #CCD9D2',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px 20px',
                        textAlign: 'center',
                        color: '#404945',
                        gap: 12,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#BA1A1A' }}>
                        {t.photoCouldNotOpen}
                      </p>
                      <button
                        type="button"
                        onClick={() => setImageError(false)}
                        style={{
                          padding: '8px 20px',
                          borderRadius: 999,
                          border: '1px solid #E3ECE7',
                          background: '#FFFFFF',
                          color: '#00201C',
                          fontSize: 14,
                          fontWeight: 800,
                          cursor: 'pointer',
                          minHeight: 40,
                        }}
                      >
                        {t.retry}
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        aspectRatio: '4 / 3.2',
                        borderRadius: 22,
                        background: '#051F20',
                      }}
                    >
                      <img
                        src={photoUrl}
                        alt={t.photoAlt}
                        onError={() => setImageError(true)}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          transform: `scale(${scale})`,
                          transformOrigin: 'center',
                          transition: 'transform 0.15s ease',
                        }}
                      />
                      {isDemo && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 12,
                            left: 12,
                            padding: '4px 10px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                            background: 'rgba(5, 31, 32, 0.85)',
                            color: '#FFFFFF',
                            zIndex: 2,
                          }}
                        >
                          {t.demoPhotoTag}
                        </span>
                      )}
                      <div style={{ position: 'absolute', left: 12, bottom: 12, display: 'flex', gap: 8, zIndex: 2 }}>
                        <button
                          type="button"
                          onClick={() => setIsZoomed(true)}
                          style={{
                            padding: '6px 14px',
                            border: 0,
                            borderRadius: 999,
                            cursor: 'pointer',
                            fontSize: 12.5,
                            fontWeight: 700,
                            background: 'rgba(5, 31, 32, 0.85)',
                            color: '#FFFFFF',
                          }}
                        >
                          🔍 {t.zoomIn}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mitanin Read vs Doctor Read */}
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 20,
                      background: '#F4F9F6',
                      border: '1px solid #E3ECE7',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#404945', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {lang === 'hi' ? 'मितानिन की जाँच' : 'Mitanin Reading'}
                      </span>
                      <div style={{ marginTop: 4 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '5px 12px',
                            borderRadius: 999,
                            fontSize: 13.5,
                            fontWeight: 800,
                            background:
                              selectedCase.testResult === 'positive'
                                ? '#FFDAD6'
                                : selectedCase.testResult === 'negative'
                                ? '#DAF1DE'
                                : '#FFF1CC',
                            color:
                              selectedCase.testResult === 'positive'
                                ? '#BA1A1A'
                                : selectedCase.testResult === 'negative'
                                ? '#2E7D4F'
                                : '#8A5A00',
                          }}
                        >
                          {t.mitaninReadPrefix} {t.results[selectedCase.testResult || 'positive'] || selectedCase.testResult || 'Positive'}
                        </span>
                      </div>
                    </div>

                    <div style={{ paddingTop: 8, borderTop: '1px solid #E3ECE7' }}>
                      <span id="doc-read-review-split" style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#00201C', marginBottom: 8 }}>
                        {t.myRead}
                      </span>
                      <div
                        role="radiogroup"
                        aria-labelledby="doc-read-review-split"
                        style={{ display: 'flex', padding: 3, borderRadius: 999, background: '#DAF1DE' }}
                      >
                        {(['agree', 'disagree'] as const).map((key) => {
                          const on = read === key;
                          const disabled = !hasValidPhoto;
                          return (
                            <button
                              key={key}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              disabled={disabled}
                              onClick={() => {
                                if (!disabled) {
                                  setRead(key);
                                  if (validationError) setValidationError(null);
                                }
                              }}
                              style={{
                                flex: 1,
                                border: 0,
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                opacity: disabled ? 0.45 : 1,
                                padding: '8px 14px',
                                borderRadius: 999,
                                fontSize: 14,
                                fontWeight: 800,
                                background: on ? (key === 'agree' ? '#2E7D4F' : '#BA1A1A') : 'transparent',
                                color: on ? '#FFFFFF' : '#235347',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {t.reads[key]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 11.5, color: '#404945' }}>
                      {t.recorded} {readingAgreement?.total > 0 ? `(${readingAgreement.agreed}/${readingAgreement.total})` : ''}
                    </p>
                  </div>
                </div>

                {/* Symptoms */}
                <div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#00201C' }}>{t.symptomsTitle}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 14px',
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 600,
                        background: '#FFFFFF',
                        border: '1px solid #E3ECE7',
                        color: '#00201C',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          background: '#2E7D4F',
                          color: '#FFFFFF',
                          fontSize: 11,
                        }}
                      >
                        ✓
                      </span>
                      {selectedCase.symptoms[lang]}
                    </span>
                  </div>
                </div>

                {isLockedOrPastOutcome ? (
                  <div
                    style={{
                      padding: '32px 20px',
                      borderRadius: 20,
                      background: '#FFFFFF',
                      border: '1.5px dashed #CCD9D2',
                      textAlign: 'center',
                      color: '#404945',
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    {caseRecord?.state === 'OUTCOME_RECORDED'
                      ? (lang === 'hi' ? 'केस पूर्ण हो चुका है' : 'Case is completed')
                      : (lang === 'hi' ? 'कोई सक्रिय परामर्श नहीं' : 'No active consult')}
                  </div>
                ) : isReplied ? (
                  <div
                    style={{
                      padding: 20,
                      borderRadius: 20,
                      background: '#DAF1DE',
                      border: '1px solid #C0EACC',
                      color: '#0B2B26',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>
                        {consult?.doctorName || doctorName} ({lang === 'hi' ? 'जवाब भेजा गया' : 'Reply sent'})
                      </span>
                      <span style={{ fontSize: 12.5, opacity: 0.8 }}>
                        {consult?.repliedAt
                          ? new Date(consult.repliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : (lang === 'hi' ? 'अभी' : 'Just now')}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                      {consult?.advice || advice}
                    </p>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: 12,
                        padding: '4px 14px',
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 800,
                        background: '#235347',
                        color: '#FFFFFF',
                      }}
                    >
                      {consult?.decision === 'send_to_hospital' || decision === 'refer'
                        ? (lang === 'hi' ? 'अस्पताल भेजें' : 'Send to hospital')
                        : (lang === 'hi' ? 'स्थानीय स्तर पर इलाज करें' : 'Treat locally')}
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Advice Field with Quick-Reply Chips */}
                    <div>
                      <label htmlFor="review-split-advice" style={{ display: 'block', marginBottom: 8, fontSize: 16, fontWeight: 800, color: '#00201C' }}>
                        {t.advice}
                      </label>
                      <ul
                        aria-label={t.chipsLabel}
                        style={{ listStyle: 'none', margin: '0 0 10px', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}
                      >
                        {t.chips.map((chip) => (
                          <li key={chip}>
                            <button
                              type="button"
                              onClick={() => addChip(chip)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 999,
                                cursor: 'pointer',
                                fontSize: 12.5,
                                fontWeight: 700,
                                textAlign: 'left',
                                border: '1.5px solid #CCD9D2',
                                background: '#F4F9F6',
                                color: '#235347',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              + {chip}
                            </button>
                          </li>
                        ))}
                      </ul>
                      <textarea
                        id="review-split-advice"
                        value={advice}
                        onChange={(e) => handleAdviceChange(e.target.value)}
                        placeholder={t.advicePlaceholder}
                        rows={3}
                        style={{
                          width: '100%',
                          resize: 'none',
                          padding: '10px 14px',
                          borderRadius: 16,
                          border: '2px solid #E3ECE7',
                          font: 'inherit',
                          fontSize: 14.5,
                          color: '#00201C',
                          background: '#FFFFFF',
                        }}
                      />
                    </div>

                    {/* Decision Selector and Send Reply */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'end', paddingTop: 8, borderTop: '1px solid #E3ECE7' }}>
                      <div>
                        <h3 id="review-split-decision" style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800, color: '#00201C' }}>
                          {t.decisionTitle}
                        </h3>
                        <div role="radiogroup" aria-labelledby="review-split-decision" style={{ display: 'flex', gap: 10 }}>
                          {(['local', 'refer'] as const).map((key) => {
                            const on = decision === key;
                            const isRefer = key === 'refer';
                            return (
                              <button
                                key={key}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => {
                                  setDecision(key);
                                  if (validationError) setValidationError(null);
                                }}
                                style={{
                                  padding: '10px 20px',
                                  borderRadius: 16,
                                  cursor: 'pointer',
                                  fontSize: 15,
                                  fontWeight: 800,
                                  border: `2px solid ${on ? (isRefer ? '#BA1A1A' : '#235347') : '#E3ECE7'}`,
                                  background: on ? (isRefer ? '#BA1A1A' : '#235347') : '#FFFFFF',
                                  color: on ? '#FFFFFF' : '#00201C',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {t.decisions[key]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Send reply */}
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={send}
                        style={{
                          height: 52,
                          padding: '0 28px',
                          border: 0,
                          borderRadius: 18,
                          cursor: ready ? 'pointer' : 'default',
                          fontSize: 16,
                          fontWeight: 800,
                          background: sent ? '#2E7D4F' : ready ? '#235347' : '#E3ECE7',
                          color: sent || ready ? '#FFFFFF' : '#707975',
                          boxShadow: ready ? '0 4px 14px rgba(35, 83, 71, 0.3)' : 'none',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {sent ? t.sent : t.send}
                      </button>
                    </div>

                    {validationError && (
                      <div role="alert" style={{ color: '#BA1A1A', fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                        {validationError}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

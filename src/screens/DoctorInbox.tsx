import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
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
  patientId: string;
}

const CASES = dataService.getCases() as Case[];

const COPY = {
  inbox: { en: enLocale.screens.DoctorInbox, hi: hiLocale.screens.DoctorInbox },
  review: { en: enLocale.screens.DoctorReview, hi: hiLocale.screens.DoctorReview },
} as const;

function waitStyle(min: number) {
  if (min > 120) return { background: 'var(--ms-orange-100)', color: 'var(--ms-orange-700)' };
  if (min >= 60) return { background: 'var(--ms-violet-100)', color: 'var(--ms-violet-700)' };
  return { background: 'var(--ms-green-100)', color: 'var(--ms-green-700)' };
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
          border: '2px dashed var(--ms-border)',
          color: 'var(--ms-muted)',
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
      <rect width="60" height="60" rx="14" fill="#1c3a2b" />
      <rect x="8" y="22" width="44" height="16" rx="4" fill="#f1f5f2" />
      <rect x="13" y="26" width="9" height="8" rx="2" fill="#d9e2dc" />
      <rect x="26" y="25" width="22" height="10" rx="2" fill="#fff" />
      <rect x="33" y="25" width="1.6" height="10" fill="#d9534f" />
      <rect x="40" y="25" width="1.6" height="10" fill="#d9534f" />
    </svg>
  );
}

export default function DoctorInbox({ lang, online, onNavigate, onToggleOnline }: ScreenProps) {
  const t = COPY.inbox[lang];
  const tReview = COPY.review[lang];
  const {
    syncedCases,
    syncedConsults,
    doctorReply,
    getConsultByCaseId,
    getCase,
    getPatientSummary,
    markConsultReceived,
    demoClockOffsetMinutes,
    readingAgreement,
  } = useCaseStore();

  const caseList = useMemo(() => {
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
      state: c.state,
    }));
  }, [syncedCases]);

  const [filter, setFilter] = useState<Filter>('all');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(() => caseList[0]?.id ?? 'c1');

  // Review panel state for selected case
  const [scale, setScale] = useState(1);
  const [read, setRead] = useState<Read | null>(null);
  const [advice, setAdvice] = useState('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [sent, setSent] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [draftAdviceMap, setDraftAdviceMap] = useState<Record<string, string>>({});
  const [imageError, setImageError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
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

  const isCaseReplied = useCallback((caseId: string) => {
    const c = syncedConsults.find((con) => con.caseId === caseId);
    if (c && c.status === 'replied') return true;
    const target = syncedCases.find((sc) => sc.id === caseId);
    return target?.state === 'CONSULT_REPLIED';
  }, [syncedConsults, syncedCases]);

  const list = useMemo(() => {
    const base = [...caseList].sort((a, b) => b.waitingMin - a.waitingMin);
    if (filter === 'over2h') return base.filter((c) => c.waitingMin > 120);
    if (filter === 'photos') return base.filter((c) => c.photo);
    return base;
  }, [caseList, filter]);

  const waitingList = useMemo(() => list.filter((c) => !isCaseReplied(c.id)), [list, isCaseReplied]);
  const repliedList = useMemo(() => list.filter((c) => isCaseReplied(c.id)), [list, isCaseReplied]);

  const selectedCase = caseList.find((c) => c.id === selectedCaseId) || list[0] || caseList[0];
  const consult = getConsultByCaseId(selectedCase?.id);
  const caseRecord = getCase(selectedCase?.id);

  const hasPhoto = Boolean(selectedCase?.photoData || (typeof selectedCase?.photo === 'string' && selectedCase?.photo));
  const photoUrl = selectedCase?.photoData || (typeof selectedCase?.photo === 'string' ? selectedCase?.photo : '');
  const isDemo = Boolean(selectedCase?.photoIsDemo || (photoUrl && photoUrl.includes('demo-')));
  const hasValidPhoto = hasPhoto && !imageError;
  const isDoctorReadRequired = hasValidPhoto;

  const waitingTime = useMemo(() => {
    const reqTime = consult?.requestedAt || caseRecord?.createdAt;
    if (!reqTime) return { text: `0 ${tReview.minUnit}`, isLate: false, totalMin: 0 };
    const reqMs = new Date(reqTime).getTime();
    const demoClockNow = Date.now() + (demoClockOffsetMinutes || 0) * 60 * 1000;
    const diffMs = Math.max(0, demoClockNow - reqMs);
    const totalMin = Math.floor(diffMs / 60000);
    const isLate = totalMin >= 240;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const text = h > 0 ? `${h} ${tReview.hourUnit} ${m} ${tReview.minUnit}` : `${m} ${tReview.minUnit}`;
    return { text, isLate, totalMin };
  }, [consult?.requestedAt, caseRecord?.createdAt, demoClockOffsetMinutes, tReview.minUnit, tReview.hourUnit]);

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

  const addChip = (text: string) => {
    const nextAdvice = advice.trim() ? `${advice.trim()} ${text}` : text;
    handleAdviceChange(nextAdvice);
  };

  const ready =
    !sent &&
    advice.trim().length >= 3 &&
    decision !== null &&
    (!isDoctorReadRequired || read !== null);

  const send = () => {
    if (!ready) return;
    if (isDoctorReadRequired && !read) {
      setValidationError(tReview.doctorReadRequired);
      return;
    }
    setSent(true);
    doctorReply(
      selectedCase.id || 'c1',
      advice.trim(),
      decision === 'refer' ? 'send_to_hospital' : 'treat_locally',
      read || undefined,
      online
    );
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
            aria-label={tReview.close}
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
            alt={tReview.photoAlt}
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
        <header style={{ position: 'relative', height: 210, color: '#fff' }}>
          <svg viewBox="0 0 430 210" preserveAspectRatio="xMaxYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
            <rect width="430" height="210" fill="var(--ms-green-700)" />
            <circle cx="335" cy="90" r="70" fill="#3f8a63" opacity="0.7" />
            <g transform="translate(335 100) rotate(14) scale(1.3)">
              <path d="M0 84C-42 44-34-22 0-66C34-22 42 44 0 84Z" fill="var(--ms-green-500)" />
              <path d="M0 84L0-52M0 40L-16 18M0 16L16-6M0-8L-12-26" stroke="#d3ecd9" strokeWidth="2" strokeLinecap="round" fill="none" />
            </g>
            <g transform="translate(275 128) rotate(-38) scale(0.75)">
              <path d="M0 84C-42 44-34-22 0-66C34-22 42 44 0 84Z" fill="#8cc79d" />
            </g>
          </svg>
          <div style={{ position: 'absolute', left: 20, bottom: 56 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, lineHeight: 1.15 }}>{t.greeting}</h1>
            <button
              type="button"
              onClick={onToggleOnline}
              aria-pressed={online}
              style={{
                marginTop: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 14px',
                minHeight: 48,
                border: 0,
                borderRadius: 999,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                background: online ? 'var(--ms-green-100)' : 'var(--ms-orange-100)',
                color: online ? 'var(--ms-green-900)' : 'var(--ms-orange-700)',
              }}
            >
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: online ? 'var(--ms-green-500)' : 'var(--ms-orange)' }} />
              {online ? t.synced : t.offline}
            </button>
          </div>
        </header>

        <section
          style={{
            marginTop: -36,
            position: 'relative',
            background: 'var(--ms-surface)',
            borderRadius: '36px 36px 0 0',
            padding: '26px 0 28px',
            minHeight: 420,
          }}
        >
          <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{t.title}</h2>
            <span
              aria-live="polite"
              style={{
                minWidth: 30,
                padding: '3px 10px',
                borderRadius: 999,
                textAlign: 'center',
                fontSize: 15,
                fontWeight: 800,
                background: 'var(--ms-orange)',
                color: '#fff',
              }}
            >
              {list.length}
            </span>
          </div>

          <div
            role="group"
            aria-label={t.filterLabel}
            style={{ padding: '14px 20px 4px', display: 'flex', gap: 8, overflowX: 'auto' }}
          >
            {(['all', 'over2h', 'photos'] as const).map((key) => {
              const on = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(key)}
                  style={{
                    flex: '0 0 auto',
                    minHeight: 48,
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 16px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    border: `2px solid ${on ? 'var(--ms-green-700)' : 'var(--ms-green-100)'}`,
                    background: on ? 'var(--ms-green-700)' : 'var(--ms-surface)',
                    color: on ? '#fff' : 'var(--ms-green-700)',
                  }}
                >
                  {t.filters[key]}
                </button>
              );
            })}
          </div>

          {waitingList.length === 0 ? (
            <p style={{ margin: '30px 20px', textAlign: 'center', color: 'var(--ms-muted)', fontSize: 14.5 }}>{t.empty}</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: '12px 20px 0', display: 'grid', gap: 12 }}>
              {waitingList.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate('/doctor/review')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 14,
                      textAlign: 'left',
                      borderRadius: 22,
                      cursor: 'pointer',
                      border: '1px solid var(--ms-green-100)',
                      background: 'var(--ms-bg)',
                      color: 'var(--ms-ink)',
                    }}
                  >
                    <Thumb has={c.photo} src={c.photoData} alt={t.photoAlt} empty={t.noPhoto} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 17, fontWeight: 800 }}>{c.name[lang]}</span>
                      <span style={{ display: 'block', marginTop: 1, fontSize: 13, color: 'var(--ms-muted)' }}>{c.village[lang]}</span>
                      <span style={{ display: 'block', marginTop: 6, fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{c.symptoms[lang]}</span>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 8,
                          padding: '3px 12px',
                          borderRadius: 999,
                          fontSize: 12.5,
                          fontWeight: 800,
                          ...waitStyle(c.waitingMin),
                        }}
                      >
                        {c.waitingMin >= 60 ? `${Math.floor(c.waitingMin / 60)} ${t.hourUnit} ${c.waitingMin % 60} ${t.minuteUnit}` : `${c.waitingMin} ${t.minuteUnit}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {repliedList.length > 0 && (
            <div style={{ marginTop: 24, padding: '0 20px' }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: 'var(--ms-ink)' }}>
                {lang === 'hi' ? 'उत्तर दिए गए' : 'Replied'} ({repliedList.length})
              </h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
                {repliedList.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate('/doctor/review')}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 14,
                        textAlign: 'left',
                        borderRadius: 22,
                        cursor: 'pointer',
                        border: '1px solid var(--ms-border)',
                        background: 'var(--ms-surface)',
                        color: 'var(--ms-ink)',
                      }}
                    >
                      <Thumb has={c.photo} src={c.photoData} alt={t.photoAlt} empty={t.noPhoto} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 17, fontWeight: 800 }}>{c.name[lang]}</span>
                        <span style={{ display: 'block', marginTop: 1, fontSize: 13, color: 'var(--ms-muted)' }}>{c.village[lang]}</span>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: 8,
                            padding: '3px 12px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 800,
                            background: 'var(--ms-green-100)',
                            color: 'var(--ms-green-700)',
                          }}
                        >
                          ✓ {lang === 'hi' ? 'उत्तर दिया' : 'Replied'}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* ===================== WIDE SPLIT LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '24px 28px 40px' }}>
        {/* Top Header */}
        <header style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--ms-ink)', lineHeight: 1.2 }}>{t.greeting}</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ms-muted)', fontWeight: 600 }}>
              {lang === 'hi' ? 'चिकित्सक इनबॉक्स एवं केस समीक्षा' : 'Doctor Inbox & Clinical Case Review'}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleOnline}
            aria-pressed={online}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              border: 0,
              borderRadius: 999,
              cursor: 'pointer',
              fontSize: 13.5,
              fontWeight: 700,
              background: online ? 'var(--ms-green-100)' : 'var(--ms-orange-100)',
              color: online ? 'var(--ms-green-900)' : 'var(--ms-orange-700)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: online ? 'var(--ms-green-500)' : 'var(--ms-orange)' }} />
            {online ? t.synced : t.offline}
          </button>
        </header>

        {/* Split View: Case list (about 35%) on left, Review panel on right */}
        <div className="grid grid-cols-12 @md:grid-cols-12 @2xl:grid-cols-12 @4xl:grid-cols-12 gap-6" style={{ alignItems: 'start' }}>
          {/* Left Panel: Case List (about 35%) */}
          <div className="col-span-12 @2xl:col-span-4 @4xl:col-span-4" style={{ background: 'var(--ms-surface)', borderRadius: 24, border: '1px solid var(--ms-border)', boxShadow: 'var(--ms-shadow-card)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{t.title}</h2>
                <span
                  aria-live="polite"
                  style={{
                    padding: '2px 10px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 800,
                    background: 'var(--ms-orange)',
                    color: '#fff',
                  }}
                >
                  {list.length}
                </span>
              </div>
            </div>

            {/* Filter Chips */}
            <div role="group" aria-label={t.filterLabel} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['all', 'over2h', 'photos'] as const).map((key) => {
                const on = filter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter(key)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      cursor: 'pointer',
                      fontSize: 12.5,
                      fontWeight: 800,
                      border: `1.5px solid ${on ? 'var(--ms-green-700)' : 'var(--ms-green-100)'}`,
                      background: on ? 'var(--ms-green-700)' : 'var(--ms-surface)',
                      color: on ? '#fff' : 'var(--ms-green-700)',
                    }}
                  >
                    {t.filters[key]}
                  </button>
                );
              })}
            </div>

            {/* Cases list */}
            {waitingList.length === 0 ? (
              <p style={{ margin: '20px 0', textAlign: 'center', color: 'var(--ms-muted)', fontSize: 14 }}>{t.empty}</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10, maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                {waitingList.map((c) => {
                  const isSelected = selectedCase?.id === c.id;
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
                          textAlign: 'left',
                          borderRadius: 18,
                          cursor: 'pointer',
                          border: isSelected ? '2px solid var(--ms-forest)' : '1px solid var(--ms-green-100)',
                          background: isSelected ? 'var(--ms-mint)' : 'var(--ms-bg)',
                          color: 'var(--ms-ink)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Thumb has={c.photo} src={c.photoData} alt={t.photoAlt} empty={t.noPhoto} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <span style={{ fontSize: 15.5, fontWeight: 800, color: isSelected ? 'var(--ms-forest)' : 'var(--ms-ink)' }}>{c.name[lang]}</span>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 800,
                                flexShrink: 0,
                                ...waitStyle(c.waitingMin),
                              }}
                            >
                              {c.waitingMin >= 60 ? `${Math.floor(c.waitingMin / 60)} ${t.hourUnit}` : `${c.waitingMin} ${t.minuteUnit}`}
                            </span>
                          </span>
                          <span style={{ display: 'block', marginTop: 2, fontSize: 12.5, color: 'var(--ms-muted)' }}>{c.village[lang]}</span>
                          <span style={{ display: 'block', marginTop: 4, fontSize: 13, fontWeight: 600, color: 'var(--ms-ink)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.symptoms[lang]}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {repliedList.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800, color: 'var(--ms-ink)' }}>
                  {lang === 'hi' ? 'उत्तर दिए गए' : 'Replied'} ({repliedList.length})
                </h3>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                  {repliedList.map((c) => {
                    const isSelected = selectedCase?.id === c.id;
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
                            padding: '10px 14px',
                            textAlign: 'left',
                            borderRadius: 16,
                            cursor: 'pointer',
                            border: isSelected ? '2px solid var(--ms-forest)' : '1px solid var(--ms-border)',
                            background: isSelected ? 'var(--ms-mint)' : 'var(--ms-surface)',
                            color: 'var(--ms-ink)',
                          }}
                        >
                          <Thumb has={c.photo} src={c.photoData} alt={t.photoAlt} empty={t.noPhoto} />
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 15, fontWeight: 800 }}>{c.name[lang]}</span>
                            <span style={{ display: 'block', marginTop: 1, fontSize: 12, color: 'var(--ms-muted)' }}>{c.village[lang]}</span>
                            <span
                              style={{
                                display: 'inline-block',
                                marginTop: 6,
                                padding: '2px 8px',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 800,
                                background: 'var(--ms-green-100)',
                                color: 'var(--ms-green-700)',
                              }}
                            >
                              ✓ {lang === 'hi' ? 'उत्तर दिया' : 'Replied'}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Right Panel: Review Panel (about 65%) */}
          <div className="col-span-12 @2xl:col-span-8 @4xl:col-span-8" style={{ background: 'var(--ms-surface)', borderRadius: 24, border: '1px solid var(--ms-border)', boxShadow: 'var(--ms-shadow-card)', padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {selectedCase ? (
              <>
                {/* Review Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--ms-border)', paddingBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ms-forest)', letterSpacing: '0.04em' }}>
                      {tReview.caseLabel} {selectedCase.id.toUpperCase()}
                    </span>
                    <h2 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 800, color: 'var(--ms-ink)' }}>
                      {getPatientSummary(selectedCase.patientId, lang) || selectedCase.name[lang]}
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--ms-muted)', fontWeight: 600 }}>
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
                          background: 'var(--ms-orange-100)',
                          color: 'var(--ms-orange-700)',
                        }}
                      >
                        {tReview.late}
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
                        background: 'var(--ms-bg)',
                        border: '2px dashed var(--ms-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px 20px',
                        textAlign: 'center',
                        color: 'var(--ms-muted)',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>
                        {tReview.noPhotoSent}
                      </p>
                    </div>
                  ) : imageError ? (
                    <div
                      style={{
                        position: 'relative',
                        aspectRatio: '4 / 3.2',
                        borderRadius: 22,
                        background: 'var(--ms-bg)',
                        border: '2px dashed var(--ms-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px 20px',
                        textAlign: 'center',
                        color: 'var(--ms-muted)',
                        gap: 12,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ms-danger)' }}>
                        {tReview.photoCouldNotOpen}
                      </p>
                      <button
                        type="button"
                        onClick={() => setImageError(false)}
                        style={{
                          padding: '8px 20px',
                          borderRadius: 999,
                          border: '1px solid var(--ms-border)',
                          background: 'var(--ms-surface)',
                          color: 'var(--ms-ink)',
                          fontSize: 14,
                          fontWeight: 800,
                          cursor: 'pointer',
                          minHeight: 40,
                        }}
                      >
                        {tReview.retry}
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        aspectRatio: '4 / 3.2',
                        borderRadius: 22,
                        background: '#12241b',
                      }}
                    >
                      <img
                        src={photoUrl}
                        alt={tReview.photoAlt}
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
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: '#fff',
                            zIndex: 2,
                          }}
                        >
                          {tReview.demoPhotoTag}
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
                            background: 'rgba(10, 30, 20, 0.75)',
                            color: '#fff',
                          }}
                        >
                          🔍 {tReview.zoomIn}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mitanin Read vs Doctor Read */}
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 20,
                      background: 'var(--ms-bg)',
                      border: '1px solid var(--ms-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ms-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                            background: 'var(--ms-orange-100)',
                            color: 'var(--ms-orange-700)',
                          }}
                        >
                          {tReview.mitaninReadPrefix} {tReview.results[selectedCase.testResult || 'positive'] || selectedCase.testResult || 'Positive'}
                        </span>
                      </div>
                    </div>

                    <div style={{ paddingTop: 8, borderTop: '1px solid var(--ms-border)' }}>
                      <span id="doc-read-split" style={{ display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--ms-ink)', marginBottom: 8 }}>
                        {tReview.myRead}
                      </span>
                      <div
                        role="radiogroup"
                        aria-labelledby="doc-read-split"
                        style={{ display: 'flex', padding: 3, borderRadius: 999, background: 'var(--ms-green-100)' }}
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
                                background: on ? (key === 'agree' ? 'var(--ms-green-500)' : 'var(--ms-orange)') : 'transparent',
                                color: on ? '#fff' : 'var(--ms-green-700)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {tReview.reads[key]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ms-muted)' }}>
                      {tReview.recorded} {readingAgreement?.total > 0 ? `(${readingAgreement.agreed}/${readingAgreement.total})` : ''}
                    </p>
                  </div>
                </div>

                {/* Symptoms */}
                <div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: 'var(--ms-ink)' }}>{tReview.symptomsTitle}</h3>
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
                        background: 'var(--ms-bg)',
                        border: '1px solid var(--ms-border)',
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
                          background: 'var(--ms-green-500)',
                          color: '#fff',
                          fontSize: 11,
                        }}
                      >
                        ✓
                      </span>
                      {selectedCase.symptoms[lang]}
                    </span>
                  </div>
                </div>

                {/* Advice Field with Quick-Reply Chips */}
                <div>
                  <label htmlFor="split-advice" style={{ display: 'block', marginBottom: 8, fontSize: 16, fontWeight: 800 }}>
                    {tReview.advice}
                  </label>
                  <ul
                    aria-label={tReview.chipsLabel}
                    style={{ listStyle: 'none', margin: '0 0 10px', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}
                  >
                    {tReview.chips.map((chip) => (
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
                            border: '1.5px solid var(--ms-green-100)',
                            background: 'var(--ms-bg)',
                            color: 'var(--ms-green-700)',
                          }}
                        >
                          + {chip}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <textarea
                    id="split-advice"
                    value={advice}
                    onChange={(e) => handleAdviceChange(e.target.value)}
                    placeholder={tReview.advicePlaceholder}
                    rows={3}
                    style={{
                      width: '100%',
                      resize: 'none',
                      padding: '10px 14px',
                      borderRadius: 16,
                      border: '2px solid var(--ms-border)',
                      font: 'inherit',
                      fontSize: 14.5,
                      color: 'var(--ms-ink)',
                      background: 'var(--ms-bg)',
                    }}
                  />
                </div>

                {/* Decision Selector and Send Reply */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'end', paddingTop: 8, borderTop: '1px solid var(--ms-border)' }}>
                  <div>
                    <h3 id="split-decision" style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800 }}>
                      {tReview.decisionTitle}
                    </h3>
                    <div role="radiogroup" aria-labelledby="split-decision" style={{ display: 'flex', gap: 10 }}>
                      {(['local', 'refer'] as const).map((key) => {
                        const on = decision === key;
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
                              border: `2px solid ${on ? 'var(--ms-green-700)' : 'var(--ms-border)'}`,
                              background: on ? 'var(--ms-green-700)' : 'var(--ms-surface)',
                              color: on ? '#fff' : 'var(--ms-ink)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {tReview.decisions[key]}
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
                      background: sent ? 'var(--ms-green-500)' : ready ? 'var(--ms-orange)' : '#e3e9e5',
                      color: sent || ready ? '#fff' : '#9aa7a0',
                      boxShadow: ready ? '0 8px 20px rgba(240, 121, 75, 0.35)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {sent ? tReview.sent : tReview.send}
                  </button>
                </div>

                {validationError && (
                  <div role="alert" style={{ color: 'var(--ms-danger)', fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                    {validationError}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

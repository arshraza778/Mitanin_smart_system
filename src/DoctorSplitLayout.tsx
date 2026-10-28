import { useState, useMemo, useEffect, useRef, useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Search, ZoomIn, X, Camera, AlertCircle, Check, FileText, CheckCircle2 } from 'lucide-react';
import type { Lang } from './BottomNav';
import enLocale from './i18n/en.json';
import hiLocale from './i18n/hi.json';
import { useCaseStore } from './store/CaseStore';
import { useScreenDraft } from './ScreenDraftContext';
import States from './screens/States';

export interface DoctorSplitLayoutProps {
  lang: Lang;
  online: boolean;
  onNavigate: (route: string) => void;
  onToggleOnline: () => void;
  initialSelectedCaseId?: string;
}

type Filter = 'all' | 'over2h' | 'photos';
type Read = 'agree' | 'disagree';
type Decision = 'local' | 'refer';

function waitStyle(min: number) {
  if (min > 120) return { background: '#FFDAD6', color: '#BA1A1A' };
  if (min >= 60) return { background: '#FFF1CC', color: '#8A5A00' };
  return { background: '#DAF1DE', color: '#235347' };
}

function Thumb({ has, src, alt, empty }: { has: boolean; src?: string; alt: string; empty: string }) {
  if (!has) {
    return (
      <span
        style={{
          flex: '0 0 54px',
          height: 54,
          borderRadius: 12,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          padding: 4,
          fontSize: 11,
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
        style={{ flex: '0 0 54px', width: 54, height: 54, borderRadius: 12, objectFit: 'cover' }}
      />
    );
  }
  return (
    <svg viewBox="0 0 60 60" width="54" height="54" role="img" aria-label={alt} style={{ flex: '0 0 54px', borderRadius: 12 }}>
      <rect width="60" height="60" rx="12" fill="#051F20" />
      <rect x="8" y="22" width="44" height="16" rx="4" fill="#F4F9F6" />
      <rect x="13" y="26" width="9" height="8" rx="2" fill="#DAF1DE" />
      <rect x="26" y="25" width="22" height="10" rx="2" fill="#FFFFFF" />
      <rect x="33" y="25" width="1.6" height="10" fill="#BA1A1A" />
      <rect x="40" y="25" width="1.6" height="10" fill="#BA1A1A" />
    </svg>
  );
}

export function DoctorSplitLayout({
  lang,
  online,
  onNavigate,
  onToggleOnline,
  initialSelectedCaseId,
}: DoctorSplitLayoutProps) {
  const tInbox = lang === 'hi' ? hiLocale.screens.DoctorInbox : enLocale.screens.DoctorInbox;
  const tReview = lang === 'hi' ? hiLocale.screens.DoctorReview : enLocale.screens.DoctorReview;

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

  const {
    selectedDoctorCaseId,
    setSelectedDoctorCaseId,
    getAdviceDraft,
    setAdviceDraft,
    noPhotoReplyingCases,
    setNoPhotoReplying,
    photoRequestedCases,
    setPhotoRequested,
  } = useScreenDraft();

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
      mitanin: c.mitanin || 'Sunita',
      dueAt: c.dueAt,
      createdAt: c.createdAt,
    }));
  }, [syncedCases]);

  const [filter, setFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const isCaseReplied = useCallback(
    (caseId: string) => {
      const c = syncedConsults.find((con) => con.caseId === caseId);
      if (c && c.status === 'replied') return true;
      const target = syncedCases.find((sc) => sc.id === caseId);
      return target?.state === 'CONSULT_REPLIED' || target?.state === 'OUTCOME_RECORDED';
    },
    [syncedConsults, syncedCases]
  );

  // Active / Selected Case ID handling
  const activeCaseId = useMemo(() => {
    if (selectedDoctorCaseId && caseList.some((c) => c.id === selectedDoctorCaseId)) {
      return selectedDoctorCaseId;
    }
    if (initialSelectedCaseId && caseList.some((c) => c.id === initialSelectedCaseId)) {
      return initialSelectedCaseId;
    }
    // Prefer first waiting case, then first case
    const firstWaiting = caseList.find((c) => !isCaseReplied(c.id));
    return firstWaiting?.id || caseList[0]?.id || null;
  }, [selectedDoctorCaseId, initialSelectedCaseId, caseList, isCaseReplied]);

  useEffect(() => {
    if (activeCaseId && activeCaseId !== selectedDoctorCaseId) {
      setSelectedDoctorCaseId(activeCaseId);
    }
  }, [activeCaseId, selectedDoctorCaseId, setSelectedDoctorCaseId]);

  const selectedCase = useMemo(() => {
    return caseList.find((c) => c.id === activeCaseId) || null;
  }, [caseList, activeCaseId]);

  // Per-case draft synchronization
  const draft = useMemo(() => {
    if (!activeCaseId) return null;
    return getAdviceDraft(activeCaseId);
  }, [activeCaseId, getAdviceDraft]);

  const [advice, setAdviceState] = useState(() => draft?.advice || '');
  const [decision, setDecisionState] = useState<Decision | null>(() => draft?.decision || null);
  const [read, setReadState] = useState<Read | null>(() => draft?.read || null);

  useEffect(() => {
    if (activeCaseId) {
      const currentDraft = getAdviceDraft(activeCaseId);
      setAdviceState(currentDraft?.advice || '');
      setDecisionState(currentDraft?.decision || null);
      setReadState(currentDraft?.read || null);
      setValidationError(null);
      setImageError(false);
      setIsZoomed(false);
      setJustSent(false);
      markConsultReceived(activeCaseId);
    }
  }, [activeCaseId, getAdviceDraft, markConsultReceived]);

  const handleAdviceChange = (val: string) => {
    setAdviceState(val);
    if (activeCaseId) {
      setAdviceDraft(activeCaseId, { advice: val, decision, read });
    }
    if (validationError) setValidationError(null);
  };

  const handleDecisionChange = (dec: Decision) => {
    setDecisionState(dec);
    if (activeCaseId) {
      setAdviceDraft(activeCaseId, { advice, decision: dec, read });
    }
    if (validationError) setValidationError(null);
  };

  const handleReadChange = (r: Read) => {
    setReadState(r);
    if (activeCaseId) {
      setAdviceDraft(activeCaseId, { advice, decision, read: r });
    }
    if (validationError) setValidationError(null);
  };

  const addChip = (chipText: string) => {
    const nextAdvice = advice.trim() ? `${advice.trim()} ${chipText}` : chipText;
    handleAdviceChange(nextAdvice);
  };

  // Zoom Escape & popstate listeners
  useEffect(() => {
    if (!isZoomed) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomed]);

  // Consult and case record
  const consult = selectedCase ? getConsultByCaseId(selectedCase.id) : null;
  const caseRecord = selectedCase ? getCase(selectedCase.id) : null;
  const isReplied = selectedCase ? isCaseReplied(selectedCase.id) || justSent : false;

  const hasPhoto = Boolean(
    selectedCase?.photoData || (typeof selectedCase?.photo === 'string' && selectedCase?.photo)
  );
  const photoUrl =
    selectedCase?.photoData || (typeof selectedCase?.photo === 'string' ? selectedCase?.photo : '');
  const isDemo = Boolean(selectedCase?.photoIsDemo || (photoUrl && photoUrl.includes('demo-')));
  const hasValidPhoto = hasPhoto && !imageError;

  const isNoPhotoReplying = Boolean(activeCaseId && noPhotoReplyingCases[activeCaseId]);
  const isPhotoRequested = Boolean(activeCaseId && photoRequestedCases[activeCaseId]);

  // Doctor read agreement is required only when valid photo is present
  const isDoctorReadRequired = hasValidPhoto;

  // Waiting time calculation
  const waitingTime = useMemo(() => {
    const reqTime = consult?.requestedAt || caseRecord?.createdAt;
    if (!reqTime) return { text: `--`, isLate: false, totalMin: 0 };
    const reqMs = new Date(reqTime).getTime();
    const demoClockNow = Date.now() + (demoClockOffsetMinutes || 0) * 60 * 1000;
    const diffMs = Math.max(0, demoClockNow - reqMs);
    const totalMin = Math.floor(diffMs / 60000);
    const isLate = totalMin >= 120 || totalMin >= 240;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const text = h > 0 ? `${h} ${tReview.hourUnit} ${m} ${tReview.minUnit}` : `${m} ${tReview.minUnit}`;
    return { text, isLate, totalMin };
  }, [consult?.requestedAt, caseRecord?.createdAt, demoClockOffsetMinutes, tReview.minUnit, tReview.hourUnit]);

  // Filtering and Searching
  const filteredList = useMemo(() => {
    let base = [...caseList].sort((a, b) => b.waitingMin - a.waitingMin);

    if (filter === 'over2h') {
      base = base.filter((c) => c.waitingMin > 120);
    } else if (filter === 'photos') {
      base = base.filter((c) => c.photo);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      base = base.filter(
        (c) =>
          c.name.en.toLowerCase().includes(q) ||
          c.name.hi.toLowerCase().includes(q) ||
          c.village.en.toLowerCase().includes(q) ||
          c.village.hi.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.symptoms.en.toLowerCase().includes(q) ||
          c.symptoms.hi.toLowerCase().includes(q)
      );
    }

    return base;
  }, [caseList, filter, searchQuery]);

  const waitingCases = useMemo(
    () => filteredList.filter((c) => !isCaseReplied(c.id)),
    [filteredList, isCaseReplied]
  );
  const repliedCases = useMemo(
    () => filteredList.filter((c) => isCaseReplied(c.id)),
    [filteredList, isCaseReplied]
  );

  // Keyboard navigation up / down for cases list
  const handleListKeyDown = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    if (waitingCases.length === 0 && repliedCases.length === 0) return;
    const allVisible = [...waitingCases, ...repliedCases];
    const currentIndex = allVisible.findIndex((c) => c.id === activeCaseId);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < allVisible.length - 1 ? currentIndex + 1 : 0;
      setSelectedDoctorCaseId(allVisible[nextIndex].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : allVisible.length - 1;
      setSelectedDoctorCaseId(allVisible[prevIndex].id);
    }
  };

  // Ready to send validation
  const readyToSend =
    !isReplied &&
    !isSubmitting &&
    advice.trim().length >= 3 &&
    advice.trim().length <= 500 &&
    decision !== null &&
    (!isDoctorReadRequired || read !== null);

  const handleSend = () => {
    if (isSubmitting || !selectedCase) return;
    if (advice.trim().length < 3) {
      setValidationError(
        lang === 'hi' ? 'सलाह कम से कम 3 अक्षर होनी चाहिए' : 'Advice must be at least 3 characters'
      );
      return;
    }
    if (advice.trim().length > 500) {
      setValidationError(
        lang === 'hi' ? 'सलाह अधिकतम 500 अक्षर हो सकती है' : 'Advice must not exceed 500 characters'
      );
      return;
    }
    if (isDoctorReadRequired && !read) {
      setValidationError(tReview.doctorReadRequired);
      return;
    }
    if (!decision) {
      setValidationError(lang === 'hi' ? 'कृपया निर्णय चुनें' : 'Please select a decision');
      return;
    }

    setIsSubmitting(true);
    setJustSent(true);

    doctorReply(
      selectedCase.id,
      advice.trim(),
      decision === 'refer' ? 'send_to_hospital' : 'treat_locally',
      read || undefined,
      online
    );

    setTimeout(() => {
      setIsSubmitting(false);
    }, 400);
  };

  const handleAskPhoto = () => {
    if (!selectedCase) return;
    setPhotoRequested(selectedCase.id, true);
  };

  const handleReplyWithoutPhoto = () => {
    if (!selectedCase) return;
    setNoPhotoReplying(selectedCase.id, true);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 65px)',
        minHeight: 600,
        background: '#F4F9F6',
        color: '#00201C',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Zoom in Modal */}
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
            padding: 20,
            cursor: 'zoom-out',
          }}
        >
          <button
            type="button"
            onClick={() => setIsZoomed(false)}
            aria-label={tReview.close}
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
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
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          />
        </div>
      )}

      {/* Split view two-column container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '35% 65%',
          flex: 1,
          height: '100%',
          overflow: 'hidden',
          gap: 16,
          padding: '16px 20px 20px',
          boxSizing: 'border-box',
        }}
      >
        {/* ===================== LEFT PANE (35%): CASES WAITING & SEARCH ===================== */}
        <section
          aria-label={tInbox.title}
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            border: '1px solid #E3ECE7',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--ms-shadow-card)',
            overflow: 'hidden',
            height: '100%',
          }}
        >
          {/* Sticky Header inside Left Pane */}
          <div
            style={{
              padding: '16px 18px 12px',
              borderBottom: '1px solid #E3ECE7',
              background: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#00201C' }}>
                  {tInbox.title}
                </h1>
                <span
                  aria-live="polite"
                  style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    background: '#235347',
                    color: '#FFFFFF',
                  }}
                >
                  {waitingCases.length}
                </span>
              </div>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search
                size={16}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#404945',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'hi' ? 'मरीज़ या गाँव खोजें...' : 'Search patient, village...'}
                aria-label={lang === 'hi' ? 'केस खोजें' : 'Search cases'}
                style={{
                  width: '100%',
                  height: 38,
                  padding: '6px 32px 6px 36px',
                  borderRadius: 12,
                  border: '1.5px solid #CCD9D2',
                  background: '#F8FAF9',
                  color: '#00201C',
                  fontSize: 13.5,
                  fontWeight: 500,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={lang === 'hi' ? 'खोज साफ़ करें' : 'Clear search'}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 0,
                    cursor: 'pointer',
                    color: '#404945',
                    fontSize: 14,
                    fontWeight: 800,
                    padding: 4,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div
              role="group"
              aria-label={tInbox.filterLabel}
              style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
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
                      padding: '5px 12px',
                      borderRadius: 999,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 800,
                      border: `1.5px solid ${on ? '#235347' : '#CCD9D2'}`,
                      background: on ? '#235347' : '#FFFFFF',
                      color: on ? '#FFFFFF' : '#235347',
                      transition: 'all 0.15s ease',
                      minHeight: 32,
                    }}
                  >
                    {tInbox.filters[key]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable List of Cases (Pane scrolls independently) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            {waitingCases.length === 0 && repliedCases.length === 0 ? (
              <p
                style={{
                  margin: '32px 0',
                  textAlign: 'center',
                  color: '#404945',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {tInbox.empty}
              </p>
            ) : (
              <ul
                tabIndex={0}
                onKeyDown={handleListKeyDown}
                role="listbox"
                aria-label={tInbox.title}
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  outline: 'none',
                }}
              >
                {waitingCases.map((c) => {
                  const isSelected = selectedCase?.id === c.id;
                  const isLate = c.waitingMin > 120;
                  const patientSummary = getPatientSummary(c.patientId, lang) || c.name[lang];

                  return (
                    <li key={c.id} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onClick={() => setSelectedDoctorCaseId(c.id)}
                        title={`${patientSummary} - ${c.village[lang]}`}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          textAlign: 'left',
                          borderRadius: 14,
                          cursor: 'pointer',
                          border: isSelected ? '2px solid #235347' : '1px solid #E3ECE7',
                          background: isSelected ? '#DAF1DE' : '#FFFFFF',
                          color: '#00201C',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? 'none' : '0 1px 3px rgba(0, 32, 28, 0.03)',
                        }}
                      >
                        <Thumb has={c.photo} src={c.photoData} alt={tInbox.photoAlt} empty={tInbox.noPhoto} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 14.5,
                                fontWeight: 800,
                                color: isSelected ? '#235347' : '#00201C',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {patientSummary}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  ...waitStyle(c.waitingMin),
                                }}
                              >
                                {c.waitingMin >= 60
                                  ? `${Math.floor(c.waitingMin / 60)} ${tInbox.hourUnit} ${
                                      c.waitingMin % 60
                                    } ${tInbox.minuteUnit}`
                                  : `${c.waitingMin} ${tInbox.minuteUnit}`}
                              </span>
                              {isLate && (
                                <span
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: 999,
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    background: '#FFDAD6',
                                    color: '#BA1A1A',
                                  }}
                                >
                                  {lang === 'hi' ? 'देरी' : 'Late'}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            style={{
                              display: 'block',
                              marginTop: 2,
                              fontSize: 12,
                              color: '#404945',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {c.village[lang]}
                          </span>
                          <span
                            title={c.symptoms[lang]}
                            style={{
                              display: 'block',
                              marginTop: 2,
                              fontSize: 12.5,
                              color: '#00201C',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontWeight: 500,
                            }}
                          >
                            {c.symptoms[lang]}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}

                {/* Replied Cases Section */}
                {repliedCases.length > 0 && (
                  <li style={{ marginTop: 12 }}>
                    <h2
                      style={{
                        margin: '8px 4px 6px',
                        fontSize: 13,
                        fontWeight: 800,
                        color: '#404945',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {lang === 'hi' ? 'उत्तर दिए गए' : 'Replied'} ({repliedCases.length})
                    </h2>
                    <ul
                      style={{
                        listStyle: 'none',
                        margin: 0,
                        padding: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      {repliedCases.map((c) => {
                        const isSelected = selectedCase?.id === c.id;
                        const patientSummary = getPatientSummary(c.patientId, lang) || c.name[lang];

                        return (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedDoctorCaseId(c.id)}
                              title={`${patientSummary} - ${c.village[lang]}`}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '8px 12px',
                                textAlign: 'left',
                                borderRadius: 14,
                                cursor: 'pointer',
                                border: isSelected ? '2px solid #235347' : '1px solid #E3ECE7',
                                background: isSelected ? '#DAF1DE' : '#FFFFFF',
                                color: '#00201C',
                                opacity: 0.9,
                              }}
                            >
                              <Thumb has={c.photo} src={c.photoData} alt={tInbox.photoAlt} empty={tInbox.noPhoto} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span
                                  style={{
                                    display: 'block',
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: '#00201C',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {patientSummary}
                                </span>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    marginTop: 4,
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    background: '#DAF1DE',
                                    color: '#235347',
                                  }}
                                >
                                  ✓ {lang === 'hi' ? 'उत्तर दिया' : 'Replied'}
                                </span>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                )}
              </ul>
            )}
          </div>
        </section>

        {/* ===================== RIGHT PANE (65%): REVIEW & DETAIL PANEL ===================== */}
        <section
          aria-label={tReview.caseNo}
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            border: '1px solid #E3ECE7',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--ms-shadow-card)',
            overflow: 'hidden',
            height: '100%',
          }}
        >
          {selectedCase ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px' }}>
              {/* Case Header inside Right Pane */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #E3ECE7',
                  paddingBottom: 16,
                  marginBottom: 16,
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: '#235347',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {tReview.caseLabel} #{selectedCase.id.toUpperCase()}
                  </span>
                  <h2
                    style={{
                      margin: '4px 0 0',
                      fontSize: 22,
                      fontWeight: 800,
                      color: '#00201C',
                      lineHeight: 1.2,
                    }}
                  >
                    {getPatientSummary(selectedCase.patientId, lang) || selectedCase.name[lang]}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#404945', fontWeight: 600 }}>
                    {selectedCase.village[lang]} • {selectedCase.symptoms[lang]}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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
                      {tReview.late}
                    </span>
                  )}
                </div>
              </div>

              {/* Photo Area + Mitanin Reading Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.1fr 0.9fr',
                  gap: 16,
                  alignItems: 'start',
                  marginBottom: 18,
                }}
              >
                {/* Photo or No-Photo Canvas */}
                {!hasPhoto ? (
                  /* NO-PHOTO DASHED EMPTY STATE */
                  <div
                    style={{
                      borderRadius: 18,
                      border: '2px dashed #CCD9D2',
                      background: '#F8FAF9',
                      padding: '20px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: '#FFF1CC',
                        color: '#8A5A00',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Camera size={24} aria-hidden="true" />
                    </div>

                    <p style={{ margin: 0, fontSize: 13.5, color: '#404945', fontWeight: 600, lineHeight: 1.4 }}>
                      {tReview.noPhotoSent}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={handleAskPhoto}
                        style={{
                          width: '100%',
                          minHeight: 44,
                          padding: '8px 16px',
                          borderRadius: 12,
                          border: 0,
                          cursor: 'pointer',
                          fontSize: 13.5,
                          fontWeight: 800,
                          background: isPhotoRequested ? '#2E7D4F' : '#235347',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isPhotoRequested ? (
                          <>
                            <Check size={16} />
                            <span>{lang === 'hi' ? 'फ़ोटो का अनुरोध किया गया ✓' : 'Photo Requested ✓'}</span>
                          </>
                        ) : (
                          <>
                            <Camera size={16} />
                            <span>{lang === 'hi' ? 'मितानिन से फ़ोटो माँगें' : 'Ask Mitanin for photo'}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleReplyWithoutPhoto}
                        style={{
                          width: '100%',
                          minHeight: 44,
                          padding: '8px 16px',
                          borderRadius: 12,
                          border: '1.5px solid #CCD9D2',
                          cursor: 'pointer',
                          fontSize: 13.5,
                          fontWeight: 700,
                          background: isNoPhotoReplying ? '#DAF1DE' : '#FFFFFF',
                          color: '#235347',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <FileText size={16} />
                        <span>{lang === 'hi' ? 'बिना फ़ोटो के जवाब दें' : 'Reply without photo'}</span>
                      </button>
                    </div>
                  </div>
                ) : imageError ? (
                  /* Photo could not be opened */
                  <div
                    style={{
                      borderRadius: 18,
                      border: '1.5px dashed #BA1A1A',
                      background: '#FFDAD6',
                      padding: '24px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: 12,
                      color: '#BA1A1A',
                    }}
                  >
                    <AlertCircle size={32} />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{tReview.photoCouldNotOpen}</p>
                    <button
                      type="button"
                      onClick={() => setImageError(false)}
                      style={{
                        padding: '6px 18px',
                        borderRadius: 999,
                        border: '1px solid #BA1A1A',
                        background: '#FFFFFF',
                        color: '#BA1A1A',
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: 'pointer',
                        minHeight: 36,
                      }}
                    >
                      {tReview.retry}
                    </button>
                  </div>
                ) : (
                  /* Large Test Photo */
                  <div
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      aspectRatio: '4 / 3',
                      borderRadius: 18,
                      background: '#051F20',
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
                      }}
                    />
                    {isDemo && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          padding: '3px 8px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 800,
                          background: 'rgba(5, 31, 32, 0.85)',
                          color: '#FFFFFF',
                          zIndex: 2,
                        }}
                      >
                        {tReview.demoPhotoTag}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsZoomed(true)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        bottom: 10,
                        padding: '6px 12px',
                        borderRadius: 999,
                        border: 0,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                        background: 'rgba(5, 31, 32, 0.85)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        zIndex: 2,
                      }}
                    >
                      <ZoomIn size={14} />
                      <span>{tReview.zoomIn}</span>
                    </button>
                  </div>
                )}

                {/* Mitanin Reading & Doctor Agree / Disagree Card */}
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 18,
                    background: '#F8FAF9',
                    border: '1px solid #E3ECE7',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        color: '#404945',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {lang === 'hi' ? 'मितानिन की जाँच' : 'Mitanin Reading'}
                    </span>
                    <div style={{ marginTop: 4 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: 999,
                          fontSize: 13,
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
                              ? '#235347'
                              : '#8A5A00',
                        }}
                      >
                        {tReview.mitaninReadPrefix}{' '}
                        {tReview.results[selectedCase.testResult || 'positive'] ||
                          selectedCase.testResult ||
                          'Positive'}
                      </span>
                    </div>
                  </div>

                  <div style={{ paddingTop: 8, borderTop: '1px solid #E3ECE7' }}>
                    <span
                      id="doc-read-split-label"
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 800,
                        color: '#00201C',
                        marginBottom: 6,
                      }}
                    >
                      {tReview.myRead}
                    </span>
                    <div
                      role="radiogroup"
                      aria-labelledby="doc-read-split-label"
                      style={{
                        display: 'flex',
                        padding: 3,
                        borderRadius: 999,
                        background: '#E7F0EA',
                        gap: 2,
                      }}
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
                              if (!disabled) handleReadChange(key);
                            }}
                            style={{
                              flex: 1,
                              border: 0,
                              cursor: disabled ? 'not-allowed' : 'pointer',
                              opacity: disabled ? 0.45 : 1,
                              padding: '8px 12px',
                              borderRadius: 999,
                              fontSize: 13,
                              fontWeight: 800,
                              background: on
                                ? key === 'agree'
                                  ? '#2E7D4F'
                                  : '#BA1A1A'
                                : 'transparent',
                              color: on ? '#FFFFFF' : '#235347',
                              transition: 'all 0.15s ease',
                              minHeight: 36,
                            }}
                          >
                            {tReview.reads[key]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: 11.5, color: '#404945', lineHeight: 1.35 }}>
                    {tReview.recorded}{' '}
                    {readingAgreement?.total > 0
                      ? `(${readingAgreement.agreed}/${readingAgreement.total})`
                      : ''}
                  </p>
                </div>
              </div>

              {/* Reading not verified note when no photo */}
              {(!hasPhoto || isNoPhotoReplying) && (
                <div
                  role="note"
                  style={{
                    background: '#FFF1CC',
                    color: '#8A5A00',
                    border: '1px solid #E3ECE7',
                    borderRadius: 14,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 800, display: 'block' }}>
                      {lang === 'hi' ? 'जाँच सत्यापित नहीं: कोई फ़ोटो नहीं' : 'Reading not verified: no photo'}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, display: 'block', marginTop: 2 }}>
                      {lang === 'hi'
                        ? 'बिना फ़ोटो के निर्णय केवल दर्ज लक्षणों और फ्रंटलाइन टिप्पणियों पर निर्भर है।'
                        : 'Clinical decision relies strictly on reported symptoms, vitals, and frontline observations.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Symptoms Section */}
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800, color: '#00201C' }}>
                  {tReview.symptomsTitle}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      background: '#F8FAF9',
                      border: '1px solid #E3ECE7',
                      color: '#00201C',
                    }}
                  >
                    <CheckCircle2 size={15} color="#2E7D4F" />
                    <span>{selectedCase.symptoms[lang]}</span>
                  </span>
                </div>
              </div>

              {/* Replied View vs Review Form */}
              {isReplied ? (
                /* READ-ONLY REPLIED CARD */
                <div
                  style={{
                    padding: '18px 20px',
                    borderRadius: 18,
                    background: '#DAF1DE',
                    border: '1px solid #C0EACC',
                    color: '#0B2B26',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 800 }}>
                      {consult?.doctorName || 'Dr. Rao'} (
                      {lang === 'hi' ? 'जवाब भेजा गया' : 'Reply sent'})
                    </span>
                    <span style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>
                      {consult?.repliedAt
                        ? new Date(consult.repliedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : lang === 'hi'
                        ? 'अभी-अभी'
                        : 'Just now'}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14.5,
                      lineHeight: 1.45,
                      fontWeight: 600,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {consult?.advice || advice}
                  </p>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 800,
                        background: '#235347',
                        color: '#FFFFFF',
                      }}
                    >
                      {consult?.decision === 'send_to_hospital' || decision === 'refer'
                        ? lang === 'hi'
                          ? 'अस्पताल भेजें'
                          : 'Send to hospital'
                        : lang === 'hi'
                        ? 'स्थानीय स्तर पर इलाज करें'
                        : 'Treat locally'}
                    </span>
                  </div>
                </div>
              ) : (
                /* ACTIVE REVIEW FORM */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Quick-Reply Chips */}
                  <div>
                    <label
                      htmlFor="split-review-advice-box"
                      style={{
                        display: 'block',
                        marginBottom: 6,
                        fontSize: 15,
                        fontWeight: 800,
                        color: '#00201C',
                      }}
                    >
                      {tReview.advice}
                    </label>
                    <ul
                      aria-label={tReview.chipsLabel}
                      style={{
                        listStyle: 'none',
                        margin: '0 0 8px',
                        padding: 0,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 6,
                      }}
                    >
                      {tReview.chips.map((chip) => (
                        <li key={chip}>
                          <button
                            type="button"
                            onClick={() => addChip(chip)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 999,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 700,
                              textAlign: 'left',
                              border: '1.5px solid #CCD9D2',
                              background: '#F8FAF9',
                              color: '#235347',
                              transition: 'all 0.15s ease',
                              minHeight: 32,
                            }}
                          >
                            + {chip}
                          </button>
                        </li>
                      ))}
                    </ul>

                    {/* Advice Box with Character Counter (3 to 500 chars) */}
                    <div style={{ position: 'relative' }}>
                      <textarea
                        id="split-review-advice-box"
                        value={advice}
                        maxLength={500}
                        onChange={(e) => handleAdviceChange(e.target.value)}
                        placeholder={tReview.advicePlaceholder}
                        rows={3}
                        style={{
                          width: '100%',
                          resize: 'none',
                          padding: '10px 14px',
                          paddingBottom: 24,
                          borderRadius: 14,
                          border: '1.5px solid #CCD9D2',
                          font: 'inherit',
                          fontSize: 14,
                          color: '#00201C',
                          background: '#FFFFFF',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span
                        aria-live="polite"
                        style={{
                          position: 'absolute',
                          right: 12,
                          bottom: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          color: advice.length > 480 ? '#BA1A1A' : '#707975',
                        }}
                      >
                        {advice.length} / 500
                      </span>
                    </div>
                  </div>

                  {/* Decision Selector & Send Reply */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 16,
                      alignItems: 'end',
                      paddingTop: 12,
                      borderTop: '1px solid #E3ECE7',
                    }}
                  >
                    <div>
                      <h3
                        id="split-decision-label"
                        style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#00201C' }}
                      >
                        {tReview.decisionTitle}
                      </h3>
                      <div role="radiogroup" aria-labelledby="split-decision-label" style={{ display: 'flex', gap: 8 }}>
                        {(['local', 'refer'] as const).map((key) => {
                          const on = decision === key;
                          const isRefer = key === 'refer';
                          return (
                            <button
                              key={key}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              onClick={() => handleDecisionChange(key)}
                              style={{
                                padding: '8px 16px',
                                borderRadius: 12,
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 800,
                                minHeight: 44,
                                border: `2px solid ${
                                  on ? (isRefer ? '#BA1A1A' : '#235347') : '#CCD9D2'
                                }`,
                                background: on ? (isRefer ? '#BA1A1A' : '#235347') : '#FFFFFF',
                                color: on ? '#FFFFFF' : '#00201C',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {tReview.decisions[key]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!readyToSend}
                      onClick={handleSend}
                      style={{
                        height: 48,
                        minHeight: 44,
                        padding: '0 24px',
                        border: 0,
                        borderRadius: 14,
                        cursor: readyToSend ? 'pointer' : 'not-allowed',
                        fontSize: 15,
                        fontWeight: 800,
                        background: justSent ? '#2E7D4F' : readyToSend ? '#235347' : '#CCD9D2',
                        color: justSent || readyToSend ? '#FFFFFF' : '#404945',
                        boxShadow: readyToSend ? '0 3px 12px rgba(35, 83, 71, 0.25)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {justSent ? tReview.sent : tReview.send}
                    </button>
                  </div>

                  {validationError && (
                    <div
                      role="alert"
                      style={{
                        color: '#BA1A1A',
                        fontSize: 13,
                        fontWeight: 700,
                        background: '#FFDAD6',
                        padding: '6px 12px',
                        borderRadius: 8,
                      }}
                    >
                      {validationError}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* EMPTY RIGHT PANE STATE */
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
                color: '#404945',
              }}
            >
              <FileText size={40} style={{ opacity: 0.5, marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#00201C' }}>
                {lang === 'hi' ? 'एक केस चुनें' : 'Select a case'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#404945' }}>
                {lang === 'hi'
                  ? 'समीक्षा विवरण देखने के लिए बाईं सूची से केस चुनें'
                  : 'Choose a case from the waiting list to view and review'}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect, useRef, useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Search, ZoomIn, Camera, AlertCircle, Check, FileText, CheckCircle2 } from 'lucide-react';
import type { Lang } from './BottomNav';
import enLocale from './i18n/en.json';
import hiLocale from './i18n/hi.json';
import { useCaseStore } from './store/CaseStore';
import { useScreenDraft } from './ScreenDraftContext';
import { priority as computePriority } from './domain';

export interface DoctorCasesTableProps {
  lang: Lang;
  online: boolean;
  onNavigate: (route: string) => void;
  onToggleOnline: () => void;
}

type Read = 'agree' | 'disagree';
type Decision = 'local' | 'refer';
type StateFilter = 'all' | 'waiting' | 'replied' | 'referral' | 'completed';

function waitStyle(min: number) {
  if (min > 120) return { background: '#FFDAD6', color: '#BA1A1A' };
  if (min >= 60) return { background: '#FFF1CC', color: '#8A5A00' };
  return { background: '#DAF1DE', color: '#235347' };
}

export function DoctorCasesTable({
  lang,
  online,
  onNavigate,
  onToggleOnline,
}: DoctorCasesTableProps) {
  const tInbox = lang === 'hi' ? hiLocale.screens.DoctorInbox : enLocale.screens.DoctorInbox;
  const tReview = lang === 'hi' ? hiLocale.screens.DoctorReview : enLocale.screens.DoctorReview;

  const {
    syncedCases,
    syncedConsults,
    syncedReferrals,
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

  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
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

  const allCases = useMemo(() => {
    return syncedCases.map((c) => {
      const isRep = isCaseReplied(c.id);
      const isRef =
        c.state === 'REFERRAL_CREATED' ||
        c.state === 'REACHED_FACILITY' ||
        syncedReferrals.some((r) => r.caseId === c.id);
      const isComp = c.state === 'OUTCOME_RECORDED';

      const prioResult = computePriority(c, Date.now() + (demoClockOffsetMinutes || 0) * 60 * 1000);
      const prioLevel: 'high' | 'medium' | 'low' =
        prioResult.rank === 1 ? 'high' : prioResult.rank <= 3 ? 'medium' : 'low';

      return {
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
        priorityLevel: prioLevel,
        isReplied: isRep,
        isReferral: isRef,
        isCompleted: isComp,
        createdAt: c.createdAt,
      };
    });
  }, [syncedCases, isCaseReplied, syncedReferrals]);

  // Active / Selected Case ID handling
  const activeCaseId = useMemo(() => {
    if (selectedDoctorCaseId && allCases.some((c) => c.id === selectedDoctorCaseId)) {
      return selectedDoctorCaseId;
    }
    return allCases[0]?.id || null;
  }, [selectedDoctorCaseId, allCases]);

  useEffect(() => {
    if (activeCaseId && activeCaseId !== selectedDoctorCaseId) {
      setSelectedDoctorCaseId(activeCaseId);
    }
  }, [activeCaseId, selectedDoctorCaseId, setSelectedDoctorCaseId]);

  const selectedCase = useMemo(() => {
    return allCases.find((c) => c.id === activeCaseId) || null;
  }, [allCases, activeCaseId]);

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

  // Zoom Escape listeners
  useEffect(() => {
    if (!isZoomed) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomed]);

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
  const isDoctorReadRequired = hasValidPhoto;

  // Waiting time calculation
  const waitingTime = useMemo(() => {
    const reqTime = consult?.requestedAt || caseRecord?.createdAt;
    if (!reqTime) return { text: `--`, isLate: false, totalMin: 0 };
    const reqMs = new Date(reqTime).getTime();
    const demoClockNow = Date.now() + (demoClockOffsetMinutes || 0) * 60 * 1000;
    const diffMs = Math.max(0, demoClockNow - reqMs);
    const totalMin = Math.floor(diffMs / 60000);
    const isLate = totalMin >= 120;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const text = h > 0 ? `${h} ${tReview.hourUnit} ${m} ${tReview.minUnit}` : `${m} ${tReview.minUnit}`;
    return { text, isLate, totalMin };
  }, [consult?.requestedAt, caseRecord?.createdAt, demoClockOffsetMinutes, tReview.minUnit, tReview.hourUnit]);

  // Filtering cases
  const filteredCases = useMemo(() => {
    let list = [...allCases];

    if (stateFilter === 'waiting') {
      list = list.filter((c) => !c.isReplied && !c.isCompleted);
    } else if (stateFilter === 'replied') {
      list = list.filter((c) => c.isReplied);
    } else if (stateFilter === 'referral') {
      list = list.filter((c) => c.isReferral);
    } else if (stateFilter === 'completed') {
      list = list.filter((c) => c.isCompleted);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.en.toLowerCase().includes(q) ||
          c.name.hi.toLowerCase().includes(q) ||
          c.village.en.toLowerCase().includes(q) ||
          c.village.hi.toLowerCase().includes(q) ||
          c.mitanin.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.state.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allCases, stateFilter, searchQuery]);

  // Table keyboard navigation
  const handleTableKeyDown = (e: ReactKeyboardEvent<HTMLTableSectionElement>) => {
    if (filteredCases.length === 0) return;
    const currentIndex = filteredCases.findIndex((c) => c.id === activeCaseId);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < filteredCases.length - 1 ? currentIndex + 1 : 0;
      setSelectedDoctorCaseId(filteredCases[nextIndex].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredCases.length - 1;
      setSelectedDoctorCaseId(filteredCases[prevIndex].id);
    }
  };

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

  const getStateLabel = (st: string) => {
    switch (st) {
      case 'CONSULT_REQUESTED':
        return { label: lang === 'hi' ? 'परामर्श प्रतीक्षारत' : 'Consult waiting', bg: '#FFF1CC', fg: '#8A5A00' };
      case 'CONSULT_REPLIED':
        return { label: lang === 'hi' ? 'उत्तर दिया' : 'Consult replied', bg: '#DAF1DE', fg: '#235347' };
      case 'REFERRAL_CREATED':
      case 'REMINDER_SENT':
      case 'REACHED_FACILITY':
        return { label: lang === 'hi' ? 'रेफरल' : 'Referral', bg: '#FFDAD6', fg: '#BA1A1A' };
      case 'OUTCOME_RECORDED':
        return { label: lang === 'hi' ? 'पूर्ण' : 'Completed', bg: '#E7F0EA', fg: '#235347' };
      default:
        return { label: lang === 'hi' ? 'जाँच की गई' : 'Screened', bg: '#F1F5F3', fg: '#404945' };
    }
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
      {/* Zoom Modal */}
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

      {/* Two Column Layout: Table (55%) & Detail Panel (45%) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '55% 45%',
          flex: 1,
          height: '100%',
          overflow: 'hidden',
          gap: 16,
          padding: '16px 20px 20px',
          boxSizing: 'border-box',
        }}
      >
        {/* ===================== TABLE CONTAINER ===================== */}
        <section
          aria-label={lang === 'hi' ? 'सभी केस' : 'All cases'}
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
          {/* Table Controls (Search and Filters) */}
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
                  {lang === 'hi' ? 'सभी केस' : 'Cases Directory'}
                </h1>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    background: '#235347',
                    color: '#FFFFFF',
                  }}
                >
                  {filteredCases.length}
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
                placeholder={lang === 'hi' ? 'मरीज़, गाँव या मितानिन खोजें...' : 'Search patient, village, Mitanin...'}
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

            {/* State Filter Chips */}
            <div
              role="group"
              aria-label={lang === 'hi' ? 'केस स्थिति फ़िल्टर' : 'Filter by case state'}
              style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
            >
              {[
                { id: 'all', label: lang === 'hi' ? 'सभी' : 'All' },
                { id: 'waiting', label: lang === 'hi' ? 'परामर्श प्रतीक्षारत' : 'Waiting' },
                { id: 'replied', label: lang === 'hi' ? 'उत्तर दिए गए' : 'Replied' },
                { id: 'referral', label: lang === 'hi' ? 'रेफरल' : 'Referral' },
                { id: 'completed', label: lang === 'hi' ? 'पूर्ण' : 'Completed' },
              ].map((f) => {
                const on = stateFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setStateFilter(f.id as StateFilter)}
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
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Container - horizontally scrollable inside between 768-1023px */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
            {filteredCases.length === 0 ? (
              <p
                style={{
                  margin: '40px 0',
                  textAlign: 'center',
                  color: '#404945',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {lang === 'hi' ? 'अभी कोई केस नहीं' : 'No cases yet'}
              </p>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                  textAlign: 'left',
                  minWidth: 540,
                }}
              >
                <thead
                  style={{
                    position: 'sticky',
                    top: 0,
                    background: '#F8FAF9',
                    zIndex: 2,
                    borderBottom: '1.5px solid #CCD9D2',
                  }}
                >
                  <tr>
                    <th style={{ padding: '10px 12px', fontWeight: 800, color: '#404945' }}>
                      {lang === 'hi' ? 'मरीज़' : 'Patient'}
                    </th>
                    <th style={{ padding: '10px 10px', fontWeight: 800, color: '#404945' }}>
                      {lang === 'hi' ? 'गाँव' : 'Village'}
                    </th>
                    <th style={{ padding: '10px 10px', fontWeight: 800, color: '#404945' }}>
                      {lang === 'hi' ? 'मितानिन' : 'Mitanin'}
                    </th>
                    <th style={{ padding: '10px 10px', fontWeight: 800, color: '#404945' }}>
                      {lang === 'hi' ? 'स्थिति' : 'State'}
                    </th>
                    <th style={{ padding: '10px 10px', fontWeight: 800, color: '#404945' }}>
                      {lang === 'hi' ? 'प्रतीक्षा समय' : 'Waiting'}
                    </th>
                    <th style={{ padding: '10px 12px', fontWeight: 800, color: '#404945' }}>
                      {lang === 'hi' ? 'प्राथमिकता' : 'Priority'}
                    </th>
                  </tr>
                </thead>
                <tbody
                  tabIndex={0}
                  onKeyDown={handleTableKeyDown}
                  style={{ outline: 'none' }}
                >
                  {filteredCases.map((c) => {
                    const isSelected = selectedCase?.id === c.id;
                    const st = getStateLabel(c.state);
                    const patientSummary = getPatientSummary(c.patientId, lang) || c.name[lang];

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedDoctorCaseId(c.id)}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? '#DAF1DE' : 'transparent',
                          borderBottom: '1px solid #E3ECE7',
                          transition: 'background 0.15s ease',
                          outline: isSelected ? '2px solid #235347' : 'none',
                        }}
                      >
                        <td
                          title={`${patientSummary} (#${c.id})`}
                          style={{
                            padding: '10px 12px',
                            fontWeight: 800,
                            color: isSelected ? '#235347' : '#00201C',
                            maxWidth: 160,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {patientSummary}
                        </td>
                        <td
                          title={c.village[lang]}
                          style={{
                            padding: '10px 10px',
                            color: '#404945',
                            fontWeight: 600,
                            maxWidth: 90,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {c.village[lang]}
                        </td>
                        <td
                          title={c.mitanin}
                          style={{
                            padding: '10px 10px',
                            color: '#404945',
                            maxWidth: 80,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {c.mitanin}
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 800,
                              background: st.bg,
                              color: st.fg,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                              ...waitStyle(c.waitingMin),
                            }}
                          >
                            {c.waitingMin >= 60
                              ? `${Math.floor(c.waitingMin / 60)}h ${c.waitingMin % 60}m`
                              : `${c.waitingMin}m`}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 800,
                              background:
                                c.priorityLevel === 'high'
                                  ? '#FFDAD6'
                                  : c.priorityLevel === 'medium'
                                  ? '#FFF1CC'
                                  : '#DAF1DE',
                              color:
                                c.priorityLevel === 'high'
                                  ? '#BA1A1A'
                                  : c.priorityLevel === 'medium'
                                  ? '#8A5A00'
                                  : '#235347',
                            }}
                          >
                            {c.priorityLevel === 'high'
                              ? lang === 'hi'
                                ? 'उच्च'
                                : 'High'
                              : c.priorityLevel === 'medium'
                              ? lang === 'hi'
                                ? 'मध्यम'
                                : 'Medium'
                              : lang === 'hi'
                              ? 'सामान्य'
                              : 'Low'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ===================== SAME DETAIL PANEL ON THE RIGHT ===================== */}
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
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 32px' }}>
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #E3ECE7',
                  paddingBottom: 14,
                  marginBottom: 16,
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 12,
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
                      fontSize: 20,
                      fontWeight: 800,
                      color: '#00201C',
                      lineHeight: 1.2,
                    }}
                  >
                    {getPatientSummary(selectedCase.patientId, lang) || selectedCase.name[lang]}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#404945', fontWeight: 600 }}>
                    {selectedCase.village[lang]} • {selectedCase.symptoms[lang]}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 800,
                      ...waitStyle(waitingTime.totalMin),
                    }}
                  >
                    {waitingTime.text}
                  </span>
                </div>
              </div>

              {/* Photo or No-photo */}
              <div style={{ marginBottom: 16 }}>
                {!hasPhoto ? (
                  <div
                    style={{
                      borderRadius: 16,
                      border: '2px dashed #CCD9D2',
                      background: '#F8FAF9',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: '#FFF1CC',
                        color: '#8A5A00',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Camera size={20} aria-hidden="true" />
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#404945', fontWeight: 600 }}>
                      {tReview.noPhotoSent}
                    </p>
                    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                      <button
                        type="button"
                        onClick={() => setPhotoRequested(selectedCase.id, true)}
                        style={{
                          flex: 1,
                          minHeight: 40,
                          padding: '6px 12px',
                          borderRadius: 10,
                          border: 0,
                          cursor: 'pointer',
                          fontSize: 12.5,
                          fontWeight: 800,
                          background: isPhotoRequested ? '#2E7D4F' : '#235347',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        {isPhotoRequested ? '✓ Requested' : 'Ask Mitanin for photo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoPhotoReplying(selectedCase.id, true)}
                        style={{
                          flex: 1,
                          minHeight: 40,
                          padding: '6px 12px',
                          borderRadius: 10,
                          border: '1.5px solid #CCD9D2',
                          cursor: 'pointer',
                          fontSize: 12.5,
                          fontWeight: 700,
                          background: isNoPhotoReplying ? '#DAF1DE' : '#FFFFFF',
                          color: '#235347',
                        }}
                      >
                        Reply without photo
                      </button>
                    </div>
                  </div>
                ) : imageError ? (
                  <div
                    style={{
                      borderRadius: 16,
                      border: '1.5px dashed #BA1A1A',
                      background: '#FFDAD6',
                      padding: '16px',
                      textAlign: 'center',
                      color: '#BA1A1A',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{tReview.photoCouldNotOpen}</p>
                    <button
                      type="button"
                      onClick={() => setImageError(false)}
                      style={{
                        marginTop: 8,
                        padding: '4px 14px',
                        borderRadius: 999,
                        border: '1px solid #BA1A1A',
                        background: '#FFFFFF',
                        color: '#BA1A1A',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
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
                      aspectRatio: '16 / 9',
                      borderRadius: 16,
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
                    <button
                      type="button"
                      onClick={() => setIsZoomed(true)}
                      style={{
                        position: 'absolute',
                        right: 8,
                        bottom: 8,
                        padding: '4px 10px',
                        borderRadius: 999,
                        border: 0,
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 700,
                        background: 'rgba(5, 31, 32, 0.85)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <ZoomIn size={12} />
                      <span>{tReview.zoomIn}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mitanin read + Doctor Agree/Disagree */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  background: '#F8FAF9',
                  border: '1px solid #E3ECE7',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#404945', textTransform: 'uppercase' }}>
                    {lang === 'hi' ? 'मितानिन जाँच' : 'Mitanin read'}:
                  </span>
                  <div style={{ marginTop: 2 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: 12,
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
                      {tReview.results[selectedCase.testResult || 'positive'] || selectedCase.testResult || 'Positive'}
                    </span>
                  </div>
                </div>

                <div role="radiogroup" aria-label="Doctor Read" style={{ display: 'flex', gap: 6 }}>
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
                          border: 0,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.45 : 1,
                          padding: '6px 12px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 800,
                          background: on ? (key === 'agree' ? '#2E7D4F' : '#BA1A1A') : '#E7F0EA',
                          color: on ? '#FFFFFF' : '#235347',
                          minHeight: 32,
                        }}
                      >
                        {tReview.reads[key]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Replied View vs Review Form */}
              {isReplied ? (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 16,
                    background: '#DAF1DE',
                    border: '1px solid #C0EACC',
                    color: '#0B2B26',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>
                      {consult?.doctorName || 'Dr. Rao'} ({lang === 'hi' ? 'जवाब भेजा गया' : 'Replied'})
                    </span>
                    <span style={{ fontSize: 11.5, opacity: 0.85 }}>
                      {consult?.repliedAt
                        ? new Date(consult.repliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Just now'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>
                    {consult?.advice || advice}
                  </p>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 10,
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: 11.5,
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
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Chips and Advice */}
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                      {tReview.chips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => addChip(chip)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 999,
                            cursor: 'pointer',
                            fontSize: 11.5,
                            fontWeight: 700,
                            border: '1.5px solid #CCD9D2',
                            background: '#F8FAF9',
                            color: '#235347',
                            minHeight: 28,
                          }}
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>

                    <div style={{ position: 'relative' }}>
                      <textarea
                        value={advice}
                        maxLength={500}
                        onChange={(e) => handleAdviceChange(e.target.value)}
                        placeholder={tReview.advicePlaceholder}
                        rows={3}
                        style={{
                          width: '100%',
                          resize: 'none',
                          padding: '8px 12px',
                          paddingBottom: 22,
                          borderRadius: 12,
                          border: '1.5px solid #CCD9D2',
                          font: 'inherit',
                          fontSize: 13.5,
                          color: '#00201C',
                          background: '#FFFFFF',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          right: 10,
                          bottom: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          color: advice.length > 480 ? '#BA1A1A' : '#707975',
                        }}
                      >
                        {advice.length} / 500
                      </span>
                    </div>
                  </div>

                  {/* Decision and Send */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 12,
                      alignItems: 'end',
                      paddingTop: 8,
                      borderTop: '1px solid #E3ECE7',
                    }}
                  >
                    <div role="radiogroup" aria-label="Decision" style={{ display: 'flex', gap: 6 }}>
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
                              padding: '6px 12px',
                              borderRadius: 10,
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 800,
                              minHeight: 40,
                              border: `2px solid ${on ? (isRefer ? '#BA1A1A' : '#235347') : '#CCD9D2'}`,
                              background: on ? (isRefer ? '#BA1A1A' : '#235347') : '#FFFFFF',
                              color: on ? '#FFFFFF' : '#00201C',
                            }}
                          >
                            {tReview.decisions[key]}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={!readyToSend}
                      onClick={handleSend}
                      style={{
                        height: 44,
                        minHeight: 44,
                        padding: '0 20px',
                        border: 0,
                        borderRadius: 12,
                        cursor: readyToSend ? 'pointer' : 'not-allowed',
                        fontSize: 14,
                        fontWeight: 800,
                        background: justSent ? '#2E7D4F' : readyToSend ? '#235347' : '#CCD9D2',
                        color: justSent || readyToSend ? '#FFFFFF' : '#404945',
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
                        fontSize: 12.5,
                        fontWeight: 700,
                        background: '#FFDAD6',
                        padding: '4px 10px',
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
              <FileText size={36} style={{ opacity: 0.5, marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#00201C' }}>
                {lang === 'hi' ? 'एक केस चुनें' : 'Select a case'}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

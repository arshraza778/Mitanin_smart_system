import { useState, useMemo, useEffect, useRef, useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Search, PhoneCall, Bell, CheckCircle2, Clock, ArrowRight, User } from 'lucide-react';
import type { Lang } from './BottomNav';
import enLocale from './i18n/en.json';
import hiLocale from './i18n/hi.json';
import { dataService } from './services';
import { useCaseStore } from './store/CaseStore';
import { useScreenDraft } from './ScreenDraftContext';
import { priority as computePriority } from './domain';

export interface SupervisorCasesTableProps {
  lang: Lang;
  online: boolean;
  onNavigate: (route: string) => void;
  onToggleOnline: () => void;
}

const DIRECTORY = dataService.getDirectory();
const VILLAGES = DIRECTORY.villages.map((v) => v.en);
const MITANINS = DIRECTORY.mitanins.map((m) => m.en);
const VILLAGE_HI: Record<string, string> = Object.fromEntries(DIRECTORY.villages.map((v) => [v.en, v.hi]));
const MITANIN_HI: Record<string, string> = Object.fromEntries(DIRECTORY.mitanins.map((m) => [m.en, m.hi]));

const STEP_LABELS = {
  en: [
    'Screened',
    'Consult requested',
    'Doctor replied',
    'Referral created',
    'Reminder sent',
    'Reached facility',
    'Outcome recorded',
  ],
  hi: [
    'जाँच की गई',
    'परामर्श अनुरोध',
    'डॉक्टर का जवाब',
    'रेफ़रल बनाया गया',
    'रिमाइंडर भेजा गया',
    'अस्पताल पहुँचे',
    'परिणाम दर्ज',
  ],
};

function waitStyle(min: number) {
  if (min > 120) return { background: '#FFDAD6', color: '#BA1A1A' };
  if (min >= 60) return { background: '#FFF1CC', color: '#8A5A00' };
  return { background: '#DAF1DE', color: '#235347' };
}

export function SupervisorCasesTable({
  lang,
  online,
  onNavigate,
  onToggleOnline,
}: SupervisorCasesTableProps) {
  const t = lang === 'hi' ? hiLocale.screens.SupervisorDashboard : enLocale.screens.SupervisorDashboard;
  const tTimeline = lang === 'hi' ? hiLocale.screens.CaseTimeline : enLocale.screens.CaseTimeline;

  const {
    syncedCases,
    syncedConsults,
    syncedReferrals,
    getConsultByCaseId,
    getCase,
    getPatientSummary,
    demoClockOffsetMinutes,
  } = useCaseStore();

  const { selectedSupervisorCaseId, setSelectedSupervisorCaseId } = useScreenDraft();

  const [village, setVillage] = useState('all');
  const [mitanin, setMitanin] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  };

  const allCases = useMemo(() => {
    return syncedCases.map((c) => {
      const prioResult = computePriority(c, Date.now() + (demoClockOffsetMinutes || 0) * 60 * 1000);
      const prioLevel: 'high' | 'medium' | 'low' =
        prioResult.rank === 1 ? 'high' : prioResult.rank <= 3 ? 'medium' : 'low';

      const vName =
        typeof c.village === 'object' && c.village !== null
          ? (c.village as { en: string; hi: string }).en
          : typeof c.village === 'string' && c.village
          ? c.village
          : 'Amora';

      return {
        id: c.id,
        patientId: c.patientId,
        name: c.name,
        village: vName,
        mitanin: c.mitanin || 'Sunita',
        symptoms: typeof c.symptoms === 'string' ? { en: c.symptoms, hi: c.symptoms } : c.symptoms,
        symptomFlags: c.symptomFlags || [],
        testResult: c.testResult,
        waitingMin: c.waitingMin ?? 0,
        state: c.state,
        priorityLevel: prioLevel,
        dueAt: c.dueAt,
        createdAt: c.createdAt,
      };
    });
  }, [syncedCases, demoClockOffsetMinutes]);

  // Active / Selected Case ID handling
  const activeCaseId = useMemo(() => {
    if (selectedSupervisorCaseId && allCases.some((c) => c.id === selectedSupervisorCaseId)) {
      return selectedSupervisorCaseId;
    }
    return allCases[0]?.id || null;
  }, [selectedSupervisorCaseId, allCases]);

  useEffect(() => {
    if (activeCaseId && activeCaseId !== selectedSupervisorCaseId) {
      setSelectedSupervisorCaseId(activeCaseId);
    }
  }, [activeCaseId, selectedSupervisorCaseId, setSelectedSupervisorCaseId]);

  const selectedCase = useMemo(() => {
    return allCases.find((c) => c.id === activeCaseId) || null;
  }, [allCases, activeCaseId]);

  // Filtering cases
  const filteredCases = useMemo(() => {
    let list = [...allCases];

    if (village !== 'all') {
      list = list.filter((c) => c.village.toLowerCase() === village.toLowerCase());
    }
    if (mitanin !== 'all') {
      list = list.filter((c) => c.mitanin.toLowerCase() === mitanin.toLowerCase());
    }

    if (stateFilter === 'consult') {
      list = list.filter((c) => c.state === 'CONSULT_REQUESTED' || c.state === 'CONSULT_REPLIED');
    } else if (stateFilter === 'referral') {
      list = list.filter(
        (c) =>
          c.state === 'REFERRAL_CREATED' ||
          c.state === 'REMINDER_SENT' ||
          c.state === 'REACHED_FACILITY'
      );
    } else if (stateFilter === 'completed') {
      list = list.filter((c) => c.state === 'OUTCOME_RECORDED');
    } else if (stateFilter === 'screened') {
      list = list.filter((c) => c.state === 'SCREENED');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.en.toLowerCase().includes(q) ||
          c.name.hi.toLowerCase().includes(q) ||
          c.village.toLowerCase().includes(q) ||
          c.mitanin.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.state.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allCases, village, mitanin, stateFilter, searchQuery]);

  // Keyboard navigation on table
  const handleTableKeyDown = (e: ReactKeyboardEvent<HTMLTableSectionElement>) => {
    if (filteredCases.length === 0) return;
    const currentIndex = filteredCases.findIndex((c) => c.id === activeCaseId);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < filteredCases.length - 1 ? currentIndex + 1 : 0;
      setSelectedSupervisorCaseId(filteredCases[nextIndex].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredCases.length - 1;
      setSelectedSupervisorCaseId(filteredCases[prevIndex].id);
    }
  };

  // State mapping for step in timeline
  const stepMap: Record<string, number> = {
    SCREENED: 1,
    CONSULT_REQUESTED: 2,
    CONSULT_REPLIED: 3,
    REFERRAL_CREATED: 4,
    REMINDER_SENT: 5,
    REACHED_FACILITY: 6,
    OUTCOME_RECORDED: 7,
  };

  const currentStep = selectedCase ? stepMap[selectedCase.state] || 1 : 1;
  const consult = selectedCase ? getConsultByCaseId(selectedCase.id) : null;
  const referral = selectedCase
    ? syncedReferrals.find((r) => r.caseId === selectedCase.id || r.patientId === selectedCase.patientId)
    : null;

  const getStatePill = (st: string) => {
    switch (st) {
      case 'CONSULT_REQUESTED':
        return { label: lang === 'hi' ? 'परामर्श प्रतीक्षारत' : 'Consult waiting', bg: '#FFF1CC', fg: '#8A5A00' };
      case 'CONSULT_REPLIED':
        return { label: lang === 'hi' ? 'उत्तर दिया' : 'Consult replied', bg: '#DAF1DE', fg: '#235347' };
      case 'REFERRAL_CREATED':
      case 'REMINDER_SENT':
      case 'REACHED_FACILITY':
        return { label: lang === 'hi' ? 'रेफ़रल' : 'Referral', bg: '#FFDAD6', fg: '#BA1A1A' };
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
      {/* Two Column Layout: Table (58%) & Case Timeline Panel (42%) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '58% 42%',
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
          aria-label={lang === 'hi' ? 'सुपरवाइज़र केस तालिका' : 'Supervisor Cases Directory'}
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
          {/* Controls: Search and Filters */}
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
                  {lang === 'hi' ? 'पर्यवेक्षक केस तालिका' : 'Supervisor Cases'}
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

            {/* Filter Row: Village, Mitanin, and State Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <select
                aria-label={t.villageLabel}
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                style={{
                  height: 36,
                  padding: '0 10px',
                  borderRadius: 10,
                  border: '1.5px solid #CCD9D2',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#00201C',
                  background: '#FFFFFF',
                }}
              >
                <option value="all">{t.allVillages}</option>
                {VILLAGES.map((v) => (
                  <option key={v} value={v}>
                    {lang === 'hi' ? VILLAGE_HI[v] : v}
                  </option>
                ))}
              </select>

              <select
                aria-label={t.mitaninLabel}
                value={mitanin}
                onChange={(e) => setMitanin(e.target.value)}
                style={{
                  height: 36,
                  padding: '0 10px',
                  borderRadius: 10,
                  border: '1.5px solid #CCD9D2',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#00201C',
                  background: '#FFFFFF',
                }}
              >
                <option value="all">{t.allMitanins}</option>
                {MITANINS.map((m) => (
                  <option key={m} value={m}>
                    {lang === 'hi' ? MITANIN_HI[m] : m}
                  </option>
                ))}
              </select>
            </div>

            {/* State filter chips */}
            <div role="group" aria-label="State filter" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: lang === 'hi' ? 'सभी' : 'All' },
                { id: 'screened', label: lang === 'hi' ? 'जाँच की गई' : 'Screened' },
                { id: 'consult', label: lang === 'hi' ? 'परामर्श' : 'Consult' },
                { id: 'referral', label: lang === 'hi' ? 'रेफ़रल' : 'Referral' },
                { id: 'completed', label: lang === 'hi' ? 'पूर्ण' : 'Completed' },
              ].map((f) => {
                const on = stateFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setStateFilter(f.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      cursor: 'pointer',
                      fontSize: 11.5,
                      fontWeight: 800,
                      border: `1.5px solid ${on ? '#235347' : '#CCD9D2'}`,
                      background: on ? '#235347' : '#FFFFFF',
                      color: on ? '#FFFFFF' : '#235347',
                      minHeight: 28,
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Body - horizontally scrollable inside between 768-1023px */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
            {filteredCases.length === 0 ? (
              <p style={{ margin: '40px 0', textAlign: 'center', color: '#404945', fontSize: 14, fontWeight: 600 }}>
                {lang === 'hi' ? 'अभी कोई केस नहीं' : 'No cases yet'}
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left', minWidth: 500 }}>
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
                    <th style={{ padding: '10px 12px', fontWeight: 800, color: '#404945' }}>
                      {lang === 'hi' ? 'प्राथमिकता' : 'Priority'}
                    </th>
                  </tr>
                </thead>
                <tbody tabIndex={0} onKeyDown={handleTableKeyDown} style={{ outline: 'none' }}>
                  {filteredCases.map((c) => {
                    const isSelected = selectedCase?.id === c.id;
                    const st = getStatePill(c.state);
                    const patientSummary = getPatientSummary(c.patientId, lang) || c.name[lang];

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedSupervisorCaseId(c.id)}
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
                          title={lang === 'hi' ? VILLAGE_HI[c.village] || c.village : c.village}
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
                          {lang === 'hi' ? VILLAGE_HI[c.village] || c.village : c.village}
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
                          {lang === 'hi' ? MITANIN_HI[c.mitanin] || c.mitanin : c.mitanin}
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

        {/* ===================== RIGHT PANEL: CASE TIMELINE ===================== */}
        <section
          aria-label={lang === 'hi' ? 'केस समयरेखा' : 'Case Timeline'}
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
                    {tTimeline.caseNo} #{selectedCase.id.toUpperCase()}
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
                    {lang === 'hi' ? VILLAGE_HI[selectedCase.village] || selectedCase.village : selectedCase.village}
                    {' • '}
                    {t.mitaninPrefix} {lang === 'hi' ? MITANIN_HI[selectedCase.mitanin] || selectedCase.mitanin : selectedCase.mitanin}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 800,
                      ...getStatePill(selectedCase.state),
                    }}
                  >
                    {getStatePill(selectedCase.state).label}
                  </span>
                </div>
              </div>

              {/* Quick Actions for Supervisor */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                <button
                  type="button"
                  onClick={() =>
                    showToast(
                      t.toasts[0]
                        .replace('{who}', lang === 'hi' ? MITANIN_HI[selectedCase.mitanin] : selectedCase.mitanin)
                        .replace('{name}', selectedCase.name[lang])
                    )
                  }
                  style={{
                    flex: 1,
                    minHeight: 40,
                    padding: '6px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #235347',
                    background: '#FFFFFF',
                    color: '#235347',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <PhoneCall size={14} />
                  <span>{t.actions[0]}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    showToast(
                      t.toasts[1]
                        .replace('{who}', lang === 'hi' ? MITANIN_HI[selectedCase.mitanin] : selectedCase.mitanin)
                        .replace('{name}', selectedCase.name[lang])
                    )
                  }
                  style={{
                    flex: 1,
                    minHeight: 40,
                    padding: '6px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #235347',
                    background: '#FFFFFF',
                    color: '#235347',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Bell size={14} />
                  <span>{t.actions[1]}</span>
                </button>
              </div>

              {/* 7-Step Vertical Timeline */}
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: '#00201C' }}>
                {tTimeline.tabs.timeline}
              </h3>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
                {STEP_LABELS[lang].map((stepName, idx) => {
                  const stepNumber = idx + 1;
                  const isDone = stepNumber < currentStep;
                  const isCurrent = stepNumber === currentStep;
                  const isLast = idx === STEP_LABELS[lang].length - 1;

                  return (
                    <li
                      key={stepName}
                      style={{
                        display: 'flex',
                        gap: 12,
                        minHeight: isLast ? 40 : 54,
                        position: 'relative',
                      }}
                    >
                      {/* Marker Column */}
                      <div
                        style={{
                          width: 28,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 11,
                            fontWeight: 800,
                            background: isDone ? '#2E7D4F' : isCurrent ? '#235347' : '#E7F0EA',
                            color: isDone || isCurrent ? '#FFFFFF' : '#707975',
                            boxShadow: isCurrent ? '0 0 0 3px #DAF1DE' : 'none',
                          }}
                        >
                          {isDone ? '✓' : stepNumber}
                        </span>
                        {!isLast && (
                          <div
                            style={{
                              width: 2,
                              flex: 1,
                              background: isDone ? '#2E7D4F' : '#E3ECE7',
                              marginTop: 4,
                              marginBottom: 4,
                            }}
                          />
                        )}
                      </div>

                      {/* Content Column */}
                      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 12 }}>
                        <span
                          style={{
                            display: 'block',
                            fontSize: 14,
                            fontWeight: isCurrent || isDone ? 800 : 600,
                            color: isCurrent ? '#235347' : isDone ? '#00201C' : '#707975',
                          }}
                        >
                          {stepName}
                        </span>

                        {/* Extra details for particular steps */}
                        {stepNumber === 3 && consult?.advice && (
                          <div
                            style={{
                              marginTop: 4,
                              padding: '6px 10px',
                              borderRadius: 8,
                              background: '#F8FAF9',
                              border: '1px solid #E3ECE7',
                              fontSize: 12.5,
                              color: '#00201C',
                            }}
                          >
                            <span style={{ fontWeight: 700, color: '#235347' }}>
                              {consult.doctorName || 'Dr. Rao'}:
                            </span>{' '}
                            {consult.advice}
                          </div>
                        )}

                        {stepNumber === 4 && referral && (
                          <div
                            style={{
                              marginTop: 4,
                              padding: '6px 10px',
                              borderRadius: 8,
                              background: '#F8FAF9',
                              border: '1px solid #E3ECE7',
                              fontSize: 12.5,
                              color: '#00201C',
                            }}
                          >
                            <span style={{ fontWeight: 700 }}>
                              {lang === 'hi' ? 'अस्पताल' : 'Facility'}:
                            </span>{' '}
                            {typeof referral.facility === 'string'
                              ? referral.facility
                              : referral.facility[lang]}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
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
              <Clock size={36} style={{ opacity: 0.5, marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#00201C' }}>
                {lang === 'hi' ? 'एक केस चुनें' : 'Select a case'}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Toast Feedback */}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 30,
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: 14,
            background: '#051F20',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

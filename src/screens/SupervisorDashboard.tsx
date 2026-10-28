import { useEffect, useMemo, useRef, useState } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';
import { useCaseStore } from '../store/CaseStore';
import { useScreenDraft } from '../ScreenDraftContext';
import { priority } from '../domain';
import { PhoneCall, Bell, AlertTriangle, ArrowRight } from 'lucide-react';

type Lang = 'en' | 'hi';
type StatusKey = 'overdue' | 'soon' | 'awaiting';

interface Row {
  id: string;
  name: Record<Lang, string>;
  village: string;
  mitanin: string;
  reason: Record<Lang, string>;
  status: StatusKey;
}

const DIRECTORY = dataService.getDirectory();
const VILLAGES = DIRECTORY.villages.map((v) => v.en);
const MITANINS = DIRECTORY.mitanins.map((m) => m.en);
const VILLAGE_HI: Record<string, string> = Object.fromEntries(DIRECTORY.villages.map((v) => [v.en, v.hi]));
const MITANIN_HI: Record<string, string> = Object.fromEntries(DIRECTORY.mitanins.map((m) => [m.en, m.hi]));

const ROWS = dataService.getSupervisorRows() as Row[];

const COPY = { en: enLocale.screens.SupervisorDashboard, hi: hiLocale.screens.SupervisorDashboard } as const;

const STRICT_STAT_STYLE = [
  { bg: '#BA1A1A', blob: 'rgba(255, 255, 255, 0.15)' },
  { bg: '#053C31', blob: 'rgba(255, 255, 255, 0.15)' },
  { bg: '#235347', blob: 'rgba(255, 255, 255, 0.15)' },
];

const PILL: Record<StatusKey, { background: string; color: string }> = {
  overdue: { background: '#FFDAD6', color: '#BA1A1A' },
  soon: { background: '#FFF1CC', color: '#8A5A00' },
  awaiting: { background: '#DAF1DE', color: '#235347' },
};

const ACTION_ICONS = [
  <PhoneCall key="c" size={15} />,
  <Bell key="r" size={15} />,
  <AlertTriangle key="e" size={15} />,
];

const R = 54;
const C = 2 * Math.PI * R;

const selectStyle = {
  width: '100%',
  height: 48,
  padding: '0 14px',
  borderRadius: 16,
  border: '1.5px solid #E3ECE7',
  font: 'inherit',
  fontSize: 14.5,
  fontWeight: 700,
  color: '#00201C',
  background: '#FFFFFF',
} as const;

export default function SupervisorDashboard({ lang, online = true, onNavigate, onToggleOnline }: ScreenProps) {
  const t = COPY[lang];
  const { syncedCases, getLoopClosureRate, isOverdue, demoClockOffsetMinutes } = useCaseStore();
  const { selectedSupervisorCaseId, setSelectedSupervisorCaseId } = useScreenDraft();
  const loopRate = getLoopClosureRate(24);
  const [village, setVillage] = useState('all');
  const [mitanin, setMitanin] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const act = (row: Row, i: number) => {
    const who = lang === 'hi' ? MITANIN_HI[row.mitanin] : row.mitanin;
    setToast(t.toasts[i].replace('{who}', who).replace('{name}', row.name[lang]));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2600);
  };

  const dynamicRows: Row[] = useMemo(() => {
    if (syncedCases.length === 0) {
      return [];
    }

    const mappedBase = ROWS.map((baseRow) => {
      const c = syncedCases.find(
        (sc) => sc.patientId === baseRow.id.replace('r', 'p') || sc.id === baseRow.id
      );
      if (!c) return baseRow;

      let status: StatusKey = baseRow.status;
      let reason = baseRow.reason;

      if (c.state === 'OUTCOME_RECORDED') {
        status = 'soon';
        reason = {
          en: 'Outcome recorded (resolved)',
          hi: 'परिणाम दर्ज (समाधान)',
        };
      } else if (c.state === 'REACHED_FACILITY') {
        status = 'soon';
        reason = {
          en: 'Reached facility confirmed',
          hi: 'अस्पताल पहुँचने की पुष्टि हुई',
        };
      } else if (c.state === 'CONSULT_REQUESTED') {
        status = 'awaiting';
        reason = {
          en: 'Doctor reply pending',
          hi: 'डॉक्टर का जवाब बाकी',
        };
      } else if (c.state === 'CONSULT_REPLIED') {
        status = 'soon';
        reason = {
          en: 'Doctor replied, create referral',
          hi: 'डॉक्टर का जवाब आया, रेफ़रल बनाएँ',
        };
      } else {
        const p = priority(c);
        if (p.rank === 2) {
          status = 'overdue';
        } else if (p.rank === 3) {
          status = 'soon';
        } else if (isOverdue(c.dueAt)) {
          status = 'overdue';
        }
      }

      return {
        ...baseRow,
        status,
        reason,
      };
    });

    const newRows: Row[] = syncedCases
      .filter(
        (c) =>
          !ROWS.some(
            (baseRow) =>
              c.patientId === baseRow.id.replace('r', 'p') ||
              c.id === baseRow.id
          )
      )
      .map((c) => {
        let status: StatusKey = isOverdue(c.dueAt) ? 'overdue' : 'soon';
        if (c.state === 'CONSULT_REQUESTED') {
          status = 'awaiting';
        }
        const villageName =
          typeof c.village === 'object' && c.village !== null
            ? (c.village as { en: string; hi: string }).en
            : typeof c.village === 'string' && c.village
            ? c.village
            : 'Amora';

        let reasonText = { en: 'Active case', hi: 'सक्रिय केस' };
        if (c.state === 'CONSULT_REQUESTED') {
          reasonText = { en: 'Waiting for doctor reply', hi: 'डॉक्टर का जवाब बाकी' };
        } else if (c.state === 'CONSULT_REPLIED') {
          reasonText = { en: 'Doctor replied', hi: 'डॉक्टर का जवाब आया' };
        } else if (isOverdue(c.dueAt)) {
          reasonText = { en: 'Referral late', hi: 'रेफ़रल में देरी' };
        }

        return {
          id: c.id,
          name: c.name,
          village: villageName,
          mitanin: c.mitanin || 'Sunita',
          reason: typeof c.reason === 'object' && c.reason !== null ? (c.reason as Record<Lang, string>) : reasonText,
          status,
        };
      });

    return [...mappedBase, ...newRows];
  }, [syncedCases, isOverdue]);

  const overdueCount = dynamicRows.filter((r) => r.status === 'overdue').length;
  const soonCount = dynamicRows.filter((r) => r.status === 'soon').length;
  const awaitingCount = dynamicRows.filter((r) => r.status === 'awaiting').length;
  const dynamicStats = [overdueCount, soonCount, awaitingCount];

  const rows = dynamicRows.filter(
    (r) => (village === 'all' || r.village === village) && (mitanin === 'all' || r.mitanin === mitanin),
  );

  const activeSelectedId = useMemo(() => {
    if (selectedSupervisorCaseId && rows.some((r) => r.id === selectedSupervisorCaseId)) {
      return selectedSupervisorCaseId;
    }
    if (selectedId && rows.some((r) => r.id === selectedId)) {
      return selectedId;
    }
    return rows[0]?.id || null;
  }, [selectedSupervisorCaseId, selectedId, rows]);

  const selectedRow = rows.find((r) => r.id === activeSelectedId) || null;

  const handleSelectRow = (id: string) => {
    setSelectedId(id);
    setSelectedSupervisorCaseId(id);
  };

  const getLateBy = (r: Row): string => {
    if (r.status !== 'overdue') return '--';
    const linkedCase = syncedCases.find(
      (sc) => sc.patientId === r.id.replace('r', 'p') || sc.id === r.id
    );
    const nowMs = Date.now() + (demoClockOffsetMinutes || 0) * 60 * 1000;
    if (linkedCase?.dueAt) {
      const dueMs = new Date(linkedCase.dueAt).getTime();
      if (nowMs > dueMs) {
        const diffMin = Math.round((nowMs - dueMs) / 60000);
        if (diffMin >= 1440) {
          const days = Math.floor(diffMin / 1440);
          return lang === 'hi' ? `${days} दिन` : `${days}d`;
        }
        const hours = Math.max(1, Math.floor(diffMin / 60));
        return lang === 'hi' ? `${hours} घंटे` : `${hours}h`;
      }
    }
    return lang === 'hi' ? '1 दिन' : '1d';
  };

  const getPriorityInfo = (status: StatusKey) => {
    if (status === 'overdue') {
      return {
        label: lang === 'hi' ? 'उच्च' : 'High',
        bg: '#FFDAD6',
        fg: '#BA1A1A',
      };
    }
    if (status === 'soon') {
      return {
        label: lang === 'hi' ? 'मध्यम' : 'Medium',
        bg: '#FFF1CC',
        fg: '#8A5A00',
      };
    }
    return {
      label: lang === 'hi' ? 'सामान्य' : 'Low',
      bg: '#DAF1DE',
      fg: '#235347',
    };
  };

  const handleTableKeyDown = (e: React.KeyboardEvent<HTMLTableSectionElement>) => {
    if (rows.length === 0) return;
    const currentIndex = rows.findIndex((r) => r.id === activeSelectedId);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : 0;
      handleSelectRow(rows[nextIndex].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : rows.length - 1;
      handleSelectRow(rows[prevIndex].id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onNavigate('/case');
    }
  };

  return (
    <div>
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
        <header style={{ position: 'relative', background: '#051F20', color: '#FFFFFF', padding: 'calc(24px + env(safe-area-inset-top, 0px)) 20px 66px', overflow: 'hidden' }}>
          <svg viewBox="0 0 120 160" width="120" height="160" aria-hidden style={{ position: 'absolute', right: -14, top: 8, opacity: 0.9 }}>
            <g transform="translate(70 90) rotate(18) scale(0.95)">
              <path d="M0 84C-42 44-34-22 0-66C34-22 42 44 0 84Z" fill="#235347" opacity="0.55" />
            </g>
          </svg>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <h1 style={{ margin: 0, maxWidth: 220, fontSize: 24, fontWeight: 800, lineHeight: 1.2, color: '#FFFFFF' }}>{t.title}</h1>
            <button
              type="button"
              onClick={onToggleOnline}
              aria-pressed={online}
              style={{
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
                background: online ? '#DAF1DE' : '#FFF1CC',
                color: online ? '#235347' : '#8A5A00',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: online ? '#2E7D4F' : '#8A5A00',
                }}
              />
              {online ? (lang === 'hi' ? 'सिंक हो गया' : 'Synced') : (lang === 'hi' ? 'ऑफ़लाइन' : 'Offline')}
            </button>
          </div>

          <div style={{ position: 'relative', marginTop: 20, display: 'flex', alignItems: 'center', gap: 18 }}>
            <svg width="144" height="144" viewBox="0 0 144 144" role="img" aria-label={`${t.ringTitle}: ${loopRate != null ? Math.round(loopRate * 100) + '%' : '--'}`}>
              <circle cx="72" cy="72" r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="14" />
              <circle
                cx="72"
                cy="72"
                r={R}
                fill="none"
                stroke="#C0EACC"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={loopRate != null ? C * (1 - loopRate) : C}
                transform="rotate(-90 72 72)"
              />
              <text x="72" y="82" textAnchor="middle" fontSize="34" fontWeight="800" fill="#FFFFFF">
                {loopRate != null ? `${Math.round(loopRate * 100)}%` : '--'}
              </text>
            </svg>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.2, color: '#FFFFFF' }}>{t.ringTitle}</p>
              {loopRate == null && (
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#DAF1DE' }}>
                  {lang === 'hi' ? 'अभी कोई केस नहीं' : 'No cases yet'}
                </p>
              )}
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 10,
                  padding: '4px 12px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 800,
                  background: '#FFF1CC',
                  color: '#8A5A00',
                }}
              >
                {t.demo}
              </span>
            </div>
          </div>
        </header>

        <section
          style={{
            marginTop: -36,
            position: 'relative',
            background: '#F4F9F6',
            borderRadius: '32px 32px 0 0',
            padding: '24px 20px 28px',
          }}
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {STRICT_STAT_STYLE.map((s, i) => (
              <li
                key={i}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: 92,
                  padding: 12,
                  borderRadius: 20,
                  background: s.bg,
                  color: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  boxShadow: '0 2px 6px rgba(0, 32, 28, 0.08)',
                }}
              >
                <span aria-hidden style={{ position: 'absolute', top: -22, right: -18, width: 64, height: 64, borderRadius: '50%', background: s.blob, opacity: 0.55 }} />
                <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{dynamicStats[i]}</span>
                <span style={{ marginTop: 3, fontSize: 12.5, fontWeight: 700, lineHeight: 1.2 }}>{t.stats[i]}</span>
              </li>
            ))}
          </ul>

          <h2 style={{ margin: '24px 0 0', fontSize: 22, fontWeight: 800, color: '#00201C' }}>{t.listTitle}</h2>

          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <select aria-label={t.villageLabel} value={village} onChange={(e) => setVillage(e.target.value)} style={selectStyle}>
              <option value="all">{t.allVillages}</option>
              {VILLAGES.map((v) => (
                <option key={v} value={v}>{lang === 'hi' ? VILLAGE_HI[v] : v}</option>
              ))}
            </select>
            <select aria-label={t.mitaninLabel} value={mitanin} onChange={(e) => setMitanin(e.target.value)} style={selectStyle}>
              <option value="all">{t.allMitanins}</option>
              {MITANINS.map((m) => (
                <option key={m} value={m}>{lang === 'hi' ? MITANIN_HI[m] : m}</option>
              ))}
            </select>
          </div>

          {rows.length === 0 ? (
            <p style={{ margin: '32px 0', textAlign: 'center', color: '#404945', fontSize: 14.5 }}>{t.empty}</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 12 }}>
              {rows.map((r) => (
                <li
                  key={r.id}
                  style={{ padding: 14, borderRadius: 20, border: '1px solid #E3ECE7', background: '#FFFFFF', boxShadow: '0 2px 6px rgba(0, 32, 28, 0.04)' }}
                >
                  <button
                    type="button"
                    onClick={() => onNavigate('/case')}
                    style={{ display: 'block', width: '100%', padding: 0, textAlign: 'left', border: 0, background: 'none', cursor: 'pointer', color: '#00201C' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: '#00201C' }}>{r.name[lang]}</span>
                      <span style={{ flex: '0 0 auto', padding: '3px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 800, ...PILL[r.status] }}>
                        {t.status[r.status]}
                      </span>
                    </span>
                    <span style={{ display: 'block', marginTop: 3, fontSize: 13, color: '#404945' }}>
                      {lang === 'hi' ? VILLAGE_HI[r.village] : r.village}
                      {' / '}
                      {t.mitaninPrefix} {lang === 'hi' ? MITANIN_HI[r.mitanin] : r.mitanin}
                    </span>
                    <span style={{ display: 'block', marginTop: 8, fontSize: 14.5, fontWeight: 700, lineHeight: 1.3, color: '#00201C' }}>{r.reason[lang]}</span>
                  </button>
                  <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {t.actions.map((label, i) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => act(r, i)}
                        style={{
                          minHeight: 48,
                          height: 48,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '0 4px',
                          borderRadius: 14,
                          cursor: 'pointer',
                          fontSize: lang === 'hi' ? 11.5 : 13,
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          border: i === 2 ? 0 : '1.5px solid #235347',
                          background: i === 2 ? '#BA1A1A' : '#FFFFFF',
                          color: i === 2 ? '#FFFFFF' : '#235347',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {ACTION_ICONS[i]}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '24px 28px 40px', background: '#F4F9F6', minHeight: '100vh' }}>
        {/* Wide Header / Title */}
        <header style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#00201C', lineHeight: 1.2 }}>{t.title}</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#404945', fontWeight: 600 }}>
              {lang === 'hi' ? 'पर्यवेक्षक अवलोकन एवं प्राथमिक केस प्रबंधन' : 'Supervisor Overview & Priority Case Management'}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleOnline}
            aria-pressed={online}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 14px',
              minHeight: 40,
              border: 0,
              borderRadius: 999,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              background: online ? '#DAF1DE' : '#FFF1CC',
              color: online ? '#235347' : '#8A5A00',
              boxShadow: '0 2px 8px rgba(0, 32, 28, 0.04)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: online ? '#2E7D4F' : '#8A5A00',
              }}
            />
            {online ? (lang === 'hi' ? 'सिंक हो गया' : 'Synced') : (lang === 'hi' ? 'ऑफ़लाइन' : 'Offline')}
          </button>
        </header>

        {/* 1. KPI Row (Loop Closure Rate ring, Overdue, Due soon, Awaiting doctor) */}
        <div className="grid grid-cols-4 @md:grid-cols-4 @2xl:grid-cols-4 @4xl:grid-cols-4 gap-4" style={{ marginBottom: 28 }}>
          {/* Loop Closure Rate Ring Card */}
          <div
            style={{
              background: '#051F20',
              color: '#FFFFFF',
              borderRadius: 20,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              boxShadow: '0 2px 10px rgba(0, 32, 28, 0.06)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <svg
              viewBox="0 0 120 160"
              width="100"
              height="140"
              aria-hidden
              style={{ position: 'absolute', right: -20, top: -20, opacity: 0.35, pointerEvents: 'none' }}
            >
              <g transform="translate(50 70) rotate(18) scale(0.8)">
                <path d="M0 84C-42 44-34-22 0-66C34-22 42 44 0 84Z" fill="#235347" />
              </g>
            </svg>
            <svg width="80" height="80" viewBox="0 0 144 144" role="img" aria-label={`${t.ringTitle}: ${loopRate != null ? Math.round(loopRate * 100) + '%' : '--'}`}>
              <circle cx="72" cy="72" r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="15" />
              <circle
                cx="72"
                cy="72"
                r={R}
                fill="none"
                stroke="#C0EACC"
                strokeWidth="15"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={loopRate != null ? C * (1 - loopRate) : C}
                transform="rotate(-90 72 72)"
              />
              <text x="72" y="81" textAnchor="middle" fontSize="30" fontWeight="800" fill="#FFFFFF">
                {loopRate != null ? `${Math.round(loopRate * 100)}%` : '--'}
              </text>
            </svg>
            <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, lineHeight: 1.25, color: '#FFFFFF' }}>{t.ringTitle}</p>
              {loopRate == null && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#DAF1DE' }}>
                  {lang === 'hi' ? 'अभी कोई केस नहीं' : 'No cases yet'}
                </p>
              )}
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 6,
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 800,
                  background: '#FFF1CC',
                  color: '#8A5A00',
                }}
              >
                {t.demo}
              </span>
            </div>
          </div>

          {/* Overdue, Due Soon, Awaiting Doctor Stat Cards */}
          {STRICT_STAT_STYLE.map((s, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 20,
                background: s.bg,
                color: '#FFFFFF',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                minHeight: 104,
                boxShadow: '0 2px 10px rgba(0, 32, 28, 0.06)',
              }}
            >
              <span aria-hidden style={{ position: 'absolute', top: -20, right: -16, width: 70, height: 70, borderRadius: '50%', background: s.blob, opacity: 0.55 }} />
              <span style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{dynamicStats[i]}</span>
              <span style={{ marginTop: 6, fontSize: 13.5, fontWeight: 700, lineHeight: 1.2 }}>{t.stats[i]}</span>
            </div>
          ))}
        </div>

        {/* Filters and Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#00201C' }}>{t.listTitle}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 440 }}>
            <select aria-label={t.villageLabel} value={village} onChange={(e) => setVillage(e.target.value)} style={selectStyle}>
              <option value="all">{t.allVillages}</option>
              {VILLAGES.map((v) => (
                <option key={v} value={v}>{lang === 'hi' ? VILLAGE_HI[v] : v}</option>
              ))}
            </select>
            <select aria-label={t.mitaninLabel} value={mitanin} onChange={(e) => setMitanin(e.target.value)} style={selectStyle}>
              <option value="all">{t.allMitanins}</option>
              {MITANINS.map((m) => (
                <option key={m} value={m}>{lang === 'hi' ? MITANIN_HI[m] : m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. Priority List Table on the left (~2/3) and Case Detail Panel on the right (~1/3) */}
        {rows.length === 0 ? (
          <div style={{ padding: '64px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: 20, border: '1px solid #E3ECE7' }}>
            <p style={{ margin: 0, color: '#404945', fontSize: 16, fontWeight: 600 }}>
              {lang === 'hi' ? 'अभी कोई केस नहीं' : 'No cases yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-12 @2xl:grid-cols-12 @4xl:grid-cols-12 gap-6">
            {/* Priority List as a Table on the left (two-thirds) */}
            <div
              className="col-span-8 @2xl:col-span-7 @4xl:col-span-8"
              style={{
                background: '#FFFFFF',
                borderRadius: 24,
                border: '1px solid #E3ECE7',
                boxShadow: '0 2px 10px rgba(0, 32, 28, 0.04)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ overflowX: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 640 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#F4F9F6' }}>
                    <tr style={{ borderBottom: '1px solid #E3ECE7' }}>
                      <th style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 800, color: '#404945', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {lang === 'hi' ? 'मरीज़' : 'Patient'}
                      </th>
                      <th style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 800, color: '#404945', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {lang === 'hi' ? 'गाँव' : 'Village'}
                      </th>
                      <th style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 800, color: '#404945', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {lang === 'hi' ? 'मितानिन' : 'Mitanin'}
                      </th>
                      <th style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 800, color: '#404945', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {lang === 'hi' ? 'समस्या' : 'Problem'}
                      </th>
                      <th style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 800, color: '#404945', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {lang === 'hi' ? 'देरी' : 'Late by'}
                      </th>
                      <th style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 800, color: '#404945', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {lang === 'hi' ? 'प्राथमिकता' : 'Priority'}
                      </th>
                      <th style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 800, color: '#404945', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {lang === 'hi' ? 'कार्रवाई' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody tabIndex={0} onKeyDown={handleTableKeyDown} style={{ outline: 'none' }}>
                    {rows.map((r) => {
                      const isSelected = selectedRow?.id === r.id;
                      const prio = getPriorityInfo(r.status);
                      const lateBy = getLateBy(r);

                      return (
                        <tr
                          key={r.id}
                          onClick={() => handleSelectRow(r.id)}
                          style={{
                            cursor: 'pointer',
                            background: isSelected ? '#DAF1DE' : 'transparent',
                            borderBottom: '1px solid #E3ECE7',
                            transition: 'background 0.15s ease',
                            outline: isSelected ? '2px solid #235347' : 'none',
                          }}
                        >
                          <td style={{ padding: '12px 14px', minWidth: 120 }}>
                            <span style={{ fontSize: 14.5, fontWeight: 800, color: isSelected ? '#235347' : '#00201C', display: 'block' }}>
                              {r.name[lang]}
                            </span>
                            <span style={{ fontSize: 12, color: '#404945', fontWeight: 600 }}>
                              #{r.id.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 13.5, color: '#00201C', fontWeight: 600 }}>
                            {lang === 'hi' ? VILLAGE_HI[r.village] || r.village : r.village}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 13.5, color: '#00201C', fontWeight: 600 }}>
                            {lang === 'hi' ? MITANIN_HI[r.mitanin] || r.mitanin : r.mitanin}
                          </td>
                          <td title={r.reason[lang]} style={{ padding: '12px 14px', fontSize: 13.5, fontWeight: 600, color: '#00201C', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.reason[lang]}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: r.status === 'overdue' ? '#BA1A1A' : '#404945' }}>
                            {lateBy}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 800, background: prio.bg, color: prio.fg, whiteSpace: 'nowrap' }}>
                              {prio.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {t.actions.map((label, i) => (
                                <button
                                  key={label}
                                  type="button"
                                  title={label}
                                  aria-label={`${label} - ${r.name[lang]}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    act(r, i);
                                  }}
                                  style={{
                                    height: 36,
                                    minWidth: 36,
                                    padding: '0 8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    borderRadius: 10,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    border: i === 2 ? 0 : '1.5px solid #235347',
                                    background: i === 2 ? '#BA1A1A' : '#FFFFFF',
                                    color: i === 2 ? '#FFFFFF' : '#235347',
                                    transition: 'opacity 0.15s ease',
                                  }}
                                >
                                  {ACTION_ICONS[i]}
                                  <span className="hidden @4xl:inline">{label}</span>
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Case Detail Panel on the right (~1/3) with Call, Remind, Escalate */}
            <div className="col-span-4 @2xl:col-span-5 @4xl:col-span-4">
              {selectedRow ? (
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 24,
                    border: '1px solid #E3ECE7',
                    boxShadow: '0 2px 10px rgba(0, 32, 28, 0.04)',
                    padding: '24px 22px',
                    position: 'sticky',
                    top: 88,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingBottom: 16, borderBottom: '1px solid #E3ECE7' }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#404945', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {lang === 'hi' ? 'केस विवरण' : 'Case Details'}
                      </span>
                      <h3 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#00201C' }}>
                        {selectedRow.name[lang]}
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: '#404945' }}>
                        {lang === 'hi' ? VILLAGE_HI[selectedRow.village] || selectedRow.village : selectedRow.village}
                        {' • '}
                        {t.mitaninPrefix} {lang === 'hi' ? MITANIN_HI[selectedRow.mitanin] || selectedRow.mitanin : selectedRow.mitanin}
                      </p>
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800, ...PILL[selectedRow.status] }}>
                      {t.status[selectedRow.status]}
                    </span>
                  </div>

                  <div style={{ padding: '16px 0', borderBottom: '1px solid #E3ECE7' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#404945', textTransform: 'uppercase' }}>
                      {lang === 'hi' ? 'प्राथमिकता का कारण:' : 'Priority Reason:'}
                    </span>
                    <p style={{ margin: '6px 0 0', fontSize: 14.5, fontWeight: 700, color: '#00201C', lineHeight: 1.4 }}>
                      {selectedRow.reason[lang]}
                    </p>
                  </div>

                  {/* Call, Remind, Escalate Actions */}
                  <div style={{ marginTop: 20 }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#404945', textTransform: 'uppercase', marginBottom: 10 }}>
                      {lang === 'hi' ? 'त्वरित कार्रवाई' : 'Quick Actions'}
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {t.actions.map((label, i) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => act(selectedRow, i)}
                          style={{
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            borderRadius: 14,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 800,
                            border: i === 2 ? 0 : '1.5px solid #235347',
                            background: i === 2 ? '#BA1A1A' : '#FFFFFF',
                            color: i === 2 ? '#FFFFFF' : '#235347',
                            transition: 'opacity 0.15s ease',
                          }}
                        >
                          {ACTION_ICONS[i]}
                          {label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate('/case')}
                      style={{
                        marginTop: 14,
                        width: '100%',
                        height: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        borderRadius: 14,
                        border: '1.5px solid #CCD9D2',
                        background: '#F4F9F6',
                        color: '#235347',
                        fontSize: 13.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <span>{lang === 'hi' ? 'केस समयरेखा देखें' : 'View Full Case Timeline'}</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 24,
                    border: '1px solid #E3ECE7',
                    padding: '32px 20px',
                    textAlign: 'center',
                    color: '#404945',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#00201C' }}>
                    {lang === 'hi' ? 'एक केस चुनें' : 'Select a case'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Toast Notification */}
      <div
        role="status"
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 'calc(110px + env(safe-area-inset-bottom, 0px))',
          width: 'min(calc(100% - 40px), 390px)',
          zIndex: 30,
          display: toast ? 'block' : 'none',
          padding: '14px 16px',
          borderRadius: 18,
          fontSize: 14.5,
          fontWeight: 700,
          background: '#051F20',
          color: '#FFFFFF',
          boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25)',
          textAlign: 'center',
        }}
      >
        {toast}
      </div>
    </div>
  );
}

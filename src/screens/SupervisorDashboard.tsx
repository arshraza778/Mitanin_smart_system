import { useEffect, useRef, useState } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';

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

const STAT_STYLE = dataService.getDashboardData().stats;

const PILL: Record<StatusKey, { background: string; color: string }> = {
  overdue: { background: 'var(--ms-orange-100)', color: 'var(--ms-orange-700)' },
  soon: { background: 'var(--ms-violet-100)', color: 'var(--ms-violet-700)' },
  awaiting: { background: 'var(--ms-green-100)', color: 'var(--ms-green-700)' },
};

const ai = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.1,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};
const ACTION_ICONS = [
  <svg key="c" {...ai}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>,
  <svg key="r" {...ai}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21h4" />
  </svg>,
  <svg key="e" {...ai}>
    <path d="M12 20V5M6 11l6-6 6 6" />
  </svg>,
];

const R = 54;
const C = 2 * Math.PI * R;
const DEMO_RATE = 0.72;

const selectStyle = {
  width: '100%',
  height: 48,
  padding: '0 14px',
  borderRadius: 16,
  border: '2px solid var(--ms-green-100)',
  font: 'inherit',
  fontSize: 15,
  fontWeight: 700,
  color: 'var(--ms-ink)',
  background: 'var(--ms-surface)',
} as const;

export default function SupervisorDashboard({ lang, online = true, onNavigate, onToggleOnline }: ScreenProps) {
  const t = COPY[lang];
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

  const rows = ROWS.filter(
    (r) => (village === 'all' || r.village === village) && (mitanin === 'all' || r.mitanin === mitanin),
  );

  const selectedRow = rows.find((r) => r.id === selectedId) || rows[0] || null;

  return (
    <div>
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
        <header style={{ position: 'relative', background: 'var(--ms-green-700)', color: '#fff', padding: 'calc(24px + env(safe-area-inset-top, 0px)) 20px 66px', overflow: 'hidden' }}>
          <svg viewBox="0 0 120 160" width="120" height="160" aria-hidden style={{ position: 'absolute', right: -14, top: 8, opacity: 0.9 }}>
            <g transform="translate(70 90) rotate(18) scale(0.95)">
              <path d="M0 84C-42 44-34-22 0-66C34-22 42 44 0 84Z" fill="var(--ms-green-500)" opacity="0.55" />
            </g>
          </svg>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <h1 style={{ margin: 0, maxWidth: 220, fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>{t.title}</h1>
            <button
              type="button"
              onClick={onToggleOnline}
              aria-pressed={online}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 12px',
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
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: online ? 'var(--ms-green-500)' : 'var(--ms-orange)',
                }}
              />
              {online ? (lang === 'hi' ? 'सिंक हो गया' : 'Synced') : (lang === 'hi' ? 'ऑफ़लाइन' : 'Offline')}
            </button>
          </div>

          <div style={{ position: 'relative', marginTop: 20, display: 'flex', alignItems: 'center', gap: 18 }}>
            <svg width="144" height="144" viewBox="0 0 144 144" role="img" aria-label={`${t.ringTitle}: ${Math.round(DEMO_RATE * 100)}% (${t.demo})`}>
              <circle cx="72" cy="72" r={R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="14" />
              <circle
                cx="72"
                cy="72"
                r={R}
                fill="none"
                stroke="var(--ms-orange)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - DEMO_RATE)}
                transform="rotate(-90 72 72)"
              />
              <text x="72" y="82" textAnchor="middle" fontSize="34" fontWeight="800" fill="#fff">
                {Math.round(DEMO_RATE * 100)}%
              </text>
            </svg>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{t.ringTitle}</p>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 10,
                  padding: '4px 12px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 800,
                  background: '#fff1c9',
                  color: '#8a6200',
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
            background: 'var(--ms-surface)',
            borderRadius: '36px 36px 0 0',
            padding: '24px 20px 28px',
          }}
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {STAT_STYLE.map((s, i) => (
              <li
                key={i}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: 92,
                  padding: 12,
                  borderRadius: 20,
                  background: s.bg,
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                <span aria-hidden style={{ position: 'absolute', top: -22, right: -18, width: 64, height: 64, borderRadius: '50%', background: s.blob, opacity: 0.55 }} />
                <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{s.n}</span>
                <span style={{ marginTop: 3, fontSize: 12.5, fontWeight: 700, lineHeight: 1.2 }}>{t.stats[i]}</span>
              </li>
            ))}
          </ul>

          <h2 style={{ margin: '24px 0 0', fontSize: 22, fontWeight: 800 }}>{t.listTitle}</h2>

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
            <p style={{ margin: '32px 0', textAlign: 'center', color: 'var(--ms-muted)', fontSize: 14.5 }}>{t.empty}</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 12 }}>
              {rows.map((r) => (
                <li
                  key={r.id}
                  style={{ padding: 14, borderRadius: 22, border: '1px solid var(--ms-green-100)', background: 'var(--ms-bg)' }}
                >
                  <button
                    type="button"
                    onClick={() => onNavigate('/case')}
                    style={{ display: 'block', width: '100%', padding: 0, textAlign: 'left', border: 0, background: 'none', cursor: 'pointer', color: 'var(--ms-ink)' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 17, fontWeight: 800 }}>{r.name[lang]}</span>
                      <span style={{ flex: '0 0 auto', padding: '3px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 800, ...PILL[r.status] }}>
                        {t.status[r.status]}
                      </span>
                    </span>
                    <span style={{ display: 'block', marginTop: 3, fontSize: 13, color: 'var(--ms-muted)' }}>
                      {lang === 'hi' ? VILLAGE_HI[r.village] : r.village}
                      {' / '}
                      {t.mitaninPrefix} {lang === 'hi' ? MITANIN_HI[r.mitanin] : r.mitanin}
                    </span>
                    <span style={{ display: 'block', marginTop: 8, fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>{r.reason[lang]}</span>
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
                          gap: 4,
                          padding: '0 4px',
                          borderRadius: 14,
                          cursor: 'pointer',
                          fontSize: lang === 'hi' ? 11.5 : 13,
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          border: i === 2 ? 0 : '2px solid var(--ms-green-500)',
                          background: i === 2 ? 'var(--ms-orange)' : 'var(--ms-surface)',
                          color: i === 2 ? '#fff' : 'var(--ms-green-700)',
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
      <div className="hidden @2xl:block" style={{ padding: '24px 28px 40px' }}>
        {/* Wide Header / Title */}
        <header style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--ms-ink)', lineHeight: 1.2 }}>{t.title}</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ms-muted)', fontWeight: 600 }}>
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
              background: online ? 'var(--ms-green-100)' : 'var(--ms-orange-100)',
              color: online ? 'var(--ms-green-900)' : 'var(--ms-orange-700)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: online ? 'var(--ms-green-500)' : 'var(--ms-orange)',
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
              background: 'var(--ms-green-700)',
              color: '#FFFFFF',
              borderRadius: 20,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              boxShadow: 'var(--ms-shadow-card)',
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
                <path d="M0 84C-42 44-34-22 0-66C34-22 42 44 0 84Z" fill="var(--ms-green-500)" />
              </g>
            </svg>
            <svg width="80" height="80" viewBox="0 0 144 144" role="img" aria-label={`${t.ringTitle}: ${Math.round(DEMO_RATE * 100)}%`}>
              <circle cx="72" cy="72" r={R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="15" />
              <circle
                cx="72"
                cy="72"
                r={R}
                fill="none"
                stroke="var(--ms-orange)"
                strokeWidth="15"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - DEMO_RATE)}
                transform="rotate(-90 72 72)"
              />
              <text x="72" y="81" textAnchor="middle" fontSize="30" fontWeight="800" fill="#fff">
                {Math.round(DEMO_RATE * 100)}%
              </text>
            </svg>
            <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, lineHeight: 1.25 }}>{t.ringTitle}</p>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 6,
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 800,
                  background: '#fff1c9',
                  color: '#8a6200',
                }}
              >
                {t.demo}
              </span>
            </div>
          </div>

          {/* Overdue, Due Soon, Awaiting Doctor Stat Cards */}
          {STAT_STYLE.map((s, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 20,
                background: s.bg,
                color: '#fff',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                minHeight: 104,
                boxShadow: 'var(--ms-shadow-card)',
              }}
            >
              <span aria-hidden style={{ position: 'absolute', top: -20, right: -16, width: 70, height: 70, borderRadius: '50%', background: s.blob, opacity: 0.55 }} />
              <span style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{s.n}</span>
              <span style={{ marginTop: 6, fontSize: 13.5, fontWeight: 700, lineHeight: 1.2 }}>{t.stats[i]}</span>
            </div>
          ))}
        </div>

        {/* Filters and Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--ms-ink)' }}>{t.listTitle}</h2>
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
          <div style={{ padding: '64px 20px', textAlign: 'center', background: 'var(--ms-surface)', borderRadius: 20, border: '1px solid var(--ms-border)' }}>
            <p style={{ margin: 0, color: 'var(--ms-muted)', fontSize: 16, fontWeight: 600 }}>{t.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 @2xl:grid-cols-12 @4xl:grid-cols-12 gap-6">
            {/* Priority List as a Table on the left (about two thirds) */}
            <div className="col-span-8 @2xl:col-span-7 @4xl:col-span-8" style={{ background: 'var(--ms-surface)', borderRadius: 24, border: '1px solid var(--ms-border)', boxShadow: 'var(--ms-shadow-card)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--ms-bg)', borderBottom: '1px solid var(--ms-border)' }}>
                    <th style={{ padding: '14px 18px', fontSize: 12.5, fontWeight: 800, color: 'var(--ms-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {lang === 'hi' ? 'मरीज़ / केस' : 'Patient / Case'}
                    </th>
                    <th style={{ padding: '14px 18px', fontSize: 12.5, fontWeight: 800, color: 'var(--ms-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {lang === 'hi' ? 'गाँव / मितानिन' : 'Village / Mitanin'}
                    </th>
                    <th style={{ padding: '14px 18px', fontSize: 12.5, fontWeight: 800, color: 'var(--ms-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {lang === 'hi' ? 'कारण' : 'Reason'}
                    </th>
                    <th style={{ padding: '14px 18px', fontSize: 12.5, fontWeight: 800, color: 'var(--ms-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {lang === 'hi' ? 'स्थिति' : 'Status'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isSelected = selectedRow?.id === r.id;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedId(r.id);
                          }
                        }}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? 'var(--ms-mint)' : 'transparent',
                          borderBottom: '1px solid var(--ms-border)',
                          transition: 'background 0.15s ease',
                          outline: 'none',
                        }}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: isSelected ? 'var(--ms-forest)' : 'var(--ms-ink)', display: 'block' }}>
                            {r.name[lang]}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--ms-muted)', fontWeight: 600 }}>
                            {r.id.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontSize: 13.5, color: 'var(--ms-ink)', fontWeight: 700, display: 'block' }}>
                            {lang === 'hi' ? VILLAGE_HI[r.village] : r.village}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--ms-muted)', fontWeight: 600 }}>
                            {t.mitaninPrefix} {lang === 'hi' ? MITANIN_HI[r.mitanin] : r.mitanin}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: 13.5, fontWeight: 600, color: 'var(--ms-ink)', maxWidth: 220 }}>
                          {r.reason[lang]}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800, ...PILL[r.status] }}>
                            {t.status[r.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Case Detail Panel on the right (~1/3) with Call, Remind, Escalate */}
            <div className="col-span-4 @2xl:col-span-5 @4xl:col-span-4">
              {selectedRow ? (
                <div
                  style={{
                    background: 'var(--ms-surface)',
                    borderRadius: 24,
                    border: '1px solid var(--ms-border)',
                    boxShadow: 'var(--ms-shadow-card)',
                    padding: '24px 22px',
                    position: 'sticky',
                    top: 88,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingBottom: 16, borderBottom: '1px solid var(--ms-border)' }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ms-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {lang === 'hi' ? 'केस विवरण' : 'Case Details'}
                      </span>
                      <h3 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: 'var(--ms-ink)' }}>
                        {selectedRow.name[lang]}
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ms-muted)' }}>
                        {lang === 'hi' ? VILLAGE_HI[selectedRow.village] : selectedRow.village}
                        {' • '}
                        {t.mitaninPrefix} {lang === 'hi' ? MITANIN_HI[selectedRow.mitanin] : selectedRow.mitanin}
                      </p>
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800, ...PILL[selectedRow.status] }}>
                      {t.status[selectedRow.status]}
                    </span>
                  </div>

                  <div style={{ padding: '16px 0', borderBottom: '1px solid var(--ms-border)' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ms-muted)', textTransform: 'uppercase' }}>
                      {lang === 'hi' ? 'आवश्यक कार्रवाई / कारण:' : 'Priority Reason:'}
                    </span>
                    <p style={{ margin: '6px 0 0', fontSize: 14.5, fontWeight: 700, color: 'var(--ms-ink)', lineHeight: 1.4 }}>
                      {selectedRow.reason[lang]}
                    </p>
                  </div>

                  {/* Call, Remind, Escalate Actions */}
                  <div style={{ marginTop: 20 }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ms-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
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
                            border: i === 2 ? 0 : '2px solid var(--ms-green-500)',
                            background: i === 2 ? 'var(--ms-orange)' : 'var(--ms-surface)',
                            color: i === 2 ? '#fff' : 'var(--ms-green-700)',
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
                        border: '1.5px solid var(--ms-border)',
                        background: 'var(--ms-bg)',
                        color: 'var(--ms-forest)',
                        fontSize: 13.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      <span>{lang === 'hi' ? 'केस समयरेखा देखें' : 'View Full Case Timeline'}</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ) : null}
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
          background: 'var(--ms-green-900)',
          color: '#fff',
          boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25)',
          textAlign: 'center',
        }}
      >
        {toast}
      </div>
    </div>
  );
}

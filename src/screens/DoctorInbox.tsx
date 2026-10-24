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
  const { syncedCases, doctorReply } = useCaseStore();

  const caseList = useMemo(() => {
    return syncedCases.map((c) => ({
      id: c.id,
      patientId: c.patientId,
      name: c.name,
      village: typeof c.village === 'string' ? { en: c.village, hi: c.village } : c.village,
      symptoms: c.symptoms,
      waitingMin: c.waitingMin ?? 0,
      photo: Boolean(c.photo),
      photoData: c.photoData || (typeof c.photo === 'string' && c.photo.startsWith('data:image') ? c.photo : undefined),
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
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const list = useMemo(() => {
    const base = [...caseList].sort((a, b) => b.waitingMin - a.waitingMin);
    if (filter === 'over2h') return base.filter((c) => c.waitingMin > 120);
    if (filter === 'photos') return base.filter((c) => c.photo);
    return base;
  }, [caseList, filter]);

  const selectedCase = caseList.find((c) => c.id === selectedCaseId) || list[0] || caseList[0];

  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id);
    setScale(1);
    setRead(null);
    setAdvice('');
    setDecision(null);
    setSent(false);
  };

  const addChip = (text: string) => setAdvice((a) => (a.trim() ? `${a.trim()} ${text}` : text));

  const ready = read !== null && decision !== null && !sent;
  const send = () => {
    if (!ready) return;
    setSent(true);
    doctorReply(
      selectedCase.id || 'c1',
      advice || (lang === 'hi' ? 'बच्चे को बुखार और जाँच पॉज़िटिव है। कृपया आज ज़िला अस्पताल रेफ़र करें।' : 'The child has fever and a positive test. Please refer to the district hospital today and keep giving fluids on the way.'),
      decision ? tReview.decisions[decision] : (lang === 'hi' ? 'रेफ़र करें' : 'Refer'),
      read || undefined,
      online
    );
  };

  return (
    <div>
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

          {list.length === 0 ? (
            <p style={{ margin: '40px 20px', textAlign: 'center', color: 'var(--ms-muted)', fontSize: 14.5 }}>{t.empty}</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: '12px 20px 0', display: 'grid', gap: 12 }}>
              {list.map((c) => (
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
            {list.length === 0 ? (
              <p style={{ margin: '32px 0', textAlign: 'center', color: 'var(--ms-muted)', fontSize: 14 }}>{t.empty}</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                {list.map((c) => {
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
          </div>

          {/* Right Panel: Review Panel (about 65%) */}
          <div className="col-span-12 @2xl:col-span-8 @4xl:col-span-8" style={{ background: 'var(--ms-surface)', borderRadius: 24, border: '1px solid var(--ms-border)', boxShadow: 'var(--ms-shadow-card)', padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {selectedCase ? (
              <>
                {/* Review Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--ms-border)', paddingBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ms-forest)', letterSpacing: '0.04em' }}>
                      {tReview.caseNo} • {selectedCase.id.toUpperCase()}
                    </span>
                    <h2 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 800, color: 'var(--ms-ink)' }}>
                      {dataService.getPatientSummary(selectedCase.patientId, lang) || selectedCase.name[lang]}
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--ms-muted)', fontWeight: 600 }}>
                      {selectedCase.village[lang]} • {selectedCase.symptoms[lang]}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: 999,
                      fontSize: 12.5,
                      fontWeight: 800,
                      ...waitStyle(selectedCase.waitingMin),
                    }}
                  >
                    {selectedCase.waitingMin >= 60 ? `${Math.floor(selectedCase.waitingMin / 60)} ${t.hourUnit} ${selectedCase.waitingMin % 60} ${t.minuteUnit}` : `${selectedCase.waitingMin} ${t.minuteUnit}`}
                  </span>
                </div>

                {/* Large Test Photo */}
                <div style={{ display: 'grid', gridTemplateColumns: selectedCase.photo ? '1fr 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
                  {selectedCase.photo ? (
                    <div
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        aspectRatio: '4 / 3.2',
                        borderRadius: 22,
                        background: '#12241b',
                      }}
                    >
                      <svg
                        viewBox="0 0 300 255"
                        role="img"
                        aria-label={tReview.photoAlt}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          transform: `scale(${scale})`,
                          transformOrigin: 'center',
                          transition: 'transform 0.2s ease',
                        }}
                      >
                        <rect width="300" height="255" fill="#1c3a2b" />
                        <rect x="40" y="88" width="220" height="80" rx="14" fill="#f1f5f2" />
                        <rect x="58" y="106" width="42" height="44" rx="8" fill="#d9e2dc" />
                        <rect x="114" y="104" width="130" height="48" rx="8" fill="#fff" stroke="var(--ms-border)" />
                        <rect x="152" y="104" width="4" height="48" fill="#d9534f" />
                        <rect x="190" y="104" width="4" height="48" fill="#d9534f" />
                        <text x="152" y="98" fontSize="9" textAnchor="middle" fill="#6b7770">C</text>
                        <text x="192" y="98" fontSize="9" textAnchor="middle" fill="#6b7770">T</text>
                      </svg>

                      <div style={{ position: 'absolute', left: 12, bottom: 12, display: 'flex', gap: 8 }}>
                        {scale === 1 ? (
                          <button
                            type="button"
                            onClick={() => setScale(1.8)}
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
                            🔍 {lang === 'hi' ? 'ज़ूम करें' : 'Zoom In'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setScale(1)}
                            style={{
                              padding: '6px 14px',
                              border: 0,
                              borderRadius: 999,
                              cursor: 'pointer',
                              fontSize: 12.5,
                              fontWeight: 800,
                              background: '#fff',
                              color: 'var(--ms-green-900)',
                            }}
                          >
                            {tReview.reset}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '36px 20px',
                        borderRadius: 22,
                        background: 'var(--ms-bg)',
                        border: '2px dashed var(--ms-border)',
                        textAlign: 'center',
                        color: 'var(--ms-muted)',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t.noPhoto}</p>
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
                          {tReview.mitaninRead}
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
                          return (
                            <button
                              key={key}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              onClick={() => setRead(key)}
                              style={{
                                flex: 1,
                                border: 0,
                                cursor: 'pointer',
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
                    <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ms-muted)' }}>{tReview.recorded}</p>
                  </div>
                </div>

                {/* Symptoms */}
                <div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: 'var(--ms-ink)' }}>{tReview.symptomsTitle}</h3>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {tReview.symptoms.map((s) => (
                      <li
                        key={s}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          borderRadius: 12,
                          fontSize: 13.5,
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
                        {s}
                      </li>
                    ))}
                  </ul>
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
                    onChange={(e) => setAdvice(e.target.value)}
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
                            onClick={() => setDecision(key)}
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
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
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
  review: { en: enLocale.screens.DoctorReview, hi: hiLocale.screens.DoctorReview },
  inbox: { en: enLocale.screens.DoctorInbox, hi: hiLocale.screens.DoctorInbox },
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

const dist = (a: React.Touch, b: React.Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

export default function DoctorReview({ lang, online, onNavigate, onToggleOnline }: ScreenProps) {
  const t = COPY.review[lang];
  const tInbox = COPY.inbox[lang];
  const { doctorReply, syncedCases, getPatientSummary } = useCaseStore();

  const cases = useMemo(() => {
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

  // Wide mode split view state
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(CASES[0]?.id ?? 'c1');

  // Review form state
  const [scale, setScale] = useState(1);
  const [read, setRead] = useState<Read | null>(null);
  const [advice, setAdvice] = useState('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [sent, setSent] = useState(false);
  const pinch = useRef<{ d: number; s: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const list = useMemo(() => {
    const base = [...cases].sort((a, b) => b.waitingMin - a.waitingMin);
    if (filter === 'over2h') return base.filter((c) => c.waitingMin > 120);
    if (filter === 'photos') return base.filter((c) => c.photo);
    return base;
  }, [cases, filter]);

  const selectedCase = cases.find((c) => c.id === selectedCaseId) || list[0] || cases[0];

  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id);
    setScale(1);
    setRead(null);
    setAdvice('');
    setDecision(null);
    setSent(false);
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

  const addChip = (text: string) => setAdvice((a) => (a.trim() ? `${a.trim()} ${text}` : text));

  const ready = read !== null && decision !== null && !sent;
  const send = () => {
    if (!ready) return;
    setSent(true);
    doctorReply(
      selectedCase.id || 'c1',
      advice || (lang === 'hi' ? 'बच्चे को बुखार और जाँच पॉज़िटिव है। कृपया आज ज़िला अस्पताल रेफ़र करें।' : 'The child has fever and a positive test. Please refer to the district hospital today and keep giving fluids on the way.'),
      decision ? t.decisions[decision] : (lang === 'hi' ? 'रेफ़र करें' : 'Refer'),
      read || undefined,
      online
    );
    timer.current = window.setTimeout(() => onNavigate('/doctor/inbox'), 1800);
  };

  return (
    <div>
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
        <header
          style={{
            background: 'var(--ms-green-700)',
            color: '#fff',
            borderRadius: '0 0 32px 32px',
            padding: 'calc(22px + env(safe-area-inset-top, 0px)) 20px 24px',
          }}
        >
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, opacity: 0.85 }}>{t.caseNo}</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 800, lineHeight: 1.15 }}>{getPatientSummary(selectedCase?.patientId, lang) || selectedCase?.name[lang]}</h1>
        </header>

        <section style={{ padding: '18px 20px 0', display: 'grid', gap: 16 }}>
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              position: 'relative',
              overflow: 'hidden',
              aspectRatio: '4 / 3.4',
              borderRadius: 26,
              background: '#12241b',
              touchAction: 'pan-y',
            }}
          >
            {selectedCase.photoData ? (
              <img
                src={selectedCase.photoData}
                alt={t.photoAlt}
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
            ) : (
              <svg
                viewBox="0 0 300 255"
                role="img"
                aria-label={t.photoAlt}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  transform: `scale(${scale})`,
                  transformOrigin: 'center',
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
            )}

            {scale === 1 ? (
              <span
                style={{
                  position: 'absolute',
                  left: 12,
                  bottom: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: 'rgba(10, 30, 20, 0.65)',
                  color: '#fff',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M10 14 4 20M4 15v5h5M14 10l6-6M15 4h5v5" />
                </svg>
                {t.pinch}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setScale(1)}
                style={{
                  position: 'absolute',
                  left: 12,
                  bottom: 12,
                  padding: '8px 14px',
                  border: 0,
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 800,
                  background: '#fff',
                  color: 'var(--ms-green-900)',
                }}
              >
                {t.reset}
              </button>
            )}
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 24,
              background: 'var(--ms-surface)',
              boxShadow: '0 4px 16px rgba(31, 77, 56, 0.07)',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 14.5,
                fontWeight: 800,
                background: 'var(--ms-orange-100)',
                color: 'var(--ms-orange-700)',
              }}
            >
              {t.mitaninRead}
            </span>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span id="my-read" style={{ fontSize: 15.5, fontWeight: 800 }}>{t.myRead}</span>
              <div
                role="radiogroup"
                aria-labelledby="my-read"
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
                        border: 0,
                        cursor: 'pointer',
                        padding: '10px 18px',
                        minHeight: 48,
                        display: 'inline-flex',
                        alignItems: 'center',
                        borderRadius: 999,
                        fontSize: 15,
                        fontWeight: 800,
                        background: on ? (key === 'agree' ? 'var(--ms-green-500)' : 'var(--ms-orange)') : 'transparent',
                        color: on ? '#fff' : 'var(--ms-green-700)',
                      }}
                    >
                      {t.reads[key]}
                    </button>
                  );
                })}
              </div>
            </div>
            <p style={{ margin: '12px 2px 0', fontSize: 12.5, color: 'var(--ms-muted)' }}>{t.recorded}</p>
          </div>

          <div>
            <h2 style={{ margin: '2px 0 8px', fontSize: 18, fontWeight: 800 }}>{t.symptomsTitle}</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
              {t.symptoms.map((s) => (
                <li
                  key={s}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    borderRadius: 16,
                    fontSize: 15.5,
                    fontWeight: 600,
                    background: 'var(--ms-surface)',
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
                      background: 'var(--ms-green-500)',
                      color: '#fff',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label htmlFor="advice" style={{ display: 'block', marginBottom: 8, fontSize: 18, fontWeight: 800 }}>
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
                      border: '2px solid var(--ms-green-100)',
                      background: 'var(--ms-surface)',
                      color: 'var(--ms-green-700)',
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
              onChange={(e) => setAdvice(e.target.value)}
              placeholder={t.advicePlaceholder}
              rows={4}
              style={{
                width: '100%',
                resize: 'none',
                padding: '12px 14px',
                borderRadius: 18,
                border: '2px solid #e3e9e5',
                font: 'inherit',
                fontSize: 16,
                color: 'var(--ms-ink)',
                background: 'var(--ms-surface)',
              }}
            />
          </div>

          <div>
            <h2 id="decision" style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>{t.decisionTitle}</h2>
            <div role="radiogroup" aria-labelledby="decision" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
                      minHeight: 64,
                      borderRadius: 20,
                      cursor: 'pointer',
                      fontSize: 17,
                      fontWeight: 800,
                      border: `2px solid ${on ? 'var(--ms-green-700)' : '#e3e9e5'}`,
                      background: on ? 'var(--ms-green-700)' : 'var(--ms-surface)',
                      color: on ? '#fff' : 'var(--ms-ink)',
                    }}
                  >
                    {t.decisions[key]}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="ms-doctor-review-actions">
          <button
            type="button"
            disabled={!ready}
            onClick={send}
            style={{
              width: '100%',
              height: 62,
              border: 0,
              borderRadius: 22,
              cursor: ready ? 'pointer' : 'default',
              fontSize: 19,
              fontWeight: 800,
              background: sent ? 'var(--ms-green-500)' : ready ? 'var(--ms-orange)' : '#e3e9e5',
              color: sent || ready ? '#fff' : '#9aa7a0',
              boxShadow: ready ? '0 10px 22px rgba(240, 121, 75, 0.35)' : 'none',
            }}
          >
            {sent ? t.sent : t.send}
          </button>
        </div>
      </div>

      {/* ===================== WIDE SPLIT LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '24px 28px 40px' }}>
        {/* Top Header */}
        <header style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--ms-ink)', lineHeight: 1.2 }}>{tInbox.greeting}</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ms-muted)', fontWeight: 600 }}>
              {lang === 'hi' ? 'चिकित्सक इनबॉक्स एवं केस समीक्षा' : 'Doctor Inbox & Clinical Case Review'}
            </p>
          </div>
          {onToggleOnline && (
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
              {online ? tInbox.synced : tInbox.offline}
            </button>
          )}
        </header>

        {/* Split View: Case list (about 35%) on left, Review panel on right */}
        <div className="grid grid-cols-12 @md:grid-cols-12 @2xl:grid-cols-12 @4xl:grid-cols-12 gap-6" style={{ alignItems: 'start' }}>
          {/* Left Panel: Case List (about 35%) */}
          <div className="col-span-12 @2xl:col-span-4 @4xl:col-span-4" style={{ background: 'var(--ms-surface)', borderRadius: 24, border: '1px solid var(--ms-border)', boxShadow: 'var(--ms-shadow-card)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{tInbox.title}</h2>
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
            <div role="group" aria-label={tInbox.filterLabel} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
                    {tInbox.filters[key]}
                  </button>
                );
              })}
            </div>

            {/* Cases list */}
            {list.length === 0 ? (
              <p style={{ margin: '32px 0', textAlign: 'center', color: 'var(--ms-muted)', fontSize: 14 }}>{tInbox.empty}</p>
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
                        <Thumb has={c.photo} src={c.photoData} alt={tInbox.photoAlt} empty={tInbox.noPhoto} />
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
                              {c.waitingMin >= 60 ? `${Math.floor(c.waitingMin / 60)} ${tInbox.hourUnit}` : `${c.waitingMin} ${tInbox.minuteUnit}`}
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
                      {t.caseNo} • {selectedCase.id.toUpperCase()}
                    </span>
                    <h2 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 800, color: 'var(--ms-ink)' }}>
                      {getPatientSummary(selectedCase.patientId, lang) || selectedCase.name[lang]}
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
                    {selectedCase.waitingMin >= 60 ? `${Math.floor(selectedCase.waitingMin / 60)} ${tInbox.hourUnit} ${selectedCase.waitingMin % 60} ${tInbox.minuteUnit}` : `${selectedCase.waitingMin} ${tInbox.minuteUnit}`}
                  </span>
                </div>

                {/* Large Test Photo and Reads */}
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
                      {selectedCase.photoData ? (
                        <img
                          src={selectedCase.photoData}
                          alt={t.photoAlt}
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
                      ) : (
                        <svg
                          viewBox="0 0 300 255"
                          role="img"
                          aria-label={t.photoAlt}
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
                      )}

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
                            {t.reset}
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
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{tInbox.noPhoto}</p>
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
                          {t.mitaninRead}
                        </span>
                      </div>
                    </div>

                    <div style={{ paddingTop: 8, borderTop: '1px solid var(--ms-border)' }}>
                      <span id="doc-read-review-split" style={{ display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--ms-ink)', marginBottom: 8 }}>
                        {t.myRead}
                      </span>
                      <div
                        role="radiogroup"
                        aria-labelledby="doc-read-review-split"
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
                              {t.reads[key]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ms-muted)' }}>{t.recorded}</p>
                  </div>
                </div>

                {/* Symptoms */}
                <div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: 'var(--ms-ink)' }}>{t.symptomsTitle}</h3>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {t.symptoms.map((s) => (
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
                  <label htmlFor="review-split-advice" style={{ display: 'block', marginBottom: 8, fontSize: 16, fontWeight: 800 }}>
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
                    id="review-split-advice"
                    value={advice}
                    onChange={(e) => setAdvice(e.target.value)}
                    placeholder={t.advicePlaceholder}
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
                    <h3 id="review-split-decision" style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800 }}>
                      {t.decisionTitle}
                    </h3>
                    <div role="radiogroup" aria-labelledby="review-split-decision" style={{ display: 'flex', gap: 10 }}>
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
                      background: sent ? 'var(--ms-green-500)' : ready ? 'var(--ms-orange)' : '#e3e9e5',
                      color: sent || ready ? '#fff' : '#9aa7a0',
                      boxShadow: ready ? '0 8px 20px rgba(240, 121, 75, 0.35)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {sent ? t.sent : t.send}
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

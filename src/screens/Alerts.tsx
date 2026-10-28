import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { AlertTriangle, MessageSquare, CalendarClock, ChevronRight, ArrowRight, Bell, Check } from 'lucide-react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';
import { useCaseStore } from '../store/CaseStore';
import { useScreenDraft } from '../ScreenDraftContext';

type Kind = 'overdue' | 'replied' | 'followup';
type View = 'alerts' | 'empty';

interface Alert {
  id: string;
  kind: Kind;
  group: 'today' | 'earlier';
  text: Record<'en' | 'hi', string>;
  time: Record<'en' | 'hi', string>;
}

const ALERTS = dataService.getAlerts() as Alert[];
const COPY = { en: enLocale.screens.Alerts, hi: hiLocale.screens.Alerts } as const;

const COLORS = {
  page: '#F4F9F6',
  card: '#FFFFFF',
  green: '#235347',
  greenTint: '#DAF1DE',
  red: '#BA1A1A',
  redTint: '#FFDAD6',
  amber: '#8A5A00',
  amberTint: '#FFF1CC',
  ink: '#00201C',
  muted: '#404945',
  border: '#E3ECE7',
};

const KIND_STYLE: Record<Kind, { stripe: string; tint: string; fg: string }> = {
  overdue: { stripe: '#BA1A1A', tint: '#FFDAD6', fg: '#BA1A1A' },
  replied: { stripe: '#235347', tint: '#DAF1DE', fg: '#235347' },
  followup: { stripe: '#8A5A00', tint: '#FFF1CC', fg: '#8A5A00' },
};

const KIND_LABEL: Record<Kind, Record<'en' | 'hi', string>> = {
  overdue: { en: 'Late', hi: 'देरी' },
  replied: { en: 'Doctor replied', hi: 'डॉक्टर का जवाब' },
  followup: { en: 'Follow-up', hi: 'फ़ॉलो-अप' },
};

const KIND_ICON: Record<Kind, ReactElement> = {
  overdue: <AlertTriangle size={20} aria-hidden />,
  replied: <MessageSquare size={20} aria-hidden />,
  followup: <CalendarClock size={20} aria-hidden />,
};

function EmptyIllustration() {
  return (
    <svg viewBox="0 0 220 180" width="220" height="180" aria-hidden>
      <circle cx="110" cy="92" r="70" fill="#E7F0EA" />
      <circle cx="162" cy="40" r="14" fill="#DAF1DE" />
      <g transform="translate(110 96) rotate(-12) scale(0.95)">
        <path d="M0 62C-32 32-26-16 0-50C26-16 32 32 0 62Z" fill="#2E7D4F" />
        <path
          d="M0 62L0-38M0 30L-12 14M0 12L12-4"
          stroke="#E7F0EA"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </g>
      <g transform="translate(66 118) rotate(28) scale(0.5)">
        <path d="M0 62C-32 32-26-16 0-50C26-16 32 32 0 62Z" fill="#8EB69B" />
      </g>
      <circle cx="150" cy="128" r="22" fill="#235347" />
      <path
        d="m140 128 7 7 14-15"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="30" y="152" width="160" height="8" rx="4" fill="#235347" opacity="0.25" />
    </svg>
  );
}

export default function Alerts({ lang, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const {
    state,
    getPatientSummary,
    currentScreening,
    markAlertRead,
    setCurrentCaseId,
    selectScreeningPatient,
    createReferral,
  } = useCaseStore();
  const { selectedAlertId: draftAlertId, setSelectedAlertId: setDraftAlertId, currentRole, setSelectedDoctorCaseId, setSelectedSupervisorCaseId } = useScreenDraft();
  const patientId = currentScreening?.patientId || 'p1';
  const alertsList = state.alerts;
  const isDev = typeof window !== 'undefined' && window.location.search.includes('dev=1');
  const [view, setView] = useState<View>('alerts');
  const [selectedAlertId, setSelectedAlertIdState] = useState<string | null>(() => {
    if (draftAlertId && alertsList.some((a) => a.id === draftAlertId)) return draftAlertId;
    return alertsList[0]?.id ?? null;
  });

  const setSelectedAlertId = useCallback(
    (id: string | null) => {
      setSelectedAlertIdState(id);
      setDraftAlertId(id);
    },
    [setDraftAlertId]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const items = view === 'alerts' ? alertsList : [];

  const selectedAlert = items.find((a) => a.id === selectedAlertId) || items[0] || null;

  useEffect(() => {
    if (selectedAlert?.id && !selectedAlert.readAt) {
      markAlertRead(selectedAlert.id);
    }
  }, [selectedAlert?.id, markAlertRead]);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (items.length === 0) return;
      const curIdx = items.findIndex((a) => a.id === selectedAlertId);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = curIdx < items.length - 1 ? curIdx + 1 : 0;
        setSelectedAlertId(items[nextIdx].id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = curIdx > 0 ? curIdx - 1 : items.length - 1;
        setSelectedAlertId(items[prevIdx].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedAlertId, setSelectedAlertId]);

  const hasReferral = useCallback(
    (caseId: string, alertPatientId?: string) =>
      state.referrals.some((r) => r.caseId === caseId || (alertPatientId && r.patientId === alertPatientId)),
    [state.referrals]
  );

  const getFormattedTime = useCallback(
    (dateStr?: string) => {
      if (!dateStr) return lang === 'hi' ? 'अभी-अभी' : 'Just now';
      const target = new Date(dateStr).getTime();
      const now = Date.now() + (state.demoClockOffsetMinutes || 0) * 60 * 1000;
      const diffSec = Math.max(0, Math.floor((now - target) / 1000));
      if (diffSec < 60) return lang === 'hi' ? 'अभी-अभी' : 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return lang === 'hi' ? `${diffMin} मिनट पहले` : `${diffMin} min ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return lang === 'hi' ? `${diffHr} घंटे पहले` : `${diffHr} h ago`;
      const diffDay = Math.floor(diffHr / 24);
      return lang === 'hi' ? `${diffDay} दिन पहले` : `${diffDay} d ago`;
    },
    [state.demoClockOffsetMinutes, lang]
  );

  const getRoleKindLabel = (kind: Kind) => {
    if (currentRole === 'doctor') {
      if (kind === 'replied') return { en: 'Photo received', hi: 'फ़ोटो प्राप्त हुई' };
      if (kind === 'overdue') return { en: 'Late', hi: 'देरी' };
      return { en: 'New case', hi: 'नया केस' };
    }
    return KIND_LABEL[kind];
  };

  const handleViewReply = (a: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 500);

    markAlertRead(a.id);
    if (currentRole === 'doctor') {
      if (a.caseId) setSelectedDoctorCaseId(a.caseId);
      onNavigate('/doctor/review');
      return;
    }
    if (currentRole === 'supervisor') {
      if (a.caseId) setSelectedSupervisorCaseId(a.caseId);
      onNavigate('/case');
      return;
    }
    if (a.caseId) setCurrentCaseId(a.caseId);
    if (a.patientId) selectScreeningPatient(a.patientId);
    onNavigate('/mitanin/consult');
  };

  const handleSendToHospital = (a: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 500);

    markAlertRead(a.id);
    createReferral(a.caseId || 'c1', a.patientId || 'p1', { en: 'District hospital', hi: 'ज़िला अस्पताल' }, 24, true);
    onNavigate('/mitanin/referral');
  };

  return (
    <div
      style={{
        minHeight: '100%',
        background: COLORS.page,
        color: COLORS.ink,
        paddingBottom: 'var(--ms-screen-padding-bottom)',
      }}
    >
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
        <header
          className="on-dark-900"
          style={{
            background: '#051F20',
            color: '#FFFFFF',
            borderRadius: '0 0 24px 24px',
            padding: 'calc(20px + env(safe-area-inset-top, 0px)) 20px 22px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 800,
                lineHeight: 1.25,
                color: '#FFFFFF',
              }}
            >
              {t.title}
            </h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 999,
                background: '#FFDAD6',
                color: '#BA1A1A',
              }}
            >
              {items.length} {lang === 'hi' ? 'सूचनाएं' : 'Alerts'}
            </span>
          </div>
        </header>

        <section style={{ padding: '20px 18px 24px' }}>
          {isDev && (
            <div
              role="group"
              aria-label={t.demo}
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: COLORS.muted,
                }}
              >
                {t.demo}
              </span>

              <div
                style={{
                  display: 'flex',
                  padding: 4,
                  borderRadius: 999,
                  background: '#E9EDE7',
                  gap: 2,
                }}
              >
                {(['alerts', 'empty'] as const).map((key) => {
                  const on = view === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setView(key)}
                      className={`ms-btn ms-btn--chip ${on ? 'ms-btn--primary' : 'ms-btn--ghost'}`}
                      style={{
                        padding: '7px 13px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 750,
                        minHeight: 36,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.views[key]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <div
              style={{
                marginTop: 32,
                padding: '26px 18px 30px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 24,
                boxShadow: '0 5px 18px rgba(38, 50, 56, 0.04)',
              }}
            >
              <EmptyIllustration />
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: 18,
                  fontWeight: 750,
                  lineHeight: 1.4,
                  color: COLORS.ink,
                }}
              >
                {t.empty}
              </p>
            </div>
          ) : (
            (['today', 'earlier'] as const).map((group) => {
              const list = items.filter((a) => a.group === group);
              if (list.length === 0) return null;

              return (
                <div key={group} style={{ marginTop: 24 }}>
                  <h2
                    style={{
                      margin: '0 0 12px 2px',
                      fontSize: 16,
                      fontWeight: 750,
                      lineHeight: 1.4,
                      color: COLORS.ink,
                    }}
                  >
                    {t.groups[group]}
                  </h2>

                  <ul
                    style={{
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      display: 'grid',
                      gap: 12,
                    }}
                  >
                    {list.map((a) => {
                      const st = KIND_STYLE[a.kind];
                      const isDoctorReplied = a.type === 'doctor_replied' || a.kind === 'replied';

                      if (isDoctorReplied) {
                        const needsReferral = a.decision === 'send_to_hospital' && !hasReferral(a.caseId, a.patientId);
                        return (
                          <li key={a.id}>
                            <div
                              style={{
                                position: 'relative',
                                overflow: 'hidden',
                                width: '100%',
                                padding: '16px 16px 16px 20px',
                                textAlign: 'left',
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: 18,
                                background: COLORS.card,
                                color: COLORS.ink,
                                boxShadow: '0 4px 14px rgba(38, 50, 56, 0.045)',
                                boxSizing: 'border-box',
                              }}
                            >
                              <span
                                aria-hidden
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: 5,
                                  background: st.stripe,
                                }}
                              />

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span
                                    aria-hidden
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 10,
                                      display: 'grid',
                                      placeItems: 'center',
                                      background: st.tint,
                                      color: st.fg,
                                    }}
                                  >
                                    {KIND_ICON[a.kind]}
                                  </span>
                                  <div>
                                    <span style={{ fontSize: 14, fontWeight: 800, color: COLORS.ink }}>
                                      {a.doctorName || 'Dr. Rao'}
                                    </span>
                                    <span style={{ display: 'block', fontSize: 11.5, color: COLORS.muted }}>
                                      {getFormattedTime(a.repliedAt || a.createdAt)}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 10px',
                                    borderRadius: 999,
                                    fontSize: 11.5,
                                    fontWeight: 800,
                                    background: st.tint,
                                    color: st.fg,
                                  }}
                                >
                                  {a.decision === 'send_to_hospital'
                                    ? (lang === 'hi' ? 'अस्पताल भेजें' : 'Send to hospital')
                                    : (lang === 'hi' ? 'स्थानीय स्तर पर इलाज करें' : 'Treat locally')}
                                </span>
                              </div>

                              <p
                                style={{
                                  margin: '10px 0 14px',
                                  fontSize: 14.5,
                                  fontWeight: 600,
                                  lineHeight: 1.45,
                                  color: COLORS.ink,
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                {a.advice || a.text[lang]}
                              </p>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => handleViewReply(a)}
                                  className="ms-btn ms-btn--primary ms-btn--md"
                                  style={{
                                    minHeight: 48,
                                    padding: '0 18px',
                                    borderRadius: 14,
                                    fontSize: 14,
                                    fontWeight: 800,
                                  }}
                                >
                                  {lang === 'hi' ? 'जवाब देखें' : 'View reply'}
                                </button>

                                {needsReferral && (
                                  <button
                                    type="button"
                                    onClick={() => handleSendToHospital(a)}
                                    className="ms-btn ms-btn--danger ms-btn--md"
                                    style={{
                                      minHeight: 48,
                                      padding: '0 16px',
                                      borderRadius: 14,
                                      fontSize: 13.5,
                                      fontWeight: 800,
                                    }}
                                  >
                                    {lang === 'hi' ? 'अस्पताल भेजें' : 'Send to hospital'}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    markAlertRead(a.id);
                                    onNavigate('/case');
                                  }}
                                  className="ms-btn ms-btn--ghost ms-btn--md"
                                  style={{
                                    minHeight: 48,
                                    padding: '0 8px',
                                    fontSize: 13,
                                    fontWeight: 700,
                                  }}
                                >
                                  {lang === 'hi' ? 'समयरेखा' : 'Timeline'}
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      }

                      return (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => {
                              markAlertRead(a.id);
                              onNavigate('/case');
                            }}
                            className="ms-btn ms-btn--card"
                            style={{
                              position: 'relative',
                              overflow: 'hidden',
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '15px 13px 15px 17px',
                              textAlign: 'left',
                              borderRadius: 18,
                              minHeight: 78,
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: 5,
                                background: st.stripe,
                              }}
                            />

                            <span
                              aria-hidden
                              style={{
                                flex: '0 0 42px',
                                height: 42,
                                borderRadius: 13,
                                display: 'grid',
                                placeItems: 'center',
                                background: st.tint,
                                color: st.fg,
                              }}
                            >
                              {KIND_ICON[a.kind]}
                            </span>

                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: 14,
                                  fontWeight: 750,
                                  lineHeight: 1.45,
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {a.text[lang]}
                              </span>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  marginTop: 6,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: st.tint,
                                    color: st.fg,
                                  }}
                                >
                                  {getRoleKindLabel(a.kind)[lang]}
                                </span>
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: COLORS.muted,
                                  }}
                                >
                                  {getFormattedTime(a.repliedAt || a.createdAt)}
                                </span>
                              </div>
                            </span>

                            <ChevronRight size={18} color={COLORS.muted} style={{ flex: '0 0 auto' }} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </section>
      </div>

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px 48px' }}>
        <header style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: COLORS.ink }}>{t.title}</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: COLORS.muted, fontWeight: 600 }}>
              {lang === 'hi' ? 'महत्वपूर्ण सूचनाएं और केस अपडेट' : 'Important Alerts & Case Notifications'}
            </p>
          </div>

          {isDev && (
            <div
              style={{
                display: 'flex',
                padding: 4,
                borderRadius: 999,
                background: '#E9EDE7',
                gap: 2,
              }}
            >
              {(['alerts', 'empty'] as const).map((key) => {
                const on = view === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setView(key)}
                    className={`ms-btn ms-btn--chip ${on ? 'ms-btn--primary' : 'ms-btn--ghost'}`}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 750,
                    }}
                  >
                    {t.views[key]}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {items.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 24,
              boxShadow: 'var(--ms-shadow-card)',
            }}
          >
            <EmptyIllustration />
            <p style={{ margin: '16px 0 0', fontSize: 18, fontWeight: 750, color: COLORS.ink }}>{t.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 @md:grid-cols-12 @2xl:grid-cols-12 @4xl:grid-cols-12 gap-6" style={{ alignItems: 'start' }}>
            {/* List on the left (~50%) */}
            <div className="col-span-12 @2xl:col-span-6 @4xl:col-span-6">
              {(['today', 'earlier'] as const).map((group) => {
                const list = items.filter((a) => a.group === group);
                if (list.length === 0) return null;

                return (
                  <div key={group} style={{ marginBottom: 20 }}>
                    <h2 style={{ margin: '0 0 12px 4px', fontSize: 16, fontWeight: 750, color: COLORS.ink }}>
                      {t.groups[group]}
                    </h2>

                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                      {list.map((a) => {
                        const st = KIND_STYLE[a.kind];
                        const isSelected = selectedAlert?.id === a.id;

                        return (
                          <li key={a.id}>
                            <button
                              type="button"
                              onClick={() => {
                                markAlertRead(a.id);
                                setSelectedAlertId(a.id);
                              }}
                              className={`ms-btn ms-btn--card ${isSelected ? 'ms-btn--card-primary' : ''}`}
                              style={{
                                position: 'relative',
                                overflow: 'hidden',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '14px 16px',
                                textAlign: 'left',
                                borderRadius: 18,
                              }}
                            >
                              <span
                                aria-hidden
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: 5,
                                  background: st.stripe,
                                }}
                              />
                              <span
                                aria-hidden
                                style={{
                                  flex: '0 0 40px',
                                  height: 40,
                                  borderRadius: 12,
                                  display: 'grid',
                                  placeItems: 'center',
                                  background: st.tint,
                                  color: st.fg,
                                }}
                              >
                                {KIND_ICON[a.kind]}
                              </span>
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: 14, fontWeight: 750, lineHeight: 1.4 }}>
                                  {a.text[lang]}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                                  <span style={{ display: 'inline-block', padding: '1px 7px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, background: st.tint, color: st.fg }}>
                                    {getRoleKindLabel(a.kind)[lang]}
                                  </span>
                                  <span style={{ fontSize: 12, color: COLORS.muted }}>
                                    {a.time[lang]}
                                  </span>
                                </div>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Selected case on the right (~50%) */}
            <div className="col-span-12 @2xl:col-span-6 @4xl:col-span-6">
              {selectedAlert ? (
                <div
                  style={{
                    background: COLORS.card,
                    borderRadius: 24,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: 'var(--ms-shadow-card)',
                    padding: '24px 26px',
                    position: 'sticky',
                    top: 88,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 16, borderBottom: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        aria-hidden
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          display: 'grid',
                          placeItems: 'center',
                          background: KIND_STYLE[selectedAlert.kind].tint,
                          color: KIND_STYLE[selectedAlert.kind].fg,
                        }}
                      >
                        {KIND_ICON[selectedAlert.kind]}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: KIND_STYLE[selectedAlert.kind].fg }}>
                        {getRoleKindLabel(selectedAlert.kind)[lang]}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: COLORS.muted, fontWeight: 600 }}>
                      {getFormattedTime(selectedAlert.repliedAt || selectedAlert.createdAt)}
                    </span>
                  </div>

                  <p style={{ margin: '18px 0 10px', fontSize: 16.5, fontWeight: 700, lineHeight: 1.45, color: COLORS.ink }}>
                    {selectedAlert.text[lang]}
                  </p>

                  {(selectedAlert.type === 'doctor_replied' || selectedAlert.kind === 'replied') ? (
                    <>
                      <div
                        style={{
                          margin: '12px 0 16px',
                          padding: '14px 16px',
                          borderRadius: 16,
                          background: COLORS.page,
                          border: `1px solid ${COLORS.border}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase' }}>
                            {selectedAlert.doctorName || 'Dr. Rao'}
                          </span>
                          <span style={{ fontSize: 11.5, color: COLORS.muted }}>
                            {getFormattedTime(selectedAlert.repliedAt || selectedAlert.createdAt)}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.45, whiteSpace: 'pre-wrap', color: COLORS.ink }}>
                          {selectedAlert.advice || selectedAlert.text[lang]}
                        </p>
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: 999,
                            fontSize: 12.5,
                            fontWeight: 800,
                            background: KIND_STYLE.replied.tint,
                            color: KIND_STYLE.replied.fg,
                          }}
                        >
                          {selectedAlert.decision === 'send_to_hospital'
                            ? (lang === 'hi' ? 'अस्पताल भेजें' : 'Send to hospital')
                            : (lang === 'hi' ? 'स्थानीय स्तर पर इलाज करें' : 'Treat locally')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => handleViewReply(selectedAlert)}
                          className="ms-btn ms-btn--primary ms-btn--md ms-btn--block"
                          style={{
                            minHeight: 48,
                            borderRadius: 16,
                            fontSize: 15,
                            fontWeight: 800,
                          }}
                        >
                          <span>
                            {currentRole === 'doctor'
                              ? (lang === 'hi' ? 'केस समीक्षा करें' : 'Review case')
                              : (lang === 'hi' ? 'जवाब देखें' : 'View reply')}
                          </span>
                          <ArrowRight size={16} />
                        </button>

                        {selectedAlert.decision === 'send_to_hospital' && !hasReferral(selectedAlert.caseId, selectedAlert.patientId) && (
                          <button
                            type="button"
                            onClick={() => handleSendToHospital(selectedAlert)}
                            className="ms-btn ms-btn--danger ms-btn--md ms-btn--block"
                            style={{
                              minHeight: 48,
                              borderRadius: 16,
                              fontSize: 15,
                              fontWeight: 800,
                            }}
                          >
                            <span>{lang === 'hi' ? 'अस्पताल भेजें' : 'Send to hospital'}</span>
                            <ArrowRight size={16} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            markAlertRead(selectedAlert.id);
                            onNavigate('/case');
                          }}
                          className="ms-btn ms-btn--ghost ms-btn--md ms-btn--block"
                          style={{
                            padding: 8,
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          {lang === 'hi' ? 'समयरेखा' : 'Timeline'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ padding: '16px', borderRadius: 18, background: COLORS.page, border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase' }}>
                          {lang === 'hi' ? 'संबंधित मरीज़' : 'Associated Patient'}
                        </span>
                        <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 800, color: COLORS.green }}>
                          {getPatientSummary(selectedAlert.patientId || patientId, lang)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          markAlertRead(selectedAlert.id);
                          if (currentRole === 'doctor') {
                            if (selectedAlert.caseId) setSelectedDoctorCaseId(selectedAlert.caseId);
                            onNavigate('/doctor/review');
                          } else {
                            onNavigate('/case');
                          }
                        }}
                        className="ms-btn ms-btn--primary ms-btn--md ms-btn--block"
                        style={{
                          minHeight: 48,
                          borderRadius: 16,
                          fontSize: 15,
                          fontWeight: 800,
                        }}
                      >
                        <span>
                          {currentRole === 'doctor'
                            ? (lang === 'hi' ? 'केस समीक्षा करें' : 'Review case')
                            : (lang === 'hi' ? 'केस समयरेखा देखें' : 'View Case Timeline')}
                        </span>
                        <ArrowRight size={16} />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    background: COLORS.card,
                    borderRadius: 24,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: 'var(--ms-shadow-card)',
                    padding: '48px 24px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    color: COLORS.muted,
                  }}
                >
                  <Bell size={40} color="#707975" style={{ opacity: 0.5, marginBottom: 12 }} />
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: COLORS.ink }}>
                    {lang === 'hi' ? 'कोई सूचना चुनें' : 'Select an alert'}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: COLORS.muted }}>
                    {lang === 'hi' ? 'विवरण देखने के लिए बाईं सूची से सूचना चुनें' : 'Choose an alert from the left list to view details and advice'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { Plus, ArrowRight, Clock, Stethoscope, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { useCaseStore } from '../store/CaseStore';
import { CountUp, Reveal } from '../motion';

const COPY = { en: enLocale.screens.MitaninHome, hi: hiLocale.screens.MitaninHome } as const;

export default function MitaninHome({ lang, online, onNavigate, onToggleOnline }: ScreenProps) {
  const t = COPY[lang];
  const { state, getPriorityStats, setCurrentCaseId, selectScreeningPatient } = useCaseStore();
  const priorityStats = getPriorityStats();
  const priorityCounts = [
    priorityStats.overdueReferralsCount,
    priorityStats.followupsDueCount,
    priorityStats.awaitingDoctorCount,
  ];

  const repliedCasesWithoutReferral = useMemo(() => {
    return state.cases.filter((c) => {
      if (c.state === 'OUTCOME_RECORDED' || c.state === 'REACHED_FACILITY') return false;
      const con = state.consults.find((con) => con.caseId === c.id || con.patientId === c.patientId);
      const isReplied = con?.status === 'replied' || c.state === 'CONSULT_REPLIED';
      if (!isReplied) return false;
      const hasRef = state.referrals.some((r) => r.caseId === c.id || r.patientId === c.patientId);
      return !hasRef;
    });
  }, [state.cases, state.consults, state.referrals]);

  const handleViewReply = (c: any) => {
    if (c.id) setCurrentCaseId(c.id);
    if (c.patientId) selectScreeningPatient(c.patientId);
    onNavigate('/mitanin/consult');
  };

  const needsAttentionList = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      village: string;
      reason: string;
      statusPill: { label: string; className: string };
      actionLabel: string;
      onClick: () => void;
    }> = [];

    // 1. Replied cases without referral
    for (const c of repliedCasesWithoutReferral) {
      if (list.length >= 3) break;
      list.push({
        id: c.id,
        name: c.name[lang],
        village: typeof c.village === 'string' ? c.village : c.village[lang],
        reason: lang === 'hi' ? 'डॉक्टर का परामर्श प्राप्त हुआ' : 'Doctor advice received',
        statusPill: {
          label: lang === 'hi' ? 'जवाब' : 'Replied',
          className: 'ms-pill-ok',
        },
        actionLabel: lang === 'hi' ? 'जवाब देखें' : 'View reply',
        onClick: () => handleViewReply(c),
      });
    }

    // 2. Overdue referrals
    if (list.length < 3) {
      const overdueRefs = state.referrals.filter((r) => r.status === 'in_progress');
      for (const r of overdueRefs) {
        if (list.length >= 3) break;
        const patient = state.patients.find((p) => p.id === r.patientId);
        if (patient) {
          list.push({
            id: r.id,
            name: patient.name[lang],
            village: typeof patient.village === 'string' ? patient.village : patient.village[lang],
            reason: lang === 'hi' ? 'अस्पताल रेफरल लंबित' : 'Hospital referral overdue',
            statusPill: {
              label: lang === 'hi' ? 'विलंबित' : 'Late',
              className: 'ms-pill-late',
            },
            actionLabel: lang === 'hi' ? 'रेफरल देखें' : 'Track referral',
            onClick: () => {
              selectScreeningPatient(patient.id);
              onNavigate('/mitanin/referral');
            },
          });
        }
      }
    }

    // 3. Planned visits marked late
    if (list.length < 3) {
      for (const v of t.visits) {
        if (list.length >= 3) break;
        if (v.late) {
          list.push({
            id: v.name,
            name: v.name,
            village: v.village,
            reason: v.task,
            statusPill: {
              label: v.status,
              className: 'ms-pill-late',
            },
            actionLabel: lang === 'hi' ? 'दौरा देखें' : 'View visit',
            onClick: () => onNavigate('/mitanin/visits'),
          });
        }
      }
    }

    return list.slice(0, 3);
  }, [repliedCasesWithoutReferral, state.referrals, state.patients, lang, t.visits]);

  // Shared greeting card
  const renderGreetingCard = () => (
    <section className="ms-animate-fade"
      aria-label="Worker Profile"
      style={{
        background: 'var(--ms-card)',
        borderRadius: 'var(--ms-radius-md)',
        padding: '18px 20px',
        border: '1px solid var(--ms-border)',
        boxShadow: 'var(--ms-shadow)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            position: 'relative',
            width: 48,
            height: 48,
            borderRadius: 'var(--ms-radius-sm)',
            background: 'var(--ms-dark-900)',
            color: 'var(--ms-text-white)',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            flexShrink: 0,
          }}
        >
          <span>SN</span>
          <span
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'var(--ms-primary)',
              border: '2px solid var(--ms-card)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--ms-text-white)',
              fontSize: 9,
            }}
          >
            ✓
          </span>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--ms-text)', lineHeight: 1.2 }}>
              {t.greeting}
            </h2>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 'var(--ms-radius-pill)',
                background: 'var(--ms-mint)',
                color: 'var(--ms-primary)',
              }}
            >
              Mitanin (ASHA)
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ms-muted)', fontWeight: 500 }}>
            {lang === 'hi' ? 'कोदार बस्ती • उप-स्वास्थ्य केंद्र 04' : 'Kodar Basti • Sub-Center 04'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleOnline}
        className={`${online ? 'ms-pill-ok' : 'ms-pill-due'} ms-btn ms-btn--ghost ms-btn--sm @2xl:hidden`}
        style={{ cursor: 'pointer', padding: '6px 12px', fontSize: 12 }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: online ? 'var(--ms-primary)' : 'var(--ms-warn)' }} />
        <span>{online ? t.synced : t.offline}</span>
      </button>
    </section>
  );

  // Shared New Screening Button
  const renderNewScreeningButton = () => (
    <div className="ms-animate-hero-rise">
      <button
        type="button"
        onClick={() => onNavigate('/mitanin/screening/patient')}
        className="ms-btn ms-btn--hero ms-btn--block"
      >
        <span className="ms-btn--hero-left">
          <span className="ms-btn--hero-circle">
            <Plus size={22} strokeWidth={2.6} />
          </span>
          <span className="ms-btn--hero-label">{t.newScreening}</span>
        </span>
        <span className="ms-btn--hero-arrow">
          <ArrowRight size={22} />
        </span>
      </button>
    </div>
  );

  // Shared Needs Attention List
  const renderNeedsAttentionList = () => (
    <section
      aria-label={lang === 'hi' ? 'ध्यान देने योग्य' : 'Needs attention'}
      style={{
        background: 'var(--ms-card)',
        borderRadius: 'var(--ms-radius-md)',
        padding: '20px',
        border: '1px solid var(--ms-border)',
        boxShadow: 'var(--ms-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ms-text)' }}>
          {lang === 'hi' ? 'ध्यान देने योग्य' : 'Needs attention'}
        </h3>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ms-muted)' }}>
          {needsAttentionList.length} {lang === 'hi' ? 'मरीज' : 'cases'}
        </span>
      </div>

      {needsAttentionList.length === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            background: 'var(--ms-surface-alt)',
            borderRadius: 'var(--ms-radius-sm)',
            color: 'var(--ms-muted)',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {lang === 'hi' ? 'कोई मामला लंबित नहीं है' : 'All caught up! No urgent alerts.'}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {needsAttentionList.map((item, idx) => (
            <Reveal
              as="li"
              index={idx}
              key={item.id}
              style={{
                background: 'var(--ms-surface-alt)',
                borderRadius: 'var(--ms-radius-sm)',
                padding: '12px 14px',
                border: '1px solid var(--ms-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ms-text)' }}>
                    {item.name}
                  </span>
                  <span className={item.statusPill.className} style={{ fontSize: 11, padding: '2px 8px' }}>
                    {item.statusPill.label}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ms-muted)', marginTop: 3 }}>
                  {item.village} • {item.reason}
                </div>
              </div>
              <button
                type="button"
                onClick={item.onClick}
                className="ms-btn ms-btn--secondary ms-btn--row"
              >
                {item.actionLabel}
              </button>
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );

  // Shared Waiting for Doctor Count Card
  const renderWaitingForDoctorCard = () => (
    <button
      type="button"
      onClick={() => onNavigate('/mitanin/consult')}
      className="ms-btn ms-btn--card"
      style={{
        padding: '20px',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--ms-radius-sm)',
              background: 'var(--ms-mint)',
              color: 'var(--ms-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Stethoscope size={18} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ms-text)' }}>
            {lang === 'hi' ? 'डॉक्टर की प्रतीक्षा' : 'Waiting for doctor'}
          </span>
        </div>
        <span className="ms-pill-ok" style={{ fontSize: 11, padding: '3px 8px' }}>
          {lang === 'hi' ? 'समीक्षा' : 'Review'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <CountUp
          value={priorityCounts[2] ?? 0}
          className="tabular-nums"
          style={{ fontSize: 36, fontWeight: 900, color: 'var(--ms-primary)', lineHeight: 1 }}
        />
        <span style={{ fontSize: 13, color: 'var(--ms-muted)', fontWeight: 600 }}>
          {lang === 'hi' ? 'डॉक्टर के जवाब की प्रतीक्षा' : 'cases awaiting doctor reply'}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--ms-muted)', lineHeight: 1.4 }}>
        {lang === 'hi'
          ? 'मामले जिन पर डॉक्टर के जवाब की आवश्यकता है'
          : 'Screened cases submitted for doctor reply'}
      </p>
    </button>
  );

  // Shared Today's Visits List
  const renderTodaysVisitsList = () => (
    <section
      aria-label="Today's Visits"
      style={{
        background: 'var(--ms-card)',
        borderRadius: 'var(--ms-radius-md)',
        padding: '20px',
        border: '1px solid var(--ms-border)',
        boxShadow: 'var(--ms-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ms-text)' }}>
            {t.visitsTitle}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ms-muted)', fontWeight: 500 }}>
            {t.visitsSub}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('/mitanin/visits')}
          className="ms-btn ms-btn--ghost ms-btn--sm"
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--ms-primary)',
            cursor: 'pointer',
            padding: '4px 6px',
          }}
        >
          {lang === 'hi' ? 'सभी देखें →' : 'View all →'}
        </button>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {t.visits.map((v, idx) => (
          <Reveal as="li" index={idx} key={v.name}>
            <button
              type="button"
              onClick={() => onNavigate('/mitanin/visits')}
              className="ms-btn ms-btn--card"
              style={{
                padding: '12px 14px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ms-text)' }}>{v.name}</span>
                <span className={v.late ? 'ms-pill-late' : 'ms-pill-ok'} style={{ fontSize: 10.5, padding: '2px 7px' }}>
                  {v.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ms-muted)' }}>
                {v.village} • {v.task}
              </div>
            </button>
          </Reveal>
        ))}
      </ul>
    </section>
  );

  return (
    <div style={{ width: '100%' }}>
      {/* ─── Narrow Phone Layout (@md and below) ─── */}
      <div className="block @2xl:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 16px 32px' }}>
        {renderGreetingCard()}
        {renderNewScreeningButton()}

        {/* Doctor Replied Notice Banner (if any cases awaiting referral) */}
        {repliedCasesWithoutReferral.length > 0 && (
          <section
            style={{
              background: 'var(--ms-mint)',
              borderRadius: 'var(--ms-radius-md)',
              padding: '14px 16px',
              border: '1.5px solid var(--ms-sage)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="ms-pill-ok" style={{ fontSize: 11 }}>
                {lang === 'hi' ? 'डॉक्टर का जवाब' : 'Doctor replied'}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ms-primary)' }}>
                {lang === 'hi' ? 'कार्रवाई आवश्यक' : 'Action required'}
              </span>
            </div>

            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
              {repliedCasesWithoutReferral.map((c) => (
                <li
                  key={c.id}
                  style={{
                    background: 'var(--ms-card)',
                    borderRadius: 'var(--ms-radius-sm)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    border: '1px solid var(--ms-border)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 800, color: 'var(--ms-text)' }}>
                      {c.name[lang]}
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ms-muted)', marginTop: 2 }}>
                      {typeof c.village === 'string' ? c.village : c.village[lang]}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleViewReply(c)}
                    className="ms-btn ms-btn--secondary ms-btn--row"
                  >
                    {lang === 'hi' ? 'जवाब देखें' : 'View reply'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Priorities Section */}
        <section aria-label="Priorities" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ms-text)' }}>
              {t.prioTitle}
            </h2>
            <span style={{ fontSize: 12, color: 'var(--ms-muted)', fontWeight: 600 }}>
              {t.prioSub}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {/* Card 0: Overdue Referrals */}
            <button
              type="button"
              onClick={() => onNavigate('/mitanin/referral')}
              className="ms-btn ms-btn--card ms-btn--card-danger"
              style={{
                padding: '12px 8px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 96,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <AlertTriangle size={18} color="var(--ms-danger)" />
                <span className="ms-pill-late" style={{ fontSize: 10, padding: '2px 6px' }}>
                  {lang === 'hi' ? 'विलंबित' : 'Late'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--ms-danger)', lineHeight: 1 }}>
                  {priorityCounts[0] ?? 0}
                </span>
                <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: 'var(--ms-text)', lineHeight: 1.2 }}>
                  {t.priorities[0]}
                </p>
              </div>
            </button>

            {/* Card 1: Follow-ups Due */}
            <button
              type="button"
              onClick={() => onNavigate('/mitanin/visits')}
              className="ms-btn ms-btn--card ms-btn--card-warn"
              style={{
                padding: '12px 8px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 96,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Clock size={18} color="var(--ms-warn)" />
                <span className="ms-pill-due" style={{ fontSize: 10, padding: '2px 6px' }}>
                  {lang === 'hi' ? 'नियत' : 'Due'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--ms-warn)', lineHeight: 1 }}>
                  {priorityCounts[1] ?? 0}
                </span>
                <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: 'var(--ms-text)', lineHeight: 1.2 }}>
                  {t.priorities[1]}
                </p>
              </div>
            </button>

            {/* Card 2: Awaiting Doctor */}
            <button
              type="button"
              onClick={() => onNavigate('/mitanin/consult')}
              className="ms-btn ms-btn--card ms-btn--card-primary"
              style={{
                padding: '12px 8px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 96,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <CheckCircle size={18} color="var(--ms-primary)" />
                <span className="ms-pill-ok" style={{ fontSize: 10, padding: '2px 6px' }}>
                  {lang === 'hi' ? 'समीक्षा' : 'Review'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--ms-primary)', lineHeight: 1 }}>
                  {priorityCounts[2] ?? 0}
                </span>
                <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: 'var(--ms-text)', lineHeight: 1.2 }}>
                  {t.priorities[2]}
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* Planned Visits List Section */}
        {renderTodaysVisitsList()}
      </div>

      {/* ─── Wide Web Layout (@2xl and above: 2 columns) ─── */}
      <div className="hidden @2xl:block" style={{ padding: '8px 4px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
          {/* Left Column (~60%): Greeting, New Screening Button, Needs Attention List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {renderGreetingCard()}
            {renderNewScreeningButton()}
            {renderNeedsAttentionList()}
          </div>

          {/* Right Column (~40%): Waiting for Doctor Card, Today's Visits List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {renderWaitingForDoctorCard()}
            {renderTodaysVisitsList()}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { Search, Plus, ArrowRight, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';
import { useCaseStore } from '../store/CaseStore';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 16px 32px' }}>
      {/* Frontline Worker Card */}
      <section
        style={{
          background: 'var(--ms-card)',
          borderRadius: 'var(--ms-radius-md)',
          padding: '16px',
          border: '1px solid var(--ms-border)',
          boxShadow: 'var(--ms-shadow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              position: 'relative',
              width: 44,
              height: 44,
              borderRadius: 'var(--ms-radius-sm)',
              background: 'var(--ms-dark-900)',
              color: 'var(--ms-text-white)',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            <span>SN</span>
            <span
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: 'var(--ms-primary)',
                border: '2px solid var(--ms-card)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--ms-text-white)',
                fontSize: 8,
              }}
            >
              ✓
            </span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ms-text)', lineHeight: 1.2 }}>
                {t.greeting}
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--ms-radius-pill)',
                  background: 'var(--ms-mint)',
                  color: 'var(--ms-primary)',
                }}
              >
                Mitanin (ASHA)
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ms-muted)', fontWeight: 500 }}>
              {lang === 'hi' ? 'कोदार बस्ती • उप-स्वास्थ्य केंद्र 04' : 'Kodar Basti • Sub-Center 04'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleOnline}
          className={online ? 'ms-pill-ok' : 'ms-pill-due'}
          style={{ cursor: 'pointer', border: 0 }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: online ? 'var(--ms-primary)' : 'var(--ms-warn)' }} />
          <span>{online ? t.synced : t.offline}</span>
        </button>
      </section>

      {/* Primary Action Button: 56px height, high visual hierarchy */}
      <button
        type="button"
        onClick={() => onNavigate('/mitanin/screening/patient')}
        className="ms-btn-primary"
        style={{
          borderRadius: 'var(--ms-radius-md)',
          justifyContent: 'space-between',
          padding: '14px 18px',
          boxShadow: 'var(--ms-shadow)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--ms-radius-sm)',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={20} strokeWidth={2.6} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.2px' }}>{t.newScreening}</span>
        </div>
        <ArrowRight size={20} />
      </button>

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
            <span className="ms-pill-due" style={{ fontSize: 11 }}>
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
                  className="ms-btn-primary"
                  style={{
                    width: 'auto',
                    minHeight: 40,
                    padding: '8px 14px',
                    fontSize: 13,
                    borderRadius: 'var(--ms-radius-sm)',
                  }}
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
          {/* Card 0: Overdue Referrals (Late / Red status) */}
          <button
            type="button"
            onClick={() => onNavigate('/mitanin/referral')}
            style={{
              background: 'var(--ms-card)',
              border: '1.5px solid var(--ms-danger)',
              borderRadius: 'var(--ms-radius-md)',
              padding: '12px 8px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 96,
              boxShadow: 'var(--ms-shadow)',
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

          {/* Card 1: Follow-ups Due (Due soon / Amber status) */}
          <button
            type="button"
            onClick={() => onNavigate('/mitanin/visits')}
            style={{
              background: 'var(--ms-card)',
              border: '1.5px solid var(--ms-warn)',
              borderRadius: 'var(--ms-radius-md)',
              padding: '12px 8px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 96,
              boxShadow: 'var(--ms-shadow)',
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

          {/* Card 2: Awaiting Doctor (Consult / Primary status) */}
          <button
            type="button"
            onClick={() => onNavigate('/mitanin/consult')}
            style={{
              background: 'var(--ms-card)',
              border: '1.5px solid var(--ms-primary)',
              borderRadius: 'var(--ms-radius-md)',
              padding: '12px 8px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 96,
              boxShadow: 'var(--ms-shadow)',
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
      <section aria-label="Visits" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ms-text)' }}>
              {t.visitsTitle}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ms-muted)', fontWeight: 500 }}>
              {t.visitsSub}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/mitanin/visits')}
            style={{
              background: 'none',
              border: 0,
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ms-primary)',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            {lang === 'hi' ? 'सभी देखें →' : 'View all →'}
          </button>
        </div>

        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {t.visits.map((v) => (
            <li key={v.name}>
              <button
                type="button"
                onClick={() => onNavigate('/mitanin/visits')}
                style={{
                  width: '100%',
                  background: 'var(--ms-card)',
                  border: '1px solid var(--ms-border)',
                  borderRadius: 'var(--ms-radius-md)',
                  boxShadow: 'var(--ms-shadow)',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ms-text)' }}>{v.name}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ms-muted)', marginTop: 2 }}>
                      {v.village}
                    </span>
                  </div>
                  <span className={v.late ? 'ms-pill-late' : 'ms-pill-ok'}>
                    {v.status}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ms-text)',
                    background: 'var(--ms-surface-alt)',
                    padding: '6px 10px',
                    borderRadius: 'var(--ms-radius-sm)',
                  }}
                >
                  {v.task}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}


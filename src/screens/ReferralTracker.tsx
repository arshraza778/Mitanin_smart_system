import { useEffect, useRef, useState } from 'react';
import {
  PhoneCall,
  MapPin,
  ClipboardCheck,
  Check,
  Clock,
  AlertTriangle,
  Building2,
  UserCheck,
} from 'lucide-react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';
import { useCaseStore } from '../store/CaseStore';
import { formatTime } from '../domain/dateUtils';

type Outcome = 'completed' | 'rescheduled' | 'escalated' | 'unresolved';

const COPY = { en: enLocale.screens.ReferralTracker, hi: hiLocale.screens.ReferralTracker } as const;

const OUTCOME_STYLE: Record<Outcome, { bg: string; glyph: string }> = {
  completed: { bg: '#2E7D4F', glyph: '✓' },
  rescheduled: { bg: '#235347', glyph: '↻' },
  escalated: { bg: '#BA1A1A', glyph: '↑' },
  unresolved: { bg: '#707975', glyph: '?' },
};

const DEMO_MS_LEFT = (19 * 60 + 20) * 60_000;

const ACTION_ICONS = [
  <PhoneCall key="v" size={20} aria-hidden />,
  <MapPin key="r" size={20} aria-hidden />,
  <ClipboardCheck key="o" size={20} aria-hidden />,
];

export default function ReferralTracker({ lang, online = true }: ScreenProps) {
  const t = COPY[lang];
  const {
    getReferralByPatientId,
    referralAction,
    currentScreening,
    currentCaseId,
    state,
    getPatientSummary,
    getTransportRequestForCase,
    requestTransport,
  } = useCaseStore();
  const storeReferral =
    (currentCaseId ? state.referrals.find((r) => r.caseId === currentCaseId) : undefined) ||
    (currentScreening?.caseId ? state.referrals.find((r) => r.caseId === currentScreening.caseId) : undefined) ||
    (currentScreening?.patientId ? getReferralByPatientId(currentScreening.patientId) : undefined);
  const defaultReferral = dataService.getReferrals()[0];
  const referral = storeReferral
    ? {
        ...storeReferral,
        facility: storeReferral.facility || defaultReferral.facility,
        owner: storeReferral.owner || defaultReferral.owner,
      }
    : defaultReferral;

  const activeCase =
    (currentCaseId && state.cases.some((c) => c.id === currentCaseId)
      ? currentCaseId
      : undefined) ||
    (storeReferral?.caseId && state.cases.some((c) => c.id === storeReferral.caseId)
      ? storeReferral.caseId
      : undefined) ||
    (currentScreening?.caseId && state.cases.some((c) => c.id === currentScreening.caseId)
      ? currentScreening.caseId
      : undefined) ||
    (('caseId' in referral && typeof (referral as any).caseId === 'string' && state.cases.some((c) => c.id === (referral as any).caseId))
      ? (referral as any).caseId
      : undefined);

  const caseId = activeCase;
  const transportReq = getTransportRequestForCase(caseId);
  const [transportNote, setTransportNote] = useState('');

  const referralValues = [getPatientSummary(referral.patientId, lang), referral.facility[lang], referral.owner[lang], t.dueWithin];
  const [stage, setStage] = useState(() => storeReferral?.stage ?? 1);
  const [outcome, setOutcome] = useState<Outcome | null>(() => (storeReferral?.outcome as Outcome) ?? null);
  const [sheet, setSheet] = useState(false);
  const [pick, setPick] = useState<Outcome | null>(() => (storeReferral?.outcome as Outcome) ?? null);
  const [note, setNote] = useState('');
  const deadline = useRef(Date.now() + DEMO_MS_LEFT);
  const [now, setNow] = useState(() => Date.now());
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (storeReferral) {
      if (storeReferral.stage) setStage(storeReferral.stage);
      if (storeReferral.outcome) setOutcome(storeReferral.outcome as Outcome);
    }
  }, [storeReferral]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!sheet) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  const msLeft = Math.max(0, deadline.current - now);
  const h = Math.floor(msLeft / 3_600_000);
  const m = Math.floor((msLeft % 3_600_000) / 60_000);

  const advance = (to: number) => {
    setStage((s) => Math.max(s, to));
    if (to === 2) {
      referralAction(referral.id, 'reminder', undefined, undefined, online);
    } else if (to === 3) {
      referralAction(referral.id, 'reached_facility', undefined, undefined, online);
    }
  };

  const saveOutcome = () => {
    if (!pick) return;
    setOutcome(pick);
    setStage(4);
    setSheet(false);
    referralAction(referral.id, 'outcome', pick as any, note, online);
  };

  // Action state: reminder, reached, outcome.
  const doneFlags = [stage >= 2, stage >= 3, stage >= 4];
  const nextIdx = doneFlags.findIndex((d) => !d);
  const handlers = [() => advance(2), () => advance(3), () => { setPick(outcome); setSheet(true); }];

  const pill = (() => {
    if (stage === 4 && outcome) {
      const s = outcome === 'completed'
        ? ['#DAF1DE', '#235347']
        : outcome === 'rescheduled'
        ? ['#E7F0EA', '#163832']
        : ['#FFDAD6', '#BA1A1A'];
      return { text: t.outcomes[outcome], bg: s[0], fg: s[1] };
    }
    const colors = [
      ['#FFDAD6', '#BA1A1A'],
      ['#FFF1CC', '#8A5A00'],
      ['#DAF1DE', '#235347'],
    ][Math.min(stage, 3) - 1];
    return { text: t.steps[stage - 1], bg: colors[0], fg: colors[1] };
  })();

  // Render Referral Details Card
  const renderReferralCard = () => (
    <div
      style={{
        padding: 20,
        borderRadius: 20,
        background: '#FFFFFF',
        border: '1px solid #E3ECE7',
        boxShadow: '0 2px 8px rgba(0, 33, 17, 0.04)',
      }}
    >
      <dl style={{ margin: 0, display: 'grid', gap: 14 }}>
        {t.rows.map((label, i) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
            <dt style={{ fontSize: 13.5, fontWeight: 600, color: '#404945' }}>{label}</dt>
            <dd style={{ margin: 0, textAlign: 'right', fontSize: 15, fontWeight: 700, color: '#00201C' }}>
              {referralValues[i]}
              {i === 3 && (
                <span style={{ display: 'block', marginTop: 2, fontSize: 13, fontWeight: 700, color: stage >= 3 ? '#2E7D4F' : '#BA1A1A' }}>
                  {stage >= 3 ? t.done : `${h} ${t.hourUnit} ${m} ${t.minuteUnit} ${t.leftSuffix}`}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #E3ECE7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#404945' }}>{t.trackerLabel}</span>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            background: pill.bg,
            color: pill.fg,
          }}
        >
          {pill.text}
        </span>
      </div>
    </div>
  );

  // Render 4-step Progress Tracker
  const renderTracker = () => (
    <div
      style={{
        padding: 20,
        borderRadius: 20,
        background: '#FFFFFF',
        border: '1px solid #E3ECE7',
        boxShadow: '0 2px 8px rgba(0, 33, 17, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#00201C' }}>
          {t.trackerLabel}
        </h3>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#235347', background: '#DAF1DE', padding: '2px 8px', borderRadius: 999 }}>
          {lang === 'hi' ? `चरण ${stage} / 4` : `Step ${stage} of 4`}
        </span>
      </div>
      <ol
        aria-label={t.trackerLabel}
        style={{
          listStyle: 'none',
          margin: 0,
          padding: '8px 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
        }}
      >
        {t.steps.map((label, i) => {
          const done = i < stage;
          const isCurrent = i === stage - 1;
          return (
            <li
              key={label}
              aria-current={isCurrent ? 'step' : undefined}
              style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
            >
              {i > 0 && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: '50%',
                    width: '100%',
                    height: 2,
                    background: done ? '#2E7D4F' : '#CCD9D2',
                  }}
                />
              )}
              <span
                aria-hidden
                style={{
                  position: 'relative',
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: done ? '#2E7D4F' : isCurrent ? '#DAF1DE' : '#F1F5F3',
                  border: done ? 0 : isCurrent ? '2px solid #235347' : '1.5px solid #CCD9D2',
                  color: done ? '#FFFFFF' : '#235347',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {done ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  <span>{i + 1}</span>
                )}
              </span>
              <span style={{ marginTop: 8, padding: '0 2px', fontSize: lang === 'hi' ? 10.5 : 11.5, lineHeight: 1.25, wordBreak: 'break-word', maxWidth: '100%', fontWeight: isCurrent ? 700 : 600, color: done || isCurrent ? '#00201C' : '#707975' }}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );

  // Render Action Buttons
  const renderActions = () => (
    <div style={{ display: 'grid', gap: 10 }}>
      {t.actions.map((label, i) => {
        const done = doneFlags[i];
        const primary = i === nextIdx;
        return (
          <button
            key={label}
            type="button"
            disabled={done}
            aria-disabled={done}
            onClick={handlers[i]}
            className={`ms-btn ${primary ? 'ms-btn--primary' : 'ms-btn--secondary'} ms-btn--lg ms-btn--block`}
            style={{
              justifyContent: 'flex-start',
              padding: '0 18px',
              textAlign: 'left',
            }}
          >
            {ACTION_ICONS[i]}
            <span style={{ flex: 1 }}>{label}</span>
            {done && (
              <Check size={18} strokeWidth={2.5} aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );

  // Render Transport Block
  const renderTransportBlock = () => {
    if (stage >= 4 || !!outcome || !caseId) return null;
    return (
      <div
        style={{
          padding: 18,
          borderRadius: 20,
          background: 'var(--ms-card)',
          border: '1px solid var(--ms-border)',
          boxShadow: 'var(--ms-shadow-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ms-text)' }}>
            {t.transportTitle}
          </h2>
          {transportReq && (
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background:
                  transportReq.status === 'arranged'
                    ? 'var(--ms-mint)'
                    : transportReq.status === 'cannot_arrange'
                    ? 'var(--ms-danger-bg)'
                    : 'var(--ms-warn-bg)',
                color:
                  transportReq.status === 'arranged'
                    ? 'var(--ms-primary)'
                    : transportReq.status === 'cannot_arrange'
                    ? 'var(--ms-danger)'
                    : 'var(--ms-warn)',
              }}
            >
              {transportReq.status === 'arranged'
                ? t.transportStatusArranged
                : transportReq.status === 'cannot_arrange'
                ? t.transportStatusCannotArrange
                : t.transportStatusRequested}
            </span>
          )}
        </div>

        {transportReq ? (
          <div>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--ms-text)' }}>
              {transportReq.status === 'arranged'
                ? t.transportStatusArranged
                : transportReq.status === 'cannot_arrange'
                ? t.transportStatusCannotArrange
                : t.transportStatusRequested}
            </p>
            {transportReq.note ? (
              <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ms-muted)', wordBreak: 'break-word' }}>
                {transportReq.note}
              </p>
            ) : null}
            <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--ms-muted)', fontWeight: 600 }}>
              {t.transportRequestedAt.replace('{time}', formatTime(transportReq.requestedAt, lang))}
            </p>
          </div>
        ) : (
          <div>
            <input
              type="text"
              maxLength={140}
              value={transportNote}
              onChange={(e) => setTransportNote(e.target.value)}
              placeholder={t.transportNotePlaceholder}
              aria-label={t.transportNotePlaceholder}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: 48,
                padding: '0 14px',
                borderRadius: 14,
                border: '1.5px solid var(--ms-border)',
                font: 'inherit',
                fontSize: 14.5,
                color: 'var(--ms-text)',
                background: 'var(--ms-card)',
              }}
            />
            <button
              type="button"
              onClick={() => {
                requestTransport({ caseId, note: transportNote, online });
                setTransportNote('');
              }}
              className="ms-btn ms-btn--secondary ms-btn--md ms-btn--block"
              style={{ minHeight: 48, marginTop: 10 }}
            >
              {t.requestTransport}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
        <header
          className="on-dark-900"
          style={{
            background: '#051F20',
            color: '#FFFFFF',
            borderRadius: '0 0 24px 24px',
            padding: 'calc(20px + env(safe-area-inset-top, 0px)) 20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#FFFFFF' }}>{t.title}</h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: '#FFDAD6', color: '#BA1A1A' }}>
              Ticket #{referral.id || 'REF-1'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#8EB69B' }}>
            {lang === 'hi' ? '108 आपातकालीन सेवा समन्वय' : '108 Emergency Transport Coordination'}
          </p>
        </header>

        <section style={{ padding: '16px 16px 0', display: 'grid', gap: 14 }}>
          {renderReferralCard()}
          {renderTracker()}
          {renderTransportBlock()}
          {renderActions()}
        </section>
      </div>

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px 40px' }}>
        {/* Wide Header */}
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#00201C' }}>{t.title}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#404945', fontWeight: 600 }}>
            {lang === 'hi' ? 'उच्च सुविधा केंद्र रेफ़रल स्थिति एवं ट्रैकिंग' : 'Hospital Referral Status & Care Loop Tracking'}
          </p>
        </header>

        {/* Wide Layout: Referral card beside 4-step tracker on the left, Actions in a side panel on the right */}
        <div className="grid grid-cols-12 @md:grid-cols-12 @2xl:grid-cols-12 @4xl:grid-cols-12 gap-6" style={{ alignItems: 'start' }}>
          {/* Main Area: Referral card beside the 4-step tracker */}
          <div className="col-span-12 @2xl:col-span-8 @4xl:col-span-8">
            <div className="grid grid-cols-1 @md:grid-cols-2 @2xl:grid-cols-2 gap-6">
              <div>
                {renderReferralCard()}
              </div>
              <div>
                {renderTracker()}
                <div style={{ marginTop: 24 }}>
                  {renderTransportBlock()}
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel: Actions */}
          <div
            className="col-span-12 @2xl:col-span-4 @4xl:col-span-4"
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E3ECE7',
              boxShadow: '0 2px 8px rgba(0, 33, 17, 0.04)',
              padding: 22,
            }}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#00201C' }}>
              {lang === 'hi' ? 'कार्रवाई' : 'Next Actions'}
            </h2>
            {renderActions()}
          </div>
        </div>
      </div>

      {/* Outcome Sheet/Dialog (shared across narrow and wide) */}
      {sheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }}>
          <div
            onClick={() => setSheet(false)}
            aria-hidden
            style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.65)' }}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t.sheetTitle}
            tabIndex={-1}
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 0,
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: 440,
              maxHeight: '92dvh',
              overflowY: 'auto',
              padding: '16px 20px calc(24px + max(env(safe-area-inset-bottom, 0px), 16px))',
              borderRadius: '24px 24px 0 0',
              background: '#FFFFFF',
              boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.2)',
              outline: 'none',
            }}
          >
            <span aria-hidden style={{ display: 'block', width: 40, height: 4, margin: '0 auto 14px', borderRadius: 2, background: '#CCD9D2' }} />
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#00201C' }}>{t.sheetTitle}</h2>

            <div role="radiogroup" aria-label={t.sheetTitle} style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(Object.keys(OUTCOME_STYLE) as Outcome[]).map((key) => {
                const on = pick === key;
                const st = OUTCOME_STYLE[key];
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPick(key)}
                    className={`ms-btn ${on ? 'ms-btn--primary' : 'ms-btn--secondary'} ms-btn--md`}
                    style={{
                      minHeight: 80,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '10px 6px',
                      borderRadius: 16,
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 16,
                        lineHeight: 1,
                        background: on ? 'rgba(255, 255, 255, 0.28)' : st.bg,
                        color: '#FFFFFF',
                      }}
                    >
                      {st.glyph}
                    </span>
                    {t.outcomes[key]}
                  </button>
                );
              })}
            </div>

            <label style={{ display: 'block', marginTop: 16 }}>
              <span style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 700, color: '#00201C' }}>{t.note}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.notePlaceholder}
                rows={3}
                style={{
                  width: '100%',
                  resize: 'none',
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: '1px solid #CCD9D2',
                  font: 'inherit',
                  fontSize: 15,
                  color: '#00201C',
                  background: '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              />
            </label>

            <button
              type="button"
              disabled={!pick}
              aria-disabled={!pick}
              onClick={saveOutcome}
              className="ms-btn ms-btn--primary ms-btn--lg ms-btn--block"
              style={{ marginTop: 16 }}
            >
              {t.save}
            </button>
            <button
              type="button"
              onClick={() => setSheet(false)}
              className="ms-btn ms-btn--ghost ms-btn--md ms-btn--block"
              style={{
                marginTop: 8,
              }}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

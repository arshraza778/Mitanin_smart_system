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
  const { getReferralByPatientId, referralAction, currentScreening, getPatientSummary } = useCaseStore();
  const patientId = currentScreening?.patientId || 'p1';
  const storeReferral = getReferralByPatientId(patientId);
  const defaultReferral = dataService.getReferrals()[0];
  const referral = storeReferral
    ? {
        ...storeReferral,
        facility: storeReferral.facility || defaultReferral.facility,
        owner: storeReferral.owner || defaultReferral.owner,
      }
    : defaultReferral;

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
            onClick={handlers[i]}
            style={{
              minHeight: 56,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 18px',
              textAlign: 'left',
              borderRadius: 16,
              cursor: done ? 'default' : 'pointer',
              fontSize: 15,
              fontWeight: 700,
              border: primary ? 0 : `1.5px solid ${done ? '#E3ECE7' : '#CCD9D2'}`,
              background: primary ? '#235347' : done ? '#F8FAF9' : '#FFFFFF',
              color: primary ? '#FFFFFF' : done ? '#707975' : '#235347',
              boxShadow: primary ? '0 4px 14px rgba(35, 83, 71, 0.25)' : 'none',
              transition: 'all 0.15s ease',
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
          {renderActions()}
        </section>
      </div>

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '24px 28px 40px' }}>
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
              padding: '16px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
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
                    style={{
                      minHeight: 80,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '10px 6px',
                      borderRadius: 16,
                      cursor: 'pointer',
                      fontSize: 15,
                      fontWeight: 700,
                      border: `2px solid ${on ? st.bg : '#E3ECE7'}`,
                      background: on ? st.bg : '#F8FAF9',
                      color: on ? '#FFFFFF' : '#00201C',
                      transition: 'all 0.15s ease',
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
              onClick={saveOutcome}
              style={{
                marginTop: 16,
                width: '100%',
                height: 56,
                border: 0,
                borderRadius: 16,
                cursor: pick ? 'pointer' : 'default',
                fontSize: 16,
                fontWeight: 800,
                background: pick ? '#235347' : '#E3ECE7',
                color: pick ? '#FFFFFF' : '#707975',
              }}
            >
              {t.save}
            </button>
            <button
              type="button"
              onClick={() => setSheet(false)}
              style={{
                display: 'block',
                margin: '8px auto 0',
                padding: '10px 16px',
                border: 0,
                background: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 700,
                color: '#404945',
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

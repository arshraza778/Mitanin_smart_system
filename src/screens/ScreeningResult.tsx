import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  HelpCircle,
  Save,
  Send,
  User,
} from 'lucide-react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { useCaseStore } from '../store/CaseStore';
import { priority, hasDangerSigns } from '../domain/priority';
import States from './States';

const STEP = 4;

const COPY = { en: enLocale.screens.ScreeningResult, hi: hiLocale.screens.ScreeningResult } as const;

const SYMPTOM_LABELS: Record<string, { en: string; hi: string }> = {
  fever: { en: 'Fever for more than 2 days', hi: '2 दिन से ज़्यादा बुखार' },
  drink: { en: 'Unable to drink or feed', hi: 'पी या खा नहीं पा रहा' },
  fits: { en: 'Fits or convulsions', hi: 'दौरे आना' },
  sleepy: { en: 'Very sleepy or unconscious', hi: 'बहुत सुस्त या बेहोश' },
  palm: { en: 'Pale palms', hi: 'हथेलियाँ सफ़ेद' },
};

const DANGER_FLAGS = ['drink', 'fits', 'sleepy', 'palm'];

export default function ScreeningResult({ lang, online = true, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const {
    updateScreening,
    requestConsult,
    currentScreening,
    currentCaseId,
    getCase,
    getPatientSummary,
  } = useCaseStore();

  const caseId = currentScreening?.caseId || currentCaseId;
  const currentCase = caseId ? getCase(caseId) : undefined;

  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!currentCase) {
    return (
      <div style={{ padding: '24px 16px', paddingBottom: 'var(--ms-screen-padding-bottom)' }}>
        <States variant="empty" lang={lang}>
          <div style={{ marginTop: 8 }}>
            <p style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#00201C' }}>
              {t.caseNotFound}
            </p>
            <button
              type="button"
              className="ms-btn ms-btn--primary ms-btn--lg"
              onClick={() => onNavigate('/mitanin/home')}
            >
              {t.goToHome}
            </button>
          </div>
        </States>
      </div>
    );
  }

  const effectivePatientId = currentCase.patientId;
  const effectiveCaseId = currentCase.id;

  // Compute priority & danger signs using domain functions
  const isDanger = hasDangerSigns(currentCase);
  const prioResult = priority(currentCase);
  const isHigh = isDanger || prioResult.rank === 1;
  const isMedium = !isHigh && currentCase.testResult === 'positive';

  const priorityText = isHigh
    ? t.priorityHigh
    : isMedium
      ? t.priorityMedium
      : t.priorityRoutine;

  const priorityBadgeStyle = isHigh
    ? { background: '#FFDAD6', color: '#BA1A1A' }
    : isMedium
      ? { background: '#FFF1CC', color: '#8A5A00' }
      : { background: '#DAF1DE', color: '#235347' };

  // What was measured: ticked symptoms & test result
  const measuredSymptomItems: string[] = [];
  if (Array.isArray(currentCase.symptomFlags) && currentCase.symptomFlags.length > 0) {
    for (const flag of currentCase.symptomFlags) {
      if (SYMPTOM_LABELS[flag]) {
        measuredSymptomItems.push(SYMPTOM_LABELS[flag][lang]);
      }
    }
  } else if (typeof currentCase.symptoms === 'object' && currentCase.symptoms) {
    const symStr = currentCase.symptoms[lang] || currentCase.symptoms.en;
    if (symStr && symStr.trim().length > 0) {
      measuredSymptomItems.push(symStr);
    }
  }

  if (measuredSymptomItems.length === 0) {
    measuredSymptomItems.push(t.noneOfTheseSigns);
  }

  const testResultText =
    currentCase.testResult === 'positive'
      ? t.testResultPositive
      : currentCase.testResult === 'negative'
        ? t.testResultNegative
        : currentCase.testResult === 'invalid'
          ? t.testResultInvalid
          : t.noTestDone;

  const whatMeasuredList = [...measuredSymptomItems, testResultText];

  // Why this priority
  let whyText = '';
  let actionText = '';

  if (isHigh) {
    const dangerSignNames: string[] = [];
    if (Array.isArray(currentCase.symptomFlags)) {
      for (const flag of currentCase.symptomFlags) {
        if (DANGER_FLAGS.includes(flag) && SYMPTOM_LABELS[flag]) {
          dangerSignNames.push(SYMPTOM_LABELS[flag][lang]);
        }
      }
    }
    if (dangerSignNames.length === 0 && Array.isArray((currentCase as any).dangerSigns)) {
      dangerSignNames.push(...((currentCase as any).dangerSigns as unknown[]).map(String));
    }
    const signsString =
      dangerSignNames.length > 0
        ? dangerSignNames.join(', ')
        : (lang === 'hi' ? 'ख़तरे के लक्षण' : 'danger signs');
    whyText = t.whyDangerSigns.replace('{signs}', signsString);
    actionText = t.actionDangerSigns;
  } else if (currentCase.testResult === 'positive') {
    whyText = t.whyPositiveTest;
    actionText = t.actionPositiveTest;
  } else if (currentCase.testResult === 'negative') {
    whyText = t.whyNegativeTest;
    actionText = t.actionNegativeTest;
  } else {
    whyText = t.whyNoTest;
    actionText = t.actionNoTest;
  }

  const handleAskDoctor = () => {
    updateScreening(
      {
        patientId: effectivePatientId,
        caseId: effectiveCaseId,
        state: 'SCREENED',
      },
      online
    );
    requestConsult(effectiveCaseId, effectivePatientId, online);
    onNavigate('/mitanin/consult');
  };

  const save = () => {
    if (saved) return;
    setSaved(true);
    updateScreening(
      {
        patientId: effectivePatientId,
        caseId: effectiveCaseId,
        state: 'SCREENED',
      },
      online
    );
    timer.current = window.setTimeout(() => onNavigate('/mitanin/home'), 3200);
  };

  const renderStepper = () => (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={4}
      aria-valuenow={STEP}
      aria-valuetext={`${t.stepOf}: ${t.steps[STEP - 1]}`}
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        padding: '12px 14px',
        border: '1px solid #E3ECE7',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {t.steps.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === STEP;
          const isDone = stepNum < STEP;

          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 48 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    background: isActive ? '#053C31' : isDone ? '#2E7D4F' : '#E3ECE7',
                    color: isActive || isDone ? '#FFFFFF' : '#404945',
                    boxShadow: isActive ? '0 0 0 4px rgba(142, 182, 155, 0.4)' : 'none',
                  }}
                >
                  {isDone ? <Check size={14} strokeWidth={3} /> : stepNum}
                </div>
                <span
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#053C31' : isDone ? '#2E7D4F' : '#404945',
                    textAlign: 'center',
                  }}
                >
                  {label}
                </span>
              </div>
              {i < 3 && (
                <div
                  style={{
                    height: 2,
                    flex: 1,
                    margin: '0 4px',
                    marginBottom: 16,
                    background: isDone ? '#2E7D4F' : '#E3ECE7',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPatientSummaryBar = () => (
    <div
      style={{
        marginTop: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 14,
        background: '#DAF1DE',
        border: '1px solid rgba(142, 182, 155, 0.4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#235347',
            color: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          <User size={18} />
        </div>
        <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#0B2B26', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getPatientSummary(effectivePatientId, lang)}
        </p>
      </div>
    </div>
  );

  const renderResultContent = () => (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Block 2: Why this priority */}
      <div
        style={{
          padding: 16,
          borderRadius: 16,
          background: '#FFFFFF',
          border: `1px solid ${isHigh ? '#FFDAD6' : '#E3ECE7'}`,
          boxShadow: isHigh ? '0 2px 8px rgba(186, 26, 26, 0.06)' : '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              background: priorityBadgeStyle.background,
              color: priorityBadgeStyle.color,
            }}
          >
            {isHigh && <AlertTriangle size={14} color="#BA1A1A" />}
            <span>{priorityText}</span>
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t.whyPriorityTitle}
          </span>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 600, lineHeight: 1.45, color: '#00201C' }}>
          {whyText}
        </p>
      </div>

      {/* Block 3: Suggested action */}
      <div
        style={{
          padding: 18,
          borderRadius: 18,
          background: '#053C31',
          color: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(5, 60, 49, 0.18)',
        }}
      >
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#C0EACC', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {t.actionLabel}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 800, lineHeight: 1.25, color: '#FFFFFF' }}>
          {actionText}
        </p>
        <span
          style={{
            marginTop: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            background: 'rgba(255, 255, 255, 0.15)',
            color: '#FFFFFF',
          }}
        >
          <HelpCircle size={14} color="#C0EACC" />
          <span>{t.rule}</span>
        </span>
      </div>

      {/* Block 1: What was measured */}
      <div style={{ marginTop: 4 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#163832', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {t.whatMeasuredTitle}
        </h3>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {whatMeasuredList.map((item, idx) => (
            <li
              key={`${item}-${idx}`}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                background: '#DAF1DE',
                color: '#235347',
                border: '1px solid rgba(142, 182, 155, 0.4)',
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div>
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
        {/* Header bar */}
        <header
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E3ECE7',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            padding: 'calc(12px + env(safe-area-inset-top, 0px)) 16px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => onNavigate('/mitanin/screening/test')}
              aria-label={t.stepOf}
              className="ms-btn ms-btn--ghost ms-btn--icon"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#051F20', lineHeight: 1.2 }}>
                {lang === 'hi' ? 'निष्कर्ष एवं कार्रवाई' : 'Result & Recommended Action'}
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707975', fontWeight: 500 }}>
                {t.stepOf}: {t.steps[STEP - 1]}
              </p>
            </div>
          </div>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 700,
              background: priorityBadgeStyle.background,
              color: priorityBadgeStyle.color,
            }}
          >
            {priorityText}
          </span>
        </header>

        <section style={{ padding: '16px 16px 100px' }}>
          {renderStepper()}
          {renderPatientSummaryBar()}

          <div style={{ marginTop: 16 }}>
            {renderResultContent()}
          </div>
        </section>

        {/* Sticky Bottom Actions */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            padding: '12px 16px calc(14px + env(safe-area-inset-bottom, 0px))',
            display: 'grid',
            gap: 10,
            background: '#FFFFFF',
            borderTop: '1px solid #E3ECE7',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
            zIndex: 25,
          }}
        >
          <button
            type="button"
            disabled={saved}
            aria-disabled={saved}
            onClick={handleAskDoctor}
            className="ms-btn ms-btn--primary ms-btn--lg ms-btn--block"
          >
            <Send size={18} />
            <span>{t.ask}</span>
          </button>
          <button
            type="button"
            disabled={saved}
            aria-disabled={saved}
            onClick={save}
            className="ms-btn ms-btn--secondary ms-btn--lg ms-btn--block"
          >
            <Save size={16} />
            <span>{t.save}</span>
          </button>
        </div>
      </div>

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '32px 24px 48px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <header
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E3ECE7',
              padding: '24px 28px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              marginBottom: 24,
            }}
          >
            {renderStepper()}
            <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#00201C' }}>
                  {lang === 'hi' ? 'निष्कर्ष एवं कार्रवाई' : 'Result & Recommended Action'}
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#707975', fontWeight: 500 }}>
                  {t.stepOf}: {t.steps[STEP - 1]}
                </p>
              </div>
              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: priorityBadgeStyle.background,
                  color: priorityBadgeStyle.color,
                }}
              >
                {priorityText}
              </span>
            </div>
          </header>

          <main
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.15fr)',
              gap: 28,
              alignItems: 'start',
            }}
          >
            {/* Left: Patient and What was measured */}
            <div style={{ display: 'grid', gap: 20 }}>
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  border: '1px solid #E3ECE7',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 800, color: '#00201C' }}>
                  {lang === 'hi' ? 'रोगी सारांश' : 'Patient Summary'}
                </h2>
                {renderPatientSummaryBar()}

                <div style={{ marginTop: 24 }}>
                  <h3
                    style={{
                      margin: '0 0 12px',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#163832',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {t.whatMeasuredTitle}
                  </h3>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {whatMeasuredList.map((item, idx) => (
                      <li
                        key={`${item}-${idx}`}
                        style={{
                          padding: '10px 16px',
                          borderRadius: 12,
                          fontSize: 13.5,
                          fontWeight: 600,
                          background: '#DAF1DE',
                          color: '#235347',
                          border: '1px solid rgba(142, 182, 155, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <CheckCircle2 size={16} color="#235347" style={{ flexShrink: 0 }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right: Why this priority, Suggested action, Buttons */}
            <div style={{ display: 'grid', gap: 20 }}>
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  border: '1px solid #E3ECE7',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'grid',
                  gap: 16,
                }}
              >
                {/* Block 2: Why this priority */}
                <div
                  style={{
                    padding: 18,
                    borderRadius: 16,
                    background: '#FFFFFF',
                    border: `1px solid ${isHigh ? '#FFDAD6' : '#E3ECE7'}`,
                    boxShadow: isHigh ? '0 2px 8px rgba(186, 26, 26, 0.06)' : '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 12px',
                        borderRadius: 999,
                        fontSize: 12.5,
                        fontWeight: 700,
                        background: priorityBadgeStyle.background,
                        color: priorityBadgeStyle.color,
                      }}
                    >
                      {isHigh && <AlertTriangle size={14} color="#BA1A1A" />}
                      <span>{priorityText}</span>
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t.whyPriorityTitle}
                    </span>
                  </div>
                  <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 600, lineHeight: 1.45, color: '#00201C' }}>
                    {whyText}
                  </p>
                </div>

                {/* Block 3: Suggested action */}
                <div
                  style={{
                    padding: 20,
                    borderRadius: 18,
                    background: '#053C31',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 16px rgba(5, 60, 49, 0.18)',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#C0EACC', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {t.actionLabel}
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 800, lineHeight: 1.25, color: '#FFFFFF' }}>
                    {actionText}
                  </p>
                  <span
                    style={{
                      marginTop: 14,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 12px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                    }}
                  >
                    <HelpCircle size={14} color="#C0EACC" />
                    <span>{t.rule}</span>
                  </span>
                </div>

                {/* Actions: Ask doctor, Save and decide later */}
                <div style={{ marginTop: 8, display: 'grid', gap: 12 }}>
                  <button
                    type="button"
                    disabled={saved}
                    aria-disabled={saved}
                    onClick={handleAskDoctor}
                    className="ms-btn ms-btn--primary ms-btn--md ms-btn--block"
                  >
                    <Send size={18} />
                    <span>{t.ask}</span>
                    <ArrowRight size={18} />
                  </button>
                  <button
                    type="button"
                    disabled={saved}
                    aria-disabled={saved}
                    onClick={save}
                    className="ms-btn ms-btn--secondary ms-btn--md ms-btn--block"
                  >
                    <Save size={16} />
                    <span>{t.save}</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  onClick={() => onNavigate('/mitanin/screening/test')}
                  className="ms-btn ms-btn--secondary ms-btn--md"
                >
                  <ArrowLeft size={18} />
                  <span>{lang === 'hi' ? 'पीछे' : 'Back'}</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>

      {saved && (
        <div
          role="status"
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'calc(110px + env(safe-area-inset-bottom, 0px))',
            width: 'min(calc(100% - 40px), 390px)',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            borderRadius: 16,
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.35,
            background: '#002111',
            color: '#FFFFFF',
            boxShadow: 'var(--ms-shadow-overlay)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#2E7D4F',
              color: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            <Check size={14} strokeWidth={3} />
          </span>
          <span>{t.toast}</span>
        </div>
      )}
    </div>
  );
}

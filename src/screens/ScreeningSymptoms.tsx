import { useEffect, useState, type ReactElement } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Droplets,
  Hand,
  Moon,
  Thermometer,
  User,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { useCaseStore } from '../store/CaseStore';
import { useScreenDraft } from '../ScreenDraftContext';
import States from './States';

const STEP = 2;

const COPY = { en: enLocale.screens.ScreeningSymptoms, hi: hiLocale.screens.ScreeningSymptoms } as const;

const SYMPTOM_ICONS: ReactElement[] = [
  <Thermometer key="fever" size={22} color="#235347" />,
  <Droplets key="drink" size={22} color="#235347" />,
  <Zap key="fits" size={22} color="#235347" />,
  <Moon key="sleepy" size={22} color="#235347" />,
  <Hand key="palm" size={22} color="#235347" />,
];

export default function ScreeningSymptoms({ lang, online = true, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const { updateScreening, getCase, currentScreening, getPatientSummary } = useCaseStore();
  const { getSymptomTicks, setSymptomTicks } = useScreenDraft();
  const patientId = currentScreening?.patientId;
  const caseId = currentScreening?.caseId;
  const existingCase = caseId ? getCase(caseId) : undefined;

  const [checked, setCheckedState] = useState<boolean[]>(() => {
    const draft = patientId ? getSymptomTicks(patientId) : null;
    if (draft && draft.length === t.items.length) {
      return draft;
    }
    if (existingCase?.symptomFlags?.length) {
      const flags = ['fever', 'drink', 'fits', 'sleepy', 'palm'];
      return flags.map((f) => existingCase.symptomFlags?.includes(f) ?? false);
    }
    return t.items.map(() => false);
  });

  const [noneSelected, setNoneSelected] = useState<boolean>(() => {
    if (existingCase && Array.isArray(existingCase.symptomFlags) && existingCase.symptomFlags.length === 0) {
      return true;
    }
    return false;
  });


  const [speaking, setSpeaking] = useState<number | null>(null);

  if (!patientId || !caseId) {
    return (
      <div style={{ padding: '24px 16px', paddingBottom: 'var(--ms-screen-padding-bottom)' }}>
        <States variant="empty" lang={lang}>
          <div style={{ marginTop: 8 }}>
            <p style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ms-ink)' }}>
              {lang === 'hi' ? 'केस नहीं मिला' : 'Case not found'}
            </p>
            <button
              type="button"
              className="ms-btn ms-btn--primary ms-btn--lg"
              onClick={() => onNavigate('/mitanin/home')}
            >
              {lang === 'hi' ? 'मुख्य पृष्ठ पर जाएँ' : 'Go to Home'}
            </button>
          </div>
        </States>
      </div>
    );
  }

  const toggle = (i: number) => {
    setNoneSelected(false);
    const next = checked.map((v, j) => (j === i ? !v : v));
    setCheckedState(next);
    if (patientId) setSymptomTicks(patientId, next);
  };

  const toggleNone = () => {
    const nextNone = !noneSelected;
    setNoneSelected(nextNone);
    if (nextNone) {
      const nextTicks = t.items.map(() => false);
      setCheckedState(nextTicks);
      if (patientId) setSymptomTicks(patientId, nextTicks);
    }
  };

  const canProceed = checked.some(Boolean) || noneSelected;

  const handleNext = () => {
    if (!canProceed) return;
    const flagNames = ['fever', 'drink', 'fits', 'sleepy', 'palm'];
    const selectedFlags = noneSelected
      ? []
      : (checked.map((c, i) => (c ? flagNames[i] : null)).filter(Boolean) as string[]);
    const selectedEn = noneSelected
      ? []
      : enLocale.screens.ScreeningSymptoms.items.filter((_, i) => checked[i]);
    const selectedHi = noneSelected
      ? []
      : hiLocale.screens.ScreeningSymptoms.items.filter((_, i) => checked[i]);
    const hasDanger = !noneSelected && Boolean(checked[1] || checked[2] || checked[3] || checked[4]);

    updateScreening(
      {
        patientId,
        caseId,
        symptoms: {
          en: selectedEn.join(', '),
          hi: selectedHi.join(', '),
        },
        symptomFlags: selectedFlags,
        hasDangerSigns: hasDanger,
        state: 'SCREENED',
      },
      online
    );
    onNavigate('/mitanin/screening/test');
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);
  useEffect(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(null);
  }, [lang]);

  const speak = (i: number) => {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    if (speaking === i) {
      synth.cancel();
      setSpeaking(null);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(t.items[i]);
    u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    u.rate = 0.9;
    u.onend = () => setSpeaking((cur) => (cur === i ? null : cur));
    u.onerror = u.onend;
    setSpeaking(i);
    synth.speak(u);
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

  const renderVerticalStepper = () => (
    <div role="group" aria-label="Screening steps" style={{ padding: '8px 0' }}>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
        {t.steps.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === STEP;
          const isDone = stepNum < STEP;
          const isLast = i === t.steps.length - 1;

          return (
            <li key={label} style={{ display: 'flex', gap: 16, position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 800,
                    background: isActive ? '#235347' : isDone ? '#DAF1DE' : '#F4F9F6',
                    color: isActive ? '#FFFFFF' : isDone ? '#235347' : '#707975',
                    border: `2px solid ${isActive ? '#235347' : isDone ? '#235347' : '#CCD9D2'}`,
                    flexShrink: 0,
                    zIndex: 2,
                  }}
                >
                  {isDone ? <Check size={18} strokeWidth={3} /> : stepNum}
                </span>
                {!isLast && (
                  <span
                    style={{
                      width: 2,
                      height: 48,
                      background: isDone ? '#235347' : '#E3ECE7',
                      margin: '4px 0',
                    }}
                  />
                )}
              </div>
              <div style={{ paddingTop: 6, paddingBottom: 24 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: isActive ? '#235347' : '#707975',
                  }}
                >
                  {t.stepOf} {stepNum}
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: 15,
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? '#00201C' : '#404945',
                    marginTop: 2,
                  }}
                >
                  {label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
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
          {getPatientSummary(patientId, lang)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onNavigate('/mitanin/screening/patient')}
        className="ms-btn ms-btn--ghost ms-btn--sm"
        style={{
          textDecoration: 'underline',
          padding: '4px 6px',
          flexShrink: 0,
        }}
      >
        {lang === 'hi' ? hiLocale.common.changePatient : enLocale.common.changePatient}
      </button>
    </div>
  );

  const renderSymptomsList = () => (
    <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 10 }}>
      {t.items.map((label, i) => {
        const on = checked[i];
        return (
          <li
            key={label}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              borderRadius: 16,
              background: on ? 'linear-gradient(to right, #FFFFFF, rgba(218, 241, 222, 0.25))' : '#FFFFFF',
              border: `2px solid ${on ? '#235347' : '#E3ECE7'}`,
              boxShadow: on ? '0 2px 10px rgba(35, 83, 71, 0.08)' : '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease',
            }}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(i)}
              className="ms-btn ms-btn--ghost"
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 12,
                padding: '12px 14px',
                textAlign: 'left',
                color: '#00201C',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${on ? '#235347' : '#707975'}`,
                  background: on ? '#235347' : '#FFFFFF',
                  color: '#FFFFFF',
                  flexShrink: 0,
                }}
              >
                {on && <Check size={16} strokeWidth={3} />}
              </span>
              <span style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>{SYMPTOM_ICONS[i]}</span>
              <span style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.35, color: '#00201C' }}>{label}</span>
            </button>
            <button
              type="button"
              onClick={() => speak(i)}
              aria-label={`${t.listen}: ${label}`}
              aria-pressed={speaking === i}
              className="ms-btn ms-btn--ghost ms-btn--icon"
              style={{
                flex: '0 0 52px',
                color: speaking === i ? '#235347' : '#707975',
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: speaking === i ? '#DAF1DE' : '#F8FAF9',
                  border: '1px solid #E3ECE7',
                }}
              >
                {speaking === i ? <VolumeX size={16} color="#235347" /> : <Volume2 size={16} />}
              </span>
            </button>
          </li>
        );
      })}

      <li
        style={{
          display: 'flex',
          alignItems: 'stretch',
          borderRadius: 16,
          background: noneSelected ? 'linear-gradient(to right, #FFFFFF, rgba(218, 241, 222, 0.25))' : '#FFFFFF',
          border: `2px solid ${noneSelected ? '#235347' : '#E3ECE7'}`,
          boxShadow: noneSelected ? '0 2px 10px rgba(35, 83, 71, 0.08)' : '0 1px 3px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease',
        }}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={noneSelected}
          onClick={toggleNone}
          className="ms-btn ms-btn--ghost"
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 12,
            padding: '12px 14px',
            textAlign: 'left',
            color: '#00201C',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${noneSelected ? '#235347' : '#707975'}`,
              background: noneSelected ? '#235347' : '#FFFFFF',
              color: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            {noneSelected && <Check size={16} strokeWidth={3} />}
          </span>
          <span style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.35, color: '#00201C' }}>
            {t.noneOfThese}
          </span>
        </button>
      </li>
    </ul>
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
              onClick={() => onNavigate('/mitanin/screening/patient')}
              aria-label={t.back}
              className="ms-btn ms-btn--ghost ms-btn--icon"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#051F20', lineHeight: 1.2 }}>
                {t.title}
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
              background: '#FFF1CC',
              color: '#8A5A00',
              border: '1px solid #FFF1CC',
            }}
          >
            {t.tag}
          </span>
        </header>

        <section style={{ padding: '16px 16px 100px' }}>
          {renderStepper()}
          {renderPatientSummaryBar()}

          <div style={{ marginTop: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#707975', fontWeight: 500 }}>{t.sub}</p>
            {renderSymptomsList()}
          </div>
        </section>

        {/* Sticky Bottom Actions */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            padding: '12px 16px calc(14px + max(env(safe-area-inset-bottom, 0px), 16px))',
            display: 'flex',
            gap: 12,
            background: '#FFFFFF',
            borderTop: '1px solid #E3ECE7',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
            zIndex: 25,
          }}
        >
          <button
            type="button"
            onClick={() => onNavigate('/mitanin/screening/patient')}
            className="ms-btn ms-btn--secondary ms-btn--lg"
          >
            <ArrowLeft size={18} />
            <span>{t.back}</span>
          </button>
          <button
            type="button"
            disabled={!canProceed}
            aria-disabled={!canProceed}
            onClick={handleNext}
            className="ms-btn ms-btn--primary ms-btn--lg ms-btn--block"
            style={{ flex: 1 }}
          >
            <span>{t.next}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '32px 24px 48px' }}>
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '240px minmax(0, 640px)',
            gap: 32,
            alignItems: 'start',
            justifyContent: 'center',
          }}
        >
          {/* Left vertical stepper */}
          <aside
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E3ECE7',
              padding: '24px 20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              position: 'sticky',
              top: 88,
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#235347',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {t.stepOf} {STEP} / 4
              </span>
              <h2 style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 800, color: '#00201C' }}>
                {t.steps[STEP - 1]}
              </h2>
            </div>
            {renderVerticalStepper()}
          </aside>

          {/* Right form card up to 640px */}
          <main
            style={{
              maxWidth: 640,
              width: '100%',
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E3ECE7',
              padding: '28px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            {renderPatientSummaryBar()}

            <div
              style={{
                marginTop: 20,
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#00201C' }}>{t.title}</h1>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#707975', fontWeight: 500 }}>{t.sub}</p>
              </div>
              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  background: '#FFF1CC',
                  color: '#8A5A00',
                  border: '1px solid #FFF1CC',
                }}
              >
                {t.tag}
              </span>
            </div>

            {renderSymptomsList()}

            <div
              style={{
                marginTop: 28,
                paddingTop: 20,
                borderTop: '1px solid #E3ECE7',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => onNavigate('/mitanin/screening/patient')}
                className="ms-btn ms-btn--secondary ms-btn--md"
              >
                <ArrowLeft size={18} />
                <span>{t.back}</span>
              </button>
              <button
                type="button"
                disabled={!canProceed}
                aria-disabled={!canProceed}
                onClick={handleNext}
                className="ms-btn ms-btn--primary ms-btn--md"
              >
                <span>{t.next}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

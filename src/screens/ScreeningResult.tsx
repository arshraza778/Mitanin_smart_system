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

const STEP = 4;

const COPY = { en: enLocale.screens.ScreeningResult, hi: hiLocale.screens.ScreeningResult } as const;

export default function ScreeningResult({ lang, online = true, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const { updateScreening, requestConsult, currentScreening, getPatientSummary } = useCaseStore();
  const patientId = currentScreening?.patientId || 'p1';
  const caseId = patientId === 'p1' ? 'c1' : `c-${patientId}`;
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleAskDoctor = () => {
    updateScreening(
      {
        patientId,
        state: 'SCREENED',
      },
      online
    );
    requestConsult(caseId, patientId, online);
    onNavigate('/mitanin/consult');
  };

  const save = () => {
    if (saved) return;
    setSaved(true);
    updateScreening(
      {
        patientId,
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
          {getPatientSummary(patientId, lang)}
        </p>
      </div>
    </div>
  );

  const renderResultContent = () => (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Urgency Alert Card */}
      <div
        style={{
          padding: 16,
          borderRadius: 16,
          background: '#FFFFFF',
          border: '1px solid #FFDAD6',
          boxShadow: '0 2px 8px rgba(186, 26, 26, 0.06)',
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
              background: '#FFDAD6',
              color: '#BA1A1A',
            }}
          >
            <AlertTriangle size={14} color="#BA1A1A" />
            <span>{t.priority}</span>
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {lang === 'hi' ? 'प्रोटोकॉल मिलान' : 'Protocol Match'}
          </span>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 600, lineHeight: 1.45, color: '#00201C' }}>
          {t.why}
        </p>
      </div>

      {/* Recommended Action Card (Primary Dark Band) */}
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
          {t.action}
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

      {/* Key Findings List */}
      <div style={{ marginTop: 4 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#163832', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {lang === 'hi' ? 'जाँच तथ्य' : 'Key Findings'}
        </h3>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {t.facts.map((f) => (
            <li
              key={f}
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
              {f}
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
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#F8FAF9',
                border: '1px solid #E3ECE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#051F20',
                cursor: 'pointer',
              }}
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
              background: '#FFDAD6',
              color: '#BA1A1A',
            }}
          >
            {t.priority}
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
            onClick={handleAskDoctor}
            className="ms-btn-primary"
            style={{
              height: 56,
              border: 0,
              borderRadius: 14,
              cursor: saved ? 'default' : 'pointer',
              fontSize: 16,
              fontWeight: 700,
              background: saved ? '#CCD9D2' : '#235347',
              color: saved ? '#707975' : '#FFFFFF',
              boxShadow: saved ? 'none' : '0 4px 14px rgba(35, 83, 71, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <Send size={18} />
            <span>{t.ask}</span>
          </button>
          <button
            type="button"
            disabled={saved}
            onClick={save}
            style={{
              height: 48,
              border: `1.5px solid ${saved ? '#CCD9D2' : '#235347'}`,
              borderRadius: 14,
              cursor: saved ? 'default' : 'pointer',
              fontSize: 15,
              fontWeight: 700,
              background: '#FFFFFF',
              color: saved ? '#707975' : '#235347',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <Save size={16} />
            <span>{t.save}</span>
          </button>
        </div>
      </div>

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '32px 24px 48px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <header
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E3ECE7',
              padding: '24px 28px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              marginBottom: 20,
            }}
          >
            {renderStepper()}
            {renderPatientSummaryBar()}
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
                  background: '#FFDAD6',
                  color: '#BA1A1A',
                }}
              >
                {t.priority}
              </span>
            </div>
          </header>

          <main
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E3ECE7',
              padding: '28px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            {renderResultContent()}

            <div style={{ marginTop: 24, display: 'flex', gap: 14, borderTop: '1px solid #E3ECE7', paddingTop: 20 }}>
              <button
                type="button"
                disabled={saved}
                onClick={handleAskDoctor}
                className="ms-btn-primary"
                style={{
                  flex: 1,
                  height: 52,
                  border: 0,
                  borderRadius: 14,
                  cursor: saved ? 'default' : 'pointer',
                  fontSize: 16,
                  fontWeight: 700,
                  background: saved ? '#CCD9D2' : '#235347',
                  color: saved ? '#707975' : '#FFFFFF',
                  boxShadow: saved ? 'none' : '0 4px 14px rgba(35, 83, 71, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Send size={18} />
                <span>{t.ask}</span>
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                disabled={saved}
                onClick={save}
                style={{
                  padding: '0 24px',
                  height: 52,
                  border: `1.5px solid ${saved ? '#CCD9D2' : '#235347'}`,
                  borderRadius: 14,
                  cursor: saved ? 'default' : 'pointer',
                  fontSize: 15,
                  fontWeight: 700,
                  background: '#FFFFFF',
                  color: saved ? '#707975' : '#235347',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Save size={16} />
                <span>{t.save}</span>
              </button>
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
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25)',
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


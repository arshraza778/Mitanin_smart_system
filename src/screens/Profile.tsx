import { useState } from 'react';
import { User, Languages, Smartphone, Monitor, RefreshCw, Check, ArrowRight, RotateCcw } from 'lucide-react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { useViewMode } from '../ViewModeContext';
import { useCaseStore, type SyncItem } from '../store/CaseStore';
import { useScreenDraft } from '../ScreenDraftContext';

const COPY = { en: enLocale.screens.Profile, hi: hiLocale.screens.Profile } as const;

export default function Profile({
  lang,
  online,
  onNavigate,
  onSetLang,
  onToggleOnline,
}: ScreenProps) {
  const isHindi = lang === 'hi';
  const t = COPY[lang];
  const { mode, setMode } = useViewMode();
  const { currentRole } = useScreenDraft();
  const { syncNow, resetDemoData, waitingSyncCount, state } = useCaseStore();
  const [syncingState, setSyncingState] = useState(false);
  const [resetToast, setResetToast] = useState(false);
  const common = (isHindi ? hiLocale : enLocale).common;

  const handleSyncNow = () => {
    setSyncingState(true);
    syncNow();
    setTimeout(() => {
      setSyncingState(false);
    }, 600);
  };

  const handleResetDemo = () => {
    resetDemoData();
    setResetToast(true);
    setTimeout(() => setResetToast(false), 2400);
  };

  const isDoctor = currentRole === 'doctor';
  const isSupervisor = currentRole === 'supervisor';
  const pageTitle = isHindi ? 'प्रोफ़ाइल' : 'Profile';
  const allSyncedText = isHindi ? 'सब सिंक है (सिम्युलेटेड)' : 'All synced (Simulated)';
  const pendingText = isHindi ? `${waitingSyncCount || 4} लंबित (सिम्युलेटेड)` : `${waitingSyncCount || 4} pending (Simulated)`;
  const activeText = isHindi ? 'सक्रिय' : 'Active';

  // Read role profile from store if available, otherwise fallback to '--' (never invent data)
  const storeProfile = (state as any)?.userProfile || (state as any)?.profile;
  const personName = storeProfile?.name?.[lang] || storeProfile?.name || '--';
  const personRole = currentRole
    ? (isDoctor
        ? (isHindi ? 'चिकित्सक' : 'Doctor')
        : isSupervisor
        ? (isHindi ? 'पर्यवेक्षक' : 'Supervisor')
        : (isHindi ? 'मितानिन' : 'Mitanin'))
    : '--';
  const personInitial = personName !== '--' ? personName.charAt(0) : (isHindi ? 'प्रो' : 'P');
  const assignedAreaText = storeProfile?.assignedArea?.[lang] || storeProfile?.assignedArea || '--';
  const lastSentText = t.never || (isHindi ? 'कभी नहीं' : 'Never');

  const connectedText = isHindi ? 'सर्वर से जुड़ा है (सिम्युलेटेड)' : 'Connected to server (Simulated)';
  const offlineStorageText = isHindi ? 'स्थानीय संग्रहण सक्रिय (सिम्युलेटेड)' : 'Local storage active (Simulated)';
  const syncQueueTitle = isHindi ? 'सिंक कतार (सिम्युलेटेड सिंक)' : 'Sync Queue (Simulated sync)';
  const localStorageLabel = isHindi ? 'स्थानीय संग्रहण:' : 'Local storage:';
  const autoSyncLabel = isHindi ? 'ऑटो-सिंक:' : 'Auto-sync:';
  const syncedBadgeText = isHindi ? 'सिंक हुआ' : 'Synced';
  const queuedBadgeText = isHindi ? 'कतार में' : 'Queued';

  // Shared Profile Card Component
  const renderProfileCard = () => (
    <section
      aria-label={t.title}
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E3ECE7',
        boxShadow: '0 2px 8px rgba(0, 33, 17, 0.04)',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {/* Identity block */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          aria-hidden="true"
          style={{
            width: 54,
            height: 54,
            flexShrink: 0,
            borderRadius: 16,
            background: '#DAF1DE',
            color: '#235347',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          {personInitial}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#00201C', lineHeight: 1.2 }}>
              {personName}
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                background: '#DAF1DE',
                color: '#235347',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2E7D4F' }} />
              {activeText}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#404945', fontWeight: 600 }}>
            {personRole}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ms-muted)', fontWeight: 500 }}>
            {t.assignedArea}: {assignedAreaText}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ms-muted)', fontWeight: 500 }}>
            {t.lastSent}: {lastSentText}
          </p>
        </div>
      </div>

      <hr style={{ height: 1, background: '#E3ECE7', border: 0, margin: 0 }} />

      {/* Shared status chip text only */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 14,
          background: online ? '#DAF1DE' : '#FFF1CC',
          color: online ? '#235347' : '#8A5A00',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: online ? '#2E7D4F' : '#8A5A00',
            flexShrink: 0,
          }}
        />
        <span>
          {online
            ? (isHindi ? 'सहेजा और भेजा गया (सिम्युलेटेड)' : 'Saved and sent (Simulated)')
            : (isHindi ? 'सिग्नल नहीं। फ़ोन पर सहेजा गया (सिम्युलेटेड)' : 'No signal. Saved on phone (Simulated)')}
        </span>
      </div>

      <hr style={{ height: 1, background: '#E3ECE7', border: 0, margin: 0 }} />

      {/* Language Selection */}
      <div>
        <label
          id="profile-lang-label"
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--ms-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 10,
          }}
        >
          {t.language}
        </label>
        <div
          role="radiogroup"
          aria-labelledby="profile-lang-label"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
        >
          <button
            type="button"
            role="radio"
            lang="en"
            aria-checked={lang === 'en'}
            onClick={() => onSetLang('en')}
            className={`ms-btn ${lang === 'en' ? 'ms-btn--primary' : 'ms-btn--secondary'} ms-btn--md`}
            style={{
              padding: '10px 16px',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>{t.english}</span>
            {lang === 'en' && <Check size={16} aria-hidden="true" />}
          </button>
          <button
            type="button"
            role="radio"
            lang="hi"
            aria-checked={lang === 'hi'}
            onClick={() => onSetLang('hi')}
            className={`ms-btn ${lang === 'hi' ? 'ms-btn--primary' : 'ms-btn--secondary'} ms-btn--md`}
            style={{
              padding: '10px 16px',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>{t.hindi}</span>
            {lang === 'hi' && <Check size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* View: Phone | Web row (shown only when viewport is 768px or wider) */}
      <div className="ms-profile-view-switch">
        <label
          id="profile-view-label"
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 700,
            color: '#404945',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 10,
          }}
        >
          {isHindi ? 'दृश्य: फ़ोन | वेब' : 'View: Phone | Web'}
        </label>
        <div
          role="radiogroup"
          aria-labelledby="profile-view-label"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
        >
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'phone'}
            onClick={() => setMode('phone')}
            className={`ms-btn ${mode === 'phone' ? 'ms-btn--primary' : 'ms-btn--secondary'} ms-btn--md`}
            style={{
              padding: '10px 16px',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Smartphone size={16} aria-hidden="true" />
            <span>{isHindi ? 'फ़ोन' : 'Phone'}</span>
            {mode === 'phone' && <Check size={15} aria-hidden="true" />}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'web' || mode === 'auto'}
            onClick={() => setMode('web')}
            className={`ms-btn ${mode !== 'phone' ? 'ms-btn--primary' : 'ms-btn--secondary'} ms-btn--md`}
            style={{
              padding: '10px 16px',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Monitor size={16} aria-hidden="true" />
            <span>{isHindi ? 'वेब' : 'Web'}</span>
            {mode !== 'phone' && <Check size={15} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Change Role Button */}
      <button
        type="button"
        onClick={() => onNavigate('/role')}
        className="ms-btn ms-btn--secondary ms-btn--md ms-btn--block"
        style={{
          padding: '12px 18px',
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <User size={18} aria-hidden="true" />
          <span>{t.changeRole}</span>
        </span>
        <ArrowRight size={16} color="#404945" aria-hidden="true" />
      </button>

      {/* Reset Demo Data Button */}
      <button
        type="button"
        onClick={handleResetDemo}
        className="ms-btn ms-btn--ghost ms-btn--md ms-btn--block"
        style={{
          padding: '10px 16px',
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <RotateCcw size={15} aria-hidden="true" />
        <span>{common.resetDemoData}</span>
      </button>

      {resetToast && (
        <div
          role="status"
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            background: '#DAF1DE',
            color: '#235347',
            fontSize: 13,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          ✓ {common.demoDataResetToast}
        </div>
      )}
    </section>
  );

  const queueItems = state.syncQueue.map((sq: SyncItem) => ({
    id: sq.id,
    typeEn: sq.actionType.replace('_', ' '),
    typeHi: sq.actionType,
    nameEn: sq.description.en,
    nameHi: sq.description.hi,
    recordId: sq.id.slice(0, 8),
    timeEn: sq.status === 'sent' ? 'Sent just now' : 'Waiting to send',
    timeHi: sq.status === 'sent' ? 'अभी भेजा गया' : 'भेजने की प्रतीक्षा में',
    isQueued: sq.status === 'waiting_to_send',
  }));

  // Shared Sync Queue Card Component
  const renderSyncCard = () => (
    <section
      aria-label={syncQueueTitle}
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E3ECE7',
        boxShadow: '0 2px 8px rgba(0, 33, 17, 0.04)',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid #E3ECE7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: '#DAF1DE',
              color: '#235347',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RefreshCw size={17} aria-hidden="true" />
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#00201C' }}>
            {syncQueueTitle}
          </h3>
        </div>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 700,
            background: online && waitingSyncCount === 0 ? '#DAF1DE' : '#FFF1CC',
            color: online && waitingSyncCount === 0 ? '#235347' : '#8A5A00',
          }}
        >
          {online && waitingSyncCount === 0 ? allSyncedText : pendingText}
        </span>
      </div>

      {/* Sync Queue List */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {queueItems.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#404945', fontSize: 13, fontWeight: 600 }}>
            {isHindi ? 'भेजने के लिए कुछ नहीं' : 'Nothing waiting to send'}
          </div>
        ) : queueItems.map((item: any, idx: number) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 0',
              borderBottom: idx === queueItems.length - 1 ? 'none' : '1px solid #E3ECE7',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#00201C', lineHeight: 1.3 }}>
                  {isHindi ? (item.nameHi || `${item.typeHi}: ${item.nameHi}`) : (item.nameEn || `${item.typeEn}: ${item.nameEn}`)}
                </span>
                <span
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#404945',
                    background: '#F1F5F3',
                    padding: '2px 6px',
                    borderRadius: 6,
                    border: '1px solid #E3ECE7',
                  }}
                >
                  {item.recordId}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#404945', marginTop: 3, fontWeight: 500 }}>
                {isHindi ? item.timeHi : item.timeEn}
              </div>
            </div>
            <span
              style={{
                flexShrink: 0,
                padding: '3px 9px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                background: !item.isQueued ? '#DAF1DE' : '#FFF1CC',
                color: !item.isQueued ? '#235347' : '#8A5A00',
              }}
            >
              {!item.isQueued ? syncedBadgeText : queuedBadgeText}
            </span>
          </div>
        ))}
      </div>

      {/* Sync Now Action */}
      <button
        type="button"
        onClick={handleSyncNow}
        disabled={syncingState}
        className="ms-btn ms-btn--primary ms-btn--md ms-btn--block"
        style={{
          padding: '12px 18px',
          borderRadius: 14,
          fontSize: 15,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <RefreshCw
          size={16}
          style={{
            animation: syncingState ? 'ms-spin 1s linear infinite' : 'none',
          }}
          aria-hidden="true"
        />
        <span>
          {syncingState
            ? (isHindi ? 'सिंक हो रहा है...' : 'Syncing...')
            : (isHindi ? 'अभी सिंक करें' : 'Sync now')}
        </span>
      </button>

      {/* Storage and Auto-sync Info */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: 14,
          background: '#F8FAF9',
          border: '1px solid #E3ECE7',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12.5, color: '#404945', fontWeight: 600 }}>
            {localStorageLabel}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#00201C' }}>
            12.4 MB
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12.5, color: '#404945', fontWeight: 600 }}>
            {autoSyncLabel}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12.5,
              fontWeight: 700,
              color: '#2E7D4F',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2E7D4F' }} />
            {activeText}
          </span>
        </div>
      </div>
    </section>
  );

  return (
    <div className="@container w-full min-h-screen" style={{ background: '#F4F9F6' }}>
      {/* ─── Narrow Phone Layout (@md and below) ─── */}
      <div className="block @2xl:hidden" style={{ minHeight: '100%', paddingBottom: "var(--ms-screen-padding-bottom)" }}>
        {/* Phone Header */}
        <header
          className="on-dark-900"
          style={{
            position: 'relative',
            background: '#051F20',
            color: '#FFFFFF',
            borderRadius: '0 0 24px 24px',
            padding: 'calc(20px + env(safe-area-inset-top, 0px)) 20px 44px',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.2, color: '#FFFFFF' }}>
                {pageTitle}
              </h1>
            </div>
            <button
              type="button"
              onClick={onToggleOnline}
              aria-pressed={online}
              className={`ms-btn ms-btn--sm ${online ? 'ms-btn--secondary-on-dark' : 'ms-btn--on-dark'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: online ? '#2E7D4F' : '#8A5A00',
                }}
              />
              {online ? allSyncedText : pendingText}
            </button>
          </div>
        </header>

        {/* Phone Stacked Content */}
        <main style={{ marginTop: -20, position: 'relative', padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {renderProfileCard()}
          {renderSyncCard()}
          <p style={{ margin: '8px 0 0', textAlign: 'center', color: '#404945', fontSize: 12, lineHeight: 1.5 }}>
            {isHindi ? 'आपकी स्वास्थ्य सेवा, आपकी भाषा में।' : 'Community healthcare, closer to you.'}
          </p>
        </main>
      </div>

      {/* ─── Wide Desktop Layout (@2xl and above) ─── */}
      <div className="hidden @2xl:block p-6 @4xl:p-8 max-w-6xl mx-auto">
        {/* Top Header */}
        <header
          style={{
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: '1px solid #E3ECE7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#00201C', lineHeight: 1.2 }}>
              {pageTitle}
            </h1>
          </div>
          <button
            type="button"
            onClick={onToggleOnline}
            aria-pressed={online}
            className={`ms-btn ms-btn--sm ${online ? 'ms-btn--secondary' : 'ms-btn--ghost'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: online ? '#2E7D4F' : '#8A5A00',
              }}
            />
            {online ? allSyncedText : pendingText}
          </button>
        </header>

        {/* Two-column Wide Grid */}
        <div className="grid grid-cols-12 gap-6" style={{ alignItems: 'start' }}>
          <div className="col-span-12 @2xl:col-span-7 @4xl:col-span-7">
            {renderProfileCard()}
          </div>
          <div className="col-span-12 @2xl:col-span-5 @4xl:col-span-5">
            {renderSyncCard()}
          </div>
        </div>
      </div>
    </div>
  );
}

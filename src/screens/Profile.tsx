import { useState } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { useViewMode } from '../ViewModeContext';
import { useCaseStore, type SyncItem } from '../store/CaseStore';

const COPY = { en: enLocale.screens.Profile, hi: hiLocale.screens.Profile } as const;

interface SyncRecord {
  id: string;
  typeEn: string;
  typeHi: string;
  nameEn: string;
  nameHi: string;
  recordId: string;
  timeEn: string;
  timeHi: string;
}

const SYNC_ITEMS: SyncRecord[] = [
  {
    id: '1',
    typeEn: 'Screening',
    typeHi: 'जाँच',
    nameEn: 'Ramesh Kumar',
    nameHi: 'रमेश कुमार',
    recordId: 'MS-1042',
    timeEn: '3 min ago',
    timeHi: '3 मिनट पहले',
  },
  {
    id: '2',
    typeEn: 'Visit',
    typeHi: 'भेंट',
    nameEn: 'Sunita Bai',
    nameHi: 'सुनीता बाई',
    recordId: 'MS-1040',
    timeEn: '18 min ago',
    timeHi: '18 मिनट पहले',
  },
  {
    id: '3',
    typeEn: 'Consult',
    typeHi: 'परामर्श',
    nameEn: 'Anita',
    nameHi: 'अनिता',
    recordId: 'MS-1039',
    timeEn: '1 hr ago',
    timeHi: '1 घंटा पहले',
  },
  {
    id: '4',
    typeEn: 'Referral',
    typeHi: 'रेफ़रल',
    nameEn: 'Priya',
    nameHi: 'प्रिया',
    recordId: 'MS-1037',
    timeEn: '2 hr ago',
    timeHi: '2 घंटे पहले',
  },
];

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

  const pageTitle = isHindi ? 'प्रोफ़ाइल एवं डिवाइस सिंक' : 'Profile & Device Sync';
  const pageSubtitle = isHindi ? 'प्रोफ़ाइल एवं डिवाइस सिंक सेटिंग्स' : 'Profile & Device Sync settings';
  const allSyncedText = isHindi ? 'सब सिंक है (सिम्युलेटेड)' : 'All synced (Simulated)';
  const pendingText = isHindi ? `${waitingSyncCount || 4} लंबित (सिम्युलेटेड)` : `${waitingSyncCount || 4} pending (Simulated)`;
  const activeText = isHindi ? 'सक्रिय' : 'Active';
  const subCenterText = isHindi ? 'कोटरा उप-केंद्र' : 'Kotra Sub-Center';
  const connectedText = isHindi ? 'सर्वर से जुड़ा है' : 'Connected to server';
  const offlineStorageText = isHindi ? 'स्थानीय संग्रहण सक्रिय' : 'Local storage active';
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
        background: 'var(--ms-surface)',
        borderRadius: 24,
        border: '1px solid var(--ms-border)',
        boxShadow: 'var(--ms-shadow-card)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Identity block */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          aria-hidden="true"
          style={{
            width: 58,
            height: 58,
            flexShrink: 0,
            borderRadius: 18,
            background: 'var(--ms-green-100)',
            color: 'var(--ms-forest)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 800,
          }}
        >
          {isHindi ? 'सु' : 'S'}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--ms-ink)', lineHeight: 1.2 }}>
              {t.name}
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
                background: 'var(--ms-green-100)',
                color: 'var(--ms-forest)',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ms-ok)' }} />
              {activeText}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--ms-muted)', fontWeight: 600 }}>
            {t.role} • {subCenterText}
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 12,
              color: 'var(--ms-muted)',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontWeight: 600,
            }}
          >
            Device ID: MS-MIT-042
          </p>
        </div>
      </div>

      <hr style={{ height: 1, background: 'var(--ms-border)', border: 0, margin: 0 }} />

      {/* Connection status row */}
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 16,
          background: 'var(--ms-bg)',
          border: '1px solid var(--ms-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ms-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t.sync}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 4, fontSize: 13.5, fontWeight: 700, color: 'var(--ms-ink)' }}>
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: online ? 'var(--ms-ok)' : 'var(--ms-warn)',
                flexShrink: 0,
              }}
            />
            <span>{online ? `${t.online} / ${connectedText}` : `${t.offline} / ${offlineStorageText}`}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleOnline}
          aria-label={online ? 'Toggle offline mode' : 'Toggle online mode'}
          style={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            border: 0,
            cursor: 'pointer',
            background: online ? 'var(--ms-green-100)' : 'var(--ms-orange-100)',
            color: online ? 'var(--ms-forest)' : 'var(--ms-orange-700)',
          }}
        >
          {online ? '●' : '○'} {online ? t.online : t.offline}
        </button>
      </div>

      <hr style={{ height: 1, background: 'var(--ms-border)', border: 0, margin: 0 }} />

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
            style={{
              minHeight: 48,
              padding: '10px 16px',
              borderRadius: 14,
              border: `2px solid ${lang === 'en' ? 'var(--ms-forest)' : 'var(--ms-border)'}`,
              background: lang === 'en' ? 'var(--ms-forest)' : 'var(--ms-surface)',
              color: lang === 'en' ? '#FFFFFF' : 'var(--ms-ink)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <span>{t.english}</span>
            {lang === 'en' && <span aria-hidden="true">✓</span>}
          </button>
          <button
            type="button"
            role="radio"
            lang="hi"
            aria-checked={lang === 'hi'}
            onClick={() => onSetLang('hi')}
            style={{
              minHeight: 48,
              padding: '10px 16px',
              borderRadius: 14,
              border: `2px solid ${lang === 'hi' ? 'var(--ms-forest)' : 'var(--ms-border)'}`,
              background: lang === 'hi' ? 'var(--ms-forest)' : 'var(--ms-surface)',
              color: lang === 'hi' ? '#FFFFFF' : 'var(--ms-ink)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <span>{t.hindi}</span>
            {lang === 'hi' && <span aria-hidden="true">✓</span>}
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
            color: 'var(--ms-muted)',
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
            style={{
              minHeight: 48,
              padding: '10px 16px',
              borderRadius: 14,
              border: `2px solid ${mode === 'phone' ? 'var(--ms-forest)' : 'var(--ms-border)'}`,
              background: mode === 'phone' ? 'var(--ms-forest)' : 'var(--ms-surface)',
              color: mode === 'phone' ? '#FFFFFF' : 'var(--ms-ink)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="2" width="14" height="20" rx="3" />
              <line x1="12" y1="18" x2="12" y2="18" />
            </svg>
            <span>{isHindi ? 'फ़ोन' : 'Phone'}</span>
            {mode === 'phone' && <span aria-hidden="true">✓</span>}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'web' || mode === 'auto'}
            onClick={() => setMode('web')}
            style={{
              minHeight: 48,
              padding: '10px 16px',
              borderRadius: 14,
              border: `2px solid ${mode !== 'phone' ? 'var(--ms-forest)' : 'var(--ms-border)'}`,
              background: mode !== 'phone' ? 'var(--ms-forest)' : 'var(--ms-surface)',
              color: mode !== 'phone' ? '#FFFFFF' : 'var(--ms-ink)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>{isHindi ? 'वेब' : 'Web'}</span>
            {mode !== 'phone' && <span aria-hidden="true">✓</span>}
          </button>
        </div>
      </div>

      {/* Change Role Button */}
      <button
        type="button"
        onClick={() => onNavigate('/role')}
        style={{
          width: '100%',
          minHeight: 48,
          padding: '12px 18px',
          borderRadius: 16,
          border: '1.5px solid var(--ms-border)',
          background: 'var(--ms-bg)',
          color: 'var(--ms-ink)',
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>{t.changeRole}</span>
        </span>
        <span aria-hidden="true" style={{ fontSize: 16, color: 'var(--ms-muted)' }}>→</span>
      </button>

      {/* Reset Demo Data Button */}
      <button
        type="button"
        onClick={handleResetDemo}
        style={{
          width: '100%',
          minHeight: 46,
          padding: '10px 16px',
          borderRadius: 16,
          border: '1.5px solid #FFCCBC',
          background: '#FBE9E7',
          color: 'var(--ms-orange-700)',
          fontSize: 13.5,
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'all 0.15s ease',
        }}
      >
        <span>{common.resetDemoData}</span>
      </button>

      {resetToast && (
        <div
          role="status"
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            background: 'var(--ms-mint)',
            color: 'var(--ms-forest)',
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

  const queueItems = state.syncQueue.length > 0
    ? state.syncQueue.map((sq: SyncItem) => ({
        id: sq.id,
        typeEn: sq.actionType.replace('_', ' '),
        typeHi: sq.actionType,
        nameEn: sq.description.en,
        nameHi: sq.description.hi,
        recordId: 'MS-1042',
        timeEn: sq.status === 'sent' ? 'Sent just now' : 'Waiting to send',
        timeHi: sq.status === 'sent' ? 'अभी भेजा गया' : 'भेजने की प्रतीक्षा में',
        isQueued: sq.status === 'waiting_to_send',
      }))
    : SYNC_ITEMS.map((item: SyncRecord) => ({ ...item, isQueued: !online }));

  // Shared Sync Queue Card Component
  const renderSyncCard = () => (
    <section
      aria-label={syncQueueTitle}
      style={{
        background: 'var(--ms-surface)',
        borderRadius: 24,
        border: '1px solid var(--ms-border)',
        boxShadow: 'var(--ms-shadow-card)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--ms-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'var(--ms-green-100)',
              color: 'var(--ms-forest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--ms-ink)' }}>
            {syncQueueTitle}
          </h3>
        </div>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            background: online && waitingSyncCount === 0 ? 'var(--ms-green-100)' : 'var(--ms-orange-100)',
            color: online && waitingSyncCount === 0 ? 'var(--ms-forest)' : 'var(--ms-orange-700)',
          }}
        >
          {online && waitingSyncCount === 0 ? allSyncedText : pendingText}
        </span>
      </div>

      {/* Sync Queue List */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {queueItems.map((item, idx) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 0',
              borderBottom: idx === queueItems.length - 1 ? 'none' : '1px solid var(--ms-border)',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ms-ink)', lineHeight: 1.3 }}>
                  {isHindi ? (item.nameHi || `${item.typeHi}: ${item.nameHi}`) : (item.nameEn || `${item.typeEn}: ${item.nameEn}`)}
                </span>
                <span
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--ms-muted)',
                    background: 'var(--ms-bg)',
                    padding: '2px 6px',
                    borderRadius: 6,
                    border: '1px solid var(--ms-border)',
                  }}
                >
                  {item.recordId}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ms-muted)', marginTop: 4, fontWeight: 500 }}>
                {isHindi ? item.timeHi : item.timeEn}
              </div>
            </div>
            <span
              style={{
                flexShrink: 0,
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
                background: !item.isQueued ? 'var(--ms-green-100)' : 'var(--ms-orange-100)',
                color: !item.isQueued ? 'var(--ms-forest)' : 'var(--ms-orange-700)',
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
        style={{
          width: '100%',
          minHeight: 48,
          padding: '12px 18px',
          borderRadius: 16,
          border: 0,
          background: 'var(--ms-forest)',
          color: '#FFFFFF',
          fontSize: 15,
          fontWeight: 800,
          cursor: syncingState ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: '0 4px 14px rgba(43, 107, 82, 0.2)',
          transition: 'all 0.15s ease',
        }}
      >
        <svg
          style={{
            width: 16,
            height: 16,
            animation: syncingState ? 'ms-spin 1s linear infinite' : 'none',
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
        </svg>
        <span>
          {syncingState
            ? (isHindi ? 'सिंक हो रहा है...' : 'Syncing...')
            : (isHindi ? 'अभी सिंक करें' : 'Sync now')}
        </span>
      </button>

      {/* Storage and Auto-sync Info */}
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 16,
          background: 'var(--ms-bg)',
          border: '1px solid var(--ms-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--ms-muted)', fontWeight: 600 }}>
            {localStorageLabel}
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ms-ink)' }}>
            12.4 MB
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--ms-muted)', fontWeight: 600 }}>
            {autoSyncLabel}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 13,
              fontWeight: 800,
              color: 'var(--ms-ok)',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ms-ok)' }} />
            {activeText}
          </span>
        </div>
      </div>
    </section>
  );

  return (
    <div className="@container w-full min-h-screen" style={{ background: 'var(--ms-bg)' }}>
      {/* ─── Narrow Phone Layout (@md and below) ─── */}
      <div className="block @2xl:hidden" style={{ minHeight: '100%', paddingBottom: 24 }}>
        {/* Phone Header */}
        <header
          style={{
            position: 'relative',
            background: 'var(--ms-green-700)',
            color: '#FFFFFF',
            borderRadius: '0 0 32px 32px',
            padding: 'calc(24px + env(safe-area-inset-top, 0px)) 20px 48px',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>
                {pageTitle}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                {pageSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleOnline}
              aria-pressed={online}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                minHeight: 48,
                borderRadius: 999,
                border: 0,
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: 700,
                background: online ? 'var(--ms-green-100)' : 'var(--ms-orange-100)',
                color: online ? 'var(--ms-green-900)' : 'var(--ms-orange-700)',
                flexShrink: 0,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: online ? 'var(--ms-green-500)' : 'var(--ms-orange)',
                }}
              />
              {online ? allSyncedText : pendingText}
            </button>
          </div>
        </header>

        {/* Phone Stacked Content */}
        <main style={{ marginTop: -24, position: 'relative', padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {renderProfileCard()}
          {renderSyncCard()}
          <p style={{ margin: '8px 0 0', textAlign: 'center', color: 'var(--ms-muted)', fontSize: 12, lineHeight: 1.5 }}>
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
            borderBottom: '1px solid var(--ms-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--ms-ink)', lineHeight: 1.2 }}>
              {pageTitle}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ms-muted)', fontWeight: 600 }}>
              {pageSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleOnline}
            aria-pressed={online}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid var(--ms-border)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              background: online ? 'var(--ms-green-100)' : 'var(--ms-orange-100)',
              color: online ? 'var(--ms-forest)' : 'var(--ms-orange-700)',
              boxShadow: 'var(--ms-shadow-card)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: online ? 'var(--ms-ok)' : 'var(--ms-warn)',
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

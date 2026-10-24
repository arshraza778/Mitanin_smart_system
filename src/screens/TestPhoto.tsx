import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { useCaseStore } from '../store/CaseStore';
import {
  createCassetteJpeg,
  downscaleImageToJpeg,
  readFileAsDownscaledJpeg,
} from '../domain/photoUtils';

const STEP = 3;
type Result = 'positive' | 'negative' | 'invalid';
type CamState = 'starting' | 'ready' | 'unavailable';
type CamReason = 'permission_denied' | 'not_found' | 'insecure' | 'unknown' | null;

const COPY = { en: enLocale.screens.TestPhoto, hi: hiLocale.screens.TestPhoto } as const;

const RESULT_STYLE: Record<Result, { bg: string; glyph: string }> = {
  positive: { bg: 'var(--ms-orange)', glyph: '+' },
  negative: { bg: 'var(--ms-green-500)', glyph: '−' },
  invalid: { bg: 'var(--ms-violet)', glyph: '!' },
};

function analyseFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  const N = 64;
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || !video.videoWidth) return null;
  const sw = video.videoWidth * 0.6;
  const sh = video.videoHeight * 0.6;
  ctx.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, 0, 0, N, N);
  const { data } = ctx.getImageData(0, 0, N, N);
  const g = new Float32Array(N * N);
  let sum = 0;
  for (let i = 0; i < N * N; i++) {
    g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    sum += g[i];
  }
  const mean = sum / (N * N);
  let lapSum = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      const i = y * N + x;
      const l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - N] - g[i + N];
      lapSum += l;
      lapSq += l * l;
      n++;
    }
  }
  const variance = lapSq / n - (lapSum / n) ** 2;
  return { sharp: variance > 40, light: mean > 70 && mean < 210 };
}

export function CassetteDemo({ type = 'positive' }: { type?: 'positive' | 'negative' | 'invalid' }) {
  return (
    <svg viewBox="0 0 300 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
      <rect width="300" height="200" fill="#1c3a2b" />
      <rect x="60" y="72" width="180" height="56" rx="10" fill="#f1f5f2" />
      <rect x="76" y="86" width="34" height="28" rx="6" fill="#d9e2dc" />
      <rect x="122" y="84" width="104" height="32" rx="6" fill="#fff" stroke="var(--ms-border)" />
      {/* Control line C (present in positive and negative; absent in invalid) */}
      {(type === 'positive' || type === 'negative') && (
        <rect x="150" y="84" width="3" height="32" fill="#d9534f" />
      )}
      {/* Test line T (present in positive and invalid) */}
      {(type === 'positive' || type === 'invalid') && (
        <rect x="176" y="84" width="3" height="32" fill="#d9534f" />
      )}
      <text x="151.5" y="80" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#6b7770">C</text>
      <text x="177.5" y="80" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#6b7770">T</text>
    </svg>
  );
}

const TickIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
const CrossIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export default function TestPhoto({ lang, online = true, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const { updateScreening, getCaseByPatientId, currentScreening, getPatientSummary } = useCaseStore();
  const patientId = currentScreening?.patientId || 'p1';
  const existingCase = getCaseByPatientId(patientId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cam, setCam] = useState<CamState>('starting');
  const [camReason, setCamReason] = useState<CamReason>(null);
  const [quality, setQuality] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [photo, setPhoto] = useState<string | null>(() => {
    if (existingCase?.photoData) return existingCase.photoData;
    if (typeof existingCase?.photo === 'string' && existingCase.photo.startsWith('data:image')) {
      return existingCase.photo;
    }
    return null;
  });
  const [result, setResult] = useState<Result | null>(() => existingCase?.testResult ?? 'positive');
  const [showDemoMenu, setShowDemoMenu] = useState<boolean>(false);

  const handleNext = () => {
    updateScreening(
      {
        patientId,
        photo: Boolean(photo),
        photoData: photo || undefined,
        testResult: result || 'positive',
        state: 'SCREENED',
      },
      online
    );
    onNavigate('/mitanin/screening/result');
  };

  useEffect(() => {
    if (photo) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setCam('starting');
    setCamReason(null);

    // Check secure context first (getUserMedia requires HTTPS or localhost)
    if (
      typeof window !== 'undefined' &&
      window.isSecureContext === false &&
      window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setCam('unavailable');
      setCamReason('insecure');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCam('unavailable');
      setCamReason('not_found');
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((tr) => tr.stop());
          return;
        }
        stream = s;
        const v = videoRef.current;
        if (v) {
          v.srcObject = s;
          void v.play();
        }
        setCam('ready');
        setCamReason(null);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setCam('unavailable');
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setCamReason('permission_denied');
        } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
          setCamReason('not_found');
        } else {
          setCamReason('unknown');
        }
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [photo]);

  useEffect(() => {
    if (photo) return;
    if (cam === 'unavailable') {
      setQuality([false, false, false]);
      return;
    }
    if (cam !== 'ready') {
      setQuality([false, false, false]);
      return;
    }
    scratchRef.current ??= document.createElement('canvas');
    const id = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || !scratchRef.current) return;
      const r = analyseFrame(v, scratchRef.current);
      if (!r) return;
      setQuality([r.sharp, r.light, r.sharp && r.light]);
    }, 700);
    return () => window.clearInterval(id);
  }, [cam, photo]);

  const capture = useCallback(() => {
    if (cam === 'unavailable') {
      // In unavailable camera mode, shutter creates positive cassette demo JPEG
      const demoJpeg = createCassetteJpeg('positive');
      setPhoto(demoJpeg);
      setQuality([true, true, true]);
      setResult('positive');
      return;
    }
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const jpeg = downscaleImageToJpeg(v, v.videoWidth, v.videoHeight, 800, 0.7);
    if (jpeg) {
      setPhoto(jpeg);
      setQuality([true, true, true]);
    }
  }, [cam]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const jpeg = await readFileAsDownscaledJpeg(file, 800, 0.7);
      if (jpeg) {
        setPhoto(jpeg);
        setQuality([true, true, true]);
      }
    } catch {
      // Fallback if reader fails
    }
  };

  const handleSelectDemo = (type: 'positive' | 'negative' | 'invalid') => {
    const demoJpeg = createCassetteJpeg(type);
    setPhoto(demoJpeg);
    setQuality([true, true, true]);
    setResult(type);
    setShowDemoMenu(false);
  };

  const retake = () => {
    setPhoto(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canNext = result === 'positive' || result === 'negative';

  const renderCameraSection = () => (
    <>
      <div
        data-testid="camera-area"
        style={{
          position: 'relative',
          overflow: 'hidden',
          aspectRatio: '4 / 3.4',
          borderRadius: 26,
          background: '#12241b',
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt={t.photoAlt}
            data-testid="photo-preview"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              background: '#12241b',
            }}
          />
        ) : cam === 'unavailable' ? (
          <div
            data-testid="camera-unavailable"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 20px',
              textAlign: 'center',
              background: 'linear-gradient(180deg, #183324 0%, #0d1e15 100%)',
              color: '#fff',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                display: 'grid',
                placeItems: 'center',
                color: '#EE7B4D',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, lineHeight: 1.35, maxWidth: 300 }}>
              {t.cameraUnavailableMsg}
            </p>
            {camReason && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: 'rgba(238, 123, 77, 0.18)',
                  border: '1px solid rgba(238, 123, 77, 0.35)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: '#ffb594',
                }}
              >
                <span>{t.reasons[camReason] || t.reasons.unknown}</span>
              </div>
            )}
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}

        {!photo && cam !== 'unavailable' && (
          <>
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: '50%',
                top: '46%',
                width: '80%',
                height: '32%',
                transform: 'translate(-50%, -50%)',
                borderRadius: 22,
                border: '3px dashed #fff',
                boxShadow: '0 0 0 999px rgba(10, 30, 20, 0.45)',
              }}
            />
            <p
              style={{
                position: 'absolute',
                left: 16,
                right: 16,
                bottom: 16,
                margin: 0,
                textAlign: 'center',
                fontSize: 15.5,
                fontWeight: 800,
                color: '#fff',
                textShadow: '0 1px 6px rgba(0,0,0,0.6)',
              }}
            >
              {t.place}
            </p>
          </>
        )}
      </div>

      {/* Hidden file input for native camera / image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Primary Take or Upload Photo button & Demo Menu */}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!!photo}
          data-testid="upload-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            minHeight: 52,
            borderRadius: 18,
            border: `2px solid ${photo ? 'var(--ms-border)' : 'var(--ms-orange)'}`,
            background: photo ? 'var(--ms-bg)' : '#fff',
            color: photo ? 'var(--ms-muted)' : 'var(--ms-orange)',
            fontSize: 15.5,
            fontWeight: 800,
            cursor: photo ? 'default' : 'pointer',
            boxShadow: photo ? 'none' : '0 4px 14px rgba(238, 123, 77, 0.15)',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span>{t.takeOrUpload}</span>
        </button>

        {/* Demo photo menu toggle & three sample cassettes */}
        {!photo && (
          <div style={{ borderRadius: 18, border: '1px solid var(--ms-border)', background: 'var(--ms-surface)', padding: 12 }}>
            <button
              type="button"
              onClick={() => setShowDemoMenu((v) => !v)}
              aria-expanded={showDemoMenu}
              data-testid="demo-menu-toggle"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 6px',
                border: 0,
                background: 'none',
                cursor: 'pointer',
                color: 'var(--ms-forest)',
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ms-orange)' }} />
                <span>{t.useDemoPhoto}</span>
              </span>
              <span style={{ fontSize: 13, transform: showDemoMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
                ▼
              </span>
            </button>

            {showDemoMenu && (
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {(['positive', 'negative', 'invalid'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectDemo(key)}
                    data-testid={`demo-cassette-${key}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 4px',
                      borderRadius: 14,
                      border: '1.5px solid var(--ms-border)',
                      background: 'var(--ms-bg)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: 42, borderRadius: 8, overflow: 'hidden' }}>
                      <CassetteDemo type={key} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ms-ink)', textAlign: 'center' }}>
                      {t.demoCassettes[key]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quality chips */}
      <ul
        aria-live="polite"
        style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}
      >
        {t.chips.map((label, i) => {
          const ok = quality[i];
          return (
            <li
              key={label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px 6px 8px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                background: ok ? 'var(--ms-green-100)' : 'var(--ms-orange-100)',
                color: ok ? 'var(--ms-green-700)' : 'var(--ms-orange-700)',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: ok ? 'var(--ms-green-500)' : 'var(--ms-orange)',
                  color: '#fff',
                }}
              >
                {ok ? TickIcon : CrossIcon}
              </span>
              {label}
            </li>
          );
        })}
      </ul>

      {/* Retake and Shutter Button Controls */}
      <div style={{ margin: '16px 0 0', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        <button
          type="button"
          onClick={retake}
          disabled={!photo}
          data-testid="retake-button"
          style={{
            justifySelf: 'start',
            padding: '12px 6px',
            border: 0,
            background: 'none',
            cursor: photo ? 'pointer' : 'default',
            fontSize: 16.5,
            fontWeight: 800,
            color: photo ? 'var(--ms-green-700)' : '#b9c4bd',
          }}
        >
          {t.retake}
        </button>
        <button
          type="button"
          onClick={capture}
          disabled={!!photo}
          aria-label={t.capture}
          data-testid="capture-button"
          style={{
            width: 70,
            height: 70,
            borderRadius: '50%',
            padding: 0,
            display: 'grid',
            placeItems: 'center',
            cursor: photo ? 'default' : 'pointer',
            border: `4px solid ${photo ? 'var(--ms-border)' : 'var(--ms-orange)'}`,
            background: 'var(--ms-surface)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: photo ? 'var(--ms-border)' : 'var(--ms-orange)',
            }}
          />
        </button>
        <span />
      </div>

      {photo && (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{t.choose}</h2>
          <div role="radiogroup" aria-label={t.choose} style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {(['positive', 'negative', 'invalid'] as const).map((key) => {
              const on = result === key;
              const st = RESULT_STYLE[key];
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setResult(key)}
                  style={{
                    minHeight: 90,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 4px',
                    borderRadius: 20,
                    cursor: 'pointer',
                    fontSize: 14.5,
                    fontWeight: 800,
                    border: `2px solid ${on ? st.bg : 'transparent'}`,
                    background: on ? st.bg : 'var(--ms-bg)',
                    color: on ? '#fff' : 'var(--ms-ink)',
                    boxShadow: '0 4px 16px rgba(31, 77, 56, 0.07)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 20,
                      lineHeight: 1,
                      background: on ? 'rgba(255,255,255,0.28)' : st.bg,
                      color: '#fff',
                    }}
                  >
                    {st.glyph}
                  </span>
                  {t.results[key]}
                </button>
              );
            })}
          </div>

          {result === 'invalid' && (
            <div
              role="alert"
              style={{
                marginTop: 14,
                padding: '14px 16px',
                borderRadius: 18,
                fontSize: 15,
                fontWeight: 800,
                background: 'var(--ms-orange-100)',
                color: 'var(--ms-orange-700)',
              }}
            >
              {t.repeat}
            </div>
          )}

          <p
            style={{
              margin: '14px 2px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--ms-muted)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
              <circle cx="12" cy="12" r="2.8" />
            </svg>
            {t.note}
          </p>
        </div>
      )}
    </>
  );

  return (
    <div>
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
        <header
          style={{
            background: 'var(--ms-surface)',
            borderRadius: '0 0 32px 32px',
            padding: 'calc(20px + env(safe-area-inset-top, 0px)) 20px 20px',
          }}
        >
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={4}
            aria-valuenow={STEP}
            aria-valuetext={`${t.stepOf}: ${t.steps[STEP - 1]}`}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {t.steps.map((_, i) => (
                <span
                  key={i}
                  style={{ height: 8, borderRadius: 4, background: i < STEP ? 'var(--ms-orange)' : 'var(--ms-green-100)' }}
                />
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
              {t.steps.map((label, i) => (
                <span
                  key={label}
                  style={{
                    fontSize: 12.5,
                    fontWeight: i === STEP - 1 ? 800 : 600,
                    color: i === STEP - 1 ? 'var(--ms-ink)' : 'var(--ms-muted)',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </header>

        <section style={{ padding: '18px 20px 0' }}>
          {renderCameraSection()}
        </section>

        <div
          style={{
            position: 'sticky',
            bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
            marginTop: 18,
            padding: '14px 20px 6px',
            background: 'linear-gradient(to top, var(--ms-bg) 70%, rgba(246,248,245,0))',
          }}
        >
          <button
            type="button"
            disabled={!canNext}
            onClick={handleNext}
            style={{
              width: '100%',
              height: 62,
              border: 0,
              borderRadius: 22,
              cursor: canNext ? 'pointer' : 'default',
              fontSize: 19,
              fontWeight: 800,
              background: canNext ? 'var(--ms-orange)' : '#e3e9e5',
              color: canNext ? '#fff' : '#9aa7a0',
              boxShadow: canNext ? '0 10px 22px rgba(240, 121, 75, 0.35)' : 'none',
            }}
          >
            {t.next}
          </button>
        </div>
      </div>

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '32px 24px 48px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', gap: 32, alignItems: 'flex-start', justifyContent: 'center' }}>
          {/* Side Progress & Patient Card */}
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                background: 'var(--ms-surface)',
                borderRadius: 24,
                border: '1px solid var(--ms-border)',
                padding: '22px',
                boxShadow: 'var(--ms-shadow-card)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ms-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t.stepOf}
              </span>
              <h3 style={{ margin: '6px 0 16px', fontSize: 18, fontWeight: 800, color: 'var(--ms-ink)' }}>
                {t.steps[STEP - 1]}
              </h3>

              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 14 }}>
                {t.steps.map((label, i) => {
                  const isCurrent = i === STEP - 1;
                  const isDone = i < STEP - 1;
                  return (
                    <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 13,
                          fontWeight: 800,
                          background: isCurrent ? 'var(--ms-orange)' : isDone ? 'var(--ms-green-500)' : 'var(--ms-green-100)',
                          color: isCurrent || isDone ? '#fff' : 'var(--ms-green-700)',
                        }}
                      >
                        {isDone ? '✓' : i + 1}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: isCurrent ? 800 : 600, color: isCurrent ? 'var(--ms-ink)' : 'var(--ms-muted)' }}>
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Patient Info Card */}
            <div
              style={{
                background: 'var(--ms-green-100)',
                borderRadius: 24,
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--ms-green-500)',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <circle cx="12" cy="8" r="3.6" />
                  <path d="M5 20a7 7 0 0 1 14 0" />
                </svg>
              </span>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ms-green-900)' }}>
                {getPatientSummary(patientId, lang)}
              </p>
            </div>
          </div>

          {/* Centred Form Card up to about 640px */}
          <div
            style={{
              width: '100%',
              maxWidth: 640,
              background: 'var(--ms-surface)',
              borderRadius: 28,
              border: '1px solid var(--ms-border)',
              boxShadow: 'var(--ms-shadow-card)',
              padding: '32px 36px',
            }}
          >
            {renderCameraSection()}

            <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderTop: '1px solid var(--ms-border)', paddingTop: 20 }}>
              <button
                type="button"
                onClick={() => onNavigate('/mitanin/screening/symptoms')}
                style={{
                  padding: '12px 20px',
                  border: '1.5px solid var(--ms-border)',
                  borderRadius: 16,
                  background: 'var(--ms-bg)',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 800,
                  color: 'var(--ms-green-700)',
                }}
              >
                ← {lang === 'hi' ? 'पीछे' : 'Back'}
              </button>
              <button
                type="button"
                disabled={!canNext}
                onClick={handleNext}
                style={{
                  padding: '14px 32px',
                  border: 0,
                  borderRadius: 18,
                  cursor: canNext ? 'pointer' : 'default',
                  fontSize: 17,
                  fontWeight: 800,
                  background: canNext ? 'var(--ms-orange)' : '#e3e9e5',
                  color: canNext ? '#fff' : '#9aa7a0',
                  boxShadow: canNext ? '0 8px 20px rgba(240, 121, 75, 0.35)' : 'none',
                }}
              >
                {t.next} →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

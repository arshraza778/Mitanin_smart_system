import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';

const STEP = 3;
type Result = 'positive' | 'negative' | 'invalid';
type CamState = 'starting' | 'ready' | 'unavailable';

const COPY = { en: enLocale.screens.TestPhoto, hi: hiLocale.screens.TestPhoto } as const;

const RESULT_STYLE: Record<Result, { bg: string; glyph: string }> = {
  positive: { bg: 'var(--ms-orange)', glyph: '+' },
  negative: { bg: 'var(--ms-green-500)', glyph: '−' },
  invalid: { bg: 'var(--ms-violet)', glyph: '!' },
};

/* Rough on-device checks on a small grayscale sample of the live frame. */
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
  // Variance of the Laplacian: low values mean a blurry frame.
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

function CassetteDemo() {
  return (
    <svg viewBox="0 0 300 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
      <rect width="300" height="200" fill="#1c3a2b" />
      <rect x="60" y="72" width="180" height="56" rx="10" fill="#f1f5f2" />
      <rect x="76" y="86" width="34" height="28" rx="6" fill="#d9e2dc" />
      <rect x="122" y="84" width="104" height="32" rx="6" fill="#fff" stroke="var(--ms-border)" />
      <rect x="150" y="84" width="3" height="32" fill="#d9534f" />
      <rect x="176" y="84" width="3" height="32" fill="#d9534f" />
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

export default function TestPhoto({ lang, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const videoRef = useRef<HTMLVideoElement>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const [cam, setCam] = useState<CamState>('starting');
  const [quality, setQuality] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [photo, setPhoto] = useState<string | 'demo' | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  // Camera runs only while no photo is held.
  useEffect(() => {
    if (photo) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setCam('starting');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCam('unavailable');
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
      })
      .catch(() => !cancelled && setCam('unavailable'));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [photo]);

  // Live quality chips.
  useEffect(() => {
    if (photo) return;
    if (cam === 'unavailable') {
      setQuality([true, true, true]); // demo view: show the happy path
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
      // Control line: placeholder rule, needs a real detector before field use.
      setQuality([r.sharp, r.light, r.sharp && r.light]);
    }, 700);
    return () => window.clearInterval(id);
  }, [cam, photo]);

  const capture = useCallback(() => {
    if (cam === 'unavailable') {
      setPhoto('demo');
      return;
    }
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    setPhoto(c.toDataURL('image/jpeg', 0.85));
  }, [cam]);

  const retake = () => {
    setPhoto(null);
    setResult(null);
  };

  const canNext = result === 'positive' || result === 'negative';

  return (
    <div>
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
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            aspectRatio: '4 / 4.4',
            borderRadius: 28,
            background: '#12241b',
          }}
        >
          {photo ? (
            photo === 'demo' ? (
              <CassetteDemo />
            ) : (
              <img src={photo} alt={t.photoAlt} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            )
          ) : cam === 'unavailable' ? (
            <CassetteDemo />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          {!photo && (
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

        {cam === 'unavailable' && !photo && (
          <p style={{ margin: '10px 4px 0', fontSize: 12.5, color: 'var(--ms-muted)' }}>{t.demo}</p>
        )}

        {!photo && (
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
        )}

        <div style={{ margin: '18px 0 0', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
          <button
            type="button"
            onClick={retake}
            disabled={!photo}
            style={{
              justifySelf: 'start',
              padding: '14px 6px',
              border: 0,
              background: 'none',
              cursor: photo ? 'pointer' : 'default',
              fontSize: 17,
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
            style={{
              width: 78,
              height: 78,
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
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: photo ? 'var(--ms-border)' : 'var(--ms-orange)',
              }}
            />
          </button>
          <span />
        </div>

        {photo && (
          <div style={{ marginTop: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{t.choose}</h2>
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
                      minHeight: 96,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '10px 4px',
                      borderRadius: 22,
                      cursor: 'pointer',
                      fontSize: 15,
                      fontWeight: 800,
                      border: `2px solid ${on ? st.bg : 'transparent'}`,
                      background: on ? st.bg : 'var(--ms-surface)',
                      color: on ? '#fff' : 'var(--ms-ink)',
                      boxShadow: '0 4px 16px rgba(31, 77, 56, 0.07)',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 22,
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
                  fontSize: 16,
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
                fontSize: 13.5,
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
          onClick={() => onNavigate('/mitanin/screening/result')}
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
  );
}

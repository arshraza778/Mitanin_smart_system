import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  FileCheck,
  Image as ImageIcon,
  User,
  X,
} from 'lucide-react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { useCaseStore } from '../store/CaseStore';
import { useScreenDraft } from '../ScreenDraftContext';
import {
  createCassetteJpeg,
  downscaleImageToJpeg,
  readFileAsDownscaledJpeg,
} from '../domain/photoUtils';

const STEP = 3;
type Result = 'positive' | 'negative' | 'invalid';
type CamState = 'idle' | 'starting' | 'ready' | 'unavailable';
type CamReason = 'permission_denied' | 'not_found' | 'insecure' | 'unknown' | null;

const COPY = { en: enLocale.screens.TestPhoto, hi: hiLocale.screens.TestPhoto } as const;

const RESULT_STYLE: Record<Result, { bg: string; text: string; activeBg: string; glyph: string }> = {
  positive: { bg: '#FFDAD6', text: '#BA1A1A', activeBg: '#BA1A1A', glyph: '+' },
  negative: { bg: '#DAF1DE', text: '#235347', activeBg: '#2E7D4F', glyph: '−' },
  invalid: { bg: '#FFF1CC', text: '#8A5A00', activeBg: '#8A5A00', glyph: '!' },
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
      <rect width="300" height="200" fill="#053C31" />
      <rect x="60" y="72" width="180" height="56" rx="10" fill="#F8FAF9" />
      <rect x="76" y="86" width="34" height="28" rx="6" fill="#CCD9D2" />
      <rect x="122" y="84" width="104" height="32" rx="6" fill="#FFFFFF" stroke="#CCD9D2" />
      {/* Control line C (present in positive and negative; absent in invalid) */}
      {(type === 'positive' || type === 'negative') && (
        <rect x="150" y="84" width="3" height="32" fill="#BA1A1A" />
      )}
      {/* Test line T (present in positive and invalid) */}
      {(type === 'positive' || type === 'invalid') && (
        <rect x="176" y="84" width="3" height="32" fill="#BA1A1A" />
      )}
      <text x="151.5" y="80" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#707975">C</text>
      <text x="177.5" y="80" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#707975">T</text>
    </svg>
  );
}

export default function TestPhoto({ lang, online = true, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const { updateScreening, getCaseByPatientId, currentScreening, getPatientSummary } = useCaseStore();
  const { getTestResult, setTestResult, getTestPhoto, setTestPhoto } = useScreenDraft();
  const patientId = currentScreening?.patientId || 'p1';
  const existingCase = getCaseByPatientId(patientId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef<boolean>(true);

  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [cam, setCam] = useState<CamState>('idle');
  const [camReason, setCamReason] = useState<CamReason>(null);
  const [camFeedbackMessage, setCamFeedbackMessage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [quality, setQuality] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [photo, setPhotoState] = useState<string | null>(() => {
    const draftPhoto = getTestPhoto(patientId);
    if (draftPhoto !== null) return draftPhoto;
    if (existingCase?.photoData) return existingCase.photoData;
    if (typeof existingCase?.photo === 'string' && existingCase.photo.startsWith('data:image')) {
      return existingCase.photo;
    }
    return null;
  });
  const setPhoto = (valOrFn: string | null | ((prev: string | null) => string | null)) => {
    setPhotoState((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      setTestPhoto(patientId, next);
      return next;
    });
  };

  const [isDemoPhoto, setIsDemoPhoto] = useState<boolean>(() => Boolean(existingCase?.photoIsDemo));
  const [result, setResultState] = useState<Result | null>(() => {
    const draftRes = getTestResult(patientId);
    if (draftRes !== null) return draftRes;
    return existingCase?.testResult ?? 'positive';
  });
  const setResult = (valOrFn: Result | null | ((prev: Result | null) => Result | null)) => {
    setResultState((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      if (next) setTestResult(patientId, next);
      return next;
    });
  };
  const [showDemoMenu, setShowDemoMenu] = useState<boolean>(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActiveStream(null);
    setCameraActive(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Set srcObject and play in effect
  useEffect(() => {
    const video = videoRef.current;
    if (video && activeStream) {
      video.srcObject = activeStream;
      video.play().catch((err) => {
        console.warn('Video play interrupted or prevented:', err);
      });
    }
  }, [activeStream]);

  const handleOpenCamera = async () => {
    setStorageError(null);
    setCamFeedbackMessage(null);

    if (
      typeof window !== 'undefined' &&
      window.isSecureContext === false &&
      window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setCam('unavailable');
      setCamReason('insecure');
      setCamFeedbackMessage(t.insecurePage);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCam('unavailable');
      setCamReason('not_found');
      setCamFeedbackMessage(t.noCameraFound);
      return;
    }

    setCam('starting');
    stopCameraStream();

    let stream: MediaStream | null = null;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch (err: any) {
        if (err?.name === 'OverconstrainedError') {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } else {
          throw err;
        }
      }

      if (!mountedRef.current) {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        return;
      }

      streamRef.current = stream;
      setActiveStream(stream);
      setCam('ready');
      setCameraActive(true);
      setCamReason(null);
      setCamFeedbackMessage(null);
    } catch (err: any) {
      console.error('Camera error:', err);

      if (!mountedRef.current) {
        if (stream) stream.getTracks().forEach((track) => track.stop());
        return;
      }

      setCam('unavailable');
      const errName = err?.name;
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCamReason('permission_denied');
        setCamFeedbackMessage(t.permissionBlocked);
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCamReason('not_found');
        setCamFeedbackMessage(t.noCameraFound);
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCamReason('unknown');
        setCamFeedbackMessage(t.cameraInUse);
      } else {
        setCamReason('unknown');
        setCamFeedbackMessage(t.cameraCouldNotStart);
      }
    }
  };

  useEffect(() => {
    if (!cameraActive || cam !== 'ready') return;
    scratchRef.current ??= document.createElement('canvas');
    const id = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || !scratchRef.current) return;
      const r = analyseFrame(v, scratchRef.current);
      if (!r) return;
      setQuality([r.sharp, r.light, r.sharp && r.light]);
    }, 700);

    return () => window.clearInterval(id);
  }, [cameraActive, cam]);

  const captureLive = useCallback(() => {
    const v = videoRef.current;
    if (!v || v.videoWidth <= 0 || v.videoHeight <= 0) {
      setCamFeedbackMessage(t.cameraStillStarting);
      return;
    }
    const jpeg = downscaleImageToJpeg(v, v.videoWidth, v.videoHeight, 800, 0.7);
    if (jpeg) {
      setPhoto(jpeg);
      setIsDemoPhoto(false);
      setQuality([true, true, true]);
      stopCameraStream();
    }
  }, [stopCameraStream, t.cameraStillStarting]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const jpeg = await readFileAsDownscaledJpeg(file, 800, 0.7);
      if (jpeg) {
        setPhoto(jpeg);
        setIsDemoPhoto(false);
        setQuality([true, true, true]);
        stopCameraStream();
        setCamFeedbackMessage(null);
      }
    } catch {
      setStorageError(t.storageError);
    }
  };

  const handleSelectDemo = (type: 'positive' | 'negative' | 'invalid') => {
    const demoJpeg = createCassetteJpeg(type);
    setPhoto(demoJpeg);
    setIsDemoPhoto(true);
    setQuality([true, true, true]);
    setResult(type);
    setShowDemoMenu(false);
    stopCameraStream();
    setCamFeedbackMessage(null);
  };

  const retake = () => {
    setPhoto(null);
    setIsDemoPhoto(false);
    setResult(null);
    setStorageError(null);
    setCamFeedbackMessage(null);
    stopCameraStream();
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleNext = () => {
    try {
      stopCameraStream();
      updateScreening(
        {
          patientId,
          photo: Boolean(photo),
          photoData: photo || undefined,
          photoIsDemo: isDemoPhoto,
          testResult: result || 'positive',
          state: 'SCREENED',
        },
        online
      );
      onNavigate('/mitanin/screening/result');
    } catch {
      setStorageError(t.storageError);
    }
  };

  const canNext = result === 'positive' || result === 'negative';

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

  const renderCameraBox = () => (
    <div
      data-testid="camera-area"
      style={{
        position: 'relative',
        overflow: 'hidden',
        aspectRatio: '4 / 3.2',
        borderRadius: 20,
        background: '#051F20',
        border: '2px solid #163832',
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
            background: '#051F20',
          }}
        />
      ) : cameraActive && cam === 'ready' ? (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : camFeedbackMessage || cam === 'unavailable' ? (
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
            background: '#051F20',
            color: '#FFFFFF',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFDAD6',
            }}
          >
            <AlertCircle size={24} color="#FFDAD6" />
          </div>
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, lineHeight: 1.35, maxWidth: 300, color: '#FFFFFF' }}>
            {camFeedbackMessage || t.cameraUnavailableMsg}
          </p>
          {camReason && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 999,
                background: '#FFF1CC',
                border: '1px solid #FFF1CC',
                fontSize: 12,
                fontWeight: 700,
                color: '#8A5A00',
              }}
            >
              <span>{t.reasons[camReason] || t.reasons.unknown}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleOpenCamera}
            className="ms-btn ms-btn--on-dark ms-btn--sm"
            style={{
              marginTop: 6,
              borderRadius: 999,
            }}
          >
            {t.tryAgain}
          </button>
        </div>
      ) : (
        /* Idle Frame placeholder */
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 20px',
            textAlign: 'center',
            background: '#051F20',
            color: '#FFFFFF',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <Camera size={26} color="#FFFFFF" />
          </div>
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: '#DAF1DE' }}>
            {t.place}
          </p>
        </div>
      )}

      {/* Viewfinder Alignment Guide Box (Overlay) */}
      {!photo && cameraActive && cam === 'ready' && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: '16px 24px',
            pointerEvents: 'none',
            border: '2px solid #8EB69B',
            borderRadius: 14,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 10,
            boxShadow: '0 0 0 9999px rgba(5, 31, 32, 0.45)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ width: 14, height: 14, borderTop: '2px solid #FFFFFF', borderLeft: '2px solid #FFFFFF' }} />
            <span style={{ width: 14, height: 14, borderTop: '2px solid #FFFFFF', borderRight: '2px solid #FFFFFF' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                gap: 10,
                padding: '4px 10px',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.75)',
                border: '1px solid #8EB69B',
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#DAF1DE',
              }}
            >
              <span>[ C ] Control</span>
              <span>[ T ] Test</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ width: 14, height: 14, borderBottom: '2px solid #FFFFFF', borderLeft: '2px solid #FFFFFF' }} />
            <span style={{ width: 14, height: 14, borderBottom: '2px solid #FFFFFF', borderRight: '2px solid #FFFFFF' }} />
          </div>
        </div>
      )}
    </div>
  );

  const renderQualityChips = () => {
    if (!cameraActive && !photo) return null;
    return (
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
                padding: '5px 12px 5px 8px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background: ok ? '#DAF1DE' : '#FFDAD6',
                color: ok ? '#235347' : '#BA1A1A',
                border: `1px solid ${ok ? 'rgba(142, 182, 155, 0.4)' : '#FFDAD6'}`,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: ok ? '#2E7D4F' : '#BA1A1A',
                  color: '#FFFFFF',
                }}
              >
                {ok ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
              </span>
              {label}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderShutterButton = () => {
    if (!cameraActive || photo) return null;
    return (
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={captureLive}
          aria-label={t.capture}
          data-testid="capture-button"
          className="ms-btn ms-btn--shutter"
        >
          <span
            aria-hidden
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#235347',
            }}
          />
        </button>
      </div>
    );
  };

  const renderPhotoSources = () => {
    if (photo) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Option 1: Live Camera */}
        <button
          type="button"
          onClick={handleOpenCamera}
          data-testid="option-open-camera"
          className={`ms-btn ms-btn--card ${cameraActive ? 'ms-btn--card-primary' : ''}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            fontSize: 14.5,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#DAF1DE',
              color: '#235347',
              flexShrink: 0,
            }}
          >
            <Camera size={18} />
          </div>
          <span style={{ flex: 1 }}>{t.openCamera}</span>
          <span style={{ fontSize: 16, color: '#707975' }}>→</span>
        </button>

        {/* Option 2: Gallery */}
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          data-testid="option-choose-gallery"
          className="ms-btn ms-btn--card"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            fontSize: 14.5,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#E7F0EA',
              color: '#163832',
              flexShrink: 0,
            }}
          >
            <ImageIcon size={18} />
          </div>
          <span style={{ flex: 1 }}>{t.chooseGallery}</span>
          <span style={{ fontSize: 16, color: '#707975' }}>→</span>
        </button>

        {/* Option 3: Demo Photo */}
        <div style={{ borderRadius: 14, border: '1px solid #E3ECE7', background: '#FFFFFF', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setShowDemoMenu((v) => !v)}
            aria-expanded={showDemoMenu}
            data-testid="option-use-demo"
            className="ms-btn ms-btn--ghost ms-btn--block"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 16px',
              fontSize: 14.5,
              fontWeight: 700,
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#DAF1DE',
                  color: '#2E7D4F',
                  flexShrink: 0,
                }}
              >
                <FileCheck size={18} />
              </div>
              <span>{t.useDemoPhoto}</span>
            </div>
            <ChevronDown
              size={18}
              color="#707975"
              style={{
                transform: showDemoMenu ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            />
          </button>

          {showDemoMenu && (
            <div style={{ padding: '0 12px 12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {(['positive', 'negative', 'invalid'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectDemo(key)}
                  data-testid={`demo-cassette-${key}`}
                  className="ms-btn ms-btn--secondary ms-btn--card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 4px',
                    borderRadius: 12,
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', height: 38, borderRadius: 6, overflow: 'hidden' }}>
                    <CassetteDemo type={key} />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#00201C', textAlign: 'center' }}>
                    {t.demoCassettes[key]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRetakeButton = () => {
    if (!photo) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
        <button
          type="button"
          onClick={retake}
          data-testid="retake-button"
          className="ms-btn ms-btn--secondary ms-btn--md"
        >
          {t.retake}
        </button>
      </div>
    );
  };

  const renderResultSelector = () => {
    if (!photo) return null;
    return (
      <div style={{ marginTop: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#00201C' }}>{t.choose}</h2>
        <div role="radiogroup" aria-label={t.choose} style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
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
                className={`ms-btn ${on ? (key === 'positive' || key === 'invalid' ? 'ms-btn--danger' : 'ms-btn--primary') : 'ms-btn--secondary'} ms-btn--md`}
                style={{
                  minHeight: 82,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 4px',
                  borderRadius: 16,
                  cursor: 'pointer',
                  fontSize: 13.5,
                  fontWeight: 700,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 800,
                    lineHeight: 1,
                    background: on ? 'rgba(255,255,255,0.25)' : st.bg,
                    color: on ? '#FFFFFF' : st.text,
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
              marginTop: 12,
              padding: '12px 14px',
              borderRadius: 14,
              fontSize: 13.5,
              fontWeight: 700,
              background: '#FFF1CC',
              color: '#8A5A00',
              border: '1px solid #FFF1CC',
            }}
          >
            {t.repeat}
          </div>
        )}

        <p
          style={{
            margin: '12px 2px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12.5,
            color: '#707975',
            fontWeight: 500,
          }}
        >
          <AlertCircle size={16} color="#707975" style={{ flexShrink: 0 }} />
          {t.note}
        </p>
      </div>
    );
  };

  const renderCameraSection = () => (
    <>
      {renderCameraBox()}

      {/* Hidden file input 1 */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        data-testid="camera-file-input"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Hidden file input 2 */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        data-testid="gallery-file-input"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Storage Error Banner */}
      {storageError && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: '10px 14px',
            borderRadius: 12,
            background: '#FFDAD6',
            color: '#BA1A1A',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <span>{storageError}</span>
          <button
            type="button"
            onClick={() => setStorageError(null)}
            className="ms-btn ms-btn--ghost ms-btn--sm"
            style={{ fontSize: 16, fontWeight: 700, color: '#BA1A1A' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 3 Photo Source Options */}
      {!photo ? (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Option 1: Live Camera */}
          <button
            type="button"
            onClick={handleOpenCamera}
            data-testid="option-open-camera"
            className={`ms-btn ms-btn--card ${cameraActive ? 'ms-btn--card-primary' : ''}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              fontSize: 14.5,
              fontWeight: 700,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#DAF1DE',
                color: '#235347',
                flexShrink: 0,
              }}
            >
              <Camera size={18} />
            </div>
            <span style={{ flex: 1 }}>{t.openCamera}</span>
            <span style={{ fontSize: 16, color: '#707975' }}>→</span>
          </button>

          {/* Option 2: Gallery */}
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            data-testid="option-choose-gallery"
            className="ms-btn ms-btn--card"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              fontSize: 14.5,
              fontWeight: 700,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#E7F0EA',
                color: '#163832',
                flexShrink: 0,
              }}
            >
              <ImageIcon size={18} />
            </div>
            <span style={{ flex: 1 }}>{t.chooseGallery}</span>
            <span style={{ fontSize: 16, color: '#707975' }}>→</span>
          </button>

          {/* Option 3: Demo Photo */}
          <div style={{ borderRadius: 14, border: '1px solid #E3ECE7', background: '#FFFFFF', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setShowDemoMenu((v) => !v)}
              aria-expanded={showDemoMenu}
              data-testid="option-use-demo"
              className="ms-btn ms-btn--ghost ms-btn--block"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 16px',
                fontSize: 14.5,
                fontWeight: 700,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#DAF1DE',
                    color: '#2E7D4F',
                    flexShrink: 0,
                  }}
                >
                  <FileCheck size={18} />
                </div>
                <span>{t.useDemoPhoto}</span>
              </div>
              <ChevronDown
                size={18}
                color="#707975"
                style={{
                  transform: showDemoMenu ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              />
            </button>

            {showDemoMenu && (
              <div style={{ padding: '0 12px 12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {(['positive', 'negative', 'invalid'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectDemo(key)}
                    data-testid={`demo-cassette-${key}`}
                    className="ms-btn ms-btn--secondary ms-btn--card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 4px',
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: 38, borderRadius: 6, overflow: 'hidden' }}>
                      <CassetteDemo type={key} />
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#00201C', textAlign: 'center' }}>
                      {t.demoCassettes[key]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Quality chips */}
      {(cameraActive || photo) && (
        <ul
          aria-live="polite"
          style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}
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
                  padding: '5px 12px 5px 8px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  background: ok ? '#DAF1DE' : '#FFDAD6',
                  color: ok ? '#235347' : '#BA1A1A',
                  border: `1px solid ${ok ? 'rgba(142, 182, 155, 0.4)' : '#FFDAD6'}`,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: ok ? '#2E7D4F' : '#BA1A1A',
                    color: '#FFFFFF',
                  }}
                >
                  {ok ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                </span>
                {label}
              </li>
            );
          })}
        </ul>
      )}

      {/* Retake and Shutter Button Controls */}
      <div style={{ margin: '14px 0 0', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        <button
          type="button"
          onClick={retake}
          disabled={!photo}
          data-testid="retake-button"
          className="ms-btn ms-btn--ghost ms-btn--md"
          style={{
            justifySelf: 'start',
            padding: '10px 4px',
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          {t.retake}
        </button>

        {/* Live shutter capture button */}
        <button
          type="button"
          onClick={captureLive}
          disabled={!cameraActive || !!photo}
          aria-label={t.capture}
          data-testid="capture-button"
          className="ms-btn ms-btn--shutter"
        >
          <span
            aria-hidden
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: cameraActive && !photo ? '#235347' : '#CCD9D2',
            }}
          />
        </button>
        <span />
      </div>

      {photo && (
        <div style={{ marginTop: 18 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#00201C' }}>{t.choose}</h2>
          <div role="radiogroup" aria-label={t.choose} style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
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
                  className={`ms-btn ${on ? (key === 'positive' || key === 'invalid' ? 'ms-btn--danger' : 'ms-btn--primary') : 'ms-btn--secondary'} ms-btn--md`}
                  style={{
                    minHeight: 82,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 4px',
                    borderRadius: 16,
                    cursor: 'pointer',
                    fontSize: 13.5,
                    fontWeight: 700,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 800,
                      lineHeight: 1,
                      background: on ? 'rgba(255,255,255,0.25)' : st.bg,
                      color: on ? '#FFFFFF' : st.text,
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
                marginTop: 12,
                padding: '12px 14px',
                borderRadius: 14,
                fontSize: 13.5,
                fontWeight: 700,
                background: '#FFF1CC',
                color: '#8A5A00',
                border: '1px solid #FFF1CC',
              }}
            >
              {t.repeat}
            </div>
          )}

          <p
            style={{
              margin: '12px 2px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12.5,
              color: '#707975',
              fontWeight: 500,
            }}
          >
            <AlertCircle size={16} color="#707975" style={{ flexShrink: 0 }} />
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
              onClick={() => onNavigate('/mitanin/screening/symptoms')}
              aria-label={lang === 'hi' ? 'पीछे' : 'Back'}
              className="ms-btn ms-btn--ghost ms-btn--icon"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#051F20', lineHeight: 1.2 }}>
                {t.takeOrUpload}
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707975', fontWeight: 500 }}>
                {t.stepOf}: {t.steps[STEP - 1]}
              </p>
            </div>
          </div>
        </header>

        <section style={{ padding: '16px 16px 100px' }}>
          {renderStepper()}
          {renderPatientSummaryBar()}

          <div style={{ marginTop: 16 }}>
            {renderCameraSection()}
          </div>
        </section>

        {/* Sticky Bottom Actions */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            padding: '12px 16px calc(14px + env(safe-area-inset-bottom, 0px))',
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
            onClick={() => onNavigate('/mitanin/screening/symptoms')}
            className="ms-btn ms-btn--secondary ms-btn--lg"
          >
            <ArrowLeft size={18} />
            <span>{lang === 'hi' ? 'पीछे' : 'Back'}</span>
          </button>
          <button
            type="button"
            disabled={!canNext}
            aria-disabled={!canNext}
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
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
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
            <div style={{ marginTop: 18 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#00201C' }}>{t.takeOrUpload}</h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: '#707975', fontWeight: 500 }}>
                {t.stepOf}: {t.steps[STEP - 1]}
              </p>
            </div>
          </header>

          <main
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
              gap: 28,
              alignItems: 'start',
            }}
          >
            {/* Left: camera or photo frame with quality chips */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                border: '1px solid #E3ECE7',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              {renderCameraBox()}
              {renderQualityChips()}
              {renderShutterButton()}
            </div>

            {/* Right: Open camera, Choose from files or gallery, Use demo photo, result selector, Retake, Next */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                border: '1px solid #E3ECE7',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                position: 'sticky',
                top: 88,
              }}
            >
              {renderPhotoSources()}
              {renderRetakeButton()}
              {renderResultSelector()}
            </div>
          </main>

          <div
            style={{
              marginTop: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E3ECE7',
              padding: '16px 24px',
            }}
          >
            <button
              type="button"
              onClick={() => onNavigate('/mitanin/screening/symptoms')}
              className="ms-btn ms-btn--secondary ms-btn--md"
            >
              <ArrowLeft size={18} />
              <span>{lang === 'hi' ? 'पीछे' : 'Back'}</span>
            </button>
            <button
              type="button"
              disabled={!canNext}
              aria-disabled={!canNext}
              onClick={handleNext}
              className="ms-btn ms-btn--primary ms-btn--md"
            >
              <span>{t.next}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


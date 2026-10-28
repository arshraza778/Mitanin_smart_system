import { useEffect, useRef, useState } from 'react';
import { isMotionOff } from './initMotion';

/**
 * Shared RequestAnimationFrame Manager
 * Ensures many counters across the application share a single RAF loop.
 */
type RafCallback = (timestamp: number) => void;
const rafCallbacks = new Set<RafCallback>();
let sharedRafId: number | null = null;

function globalRafTick(now: number) {
  // Snapshot callbacks to prevent issues if a callback unregisters during iteration
  const callbacks = Array.from(rafCallbacks);
  for (const cb of callbacks) {
    cb(now);
  }
  if (rafCallbacks.size > 0) {
    sharedRafId = requestAnimationFrame(globalRafTick);
  } else {
    sharedRafId = null;
  }
}

function registerRaf(callback: RafCallback): () => void {
  rafCallbacks.add(callback);
  if (sharedRafId === null && typeof requestAnimationFrame !== 'undefined') {
    sharedRafId = requestAnimationFrame(globalRafTick);
  }
  return () => {
    rafCallbacks.delete(callback);
    if (rafCallbacks.size === 0 && sharedRafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(sharedRafId);
      sharedRafId = null;
    }
  };
}

// Cubic bezier evaluator for --ms-ease-out: cubic-bezier(0.2, 0, 0, 1)
function cubicBezier(t: number, p1x: number, p1y: number, p2x: number, p2y: number): number {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  function sampleCurveX(u: number) {
    return ((ax * u + bx) * u + cx) * u;
  }
  function sampleCurveY(u: number) {
    return ((ay * u + by) * u + cy) * u;
  }
  function sampleCurveDerivativeX(u: number) {
    return (3 * ax * u + 2 * bx) * u + cx;
  }

  let u = t;
  for (let i = 0; i < 8; i++) {
    const x = sampleCurveX(u) - t;
    if (Math.abs(x) < 1e-5) break;
    const d = sampleCurveDerivativeX(u);
    if (Math.abs(d) < 1e-5) break;
    u -= x / d;
  }
  u = Math.max(0, Math.min(1, u));
  return sampleCurveY(u);
}

export function easeOutMs(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return cubicBezier(t, 0.2, 0, 0, 1);
}

export interface UseCountUpOptions {
  value: number | null | undefined;
  cap?: number;
}

export function useCountUp({ value, cap }: UseCountUpOptions): {
  displayValue: number | null;
  finalValue: number | null;
} {
  const normalizedFinal: number | null =
    value === null || value === undefined || Number.isNaN(value)
      ? null
      : typeof cap === 'number'
      ? Math.min(cap, value)
      : value;

  const motionDisabled = isMotionOff();

  const [displayValue, setDisplayValue] = useState<number | null>(() => {
    if (motionDisabled || normalizedFinal === null) {
      return normalizedFinal;
    }
    return 0;
  });

  const displayRef = useRef<number | null>(displayValue);
  displayRef.current = displayValue;

  const isMountedRef = useRef(true);
  const prevFinalRef = useRef<number | null>(normalizedFinal);
  const unregisterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (unregisterRef.current) {
        unregisterRef.current();
        unregisterRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // If motion is off or value is null, set immediately without animation
    if (isMotionOff() || normalizedFinal === null) {
      if (unregisterRef.current) {
        unregisterRef.current();
        unregisterRef.current = null;
      }
      displayRef.current = normalizedFinal;
      setDisplayValue(normalizedFinal);
      prevFinalRef.current = normalizedFinal;
      return;
    }

    const prevFinal = prevFinalRef.current;
    const currentDisplay = displayRef.current ?? 0;

    // Equal values never animate
    if (prevFinal !== null && prevFinal === normalizedFinal && currentDisplay === normalizedFinal) {
      return;
    }

    // Determine duration: 800ms on first appearance (prevFinal was null or start from 0), 400ms on value change
    const isFirstAppearance = prevFinal === null || (currentDisplay === 0 && prevFinal === 0);
    const duration = isFirstAppearance ? 800 : 400;
    const startVal = currentDisplay;
    const targetVal = normalizedFinal;
    prevFinalRef.current = normalizedFinal;

    if (startVal === targetVal) {
      displayRef.current = targetVal;
      setDisplayValue(targetVal);
      return;
    }

    // Check if tab is currently hidden
    if (typeof document !== 'undefined' && document.hidden) {
      displayRef.current = targetVal;
      setDisplayValue(targetVal);
      return;
    }

    if (unregisterRef.current) {
      unregisterRef.current();
      unregisterRef.current = null;
    }

    let startTime: number | null = null;

    const tick = (now: number) => {
      if (!isMountedRef.current) return;

      // If document became hidden, jump directly to final value
      if (typeof document !== 'undefined' && document.hidden) {
        displayRef.current = targetVal;
        setDisplayValue(targetVal);
        if (unregisterRef.current) {
          unregisterRef.current();
          unregisterRef.current = null;
        }
        return;
      }

      if (startTime === null) {
        startTime = now;
      }

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = easeOutMs(progress);
      const interpolated = startVal + (targetVal - startVal) * easedProgress;

      if (progress >= 1) {
        displayRef.current = targetVal;
        setDisplayValue(targetVal);
        if (unregisterRef.current) {
          unregisterRef.current();
          unregisterRef.current = null;
        }
      } else {
        displayRef.current = interpolated;
        setDisplayValue(interpolated);
      }
    };

    unregisterRef.current = registerRaf(tick);

    return () => {
      if (unregisterRef.current) {
        unregisterRef.current();
        unregisterRef.current = null;
      }
    };
  }, [normalizedFinal]);

  // Jump to final value on visibility change (tab hidden)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      if (document.hidden && normalizedFinal !== null) {
        if (unregisterRef.current) {
          unregisterRef.current();
          unregisterRef.current = null;
        }
        displayRef.current = normalizedFinal;
        setDisplayValue(normalizedFinal);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [normalizedFinal]);

  return {
    displayValue,
    finalValue: normalizedFinal,
  };
}

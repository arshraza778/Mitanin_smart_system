/**
 * Global Motion Controller for Mitanin Signal
 *
 * Disables all entrance motion when:
 * 1. prefers-reduced-motion: reduce
 * 2. URL contains ?noanim=1
 * 3. navigator.webdriver is true (automated test runs)
 *
 * Implemented once as data-motion="off" on <html>
 */

export function isMotionOff(): boolean {
  if (typeof window === 'undefined') return true;

  // Check <html> attribute first
  if (typeof document !== 'undefined' && document.documentElement.getAttribute('data-motion') === 'off') {
    return true;
  }

  // Check URL param ?noanim=1
  try {
    if (window.location && window.location.search && window.location.search.includes('noanim=1')) {
      return true;
    }
  } catch {
    // ignore
  }

  // Check navigator.webdriver
  try {
    if (window.navigator && window.navigator.webdriver) {
      return true;
    }
  } catch {
    // ignore
  }

  // Check prefers-reduced-motion
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export function initMotion(): void {
  if (typeof document === 'undefined') return;

  const applyMotionState = () => {
    if (isMotionOff()) {
      document.documentElement.setAttribute('data-motion', 'off');
    } else {
      document.documentElement.removeAttribute('data-motion');
    }
  };

  applyMotionState();

  if (typeof window !== 'undefined' && window.matchMedia) {
    try {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (media.addEventListener) {
        media.addEventListener('change', applyMotionState);
      } else if ((media as any).addListener) {
        (media as any).addListener(applyMotionState);
      }
    } catch {
      // ignore
    }
  }
}

// Auto-run on module load if in browser
if (typeof document !== 'undefined') {
  initMotion();
}

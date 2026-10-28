import { useEffect, useRef, useState } from 'react';
import { isMotionOff } from './initMotion';

export interface UseRevealOptions {
  index?: number;
  staggerMs?: number;
  maxStagger?: number;
  threshold?: number;
}

export function useReveal<T extends HTMLElement = HTMLDivElement>({
  index = 0,
  staggerMs = 40,
  maxStagger = 8,
  threshold = 0.1,
}: UseRevealOptions = {}) {
  const elementRef = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(() => isMotionOff());
  const hasAnimatedRef = useRef(isMotionOff());

  useEffect(() => {
    if (hasAnimatedRef.current || isMotionOff()) {
      setIsVisible(true);
      return;
    }

    const node = elementRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      hasAnimatedRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && (entry.isIntersecting || entry.intersectionRatio >= threshold)) {
          setIsVisible(true);
          hasAnimatedRef.current = true;
          observer.unobserve(node);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  const delayMs = index < maxStagger ? index * staggerMs : 0;
  const motionDisabled = isMotionOff();

  const style: React.CSSProperties = motionDisabled
    ? {}
    : isVisible
    ? {
        animation: `ms-fade-up-12 220ms var(--ms-ease-out) ${delayMs}ms both`,
      }
    : {
        opacity: 0,
        transform: 'translateY(12px)',
      };

  return {
    ref: elementRef,
    isVisible,
    style,
    className: motionDisabled || isVisible ? 'ms-revealed' : 'ms-reveal-pending',
  };
}

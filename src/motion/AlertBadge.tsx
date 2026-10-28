import React, { useEffect, useRef, useState } from 'react';
import { isMotionOff } from './initMotion';

export interface AlertBadgeProps {
  count: number;
  maxDisplay?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function AlertBadge({ count, maxDisplay = 99, style, className = '' }: AlertBadgeProps) {
  const prevCountRef = useRef(count);
  const [isPopping, setIsPopping] = useState(false);

  useEffect(() => {
    if (count > prevCountRef.current && !isMotionOff()) {
      setIsPopping(true);
      const timer = window.setTimeout(() => {
        setIsPopping(false);
      }, 200);
      prevCountRef.current = count;
      return () => window.clearTimeout(timer);
    }
    prevCountRef.current = count;
  }, [count]);

  if (count <= 0) return null;

  const displayCount = count > maxDisplay ? `${maxDisplay}+` : `${count}`;

  return (
    <span
      className={`${isPopping ? 'ms-animate-badge-pop' : ''} ${className}`}
      style={{
        borderRadius: 'var(--ms-radius-pill)',
        background: 'var(--ms-danger)',
        color: 'var(--ms-text-white)',
        fontSize: 10,
        fontWeight: 800,
        display: 'grid',
        placeItems: 'center',
        lineHeight: 1,
        ...style,
      }}
    >
      {displayCount}
    </span>
  );
}

export default AlertBadge;

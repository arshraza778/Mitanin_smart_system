import React from 'react';
import { useCountUp } from './useCountUp';

export interface CountUpProps {
  value: number | null | undefined;
  format?: ((val: number) => string) | string;
  cap?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function CountUp({ value, format, cap, className = '', style }: CountUpProps) {
  const { displayValue, finalValue } = useCountUp({ value, cap });

  const formatFn = (n: number | null): string => {
    if (n === null || n === undefined || Number.isNaN(n)) return '--';
    const rounded = Math.round(n);
    if (typeof format === 'function') {
      return format(rounded);
    }
    if (typeof format === 'string') {
      return `${rounded}${format}`;
    }
    return rounded.toString();
  };

  const finalText = formatFn(finalValue);
  const displayText = displayValue === null ? '--' : formatFn(displayValue);

  return (
    <span
      className={`tabular-nums ${className}`}
      style={{
        fontVariantNumeric: 'tabular-nums',
        display: 'inline-block',
        ...style,
      }}
    >
      <span className="ms-visually-hidden">{finalText}</span>
      <span aria-hidden="true">{displayText}</span>
    </span>
  );
}

export default CountUp;

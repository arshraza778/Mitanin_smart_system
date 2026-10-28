import React from 'react';
import { useReveal, UseRevealOptions } from './useReveal';

export interface RevealProps extends UseRevealOptions, React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
}

export function Reveal({
  children,
  index = 0,
  staggerMs = 40,
  maxStagger = 8,
  threshold = 0.1,
  as: Component = 'div',
  className = '',
  style: userStyle = {},
  ...rest
}: RevealProps) {
  const { ref, style: revealStyle } = useReveal<HTMLElement>({
    index,
    staggerMs,
    maxStagger,
    threshold,
  });

  return (
    <Component
      ref={ref}
      className={className}
      style={{
        ...userStyle,
        ...revealStyle,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}

export default Reveal;

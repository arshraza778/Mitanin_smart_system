import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CountUp } from '../motion/CountUp';
import { isMotionOff } from '../motion/initMotion';
import { easeOutMs } from '../motion/useCountUp';

declare const require: any;
declare const process: any;
const fs = require('node:fs');
const path = require('node:path');

// Helper to calculate contrast ratio
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 6) {
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }
  return null;
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 1;
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Motion System & CountUp Component', () => {
  it('easeOutMs accurately calculates cubic-bezier(0.2, 0, 0, 1)', () => {
    expect(easeOutMs(0)).toBe(0);
    expect(easeOutMs(1)).toBe(1);
    expect(easeOutMs(0.5)).toBeGreaterThan(0.5); // ease-out curves fast then slows
  });

  it('CountUp renders final value in hidden span and ends on exact value', () => {
    const html = renderToString(React.createElement(CountUp, { value: 42 }));
    expect(html).toContain('class="ms-visually-hidden">42</span>');
    expect(html).toContain('aria-hidden="true">42</span>');
  });

  it('CountUp handles null or undefined with "--"', () => {
    const html1 = renderToString(React.createElement(CountUp, { value: null }));
    expect(html1).toContain('class="ms-visually-hidden">--</span>');
    expect(html1).toContain('aria-hidden="true">--</span>');

    const html2 = renderToString(React.createElement(CountUp, { value: undefined }));
    expect(html2).toContain('class="ms-visually-hidden">--</span>');
    expect(html2).toContain('aria-hidden="true">--</span>');
  });

  it('CountUp handles 0 correctly', () => {
    const html = renderToString(React.createElement(CountUp, { value: 0 }));
    expect(html).toContain('class="ms-visually-hidden">0</span>');
    expect(html).toContain('aria-hidden="true">0</span>');
  });

  it('CountUp caps percentages at 100', () => {
    const html = renderToString(React.createElement(CountUp, { value: 145, cap: 100, format: '%' }));
    expect(html).toContain('class="ms-visually-hidden">100%</span>');
    expect(html).toContain('aria-hidden="true">100%</span>');
  });

  it('CountUp handles custom formatting function', () => {
    const html = renderToString(
      React.createElement(CountUp, {
        value: 12,
        format: (n: number) => `${n} cases`,
      })
    );
    expect(html).toContain('class="ms-visually-hidden">12 cases</span>');
    expect(html).toContain('aria-hidden="true">12 cases</span>');
  });

  it('handles negative numbers cleanly', () => {
    const html = renderToString(React.createElement(CountUp, { value: -5 }));
    expect(html).toContain('class="ms-visually-hidden">-5</span>');
    expect(html).toContain('aria-hidden="true">-5</span>');
  });

  it('handles large numbers cleanly', () => {
    const html = renderToString(React.createElement(CountUp, { value: 1000000 }));
    expect(html).toContain('class="ms-visually-hidden">1000000</span>');
    expect(html).toContain('aria-hidden="true">1000000</span>');
  });

  it('motion-off paths show the final value immediately', () => {
    expect(isMotionOff()).toBe(true); // Node environment has no window/browser, defaults to motion off
    const html = renderToString(React.createElement(CountUp, { value: 88 }));
    expect(html).toContain('class="ms-visually-hidden">88</span>');
    expect(html).toContain('aria-hidden="true">88</span>');
  });

  it('CountUp renders tabular-nums class and style', () => {
    const html = renderToString(React.createElement(CountUp, { value: 25 }));
    expect(html).toContain('tabular-nums');
    expect(html).toContain('font-variant-numeric:tabular-nums');
  });
});

describe('CSS Motion Grep Enforcement', () => {
  const root = process.cwd();
  const cssDir = path.join(root, 'src');

  function getCssFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getCssFiles(fullPath));
      } else if (entry.name.endsWith('.css')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const cssFiles = getCssFiles(cssDir);

  it('only animates transform, opacity, or stroke-dashoffset across all keyframes', () => {
    const allowedProperties = new Set([
      'transform',
      '-webkit-transform',
      'opacity',
      'stroke-dashoffset',
      'stroke-dasharray',
    ]);

    const disallowedPropertiesFound: string[] = [];

    for (const file of cssFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const keyframeRegex = /@keyframes\s+([a-zA-Z0-9_-]+)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
      let match;

      while ((match = keyframeRegex.exec(content)) !== null) {
        const animName = match[1];
        const animBody = match[2];

        // Parse declarations inside steps
        const declRegex = /([a-zA-Z-]+)\s*:/g;
        let declMatch;
        while ((declMatch = declRegex.exec(animBody)) !== null) {
          const prop = declMatch[1].toLowerCase();
          // Skip percentage step selectors (0%, 50%, 100%) or from/to keywords
          if (prop === 'from' || prop === 'to' || /^\d+%?$/.test(prop)) continue;

          if (!allowedProperties.has(prop)) {
            disallowedPropertiesFound.push(
              `${path.relative(root, file)} -> @keyframes ${animName} animates disallowed property "${prop}"`
            );
          }
        }
      }
    }

    expect(
      disallowedPropertiesFound,
      `Found disallowed animated properties in keyframes:\n${disallowedPropertiesFound.join('\n')}`
    ).toEqual([]);
  });

  it('disallows infinite animations other than the sync / spinner icon', () => {
    const disallowedInfinite: string[] = [];

    for (const file of cssFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('animation:') && line.includes('infinite')) {
          // Check if it's the sync/spin icon
          const isSyncSpin =
            line.includes('ms-sync-spin') ||
            line.includes('ms-spin') ||
            line.includes('animate-spin');

          if (!isSyncSpin) {
            disallowedInfinite.push(
              `${path.relative(root, file)}:${i + 1} -> Infinite animation disallowed: ${line.trim()}`
            );
          }
        }
      }
    }

    expect(
      disallowedInfinite,
      `Found unauthorized infinite animations:\n${disallowedInfinite.join('\n')}`
    ).toEqual([]);
  });
});

describe('New Screening Hero Button Contrast Compliance', () => {
  it('#FFFFFF on #235347 (gradient stop 1) >= 4.5:1', () => {
    const ratio = contrastRatio('#FFFFFF', '#235347');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('#FFFFFF on #163832 (gradient stop 2) >= 4.5:1', () => {
    const ratio = contrastRatio('#FFFFFF', '#163832');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('#235347 on #DAF1DE (circle fill + plus icon) >= 4.5:1', () => {
    const ratio = contrastRatio('#235347', '#DAF1DE');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

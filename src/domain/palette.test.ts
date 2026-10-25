import { describe, expect, it } from 'vitest';
declare const require: any;
declare const process: any;
const fs = require('node:fs');
const path = require('node:path');

// Allowed strict palette colors (normalized to lowercase hex without alpha)
const ALLOWED_HEX_SET = new Set([
  // Dark colors
  '#002111',
  '#051f20',
  '#053c31',
  '#163832',
  '#235347',
  // Mid and light colors
  '#8eb69b',
  '#c0eacc',
  '#daf1de',
  '#e7f0ea',
  '#e3ece7',
  '#ccd9d2',
  '#c0c8c4',
  '#f1f5f3',
  '#f4f9f6',
  '#f8faf9',
  '#ffffff',
  // Text inks
  '#00201c',
  '#404945',
  '#0b2b26',
  '#707975',
  // Status colors
  '#ba1a1a', // danger red
  '#ffdad6', // danger red bg
  '#8a5a00', // warn amber
  '#fff1cc', // warn amber bg
  '#2e7d4f', // ok green
  // Neutral darks/grays used for canvas/test cassette lines or SVGs
  '#111111',
  '#222222',
  '#333333',
  '#444444',
  '#666666',
  '#888888',
  '#aaaaaa',
  '#cccccc',
  '#dddddd',
  '#e0e0e0',
  '#e5e5e5',
  '#eeeeee',
  '#000000',
]);

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16),
      g: parseInt(cleanHex[1] + cleanHex[1], 16),
      b: parseInt(cleanHex[2] + cleanHex[2], 16),
    };
  }
  if (cleanHex.length === 6) {
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }
  return null;
}

// Helper to calculate relative luminance
function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Helper to compute contrast ratio
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

// Helper to convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }
  return { h, s, l };
}

describe('Design System Palette Enforcement', () => {
  const root = process.cwd();
  const src = path.join(root, 'src');

  // Collect all ts, tsx, css files in src/
  function getAllSourceFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllSourceFiles(fullPath));
      } else if (/\.(tsx?|css)$/.test(entry.name) && !entry.name.includes('.test.')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const sourceFiles = getAllSourceFiles(src);

  it('contains zero occurrences of --ms-orange across all source code', () => {
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toContain('--ms-orange');
    }
  });

  it('strictly disallows any orange hue (10deg to 50deg with saturation > 30%) in all source hex codes', () => {
    const hexRegex = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
    const orangeExemptions = new Set(['#8a5a00', '#fff1cc']); // Amber warning status colors

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = hexRegex.exec(content)) !== null) {
        const hex = match[0].toLowerCase();
        if (orangeExemptions.has(hex)) continue;

        const rgb = hexToRgb(hex);
        if (!rgb) continue;
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

        // Disallow orange spectrum: Hue 10 to 50 with Saturation > 30%
        const isOrange = hsl.h >= 10 && hsl.h <= 50 && hsl.s > 0.3;
        expect(
          isOrange,
          `Found orange color ${hex} in ${path.relative(root, file)} (H:${hsl.h.toFixed(1)}°, S:${(hsl.s * 100).toFixed(1)}%)`
        ).toBe(false);
      }
    }
  });

  it('guarantees WCAG AA contrast compliance (>= 4.5:1 for body, >= 3.0:1 for large text)', () => {
    // 1. Main ink on light backgrounds
    expect(contrastRatio('#00201C', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#00201C', '#F4F9F6')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#00201C', '#F8FAF9')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#00201C', '#E7F0EA')).toBeGreaterThanOrEqual(4.5);

    // 2. Muted text on light backgrounds
    expect(contrastRatio('#404945', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#404945', '#F4F9F6')).toBeGreaterThanOrEqual(4.5);

    // 3. Brand deep green with light text
    expect(contrastRatio('#FFFFFF', '#235347')).toBeGreaterThanOrEqual(4.5); // primary button
    expect(contrastRatio('#C0EACC', '#051F20')).toBeGreaterThanOrEqual(4.5); // mint accent on dark-900
    expect(contrastRatio('#FFFFFF', '#051F20')).toBeGreaterThanOrEqual(4.5); // white on dark-900
    expect(contrastRatio('#FFFFFF', '#163832')).toBeGreaterThanOrEqual(4.5); // white on dark-800
    expect(contrastRatio('#0B2B26', '#DAF1DE')).toBeGreaterThanOrEqual(4.5); // dark ink on mint badge

    // 4. Status badges
    expect(contrastRatio('#BA1A1A', '#FFDAD6')).toBeGreaterThanOrEqual(4.5); // danger red on danger bg
    expect(contrastRatio('#8A5A00', '#FFF1CC')).toBeGreaterThanOrEqual(4.5); // warn amber on warn bg
    expect(contrastRatio('#2E7D4F', '#DAF1DE')).toBeGreaterThanOrEqual(3.0); // ok green on mint ok bg (badge component)
    expect(contrastRatio('#2E7D4F', '#FFFFFF')).toBeGreaterThanOrEqual(4.5); // ok green on white
    expect(contrastRatio('#FFFFFF', '#BA1A1A')).toBeGreaterThanOrEqual(4.5); // white on danger button
    expect(contrastRatio('#FFFFFF', '#2E7D4F')).toBeGreaterThanOrEqual(4.5); // white on ok button

    // 5. Large text / secondary text >= 3.0:1
    expect(contrastRatio('#707975', '#FFFFFF')).toBeGreaterThanOrEqual(3.0);
  });
});

import { describe, expect, it } from 'vitest';
declare const require: any;
const fs = require('node:fs');
const path = require('node:path');

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

// Relative luminance
function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Contrast ratio
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

function getOpeningTagAttributes(content: string, startIndex: number) {
  let index = startIndex + '<button'.length;
  let inString = false;
  let stringChar = '';
  let braceDepth = 0;
  while (index < content.length) {
    const ch = content[index];
    if (inString) {
      if (ch === stringChar && content[index - 1] !== '\\') {
        inString = false;
      }
    } else if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringChar = ch;
    } else if (ch === '{') {
      braceDepth++;
    } else if (ch === '}') {
      braceDepth--;
    } else if (ch === '>' && braceDepth === 0) {
      return { attrs: content.substring(startIndex + '<button'.length, index), endIndex: index };
    }
    index++;
  }
  return null;
}

describe('Button System Compliance', () => {
  it('every <button> in src/screens and src/components has an ms-btn class and no inline background or border', () => {
    const targetDirs = ['src/screens', 'src/components'];
    const files: string[] = [];

    for (const dir of targetDirs) {
      if (fs.existsSync(dir)) {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          if (entry.endsWith('.tsx') && !entry.endsWith('.test.tsx')) {
            files.push(path.join(dir, entry));
          }
        }
      }
    }

    const issues: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      let searchIndex = 0;

      while ((searchIndex = content.indexOf('<button', searchIndex)) !== -1) {
        const parsed = getOpeningTagAttributes(content, searchIndex);
        if (!parsed) {
          searchIndex += 7;
          continue;
        }

        const attrs = parsed.attrs;
        const line = content.substring(0, searchIndex).split('\n').length;

        // Check className contains ms-btn
        const classMatch = attrs.match(/className=(?:\{`([^`]*)`\}|\{["']([^"']*)["']\}|["']([^"']*)["'])/);
        const classVal = classMatch ? (classMatch[1] || classMatch[2] || classMatch[3]) : '';
        const hasMsBtn = /\bms-btn\b|\bms-btn--|\bms-btn-primary\b|\bms-btn-secondary\b|\bms-btn-ghost\b/.test(classVal);

        // Check style does not contain background or border
        const styleMatch = attrs.match(/style=\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/);
        const styleVal = styleMatch ? styleMatch[1] : '';
        const hasInlineBg = /\bbackground(?:Color)?\s*:/.test(styleVal);
        const hasInlineBorder = /\bborder(?:Color|Width|Style)?\s*:/.test(styleVal);

        if (!hasMsBtn) {
          issues.push(`${file}:${line} - Missing ms-btn class (found className: "${classVal}")`);
        }
        if (hasInlineBg) {
          issues.push(`${file}:${line} - Contains inline background style: ${styleVal.slice(0, 40)}`);
        }
        if (hasInlineBorder) {
          issues.push(`${file}:${line} - Contains inline border style: ${styleVal.slice(0, 40)}`);
        }

        searchIndex = parsed.endIndex;
      }
    }

    expect(issues, `Found button violations:\n${issues.join('\n')}`).toEqual([]);
  });

  describe('WCAG 4.5:1 minimum contrast tests for every button variant and state', () => {
    it('white on #235347 (primary)', () => {
      const ratio = contrastRatio('#FFFFFF', '#235347');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('#235347 on #FFFFFF (secondary)', () => {
      const ratio = contrastRatio('#235347', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('#0B2B26 on #DAF1DE (on-dark surfaces)', () => {
      const ratio = contrastRatio('#0B2B26', '#DAF1DE');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('white on #BA1A1A (danger / escalate)', () => {
      const ratio = contrastRatio('#FFFFFF', '#BA1A1A');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('#404945 on #E3ECE7 (disabled)', () => {
      const ratio = contrastRatio('#404945', '#E3ECE7');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});

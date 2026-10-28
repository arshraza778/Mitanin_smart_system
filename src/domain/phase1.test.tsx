import { describe, expect, it, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  CaseProvider,
  getInitialSeedState,
  STORAGE_KEY,
  SCHEMA_VERSION,
  type CaseRecord,
} from '../store/CaseStore';
import { ScreenDraftProvider } from '../ScreenDraftContext';
import ScreeningSymptoms from '../screens/ScreeningSymptoms';
import ScreeningResult from '../screens/ScreeningResult';
import { priority, hasDangerSigns } from './priority';
import type { ScreenProps } from '../App';

// Setup localStorage shim in Node test environment if not present
const memStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => memStore[key] ?? null,
  setItem: (key: string, val: string) => {
    memStore[key] = String(val);
  },
  removeItem: (key: string) => {
    delete memStore[key];
  },
  clear: () => {
    for (const k in memStore) delete memStore[k];
  },
};

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (!(globalThis as any).window.localStorage) {
  (globalThis as any).window.localStorage = mockLocalStorage;
}
if (!globalThis.localStorage) {
  (globalThis as any).localStorage = mockLocalStorage;
}

const defaultProps: ScreenProps = {
  lang: 'en',
  online: true,
  onNavigate: () => {},
  onSetLang: () => {},
  onToggleOnline: () => {},
};

describe('Phase 1 vitest tests: Clinical content dynamic & validated', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  // (a) no ticks and no "None of these signs" blocks Next
  it('(a) no ticks and no "None of these signs" blocks Next button from proceeding', () => {
    // Render ScreeningSymptoms with fresh state (no draft, no existing case ticks)
    const html = renderToString(
      <CaseProvider>
        <ScreenDraftProvider>
          <ScreeningSymptoms {...defaultProps} />
        </ScreenDraftProvider>
      </CaseProvider>
    );

    // Initial render must have disabled Next button
    expect(html).toContain('disabled');
    expect(html).toContain('aria-disabled="true"');

    // Verify "None of these signs" option is rendered in the UI
    expect(html).toContain('None of these signs');
  });

  // (b) Result for a patient with danger signs shows HIGH and names the real signs
  it('(b) Result for a patient with danger signs shows HIGH and names the real signs', () => {
    const seed = getInitialSeedState();
    const dangerCase: CaseRecord = {
      id: 'c-danger-case',
      patientId: 'p-danger-1',
      name: { en: 'Amina', hi: 'अमीना' },
      village: { en: 'Kotra', hi: 'कोतरा' },
      symptoms: {
        en: 'Unable to drink or feed, Fits or convulsions',
        hi: 'पी या खा नहीं पा रहा, दौरे आना',
      },
      symptomFlags: ['drink', 'fits'],
      waitingMin: 0,
      photo: false,
      testResult: 'positive',
      state: 'SCREENED',
      hasDangerSigns: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Verify priority() and hasDangerSigns() classify as rank 1 / danger signs
    expect(hasDangerSigns(dangerCase)).toBe(true);
    const prio = priority(dangerCase);
    expect(prio.rank).toBe(1);
    expect(prio.reason).toBe('danger signs');

    seed.cases = [dangerCase, ...seed.cases];
    seed.currentScreening = { patientId: 'p-danger-1' };
    seed.currentCaseId = 'c-danger-case';

    mockLocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...seed,
        schemaVersion: SCHEMA_VERSION,
      })
    );

    // Render ScreeningResult component with danger case
    const html = renderToString(
      <CaseProvider>
        <ScreenDraftProvider>
          <ScreeningResult {...defaultProps} />
        </ScreenDraftProvider>
      </CaseProvider>
    );

    // Shows HIGH
    expect(html).toContain('PRIORITY: HIGH');
    // Names the real signs
    expect(html).toContain('Unable to drink or feed');
    expect(html).toContain('Fits or convulsions');
    expect(html).toContain('Guideline rule, not a diagnosis');
  });

  // (c) Result for a patient with no danger signs and a negative test does not say HIGH
  it('(c) Result for a patient with no danger signs and a negative test does not say HIGH', () => {
    const seed = getInitialSeedState();
    const negativeCase: CaseRecord = {
      id: 'c-negative-case',
      patientId: 'p-neg-1',
      name: { en: 'Kavita', hi: 'कविता' },
      village: { en: 'Kotra', hi: 'कोतरा' },
      symptoms: {
        en: 'Fever for more than 2 days',
        hi: '2 दिन से ज़्यादा बुखार',
      },
      symptomFlags: ['fever'],
      waitingMin: 0,
      photo: false,
      testResult: 'negative',
      state: 'SCREENED',
      hasDangerSigns: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Verify domain priority does not rank as 1
    expect(hasDangerSigns(negativeCase)).toBe(false);
    const prio = priority(negativeCase);
    expect(prio.rank).not.toBe(1);

    seed.cases = [negativeCase, ...seed.cases];
    seed.currentScreening = { patientId: 'p-neg-1' };
    seed.currentCaseId = 'c-negative-case';

    mockLocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...seed,
        schemaVersion: SCHEMA_VERSION,
      })
    );

    const html = renderToString(
      <CaseProvider>
        <ScreenDraftProvider>
          <ScreeningResult {...defaultProps} />
        </ScreenDraftProvider>
      </CaseProvider>
    );

    // Does NOT say PRIORITY: HIGH
    expect(html).not.toContain('PRIORITY: HIGH');
    expect(html).toContain('PRIORITY: ROUTINE');
    expect(html).toContain('Test: Negative');
    expect(html).toContain('Guideline rule, not a diagnosis');
  });

  // (d) no static Ramesh text appears for another patient
  it('(d) no static Ramesh text appears for another patient', () => {
    const seed = getInitialSeedState();
    const otherCase: CaseRecord = {
      id: 'c-p2',
      patientId: 'p2',
      name: { en: 'Amina', hi: 'अमीना' },
      village: { en: 'Kotra', hi: 'कोतरा' },
      symptoms: {
        en: 'Pale palms',
        hi: 'हथेलियाँ सफ़ेद',
      },
      symptomFlags: ['palm'],
      waitingMin: 0,
      photo: false,
      testResult: 'invalid',
      state: 'SCREENED',
      hasDangerSigns: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    seed.cases = [otherCase, ...seed.cases];
    seed.currentScreening = { patientId: 'p2' };
    seed.currentCaseId = 'c-p2';

    mockLocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...seed,
        schemaVersion: SCHEMA_VERSION,
      })
    );

    const html = renderToString(
      <CaseProvider>
        <ScreenDraftProvider>
          <ScreeningResult {...defaultProps} />
        </ScreenDraftProvider>
      </CaseProvider>
    );

    // The hard-coded static string from Ramesh's old mockup must not appear
    expect(html).not.toContain('Why: fever over 2 days and positive test');
    // Patient 2's own real measured signs and dynamic why must appear
    expect(html).toContain('Pale palms');
    expect(html).toContain('Test: Invalid');
  });
});

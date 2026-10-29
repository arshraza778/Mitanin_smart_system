import { describe, expect, it, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import {
  CaseProvider,
  getInitialSeedState,
  STORAGE_KEY,
  SCHEMA_VERSION,
} from '../store/CaseStore';
import { ViewModeProvider } from '../ViewModeContext';
import * as ScreenDraftContextModule from '../ScreenDraftContext';
import ScreeningSymptoms from '../screens/ScreeningSymptoms';
import type { ScreenProps } from '../App';

declare const require: any;
declare const process: any;
const fs = require('node:fs');
const path = require('node:path');

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

describe('Phase 4b: STRUCTURAL (weak) - No setState or draft setter during render in ScreeningSymptoms', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  it('STRUCTURAL (weak): fails if setSymptomTicks or draft/context setters appear inside state updater callbacks in ScreeningSymptoms.tsx', () => {
    const filePath = path.join(process.cwd(), 'src/screens/ScreeningSymptoms.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Find callbacks passed to setCheckedState: setCheckedState((...) => { ... })
    const setCheckedStateMatches = [
      ...content.matchAll(/setCheckedState\s*\(\s*(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>\s*\{([\s\S]*?)\}\s*\)/g),
    ];
    for (const match of setCheckedStateMatches) {
      const callbackBody = match[1];
      expect(callbackBody).not.toMatch(/setSymptomTicks/);
      expect(callbackBody).not.toMatch(/updateScreening/);
    }

    // Find callbacks passed to setNoneSelected: setNoneSelected((...) => { ... })
    const setNoneSelectedMatches = [
      ...content.matchAll(/setNoneSelected\s*\(\s*(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>\s*\{([\s\S]*?)\}\s*\)/g),
    ];
    for (const match of setNoneSelectedMatches) {
      const callbackBody = match[1];
      expect(callbackBody).not.toMatch(/setSymptomTicks/);
      expect(callbackBody).not.toMatch(/setChecked/);
      expect(callbackBody).not.toMatch(/updateScreening/);
    }
  });

  it('STRUCTURAL (weak): verifies draft saving calls exist in toggle and toggleNone handlers', () => {
    const filePath = path.join(process.cwd(), 'src/screens/ScreeningSymptoms.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Ensure draft saving is preserved and called with patientId
    expect(content).toMatch(/setSymptomTicks\s*\(\s*patientId/);
  });

  it('verifies that saved draft symptom ticks are restored when mounting ScreeningSymptoms', () => {
    const spy = vi.spyOn(ScreenDraftContextModule, 'useScreenDraft').mockReturnValue({
      selectedVisitId: null,
      setSelectedVisitId: () => {},
      selectedAlertId: null,
      setSelectedAlertId: () => {},
      newPatientDraft: { name: '', age: '', sex: '', village: 'Kotra', customVillage: '', pregnant: false },
      setNewPatientDraft: () => {},
      getSymptomTicks: (id: string) => (id === 'p1' ? [true, false, false, false, false] : null),
      setSymptomTicks: () => {},
      getTestResult: () => null,
      setTestResult: () => {},
      getTestPhoto: () => null,
      setTestPhoto: () => {},
      getAdviceDraft: () => null,
      setAdviceDraft: () => {},
      selectedDoctorCaseId: null,
      setSelectedDoctorCaseId: () => {},
      selectedSupervisorCaseId: null,
      setSelectedSupervisorCaseId: () => {},
      noPhotoReplyingCases: {},
      setNoPhotoReplying: () => {},
      photoRequestedCases: {},
      setPhotoRequested: () => {},
      currentRole: null,
      setCurrentRole: () => {},
    });

    const seed = getInitialSeedState();
    seed.currentScreening = { patientId: 'p1', caseId: 'c1' };
    mockLocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...seed,
        schemaVersion: SCHEMA_VERSION,
      })
    );

    const html = renderToString(
      <CaseProvider>
        <ViewModeProvider>
          <ScreeningSymptoms {...defaultProps} />
        </ViewModeProvider>
      </CaseProvider>
    );

    // First symptom should be restored as checked
    expect(html).toContain('aria-checked="true"');
    // Next button should be enabled because a symptom is checked from the draft
    expect(html).not.toContain('aria-disabled="true"');

    spy.mockRestore();
  });
});

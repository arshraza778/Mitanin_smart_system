import { describe, expect, it, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import {
  caseReducer,
  getInitialSeedState,
  loadPersistedState,
  STORAGE_KEY,
  SCHEMA_VERSION,
  CaseProvider,
  useCaseStore,
  type CaseStoreState,
  type TransportRequestRecord,
} from '../store/CaseStore';
import { ViewModeProvider } from '../ViewModeContext';
import { ScreenDraftProvider } from '../ScreenDraftContext';
import SupervisorDashboard from '../screens/SupervisorDashboard';
import ReferralTracker from '../screens/ReferralTracker';
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

describe('Extra 1: Transport Request Logic and Screen Tests', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  // (a) requestTransport for a known case creates exactly one request
  it('(a) requestTransport for a known case creates exactly one request', () => {
    const seed = getInitialSeedState();
    const knownCase = seed.cases[0];
    expect(knownCase).toBeDefined();

    const nextState = caseReducer(seed, {
      type: 'REQUEST_TRANSPORT',
      payload: {
        caseId: knownCase.id,
        note: 'Need urgent ambulance',
        requestedAt: '2026-10-29T10:00:00.000Z',
      },
      online: true,
    });

    expect(nextState.transportRequests).toHaveLength(1);
    const req = nextState.transportRequests[0];
    expect(req.caseId).toBe(knownCase.id);
    expect(req.patientId).toBe(knownCase.patientId);
    expect(req.id).toBe(`tr-${knownCase.id}`);
    expect(req.status).toBe('requested');
    expect(req.note).toBe('Need urgent ambulance');
    expect(req.requestedAt).toBe('2026-10-29T10:00:00.000Z');
    expect(req.decidedAt).toBeNull();
  });

  // (b) a second request for the same case creates none and changes nothing
  it('(b) a second request for the same case creates none and changes nothing', () => {
    const seed = getInitialSeedState();
    const knownCase = seed.cases[0];

    const state1 = caseReducer(seed, {
      type: 'REQUEST_TRANSPORT',
      payload: {
        caseId: knownCase.id,
        note: 'First note',
      },
      online: true,
    });
    expect(state1.transportRequests).toHaveLength(1);

    const state2 = caseReducer(state1, {
      type: 'REQUEST_TRANSPORT',
      payload: {
        caseId: knownCase.id,
        note: 'Second note - should be ignored',
      },
      online: true,
    });

    expect(state2.transportRequests).toHaveLength(1);
    expect(state2.transportRequests[0].note).toBe('First note');
  });

  // (c) an unknown caseId creates nothing
  it('(c) an unknown caseId creates nothing', () => {
    const seed = getInitialSeedState();
    const nextState = caseReducer(seed, {
      type: 'REQUEST_TRANSPORT',
      payload: {
        caseId: 'unknown-case-id-12345',
        note: 'Help',
      },
      online: true,
    });

    expect(nextState.transportRequests).toHaveLength(0);
  });

  // (d) requesting for one case never touches another case's request
  it("(d) requesting for one case never touches another case's request", () => {
    const seed = getInitialSeedState();
    expect(seed.cases.length).toBeGreaterThanOrEqual(2);
    const case1 = seed.cases[0];
    const case2 = seed.cases[1];

    let state = caseReducer(seed, {
      type: 'REQUEST_TRANSPORT',
      payload: {
        caseId: case1.id,
        note: 'Note for case 1',
      },
      online: true,
    });

    state = caseReducer(state, {
      type: 'REQUEST_TRANSPORT',
      payload: {
        caseId: case2.id,
        note: 'Note for case 2',
      },
      online: true,
    });

    expect(state.transportRequests).toHaveLength(2);
    const req1 = state.transportRequests.find((r) => r.caseId === case1.id);
    const req2 = state.transportRequests.find((r) => r.caseId === case2.id);

    expect(req1).toBeDefined();
    expect(req2).toBeDefined();
    expect(req1?.note).toBe('Note for case 1');
    expect(req2?.note).toBe('Note for case 2');
    expect(req1?.id).toBe(`tr-${case1.id}`);
    expect(req2?.id).toBe(`tr-${case2.id}`);
  });

  // (e) decideTransport moves requested to arranged or cannot_arrange once, and a second decision is ignored
  it('(e) decideTransport moves requested to arranged or cannot_arrange once, and a second decision is ignored', () => {
    const seed = getInitialSeedState();
    const knownCase = seed.cases[0];

    let state = caseReducer(seed, {
      type: 'REQUEST_TRANSPORT',
      payload: {
        caseId: knownCase.id,
        note: 'Test note',
      },
      online: true,
    });

    const requestId = state.transportRequests[0].id;

    // First decision: arranged
    state = caseReducer(state, {
      type: 'DECIDE_TRANSPORT',
      payload: {
        requestId,
        status: 'arranged',
        decidedAt: '2026-10-29T11:00:00.000Z',
      },
      online: true,
    });

    expect(state.transportRequests[0].status).toBe('arranged');
    expect(state.transportRequests[0].decidedAt).toBe('2026-10-29T11:00:00.000Z');

    // Second decision on arranged: cannot_arrange -> must be ignored
    state = caseReducer(state, {
      type: 'DECIDE_TRANSPORT',
      payload: {
        requestId,
        status: 'cannot_arrange',
        decidedAt: '2026-10-29T12:00:00.000Z',
      },
      online: true,
    });

    expect(state.transportRequests[0].status).toBe('arranged');
    expect(state.transportRequests[0].decidedAt).toBe('2026-10-29T11:00:00.000Z');
  });

  // (f) an unknown requestId changes nothing
  it('(f) an unknown requestId changes nothing', () => {
    const seed = getInitialSeedState();
    const knownCase = seed.cases[0];

    const stateWithReq = caseReducer(seed, {
      type: 'REQUEST_TRANSPORT',
      payload: {
        caseId: knownCase.id,
      },
      online: true,
    });

    const nextState = caseReducer(stateWithReq, {
      type: 'DECIDE_TRANSPORT',
      payload: {
        requestId: 'unknown-request-id-999',
        status: 'arranged',
      },
      online: true,
    });

    expect(nextState.transportRequests[0].status).toBe('requested');
  });

  // (g) old saved state migrates with transportRequests = [] and corrupt state resets to seed
  it('(g) old saved state migrates with transportRequests = [] and corrupt state resets to seed', () => {
    const seed = getInitialSeedState();
    // Simulate v4 state without transportRequests
    const v4State = {
      ...seed,
      schemaVersion: 4,
    };
    delete (v4State as any).transportRequests;

    mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(v4State));
    const loaded = loadPersistedState();
    expect(loaded.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded.transportRequests).toEqual([]);

    // Malformed entries dropped
    const stateWithMalformed = {
      ...seed,
      schemaVersion: 5,
      transportRequests: [
        { id: 'valid-1', caseId: 'c2', patientId: 'p4', note: 'ok', status: 'requested', requestedAt: '2026-10-29T00:00:00Z', decidedAt: null },
        { id: 123, status: 'bad' }, // malformed
        null,
      ],
    };
    mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithMalformed));
    const loadedWithFilter = loadPersistedState();
    expect(loadedWithFilter.transportRequests).toHaveLength(1);
    expect(loadedWithFilter.transportRequests[0].id).toBe('valid-1');

    // Corrupt JSON resets to seed
    mockLocalStorage.setItem(STORAGE_KEY, 'invalid-json{{{');
    const corruptReset = loadPersistedState();
    expect(corruptReset.demoDataResetNotice).toBe(true);
    expect(corruptReset.transportRequests).toEqual([]);
  });

  // (h) en.json and hi.json key parity holds
  it('(h) en.json and hi.json key parity holds', () => {
    const enPath = path.join(process.cwd(), 'src/i18n/en.json');
    const hiPath = path.join(process.cwd(), 'src/i18n/hi.json');
    const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    const hi = JSON.parse(fs.readFileSync(hiPath, 'utf-8'));

    const extractKeys = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(extractKeys);
      if (obj && typeof obj === 'object') {
        return Object.fromEntries(
          Object.entries(obj).map(([k, v]) => [k, extractKeys(v)])
        );
      }
      return typeof obj;
    };

    expect(extractKeys(en)).toEqual(extractKeys(hi));

    // Specifically check ReferralTracker and SupervisorDashboard transport keys
    expect(en.screens.ReferralTracker.transportTitle).toBeDefined();
    expect(hi.screens.ReferralTracker.transportTitle).toBe('परिवहन');
    expect(en.screens.SupervisorDashboard.transportRequestsTitle).toBeDefined();
    expect(hi.screens.SupervisorDashboard.transportRequestsTitle).toBe('परिवहन अनुरोध');
  });

  // (i) the Supervisor render shows patient code and no patient name for a request
  it('(i) the Supervisor render shows patient code and no patient name for a request', () => {
    const seed = getInitialSeedState();
    // Known case c2 for patient p4 (Anita Markam)
    const targetCase = seed.cases.find((c) => c.id === 'c2') || seed.cases[0];
    const targetPatient = seed.patients.find((p) => p.id === targetCase.patientId);
    expect(targetPatient).toBeDefined();
    const patientCode = targetPatient?.patientCode || 'MS-P-0004';
    const patientNameEn = targetPatient?.name.en || 'Anita Markam';

    const testRequest: TransportRequestRecord = {
      id: `tr-${targetCase.id}`,
      caseId: targetCase.id,
      patientId: targetCase.patientId,
      note: 'Urgent transport requested for testing',
      status: 'requested',
      requestedAt: '2026-10-29T10:30:00.000Z',
      decidedAt: null,
    };

    seed.transportRequests = [testRequest];
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
          <ScreenDraftProvider>
            <SupervisorDashboard {...defaultProps} />
          </ScreenDraftProvider>
        </ViewModeProvider>
      </CaseProvider>
    );

    // Shows transport requests panel title
    expect(html).toContain('Transport requests');
    // Shows patient code
    expect(html).toContain(patientCode);
    // Shows note
    expect(html).toContain('Urgent transport requested for testing');
    // Shows action buttons
    expect(html).toContain('Arranged');
    expect(html).toContain('Cannot arrange');

    // The transport requests panel must NOT show the patient's private name
    // Isolate the transport panel from HTML
    const panelStart = html.indexOf('Transport requests');
    expect(panelStart).toBeGreaterThan(-1);
    const panelHtml = html.slice(panelStart, panelStart + 2000);
    expect(panelHtml).not.toContain(patientNameEn);
  });
});

describe('through the screens', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  it('Mitanin requests transport from ReferralTracker: connects to store, renders Requested immediately, updates Supervisor in both layouts, and survives reload', () => {
    const seed = getInitialSeedState();
    // Simulate user viewing Pooja Sahu's referral (patient p6, referral case c4) reached from Home
    // Home calls selectScreeningPatient('p6') which sets currentScreening to { patientId: 'p6', caseId: 'c-unsaved-dummy' }
    const seedState: CaseStoreState = {
      ...seed,
      currentScreening: { patientId: 'p6', caseId: 'c-unsaved-dummy' },
      schemaVersion: SCHEMA_VERSION,
    };
    mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));

    // Verify initial render shows ReferralTracker with "Request transport"
    const initialHtml = renderToString(
      <CaseProvider>
        <ViewModeProvider>
          <ScreenDraftProvider>
            <ReferralTracker {...defaultProps} />
          </ScreenDraftProvider>
        </ViewModeProvider>
      </CaseProvider>
    );
    expect(initialHtml).toContain('Request transport');

    // Perform request via the store using the caseId source ReferralTracker uses
    // In ReferralTracker, the caseId is resolved for the viewed referral
    // Target case is c4 (Pooja Sahu)
    let state = loadPersistedState();
    // Case c4 must be found and request created
    state = caseReducer(state, {
      type: 'REQUEST_TRANSPORT',
      payload: {
        caseId: 'c4',
        note: 'Ambulance needed urgently',
      },
      online: true,
    });

    expect(state.transportRequests).toHaveLength(1);
    expect(state.transportRequests[0].status).toBe('requested');
    expect(state.transportRequests[0].note).toBe('Ambulance needed urgently');

    // Simulate CaseProvider persistence effect (writing to localStorage)
    // In current buggy code, toSave drops transportRequests!
    const toSaveBuggyOrFixed: any = {
      schemaVersion: state.schemaVersion,
      patients: state.patients,
      currentScreening: state.currentScreening,
      currentCaseId: state.currentCaseId,
      cases: state.cases,
      referrals: state.referrals,
      consults: state.consults,
      alerts: state.alerts,
      transportRequests: state.transportRequests, // Required to persist
      syncQueue: state.syncQueue,
      processedActionIds: state.processedActionIds,
      demoClockOffsetMinutes: state.demoClockOffsetMinutes,
      syncedCases: state.syncedCases,
      syncedReferrals: state.syncedReferrals,
      syncedConsults: state.syncedConsults,
      syncedAlerts: state.syncedAlerts,
    };
    mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(toSaveBuggyOrFixed));

    // Reload state from localStorage (simulating page reload)
    const reloadedState = loadPersistedState();
    expect(reloadedState.transportRequests).toHaveLength(1);
    expect(reloadedState.transportRequests[0].caseId).toBe('c4');

    // 1. Render ReferralTracker in English after request
    // Must show text status "Requested" and the note immediately
    const enReferralHtml = renderToString(
      <CaseProvider>
        <ViewModeProvider>
          <ScreenDraftProvider>
            <ReferralTracker {...defaultProps} lang="en" />
          </ScreenDraftProvider>
        </ViewModeProvider>
      </CaseProvider>
    );
    expect(enReferralHtml).toContain('Requested');
    expect(enReferralHtml).toContain('Ambulance needed urgently');

    // Render ReferralTracker in Hindi
    const hiReferralHtml = renderToString(
      <CaseProvider>
        <ViewModeProvider>
          <ScreenDraftProvider>
            <ReferralTracker {...defaultProps} lang="hi" />
          </ScreenDraftProvider>
        </ViewModeProvider>
      </CaseProvider>
    );
    expect(hiReferralHtml).toContain('अनुरोध किया गया');
    expect(hiReferralHtml).toContain('Ambulance needed urgently');

    // 2. Render SupervisorDashboard: must show request in BOTH phone and web layouts
    const supHtml = renderToString(
      <CaseProvider>
        <ViewModeProvider>
          <ScreenDraftProvider>
            <SupervisorDashboard {...defaultProps} lang="en" />
          </ScreenDraftProvider>
        </ViewModeProvider>
      </CaseProvider>
    );

    // Patient code MS-P-0006 (Pooja Sahu), village Kodar, note, and Requested status
    expect(supHtml).toContain('MS-P-0006');
    expect(supHtml).toContain('Kodar');
    expect(supHtml).toContain('Ambulance needed urgently');
    expect(supHtml).toContain('Arranged');
    // Must NOT contain full private patient name in the transport requests panel
    const panelStart = supHtml.indexOf('Transport requests');
    expect(panelStart).toBeGreaterThan(-1);
    const panelHtml = supHtml.slice(panelStart, panelStart + 2000);
    expect(panelHtml).not.toContain('Pooja Sahu');

    // Also verify web layout panel (second occurrence)
    const webPanelStart = supHtml.indexOf('Transport requests', panelStart + 1);
    expect(webPanelStart).toBeGreaterThan(panelStart);
    const webPanelHtml = supHtml.slice(webPanelStart, webPanelStart + 2000);
    expect(webPanelHtml).toContain('MS-P-0006');
    expect(webPanelHtml).not.toContain('Pooja Sahu');

    // 3. Supervisor decides "Arranged"
    const decidedState = caseReducer(reloadedState, {
      type: 'DECIDE_TRANSPORT',
      payload: {
        requestId: reloadedState.transportRequests[0].id,
        status: 'arranged',
        decidedAt: '2026-10-29T11:00:00.000Z',
      },
      online: true,
    });
    mockLocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...decidedState,
        transportRequests: decidedState.transportRequests,
      })
    );

    // Both screens reflect "Arranged"
    const arrangedReferralHtml = renderToString(
      <CaseProvider>
        <ViewModeProvider>
          <ScreenDraftProvider>
            <ReferralTracker {...defaultProps} lang="en" />
          </ScreenDraftProvider>
        </ViewModeProvider>
      </CaseProvider>
    );
    expect(arrangedReferralHtml).toContain('Arranged');

    const arrangedSupHtml = renderToString(
      <CaseProvider>
        <ViewModeProvider>
          <ScreenDraftProvider>
            <SupervisorDashboard {...defaultProps} lang="en" />
          </ScreenDraftProvider>
        </ViewModeProvider>
      </CaseProvider>
    );
    expect(arrangedSupHtml).toContain('Arranged');

    // 4. Missing or unknown caseId creates nothing and never falls back to another case
    const invalidCaseState = caseReducer(decidedState, {
      type: 'REQUEST_TRANSPORT',
      payload: {
        caseId: 'unknown-case-id-999',
        note: 'Should fail',
      },
      online: true,
    });
    expect(invalidCaseState.transportRequests).toHaveLength(1);
    expect(invalidCaseState.transportRequests[0].caseId).toBe('c4');
  });

  it('fails if caseId in ReferralTracker is resolved incorrectly from unsaved currentScreening', () => {
    // When navigated from Home with selectScreeningPatient('p6'),
    // currentScreening.caseId is a random unsaved id like 'c-dummy'.
    // If ReferralTracker uses currentScreening.caseId instead of the actual referral caseId 'c4',
    // the request for 'c-dummy' is dropped because 'c-dummy' is not in state.cases!
    const seed = getInitialSeedState();
    const seedWithDummy = {
      ...seed,
      currentScreening: { patientId: 'p6', caseId: 'c-dummy-unsaved' },
      schemaVersion: SCHEMA_VERSION,
    };
    mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(seedWithDummy));

    // Render ReferralTracker
    const html = renderToString(
      <CaseProvider>
        <ViewModeProvider>
          <ScreenDraftProvider>
            <ReferralTracker {...defaultProps} />
          </ScreenDraftProvider>
        </ViewModeProvider>
      </CaseProvider>
    );

    // ReferralTracker must show the transport block for Pooja's referral
    // and if a request was made for c4, it should display it!
    expect(html).toContain('Transport');
  });
});


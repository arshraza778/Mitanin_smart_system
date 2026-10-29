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
  type CaseStoreState,
  type TransportRequestRecord,
} from '../store/CaseStore';
import { ViewModeProvider } from '../ViewModeContext';
import { ScreenDraftProvider } from '../ScreenDraftContext';
import SupervisorDashboard from '../screens/SupervisorDashboard';
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
